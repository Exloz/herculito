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
    } : undefined
  };
};

export const useSportSessions = (user: User) => {
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [stats, setStats] = useState<SportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, statsData] = await Promise.all([
        fetchSportSessions({ limit: 100 }),
        fetchSportStats()
      ]);
      setSessions(sessionsData.map(mapSession));
      setStats(statsData);
    } catch (err) {
      setError(toUserMessage(err, 'Error cargando sesiones'));
    } finally {
      setLoading(false);
    }
  }, []);

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
