import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Routines } from './pages/Routines';
import { Navigation } from './components/Navigation';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'routines'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-900">
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'routines' && <Routines />}
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}

export default App;