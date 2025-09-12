const CACHE_NAME = 'doctors-store-v3'; // Incremented version to force update
const urlsToCache = [
  '/',
  '/index.html',
  '/profile.html',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/firebase-config.js',
  '/assets/js/auth.js',
  '/assets/js/ui.js',
  '/assets/js/profile.js',
  '/config.js',
  '/assets/lang/en.json',
  '/assets/lang/bn.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching essential assets');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }
  
  // Strategy: Cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(CACHE_NAME).then(cache => {
          return fetch(event.request).then(networkResponse => {
            // Only cache successful responses from our own origin
            if (networkResponse && networkResponse.status === 200 && new URL(event.request.url).origin === self.location.origin) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
  );
});
