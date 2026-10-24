import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Dumbbell, LogOut, PlayCircle, Search } from 'lucide-react';
import type { AppPage } from '../hooks/usePageNavigation';
import { DESTINATIONS } from './destinations';
import { version } from '../../../package.json';
import { useActivitySync } from '../../features/activity-sync/useActivitySync';
import { remoteTimerScheduler } from '../../features/workouts/lib/remoteTimerScheduler';

const APP_UPDATE_AVAILABLE_EVENT = 'app-update-available';
const APP_ACTIVATE_UPDATE_EVENT = 'app-activate-update';
const APP_UPDATE_READY_KEY = 'app-update-ready';

interface NavigationProps {
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
  isAdmin: boolean;
  userId: string;
  userName?: string;
  onLogout?: () => void;
  onOpenCommands?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
  isAdmin,
  userId,
  userName = 'Mi espacio',
  onLogout,
  onOpenCommands
}) => {
  const { activitySync, projection } = useActivitySync(userId);
  const hasActiveWorkout = projection.active?.kind === 'workout';
  const hasActiveSport = projection.active && projection.active.kind !== 'workout';
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
    <div className={`app-bottom-nav workspace-navigation ${isHidden ? 'opacity-0 invisible' : 'opacity-100'}`}>
      <div className="sidebar-brand">
        <button type="button" onClick={() => onPageChange('dashboard')} className="sidebar-logo" aria-label="Herculito · Inicio">
          <span className="brand-mark"><Dumbbell size={21} strokeWidth={2.3} /></span>
          <span>herculito<span className="brand-dot">.</span></span>
        </button>
      </div>
      {onOpenCommands && <button type="button" className="sidebar-search" onClick={onOpenCommands}>
        <Search size={16} /><span>Buscar y navegar</span><kbd>⌘ K</kbd>
      </button>}
      <nav aria-label="Navegación principal" className="workspace-nav-list">
        {DESTINATIONS.filter((item) => isAdmin || item.page !== 'admin').map((item, index, items) => {
          const Icon = item.icon;
          return <React.Fragment key={item.page}>
            {(index === 0 || items[index - 1].group !== item.group) && <div className="nav-group-label">{item.group}</div>}
            <button type="button" onClick={() => onPageChange(item.page)} className="workspace-nav-item"
              aria-label={item.ariaLabel} aria-current={currentPage === item.page ? 'page' : undefined}>
              <Icon size={18} aria-hidden="true" /><span>{item.label}</span>
              {((item.page === 'dashboard' && hasActiveWorkout) || (item.page === 'sports' && hasActiveSport)) && (
                <span className="nav-active-dot" role="img" aria-label="Sesión activa" title="Sesión en curso" />
              )}
            </button>
          </React.Fragment>;
        })}
      </nav>
      <div className="navigation-notices">
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
      {hasActiveSport && currentPage !== 'sports' && <button type="button" className="navigation-resume" onClick={() => onPageChange('sports')}>
        <PlayCircle size={17} />Continuar sesión deportiva
      </button>}
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-account">
          <button type="button" className="sidebar-user" onClick={() => onPageChange('profile')} aria-label="Abrir mis medidas">
            <span className="user-avatar">{userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
            <span><strong>{userName}</strong><small>Mi cuenta · v{version}</small></span>
          </button>
          {onLogout && <button type="button" className="workspace-icon-button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>}
        </div>
      </div>
    </div>
  );
};
