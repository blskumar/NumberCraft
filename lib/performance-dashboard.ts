import { ARITHMETIC_GAMES } from './arithmetic-engine';
import {
  computeDailyStreakStats,
  getEditionNumber,
  getLocalDateKey,
  shiftDateKey,
} from './daily-challenge';
import { TIER_SPECS } from './factor-grid-engine';
import type {
  AgeTier,
  ArithmeticGameId,
  DailyChallengeCompletion,
  MatchRecord,
} from './types';

export type DashboardGameFilter = 'all' | ArithmeticGameId;
export type DashboardTierFilter = 'all' | AgeTier;

export interface ArithmeticAccuracyPoint {
  index: number;
  label: string;
  dateLabel: string;
  playedAt: string;
  gameId: ArithmeticGameId;
  gameTitle: string;
  tier: AgeTier;
  tierLabel: string;
  accuracyPercent: number;
  rollingAccuracy: number;
  solved: number;
  attempted: number;
  pacePerMinute: number;
  bestStreak: number;
  adaptiveLevel: number;
  score: number;
}

export interface ArithmeticGameSummary {
  gameId: ArithmeticGameId;
  title: string;
  accentHex: string;
  sessions: number;
  avgAccuracy: number | null;
  bestAccuracy: number | null;
  totalSolved: number;
  avgPacePerMinute: number | null;
  peakAdaptiveLevel: number | null;
}

export interface DailyCompletionHistoryBucket {
  dateKey: string;
  dateLabel: string;
  shortDay: string;
  isToday: boolean;
  dailySolved: number;
  dailyScore: number;
  dailySecondsUsed: number;
  arithmeticRounds: number;
  factorGridRounds: number;
  totalChallenges: number;
}

export interface DailyScoreSpeedPoint {
  index: number;
  editionLabel: string;
  dateLabel: string;
  archetypeTitle: string;
  score: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  solved: boolean;
  mistakes: number;
  hintsUsed: number;
  streakBonus: number;
}

export interface DashboardOverviewStats {
  avgArithmeticAccuracy: number | null;
  accuracyDelta: number | null;
  arithmeticSessionCount: number;
  totalProblemsSolved: number;
  avgPacePerMinute: number | null;
  dailySolvedCount: number;
  dailyAttemptedCount: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  totalChallengesCompleted: number;
}

export type DailyConsistencyStatus = 'solved' | 'attempted' | 'missed';

export interface DailyFrequency30DayPoint {
  index: number;
  dateKey: string;
  dateLabel: string;
  shortDay: string;
  dayOfMonth: string;
  isToday: boolean;
  status: DailyConsistencyStatus;
  completedCount: number;
  barHeight: number;
  editionNumber: number | null;
  archetypeTitle: string | null;
  score: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  mistakes: number;
  hintsUsed: number;
}

export interface WeeklyConsistencyBucket {
  periodIndex: number;
  label: string;
  rangeLabel: string;
  completedDays: number;
  attemptedDays: number;
  totalDays: number;
  completionRatePercent: number;
}

export interface DailyConsistency30DayData {
  points: DailyFrequency30DayPoint[];
  weeklyBuckets: WeeklyConsistencyBucket[];
  solvedDays: number;
  attemptedOnlyDays: number;
  missedDays: number;
  consistencyPercent: number;
  longestRunIn30Days: number;
  activeDaysIn30Days: number;
  startDateLabel: string;
  endDateLabel: string;
}

export type DailyGoalRateStatus = 'met' | 'partial' | 'missed';

export interface DailyGoalRateDayPoint {
  index: number;
  dateKey: string;
  dateLabel: string;
  shortDay: string;
  isToday: boolean;
  status: DailyGoalRateStatus;
  completionRatePercent: number;
  rolling7DayRatePercent: number;
  stepsSolved: number;
  editionNumber: number | null;
  archetypeTitle: string | null;
  score: number;
}

export interface DailyGoalRatePeriodBucket {
  periodIndex: number;
  label: string;
  rangeLabel: string;
  daysMet: number;
  partialDays: number;
  totalDays: number;
  completionRatePercent: number;
  avgDailyRatePercent: number;
}

export interface DailyGoalCompletionRate30DayData {
  points: DailyGoalRateDayPoint[];
  periodBuckets: DailyGoalRatePeriodBucket[];
  daysMet: number;
  partialDays: number;
  missedDays: number;
  overallCompletionRatePercent: number;
  avgDailyRatePercent: number;
  last7DaysRatePercent: number;
  bestBlockRatePercent: number;
  startDateLabel: string;
  endDateLabel: string;
}

