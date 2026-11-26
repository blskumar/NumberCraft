'use client';

import ChartA11y from '@/components/ChartA11y';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type {
  DailyConsistency30DayData,
  DailyFrequency30DayPoint,
  WeeklyConsistencyBucket,
} from '@/lib/performance-dashboard';
import SampleDailyActions from './dashboard/SampleDailyActions';

interface DailyConsistencyChart30DayProps {
  data: DailyConsistency30DayData;
  onOpenDaily: () => void;
  hasSampleData: boolean;
  onLoadSampleDashboard: () => void;
}

function DailyBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DailyFrequency30DayPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const statusText =
    pt.status === 'solved'
      ? 'Completed'
      : pt.status === 'attempted'
        ? 'Attempted (Timed Out)'
        : 'No Entry';

  const statusColorClass =
    pt.status === 'solved'
      ? 'text-[#047857]'
      : pt.status === 'attempted'
        ? 'text-[#B45309]'
        : 'text-[#5A6572]';

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">
        {pt.shortDay}, {pt.dateLabel}
        {pt.isToday ? ' (Today)' : ''}
      </p>
      <p className={`mt-0.5 font-semibold ${statusColorClass}`}>
        {statusText}
        {pt.editionNumber !== null ? ` · Edition #${pt.editionNumber}` : ''}
      </p>
      {pt.status !== 'missed' ? (
        <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
          {pt.archetypeTitle && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#5A6572]">Puzzle</span>
              <span className="font-semibold text-[#1C232B]">
                {pt.archetypeTitle}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Score</span>
            <span className="font-semibold text-[#047857]">
              {pt.score} pts
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Time Used</span>
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
      ) : (
        <p className="mt-1.5 border-t border-[#ECE7DD] pt-1.5 text-[11px] text-[#5A6572]">
          No Daily Challenge recorded on this date.
        </p>
      )}
    </div>
  );
}

function PeriodRollupTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: WeeklyConsistencyBucket }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">{bucket.rangeLabel}</p>
      <p className="mt-0.5 text-[#5A6572]">
        Window {bucket.periodIndex} of 5 ({bucket.totalDays}-day block)
      </p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Days Completed</span>
          <span className="font-semibold text-[#047857]">
            {bucket.completedDays} / {bucket.totalDays}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Consistency</span>
          <span className="font-semibold text-[#1D4ED8]">
            {bucket.completionRatePercent}%
          </span>
        </div>
        {bucket.attemptedDays > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Timed-Out Attempts</span>
            <span className="font-semibold text-[#B45309]">
              {bucket.attemptedDays}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DailyConsistencyChart30Day({
  data,
  onOpenDaily,
  hasSampleData,
  onLoadSampleDashboard,
}: DailyConsistencyChart30DayProps) {
  const [chartMode, setChartMode] = useState<'daily-30' | 'period-rollup'>(
    'daily-30'
  );

  return (
    <section
      data-testid="dashboard-30day-daily-chart"
      aria-labelledby="daily-30day-chart-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      {/* Card Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-[#047857]"
              aria-hidden="true"
            />
            <h2
              id="daily-30day-chart-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              30-Day Daily Challenge Consistency
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            Daily challenge completion frequency across the last 30 calendar
            days ({data.startDateLabel} – {data.endDateLabel}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="30-day chart granularity"
            className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
          >
            <button
              type="button"
              role="tab"
              data-testid="chart-30day-tab-daily"
              aria-selected={chartMode === 'daily-30'}
              onClick={() => setChartMode('daily-30')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                chartMode === 'daily-30'
                  ? 'bg-white text-[#1C232B] shadow-xs'
                  : 'text-[#5A6572] hover:text-[#1C232B]'
              }`}
            >
              30-Day Daily
            </button>
            <button
              type="button"
              role="tab"
              data-testid="chart-30day-tab-rollup"
              aria-selected={chartMode === 'period-rollup'}
              onClick={() => setChartMode('period-rollup')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                chartMode === 'period-rollup'
                  ? 'bg-white text-[#1C232B] shadow-xs'
                  : 'text-[#5A6572] hover:text-[#1C232B]'
              }`}
            >
              6-Day Blocks
            </button>
          </div>
        </div>
      </div>

      {/* Inline Unboxed Consistency Summary + Legend */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[#1C232B] tabular-nums">
          <span>
            <span className="text-[#5A6572]">Solved </span>
            <strong
              data-testid="chart-30day-solved-count"
              className="font-semibold text-[#047857]"
            >
              {data.solvedDays}/30
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Consistency </span>
            <strong
              data-testid="chart-30day-rate"
              className="font-semibold text-[#1D4ED8]"
            >
              {data.consistencyPercent}%
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Best 30d Run </span>
            <strong
              data-testid="chart-30day-longest-run"
              className="font-semibold text-[#B45309]"
            >
              {data.longestRunIn30Days}d
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#5A6572]">
          {chartMode === 'daily-30' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
                Solved (1)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706]" />
                Attempted
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#D6CFC0]" />
                No Entry
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
              Completed Days per 6-Day Block (target 4/6)
            </span>
          )}
          <button
            type="button"
            onClick={onOpenDaily}
            className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
          >
            Play Today&apos;s Daily
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Recharts Bar Chart Viewport */}
      <div className="mt-4 h-[235px] w-full">
              <ChartA11y label="Daily consistency, last 30 days" data={(chartMode === 'daily-30' ? data.points : data.weeklyBuckets) as never} />
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'daily-30' ? (
            <BarChart
              data={data.points}
              margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
              barCategoryGap="22%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E8E2D6"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                interval={4}
                tick={{ fill: '#5A6572', fontSize: 10 }}
                axisLine={{ stroke: '#D8D1C4' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(v) => (v === 1 ? 'Done' : '0')}
                tick={{ fill: '#5A6572', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<DailyBarTooltip />}
                cursor={{ fill: 'rgba(29, 78, 216, 0.06)' }}
              />
              <Bar
                dataKey="barHeight"
                radius={[4, 4, 1, 1]}
                maxBarSize={18}
                animationDuration={350}
              >
                {data.points.map((entry) => {
                  const fill =
                    entry.status === 'solved'
                      ? '#047857'
                      : entry.status === 'attempted'
                        ? '#D97706'
                        : '#D6CFC0';
                  return (
                    <Cell
                      key={entry.dateKey}
                      fill={fill}
                      stroke={entry.isToday ? '#1D4ED8' : 'none'}
                      strokeWidth={entry.isToday ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={data.weeklyBuckets}
              margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E8E2D6"
                vertical={false}
              />
              <XAxis
                dataKey="rangeLabel"
                tick={{ fill: '#5A6572', fontSize: 10 }}
                axisLine={{ stroke: '#D8D1C4' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 6]}
                ticks={[0, 2, 4, 6]}
                allowDecimals={false}
                tick={{ fill: '#5A6572', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<PeriodRollupTooltip />}
                cursor={{ fill: 'rgba(29, 78, 216, 0.06)' }}
              />
              <ReferenceLine
                y={4}
                stroke="#1D4ED8"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <Bar
                dataKey="completedDays"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
                animationDuration={350}
              >
                {data.weeklyBuckets.map((bucket) => (
                  <Cell
                    key={bucket.periodIndex}
                    fill={
                      bucket.completedDays >= 4
                        ? '#047857'
                        : bucket.completedDays > 0
                          ? '#1D4ED8'
                          : '#D6CFC0'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Subtle Empty Guidance Strip when no 30-day records exist yet */}
      {data.activeDaysIn30Days === 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-3 text-xs text-[#5A6572]">
          <p>
            Complete today&apos;s Daily Math Challenge to raise your first
            emerald bar on the 30-day timeline.
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
