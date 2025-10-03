const CACHE_NAME = 'portfolio-cache-v1';
const RUNTIME_CACHE = 'portfolio-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/favicon.ico',
  '/icons/1.svg',
  '/icons/2.svg',
  '/icons/3.svg',
  '/icons/4.svg',
  '/icons/5.svg',
  '/icons/6.svg',
  '/icons/7.svg',
  '/icons/8.svg',
  '/icons/9.svg',
  '/icons/10.svg',
  '/certs/boun.png',
  '/certs/cbbh.png',
  '/certs/fsmvu.png',
  '/certs/mad.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (event.request.url.includes('/models/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  if (event.request.url.match(/\.(png|jpg|jpeg|webp|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  if (event.request.url.includes('api.github.com')) {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        )
      ]).catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response(
            JSON.stringify({ error: 'Network unavailable' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
