import { mkdir, writeFile, rm } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Repository, RepoLanguages } from '../types';

const USER = 'rmguney';
const OUT_DIR = 'public';
const README_DIR = path.join(OUT_DIR, 'readmes');

if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
        const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
        }
    }
}

const repoSpawner = process.env.BALLOON_SEED;

let authActive = Boolean(repoSpawner);

const buildHeaders = (): Record<string, string> => ({
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': `${USER}-portfolio-build`,
    ...(authActive ? { 'Authorization': `token ${repoSpawner}` } : {})
});

interface RawRepo {
    id: number;
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    size: number;
    stargazers_count: number;
    forks_count: number;
    watchers_count: number;
    fork: boolean;
}

interface RepoDetail {
    subscribers_count?: number;
}

interface WatchedRepo {
    name: string;
    owner: { login: string };
}

interface ReadmeResponse {
    content?: string;
}

interface PinnedResponse {
    data?: {
        user?: {
            pinnedItems?: {
                nodes?: Array<{ name?: string }>;
            };
        };
    };
}

let requestCount = 0;

async function gh<T>(url: string, attempt = 0): Promise<T | null> {
    requestCount++;
    let response: Response;

    try {
        response = await fetch(url, { headers: buildHeaders() });
    } catch (err) {
        if (attempt < 2) return gh<T>(url, attempt + 1);
        console.warn(`  ! network error on ${url}: ${(err as Error).message}`);
        return null;
    }

    if (response.status === 404) return null;

    if (response.status === 401 && authActive) {
        console.warn('  ! rejected by GitHub, continuing anonymously');
        authActive = false;
        return gh<T>(url, attempt);
    }

    if (response.status === 403 || response.status === 429) {
        if (response.headers.get('x-ratelimit-remaining') === '0') {
            const reset = Number(response.headers.get('x-ratelimit-reset'));
            const minutes = reset ? Math.ceil((reset * 1000 - Date.now()) / 60000) : 0;
            console.warn(`  ! rate limit exhausted${minutes > 0 ? `, resets in ~${minutes}m` : ''}`);
            return null;
        }

        const retryAfter = Number(response.headers.get('retry-after'));
        const body = await response.json().catch(() => ({})) as { message?: string };
        const throttled = retryAfter > 0 || /secondary rate limit|abuse/i.test(body.message ?? '');

        if (!throttled) {
            console.warn(`  ! ${response.status} on ${url}: ${body.message ?? 'forbidden'}`);
            return null;
        }

        if (attempt < 3) {
            const wait = retryAfter || 2 ** attempt * 5;
            console.warn(`  ~ throttled on ${url}, waiting ${wait}s`);
            await new Promise(resolve => setTimeout(resolve, wait * 1000));
            return gh<T>(url, attempt + 1);
        }
        return null;
    }

    if (!response.ok) {
        console.warn(`  ! ${response.status} on ${url}`);
        return null;
    }

    return response.json() as Promise<T>;
}

