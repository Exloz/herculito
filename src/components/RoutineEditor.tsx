import React, { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Routine, Exercise, MuscleGroup } from '../types';
import { ExerciseSelector } from './ExerciseSelector';
import { MUSCLE_GROUPS } from '../utils/muscleGroups';

interface RoutineEditorProps {
  routine?: Routine;
  onSave: (name: string, description: string, exercises: Exercise[], isPublic?: boolean, primaryMuscleGroup?: MuscleGroup) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({
  routine,
  onSave,
  onCancel,
  loading = false
}) => {
  const [name, setName] = useState(routine?.name || '');
  const [description, setDescription] = useState(routine?.description || '');
  const [exercises, setExercises] = useState<Exercise[]>(routine?.exercises || []);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [isPublic, setIsPublic] = useState(routine?.isPublic ?? true);
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState<MuscleGroup>(routine?.primaryMuscleGroup || 'fullbody');

  const handleAddExercise = (exercise: Exercise) => {
    const newExercises = [...exercises, exercise];
    setExercises(newExercises);

    // Usar setTimeout para cerrar el selector después de que se complete la operación
    setTimeout(() => {
      setShowExerciseSelector(false);
    }, 100);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises(exercises.filter(e => e.id !== exerciseId));
  };

  const handleUpdateExercise = (exerciseId: string, updates: Partial<Exercise>) => {
    setExercises(exercises.map(e =>
      e.id === exerciseId ? { ...e, ...updates } : e
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || exercises.length === 0) return;
    onSave(name, description, exercises, isPublic, primaryMuscleGroup);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {routine ? 'Editar Rutina' : 'Nueva Rutina'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la rutina
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Ej: Pecho y Tríceps"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Describe tu rutina..."
                rows={3}
              />
            </div>

            {/* Grupo muscular */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Grupo muscular principal
              </label>
              <select
                value={primaryMuscleGroup}
                onChange={(e) => setPrimaryMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              >
                {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
                  <option key={key} value={key}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibilidad */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-300">
                Hacer esta rutina pública (otros usuarios podrán usarla)
              </label>
            </div>
          </div>

          {/* Lista de ejercicios */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Ejercicios ({exercises.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowExerciseSelector(true);
                }}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Plus size={16} />
                <span>Añadir Ejercicio</span>
              </button>
            </div>

            {exercises.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No hay ejercicios en esta rutina</p>
                <p className="text-sm mt-1">Añade al menos un ejercicio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((exercise, index) => (
                  <div key={exercise.id} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">
                        {index + 1}. {exercise.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exercise.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <label className="block text-gray-300 mb-1">Series</label>
                        <input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => handleUpdateExercise(exercise.id, { sets: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Reps</label>
                        <input
                          type="number"
                          value={exercise.reps}
                          onChange={(e) => handleUpdateExercise(exercise.id, { reps: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Descanso (seg)</label>
                        <input
                          type="number"
                          value={exercise.restTime}
                          onChange={(e) => handleUpdateExercise(exercise.id, { restTime: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                          min="30"
                          step="30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selector de ejercicios */}
          {showExerciseSelector && (
            <ExerciseSelector
              onSelectExercise={handleAddExercise}
              onCancel={() => {
                setShowExerciseSelector(false);
              }}
            />
          )}

          {/* Botones de acción */}
          <div className="flex space-x-3 pt-6">
            <button
              type="submit"
              disabled={loading || !name.trim() || exercises.length === 0}
              className="flex-1 flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Save size={18} />
              <span>{loading ? 'Guardando...' : 'Guardar Rutina'}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};