import { useEffect, Suspense, lazy } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/react';
import { Login } from '../features/auth/pages/LoginPage';
import { Navigation } from './navigation/Navigation';
import { useAuth } from '../features/auth/hooks/useAuth';
import { ScrollToTop } from './navigation/ScrollToTop';
import { UIProvider } from './providers/UIProvider';
import { useUI } from './providers/ui-context';
import { PageSkeleton } from '../shared/ui/PageSkeleton';
import { usePageNavigation, type AppPage } from './hooks/usePageNavigation';

// Lazy load pages for better performance
const loadDashboardPage = () => import('../features/dashboard/pages/DashboardPage');
const loadRoutinesPage = () => import('../features/routines/pages/RoutinesPage');

const Dashboard = lazy(() => loadDashboardPage().then(module => ({ default: module.Dashboard })));
const Routines = lazy(() => loadRoutinesPage().then(module => ({ default: module.Routines })));

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
  const { currentPage, transitionDirection, transitionVersion, handlePageChange } = usePageNavigation();
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
    if (!user) return;
    void loadDashboardPage();
    void loadRoutinesPage();
  }, [user]);

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
          fallback={<PageSkeleton page={currentPage} compact className="content-fade-in" />}
        >
          <ScrollToTop trigger={currentPage} />

          <div className="relative overflow-x-clip isolation-isolate">
            <div
              key={`${currentPage}-${transitionVersion}`}
              className={transitionDirection === 'forward' ? 'page-anim-enter-forward' : 'page-anim-enter-backward'}
            >
              {renderPage(currentPage)}
            </div>
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
