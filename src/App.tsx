import { useEffect, useRef, useState, Suspense, lazy, useCallback } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Login } from './pages/Login';
import { Navigation } from './components/Navigation';
import { useAuth } from './hooks/useAuth';
import { ScrollToTop } from './components/ScrollToTop';
import { UIProvider } from './contexts/UIContext';
import { useUI } from './contexts/ui-context';
import { PageSkeleton } from './components/PageSkeleton';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Routines = lazy(() => import('./pages/NewRoutines').then(module => ({ default: module.Routines })));

type AppPage = 'dashboard' | 'routines';

type PageTransitionDirection = 'forward' | 'backward';

const PAGE_TRANSITION_LOADING_MS = 420;

const getPageFromPathname = (pathname: string): AppPage => {
  if (pathname.startsWith('/routines')) {
    return 'routines';
  }
  return 'dashboard';
};

const getPathnameFromPage = (page: AppPage): string => {
  return page === 'routines' ? '/routines' : '/';
};

const getTransitionDirection = (from: AppPage, to: AppPage): PageTransitionDirection => {
  if (from === to) return 'forward';
  return to === 'routines' ? 'forward' : 'backward';
};

const LoadingScreen = () => (
  <PageSkeleton page="dashboard" />
);

const AuthErrorToast = ({ message }: { message: string | null }) => {
  const { showToast } = useUI();

  useEffect(() => {
    if (message) {
      showToast(message, 'error');
    }
  }, [message, showToast]);

  return null;
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    if (typeof window === 'undefined') {
      return 'dashboard';
    }
    return getPageFromPathname(window.location.pathname);
  });
  const [transitionDirection, setTransitionDirection] = useState<PageTransitionDirection>('forward');
  const [transitionVersion, setTransitionVersion] = useState(0);
  const [isPageTransitionLoading, setIsPageTransitionLoading] = useState(false);
  const transitionLoadingTimerRef = useRef<number | null>(null);
  const {
    user,
    loading,
    error,
    signInWithGoogle,
    requiresSafariForGoogleSignIn,
    safariLoginUrl,
    openSafariForGoogleLogin,
    logout
  } = useAuth();

  useEffect(() => {
    return () => {
      if (transitionLoadingTimerRef.current !== null) {
        window.clearTimeout(transitionLoadingTimerRef.current);
      }
    };
  }, []);

  const runTransitionLoading = useCallback(() => {
    setIsPageTransitionLoading(true);

    if (transitionLoadingTimerRef.current !== null) {
      window.clearTimeout(transitionLoadingTimerRef.current);
    }

    transitionLoadingTimerRef.current = window.setTimeout(() => {
      setIsPageTransitionLoading(false);
      transitionLoadingTimerRef.current = null;
    }, PAGE_TRANSITION_LOADING_MS);
  }, []);

  const beginPageTransition = useCallback((nextPage: AppPage) => {
    setCurrentPage((previousPage) => {
      if (previousPage === nextPage) {
        return previousPage;
      }

      setTransitionDirection(getTransitionDirection(previousPage, nextPage));
      setTransitionVersion((previousVersion) => previousVersion + 1);
      runTransitionLoading();

      return nextPage;
    });
  }, [runTransitionLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const allowedPaths = new Set(['/', '/routines', '/sso-callback']);
    if (!allowedPaths.has(window.location.pathname)) {
      window.history.replaceState({}, '', '/');
      setCurrentPage('dashboard');
      setTransitionDirection('backward');
      setTransitionVersion((previousVersion) => previousVersion + 1);
      runTransitionLoading();
    }

    const handlePopState = () => {
      beginPageTransition(getPageFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [beginPageTransition, runTransitionLoading]);

  const handlePageChange = useCallback((nextPage: AppPage) => {
    beginPageTransition(nextPage);

    if (typeof window === 'undefined') return;

    const targetPathname = getPathnameFromPage(nextPage);
    if (window.location.pathname !== targetPathname) {
      window.history.pushState({}, '', targetPathname);
    }
  }, [beginPageTransition]);

  if (typeof window !== 'undefined' && window.location.pathname === '/sso-callback') {
    return (
      <div className="app-shell flex items-center justify-center">
        <AuthenticateWithRedirectCallback />
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Login
        onGoogleLogin={signInWithGoogle}
        loading={loading}
        errorMessage={error}
        requiresSafariForGoogleSignIn={requiresSafariForGoogleSignIn}
        safariLoginUrl={safariLoginUrl}
        onOpenSafariForGoogleLogin={openSafariForGoogleLogin}
      />
    );
  }

  const renderPage = (page: AppPage) => {
    if (page === 'dashboard') {
      return <Dashboard user={user} onLogout={logout} />;
    }

    return <Routines user={user} />;
  };

  return (
    <>
      <AuthErrorToast message={error} />
      <div className="app-shell">
        <Suspense
          fallback={<PageSkeleton page={currentPage} />}
        >
          <ScrollToTop trigger={currentPage} />

          <div className="relative overflow-x-clip isolation-isolate">
            <div
              key={`${currentPage}-${transitionVersion}`}
              className={`${transitionDirection === 'forward' ? 'page-anim-enter-forward' : 'page-anim-enter-backward'} ${isPageTransitionLoading ? 'page-anim-loading-dim' : ''}`}
            >
              {renderPage(currentPage)}
            </div>

            {isPageTransitionLoading && (
              <PageSkeleton
                page={currentPage}
                compact
                className="absolute inset-0 z-10 page-loading-mask pointer-events-none"
              />
            )}
          </div>
        </Suspense>
        <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      </div>
    </>
  );
}

function App() {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  );
}

export default App;
