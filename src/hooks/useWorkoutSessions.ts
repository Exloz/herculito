import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { WorkoutSession, User, ExerciseLog } from '../types';
import { getRoutinePrimaryMuscleGroup } from '../utils/muscleGroups';
import { useRoutines } from './useRoutines';

export const useWorkoutSessions = (user: User) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { routines } = useRoutines(user.id);

  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    // Configurar un timeout para evitar carga infinita
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setSessions([]);
        setLoading(false);
        setError('No se pudieron cargar las sesiones de entrenamiento');
      }
    }, 5000);

    try {
      const sessionsRef = collection(db, 'workoutSessions');
      // Consulta más simple para evitar problemas de índice/permisos
      const q = query(
        sessionsRef,
        where('userId', '==', user.id)
      );

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          try {
            clearTimeout(loadingTimeout);
            const sessionsData = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                startedAt: doc.data().startedAt?.toDate(),
                completedAt: doc.data().completedAt?.toDate()
              }))
              .sort((a, b) => {
                // Ordenamos en el cliente
                const aTime = a.startedAt ? a.startedAt.getTime() : 0;
                const bTime = b.startedAt ? b.startedAt.getTime() : 0;
                return bTime - aTime;
              })
               .slice(0, 30) as WorkoutSession[]; // Limitamos a 30

             setSessions(sessionsData);
            setLoading(false);
            setError(null);
          } catch {
            clearTimeout(loadingTimeout);
            setSessions([]);
            setLoading(false);
            setError('Error al procesar las sesiones');
          }
        },
        () => {
          clearTimeout(loadingTimeout);
          // Si hay error de permisos, simplemente no cargar sesiones pero continuar
          setSessions([]);
          setLoading(false);
          setError('No se pudieron cargar las sesiones (esto es normal si es tu primera vez)');
        }
      );

      return () => {
        clearTimeout(loadingTimeout);
        unsubscribe();
      };
    } catch {
      clearTimeout(loadingTimeout);
      setSessions([]);
      setLoading(false);
      setError('Error de configuración');
    }
  }, [user, loading]);

  const startWorkoutSession = async (routineId: string): Promise<WorkoutSession> => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) {
      throw new Error('Routine not found');
    }

    const session: WorkoutSession = {
      id: `${routineId}_${user.id}_${Date.now()}`,
      userId: user.id,
      routineId,
      routineName: routine.name,
      primaryMuscleGroup: routine.primaryMuscleGroup || getRoutinePrimaryMuscleGroup(routine),
      startedAt: new Date(),
      exercises: []
     };

     await setDoc(doc(db, 'workoutSessions', session.id), {
      ...session,
      startedAt: session.startedAt,
      completedAt: null
     });

     return session;
  };

  const completeWorkoutSession = async (sessionId: string, exercises: ExerciseLog[]) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    const completedAt = new Date();
     const totalDuration = Math.round((completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60)); // en minutos

     await setDoc(doc(db, 'workoutSessions', sessionId), {
      completedAt,
      exercises,
      totalDuration
     }, { merge: true });
  };

  const updateSessionProgress = async (sessionId: string, exercises: ExerciseLog[]) => {
    await setDoc(doc(db, 'workoutSessions', sessionId), {
      exercises,
      lastUpdated: new Date()
    }, { merge: true });
  };

  // Obtener sesiones de los últimos N días
  const getRecentSessions = (days: number = 7): WorkoutSession[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return sessions.filter(session =>
      session.completedAt && session.completedAt >= cutoffDate
    );
  };

  // Obtener estadísticas de entrenamientos
  const getWorkoutStats = () => {
    const completed = sessions.filter(s => s.completedAt);
    const thisWeek = getRecentSessions(7);
    const thisMonth = getRecentSessions(30);

    const stats = {
      totalWorkouts: completed.length,
      thisWeekWorkouts: thisWeek.length,
      thisMonthWorkouts: thisMonth.length,
      currentStreak: calculateWorkoutStreak()
     };

     return stats;
  };

  const calculateWorkoutStreak = (): number => {
    const completedSessions = sessions
      .filter(s => s.completedAt)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());

    if (completedSessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(23, 59, 59, 999); // Final del día actual

    for (const session of completedSessions) {
      const sessionDate = new Date(session.completedAt!);
      sessionDate.setHours(23, 59, 59, 999);

      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 1) { // Hoy o ayer
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  };

  // Obtener los últimos pesos utilizados para cada ejercicio de una rutina específica
  const getLastWeightsForRoutine = (routineId: string): Record<string, number[]> => {
    // Encontrar la sesión más reciente completada de esta rutina
    const lastCompletedSession = sessions
      .filter(s => s.routineId === routineId && s.completedAt && s.exercises && s.exercises.length > 0)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

     if (!lastCompletedSession || !lastCompletedSession.exercises) {
       return {};
     }

    const lastWeights: Record<string, number[]> = {};

    // Extraer los pesos de cada ejercicio de la última sesión
    lastCompletedSession.exercises.forEach(exerciseLog => {
      if (exerciseLog.sets && exerciseLog.sets.length > 0) {
        // Obtener los pesos de todos los sets completados
        const weights = exerciseLog.sets
          .filter(set => set.completed && set.weight > 0)
          .map(set => set.weight);

        if (weights.length > 0) {
          lastWeights[exerciseLog.exerciseId] = weights;
        }
      }
     });

     return lastWeights;
  };

  return {
    sessions,
    loading,
    error,
    startWorkoutSession,
    completeWorkoutSession,
    updateSessionProgress,
    getRecentSessions,
    getWorkoutStats,
    getLastWeightsForRoutine
  };
};