import React from 'react';
import { ArrowDownAZ, Filter } from 'lucide-react';
import { AppCombobox } from '../../../shared/ui/AppCombobox';
import type { AdminDateRange, AdminFilterOption } from '../lib/adminPage';

interface AdminControlPanelProps {
  searchQuery: string;
  selectedUserId: string;
  selectedRoutineId: string;
  dateRange: AdminDateRange;
  userOptions: AdminFilterOption[];
  routineOptions: AdminFilterOption[];
  visibleUsers: number;
  visibleRoutines: number;
  visibleSessions: number;
  onSearchChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onRoutineChange: (value: string) => void;
  onDateRangeChange: (value: AdminDateRange) => void;
  onReset: () => void;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  searchQuery,
  selectedUserId,
  selectedRoutineId,
  dateRange,
  userOptions,
  routineOptions,
  visibleUsers,
  visibleRoutines,
  visibleSessions,
  onSearchChange,
  onUserChange,
  onRoutineChange,
  onDateRangeChange,
  onReset
}) => {
  return (
    <section className="relative overflow-hidden rounded-[1.2rem] border border-amberGlow/20 bg-[radial-gradient(circle_at_100%_0%,oklch(0.76_0.15_72/0.16),transparent_42%),radial-gradient(circle_at_0%_100%,oklch(0.71_0.16_36/0.14),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-3.5 shadow-soft sm:p-4">
      <div className="relative">
        <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amberGlow/80 sm:text-sm">
              <Filter size={14} /> Centro de control
            </div>
            <p className="mt-1 max-w-2xl text-xs text-slate-200 sm:text-sm">Filtra por usuario, rutina y ventana de tiempo.</p>
          </div>

          <button type="button" onClick={onReset} className="btn-secondary inline-flex h-10 items-center justify-center gap-2 self-start border-amberGlow/25 bg-amberGlow/10 px-3 text-sm text-amberGlow hover:border-amberGlow/40 hover:bg-amberGlow/15 sm:self-auto">
            <ArrowDownAZ size={16} /> Reiniciar
          </button>
        </div>

        <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-amberGlow/75">Búsqueda</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Usuario, rutina o ejercicio"
              className="input h-10 w-full border-amberGlow/20 bg-[oklch(0.3_0.03_70/0.4)] text-sm placeholder:text-slate-300/70 sm:h-11"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-amberGlow/75">Usuario</span>
            <AppCombobox
              value={selectedUserId}
              onChange={onUserChange}
              options={[
                { value: 'all', label: 'Todos' },
                ...userOptions.map((user) => ({ value: user.value, label: user.label }))
              ]}
              searchPlaceholder="Buscar usuario"
              triggerClassName="input h-10 w-full border-amberGlow/20 bg-[oklch(0.3_0.03_70/0.4)] text-sm sm:h-11"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-amberGlow/75">Rutina</span>
            <AppCombobox
              value={selectedRoutineId}
              onChange={onRoutineChange}
              options={[
                { value: 'all', label: 'Todas' },
                ...routineOptions.map((routine) => ({ value: routine.value, label: routine.label }))
              ]}
              searchPlaceholder="Buscar rutina"
              triggerClassName="input h-10 w-full border-amberGlow/20 bg-[oklch(0.3_0.03_70/0.4)] text-sm sm:h-11"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-amberGlow/75">Ventana</span>
            <AppCombobox
              value={dateRange}
              onChange={(value) => onDateRangeChange(value as AdminDateRange)}
              options={[
                { value: '7d', label: 'Últimos 7 días' },
                { value: '30d', label: 'Últimos 30 días' },
                { value: 'all', label: 'Histórico' }
              ]}
              searchable={false}
              triggerClassName="input h-10 w-full border-amberGlow/20 bg-[oklch(0.3_0.03_70/0.4)] text-sm sm:h-11"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-[0.9rem] border border-sky-400/20 bg-sky-400/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Usuarios visibles</div>
            <div className="mt-0.5 text-lg font-display text-white">{visibleUsers}</div>
          </div>
          <div className="rounded-[0.9rem] border border-mint/20 bg-mint/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-mint/80">Rutinas visibles</div>
            <div className="mt-0.5 text-lg font-display text-white">{visibleRoutines}</div>
          </div>
          <div className="col-span-2 rounded-[0.9rem] border border-orange-300/25 bg-orange-300/10 px-3 py-2 sm:col-span-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-orange-100">Actividad visible</div>
            <div className="mt-0.5 text-lg font-display text-white">{visibleSessions} sesiones</div>
          </div>
        </div>
      </div>
    </section>
  );
};
