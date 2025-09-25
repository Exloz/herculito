import { useState } from 'react';
import { Calendar, Dumbbell, CheckCircle, ArrowLeft } from 'lucide-react';
import { EnhancedExerciseCard } from '../components/EnhancedExerciseCard';
import { RoutineSelector } from '../components/RoutineSelector';
import { Timer } from '../components/Timer';
import { UserProfile } from '../components/UserProfile';
import { useRoutines, useWorkoutSessions, useExerciseHistory } from '../hooks/useRoutines';
import { User, Routine, WorkoutSet } from '../types';
import { getCurrentDateString, formatDateString } from '../utils/dateUtils';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [showTimer, setShowTimer] = useState(false);
  const [currentDate] = useState(() => getCurrentDateString());
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<{ [exerciseId: string]: WorkoutSet[] }>({});
  
  const { routines, loading: routinesLoading, initializeDefaultRoutines } = useRoutines(user.id);
  const { startWorkoutSession, completeWorkoutSession } = useWorkoutSessions(user.id);
  const { updateExerciseHistory, getExerciseHistory } = useExerciseHistory(user.id);


  // Inicializar rutinas por defecto si no hay ninguna
  useState(() => {
    if (!routinesLoading && routines.length === 0) {
      initializeDefaultRoutines();
    }
  });

  const formatDate = (dateString: string) => formatDateString(dateString);

  const handleSelectRoutine = async (routine: Routine) => {
    try {
      const sessionId = await startWorkoutSession(routine);
      setSelectedRoutine(routine);
      setCurrentSession(sessionId);
      
      // Inicializar sets con historial
      const initialSets: { [exerciseId: string]: WorkoutSet[] } = {};
      routine.exercises.forEach(exercise => {
        const history = getExerciseHistory(exercise.id);
        const sets: WorkoutSet[] = [];
        for (let i = 1; i <= exercise.sets; i++) {
          sets.push({
            setNumber: i,
            weight: history?.lastWeight[i - 1] || 0,
            completed: false
          });
        }
        initialSets[exercise.id] = sets;
      });
      setExerciseSets(initialSets);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  };

  const handleUpdateSets = (exerciseId: string, sets: WorkoutSet[]) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseId]: sets
    }));
  };

  const handleStartTimer = () => {
    setShowTimer(true);
  };

  const handleCompleteWorkout = async () => {
    if (!currentSession || !selectedRoutine) return;

    try {
      // Actualizar historial de ejercicios
      for (const exercise of selectedRoutine.exercises) {
        const sets = exerciseSets[exercise.id] || [];
        const weights = sets.map(s => s.weight);
        await updateExerciseHistory(exercise.id, exercise.name, weights);
      }

      // Completar sesión
      await completeWorkoutSession(currentSession, Object.entries(exerciseSets).map(([exerciseId, sets]) => ({
        exerciseId,
        userId: user.id,
        sets,
        date: currentDate
      })));

      // Resetear estado
      setSelectedRoutine(null);
      setCurrentSession(null);
      setExerciseSets({});
    } catch (error) {
      console.error('Error al completar entrenamiento:', error);
    }
  };

  const handleBackToSelection = () => {
    setSelectedRoutine(null);
    setCurrentSession(null);
    setExerciseSets({});
  };

  if (routinesLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="mx-auto mb-4 text-blue-400 animate-bounce" size={48} />
          <div className="text-white text-lg">Cargando entrenamientos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-md mx-auto">
        {/* Perfil de Usuario */}
        <UserProfile user={user} onLogout={onLogout} />
        
        <div className="px-4 py-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="text-blue-400" size={24} />
              <h1 className="text-xl font-bold text-white">
                {formatDate(currentDate)}
              </h1>
            </div>
          </div>

          {/* Mostrar selector de rutina o entrenamiento activo */}
          {!selectedRoutine ? (
            <RoutineSelector 
              routines={routines}
              onSelectRoutine={handleSelectRoutine}
              loading={routinesLoading}
            />
          ) : (
            <div>
              {/* Header del entrenamiento */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBackToSelection}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="text-center flex-1">
                  <h2 className="text-lg font-semibold text-white">{selectedRoutine.name}</h2>
                  <p className="text-sm text-gray-400">{selectedRoutine.exercises.length} ejercicios</p>
                </div>
                <div className="w-10" /> {/* Spacer */}
              </div>

              {/* Lista de ejercicios */}
              <div className="space-y-4 mb-6">
                {selectedRoutine.exercises.map(exercise => (
                  <EnhancedExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    exerciseHistory={getExerciseHistory(exercise.id)}
                    onUpdateSets={handleUpdateSets}
                    onStartTimer={handleStartTimer}
                  />
                ))}
              </div>

              {/* Botón completar entrenamiento */}
              <div className="sticky bottom-24 bg-gray-900 py-4">
                <button
                  onClick={handleCompleteWorkout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <CheckCircle size={20} />
                  <span>Completar Entrenamiento</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timer flotante */}
      {showTimer && <Timer onClose={() => setShowTimer(false)} />}
    </div>
  );
};