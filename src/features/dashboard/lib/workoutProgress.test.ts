import { describe, expect, it } from 'vitest';
import { buildExerciseProgress } from './workoutProgress';
import type { Routine, WorkoutSession, ExerciseLog } from '../../../shared/types';

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
        completedAt: new Date('6/3/2026, 11:00:00 AM'),
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

  it('calculates flat trend when weight stays same', () => {
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
          sets: [{ setNumber: 1, weight: 50, completed: true }]
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
          sets: [{ setNumber: 1, weight: 50, completed: true }]
        }]
      }
    ];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result[0].trend).toBe('flat');
  });

  it('calculates down trend when weight decreases', () => {
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
          sets: [{ setNumber: 1, weight: 55, completed: true }]
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
          sets: [{ setNumber: 1, weight: 50, completed: true }]
        }]
      }
    ];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result[0].trend).toBe('down');
  });

  it('calculates neutral trend for single session', () => {
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
        sets: [{ setNumber: 1, weight: 50, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result[0].trend).toBe('neutral');
    expect(result[0].previousWeight).toBeNull();
  });

  it('ignores incomplete sets', () => {
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
        sets: [
          { setNumber: 1, weight: 50, completed: false },
          { setNumber: 2, weight: 45, completed: true }
        ]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result[0].points[0].completedSets).toBe(1);
    expect(result[0].points[0].bestWeight).toBe(45);
  });

  it('ignores sessions without completedAt', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-1',
      routineName: 'Pecho',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      exercises: [{
        exerciseId: 'bench-press',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 50, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result).toHaveLength(0);
  });

  it('ignores sessions with invalid timestamps', () => {
    const invalidDate = new Date('invalid');
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-1',
      routineName: 'Pecho',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: invalidDate,
      exercises: [{
        exerciseId: 'bench-press',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 50, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result).toHaveLength(0);
  });

  it('sorts results by lastCompletedAt descending', () => {
    const sessions: WorkoutSession[] = [
      {
        id: 's1',
        routineId: 'routine-1',
        routineName: 'Pecho',
        userId: 'u1',
        startedAt: new Date('2026-01-01T10:00:00.000Z'),
        completedAt: new Date('2026-01-01T11:00:00.000Z'),
        exercises: [
          { exerciseId: 'ex1', userId: 'u1', date: '2026-01-01', sets: [{ setNumber: 1, weight: 50, completed: true }] }
        ]
      },
      {
        id: 's2',
        routineId: 'routine-1',
        routineName: 'Pecho',
        userId: 'u1',
        startedAt: new Date('2026-01-03T10:00:00.000Z'),
        completedAt: new Date('2026-01-03T11:00:00.000Z'),
        exercises: [
          { exerciseId: 'ex2', userId: 'u1', date: '2026-01-03', sets: [{ setNumber: 1, weight: 40, completed: true }] }
        ]
      }
    ];

    const result = buildExerciseProgress(sessions, []);
    expect(result[0].exerciseId).toBe('ex2');
    expect(result[1].exerciseId).toBe('ex1');
  });

  it('uses Map for exercise name overrides', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-1',
      routineName: 'Pecho',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
      exercises: [{
        exerciseId: 'custom-exercise',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 30, completed: true }]
      }]
    }];

    const overrides = new Map<string, string>();
    overrides.set('custom-exercise', 'Custom Exercise Name');

    const result = buildExerciseProgress(sessions, [], overrides);
    expect(result[0].exerciseName).toBe('Custom Exercise Name');
  });

  it('calculates weekly volume correctly', () => {
    const now = Date.now();
    const sessions: WorkoutSession[] = [
      {
        id: 's1',
        routineId: 'routine-1',
        routineName: 'Pecho',
        userId: 'u1',
        startedAt: new Date(now - 86400000),
        completedAt: new Date(now - 86400000),
        exercises: [{
          exerciseId: 'bench-press',
          userId: 'u1',
          date: '2026-01-01',
          sets: [
            { setNumber: 1, weight: 50, completed: true },
            { setNumber: 2, weight: 50, completed: true }
          ]
        }]
      },
      {
        id: 's2',
        routineId: 'routine-1',
        routineName: 'Pecho',
        userId: 'u1',
        startedAt: new Date(now - 172800000),
        completedAt: new Date(now - 172800000),
        exercises: [{
          exerciseId: 'bench-press',
          userId: 'u1',
          date: '2026-01-03',
          sets: [{ setNumber: 1, weight: 45, completed: true }]
        }]
      }
    ];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result[0].weeklyVolumeKg).toBe(145);
  });

  it('ignores sets without weight or with non-finite weight', () => {
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
        sets: [
          { setNumber: 1, weight: 50, completed: true },
          { setNumber: 2, weight: Infinity, completed: true },
          { setNumber: 3, weight: NaN, completed: true },
          { setNumber: 4, weight: 0, completed: true },
          { setNumber: 5, weight: 30, completed: true }
        ]
      }]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result[0].personalRecord).toBe(50);
    expect(result[0].points[0].completedSets).toBe(2);
    expect(result[0].points[0].totalWeight).toBe(80);
  });

  it('generates fallback name for custom exercise with readable id', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-1',
      routineName: 'Pecho',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
      exercises: [{
        exerciseId: 'custom:mi-ejercicio',
        userId: 'u1',
        date: '2026-01-01',
        sets: [{ setNumber: 1, weight: 30, completed: true }]
      }]
    }];

    const result = buildExerciseProgress(sessions, []);
    expect(result[0].exerciseName).toBe('Mi ejercicio');
  });

  it('handles exercises array missing or undefined', () => {
    const sessions: WorkoutSession[] = [{
      id: 's1',
      routineId: 'routine-1',
      routineName: 'Pecho',
      userId: 'u1',
      startedAt: new Date('2026-01-01T10:00:00.000Z'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
      exercises: undefined as unknown as ExerciseLog[]
    }];

    const result = buildExerciseProgress(sessions, [makeRoutine()]);
    expect(result).toHaveLength(0);
  });
});
