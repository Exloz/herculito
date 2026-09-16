// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePublicRoutineVisibility } from './usePublicRoutineVisibility';

const mocks = vi.hoisted(() => ({
  fetchHiddenPublicRoutineIds: vi.fn(),
  updateRoutineVisibility: vi.fn()
}));

vi.mock('../../../shared/api/dataApi', () => ({
  fetchHiddenPublicRoutineIds: mocks.fetchHiddenPublicRoutineIds,
  updateRoutineVisibility: mocks.updateRoutineVisibility
}));

describe('usePublicRoutineVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchHiddenPublicRoutineIds.mockResolvedValue([]);
    mocks.updateRoutineVisibility.mockResolvedValue(undefined);
  });

  it('does not re-fetch in the context that successfully posted the optimistic change', async () => {
    const { result } = renderHook(() => usePublicRoutineVisibility('user-1'));
    await waitFor(() => expect(mocks.fetchHiddenPublicRoutineIds).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.setRoutineVisibilityOnDashboard('routine-1', false);
    });

    expect(result.current.hiddenRoutineIds.has('routine-1')).toBe(true);
    expect(mocks.fetchHiddenPublicRoutineIds).toHaveBeenCalledTimes(1);
  });

  it('still re-fetches visibility in another mounted context', async () => {
    const first = renderHook(() => usePublicRoutineVisibility('user-1'));
    renderHook(() => usePublicRoutineVisibility('user-1'));
    await waitFor(() => expect(mocks.fetchHiddenPublicRoutineIds).toHaveBeenCalledTimes(2));

    await act(async () => {
      await first.result.current.setRoutineVisibilityOnDashboard('routine-1', false);
    });

    await waitFor(() => expect(mocks.fetchHiddenPublicRoutineIds).toHaveBeenCalledTimes(3));
  });
});
