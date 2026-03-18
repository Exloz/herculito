import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { SportSession } from '../../../shared/types';
import { useActiveArcherySession } from './useActiveArcherySession';

const apiMocks = vi.hoisted(() => ({
  completeSportSession: vi.fn(),
  addArcheryRound: vi.fn(),
  addArcheryEnd: vi.fn(),
}));

vi.mock('../../../shared/api/sportsApi', () => ({
  completeSportSession: apiMocks.completeSportSession,
  addArcheryRound: apiMocks.addArcheryRound,
  addArcheryEnd: apiMocks.addArcheryEnd,
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const ACTIVE_ARCHERY_KEY = 'activeArcherySession';

const buildStoredSession = (): SportSession => ({
  id: 'session-1',
  userId: 'user-1',
  sportType: 'archery',
  sportName: 'Tiro con Arco',
  startedAt: new Date('2026-01-01T10:00:00Z'),
  status: 'active',
  archeryData: {
    bowType: 'recurve',
    arrowsUsed: 12,
    rounds: [
      {
        id: 'round-1',
        sessionId: 'session-1',
        distance: 70,
        targetSize: 122,
        arrowsPerEnd: 3,
        order: 1,
        totalScore: 30,
        createdAt: new Date('2026-01-01T10:05:00Z'),
        ends: [
          {
            id: 'end-1',
            roundId: 'round-1',
            endNumber: 1,
            subtotal: 30,
            goldCount: 1,
            createdAt: new Date('2026-01-01T10:06:00Z'),
            arrows: [
              {
                id: 'arrow-1',
                score: 10,
                isGold: true,
                timestamp: new Date('2026-01-01T10:06:30Z'),
              },
            ],
          },
        ],
      },
    ],
    totalScore: 30,
    maxPossibleScore: 30,
    averageArrow: 10,
    goldCount: 1,
  },
});

describe('useActiveArcherySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    apiMocks.completeSportSession.mockResolvedValue(undefined);
  });

  it('rehydrates stored session dates as Date instances', async () => {
    localStorageMock.setItem(ACTIVE_ARCHERY_KEY, JSON.stringify({
      session: buildStoredSession(),
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSession?.startedAt).toBeInstanceOf(Date);
    expect(result.current.activeSession?.archeryData?.rounds[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.activeSession?.archeryData?.rounds[0].ends[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.activeSession?.archeryData?.rounds[0].ends[0].arrows[0].timestamp).toBeInstanceOf(Date);
  });

  it('ignores persisted sessions that are not active', async () => {
    localStorageMock.setItem(ACTIVE_ARCHERY_KEY, JSON.stringify({
      session: {
        ...buildStoredSession(),
        status: 'completed',
      },
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSession).toBeNull();
    expect(localStorageMock.getItem(ACTIVE_ARCHERY_KEY)).toBeNull();
  });

  it('does not apply a stale addRound response to a newer session', async () => {
    let resolveRound: ((value: {
      id: string;
      sessionId: string;
      distance: number;
      targetSize: number;
      arrowsPerEnd: number;
      order: number;
      totalScore: number;
      createdAt: number;
      ends: [];
    }) => void) | null = null;

    apiMocks.addArcheryRound.mockImplementation(() => new Promise((resolve) => {
      resolveRound = resolve;
    }));

    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.startSession(buildStoredSession(), {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    const pendingRound = result.current.addRound(70, 122, 3);

    act(() => {
      result.current.startSession({
        ...buildStoredSession(),
        id: 'session-2',
      }, {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    await act(async () => {
      resolveRound?.({
        id: 'round-stale',
        sessionId: 'session-1',
        distance: 70,
        targetSize: 122,
        arrowsPerEnd: 3,
        order: 1,
        totalScore: 0,
        createdAt: Date.now(),
        ends: [],
      });
      await pendingRound;
    });

    expect(result.current.activeSession?.id).toBe('session-2');
    expect(result.current.activeSession?.archeryData?.rounds).toHaveLength(0);
  });

  it('does not mark a newer session as completed when an older completion resolves', async () => {
    let resolveComplete: (() => void) | null = null;
    apiMocks.completeSportSession.mockImplementation(() => new Promise<void>((resolve) => {
      resolveComplete = resolve;
    }));

    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.startSession(buildStoredSession(), {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    const pendingComplete = result.current.completeSession('nota final');

    act(() => {
      result.current.startSession({
        ...buildStoredSession(),
        id: 'session-2',
      }, {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    await act(async () => {
      resolveComplete?.();
      await pendingComplete;
    });

    expect(result.current.activeSession?.id).toBe('session-2');
    expect(result.current.activeSession?.status).toBe('active');
  });

  it('removes persisted active session after completion and does not rewrite it', async () => {
    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.startSession(buildStoredSession(), {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    expect(localStorageMock.getItem(ACTIVE_ARCHERY_KEY)).not.toBeNull();

    await act(async () => {
      await result.current.completeSession('nota final');
    });

    expect(localStorageMock.getItem(ACTIVE_ARCHERY_KEY)).toBeNull();
    expect(result.current.activeSession?.status).toBe('completed');
  });
});
