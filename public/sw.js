self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/lifecoach-favicon.svg',
        '/lifecoach-logo-splash.svg',
        '/login.html',
        '/signup.html',
        '/life-coach-ui.html',
        '/public/aiService.js',
        '/public/api.js',
        '/public/db.js',
        '/public/focusService.js',
        '/public/goalService.js',
        '/public/planService.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== 'v1') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});