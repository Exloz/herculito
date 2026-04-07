import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import type { ExerciseLog, Routine, User, WorkoutSession } from '../../../shared/types';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';
import { getCurrentDateString } from '../../../shared/lib/dateUtils';
import { ExerciseCard } from './ExerciseCard';
import { Timer } from './Timer';
import { ActiveWorkoutHeader } from './ActiveWorkoutHeader';
import { useExerciseLogs } from '../hooks/useExerciseLogs';
import { useFinishWorkoutSound } from '../hooks/useFinishWorkoutSound';
import { getLastWeightsForRoutineFromSessions } from '../lib/workoutSessions';
import {
  areWorkoutSetsEqual,
  clearProgressFromStorage,
  isExerciseLogCompleted,
  loadProgressFromStorage,
  normalizeWorkoutSets,
  saveProgressToStorage,
  SESSION_LOGS_MIGRATION_KEY
} from '../lib/activeWorkoutStorage';

interface ActiveWorkoutProps {
  user: User;
  routine: Routine;
  session: WorkoutSession;
  sessions?: WorkoutSession[];
  previousWeightsByExercise?: Record<string, number[]>;
  onBackToDashboard: (hasProgress: boolean) => void;
  onCompleteWorkout: (exerciseLogs: ExerciseLog[]) => void | Promise<void>;
  onUpdateProgress: (sessionId: string, exerciseLogs: ExerciseLog[]) => void | Promise<void>;
}

