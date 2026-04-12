import React from 'react';
import type { HiitPhase } from '../../../../shared/types';

interface HiitPhaseIndicatorProps {
  phase: HiitPhase;
  secondsRemaining: number;
  currentInterval: number;
  totalIntervals: number;
}

const phaseStyles: Record<HiitPhase, { bg: string; text: string; label: string }> = {
  idle: { bg: 'bg-slate-600', text: 'text-slate-300', label: 'Listo' },
  prep: { bg: 'bg-amberGlow/20', text: 'text-amberGlow', label: 'Preparación' },
  work: { bg: 'bg-mint/20', text: 'text-mint', label: 'Trabajo' },
  rest: { bg: 'bg-amberGlow/20', text: 'text-amberGlow', label: 'Descanso' },
  done: { bg: 'bg-mint/20', text: 'text-mint', label: 'Completado' },
};

export const HiitPhaseIndicator: React.FC<HiitPhaseIndicatorProps> = ({
  phase,
  secondsRemaining,
  currentInterval,
  totalIntervals,
}) => {
  const style = phaseStyles[phase];
  const isCountdown = (phase === 'work' || phase === 'rest') && secondsRemaining <= 5 && secondsRemaining > 0;
  const showBigNumber = phase === 'prep' || phase === 'work' || phase === 'rest' || isCountdown;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phase label */}
      <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${style.bg}`}>
        <span className={`text-sm font-semibold uppercase tracking-widest ${style.text}`}>
          {style.label}
        </span>
      </div>

      {/* Big number */}
      {showBigNumber && (
        <div className={`motion-pop-in font-display text-[5rem] leading-none font-bold ${
          phase === 'work' ? 'text-mint' : phase === 'rest' ? 'text-amberGlow' : 'text-amberGlow'
        } ${isCountdown || phase === 'prep' ? 'motion-pop-in' : ''}`}>
          {secondsRemaining}
        </div>
      )}

      {phase === 'done' && (
        <div className="motion-pop-in font-display text-[3rem] leading-none font-bold text-mint">
          ¡Listo!
        </div>
      )}

      {phase === 'idle' && (
        <div className="text-slate-400 text-center">
          Presiona comenzar para iniciar<br />la sesión de entrenamiento
        </div>
      )}

      {/* Interval counter */}
      {(phase === 'work' || phase === 'rest') && totalIntervals > 1 && (
        <div className="text-sm text-slate-400">
          Intervalo <span className="font-semibold text-white">{currentInterval}</span> de <span className="font-semibold text-white">{totalIntervals}</span>
        </div>
      )}
    </div>
  );
};