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
    apiMocks.addArcheryRound.mockResolvedValue({
      id: 'round-server',
      sessionId: 'session-1',
      distance: 70,
      targetSize: 122,
      arrowsPerEnd: 3,
      order: 1,
      totalScore: 0,
      createdAt: Date.now(),
      ends: [],
    });
    apiMocks.addArcheryEnd.mockResolvedValue({
      id: 'end-server',
      roundId: 'round-1',
      endNumber: 2,
      subtotal: 27,
      goldCount: 0,
      createdAt: Date.now(),
      arrows: [
        { id: 'arrow-server-1', score: 9, isGold: false, timestamp: Date.now() },
        { id: 'arrow-server-2', score: 9, isGold: false, timestamp: Date.now() },
        { id: 'arrow-server-3', score: 9, isGold: false, timestamp: Date.now() },
      ],
    });
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
        archeryData: {
          ...buildStoredSession().archeryData!,
          rounds: [],
          totalScore: 0,
          maxPossibleScore: 0,
          averageArrow: 0,
          goldCount: 0,
        },
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

  it('keeps a locally added round when the API write fails', async () => {
    apiMocks.addArcheryRound.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.startSession({
        ...buildStoredSession(),
        archeryData: {
          ...buildStoredSession().archeryData!,
          rounds: [],
          totalScore: 0,
          maxPossibleScore: 0,
          averageArrow: 0,
          goldCount: 0,
        },
      }, {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    await act(async () => {
      await result.current.addRound(30, 80, 3);
    });

    expect(result.current.activeSession?.archeryData?.rounds).toHaveLength(1);
    expect(result.current.pendingSyncCount).toBe(1);

    const stored = JSON.parse(localStorageMock.getItem(ACTIVE_ARCHERY_KEY) ?? '{}') as { pendingOps?: unknown[] };
    expect(stored.pendingOps).toHaveLength(1);
  });

  it('keeps a locally added end when the API write fails', async () => {
    apiMocks.addArcheryEnd.mockRejectedValueOnce(new Error('offline'));

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

    await act(async () => {
      await result.current.addEnd('round-1', [
        { score: 9, isGold: false },
        { score: 9, isGold: false },
        { score: 9, isGold: false },
      ]);
    });

    expect(result.current.activeSession?.archeryData?.rounds[0].ends).toHaveLength(2);
    expect(result.current.activeSession?.archeryData?.totalScore).toBe(57);
    expect(result.current.pendingSyncCount).toBe(1);
  });

  it('syncs pending local rounds when the browser comes back online', async () => {
    apiMocks.addArcheryRound
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        id: 'round-synced',
        sessionId: 'session-1',
        distance: 30,
        targetSize: 80,
        arrowsPerEnd: 3,
        order: 1,
        totalScore: 0,
        createdAt: Date.now(),
        ends: [],
      });

    const { result } = renderHook(() => useActiveArcherySession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.startSession({
        ...buildStoredSession(),
        archeryData: {
          ...buildStoredSession().archeryData!,
          rounds: [],
          totalScore: 0,
          maxPossibleScore: 0,
          averageArrow: 0,
          goldCount: 0,
        },
      }, {
        bowType: 'recurve',
        arrowsUsed: 12,
      });
    });

    await act(async () => {
      await result.current.addRound(30, 80, 3);
    });

    expect(result.current.pendingSyncCount).toBe(1);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(0);
    });
    expect(result.current.activeSession?.archeryData?.rounds[0].id).toBe('round-synced');
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

    await waitFor(() => {
      expect(resolveComplete).not.toBeNull();
    });

    act(() => {
      result.current.startSession({
        ...buildStoredSession(),
        id: 'session-2',
        archeryData: {
          ...buildStoredSession().archeryData!,
          rounds: [],
          totalScore: 0,
          maxPossibleScore: 0,
          averageArrow: 0,
          goldCount: 0,
        },
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
