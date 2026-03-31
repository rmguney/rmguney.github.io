import type { Repository } from '../types';

const LIST_URL = 'https://api.github.com/users/rmguney/repos?per_page=100';
const TTL_KEY = 'live_stats_checked_at';
const TTL_MS = 15 * 60 * 1000;

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
    languages: raw.language ? { [raw.language]: raw.size || 0 } : {},
    codeBytes: raw.size || 0,
    importanceFactor: 0,
    isGithubPage: !raw.homepage || raw.homepage === '',
    isPinned: false,
    isPortfolio: raw.name === 'rmguney.github.io',
    hasDeployments: false,
    hasPackages: false,
    ownerIsWatching: false
});

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

export async function applyLiveStats(baseline: Repository[]): Promise<Repository[] | null> {
    if (withinTtl()) return null;

    let live: LiveRepo[];
    try {
        const response = await fetch(LIST_URL, { headers: { Accept: 'application/vnd.github.v3+json' } });
        if (!response.ok) return null;
        live = await response.json();
    } catch {
        return null;
    }

    if (!Array.isArray(live) || live.length === 0) return null;
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
        if (fresh.stargazers_count !== repo.stars || fresh.forks_count !== repo.forks) {
            kept.push({ ...repo, stars: fresh.stargazers_count, forks: fresh.forks_count });
            changed = true;
        } else {
            kept.push(repo);
        }
    }

    const known = new Set(baseline.map(repo => repo.id));
    const added = sources.filter(repo => !known.has(repo.id)).map(synthesize);
    if (added.length > 0) changed = true;

    return changed ? [...kept, ...added] : null;
}
