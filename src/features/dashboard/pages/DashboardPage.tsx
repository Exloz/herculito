import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, TrendingUp, Award, Clock, LogOut, Bell, Trophy, Crown } from 'lucide-react';
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
import { getRecommendedMuscleGroup } from '../lib/muscleGroups';
import { useUI } from '../../../app/providers/ui-context';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
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
  const hasTriggeredBackgroundPreload = useRef(false);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDayClick = useCallback((_date: string) => {
    // Aquí podrías mostrar detalles del entrenamiento de ese día
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

      {/* Stats Bar */}
      <div className="px-4 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto">
          <div className="app-surface p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="app-surface-muted p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Award className="text-amberGlow" size={16} />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Total</span>
                </div>
                <div className="text-lg sm:text-xl font-display text-white leading-tight">{stats.totalWorkouts}</div>
                <div className="text-[11px] text-slate-400">entrenamientos</div>
              </div>

              <div className="app-surface-muted p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Calendar className="text-mint" size={16} />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Esta semana</span>
                </div>
                <div className="text-lg sm:text-xl font-display text-white leading-tight">{stats.thisWeekWorkouts}</div>
                <div className="text-[11px] text-slate-400">entrenamientos</div>
              </div>

              <div className="app-surface-muted p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <TrendingUp className="text-mint" size={16} />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Racha</span>
                </div>
                <div className="text-lg sm:text-xl font-display text-white leading-tight">{stats.currentStreak}</div>
                <div className="text-[11px] text-slate-400">dias consecutivos</div>
              </div>

              <div className="app-surface-muted p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <TrendingUp className="text-amberGlow" size={16} />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Racha larga</span>
                </div>
                <div className="text-lg sm:text-xl font-display text-white leading-tight">{stats.longestStreak}</div>
                <div className="text-[11px] text-slate-400">dias record</div>
              </div>

              <div className="app-surface-muted p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Clock className="text-amberGlow" size={16} />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Este mes</span>
                </div>
                <div className="text-lg sm:text-xl font-display text-white leading-tight">{stats.thisMonthWorkouts}</div>
                <div className="text-[11px] text-slate-400">entrenamientos</div>
              </div>

              <div className="app-surface-muted p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Trophy className="text-mint" size={16} />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Top mensual</span>
                </div>
                <div className="text-lg sm:text-xl font-display text-white leading-tight">
                  {formatPosition(competitionStats.userMonthRank)}
                </div>
                <div className="text-[11px] text-slate-400">tu posicion</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-mist/40">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-amberGlow" size={18} />
                <h2 className="text-xs sm:text-sm font-display text-white">Clasificacion global</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="app-surface-muted px-3 py-2.5 content-fade-in h-full flex flex-col">
                  <div className="mb-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400">Top semanal</span>
                  </div>

                  {competitionStats.weekLeader ? (
                    <>
                      <div className="flex items-center gap-2 text-mint mb-1 text-xs">
                        <Crown size={14} />
                        <span className="font-semibold">Lider: {competitionStats.weekLeader.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mb-1.5">{competitionStats.weekLeader.totalWorkouts} entrenamientos liderando</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 mb-1.5">Sin datos suficientes esta semana</div>
                  )}

                  {competitionStats.userWeekRank ? (
                    <div className="mt-auto text-xs text-slate-300">Tu llevas {competitionStats.userWeekRank.totalWorkouts} entrenamientos</div>
                  ) : (
                    <div className="mt-auto text-xs text-slate-400">Aun no registras entrenamientos esta semana</div>
                  )}
                </div>

                <div className="app-surface-muted px-3 py-2.5 content-fade-in h-full flex flex-col">
                  <div className="mb-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400">Top mensual</span>
                  </div>

                  {competitionStats.monthLeader ? (
                    <>
                      <div className="flex items-center gap-2 text-mint mb-1 text-xs">
                        <Crown size={14} />
                        <span className="font-semibold">Lider: {competitionStats.monthLeader.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mb-1.5">{competitionStats.monthLeader.totalWorkouts} entrenamientos liderando</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 mb-1.5">Sin datos suficientes este mes</div>
                  )}

                  {competitionStats.userMonthRank ? (
                    <div className="mt-auto text-xs text-slate-300">Tu llevas {competitionStats.userMonthRank.totalWorkouts} entrenamientos</div>
                  ) : (
                    <div className="mt-auto text-xs text-slate-400">Aun no registras entrenamientos este mes</div>
                  )}
                </div>
              </div>
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
            ? 'max-h-[42rem] opacity-100 mb-6'
            : 'max-h-0 opacity-0 mb-0'
            }`}
          aria-hidden={!showCalendar}
        >
          <div className={`transition-transform duration-300 ${showCalendar ? 'translate-y-0' : '-translate-y-2 pointer-events-none'}`}>
            {showDeferredCalendar ? (
              <Suspense fallback={<PanelSkeleton title="Calendario" heightClass="h-[22rem]" />}>
                <DeferredWorkoutCalendar
                  calendar={dashboardData.calendar}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onDayClick={handleDayClick}
                />
              </Suspense>
            ) : (
              <PanelSkeleton title="Calendario" heightClass="h-[22rem]" />
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

               {/* Entrenamientos recientes */}
               <div className="app-card p-4 sm:p-5">
                <h3 className="text-lg font-display text-white mb-4">
                  Entrenamientos Recientes
                </h3>

                {recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="app-surface-muted p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white text-sm">
                            {session.routineName}
                          </h4>
                          {session.completedAt && (
                            <span className="text-xs text-slate-400">
                              {formatDateInAppTimeZone(session.completedAt)}
                            </span>
                          )}
                        </div>

                        {session.primaryMuscleGroup && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  session.primaryMuscleGroup ?
                                    '#48e5a3' : '#6b7280'
                              }}
                            />
                            <span className="text-xs text-slate-400">
                              {session.primaryMuscleGroup || 'Sin categoría'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-slate-300 text-sm">
                      No hay entrenamientos recientes
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Comienza tu primer entrenamiento.
                    </p>
                  </div>
                )}
              </div>
            </div>

         </div>
        </main>
        <div className="px-4 pb-8">
          <div className="max-w-7xl mx-auto text-center text-xs text-slate-500">
            Version {appVersion}
          </div>
        </div>
    </div>
  );
};