export interface StreakMasteryMilestone {
  streakDay: number;
  title: string;
  shortLabel: string;
}

export const STREAK_MASTERY_MILESTONES: readonly StreakMasteryMilestone[] = [
  {
    streakDay: 3,
    title: 'Three-Day Scholar',
    shortLabel: '3d Seal',
  },
  {
    streakDay: 7,
    title: 'Weekly Tactician',
    shortLabel: '7d Mastery',
  },
  {
    streakDay: 14,
    title: 'Fortnight Savant',
    shortLabel: '14d Mastery',
  },
  {
    streakDay: 30,
    title: 'Studio Grandmaster',
    shortLabel: '30d Mastery',
  },
] as const;

export function getStreakMasteryMilestone(
  streakLength: number
): StreakMasteryMilestone | null {
  return (
    STREAK_MASTERY_MILESTONES.find((m) => m.streakDay === streakLength) ?? null
  );
}

export interface DailyStreakDurationPoint {
  index: number;
  dateKey: string;
  dateLabel: string;
  shortDay: string;
  isToday: boolean;
  solved: boolean;
  streakLength: number;
  isPeakPoint: boolean;
  inPeakPeriod: boolean;
  isMasteryMilestone: boolean;
  milestone: StreakMasteryMilestone | null;
  editionNumber: number | null;
  archetypeTitle: string | null;
  score: number;
}

export interface PeakStreakPeriod {
  startDateKey: string;
  endDateKey: string;
  startLabel: string;
  endLabel: string;
  peakLength: number;
}

export interface DailyStreakTrendData {
  points: DailyStreakDurationPoint[];
  peakPeriods: PeakStreakPeriod[];
  milestoneDays: DailyStreakDurationPoint[];
  nextMilestoneTarget: StreakMasteryMilestone | null;
  peakStreakDuration: number;
  currentStreakDuration: number;
  averageRunLength: number;
  activeStreakDays: number;
  windowDays: number;
  startDateLabel: string;
  endDateLabel: string;
}

export type StreakGrowthReason =
  | 'mastery-milestone'
  | 'daily-milestone-arena'
  | 'consecutive-streak'
  | 'daily-goal-success';

export interface StreakGrowthTriggerSnapshot {
  currentStreakDuration: number;
  milestoneCount: number;
  dailyGoalMetToday: boolean;
  dailyMilestoneCompletedToday: boolean;
}

export interface StreakGrowthEvent {
  triggered: boolean;
  reason: StreakGrowthReason | null;
  bannerText: string | null;
}

/**
 * Detects whether a new daily Mastery Milestone, Daily Milestone arena win,
 * consecutive streak increase, or Daily Goal success was just recorded so the
 * streak line chart can play its celebratory CSS "growing" highlight animation.
 */
export function detectStreakGrowthEvent(
  prev: StreakGrowthTriggerSnapshot | null,
  next: StreakGrowthTriggerSnapshot
): StreakGrowthEvent {
  if (!prev) {
    if (next.milestoneCount > 0 && next.currentStreakDuration >= 3) {
      return {
        triggered: true,
        reason: 'mastery-milestone',
        bannerText: `Mastery Milestone active (${next.currentStreakDuration}d streak) — curve highlighted!`,
      };
    }
    if (next.dailyMilestoneCompletedToday) {
      return {
        triggered: true,
        reason: 'daily-milestone-arena',
        bannerText: 'Today’s Daily Milestone completed — 1.5× momentum active!',
      };
    }
    if (next.dailyGoalMetToday) {
      return {
        triggered: true,
        reason: 'daily-goal-success',
        bannerText: 'Daily Goal target met — streak momentum highlighted!',
      };
    }
    return { triggered: false, reason: null, bannerText: null };
  }

  if (next.milestoneCount > prev.milestoneCount) {
    return {
      triggered: true,
      reason: 'mastery-milestone',
      bannerText: `New Mastery Milestone recorded (${next.currentStreakDuration}d streak)!`,
    };
  }
  if (next.dailyMilestoneCompletedToday && !prev.dailyMilestoneCompletedToday) {
    return {
      triggered: true,
      reason: 'daily-milestone-arena',
      bannerText: 'Daily Milestone Arena completed — 1.5× streak boost recorded!',
    };
  }
  if (
    next.currentStreakDuration > prev.currentStreakDuration &&
    next.currentStreakDuration >= 2
  ) {
    return {
      triggered: true,
      reason: 'consecutive-streak',
      bannerText: `Consecutive streak grew to ${next.currentStreakDuration} days!`,
    };
  }
  if (next.dailyGoalMetToday && !prev.dailyGoalMetToday) {
    return {
      triggered: true,
      reason: 'daily-goal-success',
      bannerText: 'Daily Goal reached — consecutive goal momentum growing!',
    };
  }

  return { triggered: false, reason: null, bannerText: null };
}

