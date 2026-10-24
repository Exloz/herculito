import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowUpRight, Bell } from 'lucide-react';
import { User, MuscleGroup, ExerciseLog } from '../../../shared/types';
import { updateRoutine as apiUpdateRoutine } from '../../../shared/api/dataApi';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';
import { MuscleGroupDashboard } from '../components/MuscleGroupDashboard';
import { DashboardOverview } from '../components/DashboardOverview';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import { ActiveWorkout } from '../../workouts/components/ActiveWorkout';
import { useDashboardData } from '../hooks/useDashboardData';
import { getRecommendedMuscleGroup } from '../lib/muscleGroups';
import { getCompletedWeightsByExerciseFromLogs } from '../../workouts/lib/workoutSessions';
import { useUI } from '../../../app/providers/ui-context';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { formatDateValue } from '../../../shared/lib/intl';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { CompetitionPanel } from '../components/CompetitionPanel';
import { RecentActivity } from '../components/RecentActivity';
import { useActivitySync } from '../../activity-sync/useActivitySync';
import { cancelWorkoutTimer } from '../../workouts/hooks/useTimer';

interface DashboardProps {
  user: User;
  view?: 'routines' | 'progress' | 'calendar';
  onReadyForBackgroundPreload?: () => void;
  onNavigateToRoutines: () => void;
}

const IOS_NOTIFICATION_GUIDE_KEY = 'iosNotificationGuideSeen';

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

