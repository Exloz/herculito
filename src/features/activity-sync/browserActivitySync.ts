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
  type ActivityProjection,
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
const ACTIVITY_STORAGE_PREFIX = 'activity-sync:v1:';
const processLockTails = new Map<string, Promise<void>>();

interface BrowserActivitySyncEntry {
  sync: ActivitySync;
  snapshot: ActivityProjection;
  listeners: Set<() => void>;
}

const instances = new Map<string, BrowserActivitySyncEntry>();
let storageListenerInstalled = false;

export const syncExerciseLogs = async (command: Extract<
  ActivitySyncCommand,
  { kind: 'workout.progress' | 'workout.complete' }
>): Promise<void> => {
  const changedIds = command.kind === 'workout.progress'
    ? command.changedExerciseIds
    : undefined;
  const logs = changedIds
    ? command.exercises.filter((log) => changedIds.includes(log.exerciseId))
    : command.exercises;
  await Promise.all(logs.map((log) => (
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

const runProcessExclusive = async <T>(name: string, task: () => Promise<T>): Promise<T> => {
  const previous = processLockTails.get(name) ?? Promise.resolve();
  let release = (): void => {};
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => current);
  processLockTails.set(name, tail);
  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
    if (processLockTails.get(name) === tail) processLockTails.delete(name);
  }
};

const runBrowserExclusive = <T>(name: string, task: () => Promise<T>): Promise<T> => {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request<Promise<T>>(name, () => task()).then((result) => result);
  }
  return runProcessExclusive(name, task);
};

const notifyEntry = (entry: BrowserActivitySyncEntry): void => {
  entry.snapshot = entry.sync.getProjection();
  entry.listeners.forEach((listener) => listener());
};

const userIdFromStorageKey = (key: string | null): string | null => {
  if (!key?.startsWith(ACTIVITY_STORAGE_PREFIX)) return null;
  const encodedUserId = key.slice(ACTIVITY_STORAGE_PREFIX.length).split(':writer:')[0];
  try {
    return decodeURIComponent(encodedUserId);
  } catch {
    return null;
  }
};

const ensureStorageListener = (): void => {
  if (storageListenerInstalled || typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    const userId = userIdFromStorageKey(event.key);
    if (!userId) return;
    const entry = instances.get(userId);
    if (!entry) return;
    entry.sync.reload();
    notifyEntry(entry);
  });
  storageListenerInstalled = true;
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
  if (existing) return existing.sync;
  if (typeof window === 'undefined') {
    throw new Error('Activity synchronization requires a browser');
  }

  const created = createActivitySync({
    userId,
    storage: window.localStorage,
    remote: browserRemote,
    invalidate: invalidateBrowserProjections,
    runExclusive: runBrowserExclusive,
    onChange: () => {
      const current = instances.get(userId);
      if (current) notifyEntry(current);
      window.dispatchEvent(new CustomEvent(ACTIVITY_SYNC_CHANGED_EVENT, { detail: { userId } }));
    }
  });
  const entry = { sync: created, snapshot: created.getProjection(), listeners: new Set<() => void>() };
  instances.set(userId, entry);
  ensureStorageListener();
  return created;
};

export const getBrowserActivityProjection = (userId: string): ActivityProjection => {
  getBrowserActivitySync(userId);
  return instances.get(userId)!.snapshot;
};

export const subscribeBrowserActivitySync = (userId: string, listener: () => void): (() => void) => {
  getBrowserActivitySync(userId);
  const entry = instances.get(userId)!;
  entry.listeners.add(listener);
  return () => { entry.listeners.delete(listener); };
};
