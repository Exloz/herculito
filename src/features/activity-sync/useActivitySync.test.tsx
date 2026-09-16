// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useActivitySync } from './useActivitySync';

const syncMocks = vi.hoisted(() => ({
  getProjection: vi.fn(),
  reload: vi.fn(),
  syncPending: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./browserActivitySync', () => ({
  ACTIVITY_SYNC_CHANGED_EVENT: 'activity-sync-changed',
  getBrowserActivitySync: () => syncMocks
}));

describe('useActivitySync', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not repeatedly schedule a permanently failed queue head', async () => {
    vi.useFakeTimers();
    syncMocks.getProjection.mockReturnValue({
      active: null,
      pendingSyncCount: 1,
      failedSyncCount: 1,
      syncError: 'invalid command',
      syncFailureAction: 'retry',
      nextRetryAtMs: null
    });

    renderHook(() => useActivitySync('user-1'));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(syncMocks.syncPending).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
