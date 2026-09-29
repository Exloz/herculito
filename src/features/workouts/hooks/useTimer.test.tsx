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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

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
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'Notification');
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(navigator, 'userActivation');
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

  it('uses one one-second interval for visible updates', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    await act(async () => result.current.startTimer(10));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(result.current.timeLeft).toBe(7);
    unmount();
    setIntervalSpy.mockRestore();
  });

  it('stops visual wakeups while hidden and reconciles the absolute deadline on return', async () => {
    const { result, unmount } = renderHook(() => useTimer('user-1'));
    await act(async () => result.current.startTimer(10));

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.timeLeft).toBe(10);

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.timeLeft).toBe(5);
    unmount();
  });

  it('does not alert again on resume when the remote notification is already visible', async () => {
    const getNotifications = vi.fn().mockResolvedValue([{}]);
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted' }
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ getNotifications, showNotification }) }
    });
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    await act(async () => result.current.startTimer(1));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    vi.setSystemTime(3_000);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(getNotifications).toHaveBeenCalledWith({ tag: 'rest-timer-2000' });
    expect(showNotification).not.toHaveBeenCalled();
    unmount();
  });

  it('alerts for each visible rest even if the preceding notification is still displayed', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted' }
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ showNotification }) }
    });
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    for (let rest = 0; rest < 2; rest += 1) {
      await act(async () => result.current.startTimer(1));
      await act(async () => vi.advanceTimersByTimeAsync(1_000));
    }

    expect(showNotification).toHaveBeenCalledTimes(2);
    for (const [index, [, options]] of showNotification.mock.calls.entries()) {
      expect(options).toMatchObject({
        tag: `rest-timer-${2_000 + index * 1_000}`, renotify: true, silent: false
      });
    }
    unmount();
  });

  it('does not mistake a previous rest notification for delivery of the current rest on resume', async () => {
    const getNotifications = vi.fn(async ({ tag }: { tag: string }) => (
      tag === 'rest-timer' || tag === 'rest-timer-500' ? [{}] : []
    ));
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted' }
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ getNotifications, showNotification }) }
    });
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    await act(async () => result.current.startTimer(1));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    vi.setSystemTime(3_000);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));

    expect(showNotification).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('arms the active background rest when notifications are enabled after it starts', async () => {
    const notificationApi = {
      permission: 'default',
      requestPermission: vi.fn(async () => {
        notificationApi.permission = 'granted';
        return 'granted';
      })
    };
    Object.defineProperty(window, 'Notification', { configurable: true, value: notificationApi });
    const { result, unmount } = renderHook(() => useTimer('user-1'));
    await act(async () => result.current.startTimer(10));
    schedulerMocks.schedule.mockClear();

    await act(async () => {
      expect(await result.current.requestPermission()).toBe(true);
    });

    expect(schedulerMocks.schedule).toHaveBeenCalledWith('user-1', { executeAtMs: 11_000 });
    unmount();
  });

  it('requests permission during the start gesture before entering the asynchronous scheduler', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission }
    });
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: true }
    });
    const { result, unmount } = renderHook(() => useTimer('user-1'));
    await act(async () => {
      const start = result.current.startTimer(10);
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(schedulerMocks.schedule).not.toHaveBeenCalled();
      await start;
    });
    expect(schedulerMocks.schedule).toHaveBeenCalledWith('user-1', { executeAtMs: 11_000 });
    unmount();
  });

  it('does not rearm a timer paused while the start permission prompt is open', async () => {
    const permission = deferred<NotificationPermission>();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission: () => permission.promise }
    });
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: true }
    });
    const { result, unmount } = renderHook(() => useTimer('user-1'));
    let start: Promise<void>;
    act(() => {
      start = result.current.startTimer(10);
    });
    act(() => result.current.pauseTimer());
    await act(async () => {
      permission.resolve('granted');
      await start;
    });
    expect(schedulerMocks.schedule).not.toHaveBeenCalled();
    unmount();
  });

  it('releases a wake lock that resolves after unmount', async () => {
    const pendingWakeLock = deferred<WakeLockSentinel>();
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn(() => pendingWakeLock.promise);
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request }
    });
    const { result, unmount } = renderHook(() => useTimer('user-1'));

    await act(async () => result.current.startTimer(10));
    expect(request).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      pendingWakeLock.resolve({ release } as unknown as WakeLockSentinel);
      await Promise.resolve();
    });

    expect(release).toHaveBeenCalledTimes(1);
  });
});
