'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Award } from 'lucide-react';
import { getMasterySealProgressPercent } from '@/lib/achievements';

interface MasteryProgressBarProps {
  earnedCount: number;
  totalCount: number;
  onOpenNotebook: () => void;
}

export default function MasteryProgressBar({
  earnedCount,
  totalCount,
  onOpenNotebook,
}: MasteryProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const percent = getMasterySealProgressPercent(earnedCount, totalCount);
  const isComplete = totalCount > 0 && earnedCount >= totalCount;

  return (
    <div
      data-testid="mastery-progress-bar-banner"
      className="border-b border-[#E5E0D5] bg-[#F5F1E8]/95"
    >
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNotebook}
          className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[#1C232B] hover:text-[#1D4ED8] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          title="Open Mastery Notebook to view all achievements"
        >
          <Award
            className={`h-3.5 w-3.5 shrink-0 ${
              isComplete
                ? 'text-[#047857]'
                : earnedCount > 0
                  ? 'text-[#B45309]'
                  : 'text-[#8C8476]'
            }`}
            aria-hidden="true"
          />
          <span>Mastery Seals</span>
        </button>

        <div
          role="progressbar"
          data-testid="mastery-progress-bar"
          aria-label="Mastery Seal achievement progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${earnedCount} of ${totalCount} Mastery Seals earned (${percent}%)`}
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#E6E0D3]"
        >
          <motion.div
            data-testid="mastery-progress-fill"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
            }
            className={`h-full rounded-full ${
              isComplete
                ? 'bg-[#047857]'
                : 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#B45309]'
            }`}
          />
        </div>

        <span
          data-testid="mastery-progress-label"
          className="shrink-0 font-mono text-[11px] font-semibold text-[#5A6572] tabular-nums whitespace-nowrap"
        >
          <span className="text-[#1C232B]">{earnedCount}</span>/{totalCount} ·{' '}
          <span className={isComplete ? 'text-[#047857]' : 'text-[#1D4ED8]'}>
            {percent}%
          </span>
        </span>
      </div>
    </div>
  );
}
