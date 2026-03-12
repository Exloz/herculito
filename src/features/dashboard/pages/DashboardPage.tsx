import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, LogOut, Bell } from 'lucide-react';
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
import { getRecommendedMuscleGroup } from '../lib/muscleGroups';
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
const ACTIVE_WORKOUT_PROGRESS_KEY = 'activeWorkoutProgress';
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
  const primarySummary = useMemo(() => {
    if (activeWorkout) {
      return 'Tienes un entrenamiento en curso.';
    }

    if (dashboardRoutines.length === 0) {
      return 'Crea una rutina para empezar a entrenar.';
    }

    return `${stats.thisWeekWorkouts} esta semana · racha de ${stats.currentStreak} días`;
  }, [activeWorkout, dashboardRoutines.length, stats.currentStreak, stats.thisWeekWorkouts]);

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
      <header className="app-header px-4 pb-5 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-6 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display text-white flex items-center gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-2xl overflow-hidden shadow-lift ring-1 ring-white/20 flex items-center justify-center">
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
                <span>Herculito</span>
              </h1>
              <p className="mt-1 truncate text-sm text-slate-300">Bienvenido, {user.name || 'Usuario'}</p>
            </div>

            <div className="ml-4 flex items-center gap-2 sm:gap-3">
              <button
                onClick={onLogout}
                className="btn-secondary flex items-center gap-2 touch-target"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Cerrar sesión</span>
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
        {!activeWorkout && (
          <section className="mb-6 app-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-display text-white sm:text-2xl">Entrena sin distracciones</h2>
                <p className="mt-1 text-sm text-slate-300">{primarySummary}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-mist/50 px-3 py-1.5">{dashboardRoutines.length} rutinas listas</span>
                <span className="rounded-full border border-mist/50 px-3 py-1.5">{stats.totalWorkouts} entrenamientos totales</span>
              </div>
            </div>
          </section>
        )}

        {activeWorkout && (
          <section className="mb-6">
            <div className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <div className="chip mb-2">Entrenamiento activo</div>
                <div className="text-lg font-display text-white">{activeWorkout.routine.name}</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={() => setShowActiveWorkout(true)} className="btn-primary touch-target">
                  Reanudar
                </button>
                <button
                  onClick={handleCancelActiveWorkout}
                  className="btn-secondary border-crimson/40 text-crimson hover:border-crimson/60 hover:text-crimson touch-target"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        )}

        {showIosNotificationGuide && (
          <section className="mb-6">
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

        <section className="content-fade-in">
          <div className="mb-4 sm:mb-5">
            <h2 className="section-title mb-1">Empieza una rutina</h2>
            <p className="text-sm text-slate-300">Elige tu entrenamiento de hoy y entra directo a la sesión.</p>
          </div>

          <MuscleGroupDashboard
            routines={dashboardRoutines}
            currentUser={user}
            onStartWorkout={handleStartWorkout}
            onRoutineMuscleGroupChange={handleRoutineMuscleGroupChange}
            recommendedGroup={recommendedGroup}
          />
        </section>

        <section className="mt-8 space-y-4">
          <details className="group app-surface overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-white sm:px-5">
              <span>Ver progreso por ejercicio</span>
              <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-mist/40 px-4 py-4 sm:px-5 sm:py-5">
              <Suspense fallback={<PanelSkeleton title="Historial y progreso" heightClass="h-64" />}>
                <DeferredExerciseProgressPanel summaries={dashboardData.exerciseProgress} />
              </Suspense>
            </div>
          </details>

          <details className="group app-surface overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-white sm:px-5">
              <span>Ver calendario y actividad reciente</span>
              <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-mist/40 px-4 py-4 sm:px-5 sm:py-5">
              <Suspense fallback={<PanelSkeleton title="Calendario" heightClass="h-[22rem]" />}>
                <DeferredWorkoutCalendar
                  calendar={dashboardData.calendar}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </Suspense>

              <div>
                <h3 className="text-sm font-semibold text-white">Entrenamientos recientes</h3>
                {recentSessions.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {recentSessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="border-b border-mist/30 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="min-w-0 truncate text-sm font-medium text-white">{session.routineName}</h4>
                          {session.completedAt && (
                            <span className="shrink-0 text-xs text-slate-400">{formatDateInAppTimeZone(session.completedAt)}</span>
                          )}
                        </div>
                        {session.primaryMuscleGroup && (
                          <div className="mt-1 text-xs text-slate-400">{session.primaryMuscleGroup}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">Todavía no tienes entrenamientos recientes.</p>
                )}
              </div>
            </div>
          </details>
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
