import { Settings2 } from 'lucide-react';
import type { Routine } from '../../../shared/types';
import { WEEK_DAYS } from '../lib/weeklyPlan';
import type { WeekDay, WeeklyPlan } from '../lib/weeklyPlan';

interface WeeklyPlanEditorProps {
  routines: Routine[];
  plan: WeeklyPlan;
  today: WeekDay;
  onAssign: (day: WeekDay, routineId: string | null | undefined) => void;
  onManageRoutines: () => void;
}

export function WeeklyPlanEditor({ routines, plan, today, onAssign, onManageRoutines }: WeeklyPlanEditorProps) {
  return (
    <fieldset id="weekly-plan-editor" className="min-w-0 border-t border-mist/40 pt-2 lg:col-span-2">
      <legend className="sr-only">Mi semana</legend>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-content">Plan semanal</span>
        <button type="button" onClick={onManageRoutines}
          className="btn-ghost flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-2 text-xs">
          <Settings2 size={14} aria-hidden="true" />Gestionar rutinas
        </button>
      </div>
      <p className="mb-3 text-xs text-muted">Se repite cada semana · guardado en este dispositivo</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {WEEK_DAYS.map(({ id, label }) => {
          const assignment = plan[id];
          const unavailable = typeof assignment === 'string' && !routines.some((routine) => routine.id === assignment);
          return (
            <div key={id} className={`flex min-w-0 items-center gap-2 rounded-xl p-2 ${id === today ? 'bg-accent/10' : 'bg-white/[0.03]'}`}>
              <label htmlFor={`weekly-plan-${id}`} className="w-20 shrink-0 text-sm text-content">
                {label}{id === today && <> <span className="block text-[10px] text-accent">Hoy</span></>}
              </label>
              <select id={`weekly-plan-${id}`} className="input min-h-11 min-w-0 flex-1 text-base"
                value={assignment === undefined ? '__unplanned__' : assignment === null ? '__rest__' : assignment}
                onChange={(event) => onAssign(id, event.target.value === '__unplanned__' ? undefined : event.target.value === '__rest__' ? null : event.target.value)}>
                <option value="__unplanned__">Sin plan</option>
                <option value="__rest__">Descanso</option>
                {unavailable && <option value={assignment ?? ''} disabled>Rutina no disponible</option>}
                {routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      {routines.length === 0 && <p className="mt-3 text-sm text-muted">Activa una rutina en la biblioteca para añadirla a tu semana.</p>}
    </fieldset>
  );
}
