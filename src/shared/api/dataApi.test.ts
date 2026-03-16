import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  syncUserProfile,
  fetchExercises,
  createExerciseTemplate,
  updateExerciseTemplate,
  incrementExerciseUsage,
  fetchRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  incrementRoutineUsage,
  fetchHiddenPublicRoutineIds,
  updateRoutineVisibility,
  fetchSessions,
  fetchAdminOverview,
  fetchDashboardData,
  fetchCompetitiveLeaderboard,
  startSession,
  updateSessionProgress,
  completeSession,
  upsertExerciseLog,
  fetchExerciseLogsForDate,
  fetchWorkouts,
  upsertWorkout
} from './dataApi';
import * as apiClient from './apiClient';
import type { Workout } from '../types';

vi.mock('./apiClient', () => ({
  getIdToken: vi.fn(),
  fetchJson: vi.fn()
}));

vi.mock('../../features/workouts/api/pushApi', () => ({
  getPushApiOrigin: () => 'https://api.test.com'
}));

describe('dataApi', () => {
  const mockFetchJson = vi.mocked(apiClient.fetchJson);
  const mockGetIdToken = vi.mocked(apiClient.getIdToken);

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetIdToken.mockResolvedValue('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('syncUserProfile', () => {
    it('calls API with profile payload', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await syncUserProfile({ displayName: 'Test User', email: 'test@example.com' });

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/profile',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'content-type': 'application/json',
            authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('fetchExercises', () => {
    it('returns exercises array', async () => {
      const exercises = [{ id: 'ex1', name: 'Bench Press', createdAt: Date.now() }];
      mockFetchJson.mockResolvedValueOnce({ exercises });

      const result = await fetchExercises();

      expect(result).toEqual(exercises);
      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/exercises',
        expect.objectContaining({ headers: { authorization: 'Bearer test-token' } })
      );
    });

    it('returns empty array when exercises is undefined', async () => {
      mockFetchJson.mockResolvedValueOnce({});

      const result = await fetchExercises();

      expect(result).toEqual([]);
    });
  });

  describe('createExerciseTemplate', () => {
    it('creates exercise template and returns it', async () => {
      const payload = { name: 'Squat', category: 'legs', sets: 3, reps: 10, restTime: 90 };
      const exercise = { id: 'ex1', ...payload, createdAt: Date.now() };
      mockFetchJson.mockResolvedValueOnce({ exercise });

      const result = await createExerciseTemplate(payload);

      expect(result).toEqual(exercise);
    });
  });

  describe('updateExerciseTemplate', () => {
    it('calls update endpoint', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await updateExerciseTemplate('ex1', { name: 'Updated' });

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/exercises/update',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('incrementExerciseUsage', () => {
    it('increments usage count', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await incrementExerciseUsage('ex1');

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/exercises/use',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ id: 'ex1' }) })
      );
    });
  });

  describe('fetchRoutines', () => {
    it('returns routines array', async () => {
      const routines = [{ id: 'r1', name: 'Pecho', createdAt: Date.now(), updatedAt: Date.now() }];
      mockFetchJson.mockResolvedValueOnce({ routines });

      const result = await fetchRoutines();

      expect(result).toEqual(routines);
    });

    it('includes query params for options', async () => {
      mockFetchJson.mockResolvedValueOnce({ routines: [] });

      await fetchRoutines({ includeVideos: true, limit: 10 });

      expect(mockFetchJson).toHaveBeenCalledWith(
        expect.stringContaining('includeVideos=1'),
        expect.any(Object)
      );
      expect(mockFetchJson).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });
  });

  describe('createRoutine', () => {
    it('creates routine and returns it', async () => {
      const payload = { name: 'Pecho', exercises: [] };
      const routine = { id: 'r1', ...payload, createdAt: Date.now(), updatedAt: Date.now() };
      mockFetchJson.mockResolvedValueOnce({ routine });

      const result = await createRoutine(payload);

      expect(result).toEqual(routine);
    });
  });

  describe('updateRoutine', () => {
    it('calls update endpoint', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await updateRoutine('r1', { name: 'Updated' });

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/routines/update',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('deleteRoutine', () => {
    it('calls delete endpoint', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await deleteRoutine('r1');

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/routines/delete',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('incrementRoutineUsage', () => {
    it('increments usage count', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await incrementRoutineUsage('r1');

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/routines/use',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('fetchHiddenPublicRoutineIds', () => {
    it('returns hidden routine ids', async () => {
      mockFetchJson.mockResolvedValueOnce({ hiddenRoutineIds: ['r1', 'r2'] });

      const result = await fetchHiddenPublicRoutineIds();

      expect(result).toEqual(['r1', 'r2']);
    });

    it('filters non-string values', async () => {
      mockFetchJson.mockResolvedValueOnce({ hiddenRoutineIds: ['r1', 123, null, 'r2'] });

      const result = await fetchHiddenPublicRoutineIds();

      expect(result).toEqual(['r1', 'r2']);
    });

    it('returns empty array for invalid data', async () => {
      mockFetchJson.mockResolvedValueOnce({ hiddenRoutineIds: null });

      const result = await fetchHiddenPublicRoutineIds();

      expect(result).toEqual([]);
    });
  });

  describe('updateRoutineVisibility', () => {
    it('calls visibility endpoint', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await updateRoutineVisibility('r1', false);

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/routines/visibility',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ routineId: 'r1', visible: false })
        })
      );
    });
  });

  describe('fetchSessions', () => {
    it('returns sessions array', async () => {
      const sessions = [{ id: 's1', startedAt: Date.now() }];
      mockFetchJson.mockResolvedValueOnce({ sessions });

      const result = await fetchSessions();

      expect(result).toEqual(sessions);
    });

    it('includes query params for options', async () => {
      mockFetchJson.mockResolvedValueOnce({ sessions: [] });

      await fetchSessions({ limit: 5, includeExercises: true, completedOnly: true });

      expect(mockFetchJson).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      );
    });
  });

  describe('fetchAdminOverview', () => {
    it('returns admin overview', async () => {
      const overview = { totalUsers: 10, totalSessions: 50 };
      mockFetchJson.mockResolvedValueOnce(overview);

      const result = await fetchAdminOverview();

      expect(result).toEqual(overview);
    });
  });

  describe('fetchDashboardData', () => {
    it('returns dashboard data', async () => {
      const data = { summary: { totalWorkouts: 5 } };
      mockFetchJson.mockResolvedValueOnce(data);

      const result = await fetchDashboardData();

      expect(result).toEqual(data);
    });
  });

  describe('fetchCompetitiveLeaderboard', () => {
    it('returns leaderboard data', async () => {
      const leaderboard = { week: { top: [] }, month: { top: [] } };
      mockFetchJson.mockResolvedValueOnce(leaderboard);

      const result = await fetchCompetitiveLeaderboard();

      expect(result).toEqual(leaderboard);
    });

    it('clamps limit between 1 and 50', async () => {
      mockFetchJson.mockResolvedValueOnce({});

      await fetchCompetitiveLeaderboard(100);

      expect(mockFetchJson).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });
  });

  describe('startSession', () => {
    it('starts session and returns it', async () => {
      const payload = { routineId: 'r1', routineName: 'Pecho' };
      const session = { id: 's1', ...payload, startedAt: Date.now() };
      mockFetchJson.mockResolvedValueOnce({ session });

      const result = await startSession(payload);

      expect(result).toEqual(session);
    });
  });

  describe('updateSessionProgress', () => {
    it('updates session progress', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await updateSessionProgress('s1', []);

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/sessions/progress',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('completeSession', () => {
    it('completes session', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await completeSession('s1', [], Date.now(), 3600);

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/sessions/complete',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('upsertExerciseLog', () => {
    it('upserts exercise log', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      await upsertExerciseLog('ex1', '2026-01-15', []);

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/exercise-logs',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('fetchExerciseLogsForDate', () => {
    it('returns exercise logs for date', async () => {
      const logs = [{ exerciseId: 'ex1', userId: 'u1', date: '2026-01-15', sets: [] }];
      mockFetchJson.mockResolvedValueOnce({ logs });

      const result = await fetchExerciseLogsForDate('2026-01-15');

      expect(result).toEqual(logs);
    });

    it('filters invalid logs', async () => {
      const logs = [
        { exerciseId: 'ex1', userId: 'u1', date: '2026-01-15', sets: [] },
        { exerciseId: 123, userId: 'u1' },
        { exerciseId: 'ex2', userId: null }
      ];
      mockFetchJson.mockResolvedValueOnce({ logs });

      const result = await fetchExerciseLogsForDate('2026-01-15');

      expect(result).toHaveLength(1);
    });

    it('returns empty array for invalid data', async () => {
      mockFetchJson.mockResolvedValueOnce({ logs: null });

      const result = await fetchExerciseLogsForDate('2026-01-15');

      expect(result).toEqual([]);
    });
  });

  describe('fetchWorkouts', () => {
    it('returns workouts array', async () => {
      const workouts = [{ id: 'w1', name: 'Morning' }];
      mockFetchJson.mockResolvedValueOnce({ workouts });

      const result = await fetchWorkouts();

      expect(result).toEqual(workouts);
    });

    it('returns empty array when workouts is undefined', async () => {
      mockFetchJson.mockResolvedValueOnce({});

      const result = await fetchWorkouts();

      expect(result).toEqual([]);
    });
  });

  describe('upsertWorkout', () => {
    it('upserts workout', async () => {
      mockFetchJson.mockResolvedValueOnce({ ok: true });

      const workout = { id: 'w1', name: 'Morning' };
      await upsertWorkout(workout as unknown as Workout);

      expect(mockFetchJson).toHaveBeenCalledWith(
        'https://api.test.com/v1/data/workouts',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});