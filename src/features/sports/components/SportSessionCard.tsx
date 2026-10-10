import React from 'react';
import { Target, Timer, MapPin, Trash2 } from 'lucide-react';
import type { SportSession } from '../../../shared/types';

interface SportSessionCardProps {
  session: SportSession;
  onDelete: (id: string) => void;
  onClick: (session: SportSession) => void;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const dateLabel = (date: Date): string =>
  date.toLocaleDateString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

export const SportSessionCard: React.FC<SportSessionCardProps> = ({
  session,
  onDelete,
  onClick,
}) => {
  const isArchery = session.sportType === 'archery';
  const isHiit = session.sportType === 'hiit';

  const iconBg = isHiit ? 'bg-amberGlow/15' : 'bg-mint/15';
  const iconColor = isHiit ? 'text-amberGlow' : 'text-mint';
  const Icon = isHiit ? Timer : Target;
  const sportLabel = isHiit ? 'HIIT' : 'Tiro con Arco';

  let primaryStat = '';
  let secondaryStat = '';

  if (isArchery && session.archeryData) {
    primaryStat = String(session.archeryData.totalScore);
    secondaryStat = `${session.archeryData.averageArrow} por flecha`;
  } else if (isHiit && session.hiitData) {
    primaryStat = formatDuration(session.hiitData.totalWorkTime);
    secondaryStat = `${session.hiitData.intervals} intervalos`;
  } else {
    primaryStat = '--';
  }

  let subtitle: string;
  if (isArchery && session.archeryData) {
    const rounds = session.archeryData.rounds.length;
    subtitle = `${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}`;
  } else if (isHiit && session.hiitData) {
    subtitle = `${session.hiitData.workDuration}s trabajo${session.hiitData.restEnabled ? ` / ${session.hiitData.restDuration}s descanso` : ''}`;
  } else {
    subtitle = sportLabel;
  }

  return (
    <div className="deferred-list-item app-card flex items-center gap-2 p-3">
      <button
        type="button"
        onClick={() => onClick(session)}
        className="min-w-0 flex flex-1 flex-wrap items-center justify-between gap-3 rounded-xl p-1 text-left"
        aria-label={`Ver sesión de ${sportLabel}, ${dateLabel(session.startedAt)}`}
      >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`h-10 w-10 shrink-0 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-white">
            {dateLabel(session.startedAt)}
          </div>
          <div className="flex flex-wrap items-center gap-2 break-words text-xs text-slate-400">
            <span>{subtitle}</span>
            {session.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {session.location}
                </span>
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{sportLabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xl font-display font-bold text-white">
            {primaryStat}
          </div>
          {secondaryStat && (
            <div className="text-xs text-slate-400">{secondaryStat}</div>
          )}
        </div>
      </div>
      </button>
      <button
        type="button"
        onClick={() => onDelete(session.id)}
        className="touch-target shrink-0 rounded-xl p-2 text-slate-400 hover:bg-crimson/10 hover:text-crimson transition-colors"
        aria-label="Eliminar sesión"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};
