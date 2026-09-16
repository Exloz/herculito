import { upsertExerciseLog } from '../../shared/api/dataApi';
import {
  abandonSportSession,
  addArcheryEnd,
  addArcheryRound,
  completeSportSession,
  startSportSession
} from '../sports/api/sportsRemote';
import {
  abandonWorkoutSession,
  completeWorkoutSession,
  startWorkoutSession,
  updateWorkoutSessionProgress
} from '../workouts/api/workoutSessionsRemote';
import {
  createActivitySync,
  type ActivitySync,
  type ActivitySyncCommand,
  type ActivitySyncRemote,
  type ActivitySyncRemoteResult
} from './activitySync';

export const ACTIVITY_SYNC_CHANGED_EVENT = 'activity-sync-changed';
export const DASHBOARD_CACHE_INVALIDATED_EVENT = 'dashboard-cache-invalidated';
export const SPORTS_CACHE_INVALIDATED_EVENT = 'sports-cache-invalidated';

const DASHBOARD_CACHE_KEY = 'dashboard-data-cache';
const SPORTS_CACHE_KEY = 'sports-data-cache';
const instances = new Map<string, ActivitySync>();

const syncExerciseLogs = async (command: Extract<
  ActivitySyncCommand,
  { kind: 'workout.progress' | 'workout.complete' }
>): Promise<void> => {
  await Promise.all(command.exercises.map((log) => (
    upsertExerciseLog(log.exerciseId, log.date, log.sets, command.userId)
  )));
};

const browserRemote: ActivitySyncRemote = {
  execute: async (command): Promise<ActivitySyncRemoteResult> => {
    switch (command.kind) {
      case 'workout.start':
        return {
          workoutSession: await startWorkoutSession({
            id: command.activityId,
            routineId: command.routineId,
            routineName: command.routineName,
            primaryMuscleGroup: command.primaryMuscleGroup,
            startedAt: command.startedAtMs
          })
        };
      case 'workout.progress':
        await updateWorkoutSessionProgress(command.activityId, command.exercises);
        await syncExerciseLogs(command);
        return {};
      case 'workout.complete':
        await syncExerciseLogs(command);
        await completeWorkoutSession(
          command.activityId,
          command.exercises,
          command.completedAtMs,
          command.totalDuration,
          command.repsBySetUpdates
        );
        return {};
      case 'workout.abandon':
        await abandonWorkoutSession(command.activityId);
        return {};
      case 'sport.start':
        return {
          sportSession: await startSportSession({
            id: command.activityId,
            sportType: command.sportType,
            startedAt: command.startedAtMs,
            archeryConfig: command.archeryConfig,
            hiitConfig: command.hiitConfig,
            location: command.location,
            notes: command.notes
          })
        };
      case 'archery.addRound':
        return {
          round: await addArcheryRound(command.activityId, {
            id: command.roundId,
            distance: command.distance,
            targetSize: command.targetSize,
            arrowsPerEnd: command.arrowsPerEnd
          })
        };
      case 'archery.addEnd':
        return {
          end: await addArcheryEnd(
            command.activityId,
            command.roundId,
            command.arrows,
            command.endId
          )
        };
      case 'sport.complete':
        return {
          sportSession: (await completeSportSession(
            command.activityId,
            command.completedAtMs,
            command.notes
          )).session
        };
      case 'sport.abandon':
        return { sportSession: (await abandonSportSession(command.activityId)).session };
    }
  }
};

const markUserCacheEntryStale = (key: string, userId: string): void => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const cache = JSON.parse(raw) as Record<string, unknown>;
    if (!(userId in cache)) return;
    const entry = cache[userId];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    cache[userId] = { ...entry, stale: true };
    window.localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // Cache invalidation is best effort; synchronization remains durable.
  }
};

export const invalidateBrowserProjections = (userId: string): void => {
  markUserCacheEntryStale(DASHBOARD_CACHE_KEY, userId);
  markUserCacheEntryStale(SPORTS_CACHE_KEY, userId);
  window.dispatchEvent(new CustomEvent(DASHBOARD_CACHE_INVALIDATED_EVENT, { detail: { userId } }));
  window.dispatchEvent(new CustomEvent(SPORTS_CACHE_INVALIDATED_EVENT, { detail: { userId } }));
};

export const getBrowserActivitySync = (userId: string): ActivitySync => {
  const existing = instances.get(userId);
  if (existing) return existing;
  if (typeof window === 'undefined') {
    throw new Error('Activity synchronization requires a browser');
  }

  const created = createActivitySync({
    userId,
    storage: window.localStorage,
    remote: browserRemote,
    invalidate: invalidateBrowserProjections,
    onChange: () => {
      window.dispatchEvent(new CustomEvent(ACTIVITY_SYNC_CHANGED_EVENT, { detail: { userId } }));
    }
  });
  instances.set(userId, created);
  return created;
};
