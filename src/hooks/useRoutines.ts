import { useState, useEffect } from 'react';
import { collection, doc, setDoc, addDoc, updateDoc, onSnapshot, query, where, orderBy, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Routine, WorkoutSession, ExerciseHistory, Exercise, MuscleGroup } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';

export const useRoutines = (userId: string) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Obtener todas las rutinas (sin filtros de Firebase para evitar problemas de índices)
    const routinesRef = collection(db, 'routines');
    const q = query(routinesRef);

    const unsubscribeRoutines = onSnapshot(q, (snapshot) => {
      const allRoutinesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      }) as Routine[];

      // Filtrar rutinas: para compatibilidad con rutinas existentes
      const filteredRoutines = allRoutinesData.filter(routine => {
        // Si la rutina no tiene la propiedad isPublic (rutinas viejas), la consideramos pública
        const isPublicRoutine = routine.isPublic !== false; // true si es undefined o true

        // Si la rutina no tiene createdBy (rutinas viejas), asumimos que es del usuario actual
        // También incluir si tiene userId (rutinas viejas) que coincida con el usuario actual
        const isUserRoutine = !routine.createdBy || routine.createdBy === userId || routine.userId === userId;

        const shouldShow = isPublicRoutine || isUserRoutine;

        return shouldShow;
      });

      // Ordenar: primero las del usuario, luego por fecha
      filteredRoutines.sort((a, b) => {
        // Priorizar las del usuario actual (incluyendo rutinas sin createdBy o con userId)
        const aIsUser = !a.createdBy || a.createdBy === userId || a.userId === userId;
        const bIsUser = !b.createdBy || b.createdBy === userId || b.userId === userId;

        if (aIsUser && !bIsUser) return -1;
        if (bIsUser && !aIsUser) return 1;

        // Luego por fecha de creación
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setRoutines(filteredRoutines);
      setLoading(false);

      // Inicializar rutinas por defecto si el usuario no tiene ninguna propia
      const userRoutines = filteredRoutines.filter(r =>
        !r.createdBy || r.createdBy === userId || r.userId === userId
      );
      if (userRoutines.length === 0 && !loading) {
        setTimeout(() => initializeDefaultRoutines(), 100);
      }
    }, (err) => {
      setError('Error al cargar rutinas: ' + err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeRoutines();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const createRoutine = async (name: string, description: string, exercises: Exercise[], isPublic: boolean = true, primaryMuscleGroup?: MuscleGroup, createdByName?: string) => {
    const routine: Omit<Routine, 'id'> = {
      name,
      description,
      exercises,
      createdBy: userId,
      createdByName: createdByName || 'Usuario',
      isPublic,
      timesUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      primaryMuscleGroup
    };

    const routinesRef = collection(db, 'routines');
    const docRef = await addDoc(routinesRef, routine);

    return docRef.id;
  };

  const updateRoutine = async (routineId: string, updates: Partial<Routine>) => {
    const routineRef = doc(db, 'routines', routineId);
    await updateDoc(routineRef, {
      ...updates,
      updatedAt: new Date(),
    });
  };

  const deleteRoutine = async (routineId: string) => {
    const routineRef = doc(db, 'routines', routineId);
    await deleteDoc(routineRef);
  };

  // Función para incrementar el contador de uso cuando alguien ejecuta una rutina
  const incrementRoutineUsage = async (routineId: string) => {
    const routineRef = doc(db, 'routines', routineId);
    await updateDoc(routineRef, {
      timesUsed: increment(1)
    });
  };

  // Verificar si el usuario actual es el creador de la rutina
  const canEditRoutine = (routine: Routine): boolean => {
    // Si no tiene createdBy (rutinas viejas), verificar userId o asumimos que es del usuario actual
    return !routine.createdBy || routine.createdBy === userId || routine.userId === userId;
  };

  // Obtener rutinas públicas vs propias
  const getPublicRoutines = (): Routine[] => {
    return routines.filter(r => {
      const isPublic = r.isPublic !== false; // true si es undefined o true
      const isFromOtherUser = r.createdBy && r.createdBy !== userId && r.userId !== userId;
      return isPublic && isFromOtherUser;
    });
  };

  const getUserRoutines = (): Routine[] => {
    return routines.filter(r =>
      !r.createdBy || r.createdBy === userId || r.userId === userId
    );
  };

  const initializeDefaultRoutines = async () => {
    if (routines.length > 0) return; // Ya hay rutinas
    if (loading) return; // Aún está cargando

    const defaultRoutines = [
      {
        name: 'Pecho y Tríceps',
        description: 'Rutina enfocada en pecho y tríceps',
        exercises: [
          { id: 'bench_press', name: 'Press de Banca', sets: 4, reps: 8, restTime: 180 },
          { id: 'incline_press', name: 'Press Inclinado', sets: 3, reps: 10, restTime: 120 },
          { id: 'flyes', name: 'Aperturas con Mancuernas', sets: 3, reps: 12, restTime: 90 },
          { id: 'tricep_dips', name: 'Fondos en Paralelas', sets: 3, reps: 12, restTime: 90 },
          { id: 'tricep_extension', name: 'Extensión de Tríceps', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        name: 'Espalda y Bíceps',
        description: 'Rutina enfocada en espalda y bíceps',
        exercises: [
          { id: 'pull_ups', name: 'Dominadas', sets: 4, reps: 8, restTime: 180 },
          { id: 'barbell_rows', name: 'Remo con Barra', sets: 4, reps: 10, restTime: 120 },
          { id: 'lat_pulldown', name: 'Jalones al Pecho', sets: 3, reps: 12, restTime: 90 },
          { id: 'bicep_curls', name: 'Curl de Bíceps', sets: 3, reps: 12, restTime: 90 },
          { id: 'hammer_curls', name: 'Curl Martillo', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        name: 'Piernas',
        description: 'Rutina completa de piernas',
        exercises: [
          { id: 'squats', name: 'Sentadillas', sets: 4, reps: 10, restTime: 180 },
          { id: 'deadlifts', name: 'Peso Muerto', sets: 4, reps: 8, restTime: 180 },
          { id: 'leg_press', name: 'Prensa de Piernas', sets: 3, reps: 15, restTime: 120 },
          { id: 'leg_curls', name: 'Curl de Femorales', sets: 3, reps: 12, restTime: 90 },
          { id: 'calf_raises', name: 'Elevación de Gemelos', sets: 4, reps: 20, restTime: 60 }
        ]
      },
      {
        name: 'Hombros',
        description: 'Rutina enfocada en hombros',
        exercises: [
          { id: 'overhead_press', name: 'Press Militar', sets: 4, reps: 10, restTime: 120 },
          { id: 'lateral_raises', name: 'Elevaciones Laterales', sets: 3, reps: 15, restTime: 60 },
          { id: 'rear_delt_fly', name: 'Vuelos Posteriores', sets: 3, reps: 15, restTime: 60 },
          { id: 'upright_rows', name: 'Remo al Mentón', sets: 3, reps: 12, restTime: 60 }
        ]
      }
    ];

    try {
      for (const routine of defaultRoutines) {
        await createRoutine(routine.name, routine.description, routine.exercises, true, undefined, 'Sistema'); // Públicas por defecto
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

export const useWorkoutSessions = (userId: string) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const sessionsRef = collection(db, 'workoutSessions');
    const q = query(sessionsRef, where('userId', '==', userId), orderBy('startedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as WorkoutSession[];

      setSessions(sessionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const startWorkoutSession = async (routine: Routine) => {
    const session: Omit<WorkoutSession, 'id'> = {
      routineId: routine.id,
      routineName: routine.name,
      userId,
      startedAt: new Date(),
      exercises: [],
    };

    const docRef = doc(collection(db, 'workoutSessions'));
    await setDoc(docRef, session);
    return docRef.id;
  };

  const completeWorkoutSession = async (sessionId: string, exercises: Exercise[], notes?: string) => {
    const sessionRef = doc(db, 'workoutSessions', sessionId);
    const startTime = sessions.find(s => s.id === sessionId)?.startedAt;
    const duration = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000 / 60) : 0;

    await updateDoc(sessionRef, {
      completedAt: new Date(),
      exercises,
      totalDuration: duration,
      notes: notes || '',
    });
  };

  return {
    sessions,
    loading,
    startWorkoutSession,
    completeWorkoutSession
  };
};

export const useExerciseHistory = (userId: string) => {
  const [history, setHistory] = useState<ExerciseHistory[]>([]);

  useEffect(() => {
    if (!userId) return;

    const historyRef = collection(db, 'exerciseHistory');
    const q = query(historyRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as ExerciseHistory[];

      setHistory(historyData);
    });

    return () => unsubscribe();
  }, [userId]);

  const updateExerciseHistory = async (
    exerciseId: string,
    exerciseName: string,
    weights: number[],
    personalRecord: number
  ) => {
    try {
      const historyRef = doc(db, 'exerciseHistory', `${exerciseId}_${userId}`);
      await setDoc(historyRef, {
        exerciseId,
        exerciseName,
        userId,
        lastWeight: weights,
        lastDate: getCurrentDateString(),
        personalRecord,
      }, { merge: true });
    } catch {
      // Error silenciado para historial de ejercicios
    }
  };

  const getExerciseHistory = (exerciseId: string): ExerciseHistory | undefined => {
    return history.find(h => h.exerciseId === exerciseId);
  };

  return {
    history,
    updateExerciseHistory,
    getExerciseHistory
  };
};