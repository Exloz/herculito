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
    return data;
  } catch {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    return null;
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [showCalendar, setShowCalendar] = useState(false);
   const [activeWorkout, setActiveWorkout] = useState<{
     routine: Routine;
     session: WorkoutSession;
   } | null>(null);

   // Restore active workout from localStorage on mount
   useEffect(() => {
     const stored = loadActiveWorkoutFromStorage();
     if (stored) {
       setActiveWorkout(stored);
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
         saveActiveWorkoutToStorage(newActiveWorkout);
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

   const handleBackToDashboard = () => {
     setActiveWorkout(null);
     saveActiveWorkoutToStorage(null);
   };

  const handleCompleteWorkout = async (exerciseLogs: ExerciseLog[]) => {
    if (!activeWorkout) return;

    console.log('Completing workout with logs:', exerciseLogs);

     try {
       await completeWorkoutSession(activeWorkout.session.id, exerciseLogs);
       setActiveWorkout(null);
       saveActiveWorkoutToStorage(null);
       alert('¡Entrenamiento completado! 🎉');
     } catch (error) {
       console.error('Error completing workout:', error);
       alert('Error al completar el entrenamiento. Inténtalo de nuevo.');
     }
  };

  // Si hay un entrenamiento activo, mostrar la vista de entrenamiento
  if (activeWorkout) {
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center text-sm sm:text-base">
                  <Dumbbell size={20} className="text-white" />
                </div>
                <span>Herculito</span>
              </h1>
              <p className="text-gray-400 mt-1 text-sm truncate">Bienvenido, {user.name || 'Usuario'}</p>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 ${showCalendar
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                title="Ver calendario"
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">Calendario</span>
              </button>

              <button
                onClick={onLogout}
                className="p-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2"
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
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-2">
                <Award className="text-yellow-400" size={16} />
                <span className="text-xs sm:text-sm font-medium text-gray-300">Total</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.totalWorkouts}</div>
              <div className="text-xs text-gray-400">entrenamientos</div>
            </div>

            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-2">
                <Calendar className="text-blue-400" size={16} />
                <span className="text-xs sm:text-sm font-medium text-gray-300">Esta semana</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.thisWeekWorkouts}</div>
              <div className="text-xs text-gray-400">entrenamientos</div>
            </div>

            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-2">
                <TrendingUp className="text-green-400" size={16} />
                <span className="text-xs sm:text-sm font-medium text-gray-300">Racha</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.currentStreak}</div>
              <div className="text-xs text-gray-400">días consecutivos</div>
            </div>

            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-2">
                <Clock className="text-purple-400" size={16} />
                <span className="text-xs sm:text-sm font-medium text-gray-300">Este mes</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.thisMonthWorkouts}</div>
              <div className="text-xs text-gray-400">entrenamientos</div>
            </div>
          </div>
        </div>
      </div>

       {/* Main Content */}
       <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
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
               <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                 Rutinas de Entrenamiento
               </h2>
               <p className="text-sm sm:text-base text-gray-400">
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
             <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
               <h3 className="text-lg font-semibold text-white mb-4">
                 Entrenamientos Recientes
               </h3>

               {recentSessions.length > 0 ? (
                 <div className="space-y-3">
                   {recentSessions.slice(0, 5).map((session) => (
                     <div
                       key={session.id}
                       className="bg-gray-700 rounded-lg p-3 border border-gray-600"
                     >
                       <div className="flex items-center justify-between mb-2">
                         <h4 className="font-medium text-white text-sm">
                           {session.routineName}
                         </h4>
                         {session.completedAt && (
                           <span className="text-xs text-gray-400">
                             {session.completedAt.toLocaleDateString()}
                           </span>
                         )}
                       </div>

                       {session.primaryMuscleGroup && (
                         <div className="flex items-center space-x-2">
                           <div
                             className="w-3 h-3 rounded-full"
                             style={{
                               backgroundColor:
                                 session.primaryMuscleGroup ?
                                   '#3b82f6' : '#6b7280'
                             }}
                           />
                           <span className="text-xs text-gray-400">
                             {session.primaryMuscleGroup || 'Sin categoría'}
                           </span>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-6">
                   <div className="text-gray-400 text-sm">
                     No hay entrenamientos recientes
                   </div>
                   <p className="text-gray-500 text-xs mt-1">
                     ¡Comienza tu primer entrenamiento!
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