async function fetchPinned(): Promise<Set<string>> {
    if (!authActive) {
        console.warn('  ~ running anonymously, skipping pinned lookup');
        return new Set();
    }

    const query = `
    query {
      user(login: "${USER}") {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes { ... on Repository { name } }
        }
      }
    }
  `;

    try {
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${repoSpawner}`,
                'Content-Type': 'application/json',
                'User-Agent': `${USER}-portfolio-build`
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            console.warn(`  ! pinned lookup returned ${response.status}`);
            return new Set();
        }

        const body = await response.json() as PinnedResponse;
        const nodes = body.data?.user?.pinnedItems?.nodes ?? [];
        return new Set(nodes.map(node => node?.name).filter((name): name is string => Boolean(name)));
    } catch (err) {
        console.warn(`  ! pinned lookup failed: ${(err as Error).message}`);
        return new Set();
    }
}

async function fetchWatched(): Promise<Set<string>> {
    if (!authActive) {
        console.warn('  ~ running anonymously, ownerIsWatching will be false');
        return new Set();
    }

    const subs = await gh<WatchedRepo[]>('https://api.github.com/user/subscriptions?per_page=100');
    if (!Array.isArray(subs)) {
        console.warn('  ~ could not read watch list, ownerIsWatching will be false');
        return new Set();
    }

    return new Set(subs.filter(s => s.owner?.login === USER).map(s => s.name));
}

const calculateCodeBytes = (languages: RepoLanguages): number =>
    Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

const calculateImportance = (repo: Repository): number => {
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

    return repo.isPinned ? totalImportance * 1e21 : totalImportance;
};

async function main(): Promise<void> {
    console.log(repoSpawner
        ? 'Building repo data (authenticated)...'
        : 'Building repo data (anonymous — pinned order will be lost)...');

    const rawRepos = await gh<RawRepo[]>(`https://api.github.com/users/${USER}/repos?per_page=100`);
    if (!Array.isArray(rawRepos)) {
        throw new Error('Could not read the repository list; refusing to emit a partial repos.json');
    }

    const sources = rawRepos.filter(repo => !repo.fork);
    console.log(`  ${sources.length} source repos`);

    const [pinned, watched] = await Promise.all([fetchPinned(), fetchWatched()]);

    const repos: Repository[] = await Promise.all(sources.map(async raw => {
        const name = raw.name;

        const [languages, detail, deployments, releases] = await Promise.all([
            gh<RepoLanguages>(`https://api.github.com/repos/${USER}/${name}/languages`),
            gh<RepoDetail>(`https://api.github.com/repos/${USER}/${name}`),
            gh<unknown[]>(`https://api.github.com/repos/${USER}/${name}/deployments`),
            gh<unknown[]>(`https://api.github.com/repos/${USER}/${name}/releases`)
        ]);

        const repo: Repository = {
            id: raw.id,
            name: name || 'Unnamed Repository',
            description: raw.description || 'No description available',
            url: (raw.homepage && raw.homepage !== '') ? raw.homepage : raw.html_url,
            githubUrl: raw.html_url || '#',
            color: '#fff',
            textColor: '#212121',
            language: raw.language || 'Unknown',
            size: raw.size || 0,
            stars: raw.stargazers_count || 0,
            forks: raw.forks_count || 0,
            watchers: detail?.subscribers_count ?? 0,
            languages: languages ?? {},
            codeBytes: calculateCodeBytes(languages ?? {}),
            importanceFactor: 0,
            isGithubPage: !raw.homepage || raw.homepage === '',
            isPinned: pinned.has(name),
            isPortfolio: name === 'rmguney.github.io',
            hasDeployments: Array.isArray(deployments) && deployments.length > 0,
            hasPackages: Array.isArray(releases) && releases.length > 0,
            ownerIsWatching: watched.has(name)
        };

        repo.importanceFactor = calculateImportance(repo);
        return repo;
    }));

    repos.sort((a, b) => b.importanceFactor - a.importanceFactor);

    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(path.join(OUT_DIR, 'repos.json'), JSON.stringify(repos), 'utf8');
    console.log(`  wrote public/repos.json (${repos.length} repos)`);

    const needsReadme = repos.filter(repo => repo.isGithubPage || repo.isPortfolio);

    const fetched = await Promise.all(needsReadme.map(async repo => {
        const data = await gh<ReadmeResponse>(`https://api.github.com/repos/${USER}/${repo.name}/readme`);
        if (!data?.content) return null;
        return {
            name: repo.name,
            body: Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
        };
    }));

    const readmes = fetched.filter((entry): entry is { name: string; body: string } => entry !== null);

    if (needsReadme.length > 0 && readmes.length === 0) {
        throw new Error(
            `all ${needsReadme.length} README fetches failed, so the existing files were left alone. `
        );
    }

    if (readmes.length < needsReadme.length) {
        console.warn(`  ! only ${readmes.length}/${needsReadme.length} readmes resolved`);
    }

    await rm(README_DIR, { recursive: true, force: true });
    await mkdir(README_DIR, { recursive: true });
    await Promise.all(readmes.map(entry =>
        writeFile(path.join(README_DIR, `${entry.name}.md`), entry.body, 'utf8')
    ));

    console.log(`  wrote ${readmes.length}/${needsReadme.length} readmes`);

    const digest = createHash('sha256');
    digest.update(JSON.stringify(repos));
    for (const entry of [...readmes].sort((a, b) => a.name.localeCompare(b.name))) {
        digest.update(entry.name);
        digest.update(entry.body);
    }
    const hash = digest.digest('hex');
    await writeFile(path.join(OUT_DIR, 'data-manifest.json'), JSON.stringify({ hash }), 'utf8');
    console.log(`  manifest ${hash.slice(0, 12)}`);

    console.log(`Done in ${requestCount} API requests.`);
}

main().catch((err: Error) => {
    console.error(`\nRepo data build failed: ${err.message}`);
    process.exit(1);
});
