import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import '../index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

// Clear all caches on load to fix corrupted cache issues
if (typeof window !== 'undefined') {
  void caches?.keys().then(cacheNames => {
    console.log('[PWA] Clearing all caches on startup:', cacheNames);
    return Promise.all(cacheNames.map(name => caches.delete(name)));
  }).then(() => {
    console.log('[PWA] All caches cleared');
  });
}

if (import.meta.env.PROD) {
  let refreshing = false;

  const registerServiceWorker = () => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) {
          console.log('[PWA] No SW registration available');
          return;
        }

        console.log('[PWA] SW registered, checking for updates...');

        // Check for updates every 5 minutes (was 60 minutes)
        const checkForUpdates = () => {
          console.log('[PWA] Checking for SW updates...');
          void registration.update();
        };

        setInterval(checkForUpdates, 5 * 60 * 1000);

        // Check when tab becomes visible
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            console.log('[PWA] Tab visible, checking for updates...');
            checkForUpdates();
          }
        });

        // Also check on page load/refresh
        checkForUpdates();
      },
      onNeedRefresh() {
        console.log('[PWA] New version available, reloading...');
        // Force reload to get new version
        void updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] App ready for offline use');
      }
    });

    return updateSW;
  };

  // Register immediately, don't delay
  const updateSW = registerServiceWorker();

  // Listen for controller changes (SW updates)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] SW controller changed');
      if (refreshing) {
        return;
      }

      refreshing = true;
      console.log('[PWA] Reloading page for new version...');
      window.location.reload();
    });

    // Also check if there's already a waiting SW on load
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        console.log('[PWA] Found waiting SW, triggering update...');
        void updateSW(true);
      }
    });
  }
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>
);
