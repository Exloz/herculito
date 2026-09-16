import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { ExerciseTemplate, ExerciseVideo } from '../../../shared/types';
import {
  fetchExercises,
  createExerciseTemplate as apiCreateExerciseTemplate,
  updateExerciseTemplate as apiUpdateExerciseTemplate,
  incrementExerciseUsage as apiIncrementExerciseUsage,
  type ExerciseTemplateResponse
} from '../../../shared/api/dataApi';
import { toUserMessage } from '../../../shared/lib/errorMessages';

const EXERCISE_TEMPLATE_CACHE_STALE_MS = 60_000;

interface ExerciseTemplateCacheEntry {
  exercises: ExerciseTemplate[];
  updatedAt: number;
}

const exerciseTemplateCache = new Map<string, ExerciseTemplateCacheEntry>();
const exerciseTemplateRequests = new Map<string, Promise<ExerciseTemplate[]>>();

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

const fetchMappedExercises = (userId: string): Promise<ExerciseTemplate[]> => {
  const pendingRequest = exerciseTemplateRequests.get(userId);
  if (pendingRequest) return pendingRequest;

  const request = fetchExercises()
    .then((data) => data.map(mapExercise))
    .finally(() => {
      exerciseTemplateRequests.delete(userId);
    });

  exerciseTemplateRequests.set(userId, request);
  return request;
};

export const clearExerciseTemplateCache = (): void => {
  exerciseTemplateCache.clear();
  exerciseTemplateRequests.clear();
};

export const useExerciseTemplates = (userId: string) => {
  const cachedEntry = exerciseTemplateCache.get(userId);
  const [exercises, setExercises] = useState<ExerciseTemplate[]>(cachedEntry?.exercises ?? []);
  const [loading, setLoading] = useState(!cachedEntry);
  const [error, setError] = useState<string | null>(null);
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;

  const sortExercises = useCallback((items: ExerciseTemplate[]) => {
    return [...items].sort((a, b) => {
      if (a.createdBy === userId && b.createdBy !== userId) return -1;
      if (b.createdBy === userId && a.createdBy !== userId) return 1;
      return (b.timesUsed || 0) - (a.timesUsed || 0);
    });
  }, [userId]);

  const fuseOptions = useMemo(() => ({
    keys: ['name', 'category'],
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    minMatchCharLength: 2
  }), []);

  const exerciseSearchIndex = useMemo(() => new Fuse(exercises, fuseOptions), [exercises, fuseOptions]);

  const categorySearchIndex = useMemo(() => {
    const indexByCategory = new Map<string, Fuse<ExerciseTemplate>>();
    const byCategory = new Map<string, ExerciseTemplate[]>();

    exercises.forEach((exercise) => {
      const current = byCategory.get(exercise.category) ?? [];
      current.push(exercise);
      byCategory.set(exercise.category, current);
    });

    byCategory.forEach((items, category) => {
      indexByCategory.set(category, new Fuse(items, fuseOptions));
    });

    return indexByCategory;
  }, [exercises, fuseOptions]);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setExercises([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const cached = exerciseTemplateCache.get(userId);
    if (cached) {
      setExercises(cached.exercises);
      setLoading(false);
    } else {
      setExercises([]);
    }

    if (!cached || Date.now() - cached.updatedAt >= EXERCISE_TEMPLATE_CACHE_STALE_MS) {
      if (!cached) setLoading(true);
      setError(null);

      void fetchMappedExercises(userId)
        .then((mapped) => {
          const sorted = sortExercises(mapped);
          exerciseTemplateCache.set(userId, {
            exercises: sorted,
            updatedAt: Date.now()
          });
          if (active) setExercises(sorted);
        })
        .catch((loadError: unknown) => {
          if (active) setError(toUserMessage(loadError, 'Error al cargar ejercicios'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [sortExercises, userId]);

  const updateCachedExercises = useCallback((update: (current: ExerciseTemplate[]) => ExerciseTemplate[]) => {
    const current = exerciseTemplateCache.get(userId)?.exercises ?? exercisesRef.current;
    const next = update(current);
    exerciseTemplateCache.set(userId, {
      exercises: next,
      updatedAt: Date.now()
    });
    exercisesRef.current = next;
    setExercises(next);
  }, [userId]);

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
      updateCachedExercises((previous) => sortExercises([mapped, ...previous]));
      return created.id;
    } catch (error) {
      setError(toUserMessage(error, 'Error al crear ejercicio'));
      throw error;
    }
  };

  const incrementUsage = (exerciseId: string): void => {
    updateCachedExercises((previous) => previous.map((exercise) =>
      exercise.id === exerciseId
        ? { ...exercise, timesUsed: (exercise.timesUsed || 0) + 1 }
        : exercise
    ));

    void apiIncrementExerciseUsage(exerciseId).catch(() => {
      // Usage telemetry must not block adding an exercise.
    });
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

      updateCachedExercises((previous) =>
        previous.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, ...updates } : exercise
        )
      );
    } catch (error) {
      setError(toUserMessage(error, 'Error al actualizar ejercicio'));
      throw error;
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

    // Apply category filter first
    if (category) {
      filtered = filtered.filter((ex) => ex.category === category);
    }

    // Apply fuzzy search if there's a search term
    if (searchTerm && searchTerm.trim().length >= 2) {
      const query = searchTerm.trim();
      const fuseInstance = category
        ? categorySearchIndex.get(category)
        : exerciseSearchIndex;

      if (!fuseInstance) {
        return filtered;
      }

      const results = fuseInstance.search(query);
      filtered = results.map((result) => result.item);
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
