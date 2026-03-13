import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdminRoutineOverview } from '../../../shared/types';
import { SectionAccordion } from './AdminShared';
import { formatDateTime, type AdminRoutineSort } from '../lib/adminPage';

interface AdminRoutinesSectionProps {
  routines: AdminRoutineOverview[];
  routineSort: AdminRoutineSort;
  onRoutineSortChange: (value: AdminRoutineSort) => void;
  onResetFilters: () => void;
}

export const AdminRoutinesSection: React.FC<AdminRoutinesSectionProps> = ({
  routines,
  routineSort,
  onRoutineSortChange,
  onResetFilters
}) => {
  return (
    <SectionAccordion
      title="Rutinas"
      subtitle="Inventario general de rutinas y sus ejercicios configurados."
      badge={<div className="chip chip-warm">{routines.length}</div>}
    >
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400 sm:text-sm">Sección secundaria para revisar estructura y uso.</p>
        <select value={routineSort} onChange={(event) => onRoutineSortChange(event.target.value as AdminRoutineSort)} className="input input-sm h-10 border-amberGlow/20 bg-amberGlow/10 text-sm sm:w-auto">
          <option value="usage">Mas usadas</option>
          <option value="lastCompleted">Mas recientes</option>
          <option value="name">Nombre</option>
        </select>
      </div>

      <div className="space-y-2.5">
        {routines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-mist/25 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
            <p>No hay rutinas visibles con los filtros actuales.</p>
            <button type="button" onClick={onResetFilters} className="btn-secondary mt-3 text-sm">
              Reiniciar filtros
            </button>
          </div>
        )}

        {routines.map((routine) => (
          <details key={routine.routineId} className="group overflow-hidden rounded-xl border border-amberGlow/20 bg-[radial-gradient(circle_at_100%_0%,oklch(0.78_0.13_72/0.1),transparent_44%),oklch(0.31_0.02_70/0.45)]">
            <summary className="flex cursor-pointer list-none flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white sm:text-base">{routine.name}</div>
                <div className="mt-1 text-xs text-amberGlow/80 sm:text-sm">Creador: {routine.createdByName || 'Usuario sin nombre'}</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:min-w-[280px]">
                <div className="rounded-lg border border-orange-300/20 bg-orange-300/10 px-2 py-1.5 text-center">
                  <div className="text-base font-display text-white">{routine.timesUsed}</div>
                  <div className="text-[11px] text-orange-100/80">usos</div>
                </div>
                <div className="rounded-lg border border-mint/20 bg-mint/10 px-2 py-1.5 text-center">
                  <div className="text-xs font-semibold text-white sm:text-sm">{formatDateTime(routine.lastCompletedAt)}</div>
                  <div className="text-[11px] text-mint/85">ultima vez</div>
                </div>
                <div className="flex items-center justify-center rounded-lg border border-amberGlow/15 bg-amberGlow/10 px-2 py-1.5 text-amberGlow transition group-open:rotate-180">
                  <ChevronDown size={16} />
                </div>
              </div>
            </summary>

            <div className="border-t border-mist/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {routine.exercises.map((exercise) => (
                  <div key={`${routine.routineId}-${exercise.exerciseId}`} className="rounded-xl border border-amberGlow/15 bg-[oklch(0.3_0.02_65/0.45)] p-3 text-sm">
                    <div className="text-white">{exercise.name}</div>
                    <div className="mt-1 text-amberGlow/80">{exercise.sets}x{exercise.reps}{exercise.restTime ? ` - ${exercise.restTime}s` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </SectionAccordion>
  );
};
