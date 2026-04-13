import React from 'react';
import { Timer, Clock, Flame, ArrowRight } from 'lucide-react';
import type { SportSession } from '../../../../shared/types';

interface HiitSessionSummaryProps {
  session: SportSession;
  onClose?: () => void;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export const HiitSessionSummary: React.FC<HiitSessionSummaryProps> = ({
  session,
  onClose,
}) => {
  if (!session.hiitData) return null;

  const { hiitData } = session;
  const totalDuration = hiitData.totalWorkTime + hiitData.totalRestTime;
  const durationMin = session.completedAt && session.startedAt
    ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60))
    : 0;

  return (
    <div className="app-card p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-amberGlow/15 flex items-center justify-center mx-auto mb-4">
          <Timer size={32} className="text-amberGlow" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white">
          ¡Sesión HIIT Completada!
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {session.startedAt.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Config summary */}
      <div className="text-center mb-6">
        <div className="score-display-lg text-amberGlow">
          {hiitData.intervals} × {hiitData.workDuration}s
        </div>
        <div className="text-sm text-slate-400">intervalos × trabajo</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame size={16} className="text-mint" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Trabajo</span>
          </div>
          <div className="text-2xl font-display font-bold text-mint">
            {formatDuration(hiitData.totalWorkTime)}
          </div>
          <div className="text-xs text-slate-500">tiempo activo</div>
        </div>

        {hiitData.restEnabled && (
          <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ArrowRight size={16} className="text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Descanso</span>
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {formatDuration(hiitData.totalRestTime)}
            </div>
            <div className="text-xs text-slate-500">tiempo de descanso</div>
          </div>
        )}

        <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={16} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {formatDuration(totalDuration)}
          </div>
          <div className="text-xs text-slate-500">trabajo + descanso</div>
        </div>

        {durationMin > 0 && (
          <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer size={16} className="text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Duración</span>
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {durationMin}m
            </div>
            <div className="text-xs text-slate-500">tiempo real</div>
          </div>
        )}
      </div>

      {/* Config details */}
      <div className="bg-slateDeep/30 rounded-lg p-3 mb-6">
        <div className="text-xs text-slate-500 mb-1">Configuración</div>
        <div className="text-sm text-white">
          {hiitData.intervals} intervalos · {hiitData.workDuration}s trabajo
          {hiitData.restEnabled ? ` / ${hiitData.restDuration}s descanso` : ' · sin descanso'}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full btn-primary"
        >
          Cerrar
        </button>
      )}
    </div>
  );
};