import { useCallback, useSyncExternalStore } from 'react';
import { CloudOff } from 'lucide-react';
import {
  getBrowserActivityProjection,
  subscribeBrowserActivitySync
} from './browserActivitySync';

function subscribeConnection(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

const readConnection = () => navigator.onLine;
const readServerConnection = () => true;

export function ActivitySyncStatus({ userId }: { userId: string }) {
  // Observe the existing queue without starting another synchronization scheduler.
  const subscribe = useCallback((listener: () => void) => subscribeBrowserActivitySync(userId, listener), [userId]);
  const readProjection = useCallback(() => getBrowserActivityProjection(userId), [userId]);
  const projection = useSyncExternalStore(subscribe, readProjection, readProjection);
  const online = useSyncExternalStore(subscribeConnection, readConnection, readServerConnection);
  const status = !online
    ? { state: 'offline', label: 'Sin conexión', detail: 'Estás sin conexión. Los cambios pendientes se conservan en este dispositivo.' }
    : projection.failedSyncCount > 0
      ? { state: 'error', label: 'Revisar cambios', detail: 'Hay cambios sin sincronizar. Revisa el aviso para resolverlo.' }
      : projection.pendingSyncCount > 0
        ? { state: 'pending', label: 'Por sincronizar', detail: 'Hay cambios guardados en este dispositivo pendientes de sincronizar.' }
        : { state: 'synced', label: 'Todo al día', detail: 'No hay cambios de actividad pendientes de sincronizar.' };

  return (
    <span className="sync-indicator" data-state={status.state} role="status" aria-live="polite" title={status.detail}>
      {online ? <span className="status-dot" aria-hidden="true" /> : <CloudOff size={12} aria-hidden="true" />}
      <span className="sync-indicator-label">{status.label}</span>
    </span>
  );
}
