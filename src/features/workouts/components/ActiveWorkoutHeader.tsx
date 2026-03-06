import React, { useEffect, useRef, useState } from 'react';
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

const ENTER_COMPACT_SCROLL_THRESHOLD_Y = 132;
const EXIT_COMPACT_SCROLL_THRESHOLD_Y = 12;
const HEADER_TOGGLE_COOLDOWN_MS = 180;

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
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const headerScrollFrameRef = useRef<number | null>(null);
  const isHeaderCompactRef = useRef(false);
  const lastHeaderToggleAtRef = useRef(0);

  useEffect(() => {
    isHeaderCompactRef.current = isHeaderCompact;
  }, [isHeaderCompact]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCompactHeaderState = () => {
      const scrollY = Math.max(
        0,
        window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
      );

      const currentMode = isHeaderCompactRef.current;
      const shouldBeCompact = currentMode
        ? scrollY > EXIT_COMPACT_SCROLL_THRESHOLD_Y
        : scrollY > ENTER_COMPACT_SCROLL_THRESHOLD_Y;

      if (shouldBeCompact === currentMode) {
        return;
      }

      const now = Date.now();
      if (now - lastHeaderToggleAtRef.current < HEADER_TOGGLE_COOLDOWN_MS) {
        return;
      }

      lastHeaderToggleAtRef.current = now;
      isHeaderCompactRef.current = shouldBeCompact;
      setIsHeaderCompact(shouldBeCompact);
    };

    const handleScroll = () => {
      if (headerScrollFrameRef.current !== null) {
        return;
      }

      headerScrollFrameRef.current = window.requestAnimationFrame(() => {
        updateCompactHeaderState();
        headerScrollFrameRef.current = null;
      });
    };

    updateCompactHeaderState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);

      if (headerScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(headerScrollFrameRef.current);
        headerScrollFrameRef.current = null;
      }
    };
  }, []);

  return (
    <header
      className={`app-header px-4 sticky top-0 z-10 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isHeaderCompact ? 'pt-[calc(0.55rem+env(safe-area-inset-top))] pb-2' : 'pt-[calc(1rem+env(safe-area-inset-top))] pb-4'}`}
      style={{ overflowAnchor: 'none' }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-center justify-between gap-2">
          <button onClick={onBackToDashboard} className="btn-ghost flex items-center gap-2">
            <ArrowLeft size={20} />
            <span className="font-medium">Volver</span>
          </button>

          <div
            className="pointer-events-none absolute left-1/2 min-w-0 -translate-x-1/2 px-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: isHeaderCompact ? 1 : 0,
              transform: `translate(-50%, ${isHeaderCompact ? 0 : 10}px)`,
              willChange: 'opacity, transform'
            }}
          >
            <div
              className="truncate text-center text-sm font-display text-white"
              style={{
                maxWidth: isHeaderCompact ? '9rem' : '11.5rem',
                transition: 'max-width 300ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              {routineName}
            </div>
          </div>

          <div
            className="flex items-center"
            style={{
              gap: isHeaderCompact ? '9px' : '12px',
              transition: 'gap 300ms cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            <div className="chip">
              <Clock size={14} />
              <span className="font-mono text-xs">{formatElapsedWorkoutTime(elapsedSeconds)}</span>
            </div>

            <div className="chip chip-warm">
              <Target size={14} />
              <span className="text-xs">{completedExercises}/{totalExercises}</span>
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity,transform,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isHeaderCompact ? 'max-h-0 opacity-0 -translate-y-2 mt-0' : 'max-h-80 opacity-100 translate-y-0 mt-4'}`}
        >
          <h1 className="text-2xl font-display text-white flex items-center gap-2">
            <Dumbbell size={24} className="text-mint" />
            <span>{routineName}</span>
          </h1>

          <div className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-300">Progreso del entrenamiento</span>
              <span className="text-sm font-semibold text-mint">{Math.round(workoutProgress)}%</span>
            </div>
            <div className="w-full bg-slateDeep rounded-full h-2">
              <div
                className="bg-gradient-to-r from-mint to-amberGlow h-2 rounded-full transition-all duration-300"
                style={{ width: `${workoutProgress}%` }}
              />
            </div>

            {hasLastWeights && (
              <div className="mt-2 text-xs text-mint flex items-center gap-2">
                <div className="w-2 h-2 bg-mint rounded-full"></div>
                <span>Se han cargado los pesos de tu última sesión</span>
              </div>
            )}
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isHeaderCompact ? 'max-h-5 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pt-1.5">
            <div className="w-full bg-slateDeep rounded-full h-1">
              <div
                className="bg-gradient-to-r from-mint to-amberGlow h-1 rounded-full transition-all duration-300"
                style={{ width: `${workoutProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
