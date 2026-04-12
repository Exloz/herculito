import React, { useCallback } from 'react';
import { Pause, Play, X, RotateCcw } from 'lucide-react';
import type { HiitConfig } from '../../../../shared/types';
import { useHiitTimer } from '../../hooks/useHiitTimer';
import { HiitPhaseIndicator } from './HiitPhaseIndicator';
import { HiitProgressRing } from './HiitProgressRing';
import { useUI } from '../../../../app/providers/ui-context';

interface HiitActiveProps {
  config: HiitConfig;
  onAbandon: () => void;
  onComplete: () => void;
}

export const HiitActive: React.FC<HiitActiveProps> = ({ config, onAbandon, onComplete }) => {
  const { confirm } = useUI();
  const timer = useHiitTimer();

  const handleStart = useCallback(() => {
    timer.start(config);
  }, [timer, config]);

  const handlePause = useCallback(() => {
    timer.pause();
  }, [timer]);

  const handleResume = useCallback(() => {
    timer.resume();
  }, [timer]);

  const handleRestart = useCallback(() => {
    timer.start(config);
  }, [timer, config]);

  const handleAbandon = useCallback(() => {
    confirm({
      title: 'Abandonar sesión',
      message: 'Se perderá el progreso de esta sesión de HIIT.',
      confirmText: 'Abandonar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        timer.reset();
        onAbandon();
      },
    });
  }, [confirm, timer, onAbandon]);

  // Auto-start on first render
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('app-navigation-visibility', { detail: { hidden: true } }));

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (timer.state.phase === 'idle') {
      handleStart();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new CustomEvent('app-navigation-visibility', { detail: { hidden: false } }));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle completion
  React.useEffect(() => {
    if (timer.state.phase === 'done') {
      const timeout = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [timer.state.phase, onComplete]);

  const phaseColor = timer.state.phase === 'work'
    ? 'text-mint'
    : timer.state.phase === 'rest'
      ? 'text-amberGlow'
      : timer.state.phase === 'prep'
        ? 'text-amberGlow'
        : 'text-slate-400';

  return (
    <div className="fixed inset-0 z-50 app-shell flex flex-col min-h-screen bg-ink">
      {/* Header */}
      <header className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg text-white">HIIT</h1>
            <span className="text-sm text-slate-400">
              {config.intervals}×{config.workDuration}s{config.restEnabled ? `/${config.restDuration}s` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAbandon}
            className="btn-ghost h-9 w-9 p-0 text-slate-400 hover:text-crimson"
            aria-label="Abandonar sesión"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-4">
        <HiitProgressRing progress={timer.progress} phaseColor={phaseColor}>
          <HiitPhaseIndicator
            phase={timer.state.phase}
            secondsRemaining={timer.state.secondsRemaining}
            currentInterval={timer.state.currentInterval}
            totalIntervals={config.intervals}
          />
        </HiitProgressRing>

        {/* Time display */}
        {(timer.state.phase === 'work' || timer.state.phase === 'rest' || timer.state.phase === 'prep') && (
          <div className={`mt-6 font-mono text-2xl tabular-nums ${phaseColor}`}>
            {timer.formatTime(timer.state.secondsRemaining)}
          </div>
        )}

        {timer.state.phase === 'done' && (
          <div className="mt-6 text-center">
            <div className="font-display text-2xl font-bold text-mint">¡Sesión completada!</div>
            <div className="mt-2 text-sm text-slate-400">
              {config.intervals} intervalos · {timer.formatTime(timer.state.totalElapsed)} en total
            </div>
          </div>
        )}
      </main>

      {/* Controls */}
      <footer className="px-4 pb-[calc(2.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center gap-4">
          {timer.state.phase !== 'idle' && timer.state.phase !== 'done' && (
            <>
              <button
                type="button"
                onClick={timer.isPaused ? handleResume : handlePause}
                className="motion-interactive flex h-14 w-14 items-center justify-center rounded-full bg-mint text-ink shadow-lift transition-transform active:scale-95 touch-target"
                aria-label={timer.isPaused ? 'Reanudar' : 'Pausar'}
              >
                {timer.isPaused ? <Play size={24} /> : <Pause size={24} />}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slateDeep text-slate-300 transition-colors hover:bg-slate-600 touch-target"
                aria-label="Reiniciar"
              >
                <RotateCcw size={18} />
              </button>
            </>
          )}

          {timer.state.phase === 'done' && (
            <button
              type="button"
              onClick={handleRestart}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              <span>Nueva sesión</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
