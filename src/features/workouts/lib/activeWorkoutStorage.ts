import type { ExerciseLog, WorkoutSet } from '../../../shared/types';

const PROGRESS_KEY = 'activeWorkoutProgress';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000;

export const SESSION_LOGS_MIGRATION_KEY = 'activeWorkoutSessionLogsMigration_v1';

const toComparableDateValue = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const areWorkoutSetsEqual = (left: WorkoutSet[], right: WorkoutSet[]): boolean => {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftSet = left[index];
    const rightSet = right[index];

    if (leftSet.setNumber !== rightSet.setNumber) return false;
    if (leftSet.weight !== rightSet.weight) return false;
    if (leftSet.completed !== rightSet.completed) return false;

    const leftCompletedAt = toComparableDateValue(leftSet.completedAt);
    const rightCompletedAt = toComparableDateValue(rightSet.completedAt);
    if (leftCompletedAt !== rightCompletedAt) return false;
  }

  return true;
};

export const normalizeWorkoutSets = (sets: WorkoutSet[], expectedSets: number): WorkoutSet[] => {
  if (expectedSets <= 0) return [];

  const normalizedBySetNumber = new Map<number, WorkoutSet>();
  sets.forEach((set) => {
    const setNumber = Number(set.setNumber);
    if (!Number.isInteger(setNumber)) return;
    if (setNumber < 1 || setNumber > expectedSets) return;
    normalizedBySetNumber.set(setNumber, set);
  });

  const normalizedSets: WorkoutSet[] = [];
  for (let setNumber = 1; setNumber <= expectedSets; setNumber += 1) {
    const existingSet = normalizedBySetNumber.get(setNumber);
    if (existingSet) {
      normalizedSets.push(existingSet);
      continue;
    }

    normalizedSets.push({
      setNumber,
      weight: 0,
      completed: false
    });
  }

  return normalizedSets;
};

export const isExerciseLogCompleted = (sets: ExerciseLog['sets'], expectedSets: number): boolean => {
  if (expectedSets <= 0) return false;

  const completionBySetNumber = new Map<number, boolean>();
  (sets ?? []).forEach((set) => {
    const setNumber = Number(set.setNumber);
    if (!Number.isInteger(setNumber)) return;
    if (setNumber < 1 || setNumber > expectedSets) return;
    completionBySetNumber.set(setNumber, set.completed === true);
  });

  for (let setNumber = 1; setNumber <= expectedSets; setNumber += 1) {
    if (completionBySetNumber.get(setNumber) !== true) {
      return false;
    }
  }

  return true;
};

export const saveProgressToStorage = (sessionId: string, exerciseLogs: ExerciseLog[]) => {
  const data = {
    sessionId,
    exerciseLogs,
    timestamp: Date.now()
  };
  localStorage.setItem(`${PROGRESS_KEY}_${sessionId}`, JSON.stringify(data));
};

export const clearProgressFromStorage = (sessionId: string) => {
  localStorage.removeItem(`${PROGRESS_KEY}_${sessionId}`);
};

export const loadProgressFromStorage = (sessionId: string): ExerciseLog[] | null => {
  const stored = localStorage.getItem(`${PROGRESS_KEY}_${sessionId}`);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    const now = Date.now();
    if (now - data.timestamp > EXPIRATION_TIME) {
      clearProgressFromStorage(sessionId);
      return null;
    }
    const logs = data.exerciseLogs as ExerciseLog[];
    logs.forEach((log) => {
      (log.sets ?? []).forEach((set) => {
        const completedAt = (set as unknown as { completedAt?: unknown }).completedAt;
        if (typeof completedAt === 'string') {
          const parsed = Date.parse(completedAt);
          if (Number.isFinite(parsed)) {
            (set as unknown as { completedAt?: Date }).completedAt = new Date(parsed);
          }
        }
      });
    });
    return logs;
  } catch {
    clearProgressFromStorage(sessionId);
    return null;
  }
};
