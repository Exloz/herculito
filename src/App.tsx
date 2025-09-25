import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Routines } from './pages/NewRoutines';
import { Login } from './pages/Login';
import { Navigation } from './components/Navigation';
import { useAuth } from './hooks/useAuth';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'routines'>('dashboard');
  const { user, loading, signInWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onGoogleLogin={signInWithGoogle} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {currentPage === 'dashboard' && <Dashboard user={user} onLogout={logout} />}
      {currentPage === 'routines' && <Routines user={user} />}
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}

export default App;