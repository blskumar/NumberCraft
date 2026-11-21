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
import { ArrowRight, CheckCircle2, Database } from 'lucide-react';
import type {
  DailyGoalCompletionRate30DayData,
  DailyGoalRateDayPoint,
  DailyGoalRatePeriodBucket,
} from '@/lib/performance-dashboard';

interface DailyGoalCompletionRateChartProps {
  data: DailyGoalCompletionRate30DayData;
  onOpenDaily: () => void;
  hasSampleData: boolean;
  onLoadSampleDashboard: () => void;
}

function DailyRateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DailyGoalRateDayPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const statusLabel =
    pt.status === 'met'
      ? 'Daily Goal Met (100%)'
      : pt.status === 'partial'
        ? `Partial Completion (${pt.completionRatePercent}%)`
        : 'Not Completed (0%)';

  const statusTone =
    pt.status === 'met'
      ? 'text-[#047857]'
      : pt.status === 'partial'
        ? 'text-[#B45309]'
        : 'text-[#5A6572]';

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">
        {pt.shortDay}, {pt.dateLabel}
        {pt.isToday ? ' (Today)' : ''}
      </p>
      <p className={`mt-0.5 font-semibold ${statusTone}`}>{statusLabel}</p>

      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Completion Rate</span>
          <span className="font-semibold text-[#1D4ED8]">
            {pt.completionRatePercent}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Daily Steps</span>
          <span className="font-semibold text-[#1C232B]">
            {pt.stepsSolved} / 3
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">7-Day Rolling Rate</span>
          <span className="font-semibold text-[#047857]">
            {pt.rolling7DayRatePercent}%
          </span>
        </div>
        {pt.archetypeTitle && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Puzzle</span>
            <span className="font-semibold text-[#1C232B]">
              {pt.archetypeTitle}
            </span>
          </div>
        )}
        {pt.status !== 'missed' && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Score</span>
            <span className="font-semibold text-[#047857]">{pt.score} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PeriodRateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DailyGoalRatePeriodBucket }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">{bucket.rangeLabel}</p>
      <p className="mt-0.5 text-[#5A6572]">
        Block {bucket.periodIndex} of 5 ({bucket.totalDays}-day window)
      </p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Goal Completion Rate</span>
          <span className="font-semibold text-[#047857]">
            {bucket.completionRatePercent}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Days Goal Met</span>
          <span className="font-semibold text-[#1D4ED8]">
            {bucket.daysMet} / {bucket.totalDays}
          </span>
        </div>
        {bucket.partialDays > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5A6572]">Partial Days</span>
            <span className="font-semibold text-[#B45309]">
              {bucket.partialDays}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Avg Daily Progress</span>
          <span className="font-semibold text-[#1C232B]">
            {bucket.avgDailyRatePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DailyGoalCompletionRateChart({
  data,
  onOpenDaily,
  hasSampleData,
  onLoadSampleDashboard,
}: DailyGoalCompletionRateChartProps) {
  const [granularity, setGranularity] = useState<'daily' | 'blocks'>('daily');
  const hasAnyEntries = data.daysMet > 0 || data.partialDays > 0;

  return (
    <section
      data-testid="dashboard-daily-goal-rate-chart"
      aria-labelledby="daily-goal-rate-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="h-4 w-4 text-[#047857]"
              aria-hidden="true"
            />
            <h2
              id="daily-goal-rate-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              Daily Goal Completion Rate
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            Tracks daily goal completion percentage across the last 30 days (
            {data.startDateLabel} – {data.endDateLabel}) from your recorded
            daily completions.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Daily goal completion rate view"
          className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1 lg:self-auto"
        >
          <button
            type="button"
            role="tab"
            data-testid="goal-rate-tab-daily"
            aria-selected={granularity === 'daily'}
            onClick={() => setGranularity('daily')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              granularity === 'daily'
                ? 'bg-white text-[#1C232B] shadow-xs'
                : 'text-[#5A6572] hover:text-[#1C232B]'
            }`}
          >
            Daily Rate (%)
          </button>
          <button
            type="button"
            role="tab"
            data-testid="goal-rate-tab-blocks"
            aria-selected={granularity === 'blocks'}
            onClick={() => setGranularity('blocks')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              granularity === 'blocks'
                ? 'bg-white text-[#1C232B] shadow-xs'
                : 'text-[#5A6572] hover:text-[#1C232B]'
            }`}
          >
            6-Day Rate (%)
          </button>
        </div>
      </div>

      {/* Inline Unboxed Tabular Metrics + Legend */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[#1C232B] tabular-nums">
          <span>
            <span className="text-[#5A6572]">30-Day Rate </span>
            <strong
              data-testid="goal-rate-30day-percent"
              className="font-semibold text-[#047857]"
            >
              {data.overallCompletionRatePercent}%
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Days Met </span>
            <strong
              data-testid="goal-rate-days-met"
              className="font-semibold text-[#1D4ED8]"
            >
              {data.daysMet}/30
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Last 7d Rate </span>
            <strong
              data-testid="goal-rate-7day-percent"
              className="font-semibold text-[#047857]"
            >
              {data.last7DaysRatePercent}%
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Avg Daily </span>
            <strong
              data-testid="goal-rate-avg-daily"
              className="font-semibold text-[#B45309]"
            >
              {data.avgDailyRatePercent}%
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#5A6572]">
          {granularity === 'daily' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
                100% Met
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706]" />
                Partial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-t-2 border-dashed border-[#1D4ED8]" />
                30d Avg
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
                &ge; 70% Target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]" />
                In Progress
              </span>
            </>
          )}
          <button
            type="button"
            onClick={onOpenDaily}
            className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
          >
            Log Today&apos;s Daily
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="mt-4 h-[240px] w-full">
              <ChartA11y label="Daily goal completion rate" data={(granularity === 'daily' ? data.points : data.periodBuckets) as never} />
        <ResponsiveContainer width="100%" height="100%">
          {granularity === 'daily' ? (
            <BarChart
              data={data.points}
              margin={{ top: 14, right: 14, left: -12, bottom: 4 }}
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
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#5A6572', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<DailyRateTooltip />}
                cursor={{ fill: 'rgba(29, 78, 216, 0.06)' }}
              />
              {data.avgDailyRatePercent > 0 && (
                <ReferenceLine
                  y={data.avgDailyRatePercent}
                  stroke="#1D4ED8"
                  strokeDasharray="4 4"
                  strokeOpacity={0.65}
                  label={{
                    value: `Avg ${data.avgDailyRatePercent}%`,
                    position: 'insideBottomLeft',
                    fill: '#1D4ED8',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              <Bar
                dataKey="completionRatePercent"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                animationDuration={350}
              >
                {data.points.map((entry) => {
                  const fill =
                    entry.status === 'met'
                      ? '#047857'
                      : entry.status === 'partial'
                        ? '#D97706'
                        : '#E5E0D5';
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
              data={data.periodBuckets}
              margin={{ top: 14, right: 14, left: -12, bottom: 4 }}
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
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#5A6572', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<PeriodRateTooltip />}
                cursor={{ fill: 'rgba(29, 78, 216, 0.06)' }}
              />
              <ReferenceLine
                y={70}
                stroke="#047857"
                strokeDasharray="4 4"
                strokeOpacity={0.55}
                label={{
                  value: '70% Target',
                  position: 'insideTopRight',
                  fill: '#047857',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="completionRatePercent"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={350}
              >
                {data.periodBuckets.map((bucket) => (
                  <Cell
                    key={bucket.periodIndex}
                    fill={
                      bucket.completionRatePercent >= 70
                        ? '#047857'
                        : bucket.completionRatePercent > 0
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

      {/* Empty State Guidance Strip */}
      {!hasAnyEntries && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-3 text-xs text-[#5A6572]">
          <p>
            Complete Daily Math Challenges to measure your 30-day Daily Goal
            Completion Rate and 7-day rolling consistency.
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
