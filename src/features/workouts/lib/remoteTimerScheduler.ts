import {
  cancelRemoteRestTimer,
  scheduleRemoteRestTimer,
  type CancelRemoteRestTimerResult,
  type ScheduleRemoteRestTimerInput,
  type ScheduleRemoteRestTimerResult
} from '../api/restRemote';
import {
  ensureBackgroundRestPushReady,
  getOrCreateDeviceId,
  isIosDevice,
  shouldUseBackgroundRestPush
} from '../api/pushApi';

export type ScheduleRemoteTimerResult = ScheduleRemoteRestTimerResult;
export type CancelRemoteTimerResult = CancelRemoteRestTimerResult;

interface ReadyRemoteTimer {
  deviceId: string;
}

export interface RemoteTimerSchedulerDependencies {
  now: () => number;
  canUseRemoteTimer: () => boolean;
  ensureReady: (requestPermission: boolean, ownerUserId: string) => Promise<ReadyRemoteTimer | null>;
  getDeviceId: () => string;
  isIos: () => boolean;
  scheduleRemote: (input: ScheduleRemoteRestTimerInput) => Promise<ScheduleRemoteTimerResult>;
  cancelRemote: (input: { deviceId: string; commandAtMs: number }) => Promise<CancelRemoteTimerResult>;
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  isOnline: () => boolean;
  addOnlineListener: (listener: () => void) => () => void;
}

export interface ScheduleRemoteTimerInput {
  executeAtMs: number;
  title?: string;
  body?: string;
  url?: string;
  requestPermission?: boolean;
}

type TerminalCommandOutcome<TResult> = {
  status: 'accepted' | 'rejected';
  commandAtMs: number;
  result: TResult;
};

type NonTerminalCommandOutcome = {
  status: 'skipped' | 'superseded';
  commandAtMs: number;
};

export type ScheduleRemoteTimerOutcome =
  | TerminalCommandOutcome<ScheduleRemoteTimerResult>
  | NonTerminalCommandOutcome;

export type CancelRemoteTimerOutcome =
  | TerminalCommandOutcome<CancelRemoteTimerResult>
  | NonTerminalCommandOutcome;

export interface RemoteTimerScheduler {
  setOwner: (userId: string | null) => void;
  schedule: (ownerUserId: string, input: ScheduleRemoteTimerInput) => Promise<ScheduleRemoteTimerOutcome>;
  cancel: (ownerUserId: string) => Promise<CancelRemoteTimerOutcome>;
  replayPending: () => Promise<void>;
}

const TIMER_COMMAND_STORAGE_KEY = 'remote-timer-command:v1';
const TIMER_COMMAND_LOCK_NAME = 'herculito:remote-timer-command';
const processLocks = new Set<string>();
const processLockQueues = new Map<string, Array<() => void>>();

const runProcessExclusive = <T>(name: string, task: () => T | Promise<T>): Promise<T> => (
  new Promise<T>((resolve, reject) => {
    const release = () => {
      const next = processLockQueues.get(name)?.shift();
      if (next) {
        next();
      } else {
        processLocks.delete(name);
        processLockQueues.delete(name);
      }
    };
    const run = () => {
      try {
        const result = task();
        if (result instanceof Promise) {
          void result.then(resolve, reject).finally(release);
        } else {
          resolve(result);
          release();
        }
      } catch (error) {
        reject(error);
        release();
      }
    };
    if (processLocks.has(name)) {
      const queue = processLockQueues.get(name) ?? [];
      queue.push(run);
      processLockQueues.set(name, queue);
    } else {
      processLocks.add(name);
      run();
    }
  })
);

const runTimerCommandExclusive = <T>(task: () => T | Promise<T>): Promise<T> => {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request<Promise<T>>(
      TIMER_COMMAND_LOCK_NAME,
      () => Promise.resolve(task())
    ).then((result) => result);
  }
  return runProcessExclusive(TIMER_COMMAND_LOCK_NAME, task);
};

type PersistedTimerCommand = {
  ownerUserId: string;
  deviceId: string;
  commandAtMs: number;
  status: 'pending' | 'delivered';
} & (
  | { kind: 'schedule'; input: ScheduleRemoteTimerInput }
  | { kind: 'cancel' }
);

interface PersistedTimerCommands {
  version: 1;
  devices: Record<string, PersistedTimerCommand>;
}