function toLocalDateKeyFromIso(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getLocalDateKey(parsed);
}

function formatMonthDayFromDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatMonthDayFromIso(iso: string, fallback: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function buildArithmeticAccuracySeries(
  matches: MatchRecord[],
  gameFilter: DashboardGameFilter = 'all',
  tierFilter: DashboardTierFilter = 'all'
): ArithmeticAccuracyPoint[] {
  const relevant = matches
    .filter((m) => {
      if (!m.arithmeticMeta || m.arithmeticMeta.attempted <= 0) return false;
      const gameOk =
        gameFilter === 'all' || m.arithmeticMeta.gameId === gameFilter;
      const tierOk = tierFilter === 'all' || m.tier === tierFilter;
      return gameOk && tierOk;
    })
    .sort((a, b) => {
      // unparseable dates sort last so the order of valid sessions never depends on input order
      const tA = finiteOr(new Date(a.playedAt).getTime(), Infinity);
      const tB = finiteOr(new Date(b.playedAt).getTime(), Infinity);
      return tA === tB ? 0 : tA < tB ? -1 : 1;
    });

  return relevant.map((m, idx) => {
    const meta = m.arithmeticMeta!;
    const windowStart = Math.max(0, idx - 2);
    const windowSlice = relevant.slice(windowStart, idx + 1);
    const rollingAccuracy = Math.round(
      windowSlice.reduce(
        (sum, item) => sum + (item.arithmeticMeta?.accuracyPercent ?? 0),
        0
      ) / windowSlice.length
    );
    const pacePerMinute =
      meta.durationSeconds > 0
        ? Math.round((meta.solved / meta.durationSeconds) * 60)
        : meta.solved;

    return {
      index: idx + 1,
      label: `#${idx + 1}`,
      dateLabel: formatMonthDayFromIso(m.playedAt, `#${idx + 1}`),
      playedAt: m.playedAt,
      gameId: meta.gameId,
      gameTitle: ARITHMETIC_GAMES[meta.gameId].title,
      tier: m.tier,
      tierLabel: TIER_SPECS[m.tier].label,
      accuracyPercent: meta.accuracyPercent,
      rollingAccuracy,
      solved: meta.solved,
      attempted: meta.attempted,
      pacePerMinute,
      bestStreak: meta.bestStreak,
      adaptiveLevel: meta.endAdaptiveLevel ?? meta.maxStageReached ?? 2,
      score: m.playerScore,
    };
  });
}

export function buildArithmeticGameBreakdown(
  matches: MatchRecord[],
  tierFilter: DashboardTierFilter = 'all'
): ArithmeticGameSummary[] {
  const order: ArithmeticGameId[] = [
    'addition-attack',
    'subtraction-sprint',
    'multiplication-mastery',
  ];

  return order.map((gameId) => {
    const spec = ARITHMETIC_GAMES[gameId];
    const items = matches.filter(
      (m) =>
        m.arithmeticMeta &&
        m.arithmeticMeta.gameId === gameId &&
        m.arithmeticMeta.attempted > 0 &&
        (tierFilter === 'all' || m.tier === tierFilter)
    );

    if (items.length === 0) {
      return {
        gameId,
        title: spec.title,
        accentHex: spec.accentHex,
        sessions: 0,
        avgAccuracy: null,
        bestAccuracy: null,
        totalSolved: 0,
        avgPacePerMinute: null,
        peakAdaptiveLevel: null,
      };
    }

    const totalAcc = items.reduce(
      (sum, m) => sum + (m.arithmeticMeta?.accuracyPercent ?? 0),
      0
    );
    const bestAccuracy = items.reduce(
      (max, m) => Math.max(max, m.arithmeticMeta?.accuracyPercent ?? 0),
      0
    );
    const totalSolved = items.reduce(
      (sum, m) => sum + (m.arithmeticMeta?.solved ?? 0),
      0
    );
    const totalPace = items.reduce((sum, m) => {
      const meta = m.arithmeticMeta!;
      const pace =
        meta.durationSeconds > 0
          ? (meta.solved / meta.durationSeconds) * 60
          : meta.solved;
      return sum + pace;
    }, 0);
    const peakAdaptiveLevel = items.reduce((max, m) => {
      const lvl =
        m.arithmeticMeta?.peakAdaptiveLevel ??
        m.arithmeticMeta?.endAdaptiveLevel ??
        m.arithmeticMeta?.maxStageReached ??
        1;
      return Math.max(max, lvl);
    }, 1);

    return {
      gameId,
      title: spec.title,
      accentHex: spec.accentHex,
      sessions: items.length,
      avgAccuracy: Math.round(totalAcc / items.length),
      bestAccuracy,
      totalSolved,
      avgPacePerMinute: Math.round(totalPace / items.length),
      peakAdaptiveLevel,
    };
  });
}

export function buildChallengeCompletionHistory(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey(),
  days: number = 14
): DailyCompletionHistoryBucket[] {
  const safeDays = Math.max(7, Math.min(30, finiteOr(days, 14)));
  const dailyByDate = indexDailyByDate(dailyCompletions);

  const arithByDate = new Map<string, number>();
  const factorByDate = new Map<string, number>();

  for (const m of matches) {
    const key = m.dailyMeta?.dateKey ?? toLocalDateKeyFromIso(m.playedAt);
    if (!key) continue;
    if (m.arithmeticMeta) {
      arithByDate.set(key, (arithByDate.get(key) ?? 0) + 1);
    } else if (!m.dailyMeta) {
      factorByDate.set(key, (factorByDate.get(key) ?? 0) + 1);
    }
  }

  const buckets: DailyCompletionHistoryBucket[] = [];
  for (let offset = -(safeDays - 1); offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });

    const daily = dailyByDate.get(dateKey);
    const dailySolved = daily?.solved ? 1 : 0;
    const arithmeticRounds = arithByDate.get(dateKey) ?? 0;
    const factorGridRounds = factorByDate.get(dateKey) ?? 0;

    buckets.push({
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      isToday: dateKey === todayKey,
      dailySolved,
      dailyScore: daily?.solved ? daily.score : 0,
      dailySecondsUsed: daily?.solved ? daily.secondsUsed : 0,
      arithmeticRounds,
      factorGridRounds,
      totalChallenges: dailySolved + arithmeticRounds + factorGridRounds,
    });
  }

  return buckets;
}