export const Dashboard: React.FC<DashboardProps> = ({ user, view = 'routines', onReadyForBackgroundPreload, onNavigateToRoutines }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { activitySync, projection } = useActivitySync(user.id);
  const activeWorkout = projection.active?.kind === 'workout' ? projection.active : null;
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showIosNotificationGuide, setShowIosNotificationGuide] = useState(false);
  const [optimisticLastWeightsByRoutine, setOptimisticLastWeightsByRoutine] = useState<Record<string, Record<string, number[]>>>({});
  const hasTriggeredBackgroundPreload = useRef(false);
  const routineSelectionRef = useRef<HTMLElement>(null);
  const { showToast, confirm } = useUI();


  useEffect(() => {
    const handleResumeEvent = () => {
      if (activitySync.getProjection().active?.kind === 'workout') {
        setShowActiveWorkout(true);
      }
      localStorage.removeItem('activeWorkoutForceOpen');
    };

    if (view === 'routines' && activeWorkout && localStorage.getItem('activeWorkoutForceOpen') === 'true') {
      setShowActiveWorkout(true);
      localStorage.removeItem('activeWorkoutForceOpen');
    }

    window.addEventListener('resume-active-workout', handleResumeEvent);
    return () => window.removeEventListener('resume-active-workout', handleResumeEvent);
  }, [activeWorkout, activitySync, view]);

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
  const { plan: weeklyPlan, today: plannedDay, assignDay } = useWeeklyPlan(user.id);
  const plannedRoutine = dashboardRoutines.find((routine) => routine.id === weeklyPlan[plannedDay]);
  const handleStartWorkout = useCallback((routineId: string) => {
    const routine = dashboardRoutines.find((entry) => entry.id === routineId);
    if (!routine) {
      showToast('Rutina no encontrada', 'error');
      return;
    }
    try {
      activitySync.startWorkout(routine);
      setShowActiveWorkout(true);
      void activitySync.syncPending();
    } catch (error) {
      showToast(toUserMessage(
        error,
        'No se pudo iniciar la rutina. Inténtalo de nuevo.'
      ), 'error');
    }
  }, [activitySync, dashboardRoutines, showToast]);

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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

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
        cancelWorkoutTimer(user.id);
        activitySync.abandon(activeWorkout.id);
        setShowActiveWorkout(false);
        void activitySync.syncPending();
        showToast('Entrenamiento activo cancelado', 'info');
      }
    });
  }, [activeWorkout, activitySync, confirm, showToast, user.id]);

  const previousWeightsByExercise = useMemo(() => {
    if (!activeWorkout) return undefined;
    const serverWeights = dashboardData?.lastWeightsByRoutine[activeWorkout.routine.id];
    const optimisticWeights = optimisticLastWeightsByRoutine[activeWorkout.routine.id];
    if (!optimisticWeights) return serverWeights;
    return {
      ...(serverWeights ?? {}),
      ...optimisticWeights
    };
  }, [activeWorkout, dashboardData, optimisticLastWeightsByRoutine]);


  const handleCompleteWorkout = useCallback(async (exerciseLogs: ExerciseLog[]) => {
    if (!activeWorkout) return;

    // Calculate repsBySetUpdates for exercises that use reps-by-set mode
    // Materializes ALL sets using fallback: set.reps ?? exercise.repsBySet[idx] ?? exercise.reps
    const calculateRepsBySetUpdates = (): Record<string, number[]> => {
      const updates: Record<string, number[]> = {};
      const routine = activeWorkout.routine;

      for (const exercise of routine.exercises) {
        // Only process exercises that have repsBySet defined in the routine
        if (!exercise.repsBySet || exercise.repsBySet.length === 0) continue;

        // Find the log for this exercise
        const log = exerciseLogs.find(l => l.exerciseId === exercise.id);
        if (!log || !log.sets) continue;

        // Build effective reps for each set up to exercise.sets
        // Use fallback: set.reps ?? exercise.repsBySet[idx] ?? exercise.reps
        const effectiveReps: number[] = [];
        for (let idx = 0; idx < exercise.sets; idx++) {
          const set = log.sets.find(s => s.setNumber === idx + 1);
          const repsForSet = set?.reps ?? exercise.repsBySet[idx] ?? exercise.reps;
          effectiveReps.push(repsForSet);
        }

        // Only include update if we have exactly exercise.sets completed sets
        // and at least one value differs from the original
        const completedCount = log.sets.filter(s => s.completed).length;
        if (completedCount === exercise.sets) {
          const hasChanges = effectiveReps.some((reps, idx) => reps !== exercise.repsBySet![idx]);
          if (hasChanges) {
            updates[exercise.id] = effectiveReps;
          }
        }
      }

      return updates;
    };

    const finishWorkout = async () => {
      try {
        const completedAt = Date.now();
        const startedAtMs = activeWorkout.session.startedAt.getTime();
        const totalDuration = Math.max(1, Math.round((completedAt - startedAtMs) / (1000 * 60)));
        const repsBySetUpdates = calculateRepsBySetUpdates();

        cancelWorkoutTimer(user.id);
        activitySync.completeWorkout(activeWorkout.session.id, {
          exercises: exerciseLogs,
          completedAtMs: completedAt,
          totalDuration,
          repsBySetUpdates: Object.keys(repsBySetUpdates).length > 0 ? repsBySetUpdates : undefined
        });
        void activitySync.syncPending();

        const completedWeightsByExercise = getCompletedWeightsByExerciseFromLogs(exerciseLogs);
        if (Object.keys(completedWeightsByExercise).length > 0) {
          setOptimisticLastWeightsByRoutine((previousWeights) => ({
            ...previousWeights,
            [activeWorkout.routine.id]: {
              ...(previousWeights[activeWorkout.routine.id] ?? {}),
              ...completedWeightsByExercise
            }
          }));
        }

        setShowActiveWorkout(false);

        showToast('Entrenamiento completado', 'success');
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
  }, [activeWorkout, activitySync, confirm, showToast, user.id]);

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
            <h1 className="text-xl font-display text-white mb-2">No pudimos cargar tu información</h1>
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

  const recentActivity = <RecentActivity sessions={recentSessions} onExploreRoutines={onNavigateToRoutines} />;

  return (
    <div className="app-shell pb-28 dashboard-page">
      <main className="page-container">
        {dashboardStatusMessage && <div className="connection-banner" role="status">
          <div><strong>Estado de conexión</strong><p>{dashboardStatusMessage}</p>
            {usingCachedData && lastUpdatedAt && <small>Última actualización: {formatDateValue(new Date(lastUpdatedAt), { dateStyle: 'medium', timeStyle: 'short' })}</small>}
          </div>
          <button type="button" className="btn-secondary" disabled={dashboardRefreshing} onClick={() => void refresh()}>{dashboardRefreshing ? 'Actualizando…' : 'Actualizar'}</button>
        </div>}

        {view === 'routines' && <>
          <DashboardOverview userName={user.name} summary={stats} plannedRoutine={plannedRoutine}
            routines={dashboardRoutines} weeklyPlan={weeklyPlan} today={plannedDay}
            onAssignDay={(day, routineId) => {
              if (!assignDay(day, routineId)) showToast('No se pudo guardar tu semana. El cambio solo durará esta sesión.', 'error');
            }}
            activeRoutineName={activeWorkout?.routine.name} onStart={handleStartWorkout}
            onContinue={() => setShowActiveWorkout(true)} onCancel={handleCancelActiveWorkout} onNavigateToRoutines={onNavigateToRoutines}
            onChooseRoutine={() => {
              routineSelectionRef.current?.focus({ preventScroll: true });
              routineSelectionRef.current?.scrollIntoView({ block: 'start' });
            }} />
          <div className="dashboard-columns agenda-layout">
            <section ref={routineSelectionRef} className="min-w-0 scroll-mt-4" tabIndex={-1} aria-labelledby="ready-routines-title">
              <div className="agenda-section-heading"><h2 id="ready-routines-title">Tus rutinas</h2>
                <button type="button" className="agenda-library-link" onClick={onNavigateToRoutines}>Biblioteca<ArrowUpRight size={14} aria-hidden="true" /></button>
              </div>
              <MuscleGroupDashboard routines={dashboardRoutines} currentUser={user} onStartWorkout={handleStartWorkout}
                onRoutineMuscleGroupChange={handleRoutineMuscleGroupChange} recommendedGroup={recommendedGroup} />
            </section>
            <aside className="dashboard-aside">{recentActivity}<CompetitionPanel competition={dashboardData.competition} /></aside>
          </div>
        </>}

        {view === 'progress' && <>
          <div className="page-heading"><span className="eyebrow">Seguimiento</span><h1>Tu progreso</h1>
            <p>Lo que registras hoy, te ayuda a avanzar mañana.</p></div>
          <Suspense fallback={<PanelSkeleton title="Historial y progreso" heightClass="h-64" />}>
            <DeferredExerciseProgressPanel summaries={dashboardData.exerciseProgress} />
          </Suspense>
        </>}
        {view === 'calendar' && <>
          <div className="page-heading"><span className="eyebrow">Seguimiento</span><h1>Tu calendario</h1>
            <p>Cada actividad forma parte de tu historia.</p></div>
          <div className="dashboard-columns calendar-columns">
            <Suspense fallback={<PanelSkeleton title="Calendario" heightClass="h-[22rem]" />}>
              <DeferredWorkoutCalendar calendar={dashboardData.calendar} currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
            </Suspense>
            {recentActivity}
          </div>
        </>}
        {showIosNotificationGuide && <section className="app-card mt-6 flex items-start gap-3 p-4">
          <Bell size={18} className="shrink-0 text-mint" /><div className="flex-1 text-sm"><h2 className="font-semibold text-white">Notificaciones en iOS</h2>
            <p className="mt-1 text-slate-400">Instala Herculito en Pantalla de inicio para recibir alertas de descanso con el teléfono bloqueado.</p></div>
          <button type="button" onClick={handleDismissIosGuide} className="btn-ghost text-xs">Entendido</button>
        </section>}
      </main>
    </div>
  );
};
