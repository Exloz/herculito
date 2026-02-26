import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, Clock, CheckCircle, Target, Dumbbell } from 'lucide-react';
import { Routine, User, WorkoutSession, ExerciseLog, WorkoutSet } from '../types';
import { useExerciseLogs } from '../hooks/useWorkouts';
import { ExerciseCard } from './ExerciseCard';
import { Timer } from './Timer';
import { getCurrentDateString } from '../utils/dateUtils';
import { getLastWeightsForRoutineFromSessions } from '../utils/workoutSessions';

const PROGRESS_KEY = 'activeWorkoutProgress';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000;
const SESSION_LOGS_MIGRATION_KEY = 'activeWorkoutSessionLogsMigration_v1';
const ENTER_COMPACT_SCROLL_THRESHOLD_Y = 88;
const EXIT_COMPACT_SCROLL_THRESHOLD_Y = 52;
const HEADER_TOGGLE_COOLDOWN_MS = 180;

const toComparableDateValue = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const areWorkoutSetsEqual = (left: WorkoutSet[], right: WorkoutSet[]): boolean => {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftSet = left[index];
    const rightSet = right[index];

    if (leftSet.setNumber !== rightSet.setNumber) return false;
    if (leftSet.weight !== rightSet.weight) return false;
    if (leftSet.completed !== rightSet.completed) return false;

    const leftCompletedAt = toComparableDateValue(leftSet.completedAt);
    const rightCompletedAt = toComparableDateValue(rightSet.completedAt);
    if (leftCompletedAt !== rightCompletedAt) return false;
  }

  return true;
};

const normalizeWorkoutSets = (sets: WorkoutSet[], expectedSets: number): WorkoutSet[] => {
  if (expectedSets <= 0) return [];

  const normalizedBySetNumber = new Map<number, WorkoutSet>();
  sets.forEach((set) => {
    const setNumber = Number(set.setNumber);
    if (!Number.isInteger(setNumber)) return;
    if (setNumber < 1 || setNumber > expectedSets) return;
    normalizedBySetNumber.set(setNumber, set);
  });

  const normalizedSets: WorkoutSet[] = [];
  for (let setNumber = 1; setNumber <= expectedSets; setNumber += 1) {
    const existingSet = normalizedBySetNumber.get(setNumber);
    if (existingSet) {
      normalizedSets.push(existingSet);
      continue;
    }

    normalizedSets.push({
      setNumber,
      weight: 0,
      completed: false
    });
  }

  return normalizedSets;
};

const isExerciseLogCompleted = (sets: ExerciseLog['sets'], expectedSets: number): boolean => {
  if (expectedSets <= 0) return false;

  const completionBySetNumber = new Map<number, boolean>();
  (sets ?? []).forEach((set) => {
    const setNumber = Number(set.setNumber);
    if (!Number.isInteger(setNumber)) return;
    if (setNumber < 1 || setNumber > expectedSets) return;
    completionBySetNumber.set(setNumber, set.completed === true);
  });

  for (let setNumber = 1; setNumber <= expectedSets; setNumber += 1) {
    if (completionBySetNumber.get(setNumber) !== true) {
      return false;
    }
  }

  return true;
};

const saveProgressToStorage = (sessionId: string, exerciseLogs: ExerciseLog[]) => {
  const data = {
    sessionId,
    exerciseLogs,
    timestamp: Date.now(),
  };
  localStorage.setItem(`${PROGRESS_KEY}_${sessionId}`, JSON.stringify(data));
};

const loadProgressFromStorage = (sessionId: string): ExerciseLog[] | null => {
  const stored = localStorage.getItem(`${PROGRESS_KEY}_${sessionId}`);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    const now = Date.now();
    if (now - data.timestamp > EXPIRATION_TIME) {
      localStorage.removeItem(`${PROGRESS_KEY}_${sessionId}`);
      return null;
    }
    const logs = data.exerciseLogs as ExerciseLog[];
    // Rehydrate Date fields that were stringified.
    logs.forEach((log) => {
      (log.sets ?? []).forEach((set) => {
        const completedAt = (set as unknown as { completedAt?: unknown }).completedAt;
        if (typeof completedAt === 'string') {
          const parsed = Date.parse(completedAt);
          if (Number.isFinite(parsed)) {
            (set as unknown as { completedAt?: Date }).completedAt = new Date(parsed);
          }
        }
      });
    });
    return logs;
  } catch {
    localStorage.removeItem(`${PROGRESS_KEY}_${sessionId}`);
    return null;
  }
};

