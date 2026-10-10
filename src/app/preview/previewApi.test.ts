import { describe, expect, it, vi } from 'vitest';
import { decodeDashboardData } from '../../features/dashboard/api/dashboardRemote';
import { decodeWorkoutSession } from '../../features/workouts/api/workoutSessionsRemote';
import { decodeSportSession, decodeArcheryRound, decodeArcheryEnd } from '../../features/sports/api/sportsRemote';
import { decodeBodyMeasurements } from '../../features/profile/api/profileRemote';
import { createPreviewApi } from './previewApi';
import { PREVIEW_USER } from './previewFixtures';

const post = (payload: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(payload) });

describe('local preview API', () => {
  it('provides fixtures accepted by the real dashboard decoder', async () => {
    const request = createPreviewApi();
    const data = decodeDashboardData(await request('/v1/data/dashboard'), PREVIEW_USER.id, PREVIEW_USER.name);
    expect(data.dashboardRoutines).toHaveLength(3);
    expect(data.recentSessions).toHaveLength(8);
    expect(data.exerciseProgress.length).toBeGreaterThan(0);
    expect(data.calendar[0].workouts[0].activityKind).toBe('workout');
  });

  it('provides a genuinely empty scenario', async () => {
    const request = createPreviewApi(true);
    const data = decodeDashboardData(await request('/v1/data/dashboard'), PREVIEW_USER.id, PREVIEW_USER.name);
    expect(data.summary.totalWorkouts).toBe(0);
    expect(data.dashboardRoutines).toEqual([]);
    expect(data.exerciseProgress).toEqual([]);
  });

  it('creates, edits, hides and deletes routines without contacting a server', async () => {
    const request = createPreviewApi(true);
    const { routine } = await request<{ routine: { id: string } }>('/v1/data/routines', post({
      name: 'Mi rutina', exercises: [], isPublic: false
    }));
    await request('/v1/data/routines/update', post({ id: routine.id, updates: { name: 'Nueva rutina' } }));
    await request('/v1/data/routines/visibility', post({ routineId: routine.id, visible: false }));
    expect((await request<{ dashboardRoutines: unknown[] }>('/v1/data/dashboard')).dashboardRoutines).toEqual([]);
    await request('/v1/data/routines/visibility', post({ routineId: routine.id, visible: true }));
    const dashboard = decodeDashboardData(await request('/v1/data/dashboard'), PREVIEW_USER.id, PREVIEW_USER.name);
    expect(dashboard.dashboardRoutines[0].name).toBe('Nueva rutina');
    await request('/v1/data/routines/delete', post({ id: routine.id }));
    expect(await request('/v1/data/routines')).toEqual({ routines: [] });
  });

  it('records a workout and handles repeated completion idempotently', async () => {
    const request = createPreviewApi();
    const startedAt = Date.now() - 120000;
    const { session: raw } = await request<{ session: unknown }>('/v1/data/sessions/start', post({
      id: 'new-session', routineId: 'preview-push', routineName: 'Pecho y tríceps', startedAt
    }));
    const session = decodeWorkoutSession(raw, 'session');
    expect(session.userId).toBe(PREVIEW_USER.id);
    const exercises = [{ exerciseId: 'press-banca', userId: PREVIEW_USER.id, date: '2026-10-10',
      sets: [{ setNumber: 1, weight: 55, completed: true }] }];
    expect(await request('/v1/data/sessions/progress', post({ sessionId: session.id, exercises })))
      .toEqual({ ok: true, result: 'applied' });
    const payload = { sessionId: session.id, exercises, completedAt: Date.now(), totalDuration: 2 };
    expect(await request('/v1/data/sessions/complete', post(payload))).toEqual({ ok: true, result: 'completed' });
    expect(await request('/v1/data/sessions/complete', post(payload))).toEqual({ ok: true, result: 'already_completed' });
    const dashboard = decodeDashboardData(await request('/v1/data/dashboard'), PREVIEW_USER.id, PREVIEW_USER.name);
    expect(dashboard.summary.totalWorkouts).toBe(9);
    expect(dashboard.lastWeightsByRoutine['preview-push']['press-banca']).toEqual([55]);
  });

  it('abandons a workout without adding it to completed history', async () => {
    const request = createPreviewApi(true);
    await request('/v1/data/sessions/start', post({ id: 'abandon-me', routineName: 'Prueba' }));
    await request('/v1/data/sessions/abandon-me/abandon', post({}));
    expect(await request('/v1/data/sessions')).toEqual({ sessions: [] });
  });

  it('supports measurement creation, update and deletion', async () => {
    const request = createPreviewApi(true);
    await request('/v1/data/profile/measurements', post({ id: 'measure', measuredAt: Date.now(), weightKg: 75 }));
    await request('/v1/data/profile/measurements', post({ id: 'measure', measuredAt: Date.now(), weightKg: 74 }));
    const { measurements } = await request<{ measurements: unknown }>('/v1/data/profile/measurements?limit=50');
    expect(decodeBodyMeasurements(measurements)[0].weightKg).toBe(74);
    await request('/v1/data/profile/measurements/measure', { method: 'DELETE' });
    expect(await request('/v1/data/profile/measurements')).toEqual({ measurements: [] });
  });

  it('supports archery rounds, arrows and completion through real response contracts', async () => {
    const request = createPreviewApi(true);
    const { session } = await request<{ session: unknown }>('/v1/data/sports/sessions/start', post({
      id: 'archery', sportType: 'archery', archeryConfig: { bowType: 'recurve', arrowsUsed: 12 }
    }));
    expect(decodeSportSession(session, 'session').archeryData?.bowType).toBe('recurve');
    const { round } = await request<{ round: unknown }>('/v1/data/sports/sessions/archery/archery/rounds', post({
      id: 'round', distance: 18, targetSize: 40, arrowsPerEnd: 3
    }));
    expect(decodeArcheryRound(round, 'round').distance).toBe(18);
    const payload = { id: 'end', arrows: [{ score: 10, isGold: true }, { score: 9, isGold: false }] };
    const { end } = await request<{ end: unknown }>('/v1/data/sports/sessions/archery/archery/rounds/round/ends', post(payload));
    expect(decodeArcheryEnd(end, 'end').subtotal).toBe(19);
    await request('/v1/data/sports/sessions/archery/archery/rounds/round/ends', post(payload));
    const completed = await request<{ session: unknown }>('/v1/data/sports/sessions/archery/complete', post({ completedAt: Date.now() }));
    const decoded = decodeSportSession(completed.session, 'session');
    expect(decoded.status).toBe('completed');
    expect(decoded.archeryData?.totalScore).toBe(19);
    expect(decoded.archeryData?.rounds[0].ends).toHaveLength(1);
  });

  it('supports HIIT configuration and completion', async () => {
    const request = createPreviewApi(true);
    const { session } = await request<{ session: unknown }>('/v1/data/sports/sessions/start', post({
      id: 'hiit', sportType: 'hiit', hiitConfig: { intervals: 4, workDuration: 30, restEnabled: true, restDuration: 15 }
    }));
    expect(decodeSportSession(session, 'session').hiitData?.totalWorkTime).toBe(120);
    await request('/v1/data/sports/sessions/hiit/complete', post({ completedAt: Date.now() }));
    expect(await request('/v1/data/sports/stats')).toMatchObject({ stats: { totalSessions: 1 } });
  });

  it('rejects unsupported routes rather than falling through to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(createPreviewApi()('/v1/not-implemented')).rejects.toMatchObject({ status: 501 });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('honors aborted requests before mutating state', async () => {
    const request = createPreviewApi(true);
    const controller = new AbortController();
    controller.abort();
    await expect(request('/v1/data/routines', { ...post({ name: 'No guardar', exercises: [] }), signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(await request('/v1/data/routines')).toEqual({ routines: [] });
  });
});
