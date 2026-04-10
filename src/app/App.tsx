import { useEffect, Suspense, lazy, useState } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/react';
import { Navigation } from './navigation/Navigation';
import { useAuth } from '../features/auth/hooks/useAuth';
import { ScrollToTop } from './navigation/ScrollToTop';
import { UIProvider } from './providers/UIProvider';
import { useUI } from './providers/ui-context';
import { PageSkeleton } from '../shared/ui/PageSkeleton';
import { usePageNavigation, type AppPage } from './hooks/usePageNavigation';

const AgentationComponent = import.meta.env.DEV
  ? lazy(() => import('agentation').then(mod => ({ default: mod.Agentation })))
  : null;

// Lazy load pages for better performance
const loadLoginPage = () => import('../features/auth/pages/LoginPage');
const loadDashboardPage = () => import('../features/dashboard/pages/DashboardPage');
const loadRoutinesPage = () => import('../features/routines/pages/RoutinesPage');
const loadAdminPage = () => import('../features/admin/pages/AdminPage');
const loadSportsPage = () => import('../features/sports/pages/SportsPage');
const loadProfilePage = () => import('../features/profile/pages/ProfilePage');

const Login = lazy(() => loadLoginPage().then(module => ({ default: module.Login })));
const Dashboard = lazy(() => loadDashboardPage().then(module => ({ default: module.Dashboard })));
const Routines = lazy(() => loadRoutinesPage().then(module => ({ default: module.Routines })));
const AdminPage = lazy(() => loadAdminPage().then(module => ({ default: module.AdminPage })));
const Sports = lazy(() => loadSportsPage().then(module => ({ default: module.default })));
const Profile = lazy(() => loadProfilePage().then(module => ({ default: module.ProfilePage })));

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
  const [canPreloadRoutines, setCanPreloadRoutines] = useState(false);
  const shouldEnableAgentation = import.meta.env.DEV;
  const {
    user,
    isAdmin,
    isAdminResolved,
    loading,
    error,
    logout
  } = useAuth();

  useEffect(() => {
    if (!user) {
      setCanPreloadRoutines(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !canPreloadRoutines) return;

    const preloadRoutines = () => {
      void loadRoutinesPage();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadRoutines, { timeout: 4000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(preloadRoutines, 2200);
    return () => clearTimeout(timeoutId);
  }, [canPreloadRoutines, user]);

  useEffect(() => {
    if (!user || isAdmin || currentPage !== 'admin' || !isAdminResolved) return;
    handlePageChange('dashboard');
  }, [currentPage, handlePageChange, isAdmin, isAdminResolved, user]);

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
      <Suspense fallback={<LoadingScreen />}>
        <Login errorMessage={error} />
      </Suspense>
    );
  }

  const renderPage = (page: AppPage) => {
    if (page === 'dashboard') {
      return (
        <Dashboard
          user={user}
          onLogout={logout}
          onReadyForBackgroundPreload={() => setCanPreloadRoutines(true)}
          onNavigateToProfile={() => handlePageChange('profile')}
        />
      );
    }

    if (page === 'admin') {
      return <AdminPage enabled={isAdmin} />;
    }

    if (page === 'sports') {
      return <Sports user={user} />;
    }

    if (page === 'profile') {
      return <Profile user={user} onBack={() => handlePageChange('dashboard')} />;
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
        <Navigation currentPage={currentPage} onPageChange={handlePageChange} isAdmin={isAdmin} />
      </div>
      {AgentationComponent && shouldEnableAgentation && isAdmin && typeof window !== 'undefined' && (
        <Suspense fallback={null}>
          <AgentationComponent
            endpoint="http://localhost:4747"
            onSessionCreated={(sessionId: string) => {
              console.log('Agentation session:', sessionId);
            }}
          />
        </Suspense>
      )}
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
