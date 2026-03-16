import { fetchJson } from './apiClient';
import type {
  SportSession,
  SportStats,
  SportType,
  ArcheryBowType
} from '../types';
import { getPushApiOrigin } from '../../features/workouts/api/pushApi';

// Response types from API
export type SportSessionResponse = Omit<SportSession, 'startedAt' | 'completedAt' | 'archeryData'> & {
  startedAt: number;
  completedAt?: number;
  archeryData?: {
    bowType: string;
    arrowsUsed: number;
    rounds: ArcheryRoundResponse[];
    totalScore: number;
    maxPossibleScore: number;
    averageArrow: number;
    goldCount?: number;
  };
};

export type ArcheryRoundResponse = {
  id: string;
  sessionId: string;
  distance: number;
  targetSize: number;
  arrowsPerEnd: number;
  order: number;
  ends: ArcheryEndResponse[];
  totalScore: number;
  createdAt: number;
};

export type ArcheryEndResponse = {
  id: string;
  roundId: string;
  endNumber: number;
  arrows: ArcheryArrowResponse[];
  subtotal: number;
  goldCount: number;
  createdAt: number;
};

export type ArcheryArrowResponse = {
  id: string;
  score: number;
  isGold: boolean;
  timestamp: number;
};

// API Functions

export const fetchSportSessions = async (options?: {
  sportType?: SportType;
  limit?: number;
  completedOnly?: boolean;
}): Promise<SportSessionResponse[]> => {
  const origin = getPushApiOrigin();
  const searchParams = new URLSearchParams();
  if (options?.sportType) searchParams.set('sportType', options.sportType);
  if (options?.limit) searchParams.set('limit', String(options.limit));
  if (options?.completedOnly) searchParams.set('completedOnly', '1');
  
  const query = searchParams.toString();
  const data = await fetchJson<{ sessions: SportSessionResponse[] }>(
    `${origin}/v1/sports/sessions${query ? `?${query}` : ''}`
  );
  return data.sessions ?? [];
};

export const fetchSportSession = async (sessionId: string): Promise<SportSessionResponse> => {
  const origin = getPushApiOrigin();
  const data = await fetchJson<{ session: SportSessionResponse }>(
    `${origin}/v1/sports/sessions/${sessionId}`
  );
  return data.session;
};

export const startSportSession = async (payload: {
  sportType: SportType;
  location?: string;
  notes?: string;
  archeryConfig?: {
    bowType: ArcheryBowType;
    arrowsUsed: number;
  };
}): Promise<SportSessionResponse> => {
  const origin = getPushApiOrigin();
  const data = await fetchJson<{ session: SportSessionResponse }>(
    `${origin}/v1/sports/sessions/start`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  return data.session;
};

export const addArcheryRound = async (
  sessionId: string,
  round: {
    distance: number;
    targetSize: number;
    arrowsPerEnd?: number;
  }
): Promise<ArcheryRoundResponse> => {
  const origin = getPushApiOrigin();
  const data = await fetchJson<{ round: ArcheryRoundResponse }>(
    `${origin}/v1/sports/sessions/${sessionId}/archery/rounds`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(round)
    }
  );
  return data.round;
};

export const addArcheryEnd = async (
  sessionId: string,
  roundId: string,
  arrows: { score: number; isGold: boolean }[]
): Promise<ArcheryEndResponse> => {
  const origin = getPushApiOrigin();
  const data = await fetchJson<{ end: ArcheryEndResponse }>(
    `${origin}/v1/sports/sessions/${sessionId}/archery/rounds/${roundId}/ends`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ arrows })
    }
  );
  return data.end;
};

export const completeSportSession = async (
  sessionId: string,
  notes?: string
): Promise<void> => {
  const origin = getPushApiOrigin();
  await fetchJson<{ ok: boolean }>(
    `${origin}/v1/sports/sessions/${sessionId}/complete`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes })
    }
  );
};

export const deleteSportSession = async (sessionId: string): Promise<void> => {
  const origin = getPushApiOrigin();
  await fetchJson<{ ok: boolean }>(
    `${origin}/v1/sports/sessions/${sessionId}`,
    {
      method: 'DELETE'
    }
  );
};

export const fetchSportStats = async (sportType?: SportType): Promise<SportStats> => {
  const origin = getPushApiOrigin();
  const searchParams = sportType ? `?sportType=${sportType}` : '';
  const data = await fetchJson<{ stats: SportStats }>(
    `${origin}/v1/sports/stats${searchParams}`
  );
  return data.stats;
};
