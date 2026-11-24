'use client';

import ChartA11y from '@/components/ChartA11y';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, CalendarCheck2 } from 'lucide-react';
import type {
  DailyCompletionHistoryBucket,
  DailyScoreSpeedPoint,
} from '@/lib/performance-dashboard';
import { CompletionCadenceTooltip, DailyScoreSpeedTooltip } from './ChartTooltips';
import { segClass } from './segClass';

type View = 'cadence' | 'daily-score';

const TABS: { id: View; label: string }[] = [
  { id: 'cadence', label: '14-Day Cadence' },
  { id: 'daily-score', label: 'Daily Vault Scores' },
];

const LEGEND: Record<View, { swatch: string; label: string }[]> = {
  cadence: [
    { swatch: 'h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]', label: 'Arithmetic' },
    { swatch: 'h-2.5 w-2.5 rounded-xs bg-[#B45309]', label: 'Daily Vault' },
    { swatch: 'h-2.5 w-2.5 rounded-xs bg-[#047857]', label: 'Factor Grid' },
  ],
  'daily-score': [
    { swatch: 'h-2.5 w-2.5 rounded-xs bg-[#047857]', label: 'Daily Score (pts)' },
    { swatch: 'h-0.5 w-3.5 bg-[#1D4ED8]', label: 'Solve Time (s)' },
  ],
};

const grid = (
  <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D6" vertical={false} />
);
const tick10 = { fill: '#5A6572', fontSize: 10 };

export default function CompletionHistoryCard({
  completionHistory,
  dailyScoreSpeed,
  onOpenDaily,
}: {
  completionHistory: DailyCompletionHistoryBucket[];
  dailyScoreSpeed: DailyScoreSpeedPoint[];
  onOpenDaily: () => void;
}) {
  const [historyView, setHistoryView] = useState<View>('cadence');

  return (
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
          className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={historyView === tab.id}
              onClick={() => setHistoryView(tab.id)}
              className={segClass(historyView === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5A6572]">
        <div className="flex flex-wrap items-center gap-3.5">
          {LEGEND[historyView].map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={l.swatch} />
              {l.label}
            </span>
          ))}
        </div>

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
            Crack today&apos;s timed 3-clue vault to start plotting your Daily
            Score &amp; Solve Speed history.
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
          <ChartA11y
            label="Daily challenge completion history"
            data={(historyView === 'cadence' ? completionHistory : dailyScoreSpeed) as never}
          />
          <ResponsiveContainer width="100%" height="100%">
            {historyView === 'cadence' ? (
              <BarChart
                data={completionHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 4 }}
              >
                {grid}
                <XAxis
                  dataKey="dateLabel"
                  interval={1}
                  tick={tick10}
                  axisLine={{ stroke: '#D8D1C4' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={tick10}
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
                {grid}
                <XAxis
                  dataKey="dateLabel"
                  tick={tick10}
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
  );
}
