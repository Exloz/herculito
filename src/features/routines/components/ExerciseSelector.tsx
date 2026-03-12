import React, { useEffect, useRef, useState } from 'react';
import { Loader, Pencil, X } from 'lucide-react';
import { useExerciseTemplates } from '../hooks/useExerciseTemplates';
import { useAuth } from '../../auth/hooks/useAuth';
import type { Exercise, ExerciseTemplate } from '../../../shared/types';
import { useDialogA11y } from '../../../shared/hooks/useDialogA11y';
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

  useEffect(() => {
    if (isEditing && editingExercise) {
      const editableExercise = editingExercise as Exercise & { category?: string; description?: string };
      setShowCustomForm(true);
      setCustomExercise({
        name: editingExercise.name,
        category: editableExercise.category || '',
        sets: editingExercise.sets,
        reps: editingExercise.reps,
        restTime: editingExercise.restTime || 90,
        description: editableExercise.description || ''
      });
      setSelectedVideo(editingExercise.video ?? null);
    }
  }, [editingExercise, isEditing, setSelectedVideo]);

  const filteredExercises = searchExercises(searchTerm, selectedCategory);
  const categories = getCategories();

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
    const resolvedRestTime = clampInteger(getNumericValue(customExercise.restTime, 90, 5), 5, MAX_REST_TIME_SECONDS);

    setCreatingExercise(true);
    clearMessages();

    try {
      if (isEditing && editingExercise && onUpdateExercise) {
        const updates: Partial<Exercise> = {
          name: normalizedName,
          sets: resolvedSets,
          reps: resolvedReps,
          restTime: resolvedRestTime,
          ...(selectedVideo ? { video: selectedVideo } : { video: undefined })
        };

        await updateExerciseTemplate(editingExercise.id, {
          name: normalizedName,
          category: normalizedCategory || 'Personalizado',
          sets: resolvedSets,
          reps: resolvedReps,
          restTime: resolvedRestTime,
          description: normalizedDescription,
          video: selectedVideo ?? undefined
        });

        onUpdateExercise(editingExercise.id, updates);
        setSuccessMessage(`¡Ejercicio "${normalizedName}" actualizado exitosamente!`);

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
        ? 'Error al actualizar el ejercicio. Por favor, intenta de nuevo.'
        : 'Error al crear el ejercicio. Por favor, intenta de nuevo.';
      setError(toUserMessage(submissionError, fallback));
    } finally {
      setCreatingExercise(false);
    }
  };

  if (!user?.id) {
    return <LoadingOverlay dialogRef={dialogRef} label="Verificando autenticación" message="Verificando autenticación..." />;
  }

  if (loading) {
    return <LoadingOverlay dialogRef={dialogRef} label="Cargando ejercicios" message="Cargando ejercicios..." />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="w-full max-w-2xl max-h-[84vh] overflow-hidden rounded-[2rem] border border-amberGlow/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_26%),linear-gradient(180deg,rgba(17,24,39,0.985),rgba(11,15,20,0.985))] shadow-lift"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-selector-title"
        tabIndex={-1}
      >
        <div className="border-b border-white/8 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amberGlow/85">
                {isEditing ? 'Editar ejercicio' : 'Añadir ejercicio'}
              </div>
              <h3 id="exercise-selector-title" className="mt-2 font-display text-[2rem] uppercase leading-[0.94] text-white sm:text-[2.5rem]">
              {isEditing ? (
                  <span className="flex items-center gap-2">
                    <Pencil size={20} className="text-mint" />
                    Afina el ejercicio
                </span>
              ) : (
                'Elige o crea uno'
              )}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
                Busca una base rápida o crea un ejercicio propio con series, reps, descanso y video listo para usar.
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

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(false);
                clearMessages();
              }}
              className={`rounded-[1.35rem] border px-4 py-4 text-left transition-colors ${
                !showCustomForm ? 'border-mint/30 bg-mint/10 text-white' : 'border-mist/50 bg-slateDeep text-slate-300 hover:text-white'
              }`}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">Biblioteca</div>
              <div className="mt-1 font-display text-xl uppercase">{exercises.length}</div>
              <div className="mt-1 text-sm text-current/80">Añade uno existente con un toque.</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(true);
                clearMessages();
              }}
              className={`rounded-[1.35rem] border px-4 py-4 text-left transition-colors ${
                showCustomForm ? 'border-amberGlow/30 bg-amberGlow/10 text-white' : 'border-mist/50 bg-slateDeep text-slate-300 hover:text-white'
              }`}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">Nuevo</div>
              <div className="mt-1 font-display text-xl uppercase">Crear</div>
              <div className="mt-1 text-sm text-current/80">Guarda un ejercicio propio y reutilízalo.</div>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
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
              creatingExercise={creatingExercise}
              videoError={videoError}
              videoLoading={videoLoading}
              videoSuggestions={videoSuggestions}
              selectedVideo={selectedVideo}
              onCustomExerciseChange={handleCustomExerciseChange}
              onClearForm={() => {
                setShowCustomForm(false);
                resetCustomForm();
              }}
              onSuggestVideos={() => {
                void handleSuggestVideos(customExercise.name);
              }}
              onPickSuggestion={(suggestion) => {
                void handlePickSuggestion(suggestion);
              }}
              onClearVideo={clearVideoSelection}
              onSubmit={() => {
                void handleCustomExercise();
              }}
              editingExercise={editingExercise}
            />
          )}
        </div>
      </div>
    </div>
  );
};
