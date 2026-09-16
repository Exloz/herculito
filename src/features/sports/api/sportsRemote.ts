import type {
  ArcheryBowType,
  ArcheryEnd,
  ArcheryRound,
  HiitConfig,
  SportSession,
  SportStats,
  SportType
} from '../../../shared/types';
import { fetchApiJson } from '../../../shared/api/transport';
import {
  WireDecodeError,
  expectArray,
  expectBoolean,
  expectDate,
  expectEnum,
  expectNumber,
  expectRecord,
  expectString,
  optionalDate,
  optionalNumber,
  optionalString
} from '../../../shared/api/wire';

const SPORT_TYPES = ['archery', 'hiit'] as const satisfies readonly SportType[];
const SESSION_STATUSES = ['active', 'completed', 'abandoned'] as const;
const BOW_TYPES = ['recurve', 'compound', 'barebow', 'longbow'] as const satisfies readonly ArcheryBowType[];

export const decodeArcheryEnd = (value: unknown, path: string): ArcheryEnd => {
  const end = expectRecord(value, path);
  return {
    id: expectString(end.id, `${path}.id`),
    roundId: expectString(end.roundId, `${path}.roundId`),
    endNumber: expectNumber(end.endNumber, `${path}.endNumber`),
    subtotal: expectNumber(end.subtotal, `${path}.subtotal`),
    goldCount: expectNumber(end.goldCount, `${path}.goldCount`),
    createdAt: expectDate(end.createdAt, `${path}.createdAt`),
    arrows: expectArray(end.arrows, `${path}.arrows`).map((arrowValue, arrowIndex) => {
      const arrowPath = `${path}.arrows[${arrowIndex}]`;
      const arrow = expectRecord(arrowValue, arrowPath);
      return {
        id: expectString(arrow.id, `${arrowPath}.id`),
        score: expectNumber(arrow.score, `${arrowPath}.score`),
        isGold: expectBoolean(arrow.isGold, `${arrowPath}.isGold`),
        timestamp: expectDate(arrow.timestamp, `${arrowPath}.timestamp`)
      };
    })
  };
};

export const decodeArcheryRound = (value: unknown, path: string): ArcheryRound => {
  const round = expectRecord(value, path);
  return {
    id: expectString(round.id, `${path}.id`),
    sessionId: expectString(round.sessionId, `${path}.sessionId`),
    distance: expectNumber(round.distance, `${path}.distance`),
    targetSize: expectNumber(round.targetSize, `${path}.targetSize`),
    arrowsPerEnd: expectNumber(round.arrowsPerEnd, `${path}.arrowsPerEnd`),
    order: expectNumber(round.order, `${path}.order`),
    totalScore: expectNumber(round.totalScore, `${path}.totalScore`),
    createdAt: expectDate(round.createdAt, `${path}.createdAt`),
    ends: expectArray(round.ends, `${path}.ends`).map((end, index) => (
      decodeArcheryEnd(end, `${path}.ends[${index}]`)
    ))
  };
};

