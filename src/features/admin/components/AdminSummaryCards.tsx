import React from 'react';
import { Activity, Clock3, Dumbbell, Users } from 'lucide-react';
import type { AdminSummary } from '../../../shared/types';
import { formatDuration } from '../lib/adminPage';

export const AdminSummaryCards: React.FC<{ summary?: AdminSummary }> = ({ summary }) => {
  const items = [
    {
      label: 'Usuarios',
      value: summary?.totalUsers ?? 0,
      detail: 'cuentas activas',
      Icon: Users,
      tone: 'border-white/10 bg-white/[0.04] text-slate-300'
    },
    {
      label: 'Rutinas',
      value: summary?.totalRoutines ?? 0,
      detail: 'configuradas',
      Icon: Dumbbell,
      tone: 'border-mint/20 bg-mint/10 text-mint/80'
    },
    {
      label: 'Sesiones',
      value: summary?.totalCompletedSessions ?? 0,
      detail: 'completadas',
      Icon: Activity,
      tone: 'border-white/10 bg-white/[0.04] text-slate-300'
    },
    {
      label: 'Promedio',
      value: formatDuration(summary?.averageDurationMin),
      detail: 'por sesión',
      Icon: Clock3,
      tone: 'border-amberGlow/20 bg-amberGlow/10 text-amberGlow/80'
    }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, detail, Icon, tone }) => (
        <div key={label} className={`rounded-[1.5rem] border px-4 py-4 shadow-soft ${tone}`}>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <Icon size={15} /> {label}
          </div>
          <div className="mt-3 font-display text-[2rem] uppercase text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-300">{detail}</div>
        </div>
      ))}
    </section>
  );
};
