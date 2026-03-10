import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity,
  Award,
  Bell,
  Calendar,
  Clock,
  Crown,
  Dumbbell,
  Flame,
  LogOut,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  X
} from 'lucide-react';
import { User, MuscleGroup, WorkoutSession, Routine, ExerciseLog, LeaderboardEntry } from '../../../shared/types';
import {
  completeSession as apiCompleteSession,
  incrementRoutineUsage as apiIncrementRoutineUsage,
  startSession as apiStartSession,
  updateRoutine as apiUpdateRoutine,
  updateSessionProgress as apiUpdateSessionProgress
} from '../../../shared/api/dataApi';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';
import { MuscleGroupDashboard } from '../components/MuscleGroupDashboard';
import { ActiveWorkout } from '../../workouts/components/ActiveWorkout';
import { useDashboardData } from '../hooks/useDashboardData';
import { getRecommendedMuscleGroup, MUSCLE_GROUPS } from '../lib/muscleGroups';
import { useUI } from '../../../app/providers/ui-context';
import {
  formatDateForDisplay,
  formatDateInAppTimeZone,
  getDateStringInAppTimeZone
} from '../../../shared/lib/dateUtils';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { useDialogA11y } from '../../../shared/hooks/useDialogA11y';
import { version as appVersion } from '../../../../package.json';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onReadyForBackgroundPreload?: () => void;
}

const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const ACTIVE_WORKOUT_PROGRESS_KEY = 'activeWorkoutProgress';
const IOS_NOTIFICATION_GUIDE_KEY = 'iosNotificationGuideSeen';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms
const CLERK_USER_BUTTON_DELAY_MS = 1800;
const CALENDAR_PANEL_DELAY_MS = 700;
const PROGRESS_PANEL_DELAY_MS = 1400;

const DeferredClerkUserButton = lazy(() => import('../../auth/components/ClerkUserButton'));
const DeferredWorkoutCalendar = lazy(() => import('../components/WorkoutCalendar').then((module) => ({ default: module.WorkoutCalendar })));
const DeferredExerciseProgressPanel = lazy(() => import('../components/ExerciseProgressPanel').then((module) => ({ default: module.ExerciseProgressPanel })));

const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIPadOS;
};

const isExerciseLogCompleted = (sets: ExerciseLog['sets'], expectedSets: number): boolean => {
  if (expectedSets <= 0) return false;

  const completionBySetNumber = new Map<number, boolean>();
  (sets ?? []).forEach((set) => {
    const setNumber = Number(set.setNumber);
    if (!Number.isInteger(setNumber)) return;
    if (setNumber < 1 || setNumber > expectedSets) return;
    completionBySetNumber.set(setNumber, set.completed === true);
  });

  for (let setNumber = 1; setNumber <= expectedSets; setNumber += 1) {
    if (completionBySetNumber.get(setNumber) !== true) {
      return false;
    }
  }

  return true;
};

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
  return undefined;
};

const getUserInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'H';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || 'H';
};

const capitalize = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDurationValue = (minutes: number | undefined): string => {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return '--';

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  }

  return `${minutes} min`;
};

const getRelativeSessionDateLabel = (date: Date): string => {
  return capitalize(formatDateForDisplay(getDateStringInAppTimeZone(date)));
};

const getCompetitionInsight = (
  leader: LeaderboardEntry | null,
  rank: LeaderboardEntry | null,
  periodLabel: string
): string => {
  if (!leader) {
    return `Aun no hay un lider claro en ${periodLabel}.`;
  }

  if (!rank) {
    return `Registra una sesion para entrar al ranking de ${periodLabel}.`;
  }

  if (rank.position === 1) {
    return `Vas liderando ${periodLabel}. Manten el ritmo.`;
  }

  const gap = Math.max(leader.totalWorkouts - rank.totalWorkouts, 0);
  if (gap === 0) {
    return `Estas empatado con el lider de ${periodLabel}.`;
  }

  return `Te faltan ${gap} entrenamiento${gap === 1 ? '' : 's'} para alcanzar al lider de ${periodLabel}.`;
};

const formatCalendarPanelDate = (dateString: string): string => {
  const date = new Date(`${dateString}T12:00:00`);

  return capitalize(date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }));
};

const PanelSkeleton = ({ heightClass, title }: { heightClass: string; title: string }) => {
  return (
    <div className="app-card p-4 sm:p-5" aria-hidden="true">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{title}</div>
        </div>
        <div className="skeleton-block h-4 w-14 rounded-lg" />
      </div>
      <div className={`skeleton-block w-full rounded-2xl ${heightClass}`} />
    </div>
  );
};

