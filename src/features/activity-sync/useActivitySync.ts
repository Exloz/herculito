import { useCallback, useEffect, useState } from 'react';
import type { ActivityProjection, ActivitySync } from './activitySync';
import { ACTIVITY_SYNC_CHANGED_EVENT, getBrowserActivitySync } from './browserActivitySync';

export const useActivitySync = (userId: string): {
  activitySync: ActivitySync;
  projection: ActivityProjection;
} => {
  const activitySync = getBrowserActivitySync(userId);
  const [storedProjection, setStoredProjection] = useState(() => ({
    userId,
    value: activitySync.getProjection()
  }));
  const projection = storedProjection.userId === userId
    ? storedProjection.value
    : activitySync.getProjection();

  const refreshProjection = useCallback((event?: Event) => {
    const eventUserId = (event as CustomEvent<{ userId?: string }> | undefined)?.detail?.userId;
    if (eventUserId && eventUserId !== userId) return;
    setStoredProjection({ userId, value: activitySync.getProjection() });
  }, [activitySync, userId]);

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
      refreshProjection();
      scheduleSync();
    };
    const handleChanged = (event: Event) => {
      if (event.type === 'storage') activitySync.reload();
      refreshProjection(event);
      const eventUserId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (!eventUserId || eventUserId === userId) scheduleSync();
    };
    const handleOnline = () => { scheduleSync(); };
    window.addEventListener(ACTIVITY_SYNC_CHANGED_EVENT, handleChanged);
    window.addEventListener('storage', handleChanged);
    window.addEventListener('online', handleOnline);
    scheduleSync();
    return () => {
      disposed = true;
      if (retryTimeout !== null) window.clearTimeout(retryTimeout);
      window.removeEventListener(ACTIVITY_SYNC_CHANGED_EVENT, handleChanged);
      window.removeEventListener('storage', handleChanged);
      window.removeEventListener('online', handleOnline);
    };
  }, [activitySync, refreshProjection, userId]);

  return { activitySync, projection };
};
