import { describe, expect, it, vi } from 'vitest';
import {
  createRemoteTimerScheduler,
  type CancelRemoteTimerResult,
  type RemoteTimerSchedulerDependencies,
  type ScheduleRemoteTimerResult
} from './remoteTimerScheduler';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const createDependencies = (overrides: Partial<RemoteTimerSchedulerDependencies> = {}) => {
  let nowMs = 1_000;
  const values = new Map<string, string>();
  const dependencies: RemoteTimerSchedulerDependencies = {
    now: () => nowMs,
    canUseRemoteTimer: () => true,
    ensureReady: vi.fn().mockResolvedValue({ deviceId: 'device-1' }),
    getDeviceId: () => 'device-1',
    scheduleRemote: vi.fn().mockResolvedValue({
      accepted: true,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 11_000,
      requestedAtMs: 1_000
    }),
    cancelRemote: vi.fn().mockResolvedValue({
      accepted: true,
      canceled: true,
      jobId: 'user-1:device-1:rest',
      requestedAtMs: 1_000
    }),
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    },
    isOnline: () => true,
    addOnlineListener: () => () => {},
    ...overrides
  };

  return {
    dependencies,
    setNow: (value: number) => {
      nowMs = value;
    }
  };
};

describe('remote timer scheduler', () => {
  it('keeps the original absolute deadline while subscription readiness is delayed', async () => {
    const readiness = deferred<{ deviceId: string } | null>();
    const { dependencies, setNow } = createDependencies({
      ensureReady: vi.fn(() => readiness.promise)
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    const resultPromise = scheduler.schedule('user-1', { executeAtMs: 11_000 });
    setNow(8_000);
    readiness.resolve({ deviceId: 'device-1' });

    await expect(resultPromise).resolves.toMatchObject({ status: 'accepted' });
    expect(dependencies.scheduleRemote).toHaveBeenCalledWith({
      deviceId: 'device-1',
      executeAtMs: 11_000,
      commandAtMs: 1_000,
      tag: 'rest-timer'
    });
    expect(dependencies.ensureReady).toHaveBeenCalledWith(false);
  });

  it('does not schedule when readiness completes after a newer cancel command', async () => {
    const readiness = deferred<{ deviceId: string } | null>();
    const { dependencies, setNow } = createDependencies({
      ensureReady: vi.fn(() => readiness.promise)
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    const schedulePromise = scheduler.schedule('user-1', { executeAtMs: 11_000 });
    setNow(1_500);
    const cancelPromise = scheduler.cancel('user-1');
    readiness.resolve({ deviceId: 'device-1' });

    await expect(cancelPromise).resolves.toMatchObject({ status: 'accepted' });
    await expect(schedulePromise).resolves.toEqual({
      status: 'superseded',
      commandAtMs: 1_000
    });
    expect(dependencies.scheduleRemote).not.toHaveBeenCalled();
    expect(dependencies.cancelRemote).toHaveBeenCalledWith({
      deviceId: 'device-1',
      commandAtMs: 1_500
    });
  });

  it('orders replacement schedules and suppresses a stale async response', async () => {
    const firstResponse = deferred<ScheduleRemoteTimerResult>();
    const secondResponse = deferred<ScheduleRemoteTimerResult>();
    const scheduleRemote = vi.fn()
      .mockImplementationOnce(() => firstResponse.promise)
      .mockImplementationOnce(() => secondResponse.promise);
    const { dependencies, setNow } = createDependencies({ scheduleRemote });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    const first = scheduler.schedule('user-1', { executeAtMs: 11_000 });
    await vi.waitFor(() => expect(scheduleRemote).toHaveBeenCalledTimes(1));
    setNow(1_000);
    const second = scheduler.schedule('user-1', { executeAtMs: 21_000 });
    await vi.waitFor(() => expect(scheduleRemote).toHaveBeenCalledTimes(2));

    secondResponse.resolve({
      accepted: true,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 21_000,
      requestedAtMs: 1_001
    });
    await expect(second).resolves.toMatchObject({
      status: 'accepted',
      commandAtMs: 1_001
    });

    firstResponse.resolve({
      accepted: true,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 11_000,
      requestedAtMs: 1_000
    });
    await expect(first).resolves.toEqual({
      status: 'superseded',
      commandAtMs: 1_000
    });
    expect(scheduleRemote.mock.calls.map(([input]) => input)).toEqual([
      expect.objectContaining({ executeAtMs: 11_000, commandAtMs: 1_000 }),
      expect.objectContaining({ executeAtMs: 21_000, commandAtMs: 1_001 })
    ]);
  });

  it('surfaces a current rejected server outcome', async () => {
    const rejected: ScheduleRemoteTimerResult = {
      accepted: false,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 11_000,
      requestedAtMs: 1_000
    };
    const { dependencies } = createDependencies({
      scheduleRemote: vi.fn().mockResolvedValue(rejected)
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    await expect(scheduler.schedule('user-1', { executeAtMs: 11_000 })).resolves.toEqual({
      status: 'rejected',
      commandAtMs: 1_000,
      result: rejected
    });
  });

  it('skips commands when the platform is not eligible', async () => {
    const { dependencies } = createDependencies({
      canUseRemoteTimer: () => false
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    await expect(scheduler.schedule('user-1', { executeAtMs: 11_000 })).resolves.toEqual({
      status: 'skipped',
      commandAtMs: 1_000
    });
    await expect(scheduler.cancel('user-1')).resolves.toEqual({
      status: 'skipped',
      commandAtMs: 1_001
    });
    expect(dependencies.ensureReady).not.toHaveBeenCalled();
    expect(dependencies.scheduleRemote).not.toHaveBeenCalled();
    expect(dependencies.cancelRemote).not.toHaveBeenCalled();
  });

  it('suppresses a stale cancel response after a replacement schedule', async () => {
    const cancelResponse = deferred<CancelRemoteTimerResult>();
    const { dependencies, setNow } = createDependencies({
      cancelRemote: vi.fn(() => cancelResponse.promise)
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    const cancel = scheduler.cancel('user-1');
    setNow(1_500);
    const replacement = scheduler.schedule('user-1', { executeAtMs: 12_000 });
    cancelResponse.resolve({
      accepted: true,
      canceled: true,
      jobId: 'user-1:device-1:rest',
      requestedAtMs: 1_000
    });

    await expect(replacement).resolves.toMatchObject({ status: 'accepted' });
    await expect(cancel).resolves.toEqual({
      status: 'superseded',
      commandAtMs: 1_000
    });
  });

  it('replays an offline pending schedule with its original absolute deadline', async () => {
    const { dependencies } = createDependencies({
      ensureReady: vi.fn().mockResolvedValue(null)
    });
    const first = createRemoteTimerScheduler(dependencies);
    first.setOwner('user-1');

    await expect(first.schedule('user-1', { executeAtMs: 11_000, title: 'Rest' })).resolves.toMatchObject({
      status: 'skipped',
      commandAtMs: 1_000
    });

    const scheduleRemote = vi.fn().mockResolvedValue({
      accepted: true,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 11_000,
      requestedAtMs: 1_000
    });
    const reloaded = createRemoteTimerScheduler({
      ...dependencies,
      ensureReady: vi.fn().mockResolvedValue({ deviceId: 'device-1' }),
      scheduleRemote
    });
    reloaded.setOwner('user-1');
    await reloaded.replayPending();

    expect(scheduleRemote).toHaveBeenCalledWith(expect.objectContaining({
      deviceId: 'device-1',
      executeAtMs: 11_000,
      commandAtMs: 1_000,
      title: 'Rest'
    }));
  });

  it('serializes overlapping timestamp allocation across scheduler instances', async () => {
    let startSecond: (() => void) | null = null;
    const overlap: {
      secondPromise?: ReturnType<ReturnType<typeof createRemoteTimerScheduler>['cancel']>;
    } = {};
    const { dependencies } = createDependencies({
      ensureReady: vi.fn().mockResolvedValue(null)
    });
    const underlyingSetItem = dependencies.storage.setItem;
    dependencies.storage.setItem = (key, value) => {
      if (startSecond) {
        const runSecond = startSecond;
        startSecond = null;
        runSecond();
      }
      underlyingSetItem(key, value);
    };
    const first = createRemoteTimerScheduler(dependencies);
    const second = createRemoteTimerScheduler(dependencies);
    first.setOwner('user-1');
    second.setOwner('user-1');
    startSecond = () => {
      overlap.secondPromise = second.cancel('user-1');
    };

    const firstResult = await first.schedule('user-1', { executeAtMs: 11_000 });
    const secondResult = overlap.secondPromise ? await overlap.secondPromise : null;

    expect(firstResult.commandAtMs).toBe(1_000);
    expect(secondResult?.commandAtMs).toBe(1_001);
  });

  it('replays a pending cancel after connectivity returns', async () => {
    let online = false;
    const { dependencies } = createDependencies({ isOnline: () => online });
    const first = createRemoteTimerScheduler(dependencies);
    first.setOwner('user-1');
    await expect(first.cancel('user-1')).resolves.toMatchObject({ status: 'skipped', commandAtMs: 1_000 });
    expect(dependencies.cancelRemote).not.toHaveBeenCalled();

    online = true;
    const cancelRemote = vi.fn().mockResolvedValue({
      accepted: true,
      canceled: true,
      jobId: 'user-1:device-1:rest',
      requestedAtMs: 1_000
    });
    const reloaded = createRemoteTimerScheduler({ ...dependencies, cancelRemote });
    reloaded.setOwner('user-1');
    await reloaded.replayPending();

    expect(cancelRemote).toHaveBeenCalledWith({ deviceId: 'device-1', commandAtMs: 1_000 });
  });

  it('retains one owner pending command without replaying it for another owner', async () => {
    let online = false;
    const { dependencies } = createDependencies({ isOnline: () => online });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-a');
    await scheduler.schedule('user-a', { executeAtMs: 11_000 });

    online = true;
    scheduler.setOwner('user-b');
    await scheduler.replayPending();
    expect(dependencies.scheduleRemote).not.toHaveBeenCalled();

    scheduler.setOwner('user-a');
    await scheduler.replayPending();
    expect(dependencies.scheduleRemote).toHaveBeenCalledWith(expect.objectContaining({
      deviceId: 'device-1',
      executeAtMs: 11_000
    }));
  });

  it('never replays a legacy timer command without a proven owner', async () => {
    const values = new Map<string, string>([[
      'remote-timer-command:v1',
      JSON.stringify({
        version: 1,
        devices: {
          'device-1': {
            kind: 'schedule', deviceId: 'device-1', commandAtMs: 1_000,
            status: 'pending', input: { executeAtMs: 11_000 }
          }
        }
      })
    ]]);
    const { dependencies } = createDependencies({
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
      }
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-1');

    await scheduler.replayPending();

    expect(dependencies.scheduleRemote).not.toHaveBeenCalled();
  });

  it('suppresses subscription readiness when the authenticated owner changes', async () => {
    const readiness = deferred<{ deviceId: string } | null>();
    const { dependencies } = createDependencies({
      ensureReady: vi.fn(() => readiness.promise)
    });
    const scheduler = createRemoteTimerScheduler(dependencies);
    scheduler.setOwner('user-a');
    const pending = scheduler.schedule('user-a', { executeAtMs: 11_000 });

    scheduler.setOwner('user-b');
    readiness.resolve({ deviceId: 'device-1' });

    await expect(pending).resolves.toMatchObject({ status: 'superseded' });
    expect(dependencies.scheduleRemote).not.toHaveBeenCalled();
  });
});
