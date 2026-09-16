import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { ActivityProjection, ActivitySync } from './activitySync';
import {
  getBrowserActivityProjection,
  getBrowserActivitySync,
  subscribeBrowserActivitySync
} from './browserActivitySync';

export const useActivitySync = (userId: string): {
  activitySync: ActivitySync;
  projection: ActivityProjection;
} => {
  const activitySync = getBrowserActivitySync(userId);
  const subscribe = useCallback(
    (listener: () => void) => subscribeBrowserActivitySync(userId, listener),
    [userId]
  );
  const getSnapshot = useCallback(() => getBrowserActivityProjection(userId), [userId]);
  const projection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  useEffect(() => {
    let disposed = false;
    let retryTimeout: number | null = null;
    const scheduleSync = () => {
      if (disposed || navigator.onLine === false) return;
      const current = activitySync.getProjection();
      if (current.pendingSyncCount === 0) return;
      if (current.failedSyncCount > 0) return;
      const delayMs = current.nextRetryAtMs
        ? Math.max(0, current.nextRetryAtMs - Date.now())
        : 0;
      if (retryTimeout !== null) window.clearTimeout(retryTimeout);
      retryTimeout = window.setTimeout(() => { void runSync(); }, delayMs);
    };
    const runSync = async () => {
      if (retryTimeout !== null) window.clearTimeout(retryTimeout);
      retryTimeout = null;
      await activitySync.syncPending();
      if (disposed) return;
      scheduleSync();
    };
    const handleOnline = () => { scheduleSync(); };
    window.addEventListener('online', handleOnline);
    const unsubscribe = subscribeBrowserActivitySync(userId, scheduleSync);
    scheduleSync();
    return () => {
      disposed = true;
      if (retryTimeout !== null) window.clearTimeout(retryTimeout);
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, [activitySync, userId]);

  return { activitySync, projection };
};
