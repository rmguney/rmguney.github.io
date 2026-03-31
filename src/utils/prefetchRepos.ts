import type { Repository, FetchReposResult } from '../types';

const DATA_URL = '/repos.json';
const CACHE_KEY = 'github_repos_cache';

let fetchPromise: Promise<FetchReposResult> | null = null;
let cachedResult: FetchReposResult | null = null;

const readFallback = (): Repository[] | null => {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (!stored) return null;
        const { repos } = JSON.parse(stored) as { repos: Repository[] };
        return Array.isArray(repos) && repos.length > 0 ? repos : null;
    } catch {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
};

const writeFallback = (repos: Repository[]): void => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ repos, timestamp: Date.now() }));
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            localStorage.removeItem(CACHE_KEY);
        }
    }
};

export async function fetchReposData(): Promise<FetchReposResult> {
    if (cachedResult) {
        return cachedResult;
    }

    if (fetchPromise) {
        return fetchPromise;
    }

    fetchPromise = (async () => {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`Repo data unavailable: ${response.status}`);
            }

            const repos: Repository[] = await response.json();
            writeFallback(repos);

            cachedResult = { repos, fromCache: false };
            return cachedResult;
        } catch (err) {
            const fallback = readFallback();
            if (fallback) {
                cachedResult = { repos: fallback, fromCache: true };
                return cachedResult;
            }
            fetchPromise = null;
            throw err;
        }
    })();

    return fetchPromise;
}

void fetchReposData();