export const createRemoteTimerScheduler = (
  dependencies: RemoteTimerSchedulerDependencies
): RemoteTimerScheduler => {
  let latestSequence = 0;
  let latestCommandAtMs = 0;
  let currentOwnerUserId: string | null = null;

  const commandKey = (ownerUserId: string, deviceId: string): string => (
    JSON.stringify([ownerUserId, deviceId])
  );

  const readCommands = (): PersistedTimerCommands => {
    try {
      const raw = dependencies.storage.getItem(TIMER_COMMAND_STORAGE_KEY);
      if (!raw) return { version: 1, devices: {} };
      const parsed = JSON.parse(raw) as PersistedTimerCommands;
      if (parsed.version !== 1 || !parsed.devices || typeof parsed.devices !== 'object') {
        return { version: 1, devices: {} };
      }
      const devices = Object.fromEntries(Object.entries(parsed.devices).filter(([key, command]) => (
        command
        && typeof command === 'object'
        && typeof command.ownerUserId === 'string'
        && typeof command.deviceId === 'string'
        && key === commandKey(command.ownerUserId, command.deviceId)
      )));
      return { version: 1, devices };
    } catch {
      return { version: 1, devices: {} };
    }
  };

  const writeCommand = (command: PersistedTimerCommand): boolean => {
    const commands = readCommands();
    const key = commandKey(command.ownerUserId, command.deviceId);
    const latest = commands.devices[key];
    if (latest && latest.commandAtMs > command.commandAtMs) return false;
    commands.devices[key] = command;
    dependencies.storage.setItem(TIMER_COMMAND_STORAGE_KEY, JSON.stringify(commands));
    return true;
  };

  const getLatest = (ownerUserId: string, deviceId: string): PersistedTimerCommand | undefined => (
    readCommands().devices[commandKey(ownerUserId, deviceId)]
  );

  const isPersistedCurrent = (command: PersistedTimerCommand): boolean => {
    const latest = getLatest(command.ownerUserId, command.deviceId);
    return latest?.ownerUserId === command.ownerUserId
      && latest.commandAtMs === command.commandAtMs
      && latest.kind === command.kind;
  };

  const markDelivered = (command: PersistedTimerCommand): Promise<boolean> => {
    return runTimerCommandExclusive(() => {
      if (!isPersistedCurrent(command)) return false;
      return writeCommand({ ...command, status: 'delivered' });
    });
  };

  const nextCommand = (ownerUserId: string, deviceId: string, requestedAtMs: number) => {
    latestSequence += 1;
    const persistedAtMs = getLatest(ownerUserId, deviceId)?.commandAtMs ?? 0;
    latestCommandAtMs = Math.max(requestedAtMs, latestCommandAtMs + 1, persistedAtMs + 1);
    return { sequence: latestSequence, commandAtMs: latestCommandAtMs };
  };

  const isCurrent = (sequence: number, command: PersistedTimerCommand): boolean => (
    command.ownerUserId === currentOwnerUserId
    && sequence === latestSequence
    && isPersistedCurrent(command)
  );

  const executeSchedule = async (
    command: Extract<PersistedTimerCommand, { kind: 'schedule' }>,
    sequence: number,
    requestPermission: boolean
  ): Promise<ScheduleRemoteTimerOutcome> => {
      if (!dependencies.canUseRemoteTimer()) {
        return { status: 'skipped', commandAtMs: command.commandAtMs };
      }

      if (!dependencies.isOnline()) {
        return { status: 'skipped', commandAtMs: command.commandAtMs };
      }

      const ready = await dependencies.ensureReady(requestPermission, command.ownerUserId);
      if (!isCurrent(sequence, command)) {
        return { status: 'superseded', commandAtMs: command.commandAtMs };
      }
      if (!ready) {
        return { status: 'skipped', commandAtMs: command.commandAtMs };
      }

      const result = await dependencies.scheduleRemote({
        deviceId: ready.deviceId,
        executeAtMs: command.input.executeAtMs,
        commandAtMs: command.commandAtMs,
        title: command.input.title,
        body: command.input.body,
        url: command.input.url,
        tag: dependencies.isIos() ? 'rest-timer' : `rest-timer:${command.commandAtMs}`
      });

      if (!isCurrent(sequence, command)) {
        return { status: 'superseded', commandAtMs: command.commandAtMs };
      }
      if (!await markDelivered(command)) {
        return { status: 'superseded', commandAtMs: command.commandAtMs };
      }
      return {
        status: result.accepted ? 'accepted' : 'rejected',
        commandAtMs: command.commandAtMs,
        result
      };
  };

  const executeCancel = async (
    command: Extract<PersistedTimerCommand, { kind: 'cancel' }>,
    sequence: number
  ): Promise<CancelRemoteTimerOutcome> => {
      if (!dependencies.canUseRemoteTimer()) {
        return { status: 'skipped', commandAtMs: command.commandAtMs };
      }

      if (!dependencies.isOnline()) {
        return { status: 'skipped', commandAtMs: command.commandAtMs };
      }

      const result = await dependencies.cancelRemote({
        deviceId: command.deviceId,
        commandAtMs: command.commandAtMs
      });
      if (!isCurrent(sequence, command)) {
        return { status: 'superseded', commandAtMs: command.commandAtMs };
      }
      if (!await markDelivered(command)) {
        return { status: 'superseded', commandAtMs: command.commandAtMs };
      }
      return {
        status: result.accepted ? 'accepted' : 'rejected',
        commandAtMs: command.commandAtMs,
        result
      };
  };

  const scheduler: RemoteTimerScheduler = {
    setOwner: (userId) => {
      if (currentOwnerUserId === userId) return;
      currentOwnerUserId = userId;
      latestSequence += 1;
    },
    schedule: async (ownerUserId, input) => {
      if (!ownerUserId || ownerUserId !== currentOwnerUserId) {
        return { status: 'skipped', commandAtMs: dependencies.now() };
      }
      const deviceId = dependencies.getDeviceId();
      const requestedAtMs = dependencies.now();
      const { identity, command } = await runTimerCommandExclusive(() => {
        const identity = nextCommand(ownerUserId, deviceId, requestedAtMs);
        const command: PersistedTimerCommand = {
          kind: 'schedule',
          ownerUserId,
          deviceId,
          commandAtMs: identity.commandAtMs,
          status: 'pending',
          input: { ...input, executeAtMs: input.executeAtMs }
        };
        writeCommand(command);
        return { identity, command };
      });
      return executeSchedule(command, identity.sequence, input.requestPermission === true);
    },
    cancel: async (ownerUserId) => {
      if (!ownerUserId || ownerUserId !== currentOwnerUserId) {
        return { status: 'skipped', commandAtMs: dependencies.now() };
      }
      const deviceId = dependencies.getDeviceId();
      const requestedAtMs = dependencies.now();
      const { identity, command } = await runTimerCommandExclusive(() => {
        const identity = nextCommand(ownerUserId, deviceId, requestedAtMs);
        const command: PersistedTimerCommand = {
          kind: 'cancel',
          ownerUserId,
          deviceId,
          commandAtMs: identity.commandAtMs,
          status: 'pending'
        };
        writeCommand(command);
        return { identity, command };
      });
      return executeCancel(command, identity.sequence);
    },
    replayPending: async () => {
      if (!dependencies.isOnline() || !currentOwnerUserId) return;
      const command = getLatest(currentOwnerUserId, dependencies.getDeviceId());
      if (!command || command.status !== 'pending') return;
      latestSequence += 1;
      latestCommandAtMs = Math.max(latestCommandAtMs, command.commandAtMs);
      if (command.kind === 'schedule') {
        await executeSchedule(command, latestSequence, false);
      } else {
        await executeCancel(command, latestSequence);
      }
    }
  };

  dependencies.addOnlineListener(() => {
    void scheduler.replayPending().catch(() => {});
  });

  return scheduler;
};

export const remoteTimerScheduler = createRemoteTimerScheduler({
  now: Date.now,
  canUseRemoteTimer: shouldUseBackgroundRestPush,
  ensureReady: async (requestPermission, ownerUserId) => {
    if (requestPermission && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;
      } catch {
        return null;
      }
    }
    return ensureBackgroundRestPushReady(ownerUserId);
  },
  getDeviceId: getOrCreateDeviceId,
  isIos: isIosDevice,
  scheduleRemote: scheduleRemoteRestTimer,
  cancelRemote: cancelRemoteRestTimer,
  storage: {
    getItem: (key) => typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
    setItem: (key, value) => {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    }
  },
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  addOnlineListener: (listener) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('online', listener);
    return () => window.removeEventListener('online', listener);
  }
});