const ActiveWorkoutExerciseSkeleton = ({ count }: { count: number }) => {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="app-card p-4 mb-4">
          <div className="skeleton-block h-6 w-40 rounded-lg mb-3" />
          <div className="skeleton-block h-2 w-full rounded-full mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, setIndex) => (
              <div key={setIndex} className="skeleton-block h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = React.memo(({
  user,
  routine,
  session,
  sessions = [],
  previousWeightsByExercise,
  onBackToDashboard,
  onCompleteWorkout,
  onUpdateProgress
}) => {
  const today = getCurrentDateString();
  const {
    updateExerciseLog,
    loading: logsLoading,
    flushPendingLogs
  } = useExerciseLogs(today, user.id, { deferRemoteSync: true });

  const { playFinishSound } = useFinishWorkoutSound();

  const showExerciseSkeleton = useDelayedLoading(logsLoading, 140);
  const hasMigratedSessionLogsRef = useRef(false);
  const lastSentProgressRef = useRef('');

  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [session.id]);

  const hasProgress = useMemo(() => {
    return exerciseLogs.some((log) => log.sets?.some((set) => set.completed));
  }, [exerciseLogs]);

  useEffect(() => {
    const storedLogs = loadProgressFromStorage(session.id);
    if (storedLogs) {
      setExerciseLogs(storedLogs);
    } else {
      setExerciseLogs([]);
    }

    lastSentProgressRef.current = '';

    const storedStartTime = localStorage.getItem(`workoutStartTime_${session.id}`);
    if (storedStartTime) {
      setWorkoutStartTime(Number.parseInt(storedStartTime, 10));
      return;
    }

    const now = Date.now();
    setWorkoutStartTime(now);
    localStorage.setItem(`workoutStartTime_${session.id}`, now.toString());
  }, [session.id]);

  useEffect(() => {
    if (hasProgress) {
      saveProgressToStorage(session.id, exerciseLogs);
      return;
    }

    clearProgressFromStorage(session.id);
  }, [exerciseLogs, hasProgress, session.id]);

  useEffect(() => {
    if (!session.id || exerciseLogs.length === 0) return;

    const progressSignature = JSON.stringify(exerciseLogs);
    if (progressSignature === lastSentProgressRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void Promise.resolve(onUpdateProgress(session.id, exerciseLogs)).then(() => {
        lastSentProgressRef.current = progressSignature;
      });
    }, 1200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [exerciseLogs, onUpdateProgress, session.id]);

  const lastWeights = useMemo(() => {
    if (previousWeightsByExercise) {
      return previousWeightsByExercise;
    }

    return getLastWeightsForRoutineFromSessions(sessions, routine.id);
  }, [previousWeightsByExercise, routine.id, sessions]);

  const createEmptyLog = useCallback((exerciseId: string): ExerciseLog => {
    return {
      exerciseId,
      userId: user.id,
      date: getCurrentDateString(),
      sets: []
    };
  }, [user.id]);

  const getLogForExerciseCustom = useCallback((exerciseId: string): ExerciseLog => {
    const localLog = exerciseLogs.find((log) => log.exerciseId === exerciseId);
    return localLog ?? createEmptyLog(exerciseId);
  }, [createEmptyLog, exerciseLogs]);

  const handleUpdateLog = useCallback((log: ExerciseLog) => {
    updateExerciseLog(log);

    setExerciseLogs((previousLogs) => {
      const nextLogs = previousLogs.map((entry) => entry.exerciseId === log.exerciseId ? log : entry);
      if (!nextLogs.find((entry) => entry.exerciseId === log.exerciseId)) {
        nextLogs.push(log);
      }
      return nextLogs;
    });
  }, [updateExerciseLog]);

  const handleStartRestTimer = useCallback((seconds: number) => {
    if (seconds > 0) {
      setTimerSeconds(seconds);
      setShowTimer(true);
    }
  }, []);

  const handleBackToDashboard = useCallback(() => {
    void flushPendingLogs();
    onBackToDashboard(hasProgress);
  }, [flushPendingLogs, hasProgress, onBackToDashboard]);

  const handleCompleteWorkout = useCallback(() => {
    const finish = async () => {
      await flushPendingLogs();

      const logsToSave = routine.exercises.map((exercise) => {
        const log = getLogForExerciseCustom(exercise.id);
        const normalizedSets = normalizeWorkoutSets(log.sets ?? [], exercise.sets).map((set, index) => {
          const fallbackReps = exercise.repsBySet?.[index];
          if (set.reps !== undefined || fallbackReps !== undefined) {
            return {
              ...set,
              reps: set.reps ?? fallbackReps ?? exercise.reps
            };
          }

          return set;
        });

        return {
          ...log,
          sets: normalizedSets
        };
      });

      playFinishSound();
      await Promise.resolve(onCompleteWorkout(logsToSave));
      clearProgressFromStorage(session.id);
      localStorage.removeItem(`workoutStartTime_${session.id}`);
      lastSentProgressRef.current = '';
    };

    void finish();
  }, [flushPendingLogs, getLogForExerciseCustom, onCompleteWorkout, playFinishSound, routine.exercises, session.id]);

  useEffect(() => {
    return () => {
      void flushPendingLogs();
    };
  }, [flushPendingLogs]);

  const totalExercises = routine.exercises.length;

  const completedExercises = useMemo(() => {
    return routine.exercises.filter((exercise) => {
      const log = getLogForExerciseCustom(exercise.id);
      return isExerciseLogCompleted(log.sets, exercise.sets);
    }).length;
  }, [getLogForExerciseCustom, routine.exercises]);

  useEffect(() => {
    if (logsLoading || hasMigratedSessionLogsRef.current) return;

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
      const log = getLogForExerciseCustom(exercise.id);
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
  }, [getLogForExerciseCustom, handleUpdateLog, logsLoading, routine.exercises, session.id]);

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
        {showExerciseSkeleton ? (
          <ActiveWorkoutExerciseSkeleton count={Math.min(3, routine.exercises.length)} />
        ) : (
          <div className="space-y-3.5 content-fade-in">
            {routine.exercises.map((exercise, index) => {
              const log = getLogForExerciseCustom(exercise.id);
              const isCompleted = isExerciseLogCompleted(log.sets, exercise.sets);

              return (
                <div
                  key={exercise.id}
                  className="motion-enter transition-all duration-200"
                  style={{ animationDelay: `${Math.min(index, 4) * 70}ms` }}
                >
                  <ExerciseCard
                    exercise={exercise}
                    log={log}
                    userId={user.id}
                    onUpdateLog={handleUpdateLog}
                    onStartTimer={handleStartRestTimer}
                    previousWeights={lastWeights[exercise.id]}
                    exerciseNumber={index + 1}
                    isCompleted={isCompleted}
                  />
                </div>
              );
            })}
          </div>
        )}

        {hasProgress && (
          <div className="mt-6 text-center">
            <button
              onClick={handleCompleteWorkout}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 px-8 sm:w-auto"
              aria-label={workoutProgress === 100 ? 'Completar entrenamiento' : 'Finalizar entrenamiento incompleto'}
            >
              <CheckCircle size={20} />
              <span>{workoutProgress === 100 ? 'Completar Entrenamiento' : 'Finalizar Entrenamiento'}</span>
            </button>
          </div>
        )}
      </main>

      {showTimer && (
        <Timer onClose={() => setShowTimer(false)} initialSeconds={timerSeconds} />
      )}
    </div>
  );
});
