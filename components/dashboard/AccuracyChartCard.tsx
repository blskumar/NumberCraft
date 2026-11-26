'use client';

import ChartA11y from '@/components/ChartA11y';
import { useState } from 'react';
import {
  Area,
  CartesianGrid,
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
  Database,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import type {
  ArithmeticAccuracyPoint,
  DashboardGameFilter,
  DashboardTierFilter,
} from '@/lib/performance-dashboard';
import type { ArithmeticGameId } from '@/lib/types';
import { AccuracyTooltip } from './ChartTooltips';
import { segClass } from './segClass';

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

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={segClass(value === opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AccuracyChartCard({
  series,
  gameFilter,
  tierFilter,
  onGameFilter,
  onTierFilter,
  hasAnyArithmetic,
  hasSampleData,
  onLaunchArithmetic,
  onLoadSampleDashboard,
}: {
  series: ArithmeticAccuracyPoint[];
  gameFilter: DashboardGameFilter;
  tierFilter: DashboardTierFilter;
  onGameFilter: (next: DashboardGameFilter) => void;
  onTierFilter: (next: DashboardTierFilter) => void;
  hasAnyArithmetic: boolean;
  hasSampleData: boolean;
  onLaunchArithmetic: (gameId: ArithmeticGameId) => void;
  onLoadSampleDashboard: () => void;
}) {
  const [showAdaptiveOverlay, setShowAdaptiveOverlay] = useState(true);
  const axisTick = { fill: '#5A6572', fontSize: 11 };

  return (
    <section
      data-testid="dashboard-accuracy-chart"
      aria-labelledby="accuracy-chart-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
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
          <FilterGroup
            label="Filter arithmetic game"
            options={GAME_FILTERS}
            value={gameFilter}
            onChange={onGameFilter}
          />
          <FilterGroup
            label="Filter age tier"
            options={TIER_FILTERS}
            value={tierFilter}
            onChange={onTierFilter}
          />
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

      {series.length === 0 ? (
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
          <ChartA11y label="Accuracy trend" data={series as never} />
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
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
                tick={axisTick}
                axisLine={{ stroke: '#D8D1C4' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="acc"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={axisTick}
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
  );
}
