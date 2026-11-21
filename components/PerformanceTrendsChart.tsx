'use client';

import ChartA11y from '@/components/ChartA11y';
import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, RotateCcw, TrendingUp } from 'lucide-react';
import {
  buildModeBreakdown,
  buildTierBreakdown,
  buildTimelineSeries,
  computeTrendSummary,
  type BreakdownBucket,
  type ModeFilter,
  type TierFilter,
  type TrendPoint,
} from '@/lib/notebook-analytics';
import type { MatchRecord } from '@/lib/types';

type ChartView = 'timeline' | 'tiers' | 'modes';

interface PerformanceTrendsChartProps {
  matches: MatchRecord[];
  allMatches: MatchRecord[];
  modeFilter: ModeFilter;
  tierFilter: TierFilter;
  onChangeModeFilter: (mode: ModeFilter) => void;
  onChangeTierFilter: (tier: TierFilter) => void;
  onResetFilters: () => void;
}

const MODE_OPTIONS: { id: ModeFilter; label: string }[] = [
  { id: 'all', label: 'All Modes' },
  { id: 'vs-ai', label: 'Human vs. AI' },
  { id: 'solo', label: 'Solo · Taxman' },
  { id: 'local', label: 'Pass-and-Play' },
];

const TIER_OPTIONS: { id: TierFilter; label: string }[] = [
  { id: 'all', label: 'All Tiers' },
  { id: 'explorers', label: 'Explorers' },
  { id: 'challengers', label: 'Challengers' },
  { id: 'strategists', label: 'Strategists' },
];

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: TrendPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">
        Match {point.label} · {point.dateLabel}
      </p>
      <p className="mt-0.5 text-[#5A6572]">
        {point.tierLabel} · {point.modeLabel} (vs. {point.opponentName})
      </p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Your Score</span>
          <span className="font-semibold text-[#1D4ED8]">
            {point.playerScore}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Opponent</span>
          <span className="font-semibold text-[#8A5108]">
            {point.opponentScore}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Score Margin</span>
          <span
            className={`font-semibold ${
              point.scoreMargin >= 0 ? 'text-[#047857]' : 'text-[#BE123C]'
            }`}
          >
            {point.scoreMargin >= 0 ? '+' : ''}
            {point.scoreMargin}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Primes Claimed</span>
          <span className="font-semibold text-[#1C232B]">
            {point.primesClaimed}
          </span>
        </div>
      </div>
    </div>
  );
}

function BreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: BreakdownBucket }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-[#1C232B]">{bucket.label}</p>
      <p className="mt-0.5 text-[#5A6572] font-mono tabular-nums">
        {bucket.matches} {bucket.matches === 1 ? 'match' : 'matches'} ·{' '}
        {bucket.winRate}% win rate
      </p>
      <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Avg Your Score</span>
          <span className="font-semibold text-[#1D4ED8]">
            {bucket.avgScore}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Avg Opponent</span>
          <span className="font-semibold text-[#8A5108]">
            {bucket.avgOpponentScore}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5A6572]">Avg Margin</span>
          <span
            className={`font-semibold ${
              bucket.avgMargin >= 0 ? 'text-[#047857]' : 'text-[#BE123C]'
            }`}
          >
            {bucket.avgMargin >= 0 ? '+' : ''}
            {bucket.avgMargin}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceTrendsChart({
  matches,
  allMatches,
  modeFilter,
  tierFilter,
  onChangeModeFilter,
  onChangeTierFilter,
  onResetFilters,
}: PerformanceTrendsChartProps) {
  const [chartView, setChartView] = useState<ChartView>('timeline');
  const [timelineMetric, setTimelineMetric] = useState<'scores' | 'margin'>(
    'scores'
  );

  const timeline = useMemo(() => buildTimelineSeries(matches), [matches]);
  const summary = useMemo(() => computeTrendSummary(timeline), [timeline]);
  const tierBreakdown = useMemo(
    () => buildTierBreakdown(allMatches),
    [allMatches]
  );
  const modeBreakdown = useMemo(
    () => buildModeBreakdown(allMatches),
    [allMatches]
  );

  const isFiltered = modeFilter !== 'all' || tierFilter !== 'all';

  return (
    <section
      aria-labelledby="trends-heading"
      data-testid="performance-trends-chart"
      className="card-tactile mt-8 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row: Title + Chart View Segmented Control */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <h2
            id="trends-heading"
            className="font-display text-xl font-semibold text-[#1C232B]"
          >
            Performance Trends
          </h2>
          <p className="mt-1 text-xs text-[#5A6572] font-mono tabular-nums">
            {timeline.length}{' '}
            {timeline.length === 1 ? 'match' : 'matches'} · Avg{' '}
            {summary.avgScore} · Margin{' '}
            {summary.avgMargin >= 0 ? '+' : ''}
            {summary.avgMargin}
            {summary.hasTrend && (
              <>
                {' '}
                ·{' '}
                <span
                  className={
                    summary.scoreDelta >= 0
                      ? 'font-semibold text-[#047857]'
                      : 'font-semibold text-[#BE123C]'
                  }
                >
                  {summary.scoreDelta >= 0 ? '+' : ''}
                  {summary.scoreDelta} trend
                </span>
              </>
            )}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Chart perspective"
          className="flex flex-wrap sm:inline-flex sm:flex-nowrap max-w-full items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1 shrink-0"
        >
          {[
            { id: 'timeline' as ChartView, label: 'Score Over Time', icon: TrendingUp },
            { id: 'tiers' as ChartView, label: 'By Age Tier', icon: BarChart3 },
            { id: 'modes' as ChartView, label: 'By Game Mode', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = chartView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setChartView(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                  active
                    ? 'bg-white text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Controls Row (applies directly to Timeline & Match Ledger) */}
      {chartView === 'timeline' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter trends by game mode"
              className="flex min-w-0 max-w-full flex-wrap sm:flex-nowrap items-center gap-1 rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-1"
            >
              {MODE_OPTIONS.map((opt) => {
                const active = modeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeModeFilter(opt.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white font-semibold text-[#1D4ED8] shadow-xs'
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
              aria-label="Filter trends by age tier"
              className="flex min-w-0 max-w-full flex-wrap sm:flex-nowrap items-center gap-1 rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-1"
            >
              {TIER_OPTIONS.map((opt) => {
                const active = tierFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeTierFilter(opt.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white font-semibold text-[#1C232B] shadow-xs'
                        : 'text-[#5A6572] hover:text-[#1C232B]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label="Timeline metric"
              className="inline-flex items-center gap-1 rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-1"
            >
              <button
                type="button"
                aria-pressed={timelineMetric === 'scores'}
                onClick={() => setTimelineMetric('scores')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  timelineMetric === 'scores'
                    ? 'bg-white font-semibold text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                Scores
              </button>
              <button
                type="button"
                aria-pressed={timelineMetric === 'margin'}
                onClick={() => setTimelineMetric('margin')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  timelineMetric === 'margin'
                    ? 'bg-white font-semibold text-[#047857] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                Net Margin
              </button>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Chart Canvas */}
      <div className="mt-5">
        {chartView === 'timeline' && timeline.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[#D8D1C4] bg-[#FAF8F4] p-6 text-center">
            <p className="text-sm font-semibold text-[#1C232B]">
              No matches recorded for this mode and tier combination yet.
            </p>
            <p className="mt-1 text-xs text-[#5A6572]">
              Try switching filters or reset to view your full progress curve.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Show All Matches
            </button>
          </div>
        ) : chartView === 'timeline' ? (
          <>
            <div className="h-[290px] w-full">
              <ChartA11y label="Match score timeline" data={timeline as never} />
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <ComposedChart
                  data={timeline}
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="playerScoreFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#1D4ED8"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="#1D4ED8"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                    <linearGradient
                      id="marginFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#047857"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="#047857"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#ECE7DD"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{
                      fill: '#5A6572',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                    axisLine={{ stroke: '#E5E0D5' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: '#5A6572',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<TimelineTooltip />} />
                  {timelineMetric === 'scores' ? (
                    <>
                      <ReferenceLine y={0} stroke="#D8D1C4" />
                      <Area
                        type="monotone"
                        dataKey="playerScore"
                        name="Your Score"
                        stroke="#1D4ED8"
                        strokeWidth={2.5}
                        fill="url(#playerScoreFill)"
                        animationDuration={240}
                        dot={{
                          r: 4,
                          fill: '#FFFFFF',
                          stroke: '#1D4ED8',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 6,
                          fill: '#1D4ED8',
                          stroke: '#FFFFFF',
                          strokeWidth: 2,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="opponentScore"
                        name="Opponent / Taxman"
                        stroke="#B45309"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        animationDuration={240}
                        dot={{
                          r: 3.5,
                          fill: '#FFFFFF',
                          stroke: '#B45309',
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 5, fill: '#B45309' }}
                      />
                    </>
                  ) : (
                    <>
                      <ReferenceLine
                        y={0}
                        stroke="#8B949E"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="scoreMargin"
                        name="Net Margin"
                        stroke="#047857"
                        strokeWidth={2.5}
                        fill="url(#marginFill)"
                        animationDuration={240}
                        dot={{
                          r: 4,
                          fill: '#FFFFFF',
                          stroke: '#047857',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 6,
                          fill: '#047857',
                          stroke: '#FFFFFF',
                          strokeWidth: 2,
                        }}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1EDE4] pt-3 text-xs text-[#5A6572]">
              {timelineMetric === 'scores' ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-0.5 w-4 bg-[#1D4ED8]"
                    />
                    Your Score (solid cobalt)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#B45309]"
                    />
                    Opponent / Taxman (dashed ochre)
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-0.5 w-4 bg-[#047857]"
                    />
                    Net Score Margin (Your Score − Opponent · above 0 = win)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#8B949E]"
                    />
                    Break-even (0)
                  </span>
                </div>
              )}
              <span className="font-mono text-[11px] tabular-nums">
                Chronological · Oldest → Latest
              </span>
            </div>
          </>
        ) : chartView === 'tiers' ? (
          <>
            <div className="h-[290px] w-full">
              <ChartA11y label="Performance by age tier" data={tierBreakdown as never} />
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <BarChart
                  data={tierBreakdown}
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                  barGap={6}
                >
                  <CartesianGrid
                    stroke="#ECE7DD"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{
                      fill: '#1C232B',
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                    }}
                    axisLine={{ stroke: '#E5E0D5' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: '#5A6572',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<BreakdownTooltip />} />
                  <Bar
                    dataKey="avgScore"
                    name="Avg Your Score"
                    fill="#1D4ED8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                    animationDuration={240}
                  />
                  <Bar
                    dataKey="avgOpponentScore"
                    name="Avg Opponent Score"
                    fill="#D4B88C"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                    animationDuration={240}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#F1EDE4] pt-3 text-xs text-[#5A6572]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]"
                />
                Your Avg Score
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-xs bg-[#D4B88C]"
                />
                Opponent Avg Score
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#F1EDE4] pt-4 sm:grid-cols-3">
              {tierBreakdown.map((bucket) => (
                <div
                  key={bucket.key}
                  className="flex items-baseline justify-between border-b border-[#F1EDE4] pb-2 sm:flex-col sm:border-b-0 sm:pb-0"
                >
                  <span className="text-xs font-semibold text-[#1C232B]">
                    {bucket.label}
                  </span>
                  <span className="mt-0.5 font-mono text-xs text-[#5A6572] tabular-nums">
                    {bucket.matches > 0
                      ? `${bucket.matches} played · ${bucket.winRate}% wins · avg ${bucket.avgMargin >= 0 ? '+' : ''}${bucket.avgMargin}`
                      : 'No matches yet'}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="h-[290px] w-full">
              <ChartA11y label="Performance by game mode" data={modeBreakdown as never} />
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <BarChart
                  data={modeBreakdown}
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                  barGap={8}
                >
                  <CartesianGrid
                    stroke="#ECE7DD"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{
                      fill: '#1C232B',
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                    }}
                    axisLine={{ stroke: '#E5E0D5' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{
                      fill: '#5A6572',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip content={<BreakdownTooltip />} />
                  <Bar
                    dataKey="winRate"
                    name="Win Rate (%)"
                    fill="#047857"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    animationDuration={240}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#F1EDE4] pt-4 sm:grid-cols-3">
              {modeBreakdown.map((bucket) => (
                <div
                  key={bucket.key}
                  className="flex items-baseline justify-between border-b border-[#F1EDE4] pb-2 sm:flex-col sm:border-b-0 sm:pb-0"
                >
                  <span className="text-xs font-semibold text-[#1C232B]">
                    {bucket.label}
                  </span>
                  <span className="mt-0.5 font-mono text-xs text-[#5A6572] tabular-nums">
                    {bucket.matches > 0
                      ? `${bucket.wins}/${bucket.matches} won (${bucket.winRate}%) · avg score ${bucket.avgScore}`
                      : 'No matches yet'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
