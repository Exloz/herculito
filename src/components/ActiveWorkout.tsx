import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Clock, CheckCircle, Target, Dumbbell } from 'lucide-react';
import { Routine, User, WorkoutSession, ExerciseLog } from '../types';
import { useExerciseLogs } from '../hooks/useWorkouts';
import { useWorkoutSessions } from '../hooks/useWorkoutSessions';
import { ExerciseCard } from './ExerciseCard';
import { Timer } from './Timer';
import { getCurrentDateString } from '../utils/dateUtils';

const PROGRESS_KEY = 'activeWorkoutProgress';
const EXPIRATION_TIME = 24 * 60 * 60 * 1000;

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
    return data.exerciseLogs;
  } catch {
    localStorage.removeItem(`${PROGRESS_KEY}_${sessionId}`);
    return null;
  }
};

interface ActiveWorkoutProps {
  user: User;
  routine: Routine;
  session: WorkoutSession;
  onBackToDashboard: (hasProgress: boolean) => void;
  onCompleteWorkout: (exerciseLogs: ExerciseLog[]) => void;
}


export const ActiveWorkout: React.FC<ActiveWorkoutProps> = React.memo(({
  user,
  routine,
  session,
  onBackToDashboard,
  onCompleteWorkout
}) => {
  const today = getCurrentDateString();
  const { updateExerciseLog, getLogForExercise } = useExerciseLogs(today, user.id);
  const { getLastWeightsForRoutine } = useWorkoutSessions(user);

  const [workoutTime, setWorkoutTime] = useState(0);
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

  const lastWeights = useMemo(
    () => getLastWeightsForRoutine(routine.id),
    [getLastWeightsForRoutine, routine.id]
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
    if (!hasProgress) {
      localStorage.removeItem(`${PROGRESS_KEY}_${session.id}`);
      localStorage.removeItem(`workoutStartTime_${session.id}`);
    }
    onBackToDashboard(hasProgress);
  }, [hasProgress, onBackToDashboard, session.id]);

  const handleCompleteWorkout = useCallback(() => {
    const logsToSave = routine.exercises.map(exercise => {
      const log = getLogForExerciseCustom(exercise.id, user.id) || {
        exerciseId: exercise.id,
        userId: user.id,
        date: getCurrentDateString(),
        sets: []
      };
      return log;
    });

    onCompleteWorkout(logsToSave);
    localStorage.removeItem(`${PROGRESS_KEY}_${session.id}`);
    localStorage.removeItem(`workoutStartTime_${session.id}`);
  }, [getLogForExerciseCustom, onCompleteWorkout, routine.exercises, session.id, user.id]);

  const totalExercises = routine.exercises.length;

  const completedExercises = useMemo(() => {
    return routine.exercises.filter(exercise => {
      const log = getLogForExerciseCustom(exercise.id, user.id);
      return log && log.sets.length > 0 && log.sets.every(set => set.completed);
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

  return (
    <div className="app-shell pb-28">
      <header className="app-header px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToDashboard}
              className="btn-ghost flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Volver</span>
            </button>

            <div className="flex items-center gap-3">
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

          <div className="mt-4">
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
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-4">
          {routine.exercises.map((exercise, index) => {
            const log = getLogForExerciseCustom(exercise.id, user.id) || {
              exerciseId: exercise.id,
              userId: user.id,
              date: getCurrentDateString(),
              sets: []
            };
            const isCompleted = log.sets.length > 0 && log.sets.every(set => set.completed);

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
          <div className="mt-8 text-center">
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
