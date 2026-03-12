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
      badge={<div className="chip">{routines.length}</div>}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Seccion secundaria para revisar estructura y uso.</p>
        <select value={routineSort} onChange={(event) => onRoutineSortChange(event.target.value as AdminRoutineSort)} className="input input-sm bg-white/[0.03] text-sm sm:w-auto">
          <option value="usage">Mas usadas</option>
          <option value="lastCompleted">Mas recientes</option>
          <option value="name">Nombre</option>
        </select>
      </div>

      <div className="space-y-3">
        {routines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-mist/25 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
            <p>No hay rutinas visibles con los filtros actuales.</p>
            <button type="button" onClick={onResetFilters} className="btn-secondary mt-3 text-sm">
              Reiniciar filtros
            </button>
          </div>
        )}

        {routines.map((routine) => (
          <details key={routine.routineId} className="group overflow-hidden rounded-2xl border border-mist/20 bg-white/[0.03]">
            <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-base font-semibold text-white">{routine.name}</div>
                <div className="mt-1 text-sm text-slate-400">Creador: {routine.createdByName || 'Usuario sin nombre'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                <div className="rounded-xl bg-ink/40 p-3 text-center">
                  <div className="text-base font-display text-white">{routine.timesUsed}</div>
                  <div className="text-[11px] text-slate-400">usos</div>
                </div>
                <div className="rounded-xl bg-ink/40 p-3 text-center">
                  <div className="text-sm font-semibold text-white">{formatDateTime(routine.lastCompletedAt)}</div>
                  <div className="text-[11px] text-slate-400">ultima vez</div>
                </div>
                <div className="flex items-center justify-center rounded-xl bg-ink/40 p-3 text-slate-300 transition group-open:rotate-180">
                  <ChevronDown size={16} />
                </div>
              </div>
            </summary>

            <div className="border-t border-mist/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {routine.exercises.map((exercise) => (
                  <div key={`${routine.routineId}-${exercise.exerciseId}`} className="rounded-xl border border-white/5 bg-ink/35 p-3 text-sm">
                    <div className="text-white">{exercise.name}</div>
                    <div className="mt-1 text-slate-400">{exercise.sets}x{exercise.reps}{exercise.restTime ? ` - ${exercise.restTime}s` : ''}</div>
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
