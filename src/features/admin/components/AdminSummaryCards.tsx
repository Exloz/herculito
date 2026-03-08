import React from 'react';
import { Activity, Clock3, Dumbbell, Users } from 'lucide-react';
import type { AdminSummary } from '../../../shared/types';
import { formatDuration } from '../lib/adminPage';

export const AdminSummaryCards: React.FC<{ summary?: AdminSummary }> = ({ summary }) => {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="app-card p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-300"><Users size={16} /> Usuarios</div>
        <div className="text-2xl font-display text-white">{summary?.totalUsers ?? 0}</div>
      </div>
      <div className="app-card p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-300"><Dumbbell size={16} /> Rutinas</div>
        <div className="text-2xl font-display text-white">{summary?.totalRoutines ?? 0}</div>
      </div>
      <div className="app-card p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-300"><Activity size={16} /> Realizadas</div>
        <div className="text-2xl font-display text-white">{summary?.totalCompletedSessions ?? 0}</div>
      </div>
      <div className="app-card p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-300"><Clock3 size={16} /> Promedio</div>
        <div className="text-2xl font-display text-white">{formatDuration(summary?.averageDurationMin)}</div>
      </div>
    </section>
  );
};
