const CACHE_NAME = 'v3'; // Cache sürümünü v3'e yükselttik, eski hatalı cache temizlenecek.

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
  // Sadece GET isteklerini işle, POST vb. tarayıcıya bırak
  if (event.request.method !== 'GET') return;

  // Sadece kendi domainimizdeki dosyaları işle
  // Harici kaynakları (Google Fonts, CDN vb.) tarayıcıya bırakıyoruz ki CORS sorunları oluşmasın
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      // Başarılı ise cache'e ekle (API çağrıları hariç)
      if (networkResponse && networkResponse.ok && !event.request.url.includes('/api/')) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // İnternet hatası durumunda cache'den yükle
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        // Eğer cache'de de yoksa, anlamlı bir hata Response'u dön (undefined değil!)
        return new Response('İnternet bağlantısı yok ve kaynak önbellekte bulunamadı.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
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