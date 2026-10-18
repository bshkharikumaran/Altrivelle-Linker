// Altrivelle Linker — High Performance Production Service Worker
const CACHE_NAME = 'altrivelle-linker-v1.2.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon.png',
  '/placeholder.svg',
  '/robots.txt',
  '/assets/altrivelle-linker-logo.png',
  '/assets/altrivelle-linker-logo.jpg',
];

// Installation: Cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation: Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET, chrome-extension, or Supabase real-time/API endpoints
  if (
    request.method !== 'GET' ||
    !request.url.startsWith('http') ||
    request.url.includes('supabase.co') ||
    request.url.includes('/api/') ||
    request.url.includes('socket.io') ||
    request.headers.get('upgrade') === 'websocket'
  ) {
    return;
  }

  // Navigation requests: Network-first, fallback to cache/index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match('/index.html');
      })
    );
    return;
  }

  // Static assets (images, fonts, css, js): Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
