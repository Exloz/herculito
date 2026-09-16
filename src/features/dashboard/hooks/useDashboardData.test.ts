// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readDashboardCacheEntry, useDashboardData } from './useDashboardData';

const mocks = vi.hoisted(() => ({
  fetchDashboard: vi.fn()
}));

vi.mock('../api/dashboardRemote', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/dashboardRemote')>();
  return {
    ...original,
    fetchDashboard: mocks.fetchDashboard
  };
});

const cachedDashboard = {
  summary: {
    totalWorkouts: 1,
    thisWeekWorkouts: 1,
    thisMonthWorkouts: 1,
    currentStreak: 1,
    longestStreak: 1,
    averageDurationMin: 30
  },
  recentSessions: [],
  calendar: [],
  dashboardRoutines: [],
  competition: { weekLeader: null, monthLeader: null, userWeekRank: null, userMonthRank: null },
  lastWeightsByRoutine: {},
  exerciseProgress: []
};

describe('dashboard cache', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value))
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
    vi.clearAllMocks();
    mocks.fetchDashboard.mockReturnValue(new Promise(() => {}));
  });

  it('migrates legacy response entries to data while retaining stale data', () => {
    localStorage.setItem('dashboard-data-cache', JSON.stringify({
      'user-1': { savedAt: 1, response: cachedDashboard }
    }));

    const entry = readDashboardCacheEntry('user-1', 'Ada');

    expect(entry).toMatchObject({ stale: true, data: { summary: { totalWorkouts: 1 } } });
    expect(JSON.parse(localStorage.getItem('dashboard-data-cache') ?? '{}')['user-1']).toMatchObject({
      data: { summary: { totalWorkouts: 1 } }
    });
  });

  it('reads cached data once and keeps it visible while revalidating', () => {
    localStorage.setItem('dashboard-data-cache', JSON.stringify({
      'user-1': { savedAt: Date.now(), data: cachedDashboard, stale: false }
    }));
    vi.mocked(localStorage.getItem).mockClear();

    const { result } = renderHook(() => useDashboardData('user-1', 'Ada'));

    expect(localStorage.getItem).toHaveBeenCalledTimes(1);
    expect(result.current.data?.summary.totalWorkouts).toBe(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.usingCachedData).toBe(true);
  });
});
