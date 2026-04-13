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
    secondaryStat = `${session.archeryData.averageArrow} avg`;
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
    <button
      type="button"
      onClick={() => onClick(session)}
      className="app-card p-4 flex w-full items-center justify-between text-left"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div>
          <div className="font-semibold text-white">
            {dateLabel(session.startedAt)}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="p-2 text-slate-400 hover:text-crimson transition-colors"
          aria-label="Eliminar sesión"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </button>
  );
};