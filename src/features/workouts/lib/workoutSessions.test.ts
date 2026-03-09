import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../../../shared/types';
import { getLastWeightsForRoutineFromSessions } from './workoutSessions';

describe('getLastWeightsForRoutineFromSessions', () => {
  it('falls back to the latest non-zero weights per exercise within the same routine', () => {
    const sessions: WorkoutSession[] = [
      {
        id: 'session-newest',
        routineId: 'routine-1',
        routineName: 'Upper',
        userId: 'user-1',
        startedAt: new Date('2026-03-03T18:00:00.000Z'),
        completedAt: new Date('2026-03-03T19:00:00.000Z'),
        exercises: [
          {
            exerciseId: 'bench',
            userId: 'user-1',
            date: '2026-03-03',
            sets: [
              { setNumber: 1, weight: 0, completed: true },
              { setNumber: 2, weight: 0, completed: true }
            ]
          },
          {
            exerciseId: 'row',
            userId: 'user-1',
            date: '2026-03-03',
            sets: [
              { setNumber: 1, weight: 55, completed: true },
              { setNumber: 2, weight: 55, completed: true }
            ]
          }
        ]
      },
      {
        id: 'session-older',
        routineId: 'routine-1',
        routineName: 'Upper',
        userId: 'user-1',
        startedAt: new Date('2026-02-27T18:00:00.000Z'),
        completedAt: new Date('2026-02-27T19:00:00.000Z'),
        exercises: [
          {
            exerciseId: 'bench',
            userId: 'user-1',
            date: '2026-02-27',
            sets: [
              { setNumber: 1, weight: 40, completed: true },
              { setNumber: 2, weight: 42.5, completed: true }
            ]
          },
          {
            exerciseId: 'row',
            userId: 'user-1',
            date: '2026-02-27',
            sets: [
              { setNumber: 1, weight: 50, completed: true },
              { setNumber: 2, weight: 50, completed: true }
            ]
          }
        ]
      },
      {
        id: 'session-other-routine',
        routineId: 'routine-2',
        routineName: 'Legs',
        userId: 'user-1',
        startedAt: new Date('2026-03-01T18:00:00.000Z'),
        completedAt: new Date('2026-03-01T19:00:00.000Z'),
        exercises: [
          {
            exerciseId: 'bench',
            userId: 'user-1',
            date: '2026-03-01',
            sets: [{ setNumber: 1, weight: 99, completed: true }]
          }
        ]
      }
    ];

    expect(getLastWeightsForRoutineFromSessions(sessions, 'routine-1')).toEqual({
      bench: [40, 42.5],
      row: [55, 55]
    });
  });
});
