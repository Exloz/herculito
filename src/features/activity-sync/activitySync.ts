import type {
  ArcheryBowType,
  ArcheryEnd,
  ArcheryRound,
  ExerciseLog,
  HiitConfig,
  HiitState,
  Routine,
  SportSession,
  SportType,
  WorkoutSession
} from '../../shared/types';
import { isApiError } from '../../shared/api/apiClient';
import { WireDecodeError } from '../../shared/api/wire';

const STORAGE_VERSION = 1;
const STORAGE_KEY_PREFIX = `activity-sync:v${STORAGE_VERSION}:`;
const LEGACY_ACTIVE_WORKOUT_KEY = 'activeWorkout';
const LEGACY_ACTIVE_ARCHERY_KEY = 'activeArcherySession';
const LEGACY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ActivitySyncStorage {
  readonly length?: number;
  key?(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface ActivityCommandBase {
  commandId: string;
  activityId: string;
  userId: string;
  createdAtMs: number;
  activityRevision: number;
}

export type ActivitySyncCommand =
  | (ActivityCommandBase & {
      kind: 'workout.start';
      routineId: string;
      routineName: string;
      primaryMuscleGroup?: Routine['primaryMuscleGroup'];
      startedAtMs: number;
    })
  | (ActivityCommandBase & {
      kind: 'workout.progress';
      exercises: ExerciseLog[];
    })
  | (ActivityCommandBase & {
      kind: 'workout.complete';
      exercises: ExerciseLog[];
      completedAtMs: number;
      totalDuration: number;
      repsBySetUpdates?: Record<string, number[]>;
    })
  | (ActivityCommandBase & { kind: 'workout.abandon' })
  | (ActivityCommandBase & {
      kind: 'sport.start';
      sportType: SportType;
      startedAtMs: number;
      archeryConfig?: { bowType: ArcheryBowType; arrowsUsed: number };
      hiitConfig?: HiitConfig;
      location?: string;
      notes?: string;
    })
  | (ActivityCommandBase & {
      kind: 'archery.addRound';
      roundId: string;
      distance: number;
      targetSize: number;
      arrowsPerEnd: number;
    })
  | (ActivityCommandBase & {
      kind: 'archery.addEnd';
      roundId: string;
      endId: string;
      arrows: { score: number; isGold: boolean }[];
    })
  | (ActivityCommandBase & { kind: 'sport.complete'; completedAtMs: number; notes?: string })
  | (ActivityCommandBase & { kind: 'sport.abandon' });

export interface ActivitySyncRemoteResult {
  workoutSession?: WorkoutSession;
  sportSession?: SportSession;
  round?: ArcheryRound;
  end?: ArcheryEnd;
}

export interface ActivitySyncRemote {
  execute(command: ActivitySyncCommand): Promise<ActivitySyncRemoteResult>;
}

export interface ActivityHiitTimerState {
  config: HiitConfig;
  state: HiitState;
  startedAtMs: number;
  lastTickAtMs?: number;
  pausedAtMs: number | null;
}

interface ActivitySnapshotBase {
  id: string;
  userId: string;
  revision: number;
  startedAtMs: number;
}

export interface WorkoutActivitySnapshot extends ActivitySnapshotBase {
  kind: 'workout';
  routine: Routine;
  session: WorkoutSession;
}

export interface ArcheryActivitySnapshot extends ActivitySnapshotBase {
  kind: 'archery';
  session: SportSession;
}

export interface HiitActivitySnapshot extends ActivitySnapshotBase {
  kind: 'hiit';
  session: SportSession;
  config: HiitConfig;
  timerState?: ActivityHiitTimerState;
}

export type ActiveActivitySnapshot =
  | WorkoutActivitySnapshot
  | ArcheryActivitySnapshot
  | HiitActivitySnapshot;

export interface ActivityProjection {
  active: ActiveActivitySnapshot | null;
  pendingSyncCount: number;
  failedSyncCount: number;
  syncError: string | null;
  syncFailureAction: 'retry' | 'dismiss' | null;
  nextRetryAtMs: number | null;
}

interface FailedActivityCommand {
  command: ActivitySyncCommand;
  message: string;
  failedAtMs: number;
  code?: string;
  details?: unknown;
}

interface ActivityCommandFailureState {
  revision: number;
  writerId: string;
  failure: FailedActivityCommand | null;
}

interface ActivityRetryState {
  commandId: string;
  attemptCount: number;
  nextRetryAtMs: number;
  message: string;
}

interface ActiveActivityCandidateState {
  revision: number;
  writerId: string;
  orderAtMs: number;
  activity: ActiveActivitySnapshot;
}

interface PersistedUserState {
  version: number;
  userId: string;
  revision: number;
  writerId: string;
  active: ActiveActivitySnapshot | null;
  candidateProjection: boolean;
  activeCandidates: Record<string, ActiveActivityCandidateState>;
  removedActivityIds: string[];
  commands: ActivitySyncCommand[];
  removedCommandIds: string[];
  failedCommands: FailedActivityCommand[];
  failureStates: Record<string, ActivityCommandFailureState>;
  retry: ActivityRetryState | null;
}

interface ActivitySyncOptions {
  userId: string;
  storage: ActivitySyncStorage;
  remote: ActivitySyncRemote;
  createId?: () => string;
  writerId?: string;
  now?: () => number;
  invalidate?: (userId: string, projections: Array<'dashboard' | 'sports'>) => void;
  onChange?: () => void;
}

export interface WorkoutCompletionInput {
  exercises: ExerciseLog[];
  completedAtMs: number;
  totalDuration: number;
  repsBySetUpdates?: Record<string, number[]>;
}

export interface ActivitySync {
  getProjection(): ActivityProjection;
  getPendingCommands(): ActivitySyncCommand[];
  startWorkout(routine: Routine): WorkoutActivitySnapshot;
  updateWorkoutProgress(activityId: string, exercises: ExerciseLog[]): void;
  completeWorkout(activityId: string, input: WorkoutCompletionInput): void;
  startArchery(config: { bowType: ArcheryBowType; arrowsUsed: number; location?: string; notes?: string }): ArcheryActivitySnapshot;
  addArcheryRound(activityId: string, distance: number, targetSize: number, arrowsPerEnd?: number): ArcheryRound;
  addArcheryEnd(activityId: string, roundId: string, arrows: { score: number; isGold: boolean }[]): ArcheryEnd;
  updateArcheryNotes(activityId: string, notes: string): void;
  completeArchery(activityId: string, notes?: string): void;
  startHiit(config: HiitConfig): HiitActivitySnapshot;
  completeHiit(activityId: string): void;
  abandon(activityId: string): void;
  saveHiitTimerState(activityId: string, timerState: ActivityHiitTimerState): void;
  getHiitTimerState(activityId: string): ActivityHiitTimerState | null;
  clearHiitTimerState(activityId: string): void;
  reload(): void;
  retryFailed(commandId?: string): void;
  dismissFailed(commandId?: string): void;
  syncPending(): Promise<void>;
}

export class ActiveActivityConflictError extends Error {
  readonly active: ActiveActivitySnapshot;

  constructor(active: ActiveActivitySnapshot) {
    super('Ya hay una actividad en curso. Complétala o cancélala antes de iniciar otra.');
    this.name = 'ActiveActivityConflictError';
    this.active = active;
  }
}

const MAX_AUTO_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

const defaultCreateId = (): string => (
  globalThis.crypto?.randomUUID?.()
  ?? `activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const PROCESS_WRITER_ID = defaultCreateId();

const reviveDate = (value: unknown, fallbackMs: number): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const date = new Date(value < 1e12 ? value * 1000 : value);
    if (Number.isFinite(date.getTime())) return date;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date(fallbackMs);
};

const reviveExerciseLogs = (logs: ExerciseLog[]): ExerciseLog[] => logs.map((log) => ({
  ...log,
  sets: (log.sets ?? []).map((set) => ({
    ...set,
    completedAt: set.completedAt ? reviveDate(set.completedAt, 0) : undefined
  }))
}));

const reviveWorkoutSession = (session: WorkoutSession, fallbackMs: number): WorkoutSession => ({
  ...session,
  startedAt: reviveDate(session.startedAt, fallbackMs),
  completedAt: session.completedAt ? reviveDate(session.completedAt, fallbackMs) : undefined,
  exercises: reviveExerciseLogs(session.exercises ?? [])
});

const reviveSportSession = (session: SportSession, fallbackMs: number): SportSession => ({
  ...session,
  startedAt: reviveDate(session.startedAt, fallbackMs),
  completedAt: session.completedAt ? reviveDate(session.completedAt, fallbackMs) : undefined,
  archeryData: session.archeryData ? {
    ...session.archeryData,
    rounds: session.archeryData.rounds.map((round) => ({
      ...round,
      createdAt: reviveDate(round.createdAt, fallbackMs),
      ends: round.ends.map((end) => ({
        ...end,
        createdAt: reviveDate(end.createdAt, fallbackMs),
        arrows: end.arrows.map((arrow) => ({
          ...arrow,
          timestamp: reviveDate(arrow.timestamp, fallbackMs)
        }))
      }))
    }))
  } : undefined
});

const reviveRoutine = (routine: Routine): Routine => ({
  ...routine,
  createdAt: reviveDate(routine.createdAt, 0),
  updatedAt: reviveDate(routine.updatedAt, 0)
});

const reviveActive = (active: ActiveActivitySnapshot): ActiveActivitySnapshot => {
  if (active.kind === 'workout') {
    return {
      ...active,
      routine: reviveRoutine(active.routine),
      session: reviveWorkoutSession(active.session, active.startedAtMs)
    };
  }
  return {
    ...active,
    session: reviveSportSession(active.session, active.startedAtMs)
  };
};

const recalculateArcherySession = (session: SportSession): SportSession => {
  if (!session.archeryData) return session;
  const rounds = session.archeryData.rounds.map((round) => ({
    ...round,
    totalScore: round.ends.reduce((total, end) => total + end.subtotal, 0)
  }));
  const arrows = rounds.flatMap((round) => round.ends).flatMap((end) => end.arrows);
  const totalScore = rounds.reduce((total, round) => total + round.totalScore, 0);
  return {
    ...session,
    archeryData: {
      ...session.archeryData,
      rounds,
      totalScore,
      maxPossibleScore: arrows.length * 10,
      averageArrow: arrows.length > 0 ? Math.round((totalScore / arrows.length) * 100) / 100 : 0,
      goldCount: arrows.filter((arrow) => arrow.isGold).length
    }
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

const parseStoredState = (raw: string | null, userId: string): PersistedUserState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedUserState;
    if (parsed.version !== STORAGE_VERSION || parsed.userId !== userId || !Array.isArray(parsed.commands)) {
      return null;
    }
    const activeBelongsToUser = !parsed.active
      || (parsed.active.userId === userId && parsed.active.session.userId === userId);
    const writerId = typeof parsed.writerId === 'string' ? parsed.writerId : 'legacy';
    const candidateProjection = parsed.candidateProjection === true
      && isRecord(parsed.activeCandidates)
      && Array.isArray(parsed.removedActivityIds);
    const activeCandidates = candidateProjection
      ? Object.fromEntries(Object.entries(parsed.activeCandidates).flatMap(([activityId, value]) => {
          if (!isRecord(value)
            || !Number.isInteger(value.revision)
            || typeof value.writerId !== 'string'
            || typeof value.orderAtMs !== 'number'
            || !isRecord(value.activity)
            || value.activity.id !== activityId
            || value.activity.userId !== userId
            || !isRecord(value.activity.session)
            || value.activity.session.userId !== userId) {
            return [];
          }
          return [[activityId, {
            revision: value.revision,
            writerId: value.writerId,
            orderAtMs: value.orderAtMs,
            activity: reviveActive(value.activity as unknown as ActiveActivitySnapshot)
          } satisfies ActiveActivityCandidateState]];
        }))
      : {};
    if (parsed.active && activeBelongsToUser && !activeCandidates[parsed.active.id]) {
      activeCandidates[parsed.active.id] = {
        revision: 0,
        writerId,
        orderAtMs: parsed.active.startedAtMs,
        activity: reviveActive(parsed.active)
      };
    }
    const legacyFailures = Array.isArray(parsed.failedCommands)
      ? parsed.failedCommands.filter((failure) => failure.command?.userId === userId)
      : [];
    const parsedFailureStates = isRecord(parsed.failureStates)
      ? Object.fromEntries(Object.entries(parsed.failureStates).filter(([, value]) => (
          isRecord(value)
          && Number.isInteger(value.revision)
          && typeof value.writerId === 'string'
        ))) as Record<string, ActivityCommandFailureState>
      : {};
    legacyFailures.forEach((failure) => {
      if (!parsedFailureStates[failure.command.commandId]) {
        parsedFailureStates[failure.command.commandId] = {
          revision: 0,
          writerId,
          failure
        };
      }
    });
    const failureStates = Object.fromEntries(Object.entries(parsedFailureStates).filter(([, value]) => (
      value.failure === null || value.failure?.command?.userId === userId
    )));
    return {
      ...parsed,
      revision: Number.isInteger(parsed.revision) ? parsed.revision : 0,
      writerId,
      active: parsed.active && activeBelongsToUser ? reviveActive(parsed.active) : null,
      candidateProjection,
      activeCandidates,
      removedActivityIds: candidateProjection
        ? parsed.removedActivityIds.filter((id): id is string => typeof id === 'string')
        : [],
      commands: parsed.commands.filter((command) => command.userId === userId),
      removedCommandIds: Array.isArray(parsed.removedCommandIds)
        ? parsed.removedCommandIds.filter((id): id is string => typeof id === 'string')
        : [],
      failedCommands: Object.values(failureStates)
        .map((failureState) => failureState.failure)
        .filter((failure): failure is FailedActivityCommand => failure !== null),
      failureStates,
      retry: parsed.retry && typeof parsed.retry.commandId === 'string' ? parsed.retry : null
    };
  } catch {
    return null;
  }
};

const createEmptyState = (userId: string, writerId: string): PersistedUserState => ({
  version: STORAGE_VERSION,
  userId,
  revision: 0,
  writerId,
  active: null,
  candidateProjection: false,
  activeCandidates: {},
  removedActivityIds: [],
  commands: [],
  removedCommandIds: [],
  failedCommands: [],
  failureStates: {},
  retry: null
});

const compareStateVersion = (left: PersistedUserState, right: PersistedUserState): number => (
  left.revision - right.revision || left.writerId.localeCompare(right.writerId)
);

const compareFailureVersion = (
  left: ActivityCommandFailureState,
  right: ActivityCommandFailureState
): number => left.revision - right.revision || left.writerId.localeCompare(right.writerId);

const compareCandidateVersion = (
  left: ActiveActivityCandidateState,
  right: ActiveActivityCandidateState
): number => left.revision - right.revision || left.writerId.localeCompare(right.writerId);

const deriveActive = (
  candidates: Record<string, ActiveActivityCandidateState>
): ActiveActivitySnapshot | null => (
  Object.values(candidates)
    .sort((left, right) => (
      left.orderAtMs - right.orderAtMs
      || left.activity.startedAtMs - right.activity.startedAtMs
      || left.activity.id.localeCompare(right.activity.id)
    ))[0]?.activity ?? null
);

const mergeStates = (
  current: PersistedUserState,
  stored: PersistedUserState
): PersistedUserState => {
  // Commands, activity candidates, and their tombstones are monotonic across
  // writer records. Legacy single-active records retain their old winner rule.
  const latest = compareStateVersion(stored, current) >= 0 ? stored : current;
  const commands = new Map(current.commands.map((command) => [command.commandId, command]));
  stored.commands.forEach((command) => commands.set(command.commandId, command));
  const removedCommandIds = new Set([...current.removedCommandIds, ...stored.removedCommandIds]);
  const removedActivityIds = new Set([...current.removedActivityIds, ...stored.removedActivityIds]);
  const activeCandidates: Record<string, ActiveActivityCandidateState> = {};
  if (!current.candidateProjection && !stored.candidateProjection) {
    if (latest.active) {
      activeCandidates[latest.active.id] = latest.activeCandidates[latest.active.id];
    }
  } else {
    Object.entries(current.activeCandidates).forEach(([activityId, candidate]) => {
      activeCandidates[activityId] = candidate;
    });
    Object.entries(stored.activeCandidates).forEach(([activityId, candidate]) => {
      const existing = activeCandidates[activityId];
      if (!existing || compareCandidateVersion(candidate, existing) >= 0) {
        activeCandidates[activityId] = candidate;
      }
    });
  }
  removedActivityIds.forEach((activityId) => {
    delete activeCandidates[activityId];
  });
  const failureStates = { ...current.failureStates };
  Object.entries(stored.failureStates).forEach(([commandId, failureState]) => {
    const existing = failureStates[commandId];
    if (!existing || compareFailureVersion(failureState, existing) >= 0) {
      failureStates[commandId] = failureState;
    }
  });
  const mergedCommands = [...commands.values()]
    .filter((command) => !removedCommandIds.has(command.commandId))
    .sort((left, right) => (
      left.createdAtMs - right.createdAtMs
      || left.activityRevision - right.activityRevision
      || left.commandId.localeCompare(right.commandId)
    ));
  const failedCommands = Object.values(failureStates)
    .map((failureState) => failureState.failure)
    .filter((failure): failure is FailedActivityCommand => failure !== null);

  return {
    ...latest,
    active: deriveActive(activeCandidates),
    candidateProjection: current.candidateProjection || stored.candidateProjection,
    activeCandidates,
    removedActivityIds: [...removedActivityIds],
    commands: mergedCommands,
    removedCommandIds: [...removedCommandIds],
    failedCommands,
    failureStates
  };
};

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : 'Error de sincronización desconocido'
);

const ACTIVE_ACTIVITY_EXISTS_MESSAGE = 'Ya existe otra actividad activa en el servidor. Resuélvela y vuelve a intentar.';

const isActiveActivityStartConflict = (
  command: ActivitySyncCommand,
  error: unknown
): boolean => (
  (command.kind === 'workout.start' || command.kind === 'sport.start')
  && isApiError(error)
  && error.code === 'active_activity_exists'
);

const isRetryableSyncError = (error: unknown): boolean => {
  if (error instanceof WireDecodeError) return false;
  if (isApiError(error)) {
    return error.status === 0
      || error.status === 408
      || error.status === 425
      || error.status === 429
      || error.status >= 500;
  }
  return true;
};

const buildLegacyWorkout = (
  raw: string,
  userId: string,
  nowMs: number,
  storage: ActivitySyncStorage
): WorkoutActivitySnapshot | null => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sessionValue = parsed.session;
    if (!isRecord(sessionValue) || sessionValue.userId !== userId) return null;
    const timestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : 0;
    if (nowMs - timestamp > LEGACY_MAX_AGE_MS) {
      storage.removeItem(LEGACY_ACTIVE_WORKOUT_KEY);
      return null;
    }
    if (!isRecord(parsed.routine) || typeof sessionValue.id !== 'string') {
      storage.removeItem(LEGACY_ACTIVE_WORKOUT_KEY);
      return null;
    }
    const session = reviveWorkoutSession(sessionValue as unknown as WorkoutSession, timestamp);
    const progressKey = `activeWorkoutProgress_${session.id}`;
    const progressRaw = storage.getItem(progressKey);
    if (progressRaw) {
      try {
        const progress = JSON.parse(progressRaw) as { exerciseLogs?: ExerciseLog[]; timestamp?: number };
        if (Array.isArray(progress.exerciseLogs)
          && typeof progress.timestamp === 'number'
          && nowMs - progress.timestamp <= LEGACY_MAX_AGE_MS) {
          session.exercises = reviveExerciseLogs(progress.exerciseLogs);
        }
        storage.removeItem(progressKey);
      } catch {
        storage.removeItem(progressKey);
      }
    }
    storage.removeItem(LEGACY_ACTIVE_WORKOUT_KEY);
    return {
      kind: 'workout',
      id: session.id,
      userId,
      revision: 0,
      startedAtMs: session.startedAt.getTime(),
      routine: reviveRoutine(parsed.routine as unknown as Routine),
      session
    };
  } catch {
    return null;
  }
};

const buildLegacyArchery = (
  raw: string,
  userId: string,
  nowMs: number,
  storage: ActivitySyncStorage,
  createId: () => string
): { active: ArcheryActivitySnapshot | null; commands: ActivitySyncCommand[] } | null => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sessionValue = parsed.session;
    if (!isRecord(sessionValue) || sessionValue.userId !== userId) return null;
    const timestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : 0;
    if (nowMs - timestamp > LEGACY_MAX_AGE_MS || sessionValue.status !== 'active') {
      storage.removeItem(LEGACY_ACTIVE_ARCHERY_KEY);
      return null;
    }
    if (typeof sessionValue.id !== 'string') {
      storage.removeItem(LEGACY_ACTIVE_ARCHERY_KEY);
      return null;
    }
    const session = reviveSportSession(sessionValue as unknown as SportSession, timestamp);
    const activity: ArcheryActivitySnapshot = {
      kind: 'archery',
      id: session.id,
      userId,
      revision: 0,
      startedAtMs: session.startedAt.getTime(),
      session
    };
    const commands: ActivitySyncCommand[] = [];
    let hasTerminalCommand = false;
    if (Array.isArray(parsed.pendingOps)) {
      parsed.pendingOps.forEach((operationValue, operationIndex) => {
        if (!isRecord(operationValue) || typeof operationValue.type !== 'string') return;
        const base: ActivityCommandBase = {
          commandId: typeof operationValue.id === 'string' ? operationValue.id : createId(),
          activityId: session.id,
          userId,
          createdAtMs: timestamp + operationIndex,
          activityRevision: -1
        };
        if (operationValue.type === 'addRound'
          && typeof operationValue.localRoundId === 'string'
          && typeof operationValue.distance === 'number'
          && typeof operationValue.targetSize === 'number'
          && typeof operationValue.arrowsPerEnd === 'number') {
          commands.push({
            ...base,
            kind: 'archery.addRound',
            roundId: operationValue.localRoundId,
            distance: operationValue.distance,
            targetSize: operationValue.targetSize,
            arrowsPerEnd: operationValue.arrowsPerEnd
          });
        }
        if (operationValue.type === 'addEnd'
          && typeof operationValue.localRoundId === 'string'
          && typeof operationValue.localEndId === 'string'
          && Array.isArray(operationValue.arrows)) {
          const arrows = operationValue.arrows.filter((arrow): arrow is { score: number; isGold: boolean } => (
            isRecord(arrow) && typeof arrow.score === 'number' && typeof arrow.isGold === 'boolean'
          ));
          if (arrows.length === operationValue.arrows.length) {
            commands.push({
              ...base,
              kind: 'archery.addEnd',
              roundId: operationValue.localRoundId,
              endId: operationValue.localEndId,
              arrows
            });
          }
        }
        if (operationValue.type === 'completeSession') {
          commands.push({
            ...base,
            kind: 'sport.complete',
            completedAtMs: typeof operationValue.completedAt === 'number'
              ? operationValue.completedAt
              : timestamp,
            notes: typeof operationValue.notes === 'string' ? operationValue.notes : undefined
          });
          hasTerminalCommand = true;
        }
      });
    }
    storage.removeItem(LEGACY_ACTIVE_ARCHERY_KEY);
    return {
      active: hasTerminalCommand ? null : activity,
      commands
    };
  } catch {
    return null;
  }
};

export const createActivitySync = (options: ActivitySyncOptions): ActivitySync => {
  const {
    userId,
    storage,
    remote,
    createId = defaultCreateId,
    writerId = PROCESS_WRITER_ID,
    now = Date.now,
    invalidate = () => {},
    onChange = () => {}
  } = options;
  const storageKey = `${STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;
  const writerStoragePrefix = `${storageKey}:writer:`;
  const writerStorageKey = `${writerStoragePrefix}${encodeURIComponent(writerId)}`;

  const readStoredStates = (): PersistedUserState[] => {
    const states: PersistedUserState[] = [];
    const legacy = parseStoredState(storage.getItem(storageKey), userId);
    if (legacy) states.push(legacy);
    if (typeof storage.length === 'number' && storage.key) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key?.startsWith(writerStoragePrefix)) continue;
        const stored = parseStoredState(storage.getItem(key), userId);
        if (stored) states.push(stored);
      }
    } else {
      const own = parseStoredState(storage.getItem(writerStorageKey), userId);
      if (own) states.push(own);
    }
    return states;
  };

  const loadState = (): PersistedUserState => {
    const loaded = readStoredStates().reduce(
      (merged, stored) => mergeStates(merged, stored),
      createEmptyState(userId, writerId)
    );
    return { ...loaded, candidateProjection: true };
  };

  let state = loadState();
  let syncPromise: Promise<void> | null = null;

  const reload = (): void => {
    state = mergeStates(state, loadState());
  };

  const persist = (): void => {
    state.revision += 1;
    state.writerId = writerId;
    storage.setItem(writerStorageKey, JSON.stringify(state));
    onChange();
  };

  const setCommandFailure = (
    commandId: string,
    failure: FailedActivityCommand | null
  ): void => {
    const current = state.failureStates[commandId];
    state.failureStates[commandId] = {
      revision: (current?.revision ?? 0) + 1,
      writerId,
      failure
    };
    state.failedCommands = Object.values(state.failureStates)
      .map((failureState) => failureState.failure)
      .filter((candidate): candidate is FailedActivityCommand => candidate !== null);
  };

  const setActiveCandidate = (
    activity: ActiveActivitySnapshot,
    orderAtMs?: number
  ): void => {
    const current = state.activeCandidates[activity.id];
    state.activeCandidates[activity.id] = {
      revision: (current?.revision ?? -1) + 1,
      writerId,
      orderAtMs: orderAtMs ?? current?.orderAtMs ?? activity.startedAtMs,
      activity
    };
    state.active = deriveActive(state.activeCandidates);
  };

  const removeActiveCandidate = (activityId: string): void => {
    state.removedActivityIds = [...new Set([...state.removedActivityIds, activityId])];
    delete state.activeCandidates[activityId];
    state.active = deriveActive(state.activeCandidates);
  };

  if (!state.active) {
    const legacyWorkoutRaw = storage.getItem(LEGACY_ACTIVE_WORKOUT_KEY);
    const legacyArcheryRaw = storage.getItem(LEGACY_ACTIVE_ARCHERY_KEY);
    const legacyWorkout = legacyWorkoutRaw
      ? buildLegacyWorkout(legacyWorkoutRaw, userId, now(), storage)
      : null;
    if (legacyWorkout) setActiveCandidate(legacyWorkout, legacyWorkout.startedAtMs);
    if (!state.active && legacyArcheryRaw) {
      const legacyArchery = buildLegacyArchery(legacyArcheryRaw, userId, now(), storage, createId);
      if (legacyArchery) {
        if (legacyArchery.active) {
          setActiveCandidate(legacyArchery.active, legacyArchery.active.startedAtMs);
        }
        state.commands = legacyArchery.commands;
      }
    }
    if (state.active || state.commands.length > 0) persist();
  }

  const enqueue = (command: ActivitySyncCommand): void => {
    state.commands.push(command);
  };

  const commandBase = (activity: ActiveActivitySnapshot): ActivityCommandBase => ({
    commandId: createId(),
    activityId: activity.id,
    userId,
    createdAtMs: now(),
    activityRevision: activity.revision
  });

  const enqueueAbandon = (activity: ActiveActivitySnapshot): void => {
    enqueue({
      ...commandBase(activity),
      kind: activity.kind === 'workout' ? 'workout.abandon' : 'sport.abandon'
    });
  };

  const replaceActive = (next: ActiveActivitySnapshot, orderAtMs?: number): void => {
    if (state.active && state.active.id !== next.id) {
      throw new ActiveActivityConflictError(state.active);
    }
    setActiveCandidate(next, orderAtMs);
  };

  const requireActive = (activityId: string): ActiveActivitySnapshot => {
    if (!state.active || state.active.id !== activityId || state.active.userId !== userId) {
      throw new Error('Activity is not active');
    }
    return state.active;
  };

  const startWorkout = (workoutRoutine: Routine): WorkoutActivitySnapshot => {
    reload();
    if (state.active) throw new ActiveActivityConflictError(state.active);
    const id = createId();
    const startedAtMs = now();
    const session: WorkoutSession = {
      id,
      routineId: workoutRoutine.id,
      routineName: workoutRoutine.name,
      userId,
      startedAt: new Date(startedAtMs),
      exercises: [],
      primaryMuscleGroup: workoutRoutine.primaryMuscleGroup
    };
    const activity: WorkoutActivitySnapshot = {
      kind: 'workout', id, userId, revision: 0, startedAtMs, routine: workoutRoutine, session
    };
    const command: ActivitySyncCommand = {
      ...commandBase(activity),
      kind: 'workout.start',
      routineId: workoutRoutine.id,
      routineName: workoutRoutine.name,
      primaryMuscleGroup: workoutRoutine.primaryMuscleGroup,
      startedAtMs
    };
    replaceActive(activity, command.createdAtMs);
    enqueue(command);
    persist();
    return activity;
  };

  const startSport = (
    sportType: SportType,
    config: { archeryConfig?: { bowType: ArcheryBowType; arrowsUsed: number }; hiitConfig?: HiitConfig; location?: string; notes?: string }
  ): ArcheryActivitySnapshot | HiitActivitySnapshot => {
    reload();
    if (state.active) throw new ActiveActivityConflictError(state.active);
    const id = createId();
    const startedAtMs = now();
    const session: SportSession = {
      id,
      userId,
      sportType,
      sportName: sportType === 'archery' ? 'Tiro con Arco' : 'HIIT',
      startedAt: new Date(startedAtMs),
      status: 'active',
      location: config.location,
      notes: config.notes,
      ...(sportType === 'archery'
        ? {
            archeryData: {
              ...config.archeryConfig!,
              rounds: [], totalScore: 0, maxPossibleScore: 0, averageArrow: 0, goldCount: 0
            }
          }
        : {
            hiitData: {
              ...config.hiitConfig!,
              totalWorkTime: config.hiitConfig!.intervals * config.hiitConfig!.workDuration,
              totalRestTime: config.hiitConfig!.restEnabled
                ? Math.max(0, config.hiitConfig!.intervals - 1) * config.hiitConfig!.restDuration
                : 0
            }
          })
    };
    const activity = sportType === 'archery'
      ? { kind: 'archery' as const, id, userId, revision: 0, startedAtMs, session }
      : { kind: 'hiit' as const, id, userId, revision: 0, startedAtMs, session, config: config.hiitConfig! };
    const command: ActivitySyncCommand = {
      ...commandBase(activity),
      kind: 'sport.start',
      sportType,
      startedAtMs,
      ...config
    };
    replaceActive(activity, command.createdAtMs);
    enqueue(command);
    persist();
    return activity;
  };

  const applyRemoteResult = (command: ActivitySyncCommand, result: ActivitySyncRemoteResult): void => {
    const active = state.activeCandidates[command.activityId]?.activity;
    if (!active || active.id !== command.activityId) return;
    if (command.kind === 'workout.start'
      && active.kind === 'workout'
      && active.revision === command.activityRevision
      && result.workoutSession) {
      setActiveCandidate({ ...active, session: reviveWorkoutSession(result.workoutSession, active.startedAtMs) });
    }
    if (command.kind === 'sport.start'
      && active.kind !== 'workout'
      && active.revision === command.activityRevision
      && result.sportSession) {
      setActiveCandidate({ ...active, session: reviveSportSession(result.sportSession, active.startedAtMs) });
    }
    if (command.kind === 'workout.progress' && active.kind === 'workout') {
      setActiveCandidate({
        ...active,
        session: { ...active.session, exercises: reviveExerciseLogs(command.exercises) }
      });
    }
    if (command.kind === 'archery.addRound' && active.kind === 'archery' && result.round && active.session.archeryData) {
      const rounds = active.session.archeryData.rounds
        .filter((round) => round.id !== command.roundId)
        .concat(result.round)
        .sort((left, right) => (
          left.order - right.order
          || left.createdAt.getTime() - right.createdAt.getTime()
          || left.id.localeCompare(right.id)
        ));
      setActiveCandidate({
        ...active,
        session: recalculateArcherySession({
          ...active.session,
          archeryData: {
            ...active.session.archeryData,
            rounds
          }
        })
      });
    }
    if (command.kind === 'archery.addEnd' && active.kind === 'archery' && result.end && active.session.archeryData) {
      const rounds = active.session.archeryData.rounds.map((round) => {
        if (round.id !== command.roundId) return round;
        const ends = round.ends
          .filter((end) => end.id !== command.endId)
          .concat(result.end!)
          .sort((left, right) => (
            left.endNumber - right.endNumber
            || left.createdAt.getTime() - right.createdAt.getTime()
            || left.id.localeCompare(right.id)
          ));
        return { ...round, ends };
      });
      setActiveCandidate({
        ...active,
        session: recalculateArcherySession({
          ...active.session,
          archeryData: {
            ...active.session.archeryData,
            rounds
          }
        })
      });
    }
  };

  const syncPending = (): Promise<void> => {
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      let drainedAny = false;
      reload();
      if (state.retry && now() < state.retry.nextRetryAtMs) return;
      while (state.commands.length > 0) {
        const command = state.commands[0];
        if (state.failureStates[command.commandId]?.failure) break;
        try {
          const result = await remote.execute(command);
          reload();
          if (!state.commands.some((candidate) => candidate.commandId === command.commandId)) {
            continue;
          }
          applyRemoteResult(command, result);
          state.commands = state.commands.filter((candidate) => candidate.commandId !== command.commandId);
          state.removedCommandIds = [...new Set([...state.removedCommandIds, command.commandId])];
          setCommandFailure(command.commandId, null);
          state.retry = null;
          persist();
          drainedAny = true;
        } catch (error) {
          reload();
          if (!state.commands.some((candidate) => candidate.commandId === command.commandId)) {
            continue;
          }
          const activeActivityConflict = isActiveActivityStartConflict(command, error);
          const message = activeActivityConflict
            ? ACTIVE_ACTIVITY_EXISTS_MESSAGE
            : getErrorMessage(error);
          const previousAttempts = state.retry?.commandId === command.commandId
            ? state.retry.attemptCount
            : 0;
          const attemptCount = previousAttempts + 1;
          if (!isRetryableSyncError(error) || attemptCount >= MAX_AUTO_RETRIES) {
            setCommandFailure(command.commandId, {
              command,
              message,
              failedAtMs: now(),
              code: isApiError(error) ? error.code : undefined,
              details: isApiError(error) ? error.details : undefined
            });
            if (activeActivityConflict) {
              removeActiveCandidate(command.activityId);
              const rejectedCommandIds = state.commands
                .filter((candidate) => candidate.activityId === command.activityId)
                .map((candidate) => candidate.commandId);
              state.commands = state.commands.filter((candidate) => candidate.activityId !== command.activityId);
              state.removedCommandIds = [...new Set([...state.removedCommandIds, ...rejectedCommandIds])];
              state.retry = null;
              persist();
              continue;
            }
            state.retry = null;
            persist();
            break;
          }

          const retryDelayMs = Math.min(
            BASE_RETRY_DELAY_MS * (2 ** (attemptCount - 1)),
            MAX_RETRY_DELAY_MS
          );
          state.retry = {
            commandId: command.commandId,
            attemptCount,
            nextRetryAtMs: now() + retryDelayMs,
            message
          };
          persist();
          break;
        }
      }
      if (drainedAny) invalidate(userId, ['dashboard', 'sports']);
    })().finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  };

  return {
    getProjection: () => {
      const actionableFailure = state.failedCommands.find((failure) => (
        state.commands.some((command) => command.commandId === failure.command.commandId)
      ));
      const displayedFailure = actionableFailure ?? state.failedCommands[state.failedCommands.length - 1];
      return {
        active: state.active,
        pendingSyncCount: state.commands.length,
        failedSyncCount: state.failedCommands.length,
        syncError: displayedFailure?.message ?? state.retry?.message ?? null,
        syncFailureAction: displayedFailure
          ? actionableFailure ? 'retry' : 'dismiss'
          : null,
        nextRetryAtMs: state.retry?.nextRetryAtMs ?? null
      };
    },
    getPendingCommands: () => [...state.commands],
    startWorkout,
    updateWorkoutProgress: (activityId, exercises) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'workout') throw new Error('Active activity is not a workout');
      const next: WorkoutActivitySnapshot = {
        ...active,
        revision: active.revision + 1,
        session: { ...active.session, exercises }
      };
      setActiveCandidate(next);
      const superseded = state.commands.filter((command) => (
        command.kind === 'workout.progress' && command.activityId === activityId
      ));
      state.removedCommandIds = [
        ...new Set([...state.removedCommandIds, ...superseded.map((command) => command.commandId)])
      ];
      state.commands = state.commands.filter((command) => !superseded.includes(command));
      enqueue({ ...commandBase(next), kind: 'workout.progress', exercises });
      persist();
    },
    completeWorkout: (activityId, input) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'workout') throw new Error('Active activity is not a workout');
      const terminal = { ...active, revision: active.revision + 1 };
      enqueue({ ...commandBase(terminal), kind: 'workout.complete', ...input });
      removeActiveCandidate(activityId);
      persist();
    },
    startArchery: (config) => startSport('archery', {
      archeryConfig: { bowType: config.bowType, arrowsUsed: config.arrowsUsed },
      location: config.location,
      notes: config.notes
    }) as ArcheryActivitySnapshot,
    addArcheryRound: (activityId, distance, targetSize, arrowsPerEnd = 6) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'archery' || !active.session.archeryData) {
        throw new Error('Active activity is not archery');
      }
      const createdAtMs = now();
      const round: ArcheryRound = {
        id: createId(),
        sessionId: activityId,
        distance,
        targetSize,
        arrowsPerEnd,
        order: active.session.archeryData.rounds.length + 1,
        totalScore: 0,
        createdAt: new Date(createdAtMs),
        ends: []
      };
      const next: ArcheryActivitySnapshot = {
        ...active,
        revision: active.revision + 1,
        session: {
          ...active.session,
          archeryData: {
            ...active.session.archeryData,
            rounds: [...active.session.archeryData.rounds, round]
          }
        }
      };
      setActiveCandidate(next);
      enqueue({
        ...commandBase(next),
        kind: 'archery.addRound',
        roundId: round.id,
        distance,
        targetSize,
        arrowsPerEnd
      });
      persist();
      return round;
    },
    addArcheryEnd: (activityId, roundId, arrows) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'archery' || !active.session.archeryData) {
        throw new Error('Active activity is not archery');
      }
      const round = active.session.archeryData.rounds.find((candidate) => candidate.id === roundId);
      if (!round) throw new Error('Archery round not found');
      const createdAtMs = now();
      const end: ArcheryEnd = {
        id: createId(),
        roundId,
        endNumber: round.ends.length + 1,
        subtotal: arrows.reduce((total, arrow) => total + arrow.score, 0),
        goldCount: arrows.filter((arrow) => arrow.isGold).length,
        createdAt: new Date(createdAtMs),
        arrows: arrows.map((arrow) => ({
          id: createId(),
          ...arrow,
          timestamp: new Date(createdAtMs)
        }))
      };
      const next: ArcheryActivitySnapshot = {
        ...active,
        revision: active.revision + 1,
        session: recalculateArcherySession({
          ...active.session,
          archeryData: {
            ...active.session.archeryData,
            rounds: active.session.archeryData.rounds.map((candidate) => (
              candidate.id === roundId ? { ...candidate, ends: [...candidate.ends, end] } : candidate
            ))
          }
        })
      };
      setActiveCandidate(next);
      enqueue({ ...commandBase(next), kind: 'archery.addEnd', roundId, endId: end.id, arrows });
      persist();
      return end;
    },
    updateArcheryNotes: (activityId, notes) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'archery') throw new Error('Active activity is not archery');
      setActiveCandidate({
        ...active,
        revision: active.revision + 1,
        session: { ...active.session, notes }
      });
      persist();
    },
    completeArchery: (activityId, notes) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'archery') throw new Error('Active activity is not archery');
      const terminal = { ...active, revision: active.revision + 1 };
      enqueue({ ...commandBase(terminal), kind: 'sport.complete', completedAtMs: now(), notes });
      removeActiveCandidate(activityId);
      persist();
    },
    startHiit: (config) => startSport('hiit', { hiitConfig: config }) as HiitActivitySnapshot,
    completeHiit: (activityId) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'hiit') throw new Error('Active activity is not HIIT');
      const terminal = { ...active, revision: active.revision + 1 };
      enqueue({ ...commandBase(terminal), kind: 'sport.complete', completedAtMs: now() });
      removeActiveCandidate(activityId);
      persist();
    },
    abandon: (activityId) => {
      reload();
      const active = requireActive(activityId);
      const terminal = { ...active, revision: active.revision + 1 };
      enqueueAbandon(terminal);
      removeActiveCandidate(activityId);
      persist();
    },
    saveHiitTimerState: (activityId, timerState) => {
      reload();
      const active = requireActive(activityId);
      if (active.kind !== 'hiit') throw new Error('Active activity is not HIIT');
      setActiveCandidate({ ...active, revision: active.revision + 1, timerState });
      persist();
    },
    getHiitTimerState: (activityId) => {
      const active = state.active;
      return active?.kind === 'hiit' && active.id === activityId ? active.timerState ?? null : null;
    },
    clearHiitTimerState: (activityId) => {
      reload();
      const active = state.active;
      if (active?.kind !== 'hiit' || active.id !== activityId) return;
      const withoutTimer = { ...active, revision: active.revision + 1 };
      delete withoutTimer.timerState;
      setActiveCandidate(withoutTimer);
      persist();
    },
    reload,
    retryFailed: (commandId) => {
      reload();
      const retrying = commandId
        ? state.failedCommands.filter((failure) => (
            failure.command.commandId === commandId
            && state.commands.some((command) => command.commandId === failure.command.commandId)
          ))
        : state.failedCommands.filter((failure) => (
            state.commands.some((command) => command.commandId === failure.command.commandId)
          ));
      if (retrying.length === 0) return;
      retrying.forEach(({ command }) => setCommandFailure(command.commandId, null));
      state.retry = null;
      persist();
    },
    dismissFailed: (commandId) => {
      reload();
      const dismissing = state.failedCommands.filter((failure) => (
        (!commandId || failure.command.commandId === commandId)
        && !state.commands.some((command) => command.commandId === failure.command.commandId)
      ));
      if (dismissing.length === 0) return;
      dismissing.forEach(({ command }) => setCommandFailure(command.commandId, null));
      persist();
    },
    syncPending
  };
};

export const createMemoryActivitySyncStorage = (
  initial: Record<string, string> = {}
): ActivitySyncStorage => {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); }
  };
};
