import { describe, expect, it, vi, afterEach } from 'vitest';
import { detectMuscleGroup, getRecommendedMuscleGroup } from './muscleGroups';
import type { WorkoutSession } from '../types';

const makeSession = (id: string, completedAt: Date, primaryMuscleGroup: WorkoutSession['primaryMuscleGroup']): WorkoutSession => {
  return {
    id,
    routineId: 'routine-1',
    routineName: 'Test Routine',
    userId: 'user-1',
    startedAt: new Date(completedAt.getTime() - 45 * 60 * 1000),
    completedAt,
    exercises: [],
    primaryMuscleGroup
  };
};

describe('muscleGroups utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects known muscle groups by exercise name', () => {
    expect(detectMuscleGroup('Press de banca inclinado')).toBe('pecho');
    expect(detectMuscleGroup('Peso muerto rumano')).toBe('espalda');
    expect(detectMuscleGroup('Algo desconocido')).toBe('fullbody');
  });

  it('returns deterministic recommendation for same input/day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));

    const sessions: WorkoutSession[] = [
      makeSession('s1', new Date('2026-02-25T15:00:00.000Z'), 'pecho'),
      makeSession('s2', new Date('2026-02-24T15:00:00.000Z'), 'espalda')
    ];

    const recommendationA = getRecommendedMuscleGroup(sessions);
    const recommendationB = getRecommendedMuscleGroup(sessions);

    expect(recommendationA).toBe(recommendationB);
    expect(recommendationA).toBeTruthy();
    expect(['piernas', 'hombros', 'brazos']).toContain(recommendationA);
  });
});
