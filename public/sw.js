const CACHE_NAME = 'v2'; // Cache sürümünü v2'ye yükselttik, eski agrasif cache silinecek!

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/lifecoach-favicon.svg',
        '/lifecoach-logo-splash.svg',
        '/login.html',
        '/signup.html',
        '/life-coach-ui.html'
      ]);
    }).then(() => self.skipWaiting()) // Yeni SW'nin hemen kurulmasını sağlar
  );
});

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini önbellekle
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // NETWORK FIRST STRATEJİSİ: Önce her zaman güncel dosyayı internetten çekmeyi dene!
    fetch(event.request).then((networkResponse) => {
      // Başarılı olursa cache'i güncelle (Gelecekte offline olursa en sonuncuyu sorsun diye)
      if (networkResponse.ok) {
        return caches.open(CACHE_NAME).then((cache) => {
          // Eklentiler veya farklı DOMAIN'lerden gelen istekleri bazen cache'leyemeyebilir
          if (event.request.url.startsWith(self.location.origin)) {
             // API endpointlerini cacheleme!
             if (!event.request.url.includes('/api/')) {
               cache.put(event.request, networkResponse.clone());
             }
          }
          return networkResponse;
        });
      }
      return networkResponse;
    }).catch(() => {
      // INTERNET YOKSA (Offline isek) cache'den dön!
      return caches.match(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Yeni versiyon olmayan bütün eski cache'leri (Özellikle o meşhur v1'i) sil!
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Hızlıca kontrolü ele al
  );
});