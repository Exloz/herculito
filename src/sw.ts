import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
};

// Always skip waiting immediately to activate new SW versions
self.skipWaiting();

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the new SW takes control
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW] Activated and claimed all clients');
    })
  );
  
  // Clean up old caches
  cleanupOutdatedCaches();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Precache and route with immediate cache updates
precacheAndRoute(self.__WB_MANIFEST, {
  // Ensure we always check for updates
  cleanURLs: false
});

registerRoute(
  ({ url }: { url: URL }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache'
  })
);

registerRoute(
  ({ url }: { url: URL }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-static-cache'
  })
);

type PushPayload = {
  title?: unknown;
  body?: unknown;
  url?: unknown;
  tag?: unknown;
};

const getString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);

const DEFAULT_NOTIFICATION_URL = self.location.origin;
const ALLOWED_NOTIFICATION_ORIGINS = new Set<string>([
  self.location.origin,
  'https://herculito.exloz.site'
]);

const getSafeNotificationUrl = (value: unknown): string => {
  const raw = getString(value);
  if (!raw) return DEFAULT_NOTIFICATION_URL;

  try {
    const parsed = new URL(raw, self.location.origin);
    if (parsed.protocol !== 'https:') {
      return DEFAULT_NOTIFICATION_URL;
    }
    if (!ALLOWED_NOTIFICATION_ORIGINS.has(parsed.origin)) {
      return DEFAULT_NOTIFICATION_URL;
    }
    return parsed.href;
  } catch {
    return DEFAULT_NOTIFICATION_URL;
  }
};

self.addEventListener('push', (event: PushEvent) => {
  const data = (() => {
    try {
      return (event.data?.json() ?? {}) as PushPayload;
    } catch {
      return {} as PushPayload;
    }
  })();

  const title = getString(data.title) ?? '¡Descanso terminado!';
  const body = getString(data.body) ?? 'Continúa con tu entrenamiento.';
  const url = getSafeNotificationUrl(data.url);
  const tag = getString(data.tag) ?? 'rest-timer';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/app-logo.png',
      badge: '/app-logo.png',
      data: { url }
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const notification = event.notification;
  notification.close();

  const data = notification.data as { url?: unknown } | undefined;
  const url = getSafeNotificationUrl(data?.url);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        await client.focus();
        return;
      }

      await self.clients.openWindow(url);
    })()
  );
});
