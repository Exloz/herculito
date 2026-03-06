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

export const useCompetitionStats = (
  userId: string,
  userName: string,
  refreshKey: number
) => {
  const [loading, setLoading] = useState(false);
  const [competitionStats, setCompetitionStats] = useState<CompetitionStats>(EMPTY_STATS);

  useEffect(() => {
    let cancelled = false;

    const loadCompetitionStats = async () => {
      setLoading(true);

      try {
        const leaderboard = await fetchCompetitiveLeaderboard(25);
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
  }, [refreshKey, userId, userName]);

  return {
    competitionStats,
    competitionLoading: loading
  };
};
