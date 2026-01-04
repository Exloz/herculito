import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Award, Clock, LogOut, Dumbbell } from 'lucide-react';
import { User, MuscleGroup, WorkoutSession, Routine, ExerciseLog } from '../types';
import { useRoutines } from '../hooks/useRoutines';
import { useWorkoutSessions } from '../hooks/useWorkoutSessions';
import { MuscleGroupDashboard } from '../components/MuscleGroupDashboard';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { ActiveWorkout } from '../components/ActiveWorkout';
import { getRecommendedMuscleGroup } from '../utils/muscleGroups';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const ACTIVE_WORKOUT_PROGRESS_KEY = 'activeWorkoutProgress';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms

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
};

const hasCompletedSets = (exerciseLogs: ExerciseLog[] | null): boolean => {
  if (!exerciseLogs) return false;
  return exerciseLogs.some(log => log.sets?.some(set => set.completed));
};

const loadProgressFromStorage = (sessionId: string): ExerciseLog[] | null => {
  const stored = localStorage.getItem(`${ACTIVE_WORKOUT_PROGRESS_KEY}_${sessionId}`);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    const now = Date.now();
    if (now - data.timestamp > EXPIRATION_TIME) {
      localStorage.removeItem(`${ACTIVE_WORKOUT_PROGRESS_KEY}_${sessionId}`);
      return null;
    }
    return data.exerciseLogs as ExerciseLog[];
  } catch {
    localStorage.removeItem(`${ACTIVE_WORKOUT_PROGRESS_KEY}_${sessionId}`);
    return null;
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

    const progressLogs = loadProgressFromStorage(data.session.id);
    if (!hasCompletedSets(progressLogs)) {
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


   // Restore active workout from localStorage on mount
  useEffect(() => {
    const stored = loadActiveWorkoutFromStorage();
    if (stored) {
      setActiveWorkout(stored);
      setShowActiveWorkout(false);
    }
  }, []);


   const { routines, loading: routinesLoading, updateRoutine } = useRoutines(user.id);
  const {
    sessions,
    loading: sessionsLoading,
    startWorkoutSession,
    completeWorkoutSession,
    getRecentSessions,
    getWorkoutStats
  } = useWorkoutSessions(user);

  // Obtener recomendación de grupo muscular
  const recentSessions = getRecentSessions(7); // Últimos 7 días
  const recommendedGroup = getRecommendedMuscleGroup(recentSessions);

  // Estadísticas de entrenamiento
  const stats = getWorkoutStats();
   const handleStartWorkout = async (routineId: string) => {
     try {
       const session = await startWorkoutSession(routineId);
       const routine = routines.find(r => r.id === routineId);
 

      if (routine) {
        const newActiveWorkout = { routine, session };
        setActiveWorkout(newActiveWorkout);
        setShowActiveWorkout(true);
      } else {
        alert('Rutina no encontrada');
      }

     } catch {
       alert('Error al iniciar el entrenamiento. Inténtalo de nuevo.');
     }
   };

  const handleRoutineMuscleGroupChange = async (routineId: string, newMuscleGroup: MuscleGroup) => {
    try {
      await updateRoutine(routineId, { primaryMuscleGroup: newMuscleGroup });
    } catch {
      alert('Error al cambiar el grupo muscular. Inténtalo de nuevo.');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDayClick = (_date: string) => {
    // Aquí podrías mostrar detalles del entrenamiento de ese día
  };

  const handleBackToDashboard = (hasProgress: boolean) => {
    setShowActiveWorkout(false);
    if (hasProgress && activeWorkout) {
      saveActiveWorkoutToStorage(activeWorkout);
    } else {
      setActiveWorkout(null);
      saveActiveWorkoutToStorage(null);
    }
  };


   const handleCompleteWorkout = async (exerciseLogs: ExerciseLog[]) => {
     if (!activeWorkout) return;

      try {
      await completeWorkoutSession(activeWorkout.session.id, exerciseLogs);
      setActiveWorkout(null);
      setShowActiveWorkout(false);
      saveActiveWorkoutToStorage(null);
      alert('¡Entrenamiento completado! 🎉');

     } catch (error) {
       console.error('Error completing workout:', error);
       alert('Error al completar el entrenamiento. Inténtalo de nuevo.');
     }
  };

  // Si hay un entrenamiento activo, mostrar la vista de entrenamiento
  if (activeWorkout && showActiveWorkout) {
    return (
      <ActiveWorkout
        user={user}
        routine={activeWorkout.routine}
        session={activeWorkout.session}
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
      <header className="app-header px-4 py-5 sm:py-6">
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
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">Calendario</span>
              </button>

              <button
                onClick={onLogout}
                className="btn-danger flex items-center gap-2"
                title="Cerrar sesión"
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
              <button
                onClick={() => setShowActiveWorkout(true)}
                className="btn-primary"
              >
                Reanudar
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
                              {session.completedAt.toLocaleDateString()}
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
    </div>
  );
};