/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Chromium can re-alert when an existing tagged notification is replaced.
interface NotificationOptions {
  renotify?: boolean;
}
