// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SportSession, SportStats, User } from '../../../shared/types';
import { useSportSessions } from './useSportSessions';

const mocks = vi.hoisted(() => ({
  fetchSportSessions: vi.fn(),
  fetchSportStats: vi.fn()
}));

vi.mock('../api/sportsRemote', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/sportsRemote')>();
  return {
    ...original,
    fetchSportSessions: mocks.fetchSportSessions,
    fetchSportStats: mocks.fetchSportStats
  };
});

const user: User = {
  id: 'user-1',
  email: 'athlete@example.com',
  name: 'Athlete'
};

const session: SportSession = {
  id: 'session-1',
  userId: user.id,
  sportType: 'hiit',
  sportName: 'HIIT',
  startedAt: new Date('2026-09-15T12:00:00Z'),
  status: 'completed'
};

const stats: SportStats = {
  totalSessions: 1,
  thisWeekSessions: 1,
  thisMonthSessions: 1,
  currentStreak: 1,
  longestStreak: 1
};

const secondUser: User = {
  id: 'user-2',
  email: 'runner@example.com',
  name: 'Runner'
};

describe('useSportSessions', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear()
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
    vi.clearAllMocks();
    mocks.fetchSportSessions.mockReturnValue(new Promise(() => {}));
    mocks.fetchSportStats.mockReturnValue(new Promise(() => {}));
  });

  it('keeps cached sessions visible while revalidating', () => {
    window.localStorage.setItem('sports-data-cache', JSON.stringify({
      [user.id]: {
        savedAt: Date.now(),
        sessions: [session],
        stats,
        stale: false
      }
    }));

    const { result } = renderHook(() => useSportSessions(user));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
  });

  it('switches to the next users cache before revalidating', () => {
    window.localStorage.setItem('sports-data-cache', JSON.stringify({
      [user.id]: { savedAt: Date.now(), sessions: [session], stats, stale: false },
      [secondUser.id]: {
        savedAt: Date.now(),
        sessions: [{ ...session, id: 'session-2', userId: secondUser.id }],
        stats: { ...stats, totalSessions: 2 },
        stale: false
      }
    }));

    const { result, rerender } = renderHook(
      ({ currentUser }) => useSportSessions(currentUser),
      { initialProps: { currentUser: user } }
    );

    rerender({ currentUser: secondUser });

    expect(result.current.sessions[0]?.userId).toBe(secondUser.id);
    expect(result.current.stats?.totalSessions).toBe(2);
    expect(result.current.loading).toBe(false);
  });
});
