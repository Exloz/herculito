import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LogOut, Bell, BarChart3, CalendarRange, Dumbbell, Trophy } from 'lucide-react';
import { User, MuscleGroup, WorkoutSession, Routine, ExerciseLog } from '../../../shared/types';
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
import { MUSCLE_GROUPS, getRecommendedMuscleGroup } from '../lib/muscleGroups';
import { useUI } from '../../../app/providers/ui-context';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { formatDateValue } from '../../../shared/lib/intl';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { version as appVersion } from '../../../../package.json';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onReadyForBackgroundPreload?: () => void;
}

const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const IOS_NOTIFICATION_GUIDE_KEY = 'iosNotificationGuideSeen';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms

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

const isAndroidStandalonePwa = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const isStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return isAndroid && isStandalone;
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

type HomeTab = 'routines' | 'progress' | 'calendar';

const HOME_TABS: Array<{
  id: HomeTab;
  label: string;
  icon: typeof Dumbbell;
  tone: string;
}> = [
  { id: 'routines', label: 'Rutinas', icon: Dumbbell, tone: 'text-mint' },
  { id: 'progress', label: 'Progreso', icon: BarChart3, tone: 'text-amberGlow' },
  { id: 'calendar', label: 'Calendario', icon: CalendarRange, tone: 'text-mint' }
];

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
  const [activeWorkout, setActiveWorkout] = useState<{
    routine: Routine;
    session: WorkoutSession;
  } | null>(null);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showIosNotificationGuide, setShowIosNotificationGuide] = useState(false);
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

  useEffect(() => {
    if (!isAndroidStandalonePwa()) return;
    document.documentElement.classList.add('dashboard-scrollbar-hidden');
    document.body.classList.add('dashboard-scrollbar-hidden');

    return () => {
      document.documentElement.classList.remove('dashboard-scrollbar-hidden');
      document.body.classList.remove('dashboard-scrollbar-hidden');
    };
  }, []);

  const {
    data: dashboardData,
    loading: dashboardLoading,
    refreshing: dashboardRefreshing,
    error: dashboardError,
    usingCachedData,
    lastUpdatedAt,
    isOffline,
    refresh
  } = useDashboardData(user.id, user.name);
  const showDashboardSkeleton = useDelayedLoading(dashboardLoading, 180);
  const [activeHomeTab, setActiveHomeTab] = useState<HomeTab>('routines');
  const [previousHomeTab, setPreviousHomeTab] = useState<HomeTab>('routines');

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
    if (!dashboardData || dashboardLoading || hasTriggeredBackgroundPreload.current) {
      return;
    }

    hasTriggeredBackgroundPreload.current = true;
    onReadyForBackgroundPreload?.();
  }, [dashboardData, dashboardLoading, onReadyForBackgroundPreload]);

  const userInitials = useMemo(() => getUserInitials(user.name || 'Usuario'), [user.name]);
  const dashboardStatusMessage = useMemo(() => {
    if (dashboardError && dashboardData) {
      return isOffline
        ? 'Estás sin conexión. Mostramos la última información guardada mientras recuperas internet.'
        : 'Mostramos datos guardados mientras intentamos sincronizar la información más reciente.';
    }

    if (isOffline && dashboardData) {
      return 'Modo sin conexión activo. Puedes seguir viendo los datos que ya estaban disponibles en este dispositivo.';
    }

    return null;
  }, [dashboardData, dashboardError, isOffline]);
  const recommendedRoutineCount = useMemo(() => {
    if (!recommendedGroup) {
      return dashboardRoutines.length;
    }

    return dashboardRoutines.filter((routine) => routine.primaryMuscleGroup === recommendedGroup).length;
  }, [dashboardRoutines, recommendedGroup]);
  const recommendedGroupName = recommendedGroup ? MUSCLE_GROUPS[recommendedGroup].name : null;
  const heroStats = [
    { label: 'Semana', value: stats.thisWeekWorkouts },
    { label: 'Racha', value: stats.currentStreak },
    { label: 'Total', value: stats.totalWorkouts },
    { label: 'Racha larga', value: stats.longestStreak }
  ];
  const averageDurationLabel = stats.averageDurationMin > 0
    ? `${stats.averageDurationMin} min por sesion`
    : 'Suma una sesion hoy';
  const competition = dashboardData?.competition;
  const activeTabIndex = HOME_TABS.findIndex((tab) => tab.id === activeHomeTab);
  const previousTabIndex = HOME_TABS.findIndex((tab) => tab.id === previousHomeTab);
  const homeTabAnimationClass = activeTabIndex >= previousTabIndex ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward';
  const handleHomeTabChange = useCallback((tab: HomeTab) => {
    if (tab === activeHomeTab) return;
    setPreviousHomeTab(activeHomeTab);
    setActiveHomeTab(tab);
  }, [activeHomeTab]);

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
      showToast(toUserMessage(error, 'Error al iniciar el entrenamiento. Inténtalo de nuevo.'), 'error');
    }
  }, [dashboardRoutines, showToast, user.id]);

  const handleRoutineMuscleGroupChange = useCallback(async (routineId: string, newMuscleGroup: MuscleGroup) => {
    try {
      await apiUpdateRoutine(routineId, { primaryMuscleGroup: newMuscleGroup });
      await refresh();
    } catch (error) {
      showToast(toUserMessage(error, 'Error al cambiar el grupo muscular. Inténtalo de nuevo.'), 'error');
    }
  }, [refresh, showToast]);

  const handleBackToDashboard = useCallback(() => {
    setShowActiveWorkout(false);
    setActiveHomeTab('routines');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (activeWorkout) {
      saveActiveWorkoutToStorage(activeWorkout);
    }
  }, [activeWorkout]);

  const handleDismissIosGuide = useCallback(() => {
    setShowIosNotificationGuide(false);
  }, []);

  const handleCancelActiveWorkout = useCallback(() => {
    if (!activeWorkout) return;

    confirm({
      title: 'Cancelar entrenamiento activo',
      message: 'Se borrara el entrenamiento en curso y ya no podras retomarlo desde Inicio.',
      confirmText: 'Cancelar entrenamiento',
      cancelText: 'Volver',
      isDanger: true,
      onConfirm: () => {
        setActiveWorkout(null);
        setShowActiveWorkout(false);
        saveActiveWorkoutToStorage(null);
        showToast('Entrenamiento activo cancelado', 'info');
      }
    });
  }, [activeWorkout, confirm, showToast]);

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
        showToast(toUserMessage(error, 'Error al completar el entrenamiento. Inténtalo de nuevo.'), 'error');
      }
    };

    const allExercisesCompleted = activeWorkout.routine.exercises.every(exercise => {
      const log = exerciseLogs.find(l => l.exerciseId === exercise.id);
      return !!log && isExerciseLogCompleted(log.sets, exercise.sets);
    });

    if (!allExercisesCompleted) {
      confirm({
        title: 'Entrenamiento incompleto',
        message: 'Todavía te faltan ejercicios por completar. Puedes terminar ahora o seguir entrenando.',
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
              {dashboardError || 'Intenta recargar la información del inicio.'}
            </p>
            <button type="button" onClick={() => void refresh()} disabled={dashboardRefreshing} className="btn-primary disabled:opacity-60">
              {dashboardRefreshing ? 'Reintentando...' : 'Reintentar'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell pb-28">
      <header className="app-header px-4 pb-4 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-5 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/20 sm:h-11 sm:w-11">
                  <Suspense
                    fallback={(
                      <div className="flex h-full w-full items-center justify-center bg-slateDeep text-xs font-semibold text-slate-200">
                        {userInitials}
                      </div>
                    )}
                  >
                    <DeferredClerkUserButton />
                  </Suspense>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-mint/80">{user.name || 'Usuario'}</div>
                  <h1 className="truncate font-display text-[2rem] leading-none text-white sm:text-[2.35rem]">Herculito</h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onLogout}
                className="btn-secondary flex h-11 w-11 items-center justify-center rounded-[1rem] px-0 touch-target"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {dashboardStatusMessage && (
        <div className="px-4 pt-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border border-amberGlow/30 bg-amberGlow/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-amberGlow">Estado de conexión</div>
              <p className="mt-1 text-sm text-slate-200">{dashboardStatusMessage}</p>
              {usingCachedData && lastUpdatedAt && (
                <div className="mt-1 text-xs text-slate-300">
                  Última actualización guardada: {formatDateValue(new Date(lastUpdatedAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={dashboardRefreshing}
              className="btn-secondary shrink-0 disabled:opacity-60"
            >
              {dashboardRefreshing ? 'Actualizando...' : 'Actualizar ahora'}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <section className="motion-enter mb-4 overflow-hidden rounded-[1.45rem] border border-white/[0.05] bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.1),transparent_30%),linear-gradient(180deg,rgba(18,24,35,0.98),rgba(8,12,18,0.98))] px-4 py-3.5 shadow-lift sm:px-5 sm:py-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300/80">Resumen</div>
                  <div className="rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-slate-200">
                    {dashboardRoutines.length} rutinas activas
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
                  <div className="rounded-[1.15rem] border border-mint/16 bg-[linear-gradient(180deg,rgba(72,229,163,0.12),rgba(255,255,255,0.03))] px-3.5 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.16)] sm:px-4 sm:py-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mint/80">Este mes</div>
                    <div className="mt-1.5 flex items-end gap-2.5">
                      <div className="font-display text-[2.25rem] leading-none text-white sm:text-[2.45rem]">{stats.thisMonthWorkouts}</div>
                      <div className="pb-1 text-xs text-slate-200/80">sesiones</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-300">{averageDurationLabel}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {heroStats.map((item) => (
                      <div key={item.label} className="rounded-[0.95rem] border border-white/[0.05] bg-black/10 px-3 py-2.5 backdrop-blur-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300/70">{item.label}</div>
                        <div className="mt-1 text-[1.2rem] font-semibold leading-none text-white sm:text-[1.3rem]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(competition?.weekLeader || competition?.userWeekRank || competition?.monthLeader || competition?.userMonthRank) && (
                  <div className="rounded-[1.1rem] bg-slateDeep/55 px-3 py-3">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <Trophy size={13} className="text-amberGlow" />
                      <span>Ranking</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-[0.95rem] bg-black/10 px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Semana</div>
                        <div className="mt-1 truncate text-sm font-semibold text-white">{competition?.weekLeader?.name ?? 'Sin líder'}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Tu puesto {competition?.userWeekRank?.position ? `#${competition.userWeekRank.position}` : 'sin posición'}
                        </div>
                      </div>
                      <div className="rounded-[0.95rem] bg-black/10 px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Mes</div>
                        <div className="mt-1 truncate text-sm font-semibold text-white">{competition?.monthLeader?.name ?? 'Sin líder'}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Tu puesto {competition?.userMonthRank?.position ? `#${competition.userMonthRank.position}` : 'sin posición'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </section>

        <section className="motion-enter motion-enter-delay-1 mb-6 content-fade-in">
            <div className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(21,30,43,0.72),rgba(14,20,31,0.76))] p-1 shadow-lift">
              <div className="grid grid-cols-3 gap-1">
                {HOME_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeHomeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleHomeTabChange(tab.id)}
                      aria-pressed={isActive}
                      className={`motion-interactive flex min-w-0 items-center justify-center gap-2 rounded-[1rem] px-2 py-3 text-[13px] font-medium transition-all duration-300 ${isActive
                        ? 'bg-[linear-gradient(180deg,rgba(24,33,46,0.98),rgba(14,20,30,0.98))] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                    >
                      <Icon size={15} className={isActive ? tab.tone : 'text-slate-500'} />
                      <span className="min-w-0 text-center leading-none">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
        </section>

        {activeWorkout && (
          <section className="motion-enter motion-enter-delay-2 mb-6">
            <div className="overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(11,15,20,0.98))] p-4 shadow-lift sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="chip mb-2">Entrenamiento activo</div>
                  <div className="font-display text-[1.55rem] leading-none text-white sm:text-[1.9rem]">{activeWorkout.routine.name}</div>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Sigue donde lo dejaste y termina la sesión sin perder el ritmo.</p>
                </div>

                <div className="grid w-full gap-2 sm:w-auto sm:min-w-[15rem]">
                  <button onClick={() => setShowActiveWorkout(true)} className="btn-primary w-full touch-target">
                    Continuar
                  </button>
                  <button
                    onClick={handleCancelActiveWorkout}
                    className="btn-secondary w-full touch-target"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {showIosNotificationGuide && (
          <section className="motion-enter motion-enter-delay-2 mb-6">
            <div className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-mint">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Notificaciones en iOS</div>
                  <p className="text-sm text-slate-300">
                    Instala la app en Pantalla de inicio para recibir alertas de descanso cuando cierres la app o bloquees el teléfono.
                  </p>
                </div>
              </div>
              <button onClick={handleDismissIosGuide} className="btn-secondary self-start touch-target">
                Entendido
              </button>
            </div>
          </section>
        )}

        <section className={`mt-2 ${homeTabAnimationClass}`} key={activeHomeTab}>
            {activeHomeTab === 'routines' && (
              <section className="motion-enter motion-enter-delay-3 space-y-4">
                <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">Rutinas</div>
                    <h2 className="mt-1 font-display text-xl text-white sm:text-2xl">
                      {recommendedGroupName ? `${recommendedGroupName} al frente` : 'Empieza una rutina'}
                    </h2>
                  </div>
                  <p className="max-w-sm text-sm text-slate-300">
                    {recommendedGroupName
                      ? `${recommendedRoutineCount} ${recommendedRoutineCount === 1 ? 'rutina disponible' : 'rutinas disponibles'} para empezar sin rodeos.`
                      : 'Empieza directo o abre detalles solo cuando haga falta.'}
                  </p>
                </div>

                <MuscleGroupDashboard
                  routines={dashboardRoutines}
                  currentUser={user}
                  onStartWorkout={handleStartWorkout}
                  onRoutineMuscleGroupChange={handleRoutineMuscleGroupChange}
                  recommendedGroup={recommendedGroup}
                />
              </section>
            )}

            {activeHomeTab === 'progress' && (
              <section className="motion-enter motion-enter-delay-3">
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amberGlow/85">Seguimiento</div>
                  <h2 className="mt-1 font-display text-xl text-white sm:text-2xl">Tu progreso está a la vista</h2>
                </div>
                <Suspense fallback={<PanelSkeleton title="Historial y progreso" heightClass="h-64" />}>
                  <DeferredExerciseProgressPanel summaries={dashboardData.exerciseProgress} />
                </Suspense>
              </section>
            )}

            {activeHomeTab === 'calendar' && (
              <section className="motion-enter motion-enter-delay-3">
                <div className="mb-4">
                  <h2 className="font-display text-xl text-white sm:text-2xl">Calendario y actividad reciente</h2>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.82fr)]">
                  <Suspense fallback={<PanelSkeleton title="Calendario" heightClass="h-[22rem]" />}>
                    <DeferredWorkoutCalendar
                      calendar={dashboardData.calendar}
                      currentMonth={currentMonth}
                      onMonthChange={setCurrentMonth}
                    />
                  </Suspense>

                  <div className="rounded-[1.6rem] bg-graphite p-4 shadow-lift sm:p-5">
                    <div className="mb-3 flex items-end justify-between gap-3 border-b border-mist/40 pb-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Últimas sesiones</div>
                        <h3 className="mt-1 font-display text-lg text-white sm:text-xl">Actividad reciente</h3>
                      </div>
                      <div className="text-right text-xs text-slate-400">{recentSessions.length} registradas</div>
                    </div>

                    {recentSessions.length > 0 ? (
                      <div className="space-y-1.5">
                        {recentSessions.slice(0, 3).map((session, index) => (
                          <div
                            key={session.id}
                            className={`rounded-[0.95rem] border px-3 py-2.5 ${index === 0
                              ? 'border-mint/20 bg-mint/8'
                              : 'border-white/5 bg-slateDeep/45'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">{session.routineName}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                  <span>{session.primaryMuscleGroup || 'Sin categoría'}</span>
                                  {session.totalDuration && <span className="text-slate-500">{session.totalDuration} min</span>}
                                </div>
                              </div>
                              {session.completedAt && (
                                <div className="shrink-0 text-right text-xs font-medium text-slate-400">{formatDateInAppTimeZone(session.completedAt)}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-mist/40 bg-slateDeep/45 px-4 py-8 text-center">
                        <div className="font-display text-lg text-white">Aún no hay actividad</div>
                        <p className="mt-2 text-sm text-slate-400">Empieza una rutina para llenar tu calendario y registrar tu ritmo.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
        </section>
      </main>
      <div className="px-4 pb-8">
        <div className="max-w-7xl mx-auto text-center text-xs text-slate-500">
          Version {appVersion}
          </div>
        </div>
    </div>
  );
};
