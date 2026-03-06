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
    let cancelled = false;

    void loadExerciseNameMap()
      .then((loadedMap) => {
        if (cancelled) return;
        setNameMap(loadedMap);
      })
      .catch(() => {
        // ignore failures, panel still has routine-based names and safe fallbacks
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return nameMap;
};
