import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader, Plus, X } from 'lucide-react';
import { useExerciseTemplates } from '../hooks/useExerciseTemplates';
import { useAuth } from '../../auth/hooks/useAuth';
import type { Exercise, ExerciseTemplate } from '../../../shared/types';
import { useDialogA11y } from '../../../shared/hooks/useDialogA11y';
import { useDialogViewport } from '../../../shared/hooks/useDialogViewport';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import type { CustomExerciseForm } from '../types/exercise-selector';
import { ExerciseSelectorTemplateList } from './ExerciseSelectorTemplateList';
import { ExerciseSelectorForm } from './ExerciseSelectorForm';
import { useExerciseVideoManager } from '../hooks/useExerciseVideoManager';
import { clampInteger, normalizeMultiline, normalizeSingleLine } from '../../../shared/lib/inputSanitizers';

const MAX_EXERCISE_NAME_LENGTH = 120;
const MAX_EXERCISE_CATEGORY_LENGTH = 80;
const MAX_EXERCISE_DESCRIPTION_LENGTH = 400;
const MAX_SETS = 30;
const MAX_REPS = 200;
const MAX_REST_TIME_SECONDS = 3600;

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: Exercise) => void;
  onCancel: () => void;
  editingExercise?: Exercise | null;
  onUpdateExercise?: (exerciseId: string, updates: Partial<Exercise>) => void;
}

const EMPTY_CUSTOM_EXERCISE: CustomExerciseForm = {
  name: '',
  category: '',
  sets: 3,
  reps: 10,
  restTime: 90,
  description: ''
};

const getNumericValue = (value: number | '', fallback: number, min: number) => {
  const resolvedValue = value === '' ? fallback : value;
  return Math.max(min, resolvedValue);
};

const syncRepsBySetWithSets = (exercise: Exercise, nextSets: number, fallbackReps: number): number[] | undefined => {
  if (!exercise.repsBySet || exercise.repsBySet.length === 0) {
    return undefined;
  }

  const nextRepsBySet = [...exercise.repsBySet];
  if (nextSets < nextRepsBySet.length) {
    nextRepsBySet.splice(nextSets);
  } else if (nextSets > nextRepsBySet.length) {
    const lastRep = nextRepsBySet[nextRepsBySet.length - 1] ?? fallbackReps;
    for (let index = nextRepsBySet.length; index < nextSets; index += 1) {
      nextRepsBySet.push(lastRep);
    }
  }

  return nextRepsBySet;
};

