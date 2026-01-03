import React, { useState, useEffect } from 'react';
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
  onBackToDashboard: () => void;
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
    if (exerciseLogs.length > 0) {
      saveProgressToStorage(session.id, exerciseLogs);
    }
  }, [exerciseLogs, session.id]);

  const lastWeights = getLastWeightsForRoutine(routine.id);

  const getLogForExerciseCustom = (exerciseId: string, userId: string): ExerciseLog | undefined => {
    const localLog = exerciseLogs.find(l => l.exerciseId === exerciseId);
    if (localLog) return localLog;
    return getLogForExercise(exerciseId, userId);
  };

  useEffect(() => {
    if (!workoutStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - workoutStartTime) / 1000);
      setWorkoutTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [workoutStartTime]);

  const handleUpdateLog = (log: ExerciseLog) => {
    updateExerciseLog(log);
    const updatedLogs = exerciseLogs.map(l => l.exerciseId === log.exerciseId ? log : l);
    if (!updatedLogs.find(l => l.exerciseId === log.exerciseId)) {
      updatedLogs.push(log);
    }
    setExerciseLogs(updatedLogs);
  };

  const handleStartRestTimer = (seconds: number) => {
    if (seconds > 0) {
      setTimerSeconds(seconds);
      setShowTimer(true);
    }
  };

  const handleBackToDashboard = () => {
    onBackToDashboard();
  };

  const handleCompleteWorkout = () => {
    const exerciseLogs = routine.exercises.map(exercise => {
      const log = getLogForExerciseCustom(exercise.id, user.id) || {
        exerciseId: exercise.id,
        userId: user.id,
        date: getCurrentDateString(),
        sets: []
      };
      return log;
    });

    onCompleteWorkout(exerciseLogs);
    localStorage.removeItem(`${PROGRESS_KEY}_${session.id}`);
    localStorage.removeItem(`workoutStartTime_${session.id}`);
  };

  const completedExercises = routine.exercises.filter(exercise => {
    const log = getLogForExerciseCustom(exercise.id, user.id);
    return log && log.sets.length > 0 && log.sets.every(set => set.completed);
  }).length;

  const totalExercises = routine.exercises.length;
  const workoutProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Volver</span>
            </button>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-blue-400">
                <Clock size={16} />
                <span className="font-mono text-sm">{formatTime(workoutTime)}</span>
              </div>

              <div className="flex items-center space-x-2 text-green-400">
                <Target size={16} />
                <span className="text-sm">{completedExercises}/{totalExercises}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Dumbbell size={24} className="text-blue-400" />
              <span>{routine.name}</span>
            </h1>

            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Progreso del entrenamiento</span>
                <span className="text-sm font-medium text-blue-400">{Math.round(workoutProgress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${workoutProgress}%` }}
                />
              </div>

              {Object.keys(lastWeights).length > 0 && (
                <div className="mt-2 text-xs text-blue-400 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Se han cargado los pesos de tu última sesión</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
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
                    <CheckCircle size={20} className="text-green-400" />
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

        {workoutProgress === 100 && (
          <div className="mt-8 text-center">
            <button
              onClick={handleCompleteWorkout}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2 mx-auto"
            >
              <CheckCircle size={20} />
              <span>Completar Entrenamiento</span>
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
