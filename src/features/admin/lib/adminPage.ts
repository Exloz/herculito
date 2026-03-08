import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import type {
  AdminRoutineOverview,
  AdminSessionOverview,
  AdminUserOverview,
  ExerciseLog,
  WorkoutSet
} from '../../../shared/types';

export const SESSION_PAGE_SIZE = 20;

export interface AdminPageProps {
  enabled: boolean;
}

export interface AggregatedExerciseActivity {
  exerciseId: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: number;
  sessionCount: number;
  completedSets: number;
  totalLoggedSets: number;
  topWeight: number;
  firstTopWeight: number;
  latestTopWeight: number;
  firstPerformedAt?: number;
  lastPerformedAt?: number;
  history: Array<{
    timestamp: number;
    topWeight: number;
  }>;
}

export interface AggregatedRoutineActivity {
  routineId?: string;
  routineName: string;
  sessionCount: number;
  totalDuration: number;
  lastCompletedAt?: number;
  exercises: AggregatedExerciseActivity[];
}

export interface UserActivitySummary {
  sampleUserName?: string;
  totalSessions: number;
  totalDuration: number;
  lastCompletedAt?: number;
  routines: AggregatedRoutineActivity[];
}

export interface AdminFilterOption {
  value: string;
  label: string;
}

export type AdminDateRange = 'all' | '7d' | '30d';
export type AdminUserSort = 'activity' | 'created' | 'completed' | 'name';
export type AdminRoutineSort = 'usage' | 'lastCompleted' | 'name';
export type AdminSessionSort = 'recent' | 'duration' | 'user';

