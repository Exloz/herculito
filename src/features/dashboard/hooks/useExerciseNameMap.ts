import { useEffect, useState } from 'react';
import { fetchExercises } from '../../../shared/api/dataApi';

let cachedExerciseNameMap: Map<string, string> | null = null;
let exerciseNameMapPromise: Promise<Map<string, string>> | null = null;

const loadExerciseNameMap = async (): Promise<Map<string, string>> => {
  if (cachedExerciseNameMap) {
    return cachedExerciseNameMap;
  }

  if (exerciseNameMapPromise) {
    return exerciseNameMapPromise;
  }

  exerciseNameMapPromise = (async () => {
    const exercises = await fetchExercises();
    const nameMap = new Map<string, string>();

    exercises.forEach((exercise) => {
      if (!exercise.id || typeof exercise.name !== 'string') return;
      const trimmedName = exercise.name.trim();
      if (!trimmedName) return;
      nameMap.set(exercise.id, trimmedName);
    });

    cachedExerciseNameMap = nameMap;
    return nameMap;
  })();

  try {
    return await exerciseNameMapPromise;
  } finally {
    exerciseNameMapPromise = null;
  }
};

export const useExerciseNameMap = (): Map<string, string> => {
  const [nameMap, setNameMap] = useState<Map<string, string>>(() => cachedExerciseNameMap ?? new Map());

  useEffect(() => {
    if (cachedExerciseNameMap) {
      setNameMap(cachedExerciseNameMap);
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const scheduleLoad = () => {
      void loadExerciseNameMap()
        .then((loadedMap) => {
          if (cancelled) return;
          setNameMap(loadedMap);
        })
        .catch(() => {
          // ignore failures, panel still has routine-based names and safe fallbacks
        });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(scheduleLoad, { timeout: 1500 });
    } else {
      timeoutId = setTimeout(scheduleLoad, 500);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return nameMap;
};
