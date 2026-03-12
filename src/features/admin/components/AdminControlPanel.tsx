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
    <section className="relative overflow-hidden rounded-[1.85rem] border border-mint/15 bg-[radial-gradient(circle_at_top_left,rgba(72,229,163,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,191,71,0.16),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-4 shadow-soft sm:p-5">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.03)_25%,transparent_50%)]" aria-hidden="true" />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-mint/80">
              <Filter size={14} /> Centro de control
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Filtra rápido por usuario, rutina y rango para leer el sistema sin perder contexto.</p>
          </div>

          <button type="button" onClick={onReset} className="btn-secondary inline-flex h-12 items-center justify-center gap-2 self-start sm:self-auto">
            <ArrowDownAZ size={16} /> Reiniciar
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Búsqueda</span>
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
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Histórico</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Usuarios visibles</div>
            <div className="mt-1 text-xl font-display text-white">{visibleUsers}</div>
          </div>
          <div className="rounded-[1.35rem] border border-mint/20 bg-mint/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-mint/80">Rutinas visibles</div>
            <div className="mt-1 text-xl font-display text-white">{visibleRoutines}</div>
          </div>
          <div className="rounded-[1.35rem] border border-amberGlow/20 bg-amberGlow/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amberGlow/80">Actividad visible</div>
            <div className="mt-1 text-xl font-display text-white">{visibleSessions} sesiones</div>
          </div>
        </div>
      </div>
    </section>
  );
};
