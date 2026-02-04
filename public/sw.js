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

// Web Push: show notification when a push message is received
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Oznámení', body: '', url: '/' };
  try {
    const data = event.data.json();
    if (data && typeof data === 'object') {
      if (data.title) payload.title = data.title;
      if (data.body) payload.body = data.body;
      if (data.url) payload.url = data.url;
    }
  } catch (_) {
    payload.body = event.data.text();
  }
  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: payload.url },
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList[0]) {
        clientList[0].navigate(url);
        clientList[0].focus();
      } else if (self.clients.openWindow) {
        self.clients.openWindow(self.location.origin + url);
      }
    })
  );
});
