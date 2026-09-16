import { useState, useEffect, useCallback } from 'react';
import { WorkoutSession, User } from '../../../shared/types';
import { fetchWorkoutSessions } from '../api/workoutSessionsRemote';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { getLastWeightsForRoutineFromSessions } from '../lib/workoutSessions';

const SESSION_SUMMARY_LIMIT = 500;
const SESSION_DETAILS_LIMIT = 200;

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
        const data = await fetchWorkoutSessions({ limit: SESSION_SUMMARY_LIMIT, includeExercises: false });
        clearTimeout(loadingTimeout);
        setSessions(data);
        setLoading(false);
        setError(null);

        void fetchWorkoutSessions({
          limit: SESSION_DETAILS_LIMIT,
          includeExercises: true,
          completedOnly: true
        }).then((detailedData) => {
          const detailedSessions = detailedData;
          setSessions((previous) => {
            const detailsById = new Map(detailedSessions.map((session) => [session.id, session]));
            return previous.map((session) => {
              const detailed = detailsById.get(session.id);
              return detailed ? { ...session, exercises: detailed.exercises } : session;
            });
          });
        }).catch(() => {
          // ignore detail hydration failures; summary sessions already loaded
        });
      } catch (error) {
        clearTimeout(loadingTimeout);
        setSessions([]);
        setLoading(false);
        setError(toUserMessage(error, 'No se pudieron cargar las sesiones (esto es normal si es tu primera vez)'));
      }
    };

    void loadSessions();
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [user.id]);

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
    return getLastWeightsForRoutineFromSessions(sessions, routineId);
  }, [sessions]);

  return {
    sessions,
    loading,
    error,
    getRecentSessions,
    getWorkoutStats,
    getLastWeightsForRoutine
  };
};
