const CACHE_NAME = 'doctors-store-v2'; // Changed version to force update
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
  '/assets/icons/icon-192x192.png', // Added icons to cache list
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
  self.skipWaiting(); // Force the new service worker to be active
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
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Return from cache, or fetch from network and update cache
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            cache.put(event.request, responseToCache);
          }
          return networkResponse;
        });
        
        return response || fetchPromise;
      });
    })
  );
});
