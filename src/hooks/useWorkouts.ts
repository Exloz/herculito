import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Workout, ExerciseLog, User } from '../types';

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
      } catch (err) {
        setError('Error al cargar entrenamientos');
        console.error(err);
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
      await updateDoc(doc(db, 'workouts', workout.id), workout);
      setWorkouts(prev => prev.map(w => w.id === workout.id ? workout : w));
    } catch (err) {
      setError('Error al actualizar entrenamiento');
      console.error(err);
    }
  };

  return { workouts, loading, error, updateWorkout };
};

export const useExerciseLogs = (date: string) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = collection(db, 'exerciseLogs');
    const q = query(logsRef, where('date', '==', date));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ExerciseLog[];
      
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date]);

  const updateExerciseLog = async (log: ExerciseLog) => {
    try {
      const logId = `${log.exerciseId}_${log.userId}_${log.date}`;
      await setDoc(doc(db, 'exerciseLogs', logId), log, { merge: true });
    } catch (err) {
      console.error('Error al actualizar log:', err);
    }
  };

  const getLogForExercise = (exerciseId: string, userId: 'A' | 'B') => {
    return logs.find(log => log.exerciseId === exerciseId && log.userId === userId);
  };

  return { logs, loading, updateExerciseLog, getLogForExercise };
};