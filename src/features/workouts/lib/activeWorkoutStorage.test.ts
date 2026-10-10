import { describe, expect, it } from 'vitest';
import type { Exercise, ExerciseLog } from '../../../shared/types';
import { buildWorkoutCompletionLogs, getWorkoutSetProgress } from './activeWorkoutStorage';

describe('getWorkoutSetProgress', () => {
  it('counts partial exercises immediately without counting duplicate or invalid sets', () => {
    const logs: ExerciseLog[] = [{
      exerciseId: 'bench', userId: 'user-1', date: '2026-10-10',
      sets: [
        { setNumber: 1, weight: 40, completed: true },
        { setNumber: 1, weight: 45, completed: true },
        { setNumber: 2, weight: 45, completed: false },
        { setNumber: 5, weight: 45, completed: true }
      ]
    }];
    expect(getWorkoutSetProgress([{ id: 'bench', sets: 2 }, { id: 'squat', sets: 2 }], logs))
      .toEqual({ completedSets: 1, totalSets: 4, percentage: 25 });
  });

  it('handles empty workouts and ignores unrelated logs', () => {
    expect(getWorkoutSetProgress([], [])).toEqual({ completedSets: 0, totalSets: 0, percentage: 0 });
    expect(getWorkoutSetProgress([{ id: 'bench', sets: 3 }], []))
      .toEqual({ completedSets: 0, totalSets: 3, percentage: 0 });
  });
});

describe('buildWorkoutCompletionLogs', () => {
  it('preserves the latest edited weight and reps for completion payloads', () => {
    const exercises: Exercise[] = [
      {
        id: 'bench',
        name: 'Press banca',
        sets: 2,
        reps: 10,
        repsBySet: [10, 8]
      }
    ];
    const logs: ExerciseLog[] = [
      {
        exerciseId: 'bench',
        userId: 'user-1',
        date: '2026-06-17',
        sets: [
          { setNumber: 1, weight: 50, reps: 10, completed: true, completedAt: new Date('2026-06-17T10:00:00.000Z') },
          { setNumber: 2, weight: 55, reps: 7, completed: true, completedAt: new Date('2026-06-17T10:02:00.000Z') }
        ]
      }
    ];

    expect(buildWorkoutCompletionLogs(exercises, logs, 'user-1', '2026-06-17')).toEqual([
      {
        exerciseId: 'bench',
        userId: 'user-1',
        date: '2026-06-17',
        sets: [
          { setNumber: 1, weight: 50, reps: 10, completed: true, completedAt: new Date('2026-06-17T10:00:00.000Z') },
          { setNumber: 2, weight: 55, reps: 7, completed: true, completedAt: new Date('2026-06-17T10:02:00.000Z') }
        ]
      }
    ]);
  });

  it('materializes missing sets and reps from the routine defaults', () => {
    const exercises: Exercise[] = [
      {
        id: 'row',
        name: 'Remo',
        sets: 3,
        reps: 12,
        repsBySet: [12, 10, 8]
      }
    ];
    const logs: ExerciseLog[] = [
      {
        exerciseId: 'row',
        userId: 'user-1',
        date: '2026-06-17',
        sets: [
          { setNumber: 1, weight: 40, completed: true },
          { setNumber: 3, weight: 45, reps: 6, completed: true }
        ]
      }
    ];

    expect(buildWorkoutCompletionLogs(exercises, logs, 'user-1', '2026-06-17')[0].sets).toEqual([
      { setNumber: 1, weight: 40, completed: true, reps: 12 },
      { setNumber: 2, weight: 0, completed: false, reps: 10 },
      { setNumber: 3, weight: 45, reps: 6, completed: true }
    ]);
  });
});
