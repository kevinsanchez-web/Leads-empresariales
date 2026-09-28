// Service Worker for Applet Lead Capture & Push Notifications

const CACHE_NAME = 'lead-capture-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event
// La página HTML se pide siempre a la red primero (network-first), para que un despliegue nuevo
// se vea de inmediato en vez de quedar atrapado en la caché. El resto de assets (JS/CSS con hash
// en el nombre) sí pueden ser stale-while-revalidate porque su URL cambia en cada build.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline mode active', { status: 503, statusText: 'Service Unavailable' })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse || new Response('Offline mode active', { status: 503, statusText: 'Service Unavailable' });
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Push Event for Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: '⚡ Nuevo Lead Prioritario', body: 'Un ejecutivo ha registrado un nuevo lead prioritario.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Nuevo lead detectado en el sistema.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    tag: 'priority-lead-notification',
    renotify: true,
    actions: [
      { action: 'open', title: 'Ver Lead' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '⚡ Alerta de Lead Prioritario', options)
  );
});

// 5. Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
