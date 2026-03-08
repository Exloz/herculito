import React from 'react';
import { Check, Loader, Plus } from 'lucide-react';
import type { Exercise, ExerciseVideo } from '../../../shared/types';
import type { MusclewikiSuggestion } from '../api/musclewikiApi';
import type { CustomExerciseForm } from '../types/exercise-selector';
import { ExerciseVideoPicker } from './ExerciseVideoPicker';

interface ExerciseSelectorFormProps {
  isEditing: boolean;
  categories: string[];
  customExercise: CustomExerciseForm;
  error: string;
  successMessage: string;
  creatingExercise: boolean;
  videoError: string;
  videoLoading: boolean;
  videoSuggestions: MusclewikiSuggestion[];
  selectedVideo: ExerciseVideo | null;
  onCustomExerciseChange: (updates: Partial<CustomExerciseForm>) => void;
  onClearForm: () => void;
  onSuggestVideos: () => void;
  onPickSuggestion: (suggestion: MusclewikiSuggestion) => void;
  onClearVideo: () => void;
  onSubmit: () => void;
  editingExercise?: Exercise | null;
}

export const ExerciseSelectorForm: React.FC<ExerciseSelectorFormProps> = ({
  isEditing,
  categories,
  customExercise,
  error,
  successMessage,
  creatingExercise,
  videoError,
  videoLoading,
  videoSuggestions,
  selectedVideo,
  onCustomExerciseChange,
  onClearForm,
  onSuggestVideos,
  onPickSuggestion,
  onClearVideo,
  onSubmit
}) => {
  const handleNumberChange = (field: 'sets' | 'reps' | 'restTime', value: string) => {
    if (value === '') {
      onCustomExerciseChange({ [field]: '' } as Partial<CustomExerciseForm>);
      return;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue)) return;
    onCustomExerciseChange({ [field]: parsedValue } as Partial<CustomExerciseForm>);
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <label htmlFor="custom-exercise-name" className="block text-sm text-slate-300 mb-1">Nombre del ejercicio *</label>
          <input
            id="custom-exercise-name"
            type="text"
            value={customExercise.name}
            onChange={(event) => onCustomExerciseChange({ name: event.target.value })}
            className="input text-sm"
            placeholder="Ej: Press de banca"
          />
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-md p-3 text-red-200 text-sm">{error}</div>
        )}

        {successMessage && (
          <div className="bg-mint/10 border border-mint rounded-md p-3 text-mint text-sm">{successMessage}</div>
        )}

        <div>
          <label htmlFor="custom-exercise-category" className="block text-sm text-slate-300 mb-1">Categoría</label>
          <input
            id="custom-exercise-category"
            type="text"
            value={customExercise.category}
            onChange={(event) => onCustomExerciseChange({ category: event.target.value })}
            className="input text-sm"
            placeholder="Ej: Pecho, Espalda, Piernas..."
            list="categories"
          />
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
            onChange={(event) => onCustomExerciseChange({ description: event.target.value })}
            className="input text-sm"
            placeholder="Describe como hacer el ejercicio..."
            rows={2}
          />
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
            />
          </div>
          <div>
            <label htmlFor="custom-exercise-rest" className="block text-sm text-slate-300 mb-1">Descanso (seg)</label>
            <input
              id="custom-exercise-rest"
              type="number"
              value={customExercise.restTime}
              onChange={(event) => handleNumberChange('restTime', event.target.value)}
              className="input input-sm text-sm"
              min="5"
              step="5"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <button type="button" onClick={onClearForm} className="btn-secondary flex-1">Cancelar</button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!customExercise.name.trim() || creatingExercise}
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
                <span>{isEditing ? 'Guardar Cambios' : 'Crear y Añadir'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
