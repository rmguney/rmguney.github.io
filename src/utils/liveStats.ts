import type { Repository } from '../types';

const listUrl = (page: number): string =>
    `https://api.github.com/users/rmguney/repos?per_page=100&page=${page}`;
const TTL_KEY = 'live_stats_checked_at';
const TTL_MS = 15 * 60 * 1000;
const KILOBYTE = 1024;

const languagesUrl = (name: string): string =>
    `https://api.github.com/repos/rmguney/${encodeURIComponent(name)}/languages`;

interface LiveRepo {
    id: number;
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    size: number;
    stargazers_count: number;
    forks_count: number;
    fork: boolean;
}

const withinTtl = (): boolean => {
    try {
        const last = Number(localStorage.getItem(TTL_KEY) ?? 0);
        return Number.isFinite(last) && Date.now() - last < TTL_MS;
    } catch {
        return false;
    }
};

const markChecked = (): void => {
    try {
        localStorage.setItem(TTL_KEY, String(Date.now()));
    } catch {
        return;
    }
};

const synthesize = (raw: LiveRepo): Repository => ({
    id: raw.id,
    name: raw.name || 'Unnamed Repository',
    description: raw.description || 'No description available',
    url: (raw.homepage && raw.homepage !== '') ? raw.homepage : raw.html_url,
    githubUrl: raw.html_url || '#',
    color: '#fff',
    textColor: '#212121',
    language: raw.language || 'Unknown',
    size: raw.size || 0,
    stars: raw.stargazers_count || 0,
    forks: raw.forks_count || 0,
    watchers: 0,
    languages: raw.language ? { [raw.language]: (raw.size || 0) * KILOBYTE } : {},
    codeBytes: (raw.size || 0) * KILOBYTE,
    importanceFactor: 0,
    isGithubPage: !raw.homepage || raw.homepage === '',
    isPinned: false,
    isPortfolio: raw.name === 'rmguney.github.io',
    hasDeployments: false,
    hasPackages: false,
    ownerIsWatching: false
});

async function withRealLanguages(repo: Repository, name: string): Promise<Repository> {
    try {
        const response = await fetch(languagesUrl(name), {
            headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!response.ok) return repo;
        const languages = await response.json() as Record<string, number>;
        const codeBytes = Object.values(languages).reduce((total, bytes) => total + bytes, 0);
        if (!Number.isFinite(codeBytes) || codeBytes <= 0) return repo;
        return { ...repo, languages, codeBytes };
    } catch {
        return repo;
    }
}

export async function fetchReadmeFromApi(owner: string, repo: string): Promise<string | null> {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
            { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (!response.ok) return null;

        const data = await response.json() as { content?: string };
        if (!data.content) return null;

        const binary = window.atob(data.content.replace(/\n/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    } catch {
        return null;
    }
}

async function fetchAllLive(): Promise<LiveRepo[] | null> {
    const all: LiveRepo[] = [];
    for (let page = 1; ; page++) {
        try {
            const response = await fetch(listUrl(page), { headers: { Accept: 'application/vnd.github.v3+json' } });
            if (!response.ok) return null;
            const batch = await response.json() as LiveRepo[];
            if (!Array.isArray(batch)) return null;
            all.push(...batch);
            if (batch.length < 100) return all;
        } catch {
            return null;
        }
    }
}

const LIVE_MERGE_KEYS = [
    'name', 'description', 'url', 'githubUrl', 'language',
    'size', 'stars', 'forks', 'isGithubPage', 'isPortfolio'
] as const;

const mergeLive = (repo: Repository, fresh: LiveRepo): Repository => ({
    ...repo,
    name: fresh.name || repo.name,
    description: fresh.description || 'No description available',
    url: (fresh.homepage && fresh.homepage !== '') ? fresh.homepage : fresh.html_url,
    githubUrl: fresh.html_url || repo.githubUrl,
    language: fresh.language || 'Unknown',
    size: fresh.size || 0,
    stars: fresh.stargazers_count || 0,
    forks: fresh.forks_count || 0,
    isGithubPage: !fresh.homepage || fresh.homepage === '',
    isPortfolio: fresh.name === 'rmguney.github.io'
});

export async function applyLiveStats(baseline: Repository[]): Promise<Repository[] | null> {
    if (withinTtl()) return null;

    const live = await fetchAllLive();
    if (!live || live.length === 0) return null;
    markChecked();

    const sources = live.filter(repo => !repo.fork);
    const byId = new Map(sources.map(repo => [repo.id, repo]));
    let changed = false;

    const kept: Repository[] = [];
    for (const repo of baseline) {
        const fresh = byId.get(repo.id);
        if (!fresh) {
            changed = true;
            continue;
        }
        const merged = mergeLive(repo, fresh);
        const differs = LIVE_MERGE_KEYS.some(key => merged[key] !== repo[key]);
        kept.push(differs ? merged : repo);
        if (differs) changed = true;
    }

    const known = new Set(baseline.map(repo => repo.id));
    const added = await Promise.all(
        sources
            .filter(repo => !known.has(repo.id))
            .map(repo => withRealLanguages(synthesize(repo), repo.name))
    );
    if (added.length > 0) changed = true;

    return changed ? [...kept, ...added] : null;
}
