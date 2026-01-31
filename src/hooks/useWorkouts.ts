import { useState, useEffect, useRef, useCallback } from 'react';
import { Workout, ExerciseLog } from '../types';
import { fetchWorkouts, upsertWorkout, upsertExerciseLog } from '../utils/dataApi';

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const data = await fetchWorkouts();
        if (data.length === 0) {
          const defaults = await initializeDefaultRoutine();
          setWorkouts(defaults);
        } else {
          setWorkouts(data);
        }
      } catch {
        setError('Error al cargar entrenamientos');
      } finally {
        setLoading(false);
      }
    };

    void loadWorkouts();
  }, []);

  const initializeDefaultRoutine = async (): Promise<Workout[]> => {
    const defaultWorkouts: Workout[] = [
      {
        id: 'monday',
        day: 'monday',
        name: 'Pecho y Tríceps',
        exercises: [
          { id: 'bench_press', name: 'Press de Banca', sets: 4, reps: 10, restTime: 120 },
          { id: 'incline_press', name: 'Press Inclinado', sets: 3, reps: 12, restTime: 90 },
          { id: 'tricep_dips', name: 'Fondos de Tríceps', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        id: 'wednesday',
        day: 'wednesday',
        name: 'Espalda y Bíceps',
        exercises: [
          { id: 'deadlift', name: 'Peso Muerto', sets: 4, reps: 8, restTime: 150 },
          { id: 'pull_ups', name: 'Dominadas', sets: 3, reps: 10, restTime: 90 },
          { id: 'bicep_curls', name: 'Curl de Bíceps', sets: 3, reps: 12, restTime: 60 }
        ]
      },
      {
        id: 'friday',
        day: 'friday',
        name: 'Pierna y Glúteo',
        exercises: [
          { id: 'squats', name: 'Sentadillas', sets: 4, reps: 12, restTime: 120 },
          { id: 'lunges', name: 'Zancadas', sets: 3, reps: 15, restTime: 90 },
          { id: 'leg_press', name: 'Prensa de Pierna', sets: 3, reps: 12, restTime: 90 }
        ]
      }
    ];

    for (const workout of defaultWorkouts) {
      await upsertWorkout(workout);
    }

    return defaultWorkouts;
  };

  const updateWorkout = async (workout: Workout) => {
    try {
      await upsertWorkout(workout);
      setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? workout : w)));
    } catch {
      setError('Error al actualizar entrenamiento');
    }
  };

  return { workouts, loading, error, updateWorkout };
};

export const useExerciseLogs = (date: string, userId?: string) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const pendingWritesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingPayloadRef = useRef<Map<string, ExerciseLog>>(new Map());

  const flushPendingWrites = useCallback(async () => {
    const payloads = Array.from(pendingPayloadRef.current.entries());
    pendingPayloadRef.current.clear();

    const timeouts = Array.from(pendingWritesRef.current.values());
    pendingWritesRef.current.clear();
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));

    await Promise.all(
      payloads.map(async ([, payload]) => {
        try {
          await upsertExerciseLog(payload.exerciseId, payload.date, payload.sets, payload.userId);
        } catch {
          // Error silencioso para logs
        }
      })
    );
  }, []);

  useEffect(() => {
    setLogs([]);
    setLoading(false);

    return () => {
      void flushPendingWrites();
    };
  }, [date, userId, flushPendingWrites]);

  const updateExerciseLog = async (log: ExerciseLog) => {
    try {
      const logWithAllFields = {
        ...log,
        userId: log.userId || userId || '',
        date: log.date || date
      };

      const logId = `${logWithAllFields.exerciseId}_${logWithAllFields.userId}_${logWithAllFields.date}`;

      setLogs((prevLogs) => {
        const existingIndex = prevLogs.findIndex((l) =>
          l.exerciseId === logWithAllFields.exerciseId &&
          l.userId === logWithAllFields.userId &&
          l.date === logWithAllFields.date
        );

        if (existingIndex >= 0) {
          const updated = [...prevLogs];
          updated[existingIndex] = logWithAllFields;
          return updated;
        }
        return [...prevLogs, logWithAllFields];
      });

      pendingPayloadRef.current.set(logId, logWithAllFields);
      const existingTimeout = pendingWritesRef.current.get(logId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeoutId = setTimeout(async () => {
        const payload = pendingPayloadRef.current.get(logId);
        pendingPayloadRef.current.delete(logId);
        pendingWritesRef.current.delete(logId);
        if (!payload) return;
        try {
          await upsertExerciseLog(payload.exerciseId, payload.date, payload.sets, payload.userId);
        } catch {
          // Error silencioso para logs
        }
      }, 400);

      pendingWritesRef.current.set(logId, timeoutId);
    } catch {
      // Error silencioso para logs
    }
  };

  const getLogForExercise = (exerciseId: string, userIdValue: string) => {
    const localLog = logs.find((log) =>
      log.exerciseId === exerciseId &&
      log.userId === userIdValue &&
      log.date === date
    );

    if (!localLog) {
      return {
        exerciseId,
        userId: userIdValue,
        date,
        sets: []
      };
    }

    return localLog;
  };

  return { logs, loading, updateExerciseLog, getLogForExercise };
};
