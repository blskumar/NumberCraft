import { computeDailyStreakStats, getLocalDateKey } from '../daily-challenge';
import { buildArithmeticAccuracySeries } from './accuracy';
import type { DashboardOverviewStats } from './types';
import type { DailyChallengeCompletion, MatchRecord } from '../types';

export function computeDashboardOverview(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DashboardOverviewStats {
  const accuracySeries = buildArithmeticAccuracySeries(matches, 'all', 'all');
  const streakStats = computeDailyStreakStats(dailyCompletions, todayKey);

  let avgArithmeticAccuracy: number | null = null;
  let accuracyDelta: number | null = null;
  let avgPacePerMinute: number | null = null;
  let totalProblemsSolved = 0;

  if (accuracySeries.length > 0) {
    avgArithmeticAccuracy = Math.round(
      accuracySeries.reduce((sum, p) => sum + p.accuracyPercent, 0) /
        accuracySeries.length
    );
    avgPacePerMinute = Math.round(
      accuracySeries.reduce((sum, p) => sum + p.pacePerMinute, 0) /
        accuracySeries.length
    );
    totalProblemsSolved = accuracySeries.reduce((sum, p) => sum + p.solved, 0);

    if (accuracySeries.length >= 2) {
      const split = Math.floor(accuracySeries.length / 2);
      const early = accuracySeries.slice(0, split);
      const recent = accuracySeries.slice(split);
      const earlyAvg =
        early.reduce((s, p) => s + p.accuracyPercent, 0) / early.length;
      const recentAvg =
        recent.reduce((s, p) => s + p.accuracyPercent, 0) / recent.length;
      accuracyDelta = Math.round(recentAvg - earlyAvg);
    }
  }

  const nonDailyMatchesCount = matches.filter((m) => !m.dailyMeta).length;
  const totalChallengesCompleted =
    nonDailyMatchesCount + streakStats.totalSolved;

  return {
    avgArithmeticAccuracy,
    accuracyDelta,
    arithmeticSessionCount: accuracySeries.length,
    totalProblemsSolved,
    avgPacePerMinute,
    dailySolvedCount: streakStats.totalSolved,
    dailyAttemptedCount: dailyCompletions.length,
    currentDailyStreak: streakStats.currentStreak,
    bestDailyStreak: streakStats.bestStreak,
    totalChallengesCompleted,
  };
}
