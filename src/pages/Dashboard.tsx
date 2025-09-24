import React, { useState, useEffect } from 'react';
import { Calendar, Dumbbell } from 'lucide-react';
import { UserSelector } from '../components/UserSelector';
import { ExerciseCard } from '../components/ExerciseCard';
import { Timer } from '../components/Timer';
import { useWorkouts, useExerciseLogs } from '../hooks/useWorkouts';

export const Dashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<'A' | 'B'>('A');
  const [showTimer, setShowTimer] = useState(false);
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const { logs, updateExerciseLog, getLogForExercise } = useExerciseLogs(currentDate);

  // Obtener el día de la semana actual
  const getDayOfWeek = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };

  const currentDay = getDayOfWeek();
  const todaysWorkout = workouts.find(w => w.day === currentDay);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleStartTimer = (seconds: number) => {
    setShowTimer(true);
  };

  if (workoutsLoading) {
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
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Calendar className="text-blue-400" size={24} />
            <h1 className="text-xl font-bold text-white">
              {formatDate(currentDate)}
            </h1>
          </div>
        </div>

        {/* Selector de Usuario */}
        <UserSelector currentUser={currentUser} onUserChange={setCurrentUser} />

        {/* Entrenamiento del día */}
        {todaysWorkout ? (
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center">
                <Dumbbell className="mr-2 text-blue-400" size={20} />
                {todaysWorkout.name}
              </h2>
              <p className="text-gray-400 text-sm">
                {todaysWorkout.exercises.length} ejercicio{todaysWorkout.exercises.length !== 1 ? 's' : ''} programado{todaysWorkout.exercises.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Lista de ejercicios */}
            <div className="space-y-4">
              {todaysWorkout.exercises.map(exercise => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  log={getLogForExercise(exercise.id, currentUser)}
                  userId={currentUser}
                  onUpdateLog={updateExerciseLog}
                  onStartTimer={handleStartTimer}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Dumbbell className="mx-auto mb-4 text-gray-600" size={48} />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Sin entrenamiento hoy
            </h3>
            <p className="text-gray-500 text-sm">
              ¡Día de descanso! Ve a Rutinas para configurar entrenamientos.
            </p>
          </div>
        )}
      </div>

      {/* Timer flotante */}
      {showTimer && <Timer onClose={() => setShowTimer(false)} />}
    </div>
  );
};