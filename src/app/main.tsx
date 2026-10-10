import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getApiOrigin } from '../shared/api/transport';
import { isLocalPreview } from './preview/previewMode';
import { ThemeProvider } from './theme/ThemeProvider';
import { applyTheme, readTheme } from './theme/themes';
import '../index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
applyTheme(readTheme());
const APP_UPDATE_AVAILABLE_EVENT = 'app-update-available';
const APP_ACTIVATE_UPDATE_EVENT = 'app-activate-update';
const APP_UPDATE_READY_KEY = 'app-update-ready';

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

  const announceUpdate = () => {
    try {
      window.sessionStorage.setItem(APP_UPDATE_READY_KEY, 'true');
    } catch {
      // The live event still exposes the update when storage is unavailable.
    }
    window.dispatchEvent(new Event(APP_UPDATE_AVAILABLE_EVENT));
  };

  if (registration.waiting && navigator.serviceWorker.controller) {
    announceUpdate();
  }

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        announceUpdate();
      }
    });
  });

  window.addEventListener(APP_ACTIVATE_UPDATE_EVENT, () => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });

  return registration;
};

if (!isLocalPreview() && !PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

if (!isLocalPreview()) getApiOrigin();

if (import.meta.env.PROD) {
  let activationRequested = false;
  window.addEventListener(APP_ACTIVATE_UPDATE_EVENT, () => {
    activationRequested = true;
  });
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (activationRequested) window.location.reload();
  });

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
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

if (import.meta.env.DEV && isLocalPreview()) {
  void Promise.all([import('./preview/PreviewRoot'), import('./preview/previewStorage')])
    .then(([{ PreviewRoot }, { resetPreviewStorage }]) => {
      try {
        resetPreviewStorage(window.localStorage);
      } catch {
        window.console.warn('No se pudo reiniciar el almacenamiento de la preview.');
      }
      createRoot(document.getElementById('root')!).render(
        <StrictMode><ThemeProvider><PreviewRoot /></ThemeProvider></StrictMode>
      );
    });
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/" appearance={{
          variables: {
            colorPrimary: 'rgb(var(--color-accent))',
            colorBackground: 'rgb(var(--color-surface))',
            colorForeground: 'rgb(var(--color-text))',
            colorMutedForeground: 'rgb(var(--color-text-muted))',
            colorInput: 'rgb(var(--color-raised))',
            colorInputForeground: 'rgb(var(--color-text))',
          }
        }}>
          <App />
        </ClerkProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
