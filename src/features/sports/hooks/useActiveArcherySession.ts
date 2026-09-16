import { useCallback, useState } from 'react';
import type { ArcheryBowType, ArcheryEnd, ArcheryRound, SportSession } from '../../../shared/types';
import { useActivitySync } from '../../activity-sync/useActivitySync';

export const useActiveArcherySession = (userId: string) => {
  const { activitySync, projection } = useActivitySync(userId);
  const [completedSession, setCompletedSession] = useState<SportSession | null>(null);
  const activeActivity = projection.active?.kind === 'archery' ? projection.active : null;
  const activeSession = completedSession ?? activeActivity?.session ?? null;

  const startSession = useCallback((config: {
    bowType: ArcheryBowType;
    arrowsUsed: number;
    location?: string;
    notes?: string;
  }) => {
    setCompletedSession(null);
    const activity = activitySync.startArchery(config);
    void activitySync.syncPending();
    return activity.session;
  }, [activitySync]);

  const addRound = useCallback((
    distance: number,
    targetSize: number,
    arrowsPerEnd = 6
  ): Promise<ArcheryRound> => {
    if (!activeActivity) return Promise.reject(new Error('No active session'));
    const round = activitySync.addArcheryRound(activeActivity.id, distance, targetSize, arrowsPerEnd);
    void activitySync.syncPending();
    return Promise.resolve(round);
  }, [activeActivity, activitySync]);

  const addEnd = useCallback((
    roundId: string,
    scores: { score: number; isGold: boolean }[]
  ): Promise<ArcheryEnd> => {
    if (!activeActivity) return Promise.reject(new Error('No active session'));
    const end = activitySync.addArcheryEnd(activeActivity.id, roundId, scores);
    void activitySync.syncPending();
    return Promise.resolve(end);
  }, [activeActivity, activitySync]);

  const completeSession = useCallback((notes?: string): Promise<void> => {
    if (!activeActivity) return Promise.reject(new Error('No active session'));
    setCompletedSession({
      ...activeActivity.session,
      notes: notes ?? activeActivity.session.notes,
      status: 'completed',
      completedAt: new Date()
    });
    activitySync.completeArchery(activeActivity.id, notes);
    void activitySync.syncPending();
    return Promise.resolve();
  }, [activeActivity, activitySync]);

  const updateSessionNotes = useCallback((notes: string) => {
    if (!activeActivity) return;
    activitySync.updateArcheryNotes(activeActivity.id, notes);
  }, [activeActivity, activitySync]);

  const abandonSession = useCallback(() => {
    if (completedSession) {
      setCompletedSession(null);
      return;
    }
    if (!activeActivity) return;
    activitySync.abandon(activeActivity.id);
    void activitySync.syncPending();
  }, [activeActivity, activitySync, completedSession]);

  return {
    activeSession,
    isLoading: false,
    hasActiveSession: Boolean(activeSession),
    pendingSyncCount: projection.pendingSyncCount,
    isSyncPending: projection.pendingSyncCount > 0,
    startSession,
    addRound,
    addEnd,
    completeSession,
    updateSessionNotes,
    abandonSession
  };
};
