'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Award, CheckCircle2, Flame } from 'lucide-react';
import type { DailyGoalProgress } from '@/lib/daily-goal';

interface DailyGoalRingProps {
  progress: DailyGoalProgress;
  onStartPractice: () => void;
  onOpenDaily: () => void;
}

export default function DailyGoalRing({
  progress,
  onStartPractice,
  onOpenDaily,
}: DailyGoalRingProps) {
  const prefersReducedMotion = useReducedMotion();

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (progress.ringPercent / 100) * circumference;

  const flameActive = progress.dailyStreak > 0;

  return (
    <section
      aria-label="Daily goal progress and consecutive streak"
      className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-12"
    >
      {/* Visual Daily Goal Progress Ring */}
      <div
        data-testid="studio-daily-goal-ring"
        className="card-tactile flex flex-col justify-between gap-4 rounded-2xl bg-[#FFFDF9] p-5 sm:flex-row sm:items-center lg:col-span-7"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg
              viewBox="0 0 88 88"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`Daily goal progress: ${progress.problemsSolvedToday} of ${progress.dailyProblemGoal} problems solved (${progress.ringPercent}%)`}
            >
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                className="stroke-[#EAE3D5] dark:stroke-[#2B3748]"
                strokeWidth="7"
              />
              <motion.circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke={progress.goalMetToday ? '#047857' : '#1D4ED8'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={
                  prefersReducedMotion
                    ? { strokeDashoffset: dashOffset }
                    : { strokeDashoffset: circumference }
                }
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono tabular-nums">
              <span className="text-base font-semibold text-[#1C232B]">
                {progress.problemsSolvedToday}/{progress.dailyProblemGoal}
              </span>
              <span className="text-[10px] font-medium text-[#5A6572]">
                {progress.ringPercent}%
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#1D4ED8]">
              {progress.goalMetToday ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                  <span className="text-[#047857]">Daily Goal Complete</span>
                </>
              ) : (
                <>
                  <Award className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
                  <span>Daily Goal Ring</span>
                </>
              )}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-semibold text-[#1C232B]">
              {progress.goalMetToday
                ? `Today’s ${progress.dailyProblemGoal}-Problem Target Reached`
                : `${progress.problemsRemaining} more ${progress.problemsRemaining === 1 ? 'problem' : 'problems'} to complete today’s goal`}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5A6572]">
              Next Streak Badge:{' '}
              <strong className="font-semibold text-[#1C232B]">
                {progress.nextStreakBadgeTitle}
              </strong>{' '}
              ({progress.streakDaysRemaining === 0
                ? 'Unlocked!'
                : `${progress.streakDaysRemaining} consecutive ${progress.streakDaysRemaining === 1 ? 'day' : 'days'} to go`}
              )
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartPractice}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-xl border border-[#D8D0C0] bg-white px-4 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
        >
          {progress.goalMetToday ? 'Keep Practicing' : 'Solve Problems'}
        </button>
      </div>

      {/* Consecutive Daily Challenge Streak Flame Counter */}
      <div
        data-testid="studio-streak-flame-counter"
        className="card-tactile flex items-center justify-between gap-4 rounded-2xl border-[#E5D3B3] bg-[#FFFDF7] p-5 lg:col-span-5"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
              flameActive
                ? 'border-[#F59E0B]/50 bg-[#FEF3C7] text-[#B45309]'
                : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#737E8A]'
            }`}
          >
            <Flame
              className={`h-7 w-7 ${flameActive ? 'fill-[#F59E0B]/30 text-[#B45309]' : ''}`}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold text-[#B45309]">
              Consecutive Daily Streak
            </p>
            <div className="mt-0.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span
                data-testid="studio-streak-count"
                className="text-3xl font-semibold leading-none text-[#1C232B]"
              >
                {progress.dailyStreak}
              </span>
              <span className="text-xs font-semibold text-[#46515E]">
                {progress.dailyStreak === 1 ? 'day in a row' : 'days in a row'}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5A6572]">
              {progress.solvedDailyToday
                ? `Stamped today · Best streak: ${progress.bestDailyStreak}d`
                : `Solve today’s Daily to reach ${progress.dailyStreak + 1}d · Best: ${progress.bestDailyStreak}d`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDaily}
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl border border-[#DFC99B] bg-white px-3.5 py-2 text-xs font-semibold text-[#8A5108] hover:border-[#B45309] transition-colors whitespace-nowrap"
        >
          {progress.solvedDailyToday ? 'View Stamp' : 'Daily Puzzle'}
        </button>
      </div>
    </section>
  );
}
