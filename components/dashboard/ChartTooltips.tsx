import type { ReactNode } from 'react';
import type {
  ArithmeticAccuracyPoint,
  DailyCompletionHistoryBucket,
  DailyScoreSpeedPoint,
} from '@/lib/performance-dashboard';

type TipProps<T> = { active?: boolean; payload?: { payload?: T }[] };

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs shadow-md">
      {children}
    </div>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 space-y-1 border-t border-[#ECE7DD] pt-2 font-mono tabular-nums">
      {children}
    </div>
  );
}

function Row({
  label,
  labelClass = 'text-[#5A6572]',
  valueClass = 'text-[#1C232B]',
  extra = '',
  children,
}: {
  label: string;
  labelClass?: string;
  valueClass?: string;
  extra?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between gap-4${extra}`}>
      <span className={labelClass}>{label}</span>
      <span className={`font-semibold ${valueClass}`}>{children}</span>
    </div>
  );
}

export function AccuracyTooltip({ active, payload }: TipProps<ArithmeticAccuracyPoint>) {
  const pt = active ? payload?.[0]?.payload : undefined;
  if (!pt) return null;
  return (
    <Shell>
      <p className="font-semibold text-[#1C232B]">
        {pt.gameTitle} · {pt.dateLabel}
      </p>
      <p className="mt-0.5 text-[#5A6572]">
        Session {pt.label} · {pt.tierLabel}
      </p>
      <Rows>
        <Row label="Accuracy" valueClass="text-[#1D4ED8]">
          {pt.accuracyPercent}% ({pt.solved}/{pt.attempted})
        </Row>
        <Row label="3-Round Avg" valueClass="text-[#047857]">
          {pt.rollingAccuracy}%
        </Row>
        <Row label="Adaptive Band" valueClass="text-[#B45309]">
          Level {pt.adaptiveLevel}
        </Row>
        <Row label="Pace / Score">
          {pt.pacePerMinute}/min · {pt.score} pts
        </Row>
      </Rows>
    </Shell>
  );
}

export function CompletionCadenceTooltip({
  active,
  payload,
}: TipProps<DailyCompletionHistoryBucket>) {
  const pt = active ? payload?.[0]?.payload : undefined;
  if (!pt) return null;
  return (
    <Shell>
      <p className="font-semibold text-[#1C232B]">
        {pt.shortDay}, {pt.dateLabel}
        {pt.isToday ? ' (Today)' : ''}
      </p>
      <Rows>
        <Row label="Core Arithmetic" labelClass="text-[#1D4ED8]">
          {pt.arithmeticRounds}
        </Row>
        <Row label="Daily Challenge" labelClass="text-[#B45309]">
          {pt.dailySolved > 0 ? `Solved (${pt.dailyScore} pts)` : '0'}
        </Row>
        <Row label="Factor Grid" labelClass="text-[#047857]">
          {pt.factorGridRounds}
        </Row>
        <Row label="Total Completed" extra=" border-t border-[#ECE7DD] pt-1">
          {pt.totalChallenges}
        </Row>
      </Rows>
    </Shell>
  );
}

export function DailyScoreSpeedTooltip({ active, payload }: TipProps<DailyScoreSpeedPoint>) {
  const pt = active ? payload?.[0]?.payload : undefined;
  if (!pt) return null;
  return (
    <Shell>
      <p className="font-semibold text-[#1C232B]">
        Edition {pt.editionLabel} · {pt.dateLabel}
      </p>
      <p className="mt-0.5 text-[#5A6572]">{pt.archetypeTitle}</p>
      <Rows>
        <Row label="Daily Score" valueClass="text-[#047857]">
          {pt.score} pts
          {pt.streakBonus > 0 ? ` (+${pt.streakBonus} streak)` : ''}
        </Row>
        <Row label="Solve Speed" valueClass="text-[#1D4ED8]">
          {pt.secondsUsed}s / {pt.timeLimitSeconds}s
        </Row>
        <Row label="Precision">
          {pt.mistakes} misses · {pt.hintsUsed} hints
        </Row>
      </Rows>
    </Shell>
  );
}