export function buildDailyScoreSpeedSeries(
  dailyCompletions: DailyChallengeCompletion[]
): DailyScoreSpeedPoint[] {
  const sorted = [...dailyCompletions].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  return sorted.map((c, idx) => ({
    index: idx + 1,
    editionLabel: `#${c.editionNumber}`,
    dateLabel: formatMonthDayFromDateKey(c.dateKey),
    archetypeTitle: c.archetypeTitle,
    score: c.score,
    secondsUsed: c.secondsUsed,
    timeLimitSeconds: c.timeLimitSeconds,
    solved: c.solved,
    mistakes: c.mistakes,
    hintsUsed: c.hintsUsed,
    streakBonus: c.streakBonus ?? 0,
  }));
}

export function buildDailyChallenge30DayFrequency(
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DailyConsistency30DayData {
  const dailyByDate = indexDailyByDate(dailyCompletions);

  const points: DailyFrequency30DayPoint[] = [];
  let solvedDays = 0;
  let attemptedOnlyDays = 0;
  let longestRunIn30Days = 0;
  let currentRun = 0;

  for (let offset = -29; offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const entry = dailyByDate.get(dateKey);

    let status: DailyConsistencyStatus = 'missed';
    let completedCount = 0;
    let barHeight = 0.08;

    if (entry?.solved) {
      status = 'solved';
      completedCount = 1;
      barHeight = 1;
      solvedDays += 1;
      currentRun += 1;
      if (currentRun > longestRunIn30Days) {
        longestRunIn30Days = currentRun;
      }
    } else if (entry) {
      status = 'attempted';
      completedCount = 0;
      barHeight = 0.42;
      attemptedOnlyDays += 1;
      currentRun = 0;
    } else {
      currentRun = 0;
    }

    points.push({
      index: offset + 30,
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      dayOfMonth: String(parts[2] ?? ''),
      isToday: dateKey === todayKey,
      status,
      completedCount,
      barHeight,
      editionNumber: entry?.editionNumber ?? null,
      archetypeTitle: entry?.archetypeTitle ?? null,
      score: entry?.score ?? 0,
      secondsUsed: entry?.secondsUsed ?? 0,
      timeLimitSeconds: entry?.timeLimitSeconds ?? 0,
      mistakes: entry?.mistakes ?? 0,
      hintsUsed: entry?.hintsUsed ?? 0,
    });
  }

  const weeklyBuckets: WeeklyConsistencyBucket[] = [];
  const bucketSize = 6;
  for (let b = 0; b < 5; b += 1) {
    const slice = points.slice(b * bucketSize, (b + 1) * bucketSize);
    const completedDays = slice.filter((p) => p.status === 'solved').length;
    const attemptedDays = slice.filter((p) => p.status === 'attempted').length;
    const first = slice[0];
    const last = slice[slice.length - 1];
    weeklyBuckets.push({
      periodIndex: b + 1,
      label: `Days ${b * bucketSize + 1}–${(b + 1) * bucketSize}`,
      rangeLabel:
        first && last ? `${first.dateLabel} – ${last.dateLabel}` : `Block ${b + 1}`,
      completedDays,
      attemptedDays,
      totalDays: slice.length,
      completionRatePercent: Math.round((completedDays / slice.length) * 100),
    });
  }

  const missedDays = 30 - solvedDays - attemptedOnlyDays;

  return {
    points,
    weeklyBuckets,
    solvedDays,
    attemptedOnlyDays,
    missedDays,
    consistencyPercent: Math.round((solvedDays / 30) * 100),
    longestRunIn30Days,
    activeDaysIn30Days: solvedDays + attemptedOnlyDays,
    startDateLabel: points[0]?.dateLabel ?? todayKey,
    endDateLabel: points[points.length - 1]?.dateLabel ?? todayKey,
  };
}

/**
 * Computes a 30-day Daily Goal Completion Rate series directly from dailyCompletions.
 * Each calendar day records 100% when solved (3/3 clues), partial progress percentage
 * (stepsSolved / 3) when attempted without finishing, or 0% when missed, alongside
 * trailing 7-day rolling completion rates and five 6-day block completion rates.
 */
export function buildDailyGoalCompletionRate30Day(
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DailyGoalCompletionRate30DayData {
  const dailyByDate = indexDailyByDate(dailyCompletions);

  const rawPoints: Omit<DailyGoalRateDayPoint, 'rolling7DayRatePercent'>[] = [];
  let daysMet = 0;
  let partialDays = 0;

  for (let offset = -29; offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const entry = dailyByDate.get(dateKey);

    let status: DailyGoalRateStatus = 'missed';
    let completionRatePercent = 0;
    let stepsSolved = 0;

    if (entry?.solved) {
      status = 'met';
      completionRatePercent = 100;
      stepsSolved = Math.max(3, finiteOr(entry.stepsSolved, 3));
      daysMet += 1;
    } else if (entry) {
      status = 'partial';
      stepsSolved = Math.max(0, Math.min(3, Math.round(finiteOr(entry.stepsSolved, 0))));
      completionRatePercent = Math.min(
        99,
        Math.round((stepsSolved / 3) * 100)
      );
      partialDays += 1;
    }

    rawPoints.push({
      index: offset + 30,
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      isToday: dateKey === todayKey,
      status,
      completionRatePercent,
      stepsSolved,
      editionNumber: entry?.editionNumber ?? null,
      archetypeTitle: entry?.archetypeTitle ?? null,
      score: entry?.score ?? 0,
    });
  }

  const points: DailyGoalRateDayPoint[] = rawPoints.map((pt, idx) => {
    const startIdx = Math.max(0, idx - 6);
    const windowSlice = rawPoints.slice(startIdx, idx + 1);
    const metInWindow = windowSlice.filter((p) => p.status === 'met').length;
    const rolling7DayRatePercent = Math.round(
      (metInWindow / windowSlice.length) * 100
    );
    return {
      ...pt,
      rolling7DayRatePercent,
    };
  });

  const periodBuckets: DailyGoalRatePeriodBucket[] = [];
  const bucketSize = 6;
  for (let b = 0; b < 5; b += 1) {
    const slice = points.slice(b * bucketSize, (b + 1) * bucketSize);
    const bucketMet = slice.filter((p) => p.status === 'met').length;
    const bucketPartial = slice.filter((p) => p.status === 'partial').length;
    const avgDailyRatePercent = Math.round(
      slice.reduce((sum, p) => sum + p.completionRatePercent, 0) / slice.length
    );
    const first = slice[0];
    const last = slice[slice.length - 1];
    periodBuckets.push({
      periodIndex: b + 1,
      label: `Days ${b * bucketSize + 1}–${(b + 1) * bucketSize}`,
      rangeLabel:
        first && last
          ? `${first.dateLabel} – ${last.dateLabel}`
          : `Block ${b + 1}`,
      daysMet: bucketMet,
      partialDays: bucketPartial,
      totalDays: slice.length,
      completionRatePercent: Math.round((bucketMet / slice.length) * 100),
      avgDailyRatePercent,
    });
  }

  const missedDays = 30 - daysMet - partialDays;
  const overallCompletionRatePercent = Math.round((daysMet / 30) * 100);
  const avgDailyRatePercent = Math.round(
    points.reduce((sum, p) => sum + p.completionRatePercent, 0) / 30
  );
  const last7Slice = points.slice(-7);
  const last7DaysRatePercent = Math.round(
    (last7Slice.filter((p) => p.status === 'met').length / last7Slice.length) *
      100
  );
  const bestBlockRatePercent = periodBuckets.reduce(
    (max, b) => Math.max(max, b.completionRatePercent),
    0
  );

  return {
    points,
    periodBuckets,
    daysMet,
    partialDays,
    missedDays,
    overallCompletionRatePercent,
    avgDailyRatePercent,
    last7DaysRatePercent,
    bestBlockRatePercent,
    startDateLabel: points[0]?.dateLabel ?? todayKey,
    endDateLabel: points[points.length - 1]?.dateLabel ?? todayKey,
  };
}

export function buildDailyStreakDurationSeries(
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey(),
  days: number = 30
): DailyStreakTrendData {
  const safeDays = Math.max(7, Math.min(90, Math.floor(finiteOr(days, 30))));
  const dailyByDate = indexDailyByDate(dailyCompletions);
  const solvedDates = new Set<string>();

  for (const c of dailyCompletions) {
    if (c.solved) {
      solvedDates.add(c.dateKey);
    }
  }

  // Compute exact streak entering the first day of the window
  const firstWindowDate = shiftDateKey(todayKey, -(safeDays - 1));
  let priorStreak = 0;
  let probe = shiftDateKey(firstWindowDate, -1);
  while (solvedDates.has(probe)) {
    priorStreak += 1;
    probe = shiftDateKey(probe, -1);
  }

  const rawPoints: Omit<
    DailyStreakDurationPoint,
    'isPeakPoint' | 'inPeakPeriod' | 'isMasteryMilestone' | 'milestone'
  >[] = [];
  let running = priorStreak;
  let peakStreakDuration = 0;
  let activeStreakDays = 0;

  for (let offset = -(safeDays - 1); offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const entry = dailyByDate.get(dateKey);
    const solved = Boolean(entry?.solved);

    if (solved) {
      running += 1;
      activeStreakDays += 1;
      if (running > peakStreakDuration) {
        peakStreakDuration = running;
      }
    } else {
      running = 0;
    }

    rawPoints.push({
      index: offset + safeDays,
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      isToday: dateKey === todayKey,
      solved,
      streakLength: running,
      editionNumber: entry?.editionNumber ?? null,
      archetypeTitle: entry?.archetypeTitle ?? null,
      score: entry?.score ?? 0,
    });
  }

  // Segment contiguous solved runs to identify peak streak periods & average run length
  interface RunSpan {
    startIdx: number;
    endIdx: number;
    maxLength: number;
  }
  const runs: RunSpan[] = [];
  let runStart = -1;
  let runMax = 0;

  for (let i = 0; i < rawPoints.length; i += 1) {
    const pt = rawPoints[i];
    if (pt.solved) {
      if (runStart === -1) {
        runStart = i;
        runMax = pt.streakLength;
      } else if (pt.streakLength > runMax) {
        runMax = pt.streakLength;
      }
    } else if (runStart !== -1) {
      runs.push({ startIdx: runStart, endIdx: i - 1, maxLength: runMax });
      runStart = -1;
      runMax = 0;
    }
  }
  if (runStart !== -1) {
    runs.push({
      startIdx: runStart,
      endIdx: rawPoints.length - 1,
      maxLength: runMax,
    });
  }

  const peakRunIndexSet = new Set<number>();
  const peakPeriods: PeakStreakPeriod[] = [];

  if (peakStreakDuration > 0) {
    for (const run of runs) {
      if (run.maxLength === peakStreakDuration) {
        for (let idx = run.startIdx; idx <= run.endIdx; idx += 1) {
          peakRunIndexSet.add(idx);
        }
        const first = rawPoints[run.startIdx];
        const last = rawPoints[run.endIdx];
        peakPeriods.push({
          startDateKey: first.dateKey,
          endDateKey: last.dateKey,
          startLabel: first.dateLabel,
          endLabel: last.dateLabel,
          peakLength: run.maxLength,
        });
      }
    }
  }

  const points: DailyStreakDurationPoint[] = rawPoints.map((pt, idx) => {
    const milestone = pt.solved
      ? getStreakMasteryMilestone(pt.streakLength)
      : null;
    return {
      ...pt,
      isPeakPoint:
        peakStreakDuration > 0 && pt.streakLength === peakStreakDuration,
      inPeakPeriod: peakRunIndexSet.has(idx),
      isMasteryMilestone: milestone !== null,
      milestone,
    };
  });

  const milestoneDays = points.filter((p) => p.isMasteryMilestone);

  const lastPt = points[points.length - 1];
  const prevPt = points.length >= 2 ? points[points.length - 2] : null;
  const currentStreakDuration =
    lastPt && lastPt.streakLength > 0
      ? lastPt.streakLength
      : prevPt?.streakLength ?? 0;

  const nextMilestoneTarget =
    STREAK_MASTERY_MILESTONES.find(
      (m) => m.streakDay > currentStreakDuration
    ) ?? null;

  const averageRunLength =
    runs.length > 0
      ? Number(
          (
            runs.reduce((sum, r) => sum + r.maxLength, 0) / runs.length
          ).toFixed(1)
        )
      : 0;

  return {
    points,
    peakPeriods,
    milestoneDays,
    nextMilestoneTarget,
    peakStreakDuration,
    currentStreakDuration,
    averageRunLength,
    activeStreakDays,
    windowDays: safeDays,
    startDateLabel: points[0]?.dateLabel ?? todayKey,
    endDateLabel: points[points.length - 1]?.dateLabel ?? todayKey,
  };
}

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

/** One completion per day; a later failed retry never hides an earlier solve. */
function indexDailyByDate(
  completions: DailyChallengeCompletion[]
): Map<string, DailyChallengeCompletion> {
  const byDate = new Map<string, DailyChallengeCompletion>();
  for (const c of completions) {
    const cur = byDate.get(c.dateKey);
    if (!(cur?.solved && !c.solved)) byDate.set(c.dateKey, c);
  }
  return byDate;
}

const finiteOr = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);

export function isSampleDailyCompletion(c: DailyChallengeCompletion): boolean {
  return c.isSample === true;
}

export function createSampleDashboardData(
  todayKey: string = getLocalDateKey()
): {
  sampleMatches: MatchRecord[];
  sampleDaily: DailyChallengeCompletion[];
} {
  const arithSpecs: {
    daysAgo: number;
    gameId: ArithmeticGameId;
    tier: AgeTier;
    solved: number;
    attempted: number;
    durationSeconds: number;
    score: number;
    startLvl: number;
    endLvl: number;
    peakLvl: number;
  }[] = [
    {
      daysAgo: 12,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 10,
      attempted: 14,
      durationSeconds: 60,
      score: 112,
      startLvl: 2,
      endLvl: 2,
      peakLvl: 2,
    },
    {
      daysAgo: 10,
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      solved: 11,
      attempted: 14,
      durationSeconds: 60,
      score: 126,
      startLvl: 2,
      endLvl: 2,
      peakLvl: 3,
    },
    {
      daysAgo: 9,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 12,
      attempted: 15,
      durationSeconds: 60,
      score: 142,
      startLvl: 1,
      endLvl: 2,
      peakLvl: 2,
    },
    {
      daysAgo: 7,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 14,
      attempted: 16,
      durationSeconds: 60,
      score: 168,
      startLvl: 2,
      endLvl: 3,
      peakLvl: 3,
    },
    {
      daysAgo: 5,
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      solved: 15,
      attempted: 17,
      durationSeconds: 60,
      score: 184,
      startLvl: 2,
      endLvl: 3,
      peakLvl: 4,
    },
    {
      daysAgo: 3,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 16,
      attempted: 17,
      durationSeconds: 60,
      score: 212,
      startLvl: 2,
      endLvl: 4,
      peakLvl: 4,
    },
    {
      daysAgo: 2,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 18,
      attempted: 19,
      durationSeconds: 60,
      score: 244,
      startLvl: 3,
      endLvl: 4,
      peakLvl: 4,
    },
    {
      daysAgo: 1,
      gameId: 'subtraction-sprint',
      tier: 'strategists',
      solved: 17,
      attempted: 18,
      durationSeconds: 60,
      score: 238,
      startLvl: 3,
      endLvl: 4,
      peakLvl: 5,
    },
    {
      daysAgo: 0,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 19,
      attempted: 20,
      durationSeconds: 60,
      score: 276,
      startLvl: 3,
      endLvl: 5,
      peakLvl: 5,
    },
  ];

  const sampleMatches: MatchRecord[] = arithSpecs.map((item, i) => {
    const dk = shiftDateKey(todayKey, -item.daysAgo);
    const acc = Math.round((item.solved / item.attempted) * 100);
    return {
      id: `sample-dash-arith-${i + 1}`,
      gameTitle: ARITHMETIC_GAMES[item.gameId].title,
      mode: 'solo',
      tier: item.tier,
      variant: 'classic',
      playerScore: item.score,
      opponentScore: 130,
      opponentName: '60s Par (130)',
      result: item.score >= 130 ? 'win' : 'loss',
      primesClaimed: 0,
      playedAt: `${dk}T16:30:00.000Z`,
      arithmeticMeta: {
        gameId: item.gameId,
        pace: 'standard',
        solved: item.solved,
        attempted: item.attempted,
        accuracyPercent: acc,
        bestStreak: Math.max(3, Math.floor(item.solved / 2)),
        durationSeconds: item.durationSeconds,
        maxStageReached: item.peakLvl,
        adaptiveEnabled: true,
        startAdaptiveLevel: item.startLvl,
        endAdaptiveLevel: item.endLvl,
        peakAdaptiveLevel: item.peakLvl,
      },
    };
  });

  const dailyOffsets: {
    daysAgo: number;
    archetype: DailyChallengeCompletion['archetype'];
    title: string;
    secondsUsed: number;
    mistakes: number;
    hintsUsed: number;
    score: number;
    streakDays: number;
    streakBonus: number;
  }[] = [
    {
      daysAgo: 24,
      archetype: 'equation-vault',
      title: 'Equation Vault',
      secondsUsed: 62,
      mistakes: 1,
      hintsUsed: 1,
      score: 156,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 23,
      archetype: 'divisor-cipher',
      title: 'Divisor & Sequence Cipher',
      secondsUsed: 54,
      mistakes: 1,
      hintsUsed: 0,
      score: 195,
      streakDays: 2,
      streakBonus: 15,
    },
    {
      daysAgo: 11,
      archetype: 'balance-scale',
      title: 'Algebraic Balance Scale',
      secondsUsed: 48,
      mistakes: 0,
      hintsUsed: 1,
      score: 182,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 2,
      archetype: 'mystery-number',
      title: 'Mystery Number Deduction',
      secondsUsed: 41,
      mistakes: 0,
      hintsUsed: 0,
      score: 254,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 1,
      archetype: 'equation-vault',
      title: 'Equation Vault',
      secondsUsed: 34,
      mistakes: 0,
      hintsUsed: 0,
      score: 277,
      streakDays: 2,
      streakBonus: 15,
    },
    {
      daysAgo: 0,
      archetype: 'balance-scale',
      title: 'Algebraic Balance Scale',
      secondsUsed: 29,
      mistakes: 0,
      hintsUsed: 0,
      score: 298,
      streakDays: 3,
      streakBonus: 30,
    },
  ];

  const sampleDaily: DailyChallengeCompletion[] = dailyOffsets.map((d) => {
    const dk = shiftDateKey(todayKey, -d.daysAgo);
    return {
      dateKey: dk,
      editionNumber: getEditionNumber(dk),
      tier: 'challengers',
      archetype: d.archetype,
      archetypeTitle: d.title,
      solved: true,
      stepsSolved: 3,
      secondsUsed: d.secondsUsed,
      timeLimitSeconds: 90,
      mistakes: d.mistakes,
      hintsUsed: d.hintsUsed,
      score: d.score,
      streakDays: d.streakDays,
      streakBonus: d.streakBonus > 0 ? d.streakBonus : undefined,
      completedAt: `${dk}T15:00:00.000Z`,
      isSample: true,
    };
  });

  return { sampleMatches, sampleDaily };
}
