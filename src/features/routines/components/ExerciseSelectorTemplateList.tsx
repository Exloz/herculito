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
    <div className="p-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
      <div className="mb-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-3.5 sm:mb-4 sm:rounded-[1.5rem] sm:p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Busca un ejercicio</div>
        <div className="space-y-3">
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
              {backfillRunning ? 'Actualizando...' : 'Buscar videos automáticamente'}
            </button>
          </div>

        {backfillMessage && (
          <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-slate-300">{backfillMessage}</div>
        )}
      </div>
      </div>

      <div className="space-y-2 pb-1">
        {filteredExercises.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => void onSelectTemplate(exercise)}
            disabled={Boolean(pendingTemplateId)}
            className="motion-list-item w-full rounded-[1.1rem] border border-white/8 bg-slateDeep/85 p-3 text-left transition-colors hover:border-mint/30 hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 sm:rounded-[1.35rem] sm:p-3.5"
            >
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <h4 dir="auto" className="break-words font-semibold text-white text-sm" style={{ overflowWrap: 'anywhere' }}>{exercise.name}</h4>
                <div className="mt-1 flex items-center space-x-2 text-xs text-slate-400">
                  <span>{exercise.category}</span>
                  {exercise.timesUsed > 0 && (
                    <>
                      <span>-</span>
                      <span>Usado {exercise.timesUsed} veces</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 rounded-full border border-white/8 px-2.5 py-1 text-xs text-slate-300">{exercise.sets} x {exercise.reps}</div>
            </div>
          </button>
        ))}

        {filteredExercises.length === 0 && (
          <div className="rounded-[1.4rem] border border-dashed border-mist/40 bg-slateDeep/45 px-4 py-10 text-center text-slate-400">
            <p>
              {hasAnyExercises
                ? hasActiveFilters
                  ? 'No encontramos ejercicios con esos filtros.'
                  : 'No se encontraron ejercicios disponibles.'
                : 'Aún no hay ejercicios guardados.'}
            </p>
            <p className="mt-2 text-sm">
              {hasAnyExercises
                ? hasActiveFilters
                  ? 'Prueba con otro nombre, cambia la categoría o limpia los filtros.'
                  : 'Si no encuentras lo que buscas, crea un ejercicio nuevo.'
                : 'Crea tu primer ejercicio desde la pestaña Crear.'}
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
