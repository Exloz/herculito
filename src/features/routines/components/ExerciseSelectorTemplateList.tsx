import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { ExerciseTemplate } from '../../../shared/types';

interface ExerciseSelectorTemplateListProps {
  searchTerm: string;
  selectedCategory: string;
  categories: string[];
  filteredExercises: ExerciseTemplate[];
  hasAnyExercises: boolean;
  ownVideoCandidates: number;
  backfillRunning: boolean;
  backfillMessage: string;
  pendingTemplateId: string | null;
  onSearchTermChange: (value: string) => void;
  onSelectedCategoryChange: (value: string) => void;
  onBackfillVideos: () => void;
  onResetFilters: () => void;
  onSelectTemplate: (exercise: ExerciseTemplate) => void | Promise<void>;
}

export const ExerciseSelectorTemplateList: React.FC<ExerciseSelectorTemplateListProps> = ({
  searchTerm,
  selectedCategory,
  categories,
  filteredExercises,
  hasAnyExercises,
  ownVideoCandidates,
  backfillRunning,
  backfillMessage,
  pendingTemplateId,
  onSearchTermChange,
  onSelectedCategoryChange,
  onBackfillVideos,
  onResetFilters,
  onSelectTemplate
}) => {
  const hasActiveFilters = searchTerm.trim().length > 0 || selectedCategory.length > 0;

  return (
    <div className="p-4">
      <div className="space-y-3 mb-4">
        <div className="relative">
          <label htmlFor="exercise-template-search" className="sr-only">Buscar ejercicios</label>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="exercise-template-search"
            type="text"
            placeholder="Buscar ejercicios..."
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="input pl-10 text-sm"
            aria-label="Buscar ejercicios"
          />
        </div>

        <div className="relative">
          <label htmlFor="exercise-template-category" className="sr-only">Filtrar por categoria</label>
          <select
            id="exercise-template-category"
            value={selectedCategory}
            onChange={(event) => onSelectedCategoryChange(event.target.value)}
            className="input text-sm appearance-none cursor-pointer"
            aria-label="Filtrar por categoria"
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
            disabled={backfillRunning || ownVideoCandidates === 0 || Boolean(pendingTemplateId)}
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
            disabled={Boolean(pendingTemplateId)}
            className="w-full rounded-xl bg-slateDeep p-3 text-left transition-colors hover:bg-charcoal disabled:cursor-wait disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <h4 dir="auto" className="text-sm font-medium text-white break-words" style={{ overflowWrap: 'anywhere' }}>{exercise.name}</h4>
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
              <div className="shrink-0 text-xs text-slate-400">{exercise.sets} x {exercise.reps}</div>
            </div>
          </button>
        ))}

        {filteredExercises.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p>
              {hasAnyExercises
                ? hasActiveFilters
                  ? 'No hay ejercicios que coincidan con tu busqueda.'
                  : 'No se encontraron ejercicios disponibles.'
                : 'Todavia no hay ejercicios guardados.'}
            </p>
            <p className="mt-1 text-xs">
              {hasAnyExercises
                ? hasActiveFilters
                  ? 'Prueba con otro termino, cambia la categoria o reinicia los filtros.'
                  : 'Crea uno nuevo usando la pestaña "Crear Nuevo".'
                : 'Crea tu primer ejercicio usando la pestaña "Crear Nuevo".'}
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={onResetFilters} className="btn-secondary mt-3 text-sm">
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
