import React, { useState } from 'react';
import { Plus, Edit, Trash2, Calendar, Dumbbell, Save } from 'lucide-react';
import { useWorkouts } from '../hooks/useWorkouts';
import { Exercise, Workout } from '../types';

export const Routines: React.FC = () => {
  const { workouts, updateWorkout, loading } = useWorkouts();
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const daysOfWeek = [
    { key: 'monday', name: 'Lunes' },
    { key: 'tuesday', name: 'Martes' },
    { key: 'wednesday', name: 'Miércoles' },
    { key: 'thursday', name: 'Jueves' },
    { key: 'friday', name: 'Viernes' },
    { key: 'saturday', name: 'Sábado' },
    { key: 'sunday', name: 'Domingo' }
  ];

  const getWorkoutForDay = (day: string) => {
    return workouts.find(w => w.day === day);
  };

  const handleCreateWorkout = (day: string, dayName: string) => {
    const newWorkout: Workout = {
      id: day,
      day,
      name: `Entrenamiento ${dayName}`,
      exercises: []
    };
    setEditingWorkout(newWorkout);
  };

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      id: `exercise_${Date.now()}`,
      name: 'Nuevo Ejercicio',
      sets: 3,
      reps: 10,
      restTime: 90
    };
    setEditingExercise(newExercise);
  };

  const handleSaveExercise = () => {
    if (!editingExercise || !editingWorkout) return;

    const updatedExercises = editingWorkout.exercises.some(e => e.id === editingExercise.id)
      ? editingWorkout.exercises.map(e => e.id === editingExercise.id ? editingExercise : e)
      : [...editingWorkout.exercises, editingExercise];

    setEditingWorkout({
      ...editingWorkout,
      exercises: updatedExercises
    });
    setEditingExercise(null);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!editingWorkout) return;
    
    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.filter(e => e.id !== exerciseId)
    });
  };

  const handleSaveWorkout = async () => {
    if (!editingWorkout) return;
    
    await updateWorkout(editingWorkout);
    setEditingWorkout(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando rutinas...</div>
      </div>
    );
  }

  // Modal de edición de ejercicio
  if (editingExercise) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingExercise.id.includes('exercise_') ? 'Nuevo Ejercicio' : 'Editar Ejercicio'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre del ejercicio
                </label>
                <input
                  type="text"
                  value={editingExercise.name}
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Series
                  </label>
                  <input
                    type="number"
                    value={editingExercise.sets}
                    onChange={(e) => setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Repeticiones
                  </label>
                  <input
                    type="number"
                    value={editingExercise.reps}
                    onChange={(e) => setEditingExercise({ ...editingExercise, reps: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descanso (segundos)
                </label>
                <input
                  type="number"
                  value={editingExercise.restTime || 0}
                  onChange={(e) => setEditingExercise({ ...editingExercise, restTime: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  min="0"
                  step="10"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveExercise}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Save size={16} />
                <span>Guardar</span>
              </button>
              <button
                onClick={() => setEditingExercise(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal de edición de entrenamiento
  if (editingWorkout) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-6 pb-20">
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-4">
            <h2 className="text-lg font-semibold text-white mb-4">
              Editar {daysOfWeek.find(d => d.key === editingWorkout.day)?.name}
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre del entrenamiento
              </label>
              <input
                type="text"
                value={editingWorkout.name}
                onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-white">Ejercicios</h3>
              <button
                onClick={handleAddExercise}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {editingWorkout.exercises.map(exercise => (
                <div key={exercise.id} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{exercise.name}</div>
                      <div className="text-sm text-gray-400">
                        {exercise.sets} × {exercise.reps} 
                        {exercise.restTime && ` • ${exercise.restTime}s descanso`}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingExercise(exercise)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(exercise.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {editingWorkout.exercises.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  No hay ejercicios. Agrega uno usando el botón +
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveWorkout}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Save size={16} />
                <span>Guardar Entrenamiento</span>
              </button>
              <button
                onClick={() => setEditingWorkout(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal de rutinas
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-6 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Gestión de Rutinas</h1>
          <p className="text-gray-400">Configura tus entrenamientos semanales</p>
        </div>

        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const workout = getWorkoutForDay(day.key);
            
            return (
              <div key={day.key} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-blue-400" size={20} />
                    <div>
                      <div className="font-medium text-white">{day.name}</div>
                      {workout ? (
                        <div className="text-sm text-gray-400">
                          {workout.name} • {workout.exercises.length} ejercicio{workout.exercises.length !== 1 ? 's' : ''}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Sin entrenamiento</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {workout ? (
                      <button
                        onClick={() => setEditingWorkout(workout)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateWorkout(day.key, day.name)}
                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};