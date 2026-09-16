import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ExerciseLog,
  HiitConfig,
  Routine,
  SportSession,
  WorkoutSession
} from '../../shared/types';
import { ApiError } from '../../shared/api/apiClient';
import { WireDecodeError } from '../../shared/api/wire';
import {
  createActivitySync,
  createMemoryActivitySyncStorage,
  type ActivitySyncCommand,
  type ActivitySyncRemote,
  type ActivitySyncRemoteResult
} from './activitySync';

const routine: Routine = {
  id: 'routine-1',
  name: 'Push',
  exercises: [{ id: 'bench', name: 'Press banca', sets: 1, reps: 8 }],
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  createdBy: 'user-1',
  isPublic: false
};

const logs: ExerciseLog[] = [{
  exerciseId: 'bench',
  userId: 'user-1',
  date: '2026-09-15',
  sets: [{ setNumber: 1, weight: 80, reps: 8, completed: true }]
}];

const hiitConfig: HiitConfig = {
  intervals: 4,
  workDuration: 30,
  restEnabled: true,
  restDuration: 15
};

const createIds = (...ids: string[]) => {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
};

const resultFor = (command: ActivitySyncCommand): ActivitySyncRemoteResult => {
  if (command.kind === 'workout.start') {
    const session: WorkoutSession = {
      id: command.activityId,
      routineId: command.routineId,
      routineName: command.routineName,
      userId: command.userId,
      startedAt: new Date(command.startedAtMs),
      exercises: []
    };
    return { workoutSession: session };
  }

  if (command.kind === 'sport.start') {
    const session: SportSession = {
      id: command.activityId,
      userId: command.userId,
      sportType: command.sportType,
      sportName: command.sportType === 'archery' ? 'Tiro con Arco' : 'HIIT',
      startedAt: new Date(command.startedAtMs),
      status: 'active',
      ...(command.sportType === 'archery'
        ? {
            archeryData: {
              ...command.archeryConfig!,
              rounds: [],
              totalScore: 0,
              maxPossibleScore: 0,
              averageArrow: 0,
              goldCount: 0
            }
          }
        : {
            hiitData: {
              ...command.hiitConfig!,
              totalWorkTime: command.hiitConfig!.intervals * command.hiitConfig!.workDuration,
              totalRestTime: command.hiitConfig!.restEnabled
                ? (command.hiitConfig!.intervals - 1) * command.hiitConfig!.restDuration
                : 0
            }
          })
    };
    return { sportSession: session };
  }

  return {};
};

const createRemote = () => {
  const commands: ActivitySyncCommand[] = [];
  const remote: ActivitySyncRemote = {
    execute: vi.fn(async (command) => {
      commands.push(command);
      return resultFor(command);
    })
  };
  return { commands, remote };
};

