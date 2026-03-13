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

  const closeExerciseSelector = () => {
    setShowExerciseSelector(false);
    setEditingExercise(null);
  };

  const openExerciseCreator = () => {
    if (exerciseError) setExerciseError('');
    if (formError) setFormError('');
    setEditingExercise(null);
    setShowExerciseSelector(true);
  };

  const openExerciseEditor = (exercise: Exercise) => {
    if (exerciseError) setExerciseError('');
    setEditingExercise(exercise);
    setShowExerciseSelector(true);
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (exercises.some((existing) => existing.id === exercise.id)) {
      setExerciseError('Este ejercicio ya esta en la rutina.');
      return;
    }
    if (exerciseError) setExerciseError('');
    if (formError) setFormError('');
    const newExercises = [...exercises, exercise];
    setExercises(newExercises);
    closeExerciseSelector();
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
    <div className="motion-dialog-backdrop fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 px-0 py-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className={`motion-dialog-panel flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.12),transparent_24%),linear-gradient(180deg,rgba(17,24,39,0.985),rgba(11,15,20,0.985))] shadow-lift sm:h-auto sm:max-h-[88vh] sm:rounded-[1.7rem] ${showExerciseSelector ? 'pointer-events-none opacity-70' : ''}`}
        role="dialog"
        aria-modal={!showExerciseSelector}
        aria-labelledby="routine-editor-title"
        aria-hidden={showExerciseSelector}
        tabIndex={-1}
      >
        <div className="shrink-0 border-b border-white/8 px-4 pb-4 pt-[calc(0.6rem+env(safe-area-inset-top))] sm:px-5 sm:pb-5 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-mint/85">
                {routine ? 'Editar rutina' : 'Nueva rutina'}
              </div>
              <h2 id="routine-editor-title" className="mt-1 font-display text-[1.8rem] leading-[0.94] text-white sm:text-[2.2rem]">
                {routine ? 'Edita tu rutina' : 'Crea una rutina'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-[1rem] bg-white/[0.04] px-3 py-2 text-right">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ejercicios</div>
                <div className="mt-1 font-display text-xl text-white">{exercises.length}</div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="btn-ghost border border-white/8 bg-white/[0.03]"
                aria-label="Cerrar editor de rutina"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-5 sm:pb-8 sm:pt-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
              <div className="space-y-4 rounded-[1.35rem] bg-white/[0.03] p-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Detalles</div>
                  <h3 className="mt-1 font-display text-xl text-white">Informacion basica</h3>
                </div>

                <div>
                  <label htmlFor="routine-name" className="mb-2 block text-sm font-medium text-slate-300">
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
                  <label htmlFor="routine-description" className="mb-2 block text-sm font-medium text-slate-300">
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

                <div>
                  <label htmlFor="routine-primary-muscle-group" className="mb-2 block text-sm font-medium text-slate-300">
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

                <label htmlFor="isPublic" className="flex items-start gap-3 rounded-[1.2rem] border border-white/8 bg-slateDeep/60 px-4 py-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-mist/60 bg-slateDeep text-mint focus:ring-mint/50"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">Compartir con la comunidad</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">Otros usuarios podran guardarla y activarla desde Inicio.</span>
                  </span>
                </label>
              </div>

              <div className="rounded-[1.35rem] border border-mint/15 bg-mint/8 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/80">Ejercicios</div>
                    <h3 className="mt-1 font-display text-xl text-white">Lista de ejercicios</h3>
                    <p className="mt-2 text-sm text-slate-300">Agrega ejercicios y ajusta series, reps y descanso antes de guardar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={openExerciseCreator}
                    className="btn-primary inline-flex items-center justify-center gap-2 self-start sm:self-auto"
                  >
                    <Plus size={16} />
                    <span>Añadir ejercicio</span>
                  </button>
                </div>

                <div className="mb-4 rounded-[1rem] bg-white/[0.04] px-3 py-2.5 text-sm text-slate-300">
                  {exercises.length > 0
                    ? `Has agregado ${exercises.length} ejercicio${exercises.length === 1 ? '' : 's'}.`
                    : 'Agrega el primer ejercicio para poder guardar la rutina.'}
                </div>

                {exercises.length === 0 ? (
                  <div className="rounded-[1.2rem] bg-slateDeep/45 px-4 py-8 text-center text-slate-400">
                    <p className="font-display text-lg text-white">Aun no agregas ejercicios</p>
                    <p className="mt-2 text-sm">Añade al menos uno para completar la rutina.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => (
                      <div key={exercise.id} className="rounded-[1.15rem] bg-slateDeep/85 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              {index + 1}
                            </span>
                            <h4 dir="auto" className="min-w-0 break-words font-display text-lg text-white" style={{ overflowWrap: 'anywhere' }}>
                              {index + 1}. {exercise.name}
                            </h4>
                            {exercise.video?.url ? (
                              <Play size={14} className="shrink-0 text-mint" />
                            ) : (
                              <VideoOff size={14} className="shrink-0 text-slate-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openExerciseEditor(exercise)}
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

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <label htmlFor={`routine-exercise-${exercise.id}-sets`} className="mb-1 block text-slate-300">Series</label>
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
                            <label htmlFor={`routine-exercise-${exercise.id}-reps`} className="mb-1 block text-slate-300">Reps</label>
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
                            <label htmlFor={`routine-exercise-${exercise.id}-rest`} className="mb-1 block text-slate-300">Desc. (s)</label>
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
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/8 bg-[linear-gradient(180deg,rgba(11,15,20,0.72),rgba(11,15,20,0.98))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-5">
            {formError && (
              <div className="mb-3 rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson" role="alert">
                {formError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary w-full sm:w-auto sm:px-6"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || showExerciseSelector || !name.trim() || exercises.length === 0}
                className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60 sm:flex-1"
              >
                <Save size={18} />
                <span>{loading ? 'Guardando...' : 'Guardar rutina'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Selector de ejercicios - rendered as sibling, not child, so it's not affected by pointer-events-none */}
      {showExerciseSelector && (
        <ExerciseSelector
          onSelectExercise={handleAddExercise}
          onCancel={closeExerciseSelector}
          editingExercise={editingExercise}
          onUpdateExercise={handleUpdateExercise}
        />
      )}
    </div>
  );
};
