import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData } from '../../../shared/types';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { decodeDashboardData, fetchDashboard } from '../api/dashboardRemote';
import { DASHBOARD_CACHE_INVALIDATED_EVENT } from '../../activity-sync/browserActivitySync';

const DASHBOARD_CACHE_KEY = 'dashboard-data-cache';
const DASHBOARD_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CachedDashboardEntry = {
  savedAt: number;
  data: DashboardData;
  stale?: boolean;
};

export const readDashboardCacheEntry = (userId: string, userName: string): CachedDashboardEntry | null => {
  if (!userId || typeof window === 'undefined') {
    return null;
  }

  try {
    const rawCache = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!rawCache) {
      return null;
    }

    const parsedCache = JSON.parse(rawCache) as Record<string, CachedDashboardEntry & { response?: unknown }>;
    const cacheEntry = parsedCache[userId];
    if (!cacheEntry) {
      return null;
    }

    const savedAt = typeof cacheEntry.savedAt === 'number' ? cacheEntry.savedAt : 0;
    const data = cacheEntry.data ?? cacheEntry.response;
    const stale = cacheEntry.stale === true
      || Date.now() - savedAt > DASHBOARD_CACHE_MAX_AGE_MS;
    const decoded = decodeDashboardData(data, userId, userName);

    if (cacheEntry.response !== undefined || stale !== cacheEntry.stale) {
      parsedCache[userId] = { savedAt, data: decoded, stale };
      window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(parsedCache));
    }

    return {
      savedAt,
      data: decoded,
      stale
    };
  } catch {
    return null;
  }
};

const writeDashboardCache = (userId: string, data: DashboardData): void => {
  if (!userId || typeof window === 'undefined') {
    return;
  }

  try {
    const rawCache = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    const parsedCache = rawCache ? JSON.parse(rawCache) as Record<string, CachedDashboardEntry> : {};
    parsedCache[userId] = {
      savedAt: Date.now(),
      data,
      stale: false
    };
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(parsedCache));
  } catch {
    // ignore cache write failures
  }
};

export const useDashboardData = (userId: string, userName: string) => {
  const [initialCache] = useState(() => ({
    userId,
    userName,
    entry: readDashboardCacheEntry(userId, userName)
  }));
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [data, setData] = useState<DashboardData | null>(initialCache.entry?.data ?? null);
  const [loading, setLoading] = useState(!initialCache.entry);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(Boolean(initialCache.entry));
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(initialCache.entry?.savedAt ?? null);
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return navigator.onLine === false;
  });

  const loadDashboard = useCallback(async (
    preserveData: boolean,
    cachedEntry: CachedDashboardEntry | null = null
  ) => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!userId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setUsingCachedData(false);
      setLastUpdatedAt(null);
      return;
    }

    const cachedData = cachedEntry?.data ?? null;

    if (!preserveData) {
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setRefreshing(true);
        setUsingCachedData(true);
        setLastUpdatedAt(cachedEntry?.savedAt ?? null);
      } else {
        setLoading(true);
        setRefreshing(false);
      }
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const dashboardData = await fetchDashboard(userId, userName, controller.signal);
      if (generation !== generationRef.current) return;
      const savedAt = Date.now();
      writeDashboardCache(userId, dashboardData);
      setData(dashboardData);
      setUsingCachedData(false);
      setLastUpdatedAt(savedAt);
    } catch (loadError) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      if (!preserveData && !cachedData) {
        setData(null);
      }
      if (!preserveData) {
        setUsingCachedData(Boolean(cachedData));
      }
      setError(toUserMessage(loadError, 'No se pudo cargar el dashboard'));
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId, userName]);

  useEffect(() => {
    const cachedEntry = initialCache.userId === userId && initialCache.userName === userName
      ? initialCache.entry
      : readDashboardCacheEntry(userId, userName);
    void loadDashboard(false, cachedEntry);
    return () => abortRef.current?.abort();
  }, [initialCache, loadDashboard, userId, userName]);

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

  useEffect(() => {
    const handleInvalidated = (event: Event) => {
      const eventUserId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (eventUserId === userId) void loadDashboard(true);
    };
    window.addEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleInvalidated);
    return () => window.removeEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleInvalidated);
  }, [loadDashboard, userId]);

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
