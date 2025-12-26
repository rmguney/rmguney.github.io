// Prefetch GitHub repos data immediately on app load
// This allows the data to be ready when Display component mounts

const CACHE_KEY = 'github_repos_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1h
const METADATA_KEY = 'github_repos_metadata';

// Store the promise so multiple callers get the same result
let fetchPromise = null;
let cachedResult = null;

const calculateCodeBytes = (languages) => {
  if (!languages || Object.keys(languages).length === 0) return 0;
  return Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
};

const checkForChanges = (oldMetadata, newMetadata) => {
  const details = {
    newRepos: [],
    updatedRepos: [],
    deletedRepos: []
  };
  
  if (!oldMetadata || !newMetadata) return { changed: true, details };
  
  const oldMap = new Map(oldMetadata.map(r => [r.id, r]));
  const newMap = new Map(newMetadata.map(r => [r.id, r]));
  
  // Check for new or updated repos
  for (const newRepo of newMetadata) {
    const oldRepo = oldMap.get(newRepo.id);
    if (!oldRepo) {
      details.newRepos.push(newRepo.name);
    } else if (oldRepo.updated_at !== newRepo.updated_at || oldRepo.pushed_at !== newRepo.pushed_at) {
      details.updatedRepos.push(newRepo.name);
    }
  }
  
  // Check for deleted repos
  for (const oldRepo of oldMetadata) {
    if (!newMap.has(oldRepo.id)) {
      details.deletedRepos.push(oldRepo.name);
    }
  }
  
  const changed = details.newRepos.length > 0 || details.updatedRepos.length > 0 || details.deletedRepos.length > 0;
  
  return { changed, details };
};

