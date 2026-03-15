import React from 'react';
import type { Exercise, ExerciseVideo } from '../../../shared/types';
import type { MusclewikiSuggestion } from '../api/musclewikiApi';
import type { CustomExerciseForm } from '../types/exercise-selector';
import { ExerciseVideoPicker } from './ExerciseVideoPicker';

const MAX_EXERCISE_NAME_LENGTH = 120;
const MAX_EXERCISE_CATEGORY_LENGTH = 80;
const MAX_EXERCISE_DESCRIPTION_LENGTH = 400;
const MAX_SETS = 30;
const MAX_REPS = 200;
const MAX_REST_TIME_SECONDS = 3600;

interface ExerciseSelectorFormProps {
  isEditing: boolean;
  categories: string[];
  customExercise: CustomExerciseForm;
  error: string;
  successMessage: string;
  videoError: string;
  videoLoading: boolean;
  videoSuggestions: MusclewikiSuggestion[];
  selectedVideo: ExerciseVideo | null;
  onCustomExerciseChange: (updates: Partial<CustomExerciseForm>) => void;
  onSuggestVideos: () => void;
  onPickSuggestion: (suggestion: MusclewikiSuggestion) => void;
  onClearVideo: () => void;
  editingExercise?: Exercise | null;
}

export const ExerciseSelectorForm: React.FC<ExerciseSelectorFormProps> = ({
  isEditing,
  categories,
  customExercise,
  error,
  successMessage,
  videoError,
  videoLoading,
  videoSuggestions,
  selectedVideo,
  onCustomExerciseChange,
  onSuggestVideos,
  onPickSuggestion,
  onClearVideo
}) => {
  const handleNumberChange = (field: 'sets' | 'reps' | 'restTime', value: string) => {
    if (value === '') {
      onCustomExerciseChange({ [field]: '' } as Partial<CustomExerciseForm>);
      return;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue)) return;

    if (field === 'restTime') {
      onCustomExerciseChange({ restTime: parsedValue });
      return;
    }

    const minValue = 1;
    const maxValue = field === 'reps' ? MAX_REPS : MAX_SETS;

    const normalizedValue = Math.min(maxValue, Math.max(minValue, parsedValue));
    onCustomExerciseChange({ [field]: normalizedValue } as Partial<CustomExerciseForm>);
  };

  const restTimeError = customExercise.restTime !== ''
    ? customExercise.restTime < 0
      ? 'El minimo es 0 segundos.'
      : customExercise.restTime > MAX_REST_TIME_SECONDS
        ? `El maximo es ${MAX_REST_TIME_SECONDS} segundos.`
        : ''
    : '';

  return (
    <div className="p-4 pb-4 sm:p-5 sm:pb-6">
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isEditing ? 'Detalles del ejercicio' : 'Nuevo ejercicio'}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Completa la informacion basica para guardar este ejercicio y volver a usarlo despues.
          </p>
        </div>

        <div>
          <label htmlFor="custom-exercise-name" className="block text-sm text-slate-300 mb-1">Nombre del ejercicio *</label>
          <input
            id="custom-exercise-name"
            type="text"
            value={customExercise.name}
            onChange={(event) => onCustomExerciseChange({ name: event.target.value.slice(0, MAX_EXERCISE_NAME_LENGTH) })}
            className="input text-sm"
            placeholder="Ej: Press de banca"
            maxLength={MAX_EXERCISE_NAME_LENGTH}
            dir="auto"
          />
          <div className="mt-1 text-xs text-slate-400">{customExercise.name.length}/{MAX_EXERCISE_NAME_LENGTH}</div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-900/50 p-3 text-sm text-red-200" role="alert">{error}</div>
        )}

        {successMessage && (
          <div className="rounded-md border border-mint bg-mint/10 p-3 text-sm text-mint" role="status" aria-live="polite">{successMessage}</div>
        )}

        <div>
          <label htmlFor="custom-exercise-category" className="block text-sm text-slate-300 mb-1">Categoría</label>
          <input
            id="custom-exercise-category"
            type="text"
            value={customExercise.category}
            onChange={(event) => onCustomExerciseChange({ category: event.target.value.slice(0, MAX_EXERCISE_CATEGORY_LENGTH) })}
            className="input text-sm"
            placeholder="Ej: Pecho, espalda o piernas"
            list="categories"
            maxLength={MAX_EXERCISE_CATEGORY_LENGTH}
            dir="auto"
          />
          <div className="mt-1 text-xs text-slate-400">{customExercise.category.length}/{MAX_EXERCISE_CATEGORY_LENGTH}</div>
          <datalist id="categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="custom-exercise-description" className="block text-sm text-slate-300 mb-1">Descripción (opcional)</label>
          <textarea
            id="custom-exercise-description"
            value={customExercise.description}
            onChange={(event) => onCustomExerciseChange({ description: event.target.value.slice(0, MAX_EXERCISE_DESCRIPTION_LENGTH) })}
            className="input text-sm"
            placeholder="Explica como se hace o cuando usarlo"
            rows={2}
            maxLength={MAX_EXERCISE_DESCRIPTION_LENGTH}
            dir="auto"
          />
          <div className="mt-1 text-xs text-slate-400">{customExercise.description.length}/{MAX_EXERCISE_DESCRIPTION_LENGTH}</div>
        </div>

        <ExerciseVideoPicker
          exerciseName={customExercise.name}
          videoError={videoError}
          videoLoading={videoLoading}
          videoSuggestions={videoSuggestions}
          selectedVideo={selectedVideo}
          onSuggestVideos={onSuggestVideos}
          onPickSuggestion={onPickSuggestion}
          onClearVideo={onClearVideo}
        />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="custom-exercise-sets" className="block text-sm text-slate-300 mb-1">Series</label>
            <input
              id="custom-exercise-sets"
              type="number"
              value={customExercise.sets}
              onChange={(event) => handleNumberChange('sets', event.target.value)}
              className="input input-sm text-sm"
              min="1"
              max={MAX_SETS}
            />
          </div>
          <div>
            <label htmlFor="custom-exercise-reps" className="block text-sm text-slate-300 mb-1">Reps</label>
            <input
              id="custom-exercise-reps"
              type="number"
              value={customExercise.reps}
              onChange={(event) => handleNumberChange('reps', event.target.value)}
              className="input input-sm text-sm"
              min="1"
              max={MAX_REPS}
            />
          </div>
          <div>
            <label htmlFor="custom-exercise-rest" className="block text-sm text-slate-300 mb-1">Descanso (seg)</label>
            <input
              id="custom-exercise-rest"
              type="number"
              value={customExercise.restTime}
              onChange={(event) => handleNumberChange('restTime', event.target.value)}
              className={`input input-sm text-sm ${restTimeError ? 'border-crimson/55 focus:border-crimson/60 focus:ring-crimson/30' : ''}`}
              min="0"
              step="1"
              max={MAX_REST_TIME_SECONDS}
              aria-invalid={restTimeError ? 'true' : undefined}
              aria-describedby={restTimeError ? 'custom-exercise-rest-error' : undefined}
            />
            {restTimeError && (
              <p id="custom-exercise-rest-error" className="mt-1 text-[11px] leading-tight text-crimson">
                {restTimeError}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
