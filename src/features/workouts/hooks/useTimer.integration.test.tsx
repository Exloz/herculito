// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { remoteTimerScheduler } from '../lib/remoteTimerScheduler';
import { useTimer } from './useTimer';

const transportMocks = vi.hoisted(() => ({
  fetchApiJson: vi.fn(),
  fetchPublicApiJson: vi.fn()
}));

vi.mock('../../../shared/api/transport', () => transportMocks);

describe('Android background rest notification integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    vi.stubEnv('VITE_ANDROID_BACKGROUND_PUSH_ENABLED', undefined);
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    vi.stubGlobal('Notification', { permission: 'granted' });
    vi.stubGlobal('PushManager', class {});
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android Chrome');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: async () => ({ toJSON: () => ({ endpoint: 'https://push.example/device' }) })
          },
          getNotifications: async () => [],
          showNotification: vi.fn().mockResolvedValue(undefined)
        })
      }
    });
    transportMocks.fetchApiJson.mockReset();
    transportMocks.fetchApiJson.mockImplementation(async (path: string, options: RequestInit) => {
      if (path === '/v1/push/subscribe') return { ok: true };
      const input = JSON.parse(options.body as string);
      return {
        accepted: true,
        canceled: true,
        jobId: 'user-1:device:rest',
        executeAtMs: input.executeAtMs,
        requestedAtMs: input.commandAtMs
      };
    });
    remoteTimerScheduler.setOwner('user-1');
  });

  afterEach(() => {
    remoteTimerScheduler.setOwner(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('registers and arms consecutive background rests without a build-time opt-in', async () => {
    const { result, unmount } = renderHook(() => useTimer('user-1'));
    for (const startedAtMs of [1_000, 12_000]) {
      vi.setSystemTime(startedAtMs);
      await act(async () => result.current.startTimer(10));
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      act(() => document.dispatchEvent(new Event('visibilitychange')));
      vi.setSystemTime(startedAtMs + 11_000);
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    }

    const calls = transportMocks.fetchApiJson.mock.calls;
    const schedules = calls.filter(([path]) => path === '/v1/rest/schedule');
    expect(calls.filter(([path]) => path === '/v1/push/subscribe')).toHaveLength(2);
    expect(schedules).toHaveLength(2);
    expect(schedules.map(([, options]) => JSON.parse(options.body))).toEqual([
      expect.objectContaining({ executeAtMs: 11_000, tag: 'rest-timer-11000' }),
      expect.objectContaining({ executeAtMs: 22_000, tag: 'rest-timer-22000' })
    ]);
    unmount();
  });
});
