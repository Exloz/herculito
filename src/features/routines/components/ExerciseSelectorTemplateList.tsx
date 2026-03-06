import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { ExerciseTemplate } from '../../../shared/types';

interface ExerciseSelectorTemplateListProps {
  searchTerm: string;
  selectedCategory: string;
  categories: string[];
  filteredExercises: ExerciseTemplate[];
  ownVideoCandidates: number;
  backfillRunning: boolean;
  backfillMessage: string;
  onSearchTermChange: (value: string) => void;
  onSelectedCategoryChange: (value: string) => void;
  onBackfillVideos: () => void;
  onSelectTemplate: (exercise: ExerciseTemplate) => void | Promise<void>;
}

export const ExerciseSelectorTemplateList: React.FC<ExerciseSelectorTemplateListProps> = ({
  searchTerm,
  selectedCategory,
  categories,
  filteredExercises,
  ownVideoCandidates,
  backfillRunning,
  backfillMessage,
  onSearchTermChange,
  onSelectedCategoryChange,
  onBackfillVideos,
  onSelectTemplate
}) => {
  return (
    <div className="p-4">
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar ejercicios..."
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="input pl-10 text-sm"
          />
        </div>

        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(event) => onSelectedCategoryChange(event.target.value)}
            className="input text-sm appearance-none cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{ownVideoCandidates} ejercicios sin video</span>
          <button
            type="button"
            onClick={onBackfillVideos}
            disabled={backfillRunning || ownVideoCandidates === 0}
            className="btn-ghost text-xs disabled:opacity-60"
          >
            {backfillRunning ? 'Actualizando...' : 'Cargar videos automáticamente'}
          </button>
        </div>

        {backfillMessage && (
          <div className="text-xs text-slate-400">{backfillMessage}</div>
        )}
      </div>

      <div className="space-y-2">
        {filteredExercises.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => void onSelectTemplate(exercise)}
            className="w-full p-3 bg-slateDeep hover:bg-charcoal rounded-xl text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white text-sm font-medium">{exercise.name}</h4>
                <div className="flex items-center text-xs text-slate-400 space-x-2">
                  <span>{exercise.category}</span>
                  {exercise.timesUsed > 0 && (
                    <>
                      <span>-</span>
                      <span>Usado {exercise.timesUsed} veces</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400">{exercise.sets} x {exercise.reps}</div>
            </div>
          </button>
        ))}

        {filteredExercises.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p>No se encontraron ejercicios</p>
            <p className="text-xs mt-1">Crea uno nuevo usando la pestaña "Crear Nuevo"</p>
          </div>
        )}
      </div>
    </div>
  );
};
