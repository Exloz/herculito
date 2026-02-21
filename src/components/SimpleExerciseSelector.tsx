import React, { useState } from 'react';
import { Plus, X, Loader } from 'lucide-react';
import { Exercise } from '../types';

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: Exercise) => void;
  onCancel: () => void;
}

interface CustomExerciseForm {
  name: string;
  category: string;
  sets: number | '';
  reps: number | '';
  restTime: number | '';
  description: string;
}

const getNumericValue = (value: number | '', fallback: number, min: number) => {
  const resolvedValue = value === '' ? fallback : value;
  return Math.max(min, resolvedValue);
};

export const SimpleExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelectExercise,
  onCancel
}) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [error, setError] = useState<string>('');
  const [creatingExercise, setCreatingExercise] = useState(false);
  
  // Estado para ejercicio personalizado
  const [customExercise, setCustomExercise] = useState<CustomExerciseForm>({
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

  const handleSelectDefault = (defaultEx: { id: string; name: string; category: string; sets: number; reps: number; restTime: number }) => {
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

    const resolvedSets = getNumericValue(customExercise.sets, 3, 1);
    const resolvedReps = getNumericValue(customExercise.reps, 10, 1);
    const resolvedRestTime = getNumericValue(customExercise.restTime, 90, 30);

    setCreatingExercise(true);
    setError('');

    // Simular creación
    setTimeout(() => {
      const exercise: Exercise = {
        id: `custom_${Date.now()}`,
        name: customExercise.name,
        sets: resolvedSets,
        reps: resolvedReps,
        restTime: resolvedRestTime
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
      <div className="app-card w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-mist/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Añadir Ejercicio (Simple)</h3>
            <button
              type="button"
              onClick={() => {
                onCancel();
              }}
              className="btn-ghost"
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
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                !showCustomForm 
                  ? 'bg-mint/15 text-mint' 
                  : 'bg-slateDeep text-slate-300 hover:text-white'
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
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                showCustomForm 
                  ? 'bg-mint/15 text-mint' 
                  : 'bg-slateDeep text-slate-300 hover:text-white'
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
                    className="w-full p-3 bg-slateDeep hover:bg-charcoal rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-medium">{exercise.name}</h4>
                        <div className="flex items-center text-xs text-slate-400 space-x-2">
                          <span>{exercise.category}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
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
                  <label className="block text-sm text-slate-300 mb-1">Nombre del ejercicio *</label>
                  <input
                    type="text"
                    value={customExercise.name}
                    onChange={(e) => {
                      setCustomExercise({...customExercise, name: e.target.value});
                      if (error) setError('');
                    }}
                    className="input text-sm"
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
                    <label className="block text-sm text-slate-300 mb-1">Sets</label>
                    <input
                      type="number"
                      value={customExercise.sets}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === '') {
                          setCustomExercise({ ...customExercise, sets: '' });
                          return;
                        }

                        const parsedValue = Number.parseInt(nextValue, 10);
                        if (Number.isNaN(parsedValue)) return;
                        setCustomExercise({ ...customExercise, sets: parsedValue });
                      }}
                      className="input input-sm text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Reps</label>
                    <input
                      type="number"
                      value={customExercise.reps}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === '') {
                          setCustomExercise({ ...customExercise, reps: '' });
                          return;
                        }

                        const parsedValue = Number.parseInt(nextValue, 10);
                        if (Number.isNaN(parsedValue)) return;
                        setCustomExercise({ ...customExercise, reps: parsedValue });
                      }}
                      className="input input-sm text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Descanso (seg)</label>
                    <input
                      type="number"
                      value={customExercise.restTime}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === '') {
                          setCustomExercise({ ...customExercise, restTime: '' });
                          return;
                        }

                        const parsedValue = Number.parseInt(nextValue, 10);
                        if (Number.isNaN(parsedValue)) return;
                        setCustomExercise({ ...customExercise, restTime: parsedValue });
                      }}
                      className="input input-sm text-sm"
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
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCustomExercise}
                    disabled={!customExercise.name.trim() || creatingExercise}
                    className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-60"
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
