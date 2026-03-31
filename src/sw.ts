/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

const CACHE_NAME = 'portfolio-cache-v3';
const RUNTIME_CACHE = 'portfolio-runtime-v3';

const PRECACHE_URLS = self.__WB_MANIFEST.map((entry) =>
    typeof entry === 'string' ? entry : entry.url
);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter((cacheName) => !currentCaches.includes(cacheName))
                        .map((cacheName) => caches.delete(cacheName))
                )
            )
            .then(() => caches.open(CACHE_NAME))
            .then((cache) =>
                cache.keys().then((requests) =>
                    Promise.all(
                        requests
                            .filter((request) => !PRECACHE_URLS.includes(new URL(request.url).pathname))
                            .map((request) => cache.delete(request))
                    )
                )
            )
            .then(() => self.clients.claim())
    );
});

function cacheFirst(request: Request): Promise<Response> {
    return caches.match(request).then(
        (cached) =>
            cached ??
            fetch(request).then((response) =>
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, response.clone());
                    return response;
                })
            )
    );
}

function networkFirst(request: Request): Promise<Response> {
    return fetch(request)
        .then((response) => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
        })
        .catch(async () => {
            const cached = await caches.match(request);
            if (cached) return cached;
            return new Response('Network unavailable', { status: 503 });
        });
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
        return;
    }
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/models/') || pathname.startsWith('/draco/') || /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    event.respondWith(networkFirst(request));
});
