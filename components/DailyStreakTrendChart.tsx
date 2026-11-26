'use client';

import ChartA11y from '@/components/ChartA11y';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Award,
  Flame,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  buildDailyStreakDurationSeries,
  detectStreakGrowthEvent,
  type DailyStreakDurationPoint,
  type StreakGrowthEvent,
  type StreakGrowthTriggerSnapshot,
} from '@/lib/performance-dashboard';
import type { DailyChallengeCompletion } from '@/lib/types';
import SampleDailyActions from './dashboard/SampleDailyActions';

interface DailyStreakTrendChartProps {
  dailyCompletions: DailyChallengeCompletion[];
  todayKey: string;
  dailyGoalMetToday?: boolean;
  dailyMilestoneCompletedToday?: boolean;
  onOpenDaily: () => void;
  hasSampleData: boolean;
  onLoadSampleDashboard: () => void;
}

const WINDOW_OPTIONS: { days: 14 | 30 | 60; label: string }[] = [
  { days: 14, label: '14 Days' },
  { days: 30, label: '30 Days' },
  { days: 60, label: '60 Days' },
];

const GROWTH_ANIMATION_DURATION_MS = 2400;

function StreakDurationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DailyStreakDurationPoint }[];
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
      <p
        className={`mt-0.5 font-semibold ${
          pt.isMasteryMilestone
            ? 'text-[#047857]'
            : pt.isPeakPoint
              ? 'text-[#B45309]'
              : pt.solved
                ? 'text-[#047857]'
                : 'text-[#5A6572]'
        }`}
      >
        {pt.isMasteryMilestone && pt.milestone
          ? `Mastery Milestone · ${pt.milestone.title} (${pt.streakLength}d)`
          : pt.isPeakPoint
            ? `Peak Streak · ${pt.streakLength} consecutive ${pt.streakLength === 1 ? 'day' : 'days'}`
            : pt.solved
              ? `Active Streak · ${pt.streakLength} ${pt.streakLength === 1 ? 'day' : 'days'}`
              : 'Streak Paused (0 days)'}
      </p>

      {pt.isMasteryMilestone && pt.milestone && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-1 text-[11px] font-semibold text-[#047857]">
          <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {pt.milestone.shortLabel} unlocked
            {pt.isPeakPoint ? ' · Peak Streak' : ''}
          </span>
        </div>
      )}

      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Streak Duration</span>
          <span className="font-semibold text-[#1D4ED8]">
            {pt.streakLength}d
          </span>
        </div>
        {pt.editionNumber !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Edition</span>
            <span className="font-semibold text-[#1C232B]">
              #{pt.editionNumber}
            </span>
          </div>
        )}
        {pt.archetypeTitle && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Puzzle</span>
            <span className="font-semibold text-[#1C232B]">
              {pt.archetypeTitle}
            </span>
          </div>
        )}
        {pt.solved && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Score</span>
            <span className="font-semibold text-[#047857]">{pt.score} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: DailyStreakDurationPoint;
  growingActive?: boolean;
}

