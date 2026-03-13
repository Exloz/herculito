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
      tone: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
      detailTone: 'text-sky-100/85'
    },
    {
      label: 'Rutinas',
      value: summary?.totalRoutines ?? 0,
      detail: 'configuradas',
      Icon: Dumbbell,
      tone: 'border-mint/25 bg-mint/10 text-mint/90',
      detailTone: 'text-mint/80'
    },
    {
      label: 'Sesiones',
      value: summary?.totalCompletedSessions ?? 0,
      detail: 'completadas',
      Icon: Activity,
      tone: 'border-orange-300/25 bg-orange-300/10 text-orange-200',
      detailTone: 'text-orange-100/85'
    },
    {
      label: 'Promedio',
      value: formatDuration(summary?.averageDurationMin),
      detail: 'por sesión',
      Icon: Clock3,
      tone: 'border-amberGlow/25 bg-amberGlow/10 text-amberGlow/90',
      detailTone: 'text-amberGlow/80'
    }
  ];

  return (
    <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {items.map(({ label, value, detail, Icon, tone, detailTone }) => (
        <div key={label} className={`rounded-[0.95rem] px-3 py-2.5 shadow-soft ${tone}`}>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <Icon size={15} /> {label}
          </div>
          <div className="mt-1.5 font-display text-[1.45rem] uppercase text-white sm:text-[1.6rem]">{value}</div>
          <div className={`mt-0.5 text-[11px] ${detailTone}`}>{detail}</div>
        </div>
      ))}
    </section>
  );
};
