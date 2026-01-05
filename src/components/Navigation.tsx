import React, { useEffect, useState } from "react";
import { Home, Settings, PlayCircle } from "lucide-react";

interface NavigationProps {
  currentPage: "dashboard" | "routines";
  onPageChange: (page: "dashboard" | "routines") => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
}) => {
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);

  useEffect(() => {
    const checkActiveWorkout = () => {
      const stored = localStorage.getItem('activeWorkout');
      setHasActiveWorkout(!!stored);
    };

    checkActiveWorkout();

    window.addEventListener('active-workout-changed', checkActiveWorkout);
    window.addEventListener('storage', checkActiveWorkout);

    return () => {
      window.removeEventListener('active-workout-changed', checkActiveWorkout);
      window.removeEventListener('storage', checkActiveWorkout);
    };
  }, []);

  const handleResumeClick = () => {
    localStorage.setItem('activeWorkoutForceOpen', 'true');
    if (currentPage === 'dashboard') {
      window.dispatchEvent(new Event('resume-active-workout'));
    } else {
      onPageChange('dashboard');
    }
  };

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-mist/60 bg-charcoal/85 px-2 pt-2 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-soft backdrop-blur">
      <div className={`grid ${hasActiveWorkout ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
        <button
          onClick={() => onPageChange("dashboard")}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors ${
            currentPage === "dashboard"
              ? "bg-mint/15 text-mint"
              : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
          }`}
          aria-label="Ir a Inicio"
        >
          <Home size={22} />
          <span className="text-xs font-semibold">Inicio</span>
        </button>

        {hasActiveWorkout && (
          <button
            onClick={handleResumeClick}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors text-amberGlow hover:text-amberGlow/80 hover:bg-amberGlow/10"
            aria-label="Reanudar entrenamiento activo"
          >
            <PlayCircle size={22} className="animate-pulse" />
            <span className="text-xs font-semibold">Entrenando</span>
          </button>
        )}

        <button
          onClick={() => onPageChange("routines")}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors ${
            currentPage === "routines"
              ? "bg-mint/15 text-mint"
              : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
          }`}
          aria-label="Ir a Rutinas"
        >
          <Settings size={22} />
          <span className="text-xs font-semibold">Rutinas</span>
        </button>
      </div>
    </nav>
  );
};

