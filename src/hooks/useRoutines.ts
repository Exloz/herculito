import { useState, useEffect, useCallback } from 'react';
import { Routine, ExerciseHistory, Exercise, MuscleGroup } from '../types';
import {
  fetchRoutines,
  createRoutine as apiCreateRoutine,
  updateRoutine as apiUpdateRoutine,
  deleteRoutine as apiDeleteRoutine,
  incrementRoutineUsage as apiIncrementRoutineUsage,
  type RoutineResponse
} from '../utils/dataApi';

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe?.toDate === 'function') return maybe.toDate();
  return new Date(0);
};

const mapRoutine = (routine: RoutineResponse): Routine => {
  return {
    ...routine,
    createdAt: toDate(routine.createdAt),
    updatedAt: toDate(routine.updatedAt)
  };
};

export const useRoutines = (userId: string) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoutines = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchRoutines();
      const mapped = data.map(mapRoutine);
      setRoutines(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar rutinas';
      setError(`Error al cargar rutinas: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadRoutines();
  }, [loadRoutines]);

  const createRoutine = useCallback(async (
    name: string,
    description: string,
    exercises: Exercise[],
    isPublic: boolean = true,
    primaryMuscleGroup?: MuscleGroup,
    createdByName?: string
  ) => {
    const routine = await apiCreateRoutine({
      name,
      description,
      exercises,
      isPublic,
      primaryMuscleGroup,
      createdByName
    });

    const mapped = mapRoutine(routine);
    setRoutines((prev) => [mapped, ...prev]);
    return mapped.id;
  }, []);

  const updateRoutine = useCallback(async (routineId: string, updates: Partial<Routine>) => {
    await apiUpdateRoutine(routineId, {
      name: updates.name,
      description: updates.description,
      exercises: updates.exercises,
      isPublic: updates.isPublic,
      primaryMuscleGroup: updates.primaryMuscleGroup
    });

    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === routineId
          ? {
            ...routine,
            ...updates,
            updatedAt: new Date()
          }
          : routine
      )
    );
  }, []);

  const deleteRoutine = async (routineId: string) => {
    await apiDeleteRoutine(routineId);
    setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
  };

  const incrementRoutineUsage = async (routineId: string) => {
    await apiIncrementRoutineUsage(routineId);
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === routineId
          ? { ...routine, timesUsed: (routine.timesUsed || 0) + 1 }
          : routine
      )
    );
  };

  const canEditRoutine = (routine: Routine): boolean => {
    return routine.createdBy === userId || routine.userId === userId;
  };

  const getPublicRoutines = (): Routine[] => {
    return routines.filter((routine) => {
      const isPublic = routine.isPublic !== false;
      const owner = routine.createdBy || routine.userId;
      if (!owner) return false;
      if (owner === 'system') return false;
      return isPublic && owner !== userId;
    });
  };

  const getUserRoutines = (): Routine[] => {
    return routines.filter((routine) =>
      routine.createdBy === userId || routine.userId === userId
    );
  };

  return {
    routines,
    loading,
    error,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    incrementRoutineUsage,
    canEditRoutine,
    getPublicRoutines,
    getUserRoutines
  };
};

export const useExerciseHistory = (userId: string) => {
  const [history] = useState<ExerciseHistory[]>([]);

  const updateExerciseHistory = async (
    exerciseId: string,
    exerciseName: string,
    weights: number[],
    personalRecord: number
  ) => {
    if (!userId) return;

    void exerciseId;
    void exerciseName;
    void weights;
    void personalRecord;
  };

  const getExerciseHistory = (exerciseId: string): ExerciseHistory | undefined => {
    return history.find((entry) => entry.exerciseId === exerciseId);
  };

  return {
    history,
    updateExerciseHistory,
    getExerciseHistory
  };
};
