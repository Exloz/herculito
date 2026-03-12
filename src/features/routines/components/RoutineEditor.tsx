import React, { useState, useRef } from 'react';
import { Plus, Trash2, Save, X, Pencil, Play, VideoOff } from 'lucide-react';
import { Routine, Exercise, MuscleGroup } from '../../../shared/types';
import { ExerciseSelector } from './ExerciseSelector';
import { MUSCLE_GROUPS } from '../../dashboard/lib/muscleGroups';
import { useDialogA11y } from '../../../shared/hooks/useDialogA11y';
import { clampInteger, normalizeMultiline, normalizeSingleLine } from '../../../shared/lib/inputSanitizers';

const MAX_ROUTINE_NAME_LENGTH = 120;
const MAX_ROUTINE_DESCRIPTION_LENGTH = 600;
const MAX_SETS = 30;
const MAX_REPS = 200;
const MAX_REST_TIME_SECONDS = 3600;

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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState(routine?.name || '');
  const [description, setDescription] = useState(routine?.description || '');
  const [exercises, setExercises] = useState<Exercise[]>(routine?.exercises || []);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isPublic, setIsPublic] = useState(routine?.isPublic ?? false);
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState<MuscleGroup>(routine?.primaryMuscleGroup || 'fullbody');
  const [exerciseError, setExerciseError] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraftValues>>({});
  const [formError, setFormError] = useState('');

  useDialogA11y(dialogRef, { enabled: !showExerciseSelector, onClose: onCancel });

  const handleAddExercise = (exercise: Exercise) => {
    if (exercises.some((existing) => existing.id === exercise.id)) {
      setExerciseError('Este ejercicio ya esta en la rutina.');
      return;
    }
    if (exerciseError) setExerciseError('');
    if (formError) setFormError('');
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
    const maxValue = field === 'restTime' ? MAX_REST_TIME_SECONDS : field === 'reps' ? MAX_REPS : MAX_SETS;
    handleUpdateExercise(exerciseId, { [field]: clampInteger(parsedValue, minValue, maxValue) } as Partial<Exercise>);
  };

  const handleExerciseNumberBlur = (exerciseId: string, field: keyof ExerciseDraftValues, fallback: number) => {
    const draftValue = exerciseDrafts[exerciseId]?.[field];
    if (draftValue === undefined) {
      return;
    }

    const minValue = field === 'restTime' ? 5 : 1;
    const parsedValue = Number.parseInt(draftValue, 10);
    const maxValue = field === 'restTime' ? MAX_REST_TIME_SECONDS : field === 'reps' ? MAX_REPS : MAX_SETS;
    const nextValue = Number.isNaN(parsedValue) ? fallback : clampInteger(parsedValue, minValue, maxValue);

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

    const normalizedName = normalizeSingleLine(name, MAX_ROUTINE_NAME_LENGTH);
    const normalizedDescription = normalizeMultiline(description, MAX_ROUTINE_DESCRIPTION_LENGTH);

    if (normalizedName.length < 2) {
      setFormError('Usa un nombre de al menos 2 caracteres para identificar la rutina.');
      return;
    }

    if (exercises.length === 0) {
      setFormError('Agrega al menos un ejercicio antes de guardar la rutina.');
      return;
    }

    setFormError('');
    onSave(normalizedName, normalizedDescription, exercises, isPublic, primaryMuscleGroup);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        className={`app-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 ${showExerciseSelector ? 'pointer-events-none opacity-70' : ''}`}
        role="dialog"
        aria-modal={!showExerciseSelector}
        aria-labelledby="routine-editor-title"
        aria-hidden={showExerciseSelector}
        tabIndex={-1}
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
              <label htmlFor="routine-name" className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la rutina
              </label>
              <input
                id="routine-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, MAX_ROUTINE_NAME_LENGTH));
                  if (formError) setFormError('');
                }}
                className="input"
                placeholder="Ej: Pecho y Tríceps"
                maxLength={MAX_ROUTINE_NAME_LENGTH}
                required
                dir="auto"
              />
              <div className="mt-1 text-xs text-slate-400">{name.length}/{MAX_ROUTINE_NAME_LENGTH}</div>
            </div>

            <div>
              <label htmlFor="routine-description" className="block text-sm font-medium text-slate-300 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                id="routine-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_ROUTINE_DESCRIPTION_LENGTH))}
                className="input"
                placeholder="Describe tu rutina..."
                rows={3}
                maxLength={MAX_ROUTINE_DESCRIPTION_LENGTH}
                dir="auto"
              />
              <div className="mt-1 text-xs text-slate-400">{description.length}/{MAX_ROUTINE_DESCRIPTION_LENGTH}</div>
            </div>

            {/* Grupo muscular */}
            <div>
              <label htmlFor="routine-primary-muscle-group" className="block text-sm font-medium text-slate-300 mb-2">
                Grupo muscular principal
              </label>
              <select
                id="routine-primary-muscle-group"
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
                  setFormError('');
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
                      <div className="min-w-0 flex items-center gap-2">
                        <h4 dir="auto" className="min-w-0 break-words font-semibold text-white" style={{ overflowWrap: 'anywhere' }}>
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
                          className="touch-target-sm rounded-lg p-1 text-slate-400 transition-colors hover:text-mint"
                          title="Editar ejercicio"
                          aria-label={`Editar ejercicio ${exercise.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="touch-target-sm rounded-lg p-1 text-red-400 transition-colors hover:text-red-300"
                          title="Eliminar ejercicio"
                          aria-label={`Eliminar ejercicio ${exercise.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <label htmlFor={`routine-exercise-${exercise.id}-sets`} className="block text-slate-300 mb-1">Series</label>
                        <input
                          id={`routine-exercise-${exercise.id}-sets`}
                          type="number"
                          value={exerciseDrafts[exercise.id]?.sets ?? String(exercise.sets)}
                          onChange={(e) => handleExerciseNumberChange(exercise.id, 'sets', e.target.value)}
                          onBlur={() => handleExerciseNumberBlur(exercise.id, 'sets', exercise.sets)}
                          className="input input-sm"
                          min="1"
                          max={MAX_SETS}
                        />
                      </div>
                      <div>
                        <label htmlFor={`routine-exercise-${exercise.id}-reps`} className="block text-slate-300 mb-1">Reps</label>
                        <input
                          id={`routine-exercise-${exercise.id}-reps`}
                          type="number"
                          value={exerciseDrafts[exercise.id]?.reps ?? String(exercise.reps)}
                          onChange={(e) => handleExerciseNumberChange(exercise.id, 'reps', e.target.value)}
                          onBlur={() => handleExerciseNumberBlur(exercise.id, 'reps', exercise.reps)}
                          className="input input-sm"
                          min="1"
                          max={MAX_REPS}
                        />
                      </div>
                      <div>
                        <label htmlFor={`routine-exercise-${exercise.id}-rest`} className="block text-slate-300 mb-1">Desc. (s)</label>
                        <input
                          id={`routine-exercise-${exercise.id}-rest`}
                          type="number"
                          value={exerciseDrafts[exercise.id]?.restTime ?? String(exercise.restTime ?? 90)}
                          onChange={(e) => handleExerciseNumberChange(exercise.id, 'restTime', e.target.value)}
                          onBlur={() => handleExerciseNumberBlur(exercise.id, 'restTime', exercise.restTime ?? 90)}
                          className="input input-sm"
                          min="5"
                          step="5"
                          max={MAX_REST_TIME_SECONDS}
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
            {formError && (
              <div className="mt-3 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson" role="alert">
                {formError}
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
