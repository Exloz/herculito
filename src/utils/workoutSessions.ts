import type { ExerciseLog, WorkoutSession } from '../types';

export const getLastWeightsForRoutineFromSessions = (
  sessions: WorkoutSession[],
  routineId: string
): Record<string, number[]> => {
  const lastCompletedSession = sessions
    .filter((s) => s.routineId === routineId && s.completedAt && s.exercises && s.exercises.length > 0)
    .sort((a, b) => (b.completedAt ? b.completedAt.getTime() : 0) - (a.completedAt ? a.completedAt.getTime() : 0))[0];

  if (!lastCompletedSession?.exercises) {
    return {};
  }

  const lastWeights: Record<string, number[]> = {};
  (lastCompletedSession.exercises as ExerciseLog[]).forEach((exerciseLog) => {
    if (exerciseLog.sets && exerciseLog.sets.length > 0) {
      const weights = exerciseLog.sets
        .filter((set) => set.completed && set.weight > 0)
        .map((set) => set.weight);

      if (weights.length > 0) {
        lastWeights[exerciseLog.exerciseId] = weights;
      }
    }
  });

  return lastWeights;
};
