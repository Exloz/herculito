import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, TrendingUp, Award, Clock, LogOut, Dumbbell, Bell } from 'lucide-react';
import { User, MuscleGroup, WorkoutSession, Routine, ExerciseLog } from '../types';
import { useRoutines } from '../hooks/useRoutines';
import { useWorkoutSessions } from '../hooks/useWorkoutSessions';
import { MuscleGroupDashboard } from '../components/MuscleGroupDashboard';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { ActiveWorkout } from '../components/ActiveWorkout';
import { getRecommendedMuscleGroup } from '../utils/muscleGroups';
import { useUI } from '../contexts/ui-context';
import { formatDateInAppTimeZone } from '../utils/dateUtils';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const ACTIVE_WORKOUT_PROGRESS_KEY = 'activeWorkoutProgress';
const IOS_NOTIFICATION_GUIDE_KEY = 'iosNotificationGuideSeen';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms

const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIPadOS;
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

    return data;
  } catch {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    return null;
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [showCalendar, setShowCalendar] = useState(true);
  const [activeWorkout, setActiveWorkout] = useState<{
    routine: Routine;
    session: WorkoutSession;
  } | null>(null);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showIosNotificationGuide, setShowIosNotificationGuide] = useState(false);
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


   const { routines, loading: routinesLoading, updateRoutine, incrementRoutineUsage } = useRoutines(user.id);
  const {
    sessions,
    loading: sessionsLoading,
    startWorkoutSession,
    completeWorkoutSession,
    getRecentSessions,
    getWorkoutStats
  } = useWorkoutSessions(user);

  // Obtener recomendación de grupo muscular
  const recentSessions = useMemo(() => getRecentSessions(7), [getRecentSessions]);
  const recommendedGroup = useMemo(() => getRecommendedMuscleGroup(recentSessions), [recentSessions]);

  // Estadísticas de entrenamiento
  const stats = useMemo(() => getWorkoutStats(), [getWorkoutStats]);

  const handleStartWorkout = useCallback(async (routineId: string) => {
    try {
      const routine = routines.find(r => r.id === routineId);

      if (routine) {
        const session = await startWorkoutSession(routine);
        const newActiveWorkout = { routine, session };
        setActiveWorkout(newActiveWorkout);
        setShowActiveWorkout(true);
        saveActiveWorkoutToStorage(newActiveWorkout);
      } else {
        showToast('Rutina no encontrada', 'error');
      }
    } catch {
      showToast('Error al iniciar el entrenamiento. Inténtalo de nuevo.', 'error');
    }
  }, [startWorkoutSession, routines, showToast]);

  const handleRoutineMuscleGroupChange = useCallback(async (routineId: string, newMuscleGroup: MuscleGroup) => {
    try {
      await updateRoutine(routineId, { primaryMuscleGroup: newMuscleGroup });
    } catch {
      showToast('Error al cambiar el grupo muscular. Inténtalo de nuevo.', 'error');
    }
  }, [updateRoutine, showToast]);

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


  const handleCompleteWorkout = useCallback(async (exerciseLogs: ExerciseLog[]) => {
    if (!activeWorkout) return;

    const finishWorkout = async () => {
      try {
        await completeWorkoutSession(activeWorkout.session.id, exerciseLogs);
        await incrementRoutineUsage(activeWorkout.routine.id);
        setActiveWorkout(null);
        setShowActiveWorkout(false);
        saveActiveWorkoutToStorage(null);
        showToast('Entrenamiento completado', 'success');
      } catch (error) {
        console.error('Error completing workout:', error);
        showToast('Error al completar el entrenamiento. Inténtalo de nuevo.', 'error');
      }
    };

    const allExercisesCompleted = activeWorkout.routine.exercises.every(exercise => {
      const log = exerciseLogs.find(l => l.exerciseId === exercise.id);
      return !!log && log.sets.length > 0 && log.sets.every(s => s.completed);
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
  }, [activeWorkout, completeWorkoutSession, confirm, showToast, incrementRoutineUsage]);

  // Si hay un entrenamiento activo, mostrar la vista de entrenamiento
  if (activeWorkout && showActiveWorkout) {
    return (
      <ActiveWorkout
        user={user}
        routine={activeWorkout.routine}
        session={activeWorkout.session}
        sessions={sessions}
        onBackToDashboard={handleBackToDashboard}
        onCompleteWorkout={handleCompleteWorkout}
      />
    );
  }

  if (routinesLoading || sessionsLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando dashboard...</p>
        </div>
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
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-mint rounded-2xl flex items-center justify-center text-sm sm:text-base shadow-lift">
                  <Dumbbell size={20} className="text-ink" />
                </div>
                <span>Herculito</span>
              </h1>
              <p className="text-slate-300 mt-1 text-sm truncate">Bienvenido, {user.name || 'Usuario'}</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-4">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`btn-secondary flex items-center gap-2 ${showCalendar ? 'border-mint/60 text-mint' : ''}`}
                title="Ver calendario"
                aria-label={showCalendar ? "Ocultar calendario" : "Ver calendario"}
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">Calendario</span>
              </button>

              <button
                onClick={onLogout}
                className="btn-danger flex items-center gap-2"
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
      <div className="px-4 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="app-surface p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="app-surface-muted p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="text-amberGlow" size={16} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">Total</span>
                </div>
                <div className="text-xl sm:text-2xl font-display text-white">{stats.totalWorkouts}</div>
                <div className="text-xs text-slate-400">entrenamientos</div>
              </div>

              <div className="app-surface-muted p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="text-mint" size={16} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">Esta semana</span>
                </div>
                <div className="text-xl sm:text-2xl font-display text-white">{stats.thisWeekWorkouts}</div>
                <div className="text-xs text-slate-400">entrenamientos</div>
              </div>

              <div className="app-surface-muted p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="text-mint" size={16} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">Racha</span>
                </div>
                <div className="text-xl sm:text-2xl font-display text-white">{stats.currentStreak}</div>
                <div className="text-xs text-slate-400">días consecutivos</div>
              </div>

              <div className="app-surface-muted p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="text-amberGlow" size={16} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">Este mes</span>
                </div>
                <div className="text-xl sm:text-2xl font-display text-white">{stats.thisMonthWorkouts}</div>
                <div className="text-xs text-slate-400">entrenamientos</div>
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
                  className="btn-primary"
                >
                  Reanudar
                </button>
                <button
                  onClick={handleCancelActiveWorkout}
                  className="btn-secondary text-crimson border-crimson/40 hover:text-crimson hover:border-crimson/60"
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
                className="btn-secondary self-start"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Calendario al inicio */}
        {showCalendar && (
          <div className="mb-6">
            <WorkoutCalendar
              sessions={sessions}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onDayClick={handleDayClick}
            />
          </div>
        )}


         <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
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
               routines={routines}
               currentUser={user}
               onStartWorkout={handleStartWorkout}
               onRoutineMuscleGroupChange={handleRoutineMuscleGroupChange}
               recommendedGroup={recommendedGroup}
             />
           </div>

           {/* Sidebar - Solo entrenamientos recientes */}
            <div className="order-1 lg:order-2 space-y-4 sm:space-y-6">
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
            Version 1.0.0
          </div>
        </div>
    </div>
  );
};
