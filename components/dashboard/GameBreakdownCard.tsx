'use client';

import ChartA11y from '@/components/ChartA11y';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { ArithmeticGameSummary } from '@/lib/performance-dashboard';
import type { ArithmeticGameId } from '@/lib/types';

const SHORT_LABELS: Record<ArithmeticGameId, string> = {
  'addition-attack': 'Addition',
  'subtraction-sprint': 'Subtraction',
  'multiplication-mastery': 'Multiplication',
};

export default function GameBreakdownCard({
  gameBreakdown,
  onLaunchArithmetic,
}: {
  gameBreakdown: ArithmeticGameSummary[];
  onLaunchArithmetic: (gameId: ArithmeticGameId) => void;
}) {
  const chartData = useMemo(
    () =>
      gameBreakdown.map((g) => ({
        ...g,
        shortLabel: SHORT_LABELS[g.gameId],
        barAccuracy: g.avgAccuracy ?? 0,
      })),
    [gameBreakdown]
  );

  return (
    <section
      data-testid="dashboard-game-breakdown"
      aria-labelledby="game-breakdown-heading"
      className="card-tactile flex flex-col justify-between rounded-2xl p-5 sm:p-6 lg:col-span-5"
    >
      <div>
        <div className="flex items-center gap-2 border-b border-[#ECE7DD] pb-4">
          <BarChart3 className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
          <div>
            <h2
              id="game-breakdown-heading"
              className="font-display text-lg font-semibold text-[#1C232B]"
            >
              Accuracy by Arithmetic Mode
            </h2>
            <p className="text-xs text-[#5A6572]">
              Compare precision, pace, and peak adaptive band across all three
              drills.
            </p>
          </div>
        </div>

        <div className="mt-4 h-[175px] w-full">
          <ChartA11y label="Game breakdown" data={chartData as never} />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                {chartData.map((entry) => (
                  <Cell
                    key={entry.gameId}
                    fill={entry.sessions === 0 ? '#E5E0D5' : entry.accentHex}
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
  );
}