const LoadingOverlay = ({
  dialogRef,
  label,
  message
}: {
  dialogRef: React.RefObject<HTMLDivElement>;
  label: string;
  message: string;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        className="app-card p-6 text-center"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <Loader className="animate-spin mx-auto mb-4 text-mint" size={32} />
        <p className="text-white">{message}</p>
      </div>
    </div>
  );
};

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelectExercise,
  onCancel,
  editingExercise,
  onUpdateExercise
}) => {
  const isEditing = !!editingExercise;
  const dialogRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    exercises,
    loading,
    createExerciseTemplate,
    updateExerciseTemplate,
    incrementUsage,
    getCategories,
    searchExercises
  } = useExerciseTemplates(user?.id || '');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [customExercise, setCustomExercise] = useState<CustomExerciseForm>(EMPTY_CUSTOM_EXERCISE);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  const {
    videoSuggestions,
    videoLoading,
    videoError,
    selectedVideo,
    setSelectedVideo,
    backfillRunning,
    backfillMessage,
    ownVideoCandidates,
    clearVideoSelection,
    handleSuggestVideos,
    handlePickSuggestion,
    handleBackfillVideos
  } = useExerciseVideoManager({
    exercises,
    userId: user?.id,
    updateExerciseTemplate
  });

  useDialogA11y(dialogRef, { onClose: onCancel });
  const { backdropStyle, panelStyle } = useDialogViewport();

  useEffect(() => {
    if (isEditing && editingExercise) {
      const editableExercise = editingExercise as Exercise & { category?: string; description?: string };
      setShowCustomForm(true);
      setCustomExercise({
        name: editingExercise.name,
        category: editableExercise.category || '',
        sets: editingExercise.sets,
        reps: editingExercise.reps,
        restTime: editingExercise.restTime ?? 90,
        description: editableExercise.description || ''
      });
      setSelectedVideo(editingExercise.video ?? null);
    }
  }, [editingExercise, isEditing, setSelectedVideo]);

  const filteredExercises = searchExercises(searchTerm, selectedCategory);
  const categories = getCategories();
  const restTimeOutOfRange = customExercise.restTime !== ''
    && (customExercise.restTime < 0 || customExercise.restTime > MAX_REST_TIME_SECONDS);

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const resetCustomForm = () => {
    setCustomExercise(EMPTY_CUSTOM_EXERCISE);
    clearMessages();
    clearVideoSelection();
  };

  const handleCustomExerciseChange = (updates: Partial<CustomExerciseForm>) => {
    if (updates.name !== undefined && updates.name !== customExercise.name) {
      clearVideoSelection();
    }

    if (error) setError('');
    if (successMessage) setSuccessMessage('');

    setCustomExercise((previous) => ({
      ...previous,
      ...updates
    }));
  };

  const handleSelectTemplate = async (template: ExerciseTemplate) => {
    if (pendingTemplateId) {
      return;
    }

    setPendingTemplateId(template.id);

    try {
      const exercise: Exercise = {
        id: template.id,
        name: template.name,
        sets: template.sets,
        reps: template.reps,
        restTime: template.restTime,
        ...(template.video ? { video: template.video } : {})
      };

      await incrementUsage(template.id);
      onSelectExercise(exercise);
    } finally {
      setPendingTemplateId(null);
    }
  };

  const handleCustomExercise = async () => {
    const normalizedName = normalizeSingleLine(customExercise.name, MAX_EXERCISE_NAME_LENGTH);
    const normalizedCategory = normalizeSingleLine(customExercise.category, MAX_EXERCISE_CATEGORY_LENGTH);
    const normalizedDescription = normalizeMultiline(customExercise.description, MAX_EXERCISE_DESCRIPTION_LENGTH);

    if (normalizedName.length < 2) {
      setError('Escribe un nombre de al menos 2 caracteres para identificar el ejercicio.');
      return;
    }

    const resolvedSets = clampInteger(getNumericValue(customExercise.sets, 3, 1), 1, MAX_SETS);
    const resolvedReps = clampInteger(getNumericValue(customExercise.reps, 10, 1), 1, MAX_REPS);
    const resolvedRestTime = customExercise.restTime === '' ? 90 : customExercise.restTime;

    if (resolvedRestTime < 0 || resolvedRestTime > MAX_REST_TIME_SECONDS) {
      setError(`El descanso debe estar entre 0 y ${MAX_REST_TIME_SECONDS} segundos.`);
      return;
    }

    setCreatingExercise(true);
    clearMessages();

    try {
      if (isEditing && editingExercise && onUpdateExercise) {
        const repsBySet = syncRepsBySetWithSets(editingExercise, resolvedSets, resolvedReps);
        const updates: Partial<Exercise> = {
          name: normalizedName,
          sets: resolvedSets,
          reps: resolvedReps,
          ...(repsBySet ? { repsBySet } : {}),
          restTime: resolvedRestTime,
          ...(selectedVideo ? { video: selectedVideo } : { video: undefined })
        };

        let templateUpdated = false;

        try {
          await updateExerciseTemplate(editingExercise.id, {
            name: normalizedName,
            category: normalizedCategory || 'Personalizado',
            sets: resolvedSets,
            reps: resolvedReps,
            restTime: resolvedRestTime,
            description: normalizedDescription,
            video: selectedVideo ?? undefined
          });
          templateUpdated = true;
        } catch {
          templateUpdated = false;
        }

        onUpdateExercise(editingExercise.id, updates);
        setSuccessMessage(
          templateUpdated
            ? `¡Ejercicio "${normalizedName}" actualizado exitosamente!`
            : `Cambios aplicados en esta rutina para "${normalizedName}".`
        );

        setTimeout(() => {
          onCancel();
        }, 800);
      } else {
        const templateId = await createExerciseTemplate(
          normalizedName,
          normalizedCategory || 'Personalizado',
          resolvedSets,
          resolvedReps,
          resolvedRestTime,
          normalizedDescription,
          true,
          selectedVideo ?? undefined
        );

        const exercise: Exercise = {
          id: templateId,
          name: normalizedName,
          sets: resolvedSets,
          reps: resolvedReps,
          restTime: resolvedRestTime,
          ...(selectedVideo ? { video: selectedVideo } : {})
        };

        setSuccessMessage(`¡Ejercicio "${normalizedName}" creado y añadido exitosamente!`);
        resetCustomForm();
        onSelectExercise(exercise);
      }
    } catch (submissionError) {
      const fallback = isEditing
        ? 'No pudimos guardar los cambios del ejercicio. Intenta de nuevo.'
        : 'No pudimos crear el ejercicio. Intenta de nuevo.';
      setError(toUserMessage(submissionError, fallback));
    } finally {
      setCreatingExercise(false);
    }
  };

  if (!user?.id) {
    return <LoadingOverlay dialogRef={dialogRef} label="Comprobando acceso" message="Comprobando acceso..." />;
  }

  if (loading) {
    return <LoadingOverlay dialogRef={dialogRef} label="Cargando ejercicios" message="Cargando ejercicios guardados..." />;
  }

  return (
    <div
      className="motion-dialog-backdrop fixed inset-x-0 top-0 h-screen z-50 flex items-stretch justify-center bg-black/70 px-0 py-0 backdrop-blur-sm sm:items-center sm:p-4 touch-none overscroll-contain"
      style={backdropStyle}
    >
      <div
        ref={dialogRef}
        className="motion-dialog-panel dialog-height-full flex w-full max-w-2xl flex-col overflow-hidden border border-amberGlow/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_26%),linear-gradient(180deg,rgba(17,24,39,0.985),rgba(11,15,20,0.985))] shadow-lift sm:h-auto sm:max-h-[84vh] sm:rounded-[2rem]"
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-selector-title"
        tabIndex={-1}
      >
        <div className="shrink-0 border-b border-white/8 px-4 pb-2 pt-[calc(0.3rem+env(safe-area-inset-top))] sm:p-4">
          <div className="mb-2 flex items-start justify-between gap-3 sm:mb-2.5 sm:gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amberGlow/85">
                Ejercicios
              </div>
              <h3 id="exercise-selector-title" className="mt-1 font-display text-[1.2rem] leading-[1.04] text-white sm:text-[1.6rem]">
                {isEditing ? 'Editar ejercicio' : 'Agregar ejercicio'}
              </h3>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm">
                Selecciona uno guardado o crea uno nuevo.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost border border-white/8 bg-white/[0.03]"
              aria-label="Cerrar selector de ejercicios"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(false);
                clearMessages();
              }}
              aria-pressed={!showCustomForm}
              className={`motion-interactive rounded-[0.95rem] border px-3 py-2 text-left transition-colors sm:px-3 sm:py-2.5 ${
                !showCustomForm ? 'border-mint/30 bg-mint/10 text-white' : 'border-mist/50 bg-slateDeep text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">Guardados</div>
                <div className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-current">{exercises.length}</div>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-current">Elegir existente</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(true);
                clearMessages();
              }}
              aria-pressed={showCustomForm}
              className={`motion-interactive rounded-[0.95rem] border px-3 py-2 text-left transition-colors sm:px-3 sm:py-2.5 ${
                showCustomForm ? 'border-amberGlow/30 bg-amberGlow/10 text-white' : 'border-mist/50 bg-slateDeep text-slate-300 hover:text-white'
              }`}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">Nuevo</div>
              <div className="mt-0.5 text-sm font-semibold text-current">Crear ejercicio</div>
            </button>
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${showCustomForm ? 'pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-2' : ''}`}
        >
          {!showCustomForm ? (
            <ExerciseSelectorTemplateList
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              categories={categories}
              filteredExercises={filteredExercises}
              hasAnyExercises={exercises.length > 0}
              ownVideoCandidates={ownVideoCandidates}
              backfillRunning={backfillRunning}
              backfillMessage={backfillMessage}
              pendingTemplateId={pendingTemplateId}
              onSearchTermChange={setSearchTerm}
              onSelectedCategoryChange={setSelectedCategory}
              onBackfillVideos={() => {
                void handleBackfillVideos();
              }}
              onResetFilters={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              onSelectTemplate={handleSelectTemplate}
            />
          ) : (
            <ExerciseSelectorForm
              isEditing={isEditing}
              categories={categories}
              customExercise={customExercise}
              error={error}
              successMessage={successMessage}
              videoError={videoError}
              videoLoading={videoLoading}
              videoSuggestions={videoSuggestions}
              selectedVideo={selectedVideo}
              onCustomExerciseChange={handleCustomExerciseChange}
              onSuggestVideos={() => {
                void handleSuggestVideos(customExercise.name);
              }}
              onPickSuggestion={(suggestion) => {
                void handlePickSuggestion(suggestion);
              }}
              onClearVideo={clearVideoSelection}
              editingExercise={editingExercise}
            />
          )}
        </div>

        {showCustomForm && (
          <div className="shrink-0 border-t border-white/8 bg-[linear-gradient(180deg,rgba(11,15,20,0.72),rgba(11,15,20,0.98))] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCustomForm(false);
                  resetCustomForm();
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleCustomExercise();
                }}
                disabled={!customExercise.name.trim() || creatingExercise || restTimeOutOfRange}
                className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {creatingExercise ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>{isEditing ? 'Guardando...' : 'Creando...'}</span>
                  </>
                ) : (
                  <>
                    {isEditing ? <Check size={16} /> : <Plus size={16} />}
                    <span>{isEditing ? 'Guardar cambios' : 'Crear y añadir'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
