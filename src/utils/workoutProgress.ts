import { Routine, WorkoutSession } from '../types';

export interface ExerciseProgressPoint {
  timestamp: number;
  bestWeight: number;
  completedSets: number;
  totalWeight: number;
}

export interface ExerciseProgressSummary {
  exerciseId: string;
  exerciseName: string;
  points: ExerciseProgressPoint[];
  totalSessions: number;
  personalRecord: number;
  lastWeight: number;
  previousWeight: number | null;
  trend: 'up' | 'down' | 'flat' | 'neutral';
  lastCompletedAt: Date;
  weeklyVolumeKg: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const roundWeight = (value: number): number => {
  return Math.round(value * 10) / 10;
};

const fallbackExerciseName = (exerciseId: string): string => {
  const normalized = exerciseId.replace(/^custom:/, '').replace(/[_-]+/g, ' ').trim();
  if (normalized.length === 0) return 'Ejercicio';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const buildExerciseProgress = (
  sessions: WorkoutSession[],
  routines: Routine[]
): ExerciseProgressSummary[] => {
  const exerciseNames = new Map<string, string>();
  routines.forEach((routine) => {
    routine.exercises.forEach((exercise) => {
      if (exercise.id && exercise.name) {
        exerciseNames.set(exercise.id, exercise.name);
      }
    });
  });

  const pointsByExerciseId = new Map<string, ExerciseProgressPoint[]>();

  sessions.forEach((session) => {
    if (!session.completedAt) return;
    const timestamp = session.completedAt.getTime();
    if (!Number.isFinite(timestamp)) return;

    (session.exercises ?? []).forEach((log) => {
      const completedSets = (log.sets ?? []).filter((set) => {
        return set.completed === true && Number.isFinite(set.weight) && set.weight > 0;
      });

      if (completedSets.length === 0) {
        return;
      }

      const bestWeight = roundWeight(
        completedSets.reduce((maxWeight, set) => Math.max(maxWeight, set.weight), 0)
      );
      const totalWeight = roundWeight(
        completedSets.reduce((sumWeight, set) => sumWeight + set.weight, 0)
      );

      const points = pointsByExerciseId.get(log.exerciseId) ?? [];
      points.push({
        timestamp,
        bestWeight,
        completedSets: completedSets.length,
        totalWeight
      });
      pointsByExerciseId.set(log.exerciseId, points);
    });
  });

  const summaries: ExerciseProgressSummary[] = [];
  pointsByExerciseId.forEach((rawPoints, exerciseId) => {
    const points = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);
    if (points.length === 0) return;

    const lastPoint = points[points.length - 1];
    const previousPoint = points.length > 1 ? points[points.length - 2] : null;
    const weekStartMs = Date.now() - (7 * ONE_DAY_MS);
    const personalRecord = roundWeight(
      points.reduce((maxWeight, point) => Math.max(maxWeight, point.bestWeight), 0)
    );
    const weeklyVolumeKg = roundWeight(
      points
        .filter((point) => point.timestamp >= weekStartMs)
        .reduce((sumWeight, point) => sumWeight + point.totalWeight, 0)
    );
    const previousWeight = previousPoint ? previousPoint.bestWeight : null;

    let trend: ExerciseProgressSummary['trend'] = 'neutral';
    if (previousWeight !== null) {
      if (lastPoint.bestWeight > previousWeight) {
        trend = 'up';
      } else if (lastPoint.bestWeight < previousWeight) {
        trend = 'down';
      } else {
        trend = 'flat';
      }
    }

    summaries.push({
      exerciseId,
      exerciseName: exerciseNames.get(exerciseId) ?? fallbackExerciseName(exerciseId),
      points,
      totalSessions: points.length,
      personalRecord,
      lastWeight: lastPoint.bestWeight,
      previousWeight,
      trend,
      lastCompletedAt: new Date(lastPoint.timestamp),
      weeklyVolumeKg
    });
  });

  return summaries.sort((a, b) => {
    const timeDiff = b.lastCompletedAt.getTime() - a.lastCompletedAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.totalSessions - a.totalSessions;
  });
};
