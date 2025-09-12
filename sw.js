const CACHE_NAME = 'doctors-store-v1';
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
  '/assets/lang/bn.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
