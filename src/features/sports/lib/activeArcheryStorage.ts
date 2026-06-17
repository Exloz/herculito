import type { SportSession } from '../../../shared/types';

export type PendingArcheryOperation =
  | {
      id: string;
      type: 'addRound';
      localRoundId: string;
      distance: number;
      targetSize: number;
      arrowsPerEnd: number;
    }
  | {
      id: string;
      type: 'addEnd';
      localEndId: string;
      localRoundId: string;
      arrows: { score: number; isGold: boolean }[];
    }
  | {
      id: string;
      type: 'completeSession';
      notes?: string;
    };

const ACTIVE_ARCHERY_KEY = 'activeArcherySession';
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

type StoredActiveArcherySession = {
  session: SportSession;
  pendingOps?: PendingArcheryOperation[];
  timestamp: number;
};

const reviveDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
};

export const reviveArcherySession = (session: SportSession): SportSession => ({
  ...session,
  startedAt: reviveDate(session.startedAt),
  completedAt: session.completedAt ? reviveDate(session.completedAt) : undefined,
  archeryData: session.archeryData ? {
    ...session.archeryData,
    rounds: session.archeryData.rounds.map((round) => ({
      ...round,
      createdAt: reviveDate(round.createdAt),
      ends: round.ends.map((end) => ({
        ...end,
        createdAt: reviveDate(end.createdAt),
        arrows: end.arrows.map((arrow) => ({
          ...arrow,
          timestamp: reviveDate(arrow.timestamp),
        })),
      })),
    })),
  } : undefined,
});

const isPendingOperation = (value: unknown): value is PendingArcheryOperation => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PendingArcheryOperation;
  if (typeof candidate.id !== 'string') return false;

  if (candidate.type === 'addRound') {
    return typeof candidate.localRoundId === 'string'
      && typeof candidate.distance === 'number'
      && typeof candidate.targetSize === 'number'
      && typeof candidate.arrowsPerEnd === 'number';
  }

  if (candidate.type === 'addEnd') {
    return typeof candidate.localEndId === 'string'
      && typeof candidate.localRoundId === 'string'
      && Array.isArray(candidate.arrows)
      && candidate.arrows.every((arrow) => typeof arrow.score === 'number' && typeof arrow.isGold === 'boolean');
  }

  return candidate.type === 'completeSession';
};

export const loadActiveArcherySession = (): {
  session: SportSession;
  pendingOps: PendingArcheryOperation[];
} | null => {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(ACTIVE_ARCHERY_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as StoredActiveArcherySession;
    if (
      Date.now() - parsed.timestamp > EXPIRATION_MS
      || !parsed.session
      || parsed.session.status !== 'active'
    ) {
      window.localStorage.removeItem(ACTIVE_ARCHERY_KEY);
      return null;
    }

    const pendingOps = Array.isArray(parsed.pendingOps)
      ? parsed.pendingOps.filter(isPendingOperation)
      : [];

    return {
      session: reviveArcherySession(parsed.session),
      pendingOps,
    };
  } catch {
    window.localStorage.removeItem(ACTIVE_ARCHERY_KEY);
    return null;
  }
};

export const saveActiveArcherySession = (
  session: SportSession | null,
  pendingOps: PendingArcheryOperation[] = []
): void => {
  if (typeof window === 'undefined') return;

  if (!session || session.status !== 'active') {
    window.localStorage.removeItem(ACTIVE_ARCHERY_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_ARCHERY_KEY, JSON.stringify({
    session,
    pendingOps,
    timestamp: Date.now(),
  }));
};

export const clearActiveArcherySession = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_ARCHERY_KEY);
};
