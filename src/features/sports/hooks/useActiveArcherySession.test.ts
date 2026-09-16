// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SportSession } from '../../../shared/types';
import { useActiveArcherySession } from './useActiveArcherySession';

const session: SportSession = {
  id: 'archery-1',
  userId: 'user-1',
  sportType: 'archery',
  sportName: 'Tiro con Arco',
  startedAt: new Date('2026-09-15T10:00:00Z'),
  status: 'active',
  archeryData: {
    bowType: 'recurve',
    arrowsUsed: 12,
    rounds: [],
    totalScore: 0,
    maxPossibleScore: 0,
    averageArrow: 0,
    goldCount: 0
  }
};

const mocks = vi.hoisted(() => ({
  startArchery: vi.fn(),
  addArcheryRound: vi.fn(),
  addArcheryEnd: vi.fn(),
  updateArcheryNotes: vi.fn(),
  completeArchery: vi.fn(),
  abandon: vi.fn(),
  syncPending: vi.fn().mockResolvedValue(undefined),
  projection: {
    active: null as null | { kind: 'archery'; id: string; session: SportSession },
    pendingSyncCount: 0
  }
}));

vi.mock('../../activity-sync/useActivitySync', () => ({
  useActivitySync: () => ({
    activitySync: {
      startArchery: mocks.startArchery,
      addArcheryRound: mocks.addArcheryRound,
      addArcheryEnd: mocks.addArcheryEnd,
      updateArcheryNotes: mocks.updateArcheryNotes,
      completeArchery: mocks.completeArchery,
      abandon: mocks.abandon,
      syncPending: mocks.syncPending
    },
    projection: mocks.projection
  })
}));

describe('useActiveArcherySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projection.active = null;
    mocks.projection.pendingSyncCount = 0;
    mocks.startArchery.mockReturnValue({ session });
  });

  it('starts through the shared activity synchronizer', () => {
    const { result } = renderHook(() => useActiveArcherySession('user-1'));

    act(() => {
      result.current.startSession({ bowType: 'recurve', arrowsUsed: 12 });
    });

    expect(mocks.startArchery).toHaveBeenCalledWith({ bowType: 'recurve', arrowsUsed: 12 });
    expect(mocks.syncPending).toHaveBeenCalled();
  });

  it('keeps a local completion summary after clearing the durable active projection', async () => {
    mocks.projection.active = { kind: 'archery', id: session.id, session };
    const { result } = renderHook(() => useActiveArcherySession('user-1'));

    await act(async () => {
      await result.current.completeSession('final');
    });

    expect(mocks.completeArchery).toHaveBeenCalledWith('archery-1', 'final');
    expect(result.current.activeSession).toMatchObject({ status: 'completed', notes: 'final' });
  });
});
