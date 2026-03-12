import React, { useEffect, useState } from "react";
import { Dumbbell, Home, PlayCircle, Shield } from "lucide-react";

const ACTIVE_WORKOUT_EXPIRATION_MS = 24 * 60 * 60 * 1000;

interface NavigationProps {
  currentPage: "dashboard" | "routines" | "admin";
  onPageChange: (page: "dashboard" | "routines" | "admin") => void;
  isAdmin: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
  isAdmin
}) => {
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);

  useEffect(() => {
    const checkActiveWorkout = () => {
      try {
        const stored = localStorage.getItem('activeWorkout');
        if (!stored) {
          setHasActiveWorkout(false);
          return;
        }

        const parsed = JSON.parse(stored) as { timestamp?: number; session?: { id?: string } };
        const timestamp = typeof parsed?.timestamp === 'number' ? parsed.timestamp : 0;
        const hasValidSession = typeof parsed?.session?.id === 'string' && parsed.session.id.length > 0;

        if (!hasValidSession || Date.now() - timestamp > ACTIVE_WORKOUT_EXPIRATION_MS) {
          localStorage.removeItem('activeWorkout');
          setHasActiveWorkout(false);
          return;
        }

        setHasActiveWorkout(true);
      } catch {
        localStorage.removeItem('activeWorkout');
        setHasActiveWorkout(false);
      }
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
    <div className="fixed bottom-0 left-0 right-0 z-40 flex w-full justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <nav className="pointer-events-auto mb-1 w-[calc(100%-2rem)] max-w-md rounded-2xl border border-mist/60 bg-charcoal px-2 py-2 shadow-soft">
        <div className={`grid ${isAdmin ? (hasActiveWorkout ? 'grid-cols-4' : 'grid-cols-3') : (hasActiveWorkout ? 'grid-cols-3' : 'grid-cols-2')} gap-2`}>
          <button
            onClick={() => onPageChange("dashboard")}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors touch-target ${
              currentPage === "dashboard"
                ? "bg-mint/15 text-mint"
                : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
            }`}
            aria-label="Ir a Inicio"
            aria-current={currentPage === "dashboard" ? "page" : undefined}
          >
            <Home size={22} />
            <span className="text-xs font-semibold">Inicio</span>
          </button>

          {hasActiveWorkout && (
            <button
              onClick={handleResumeClick}
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-amberGlow transition-colors hover:bg-amberGlow/10 hover:text-amberGlow/80 touch-target"
              aria-label="Reanudar entrenamiento activo"
            >
              <PlayCircle size={22} />
              <span className="text-xs font-semibold">Entrenando</span>
            </button>
          )}

          <button
            onClick={() => onPageChange("routines")}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors touch-target ${
              currentPage === "routines"
                ? "bg-mint/15 text-mint"
                : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
            }`}
            aria-label="Ir a Rutinas"
            aria-current={currentPage === "routines" ? "page" : undefined}
          >
            <Dumbbell size={22} />
            <span className="text-xs font-semibold">Rutinas</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onPageChange("admin")}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors touch-target ${
                currentPage === "admin"
                  ? "bg-mint/15 text-mint"
                  : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
              }`}
              aria-label="Ir a Admin"
              aria-current={currentPage === "admin" ? "page" : undefined}
            >
              <Shield size={22} />
              <span className="text-xs font-semibold">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};