interface ActiveWorkoutProps {
  user: User;
  routine: Routine;
  session: WorkoutSession;
  sessions: WorkoutSession[];
  onBackToDashboard: (hasProgress: boolean) => void;
  onCompleteWorkout: (exerciseLogs: ExerciseLog[]) => void;
  onUpdateProgress: (sessionId: string, exerciseLogs: ExerciseLog[]) => void | Promise<void>;
}

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

const ActiveWorkoutHeader: React.FC<ActiveWorkoutHeaderProps> = React.memo(({
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
          <button
            onClick={onBackToDashboard}
            className="btn-ghost flex items-center gap-2"
          >
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


export const ActiveWorkout: React.FC<ActiveWorkoutProps> = React.memo(({
  user,
  routine,
  session,
  sessions,
  onBackToDashboard,
  onCompleteWorkout,
  onUpdateProgress
}) => {
  const today = getCurrentDateString();
  const { updateExerciseLog, getLogForExercise, loading: logsLoading } = useExerciseLogs(today, user.id);
  const hasMigratedSessionLogsRef = useRef(false);

  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const hasProgress = useMemo(
    () => exerciseLogs.some(log => log.sets?.some(set => set.completed)),
    [exerciseLogs]
  );

  useEffect(() => {
    const storedLogs = loadProgressFromStorage(session.id);
    if (storedLogs) {
      setExerciseLogs(storedLogs);
    }

    const storedStartTime = localStorage.getItem(`workoutStartTime_${session.id}`);
    if (storedStartTime) {
      const startTime = parseInt(storedStartTime, 10);
      setWorkoutStartTime(startTime);
    } else {
      const now = Date.now();
      setWorkoutStartTime(now);
      localStorage.setItem(`workoutStartTime_${session.id}`, now.toString());
    }
  }, [session.id]);

  useEffect(() => {
    if (hasProgress) {
      saveProgressToStorage(session.id, exerciseLogs);
    } else {
      localStorage.removeItem(`${PROGRESS_KEY}_${session.id}`);
    }
  }, [exerciseLogs, session.id, hasProgress]);

  useEffect(() => {
    if (!session.id) return;
    if (exerciseLogs.length === 0) return;

    const timeoutId = setTimeout(() => {
      onUpdateProgress(session.id, exerciseLogs);
    }, 800);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [exerciseLogs, onUpdateProgress, session.id]);

  const lastWeights = useMemo(
    () => getLastWeightsForRoutineFromSessions(sessions, routine.id),
    [sessions, routine.id]
  );

  const getLogForExerciseCustom = useCallback((exerciseId: string, userId: string): ExerciseLog | undefined => {
    const localLog = exerciseLogs.find(l => l.exerciseId === exerciseId);
    if (localLog) return localLog;
    return getLogForExercise(exerciseId, userId);
  }, [exerciseLogs, getLogForExercise]);

  const handleUpdateLog = useCallback((log: ExerciseLog) => {
    updateExerciseLog(log);

    setExerciseLogs(prevLogs => {
      const updatedLogs = prevLogs.map(l => l.exerciseId === log.exerciseId ? log : l);
      if (!updatedLogs.find(l => l.exerciseId === log.exerciseId)) {
        updatedLogs.push(log);
      }
      return updatedLogs;
    });
  }, [updateExerciseLog]);

  const handleStartRestTimer = useCallback((seconds: number) => {
    if (seconds > 0) {
      setTimerSeconds(seconds);
      setShowTimer(true);
    }
  }, []);

  const handleBackToDashboard = useCallback(() => {
    onBackToDashboard(hasProgress);
  }, [hasProgress, onBackToDashboard]);

  const handleCompleteWorkout = useCallback(() => {
    const logsToSave = routine.exercises.map(exercise => {
      const log = getLogForExerciseCustom(exercise.id, user.id) || {
        exerciseId: exercise.id,
        userId: user.id,
        date: getCurrentDateString(),
        sets: []
      };
      return {
        ...log,
        sets: normalizeWorkoutSets(log.sets ?? [], exercise.sets)
      };
    });

    onCompleteWorkout(logsToSave);
    localStorage.removeItem(`${PROGRESS_KEY}_${session.id}`);
    localStorage.removeItem(`workoutStartTime_${session.id}`);
  }, [getLogForExerciseCustom, onCompleteWorkout, routine.exercises, session.id, user.id]);

  useEffect(() => {
    if (logsLoading) return;
    if (hasMigratedSessionLogsRef.current) return;

    const migrationKey = `${SESSION_LOGS_MIGRATION_KEY}_${session.id}`;
    try {
      if (localStorage.getItem(migrationKey) === 'done') {
        hasMigratedSessionLogsRef.current = true;
        return;
      }
    } catch {
      // ignore storage read errors
    }

    const migratedLogs: ExerciseLog[] = [];
    routine.exercises.forEach((exercise) => {
      const log = getLogForExerciseCustom(exercise.id, user.id);
      if (!log || (log.sets?.length ?? 0) === 0) return;

      const normalizedSets = normalizeWorkoutSets(log.sets, exercise.sets);
      if (areWorkoutSetsEqual(log.sets, normalizedSets)) return;

      migratedLogs.push({
        ...log,
        sets: normalizedSets
      });
    });

    migratedLogs.forEach((log) => {
      handleUpdateLog(log);
    });

    try {
      localStorage.setItem(migrationKey, 'done');
    } catch {
      // ignore storage write errors
    }

    hasMigratedSessionLogsRef.current = true;
  }, [getLogForExerciseCustom, handleUpdateLog, logsLoading, routine.exercises, session.id, user.id]);

  const totalExercises = routine.exercises.length;

  const completedExercises = useMemo(() => {
    return routine.exercises.filter(exercise => {
      const log = getLogForExerciseCustom(exercise.id, user.id);
      return !!log && isExerciseLogCompleted(log.sets, exercise.sets);
    }).length;
  }, [getLogForExerciseCustom, routine.exercises, user.id]);

  const workoutProgress = useMemo(() => {
    return totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
  }, [completedExercises, totalExercises]);

  const hasLastWeights = useMemo(() => Object.keys(lastWeights).length > 0, [lastWeights]);

  return (
    <div className="app-shell pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <ActiveWorkoutHeader
        routineName={routine.name}
        workoutStartTime={workoutStartTime}
        completedExercises={completedExercises}
        totalExercises={totalExercises}
        workoutProgress={workoutProgress}
        hasLastWeights={hasLastWeights}
        onBackToDashboard={handleBackToDashboard}
      />

      <main
        className={`max-w-4xl mx-auto px-4 py-6 sm:py-8 transition-[padding-bottom] duration-200 ${showTimer ? 'pb-[calc(11.5rem+env(safe-area-inset-bottom))]' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'}`}
      >
        <div className="space-y-4">
          {routine.exercises.map((exercise, index) => {
            const log = getLogForExerciseCustom(exercise.id, user.id) || {
              exerciseId: exercise.id,
              userId: user.id,
              date: getCurrentDateString(),
              sets: []
            };
            const isCompleted = isExerciseLogCompleted(log.sets, exercise.sets);

            return (
              <div
                key={exercise.id}
                className={`transition-all duration-200 ${isCompleted ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  {isCompleted && (
                    <CheckCircle size={20} className="text-mint" />
                  )}
                  <h3 className="text-lg font-semibold text-white">
                    {index + 1}. {exercise.name}
                  </h3>
                </div>

                <ExerciseCard
                  exercise={exercise}
                  log={log}
                  userId={user.id}
                  onUpdateLog={handleUpdateLog}
                  onStartTimer={handleStartRestTimer}
                  previousWeights={lastWeights[exercise.id]}
                />
              </div>
            );
          })}
        </div>

        {hasProgress && (
          <div className="mt-7 text-center">
            <button
              onClick={handleCompleteWorkout}
              className="btn-primary inline-flex items-center gap-2 px-8"
              aria-label={workoutProgress === 100 ? 'Completar entrenamiento' : 'Finalizar entrenamiento incompleto'}
            >
              <CheckCircle size={20} />
              <span>{workoutProgress === 100 ? 'Completar Entrenamiento' : 'Finalizar Entrenamiento'}</span>
            </button>
          </div>
        )}

      </main>

      {showTimer && (
        <Timer
          onClose={() => setShowTimer(false)}
          initialSeconds={timerSeconds}
        />
      )}
    </div>
  );
});
