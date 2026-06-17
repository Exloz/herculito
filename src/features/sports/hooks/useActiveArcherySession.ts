import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  clearActiveArcherySession,
  loadActiveArcherySession,
  saveActiveArcherySession,
  type PendingArcheryOperation,
} from '../lib/activeArcheryStorage';

const toDate = (value: number): Date => {
  const ms = value < 1e12 ? value * 1000 : value;
  return new Date(ms);
};

const createLocalId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

const recalculateArcheryData = (session: SportSession): SportSession => {
  if (!session.archeryData) return session;

  const rounds = session.archeryData.rounds.map((round) => ({
    ...round,
    totalScore: round.ends.reduce((sum, end) => sum + end.subtotal, 0),
  }));
  const totalScore = rounds.reduce((sum, round) => sum + round.totalScore, 0);
  const totalArrows = rounds.reduce(
    (sum, round) => sum + round.ends.reduce((endSum, end) => endSum + end.arrows.length, 0),
    0
  );
  const goldCount = rounds.reduce(
    (sum, round) => sum + round.ends.reduce((endSum, end) => endSum + end.goldCount, 0),
    0
  );

  return {
    ...session,
    archeryData: {
      ...session.archeryData,
      rounds,
      totalScore,
      maxPossibleScore: totalArrows * 10,
      averageArrow: totalArrows > 0 ? Math.round((totalScore / totalArrows) * 100) / 100 : 0,
      goldCount,
    },
  };
};