export const decodeSportSession = (value: unknown, path: string): SportSession => {
  const session = expectRecord(value, path);
  const archeryData = session.archeryData == null
    ? undefined
    : (() => {
        const dataPath = `${path}.archeryData`;
        const data = expectRecord(session.archeryData, dataPath);
        return {
          bowType: expectEnum(data.bowType, BOW_TYPES, `${dataPath}.bowType`),
          arrowsUsed: expectNumber(data.arrowsUsed, `${dataPath}.arrowsUsed`),
          rounds: expectArray(data.rounds, `${dataPath}.rounds`).map((round, index) => (
            decodeArcheryRound(round, `${dataPath}.rounds[${index}]`)
          )),
          totalScore: expectNumber(data.totalScore, `${dataPath}.totalScore`),
          maxPossibleScore: expectNumber(data.maxPossibleScore, `${dataPath}.maxPossibleScore`),
          averageArrow: expectNumber(data.averageArrow, `${dataPath}.averageArrow`),
          goldCount: optionalNumber(data.goldCount, `${dataPath}.goldCount`)
        };
      })();
  const hiitData = session.hiitData == null
    ? undefined
    : (() => {
        const dataPath = `${path}.hiitData`;
        const data = expectRecord(session.hiitData, dataPath);
        return {
          intervals: expectNumber(data.intervals, `${dataPath}.intervals`),
          workDuration: expectNumber(data.workDuration, `${dataPath}.workDuration`),
          restEnabled: expectBoolean(data.restEnabled, `${dataPath}.restEnabled`),
          restDuration: expectNumber(data.restDuration, `${dataPath}.restDuration`),
          totalWorkTime: expectNumber(data.totalWorkTime, `${dataPath}.totalWorkTime`),
          totalRestTime: expectNumber(data.totalRestTime, `${dataPath}.totalRestTime`)
        };
      })();

  return {
    id: expectString(session.id, `${path}.id`),
    userId: expectString(session.userId, `${path}.userId`),
    sportType: expectEnum(session.sportType, SPORT_TYPES, `${path}.sportType`),
    sportName: expectString(session.sportName, `${path}.sportName`),
    startedAt: expectDate(session.startedAt, `${path}.startedAt`),
    completedAt: optionalDate(session.completedAt, `${path}.completedAt`),
    location: optionalString(session.location, `${path}.location`),
    notes: optionalString(session.notes, `${path}.notes`),
    status: expectEnum(session.status, SESSION_STATUSES, `${path}.status`),
    archeryData,
    hiitData
  };
};

export const decodeSportSessions = (value: unknown): SportSession[] => {
  return expectArray(value, 'sport sessions').map((session, index) => (
    decodeSportSession(session, `sport sessions[${index}]`)
  ));
};

export const fetchSportSessions = async (options?: {
  sportType?: SportType;
  limit?: number;
  completedOnly?: boolean;
  signal?: AbortSignal;
}): Promise<SportSession[]> => {
  const searchParams = new URLSearchParams();
  if (options?.sportType) searchParams.set('sportType', options.sportType);
  if (options?.limit) searchParams.set('limit', String(options.limit));
  if (options?.completedOnly) searchParams.set('completedOnly', '1');
  const query = searchParams.toString();
  const response = expectRecord(
    await fetchApiJson(`/v1/data/sports/sessions${query ? `?${query}` : ''}`, { signal: options?.signal }),
    'sport sessions response'
  );
  return decodeSportSessions(response.sessions);
};

export const fetchSportSession = async (sessionId: string): Promise<SportSession> => {
  const response = expectRecord(
    await fetchApiJson(`/v1/data/sports/sessions/${sessionId}`),
    'sport session response'
  );
  return decodeSportSession(response.session, 'sport session response.session');
};

export const startSportSession = async (payload: {
  id?: string;
  sportType: SportType;
  startedAt?: number;
  location?: string;
  notes?: string;
  archeryConfig?: { bowType: ArcheryBowType; arrowsUsed: number };
  hiitConfig?: HiitConfig;
}): Promise<SportSession> => {
  const response = expectRecord(await fetchApiJson('/v1/data/sports/sessions/start', {
    method: 'POST',
    body: JSON.stringify(payload)
  }), 'start sport session response');
  return decodeSportSession(response.session, 'start sport session response.session');
};

export const addArcheryRound = async (
  sessionId: string,
  round: { id?: string; distance: number; targetSize: number; arrowsPerEnd?: number }
): Promise<ArcheryRound> => {
  const response = expectRecord(await fetchApiJson(
    `/v1/data/sports/sessions/${sessionId}/archery/rounds`,
    { method: 'POST', body: JSON.stringify(round) }
  ), 'add archery round response');
  return decodeArcheryRound(response.round, 'add archery round response.round');
};

