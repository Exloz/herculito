import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboardData,
  type DashboardDataResponse,
  type DashboardExerciseProgressSummaryResponse,
  type LeaderboardEntryResponse,
  type RoutineResponse
} from '../../../shared/api/dataApi';
import type { DashboardData, DashboardExerciseProgressSummary, DashboardRoutine, LeaderboardEntry } from '../../../shared/types';
import { toUserMessage } from '../../../shared/lib/errorMessages';

const DASHBOARD_CACHE_KEY = 'dashboard-data-cache';
const DASHBOARD_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CachedDashboardEntry = {
  savedAt: number;
  response: DashboardDataResponse;
};

const readDashboardCacheEntry = (userId: string): CachedDashboardEntry | null => {
  if (!userId || typeof window === 'undefined') {
    return null;
  }

  try {
    const rawCache = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!rawCache) {
      return null;
    }

    const parsedCache = JSON.parse(rawCache) as Record<string, CachedDashboardEntry>;
    const cacheEntry = parsedCache[userId];
    if (!cacheEntry) {
      return null;
    }

    if (Date.now() - cacheEntry.savedAt > DASHBOARD_CACHE_MAX_AGE_MS) {
      delete parsedCache[userId];
      window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(parsedCache));
      return null;
    }

    return cacheEntry;
  } catch {
    return null;
  }
};

const writeDashboardCache = (userId: string, response: DashboardDataResponse): void => {
  if (!userId || typeof window === 'undefined') {
    return;
  }

  try {
    const rawCache = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    const parsedCache = rawCache ? JSON.parse(rawCache) as Record<string, CachedDashboardEntry> : {};
    parsedCache[userId] = {
      savedAt: Date.now(),
      response
    };
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(parsedCache));
  } catch {
    // ignore cache write failures
  }
};

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe?.toDate === 'function') return maybe.toDate();
  return new Date(0);
};

const mapRoutine = (routine: RoutineResponse & { exerciseCount: number }): DashboardRoutine => {
  return {
    ...routine,
    createdAt: toDate(routine.createdAt),
    updatedAt: toDate(routine.updatedAt)
  };
};

const mapLeaderboardEntry = (
  entry: LeaderboardEntryResponse | null,
  currentUserId: string,
  currentUserName: string
): LeaderboardEntry | null => {
  if (!entry) return null;

  const trimmedName = entry.name?.trim();
  const fallbackName = entry.userId === currentUserId
    ? currentUserName || 'Tu'
    : `Usuario ${entry.userId.slice(0, 6)}`;

  return {
    ...entry,
    name: trimmedName || fallbackName
  };
};

const mapExerciseProgress = (
  summary: DashboardExerciseProgressSummaryResponse
): DashboardExerciseProgressSummary => {
  return {
    ...summary,
    lastCompletedAt: toDate(summary.lastCompletedAt)
  };
};

const mapDashboardData = (
  response: DashboardDataResponse,
  currentUserId: string,
  currentUserName: string
): DashboardData => {
  const safeUserName = currentUserName.trim();

  return {
    summary: response.summary,
    recentSessions: response.recentSessions.map((session) => ({
      ...session,
      completedAt: toDate(session.completedAt)
    })),
    calendar: response.calendar,
    dashboardRoutines: response.dashboardRoutines.map(mapRoutine),
    competition: {
      weekLeader: mapLeaderboardEntry(response.competition.weekLeader, currentUserId, safeUserName),
      monthLeader: mapLeaderboardEntry(response.competition.monthLeader, currentUserId, safeUserName),
      userWeekRank: mapLeaderboardEntry(response.competition.userWeekRank, currentUserId, safeUserName),
      userMonthRank: mapLeaderboardEntry(response.competition.userMonthRank, currentUserId, safeUserName)
    },
    lastWeightsByRoutine: response.lastWeightsByRoutine,
    exerciseProgress: response.exerciseProgress.map(mapExerciseProgress)
  };
};

export const useDashboardData = (userId: string, userName: string) => {
  const [data, setData] = useState<DashboardData | null>(() => {
    const cachedEntry = readDashboardCacheEntry(userId);
    return cachedEntry ? mapDashboardData(cachedEntry.response, userId, userName) : null;
  });
  const [loading, setLoading] = useState(() => !readDashboardCacheEntry(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(() => Boolean(readDashboardCacheEntry(userId)));
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(() => readDashboardCacheEntry(userId)?.savedAt ?? null);
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return navigator.onLine === false;
  });

  const loadDashboard = useCallback(async (preserveData: boolean) => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setUsingCachedData(false);
      setLastUpdatedAt(null);
      return;
    }

    const cachedEntry = readDashboardCacheEntry(userId);
    const cachedResponse = cachedEntry?.response ?? null;

    if (!preserveData) {
      if (cachedResponse) {
        setData(mapDashboardData(cachedResponse, userId, userName));
        setLoading(false);
        setUsingCachedData(true);
        setLastUpdatedAt(cachedEntry?.savedAt ?? null);
      } else {
        setLoading(true);
      }
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await fetchDashboardData();
      const savedAt = Date.now();
      writeDashboardCache(userId, response);
      setData(mapDashboardData(response, userId, userName));
      setUsingCachedData(false);
      setLastUpdatedAt(savedAt);
    } catch (loadError) {
      if (!preserveData && !cachedResponse) {
        setData(null);
      }
      setUsingCachedData(Boolean(cachedResponse));
      setError(toUserMessage(loadError, 'No se pudo cargar el dashboard'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, userName]);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  return {
    data,
    loading,
    refreshing,
    error,
    usingCachedData,
    lastUpdatedAt,
    isOffline,
    refresh
  };
};
