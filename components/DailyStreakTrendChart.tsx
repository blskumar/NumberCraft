'use client';

import { useMemo, useState } from 'react';
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
import { ArrowRight, Database, Flame, Trophy } from 'lucide-react';
import {
  buildDailyStreakDurationSeries,
  type DailyStreakDurationPoint,
} from '@/lib/performance-dashboard';
import type { DailyChallengeCompletion } from '@/lib/types';

interface DailyStreakTrendChartProps {
  dailyCompletions: DailyChallengeCompletion[];
  todayKey: string;
  onOpenDaily: () => void;
  hasSampleData: boolean;
  onLoadSampleDashboard: () => void;
}

const WINDOW_OPTIONS: { days: 14 | 30 | 60; label: string }[] = [
  { days: 14, label: '14 Days' },
  { days: 30, label: '30 Days' },
  { days: 60, label: '60 Days' },
];

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
          pt.isPeakPoint
            ? 'text-[#B45309]'
            : pt.solved
              ? 'text-[#047857]'
              : 'text-[#5A6572]'
        }`}
      >
        {pt.isPeakPoint
          ? `Peak Streak · ${pt.streakLength} consecutive ${pt.streakLength === 1 ? 'day' : 'days'}`
          : pt.solved
            ? `Active Streak · ${pt.streakLength} ${pt.streakLength === 1 ? 'day' : 'days'}`
            : 'Streak Paused (0 days)'}
      </p>

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
}

function StreakLineDot({ cx, cy, payload }: CustomDotProps) {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
  if (!payload.solved) return null;

  if (payload.isPeakPoint) {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="#D97706"
          fillOpacity={0.2}
        />
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
  onOpenDaily,
  hasSampleData,
  onLoadSampleDashboard,
}: DailyStreakTrendChartProps) {
  const [windowDays, setWindowDays] = useState<14 | 30 | 60>(30);

  const trendData = useMemo(
    () => buildDailyStreakDurationSeries(dailyCompletions, todayKey, windowDays),
    [dailyCompletions, todayKey, windowDays]
  );

  const xInterval = windowDays === 14 ? 1 : windowDays === 30 ? 4 : 9;
  const yMax = Math.max(3, trendData.peakStreakDuration + 1);

  return (
    <section
      data-testid="dashboard-streak-line-chart"
      aria-labelledby="streak-trend-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
            <h2
              id="streak-trend-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              Daily Challenge Streak Duration Over Time
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            Visualizes consecutive daily challenge streak length day-by-day and
            highlights peak streak periods ({trendData.startDateLabel} –{' '}
            {trendData.endDateLabel}).
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Streak trend time window"
          className="inline-flex items-center gap-1 self-start rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1 lg:self-auto"
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
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#5A6572]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-[#1D4ED8]" />
            Streak Duration (days)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B45309]" />
            Peak Streak Period
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

      {/* Recharts Line Chart */}
      <div className="mt-4 h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData.points}
            margin={{ top: 16, right: 16, left: -12, bottom: 4 }}
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

            {/* Peak Streak Reference Line */}
            {trendData.peakStreakDuration > 0 && (
              <ReferenceLine
                y={trendData.peakStreakDuration}
                stroke="#B45309"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{
                  value: `Peak ${trendData.peakStreakDuration}d`,
                  position: 'insideTopRight',
                  fill: '#B45309',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="streakLength"
              stroke="#1D4ED8"
              strokeWidth={2.5}
              animationDuration={350}
              dot={<StreakLineDot />}
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

      {/* Explicit Peak Period Readout or Empty State Guidance */}
      {trendData.peakPeriods.length > 0 ? (
        <div
          data-testid="streak-peak-periods-summary"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECE7DD] pt-3 text-xs text-[#46515E]"
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
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-3 text-xs text-[#5A6572]">
          <p>
            Solve Daily Math Challenges on consecutive days to chart your streak
            climb and highlight peak runs.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!hasSampleData && (
              <button
                type="button"
                onClick={onLoadSampleDashboard}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap shrink-0"
              >
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                Load Sample Progress
              </button>
            )}
            <button
              type="button"
              onClick={onOpenDaily}
              className="btn-cobalt inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Start Daily Challenge
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
