'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Database, Trash2 } from 'lucide-react';
import { getLocalDateKey } from '@/lib/daily-challenge';
import {
  clampDailyProblemGoal,
  computeDailyGoalProgress,
  DAILY_PROBLEM_GOAL,
  getTodayProblemBreakdown,
} from '@/lib/daily-goal';
import { evaluateDailyMilestone } from '@/lib/daily-milestone';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import type { PlayableGameId } from '@/lib/guest-trial';
import { isSampleMatch } from '@/lib/notebook-analytics';
import {
  buildArithmeticAccuracySeries,
  buildArithmeticGameBreakdown,
  buildChallengeCompletionHistory,
  buildDailyChallenge30DayFrequency,
  buildDailyGoalCompletionRate30Day,
  buildDailyScoreSpeedSeries,
  computeDashboardOverview,
  isSampleDailyCompletion,
  type DashboardGameFilter,
  type DashboardTierFilter,
} from '@/lib/performance-dashboard';
import type { AchievementEvaluation } from '@/lib/achievements';
import DashboardDailyGoalCard from './DashboardDailyGoalCard';
import RecentAchievementsFeed from './RecentAchievementsFeed';
import DailyConsistencyChart30Day from './DailyConsistencyChart30Day';
import DailyStreakTrendChart from './DailyStreakTrendChart';
import DailyGoalCompletionRateChart from './DailyGoalCompletionRateChart';
import DailyLeaderboardCard from './DailyLeaderboardCard';
import GameTopTenLeaderboard from './GameTopTenLeaderboard';
import AccuracyChartCard from './dashboard/AccuracyChartCard';
import CompletionHistoryCard from './dashboard/CompletionHistoryCard';
import GameBreakdownCard from './dashboard/GameBreakdownCard';
import KpiCards from './dashboard/KpiCards';
import type {
  ArithmeticGameId,
  DailyChallengeCompletion,
  MatchRecord,
  StudentProfile,
} from '@/lib/types';

interface PerformanceDashboardProps {
  profile: StudentProfile;
  matches: MatchRecord[];
  dailyCompletions: DailyChallengeCompletion[];
  achievementEvaluation: AchievementEvaluation;
  onChangeDailyGoal: (nextGoal: number) => void;
  onLaunchArithmetic: (gameId: ArithmeticGameId) => void;
  onLaunchGame: (gameId: PlayableGameId) => void;
  onOpenDaily: () => void;
  onOpenNotebook: () => void;
  onOpenRegister: () => void;
  onLoadSampleDashboard: () => void;
  onClearSampleDashboard: () => void;
}

