// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readDashboardCacheEntry } from './useDashboardData';

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
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
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
});
