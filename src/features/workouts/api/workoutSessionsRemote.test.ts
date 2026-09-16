import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as transport from '../../../shared/api/transport';
import {
  abandonWorkoutSession,
  completeWorkoutSession,
  decodeWorkoutSession,
  fetchWorkoutSessions,
  startWorkoutSession,
  updateWorkoutSessionProgress
} from './workoutSessionsRemote';

vi.mock('../../../shared/api/transport', () => ({
  fetchApiJson: vi.fn()
}));

const rawSession = {
  id: 'session-1',
  routineId: 'routine-1',
  routineName: 'Fuerza',
  userId: 'user-1',
  startedAt: 1_789_467_600_000,
  completedAt: 1_789_471_200_000,
  exercises: [{
    exerciseId: 'squat',
    userId: 'user-1',
    date: '2026-09-15',
    sets: [{
      setNumber: 1,
      weight: 80,
      reps: 8,
      completed: true,
      completedAt: 1_789_470_000_000
    }]
  }],
  totalDuration: 60,
  primaryMuscleGroup: 'fullbody'
};

describe('workout sessions remote adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('decodes raw server sessions before returning them', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({ sessions: [rawSession] });

    const sessions = await fetchWorkoutSessions({ limit: 5, completedOnly: true });

    expect(sessions[0]).toEqual(expect.objectContaining({
      id: 'session-1',
      startedAt: new Date(1_789_467_600_000),
      completedAt: new Date(1_789_471_200_000)
    }));
    expect(sessions[0]?.exercises[0]?.sets[0]?.completedAt).toEqual(new Date(1_789_470_000_000));
    expect(transport.fetchApiJson).toHaveBeenCalledWith(
      '/v1/data/sessions?limit=5&completedOnly=1'
    );
  });

  it('sends a client-generated session id and decodes the stable response id', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({
      session: { ...rawSession, id: 'client-session-1', completedAt: undefined }
    });

    const result = await startWorkoutSession({
      id: 'client-session-1',
      routineId: 'routine-1',
      routineName: 'Fuerza',
      startedAt: 1_789_467_600_000
    });

    expect(result.id).toBe('client-session-1');
    expect(transport.fetchApiJson).toHaveBeenCalledWith(
      '/v1/data/sessions/start',
      expect.objectContaining({ body: JSON.stringify({
        id: 'client-session-1',
        routineId: 'routine-1',
        routineName: 'Fuerza',
        startedAt: 1_789_467_600_000
      }) })
    );
  });

  it('rejects malformed session timestamps', () => {
    expect(() => decodeWorkoutSession({ ...rawSession, startedAt: 'bad' }, 'session')).toThrow('session.startedAt');
  });

  it('rejects malformed nested exercise logs', () => {
    expect(() => decodeWorkoutSession({
      ...rawSession,
      exercises: [{ ...rawSession.exercises[0], sets: [{ setNumber: 'one' }] }]
    }, 'session')).toThrow('session.exercises[0].sets[0].setNumber');
  });

  it('returns explicit transition outcomes and supports abandonment', async () => {
    vi.mocked(transport.fetchApiJson)
      .mockResolvedValueOnce({ ok: true, result: 'already_applied_or_current' })
      .mockResolvedValueOnce({ ok: true, result: 'already_completed' })
      .mockResolvedValueOnce({ ok: true, result: 'already_abandoned' });

    await expect(updateWorkoutSessionProgress('session-1', [])).resolves.toBe('already_applied_or_current');
    await expect(completeWorkoutSession('session-1', [])).resolves.toBe('already_completed');
    await expect(abandonWorkoutSession('session-1')).resolves.toBe('already_abandoned');

    expect(transport.fetchApiJson).toHaveBeenLastCalledWith(
      '/v1/data/sessions/session-1/abandon',
      { method: 'POST' }
    );
  });
});
