import { Cache } from 'three';
import { loadProgress } from './loadProgress';

interface PrefetchEntry {
    loaded: number;
    total: number;
    done: boolean;
}

Cache.enabled = true;

const entries: PrefetchEntry[] = [];
let prefetchPromise: Promise<void> | null = null;

function publish(): void {
    let loaded = 0;
    let total = 0;
    for (const entry of entries) {
        loaded += entry.loaded;
        total += Math.max(entry.total, entry.done ? entry.loaded : entry.loaded + 1);
    }
    if (total > 0) loadProgress.setPhase('assets', loaded / total);
}

async function fetchIntoCache(url: string): Promise<void> {
    const entry: PrefetchEntry = { loaded: 0, total: 0, done: false };
    entries.push(entry);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Asset fetch failed: ${response.status} ${url}`);
        entry.total = Number(response.headers.get('Content-Length')) || 0;
        publish();

        let buffer: ArrayBuffer;
        if (response.body) {
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                entry.loaded += value.byteLength;
                publish();
            }
            const merged = new Uint8Array(entry.loaded);
            let offset = 0;
            for (const chunk of chunks) {
                merged.set(chunk, offset);
                offset += chunk.byteLength;
            }
            buffer = merged.buffer;
        } else {
            buffer = await response.arrayBuffer();
            entry.loaded = buffer.byteLength;
        }

        Cache.add(`file:${url}`, buffer);
        entry.done = true;
        entry.total = Math.max(entry.total, entry.loaded);
        publish();
    } catch (error) {
        entries.splice(entries.indexOf(entry), 1);
        publish();
        throw error;
    }
}

export function prefetchAssets(urls: string[]): Promise<void> {
    if (!prefetchPromise) {
        prefetchPromise = Promise.allSettled(urls.map(fetchIntoCache)).then(() => undefined);
    }
    return prefetchPromise;
}
