import { useState, useEffect, useRef } from 'react'
import { FaGithub } from 'react-icons/fa'
import { HiLink } from 'react-icons/hi'
import { FaCaretUp, FaCaretDown, FaCaretLeft, FaCaretRight } from 'react-icons/fa'
import { motion, useInView, AnimatePresence } from "framer-motion";
import Pattern from './Pattern'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const REPOS_PER_PAGE = 4;
const REPOS_PER_PAGE_MOBILE = 2;

export default function GameBoy() {
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('AnimatePresence') && args[0].includes('mode is set to "wait"')) {
        return;
      }
      return originalConsoleError(...args);
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  const [allRepos, setAllRepos] = useState([]);
  const [displayedRepos, setDisplayedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [currentWebsite, setCurrentWebsite] = useState(null)
  const [activeIndex, setActiveIndex] = useState(null)
  const [cartridgeSelected, setCartridgeSelected] = useState(false)

  const [allLanguageStats, setAllLanguageStats] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [filteredRepos, setFilteredRepos] = useState([]);
  
  const MAJOR_PROGRAMMING_LANGUAGES = [
    'Python', 'C', 'C++', 'C#', 'Java', 'JavaScript', 'TypeScript', 'Rust',
    'Go', 'Ruby', 'R', 'Zig', 'Objective-C', 'Scala', 'Haskell', 'COBOL', 'Perl', 'Lua', 'Swift', 'Kotlin', 'PHP', 'Dart'
  ];
  
  const iframeRef = useRef(null)
  const textRef = useRef(null);
  const isInView = useInView(textRef, {
    once: false,
    amount: 0.3,
    margin: "0px 0px -100px 0px"
  });

  const cartridgesRef = useRef(null);
  const isCartridgesInView = useInView(cartridgesRef, {
    once: false,
    amount: 0.3
  });

  const cardRefs = Array(REPOS_PER_PAGE).fill().map(() => useRef(null));

  const [readmeContent, setReadmeContent] = useState('');
  const [readmeLoading, setReadmeLoading] = useState(false);

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };
    
    checkScreenSize();
    
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          resetAllCardTransforms();
        } else {
          resetAllCardTransforms();
        }
      });
    }, { threshold: 0.1 });
    
    if (cartridgesRef.current) {
      observer.observe(cartridgesRef.current);
    }
    
    return () => {
      if (cartridgesRef.current) {
        observer.unobserve(cartridgesRef.current);
      }
      observer.disconnect();
    };
  }, []);

  const LANGUAGE_GROUPS = {
    "JavaScript": ["HTML", "Vue", "Svelte"],
  };

  const LANGUAGE_GROUP_LOOKUP = {};
  Object.entries(LANGUAGE_GROUPS).forEach(([main, aliases]) => {
    aliases.forEach(alias => {
      LANGUAGE_GROUP_LOOKUP[alias] = main;
    });
  });

  const calculateLanguageStats = (repos) => {
    const languages = {};
    let totalBytes = 0;

    repos.forEach(repo => {
      if (repo.languages) {
        Object.entries(repo.languages).forEach(([language, bytes]) => {
          const langKey = LANGUAGE_GROUP_LOOKUP[language] || language;
          languages[langKey] = (languages[langKey] || 0) + bytes;
          totalBytes += bytes;
        });
      }
    });

    const languageStats = Object.entries(languages).map(([language, bytes]) => ({
      name: language,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 100)
    })).sort((a, b) => b.bytes - a.bytes);

    return languageStats;
  };

  useEffect(() => {
    if (allRepos.length > 0) {
      const stats = calculateLanguageStats(allRepos);
      setAllLanguageStats(stats);
    }
  }, [allRepos]);

  useEffect(() => {
    if (selectedLanguage) {
      const filtered = allRepos.filter(repo => 
        repo.languages && repo.languages[selectedLanguage]
      );
      setFilteredRepos(filtered);
      const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
      setTotalPages(Math.ceil(filtered.length / reposPerPage));
      setCurrentPage(1);
    } else {
      setFilteredRepos([]);
      const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
      setTotalPages(Math.ceil(allRepos.length / reposPerPage));
    }
  }, [selectedLanguage, allRepos, isSmallScreen]);

  const resetAllCardTransforms = () => {
    cardRefs.forEach(ref => {
      if (ref.current) {
        ref.current.style.transition = 'none';
        void ref.current.offsetWidth;
        ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        setTimeout(() => {
          if (ref.current) {
            ref.current.style.transition = 'transform 0.4s ease-out';
          }
        }, 10);

        const highlight = ref.current.querySelector('.card-highlight');
        if (highlight) {
          highlight.style.opacity = '0';
          highlight.style.transition = 'none';
          highlight.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 60%)';
          
          setTimeout(() => {
            if (highlight) {
              highlight.style.transition = 'background 0.3s ease-out, opacity 0.3s ease-out';
            }
          }, 10);
        }
      }
    });
  };

  const resetAllCardTransformsLegacy = () => {
    cardRefs.forEach(ref => {
      if (ref.current) {
        ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }
    });
  };

  const [animateItems, setAnimateItems] = useState(true);

  useEffect(() => {
    if (allRepos.length > 0) {
      const reposToUse = selectedLanguage ? filteredRepos : allRepos;
      const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
      
      const startIdx = (currentPage - 1) * reposPerPage;
      const endIdx = Math.min(startIdx + reposPerPage, reposToUse.length);
      setDisplayedRepos(reposToUse.slice(startIdx, endIdx));
      
      setActiveIndex(null);
      setCartridgeSelected(false);
      
      setAnimateItems(false);
      setTimeout(() => setAnimateItems(true), 50);
    }
  }, [currentPage, allRepos, filteredRepos, selectedLanguage, isSmallScreen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetAllCardTransforms();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [displayedRepos]);

  useEffect(() => {
    return () => {
      resetAllCardTransforms();
    };
  }, []);

  const calculateCodeBytes = (languages) => {
    if (!languages || Object.keys(languages).length === 0) return 0;
    return Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  };
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setLoading(true);
        
        const token = process.env.NEXT_PUBLIC_HUB_TOKEN || process.env.HUB_TOKEN;
        const headers = token ? { 
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        } : {
          'Accept': 'application/vnd.github.v3+json'
        };
        
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
            console.error('Error fetching pinned repos:', graphqlError);
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
            isPinned: pinnedRepos.has(repo.name)
          }));
        await Promise.all(processedRepos.map(async (repo) => {
          try {
            const repoName = repo.name;
            const token = process.env.NEXT_PUBLIC_HUB_TOKEN || process.env.HUB_TOKEN;
            const headers = token ? { 
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            } : {
              'Accept': 'application/vnd.github.v3+json'
            };
            
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
              console.error(`Error fetching watchers for ${repo.name}:`, watchersErr);
            }

            try {
              const stargazersUrl = `https://api.github.com/repos/rmguney/${repoName}/stargazers`;
              const stargazersResponse = await fetch(stargazersUrl, { headers });
              if (stargazersResponse.ok) {
                const stargazersData = await stargazersResponse.json();
                repo.stars = Array.isArray(stargazersData) ? stargazersData.length : repo.stars;
              }
            } catch (stargazersErr) {
              console.error(`Error fetching stargazers for ${repo.name}:`, stargazersErr);
            }
          } catch (err) {
            console.error(`Error fetching data for ${repo.name}:`, err);
          }
        }
        ));

        const calculateImportance = (repo) => {
          const baseImportance = (repo.stars * 4) + 
                 (repo.watchers * 3) + 
                 (repo.forks * 2) + 
                 (repo.size * 0.00001);
          
          const ownerWatchingBias = repo.ownerIsWatching ? baseImportance * 10 : 0;
          
          const totalImportance = baseImportance + ownerWatchingBias;
          
          return repo.isPinned ? totalImportance * 1000000000000000000000 : totalImportance;
        };

        processedRepos.forEach(repo => {
          repo.importanceFactor = calculateImportance(repo);
        });

        processedRepos.sort((a, b) => b.importanceFactor - a.importanceFactor);
        
        setAllRepos(processedRepos);
        setTotalPages(Math.ceil(processedRepos.length / REPOS_PER_PAGE));
        
        setError(null);
      } catch (err) {
        console.error ("Error fetching GitHub repositories:", err);
        setError(err.message || "An error occurred");
        setAllRepos([]);
        setDisplayedRepos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  useEffect(() => {
    const fetchReadme = async () => {
      if (activeIndex === null || !displayedRepos[activeIndex]?.isGithubPage) {
        setReadmeContent('');
        return;
      }

      try {
        setReadmeLoading(true);
        const repoUrl = displayedRepos[activeIndex].githubUrl;
        const urlParts = repoUrl.split('/');
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];
        const token = process.env.NEXT_PUBLIC_HUB_TOKEN || process.env.HUB_TOKEN;
        const headers = token ? { 
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        } : {
          'Accept': 'application/vnd.github.v3+json'
        };
        
        const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
        const response = await fetch(readmeUrl, { headers });
        
        if (!response.ok) {
          if (response.status === 404) {
            setReadmeContent("*No README file found in this repository.*");
            return;
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const data = await response.json();
        const base64 = data.content.replace(/\n/g, '');
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const content = new TextDecoder('utf-8').decode(bytes);
        
        setReadmeContent(content);
      } catch (err) {
        if (!err.message.includes('404')) {
          console.error("Error fetching README:", err);
        }
        setReadmeContent("*No README content available.*");
      } finally {
        setReadmeLoading(false);
      }
    };

    fetchReadme();
  }, [activeIndex, displayedRepos]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0,
      x: -100,
    },
    show: { 
      opacity: 1,
      x: 0,
      transition: {
        x: {
          type: "spring",
          stiffness: 100,
          damping: 12
        },
        opacity: {
          duration: 0.2
        }
      }
    }
  };

  useEffect(() => {
    if (activeIndex !== null && displayedRepos.length > 0 && activeIndex < displayedRepos.length) {
      setCurrentWebsite(displayedRepos[activeIndex].url)
      setCartridgeSelected(true)

      const iframe = iframeRef.current
      if (iframe) {
        const handleIframeLoad = () => {
          try {
          } catch (error) {
            console.error('Error manipulating iframe:', error)
          }
        }

        iframe.addEventListener('load', handleIframeLoad)
        return () => iframe.removeEventListener('load', handleIframeLoad)
      }
    }
  }, [activeIndex, displayedRepos])

  const [isPageChanging, setIsPageChanging] = useState(false);

  const handleDPadClick = (direction) => {
    try {
      if (allRepos.length === 0) return;
      
      if (direction === 'up' || direction === 'down') {
        if (isPageChanging) return;
        
        setIsPageChanging(true);
        
        if (direction === 'down') {
          if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
          }
        } else {
          if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
          }
        }
        
        setTimeout(() => setIsPageChanging(false), 300);
        return;
      }
      
      if (activeIndex === null) {
        setActiveIndex(0);
        setCartridgeSelected(true);
        return;
      }
      
      setCartridgeSelected(true);
      
      if (direction === 'right') {
        if (activeIndex < displayedRepos.length - 1) {
          setActiveIndex(activeIndex + 1);
        }
      } else if (direction === 'left') {
        if (activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
        }
      }
    } catch (error) {
      console.error('Error in handleDPadClick:', error);
    }
  };

  const handleAButtonClick = () => {
    if (allRepos.length === 0) return;
    
    if (activeIndex === null) {
      setActiveIndex(0);
      setCartridgeSelected(true);
      return;
    }
    
    try {
      window.open(displayedRepos[activeIndex].url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening website:', error);
    }
  };

  const handleBButtonClick = () => {
    if (allRepos.length === 0) return;
    
    if (activeIndex === null) {
      setActiveIndex(0);
      setCartridgeSelected(true);
      return;
    }
    
    try {
      window.open(displayedRepos[activeIndex].githubUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening GitHub:', error);
    }
  };

  const goToNextPage = () => {
    const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleCardMouseMove = (e, cardRef) => {
    if (!cardRef.current || !isCartridgesInView) return;
    
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 15;
    const y = (e.clientY - top - height / 2) / 15;
    
    requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
        cardRef.current.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg) scale3d(1.05, 1.05, 1.05)`;
        
        const highlight = cardRef.current.querySelector('.card-highlight');
        if (highlight) {
          highlight.style.opacity = '1';
          highlight.style.transition = 'background 0.3s ease-out 0.1s, opacity 0.3s ease-out';
          
          const angleOffset = Math.atan2(-y, -x) * (180 / Math.PI);
          const gradientAngle = (angleOffset + 270) % 360;
          
          const distance = Math.sqrt(x*x + y*y);
          const intensity = 0.001 + Math.min(0.05, distance / 40);
          
          highlight.style.background = `linear-gradient(
            ${gradientAngle}deg, 
            rgba(255,255,255,${intensity}), 
            transparent 95%
          )`;
        }
      }
    });
  };

  const handleCardMouseLeave = (cardRef) => {
    if (!cardRef.current) return;
    
    requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.4s ease-out';
        cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        
        const highlight = cardRef.current.querySelector('.card-highlight');
        if (highlight) {
          highlight.style.opacity = '0';
          highlight.style.transition = 'background 0.4s ease-out, opacity 0.3s ease-out';
          highlight.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 90%)';
        }
      }
    });
  };

  const formatRepoName = (name) => {
    if (!name) return 'Unknown';
    
    let cleanName = name;
    if (name.endsWith('.github.io')) {
      cleanName = name.replace('.github.io', '');
    }
    
    const lowercaseWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of'];
    
    const words = cleanName.split('-');
    
    return words
      .map((word, index) => {
        if (index === 0 || index === words.length - 1 || !lowercaseWords.includes(word.toLowerCase())) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word.toLowerCase();
      })
      .join(' ');
  }

  const getLanguageColor = (language) => {
    const colors = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#3178c6',
      'Python': '#3572A5',
      'Java': '#b07219',
      'C#': '#178600',
      'C++': '#f34b7d',
      'C': '#555555',
      'Rust': '#dea584',
      'Go': '#00ADD8',
      'Ruby': '#701516',
      'R': '#198CE7',
      'Zig': '#ec915c',
      'Objective-C': '#438eff',
      'Scala': '#c22d40',
      'Haskell': '#5e5086',
      'COBOL': '#00afcd',
      'Perl': '#0298c3',
      'Lua': '#000080',
      'Swift': '#fa7343',
      'Kotlin': '#A97BFF',
      'PHP': '#4F5D95',
      'Dart': '#00B4AB',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Jupyter Notebook': '#DA5B0B',
      'Shell': '#89e051',
      'PowerShell': '#012456',
      'ASP.NET': '#9400ff',
      'ShaderLab': '#222c37',
      'HLSL': '#aace60',
      'Svelte': '#ff3e00',
      'Vue': '#41b883',
      'SCSS': '#c6538c',
      'Dockerfile': '#384d54',
      'CMake': '#DA3434',
      'Assembly': '#6E4C13',
      'Batchfile': '#C1F12E',
      'Makefile': '#427819',
    };
    
    return colors[language] || '#8b949e';
  };

  const renderBadges = (languages, hasWebsite) => {
    const websiteBadge = hasWebsite ? (
      <div className="w-full flex justify-center mb-0.5">
        <div 
          key="website"
          className="text-[10px] px-0.5 py-0 inline-flex items-center justify-center text-white/90"
        >
          <span 
            className="inline-flex items-center justify-center mr-[2px] mb-0 lg:mb-0.5"
            style={{ color: '#10b981', fontSize: '9px', lineHeight: 1 }}
          >★</span>
          <span className="text-white/50">Deployment Live</span>
        </div>
      </div>
    ) : null;
    
    let languageBadges = null;
    if (languages && Object.keys(languages).length > 0) {
      const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
      
      const sortedLanguages = Object.entries(languages)
        .sort(([, bytesA], [, bytesB]) => bytesB - bytesA)
        .map(([lang, bytes]) => ({
          lang,
          bytes,
          percentage: Math.round((bytes / totalBytes) * 100)
        }))
        .filter(({ percentage }) => percentage > 0);
      
      const displayLanguages = sortedLanguages.slice(0, 3);
      
      if (displayLanguages.length > 0) {
        languageBadges = (
          <div className="w-full flex flex-wrap justify-center gap-[1px] mb-0.5">
            {displayLanguages.map(({ lang, percentage }) => {
              const color = getLanguageColor(lang);
              return (
                <div 
                  key={lang}
                  className="text-[10px] px-0.5 py-0 inline-flex items-center justify-center text-white/50 mr-0.5"
                >
                  <span 
                    className="inline-block w-[5px] h-[5px] rounded-full mr-[2px]"
                    style={{ backgroundColor: color }}
                  ></span>
                  <span>{lang}</span>
                  <span className="ml-[2px] text-white/30">{percentage}%</span>
                </div>
              );
            })}
          </div>
        );
      }
    }
    
    let moreBadge = null;
    if (languages && Object.keys(languages).length > 3) {
      const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
      const validLanguages = Object.entries(languages)
        .map(([lang, bytes]) => ({
          lang,
          percentage: Math.round((bytes / totalBytes) * 100)
        }))
        .filter(({ percentage }) => percentage > 0);
      
      const remainingCount = validLanguages.length - 3;
      
      if (remainingCount > 0) {
        moreBadge = (
          <div className="w-full flex justify-center">
            <div 
              key="more"
              className="text-[10px] px-0.5 py-0 inline-flex items-center justify-center text-white/30"
            >
              <span className="text-white/30">+{remainingCount} more</span>
            </div>
          </div>
        );
      }
    }
    
    return (
      <div className="flex flex-col items-center w-full">
        {websiteBadge}
        {languageBadges}
        {moreBadge}
      </div>
    );
  };

  const MarkdownComponents = {
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className="bg-[#212121] p-3 rounded-md overflow-x-auto my-4">
          <code {...props} className={className}>
            {String(children).replace(/\n$/, '')}
          </code>
        </pre>
      ) : (
        <code className="bg-[#212121] px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      )
    },
    a({node, ...props}) {
      return <a className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
    },
    img({node, src, alt, ...props}) {
      let imageSrc = src;
      if (activeIndex !== null && displayedRepos[activeIndex] && src && !src.startsWith('http')) {
        const repo = displayedRepos[activeIndex];
        const githubUrl = repo.githubUrl;
        const urlParts = githubUrl.split('/');
        const owner = urlParts[urlParts.length - 2];
        const repoName = urlParts[urlParts.length - 1];
        
        if (src.startsWith('./')) {
          imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${src.slice(2)}`;
        } else if (src.startsWith('/')) {
          imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main${src}`;
        } else if (!src.startsWith('#')) {
          imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${src}`;
        }
      }
      
      return (
        <img 
          className="max-w-full h-auto my-4 rounded first:mt-0" 
          style={{ maxHeight: '200px' }} 
          loading="lazy"
          src={imageSrc}
          alt={alt}
          onError={(e) => {
            if (e.target.src.includes('/main/')) {
              e.target.src = e.target.src.replace('/main/', '/master/');
            } else {
              e.target.style.display = 'none';
            }
          }}
          {...props}
        />
      )
    },
    h1({node, ...props}) {
      return <h1 className="text-xl font-bold border-b border-[#333333] pb-1 mb-4 mt-6 first:mt-0" {...props} />
    },
    h2({node, ...props}) {
      return <h2 className="text-lg font-bold border-b border-[#333333] pb-1 mb-3 mt-5 first:mt-0" {...props} />
    },
    h3({node, ...props}) {
      return <h3 className="text-md font-bold mb-3 mt-4 first:mt-0" {...props} />
    },
    p({node, ...props}) {
      return <p className="mb-4 leading-relaxed first:mt-0" {...props} />
    },
    ul({node, ...props}) {
      return <ul className="list-disc pl-6 mb-4 first:mt-0" {...props} />
    },
    ol({node, ...props}) {
      return <ol className="list-decimal pl-6 mb-4 first:mt-0" {...props} />
    },
    li({node, ...props}) {
      return <li className="mb-1" {...props} />
    },
    blockquote({node, ...props}) {
      return <blockquote className="border-l-4 border-amber-700/50 pl-4 py-1 mb-4 italic text-white/70 first:mt-0" {...props} />
    },
    table({node, ...props}) {
      return (
        <div className="overflow-x-auto w-full my-4 first:mt-0">
          <table className="min-w-full divide-y divide-[#333333] border border-[#333333]" {...props} />
        </div>
      )
    },
    thead({node, ...props}) {
      return <thead className="bg-[#212121]" {...props} />
    },
    tbody({node, ...props}) {
      return <tbody className="divide-y divide-[#333333]" {...props} />
    },
    tr({node, ...props}) {
      return <tr className="hover:bg-[#2a2a2a]" {...props} />
    },
    th({node, ...props}) {
      return <th className="px-3 py-2 text-left text-xs font-medium text-white/80 uppercase tracking-wider" {...props} />
    },
    td({node, ...props}) {
      return <td className="px-3 py-2 text-sm" {...props} />
    },
    hr({node, ...props}) {
      return <hr className="border-[#333333] my-4 first:mt-0" {...props} />
    },
    pre({node, children, ...props}) {
      return <pre className="bg-transparent first:mt-0" {...props}>{children}</pre>
    },
  };

  const [gameBoyOffset] = useState(0);
  const [titleOffset] = useState(0);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-thin::-webkit-scrollbar {
        height: 4px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
      }
      .readme-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .readme-scrollbar::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 4px;
      }
      .readme-scrollbar::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
      }
      .readme-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      .readme-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #444 #2a2a2a;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [entranceKey, setEntranceKey] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const [gameboyAnimated, setGameboyAnimated] = useState(false);
  useEffect(() => {
    if (!loading && !hasMounted) {
      setEntranceKey(prev => prev + 1);
      setHasMounted(true);
    }
  }, [loading, hasMounted]);

  useEffect(() => {
    if (!loading && !gameboyAnimated) {
      setTimeout(() => setGameboyAnimated(true), 800); 
    }
  }, [loading, gameboyAnimated]);

  return (
    <div className="h-auto flex flex-col items-center justify-start overflow-hidden -mt-10 lg:mt-0">
      <Pattern />
      <div className="lg:absolute relative lg:w-full max-w-7xl flex flex-col lg:flex-row justify-center lg:justify-left lg:gap-6 items-center lg:bottom-[-515px]">
        <div className="flex flex-col justify-left scale-90 lg:scale-100 pt-0 lg:w-[820px]">
          <div
            className="relative mb-8 flex flex-col items-center lg:items-start lg:pl-0 lg:w-[820px]"
            ref={textRef}
          >
            <motion.span 
              key={`titlebar-span-${entranceKey}`}
              initial={hasMounted ? false : { opacity: 0, y: 10 }}
              animate={isInView ? { 
                opacity: 0.15, 
                y: 0,
                x: isSmallScreen ? 0 : titleOffset
              } : { 
                opacity: 0, 
                y: 10,
                x: 0 
              }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.1 },
                y: { duration: 0.5, delay: 0.1 },
                x: {
                  type: "spring",
                  stiffness: 80,
                  damping: 12,
                  mass: 0.8,
                }
              }}
              className="absolute lg:-top-28 hidden lg:block text-[50px] lg:text-[120px] font-black whitespace-nowrap"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(255,255,255,0.1)'
              }}>
              {allRepos.length} OPEN
            </motion.span>
            <motion.h1 
              key={`titlebar-h1-${entranceKey}`}
              initial={hasMounted ? false : { opacity: 0, y: -10, x: 0 }}
              animate={isInView ? { 
                opacity: 1, 
                y: 0, 
                x: isSmallScreen ? 0 : titleOffset 
              } : { 
                opacity: 0, 
                y: -10, 
                x: 0 
              }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.1 },
                y: { duration: 0.5, delay: 0.1 },
                x: {
                  type: "spring",
                  stiffness: 80,
                  damping: 12,
                  mass: 0.8,
                }
              }}
              className="pt-6 lg:pt-0 relative text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white/80 via-amber-50/90 to-white/80 lg:tracking-[0.2em] text-center lg:text-left"
              style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
              PROJECTS
            </motion.h1>
            
            {!loading && !error && (
              <motion.div 
                key={`titlebar-sortbar-${entranceKey}`}
                initial={hasMounted ? false : { opacity: 0, y: 5, x: 0 }}
                animate={isInView ? { 
                  opacity: 1, 
                  y: 0,
                  x: isSmallScreen ? 0 : titleOffset 
                } : { 
                  opacity: 0, 
                  y: 5, 
                  x: 0 
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.2 },
                  y: { duration: 0.5, delay: 0.2 },
                  x: {
                    type: "spring",
                    stiffness: 80,
                    damping: 12,
                    mass: 0.8,
                  }
                }}
                className="mt-4 lg:mt-2 w-full relative"
              >
                <div 
                  className="flex items-center justify-center flex-wrap gap-2 py-1 px-1 lg:justify-start"
                >
                  {allLanguageStats
                    .filter(lang => MAJOR_PROGRAMMING_LANGUAGES.includes(lang.name))
                    .slice(0, 8)
                    .map(lang => (
                      <button
                        key={lang.name}
                        onClick={() => setSelectedLanguage(lang.name === selectedLanguage ? null : lang.name)}
                        className={`text-xs px-2 py-1 rounded-full flex items-center transition-all flex-shrink-0
                          ${lang.name === selectedLanguage 
                            ? 'bg-amber-100/10 text-amber-50 ring-2 ring-amber-50/50' 
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                      >
                        <span 
                          className="inline-block w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: getLanguageColor(lang.name) }}
                        ></span>
                        <span>{lang.name}</span>
                        <span className="ml-1.5 text-white/50">{lang.percentage}%</span>
                      </button>
                    ))}
                </div>
              </motion.div>
            )}
          </div>

          <div>
            <motion.div
              ref={cartridgesRef}
              variants={containerVariants}
              initial={isSmallScreen ? "show" : "hidden"} 
              animate={isSmallScreen ? "show" : (isCartridgesInView && animateItems ? "show" : "hidden")}
              className={`flex flex-wrap justify-center gap-4 ${isSmallScreen ? 'gap-2' : 'gap-4'}`}
            >
              {loading ? (
                <div className="text-white text-center py-8">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full mb-4"></div>
                  <p>Loading repositories...</p>
                </div>
              ) : error ? (
                <div className="text-amber-200 text-center py-8">
                  <p>Error loading repositories: {error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-amber-200/20 hover:bg-amber-200/30 rounded-md transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : displayedRepos.length === 0 ? (
                <div className="text-white text-center py-8">
                  {selectedLanguage ? (
                    <>
                      <p>No repositories found using {selectedLanguage}.</p>
                    </>
                  ) : (
                    <p>No repositories found.</p>
                  )}
                </div>
              ) : (
                displayedRepos.map((repo, index) => (
                  <motion.button
                    key={repo.id || index}
                    ref={cardRefs[index]}
                    variants={isSmallScreen ? {} : itemVariants}
                    onClick={() => {
                      const newIndex = index === activeIndex ? null : index;
                      setActiveIndex(newIndex);
                      if (newIndex === null) {
                        setCurrentWebsite(null);
                        setCartridgeSelected(false);
                      }
                    }}
                    onMouseMove={(e) => handleCardMouseMove(e, cardRefs[index])}
                    onMouseLeave={() => handleCardMouseLeave(cardRefs[index])}
                    className={`group relative transition-all duration-500
                      ${isSmallScreen ? 'w-[160px] h-[160px]' : 'w-[189px] h-[190px]'}
                      ${index === activeIndex ? 'ring-2 ring-amber-100/70 ring-offset-2 ring-offset-black/30 rounded-md transition-all duration-300' : ''}`}
                    style={{ 
                      transformStyle: 'preserve-3d', 
                      transition: 'all 0.4s ease-out'
                    }}
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/15 to-white/5 rounded-lg backdrop-blur-sm"
                      style={{ 
                        transform: 'translateZ(20px)',
                        background: `
                          linear-gradient(135deg, 
                            rgba(255, 255, 255, 0.06) 0%,
                            rgba(255, 255, 255, 0.03) 50%, 
                            rgba(255, 255, 255, 0.01) 100%
                          )
                        `,
                        boxShadow: `
                          inset 0 1px 0 rgba(255, 255, 255, 0.3),
                          inset 1px 0 0 rgba(255, 255, 255, 0.2),
                          inset 0 0 30px rgba(255, 255, 255, 0.08),
                          inset 0 -1px 0 rgba(0, 0, 0, 0.1),
                          0 8px 32px 0 rgba(0, 0, 0, 0.37),
                          0 4px 16px 0 rgba(0, 0, 0, 0.2)
                        `,
                        border: '1px solid rgba(255, 255, 255, 0.18)'
                      }}
                    >
                      <div className="absolute left-2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-white/20 via-white/10 to-white/20"></div>
                      <div className="absolute left-4 top-4 bottom-4 w-[1px] bg-gradient-to-b from-white/15 via-white/5 to-white/15"></div>
                      <div className="absolute right-2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-white/20 via-white/10 to-white/20"></div>
                      <div className="absolute right-4 top-4 bottom-4 w-[1px] bg-gradient-to-b from-white/15 via-white/5 to-white/15"></div>
                      
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-gradient-to-b from-white/20 to-transparent rounded-b-lg"></div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gradient-to-t from-white/20 to-transparent rounded-t-lg"></div>
                    </div>

                    <div 
                      className="absolute inset-0 flex items-center justify-center px-6"
                      style={{ transform: 'translateZ(40px)' }}
                    >
                      <div className="flex flex-col items-center space-y-1 max-w-full">
                        <h3 className={`font-bold text-center bg-gradient-to-r from-white via-amber-50 to-white
                          bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] leading-tight
                          ${isSmallScreen ? 'text-base' : 'text-lg'}`}>
                          {formatRepoName(repo.name)}
                        </h3>
                        
                        <p className={`text-center bg-gradient-to-r text-white/60
                          bg-clip-text bg-[length:200%_100%] animate-shimmer drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] leading-tight
                          ${isSmallScreen ? 'text-[10px]' : 'text-xs'}`}>
                          {repo.description.length > (isSmallScreen ? 80 : 100) ? 
                            repo.description.substring(0, isSmallScreen ? 80 : 100) + '...' : 
                            repo.description}
                        </p>
                        
                        <div className={`mt-1 ${isSmallScreen ? 'w-[120px]' : 'w-[145px]'}`}>
                          {renderBadges(repo.languages, !repo.isGithubPage)}
                        </div>
                      </div>
                    </div>

                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-0 pointer-events-none rounded-lg card-highlight"
                      style={{ 
                        transform: 'translateZ(25px)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 60%)',
                        transition: 'background 0.3s ease-out, opacity 0.3s ease-out'
                      }}
                    />
                  </motion.button>
                ))
              )}
            </motion.div>
            
            {!loading && !error && allRepos.length > (isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE) && (
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-2 py-2.5 rounded-full flex items-center justify-center transition-all
                    ${currentPage === 1 
                      ? 'text-white/30 cursor-not-allowed' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  aria-label="Previous page"
                >
                  <FaCaretLeft className="mr-1" />
                </button>
                
                <div className="text-white/80 px-2 mb-0.5">
                  <span className="font-medium">{currentPage}</span>
                  <span className="mx-1">/</span>
                  <span>{totalPages}</span>
                </div>
                
                <button 
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-2.5 rounded-full flex items-center justify-center transition-all
                    ${currentPage === totalPages
                      ? 'text-white/30 cursor-not-allowed' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  aria-label="Next page"
                >
                  <FaCaretRight className="ml-1" /> 
                </button>
              </div>
            )}
          </div>
        </div>

        <motion.div
          key={`gameboy-${entranceKey}`}
          className="lg:justify-end"
          initial={!gameboyAnimated ? { opacity: 0, x: -100 } : false}
          animate={!loading ? {
            opacity: 1,
            x: isSmallScreen ? 0 : gameBoyOffset
          } : {
            opacity: 0,
            x: -100
          }}
          transition={{
            type: "spring",
            stiffness: 80,
            damping: 12,
            mass: 0.8,
            delay: loading ? 0.3 : 0
          }}
        >
          <div className="relative w-[450px] h-[570px] bg-gradient-to-br from-amber-100 to-amber-300 rounded-[15px_15px_0px_0px] p-[30px] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.3),_inset_-2px_-2px_3px_rgba(0,0,0,0.3),_0_0_20px_rgba(0,0,0,0.4)]">
            <div className="absolute top-[30px] left-[50%] translate-x-[-50%] w-[400px] h-[350px] bg-[#333] rounded-[15px_15px_15px_15px] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
              <div className="absolute top-[20px] left-[50%] translate-x-[-50%] w-[360px] h-[310px] bg-[#9ba5aa] border-[6px] border-solid border-[#555] overflow-hidden">
                <div className="w-full h-full relative overflow-hidden">
                  {cartridgeSelected && currentWebsite && activeIndex !== null ? (
                    displayedRepos[activeIndex]?.isGithubPage ? (
                      <div className="w-full h-full bg-[#212121] flex flex-col overflow-hidden">
                        <div className="bg-black p-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FaGithub className="text-white" />
                            <span className="text-white font-medium truncate">
                              {formatRepoName(displayedRepos[activeIndex].name)}.md
                            </span>
                          </div>
                        </div>
                        
                        <div 
                          className="flex-1 overflow-y-auto p-4 text-white/90 text-sm bg-[#1a1a1a] readme-scrollbar"
                        >
                          {readmeLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full"></div>
                              <span className="ml-2">Loading README...</span>
                            </div>
                          ) : (
                            <div className="markdown-body w-full">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={MarkdownComponents}
                              >
                                {readmeContent}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <iframe
                        ref={iframeRef}
                        src={currentWebsite}
                        className="w-[1211px] h-[1034px] border-0 transform origin-top-left -translate-x-0.5 scale-[0.289]"
                        title="Screen"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#212121] text-center p-4">
                      <div className="text-3xl font-bold mb-4 text-white animate-pulse">
                        {loading ? "Loading repositories..." : "Select a cartridge!"}
                      </div>
                      <div className="absolute bottom-8 w-full flex justify-center">
                        <div className="w-16 h-1 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute top-[420px] left-[60px] w-[120px] h-[120px]">
              <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[120px] h-[37px] bg-[#333] rounded-[5px]" />
              <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[37px] h-[120px] bg-[#333] rounded-[5px]" />

              <button 
                onClick={() => handleDPadClick('up')} 
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-[37px] h-[41px] z-10 flex items-center justify-center hover:scale-[0.97] hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]
                  ${currentPage >= totalPages ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-label="Previous page"
              >
                <FaCaretUp className="text-gray-500" />
              </button>
              <button 
                onClick={() => handleDPadClick('right')} 
                className={`absolute top-1/2 right-0 -translate-y-1/2 w-[41px] h-[37px] z-10 flex items-center justify-center shadow-lg hover:scale-[0.97] hover:shadow-[inset_-4px_0_8px_rgba(0,0,0,0.4)]
                  ${activeIndex === null || activeIndex >= displayedRepos.length - 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-label="Next project"
              >
                <FaCaretRight className="text-gray-500" />
              </button>
              <button 
                onClick={() => handleDPadClick('down')} 
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[37px] h-[41px] z-10 flex items-center justify-center shadow-lg hover:scale-[0.97] hover:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4)]
                  ${currentPage <= 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-label="Next page"
              >
                <FaCaretDown className="text-gray-500" />
              </button>
              <button 
                onClick={() => handleDPadClick('left')} 
                className={`absolute top-1/2 left-0 -translate-y-1/2 w-[41px] h-[37px] z-10 flex items-center justify-center shadow-lg hover:scale-[0.97] hover:shadow-[inset_4px_0_8px_rgba(0,0,0,0.4)]
                  ${activeIndex === null || activeIndex <= 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-label="Previous project"
              >
                <FaCaretLeft className="text-gray-500" />
              </button>
            </div>

            <div className="absolute top-[420px] right-[60px] w-[120px] h-[120px]">
              <button 
                onClick={handleAButtonClick} 
                className="absolute top-[22px] right-[0px] w-[45px] h-[45px] hover:shadow-inner hover:scale-[0.98] shadow-lg bg-[#333] rounded-full transform rotate-[-30deg] cursor-pointer flex items-center justify-center"
                aria-label="Open website"
              >
                <HiLink className="text-gray-500 text-xl transform rotate-[30deg]" />
              </button>
              <button 
                onClick={handleBButtonClick} 
                className="absolute top-[52px] right-[52px] w-[45px] h-[45px] hover:shadow-inner hover:scale-[0.98] shadow-lg bg-[#333] rounded-full transform rotate-[-30deg] cursor-pointer flex items-center justify-center"
                aria-label="Open GitHub"
              >
                <FaGithub className="text-gray-500 text-xl transform rotate-[30deg]" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