function StreakLineDot({ cx, cy, payload, growingActive }: CustomDotProps) {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
  if (!payload.solved) return null;

  if (payload.isMasteryMilestone && payload.milestone) {
    const labelAnchor = payload.isToday ? 'end' : 'middle';
    const labelX = payload.isToday ? cx + 4 : cx;
    return (
      <g
        data-testid={`streak-milestone-marker-${payload.dateKey}`}
        data-milestone-day={payload.milestone.streakDay}
        className={`text-[#047857] ${growingActive ? 'streak-milestone-node' : ''}`}
      >
        {/* Expanding emerald pulse ring when CSS growing animation is active */}
        {growingActive && (
          <circle
            cx={cx}
            cy={cy}
            r={11}
            fill="none"
            stroke="#10B981"
            strokeWidth={2}
            className="streak-milestone-ripple"
          />
        )}
        {/* Outer peak ring when the Mastery Milestone also caps a peak streak */}
        {payload.isPeakPoint && (
          <circle
            cx={cx}
            cy={cy}
            r={12}
            fill="none"
            stroke="#D97706"
            strokeWidth={1.5}
            strokeDasharray="2.5 2"
          />
        )}
        {/* Emerald Mastery Milestone halo */}
        <circle cx={cx} cy={cy} r={9.5} fill="#10B981" fillOpacity={0.22} />
        {/* Crisp geometric diamond crest */}
        <rect
          x={cx - 5.25}
          y={cy - 5.25}
          width={10.5}
          height={10.5}
          rx={1.5}
          transform={`rotate(45 ${cx} ${cy})`}
          fill="#047857"
          stroke="#FFFFFF"
          strokeWidth={1.75}
        />
        <circle cx={cx} cy={cy} r={1.85} fill="#FFFFFF" />
        {/* Milestone day callout above marker */}
        <text
          x={labelX}
          y={cy - 14}
          textAnchor={labelAnchor}
          fill="currentColor"
          fontSize={10}
          fontWeight={700}
          className="font-mono"
        >
          ★ {payload.milestone.streakDay}d
        </text>
      </g>
    );
  }

  if (payload.isPeakPoint) {
    return (
      <g className={growingActive ? 'streak-milestone-node' : undefined}>
        <circle cx={cx} cy={cy} r={8} fill="#D97706" fillOpacity={0.2} />
        <circle
          cx={cx}
          cy={cy}
          r={4.5}
          fill="#B45309"
          stroke="#FFFFFF"
          strokeWidth={1.75}
        />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={payload.inPeakPeriod ? '#D97706' : '#1D4ED8'}
      stroke="#FFFFFF"
      strokeWidth={1}
    />
  );
}

export default function DailyStreakTrendChart({
  dailyCompletions,
  todayKey,
  dailyGoalMetToday = false,
  dailyMilestoneCompletedToday = false,
  onOpenDaily,
  hasSampleData,
  onLoadSampleDashboard,
}: DailyStreakTrendChartProps) {
  const [windowDays, setWindowDays] = useState<14 | 30 | 60>(30);
  const [growthEvent, setGrowthEvent] = useState<StreakGrowthEvent | null>(null);
  const [growthPulseKey, setGrowthPulseKey] = useState(0);
  const [growingActive, setGrowingActive] = useState(false);

  const prevSnapshotRef = useRef<StreakGrowthTriggerSnapshot | null>(null);
  const timerRef = useRef<number | null>(null);

  const trendData = useMemo(
    () => buildDailyStreakDurationSeries(dailyCompletions, todayKey, windowDays),
    [dailyCompletions, todayKey, windowDays]
  );

  // Full 60-day snapshot so toggling 14/30/60 view windows doesn't falsely re-trigger growth
  const canonicalSeries = useMemo(
    () => buildDailyStreakDurationSeries(dailyCompletions, todayKey, 60),
    [dailyCompletions, todayKey]
  );

  const currentSnapshot: StreakGrowthTriggerSnapshot = useMemo(
    () => ({
      currentStreakDuration: canonicalSeries.currentStreakDuration,
      milestoneCount: canonicalSeries.milestoneDays.length,
      dailyGoalMetToday,
      dailyMilestoneCompletedToday,
    }),
    [
      canonicalSeries.currentStreakDuration,
      canonicalSeries.milestoneDays.length,
      dailyGoalMetToday,
      dailyMilestoneCompletedToday,
    ]
  );

  const triggerGrowthAnimation = useCallback((event: StreakGrowthEvent) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setGrowthEvent(event);
    setGrowthPulseKey((k) => k + 1);
    setGrowingActive(true);
    timerRef.current = window.setTimeout(() => {
      setGrowingActive(false);
      timerRef.current = null;
    }, GROWTH_ANIMATION_DURATION_MS);
  }, []);

  useEffect(() => {
    const detected = detectStreakGrowthEvent(
      prevSnapshotRef.current,
      currentSnapshot
    );
    prevSnapshotRef.current = currentSnapshot;

    if (detected.triggered) {
      const kickoff = window.setTimeout(() => {
        triggerGrowthAnimation(detected);
      }, 40);
      return () => window.clearTimeout(kickoff);
    }
    return undefined;
  }, [
    currentSnapshot,
    triggerGrowthAnimation,
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleReplayGrowth = useCallback(() => {
    const manualEvent: StreakGrowthEvent =
      growthEvent && growthEvent.triggered
        ? growthEvent
        : {
            triggered: true,
            reason:
              canonicalSeries.milestoneDays.length > 0
                ? 'mastery-milestone'
                : dailyMilestoneCompletedToday
                  ? 'daily-milestone-arena'
                  : dailyGoalMetToday
                    ? 'daily-goal-success'
                    : 'consecutive-streak',
            bannerText:
              canonicalSeries.milestoneDays.length > 0
                ? `Mastery Milestone Highlight · ${canonicalSeries.milestoneDays.length} ${canonicalSeries.milestoneDays.length === 1 ? 'Milestone' : 'Milestones'} Reached`
                : dailyGoalMetToday
                  ? 'Daily Goal Reached — Streak Growing'
                  : `Consecutive Streak Highlight · ${canonicalSeries.currentStreakDuration}d Run`,
          };
    triggerGrowthAnimation(manualEvent);
  }, [
    canonicalSeries.currentStreakDuration,
    canonicalSeries.milestoneDays.length,
    dailyGoalMetToday,
    dailyMilestoneCompletedToday,
    growthEvent,
    triggerGrowthAnimation,
  ]);

  const xInterval = windowDays === 14 ? 1 : windowDays === 30 ? 4 : 9;
  const yMax = Math.max(3, trendData.peakStreakDuration + 1);
  const daysToNextMilestone = trendData.nextMilestoneTarget
    ? Math.max(
        1,
        trendData.nextMilestoneTarget.streakDay - trendData.currentStreakDuration
      )
    : null;

  const canReplayGrowth =
    trendData.peakStreakDuration > 0 ||
    dailyGoalMetToday ||
    dailyMilestoneCompletedToday;

  return (
    <section
      key={`streak-section-${growthPulseKey > 0 && growingActive ? 'grow' : 'idle'}`}
      data-testid="dashboard-streak-line-chart"
      data-growing-active={growingActive ? 'true' : 'false'}
      data-growth-reason={growthEvent?.reason ?? 'none'}
      aria-labelledby="streak-trend-heading"
      className={`card-tactile relative mt-6 overflow-hidden rounded-2xl p-5 sm:p-6 ${
        growingActive ? 'streak-chart-growing' : ''
      }`}
    >
      {/* Top emerald growing highlight ribbon */}
      {growingActive && (
        <div
          key={`ribbon-${growthPulseKey}`}
          aria-hidden="true"
          className="streak-growth-ribbon absolute inset-x-0 top-0"
        />
      )}

      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Flame className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
            <h2
              id="streak-trend-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              Daily Challenge Streak Duration Over Time
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            Visualizes consecutive daily challenge streak length day-by-day,
            highlighting peak runs and Mastery Milestone days (3d, 7d, 14d, 30d)
            from {trendData.startDateLabel} – {trendData.endDateLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {canReplayGrowth && (
            <button
              type="button"
              data-testid="streak-replay-growth-btn"
              onClick={handleReplayGrowth}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1.5 text-xs font-semibold text-[#047857] hover:bg-[#D1FAE5] transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Highlight Growth
            </button>
          )}

          <div
            role="tablist"
            aria-label="Streak trend time window"
            className="inline-flex items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
          >
            {WINDOW_OPTIONS.map((opt) => {
              const selected = windowDays === opt.days;
              return (
                <button
                  key={opt.days}
                  type="button"
                  role="tab"
                  data-testid={`streak-window-${opt.days}d`}
                  aria-selected={selected}
                  onClick={() => setWindowDays(opt.days)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    selected
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

      {/* Live Growth Highlight Banner */}
      {growingActive && growthEvent?.bannerText && (
        <div
          role="status"
          aria-live="polite"
          data-testid="streak-growth-banner"
          className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-2 text-xs font-semibold text-[#047857]"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {growthEvent.bannerText}
          </span>
          <span className="font-mono text-[11px] tabular-nums">
            {trendData.currentStreakDuration}d streak
          </span>
        </div>
      )}

      {/* Inline Unboxed Metrics + Legend */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[#1C232B] tabular-nums">
          <span>
            <span className="text-[#5A6572]">Peak Streak </span>
            <strong
              data-testid="streak-line-peak"
              className="font-semibold text-[#B45309]"
            >
              {trendData.peakStreakDuration}d
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Current </span>
            <strong
              data-testid="streak-line-current"
              className="font-semibold text-[#047857]"
            >
              {trendData.currentStreakDuration}d
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Avg Run </span>
            <strong
              data-testid="streak-line-avg"
              className="font-semibold text-[#1D4ED8]"
            >
              {trendData.averageRunLength}d
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Milestones </span>
            <strong
              data-testid="streak-line-milestones"
              className="font-semibold text-[#047857]"
            >
              {trendData.milestoneDays.length}{' '}
              {trendData.milestoneDays.length === 1 ? 'hit' : 'hits'}
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#5A6572]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-[#1D4ED8]" />
            Streak Duration
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B45309]" />
            Peak Period
          </span>
          <span
            data-testid="streak-legend-milestone"
            className="inline-flex items-center gap-1.5 font-medium text-[#047857]"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[#047857]"
            />
            Mastery Milestone
          </span>
          <button
            type="button"
            onClick={onOpenDaily}
            className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
          >
            Extend Streak
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Recharts Line Chart with CSS Growing Canvas Wrapper */}
      <div
        key={`chart-canvas-${growthPulseKey}`}
        className="streak-chart-canvas mt-4 h-[260px] w-full"
      >
              <ChartA11y label="Daily streak trend" data={trendData.points as never} />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData.points}
            margin={{ top: 26, right: 20, left: -12, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E8E2D6"
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              interval={xInterval}
              tick={{ fill: '#5A6572', fontSize: 10 }}
              axisLine={{ stroke: '#D8D1C4' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, yMax]}
              tickFormatter={(v) => `${v}d`}
              tick={{ fill: '#5A6572', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<StreakDurationTooltip />} />

            {/* Highlighted Peak Streak Period Bands */}
            {trendData.peakPeriods.map((period) => (
              <ReferenceArea
                key={`${period.startDateKey}-${period.endDateKey}`}
                x1={period.startLabel}
                x2={period.endLabel}
                fill="#D97706"
                fillOpacity={0.14}
                stroke="#D97706"
                strokeOpacity={0.35}
                strokeDasharray="3 3"
              />
            ))}

            {/* Vertical Guides Anchoring Mastery Milestone Days */}
            {trendData.milestoneDays.map((pt) => (
              <ReferenceLine
                key={`milestone-guide-${pt.dateKey}`}
                x={pt.dateLabel}
                stroke="#059669"
                strokeDasharray="2 3"
                strokeOpacity={0.5}
              />
            ))}

            {/* Peak Streak Reference Line */}
            {trendData.peakStreakDuration > 0 && (
              <ReferenceLine
                y={trendData.peakStreakDuration}
                stroke="#B45309"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{
                  value: `Peak ${trendData.peakStreakDuration}d`,
                  position: 'insideTopLeft',
                  fill: '#B45309',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="streakLength"
              stroke={growingActive ? '#059669' : '#1D4ED8'}
              strokeWidth={growingActive ? 3 : 2.5}
              animationDuration={growingActive ? 750 : 350}
              dot={<StreakLineDot growingActive={growingActive} />}
              activeDot={{
                r: 5.5,
                fill: '#1D4ED8',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Explicit Peak Period + Mastery Milestone Summary or Empty State Guidance */}
      {trendData.peakPeriods.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-[#ECE7DD] pt-3 text-xs text-[#46515E]">
          <div
            data-testid="streak-peak-periods-summary"
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <p className="inline-flex flex-wrap items-center gap-1.5">
              <Trophy
                className="h-3.5 w-3.5 shrink-0 text-[#B45309]"
                aria-hidden="true"
              />
              <strong className="font-semibold text-[#1C232B]">
                {trendData.peakPeriods.length === 1
                  ? 'Peak Streak Period:'
                  : 'Peak Streak Periods:'}
              </strong>
              <span className="font-mono tabular-nums">
                {trendData.peakPeriods
                  .map((p) =>
                    p.startLabel === p.endLabel
                      ? `${p.startLabel} (${p.peakLength}d)`
                      : `${p.startLabel} – ${p.endLabel} (${p.peakLength}d)`
                  )
                  .join(' · ')}
              </span>
            </p>
            <span className="font-mono text-[11px] text-[#5A6572] tabular-nums">
              {trendData.activeStreakDays} active{' '}
              {trendData.activeStreakDays === 1 ? 'day' : 'days'} in last{' '}
              {trendData.windowDays}d
            </span>
          </div>

          <div
            data-testid="streak-milestones-summary"
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <p className="inline-flex flex-wrap items-center gap-1.5">
              <Award
                className="h-3.5 w-3.5 shrink-0 text-[#047857]"
                aria-hidden="true"
              />
              <strong className="font-semibold text-[#1C232B]">
                Mastery Milestones:
              </strong>
              {trendData.milestoneDays.length > 0 ? (
                <span className="font-mono text-[#047857] tabular-nums">
                  {trendData.milestoneDays
                    .map(
                      (pt) =>
                        `${pt.dateLabel} — ${pt.milestone?.title} (${pt.streakLength}d)`
                    )
                    .join(' · ')}
                </span>
              ) : (
                <span className="text-[#5A6572]">
                  Reach a 3-day consecutive streak to stamp your first Mastery
                  Milestone marker.
                </span>
              )}
            </p>
            {trendData.nextMilestoneTarget && daysToNextMilestone !== null && (
              <span className="font-mono text-[11px] text-[#5A6572] tabular-nums">
                Next: {trendData.nextMilestoneTarget.streakDay}d{' '}
                {trendData.nextMilestoneTarget.title} ({daysToNextMilestone}d
                away)
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-3 text-xs text-[#5A6572]">
          <p>
            Solve Daily Math Challenges on consecutive days to chart your streak
            climb and stamp Mastery Milestone diamonds at 3d, 7d, 14d, and 30d.
          </p>
          <SampleDailyActions
            className="flex flex-wrap items-center gap-2"
            hasSampleData={hasSampleData}
            onLoadSampleDashboard={onLoadSampleDashboard}
            onOpenDaily={onOpenDaily}
          />
        </div>
      )}
    </section>
  );
}
