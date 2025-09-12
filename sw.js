javascript
const CACHE_NAME = 'doctors-store-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/profile.html',
  '/product-detail.html',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/firebase-config.js',
  '/assets/js/auth.js',
  '/assets/js/ui.js',
  '/config.js',
  '/assets/lang/en.json',
  '/assets/lang/bn.json',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap'
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
