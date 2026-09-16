import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as transport from '../../../shared/api/transport';
import {
  abandonSportSession,
  addArcheryEnd,
  addArcheryRound,
  completeSportSession,
  decodeSportCompletionResponse,
  decodeSportSession,
  startSportSession
} from './sportsRemote';

vi.mock('../../../shared/api/transport', () => ({
  fetchApiJson: vi.fn()
}));

const rawSession = {
  id: 'sport-session-1',
  userId: 'user-1',
  sportType: 'archery',
  sportName: 'Tiro con Arco',
  startedAt: 1_789_467_600_000,
  status: 'active',
  archeryData: {
    bowType: 'recurve',
    arrowsUsed: 6,
    totalScore: 18,
    maxPossibleScore: 30,
    averageArrow: 6,
    rounds: [{
      id: 'round-1',
      sessionId: 'sport-session-1',
      distance: 18,
      targetSize: 40,
      arrowsPerEnd: 3,
      order: 1,
      totalScore: 18,
      createdAt: 1_789_467_700_000,
      ends: [{
        id: 'end-1',
        roundId: 'round-1',
        endNumber: 1,
        subtotal: 18,
        goldCount: 1,
        createdAt: 1_789_467_800_000,
        arrows: [{
          id: 'arrow-1',
          score: 10,
          isGold: true,
          timestamp: 1_789_467_800_000
        }]
      }]
    }]
  }
};

describe('sports remote adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('decodes stable round and end response fields with dates', () => {
    const session = decodeSportSession(rawSession, 'sport session');

    expect(session.startedAt).toEqual(new Date(1_789_467_600_000));
    expect(session.archeryData?.rounds[0]).toEqual(expect.objectContaining({
      id: 'round-1',
      sessionId: 'sport-session-1',
      createdAt: new Date(1_789_467_700_000)
    }));
    expect(session.archeryData?.rounds[0]?.ends[0]).toEqual(expect.objectContaining({
      id: 'end-1',
      roundId: 'round-1',
      createdAt: new Date(1_789_467_800_000)
    }));
  });

  it('sends client-generated ids for sessions, rounds, and ends', async () => {
    vi.mocked(transport.fetchApiJson)
      .mockResolvedValueOnce({ session: rawSession })
      .mockResolvedValueOnce({ round: rawSession.archeryData.rounds[0] })
      .mockResolvedValueOnce({ end: rawSession.archeryData.rounds[0].ends[0] });

    await startSportSession({
      id: 'sport-session-1',
      sportType: 'archery',
      startedAt: 1_789_467_600_000,
      archeryConfig: { bowType: 'recurve', arrowsUsed: 6 }
    });
    await addArcheryRound('sport-session-1', {
      id: 'round-1',
      distance: 18,
      targetSize: 40,
      arrowsPerEnd: 3
    });
    await addArcheryEnd(
      'sport-session-1',
      'round-1',
      [{ score: 10, isGold: true }],
      'end-1'
    );

    expect(vi.mocked(transport.fetchApiJson).mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({
        id: 'sport-session-1',
        sportType: 'archery',
        startedAt: 1_789_467_600_000,
        archeryConfig: { bowType: 'recurve', arrowsUsed: 6 }
      })
    }));
    expect(vi.mocked(transport.fetchApiJson).mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      body: expect.stringContaining('"id":"round-1"')
    }));
    expect(vi.mocked(transport.fetchApiJson).mock.calls[2]?.[1]).toEqual(expect.objectContaining({
      body: expect.stringContaining('"id":"end-1"')
    }));
  });

  it('rejects malformed nested timestamps', () => {
    const malformed = structuredClone(rawSession);
    malformed.archeryData.rounds[0].ends[0].arrows[0].timestamp = 'never' as unknown as number;

    expect(() => decodeSportSession(malformed, 'sport session')).toThrow(
      'sport session.archeryData.rounds[0].ends[0].arrows[0].timestamp'
    );
  });

  it('supports idempotent sport abandonment outcomes', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({
      ok: true,
      result: 'already_abandoned',
      session: { ...rawSession, status: 'abandoned' }
    });

    await expect(abandonSportSession('sport-session-1')).resolves.toMatchObject({
      result: 'already_abandoned',
      session: { status: 'abandoned' }
    });
    expect(transport.fetchApiJson).toHaveBeenCalledWith(
      '/v1/data/sports/sessions/sport-session-1/abandon',
      { method: 'POST' }
    );
  });

  it('decodes the raw stable sport completion response', () => {
    expect(decodeSportCompletionResponse({
      ok: true,
      result: 'already_completed',
      session: { ...rawSession, status: 'completed', completedAt: 1_789_471_200_000 }
    })).toMatchObject({
      result: 'already_completed',
      session: { status: 'completed', completedAt: new Date(1_789_471_200_000) }
    });
    expect(() => decodeSportCompletionResponse({
      ok: false,
      result: 'already_completed',
      session: rawSession
    })).toThrow('complete sport session response.ok');
  });

  it('sends completion time and decodes completion and abandonment sessions', async () => {
    const completedSession = {
      ...rawSession,
      status: 'completed',
      completedAt: 1_789_471_200_000
    };
    vi.mocked(transport.fetchApiJson)
      .mockResolvedValueOnce({ ok: true, result: 'already_completed', session: completedSession })
      .mockResolvedValueOnce({ ok: true, result: 'already_abandoned', session: { ...rawSession, status: 'abandoned' } });

    await expect(completeSportSession(
      'sport-session-1',
      1_789_471_200_000,
      'done'
    )).resolves.toMatchObject({
      result: 'already_completed',
      session: { completedAt: new Date(1_789_471_200_000) }
    });
    await expect(abandonSportSession('sport-session-1')).resolves.toMatchObject({
      result: 'already_abandoned',
      session: { status: 'abandoned', startedAt: new Date(1_789_467_600_000) }
    });
    expect(vi.mocked(transport.fetchApiJson).mock.calls[0]?.[1]).toEqual({
      method: 'POST',
      body: JSON.stringify({ notes: 'done', completedAt: 1_789_471_200_000 })
    });
  });
});
