import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Pencil, Play, VideoOff } from 'lucide-react';
import { Routine, Exercise, MuscleGroup } from '../types';
import { ExerciseSelector } from './ExerciseSelector';
import { MUSCLE_GROUPS } from '../utils/muscleGroups';

interface ExerciseDraftValues {
  sets?: string;
  reps?: string;
  restTime?: string;
}

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
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraftValues>>({});

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


  const handleExerciseNumberChange = (exerciseId: string, field: keyof ExerciseDraftValues, rawValue: string) => {
    setExerciseDrafts((previousDrafts) => ({
      ...previousDrafts,
      [exerciseId]: {
        ...previousDrafts[exerciseId],
        [field]: rawValue
      }
    }));

    if (rawValue.trim() === '') {
      return;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    const minValue = field === 'restTime' ? 5 : 1;
    handleUpdateExercise(exerciseId, { [field]: Math.max(minValue, parsedValue) } as Partial<Exercise>);
  };

  const handleExerciseNumberBlur = (exerciseId: string, field: keyof ExerciseDraftValues, fallback: number) => {
    const draftValue = exerciseDrafts[exerciseId]?.[field];
    if (draftValue === undefined) {
      return;
    }

    const minValue = field === 'restTime' ? 5 : 1;
    const parsedValue = Number.parseInt(draftValue, 10);
    const nextValue = Number.isNaN(parsedValue) ? fallback : Math.max(minValue, parsedValue);

    handleUpdateExercise(exerciseId, { [field]: nextValue } as Partial<Exercise>);

    setExerciseDrafts((previousDrafts) => {
      const currentDraft = previousDrafts[exerciseId];
      if (!currentDraft) return previousDrafts;

      const nextDraft = { ...currentDraft };
      delete nextDraft[field];

      const nextDrafts = { ...previousDrafts };
      if (Object.keys(nextDraft).length === 0) {
        delete nextDrafts[exerciseId];
      } else {
        nextDrafts[exerciseId] = nextDraft;
      }

      return nextDrafts;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showExerciseSelector) return;
    if (!name.trim() || exercises.length === 0) return;
    onSave(name, description, exercises, isPublic, primaryMuscleGroup);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="app-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-editor-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="routine-editor-title" className="text-xl font-display text-white">
            {routine ? 'Editar Rutina' : 'Nueva Rutina'}
          </h2>
          <button
            onClick={onCancel}
            className="btn-ghost"
            aria-label="Cerrar editor de rutina"
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
                        {exercise.video?.url ? (
                          <Play size={14} className="text-mint" />
                        ) : (
                          <VideoOff size={14} className="text-slate-500" />
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
                          value={exerciseDrafts[exercise.id]?.sets ?? String(exercise.sets)}
                          onChange={(e) => handleExerciseNumberChange(exercise.id, 'sets', e.target.value)}
                          onBlur={() => handleExerciseNumberBlur(exercise.id, 'sets', exercise.sets)}
                          className="input input-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Reps</label>
                        <input
                          type="number"
                          value={exerciseDrafts[exercise.id]?.reps ?? String(exercise.reps)}
                          onChange={(e) => handleExerciseNumberChange(exercise.id, 'reps', e.target.value)}
                          onBlur={() => handleExerciseNumberBlur(exercise.id, 'reps', exercise.reps)}
                          className="input input-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Desc. (s)</label>
                        <input
                          type="number"
                          value={exerciseDrafts[exercise.id]?.restTime ?? String(exercise.restTime ?? 90)}
                          onChange={(e) => handleExerciseNumberChange(exercise.id, 'restTime', e.target.value)}
                          onBlur={() => handleExerciseNumberBlur(exercise.id, 'restTime', exercise.restTime ?? 90)}
                          className="input input-sm"
                          min="5"
                          step="5"
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

          {/* Botones de acción */}
          <div className="flex space-x-3 pt-6">
            <button
              type="submit"
              disabled={loading || showExerciseSelector || !name.trim() || exercises.length === 0}
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
      </div>
    </div>
  );
};
