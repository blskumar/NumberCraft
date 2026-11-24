import type { AgeTier, ArithmeticGameId } from '../types';

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
