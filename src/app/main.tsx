import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const scheduleNonCriticalWork = (callback: () => void, timeoutMs: number) => {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  const runWhenPossible = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => callback(), { timeout: timeoutMs });
      return;
    }

    setTimeout(callback, timeoutMs);
  };

  if (document.readyState === 'complete') {
    runWhenPossible();
    return;
  }

  window.addEventListener('load', runWhenPossible, { once: true });
};

const cleanLegacyCaches = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const cacheNames = await caches.keys();
    const legacyCaches = cacheNames.filter((name) => {
      return (
        name === 'google-fonts-cache' ||
        name === 'google-fonts-static-cache' ||
        name === 'dynamic-assets'
      );
    });
    await Promise.all(legacyCaches.map((name) => caches.delete(name)));
  } catch {
    // Ignore errors during cleanup
  }
};

const registerSW = async (swUrl: string) => {
  const registration = await navigator.serviceWorker.register(swUrl, {
    updateViaCache: 'none'
  });

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });

  return registration;
};

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

if (import.meta.env.PROD) {
  let refreshing = false;
  let hasSeenController = 'serviceWorker' in navigator && navigator.serviceWorker.controller != null;

  scheduleNonCriticalWork(async () => {
    await cleanLegacyCaches();

    if ('serviceWorker' in navigator) {
      try {
        const registration = await registerSW('/sw.js');
        void registration.update();

        setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void registration.update();
          }
        });
      } catch {
        // Registration failed, ignore
      }
    }
  }, 3000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) {
        return;
      }

      if (!hasSeenController) {
        hasSeenController = true;
        return;
      }

      refreshing = true;
      window.location.reload();
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
