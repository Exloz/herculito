import { useState, useEffect, useRef, useCallback } from 'react';
import { Workout, ExerciseLog } from '../types';
import { fetchWorkouts, upsertWorkout, upsertExerciseLog, fetchExerciseLogsForDate } from '../utils/dataApi';

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const data = await fetchWorkouts();
        setWorkouts(data);
      } catch {
        setError('Error al cargar entrenamientos');
      } finally {
        setLoading(false);
      }
    };

    void loadWorkouts();
  }, []);

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

  const PENDING_KEY = 'pendingExerciseLogs';

  const persistPending = useCallback(() => {
    try {
      const entries = Array.from(pendingPayloadRef.current.entries());
      const payload: Record<string, ExerciseLog> = {};
      entries.forEach(([logId, logValue]) => {
        payload[logId] = logValue;
      });
      localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, []);

  const restorePending = useCallback(() => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ExerciseLog>;
      if (!parsed || typeof parsed !== 'object') return;
      Object.entries(parsed).forEach(([logId, value]) => {
        if (!value || typeof value.exerciseId !== 'string' || typeof value.userId !== 'string' || typeof value.date !== 'string') {
          return;
        }
        pendingPayloadRef.current.set(logId, value);
      });
    } catch {
      // ignore
    }
  }, []);

  const flushPendingWrites = useCallback(async () => {
    const payloads = Array.from(pendingPayloadRef.current.entries());

    const timeouts = Array.from(pendingWritesRef.current.values());
    pendingWritesRef.current.clear();
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));

    await Promise.all(
      payloads.map(async ([logId, payload]) => {
        try {
          await upsertExerciseLog(payload.exerciseId, payload.date, payload.sets, payload.userId);
          pendingPayloadRef.current.delete(logId);
        } catch {
          // Error silencioso para logs
        }
      })
    );

    persistPending();
  }, [persistPending]);

  useEffect(() => {
    restorePending();
    setLoading(true);

    const load = async () => {
      try {
        const serverLogs = await fetchExerciseLogsForDate(date);
        // Apply pending overrides for this date.
        const pendingForDate = Array.from(pendingPayloadRef.current.values()).filter((log) => log.date === date);
        const byKey = new Map<string, ExerciseLog>();
        serverLogs.forEach((log) => {
          byKey.set(`${log.exerciseId}_${log.userId}_${log.date}`, log);
        });
        pendingForDate.forEach((log) => {
          byKey.set(`${log.exerciseId}_${log.userId}_${log.date}`, log);
        });
        setLogs(Array.from(byKey.values()));
      } catch {
        // If load fails, keep whatever we have locally.
        const pendingForDate = Array.from(pendingPayloadRef.current.values()).filter((log) => log.date === date);
        setLogs(pendingForDate);
      } finally {
        setLoading(false);
      }
    };

    void load();

    const handleOnline = () => {
      void flushPendingWrites();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      void flushPendingWrites();
    };
  }, [date, userId, flushPendingWrites, restorePending]);

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
      persistPending();
      const existingTimeout = pendingWritesRef.current.get(logId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeoutId = setTimeout(async () => {
        const payload = pendingPayloadRef.current.get(logId);
        pendingWritesRef.current.delete(logId);
        if (!payload) return;
        try {
          await upsertExerciseLog(payload.exerciseId, payload.date, payload.sets, payload.userId);
          pendingPayloadRef.current.delete(logId);
          persistPending();
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
