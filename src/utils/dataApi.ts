import { ExerciseLog, Routine, WorkoutSession, Workout, ExerciseVideo, ExerciseTemplate, MuscleGroup } from '../types';
import { fetchJson, getIdToken } from './apiClient';
import { getPushApiOrigin } from './pushApi';

export type ExerciseTemplateResponse = Omit<ExerciseTemplate, 'createdAt'> & { createdAt: number };
export type RoutineResponse = Omit<Routine, 'createdAt' | 'updatedAt'> & { createdAt: number; updatedAt: number };
export type WorkoutSessionResponse = Omit<WorkoutSession, 'startedAt' | 'completedAt'> & { startedAt: number; completedAt?: number };
export type LeaderboardEntryResponse = {
  userId: string;
  name?: string;
  totalExercises: number;
  position: number;
};
export type LeaderboardPeriodResponse = {
  top: LeaderboardEntryResponse[];
  currentUser: LeaderboardEntryResponse | null;
};
export type CompetitiveLeaderboardResponse = {
  week: LeaderboardPeriodResponse;
  month: LeaderboardPeriodResponse;
};

export const fetchExercises = async (): Promise<ExerciseTemplateResponse[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ exercises: ExerciseTemplateResponse[] }>(`${origin}/v1/data/exercises`, {
    headers: { authorization: `Bearer ${token}` }
  });
  return data.exercises ?? [];
};

export const createExerciseTemplate = async (payload: {
  name: string;
  category: string;
  sets: number;
  reps: number;
  restTime: number;
  description?: string;
  isPublic?: boolean;
  createdByName?: string;
  muscleGroup?: MuscleGroup;
  video?: ExerciseVideo;
}): Promise<ExerciseTemplateResponse> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ exercise: ExerciseTemplateResponse }>(`${origin}/v1/data/exercises`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return data.exercise;
};

export const updateExerciseTemplate = async (id: string, updates: Partial<{
  name: string;
  category: string;
  sets: number;
  reps: number;
  restTime: number;
  description?: string;
  isPublic?: boolean;
  muscleGroup?: MuscleGroup;
  video?: ExerciseVideo;
}>): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/exercises/update`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id, updates })
  });
};

export const incrementExerciseUsage = async (id: string): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/exercises/use`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  });
};

export const fetchRoutines = async (): Promise<RoutineResponse[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ routines: RoutineResponse[] }>(`${origin}/v1/data/routines`, {
    headers: { authorization: `Bearer ${token}` }
  });
  return data.routines ?? [];
};

export const createRoutine = async (payload: {
  id?: string;
  name: string;
  description?: string;
  exercises: Routine['exercises'];
  isPublic?: boolean;
  primaryMuscleGroup?: Routine['primaryMuscleGroup'];
  createdByName?: string;
}): Promise<RoutineResponse> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ routine: RoutineResponse }>(`${origin}/v1/data/routines`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return data.routine;
};

export const updateRoutine = async (id: string, updates: Partial<{
  name: string;
  description?: string;
  exercises: Routine['exercises'];
  isPublic?: boolean;
  primaryMuscleGroup?: Routine['primaryMuscleGroup'];
}>): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/routines/update`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id, updates })
  });
};

export const deleteRoutine = async (id: string): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/routines/delete`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  });
};

export const incrementRoutineUsage = async (id: string): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/routines/use`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  });
};

export const fetchHiddenPublicRoutineIds = async (): Promise<string[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ hiddenRoutineIds: unknown[] }>(`${origin}/v1/data/routines/visibility`, {
    headers: { authorization: `Bearer ${token}` }
  });

  const hiddenRoutineIds = Array.isArray(data.hiddenRoutineIds) ? data.hiddenRoutineIds : [];
  return hiddenRoutineIds.filter((value): value is string => typeof value === 'string');
};

export const updateRoutineVisibility = async (routineId: string, visible: boolean): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/routines/visibility`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ routineId, visible })
  });
};

export const fetchSessions = async (): Promise<WorkoutSessionResponse[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ sessions: WorkoutSessionResponse[] }>(`${origin}/v1/data/sessions`, {
    headers: { authorization: `Bearer ${token}` }
  });
  return data.sessions ?? [];
};

export const fetchCompetitiveLeaderboard = async (limit = 10): Promise<CompetitiveLeaderboardResponse> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));

  return fetchJson<CompetitiveLeaderboardResponse>(`${origin}/v1/data/leaderboard?limit=${safeLimit}`, {
    headers: { authorization: `Bearer ${token}` }
  });
};

export const startSession = async (payload: {
  id?: string;
  routineId?: string;
  routineName: string;
  primaryMuscleGroup?: Routine['primaryMuscleGroup'];
  startedAt?: number;
}): Promise<WorkoutSessionResponse> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ session: WorkoutSessionResponse }>(`${origin}/v1/data/sessions/start`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return data.session;
};

export const updateSessionProgress = async (sessionId: string, exercises: ExerciseLog[]): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/sessions/progress`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, exercises })
  });
};

export const completeSession = async (sessionId: string, exercises: ExerciseLog[], completedAt?: number, totalDuration?: number): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/sessions/complete`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, exercises, completedAt, totalDuration })
  });
};

export const upsertExerciseLog = async (
  exerciseId: string,
  date: string,
  sets: ExerciseLog['sets'],
  userId?: string
): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/exercise-logs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ exerciseId, date, sets, userId })
  });
};

export const fetchExerciseLogsForDate = async (date: string): Promise<ExerciseLog[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ logs: unknown[] }>(`${origin}/v1/data/exercise-logs?date=${encodeURIComponent(date)}`, {
    headers: { authorization: `Bearer ${token}` }
  });

  const logs = Array.isArray(data.logs) ? data.logs : [];
  return logs.filter((value): value is ExerciseLog => {
    const log = value as ExerciseLog;
    return (
      typeof log?.exerciseId === 'string' &&
      typeof log?.userId === 'string' &&
      typeof log?.date === 'string' &&
      Array.isArray(log?.sets)
    );
  });
};

export const fetchWorkouts = async (): Promise<Workout[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ workouts: Workout[] }>(`${origin}/v1/data/workouts`, {
    headers: { authorization: `Bearer ${token}` }
  });
  return data.workouts ?? [];
};

export const upsertWorkout = async (workout: Workout): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  await fetchJson<{ ok: boolean }>(`${origin}/v1/data/workouts`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ workout })
  });
};