export const formatDateTime = (timestamp?: number): string => {
  if (!timestamp) return 'Sin actividad';
  return `${formatDateInAppTimeZone(new Date(timestamp))} ${new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

export const formatDuration = (minutes?: number): string => {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
};

export const formatWeight = (weight?: number): string => {
  return weight && weight > 0 ? `${weight} kg` : '-';
};

export const formatWeightDelta = (current: number, previous: number): string => {
  const delta = current - previous;
  if (!Number.isFinite(delta) || delta === 0) return 'sin cambio';
  return `${delta > 0 ? '+' : ''}${delta} kg`;
};

export const isWorkoutSet = (value: unknown): value is WorkoutSet => {
  const set = value as WorkoutSet;
  return typeof set?.setNumber === 'number' && typeof set?.weight === 'number' && typeof set?.completed === 'boolean';
};

export const isExerciseLog = (value: unknown): value is ExerciseLog => {
  const log = value as ExerciseLog;
  return typeof log?.exerciseId === 'string' && Array.isArray(log?.sets) && log.sets.every(isWorkoutSet);
};

export const getCompletedSetsCount = (sets: WorkoutSet[]): number => {
  return sets.filter((set) => set.completed).length;
};

export const getTopWeight = (sets: WorkoutSet[]): number => {
  return sets.reduce((max, set) => Math.max(max, set.weight || 0), 0);
};

export const isWithinRange = (timestamp: number | undefined, range: AdminDateRange): boolean => {
  if (!timestamp || range === 'all') return true;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const limitMs = range === '7d' ? 7 * dayMs : 30 * dayMs;
  return now - timestamp <= limitMs;
};

export const looksLikeId = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes('@')) return false;
  if (trimmed.includes(' ')) return false;
  return /^user_[A-Za-z0-9]+$/.test(trimmed) || /^[A-Za-z0-9_-]{18,}$/.test(trimmed);
};

export const isMeaningfulUserLabel = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (looksLikeId(trimmed)) return false;
  return trimmed.toLowerCase() !== 'usuario';
};

export const getRoutineExerciseName = (
  routinesById: Map<string, AdminRoutineOverview>,
  routineId: string | undefined,
  exerciseId: string
): string => {
  if (!routineId) return exerciseId;
  const routine = routinesById.get(routineId);
  return routine?.exercises.find((exercise) => exercise.exerciseId === exerciseId)?.name ?? exerciseId;
};

export const getRoutineExerciseConfig = (
  routinesById: Map<string, AdminRoutineOverview>,
  routineId: string | undefined,
  exerciseId: string
): { sets?: number; reps?: number } => {
  if (!routineId) return {};
  const routine = routinesById.get(routineId);
  const exercise = routine?.exercises.find((item) => item.exerciseId === exerciseId);
  return {
    sets: exercise?.sets,
    reps: exercise?.reps
  };
};

export const compareUsers = (left: AdminUserOverview, right: AdminUserOverview, sortBy: AdminUserSort): number => {
  if (sortBy === 'name') {
    return (left.name || left.email || '').localeCompare(right.name || right.email || '', 'es');
  }
  if (sortBy === 'created') {
    return right.createdRoutines - left.createdRoutines;
  }
  if (sortBy === 'completed') {
    return right.completedSessions - left.completedSessions;
  }
  return (right.lastActivityAt ?? 0) - (left.lastActivityAt ?? 0);
};

export const compareRoutines = (left: AdminRoutineOverview, right: AdminRoutineOverview, sortBy: AdminRoutineSort): number => {
  if (sortBy === 'name') {
    return left.name.localeCompare(right.name, 'es');
  }
  if (sortBy === 'lastCompleted') {
    return (right.lastCompletedAt ?? 0) - (left.lastCompletedAt ?? 0);
  }
  return right.timesUsed - left.timesUsed;
};

export const compareSessions = (left: AdminSessionOverview, right: AdminSessionOverview, sortBy: AdminSessionSort): number => {
  if (sortBy === 'duration') {
    return (right.totalDuration ?? 0) - (left.totalDuration ?? 0);
  }
  if (sortBy === 'user') {
    return (left.userName || left.userId).localeCompare(right.userName || right.userId, 'es');
  }
  return (right.completedAt ?? right.startedAt) - (left.completedAt ?? left.startedAt);
};

export const buildCreatorNameByUserId = (routines: AdminRoutineOverview[]): Map<string, string> => {
  const map = new Map<string, string>();
  routines.forEach((routine) => {
    if (isMeaningfulUserLabel(routine.createdByName) && !map.has(routine.createdBy)) {
      map.set(routine.createdBy, routine.createdByName!.trim());
    }
  });
  return map;
};

export const buildUserActivityById = (
  sessions: AdminSessionOverview[],
  routinesById: Map<string, AdminRoutineOverview>
): Map<string, UserActivitySummary> => {
  const map = new Map<string, UserActivitySummary>();

  sessions.forEach((session) => {
    const current = map.get(session.userId) ?? {
      totalSessions: 0,
      totalDuration: 0,
      lastCompletedAt: undefined,
      sampleUserName: undefined,
      routines: []
    };

    current.totalSessions += 1;
    current.totalDuration += session.totalDuration ?? 0;
    current.lastCompletedAt = Math.max(current.lastCompletedAt ?? 0, session.completedAt ?? session.startedAt);
    if (isMeaningfulUserLabel(session.userName) && !current.sampleUserName) {
      current.sampleUserName = session.userName;
    }

    const routineKey = session.routineId ?? session.routineName;
    let routine = current.routines.find((entry) => (entry.routineId ?? entry.routineName) === routineKey);
    if (!routine) {
      routine = {
        routineId: session.routineId,
        routineName: session.routineName,
        sessionCount: 0,
        totalDuration: 0,
        lastCompletedAt: undefined,
        exercises: []
      };
      current.routines.push(routine);
    }

    routine.sessionCount += 1;
    routine.totalDuration += session.totalDuration ?? 0;
    routine.lastCompletedAt = Math.max(routine.lastCompletedAt ?? 0, session.completedAt ?? session.startedAt);

    session.exercises.filter(isExerciseLog).forEach((exerciseLog) => {
      const exerciseName = getRoutineExerciseName(routinesById, session.routineId, exerciseLog.exerciseId);
      const exerciseConfig = getRoutineExerciseConfig(routinesById, session.routineId, exerciseLog.exerciseId);
      const sessionTopWeight = getTopWeight(exerciseLog.sets);
      const performedAt = session.completedAt ?? session.startedAt;
      let exercise = routine!.exercises.find((entry) => entry.exerciseId === exerciseLog.exerciseId);
      if (!exercise) {
        exercise = {
          exerciseId: exerciseLog.exerciseId,
          exerciseName,
          targetSets: exerciseConfig.sets,
          targetReps: exerciseConfig.reps,
          sessionCount: 0,
          completedSets: 0,
          totalLoggedSets: 0,
          topWeight: 0,
          firstTopWeight: sessionTopWeight,
          latestTopWeight: sessionTopWeight,
          firstPerformedAt: performedAt,
          lastPerformedAt: undefined,
          history: []
        };
        routine!.exercises.push(exercise);
      }

      if (exercise.targetSets === undefined && exerciseConfig.sets !== undefined) {
        exercise.targetSets = exerciseConfig.sets;
      }
      if (exercise.targetReps === undefined && exerciseConfig.reps !== undefined) {
        exercise.targetReps = exerciseConfig.reps;
      }

      exercise.sessionCount += 1;
      exercise.completedSets += getCompletedSetsCount(exerciseLog.sets);
      exercise.totalLoggedSets += exerciseLog.sets.length;
      exercise.topWeight = Math.max(exercise.topWeight, sessionTopWeight);

      if (!exercise.firstPerformedAt || performedAt < exercise.firstPerformedAt) {
        exercise.firstPerformedAt = performedAt;
        exercise.firstTopWeight = sessionTopWeight;
      }

      if (!exercise.lastPerformedAt || performedAt >= exercise.lastPerformedAt) {
        exercise.lastPerformedAt = performedAt;
        exercise.latestTopWeight = sessionTopWeight;
      }

      exercise.history.push({
        timestamp: performedAt,
        topWeight: sessionTopWeight
      });

      exerciseLog.sets.forEach((set) => {
        if (set.completedAt instanceof Date) {
          exercise!.lastPerformedAt = Math.max(exercise!.lastPerformedAt ?? 0, set.completedAt.getTime());
        }
      });
    });

    map.set(session.userId, current);
  });

  map.forEach((summary) => {
    summary.routines.sort((left, right) => (right.lastCompletedAt ?? 0) - (left.lastCompletedAt ?? 0));
    summary.routines.forEach((routine) => {
      routine.exercises.sort((left, right) => (right.lastPerformedAt ?? 0) - (left.lastPerformedAt ?? 0));
      routine.exercises.forEach((exercise) => {
        exercise.history.sort((left, right) => left.timestamp - right.timestamp);
      });
    });
  });

  return map;
};

export const buildUserDisplayNameById = (
  users: AdminUserOverview[],
  creatorNameByUserId: Map<string, string>,
  userActivityById: Map<string, UserActivitySummary>
): Map<string, string> => {
  const map = new Map<string, string>();

  users.forEach((user) => {
    let label = 'Usuario sin nombre';
    if (isMeaningfulUserLabel(user.name)) {
      label = user.name!.trim();
    } else if (isMeaningfulUserLabel(userActivityById.get(user.userId)?.sampleUserName)) {
      label = userActivityById.get(user.userId)!.sampleUserName!.trim();
    } else if (isMeaningfulUserLabel(creatorNameByUserId.get(user.userId))) {
      label = creatorNameByUserId.get(user.userId)!.trim();
    } else if (user.email?.trim()) {
      label = user.email.trim();
    }

    map.set(user.userId, label);
  });

  return map;
};
