import { useState, useEffect, useCallback, useRef } from 'react';
import { Routine, ExerciseHistory, Exercise, MuscleGroup } from '../types';
import {
  fetchRoutines,
  createExerciseTemplate as apiCreateExerciseTemplate,
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
  const initializedDefaultsRef = useRef(false);

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

      const hasUserRoutines = mapped.some((routine) => routine.createdBy === userId || routine.userId === userId);
      if (!hasUserRoutines && !initializedDefaultsRef.current) {
        initializedDefaultsRef.current = true;
        setTimeout(() => {
          void initializeDefaultRoutines();
        }, 0);
      }
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
      const isFromOtherUser = (routine.createdBy && routine.createdBy !== userId) || (routine.userId && routine.userId !== userId);
      const hasKnownOwner = !!routine.createdBy || !!routine.userId;
      return isPublic && (!hasKnownOwner || isFromOtherUser);
    });
  };

  const getUserRoutines = (): Routine[] => {
    return routines.filter((routine) =>
      routine.createdBy === userId || routine.userId === userId
    );
  };

  const initializeDefaultRoutines = async () => {
    const ensureExercise = async (exercise: { name: string; category: string; sets: number; reps: number; restTime: number }) => {
      const created = await apiCreateExerciseTemplate({
        name: exercise.name,
        category: exercise.category,
        sets: exercise.sets,
        reps: exercise.reps,
        restTime: exercise.restTime,
        description: 'Ejercicio básico',
        isPublic: true,
        createdByName: 'Sistema'
      });
      return created.id;
    };

    const defaultRoutines = [
      {
        name: 'Pecho y Tríceps',
        description: 'Rutina enfocada en pecho y tríceps',
        exercises: [
          { name: 'Press de Banca', category: 'Pecho', sets: 4, reps: 8, restTime: 180 },
          { name: 'Press Inclinado', category: 'Pecho', sets: 3, reps: 10, restTime: 120 },
          { name: 'Aperturas con Mancuernas', category: 'Pecho', sets: 3, reps: 12, restTime: 90 },
          { name: 'Fondos en Paralelas', category: 'Tríceps', sets: 3, reps: 12, restTime: 90 },
          { name: 'Extensión de Tríceps', category: 'Tríceps', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        name: 'Espalda y Bíceps',
        description: 'Rutina enfocada en espalda y bíceps',
        exercises: [
          { name: 'Dominadas', category: 'Espalda', sets: 4, reps: 8, restTime: 180 },
          { name: 'Remo con Barra', category: 'Espalda', sets: 4, reps: 10, restTime: 120 },
          { name: 'Jalones al Pecho', category: 'Espalda', sets: 3, reps: 12, restTime: 90 },
          { name: 'Curl de Bíceps', category: 'Bíceps', sets: 3, reps: 12, restTime: 90 },
          { name: 'Curl Martillo', category: 'Bíceps', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        name: 'Piernas',
        description: 'Rutina completa de piernas',
        exercises: [
          { name: 'Sentadillas', category: 'Piernas', sets: 4, reps: 10, restTime: 180 },
          { name: 'Peso Muerto', category: 'Espalda', sets: 4, reps: 8, restTime: 180 },
          { name: 'Prensa de Piernas', category: 'Piernas', sets: 3, reps: 15, restTime: 120 },
          { name: 'Curl de Femorales', category: 'Piernas', sets: 3, reps: 12, restTime: 90 },
          { name: 'Elevación de Gemelos', category: 'Piernas', sets: 4, reps: 20, restTime: 60 }
        ]
      },
      {
        name: 'Hombros',
        description: 'Rutina enfocada en hombros',
        exercises: [
          { name: 'Press Militar', category: 'Hombros', sets: 4, reps: 10, restTime: 120 },
          { name: 'Elevaciones Laterales', category: 'Hombros', sets: 3, reps: 15, restTime: 60 },
          { name: 'Vuelos Posteriores', category: 'Hombros', sets: 3, reps: 15, restTime: 60 },
          { name: 'Remo al Mentón', category: 'Hombros', sets: 3, reps: 12, restTime: 60 }
        ]
      }
    ];

    try {
      for (const routine of defaultRoutines) {
        const exercises = [] as Exercise[];
        for (const exercise of routine.exercises) {
          const exerciseId = await ensureExercise(exercise);
          exercises.push({
            id: exerciseId,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            restTime: exercise.restTime
          });
        }
        await createRoutine(routine.name, routine.description, exercises, true, undefined, 'Sistema');
      }
    } catch {
      // Error silenciado para inicialización por defecto
    }
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
    getUserRoutines,
    initializeDefaultRoutines
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
