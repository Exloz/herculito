// Service Worker for Herculito PWA
const CACHE_NAME = 'herculito-v1';

self.addEventListener('install', () => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service Worker activating');
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (!request.url.startsWith('http')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data } = event.data;
    showNotification(title, body, icon, badge, tag, data);
  }
});

function showNotification(title, body, icon = '/app-logo.png', badge = '/app-logo.png', tag = 'herculito-notification', data) {
  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data
  };

  if (self.registration.showNotification(title, options)) {
    console.log('Notification shown successfully');
  } else {
    console.warn('Failed to show notification');
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag } = data;

    showNotification(
      title || 'Herculito',
      body || 'Nueva notificación',
      icon,
      badge,
      tag
    );
  } catch (error) {
    console.error('Error parsing push notification:', error);
    showNotification('Herculito', 'Nueva notificación');
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workout-data') {
    event.waitUntil(syncWorkoutData());
  }
});

async function syncWorkoutData() {
  try {
    const clientsList = await clients.matchAll();
    for (const client of clientsList) {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true
      });
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
