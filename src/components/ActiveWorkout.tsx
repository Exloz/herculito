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

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeOutCubic = (value: number): number => 1 - Math.pow(1 - value, 3);

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
  const headerScrollFrameRef = useRef<number | null>(null);
  const headerAnimationFrameRef = useRef<number | null>(null);
  const headerTargetProgressRef = useRef(0);
  const headerProgressRef = useRef(0);

  const [workoutTime, setWorkoutTime] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [headerCompactProgress, setHeaderCompactProgress] = useState(0);
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
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setWorkoutTime(elapsed);
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

  useEffect(() => {
    if (!workoutStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - workoutStartTime) / 1000);
      setWorkoutTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [workoutStartTime]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const animateProgress = () => {
      const target = headerTargetProgressRef.current;
      const current = headerProgressRef.current;
      const nextValue = current + (target - current) * 0.2;

      if (Math.abs(nextValue - target) < 0.001) {
        headerProgressRef.current = target;
        setHeaderCompactProgress(target);
        headerAnimationFrameRef.current = null;
        return;
      }

      headerProgressRef.current = nextValue;
      setHeaderCompactProgress(nextValue);
      headerAnimationFrameRef.current = window.requestAnimationFrame(animateProgress);
    };

    const updateCompactHeaderState = () => {
      const scrollY = Math.max(
        0,
        window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
      );
      const rawProgress = clamp01((scrollY - 8) / 96);
      const targetProgress = easeOutCubic(rawProgress);

      headerTargetProgressRef.current = targetProgress;

      if (reduceMotionQuery.matches) {
        headerProgressRef.current = targetProgress;
        setHeaderCompactProgress(targetProgress);
        return;
      }

      if (headerAnimationFrameRef.current === null) {
        headerAnimationFrameRef.current = window.requestAnimationFrame(animateProgress);
      }
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
      if (headerAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(headerAnimationFrameRef.current);
        headerAnimationFrameRef.current = null;
      }
    };
  }, []);

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

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const headerPaddingTopRem = 1 - (0.45 * headerCompactProgress);
  const headerPaddingBottomRem = 1 - (0.6 * headerCompactProgress);

  const expandedVisibility = clamp01(1 - (headerCompactProgress / 0.82));
  const expandedBlockOpacity = Math.pow(expandedVisibility, 1.25);
  const expandedBlockMaxHeight = Math.round(188 * expandedVisibility);
  const expandedBlockTranslateY = Math.round(-10 * headerCompactProgress);

  const compactTitleVisibility = clamp01((headerCompactProgress - 0.28) / 0.58);
  const compactTitleOpacity = Math.pow(compactTitleVisibility, 1.2);
  const compactTitleTranslateY = Math.round(10 * (1 - compactTitleVisibility));

  const compactBarVisibility = clamp01((headerCompactProgress - 0.36) / 0.5);
  const compactBarOpacity = compactBarVisibility;
  const compactBarMaxHeight = Math.round(8 * compactBarVisibility);
  const compactChipGap = 12 - (3 * headerCompactProgress);
  const compactTitleMaxWidth = `${11.5 - (2.5 * headerCompactProgress)}rem`;

  return (
    <div className="app-shell pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header
        className="app-header px-4 sticky top-0 z-10"
        style={{
          paddingTop: `calc(${headerPaddingTopRem}rem + env(safe-area-inset-top))`,
          paddingBottom: `${headerPaddingBottomRem}rem`
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-center justify-between gap-2">
            <button
              onClick={handleBackToDashboard}
              className="btn-ghost flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Volver</span>
            </button>

            <div
              className="pointer-events-none absolute left-1/2 min-w-0 -translate-x-1/2 px-2"
              style={{
                opacity: compactTitleOpacity,
                transform: `translate(-50%, ${compactTitleTranslateY}px)`
              }}
            >
              <div className="truncate text-center text-sm font-display text-white" style={{ maxWidth: compactTitleMaxWidth }}>
                {routine.name}
              </div>
            </div>

            <div
              className="flex items-center"
              style={{
                gap: `${compactChipGap}px`
              }}
            >
              <div className="chip">
                <Clock size={14} />
                <span className="font-mono text-xs">{formatTime(workoutTime)}</span>
              </div>

              <div className="chip chip-warm">
                <Target size={14} />
                <span className="text-xs">{completedExercises}/{totalExercises}</span>
              </div>
            </div>
          </div>

          <div
            className="mt-4 overflow-hidden"
            style={{
              opacity: expandedBlockOpacity,
              maxHeight: `${expandedBlockMaxHeight}px`,
              transform: `translateY(${expandedBlockTranslateY}px)`
            }}
          >
            <h1 className="text-2xl font-display text-white flex items-center gap-2">
              <Dumbbell size={24} className="text-mint" />
              <span>{routine.name}</span>
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

              {Object.keys(lastWeights).length > 0 && (
                <div className="mt-2 text-xs text-mint flex items-center gap-2">
                  <div className="w-2 h-2 bg-mint rounded-full"></div>
                  <span>Se han cargado los pesos de tu última sesión</span>
                </div>
              )}
            </div>
          </div>

          <div
            className="overflow-hidden"
            style={{
              opacity: compactBarOpacity,
              maxHeight: `${compactBarMaxHeight}px`
            }}
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
