import { useEffect, useState } from 'react';
import { fetchCompetitiveLeaderboard, type LeaderboardEntryResponse } from '../../../shared/api/dataApi';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalWorkouts: number;
  position: number;
}

interface CompetitionStats {
  weekLeader: LeaderboardEntry | null;
  monthLeader: LeaderboardEntry | null;
  userWeekRank: LeaderboardEntry | null;
  userMonthRank: LeaderboardEntry | null;
}

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

const EMPTY_STATS: CompetitionStats = {
  weekLeader: null,
  monthLeader: null,
  userWeekRank: null,
  userMonthRank: null
};

const LEADERBOARD_CACHE_TTL_MS = 30 * 1000;

let cachedLeaderboard:
  | {
    expiresAt: number;
    data: Awaited<ReturnType<typeof fetchCompetitiveLeaderboard>>;
  }
  | null = null;
let leaderboardPromise: Promise<Awaited<ReturnType<typeof fetchCompetitiveLeaderboard>>> | null = null;

const getLeaderboard = async () => {
  const now = Date.now();
  if (cachedLeaderboard && cachedLeaderboard.expiresAt > now) {
    return cachedLeaderboard.data;
  }

  if (leaderboardPromise) {
    return leaderboardPromise;
  }

  leaderboardPromise = fetchCompetitiveLeaderboard(25)
    .then((data) => {
      cachedLeaderboard = {
        data,
        expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS
      };
      return data;
    })
    .finally(() => {
      leaderboardPromise = null;
    });

  return leaderboardPromise;
};

export const useCompetitionStats = (
  userId: string,
  userName: string,
  refreshKey: number,
  enabled: boolean
) => {
  const [loading, setLoading] = useState(false);
  const [competitionStats, setCompetitionStats] = useState<CompetitionStats>(EMPTY_STATS);

  useEffect(() => {
    if (!enabled || refreshKey < 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadCompetitionStats = async () => {
      setLoading(true);

      try {
        const leaderboard = await getLeaderboard();
        if (cancelled) return;

        const currentUserName = userName.trim();

        setCompetitionStats({
          weekLeader: mapLeaderboardEntry(leaderboard.week.top[0] ?? null, userId, currentUserName),
          monthLeader: mapLeaderboardEntry(leaderboard.month.top[0] ?? null, userId, currentUserName),
          userWeekRank: mapLeaderboardEntry(leaderboard.week.currentUser, userId, currentUserName),
          userMonthRank: mapLeaderboardEntry(leaderboard.month.currentUser, userId, currentUserName)
        });
      } catch {
        if (!cancelled) {
          setCompetitionStats(EMPTY_STATS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCompetitionStats();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey, userId, userName]);

  return {
    competitionStats,
    competitionLoading: loading
  };
};
