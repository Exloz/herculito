// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertExerciseLog } from '../../shared/api/dataApi';
import {
  getBrowserActivitySync,
  invalidateBrowserProjections,
  syncExerciseLogs,
  subscribeBrowserActivitySync
} from './browserActivitySync';

vi.mock('../../shared/api/dataApi', () => ({ upsertExerciseLog: vi.fn() }));

describe('browser activity cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ignores storage events unrelated to the subscribed user queue', () => {
    getBrowserActivitySync('storage-filter-user');
    const listener = vi.fn();
    const unsubscribe = subscribeBrowserActivitySync('storage-filter-user', listener);

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-cache' }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'activity-sync:v1:another-user:writer:tab'
    }));

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('uses a per-user navigator lock when draining a browser queue', async () => {
    const request = vi.fn(async <T,>(_name: string, callback: () => T | PromiseLike<T>) => callback());
    vi.stubGlobal('navigator', { ...navigator, locks: { request }, onLine: true });
    const sync = getBrowserActivitySync('lock-user');

    await sync.syncPending();

    expect(request).toHaveBeenCalledWith('activity-sync:lock-user', expect.any(Function));
  });

  it('upserts only exercise logs marked as changed by progress coalescing', async () => {
    await syncExerciseLogs({
      kind: 'workout.progress',
      commandId: 'progress-1',
      activityId: 'workout-1',
      userId: 'user-1',
      createdAtMs: 10,
      activityRevision: 1,
      changedExerciseIds: ['squat'],
      exercises: [
        { exerciseId: 'bench', userId: 'user-1', date: '2026-09-15', sets: [] },
        { exerciseId: 'squat', userId: 'user-1', date: '2026-09-15', sets: [] }
      ]
    });

    expect(upsertExerciseLog).toHaveBeenCalledTimes(1);
    expect(upsertExerciseLog).toHaveBeenCalledWith('squat', '2026-09-15', [], 'user-1');
  });

  it('marks last-known-good dashboard and sports entries stale without deleting data', () => {
    localStorage.setItem('dashboard-data-cache', JSON.stringify({
      'user-1': { savedAt: 10, data: { summary: { totalWorkouts: 2 } } }
    }));
    localStorage.setItem('sports-data-cache', JSON.stringify({
      'user-1': { savedAt: 10, sessions: [{ id: 'sport-1' }], stats: { totalSessions: 1 } }
    }));

    invalidateBrowserProjections('user-1');

    expect(JSON.parse(localStorage.getItem('dashboard-data-cache') ?? '{}')['user-1']).toMatchObject({
      stale: true,
      data: { summary: { totalWorkouts: 2 } }
    });
    expect(JSON.parse(localStorage.getItem('sports-data-cache') ?? '{}')['user-1']).toMatchObject({
      stale: true,
      sessions: [{ id: 'sport-1' }]
    });
  });
});
