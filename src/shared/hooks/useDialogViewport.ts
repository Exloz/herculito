import { useEffect, useState, type CSSProperties } from 'react';

const MOBILE_MEDIA_QUERY = '(max-width: 767px), (pointer: coarse)';

interface UseDialogViewportOptions {
  enabled?: boolean;
  trimOffset?: number;
  minHeight?: number;
}

interface DialogViewportState {
  backdropStyle: CSSProperties;
  panelStyle: CSSProperties;
}

export const useDialogViewport = ({
  enabled = true,
  trimOffset = 0,
  minHeight = 240
}: UseDialogViewportOptions = {}): DialogViewportState => {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [viewportState, setViewportState] = useState<DialogViewportState>({
    backdropStyle: {},
    panelStyle: {}
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const syncMobileState = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncMobileState();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMobileState);
      return () => mediaQuery.removeEventListener('change', syncMobileState);
    }

    mediaQuery.addListener(syncMobileState);
    return () => mediaQuery.removeListener(syncMobileState);
  }, []);

  useEffect(() => {
    if (!enabled || !isMobileViewport || typeof window === 'undefined') {
      setViewportState({ backdropStyle: {}, panelStyle: {} });
      return;
    }

    const updateViewport = () => {
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportOffsetTop = viewport?.offsetTop ?? 0;

      setViewportState({
        backdropStyle: {
          left: 0,
          right: 0,
          top: viewportOffsetTop,
          height: viewportHeight
        },
        panelStyle: {
          height: Math.max(minHeight, viewportHeight - trimOffset)
        }
      });
    };

    updateViewport();

    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, [enabled, isMobileViewport, minHeight, trimOffset]);

  return viewportState;
};
