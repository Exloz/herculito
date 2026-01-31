import { useState, useEffect, useCallback } from 'react';
import { Routine, WorkoutSession, User, ExerciseLog } from '../types';
import { getRoutinePrimaryMuscleGroup } from '../utils/muscleGroups';
import {
  fetchSessions,
  startSession as apiStartSession,
  completeSession as apiCompleteSession,
  updateSessionProgress as apiUpdateSessionProgress,
  type WorkoutSessionResponse
} from '../utils/dataApi';

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe?.toDate === 'function') return maybe.toDate();
  return undefined;
};

const mapSession = (session: WorkoutSessionResponse): WorkoutSession => {
  return {
    ...session,
    startedAt: toDate(session.startedAt) ?? new Date(),
    completedAt: toDate(session.completedAt)
  } as WorkoutSession;
};

export const useWorkoutSessions = (user: User) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadingTimeout = setTimeout(() => {
      setSessions([]);
      setLoading(false);
      setError('No se pudieron cargar las sesiones de entrenamiento');
    }, 5000);

    const loadSessions = async () => {
      try {
        const data = await fetchSessions();
        clearTimeout(loadingTimeout);
        const mapped = data.map(mapSession);
        const ordered = mapped
          .sort((a, b) => {
            const aTime = a.startedAt ? a.startedAt.getTime() : 0;
            const bTime = b.startedAt ? b.startedAt.getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 500);
        setSessions(ordered);
        setLoading(false);
        setError(null);
      } catch {
        clearTimeout(loadingTimeout);
        setSessions([]);
        setLoading(false);
        setError('No se pudieron cargar las sesiones (esto es normal si es tu primera vez)');
      }
    };

    void loadSessions();
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [user.id]);

  const startWorkoutSession = useCallback(async (routine: Routine): Promise<WorkoutSession> => {
    const sessionId = `${routine.id}_${user.id}_${Date.now()}`;
    const session = await apiStartSession({
      id: sessionId,
      routineId: routine.id,
      routineName: routine.name,
      primaryMuscleGroup: routine.primaryMuscleGroup || getRoutinePrimaryMuscleGroup(routine),
      startedAt: Date.now()
    });

    const mapped = mapSession(session);
    setSessions((prev) => [mapped, ...prev]);
    return mapped;
  }, [user.id]);

  const completeWorkoutSession = useCallback(async (sessionId: string, exercises: ExerciseLog[]) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    const completedAt = new Date();
    const totalDuration = Math.round((completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60));

    await apiCompleteSession(sessionId, exercises, completedAt.getTime(), totalDuration);
    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId
          ? { ...item, completedAt, exercises, totalDuration }
          : item
      )
    );
  }, [sessions]);

  const updateSessionProgress = useCallback(async (sessionId: string, exercises: ExerciseLog[]) => {
    await apiUpdateSessionProgress(sessionId, exercises);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, exercises }
          : session
      )
    );
  }, []);

  const getRecentSessions = useCallback((days: number = 7): WorkoutSession[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return sessions.filter((session) =>
      session.completedAt && session.completedAt >= cutoffDate
    );
  }, [sessions]);

  const calculateWorkoutStreak = useCallback((): number => {
    const completedSessions = sessions
      .filter((s) => s.completedAt)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());

    if (completedSessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(23, 59, 59, 999);

    for (const session of completedSessions) {
      const sessionDate = new Date(session.completedAt!);
      sessionDate.setHours(23, 59, 59, 999);

      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }, [sessions]);

  const getWorkoutStats = useCallback(() => {
    const completed = sessions.filter((s) => s.completedAt);
    const thisWeek = getRecentSessions(7);
    const thisMonth = getRecentSessions(30);

    return {
      totalWorkouts: completed.length,
      thisWeekWorkouts: thisWeek.length,
      thisMonthWorkouts: thisMonth.length,
      currentStreak: calculateWorkoutStreak()
    };
  }, [sessions, getRecentSessions, calculateWorkoutStreak]);

  const getLastWeightsForRoutine = useCallback((routineId: string): Record<string, number[]> => {
    const lastCompletedSession = sessions
      .filter((s) => s.routineId === routineId && s.completedAt && s.exercises && s.exercises.length > 0)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

    if (!lastCompletedSession || !lastCompletedSession.exercises) {
      return {};
    }

    const lastWeights: Record<string, number[]> = {};

    (lastCompletedSession.exercises as ExerciseLog[]).forEach((exerciseLog) => {
      if (exerciseLog.sets && exerciseLog.sets.length > 0) {
        const weights = exerciseLog.sets
          .filter((set) => set.completed && set.weight > 0)
          .map((set) => set.weight);

        if (weights.length > 0) {
          lastWeights[exerciseLog.exerciseId] = weights;
        }
      }
    });

    return lastWeights;
  }, [sessions]);

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
