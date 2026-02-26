import { useState, useEffect, useRef, useCallback } from 'react';
import { Workout, ExerciseLog } from '../types';
import { useUI } from '../contexts/ui-context';
import { fetchWorkouts, upsertWorkout, upsertExerciseLog, fetchExerciseLogsForDate } from '../utils/dataApi';

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useUI();

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const data = await fetchWorkouts();
        setWorkouts(data);
      } catch {
        const message = 'Error al cargar entrenamientos';
        setError(message);
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    void loadWorkouts();
  }, [showToast]);

  const updateWorkout = async (workout: Workout) => {
    try {
      await upsertWorkout(workout);
      setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? workout : w)));
    } catch {
      const message = 'Error al actualizar entrenamiento';
      setError(message);
      showToast(message, 'error');
    }
  };

  return { workouts, loading, error, updateWorkout };
};

export const useExerciseLogs = (date: string, userId?: string) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useUI();
  const pendingWritesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingPayloadRef = useRef<Map<string, ExerciseLog>>(new Map());
  const loadErrorShownRef = useRef<string | null>(null);

  const PENDING_KEY_PREFIX = 'pendingExerciseLogs';
  const LEGACY_PENDING_KEY = 'pendingExerciseLogs';
  const resolvedUserId = userId?.trim() ?? '';
  const pendingStorageKey = `${PENDING_KEY_PREFIX}:${resolvedUserId || 'anonymous'}`;

  const persistPending = useCallback(() => {
    try {
      const entries = Array.from(pendingPayloadRef.current.entries()).filter(([, logValue]) => {
        return logValue.userId === resolvedUserId;
      });
      const payload: Record<string, ExerciseLog> = {};
      entries.forEach(([logId, logValue]) => {
        payload[logId] = logValue;
      });
      localStorage.setItem(pendingStorageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [pendingStorageKey, resolvedUserId]);

  const restorePending = useCallback(() => {
    try {
      pendingPayloadRef.current.clear();

      const raw = localStorage.getItem(pendingStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ExerciseLog>;
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([logId, value]) => {
            if (!value || typeof value.exerciseId !== 'string' || typeof value.userId !== 'string' || typeof value.date !== 'string') {
              return;
            }
            if (value.userId !== resolvedUserId) {
              return;
            }
            pendingPayloadRef.current.set(logId, value);
          });
        }
      }

      const legacyRaw = localStorage.getItem(LEGACY_PENDING_KEY);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw) as Record<string, ExerciseLog>;
        if (parsedLegacy && typeof parsedLegacy === 'object') {
          const remainingLegacyPayload: Record<string, ExerciseLog> = {};
          Object.entries(parsedLegacy).forEach(([logId, value]) => {
            if (!value || typeof value.exerciseId !== 'string' || typeof value.userId !== 'string' || typeof value.date !== 'string') {
              return;
            }
            if (value.userId !== resolvedUserId) {
              remainingLegacyPayload[logId] = value;
              return;
            }
            pendingPayloadRef.current.set(logId, value);
          });

          if (Object.keys(remainingLegacyPayload).length > 0) {
            localStorage.setItem(LEGACY_PENDING_KEY, JSON.stringify(remainingLegacyPayload));
          } else {
            localStorage.removeItem(LEGACY_PENDING_KEY);
          }
          persistPending();
        } else {
          localStorage.removeItem(LEGACY_PENDING_KEY);
        }
      }
    } catch {
      // ignore
    }
  }, [pendingStorageKey, persistPending, resolvedUserId]);

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
        const pendingForDate = Array.from(pendingPayloadRef.current.values()).filter((log) => {
          return log.date === date && log.userId === resolvedUserId;
        });
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
        const pendingForDate = Array.from(pendingPayloadRef.current.values()).filter((log) => {
          return log.date === date && log.userId === resolvedUserId;
        });
        setLogs(pendingForDate);
        if (loadErrorShownRef.current !== date) {
          loadErrorShownRef.current = date;
          showToast('No se pudieron cargar registros. Mostrando datos locales.', 'info');
        }
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
  }, [date, flushPendingWrites, resolvedUserId, restorePending, showToast]);

  const updateExerciseLog = async (log: ExerciseLog) => {
    try {
      const logWithAllFields = {
        ...log,
        userId: log.userId || resolvedUserId,
        date: log.date || date
      };

      if (!logWithAllFields.userId) {
        return;
      }

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
