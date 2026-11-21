'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Award, Calendar, ChevronDown, History, X } from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import {
  getMasterySealProgressPercent,
  shouldTriggerMasteryUnlockPulse,
  type RecentAchievementItem,
} from '@/lib/achievements';

interface MasteryProgressBarProps {
  earnedCount: number;
  totalCount: number;
  earnedHistory?: RecentAchievementItem[];
  onOpenNotebook: () => void;
  unlockEventKey?: number;
  latestUnlockedTitle?: string | null;
  isHydrated?: boolean;
}

const UNLOCK_PULSE_DURATION_MS = 2200;

export default function MasteryProgressBar({
  earnedCount,
  totalCount,
  earnedHistory = [],
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  useEffect(() => {
    if (!isHistoryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isHistoryOpen]);

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
          onClick={() => setIsHistoryOpen((prev) => !prev)}
          title={
            isHistoryOpen
              ? 'Collapse earned seal history'
              : 'Click to expand earned seal history'
          }
          className={`relative h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-[#E6E0D3] ${trackPulseClass}`}
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

        <button
          type="button"
          data-testid="mastery-history-toggle"
          aria-expanded={isHistoryOpen}
          aria-controls="mastery-history-panel"
          onClick={() => setIsHistoryOpen((prev) => !prev)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#5A6572] transition-colors hover:bg-[#EAE3D5]/70 hover:text-[#1C232B] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          title={
            isHistoryOpen
              ? 'Hide chronological seal history'
              : 'Show chronological seal history'
          }
        >
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
            className="font-mono tabular-nums"
          >
            <span className="text-[#1C232B]">{earnedCount}</span>/{totalCount} ·{' '}
            <span className={isComplete ? 'text-[#047857]' : 'text-[#1D4ED8]'}>
              {percent}%
            </span>
          </motion.span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[#5A6572] transition-transform duration-200 ${
              isHistoryOpen ? 'rotate-180 text-[#1D4ED8]' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Expandable Chronological Earned Seals History View */}
      <AnimatePresence initial={false}>
        {isHistoryOpen && (
          <motion.div
            id="mastery-history-panel"
            data-testid="mastery-history-panel"
            role="region"
            aria-label="Earned Mastery Seals chronological history"
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: -4 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -4 }
            }
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#E5E0D5] bg-[#FAF8F4]"
          >
            <div className="mx-auto max-w-[1240px] px-4 py-3.5 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE7DD] pb-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <History
                    className="h-3.5 w-3.5 text-[#1D4ED8]"
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-[#1C232B]">
                    Earned Seal History
                  </span>
                  <span aria-hidden="true" className="text-[#CFC6B4]">
                    ·
                  </span>
                  <span className="font-mono text-[11px] text-[#5A6572] tabular-nums">
                    {earnedHistory.length > 0
                      ? `${earnedHistory.length} earned · Newest first`
                      : `0 of ${totalCount} earned`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHistoryOpen(false);
                      onOpenNotebook();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
                  >
                    Open Mastery Notebook
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="mastery-history-close"
                    onClick={() => setIsHistoryOpen(false)}
                    aria-label="Close seal history"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#5A6572] transition-colors hover:bg-[#EAE3D5] hover:text-[#1C232B]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {earnedHistory.length > 0 ? (
                <ol
                  data-testid="mastery-history-list"
                  className="mt-2 max-h-[260px] divide-y divide-[#ECE7DD] overflow-y-auto pr-1"
                >
                  {earnedHistory.map((item, idx) => (
                    <li
                      key={item.id}
                      data-testid={`mastery-history-row-${idx}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 font-mono text-[11px] font-semibold text-[#5A6572] tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <AchievementSealIcon
                          id={item.id}
                          accent={item.accent}
                          earned
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-semibold text-[#1C232B]">
                              {item.title}
                            </span>
                            <span aria-hidden="true" className="text-[#CFC6B4]">
                              ·
                            </span>
                            <span className="text-[11px] text-[#5A6572]">
                              {item.criteriaNote}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[#5A6572]">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-[#46515E] tabular-nums whitespace-nowrap">
                        <Calendar
                          className="h-3 w-3 text-[#5A6572]"
                          aria-hidden="true"
                        />
                        <span>{item.fullDateLabel}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div
                  data-testid="mastery-history-empty"
                  className="mt-2.5 flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-[#5A6572]"
                >
                  <p>
                    No Mastery Seals unlocked yet. Complete a Daily Math
                    Challenge or win a Factor Grid match to log your first seal
                    with its acquisition date here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