export default function PerformanceDashboard({
  profile,
  matches,
  dailyCompletions,
  achievementEvaluation,
  onChangeDailyGoal,
  onLaunchArithmetic,
  onLaunchGame,
  onOpenDaily,
  onOpenNotebook,
  onOpenRegister,
  onLoadSampleDashboard,
  onClearSampleDashboard,
}: PerformanceDashboardProps) {
  const [gameFilter, setGameFilter] = useState<DashboardGameFilter>('all');
  const [tierFilter, setTierFilter] = useState<DashboardTierFilter>('all');

  const todayKey = useMemo(() => getLocalDateKey(), []);
  const dailyProblemGoal = clampDailyProblemGoal(
    profile.dailyProblemGoal ?? DAILY_PROBLEM_GOAL
  );

  const hasSampleData = useMemo(
    () =>
      matches.some((m) => isSampleMatch(m)) ||
      dailyCompletions.some((c) => isSampleDailyCompletion(c)),
    [matches, dailyCompletions]
  );

  const dailyGoalProgress = useMemo(
    () =>
      computeDailyGoalProgress({
        matches,
        dailyCompletions,
        todayKey,
        dailyProblemGoal,
        includeSampleMatches: hasSampleData,
      }),
    [matches, dailyCompletions, todayKey, dailyProblemGoal, hasSampleData]
  );

  const dailyMilestoneStatus = useMemo(
    () => evaluateDailyMilestone(matches, todayKey),
    [matches, todayKey]
  );

  const todayBreakdown = useMemo(
    () =>
      getTodayProblemBreakdown(
        matches,
        dailyCompletions,
        todayKey,
        hasSampleData
      ),
    [matches, dailyCompletions, todayKey, hasSampleData]
  );

  const overview = useMemo(
    () => computeDashboardOverview(matches, dailyCompletions, todayKey),
    [matches, dailyCompletions, todayKey]
  );

  const accuracySeries = useMemo(
    () => buildArithmeticAccuracySeries(matches, gameFilter, tierFilter),
    [matches, gameFilter, tierFilter]
  );

  const gameBreakdown = useMemo(
    () => buildArithmeticGameBreakdown(matches, tierFilter),
    [matches, tierFilter]
  );

  const completionHistory = useMemo(
    () =>
      buildChallengeCompletionHistory(matches, dailyCompletions, todayKey, 14),
    [matches, dailyCompletions, todayKey]
  );

  const dailyScoreSpeed = useMemo(
    () => buildDailyScoreSpeedSeries(dailyCompletions),
    [dailyCompletions]
  );

  const dailyConsistency30Day = useMemo(
    () => buildDailyChallenge30DayFrequency(dailyCompletions, todayKey),
    [dailyCompletions, todayKey]
  );

  const dailyGoalCompletionRate30Day = useMemo(
    () => buildDailyGoalCompletionRate30Day(dailyCompletions, todayKey),
    [dailyCompletions, todayKey]
  );

  const tierSpec = TIER_SPECS[profile.ageTier];
  const hasAnyArithmetic = matches.some((m) => Boolean(m.arithmeticMeta));

  return (
    <main
      data-testid="performance-dashboard"
      className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E0D5] pb-5">
        <div>
          <p className="text-xs font-medium text-[#5A6572]">
            Analytics Studio · {profile.displayName} · {tierSpec.label} (
            {tierSpec.ageRange})
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[#1C232B]">
            Performance Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasSampleData ? (
            <button
              type="button"
              data-testid="dashboard-clear-sample"
              onClick={onClearSampleDashboard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#5A6572] hover:border-[#BE123C] hover:text-[#BE123C] transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear Sample Data
            </button>
          ) : (
            <button
              type="button"
              data-testid="dashboard-load-sample"
              onClick={onLoadSampleDashboard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              Load Sample Progress
            </button>
          )}

          <button
            type="button"
            onClick={() => onLaunchArithmetic('addition-attack')}
            className="btn-cobalt inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap"
          >
            Practice Arithmetic
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <KpiCards overview={overview} />

      {/* DAILY GOAL SETTING + CIRCULAR PROGRESS RING */}
      <DashboardDailyGoalCard
        progress={dailyGoalProgress}
        breakdown={todayBreakdown}
        dailyProblemGoal={dailyProblemGoal}
        onChangeDailyGoal={onChangeDailyGoal}
        onStartPractice={() => onLaunchArithmetic('addition-attack')}
        onOpenDaily={onOpenDaily}
      />

      {/* RECENT ACHIEVEMENTS FEED — SCROLLS 5 MOST RECENTLY EARNED BADGES */}
      <RecentAchievementsFeed
        achievementEvaluation={achievementEvaluation}
        hasSampleData={hasSampleData}
        onOpenNotebook={onOpenNotebook}
        onOpenDaily={onOpenDaily}
        onLoadSampleDashboard={onLoadSampleDashboard}
      />

      <AccuracyChartCard
        series={accuracySeries}
        gameFilter={gameFilter}
        tierFilter={tierFilter}
        onGameFilter={setGameFilter}
        onTierFilter={setTierFilter}
        hasAnyArithmetic={hasAnyArithmetic}
        hasSampleData={hasSampleData}
        onLaunchArithmetic={onLaunchArithmetic}
        onLoadSampleDashboard={onLoadSampleDashboard}
      />

      {/* Challenge Completion History + Accuracy by Arithmetic Game */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <CompletionHistoryCard
          completionHistory={completionHistory}
          dailyScoreSpeed={dailyScoreSpeed}
          onOpenDaily={onOpenDaily}
        />
        <GameBreakdownCard
          gameBreakdown={gameBreakdown}
          onLaunchArithmetic={onLaunchArithmetic}
        />
      </div>

      {/* FULL-WIDTH 30-DAY DAILY CHALLENGE CONSISTENCY BAR CHART */}
      <DailyConsistencyChart30Day
        data={dailyConsistency30Day}
        onOpenDaily={onOpenDaily}
        hasSampleData={hasSampleData}
        onLoadSampleDashboard={onLoadSampleDashboard}
      />

      {/* FULL-WIDTH DAILY CHALLENGE STREAK DURATION LINE CHART */}
      <DailyStreakTrendChart
        dailyCompletions={dailyCompletions}
        todayKey={todayKey}
        dailyGoalMetToday={dailyGoalProgress.goalMetToday}
        dailyMilestoneCompletedToday={dailyMilestoneStatus.completedToday}
        onOpenDaily={onOpenDaily}
        hasSampleData={hasSampleData}
        onLoadSampleDashboard={onLoadSampleDashboard}
      />

      {/* FULL-WIDTH 30-DAY DAILY GOAL COMPLETION RATE BAR CHART */}
      <DailyGoalCompletionRateChart
        data={dailyGoalCompletionRate30Day}
        onOpenDaily={onOpenDaily}
        hasSampleData={hasSampleData}
        onLoadSampleDashboard={onLoadSampleDashboard}
      />

      {/* DAILY LEADERBOARD — TOP 5 FOR TODAY'S DAILY CHALLENGE */}
      <DailyLeaderboardCard
        profile={profile}
        dailyCompletions={dailyCompletions}
        todayKey={todayKey}
        onOpenDaily={onOpenDaily}
      />

      {/* TOP 10 PER-GAME DAILY & WEEKLY CLOUD LEADERBOARD */}
      <GameTopTenLeaderboard
        profile={profile}
        todayKey={todayKey}
        onOpenRegister={onOpenRegister}
        onLaunchGame={onLaunchGame}
      />
    </main>
  );
}
