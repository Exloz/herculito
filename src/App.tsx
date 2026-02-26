import { useEffect, useState, Suspense, lazy, useCallback } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Login } from './pages/Login';
import { Navigation } from './components/Navigation';
import { useAuth } from './hooks/useAuth';
import { ScrollToTop } from './components/ScrollToTop';
import { UIProvider } from './contexts/UIContext';
import { useUI } from './contexts/ui-context';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Routines = lazy(() => import('./pages/NewRoutines').then(module => ({ default: module.Routines })));

type AppPage = 'dashboard' | 'routines';

const getPageFromPathname = (pathname: string): AppPage => {
  if (pathname.startsWith('/routines')) {
    return 'routines';
  }
  return 'dashboard';
};

const getPathnameFromPage = (page: AppPage): string => {
  return page === 'routines' ? '/routines' : '/';
};

const LoadingScreen = () => (
  <div className="app-shell flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-slate-100 text-lg">Cargando...</div>
    </div>
  </div>
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

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    if (typeof window === 'undefined') {
      return 'dashboard';
    }
    return getPageFromPathname(window.location.pathname);
  });
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
    if (typeof window !== 'undefined' && window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setCurrentPage(getPageFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handlePageChange = useCallback((nextPage: AppPage) => {
    setCurrentPage(nextPage);

    if (typeof window === 'undefined') return;

    const targetPathname = getPathnameFromPage(nextPage);
    if (window.location.pathname !== targetPathname) {
      window.history.pushState({}, '', targetPathname);
    }
  }, []);

  if (typeof window !== 'undefined' && window.location.pathname === '/sso-callback') {
    return (
      <UIProvider>
        <div className="app-shell flex items-center justify-center">
          <AuthenticateWithRedirectCallback />
        </div>
      </UIProvider>
    );
  }

  if (loading) {
    return (
      <UIProvider>
        <LoadingScreen />
      </UIProvider>
    );
  }

  if (!user) {
    return (
      <UIProvider>
        <Login
          onGoogleLogin={signInWithGoogle}
          loading={loading}
          errorMessage={error}
          requiresSafariForGoogleSignIn={requiresSafariForGoogleSignIn}
          safariLoginUrl={safariLoginUrl}
          onOpenSafariForGoogleLogin={openSafariForGoogleLogin}
        />
      </UIProvider>
    );
  }

  return (
    <UIProvider>
      <AuthErrorToast message={error} />
      <div className="app-shell">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-slate-100 text-lg">Cargando...</div>
              </div>
            </div>
          }
        >
          <ScrollToTop />
          {currentPage === 'dashboard' && <Dashboard user={user} onLogout={logout} />}
          {currentPage === 'routines' && <Routines user={user} />}
        </Suspense>
        <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      </div>
    </UIProvider>
  );
}

export default App;
