import { computeDailyStreakStats, getLocalDateKey } from './daily-challenge';
import { isSampleMatch } from './notebook-analytics';
import type { DailyChallengeCompletion, MatchRecord } from './types';

export const DAILY_PROBLEM_GOAL = 10;

export interface DailyGoalProgress {
  todayDateKey: string;
  problemsSolvedToday: number;
  dailyProblemGoal: number;
  problemsRemaining: number;
  ringPercent: number;
  goalMetToday: boolean;
  dailyStreak: number;
  bestDailyStreak: number;
  solvedDailyToday: boolean;
  nextStreakBadgeTitle: string;
  nextStreakTargetDays: number;
  streakDaysRemaining: number;
  headlineNote: string;
}

/**
 * Counts how many problems/rounds the student completed on a given local date key
 * across Core Arithmetic, Daily Challenges, Factor Grid, Equation Foundry, and Odds & Urns.
 */
export function countProblemsSolvedOnDate(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  dateKey: string
): number {
  let count = 0;

  for (const m of matches) {
    if (isSampleMatch(m)) continue;
    if (m.dailyMeta) continue; // counted cleanly via dailyCompletions below
    const playedDateKey = getLocalDateKey(new Date(m.playedAt));
    if (playedDateKey !== dateKey) continue;

    let baseCredit = 3; // Factor Grid completed match
    if (m.arithmeticMeta) {
      baseCredit = Math.max(0, m.arithmeticMeta.solved);
    } else if (m.gameTitle === 'Equation Foundry' || m.gameTitle === 'Odds & Urns') {
      baseCredit = 5; // 5-round session
    }
    const mult =
      m.dailyMilestoneMultiplier && m.dailyMilestoneMultiplier > 1
        ? m.dailyMilestoneMultiplier
        : 1;
    count += Math.round(baseCredit * mult);
  }

  for (const dc of dailyCompletions) {
    if (dc.dateKey === dateKey && dc.solved) {
      count += 3; // 3-clue chained daily puzzle
    }
  }

  return count;
}

/**
 * Computes StudioHub's Daily Goal progress ring metrics and consecutive daily
 * streak milestone targets.
 */
export function computeDailyGoalProgress(params: {
  matches: MatchRecord[];
  dailyCompletions: DailyChallengeCompletion[];
  todayKey?: string;
  dailyProblemGoal?: number;
}): DailyGoalProgress {
  const todayDateKey = params.todayKey ?? getLocalDateKey();
  const goal = params.dailyProblemGoal ?? DAILY_PROBLEM_GOAL;

  const problemsSolvedToday = countProblemsSolvedOnDate(
    params.matches,
    params.dailyCompletions,
    todayDateKey
  );
  const problemsRemaining = Math.max(0, goal - problemsSolvedToday);
  const ringPercent = Math.min(
    100,
    Math.round((problemsSolvedToday / Math.max(1, goal)) * 100)
  );
  const goalMetToday = problemsRemaining === 0;

  const streakStats = computeDailyStreakStats(
    params.dailyCompletions,
    todayDateKey
  );

  // Determine the next streak badge milestone (3-day Three-Day Scholar -> 7-day -> 14-day)
  let nextStreakBadgeTitle = 'Three-Day Scholar Seal';
  let nextStreakTargetDays = 3;
  if (streakStats.currentStreak >= 7) {
    nextStreakBadgeTitle = '14-Day Master Flame';
    nextStreakTargetDays = 14;
  } else if (streakStats.currentStreak >= 3) {
    nextStreakBadgeTitle = '7-Day Consistent Compass';
    nextStreakTargetDays = 7;
  }

  const streakDaysRemaining = Math.max(
    0,
    nextStreakTargetDays - streakStats.currentStreak
  );

  const headlineNote = goalMetToday
    ? streakStats.solvedToday
      ? 'Daily problem target & Daily Challenge stamped!'
      : 'Daily problem goal met — solve Today’s Daily to extend your flame.'
    : `${problemsRemaining} more ${problemsRemaining === 1 ? 'problem' : 'problems'} today to fill your Daily Ring.`;

  return {
    todayDateKey,
    problemsSolvedToday,
    dailyProblemGoal: goal,
    problemsRemaining,
    ringPercent,
    goalMetToday,
    dailyStreak: streakStats.currentStreak,
    bestDailyStreak: streakStats.bestStreak,
    solvedDailyToday: streakStats.solvedToday,
    nextStreakBadgeTitle,
    nextStreakTargetDays,
    streakDaysRemaining,
    headlineNote,
  };
}
