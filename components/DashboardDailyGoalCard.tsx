'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  Target,
} from 'lucide-react';
import {
  clampDailyProblemGoal,
  DAILY_GOAL_PRESETS,
  MAX_DAILY_PROBLEM_GOAL,
  MIN_DAILY_PROBLEM_GOAL,
  type DailyGoalProgress,
  type TodayProblemBreakdown,
} from '@/lib/daily-goal';

interface DashboardDailyGoalCardProps {
  progress: DailyGoalProgress;
  breakdown: TodayProblemBreakdown;
  dailyProblemGoal: number;
  onChangeDailyGoal: (nextGoal: number) => void;
  onStartPractice: () => void;
  onOpenDaily: () => void;
}

export default function DashboardDailyGoalCard({
  progress,
  breakdown,
  dailyProblemGoal,
  onChangeDailyGoal,
  onStartPractice,
  onOpenDaily,
}: DashboardDailyGoalCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [draftInput, setDraftInput] = useState(String(dailyProblemGoal));
  const [savedNoticeGoal, setSavedNoticeGoal] = useState<number | null>(null);

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (progress.ringPercent / 100) * circumference;

  const commitGoal = (raw: number) => {
    const clamped = clampDailyProblemGoal(raw);
    onChangeDailyGoal(clamped);
    setDraftInput(String(clamped));
    setSavedNoticeGoal(clamped);
  };

  const handleInputBlur = () => {
    setIsEditingInput(false);
    const parsed = Number.parseInt(draftInput, 10);
    if (Number.isFinite(parsed)) {
      commitGoal(parsed);
    } else {
      setDraftInput(String(dailyProblemGoal));
    }
  };

  const displayedInputValue = isEditingInput
    ? draftInput
    : String(dailyProblemGoal);

  return (
    <section
      data-testid="dashboard-daily-goal"
      aria-labelledby="dashboard-daily-goal-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Left: Circular Progress Ring + Today's Status */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center lg:col-span-7">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg
              viewBox="0 0 112 112"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`Daily goal progress ring: ${progress.problemsSolvedToday} of ${progress.dailyProblemGoal} problems solved today (${progress.ringPercent}%)`}
            >
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                className="stroke-[#EAE3D5]"
                strokeWidth="9"
              />
              <motion.circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke={progress.goalMetToday ? '#047857' : '#1D4ED8'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={
                  prefersReducedMotion
                    ? { strokeDashoffset: dashOffset }
                    : { strokeDashoffset: circumference }
                }
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono tabular-nums">
              <span
                data-testid="dashboard-daily-goal-percent"
                className={`text-xl font-semibold leading-none ${
                  progress.goalMetToday ? 'text-[#047857]' : 'text-[#1C232B]'
                }`}
              >
                {progress.ringPercent}%
              </span>
              <span
                data-testid="dashboard-daily-goal-fraction"
                className="mt-1 text-[11px] font-medium text-[#5A6572]"
              >
                {progress.problemsSolvedToday}/{progress.dailyProblemGoal}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {progress.goalMetToday ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[#047857]"
                  aria-hidden="true"
                />
              ) : (
                <Target
                  className="h-4 w-4 shrink-0 text-[#1D4ED8]"
                  aria-hidden="true"
                />
              )}
              <h2
                id="dashboard-daily-goal-heading"
                className="font-display text-xl font-semibold text-[#1C232B]"
              >
                Daily Goal
              </h2>
              {progress.goalMetToday && (
                <span className="font-mono text-[11px] font-semibold text-[#047857]">
                  Target Reached
                </span>
              )}
            </div>

            <p
              data-testid="dashboard-daily-goal-status"
              className="mt-1 text-xs leading-relaxed text-[#46515E]"
            >
              {progress.goalMetToday ? (
                <>
                  You solved{' '}
                  <strong className="font-mono font-semibold text-[#047857] tabular-nums">
                    {progress.problemsSolvedToday}
                  </strong>{' '}
                  problems today — meeting your{' '}
                  <strong className="font-mono font-semibold text-[#1C232B] tabular-nums">
                    {progress.dailyProblemGoal}-problem
                  </strong>{' '}
                  daily target.
                </>
              ) : (
                <>
                  <strong className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                    {progress.problemsRemaining}
                  </strong>{' '}
                  more{' '}
                  {progress.problemsRemaining === 1 ? 'problem' : 'problems'}{' '}
                  needed today to reach your{' '}
                  <strong className="font-mono font-semibold text-[#1C232B] tabular-nums">
                    {progress.dailyProblemGoal}-problem
                  </strong>{' '}
                  daily goal.
                </>
              )}
            </p>

            {/* Unboxed inline source breakdown */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#5A6572] tabular-nums">
              <span>
                Arithmetic{' '}
                <strong className="font-semibold text-[#1C232B]">
                  {breakdown.arithmeticProblems}
                </strong>
              </span>
              <span aria-hidden="true" className="text-[#D8D1C4]">
                ·
              </span>
              <span>
                Daily Vault{' '}
                <strong className="font-semibold text-[#1C232B]">
                  {breakdown.dailyChallengeProblems}
                </strong>
              </span>
              <span aria-hidden="true" className="text-[#D8D1C4]">
                ·
              </span>
              <span>
                Strategy Arenas{' '}
                <strong className="font-semibold text-[#1C232B]">
                  {breakdown.arenaProblems}
                </strong>
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
              >
                {progress.goalMetToday ? 'Keep Practicing' : 'Solve Problems'}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
              <span aria-hidden="true" className="text-[#D8D1C4]">
                ·
              </span>
              <button
                type="button"
                onClick={onOpenDaily}
                className="inline-flex items-center gap-1 font-semibold text-[#5A6572] hover:text-[#1C232B] whitespace-nowrap"
              >
                {progress.solvedDailyToday
                  ? 'Review Today’s Daily'
                  : 'Play Today’s Daily (+3)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Daily Goal Target Setting Controls */}
        <div className="border-t border-[#ECE7DD] pt-4 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="daily-goal-target-input"
              className="text-xs font-semibold text-[#1C232B]"
            >
              Daily Target Setting
            </label>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#5A6572] tabular-nums">
              {savedNoticeGoal === dailyProblemGoal ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#047857]">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Saved ({dailyProblemGoal}/day)
                </span>
              ) : (
                <span>
                  {MIN_DAILY_PROBLEM_GOAL}–{MAX_DAILY_PROBLEM_GOAL} problems/day
                </span>
              )}
            </span>
          </div>

          {/* Preset Target Selector */}
          <div
            role="group"
            aria-label="Daily problem target presets"
            className="mt-2.5 flex items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
          >
            {DAILY_GOAL_PRESETS.map((preset) => {
              const active = dailyProblemGoal === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  data-testid={`daily-goal-preset-${preset}`}
                  aria-pressed={active}
                  onClick={() => commitGoal(preset)}
                  className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-xs font-semibold transition-all tabular-nums ${
                    active
                      ? 'bg-white text-[#1C232B] shadow-xs'
                      : 'text-[#5A6572] hover:text-[#1C232B]'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* Custom Stepper & Exact Numeric Input */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              data-testid="daily-goal-decrement"
              onClick={() => commitGoal(dailyProblemGoal - 5)}
              disabled={dailyProblemGoal <= MIN_DAILY_PROBLEM_GOAL}
              aria-label="Decrease daily goal by 5 problems"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8D1C4] bg-white text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-45 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <div className="relative flex-1">
              <input
                id="daily-goal-target-input"
                data-testid="daily-goal-input"
                type="number"
                min={MIN_DAILY_PROBLEM_GOAL}
                max={MAX_DAILY_PROBLEM_GOAL}
                step={1}
                value={displayedInputValue}
                onFocus={() => {
                  setIsEditingInput(true);
                  setDraftInput(String(dailyProblemGoal));
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftInput(val);
                  const parsed = Number.parseInt(val, 10);
                  if (
                    Number.isFinite(parsed) &&
                    parsed >= MIN_DAILY_PROBLEM_GOAL &&
                    parsed <= MAX_DAILY_PROBLEM_GOAL
                  ) {
                    onChangeDailyGoal(parsed);
                    setSavedNoticeGoal(parsed);
                  }
                }}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                aria-describedby="daily-goal-helper-note"
                className="h-9 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 pr-20 font-mono text-sm font-semibold text-[#1C232B] tabular-nums focus:border-[#1D4ED8] focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-[#5A6572]">
                problems
              </span>
            </div>

            <button
              type="button"
              data-testid="daily-goal-increment"
              onClick={() => commitGoal(dailyProblemGoal + 5)}
              disabled={dailyProblemGoal >= MAX_DAILY_PROBLEM_GOAL}
              aria-label="Increase daily goal by 5 problems"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8D1C4] bg-white text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-45 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <p
            id="daily-goal-helper-note"
            className="mt-2 text-[11px] leading-relaxed text-[#5A6572]"
          >
            Updates your circular progress ring across the Dashboard and Games
            Studio automatically.
          </p>
        </div>
      </div>
    </section>
  );
}