describe('activity synchronization', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it.each(['workout', 'archery', 'hiit'] as const)(
    'starts %s offline, restores it after reload, and synchronizes once',
    async (kind) => {
      const storage = createMemoryActivitySyncStorage();
      const offline: ActivitySyncRemote = { execute: vi.fn().mockRejectedValue(new Error('offline')) };
      const first = createActivitySync({
        userId: 'user-1',
        storage,
        remote: offline,
        createId: createIds('activity-1', 'command-1'),
        now: () => 1_800_000_000_000
      });

      if (kind === 'workout') first.startWorkout(routine);
      if (kind === 'archery') first.startArchery({ bowType: 'recurve', arrowsUsed: 12 });
      if (kind === 'hiit') first.startHiit(hiitConfig);
      await first.syncPending();

      const { commands, remote } = createRemote();
      const reloaded = createActivitySync({
        userId: 'user-1',
        storage,
        remote,
        createId: createIds('unused'),
        now: () => 1_800_000_010_000
      });

      expect(reloaded.getProjection().active?.kind).toBe(kind);
      expect(reloaded.getProjection().pendingSyncCount).toBe(1);

      await reloaded.syncPending();
      await reloaded.syncPending();

      expect(commands).toHaveLength(1);
      expect(reloaded.getProjection().pendingSyncCount).toBe(0);
    }
  );

  it('isolates active activities and commands by current user', () => {
    const storage = createMemoryActivitySyncStorage();
    const { remote } = createRemote();
    const userOne = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('workout-1', 'command-1'), now: () => 10
    });
    userOne.startWorkout(routine);

    const userTwo = createActivitySync({
      userId: 'user-2', storage, remote, createId: createIds('hiit-2', 'command-2'), now: () => 20
    });

    expect(userTwo.getProjection()).toMatchObject({ active: null, pendingSyncCount: 0 });
    userTwo.startHiit(hiitConfig);
    expect(userOne.getProjection().active?.id).toBe('workout-1');
    expect(userTwo.getProjection().active?.id).toBe('hiit-2');
  });

  it('retries the same command after a response is lost following server commit', async () => {
    const storage = createMemoryActivitySyncStorage();
    const committed = new Set<string>();
    const calls: ActivitySyncCommand[] = [];
    let loseFirstResponse = true;
    let nowMs = 10;
    const remote: ActivitySyncRemote = {
      execute: async (command) => {
        calls.push(command);
        committed.add(command.commandId);
        if (loseFirstResponse) {
          loseFirstResponse = false;
          throw new Error('response lost');
        }
        return resultFor(command);
      }
    };
    const sync = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('workout-1', 'command-1'), now: () => nowMs
    });
    sync.startWorkout(routine);

    await sync.syncPending();
    nowMs = 20_000;
    await sync.syncPending();

    expect(calls.map((command) => command.commandId)).toEqual(['command-1', 'command-1']);
    expect(committed.size).toBe(1);
    expect(sync.getProjection().pendingSyncCount).toBe(0);
  });

  it('does not apply an old response to a newer active activity', async () => {
    const storage = createMemoryActivitySyncStorage();
    let resolveOld: ((result: ActivitySyncRemoteResult) => void) | undefined;
    let delayed = false;
    const remote: ActivitySyncRemote = {
      execute: vi.fn((command: ActivitySyncCommand): Promise<ActivitySyncRemoteResult> => {
        if (command.activityId === 'workout-old' && !delayed) {
          delayed = true;
          return new Promise<ActivitySyncRemoteResult>((resolve) => { resolveOld = resolve; });
        }
        return Promise.resolve(resultFor(command));
      })
    };
    const sync = createActivitySync({
      userId: 'user-1',
      storage,
      remote,
      createId: createIds(
        'workout-old', 'start-old',
        'abandon-old', 'hiit-new', 'start-new'
      ),
      now: () => 10
    });
    sync.startWorkout(routine);
    const pending = sync.syncPending();
    sync.abandon('workout-old');
    sync.startHiit(hiitConfig);

    resolveOld?.(resultFor(sync.getPendingCommands()[0]));
    await pending;

    expect(sync.getProjection().active).toMatchObject({ kind: 'hiit', id: 'hiit-new' });
  });

  it('abandons the current local activity when another one starts', () => {
    const storage = createMemoryActivitySyncStorage();
    const { remote } = createRemote();
    const sync = createActivitySync({
      userId: 'user-1', storage, remote,
      createId: createIds('workout-1', 'start', 'progress', 'hiit-1', 'start-hiit'),
      now: () => 10
    });
    sync.startWorkout(routine);
    sync.updateWorkoutProgress('workout-1', logs);

    sync.startHiit(hiitConfig);
    expect(sync.getProjection().active).toMatchObject({
      kind: 'hiit',
      id: 'hiit-1'
    });
    expect(sync.getPendingCommands().map((command) => command.kind)).toEqual([
      'sport.start'
    ]);
  });

  it('preserves distinct commands during overlapping cross-tab writes', async () => {
    const memoryStorage = createMemoryActivitySyncStorage();
    let overlap: (() => void) | null = null;
    const storage = {
      get length() {
        return memoryStorage.length;
      },
      key: (index: number) => memoryStorage.key?.(index) ?? null,
      getItem: (key: string) => memoryStorage.getItem(key),
      removeItem: (key: string) => memoryStorage.removeItem(key),
      setItem: (key: string, value: string) => {
        if (overlap && key.includes(':writer:first-tab')) {
          const runOverlap = overlap;
          overlap = null;
          runOverlap();
        }
        memoryStorage.setItem(key, value);
      }
    };
    const { remote } = createRemote();
    const seed = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'seed-tab',
      createId: createIds('archery-1', 'start'), now: () => 10
    });
    seed.startArchery({ bowType: 'recurve', arrowsUsed: 6 });
    const first = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'first-tab',
      createId: createIds('round-1', 'add-round-1'), now: () => 20
    });
    const second = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'second-tab',
      createId: createIds('round-2', 'add-round-2'), now: () => 20
    });
    overlap = () => {
      second.addArcheryRound('archery-1', 30, 80, 3);
    };

    first.addArcheryRound('archery-1', 18, 40, 3);

    first.reload();
    expect(first.getPendingCommands().map((command) => command.kind)).toEqual([
      'sport.start',
      'archery.addRound',
      'archery.addRound'
    ]);
    expect(first.getPendingCommands().map((command) => command.commandId)).toEqual([
      'start',
      'add-round-1',
      'add-round-2'
    ]);

    await first.syncPending();
    second.reload();
    expect(second.getProjection().pendingSyncCount).toBe(0);
  });

  it('reconciles overlapping archery rounds and ends into the active candidate', async () => {
    const memoryStorage = createMemoryActivitySyncStorage();
    let overlap: (() => void) | null = null;
    const storage = {
      get length() { return memoryStorage.length; },
      key: (index: number) => memoryStorage.key?.(index) ?? null,
      getItem: (key: string) => memoryStorage.getItem(key),
      removeItem: (key: string) => memoryStorage.removeItem(key),
      setItem: (key: string, value: string) => {
        if (overlap && key.includes(':writer:first')) {
          const runOverlap = overlap;
          overlap = null;
          runOverlap();
        }
        memoryStorage.setItem(key, value);
      }
    };
    const remote: ActivitySyncRemote = {
      execute: vi.fn(async (command) => {
        if (command.kind === 'archery.addRound') {
          return {
            round: {
              id: command.roundId,
              sessionId: command.activityId,
              distance: command.distance,
              targetSize: command.targetSize,
              arrowsPerEnd: command.arrowsPerEnd,
              order: command.roundId === 'round-a' ? 1 : 2,
              totalScore: 0,
              createdAt: new Date(command.createdAtMs),
              ends: []
            }
          };
        }
        if (command.kind === 'archery.addEnd') {
          return {
            end: {
              id: command.endId,
              roundId: command.roundId,
              endNumber: 1,
              subtotal: 10,
              goldCount: 1,
              createdAt: new Date(command.createdAtMs),
              arrows: [{
                id: 'server-arrow',
                score: 10,
                isGold: true,
                timestamp: new Date(command.createdAtMs)
              }]
            }
          };
        }
        return resultFor(command);
      })
    };
    const seed = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'seed', createId: createIds('archery-1', 'start'), now: () => 10
    });
    seed.startArchery({ bowType: 'recurve', arrowsUsed: 6 });
    const first = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'first',
      createId: createIds('round-a', 'add-round-a'),
      now: () => 20
    });
    const second = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'second',
      createId: createIds('round-b', 'add-round-b', 'end-b', 'arrow-b', 'add-end-b'),
      now: () => 20
    });

    overlap = () => {
      const roundB = second.addArcheryRound('archery-1', 30, 80, 1);
      second.addArcheryEnd('archery-1', roundB.id, [{ score: 10, isGold: true }]);
    };
    first.addArcheryRound('archery-1', 18, 40, 1);
    await first.syncPending();

    const reloaded = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'reloaded', createId: createIds('unused'), now: () => 30
    });
    const active = reloaded.getProjection().active;
    expect(active?.kind).toBe('archery');
    if (active?.kind !== 'archery') throw new Error('Expected archery activity');
    expect(active.session.archeryData?.rounds.map((round) => round.id)).toEqual(['round-a', 'round-b']);
    expect(active.session.archeryData?.rounds[1]?.ends.map((end) => end.id)).toEqual(['end-b']);
  });

  it('applies overlapping workout progress in deterministic command execution order', async () => {
    const memoryStorage = createMemoryActivitySyncStorage();
    let overlap: (() => void) | null = null;
    const storage = {
      get length() { return memoryStorage.length; },
      key: (index: number) => memoryStorage.key?.(index) ?? null,
      getItem: (key: string) => memoryStorage.getItem(key),
      removeItem: (key: string) => memoryStorage.removeItem(key),
      setItem: (key: string, value: string) => {
        if (overlap && key.includes(':writer:first')) {
          const runOverlap = overlap;
          overlap = null;
          runOverlap();
        }
        memoryStorage.setItem(key, value);
      }
    };
    const calls: ActivitySyncCommand[] = [];
    const remote: ActivitySyncRemote = {
      execute: vi.fn(async (command) => {
        calls.push(command);
        return resultFor(command);
      })
    };
    const seed = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'seed', createId: createIds('workout-1', 'start'), now: () => 10
    });
    seed.startWorkout(routine);
    const firstLogs = [{ ...logs[0], sets: [{ ...logs[0].sets[0], weight: 70 }] }];
    const secondLogs = [{ ...logs[0], sets: [{ ...logs[0].sets[0], weight: 90 }] }];
    const first = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'first', createId: createIds('progress-z'), now: () => 20
    });
    const second = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'second', createId: createIds('progress-a'), now: () => 30
    });

    overlap = () => second.updateWorkoutProgress('workout-1', secondLogs);
    first.updateWorkoutProgress('workout-1', firstLogs);
    await first.syncPending();

    expect(calls.map((command) => command.commandId)).toEqual(['start', 'progress-z', 'progress-a']);
    const reloaded = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'reloaded', createId: createIds('unused'), now: () => 40
    });
    expect(reloaded.getProjection().active).toMatchObject({
      kind: 'workout',
      session: { exercises: secondLogs }
    });
  });

  it('keeps the accepted activity usable when simultaneous cross-tab starts conflict', async () => {
    const memoryStorage = createMemoryActivitySyncStorage();
    let overlap: (() => void) | null = null;
    const storage = {
      get length() {
        return memoryStorage.length;
      },
      key: (index: number) => memoryStorage.key?.(index) ?? null,
      getItem: (key: string) => memoryStorage.getItem(key),
      removeItem: (key: string) => memoryStorage.removeItem(key),
      setItem: (key: string, value: string) => {
        if (overlap && key.includes(':writer:first-tab')) {
          const runOverlap = overlap;
          overlap = null;
          runOverlap();
        }
        memoryStorage.setItem(key, value);
      }
    };
    const calls: ActivitySyncCommand[] = [];
    const remote: ActivitySyncRemote = {
      execute: vi.fn(async (command) => {
        calls.push(command);
        if (command.activityId === 'hiit-b') {
          throw new ApiError('active_activity_exists', {
            status: 409,
            code: 'active_activity_exists',
            details: { error: 'active_activity_exists' }
          });
        }
        return resultFor(command);
      })
    };
    const first = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'first-tab',
      createId: createIds('workout-a', 'start-a'), now: () => 10
    });
    const second = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'second-tab',
      createId: createIds('hiit-b', 'start-b'), now: () => 20
    });
    overlap = () => {
      second.startHiit(hiitConfig);
    };

    first.startWorkout(routine);
    await first.syncPending();

    expect(first.getProjection()).toMatchObject({
      active: { id: 'workout-a' },
      pendingSyncCount: 0,
      failedSyncCount: 0
    });
    expect(calls.map((command) => command.activityId)).toEqual(['workout-a', 'hiit-b']);

    const reloaded = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'reloaded-tab',
      createId: createIds('progress-a', 'complete-a'), now: () => 30
    });
    expect(reloaded.getProjection().active?.id).toBe('workout-a');

    reloaded.updateWorkoutProgress('workout-a', logs);
    reloaded.completeWorkout('workout-a', {
      exercises: logs,
      completedAtMs: 40,
      totalDuration: 1
    });
    await reloaded.syncPending();

    expect(calls.map((command) => command.kind)).toEqual([
      'workout.start',
      'sport.start',
      'workout.progress',
      'workout.complete'
    ]);
    expect(reloaded.getProjection()).toMatchObject({ active: null, pendingSyncCount: 0 });
  });

  it.each(['completion', 'abandonment'] as const)(
    'does not let a stale writer resurrect an activity after %s',
    (terminalAction) => {
      const storage = createMemoryActivitySyncStorage();
      const { remote } = createRemote();
      const staleWriter = createActivitySync({
        userId: 'user-1', storage, remote,
        writerId: 'stale-tab',
        createId: createIds('workout-1', 'start'), now: () => 10
      });
      staleWriter.startWorkout(routine);
      const terminalWriter = createActivitySync({
        userId: 'user-1', storage, remote,
        writerId: 'terminal-tab',
        createId: createIds('terminal'), now: () => 20
      });

      if (terminalAction === 'completion') {
        terminalWriter.completeWorkout('workout-1', {
          exercises: logs,
          completedAtMs: 20,
          totalDuration: 1
        });
      } else {
        terminalWriter.abandon('workout-1');
      }

      const reloaded = createActivitySync({
        userId: 'user-1', storage, remote,
        writerId: 'reloaded-tab', createId: createIds('unused'), now: () => 30
      });
      expect(reloaded.getProjection().active).toBeNull();
    }
  );

  it('blocks sport completion behind a permanently failed archery end until explicit retry', async () => {
    const storage = createMemoryActivitySyncStorage();
    let failEnd = true;
    const calls: ActivitySyncCommand[] = [];
    const remote: ActivitySyncRemote = {
      execute: vi.fn(async (command) => {
        calls.push(command);
        if (command.kind === 'archery.addEnd' && failEnd) {
          throw new WireDecodeError('add archery end response.end');
        }
        return resultFor(command);
      })
    };
    const sync = createActivitySync({
      userId: 'user-1', storage, remote,
      createId: createIds(
        'archery-1', 'start',
        'round-1', 'add-round',
        'end-1', 'arrow-1', 'add-end',
        'complete'
      ),
      now: () => 10
    });
    const archery = sync.startArchery({ bowType: 'recurve', arrowsUsed: 6 });
    const round = sync.addArcheryRound(archery.id, 18, 40, 3);
    sync.addArcheryEnd(archery.id, round.id, [{ score: 10, isGold: true }]);
    sync.completeArchery(archery.id);

    await sync.syncPending();

    expect(calls.map((command) => command.kind)).toEqual([
      'sport.start',
      'archery.addRound',
      'archery.addEnd'
    ]);
    expect(sync.getProjection()).toMatchObject({
      pendingSyncCount: 2,
      failedSyncCount: 1
    });
    await sync.syncPending();
    expect(calls).toHaveLength(3);

    const reloaded = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'reloaded-tab', createId: createIds('unused'), now: () => 20
    });
    expect(reloaded.getProjection()).toMatchObject({ pendingSyncCount: 2, failedSyncCount: 1 });

    failEnd = false;
    reloaded.retryFailed();
    await reloaded.syncPending();
    expect(reloaded.getProjection().failedSyncCount).toBe(0);
    expect(calls.map((command) => command.kind)).toEqual([
      'sport.start',
      'archery.addRound',
      'archery.addEnd',
      'archery.addEnd',
      'sport.complete'
    ]);
  });

  it('silently clears obsolete active-activity conflict responses', async () => {
    const storage = createMemoryActivitySyncStorage();
    const conflicts = true;
    const calls: ActivitySyncCommand[] = [];
    const remote: ActivitySyncRemote = {
      execute: vi.fn(async (command) => {
        calls.push(command);
        if (conflicts) {
          throw new ApiError('active_activity_exists', {
            status: 409,
            code: 'active_activity_exists',
            details: { error: 'active_activity_exists' }
          });
        }
        return resultFor(command);
      })
    };
    const sync = createActivitySync({
      userId: 'user-1', storage, remote,
      createId: createIds('hiit-1', 'start'), now: () => 10
    });
    sync.startHiit(hiitConfig);

    await sync.syncPending();

    expect(sync.getProjection()).toMatchObject({
      active: null,
      pendingSyncCount: 0,
      failedSyncCount: 0,
      syncFailureAction: null,
      syncError: null
    });
    expect(sync.getPendingCommands()).toEqual([]);
    await sync.syncPending();
    expect(calls).toHaveLength(1);

    const reloaded = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'reloaded-tab', createId: createIds('unused'), now: () => 20
    });
    expect(reloaded.getProjection()).toMatchObject({
      failedSyncCount: 0,
      syncFailureAction: null,
      syncError: null
    });
    expect(reloaded.getProjection()).toMatchObject({ active: null, pendingSyncCount: 0, failedSyncCount: 0 });
  });

  it('captures sport completion time at the user event', () => {
    let nowMs = 1_000;
    const storage = createMemoryActivitySyncStorage();
    const { remote } = createRemote();
    const sync = createActivitySync({
      userId: 'user-1', storage, remote,
      createId: createIds('hiit-1', 'start', 'complete'), now: () => nowMs
    });
    const activity = sync.startHiit(hiitConfig);
    nowMs = 9_000;

    sync.completeHiit(activity.id);

    expect(sync.getPendingCommands()[1]).toMatchObject({
      kind: 'sport.complete',
      completedAtMs: 9_000
    });
  });

  it('synchronizes workout progress before its terminal completion command', async () => {
    const storage = createMemoryActivitySyncStorage();
    const { commands, remote } = createRemote();
    const sync = createActivitySync({
      userId: 'user-1',
      storage,
      remote,
      createId: createIds('workout-1', 'start', 'progress', 'complete'),
      now: () => 60_000
    });
    const workout = sync.startWorkout(routine);
    sync.updateWorkoutProgress(workout.id, logs);
    sync.completeWorkout(workout.id, {
      exercises: logs,
      completedAtMs: 120_000,
      totalDuration: 1
    });

    expect(sync.getProjection().active).toBeNull();
    expect(sync.getProjection().pendingSyncCount).toBe(3);

    await sync.syncPending();

    expect(commands.map((command) => command.kind)).toEqual([
      'workout.start',
      'workout.progress',
      'workout.complete'
    ]);
  });

  it('keeps offline archery rounds and ends ordered ahead of completion across reload', async () => {
    const storage = createMemoryActivitySyncStorage();
    const offline: ActivitySyncRemote = { execute: vi.fn().mockRejectedValue(new Error('offline')) };
    const first = createActivitySync({
      userId: 'user-1',
      storage,
      remote: offline,
      createId: createIds(
        'archery-1', 'start',
        'round-1', 'add-round',
        'end-1', 'arrow-1', 'add-end',
        'complete'
      ),
      now: () => 10
    });
    const archery = first.startArchery({ bowType: 'recurve', arrowsUsed: 6 });
    const round = first.addArcheryRound(archery.id, 18, 40, 3);
    first.addArcheryEnd(archery.id, round.id, [{ score: 10, isGold: true }]);
    first.completeArchery(archery.id, 'offline completion');

    const { commands, remote } = createRemote();
    const reload = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('unused'), now: () => 20
    });
    expect(reload.getProjection()).toMatchObject({ active: null, pendingSyncCount: 4 });

    await reload.syncPending();

    expect(commands.map((command) => command.kind)).toEqual([
      'sport.start',
      'archery.addRound',
      'archery.addEnd',
      'sport.complete'
    ]);
  });

  it('keeps an offline HIIT timer update and completion tied to the same session across reload', async () => {
    const storage = createMemoryActivitySyncStorage();
    const offline: ActivitySyncRemote = { execute: vi.fn().mockRejectedValue(new Error('offline')) };
    const first = createActivitySync({
      userId: 'user-1', storage, remote: offline,
      createId: createIds('hiit-1', 'start', 'complete'), now: () => 1_000
    });
    const hiit = first.startHiit(hiitConfig);
    first.saveHiitTimerState(hiit.id, {
      config: hiitConfig,
      state: { phase: 'work', currentInterval: 2, secondsRemaining: 12, totalElapsed: 63 },
      startedAtMs: 1_000,
      lastTickAtMs: 64_000,
      pausedAtMs: null
    });
    first.completeHiit(hiit.id);

    const { commands, remote } = createRemote();
    const reload = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('unused'), now: () => 70_000
    });
    expect(reload.getProjection()).toMatchObject({ active: null, pendingSyncCount: 2 });

    await reload.syncPending();
    expect(commands.map((command) => command.kind)).toEqual(['sport.start', 'sport.complete']);
  });

  it.each(['workout', 'archery', 'hiit'] as const)(
    'persists an offline %s abandonment after clearing the active projection',
    async (kind) => {
      const storage = createMemoryActivitySyncStorage();
      const { commands, remote } = createRemote();
      const sync = createActivitySync({
        userId: 'user-1',
        storage,
        remote,
        createId: createIds('activity-1', 'start', 'abandon'),
        now: () => 10
      });
      const activity = kind === 'workout'
        ? sync.startWorkout(routine)
        : kind === 'archery'
          ? sync.startArchery({ bowType: 'compound', arrowsUsed: 6 })
          : sync.startHiit(hiitConfig);

      sync.abandon(activity.id);
      expect(sync.getProjection().active).toBeNull();
      expect(sync.getProjection().pendingSyncCount).toBe(2);

      await sync.syncPending();
      expect(commands[commands.length - 1]?.kind).toBe(kind === 'workout' ? 'workout.abandon' : 'sport.abandon');
    }
  );

  it('restores HIIT timer state only for its matching active session', () => {
    const storage = createMemoryActivitySyncStorage();
    const { remote } = createRemote();
    const first = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('hiit-1', 'start-1'), now: () => 1_000
    });
    const hiit = first.startHiit(hiitConfig);
    first.saveHiitTimerState(hiit.id, {
      config: hiitConfig,
      state: { phase: 'work', currentInterval: 2, secondsRemaining: 17, totalElapsed: 58 },
      startedAtMs: 1_000,
      lastTickAtMs: 59_000,
      pausedAtMs: null
    });

    const reload = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('unused'), now: () => 60_000
    });
    expect(reload.getHiitTimerState(hiit.id)?.state.secondsRemaining).toBe(17);
    expect(reload.getHiitTimerState('another-session')).toBeNull();

    reload.startWorkout(routine);
    expect(reload.getHiitTimerState(hiit.id)).toBeNull();
  });

  it('invalidates dashboard and sports projections after successful synchronization', async () => {
    const storage = createMemoryActivitySyncStorage();
    const { remote } = createRemote();
    const invalidate = vi.fn();
    const sync = createActivitySync({
      userId: 'user-1', storage, remote, invalidate, createId: createIds('hiit-1', 'start'), now: () => 10
    });
    sync.startHiit(hiitConfig);

    await sync.syncPending();

    expect(invalidate).toHaveBeenCalledWith('user-1', ['dashboard', 'sports']);
  });

  it('migrates an owned legacy workout but never restores or deletes another user legacy snapshot', () => {
    const ownedStorage = createMemoryActivitySyncStorage({
      activeWorkout: JSON.stringify({
        routine,
        session: {
          id: 'legacy-workout',
          routineId: routine.id,
          routineName: routine.name,
          userId: 'user-1',
          startedAt: '2026-09-15T10:00:00.000Z',
          exercises: []
        },
        timestamp: 1_800_000_000_000
      })
    });
    const { remote } = createRemote();
    const owned = createActivitySync({
      userId: 'user-1', storage: ownedStorage, remote,
      createId: createIds('unused'), now: () => 1_800_000_001_000
    });
    expect(owned.getProjection().active?.id).toBe('legacy-workout');
    expect(ownedStorage.getItem('activeWorkout')).toBeNull();

    const foreignRaw = JSON.stringify({
      routine,
      session: { id: 'foreign', userId: 'user-2', startedAt: 1_800_000_000_000 },
      timestamp: 1_800_000_000_000
    });
    const foreignStorage = createMemoryActivitySyncStorage({ activeWorkout: foreignRaw });
    const foreign = createActivitySync({
      userId: 'user-1', storage: foreignStorage, remote,
      createId: createIds('unused'), now: () => 1_800_000_001_000
    });
    expect(foreign.getProjection().active).toBeNull();
    expect(foreignStorage.getItem('activeWorkout')).toBe(foreignRaw);
  });

  it('reads shipped v1 activity-sync records with a single active projection', () => {
    const sourceStorage = createMemoryActivitySyncStorage();
    const { remote } = createRemote();
    const original = createActivitySync({
      userId: 'user-1', storage: sourceStorage, remote,
      writerId: 'old-tab', createId: createIds('workout-1', 'start'), now: () => 10
    });
    original.startWorkout(routine);
    const storageKey = Array.from({ length: sourceStorage.length ?? 0 }, (_, index) => sourceStorage.key?.(index))
      .find((key): key is string => Boolean(key?.includes(':writer:old-tab')));
    expect(storageKey).toBeDefined();
    const legacyState = JSON.parse(sourceStorage.getItem(storageKey!) ?? '{}') as Record<string, unknown>;
    delete legacyState.candidateProjection;
    delete legacyState.activeCandidates;
    delete legacyState.removedActivityIds;
    const storage = createMemoryActivitySyncStorage({ [storageKey!]: JSON.stringify(legacyState) });

    const reloaded = createActivitySync({
      userId: 'user-1', storage, remote,
      writerId: 'new-tab', createId: createIds('unused'), now: () => 20
    });

    expect(reloaded.getProjection().active).toMatchObject({ id: 'workout-1', kind: 'workout' });
    expect(reloaded.getPendingCommands()).toEqual([
      expect.objectContaining({ commandId: 'start', activityId: 'workout-1' })
    ]);
  });

  it('discards an expired legacy snapshot only after confirming its owner', () => {
    const raw = JSON.stringify({
      routine,
      session: { id: 'stale', userId: 'user-1', startedAt: 1 },
      timestamp: 1
    });
    const storage = createMemoryActivitySyncStorage({ activeWorkout: raw });
    const { remote } = createRemote();
    const sync = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('unused'), now: () => 100_000_000
    });

    expect(sync.getProjection().active).toBeNull();
    expect(storage.getItem('activeWorkout')).toBeNull();
  });

  it('migrates owned legacy archery operations without exposing a terminal session', () => {
    const legacySession: SportSession = {
      id: 'legacy-archery',
      userId: 'user-1',
      sportType: 'archery',
      sportName: 'Tiro con Arco',
      startedAt: new Date(1_800_000_000_000),
      status: 'active',
      archeryData: {
        bowType: 'recurve',
        arrowsUsed: 6,
        rounds: [{
          id: 'round-1',
          sessionId: 'legacy-archery',
          distance: 18,
          targetSize: 40,
          arrowsPerEnd: 3,
          order: 1,
          totalScore: 0,
          createdAt: new Date(1_800_000_000_000),
          ends: []
        }],
        totalScore: 0,
        maxPossibleScore: 0,
        averageArrow: 0
      }
    };
    const storage = createMemoryActivitySyncStorage({
      activeArcherySession: JSON.stringify({
        session: legacySession,
        timestamp: 1_800_000_000_000,
        pendingOps: [
          {
            id: 'pending-end',
            type: 'addEnd',
            localEndId: 'end-1',
            localRoundId: 'round-1',
            arrows: [{ score: 10, isGold: true }]
          },
          { id: 'pending-complete', type: 'completeSession', notes: 'done' }
        ]
      })
    });
    const { remote } = createRemote();
    const sync = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('unused'), now: () => 1_800_000_001_000
    });

    expect(sync.getProjection()).toMatchObject({ active: null, pendingSyncCount: 2 });
    expect(sync.getPendingCommands().map((command) => command.kind)).toEqual([
      'archery.addEnd',
      'sport.complete'
    ]);
    expect(storage.getItem('activeArcherySession')).toBeNull();
  });

  it('preserves legacy archery operation array order when command ids sort differently', async () => {
    const legacySession: SportSession = {
      id: 'legacy-archery',
      userId: 'user-1',
      sportType: 'archery',
      sportName: 'Tiro con Arco',
      startedAt: new Date(1_800_000_000_000),
      status: 'active',
      archeryData: {
        bowType: 'recurve', arrowsUsed: 3, rounds: [], totalScore: 0,
        maxPossibleScore: 0, averageArrow: 0
      }
    };
    const storage = createMemoryActivitySyncStorage({
      activeArcherySession: JSON.stringify({
        session: legacySession,
        timestamp: 1_800_000_000_000,
        pendingOps: [
          {
            id: 'z-add-round', type: 'addRound', localRoundId: 'round-1',
            distance: 18, targetSize: 40, arrowsPerEnd: 1
          },
          {
            id: 'm-add-end', type: 'addEnd', localRoundId: 'round-1', localEndId: 'end-1',
            arrows: [{ score: 10, isGold: true }]
          },
          { id: 'a-complete', type: 'completeSession' }
        ]
      })
    });
    const { commands, remote } = createRemote();
    const sync = createActivitySync({
      userId: 'user-1', storage, remote, createId: createIds('unused'), now: () => 1_800_000_001_000
    });

    await sync.syncPending();

    expect(commands.map((command) => command.commandId)).toEqual([
      'z-add-round',
      'm-add-end',
      'a-complete'
    ]);
  });
});
