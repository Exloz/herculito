import { auth } from '../firebase/config';
import { ExerciseLog, Routine, WorkoutSession, Workout, ExerciseVideo, ExerciseTemplate } from '../types';
import { getPushApiOrigin } from './pushApi';

export type ExerciseTemplateResponse = Omit<ExerciseTemplate, 'createdAt'> & { createdAt: number };
export type RoutineResponse = Omit<Routine, 'createdAt' | 'updatedAt'> & { createdAt: number; updatedAt: number };
export type WorkoutSessionResponse = Omit<WorkoutSession, 'startedAt' | 'completedAt'> & { startedAt: number; completedAt?: number };

const getIdToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    throw new Error('Invalid response type');
  }
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return data;
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
  muscleGroup?: string;
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
  muscleGroup?: string;
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

export const fetchSessions = async (): Promise<WorkoutSessionResponse[]> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ sessions: WorkoutSessionResponse[] }>(`${origin}/v1/data/sessions`, {
    headers: { authorization: `Bearer ${token}` }
  });
  return data.sessions ?? [];
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