export const useActiveArcherySession = () => {
  const [activeSession, setActiveSession] = useState<SportSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const activeSessionRef = useRef<SportSession | null>(null);
  const pendingOpsRef = useRef<PendingArcheryOperation[]>([]);
  const isFlushingRef = useRef(false);

  const persist = useCallback((session: SportSession | null, pendingOps = pendingOpsRef.current) => {
    activeSessionRef.current = session;
    pendingOpsRef.current = pendingOps;
    setPendingSyncCount(pendingOps.length);
    saveActiveArcherySession(session, pendingOps);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('active-archery-changed'));
    }
  }, []);

  const updateActiveSession = useCallback((updater: (previous: SportSession | null) => SportSession | null) => {
    setActiveSession((previous) => {
      const next = updater(previous);
      persist(next);
      return next;
    });
  }, [persist]);

  const enqueuePendingOp = useCallback((operation: PendingArcheryOperation) => {
    const nextPendingOps = [...pendingOpsRef.current, operation];
    persist(activeSessionRef.current, nextPendingOps);
  }, [persist]);

  const flushPendingOps = useCallback(async () => {
    if (isFlushingRef.current) return;
    const initialSession = activeSessionRef.current;
    if (!initialSession || pendingOpsRef.current.length === 0) return;

    isFlushingRef.current = true;
    try {
      while (pendingOpsRef.current.length > 0) {
        const session = activeSessionRef.current;
        const operation = pendingOpsRef.current[0];
        if (!session || session.status !== 'active') break;

        if (operation.type === 'addRound') {
          const response = await apiAddRound(session.id, {
            distance: operation.distance,
            targetSize: operation.targetSize,
            arrowsPerEnd: operation.arrowsPerEnd,
          });
          const syncedRound = mapRound(response);
          const nextPendingOps = pendingOpsRef.current
            .slice(1)
            .map((pendingOperation) => (
              pendingOperation.type === 'addEnd' && pendingOperation.localRoundId === operation.localRoundId
                ? { ...pendingOperation, localRoundId: syncedRound.id }
                : pendingOperation
            ));

          setActiveSession((previous) => {
            if (!previous || !previous.archeryData || previous.id !== session.id) {
              persist(previous, nextPendingOps);
              return previous;
            }

            const nextSession = recalculateArcheryData({
              ...previous,
              archeryData: {
                ...previous.archeryData,
                rounds: previous.archeryData.rounds.map((round) => {
                  if (round.id !== operation.localRoundId) return round;

                  const localEnds = round.ends.map((end) => ({
                    ...end,
                    roundId: syncedRound.id,
                  }));
                  return {
                    ...syncedRound,
                    ends: localEnds.length > 0 ? localEnds : syncedRound.ends,
                    totalScore: localEnds.length > 0 ? round.totalScore : syncedRound.totalScore,
                  };
                }),
              },
            });

            persist(nextSession, nextPendingOps);
            return nextSession;
          });
          continue;
        }

        if (operation.type === 'addEnd') {
          const round = session.archeryData?.rounds.find((item) => item.id === operation.localRoundId);
          if (!round || operation.localRoundId.startsWith('local-round-')) break;

          const response = await apiAddEnd(session.id, operation.localRoundId, operation.arrows);
          const syncedEnd = mapEnd(response);
          const nextPendingOps = pendingOpsRef.current.slice(1);

          setActiveSession((previous) => {
            if (!previous || !previous.archeryData || previous.id !== session.id) {
              persist(previous, nextPendingOps);
              return previous;
            }

            const nextSession = recalculateArcheryData({
              ...previous,
              archeryData: {
                ...previous.archeryData,
                rounds: previous.archeryData.rounds.map((item) => (
                  item.id === operation.localRoundId
                    ? {
                        ...item,
                        ends: item.ends.map((end) => (
                          end.id === operation.localEndId ? syncedEnd : end
                        )),
                      }
                    : item
                )),
              },
            });

            persist(nextSession, nextPendingOps);
            return nextSession;
          });
          continue;
        }

        await apiCompleteSession(session.id, operation.notes);
        const nextPendingOps = pendingOpsRef.current.slice(1);
        setActiveSession((previous) => {
          if (!previous || previous.id !== session.id) return previous;
          const nextSession = {
            ...previous,
            notes: operation.notes ?? previous.notes,
            completedAt: new Date(),
            status: 'completed' as const,
          };
          pendingOpsRef.current = nextPendingOps;
          setPendingSyncCount(nextPendingOps.length);
          clearActiveArcherySession();
          activeSessionRef.current = nextSession;
          return nextSession;
        });
      }
    } catch {
      persist(activeSessionRef.current);
    } finally {
      isFlushingRef.current = false;
    }
  }, [persist]);

  useEffect(() => {
    const stored = loadActiveArcherySession();
    if (stored) {
      activeSessionRef.current = stored.session;
      pendingOpsRef.current = stored.pendingOps;
      setActiveSession(stored.session);
      setPendingSyncCount(stored.pendingOps.length);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void flushPendingOps();
    }
  }, [flushPendingOps, isLoading]);

  useEffect(() => {
    const handleOnline = () => {
      void flushPendingOps();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushPendingOps]);

  const startSession = useCallback((
    session: SportSession,
    config: { bowType: ArcheryBowType; arrowsUsed: number }
  ) => {
    const sessionWithConfig: SportSession = {
      ...session,
      archeryData: {
        bowType: config.bowType,
        arrowsUsed: config.arrowsUsed,
        rounds: session.archeryData?.rounds ?? [],
        totalScore: session.archeryData?.totalScore ?? 0,
        maxPossibleScore: session.archeryData?.maxPossibleScore ?? 0,
        averageArrow: session.archeryData?.averageArrow ?? 0,
        goldCount: session.archeryData?.goldCount ?? 0
      }
    };
    pendingOpsRef.current = [];
    setActiveSession(sessionWithConfig);
    persist(sessionWithConfig, []);
  }, [persist]);

  const addRound = useCallback(async (
    distance: number,
    targetSize: number,
    arrowsPerEnd: number = 6
  ): Promise<ArcheryRound> => {
    const session = activeSessionRef.current;
    if (!session?.archeryData) throw new Error('No active session');

    const localRound: ArcheryRound = {
      id: createLocalId('local-round'),
      sessionId: session.id,
      distance,
      targetSize,
      arrowsPerEnd,
      order: session.archeryData.rounds.length + 1,
      totalScore: 0,
      createdAt: new Date(),
      ends: [],
    };

    updateActiveSession((previous) => {
      if (!previous?.archeryData || previous.id !== session.id) return previous;
      return recalculateArcheryData({
        ...previous,
        archeryData: {
          ...previous.archeryData,
          rounds: [...previous.archeryData.rounds, localRound],
        },
      });
    });

    enqueuePendingOp({
      id: createLocalId('pending-round'),
      type: 'addRound',
      localRoundId: localRound.id,
      distance,
      targetSize,
      arrowsPerEnd,
    });
    void flushPendingOps();
    return localRound;
  }, [enqueuePendingOp, flushPendingOps, updateActiveSession]);

  const addEnd = useCallback(async (
    roundId: string,
    scores: { score: number; isGold: boolean }[]
  ): Promise<ArcheryEnd> => {
    const session = activeSessionRef.current;
    const round = session?.archeryData?.rounds.find((item) => item.id === roundId);
    if (!session?.archeryData || !round) throw new Error('No active session');

    const now = new Date();
    const localEnd: ArcheryEnd = {
      id: createLocalId('local-end'),
      roundId,
      endNumber: round.ends.length + 1,
      subtotal: scores.reduce((sum, arrow) => sum + arrow.score, 0),
      goldCount: scores.filter((arrow) => arrow.isGold).length,
      createdAt: now,
      arrows: scores.map((arrow) => ({
        id: createLocalId('local-arrow'),
        score: arrow.score,
        isGold: arrow.isGold,
        timestamp: now,
      })),
    };

    updateActiveSession((previous) => {
      if (!previous?.archeryData || previous.id !== session.id) return previous;
      return recalculateArcheryData({
        ...previous,
        archeryData: {
          ...previous.archeryData,
          rounds: previous.archeryData.rounds.map((item) => (
            item.id === roundId
              ? { ...item, ends: [...item.ends, localEnd] }
              : item
          )),
        },
      });
    });

    enqueuePendingOp({
      id: createLocalId('pending-end'),
      type: 'addEnd',
      localEndId: localEnd.id,
      localRoundId: roundId,
      arrows: scores,
    });
    void flushPendingOps();
    return localEnd;
  }, [enqueuePendingOp, flushPendingOps, updateActiveSession]);

  const completeSession = useCallback(async (notes?: string) => {
    const session = activeSessionRef.current;
    if (!session) throw new Error('No active session');

    try {
      await flushPendingOps();
      if (pendingOpsRef.current.length > 0) {
        throw new Error('Pending archery sync');
      }

      await apiCompleteSession(session.id, notes);
      clearActiveArcherySession();
      pendingOpsRef.current = [];
      setPendingSyncCount(0);
      setActiveSession((previous) => {
        if (!previous || previous.id !== session.id) return previous;
        const nextSession = {
          ...previous,
          notes: notes ?? previous.notes,
          completedAt: new Date(),
          status: 'completed' as const,
        };
        activeSessionRef.current = nextSession;
        return nextSession;
      });
    } catch (error) {
      if (!pendingOpsRef.current.some((operation) => operation.type === 'completeSession')) {
        enqueuePendingOp({
          id: createLocalId('pending-complete'),
          type: 'completeSession',
          notes,
        });
      }
      throw error;
    }
  }, [enqueuePendingOp, flushPendingOps]);

  const updateSessionNotes = useCallback((notes: string) => {
    updateActiveSession((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        notes,
      };
    });
  }, [updateActiveSession]);

  const abandonSession = useCallback(() => {
    clearActiveArcherySession();
    pendingOpsRef.current = [];
    activeSessionRef.current = null;
    setPendingSyncCount(0);
    setActiveSession(null);
  }, []);

  return {
    activeSession,
    isLoading,
    hasActiveSession: !!activeSession,
    pendingSyncCount,
    isSyncPending: pendingSyncCount > 0,
    startSession,
    addRound,
    addEnd,
    completeSession,
    updateSessionNotes,
    abandonSession
  };
};
