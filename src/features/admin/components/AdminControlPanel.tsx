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
    <section className="relative overflow-hidden rounded-[1.75rem] border border-mint/15 bg-[radial-gradient(circle_at_top_left,rgba(72,229,163,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,191,71,0.16),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-4 shadow-soft sm:p-5">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.03)_25%,transparent_50%)]" aria-hidden="true" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-mint/80">
          <Filter size={14} /> Centro de control
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Busqueda</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Usuario, rutina o ejercicio"
              className="input h-12 w-full bg-white/[0.04]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Usuario</span>
            <select value={selectedUserId} onChange={(event) => onUserChange(event.target.value)} className="input h-12 w-full bg-white/[0.04]">
              <option value="all">Todos</option>
              {userOptions.map((user) => (
                <option key={user.value} value={user.value}>{user.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rutina</span>
            <select value={selectedRoutineId} onChange={(event) => onRoutineChange(event.target.value)} className="input h-12 w-full bg-white/[0.04]">
              <option value="all">Todas</option>
              {routineOptions.map((routine) => (
                <option key={routine.value} value={routine.value}>{routine.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ventana</span>
            <select value={dateRange} onChange={(event) => onDateRangeChange(event.target.value as AdminDateRange)} className="input h-12 w-full bg-white/[0.04]">
              <option value="7d">Ultimos 7 dias</option>
              <option value="30d">Ultimos 30 dias</option>
              <option value="all">Historico</option>
            </select>
          </label>

          <button type="button" onClick={onReset} className="btn-secondary mt-[1.45rem] inline-flex h-12 items-center justify-center gap-2">
            <ArrowDownAZ size={16} /> Reiniciar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Usuarios visibles</div>
            <div className="mt-1 text-xl font-display text-white">{visibleUsers}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rutinas visibles</div>
            <div className="mt-1 text-xl font-display text-white">{visibleRoutines}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Actividad visible</div>
            <div className="mt-1 text-xl font-display text-white">{visibleSessions} sesiones</div>
          </div>
        </div>
      </div>
    </section>
  );
};
