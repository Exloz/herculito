import { ExerciseLog, Routine, Workout, ExerciseVideo, ExerciseTemplate, MuscleGroup, AdminOverview } from '../types';
import { fetchApiJson } from './transport';

export type ExerciseTemplateResponse = Omit<ExerciseTemplate, 'createdAt'> & { createdAt: number };
export type RoutineResponse = Omit<Routine, 'createdAt' | 'updatedAt'> & { createdAt: number; updatedAt: number };
export type LeaderboardEntryResponse = {
  userId: string;
  name?: string;
  avatarUrl?: string;
  totalWorkouts: number;
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
export type DashboardCompetitionResponse = {
  weekLeader: LeaderboardEntryResponse | null;
  monthLeader: LeaderboardEntryResponse | null;
  userWeekRank: LeaderboardEntryResponse | null;
  userMonthRank: LeaderboardEntryResponse | null;
};

export const syncUserProfile = async (payload: {
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}): Promise<void> => {
  await fetchApiJson<{ ok: boolean }>('/v1/data/profile', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const fetchExercises = async (): Promise<ExerciseTemplateResponse[]> => {
  const data = await fetchApiJson<{ exercises: ExerciseTemplateResponse[] }>('/v1/data/exercises');
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
  const data = await fetchApiJson<{ exercise: ExerciseTemplateResponse }>('/v1/data/exercises', {
    method: 'POST',
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
  await fetchApiJson<{ ok: boolean }>('/v1/data/exercises/update', {
    method: 'POST',
    body: JSON.stringify({ id, updates })
  });
};

export const incrementExerciseUsage = async (id: string): Promise<void> => {
  await fetchApiJson<{ ok: boolean }>('/v1/data/exercises/use', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
};

export const fetchRoutines = async (options?: { includeVideos?: boolean; limit?: number }): Promise<RoutineResponse[]> => {
  const searchParams = new URLSearchParams();
  if (options?.includeVideos) searchParams.set('includeVideos', '1');
  if (options?.limit) searchParams.set('limit', String(options.limit));
  const query = searchParams.toString();
  const data = await fetchApiJson<{ routines: RoutineResponse[] }>(`/v1/data/routines${query ? `?${query}` : ''}`);
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
  const data = await fetchApiJson<{ routine: RoutineResponse }>('/v1/data/routines', {
    method: 'POST',
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
  await fetchApiJson<{ ok: boolean }>('/v1/data/routines/update', {
    method: 'POST',
    body: JSON.stringify({ id, updates })
  });
};

export const deleteRoutine = async (id: string): Promise<void> => {
  await fetchApiJson<{ ok: boolean }>('/v1/data/routines/delete', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
};

export const fetchHiddenPublicRoutineIds = async (): Promise<string[]> => {
  const data = await fetchApiJson<{ hiddenRoutineIds: unknown[] }>('/v1/data/routines/visibility');

  const hiddenRoutineIds = Array.isArray(data.hiddenRoutineIds) ? data.hiddenRoutineIds : [];
  return hiddenRoutineIds.filter((value): value is string => typeof value === 'string');
};

export const updateRoutineVisibility = async (routineId: string, visible: boolean): Promise<void> => {
  await fetchApiJson<{ ok: boolean }>('/v1/data/routines/visibility', {
    method: 'POST',
    body: JSON.stringify({ routineId, visible })
  });
};

export const fetchAdminOverview = async (): Promise<AdminOverview> => {
  return fetchApiJson<AdminOverview>('/v1/data/admin/overview');
};

export const fetchCompetitiveLeaderboard = async (limit = 10): Promise<CompetitiveLeaderboardResponse> => {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));

  return fetchApiJson<CompetitiveLeaderboardResponse>(`/v1/data/leaderboard?limit=${safeLimit}`);
};

export const upsertExerciseLog = async (
  exerciseId: string,
  date: string,
  sets: ExerciseLog['sets'],
  userId?: string
): Promise<void> => {
  await fetchApiJson<{ ok: boolean }>('/v1/data/exercise-logs', {
    method: 'POST',
    body: JSON.stringify({ exerciseId, date, sets, userId })
  });
};

export const fetchExerciseLogsForDate = async (date: string): Promise<ExerciseLog[]> => {
  const data = await fetchApiJson<{ logs: unknown[] }>(`/v1/data/exercise-logs?date=${encodeURIComponent(date)}`);

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
  const data = await fetchApiJson<{ workouts: Workout[] }>('/v1/data/workouts');
  return data.workouts ?? [];
};

export const upsertWorkout = async (workout: Workout): Promise<void> => {
  await fetchApiJson<{ ok: boolean }>('/v1/data/workouts', {
    method: 'POST',
    body: JSON.stringify({ workout })
  });
};
