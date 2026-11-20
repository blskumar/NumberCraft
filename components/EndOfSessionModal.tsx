'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  formatElapsedSessionClock,
  type ArenaSessionStats,
} from '@/lib/session-tracker';

interface EndOfSessionModalProps {
  open: boolean;
  summary: ArenaSessionStats | null;
  destinationLabel: string;
  onConfirmLeave: () => void;
  onStayInArena: () => void;
}

export default function EndOfSessionModal({
  open,
  summary,
  destinationLabel,
  onConfirmLeave,
  onStayInArena,
}: EndOfSessionModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStayInArena();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onStayInArena]);

  if (!open || !summary) return null;

  return (
    <div
      data-testid="end-of-session-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-of-session-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C232B]/45 p-4 backdrop-blur-[2px]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="card-tactile w-full max-w-[500px] rounded-2xl bg-[#FFFDF9] p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#ECE7DD] pb-4">
          <div>
            <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
              Session Reflection · {summary.arenaLabel}
            </p>
            <h2
              id="end-of-session-heading"
              className="mt-1 font-display text-2xl font-semibold text-[#1C232B]"
            >
              End-of-Session Summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onStayInArena}
            aria-label="Close session summary and stay in arena"
            className="rounded-lg border border-[#E2DCCF] bg-white p-1.5 text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Core Session Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-3 font-mono tabular-nums">
          <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#5A6572]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
              <span>Solved</span>
            </div>
            <p
              data-testid="session-summary-solved"
              className="mt-1 text-xl font-semibold text-[#1C232B]"
            >
              {summary.problemsSolved}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#5A6572]">
              <Target className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
              <span>Accuracy</span>
            </div>
            <p
              data-testid="session-summary-accuracy"
              className="mt-1 text-xl font-semibold text-[#1D4ED8]"
            >
              {summary.accuracyPercent !== null
                ? `${summary.accuracyPercent}%`
                : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#5A6572]">
              <Clock className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
              <span>Time</span>
            </div>
            <p
              data-testid="session-summary-duration"
              className="mt-1 text-xl font-semibold text-[#1C232B]"
            >
              {formatElapsedSessionClock(summary.elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* Newly Unlocked Seals if any */}
        {summary.newlyEarnedSeals.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#DFC99B] bg-[#FFFDF2] p-3.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Mastery Seals Earned This Session
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1C232B]">
              {summary.newlyEarnedSeals.join(', ')}
            </p>
          </div>
        )}

        {/* Next Mastery Seal Progress */}
        <div
          data-testid="session-summary-next-seal"
          className="mt-4 rounded-xl border border-[#E5E0D5] bg-white p-4"
        >
          {summary.nextSeal ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C232B]">
                  <Award className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
                  Next Mastery Seal: {summary.nextSeal.definition.title}
                </span>
                <span className="font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
                  {summary.nextSeal.percent}%
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5A6572]">
                {summary.nextSeal.definition.description}
              </p>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#ECE7DD]">
                <div
                  className="h-full rounded-full bg-[#1D4ED8] transition-all duration-300"
                  style={{ width: `${summary.nextSeal.percent}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-[#5A6572] tabular-nums">
                Current progress: {summary.nextSeal.progressLabel}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#047857]">
              <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                All 12 Studio Mastery Seals unlocked! Outstanding consistency.
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            data-testid="session-stay-btn"
            onClick={onStayInArena}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[#D8D0C0] bg-white px-4 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            Stay in Arena
          </button>
          <button
            type="button"
            data-testid="session-confirm-leave-btn"
            onClick={onConfirmLeave}
            className="btn-cobalt inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
          >
            Continue to {destinationLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
