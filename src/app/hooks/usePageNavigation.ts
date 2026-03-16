import { useCallback, useEffect, useState } from 'react';

export type AppPage = 'dashboard' | 'routines' | 'admin' | 'sports';

export type PageTransitionDirection = 'forward' | 'backward';

const getPageFromPathname = (pathname: string): AppPage => {
  if (pathname.startsWith('/routines')) {
    return 'routines';
  }
  if (pathname.startsWith('/admin')) {
    return 'admin';
  }
  if (pathname.startsWith('/sports')) {
    return 'sports';
  }
  return 'dashboard';
};

const getPathnameFromPage = (page: AppPage): string => {
  if (page === 'routines') return '/routines';
  if (page === 'admin') return '/admin';
  if (page === 'sports') return '/sports';
  return '/';
};

const getTransitionDirection = (from: AppPage, to: AppPage): PageTransitionDirection => {
  if (from === to) return 'forward';
  const pageOrder: AppPage[] = ['dashboard', 'routines', 'admin'];
  return pageOrder.indexOf(to) >= pageOrder.indexOf(from) ? 'forward' : 'backward';
};

export const usePageNavigation = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    if (typeof window === 'undefined') {
      return 'dashboard';
    }
    return getPageFromPathname(window.location.pathname);
  });
  const [transitionDirection, setTransitionDirection] = useState<PageTransitionDirection>('forward');
  const [transitionVersion, setTransitionVersion] = useState(0);

  const beginPageTransition = useCallback((nextPage: AppPage) => {
    setCurrentPage((previousPage) => {
      if (previousPage === nextPage) {
        return previousPage;
      }

      setTransitionDirection(getTransitionDirection(previousPage, nextPage));
      setTransitionVersion((previousVersion) => previousVersion + 1);

      return nextPage;
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const allowedPaths = new Set(['/', '/routines', '/admin', '/sso-callback', '/sports']);
    if (!allowedPaths.has(window.location.pathname)) {
      window.history.replaceState({}, '', '/');
      setCurrentPage('dashboard');
      setTransitionDirection('backward');
      setTransitionVersion((previousVersion) => previousVersion + 1);
    }

    const handlePopState = () => {
      beginPageTransition(getPageFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [beginPageTransition]);

  const handlePageChange = useCallback((nextPage: AppPage) => {
    beginPageTransition(nextPage);

    if (typeof window === 'undefined') return;

    const targetPathname = getPathnameFromPage(nextPage);
    if (window.location.pathname !== targetPathname) {
      window.history.pushState({}, '', targetPathname);
    }
  }, [beginPageTransition]);

  return {
    currentPage,
    transitionDirection,
    transitionVersion,
    handlePageChange
  };
};
