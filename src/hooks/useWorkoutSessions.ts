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

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, (month || 1) - 1, day || 1);
};

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getCompletedSessionDayKeys = (sessions: WorkoutSession[]): string[] => {
  const uniqueDays = new Set<string>();
  sessions.forEach((session) => {
    if (!session.completedAt) return;
    uniqueDays.add(toDateKey(session.completedAt));
  });

  return Array.from(uniqueDays).sort();
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

  const getThisWeekSessions = useCallback((): WorkoutSession[] => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    return sessions.filter((session) =>
      session.completedAt && session.completedAt >= startOfWeek
    );
  }, [sessions]);

  const getThisMonthSessions = useCallback((): WorkoutSession[] => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    return sessions.filter((session) =>
      session.completedAt && session.completedAt >= startOfMonth
    );
  }, [sessions]);

  const calculateWorkoutStreak = useCallback((): number => {
    const completedDays = getCompletedSessionDayKeys(sessions);
    if (completedDays.length === 0) return 0;

    const completedDaysSet = new Set(completedDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = addDays(today, -1);
    const todayKey = toDateKey(today);
    const yesterdayKey = toDateKey(yesterday);

    let anchorDate: Date | null = null;
    if (completedDaysSet.has(todayKey)) {
      anchorDate = today;
    } else if (completedDaysSet.has(yesterdayKey)) {
      anchorDate = yesterday;
    } else {
      return 0;
    }

    let streak = 0;
    let cursor = anchorDate;
    while (completedDaysSet.has(toDateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    return streak;
  }, [sessions]);

  const calculateLongestWorkoutStreak = useCallback((): number => {
    const completedDays = getCompletedSessionDayKeys(sessions);
    if (completedDays.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let index = 1; index < completedDays.length; index += 1) {
      const previousDate = parseDateKey(completedDays[index - 1]);
      const expectedNextDayKey = toDateKey(addDays(previousDate, 1));

      if (completedDays[index] === expectedNextDayKey) {
        currentStreak += 1;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  }, [sessions]);

  const getWorkoutStats = useCallback(() => {
    const completed = sessions.filter((s) => s.completedAt);
    const thisWeek = getThisWeekSessions();
    const thisMonth = getThisMonthSessions();

    return {
      totalWorkouts: completed.length,
      thisWeekWorkouts: thisWeek.length,
      thisMonthWorkouts: thisMonth.length,
      currentStreak: calculateWorkoutStreak(),
      longestStreak: calculateLongestWorkoutStreak()
    };
  }, [sessions, getThisWeekSessions, getThisMonthSessions, calculateWorkoutStreak, calculateLongestWorkoutStreak]);

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
