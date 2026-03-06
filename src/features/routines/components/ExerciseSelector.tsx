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
  };

  const handleCustomExercise = async () => {
    if (!customExercise.name.trim()) {
      setError('El nombre del ejercicio es requerido');
      return;
    }

    const resolvedSets = getNumericValue(customExercise.sets, 3, 1);
    const resolvedReps = getNumericValue(customExercise.reps, 10, 1);
    const resolvedRestTime = getNumericValue(customExercise.restTime, 90, 5);

    setCreatingExercise(true);
    clearMessages();

    try {
      if (isEditing && editingExercise && onUpdateExercise) {
        const updates: Partial<Exercise> = {
          name: customExercise.name,
          sets: resolvedSets,
          reps: resolvedReps,
          restTime: resolvedRestTime,
          ...(selectedVideo ? { video: selectedVideo } : { video: undefined })
        };

        await updateExerciseTemplate(editingExercise.id, {
          name: customExercise.name,
          category: customExercise.category || 'Personalizado',
          sets: resolvedSets,
          reps: resolvedReps,
          restTime: resolvedRestTime,
          description: customExercise.description,
          video: selectedVideo ?? undefined
        });

        onUpdateExercise(editingExercise.id, updates);
        setSuccessMessage(`¡Ejercicio "${customExercise.name}" actualizado exitosamente!`);

        setTimeout(() => {
          onCancel();
        }, 800);
      } else {
        const templateId = await createExerciseTemplate(
          customExercise.name,
          customExercise.category || 'Personalizado',
          resolvedSets,
          resolvedReps,
          resolvedRestTime,
          customExercise.description,
          true,
          selectedVideo ?? undefined
        );

        const exercise: Exercise = {
          id: templateId,
          name: customExercise.name,
          sets: resolvedSets,
          reps: resolvedReps,
          restTime: resolvedRestTime,
          ...(selectedVideo ? { video: selectedVideo } : {})
        };

        setSuccessMessage(`¡Ejercicio "${customExercise.name}" creado y añadido exitosamente!`);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        className="app-card w-full max-w-md max-h-[80vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-selector-title"
        tabIndex={-1}
      >
        <div className="p-4 border-b border-mist/60">
          <div className="flex items-center justify-between mb-4">
            <h3 id="exercise-selector-title" className="text-lg font-bold text-white">
              {isEditing ? (
                <span className="flex items-center gap-2">
                  <Pencil size={18} className="text-mint" />
                  Editar Ejercicio
                </span>
              ) : (
                'Añadir Ejercicio'
              )}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost"
              aria-label="Cerrar selector de ejercicios"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(false);
                clearMessages();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                !showCustomForm ? 'bg-mint/15 text-mint' : 'bg-slateDeep text-slate-300 hover:text-white'
              }`}
            >
              Ejercicios ({exercises.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(true);
                clearMessages();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                showCustomForm ? 'bg-mint/15 text-mint' : 'bg-slateDeep text-slate-300 hover:text-white'
              }`}
            >
              Crear Nuevo
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {!showCustomForm ? (
            <ExerciseSelectorTemplateList
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              categories={categories}
              filteredExercises={filteredExercises}
              ownVideoCandidates={ownVideoCandidates}
              backfillRunning={backfillRunning}
              backfillMessage={backfillMessage}
              onSearchTermChange={setSearchTerm}
              onSelectedCategoryChange={setSelectedCategory}
              onBackfillVideos={() => {
                void handleBackfillVideos();
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
