const CACHE_NAME = 'music-stream-cache-v1';
const CACHE_URLS = [];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // We primarily want to intercept calls to our backend streaming API or direct audio media URLs.
  // /api/stream/ returns JSON, so caching it is fine.
  // However, actual audio media URLs usually end in .m4a, .mp4, .webm, .mp3 or originate from rr---sn-xxxx.googlevideo.com
  
  const isApiStream = url.pathname.startsWith('/api/stream/');
  
  if (isApiStream || event.request.destination === 'audio' || event.request.destination === 'video') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Don't cache partial responses (206) because it complicates offline playback,
          // though for true offline audio, caching 206 is sometimes required.
          // For simplicity, we cache opaque and 200 responses.
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((err) => {
              // Ignore QuotaExceededError or partial response issues
            });
          });

          return networkResponse;
        }).catch(() => {
          // Offline and not in cache
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
  }
});
