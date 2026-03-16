import React from 'react';
import { Trophy, Target, TrendingUp, Award } from 'lucide-react';
import type { SportSession } from '../../../../shared/types';

interface SessionSummaryProps {
  session: SportSession;
  onClose?: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  session,
  onClose
}) => {
  if (!session.archeryData) return null;

  const { archeryData } = session;
  const totalArrows = archeryData.rounds.reduce(
    (sum, r) => sum + r.ends.reduce((eSum, e) => eSum + e.arrows.length, 0),
    0
  );
  const totalGolds = archeryData.rounds.reduce(
    (sum, r) => sum + r.ends.reduce((eSum, e) => eSum + e.goldCount, 0),
    0
  );
  const duration = session.completedAt && session.startedAt
    ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60))
    : 0;

  return (
    <div className="app-card p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-mint/15 flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="text-mint" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white">
          ¡Sesión Completada!
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {session.startedAt.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Main Score */}
      <div className="text-center mb-6">
        <div className="score-display-lg text-mint">{archeryData.totalScore}</div>
        <div className="text-sm text-slate-400">puntos totales</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Target size={16} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Promedio</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {archeryData.averageArrow}
          </div>
          <div className="text-xs text-slate-500">por flecha</div>
        </div>

        <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Award size={16} className="text-amberGlow" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Oros</span>
          </div>
          <div className="text-2xl font-display font-bold text-amberGlow">
            {totalGolds}
          </div>
          <div className="text-xs text-slate-500">de {totalArrows} flechas</div>
        </div>

        <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp size={16} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Rondas</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {archeryData.rounds.length}
          </div>
          <div className="text-xs text-slate-500">distancias</div>
        </div>

        <div className="bg-slateDeep/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy size={16} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Duración</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {duration > 0 ? `${duration}m` : '--'}
          </div>
          <div className="text-xs text-slate-500">minutos</div>
        </div>
      </div>

      {/* Rounds Breakdown */}
      <div className="space-y-2 mb-6">
        <div className="text-sm font-medium text-slate-300 mb-2">Desglose por rondas:</div>
        {archeryData.rounds.map((round) => (
          <div
            key={round.id}
            className="flex items-center justify-between bg-slateDeep/30 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">{round.distance}m</span>
              <span className="text-xs text-slate-500">
                {round.ends.length} tandas
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-semibold">{round.totalScore}</span>
              {round.ends.reduce((sum, e) => sum + e.goldCount, 0) > 0 && (
                <span className="text-amberGlow text-xs">
                  {round.ends.reduce((sum, e) => sum + e.goldCount, 0)}O
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Equipment Info */}
      <div className="bg-slateDeep/30 rounded-lg p-3 mb-6">
        <div className="text-xs text-slate-500 mb-1">Equipo</div>
        <div className="text-sm text-white">
          {archeryData.bowType === 'recurve' && 'Arco Recurvo'}
          {archeryData.bowType === 'compound' && 'Arco Compuesto'}
          {archeryData.bowType === 'barebow' && 'Barebow'}
          {archeryData.bowType === 'longbow' && 'Arco Longbow'}
          {' • '}
          {archeryData.arrowsUsed} flechas
        </div>
      </div>

      {/* Close Button */}
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