const saveActiveWorkoutToStorage = (activeWorkout: { routine: Routine; session: WorkoutSession } | null) => {
  if (activeWorkout) {
    const data = {
      ...activeWorkout,
      timestamp: Date.now(),
    };
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('active-workout-changed'));
  }
};

const loadActiveWorkoutFromStorage = (): { routine: Routine; session: WorkoutSession } | null => {
  const stored = localStorage.getItem(ACTIVE_WORKOUT_KEY);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    const now = Date.now();
    if (now - data.timestamp > EXPIRATION_TIME) {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
      return null;
    }

    if (!data?.session?.id || !data?.routine) {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
      return null;
    }

    const routine = data.routine as Routine;
    const session = data.session as WorkoutSession;

    routine.createdAt = toDate((routine as unknown as { createdAt?: unknown }).createdAt) ?? new Date(0);
    routine.updatedAt = toDate((routine as unknown as { updatedAt?: unknown }).updatedAt) ?? new Date(0);

    session.startedAt = toDate((session as unknown as { startedAt?: unknown }).startedAt) ?? new Date(0);
    session.completedAt = toDate((session as unknown as { completedAt?: unknown }).completedAt);

    return { routine, session };
  } catch {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    return null;
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onReadyForBackgroundPreload }) => {
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [showCalendar, setShowCalendar] = useState(true);
  const [activeWorkout, setActiveWorkout] = useState<{
    routine: Routine;
    session: WorkoutSession;
  } | null>(null);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showIosNotificationGuide, setShowIosNotificationGuide] = useState(false);
  const [showClerkUserButton, setShowClerkUserButton] = useState(false);
  const [showDeferredCalendar, setShowDeferredCalendar] = useState(false);
  const [showDeferredProgressPanel, setShowDeferredProgressPanel] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const hasTriggeredBackgroundPreload = useRef(false);
  const calendarDrawerRef = useRef<HTMLDivElement | null>(null);
  const { showToast, confirm } = useUI();


  // Restore active workout from localStorage on mount
  useEffect(() => {
    const checkAndResume = () => {
      const stored = loadActiveWorkoutFromStorage();
      if (stored) {
        setActiveWorkout(stored);
        
        const forceOpen = localStorage.getItem('activeWorkoutForceOpen');
        if (forceOpen === 'true') {
          setShowActiveWorkout(true);
          localStorage.removeItem('activeWorkoutForceOpen');
        } else {
          setShowActiveWorkout(false);
        }
      }
    };

    checkAndResume();

    const handleResumeEvent = () => {
      const stored = loadActiveWorkoutFromStorage();
      if (stored) {
        setActiveWorkout(stored);
        setShowActiveWorkout(true);
      }
      localStorage.removeItem('activeWorkoutForceOpen');
    };

    window.addEventListener('resume-active-workout', handleResumeEvent);
    return () => window.removeEventListener('resume-active-workout', handleResumeEvent);
  }, []);

  useEffect(() => {
    if (!isIOSDevice()) return;
    try {
      const seen = localStorage.getItem(IOS_NOTIFICATION_GUIDE_KEY);
      if (!seen) {
        localStorage.setItem(IOS_NOTIFICATION_GUIDE_KEY, 'true');
        setShowIosNotificationGuide(true);
      }
    } catch {
      setShowIosNotificationGuide(false);
    }
  }, []);

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refresh
  } = useDashboardData(user.id, user.name);
  const showDashboardSkeleton = useDelayedLoading(dashboardLoading, 180);

  const dashboardRoutines = useMemo(() => dashboardData?.dashboardRoutines ?? [], [dashboardData]);
  const recentSessions = useMemo(() => dashboardData?.recentSessions ?? [], [dashboardData]);
  const stats = dashboardData?.summary ?? {
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    thisMonthWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageDurationMin: 0
  };
  const competitionStats = dashboardData?.competition ?? {
    weekLeader: null,
    monthLeader: null,
    userWeekRank: null,
    userMonthRank: null
  };
  const weeklyGoal = 4;
  const weeklyProgress = Math.min(stats.thisWeekWorkouts / weeklyGoal, 1);

  const recommendedGroup = useMemo(() => {
    return getRecommendedMuscleGroup(
      recentSessions.map((session) => ({
        id: session.id,
        routineId: session.routineId ?? '',
        routineName: session.routineName,
        userId: user.id,
        startedAt: session.completedAt,
        completedAt: session.completedAt,
        exercises: [],
        totalDuration: session.totalDuration,
        primaryMuscleGroup: session.primaryMuscleGroup
      }))
    );
  }, [recentSessions, user.id]);
  const recommendedGroupInfo = recommendedGroup ? MUSCLE_GROUPS[recommendedGroup] : null;

  const heroInsight = useMemo(() => {
    if (recentSessions.length === 0) {
      return 'Tu dashboard esta listo para arrancar. Activa una rutina y empieza a construir tu historial con mas contexto visual.';
    }

    if (stats.thisWeekWorkouts >= weeklyGoal) {
      return 'Ya cumpliste tu meta semanal. Aprovecha el impulso para consolidar tecnica, volumen y recuperacion.';
    }

    if (stats.currentStreak >= 5) {
      return `Vienes con ${stats.currentStreak} dias seguidos. Este es un gran momento para sostener consistencia sin perder calidad.`;
    }

    if (recommendedGroupInfo) {
      return `Tu historial reciente sugiere enfocarte en ${recommendedGroupInfo.name.toLowerCase()}. El tablero ahora te ayuda a verlo mas rapido.`;
    }

    return 'Aqui tienes una lectura mas clara de tu actividad, tu frecuencia y el impulso de las ultimas sesiones.';
  }, [recommendedGroupInfo, recentSessions.length, stats.currentStreak, stats.thisWeekWorkouts, weeklyGoal]);

  const weeklyGoalCopy = useMemo(() => {
    const remaining = Math.max(weeklyGoal - stats.thisWeekWorkouts, 0);

    if (remaining === 0) {
      return 'Meta semanal cumplida';
    }

    return `Te faltan ${remaining} entrenamiento${remaining === 1 ? '' : 's'} para completar ${weeklyGoal}`;
  }, [stats.thisWeekWorkouts, weeklyGoal]);

  const overviewCards = useMemo(() => {
    return [
      {
        title: 'Total acumulado',
        value: String(stats.totalWorkouts),
        subtitle: 'Historial completo',
        Icon: Award,
        iconTone: 'bg-amberGlow/15 text-amberGlow'
      },
      {
        title: 'Esta semana',
        value: String(stats.thisWeekWorkouts),
        subtitle: `${Math.round(weeklyProgress * 100)}% de la meta`,
        Icon: Target,
        iconTone: 'bg-mint/15 text-mint'
      },
      {
        title: 'Racha actual',
        value: String(stats.currentStreak),
        subtitle: `Mejor marca: ${stats.longestStreak} dias`,
        Icon: Flame,
        iconTone: 'bg-amberGlow/15 text-amberGlow'
      },
      {
        title: 'Este mes',
        value: String(stats.thisMonthWorkouts),
        subtitle: 'Volumen del mes',
        Icon: Dumbbell,
        iconTone: 'bg-sky-400/15 text-sky-300'
      },
      {
        title: 'Duracion media',
        value: formatDurationValue(stats.averageDurationMin),
        subtitle: 'Promedio por sesion',
        Icon: Activity,
        iconTone: 'bg-white/10 text-slate-100'
      }
    ];
  }, [stats.averageDurationMin, stats.currentStreak, stats.longestStreak, stats.thisMonthWorkouts, stats.thisWeekWorkouts, stats.totalWorkouts, weeklyProgress]);

  const competitionPanels = useMemo(() => {
    return [
      {
        title: 'Top semanal',
        leader: competitionStats.weekLeader,
        rank: competitionStats.userWeekRank,
        emptyLabel: 'Sin datos suficientes esta semana',
        insight: getCompetitionInsight(competitionStats.weekLeader, competitionStats.userWeekRank, 'esta semana'),
        accentTone: 'from-mint/20 to-transparent'
      },
      {
        title: 'Top mensual',
        leader: competitionStats.monthLeader,
        rank: competitionStats.userMonthRank,
        emptyLabel: 'Sin datos suficientes este mes',
        insight: getCompetitionInsight(competitionStats.monthLeader, competitionStats.userMonthRank, 'este mes'),
        accentTone: 'from-amberGlow/20 to-transparent'
      }
    ];
  }, [competitionStats.monthLeader, competitionStats.userMonthRank, competitionStats.userWeekRank, competitionStats.weekLeader]);

  const recentSessionsMeta = useMemo(() => {
    const visibleSessions = recentSessions.slice(0, 5);
    const durations = visibleSessions
      .map((session) => session.totalDuration)
      .filter((duration): duration is number => typeof duration === 'number' && Number.isFinite(duration) && duration > 0);
    const averageRecentDuration = durations.length > 0
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      : null;
    const groupCounts = new Map<MuscleGroup, number>();

    visibleSessions.forEach((session) => {
      const group = session.primaryMuscleGroup ?? 'fullbody';
      groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    });

    const topGroup = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      visibleSessions,
      averageRecentDuration,
      topGroupInfo: topGroup ? MUSCLE_GROUPS[topGroup] : null,
      latestSessionLabel: visibleSessions[0] ? getRelativeSessionDateLabel(visibleSessions[0].completedAt) : null
    };
  }, [recentSessions]);

  const selectedCalendarDay = useMemo(() => {
    if (!selectedCalendarDate) return null;

    return dashboardData?.calendar.find((day) => day.date === selectedCalendarDate) ?? {
      date: selectedCalendarDate,
      workouts: []
    };
  }, [dashboardData, selectedCalendarDate]);

  const selectedCalendarDayLabel = selectedCalendarDay
    ? formatCalendarPanelDate(selectedCalendarDay.date)
    : '';

  const handleCloseCalendarDrawer = useCallback(() => {
    setSelectedCalendarDate(null);
  }, []);

  useDialogA11y(calendarDrawerRef, {
    enabled: selectedCalendarDate !== null,
    onClose: handleCloseCalendarDrawer
  });

  useEffect(() => {
    if (showClerkUserButton) {
      return;
    }

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const revealClerkUserButton = () => {
      setShowClerkUserButton(true);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(revealClerkUserButton, { timeout: CLERK_USER_BUTTON_DELAY_MS });
    } else {
      timeoutId = setTimeout(revealClerkUserButton, CLERK_USER_BUTTON_DELAY_MS);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [showClerkUserButton]);

  useEffect(() => {
    if (!dashboardData || dashboardLoading || hasTriggeredBackgroundPreload.current) {
      return;
    }

    hasTriggeredBackgroundPreload.current = true;
    onReadyForBackgroundPreload?.();
  }, [dashboardData, dashboardLoading, onReadyForBackgroundPreload]);

  useEffect(() => {
    if (!dashboardData) {
      setShowDeferredCalendar(false);
      setShowDeferredProgressPanel(false);
      return;
    }

    let calendarTimeoutId: number | null = null;
    let progressTimeoutId: number | null = null;
    let calendarIdleId: number | null = null;
    let progressIdleId: number | null = null;

    const revealCalendar = () => setShowDeferredCalendar(true);
    const revealProgress = () => setShowDeferredProgressPanel(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      calendarIdleId = window.requestIdleCallback(revealCalendar, { timeout: CALENDAR_PANEL_DELAY_MS });
      progressIdleId = window.requestIdleCallback(revealProgress, { timeout: PROGRESS_PANEL_DELAY_MS });
    } else {
      calendarTimeoutId = setTimeout(revealCalendar, CALENDAR_PANEL_DELAY_MS);
      progressTimeoutId = setTimeout(revealProgress, PROGRESS_PANEL_DELAY_MS);
    }

    return () => {
      if (calendarIdleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(calendarIdleId);
      }
      if (progressIdleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(progressIdleId);
      }
      if (calendarTimeoutId !== null) {
        window.clearTimeout(calendarTimeoutId);
      }
      if (progressTimeoutId !== null) {
        window.clearTimeout(progressTimeoutId);
      }
    };
  }, [dashboardData]);

  const formatPosition = (entry: LeaderboardEntry | null): string => {
    if (!entry) return 'Sin ranking';
    return `#${entry.position}`;
  };

  const userInitials = useMemo(() => getUserInitials(user.name || 'Usuario'), [user.name]);

  const handleStartWorkout = useCallback(async (routineId: string) => {
    try {
      const routine = dashboardRoutines.find((entry) => entry.id === routineId);

      if (routine) {
        const sessionResponse = await apiStartSession({
          id: `${routine.id}_${user.id}_${Date.now()}`,
          routineId: routine.id,
          routineName: routine.name,
          primaryMuscleGroup: routine.primaryMuscleGroup,
          startedAt: Date.now()
        });
        const session: WorkoutSession = {
          ...sessionResponse,
          startedAt: toDate(sessionResponse.startedAt) ?? new Date(),
          completedAt: toDate(sessionResponse.completedAt),
          exercises: sessionResponse.exercises
        };
        const newActiveWorkout = { routine, session };
        setActiveWorkout(newActiveWorkout);
        setShowActiveWorkout(true);
        saveActiveWorkoutToStorage(newActiveWorkout);
      } else {
        showToast('Rutina no encontrada', 'error');
      }
    } catch (error) {
      showToast(toUserMessage(error, 'Error al iniciar el entrenamiento. Intentalo de nuevo.'), 'error');
    }
  }, [dashboardRoutines, showToast, user.id]);

  const handleRoutineMuscleGroupChange = useCallback(async (routineId: string, newMuscleGroup: MuscleGroup) => {
    try {
      await apiUpdateRoutine(routineId, { primaryMuscleGroup: newMuscleGroup });
      await refresh();
    } catch (error) {
      showToast(toUserMessage(error, 'Error al cambiar el grupo muscular. Intentalo de nuevo.'), 'error');
    }
  }, [refresh, showToast]);

  const handleDayClick = useCallback((date: string) => {
    setSelectedCalendarDate(date);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setShowActiveWorkout(false);
    if (activeWorkout) {
      saveActiveWorkoutToStorage(activeWorkout);
    }
  }, [activeWorkout]);

  const handleCancelActiveWorkout = useCallback(() => {
    if (!activeWorkout) return;
    const sessionId = activeWorkout.session?.id;
    if (sessionId) {
      localStorage.removeItem(`${ACTIVE_WORKOUT_PROGRESS_KEY}_${sessionId}`);
      localStorage.removeItem(`workoutStartTime_${sessionId}`);
    }
    setActiveWorkout(null);
    setShowActiveWorkout(false);
    saveActiveWorkoutToStorage(null);
  }, [activeWorkout]);

  const handleDismissIosGuide = useCallback(() => {
    setShowIosNotificationGuide(false);
  }, []);

  const handleUpdateProgress = useCallback(async (sessionId: string, exerciseLogs: ExerciseLog[]) => {
    await apiUpdateSessionProgress(sessionId, exerciseLogs);
  }, []);

  const previousWeightsByExercise = useMemo(() => {
    if (!activeWorkout) return undefined;
    return dashboardData?.lastWeightsByRoutine[activeWorkout.routine.id];
  }, [activeWorkout, dashboardData]);


  const handleCompleteWorkout = useCallback(async (exerciseLogs: ExerciseLog[]) => {
    if (!activeWorkout) return;

    const finishWorkout = async () => {
      try {
        const completedAt = Date.now();
        const startedAtMs = activeWorkout.session.startedAt.getTime();
        const totalDuration = Math.max(1, Math.round((completedAt - startedAtMs) / (1000 * 60)));

        await apiCompleteSession(activeWorkout.session.id, exerciseLogs, completedAt, totalDuration);
        await apiIncrementRoutineUsage(activeWorkout.routine.id);
        setActiveWorkout(null);
        setShowActiveWorkout(false);
        saveActiveWorkoutToStorage(null);
        showToast('Entrenamiento completado', 'success');
        void refresh();
      } catch (error) {
        console.error('Error completing workout:', error);
        showToast(toUserMessage(error, 'Error al completar el entrenamiento. Intentalo de nuevo.'), 'error');
      }
    };

    const allExercisesCompleted = activeWorkout.routine.exercises.every(exercise => {
      const log = exerciseLogs.find(l => l.exerciseId === exercise.id);
      return !!log && isExerciseLogCompleted(log.sets, exercise.sets);
    });

    if (!allExercisesCompleted) {
      confirm({
        title: 'Entrenamiento incompleto',
        message: 'No has completado todos los ejercicios. ¿Quieres terminar el entrenamiento de todas formas?',
        confirmText: 'Terminar',
        cancelText: 'Seguir entrenando',
        onConfirm: finishWorkout,
        isDanger: false
      });
    } else {
      finishWorkout();
    }
  }, [activeWorkout, confirm, refresh, showToast]);

  // Si hay un entrenamiento activo, mostrar la vista de entrenamiento
  if (activeWorkout && showActiveWorkout) {
    return (
      <div className="content-fade-in">
        <ActiveWorkout
          user={user}
          routine={activeWorkout.routine}
          session={activeWorkout.session}
          previousWeightsByExercise={previousWeightsByExercise}
          onBackToDashboard={handleBackToDashboard}
          onCompleteWorkout={handleCompleteWorkout}
          onUpdateProgress={handleUpdateProgress}
        />
      </div>
    );
  }

  if (dashboardLoading) {
    if (showDashboardSkeleton) {
      return <PageSkeleton page="dashboard" />;
    }

    return <div className="app-shell" aria-hidden="true" />;
  }

  if (!dashboardData) {
    return (
      <div className="app-shell pb-28">
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="app-card p-5 sm:p-6">
            <h1 className="text-xl font-display text-white mb-2">No pudimos cargar el dashboard</h1>
            <p className="text-sm text-slate-300 mb-4">
              {dashboardError || 'Intenta recargar la informacion del inicio.'}
            </p>
            <button type="button" onClick={() => void refresh()} className="btn-primary">
              Reintentar
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell pb-28">
      {/* Header */}
      <header className="app-header px-4 pb-5 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-6 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display text-white flex items-center gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-2xl overflow-hidden shadow-lift ring-1 ring-white/20 flex items-center justify-center">
                  {showClerkUserButton ? (
                    <Suspense
                      fallback={(
                        <div className="flex h-full w-full items-center justify-center bg-slateDeep text-xs font-semibold text-slate-200">
                          {userInitials}
                        </div>
                      )}
                    >
                      <DeferredClerkUserButton />
                    </Suspense>
                  ) : (
                    <button
                      type="button"
                      onPointerEnter={() => setShowClerkUserButton(true)}
                      onFocus={() => setShowClerkUserButton(true)}
                      onClick={() => setShowClerkUserButton(true)}
                      aria-label="Cargando menu de usuario"
                      className="flex h-full w-full items-center justify-center bg-slateDeep text-xs font-semibold text-slate-200"
                    >
                      {userInitials}
                    </button>
                  )}
                </div>
                <span>Herculito</span>
              </h1>
              <p className="text-slate-300 mt-1 text-sm truncate">Bienvenido, {user.name || 'Usuario'}</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-4">
              <button
                onClick={() => {
                  setShowCalendar((previousValue) => {
                    const nextValue = !previousValue;
                    if (nextValue) {
                      setShowDeferredCalendar(true);
                    }
                    return nextValue;
                  });
                }}
                className={`btn-secondary flex items-center gap-2 touch-target ${showCalendar ? 'border-mint/60 text-mint' : ''}`}
                title="Ver calendario"
                aria-label={showCalendar ? "Ocultar calendario" : "Ver calendario"}
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">Calendario</span>
              </button>

              <button
                onClick={onLogout}
                className="btn-danger flex items-center gap-2 touch-target"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 sm:py-4">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(72,229,163,0.18),_transparent_36%),radial-gradient(circle_at_90%_0%,_rgba(245,158,11,0.16),_transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.32)] sm:p-6">
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-amberGlow/10 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-mint/10 blur-3xl" />

            <div className="relative grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                  <Sparkles size={14} className="text-mint" />
                  <span>Pulso del entrenamiento</span>
                </div>

                <div>
                  <h2 className="font-display text-2xl text-white sm:text-3xl">Tu centro de control</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">{heroInsight}</p>
                </div>

                <div className="rounded-[1.6rem] border border-white/10 bg-black/15 p-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Meta semanal</div>
                      <div className="mt-1 font-display text-3xl text-white">{stats.thisWeekWorkouts}/{weeklyGoal}</div>
                    </div>

                    <div className="text-sm text-slate-200 sm:max-w-xs sm:text-right">{weeklyGoalCopy}</div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amberGlow via-amberGlow to-mint transition-[width] duration-500"
                      style={{ width: `${Math.max(weeklyProgress * 100, stats.thisWeekWorkouts > 0 ? 12 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <TrendingUp size={13} className="text-mint" />
                      {stats.currentStreak > 0 ? `${stats.currentStreak} dias seguidos` : 'Activa una nueva racha'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <Clock size={13} className="text-amberGlow" />
                      Duracion media: {formatDurationValue(stats.averageDurationMin)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <Trophy size={13} className="text-mint" />
                      {competitionPanels[1].insight}
                    </span>
                    {recommendedGroupInfo ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: recommendedGroupInfo.color }} />
                        Foco sugerido: {recommendedGroupInfo.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {overviewCards.map((card) => {
                  const Icon = card.Icon;

                  return (
                    <div key={card.title} className="group rounded-[1.4rem] border border-white/8 bg-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{card.title}</div>
                          <div className="mt-2 font-display text-2xl text-white">{card.value}</div>
                          <div className="mt-1 text-xs text-slate-400">{card.subtitle}</div>
                        </div>

                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconTone}`}>
                          <Icon size={18} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-4 grid gap-3 lg:grid-cols-2">
              {competitionPanels.map((panel) => (
                <div key={panel.title} className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/15 p-4 backdrop-blur-sm">
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${panel.accentTone}`} />
                  <div className="relative flex h-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Clasificacion</div>
                        <div className="mt-1 font-display text-xl text-white">{panel.title}</div>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                        {panel.rank ? formatPosition(panel.rank) : '--'}
                      </div>
                    </div>

                    {panel.leader ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-mint">
                          <Crown size={14} />
                          <span>Lider: {panel.leader.name}</span>
                        </div>
                        <div className="mt-1 text-sm text-white">{panel.leader.totalWorkouts} entrenamientos liderando</div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
                        {panel.emptyLabel}
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
                      <Trophy size={16} className="mt-0.5 shrink-0 text-amberGlow" />
                      <span>{panel.insight}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

        {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {activeWorkout && (
          <div className="mb-6">
            <div className="app-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="chip mb-2">Entrenamiento activo</div>
                <div className="text-lg font-display text-white">
                  {activeWorkout.routine.name}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setShowActiveWorkout(true)}
                  className="btn-primary touch-target"
                >
                  Reanudar
                </button>
                <button
                  onClick={handleCancelActiveWorkout}
                  className="btn-secondary text-crimson border-crimson/40 hover:text-crimson hover:border-crimson/60 touch-target"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showIosNotificationGuide && (
          <div className="mb-6">
            <div className="app-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-mint">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Notificaciones en iOS</div>
                  <p className="text-sm text-slate-300">
                    En iOS las notificaciones de descanso solo funcionan si instalas la app en Pantalla de inicio.
                    Cuando el teléfono está bloqueado o la app en segundo plano, los timers no pueden alertar.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissIosGuide}
                className="btn-secondary self-start touch-target"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Calendario al inicio */}
        <div
          className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${showCalendar
            ? 'max-h-[72rem] opacity-100 mb-6'
            : 'max-h-0 opacity-0 mb-0'
            }`}
          aria-hidden={!showCalendar}
        >
          <div className={`transition-transform duration-300 ${showCalendar ? 'translate-y-0' : '-translate-y-2 pointer-events-none'}`}>
            {showDeferredCalendar ? (
              <Suspense fallback={<PanelSkeleton title="Calendario" heightClass="h-[30rem]" />}>
                <DeferredWorkoutCalendar
                  calendar={dashboardData.calendar}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onDayClick={handleDayClick}
                />
              </Suspense>
            ) : (
              <PanelSkeleton title="Calendario" heightClass="h-[30rem]" />
            )}
          </div>
        </div>


         <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 content-fade-in">
           {/* Rutinas por grupo muscular - Columna principal */}
           <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="mb-4 sm:mb-6">
                <h2 className="section-title mb-2">
                  Rutinas de Entrenamiento
                </h2>
                <p className="section-subtitle">
                  Selecciona una rutina para comenzar tu entrenamiento
                </p>
              </div>


              <MuscleGroupDashboard
                routines={dashboardRoutines}
                currentUser={user}
                onStartWorkout={handleStartWorkout}
                onRoutineMuscleGroupChange={handleRoutineMuscleGroupChange}
               recommendedGroup={recommendedGroup}
             />
           </div>

              {/* Sidebar - Solo entrenamientos recientes */}
               <div className="order-1 lg:order-2 space-y-4 sm:space-y-6">
                 {showDeferredProgressPanel ? (
                    <Suspense fallback={<PanelSkeleton title="Historial y progreso" heightClass="h-64" />}>
                      <DeferredExerciseProgressPanel summaries={dashboardData.exerciseProgress} />
                    </Suspense>
                  ) : (
                    <PanelSkeleton title="Historial y progreso" heightClass="h-64" />
                  )}

                <div className="app-card overflow-hidden p-4 sm:p-5">
                  <div className="relative mb-4 overflow-hidden rounded-[1.6rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(72,229,163,0.14),_transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.86))] p-4">
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-mint/10 blur-3xl" />
                    <div className="relative">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                        <Activity size={13} className="text-mint" />
                        <span>Actividad reciente</span>
                      </div>
                      <h3 className="mt-3 text-lg font-display text-white">Entrenamientos recientes</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        Una vista mas util para detectar frecuencia, foco muscular y ritmo de tus ultimas sesiones.
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ultimo registro</div>
                          <div className="mt-1 font-display text-xl text-white">{recentSessionsMeta.latestSessionLabel ?? '--'}</div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ritmo reciente</div>
                          <div className="mt-1 font-display text-xl text-white">
                            {recentSessionsMeta.averageRecentDuration ? formatDurationValue(recentSessionsMeta.averageRecentDuration) : '--'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                        {recentSessionsMeta.topGroupInfo ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: recentSessionsMeta.topGroupInfo.color }} />
                            Enfoque dominante: {recentSessionsMeta.topGroupInfo.name}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          <Dumbbell size={13} className="text-amberGlow" />
                          {recentSessionsMeta.visibleSessions.length} sesiones visibles
                        </span>
                      </div>
                    </div>
                  </div>

                  {recentSessionsMeta.visibleSessions.length > 0 ? (
                    <div className="space-y-3">
                      {recentSessionsMeta.visibleSessions.map((session, index) => {
                        const groupInfo = MUSCLE_GROUPS[session.primaryMuscleGroup ?? 'fullbody'];

                        return (
                          <div
                            key={session.id}
                            className="group relative overflow-hidden rounded-[1.3rem] border border-white/8 bg-[linear-gradient(135deg,rgba(15,23,42,0.72),rgba(30,41,59,0.46))] p-3 pl-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_16px_40px_rgba(2,6,23,0.22)]"
                          >
                            <div className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ backgroundColor: groupInfo.color }} />
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-200">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: groupInfo.color }} />
                                    {groupInfo.name}
                                  </span>
                                  <span>{getRelativeSessionDateLabel(session.completedAt)}</span>
                                  {index === 0 ? (
                                    <span className="rounded-full border border-mint/20 bg-mint/10 px-2 py-1 text-mint">Mas reciente</span>
                                  ) : null}
                                </div>

                                <h4 className="mt-2 truncate text-sm font-semibold text-white">{session.routineName}</h4>
                                <p className="mt-1 text-xs text-slate-400">{formatDateInAppTimeZone(session.completedAt)}</p>
                              </div>

                              <div className="text-right">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Duracion</div>
                                <div className="mt-1 font-display text-lg text-white">{formatDurationValue(session.totalDuration)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.4rem] border border-dashed border-mist/50 bg-white/[0.03] px-4 py-8 text-center">
                      <div className="text-sm text-slate-200">No hay entrenamientos recientes</div>
                      <p className="mt-1 text-xs text-slate-400">Comienza tu primer entrenamiento para activar esta linea de tiempo.</p>
                    </div>
                  )}
                </div>
          </div>

          </div>
        </main>

        {selectedCalendarDay ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:p-6">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Cerrar detalle del dia"
              onClick={handleCloseCalendarDrawer}
            />

            <div
              ref={calendarDrawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-day-detail-title"
              className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(72,229,163,0.16),_transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_100px_rgba(2,6,23,0.45)] content-fade-in"
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-mint/10 blur-3xl" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint/40 to-transparent" />

              <div className="relative p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                      <Calendar size={13} className="text-mint" />
                      <span>Detalle del dia</span>
                    </div>
                    <h3 id="calendar-day-detail-title" className="mt-3 font-display text-2xl text-white">
                      {selectedCalendarDayLabel}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {selectedCalendarDay.workouts.length > 0
                        ? `Registraste ${selectedCalendarDay.workouts.length} sesion${selectedCalendarDay.workouts.length === 1 ? '' : 'es'} en esta fecha.`
                        : 'No hay sesiones en esta fecha. Puedes usar esta vista para detectar huecos en tu semana.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseCalendarDrawer}
                    className="btn-ghost rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 touch-target"
                    aria-label="Cerrar detalle"
                  >
                    <X size={18} />
                  </button>
                </div>

                {selectedCalendarDay.workouts.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {selectedCalendarDay.workouts.map((workout, index) => {
                      const groupInfo = MUSCLE_GROUPS[workout.muscleGroup];

                      return (
                        <div
                          key={workout.sessionId}
                          className="relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4 pl-5"
                        >
                          <div className="absolute inset-y-4 left-0 w-1 rounded-r-full" style={{ backgroundColor: groupInfo.color }} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">Sesion {index + 1}</span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: groupInfo.color }} />
                                  {groupInfo.name}
                                </span>
                              </div>
                              <div className="mt-2 text-base font-semibold text-white">{workout.routineName}</div>
                            </div>

                            <div className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
                              Registrado
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400">
                    Sin entrenamientos registrados en esta fecha.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-4 pb-8">
          <div className="max-w-7xl mx-auto text-center text-xs text-slate-500">
            Version {appVersion}
          </div>
        </div>
    </div>
  );
};
