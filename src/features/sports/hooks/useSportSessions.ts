import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, SportSession, SportStats } from '../../../shared/types';
import { fetchSportSessions, fetchSportStats, deleteSportSession as apiDeleteSession, decodeSportSessions } from '../api/sportsRemote';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { SPORTS_CACHE_INVALIDATED_EVENT } from '../../activity-sync/browserActivitySync';

const SPORTS_CACHE_KEY = 'sports-data-cache';
const SPORTS_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CachedSportsEntry = {
  savedAt: number;
  sessions: SportSession[];
  stats: SportStats;
  stale?: boolean;
};

const readSportsCache = (userId: string): CachedSportsEntry | null => {
  if (!userId || typeof window === 'undefined') return null;

  try {
    const rawCache = window.localStorage.getItem(SPORTS_CACHE_KEY);
    if (!rawCache) return null;

    const parsedCache = JSON.parse(rawCache) as Record<string, CachedSportsEntry>;
    const cacheEntry = parsedCache[userId];
    if (!cacheEntry) return null;

    const stale = cacheEntry.stale === true
      || Date.now() - cacheEntry.savedAt > SPORTS_CACHE_MAX_AGE_MS;
    if (stale !== cacheEntry.stale) {
      parsedCache[userId] = { ...cacheEntry, stale };
      window.localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(parsedCache));
    }

    return {
      ...cacheEntry,
      stale,
      sessions: decodeSportSessions(cacheEntry.sessions)
    };
  } catch {
    return null;
  }
};

const writeSportsCache = (userId: string, sessions: SportSession[], stats: SportStats): void => {
  if (!userId || typeof window === 'undefined') return;

  try {
    const rawCache = window.localStorage.getItem(SPORTS_CACHE_KEY);
    const parsedCache = rawCache ? JSON.parse(rawCache) as Record<string, CachedSportsEntry> : {};
    parsedCache[userId] = {
      savedAt: Date.now(),
      sessions,
      stats,
      stale: false,
    };
    window.localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(parsedCache));
  } catch {
    // ignore cache write failures
  }
};

export const useSportSessions = (user: User) => {
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [sessions, setSessions] = useState<SportSession[]>(() => {
    const cachedEntry = readSportsCache(user.id);
    return cachedEntry?.sessions ?? [];
  });
  const [stats, setStats] = useState<SportStats | null>(() => readSportsCache(user.id)?.stats ?? null);
  const [loading, setLoading] = useState(() => !readSportsCache(user.id));
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, statsData] = await Promise.all([
        fetchSportSessions({ limit: 100, signal: controller.signal }),
        fetchSportStats(undefined, controller.signal)
      ]);
      if (generation !== generationRef.current) return;
      writeSportsCache(user.id, sessionsData, statsData);
      setSessions(sessionsData);
      setStats(statsData);
    } catch (err) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      const cachedEntry = readSportsCache(user.id);
      if (cachedEntry) {
        setSessions(cachedEntry.sessions);
        setStats(cachedEntry.stats);
      }
      setError(toUserMessage(err, 'Error cargando sesiones'));
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (user?.id) {
      void loadSessions();
    }
    return () => abortRef.current?.abort();
  }, [user?.id, loadSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await apiDeleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const refresh = useCallback(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const handleInvalidated = (event: Event) => {
      const eventUserId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (eventUserId === user.id) void loadSessions();
    };
    window.addEventListener(SPORTS_CACHE_INVALIDATED_EVENT, handleInvalidated);
    return () => window.removeEventListener(SPORTS_CACHE_INVALIDATED_EVENT, handleInvalidated);
  }, [loadSessions, user.id]);

  return {
    sessions,
    stats,
    loading,
    error,
    deleteSession,
    refresh
  };
};
