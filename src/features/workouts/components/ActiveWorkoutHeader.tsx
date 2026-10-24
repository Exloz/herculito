import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';

interface ActiveWorkoutHeaderProps {
  routineName: string;
  workoutStartTime: number | null;
  completedExercises: number;
  totalExercises: number;
  workoutProgress: number;
  completedSets: number;
  totalSets: number;
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
  completedSets,
  totalSets,
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
    <header className="app-header workout-session-header sticky top-0 z-10" style={{ overflowAnchor: 'none' }}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBackToDashboard} className="workspace-icon-button" aria-label="Volver al inicio">
            <ArrowLeft size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-base font-semibold leading-snug text-content">{routineName}</h1>
            <p className="mt-1 text-xs text-muted">{completedExercises} de {totalExercises} ejercicios</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-muted" aria-label="Tiempo de entrenamiento">
            <Clock size={14} aria-hidden="true" />
            <span className="font-mono text-sm tabular-nums">{formatElapsedWorkoutTime(elapsedSeconds)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">{completedSets} de {totalSets} series</span>
          <span className="text-mint">{Math.round(workoutProgress)}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slateDeep" role="progressbar"
          aria-label="Series completadas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(workoutProgress)}>
          <div className="h-full rounded-full bg-mint transition-[width] duration-200" style={{ width: `${workoutProgress}%` }} />
        </div>
        {hasLastWeights && <p className="mt-2 text-xs text-muted">Últimos pesos precargados</p>}
      </div>
    </header>
  );
});
