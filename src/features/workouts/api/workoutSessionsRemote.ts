import type { ExerciseLog, MuscleGroup, Routine, WorkoutSession } from '../../../shared/types';
import { fetchApiJson } from '../../../shared/api/transport';
import {
  expectArray,
  expectBoolean,
  expectDate,
  expectEnum,
  expectRecord,
  expectNumber,
  expectString,
  optionalDate,
  optionalEnum,
  optionalNumber,
  optionalString
} from '../../../shared/api/wire';

const MUSCLE_GROUPS = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody'] as const satisfies readonly MuscleGroup[];
const PROGRESS_RESULTS = ['applied', 'already_applied_or_current'] as const;
const COMPLETION_RESULTS = ['completed', 'already_completed'] as const;
const ABANDON_RESULTS = ['abandoned', 'already_abandoned'] as const;

const decodeExerciseLogs = (value: unknown, path: string): ExerciseLog[] => (
  expectArray(value, path).map((logValue, logIndex) => {
    const logPath = `${path}[${logIndex}]`;
    const log = expectRecord(logValue, logPath);
    return {
      exerciseId: expectString(log.exerciseId, `${logPath}.exerciseId`),
      userId: expectString(log.userId, `${logPath}.userId`),
      date: expectString(log.date, `${logPath}.date`),
      sets: expectArray(log.sets, `${logPath}.sets`).map((setValue, setIndex) => {
        const setPath = `${logPath}.sets[${setIndex}]`;
        const set = expectRecord(setValue, setPath);
        return {
          setNumber: expectNumber(set.setNumber, `${setPath}.setNumber`),
          weight: expectNumber(set.weight, `${setPath}.weight`),
          reps: optionalNumber(set.reps, `${setPath}.reps`),
          completed: expectBoolean(set.completed, `${setPath}.completed`),
          completedAt: optionalDate(set.completedAt, `${setPath}.completedAt`)
        };
      })
    };
  })
);

const decodeTransition = <T extends string>(
  value: unknown,
  results: readonly T[],
  path: string
): T => {
  const response = expectRecord(value, path);
  expectBoolean(response.ok, `${path}.ok`);
  return expectEnum(response.result, results, `${path}.result`);
};

export const decodeWorkoutSession = (value: unknown, path: string): WorkoutSession => {
  const session = expectRecord(value, path);
  return {
    id: expectString(session.id, `${path}.id`),
    routineId: optionalString(session.routineId, `${path}.routineId`) ?? '',
    routineName: expectString(session.routineName, `${path}.routineName`),
    userId: expectString(session.userId, `${path}.userId`),
    startedAt: expectDate(session.startedAt, `${path}.startedAt`),
    completedAt: optionalDate(session.completedAt, `${path}.completedAt`),
    exercises: decodeExerciseLogs(session.exercises, `${path}.exercises`),
    totalDuration: optionalNumber(session.totalDuration, `${path}.totalDuration`),
    notes: optionalString(session.notes, `${path}.notes`),
    primaryMuscleGroup: optionalEnum(session.primaryMuscleGroup, MUSCLE_GROUPS, `${path}.primaryMuscleGroup`)
  };
};

export const fetchWorkoutSessions = async (options?: {
  limit?: number;
  includeExercises?: boolean;
  completedOnly?: boolean;
}): Promise<WorkoutSession[]> => {
  const searchParams = new URLSearchParams();
  if (options?.limit) searchParams.set('limit', String(options.limit));
  if (options?.includeExercises) searchParams.set('includeExercises', '1');
  if (options?.completedOnly) searchParams.set('completedOnly', '1');
  const query = searchParams.toString();
  const response = expectRecord(
    await fetchApiJson(`/v1/data/sessions${query ? `?${query}` : ''}`),
    'sessions response'
  );
  return expectArray(response.sessions, 'sessions response.sessions').map((session, index) => (
    decodeWorkoutSession(session, `sessions response.sessions[${index}]`)
  ));
};

export const startWorkoutSession = async (payload: {
  id?: string;
  routineId?: string;
  routineName: string;
  primaryMuscleGroup?: Routine['primaryMuscleGroup'];
  startedAt?: number;
}): Promise<WorkoutSession> => {
  const response = expectRecord(await fetchApiJson('/v1/data/sessions/start', {
    method: 'POST',
    body: JSON.stringify(payload)
  }), 'start session response');
  return decodeWorkoutSession(response.session, 'start session response.session');
};

export const updateWorkoutSessionProgress = async (
  sessionId: string,
  exercises: ExerciseLog[]
): Promise<(typeof PROGRESS_RESULTS)[number]> => {
  const response = await fetchApiJson('/v1/data/sessions/progress', {
    method: 'POST',
    body: JSON.stringify({ sessionId, exercises })
  });
  return decodeTransition(response, PROGRESS_RESULTS, 'progress session response');
};

export const completeWorkoutSession = async (
  sessionId: string,
  exercises: ExerciseLog[],
  completedAt?: number,
  totalDuration?: number,
  repsBySetUpdates?: Record<string, number[]>
): Promise<(typeof COMPLETION_RESULTS)[number]> => {
  const response = await fetchApiJson('/v1/data/sessions/complete', {
    method: 'POST',
    body: JSON.stringify({ sessionId, exercises, completedAt, totalDuration, repsBySetUpdates })
  });
  return decodeTransition(response, COMPLETION_RESULTS, 'complete session response');
};

export const abandonWorkoutSession = async (
  sessionId: string
): Promise<(typeof ABANDON_RESULTS)[number]> => {
  const response = await fetchApiJson(`/v1/data/sessions/${encodeURIComponent(sessionId)}/abandon`, {
    method: 'POST'
  });
  return decodeTransition(response, ABANDON_RESULTS, 'abandon session response');
};