export const addArcheryEnd = async (
  sessionId: string,
  roundId: string,
  arrows: { score: number; isGold: boolean }[],
  id?: string
): Promise<ArcheryEnd> => {
  const response = expectRecord(await fetchApiJson(
    `/v1/data/sports/sessions/${sessionId}/archery/rounds/${roundId}/ends`,
    { method: 'POST', body: JSON.stringify({ id, arrows }) }
  ), 'add archery end response');
  return decodeArcheryEnd(response.end, 'add archery end response.end');
};

export interface SportTransitionResult {
  result: 'completed' | 'already_completed' | 'abandoned' | 'already_abandoned';
  session: SportSession;
}

export interface SportCompletionResult {
  result: 'completed' | 'already_completed';
  session: SportSession;
}

const decodeSportTransition = (
  value: unknown,
  results: readonly SportTransitionResult['result'][],
  path: string
): SportTransitionResult => {
  const response = expectRecord(value, path);
  expectBoolean(response.ok, `${path}.ok`);
  return {
    result: expectEnum(response.result, results, `${path}.result`),
    session: decodeSportSession(response.session, `${path}.session`)
  };
};

export const decodeSportCompletionResponse = (value: unknown): SportCompletionResult => {
  const path = 'complete sport session response';
  const response = expectRecord(value, path);
  if (!expectBoolean(response.ok, `${path}.ok`)) {
    throw new WireDecodeError(`${path}.ok`);
  }
  return {
    result: expectEnum(response.result, ['completed', 'already_completed'] as const, `${path}.result`),
    session: decodeSportSession(response.session, `${path}.session`)
  };
};

export const completeSportSession = async (
  sessionId: string,
  completedAt: number,
  notes?: string
): Promise<SportCompletionResult> => {
  const response = await fetchApiJson(`/v1/data/sports/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes, completedAt })
  });
  return decodeSportCompletionResponse(response);
};

export const abandonSportSession = async (
  sessionId: string
): Promise<SportTransitionResult> => {
  const response = await fetchApiJson(
    `/v1/data/sports/sessions/${encodeURIComponent(sessionId)}/abandon`,
    { method: 'POST' }
  );
  return decodeSportTransition(
    response,
    ['abandoned', 'already_abandoned'] as const,
    'abandon sport session response'
  );
};

export const deleteSportSession = async (sessionId: string): Promise<void> => {
  await fetchApiJson(`/v1/data/sports/sessions/${sessionId}`, { method: 'DELETE' });
};

const decodeSportStats = (value: unknown): SportStats => {
  const stats = expectRecord(value, 'sport stats');
  return {
    totalSessions: expectNumber(stats.totalSessions, 'sport stats.totalSessions'),
    thisWeekSessions: expectNumber(stats.thisWeekSessions, 'sport stats.thisWeekSessions'),
    thisMonthSessions: expectNumber(stats.thisMonthSessions, 'sport stats.thisMonthSessions'),
    currentStreak: expectNumber(stats.currentStreak, 'sport stats.currentStreak'),
    longestStreak: expectNumber(stats.longestStreak, 'sport stats.longestStreak'),
    totalDuration: optionalNumber(stats.totalDuration, 'sport stats.totalDuration'),
    totalArrowsShot: optionalNumber(stats.totalArrowsShot, 'sport stats.totalArrowsShot'),
    averageScore: optionalNumber(stats.averageScore, 'sport stats.averageScore'),
    personalBest: optionalNumber(stats.personalBest, 'sport stats.personalBest'),
    totalHiitIntervals: optionalNumber(stats.totalHiitIntervals, 'sport stats.totalHiitIntervals'),
    totalHiitWorkTime: optionalNumber(stats.totalHiitWorkTime, 'sport stats.totalHiitWorkTime')
  };
};

export const fetchSportStats = async (sportType?: SportType, signal?: AbortSignal): Promise<SportStats> => {
  const response = expectRecord(await fetchApiJson(
    `/v1/data/sports/stats${sportType ? `?sportType=${sportType}` : ''}`,
    { signal }
  ), 'sport stats response');
  return decodeSportStats(response.stats);
};
