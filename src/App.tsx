import { useState, Suspense, lazy } from 'react';
import { Login } from './pages/Login';
import { Navigation } from './components/Navigation';
import { useAuth } from './hooks/useAuth';
import { ScrollToTop } from './components/ScrollToTop';
import { UIProvider } from './contexts/UIContext';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Routines = lazy(() => import('./pages/NewRoutines').then(module => ({ default: module.Routines })));

// Prevent scroll restoration issues with Suspense lazy loading
window.history.scrollRestoration = 'manual';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'routines'>('dashboard');
  const { user, loading, signInWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-100 text-lg">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onGoogleLogin={signInWithGoogle} loading={loading} />;
  }

  return (
    <UIProvider>
      <div className="app-shell">
          <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-slate-100 text-lg">Cargando...</div>
            </div>
          </div>
        }>
          <ScrollToTop />
          {currentPage === 'dashboard' && <Dashboard user={user} onLogout={logout} />}
          {currentPage === 'routines' && <Routines user={user} />}
        </Suspense>
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    </UIProvider>
  );
}

export default App;