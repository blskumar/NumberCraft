'use client';

import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import type {
  DailyMilestoneArenaId,
  DailyMilestoneStatus,
} from '@/lib/daily-milestone';

interface DailyMilestoneCardProps {
  status: DailyMilestoneStatus;
  onLaunchArena: (arenaId: DailyMilestoneArenaId) => void;
}

export default function DailyMilestoneCard({
  status,
  onLaunchArena,
}: DailyMilestoneCardProps) {
  const { milestone, completedToday, roundsCompletedToday } = status;

  return (
    <section
      aria-label="Daily Milestone focus arena"
      data-testid="daily-milestone-section"
      data-milestone-arena={milestone.arenaId}
      className="card-tactile mt-5 flex flex-col justify-between gap-5 rounded-2xl p-5 sm:p-6 lg:flex-row lg:items-center"
    >
      {/* Left: Daily Milestone Focus Narrative */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#1D4ED8]">
            {completedToday ? (
              <CheckCircle2
                className="h-3.5 w-3.5 text-[#047857]"
                aria-hidden="true"
              />
            ) : (
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Daily Milestone</span>
          </span>
          <span aria-hidden="true" className="text-[#C5BEB0]">
            ·
          </span>
          <span className="font-mono text-[#5A6572]">
            {milestone.formattedDate}
          </span>
          <span aria-hidden="true" className="text-[#C5BEB0]">
            ·
          </span>
          <span className="font-medium text-[#5A6572]">
            {milestone.category}
          </span>
        </div>

        <h2
          data-testid="daily-milestone-arena-title"
          className="mt-1.5 font-display text-xl font-semibold text-[#1C232B] sm:text-2xl"
        >
          Today’s Focus Arena: {milestone.arenaTitle}
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#46515E]">
          {milestone.focusPrompt}{' '}
          {completedToday
            ? `Milestone stamped (${roundsCompletedToday} ${roundsCompletedToday === 1 ? 'round' : 'rounds'} today)—your 1.5× Mastery Seal boost is applied.`
            : 'Complete a round here today to earn a 1.5× Mastery Seal multiplier on seal progress and daily goal credit.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[#5A6572] tabular-nums">
          <span className="inline-flex items-center gap-1 font-semibold text-[#047857]">
            <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {completedToday
                ? `Completed Today (${roundsCompletedToday}×)`
                : 'Ready to Claim Today'}
            </span>
          </span>
          <span aria-hidden="true" className="text-[#C5BEB0]">
            ·
          </span>
          <span>Rotates daily across all 6 studio arenas</span>
        </div>
      </div>

      {/* Right: 1.5x Multiplier Readout + Direct Focus Launch */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ECE7DD] pt-4 lg:flex-nowrap lg:justify-end lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div className="text-left lg:text-right">
          <p
            data-testid="daily-milestone-multiplier"
            className="font-mono text-2xl font-semibold tracking-tight text-[#B45309] tabular-nums"
          >
            {milestone.multiplier}×
          </p>
          <p className="text-[11px] font-medium text-[#5A6572] whitespace-nowrap">
            Mastery Seal Boost
          </p>
        </div>

        <Tooltip
          content={`Launch ${milestone.arenaTitle} to claim today’s 1.5× Mastery Seal progress multiplier`}
          placement="top"
        >
          <button
            type="button"
            data-testid="daily-milestone-launch-btn"
            onClick={() => onLaunchArena(milestone.arenaId)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
              completedToday
                ? 'border border-[#047857]/40 bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]'
                : 'btn-cobalt'
            }`}
          >
            <span>
              {completedToday
                ? `Play ${milestone.arenaTitle} Again`
                : milestone.actionLabel}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </section>
  );
}
