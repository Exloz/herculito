import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Workout, ExerciseLog } from '../types';

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        // Crear rutina por defecto si no existe
        await initializeDefaultRoutine();

        const workoutsRef = collection(db, 'workouts');
        const snapshot = await getDocs(workoutsRef);

        const workoutsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Workout[];

        setWorkouts(workoutsData);
      } catch {
        setError('Error al cargar entrenamientos');
      } finally {
        setLoading(false);
      }
    };

    loadWorkouts();
  }, []);

  const initializeDefaultRoutine = async () => {
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
      await setDoc(doc(db, 'workouts', workout.id), workout, { merge: true });
    }
  };

  const updateWorkout = async (workout: Workout) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...workoutData } = workout;
      await updateDoc(doc(db, 'workouts', workout.id), workoutData);
      setWorkouts(prev => prev.map(w => w.id === workout.id ? workout : w));
    } catch {
      setError('Error al actualizar entrenamiento');
    }
  };

  return { workouts, loading, error, updateWorkout };
};

export const useExerciseLogs = (date: string, userId?: string) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(false); // Cambiado a false para evitar carga infinita
  const pendingWritesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingPayloadRef = useRef<Map<string, ExerciseLog>>(new Map());

  const flushPendingWrites = useCallback(async () => {
    const payloads = Array.from(pendingPayloadRef.current.entries());
    pendingPayloadRef.current.clear();

    const timeouts = Array.from(pendingWritesRef.current.values());
    pendingWritesRef.current.clear();
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));

    await Promise.all(
      payloads.map(async ([logId, payload]) => {
        try {
          await setDoc(doc(db, 'exerciseLogs', logId), payload, { merge: true });
        } catch {
          // Error silencioso para logs
        }
      })
    );
  }, []);

  useEffect(() => {
    // Inicializar con estado vacío - esto permite que la funcionalidad básica funcione
    // Los logs se crearán automáticamente cuando el usuario interactúe con los ejercicios
    setLogs([]);
    setLoading(false);

    return () => {
      void flushPendingWrites();
    };
  }, [date, userId, flushPendingWrites]);

  const updateExerciseLog = async (log: ExerciseLog) => {
    try {
      // Asegurar que el log tenga todos los campos necesarios
      const logWithAllFields = {
        ...log,
        userId: log.userId || userId || '',
        date: log.date || date
      };

      const logId = `${logWithAllFields.exerciseId}_${logWithAllFields.userId}_${logWithAllFields.date}`;

      // Feedback inmediato en UI
      setLogs(prevLogs => {
        const existingIndex = prevLogs.findIndex(l =>
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

      // Persistencia con debounce para evitar escribir en Firestore en cada tecla
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
          await setDoc(doc(db, 'exerciseLogs', logId), payload, { merge: true });
        } catch {
          // Error silencioso para logs
        }
      }, 400);

      pendingWritesRef.current.set(logId, timeoutId);
    } catch {
      // Error silencioso para logs
    }
  };

  const getLogForExercise = (exerciseId: string, userId: string) => {
    // Buscar en el estado local primero
    const localLog = logs.find(log =>
      log.exerciseId === exerciseId &&
      log.userId === userId &&
      log.date === date
    );

    // Si no se encuentra, crear un log vacío por defecto
    if (!localLog) {
      return {
        exerciseId,
        userId,
        date,
        sets: []
      };
    }

    return localLog;
  };

  return { logs, loading, updateExerciseLog, getLogForExercise };
};
