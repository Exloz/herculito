import { useCallback, useEffect, useMemo, useState } from 'react';
import { clampInteger } from '../../../shared/lib/inputSanitizers';
import type { ArcheryArrowValues, ArcheryRound, SportSession } from '../types/sports';

const SPORTS_STORAGE_KEY_PREFIX = 'sports-tracker-v1';
const MAX_STORED_COMPLETED_SESSIONS = 120;

export const ARCHERY_SPORT_ID = 'archery-default';
export const ARCHERY_SPORT_NAME = 'Tiro con arco';

type PersistedArcheryRound = Omit<ArcheryRound, 'createdAt'> & { createdAt: number };
type PersistedSportSession = Omit<SportSession, 'startedAt' | 'completedAt' | 'rounds'> & {
  startedAt: number;
  completedAt?: number;
  rounds: PersistedArcheryRound[];
};

interface PersistedSportsTrackingData {
  sessions: PersistedSportSession[];
  activeSession: PersistedSportSession | null;
}

const ARCHERY_DEFAULT_ARROWS: ArcheryArrowValues = [0, 0, 0, 0, 0, 0];

const createEntityId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const createArcheryRound = (distanceM: number): ArcheryRound => {
  return {
    id: createEntityId('archery-round'),
    distanceM,
    arrows: [...ARCHERY_DEFAULT_ARROWS] as ArcheryArrowValues,
    createdAt: new Date()
  };
};

const clampArrowScore = (value: number): number => {
  return clampInteger(Math.round(value), 0, 10);
};

const clampDistance = (value: number): number => {
  return clampInteger(Math.round(value), 1, 300);
};

const toValidDate = (value: unknown, fallback: Date = new Date()): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }

  return fallback;
};

const toArcheryArrowValues = (value: unknown): ArcheryArrowValues | null => {
  if (!Array.isArray(value) || value.length !== 6) return null;
  if (!value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) return null;

  return value.map((entry) => clampArrowScore(entry)) as ArcheryArrowValues;
};

const parseRound = (value: unknown): ArcheryRound | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PersistedArcheryRound>;

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
  if (typeof candidate.distanceM !== 'number' || !Number.isFinite(candidate.distanceM)) return null;

  const arrows = toArcheryArrowValues(candidate.arrows);
  if (!arrows) return null;

  return {
    id: candidate.id,
    distanceM: clampDistance(candidate.distanceM),
    arrows,
    createdAt: toValidDate(candidate.createdAt)
  };
};

const parseSession = (value: unknown): SportSession | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PersistedSportSession>;

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
  if (typeof candidate.userId !== 'string' || candidate.userId.trim().length === 0) return null;
  if (!Array.isArray(candidate.rounds)) return null;

  const rounds = candidate.rounds.map(parseRound).filter((round): round is ArcheryRound => round !== null);
  if (rounds.length === 0) return null;

  return {
    id: candidate.id,
    sportId: typeof candidate.sportId === 'string' && candidate.sportId.trim().length > 0
      ? candidate.sportId
      : ARCHERY_SPORT_ID,
    sportName: typeof candidate.sportName === 'string' && candidate.sportName.trim().length > 0
      ? candidate.sportName
      : ARCHERY_SPORT_NAME,
    kind: 'archery',
    userId: candidate.userId,
    startedAt: toValidDate(candidate.startedAt),
    completedAt: candidate.completedAt ? toValidDate(candidate.completedAt) : undefined,
    rounds,
    notes: typeof candidate.notes === 'string' ? candidate.notes : undefined
  };
};

const toPersistedRound = (round: ArcheryRound): PersistedArcheryRound => {
  return {
    ...round,
    createdAt: round.createdAt.getTime()
  };
};

const toPersistedSession = (session: SportSession): PersistedSportSession => {
  return {
    ...session,
    startedAt: session.startedAt.getTime(),
    completedAt: session.completedAt?.getTime(),
    rounds: session.rounds.map(toPersistedRound)
  };
};

export const getArcheryRoundTotal = (round: ArcheryRound): number => {
  return round.arrows.reduce((sum, score) => sum + score, 0);
};

export const getArcherySessionTotals = (rounds: ArcheryRound[]) => {
  const totalPoints = rounds.reduce((sum, round) => sum + getArcheryRoundTotal(round), 0);
  const totalArrows = rounds.length * 6;
  const averageArrow = totalArrows > 0 ? totalPoints / totalArrows : 0;

  return {
    totalPoints,
    totalArrows,
    averageArrow
  };
};

