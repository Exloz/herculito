// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimer } from './useTimer';

const schedulerMocks = vi.hoisted(() => ({
  schedule: vi.fn().mockResolvedValue({ status: 'accepted' }),
  cancel: vi.fn().mockResolvedValue({ status: 'accepted' })
}));

vi.mock('../lib/remoteTimerScheduler', () => ({
  remoteTimerScheduler: schedulerMocks
}));

describe('useTimer', () => {
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
    localStorage.clear();
    schedulerMocks.schedule.mockClear();
    schedulerMocks.cancel.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces the remote deadline when a paused timer resumes', async () => {
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    await act(async () => {
      await result.current.startTimer(10);
    });
    expect(schedulerMocks.schedule).toHaveBeenLastCalledWith('user-1', { executeAtMs: 11_000 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(result.current.timeLeft).toBe(8);

    act(() => {
      result.current.pauseTimer();
    });
    expect(schedulerMocks.cancel).toHaveBeenCalledTimes(1);

    vi.setSystemTime(8_000);
    await act(async () => {
      await result.current.startTimer(result.current.timeLeft);
    });

    expect(schedulerMocks.schedule).toHaveBeenLastCalledWith('user-1', { executeAtMs: 16_000 });
    expect(result.current.timeLeft).toBe(8);
    unmount();
  });

  it('reconciles elapsed wall time after browser suspension without extending the deadline', async () => {
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    await act(async () => {
      await result.current.startTimer(10);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(result.current.timeLeft).toBe(8);

    vi.setSystemTime(9_000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.timeLeft).toBe(2);
    unmount();
  });

  it('does not cancel or erase an active timer merely because the component unmounts', async () => {
    const { result, unmount } = renderHook(() => useTimer('user-1'));
    await act(async () => {
      await result.current.startTimer(10);
    });

    unmount();

    expect(schedulerMocks.cancel).not.toHaveBeenCalled();
    expect(localStorage.getItem('workoutTimerState')).not.toBeNull();
  });
});
