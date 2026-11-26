import type { ReactNode } from 'react';
import { CalendarCheck2, Flame, Target, Zap } from 'lucide-react';
import type { DashboardOverviewStats } from '@/lib/performance-dashboard';

const SUB = 'mt-1 font-mono text-[11px] tabular-nums';
const SUB_MUTED = 'mt-1 font-mono text-[11px] text-[#5A6572] tabular-nums';

function Kpi({
  title,
  icon,
  testId,
  value,
  children,
}: {
  title: string;
  icon: ReactNode;
  testId: string;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card-tactile rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs font-medium text-[#5A6572]">
        <span>{title}</span>
        {icon}
      </div>
      <p
        data-testid={testId}
        className="mt-2 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums"
      >
        {value}
      </p>
      {children}
    </div>
  );
}

const icon = (Icon: typeof Target, color: string) => (
  <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
);

export default function KpiCards({ overview }: { overview: DashboardOverviewStats }) {
  const { accuracyDelta } = overview;
  const sessions = overview.arithmeticSessionCount;
  return (
    <section
      aria-label="Key performance metrics"
      className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      <Kpi
        title="Arithmetic Accuracy"
        icon={icon(Target, 'text-[#1D4ED8]')}
        testId="kpi-arithmetic-accuracy"
        value={
          overview.avgArithmeticAccuracy !== null
            ? `${overview.avgArithmeticAccuracy}%`
            : '—'
        }
      >
        <p className={SUB}>
          {accuracyDelta !== null ? (
            <span
              className={
                accuracyDelta >= 0
                  ? 'font-semibold text-[#047857]'
                  : 'font-semibold text-[#BE123C]'
              }
            >
              {accuracyDelta >= 0 ? '+' : ''}
              {accuracyDelta}% recent trend
            </span>
          ) : (
            <span className="text-[#5A6572]">
              {sessions === 0 ? 'No rounds yet' : 'Complete 2+ rounds for trend'}
            </span>
          )}
        </p>
      </Kpi>

      <Kpi
        title="Problems Solved"
        icon={icon(Zap, 'text-[#047857]')}
        testId="kpi-problems-solved"
        value={overview.totalProblemsSolved}
      >
        <p className={SUB_MUTED}>
          {sessions} {sessions === 1 ? 'session' : 'sessions'}
          {overview.avgPacePerMinute !== null
            ? ` · ${overview.avgPacePerMinute}/min avg`
            : ''}
        </p>
      </Kpi>

      <Kpi
        title="Daily Challenges"
        icon={icon(CalendarCheck2, 'text-[#B45309]')}
        testId="kpi-daily-solved"
        value={overview.dailySolvedCount}
      >
        <p className={SUB_MUTED}>
          {overview.dailyAttemptedCount} attempted · {overview.totalChallengesCompleted}{' '}
          total logs
        </p>
      </Kpi>

      <Kpi
        title="Current Daily Streak"
        icon={icon(Flame, 'text-[#B45309]')}
        testId="kpi-daily-streak"
        value={`${overview.currentDailyStreak}d`}
      >
        <p className={SUB_MUTED}>Best streak {overview.bestDailyStreak}d</p>
      </Kpi>
    </section>
  );
}