export const useSports = (userId: string) => {
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [activeSession, setActiveSession] = useState<SportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyToPersist, setReadyToPersist] = useState(false);

  const storageKey = useMemo(() => `${SPORTS_STORAGE_KEY_PREFIX}:${userId || 'anonymous'}`, [userId]);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setActiveSession(null);
      setReadyToPersist(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setReadyToPersist(false);

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setSessions([]);
        setActiveSession(null);
        setLoading(false);
        setReadyToPersist(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedSportsTrackingData & { sports?: unknown[] }>;
      const parsedSessions = Array.isArray(parsed.sessions)
        ? parsed.sessions.map(parseSession).filter((session): session is SportSession => session !== null)
        : [];
      const parsedActive = parseSession(parsed.activeSession);

      setSessions(parsedSessions);
      setActiveSession(parsedActive && !parsedActive.completedAt ? parsedActive : null);
    } catch {
      setSessions([]);
      setActiveSession(null);
    } finally {
      setLoading(false);
      setReadyToPersist(true);
    }
  }, [storageKey, userId]);

  useEffect(() => {
    if (!userId || !readyToPersist) return;

    try {
      const payload: PersistedSportsTrackingData = {
        sessions: sessions.map(toPersistedSession),
        activeSession: activeSession ? toPersistedSession(activeSession) : null
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore persistence errors
    }
  }, [activeSession, readyToPersist, sessions, storageKey, userId]);

  const startSession = useCallback((): SportSession => {
    if (activeSession) {
      throw new Error('Ya tienes una sesión activa de tiro con arco.');
    }

    const newSession: SportSession = {
      id: createEntityId('sport-session'),
      sportId: ARCHERY_SPORT_ID,
      sportName: ARCHERY_SPORT_NAME,
      kind: 'archery',
      userId,
      startedAt: new Date(),
      rounds: [createArcheryRound(18)]
    };

    setActiveSession(newSession);
    return newSession;
  }, [activeSession, userId]);

  const updateSessionNotes = useCallback((notes: string) => {
    setActiveSession((previousSession) => {
      if (!previousSession) return previousSession;
      return { ...previousSession, notes };
    });
  }, []);

  const addRound = useCallback(() => {
    setActiveSession((previousSession) => {
      if (!previousSession) return previousSession;

      const lastRound = previousSession.rounds[previousSession.rounds.length - 1];
      const nextDistance = lastRound ? lastRound.distanceM : 18;

      return {
        ...previousSession,
        rounds: [...previousSession.rounds, createArcheryRound(nextDistance)]
      };
    });
  }, []);

  const removeRound = useCallback((roundId: string) => {
    setActiveSession((previousSession) => {
      if (!previousSession || previousSession.rounds.length <= 1) return previousSession;

      const nextRounds = previousSession.rounds.filter((round) => round.id !== roundId);
      if (nextRounds.length === 0) return previousSession;

      return {
        ...previousSession,
        rounds: nextRounds
      };
    });
  }, []);

  const updateRoundDistance = useCallback((roundId: string, distanceM: number) => {
    const normalizedDistance = clampDistance(distanceM);

    setActiveSession((previousSession) => {
      if (!previousSession) return previousSession;

      return {
        ...previousSession,
        rounds: previousSession.rounds.map((round) => {
          if (round.id !== roundId) return round;
          return { ...round, distanceM: normalizedDistance };
        })
      };
    });
  }, []);

  const updateRoundArrow = useCallback((roundId: string, arrowIndex: number, score: number) => {
    if (arrowIndex < 0 || arrowIndex > 5) return;
    const normalizedScore = clampArrowScore(score);

    setActiveSession((previousSession) => {
      if (!previousSession) return previousSession;

      return {
        ...previousSession,
        rounds: previousSession.rounds.map((round) => {
          if (round.id !== roundId) return round;

          const nextArrows = [...round.arrows] as ArcheryArrowValues;
          nextArrows[arrowIndex] = normalizedScore;

          return {
            ...round,
            arrows: nextArrows
          };
        })
      };
    });
  }, []);

  const cancelActiveSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  const completeActiveSession = useCallback((): SportSession => {
    if (!activeSession) {
      throw new Error('No hay una sesión activa para guardar.');
    }

    const completedSession: SportSession = {
      ...activeSession,
      completedAt: new Date()
    };

    setSessions((previousSessions) => {
      return [completedSession, ...previousSessions].slice(0, MAX_STORED_COMPLETED_SESSIONS);
    });
    setActiveSession(null);

    return completedSession;
  }, [activeSession]);

  return {
    sessions,
    activeSession,
    loading,
    startSession,
    addRound,
    removeRound,
    updateRoundDistance,
    updateRoundArrow,
    updateSessionNotes,
    completeActiveSession,
    cancelActiveSession
  };
};
