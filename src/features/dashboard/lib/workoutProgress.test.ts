import { describe, expect, it } from 'vitest';
import { buildExerciseProgress } from './workoutProgress';
import type { Routine, WorkoutSession } from '../../../shared/types';

const makeRoutine = (): Routine => ({
  id: 'routine-1',
  name: 'Pecho',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  createdBy: 'u1',
  isPublic: false,
  exercises: [
    { id: 'bench-press', name: 'Bench Press', sets: 3, reps: 8 }
  ]
});

describe('buildExerciseProgress', () => {
  it('aggregates exercise progress points ordered by date', () => {
    const sessions: WorkoutSession[] = [
      {
        id: 's1',
        routineId: 'routine-1',
        routineName: 'Pecho',
        userId: 'u1',
        startedAt: new Date('2026-01-01T10:00:00.000Z'),
        completedAt: new Date('2026-01-01T11:00:00.000Z'),
        exercises: [{
          exerciseId: 'bench-press',
          userId: 'u1',
          date: '2026-01-01',
          sets: [
            { setNumber: 1, weight: 40, completed: true },
            { setNumber: 2, weight: 45, completed: true }
          ]
        }]
      },
      {
        id: 's2',
        routineId: 'routine-1',
        routineName: 'Pecho',
        userId: 'u1',
        startedAt: new Date('2026-01-03T10:00:00.000Z'),
        completedAt: new Date('2026-01-03T11:00:00.000Z'),
        exercises: [{
          exerciseId: 'bench-press',
          userId: 'u1',
          date: '2026-01-03',
          sets: [
            { setNumber: 1, weight: 47.5, completed: true },
            { setNumber: 2, weight: 45, completed: true }
          ]
        }]
      }
    ];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseName).toBe('Bench Press');
    expect(result[0].personalRecord).toBe(47.5);
    expect(result[0].lastWeight).toBe(47.5);
    expect(result[0].trend).toBe('up');
    expect(result[0].points).toHaveLength(2);
  });

  it('ignores sessions without completed weighted sets', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-1',
      routineName: 'Pecho',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
      exercises: [{
        exerciseId: 'bench-press',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 0, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result).toHaveLength(0);
  });

  it('uses override names for exercises missing in routines', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-2',
      routineName: 'Otro',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
      exercises: [{
        exerciseId: 'custom:123e4567-e89b-12d3-a456-426614174000',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 25, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()], {
      'custom:123e4567-e89b-12d3-a456-426614174000': 'Face Pull'
    });

    expect(result).toHaveLength(1);
    expect(result[0].exerciseName).toBe('Face Pull');
  });

  it('skips opaque identifiers when no name can be resolved', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-2',
      routineName: 'Otro',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
      exercises: [{
        exerciseId: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 20, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result).toHaveLength(0);
  });
});
