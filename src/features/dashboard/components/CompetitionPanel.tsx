import { Trophy } from 'lucide-react';
import type { DashboardCompetition } from '../../../shared/types';

interface CompetitionPanelProps {
  competition?: DashboardCompetition;
}

export function CompetitionPanel({ competition }: CompetitionPanelProps) {
  const periods = [
    { label: 'Esta semana', leader: competition?.weekLeader, rank: competition?.userWeekRank },
    { label: 'Este mes', leader: competition?.monthLeader, rank: competition?.userMonthRank }
  ];

  return (
    <section aria-label="Competencia de la comunidad" className="rounded-2xl border border-mist/50 bg-charcoal/50 px-4 py-3">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
        <Trophy size={14} className="text-amberGlow" /> Ranking
      </h3>
      <div className="grid grid-cols-2 divide-x divide-mist/50">
        {periods.map(({ label, leader, rank }) => (
          <section key={label} aria-label={`Ranking: ${label}`} className="min-w-0 first:pr-3 last:pl-3 sm:first:pr-4 sm:last:pl-4">
            <h4 className="mb-1.5 text-xs text-slate-400">{label}</h4>
            {leader ? (
              <div>
                <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
                  <span className="shrink-0 font-semibold text-amberGlow">#{leader.position}</span>
                  <span className="truncate font-semibold text-white" title={leader.name}>{leader.name}{rank?.userId === leader.userId ? ' · Tú' : ''}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{leader.totalWorkouts} {leader.totalWorkouts === 1 ? 'sesión' : 'sesiones'}</p>
              </div>
            ) : <p className="text-sm text-slate-500">Sin líder</p>}
            <div className="mt-2 text-xs">
              {rank ? (
                <p className="text-slate-400">Tú <strong className="text-mint">#{rank.position}</strong> · {rank.totalWorkouts} {rank.totalWorkouts === 1 ? 'sesión' : 'sesiones'}</p>
              ) : <p className="text-slate-500">Tú · Sin posición</p>}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
