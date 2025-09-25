import { useState, useEffect } from 'react';
import { collection, doc, setDoc, addDoc, updateDoc, onSnapshot, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Routine, WorkoutSession, ExerciseHistory, Exercise } from '../types';

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

    const routinesRef = collection(db, 'routines');
    // Simplificar la consulta para evitar problemas de índice
    const q = query(routinesRef, where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      
      const routinesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Routine[];
      
      // Ordenar en el cliente en lugar de en la consulta
      routinesData.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      setRoutines(routinesData);
      setLoading(false);
      
      // Inicializar rutinas por defecto si no hay ninguna
      if (routinesData.length === 0 && !loading) {
        setTimeout(() => initializeDefaultRoutines(), 100);
      }
    }, (err) => {
      setError('Error al cargar rutinas: ' + err.message);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const createRoutine = async (name: string, description: string, exercises: Exercise[]) => {
    try {
      const routine: Omit<Routine, 'id'> = {
        name,
        description,
        exercises,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const routinesRef = collection(db, 'routines');
      const docRef = await addDoc(routinesRef, routine);
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  };

  const updateRoutine = async (routineId: string, updates: Partial<Routine>) => {
    try {
      const routineRef = doc(db, 'routines', routineId);
      await updateDoc(routineRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (err) {
      setError('Error al actualizar rutina');
      throw err;
    }
  };

  const deleteRoutine = async (routineId: string) => {
    try {
      const routineRef = doc(db, 'routines', routineId);
      await deleteDoc(routineRef);
    } catch (err) {
      setError('Error al eliminar rutina');
      throw err;
    }
  };

  const initializeDefaultRoutines = async () => {
    if (routines.length > 0) return; // Ya hay rutinas
    if (loading) return; // Aún está cargando

    const defaultRoutines = [
      {
        name: 'Pecho y Tríceps',
        description: 'Rutina enfocada en pecho y tríceps',
        exercises: [
          { id: 'bench_press', name: 'Press de Banca', sets: 4, reps: 10, restTime: 120 },
          { id: 'incline_press', name: 'Press Inclinado', sets: 3, reps: 12, restTime: 90 },
          { id: 'tricep_dips', name: 'Fondos de Tríceps', sets: 3, reps: 15, restTime: 60 },
          { id: 'tricep_extension', name: 'Extensión de Tríceps', sets: 3, reps: 12, restTime: 60 }
        ]
      },
      {
        name: 'Espalda y Bíceps',
        description: 'Rutina enfocada en espalda y bíceps',
        exercises: [
          { id: 'deadlift', name: 'Peso Muerto', sets: 4, reps: 8, restTime: 150 },
          { id: 'pull_ups', name: 'Dominadas', sets: 3, reps: 10, restTime: 90 },
          { id: 'barbell_rows', name: 'Remo con Barra', sets: 3, reps: 10, restTime: 90 },
          { id: 'bicep_curls', name: 'Curl de Bíceps', sets: 3, reps: 12, restTime: 60 }
        ]
      },
      {
        name: 'Piernas',
        description: 'Rutina completa de piernas',
        exercises: [
          { id: 'squats', name: 'Sentadillas', sets: 4, reps: 12, restTime: 120 },
          { id: 'lunges', name: 'Zancadas', sets: 3, reps: 15, restTime: 90 },
          { id: 'leg_press', name: 'Prensa de Pierna', sets: 3, reps: 12, restTime: 90 },
          { id: 'leg_curls', name: 'Curl de Pierna', sets: 3, reps: 12, restTime: 60 }
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
        await createRoutine(routine.name, routine.description, routine.exercises);
      }
    } catch (err) {
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

  const startWorkoutSession = async (routine: Routine): Promise<string> => {
    try {
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
    } catch (err) {
      throw err;
    }
  };

  const completeWorkoutSession = async (sessionId: string, exercises: any[], notes?: string) => {
    try {
      const sessionRef = doc(db, 'workoutSessions', sessionId);
      const startTime = sessions.find(s => s.id === sessionId)?.startedAt;
      const duration = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000 / 60) : 0;

      await updateDoc(sessionRef, {
        completedAt: new Date(),
        exercises,
        totalDuration: duration,
        notes: notes || '',
      });
    } catch (err) {
      throw err;
    }
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
      const historyData = snapshot.docs.map(doc => doc.data()) as ExerciseHistory[];
      setHistory(historyData);
    });

    return () => unsubscribe();
  }, [userId]);

  const updateExerciseHistory = async (exerciseId: string, exerciseName: string, weights: number[]) => {
    try {
      const historyId = `${exerciseId}_${userId}`;
      const historyRef = doc(db, 'exerciseHistory', historyId);
      
      const existingHistory = history.find(h => h.exerciseId === exerciseId);
      const personalRecord = Math.max(...weights, existingHistory?.personalRecord || 0);

      await setDoc(historyRef, {
        exerciseId,
        exerciseName,
        userId,
        lastWeight: weights,
        lastDate: new Date().toISOString().split('T')[0],
        personalRecord,
      }, { merge: true });
    } catch (err) {
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
