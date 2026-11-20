'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Award } from 'lucide-react';
import {
  getMasterySealProgressPercent,
  shouldTriggerMasteryUnlockPulse,
} from '@/lib/achievements';

interface MasteryProgressBarProps {
  earnedCount: number;
  totalCount: number;
  onOpenNotebook: () => void;
  unlockEventKey?: number;
  latestUnlockedTitle?: string | null;
  isHydrated?: boolean;
}

const UNLOCK_PULSE_DURATION_MS = 2200;

export default function MasteryProgressBar({
  earnedCount,
  totalCount,
  onOpenNotebook,
  unlockEventKey = 0,
  latestUnlockedTitle = null,
  isHydrated = true,
}: MasteryProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const percent = getMasterySealProgressPercent(earnedCount, totalCount);
  const isComplete = totalCount > 0 && earnedCount >= totalCount;

  const hasBaselineRef = useRef(false);
  const prevEarnedCountRef = useRef(earnedCount);
  const prevEventKeyRef = useRef(unlockEventKey);
  const pulseTimerRef = useRef<number | null>(null);

  const [pulseSeq, setPulseSeq] = useState(0);
  const [isUnlockGlowing, setIsUnlockGlowing] = useState(false);
  const [unlockCueText, setUnlockCueText] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (!hasBaselineRef.current) {
      hasBaselineRef.current = true;
      prevEarnedCountRef.current = earnedCount;
      prevEventKeyRef.current = unlockEventKey;
      return;
    }

    const shouldPulse = shouldTriggerMasteryUnlockPulse({
      isHydrated,
      hasBaseline: hasBaselineRef.current,
      prevEarnedCount: prevEarnedCountRef.current,
      nextEarnedCount: earnedCount,
      prevEventKey: prevEventKeyRef.current,
      nextEventKey: unlockEventKey,
    });

    const delta = Math.max(1, earnedCount - prevEarnedCountRef.current);
    prevEarnedCountRef.current = earnedCount;
    prevEventKeyRef.current = unlockEventKey;

    if (!shouldPulse) return;

    const cue = latestUnlockedTitle
      ? `Unlocked: ${latestUnlockedTitle}`
      : delta === 1
        ? '+1 Seal Unlocked'
        : `+${delta} Seals Unlocked`;

    const startTimer = window.setTimeout(() => {
      setUnlockCueText(cue);
      setIsUnlockGlowing(true);
      setPulseSeq((seq) => seq + 1);

      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
      pulseTimerRef.current = window.setTimeout(() => {
        setIsUnlockGlowing(false);
        pulseTimerRef.current = null;
      }, UNLOCK_PULSE_DURATION_MS);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
    };
  }, [earnedCount, isHydrated, latestUnlockedTitle, unlockEventKey]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  const bannerGlowClass =
    isUnlockGlowing && !prefersReducedMotion
      ? 'mastery-bar-unlock-glow'
      : isUnlockGlowing && prefersReducedMotion
        ? 'border-[#D97706] bg-[#FEF3C7]/45'
        : '';

  const trackPulseClass =
    isUnlockGlowing && !prefersReducedMotion
      ? isComplete
        ? 'mastery-track-unlock-pulse-complete'
        : 'mastery-track-unlock-pulse'
      : '';

  return (
    <motion.div
      data-testid="mastery-progress-bar-banner"
      data-unlock-animating={isUnlockGlowing ? 'true' : 'false'}
      initial={false}
      animate={
        isUnlockGlowing && !prefersReducedMotion
          ? { y: [-2, 0], opacity: [0.94, 1] }
          : { y: 0, opacity: 1 }
      }
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className={`border-b border-[#E5E0D5] bg-[#F5F1E8]/95 transition-colors duration-300 ${bannerGlowClass}`}
    >
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNotebook}
          className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[#1C232B] hover:text-[#1D4ED8] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          title="Open Mastery Notebook to view all achievements"
        >
          <motion.span
            key={pulseSeq}
            initial={false}
            animate={
              isUnlockGlowing && !prefersReducedMotion
                ? { scale: [1, 1.28, 0.96, 1.06, 1], rotate: [0, -8, 6, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center justify-center"
          >
            <Award
              className={`h-3.5 w-3.5 shrink-0 ${
                isComplete
                  ? 'text-[#047857]'
                  : earnedCount > 0 || isUnlockGlowing
                    ? 'text-[#B45309]'
                    : 'text-[#8C8476]'
              }`}
              aria-hidden="true"
            />
          </motion.span>
          <span>Mastery Seals</span>
        </button>

        <AnimatePresence>
          {isUnlockGlowing && unlockCueText && (
            <motion.span
              key={`cue-${pulseSeq}`}
              data-testid="mastery-unlock-cue"
              role="status"
              aria-live="polite"
              initial={
                prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -6 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 4 }
              }
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="hidden max-w-[190px] truncate text-[11px] font-semibold text-[#B45309] sm:inline-flex sm:items-center sm:gap-1.5"
            >
              <span aria-hidden="true" className="text-[#CFC6B4]">
                ·
              </span>
              <span className="truncate">{unlockCueText}</span>
            </motion.span>
          )}
        </AnimatePresence>

        <div
          role="progressbar"
          data-testid="mastery-progress-bar"
          aria-label="Mastery Seal achievement progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${earnedCount} of ${totalCount} Mastery Seals earned (${percent}%)`}
          className={`relative h-2 flex-1 overflow-hidden rounded-full bg-[#E6E0D3] ${trackPulseClass}`}
        >
          <motion.div
            data-testid="mastery-progress-fill"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.48, ease: [0.16, 1, 0.3, 1] }
            }
            className={`relative h-full overflow-hidden rounded-full ${
              isComplete
                ? 'bg-[#047857]'
                : 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#B45309]'
            }`}
          >
            {isUnlockGlowing && !prefersReducedMotion && (
              <span
                key={`sheen-${pulseSeq}`}
                aria-hidden="true"
                className="mastery-fill-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/75 to-transparent"
              />
            )}
          </motion.div>
        </div>

        <motion.span
          key={`label-${pulseSeq}`}
          data-testid="mastery-progress-label"
          initial={false}
          animate={
            isUnlockGlowing && !prefersReducedMotion
              ? { scale: [1, 1.09, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 font-mono text-[11px] font-semibold text-[#5A6572] tabular-nums whitespace-nowrap"
        >
          <span className="text-[#1C232B]">{earnedCount}</span>/{totalCount} ·{' '}
          <span className={isComplete ? 'text-[#047857]' : 'text-[#1D4ED8]'}>
            {percent}%
          </span>
        </motion.span>
      </div>
    </motion.div>
  );
}
