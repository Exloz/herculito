import React, { useState } from 'react';
import { Plus, X, Loader } from 'lucide-react';
import { Exercise } from '../types';

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: Exercise) => void;
  onCancel: () => void;
}

export const SimpleExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelectExercise,
  onCancel
}) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [error, setError] = useState<string>('');
  const [creatingExercise, setCreatingExercise] = useState(false);
  
  // Estado para ejercicio personalizado
  const [customExercise, setCustomExercise] = useState({
    name: '',
    category: '',
    sets: 3,
    reps: 10,
    restTime: 90,
    description: ''
  });

  // Ejercicios predeterminados para testing
  const defaultExercises = [
    { id: 'press-banca', name: 'Press de Banca', category: 'Pecho', sets: 3, reps: 10, restTime: 120 },
    { id: 'sentadilla', name: 'Sentadilla', category: 'Piernas', sets: 3, reps: 12, restTime: 90 },
    { id: 'peso-muerto', name: 'Peso Muerto', category: 'Espalda', sets: 3, reps: 8, restTime: 180 },
  ];

  const handleSelectDefault = (defaultEx: any) => {
    const exercise: Exercise = {
      id: `${defaultEx.id}_${Date.now()}`,
      name: defaultEx.name,
      sets: defaultEx.sets,
      reps: defaultEx.reps,
      restTime: defaultEx.restTime
    };
    onSelectExercise(exercise);
  };

  const handleCustomExercise = async () => {
    if (!customExercise.name.trim()) {
      setError('El nombre del ejercicio es requerido');
      return;
    }

    setCreatingExercise(true);
    setError('');

    // Simular creación
    setTimeout(() => {
      const exercise: Exercise = {
        id: `custom_${Date.now()}`,
        name: customExercise.name,
        sets: customExercise.sets,
        reps: customExercise.reps,
        restTime: customExercise.restTime
      };
      
      // Limpiar formulario
      setCustomExercise({
        name: '',
        category: '',
        sets: 3,
        reps: 10,
        restTime: 90,
        description: ''
      });

      onSelectExercise(exercise);
      setCreatingExercise(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Añadir Ejercicio (Simple)</h3>
            <button
              type="button"
              onClick={() => {
                onCancel();
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Pestañas */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(false);
                setError('');
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                !showCustomForm 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Predeterminados
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(true);
                setError('');
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                showCustomForm 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Crear Nuevo
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {!showCustomForm ? (
            <div className="p-4">
              <div className="space-y-2">
                {defaultExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => handleSelectDefault(exercise)}
                    className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-md text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-medium">{exercise.name}</h4>
                        <div className="flex items-center text-xs text-gray-400 space-x-2">
                          <span>{exercise.category}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {exercise.sets} x {exercise.reps}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nombre del ejercicio *</label>
                  <input
                    type="text"
                    value={customExercise.name}
                    onChange={(e) => {
                      setCustomExercise({...customExercise, name: e.target.value});
                      if (error) setError('');
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Ej: Press de banca"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-500 rounded-md p-3 text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Sets</label>
                    <input
                      type="number"
                      value={customExercise.sets}
                      onChange={(e) => setCustomExercise({...customExercise, sets: parseInt(e.target.value) || 1})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Reps</label>
                    <input
                      type="number"
                      value={customExercise.reps}
                      onChange={(e) => setCustomExercise({...customExercise, reps: parseInt(e.target.value) || 1})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Descanso (seg)</label>
                    <input
                      type="number"
                      value={customExercise.restTime}
                      onChange={(e) => setCustomExercise({...customExercise, restTime: parseInt(e.target.value) || 30})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      min="30"
                      step="30"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomForm(false);
                      setError('');
                      setCustomExercise({
                        name: '',
                        category: '',
                        sets: 3,
                        reps: 10,
                        restTime: 90,
                        description: ''
                      });
                    }}
                    className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCustomExercise}
                    disabled={!customExercise.name.trim() || creatingExercise}
                    className="flex-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    {creatingExercise ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Crear y Añadir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};