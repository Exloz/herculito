import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Dumbbell, Target } from 'lucide-react';

interface ActiveWorkoutHeaderProps {
  routineName: string;
  workoutStartTime: number | null;
  completedExercises: number;
  totalExercises: number;
  workoutProgress: number;
  hasLastWeights: boolean;
  onBackToDashboard: () => void;
}

const formatElapsedWorkoutTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const ActiveWorkoutHeader: React.FC<ActiveWorkoutHeaderProps> = React.memo(({
  routineName,
  workoutStartTime,
  completedExercises,
  totalExercises,
  workoutProgress,
  hasLastWeights,
  onBackToDashboard
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!workoutStartTime) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsedSeconds = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - workoutStartTime) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateElapsedSeconds();
    const intervalId = window.setInterval(updateElapsedSeconds, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [workoutStartTime]);

  return (
    <header className="app-header sticky top-0 z-20 px-4 pb-3 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[1.2rem] bg-charcoal/70 px-3 py-3 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <button onClick={onBackToDashboard} className="btn-ghost inline-flex items-center gap-2 px-0 py-0 text-white">
              <ArrowLeft size={20} />
              <span className="font-medium">Volver</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="chip">
                <Clock size={14} />
                <span className="font-mono text-xs tabular-nums">{formatElapsedWorkoutTime(elapsedSeconds)}</span>
              </div>
              <div className="chip chip-warm">
                <Target size={14} />
                <span className="text-xs">{completedExercises}/{totalExercises}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <Dumbbell size={18} className="mt-0.5 shrink-0 text-mint" />
            <div className="min-w-0 flex-1">
              <h1 dir="auto" className="truncate font-display text-[1.85rem] uppercase leading-none text-white sm:text-[2.1rem]">
                {routineName}
              </h1>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">Progreso del entrenamiento</span>
                <span className="font-semibold text-mint">{Math.round(workoutProgress)}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slateDeep">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-mint to-amberGlow transition-all duration-300"
                  style={{ width: `${workoutProgress}%` }}
                />
              </div>

              {hasLastWeights && (
                <div className="mt-2 text-xs text-mint">
                  Se cargaron tus últimos pesos con carga.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
