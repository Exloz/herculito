// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HiitConfig } from '../../../shared/types';
import { useHiitTimer } from './useHiitTimer';

const schedulerMocks = vi.hoisted(() => ({
  schedule: vi.fn().mockResolvedValue({ status: 'accepted' }),
  cancel: vi.fn().mockResolvedValue({ status: 'accepted' })
}));

const activitySyncMocks = vi.hoisted(() => ({
  getHiitTimerState: vi.fn().mockReturnValue(null),
  saveHiitTimerState: vi.fn(),
  clearHiitTimerState: vi.fn()
}));

vi.mock('../../workouts/lib/remoteTimerScheduler', () => ({
  remoteTimerScheduler: schedulerMocks
}));

vi.mock('../../activity-sync/useActivitySync', () => ({
  useActivitySync: () => ({ activitySync: activitySyncMocks })
}));

const config: HiitConfig = {
  intervals: 1,
  workDuration: 10,
  restEnabled: false,
  restDuration: 0
};

describe('useHiitTimer', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    });
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    schedulerMocks.schedule.mockClear();
    schedulerMocks.cancel.mockClear();
    activitySyncMocks.getHiitTimerState.mockReset().mockReturnValue(null);
    activitySyncMocks.saveHiitTimerState.mockClear();
    activitySyncMocks.clearHiitTimerState.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels while paused and schedules the remaining phase on resume', async () => {
    const { result, unmount } = renderHook(() => useHiitTimer('user-1', 'hiit-1'));

    act(() => {
      result.current.start(config);
    });
    expect(schedulerMocks.schedule).toHaveBeenLastCalledWith('user-1', {
      executeAtMs: 6_000,
      title: 'HIIT Timer',
      body: 'Comienza trabajo',
      requestPermission: true
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.state.secondsRemaining).toBe(3);

    act(() => {
      result.current.pause();
    });
    expect(schedulerMocks.cancel).toHaveBeenCalledTimes(1);

    vi.setSystemTime(10_000);
    act(() => {
      result.current.resume();
    });

    expect(result.current.state.secondsRemaining).toBe(3);
    expect(schedulerMocks.schedule).toHaveBeenLastCalledWith('user-1', {
      executeAtMs: 13_000,
      title: 'HIIT Timer',
      body: 'Comienza trabajo'
    });
    unmount();
  });

  it('consumes wall time immediately when returning from suspension', () => {
    const { result, unmount } = renderHook(() => useHiitTimer('user-1', 'hiit-1'));

    act(() => {
      result.current.start(config);
    });
    vi.setSystemTime(9_000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.secondsRemaining).toBe(7);
    expect(schedulerMocks.schedule).toHaveBeenLastCalledWith('user-1', {
      executeAtMs: 16_000,
      title: 'HIIT Timer',
      body: 'HIIT completado'
    });
    unmount();
  });

  it('renders the matching persisted session state on the first render', () => {
    activitySyncMocks.getHiitTimerState.mockReturnValue({
      config,
      state: { phase: 'work', currentInterval: 1, secondsRemaining: 7, totalElapsed: 8 },
      startedAtMs: 1_000,
      lastTickAtMs: 9_000,
      pausedAtMs: 9_000
    });

    const { result, unmount } = renderHook(() => useHiitTimer('user-1', 'hiit-1'));

    expect(result.current.state).toMatchObject({ phase: 'work', secondsRemaining: 7 });
    expect(result.current.isPaused).toBe(true);
    unmount();
  });

  it('does not cancel the remote phase timer merely because the view unmounts', () => {
    const { result, unmount } = renderHook(() => useHiitTimer('user-1', 'hiit-1'));
    act(() => result.current.start(config));
    schedulerMocks.cancel.mockClear();

    unmount();

    expect(schedulerMocks.cancel).not.toHaveBeenCalled();
  });
});
