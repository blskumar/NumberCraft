'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Database,
  Flame,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { getLocalDateKey } from '@/lib/daily-challenge';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { isSampleMatch } from '@/lib/notebook-analytics';
import {
  buildArithmeticAccuracySeries,
  buildArithmeticGameBreakdown,
  buildChallengeCompletionHistory,
  buildDailyChallenge30DayFrequency,
  buildDailyScoreSpeedSeries,
  computeDashboardOverview,
  isSampleDailyCompletion,
  type ArithmeticAccuracyPoint,
  type DailyCompletionHistoryBucket,
  type DailyScoreSpeedPoint,
  type DashboardGameFilter,
  type DashboardTierFilter,
} from '@/lib/performance-dashboard';
import DailyConsistencyChart30Day from './DailyConsistencyChart30Day';
import DailyStreakTrendChart from './DailyStreakTrendChart';
import DailyLeaderboardCard from './DailyLeaderboardCard';
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
  onLaunchArithmetic: (gameId: ArithmeticGameId) => void;
  onOpenDaily: () => void;
  onLoadSampleDashboard: () => void;
  onClearSampleDashboard: () => void;
}

const GAME_FILTERS: { id: DashboardGameFilter; label: string }[] = [
  { id: 'all', label: 'All Arithmetic' },
  { id: 'addition-attack', label: 'Addition' },
  { id: 'subtraction-sprint', label: 'Subtraction' },
  { id: 'multiplication-mastery', label: 'Multiplication' },
];

const TIER_FILTERS: { id: DashboardTierFilter; label: string }[] = [
  { id: 'all', label: 'All Tiers' },
  { id: 'explorers', label: 'Explorers' },
  { id: 'challengers', label: 'Challengers' },
  { id: 'strategists', label: 'Strategists' },
];

function AccuracyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: ArithmeticAccuracyPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">
        {pt.gameTitle} · {pt.dateLabel}
      </p>
      <p className="mt-0.5 text-[#5A6572]">
        Session {pt.label} · {pt.tierLabel}
      </p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Accuracy</span>
          <span className="font-semibold text-[#1D4ED8]">
            {pt.accuracyPercent}% ({pt.solved}/{pt.attempted})
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">3-Round Avg</span>
          <span className="font-semibold text-[#047857]">
            {pt.rollingAccuracy}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Adaptive Band</span>
          <span className="font-semibold text-[#B45309]">
            Level {pt.adaptiveLevel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Pace / Score</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.pacePerMinute}/min · {pt.score} pts
          </span>
        </div>
      </div>
    </div>
  );
}

function CompletionCadenceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DailyCompletionHistoryBucket }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">
        {pt.shortDay}, {pt.dateLabel}
        {pt.isToday ? ' (Today)' : ''}
      </p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#1D4ED8]">Core Arithmetic</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.arithmeticRounds}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#B45309]">Daily Challenge</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.dailySolved > 0 ? `Solved (${pt.dailyScore} pts)` : '0'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#047857]">Factor Grid</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.factorGridRounds}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-[#ECE7DD] pt-1">
          <span className="text-[#5A6572]">Total Completed</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.totalChallenges}
          </span>
        </div>
      </div>
    </div>
  );
}

function DailyScoreSpeedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DailyScoreSpeedPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">
        Edition {pt.editionLabel} · {pt.dateLabel}
      </p>
      <p className="mt-0.5 text-[#5A6572]">{pt.archetypeTitle}</p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Daily Score</span>
          <span className="font-semibold text-[#047857]">
            {pt.score} pts
            {pt.streakBonus > 0 ? ` (+${pt.streakBonus} streak)` : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Solve Speed</span>
          <span className="font-semibold text-[#1D4ED8]">
            {pt.secondsUsed}s / {pt.timeLimitSeconds}s
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Precision</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.mistakes} misses · {pt.hintsUsed} hints
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceDashboard({
  profile,
  matches,
  dailyCompletions,
  onLaunchArithmetic,
  onOpenDaily,
  onLoadSampleDashboard,
  onClearSampleDashboard,
}: PerformanceDashboardProps) {
  const [gameFilter, setGameFilter] = useState<DashboardGameFilter>('all');
  const [tierFilter, setTierFilter] = useState<DashboardTierFilter>('all');
  const [showAdaptiveOverlay, setShowAdaptiveOverlay] = useState(true);
  const [historyView, setHistoryView] = useState<'cadence' | 'daily-score'>(
    'cadence'
  );

  const todayKey = useMemo(() => getLocalDateKey(), []);

  const hasSampleData = useMemo(
    () =>
      matches.some((m) => isSampleMatch(m)) ||
      dailyCompletions.some((c) => isSampleDailyCompletion(c)),
    [matches, dailyCompletions]
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

  const tierSpec = TIER_SPECS[profile.ageTier];
  const hasAnyArithmetic = matches.some((m) => Boolean(m.arithmeticMeta));

  const chartGameBreakdown = useMemo(
    () =>
      gameBreakdown.map((g) => ({
        ...g,
        shortLabel:
          g.gameId === 'addition-attack'
            ? 'Addition'
            : g.gameId === 'subtraction-sprint'
              ? 'Subtraction'
              : 'Multiplication',
        barAccuracy: g.avgAccuracy ?? 0,
      })),
    [gameBreakdown]
  );

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

      {/* Top 4 KPI Summary Cards */}
      <section
        aria-label="Key performance metrics"
        className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="card-tactile rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A6572]">
            <span>Arithmetic Accuracy</span>
            <Target className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
          </div>
          <p
            data-testid="kpi-arithmetic-accuracy"
            className="mt-2 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums"
          >
            {overview.avgArithmeticAccuracy !== null
              ? `${overview.avgArithmeticAccuracy}%`
              : '—'}
          </p>
          <p className="mt-1 font-mono text-[11px] tabular-nums">
            {overview.accuracyDelta !== null ? (
              <span
                className={
                  overview.accuracyDelta >= 0
                    ? 'font-semibold text-[#047857]'
                    : 'font-semibold text-[#BE123C]'
                }
              >
                {overview.accuracyDelta >= 0 ? '+' : ''}
                {overview.accuracyDelta}% recent trend
              </span>
            ) : (
              <span className="text-[#7A8490]">
                {overview.arithmeticSessionCount === 0
                  ? 'No rounds yet'
                  : 'Complete 2+ rounds for trend'}
              </span>
            )}
          </p>
        </div>

        <div className="card-tactile rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A6572]">
            <span>Problems Solved</span>
            <Zap className="h-4 w-4 text-[#047857]" aria-hidden="true" />
          </div>
          <p
            data-testid="kpi-problems-solved"
            className="mt-2 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums"
          >
            {overview.totalProblemsSolved}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#7A8490] tabular-nums">
            {overview.arithmeticSessionCount}{' '}
            {overview.arithmeticSessionCount === 1 ? 'session' : 'sessions'}
            {overview.avgPacePerMinute !== null
              ? ` · ${overview.avgPacePerMinute}/min avg`
              : ''}
          </p>
        </div>

        <div className="card-tactile rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A6572]">
            <span>Daily Challenges</span>
            <CalendarCheck2
              className="h-4 w-4 text-[#B45309]"
              aria-hidden="true"
            />
          </div>
          <p
            data-testid="kpi-daily-solved"
            className="mt-2 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums"
          >
            {overview.dailySolvedCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#7A8490] tabular-nums">
            {overview.dailyAttemptedCount} attempted ·{' '}
            {overview.totalChallengesCompleted} total logs
          </p>
        </div>

        <div className="card-tactile rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A6572]">
            <span>Current Daily Streak</span>
            <Flame className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
          </div>
          <p
            data-testid="kpi-daily-streak"
            className="mt-2 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums"
          >
            {overview.currentDailyStreak}d
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#7A8490] tabular-nums">
            Best streak {overview.bestDailyStreak}d
          </p>
        </div>
      </section>

      {/* CHART 1: Arithmetic Accuracy & Adaptive Band Over Time */}
      <section
        data-testid="dashboard-accuracy-chart"
        aria-labelledby="accuracy-chart-heading"
        className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp
                className="h-4 w-4 text-[#1D4ED8]"
                aria-hidden="true"
              />
              <h2
                id="accuracy-chart-heading"
                className="font-display text-xl font-semibold text-[#1C232B]"
              >
                Arithmetic Accuracy Over Time
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#5A6572]">
              Tracks per-session accuracy, a 3-round rolling average, and your
              Adaptive Difficulty Band (Lv 1–5) against the 85% mastery line.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter arithmetic game"
              className="flex flex-wrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
            >
              {GAME_FILTERS.map((opt) => {
                const active = gameFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGameFilter(opt.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#1C232B] shadow-xs'
                        : 'text-[#5A6572] hover:text-[#1C232B]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Filter age tier"
              className="flex flex-wrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
            >
              {TIER_FILTERS.map((opt) => {
                const active = tierFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTierFilter(opt.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#1C232B] shadow-xs'
                        : 'text-[#5A6572] hover:text-[#1C232B]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[#46515E]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1D4ED8]" />
              Session Accuracy (%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-[#047857]" />
              3-Round Rolling Avg
            </span>
            {showAdaptiveOverlay && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B45309]" />
                Adaptive Band (Lv 1–5)
              </span>
            )}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#46515E]">
            <input
              type="checkbox"
              checked={showAdaptiveOverlay}
              onChange={(e) => setShowAdaptiveOverlay(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#B45309]"
            />
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-[#B45309]"
              aria-hidden="true"
            />
            Show Adaptive Band
          </label>
        </div>

        {accuracySeries.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#D8D1C4] bg-[#FAF8F4] px-6 py-12 text-center">
            <Activity
              className="mx-auto h-7 w-7 text-[#9AA3AD]"
              aria-hidden="true"
            />
            <p className="mt-3 font-display text-lg font-semibold text-[#1C232B]">
              {hasAnyArithmetic
                ? 'No arithmetic sessions match this filter'
                : 'Your arithmetic accuracy curve starts on your first sprint'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#5A6572]">
              Complete a round of Addition Attack, Subtraction Sprint, or
              Multiplication Mastery to plot your accuracy and adaptive band
              over time—or load sample progress to explore the interactive
              charts right away.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onLaunchArithmetic('addition-attack')}
                className="btn-cobalt inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Play Addition Attack
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {!hasSampleData && (
                <button
                  type="button"
                  onClick={onLoadSampleDashboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                >
                  <Database className="h-3.5 w-3.5" aria-hidden="true" />
                  Load Sample Progress
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={accuracySeries}
                margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="accAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E8E2D6"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#5A6572', fontSize: 11 }}
                  axisLine={{ stroke: '#D8D1C4' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="acc"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#5A6572', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                {showAdaptiveOverlay && (
                  <YAxis
                    yAxisId="lv"
                    orientation="right"
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={(v) => `Lv ${v}`}
                    tick={{ fill: '#B45309', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                )}
                <Tooltip content={<AccuracyTooltip />} />
                <ReferenceLine
                  yAxisId="acc"
                  y={85}
                  stroke="#047857"
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                />
                <Area
                  yAxisId="acc"
                  type="monotone"
                  dataKey="accuracyPercent"
                  stroke="#1D4ED8"
                  strokeWidth={2.5}
                  fill="url(#accAreaFill)"
                  animationDuration={350}
                  dot={{ r: 3.5, fill: '#1D4ED8', strokeWidth: 0 }}
                  activeDot={{
                    r: 5.5,
                    fill: '#1D4ED8',
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                />
                <Line
                  yAxisId="acc"
                  type="monotone"
                  dataKey="rollingAccuracy"
                  stroke="#047857"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  animationDuration={350}
                  dot={false}
                />
                {showAdaptiveOverlay && (
                  <Line
                    yAxisId="lv"
                    type="stepAfter"
                    dataKey="adaptiveLevel"
                    stroke="#B45309"
                    strokeWidth={2}
                    animationDuration={350}
                    dot={{ r: 3, fill: '#B45309', strokeWidth: 0 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* BOTTOM 2-COLUMN GRID: Challenge Completion History + Accuracy by Arithmetic Game */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Challenge Completion History Over Time */}
        <section
          data-testid="dashboard-completion-chart"
          aria-labelledby="completion-history-heading"
          className="card-tactile rounded-2xl p-5 sm:p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE7DD] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck2
                  className="h-4 w-4 text-[#047857]"
                  aria-hidden="true"
                />
                <h2
                  id="completion-history-heading"
                  className="font-display text-lg font-semibold text-[#1C232B]"
                >
                  Challenge Completion History
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-[#5A6572]">
                {historyView === 'cadence'
                  ? '14-day completed sessions stacked across Core Arithmetic, Daily Challenges, and Factor Grid.'
                  : 'Daily Math Challenge scores paired with solve speed (seconds) across completed editions.'}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Completion history perspective"
              className="flex items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={historyView === 'cadence'}
                onClick={() => setHistoryView('cadence')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  historyView === 'cadence'
                    ? 'bg-white text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                14-Day Cadence
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={historyView === 'daily-score'}
                onClick={() => setHistoryView('daily-score')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  historyView === 'daily-score'
                    ? 'bg-white text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                Daily Vault Scores
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5A6572]">
            {historyView === 'cadence' ? (
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]" />
                  Arithmetic
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#B45309]" />
                  Daily Vault
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
                  Factor Grid
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
                  Daily Score (pts)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 bg-[#1D4ED8]" />
                  Solve Time (s)
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenDaily}
              className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
            >
              Open Daily Challenge
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          {historyView === 'daily-score' && dailyScoreSpeed.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#D8D1C4] bg-[#FAF8F4] px-6 py-12 text-center">
              <p className="text-sm font-semibold text-[#1C232B]">
                No Daily Math Challenges completed yet
              </p>
              <p className="mt-1 text-xs text-[#5A6572]">
                Crack today&apos;s timed 3-clue vault to start plotting your
                Daily Score &amp; Solve Speed history.
              </p>
              <button
                type="button"
                onClick={onOpenDaily}
                className="btn-cobalt mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Play Today&apos;s Daily
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="mt-4 h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {historyView === 'cadence' ? (
                  <BarChart
                    data={completionHistory}
                    margin={{ top: 10, right: 10, left: -20, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E8E2D6"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      interval={1}
                      tick={{ fill: '#5A6572', fontSize: 10 }}
                      axisLine={{ stroke: '#D8D1C4' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#5A6572', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CompletionCadenceTooltip />} />
                    <Bar
                      dataKey="arithmeticRounds"
                      stackId="a"
                      fill="#1D4ED8"
                      maxBarSize={24}
                      animationDuration={350}
                    />
                    <Bar
                      dataKey="dailySolved"
                      stackId="a"
                      fill="#B45309"
                      maxBarSize={24}
                      animationDuration={350}
                    />
                    <Bar
                      dataKey="factorGridRounds"
                      stackId="a"
                      fill="#047857"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                      animationDuration={350}
                    />
                  </BarChart>
                ) : (
                  <ComposedChart
                    data={dailyScoreSpeed}
                    margin={{ top: 10, right: 12, left: -14, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E8E2D6"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fill: '#5A6572', fontSize: 10 }}
                      axisLine={{ stroke: '#D8D1C4' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="score"
                      tick={{ fill: '#047857', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="sec"
                      orientation="right"
                      tickFormatter={(v) => `${v}s`}
                      tick={{ fill: '#1D4ED8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DailyScoreSpeedTooltip />} />
                    <Bar
                      yAxisId="score"
                      dataKey="score"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={32}
                      animationDuration={350}
                    >
                      {dailyScoreSpeed.map((entry) => (
                        <Cell
                          key={`${entry.editionLabel}-${entry.index}`}
                          fill={entry.solved ? '#047857' : '#D97706'}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="sec"
                      type="monotone"
                      dataKey="secondsUsed"
                      stroke="#1D4ED8"
                      strokeWidth={2.25}
                      animationDuration={350}
                      dot={{ r: 3, fill: '#1D4ED8', strokeWidth: 0 }}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Right: Accuracy Breakdown by Arithmetic Game */}
        <section
          data-testid="dashboard-game-breakdown"
          aria-labelledby="game-breakdown-heading"
          className="card-tactile flex flex-col justify-between rounded-2xl p-5 sm:p-6 lg:col-span-5"
        >
          <div>
            <div className="flex items-center gap-2 border-b border-[#ECE7DD] pb-4">
              <BarChart3
                className="h-4 w-4 text-[#1D4ED8]"
                aria-hidden="true"
              />
              <div>
                <h2
                  id="game-breakdown-heading"
                  className="font-display text-lg font-semibold text-[#1C232B]"
                >
                  Accuracy by Arithmetic Mode
                </h2>
                <p className="text-xs text-[#5A6572]">
                  Compare precision, pace, and peak adaptive band across all
                  three drills.
                </p>
              </div>
            </div>

            <div className="mt-4 h-[175px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartGameBreakdown}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E8E2D6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#1C232B', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#D8D1C4' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#5A6572', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="#047857"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Bar
                    dataKey="barAccuracy"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                    animationDuration={350}
                  >
                    {chartGameBreakdown.map((entry) => (
                      <Cell
                        key={entry.gameId}
                        fill={
                          entry.sessions === 0 ? '#E5E0D5' : entry.accentHex
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-[#ECE7DD] pt-4">
            {gameBreakdown.map((bucket) => (
              <div
                key={bucket.gameId}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#ECE7DD] bg-[#FAF8F4] px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1C232B]">
                    {bucket.title}
                  </p>
                  <p className="font-mono text-[11px] text-[#5A6572] tabular-nums">
                    {bucket.sessions > 0
                      ? `${bucket.sessions} rounds · ${bucket.totalSolved} solved · ${bucket.avgPacePerMinute}/min`
                      : 'No sessions logged yet'}
                  </p>
                </div>
                {bucket.sessions > 0 && bucket.avgAccuracy !== null ? (
                  <div className="shrink-0 text-right font-mono tabular-nums">
                    <p className="font-semibold text-[#1D4ED8]">
                      {bucket.avgAccuracy}%
                    </p>
                    <p className="text-[10px] text-[#5A6572]">
                      Peak Lv {bucket.peakAdaptiveLevel}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onLaunchArithmetic(bucket.gameId)}
                    className="shrink-0 rounded-lg border border-[#D8D1C4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] hover:border-[#1D4ED8]"
                  >
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
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
    </main>
  );
}
