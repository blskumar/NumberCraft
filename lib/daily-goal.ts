import { computeDailyStreakStats, getLocalDateKey } from './daily-challenge';
import { isSampleMatch } from './notebook-analytics';
import type { DailyChallengeCompletion, MatchRecord } from './types';

export const DAILY_PROBLEM_GOAL = 10;
export const MIN_DAILY_PROBLEM_GOAL = 5;
export const MAX_DAILY_PROBLEM_GOAL = 100;
export const DAILY_GOAL_PRESETS = [10, 15, 25, 40] as const;

export function clampDailyProblemGoal(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DAILY_PROBLEM_GOAL;
  }
  const rounded = Math.round(value);
  return Math.min(
    MAX_DAILY_PROBLEM_GOAL,
    Math.max(MIN_DAILY_PROBLEM_GOAL, rounded)
  );
}

export interface TodayProblemBreakdown {
  arithmeticProblems: number;
  dailyChallengeProblems: number;
  arenaProblems: number;
  totalProblems: number;
}

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

/** Real solved-problem count for a Foundry / Odds match (legacy records: 1 per win). */
function matchSolvedProblems(m: MatchRecord): number {
  const n = m.solvedProblems;
  if (typeof n === 'number' && Number.isFinite(n)) return Math.max(0, Math.floor(n));
  return m.result === 'win' ? 1 : 0;
}

/**
 * Returns a per-source breakdown of problems/rounds completed on a given local date key
 * across Core Arithmetic, Daily Challenges, Factor Grid, Equation Foundry, and Odds & Urns.
 */
export function getTodayProblemBreakdown(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  dateKey: string,
  includeSampleMatches: boolean = false
): TodayProblemBreakdown {
  let arithmeticProblems = 0;
  let dailyChallengeProblems = 0;
  let arenaProblems = 0;

  for (const m of matches) {
    if (!includeSampleMatches && isSampleMatch(m)) continue;
    if (m.dailyMeta) continue; // counted cleanly via dailyCompletions below
    const playedDateKey = getLocalDateKey(new Date(m.playedAt));
    if (playedDateKey !== dateKey) continue;

    // The milestone multiplier boosts points, never the count of real problems solved.
    if (m.arithmeticMeta) {
      const solved = m.arithmeticMeta.solved;
      arithmeticProblems += Number.isFinite(solved) ? Math.max(0, solved) : 0;
    } else if (
      m.gameTitle === 'Equation Foundry' ||
      m.gameTitle === 'Odds & Urns'
    ) {
      // Only real solves count: a lost match with no solves earns nothing.
      arenaProblems += matchSolvedProblems(m);
    } else {
      arenaProblems += 3;
    }
  }

  const creditedDays = new Set<string>();
  for (const dc of dailyCompletions) {
    if ((!includeSampleMatches && dc.isSample === true) || dc.dateKey !== dateKey || !dc.solved) continue;
    if (creditedDays.has(dc.dateKey)) continue; // duplicate same-day entries count once
    creditedDays.add(dc.dateKey);
    dailyChallengeProblems += 3; // 3-clue chained daily puzzle
  }

  return {
    arithmeticProblems,
    dailyChallengeProblems,
    arenaProblems,
    totalProblems: arithmeticProblems + dailyChallengeProblems + arenaProblems,
  };
}

/**
 * Counts how many problems/rounds the student completed on a given local date key
 * across Core Arithmetic, Daily Challenges, Factor Grid, Equation Foundry, and Odds & Urns.
 */
export function countProblemsSolvedOnDate(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  dateKey: string,
  includeSampleMatches: boolean = false
): number {
  return getTodayProblemBreakdown(
    matches,
    dailyCompletions,
    dateKey,
    includeSampleMatches
  ).totalProblems;
}

/**
 * Computes Daily Goal progress ring metrics and consecutive daily
 * streak milestone targets.
 */
export function computeDailyGoalProgress(params: {
  matches: MatchRecord[];
  dailyCompletions: DailyChallengeCompletion[];
  todayKey?: string;
  dailyProblemGoal?: number;
  includeSampleMatches?: boolean;
}): DailyGoalProgress {
  const todayDateKey = params.todayKey ?? getLocalDateKey();
  const goal =
    params.dailyProblemGoal !== undefined
      ? clampDailyProblemGoal(params.dailyProblemGoal)
      : DAILY_PROBLEM_GOAL;

  const problemsSolvedToday = countProblemsSolvedOnDate(
    params.matches,
    params.dailyCompletions,
    todayDateKey,
    Boolean(params.includeSampleMatches)
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

  // Only seals that exist in ACHIEVEMENT_CATALOG may be named; the streak seal is Three-Day Scholar.
  const nextStreakBadgeTitle = 'Three-Day Scholar';
  const nextStreakTargetDays = 3;

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
