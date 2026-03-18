import { useState, useEffect, useCallback } from 'react';
import type {
  SportSession,
  ArcheryRound,
  ArcheryEnd,
  ArcheryBowType
} from '../../../shared/types';
import {
  addArcheryRound as apiAddRound,
  addArcheryEnd as apiAddEnd,
  completeSportSession as apiCompleteSession,
  type ArcheryRoundResponse,
  type ArcheryEndResponse
} from '../../../shared/api/sportsApi';

const ACTIVE_ARCHERY_KEY = 'activeArcherySession';
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

const toDate = (value: number): Date => {
  const ms = value < 1e12 ? value * 1000 : value;
  return new Date(ms);
};

const mapRound = (round: ArcheryRoundResponse): ArcheryRound => ({
  id: round.id,
  sessionId: round.sessionId,
  distance: round.distance,
  targetSize: round.targetSize,
  arrowsPerEnd: round.arrowsPerEnd,
  order: round.order,
  totalScore: round.totalScore,
  createdAt: toDate(round.createdAt),
  ends: (round.ends || []).map(end => ({
    id: end.id,
    roundId: end.roundId,
    endNumber: end.endNumber,
    subtotal: end.subtotal,
    goldCount: end.goldCount,
    createdAt: toDate(end.createdAt),
    arrows: (end.arrows || []).map(arrow => ({
      id: arrow.id,
      score: arrow.score,
      isGold: arrow.isGold,
      timestamp: toDate(arrow.timestamp)
    }))
  }))
});

const mapEnd = (end: ArcheryEndResponse): ArcheryEnd => ({
  id: end.id,
  roundId: end.roundId,
  endNumber: end.endNumber,
  subtotal: end.subtotal,
  goldCount: end.goldCount,
  createdAt: toDate(end.createdAt),
  arrows: (end.arrows || []).map(arrow => ({
    id: arrow.id,
    score: arrow.score,
    isGold: arrow.isGold,
    timestamp: toDate(arrow.timestamp)
  }))
});

const reviveSession = (session: SportSession): SportSession => ({
  ...session,
  startedAt: new Date(session.startedAt),
  completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
  archeryData: session.archeryData ? {
    ...session.archeryData,
    rounds: session.archeryData.rounds.map((round) => ({
      ...round,
      createdAt: new Date(round.createdAt),
      ends: round.ends.map((end) => ({
        ...end,
        createdAt: new Date(end.createdAt),
        arrows: end.arrows.map((arrow) => ({
          ...arrow,
          timestamp: new Date(arrow.timestamp),
        })),
      })),
    })),
  } : undefined,
});

export const useActiveArcherySession = () => {
  const [activeSession, setActiveSession] = useState<SportSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_ARCHERY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          Date.now() - parsed.timestamp < EXPIRATION_MS
          && parsed.session
          && parsed.session.status === 'active'
        ) {
          setActiveSession(reviveSession(parsed.session));
        } else {
          localStorage.removeItem(ACTIVE_ARCHERY_KEY);
        }
      } catch {
        localStorage.removeItem(ACTIVE_ARCHERY_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Persist to localStorage when session changes
  useEffect(() => {
    if (activeSession?.status === 'active') {
      localStorage.setItem(ACTIVE_ARCHERY_KEY, JSON.stringify({
        session: activeSession,
        timestamp: Date.now()
      }));
      window.dispatchEvent(new Event('active-archery-changed'));
    } else {
      localStorage.removeItem(ACTIVE_ARCHERY_KEY);
    }
  }, [activeSession]);

  const startSession = useCallback((
    session: SportSession,
    config: { bowType: ArcheryBowType; arrowsUsed: number }
  ) => {
    const sessionWithConfig: SportSession = {
      ...session,
      archeryData: {
        bowType: config.bowType,
        arrowsUsed: config.arrowsUsed,
        rounds: [],
        totalScore: 0,
        maxPossibleScore: 0,
        averageArrow: 0,
        goldCount: 0
      }
    };
    setActiveSession(sessionWithConfig);
  }, []);

  const addRound = useCallback(async (
    distance: number,
    targetSize: number,
    arrowsPerEnd: number = 6
  ): Promise<ArcheryRound> => {
    if (!activeSession) throw new Error('No active session');
    const sessionId = activeSession.id;

    const round = await apiAddRound(sessionId, {
      distance,
      targetSize,
      arrowsPerEnd
    });

    const mappedRound = mapRound(round);

    setActiveSession(prev => {
      if (!prev || !prev.archeryData || prev.id !== sessionId) return prev;
      return {
        ...prev,
        archeryData: {
          ...prev.archeryData,
          rounds: [...prev.archeryData.rounds, mappedRound]
        }
      };
    });

    return mappedRound;
  }, [activeSession]);

  const addEnd = useCallback(async (
    roundId: string,
    scores: { score: number; isGold: boolean }[]
  ): Promise<ArcheryEnd> => {
    if (!activeSession) throw new Error('No active session');
    const sessionId = activeSession.id;

    const end = await apiAddEnd(sessionId, roundId, scores);
    const mappedEnd = mapEnd(end);

    setActiveSession(prev => {
      if (!prev || !prev.archeryData || prev.id !== sessionId) return prev;

      const updatedRounds = prev.archeryData.rounds.map(round => {
        if (round.id === roundId) {
          return {
            ...round,
            ends: [...round.ends, mappedEnd],
            totalScore: round.totalScore + mappedEnd.subtotal
          };
        }
        return round;
      });

      // Recalculate totals
      const totalScore = updatedRounds.reduce((sum, r) => sum + r.totalScore, 0);
      const totalArrows = updatedRounds.reduce(
        (sum, r) => sum + r.ends.reduce((eSum, e) => eSum + e.arrows.length, 0),
        0
      );
      const goldCount = updatedRounds.reduce(
        (sum, r) => sum + r.ends.reduce((eSum, e) => eSum + e.goldCount, 0),
        0
      );

      return {
        ...prev,
        archeryData: {
          ...prev.archeryData,
          rounds: updatedRounds,
          totalScore,
          averageArrow: totalArrows > 0 ? Math.round((totalScore / totalArrows) * 100) / 100 : 0,
          goldCount
        }
      };
    });

    return mappedEnd;
  }, [activeSession]);

  const completeSession = useCallback(async (notes?: string) => {
    if (!activeSession) throw new Error('No active session');
    const sessionId = activeSession.id;

    await apiCompleteSession(sessionId, notes);
    localStorage.removeItem(ACTIVE_ARCHERY_KEY);
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) {
        return prev;
      }

      return {
        ...prev,
        notes: notes ?? prev.notes,
        completedAt: new Date(),
        status: 'completed',
      };
    });
  }, [activeSession]);

  const abandonSession = useCallback(() => {
    localStorage.removeItem(ACTIVE_ARCHERY_KEY);
    setActiveSession(null);
  }, []);

  return {
    activeSession,
    isLoading,
    hasActiveSession: !!activeSession,
    startSession,
    addRound,
    addEnd,
    completeSession,
    abandonSession
  };
};
