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

type PageTransitionState = {
  from: AppPage;
  to: AppPage;
  direction: 'forward' | 'backward';
};

const PAGE_TRANSITION_MS = 240;

const getPageFromPathname = (pathname: string): AppPage => {
  if (pathname.startsWith('/routines')) {
    return 'routines';
  }
  return 'dashboard';
};

const getPathnameFromPage = (page: AppPage): string => {
  return page === 'routines' ? '/routines' : '/';
};

const getTransitionDirection = (from: AppPage, to: AppPage): PageTransitionState['direction'] => {
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
  const [pageTransition, setPageTransition] = useState<PageTransitionState | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
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
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pageTransition) {
      return;
    }

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      setPageTransition(null);
      transitionTimeoutRef.current = null;
    }, PAGE_TRANSITION_MS);
  }, [pageTransition]);

  const beginPageTransition = useCallback((nextPage: AppPage) => {
    setCurrentPage((previousPage) => {
      if (previousPage === nextPage) {
        return previousPage;
      }

      setPageTransition({
        from: previousPage,
        to: nextPage,
        direction: getTransitionDirection(previousPage, nextPage)
      });

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

    const allowedPaths = new Set(['/', '/routines', '/sso-callback']);
    if (!allowedPaths.has(window.location.pathname)) {
      window.history.replaceState({}, '', '/');
      setCurrentPage('dashboard');
      setPageTransition(null);
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

          <div className={`relative overflow-x-hidden ${pageTransition ? 'pointer-events-none select-none' : ''}`}>
            {pageTransition ? (
              <>
                <div className={pageTransition.direction === 'forward' ? 'page-anim-enter-forward' : 'page-anim-enter-backward'}>
                  {renderPage(pageTransition.to)}
                </div>
                <div
                  className={`absolute inset-0 ${pageTransition.direction === 'forward' ? 'page-anim-exit-forward' : 'page-anim-exit-backward'}`}
                  aria-hidden="true"
                >
                  {renderPage(pageTransition.from)}
                </div>
              </>
            ) : (
              <div>{renderPage(currentPage)}</div>
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
