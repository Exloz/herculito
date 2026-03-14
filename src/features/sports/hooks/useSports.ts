import { useCallback, useEffect, useMemo, useState } from 'react';
import { clampInteger, normalizeSingleLine } from '../../../shared/lib/inputSanitizers';
import type {
  ArcheryArrowValues,
  ArcheryRound,
  SportDefinition,
  SportKind,
  SportSession
} from '../types/sports';

const SPORTS_STORAGE_KEY_PREFIX = 'sports-tracker-v1';
export const MAX_SPORT_NAME_LENGTH = 80;
const MAX_STORED_COMPLETED_SESSIONS = 120;

type PersistedSportDefinition = Omit<SportDefinition, 'createdAt'> & { createdAt: number };
type PersistedArcheryRound = Omit<ArcheryRound, 'createdAt'> & { createdAt: number };
type PersistedSportSession = Omit<SportSession, 'startedAt' | 'completedAt' | 'rounds'> & {
  startedAt: number;
  completedAt?: number;
  rounds: PersistedArcheryRound[];
};

interface PersistedSportsTrackingData {
  sports: PersistedSportDefinition[];
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

const toSportKind = (value: unknown): SportKind | null => {
  if (value === 'archery') return 'archery';
  return null;
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

const parseSport = (value: unknown): SportDefinition | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PersistedSportDefinition>;

  const kind = toSportKind(candidate.kind);
  if (!kind) return null;
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length < 2) return null;
  if (typeof candidate.createdBy !== 'string' || candidate.createdBy.trim().length === 0) return null;

  return {
    id: candidate.id,
    name: candidate.name,
    kind,
    createdBy: candidate.createdBy,
    createdAt: toValidDate(candidate.createdAt)
  };
};

const parseSession = (value: unknown): SportSession | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PersistedSportSession>;

  const kind = toSportKind(candidate.kind);
  if (!kind) return null;
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
  if (typeof candidate.sportId !== 'string' || candidate.sportId.trim().length === 0) return null;
  if (typeof candidate.sportName !== 'string' || candidate.sportName.trim().length === 0) return null;
  if (typeof candidate.userId !== 'string' || candidate.userId.trim().length === 0) return null;
  if (!Array.isArray(candidate.rounds)) return null;

  const rounds = candidate.rounds.map(parseRound).filter((round): round is ArcheryRound => round !== null);
  if (rounds.length === 0) return null;

  return {
    id: candidate.id,
    sportId: candidate.sportId,
    sportName: candidate.sportName,
    kind,
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

const toPersistedSport = (sport: SportDefinition): PersistedSportDefinition => {
  return {
    ...sport,
    createdAt: sport.createdAt.getTime()
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
  const [sports, setSports] = useState<SportDefinition[]>([]);
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [activeSession, setActiveSession] = useState<SportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyToPersist, setReadyToPersist] = useState(false);

  const storageKey = useMemo(() => `${SPORTS_STORAGE_KEY_PREFIX}:${userId || 'anonymous'}`, [userId]);

  useEffect(() => {
    if (!userId) {
      setSports([]);
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
        setSports([]);
        setSessions([]);
        setActiveSession(null);
        setLoading(false);
        setReadyToPersist(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedSportsTrackingData>;
      const parsedSports = Array.isArray(parsed.sports)
        ? parsed.sports.map(parseSport).filter((sport): sport is SportDefinition => sport !== null)
        : [];
      const parsedSessions = Array.isArray(parsed.sessions)
        ? parsed.sessions.map(parseSession).filter((session): session is SportSession => session !== null)
        : [];
      const parsedActive = parseSession(parsed.activeSession);

      setSports(parsedSports);
      setSessions(parsedSessions);
      setActiveSession(parsedActive && !parsedActive.completedAt ? parsedActive : null);
    } catch {
      setSports([]);
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
        sports: sports.map(toPersistedSport),
        sessions: sessions.map(toPersistedSession),
        activeSession: activeSession ? toPersistedSession(activeSession) : null
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore persistence errors
    }
  }, [activeSession, readyToPersist, sessions, sports, storageKey, userId]);

  const createSport = useCallback((name: string, kind: SportKind = 'archery') => {
    const normalizedName = normalizeSingleLine(name, MAX_SPORT_NAME_LENGTH);

    if (normalizedName.length < 2) {
      throw new Error('Usa un nombre de al menos 2 caracteres para crear un deporte.');
    }

    const duplicate = sports.some((sport) => sport.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
    if (duplicate) {
      throw new Error('Ya existe un deporte con ese nombre.');
    }

    const newSport: SportDefinition = {
      id: createEntityId('sport'),
      name: normalizedName,
      kind,
      createdBy: userId,
      createdAt: new Date()
    };

    setSports((previousSports) => [newSport, ...previousSports]);
    return newSport;
  }, [sports, userId]);

  const startSession = useCallback((sportId: string): SportSession => {
    if (activeSession) {
      throw new Error('Ya tienes una sesión activa de deporte. Termínala o cancélala antes de iniciar otra.');
    }

    const sport = sports.find((entry) => entry.id === sportId);
    if (!sport) {
      throw new Error('No encontramos ese deporte para iniciar la sesión.');
    }

    const newSession: SportSession = {
      id: createEntityId('sport-session'),
      sportId: sport.id,
      sportName: sport.name,
      kind: sport.kind,
      userId,
      startedAt: new Date(),
      rounds: [createArcheryRound(18)]
    };

    setActiveSession(newSession);
    return newSession;
  }, [activeSession, sports, userId]);

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

  const sessionsBySport = useMemo(() => {
    return sessions.reduce<Record<string, SportSession[]>>((accumulator, session) => {
      if (!accumulator[session.sportId]) {
        accumulator[session.sportId] = [];
      }

      accumulator[session.sportId].push(session);
      return accumulator;
    }, {});
  }, [sessions]);

  return {
    sports,
    sessions,
    sessionsBySport,
    activeSession,
    loading,
    createSport,
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
