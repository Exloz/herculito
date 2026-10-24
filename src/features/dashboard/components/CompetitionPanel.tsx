import { ChevronRight, Trophy } from 'lucide-react';
import type { DashboardCompetition } from '../../../shared/types';

interface CompetitionPanelProps {
  competition?: DashboardCompetition;
}

export function CompetitionPanel({ competition }: CompetitionPanelProps) {
  const periods = [
    { label: 'Esta semana', leader: competition?.weekLeader, rank: competition?.userWeekRank },
    { label: 'Este mes', leader: competition?.monthLeader, rank: competition?.userMonthRank }
  ];

  if (!periods.some(({ leader, rank }) => leader || rank)) {
    return <details className="community-empty">
      <summary>
        <Trophy size={18} aria-hidden="true" />
        <span><strong>Comunidad</strong><small>{competition ? 'Aún sin clasificación' : 'Clasificación no disponible'}</small></span>
        <ChevronRight size={16} aria-hidden="true" />
      </summary>
      <p>{competition ? 'Todavía no hay posiciones disponibles para esta semana ni para este mes.'
        : 'La clasificación semanal y mensual no está disponible en este momento.'}</p>
    </details>;
  }

  return (
    <section aria-label="Competencia de la comunidad" className="competition-panel">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Trophy size={14} className="text-slate-400" aria-hidden="true" /> Ranking
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {periods.map(({ label, leader, rank }) => (
          <section key={label} aria-label={`Ranking: ${label}`} className="min-w-0">
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
