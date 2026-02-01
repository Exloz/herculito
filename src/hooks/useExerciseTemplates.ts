import { useState, useEffect, useCallback } from 'react';
import { ExerciseTemplate, ExerciseVideo } from '../types';
import {
  fetchExercises,
  createExerciseTemplate as apiCreateExerciseTemplate,
  updateExerciseTemplate as apiUpdateExerciseTemplate,
  incrementExerciseUsage as apiIncrementExerciseUsage,
  type ExerciseTemplateResponse
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

const mapExercise = (exercise: ExerciseTemplateResponse): ExerciseTemplate => {
  return {
    ...exercise,
    createdAt: toDate(exercise.createdAt)
  };
};

export const useExerciseTemplates = (userId: string) => {
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortExercises = useCallback((items: ExerciseTemplate[]) => {
    return [...items].sort((a, b) => {
      if (a.createdBy === userId && b.createdBy !== userId) return -1;
      if (b.createdBy === userId && a.createdBy !== userId) return 1;
      return (b.timesUsed || 0) - (a.timesUsed || 0);
    });
  }, [userId]);

  const loadExercises = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchExercises();
      const mapped = data.map(mapExercise);
      const sorted = sortExercises(mapped);
      setExercises(sorted);
    } catch {
      setError('Error al cargar ejercicios');
    } finally {
      setLoading(false);
    }
  }, [userId, sortExercises]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const createExerciseTemplate = async (
    name: string,
    category: string,
    sets: number,
    reps: number,
    restTime: number,
    description?: string,
    isPublic: boolean = true,
    video?: ExerciseVideo
  ) => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const created = await apiCreateExerciseTemplate({
        name,
        category,
        sets,
        reps,
        restTime,
        description,
        isPublic,
        video
      });

      const mapped = mapExercise(created);
      setExercises((prev) => sortExercises([mapped, ...prev]));
      return created.id;
    } catch (error) {
      setError('Error al crear ejercicio');
      throw error;
    }
  };

  const incrementUsage = async (exerciseId: string) => {
    try {
      await apiIncrementExerciseUsage(exerciseId);
      setExercises((prev) =>
        prev.map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, timesUsed: (exercise.timesUsed || 0) + 1 }
            : exercise
        )
      );
    } catch {
      // Error silenciado para incremento de uso
    }
  };

  const updateExerciseTemplate = async (exerciseId: string, updates: Partial<ExerciseTemplate>) => {
    try {
      await apiUpdateExerciseTemplate(exerciseId, {
        name: updates.name,
        category: updates.category,
        sets: updates.sets,
        reps: updates.reps,
        restTime: updates.restTime,
        description: updates.description,
        isPublic: updates.isPublic,
        video: updates.video
      });

      setExercises((prev) =>
        prev.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, ...updates } : exercise
        )
      );
    } catch {
      setError('Error al actualizar ejercicio');
      throw new Error('update_failed');
    }
  };

  const getCategories = (): string[] => {
    const categories = [...new Set(exercises.map((ex) => ex.category))].sort();
    return categories;
  };

  const getExercisesByCategory = (category: string): ExerciseTemplate[] => {
    return exercises.filter((ex) => ex.category === category);
  };

  const searchExercises = (searchTerm: string, category?: string): ExerciseTemplate[] => {
    let filtered = exercises;

    if (category) {
      filtered = filtered.filter((ex) => ex.category === category);
    }

    if (searchTerm) {
      filtered = filtered.filter((ex) =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  return {
    exercises,
    loading,
    error,
    createExerciseTemplate,
    updateExerciseTemplate,
    incrementUsage,
    getCategories,
    getExercisesByCategory,
    searchExercises
  };
};
