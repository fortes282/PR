/**
 * PWA Service worker (basic). Cache static assets; offline fallback to /offline page (G4, S2).
 * For full PWA use @ducanh2912/next-pwa or Next.js built-in.
 */
const CACHE_NAME = 'pristav-radosti-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNavigate = event.request.mode === 'navigate';
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        if (event.request.url.startsWith(self.location.origin) && res.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (isNavigate) return caches.match(OFFLINE_URL);
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
      )
  );
});
