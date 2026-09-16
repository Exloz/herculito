import { useCallback, useMemo } from 'react';
import type { ExerciseLog } from '../../../shared/types';
import { useActivitySync } from '../../activity-sync/useActivitySync';

export const useExerciseLogs = (
  date: string,
  userId: string,
  options: { activityId: string }
) => {
  const { activitySync, projection } = useActivitySync(userId);
  const workout = projection.active?.kind === 'workout'
    && projection.active.id === options.activityId
    ? projection.active
    : null;
  const logs = useMemo(() => workout?.session.exercises ?? [], [workout?.session.exercises]);

  const updateExerciseLog = useCallback((log: ExerciseLog) => {
    const current = activitySync.getProjection().active;
    if (current?.kind !== 'workout' || current.id !== options.activityId) return;
    const normalized = {
      ...log,
      userId: log.userId || userId,
      date: log.date || date
    };
    const nextLogs = current.session.exercises.some((entry) => entry.exerciseId === normalized.exerciseId)
      ? current.session.exercises.map((entry) => entry.exerciseId === normalized.exerciseId ? normalized : entry)
      : [...current.session.exercises, normalized];
    activitySync.updateWorkoutProgress(options.activityId, nextLogs, [normalized.exerciseId]);
  }, [activitySync, date, options.activityId, userId]);

  const getLogForExercise = useCallback((exerciseId: string, logUserId: string): ExerciseLog => (
    logs.find((log) => log.exerciseId === exerciseId) ?? {
      exerciseId,
      userId: logUserId,
      date,
      sets: []
    }
  ), [date, logs]);

  return {
    logs,
    loading: false,
    updateExerciseLog,
    getLogForExercise,
    flushPendingLogs: activitySync.syncPending
  };
};
