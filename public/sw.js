// Service Worker for PWA notifications
const CACHE_NAME = 'herculito-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', () => {
  console.log('Service Worker activating');
  self.clients.claim();
});

// Message event to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge } = event.data;
    showNotification(title, body, icon, badge);
  }
});

// Function to show notification
function showNotification(title, body, icon = '/app-logo.png', badge = '/app-logo.png') {
  const options = {
    body,
    icon,
    badge,
    tag: 'rest-timer',
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200] // Vibration pattern for mobile
  };

  self.registration.showNotification(title, options);
}

// Push event (for future push notifications)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    showNotification(data.title, data.body);
  }
});