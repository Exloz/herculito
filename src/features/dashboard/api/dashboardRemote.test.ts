import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as transport from '../../../shared/api/transport';
import { decodeDashboardData, fetchDashboard } from './dashboardRemote';

vi.mock('../../../shared/api/transport', () => ({
  fetchApiJson: vi.fn()
}));

const rawDashboard = {
  summary: {
    totalWorkouts: 2,
    thisWeekWorkouts: 2,
    thisMonthWorkouts: 2,
    currentStreak: 1,
    longestStreak: 1,
    averageDurationMin: 38
  },
  recentSessions: [
    {
      id: 'workout-1',
      routineId: 'routine-1',
      routineName: 'Piernas',
      primaryMuscleGroup: 'piernas',
      completedAt: 1_789_467_600_000,
      totalDuration: 50,
      activityKind: 'workout'
    },
    {
      id: 'sport-1',
      routineName: 'Tiro con Arco',
      completedAt: 1_789_381_200_000,
      totalDuration: 25,
      activityKind: 'sport',
      sportType: 'archery'
    }
  ],
  calendar: [{
    date: '2026-09-15',
    workouts: [
      {
        sessionId: 'workout-1',
        routineName: 'Piernas',
        muscleGroup: 'piernas',
        activityKind: 'workout'
      },
      {
        sessionId: 'sport-1',
        routineName: 'Tiro con Arco',
        activityKind: 'sport',
        sportType: 'archery'
      }
    ]
  }],
  dashboardRoutines: [{
    id: 'routine-1',
    name: 'Piernas',
    exercises: [{
      id: 'squat',
      name: 'Sentadilla',
      sets: 3,
      reps: 8,
      repsBySet: [10, 8, 6],
      restTime: 90,
      muscleGroup: 'piernas'
    }],
    createdAt: 1_789_000_000_000,
    updatedAt: 1_789_100_000_000,
    createdBy: 'user-1',
    isPublic: false,
    exerciseCount: 0
  }],
  competition: {
    weekLeader: null,
    monthLeader: null,
    userWeekRank: null,
    userMonthRank: null
  },
  lastWeightsByRoutine: { 'routine-1': { squat: [80, 75, 70] } },
  exerciseProgress: [{
    exerciseId: 'squat',
    exerciseName: 'Sentadilla',
    points: [],
    totalSessions: 1,
    personalRecord: 80,
    lastWeight: 80,
    previousWeight: null,
    trend: 'neutral',
    lastCompletedAt: 1_789_467_600_000,
    weeklyVolumeKg: 800
  }]
};

describe('dashboard remote adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('decodes mixed workout and sport activity into dashboard domain data', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue(rawDashboard);

    const result = await fetchDashboard('user-1', 'Ada');

    expect(result.recentSessions).toEqual([
      expect.objectContaining({
        id: 'workout-1',
        activityKind: 'workout',
        completedAt: new Date(1_789_467_600_000)
      }),
      expect.objectContaining({
        id: 'sport-1',
        activityKind: 'sport',
        sportType: 'archery',
        completedAt: new Date(1_789_381_200_000)
      })
    ]);
    expect(result.calendar[0]?.workouts[1]).toEqual(expect.objectContaining({
      activityKind: 'sport',
      sportType: 'archery',
      muscleGroup: undefined
    }));
    expect(result.dashboardRoutines[0]?.createdAt).toEqual(new Date(1_789_000_000_000));
    expect(result.dashboardRoutines[0]?.exercises[0]).toEqual(expect.objectContaining({
      id: 'squat',
      repsBySet: [10, 8, 6],
      muscleGroup: 'piernas'
    }));
    expect(result.lastWeightsByRoutine).toEqual({ 'routine-1': { squat: [80, 75, 70] } });
    expect(result.exerciseProgress[0]?.lastCompletedAt).toEqual(new Date(1_789_467_600_000));
  });

  it('rejects malformed nested routine exercises and last weights', () => {
    expect(() => decodeDashboardData({
      ...rawDashboard,
      dashboardRoutines: [{ ...rawDashboard.dashboardRoutines[0], exercises: [{ id: 'broken' }] }]
    }, 'user-1', 'Ada')).toThrow('dashboard.dashboardRoutines[0].exercises[0].name');

    expect(() => decodeDashboardData({
      ...rawDashboard,
      lastWeightsByRoutine: { 'routine-1': { squat: [80, 'heavy'] } }
    }, 'user-1', 'Ada')).toThrow('dashboard.lastWeightsByRoutine.routine-1.squat[1]');
  });

  it('rejects malformed activity timestamps at the wire seam', () => {
    expect(() => decodeDashboardData({
      ...rawDashboard,
      recentSessions: [{ ...rawDashboard.recentSessions[0], completedAt: 'not-a-date' }]
    }, 'user-1', 'Ada')).toThrow('dashboard.recentSessions[0].completedAt');
  });
});
