import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Pencil } from 'lucide-react';
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
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isPublic, setIsPublic] = useState(routine?.isPublic ?? false);
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState<MuscleGroup>(routine?.primaryMuscleGroup || 'fullbody');
  const [exerciseError, setExerciseError] = useState('');

  const handleAddExercise = (exercise: Exercise) => {
    if (exercises.some((existing) => existing.id === exercise.id)) {
      setExerciseError('Este ejercicio ya esta en la rutina.');
      return;
    }
    if (exerciseError) setExerciseError('');
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
      <div className="app-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display text-white">
            {routine ? 'Editar Rutina' : 'Nueva Rutina'}
          </h2>
          <button
            onClick={onCancel}
            className="btn-ghost"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la rutina
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Ej: Pecho y Tríceps"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                placeholder="Describe tu rutina..."
                rows={3}
              />
            </div>

            {/* Grupo muscular */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Grupo muscular principal
              </label>
              <select
                value={primaryMuscleGroup}
                onChange={(e) => setPrimaryMuscleGroup(e.target.value as MuscleGroup)}
                className="input"
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
                className="w-4 h-4 text-mint bg-slateDeep border-mist/60 rounded focus:ring-mint/50"
              />
              <label htmlFor="isPublic" className="text-sm text-slate-300">
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
                className="btn-secondary flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Añadir Ejercicio</span>
              </button>
            </div>

            {exercises.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No hay ejercicios en esta rutina</p>
                <p className="text-sm mt-1">Añade al menos un ejercicio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((exercise, index) => (
                  <div key={exercise.id} className="app-surface-muted p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">
                          {index + 1}. {exercise.name}
                        </h4>
                        {exercise.video?.url && (
                          <span className="text-xs bg-mint/20 text-mint px-2 py-0.5 rounded-full">
                            Con video
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExercise(exercise);
                            setShowExerciseSelector(true);
                          }}
                          className="text-slate-400 hover:text-mint transition-colors"
                          title="Editar ejercicio"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <label className="block text-slate-300 mb-1">Series</label>
                        <input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => handleUpdateExercise(exercise.id, { sets: parseInt(e.target.value) })}
                          className="input input-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Reps</label>
                        <input
                          type="number"
                          value={exercise.reps}
                          onChange={(e) => handleUpdateExercise(exercise.id, { reps: parseInt(e.target.value) })}
                          className="input input-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Descanso (seg)</label>
                        <input
                          type="number"
                          value={exercise.restTime}
                          onChange={(e) => handleUpdateExercise(exercise.id, { restTime: parseInt(e.target.value) })}
                          className="input input-sm"
                          min="30"
                          step="30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {exerciseError && (
              <div className="mt-3 text-sm text-amberGlow">
                {exerciseError}
              </div>
            )}
          </div>

          {/* Selector de ejercicios */}
          {showExerciseSelector && (
            <ExerciseSelector
              onSelectExercise={handleAddExercise}
              onCancel={() => {
                setShowExerciseSelector(false);
                setEditingExercise(null);
              }}
              editingExercise={editingExercise}
              onUpdateExercise={handleUpdateExercise}
            />
          )}

          {/* Botones de acción */}
          <div className="flex space-x-3 pt-6">
            <button
              type="submit"
              disabled={loading || !name.trim() || exercises.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save size={18} />
              <span>{loading ? 'Guardando...' : 'Guardar Rutina'}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary px-6"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
