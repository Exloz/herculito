import React from 'react';
import { ArrowDownAZ, Filter } from 'lucide-react';
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
    <section className="relative overflow-hidden rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-3.5 shadow-soft sm:p-4">
      <div className="relative">
        <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-mint/80 sm:text-sm">
              <Filter size={14} /> Centro de control
            </div>
            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">Filtra por usuario, rutina y ventana de tiempo.</p>
          </div>

          <button type="button" onClick={onReset} className="btn-secondary inline-flex h-10 items-center justify-center gap-2 self-start px-3 text-sm sm:self-auto">
            <ArrowDownAZ size={16} /> Reiniciar
          </button>
        </div>

        <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Búsqueda</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Usuario, rutina o ejercicio"
              className="input h-10 w-full bg-white/[0.04] text-sm sm:h-11"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Usuario</span>
            <select value={selectedUserId} onChange={(event) => onUserChange(event.target.value)} className="input h-10 w-full bg-white/[0.04] text-sm sm:h-11">
              <option value="all">Todos</option>
              {userOptions.map((user) => (
                <option key={user.value} value={user.value}>{user.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rutina</span>
            <select value={selectedRoutineId} onChange={(event) => onRoutineChange(event.target.value)} className="input h-10 w-full bg-white/[0.04] text-sm sm:h-11">
              <option value="all">Todas</option>
              {routineOptions.map((routine) => (
                <option key={routine.value} value={routine.value}>{routine.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ventana</span>
            <select value={dateRange} onChange={(event) => onDateRangeChange(event.target.value as AdminDateRange)} className="input h-10 w-full bg-white/[0.04] text-sm sm:h-11">
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Histórico</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-[0.9rem] bg-white/[0.04] px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Usuarios visibles</div>
            <div className="mt-0.5 text-lg font-display text-white">{visibleUsers}</div>
          </div>
          <div className="rounded-[0.9rem] bg-mint/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-mint/80">Rutinas visibles</div>
            <div className="mt-0.5 text-lg font-display text-white">{visibleRoutines}</div>
          </div>
          <div className="col-span-2 rounded-[0.9rem] bg-amberGlow/10 px-3 py-2 sm:col-span-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amberGlow/80">Actividad visible</div>
            <div className="mt-0.5 text-lg font-display text-white">{visibleSessions} sesiones</div>
          </div>
        </div>
      </div>
    </section>
  );
};
