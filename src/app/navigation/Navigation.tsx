import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Dumbbell, Home, PlayCircle, Ruler, Shield, Target } from 'lucide-react';
import { useActivitySync } from '../../features/activity-sync/useActivitySync';
import { remoteTimerScheduler } from '../../features/workouts/lib/remoteTimerScheduler';

const APP_UPDATE_AVAILABLE_EVENT = 'app-update-available';
const APP_ACTIVATE_UPDATE_EVENT = 'app-activate-update';
const APP_UPDATE_READY_KEY = 'app-update-ready';

interface NavigationProps {
  currentPage: 'dashboard' | 'routines' | 'admin' | 'sports' | 'profile';
  onPageChange: (page: 'dashboard' | 'routines' | 'admin' | 'sports' | 'profile') => void;
  isAdmin: boolean;
  userId: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
  isAdmin,
  userId
}) => {
  const { activitySync, projection } = useActivitySync(userId);
  const hasActiveWorkout = projection.active?.kind === 'workout';
  const [isHidden, setIsHidden] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(() => {
    try {
      return window.sessionStorage.getItem(APP_UPDATE_READY_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleVisibilityChange = (event: Event) => {
      const detail = (event as CustomEvent<{ hidden?: boolean }>).detail;
      setIsHidden(detail?.hidden === true);
    };

    window.addEventListener('app-navigation-visibility', handleVisibilityChange);
    return () => window.removeEventListener('app-navigation-visibility', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
    return () => window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
  }, []);

  useLayoutEffect(() => {
    remoteTimerScheduler.setOwner(userId);
    void remoteTimerScheduler.replayPending().catch(() => {});
    return () => remoteTimerScheduler.setOwner(null);
  }, [userId]);

  const handleResumeClick = () => {
    localStorage.setItem('activeWorkoutForceOpen', 'true');
    if (currentPage === 'dashboard') {
      window.dispatchEvent(new Event('resume-active-workout'));
    } else {
      onPageChange('dashboard');
    }
  };

  const handleRetrySync = () => {
    if (projection.syncFailureAction === 'dismiss') {
      activitySync.dismissFailed();
      return;
    }
    activitySync.retryFailed();
    void activitySync.syncPending();
  };

  const handleActivateUpdate = () => {
    try {
      window.sessionStorage.removeItem(APP_UPDATE_READY_KEY);
    } catch {
      // The update can still activate without session storage.
    }
    setUpdateAvailable(false);
    window.dispatchEvent(new Event(APP_ACTIVATE_UPDATE_EVENT));
  };

  return (
    <div className={`app-bottom-nav fixed bottom-0 left-0 right-0 z-40 flex w-full flex-col items-center justify-center gap-2 pb-[env(safe-area-inset-bottom)] pointer-events-none transition-opacity duration-300 ease-out ${isHidden ? 'opacity-0 invisible' : 'opacity-100'}`}>
      {updateAvailable && (
        <button
          type="button"
          onClick={handleActivateUpdate}
          className="pointer-events-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-mint/45 bg-charcoal px-4 py-2 text-sm font-semibold text-mint shadow-soft"
        >
          Nueva versión disponible. Actualizar
        </button>
      )}
      {projection.failedSyncCount > 0 && (
        <button
          type="button"
          onClick={handleRetrySync}
          className="pointer-events-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-amberGlow/50 bg-charcoal px-4 py-2 text-sm font-semibold text-amberGlow shadow-soft"
        >
          {projection.syncError
            ?? `No se pudieron sincronizar ${projection.failedSyncCount} cambio${projection.failedSyncCount === 1 ? '' : 's'}.`}{' '}
          {projection.syncFailureAction === 'dismiss' ? 'Entendido' : 'Reintentar'}
        </button>
      )}
      {hasActiveWorkout && currentPage !== 'dashboard' && (
        <button type="button" onClick={handleResumeClick}
          className="pointer-events-auto flex min-h-11 w-[calc(100%-2rem)] max-w-md items-center justify-center gap-2 rounded-xl border border-mint/30 bg-charcoal px-4 py-2 text-sm font-semibold text-mint shadow-soft"
          aria-label="Reanudar entrenamiento activo">
          <PlayCircle size={18} />Continuar entrenamiento
        </button>
      )}
      <nav className="pointer-events-auto mb-1 w-[calc(100%-2rem)] max-w-md rounded-2xl border border-mist/60 bg-charcoal px-2 py-2 shadow-soft">
        <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} gap-1`}>
          <button
            onClick={() => onPageChange('dashboard')}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors touch-target ${
              currentPage === 'dashboard'
                ? 'bg-mint/15 text-mint'
                : 'text-slate-300 hover:text-white hover:bg-slateDeep/60'
            }`}
            aria-label="Ir a Inicio"
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
          >
            <Home size={22} />
            <span className="text-xs font-semibold">Inicio</span>
          </button>

          <button
            onClick={() => onPageChange('routines')}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors touch-target ${
              currentPage === 'routines'
                ? 'bg-mint/15 text-mint'
                : 'text-slate-300 hover:text-white hover:bg-slateDeep/60'
            }`}
            aria-label="Ir a Rutinas"
            aria-current={currentPage === 'routines' ? 'page' : undefined}
          >
            <Dumbbell size={22} />
            <span className="text-xs font-semibold">Rutinas</span>
          </button>

          <button
            onClick={() => onPageChange('sports')}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors touch-target ${
              currentPage === 'sports'
                ? 'bg-mint/15 text-mint'
                : 'text-slate-300 hover:text-white hover:bg-slateDeep/60'
            }`}
            aria-label="Ir a Deportes"
            aria-current={currentPage === 'sports' ? 'page' : undefined}
          >
            <Target size={22} />
            <span className="text-xs font-semibold">Deportes</span>
          </button>

          <button type="button" onClick={() => onPageChange('profile')}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors touch-target ${
              currentPage === 'profile' ? 'bg-mint/15 text-mint' : 'text-slate-300 hover:text-white hover:bg-slateDeep/60'
            }`}
            aria-label="Ir a Mis medidas" aria-current={currentPage === 'profile' ? 'page' : undefined}>
            <Ruler size={22} />
            <span className="text-xs font-semibold">Medidas</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onPageChange('admin')}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors touch-target ${
                currentPage === 'admin'
                  ? 'bg-mint/15 text-mint'
                  : 'text-slate-300 hover:text-white hover:bg-slateDeep/60'
              }`}
              aria-label="Ir a Admin"
              aria-current={currentPage === 'admin' ? 'page' : undefined}
            >
              <Shield size={22} />
              <span className="text-xs font-semibold">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};
