import type { Exercise, ExerciseLog, WorkoutSet } from '../../../shared/types';

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
    if (leftSet.reps !== rightSet.reps) return false;
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

export const buildWorkoutCompletionLogs = (
  exercises: Exercise[],
  exerciseLogs: ExerciseLog[],
  userId: string,
  date: string
): ExerciseLog[] => {
  return exercises.map((exercise) => {
    const log = exerciseLogs.find((entry) => entry.exerciseId === exercise.id) ?? {
      exerciseId: exercise.id,
      userId,
      date,
      sets: []
    };

    const normalizedSets = normalizeWorkoutSets(log.sets ?? [], exercise.sets).map((set, index) => {
      const fallbackReps = exercise.repsBySet?.[index];
      if (set.reps !== undefined || fallbackReps !== undefined) {
        return {
          ...set,
          reps: set.reps ?? fallbackReps ?? exercise.reps
        };
      }

      return set;
    });

    return {
      ...log,
      userId: log.userId || userId,
      date: log.date || date,
      sets: normalizedSets
    };
  });
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
