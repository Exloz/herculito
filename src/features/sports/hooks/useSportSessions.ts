import { useState, useEffect, useCallback } from 'react';
import type { User, SportSession, SportStats, SportType } from '../../../shared/types';
import {
  fetchSportSessions,
  fetchSportStats,
  startSportSession as apiStartSession,
  completeSportSession as apiCompleteSession,
  deleteSportSession as apiDeleteSession,
  type SportSessionResponse
} from '../../../shared/api/sportsApi';
import { toUserMessage } from '../../../shared/lib/errorMessages';

const SPORTS_CACHE_KEY = 'sports-data-cache';
const SPORTS_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CachedSportsEntry = {
  savedAt: number;
  sessions: SportSessionResponse[];
  stats: SportStats;
};

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return undefined;
};

const mapSession = (session: SportSessionResponse): SportSession => {
  return {
    ...session,
    startedAt: toDate(session.startedAt) ?? new Date(),
    completedAt: toDate(session.completedAt),
    archeryData: session.archeryData ? {
      bowType: session.archeryData.bowType as 'recurve' | 'compound' | 'barebow' | 'longbow',
      arrowsUsed: session.archeryData.arrowsUsed,
      totalScore: session.archeryData.totalScore,
      maxPossibleScore: session.archeryData.maxPossibleScore,
      averageArrow: session.archeryData.averageArrow,
      goldCount: session.archeryData.goldCount,
      rounds: (session.archeryData.rounds || []).map(round => ({
        id: round.id,
        sessionId: round.sessionId,
        distance: round.distance,
        targetSize: round.targetSize,
        arrowsPerEnd: round.arrowsPerEnd,
        order: round.order,
        totalScore: round.totalScore,
        createdAt: toDate(round.createdAt) ?? new Date(),
        ends: (round.ends || []).map(end => ({
          id: end.id,
          roundId: end.roundId,
          endNumber: end.endNumber,
          subtotal: end.subtotal,
          goldCount: end.goldCount,
          createdAt: toDate(end.createdAt) ?? new Date(),
          arrows: (end.arrows || []).map(arrow => ({
            id: arrow.id,
            score: arrow.score,
            isGold: arrow.isGold,
            timestamp: toDate(arrow.timestamp) ?? new Date()
          }))
        }))
      }))
    } : undefined,
    hiitData: session.hiitData ? {
      intervals: session.hiitData.intervals,
      workDuration: session.hiitData.workDuration,
      restEnabled: session.hiitData.restEnabled,
      restDuration: session.hiitData.restDuration,
      totalWorkTime: session.hiitData.totalWorkTime,
      totalRestTime: session.hiitData.totalRestTime,
    } : undefined,
  };
};

const readSportsCache = (userId: string): CachedSportsEntry | null => {
  if (!userId || typeof window === 'undefined') return null;

  try {
    const rawCache = window.localStorage.getItem(SPORTS_CACHE_KEY);
    if (!rawCache) return null;

    const parsedCache = JSON.parse(rawCache) as Record<string, CachedSportsEntry>;
    const cacheEntry = parsedCache[userId];
    if (!cacheEntry) return null;

    if (Date.now() - cacheEntry.savedAt > SPORTS_CACHE_MAX_AGE_MS) {
      delete parsedCache[userId];
      window.localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(parsedCache));
      return null;
    }

    return cacheEntry;
  } catch {
    return null;
  }
};

const writeSportsCache = (userId: string, sessions: SportSessionResponse[], stats: SportStats): void => {
  if (!userId || typeof window === 'undefined') return;

  try {
    const rawCache = window.localStorage.getItem(SPORTS_CACHE_KEY);
    const parsedCache = rawCache ? JSON.parse(rawCache) as Record<string, CachedSportsEntry> : {};
    parsedCache[userId] = {
      savedAt: Date.now(),
      sessions,
      stats,
    };
    window.localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(parsedCache));
  } catch {
    // ignore cache write failures
  }
};

export const useSportSessions = (user: User) => {
  const [sessions, setSessions] = useState<SportSession[]>(() => {
    const cachedEntry = readSportsCache(user.id);
    return cachedEntry ? cachedEntry.sessions.map(mapSession) : [];
  });
  const [stats, setStats] = useState<SportStats | null>(() => readSportsCache(user.id)?.stats ?? null);
  const [loading, setLoading] = useState(() => !readSportsCache(user.id));
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, statsData] = await Promise.all([
        fetchSportSessions({ limit: 100 }),
        fetchSportStats()
      ]);
      writeSportsCache(user.id, sessionsData, statsData);
      setSessions(sessionsData.map(mapSession));
      setStats(statsData);
    } catch (err) {
      const cachedEntry = readSportsCache(user.id);
      if (cachedEntry) {
        setSessions(cachedEntry.sessions.map(mapSession));
        setStats(cachedEntry.stats);
      }
      setError(toUserMessage(err, 'Error cargando sesiones'));
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (user?.id) {
      void loadSessions();
    }
  }, [user?.id, loadSessions]);

  const startSession = useCallback(async (
    sportType: SportType,
    config: {
      location?: string;
      notes?: string;
      archeryConfig?: {
        bowType: 'recurve' | 'compound' | 'barebow' | 'longbow';
        arrowsUsed: number;
      };
      hiitConfig?: {
        intervals: number;
        workDuration: number;
        restEnabled: boolean;
        restDuration: number;
      };
    }
  ): Promise<SportSession> => {
    const session = await apiStartSession({
      sportType,
      ...config
    });
    const mapped = mapSession(session);
    setSessions(prev => [mapped, ...prev]);
    return mapped;
  }, []);

  const completeSession = useCallback(async (sessionId: string, notes?: string) => {
    await apiCompleteSession(sessionId, notes);
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, status: 'completed' as const, completedAt: new Date(), notes }
          : s
      )
    );
    // Refresh stats after completing
    const newStats = await fetchSportStats();
    setStats(newStats);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await apiDeleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const refresh = useCallback(() => {
    void loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    stats,
    loading,
    error,
    startSession,
    completeSession,
    deleteSession,
    refresh
  };
};