export async function fetchReposData() {
  // Return cached result if we have it
  if (cachedResult) {
    return cachedResult;
  }
  
  // Return existing promise if fetch is in progress
  if (fetchPromise) {
    return fetchPromise;
  }
  
  // Start new fetch
  fetchPromise = (async () => {
    try {
      const token = import.meta.env.VITE_HUB_TOKEN;
      const headers = token ? { 
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      } : {
        'Accept': 'application/vnd.github.v3+json'
      };
      
      // STEP 1: Always fetch lightweight metadata to check for updates
      const metadataResponse = await fetch('https://api.github.com/users/rmguney/repos?per_page=50', { headers });
      
      if (!metadataResponse.ok) {
        throw new Error(`GitHub API error: ${metadataResponse.status}`);
      }
      
      const metadataRepos = await metadataResponse.json();
      
      // Extract minimal metadata for comparison
      const currentMetadata = metadataRepos
        .filter(repo => !repo.fork)
        .map(repo => ({
          id: repo.id,
          name: repo.name,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at
        }));
      
      // STEP 2: Check if we have cached data
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedMetadataStr = localStorage.getItem(METADATA_KEY);
      
      if (cachedData && cachedMetadataStr) {
        try {
          const { repos: cachedRepos, timestamp } = JSON.parse(cachedData);
          const oldMetadata = JSON.parse(cachedMetadataStr);
          
          // Compare metadata to see if anything changed
          const hasChanges = checkForChanges(oldMetadata, currentMetadata);
          
          if (!hasChanges.changed) {
            cachedResult = { repos: cachedRepos, fromCache: true };
            return cachedResult;
          }
        } catch (e) {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(METADATA_KEY);
        }
      }
      
      // STEP 3: Fetch full data (either no cache, or changes detected)
      const pinnedRepos = new Set();
      if (token) {
        try {
          const graphqlQuery = `
            query {
              user(login: "rmguney") {
                pinnedItems(first: 6, types: REPOSITORY) {
                  nodes {
                    ... on Repository {
                      name
                    }
                  }
                }
              }
            }
          `;
          
          const graphqlResponse = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery })
          });
          
          if (graphqlResponse.ok) {
            const graphqlData = await graphqlResponse.json();
            if (graphqlData.data?.user?.pinnedItems?.nodes) {
              graphqlData.data.user.pinnedItems.nodes.forEach(repo => {
                if (repo?.name) {
                  pinnedRepos.add(repo.name);
                }
              });
            }
          }
        } catch (graphqlError) {
          // Error fetching pinned repos
        }
      }
      
      const response = await fetch('https://api.github.com/users/rmguney/repos?per_page=50', { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const processedRepos = data
        .filter(repo => !repo.fork)
        .map(repo => ({
          id: repo.id,
          name: repo.name || 'Unnamed Repository',
          description: repo.description || "No description available",
          url: (repo.homepage && repo.homepage !== "") ? repo.homepage : repo.html_url,
          githubUrl: repo.html_url || '#',
          color: '#fff',
          textColor: '#212121',
          language: repo.language || 'Unknown',
          size: repo.size || 0,
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          watchers: repo.watchers_count || 0,
          languages: {},
          codeBytes: 0,
          importanceFactor: 0,
          isGithubPage: !repo.homepage || repo.homepage === "",
          isPinned: pinnedRepos.has(repo.name),
          isPortfolio: repo.name === 'rmguney.github.io' || repo.name.includes('rguney') || 
              (repo.homepage && (window.location.href.includes(repo.homepage) || 
               repo.homepage.includes(window.location.hostname))),
          hasDeployments: false,
          hasPackages: false
        }));
        
      await Promise.all(processedRepos.map(async (repo) => {
        try {
          const repoName = repo.name;
          
          const langUrl = `https://api.github.com/repos/rmguney/${repoName}/languages`;
          const langResponse = await fetch(langUrl, { headers });
          
          if (langResponse.ok) {
            const languagesData = await langResponse.json();
            repo.languages = languagesData;
            repo.codeBytes = calculateCodeBytes(languagesData);
          }

          repo.ownerIsWatching = false;
          try {
            const watchersUrl = `https://api.github.com/repos/rmguney/${repoName}/subscribers`;
            const watchersResponse = await fetch(watchersUrl, { headers });
            if (watchersResponse.ok) {
              const watchersData = await watchersResponse.json();
              repo.watchers = Array.isArray(watchersData) ? watchersData.length : repo.watchers;
              if (Array.isArray(watchersData)) {
                repo.ownerIsWatching = watchersData.some(watcher => watcher.login === 'rmguney');
              }
            }
          } catch (watchersErr) {
            // Error fetching watchers
          }

          try {
            const stargazersUrl = `https://api.github.com/repos/rmguney/${repoName}/stargazers`;
            const stargazersResponse = await fetch(stargazersUrl, { headers });
            if (stargazersResponse.ok) {
              const stargazersData = await stargazersResponse.json();
              repo.stars = Array.isArray(stargazersData) ? stargazersData.length : repo.stars;
            }
          } catch (stargazersErr) {
            // Error fetching stargazers
          }

          try {
            const deploymentsUrl = `https://api.github.com/repos/rmguney/${repoName}/deployments`;
            const deploymentsResponse = await fetch(deploymentsUrl, { headers });
            if (deploymentsResponse.ok) {
              const deploymentsData = await deploymentsResponse.json();
              repo.hasDeployments = Array.isArray(deploymentsData) && deploymentsData.length > 0;
            }
          } catch (deploymentsErr) {
            // Error fetching deployments
          }

          try {
            const packagesUrl = `https://api.github.com/repos/rmguney/${repoName}/releases`;
            const packagesResponse = await fetch(packagesUrl, { headers });
            if (packagesResponse.ok) {
              const packagesData = await packagesResponse.json();
              repo.hasPackages = Array.isArray(packagesData) && packagesData.length > 0;
            }
          } catch (packagesErr) {
            // Error fetching packages
          }
        } catch (err) {
          // Error fetching repo data
        }
      }));

      const calculateImportance = (repo) => {
        const deploymentBonus = repo.hasDeployments ? 3 : 0;
        const packageBonus = repo.hasPackages ? 3 : 0;
        
        const baseImportance = (repo.stars * 4) + 
               (repo.watchers * 3) + 
               (repo.forks * 2) + 
               (repo.size * 0.00001) +
               deploymentBonus +
               packageBonus;
        
        const ownerWatchingBias = repo.ownerIsWatching ? baseImportance * 10 : 0;
        
        const totalImportance = baseImportance + ownerWatchingBias;
        
        return repo.isPinned ? totalImportance * 1000000000000000000000 : totalImportance;
      };

      processedRepos.forEach(repo => {
        repo.importanceFactor = calculateImportance(repo);
      });

      processedRepos.sort((a, b) => b.importanceFactor - a.importanceFactor);
      
      // Cache the processed repos AND metadata
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          repos: processedRepos,
          timestamp: Date.now()
        }));
        localStorage.setItem(METADATA_KEY, JSON.stringify(currentMetadata));
      } catch (e) {
        // If quota exceeded, clear old cache and try again
        if (e.name === 'QuotaExceededError') {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(METADATA_KEY);
        }
      }
      
      cachedResult = { repos: processedRepos, fromCache: false };
      return cachedResult;
    } catch (err) {
      throw err;
    }
  })();
  
  return fetchPromise;
}

// Start prefetching immediately when this module is imported
export const prefetchPromise = fetchReposData();
