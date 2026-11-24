'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import {
  getRecentEarnedAchievements,
  type AchievementEvaluation,
} from '@/lib/achievements';
import SampleDailyActions from './dashboard/SampleDailyActions';

interface RecentAchievementsFeedProps {
  achievementEvaluation: AchievementEvaluation;
  hasSampleData: boolean;
  onOpenNotebook: () => void;
  onOpenDaily: () => void;
  onLoadSampleDashboard: () => void;
}

const AUTO_SCROLL_INTERVAL_MS = 4500;

export default function RecentAchievementsFeed({
  achievementEvaluation,
  hasSampleData,
  onOpenNotebook,
  onOpenDaily,
  onLoadSampleDashboard,
}: RecentAchievementsFeedProps) {
  const prefersReducedMotion = useReducedMotion();

  const recentItems = useMemo(
    () => getRecentEarnedAchievements(achievementEvaluation, 5),
    [achievementEvaluation]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [livePolite, setLivePolite] = useState(false);

  const itemCount = recentItems.length;
  const safeIndex = itemCount > 0 ? activeIndex % itemCount : 0;
  const activeItem = itemCount > 0 ? recentItems[safeIndex] : null;

  useEffect(() => {
    if (
      itemCount <= 1 ||
      isPaused ||
      isHovering ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setLivePolite(false);
      setActiveIndex((prev) => (prev + 1) % itemCount);
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [itemCount, isPaused, isHovering, prefersReducedMotion]);

  const handleStep = (delta: number) => {
    if (itemCount <= 1) return;
    setLivePolite(true);
    setActiveIndex((prev) => (prev + delta + itemCount) % itemCount);
  };

  const handleSelectIndex = (idx: number) => {
    setLivePolite(true);
    setActiveIndex(idx);
  };

  const accentTitleColor =
    activeItem?.accent === 'emerald'
      ? 'text-[#047857]'
      : activeItem?.accent === 'ochre'
        ? 'text-[#B45309]'
        : 'text-[#1D4ED8]';

  return (
    <section
      data-testid="dashboard-recent-achievements"
      aria-labelledby="recent-achievements-heading"
      aria-roledescription={itemCount > 1 ? 'carousel' : undefined}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={() => setIsHovering(true)}
      onBlurCapture={() => setIsHovering(false)}
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#ECE7DD] pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Award
              className="h-4 w-4 text-[#B45309]"
              aria-hidden="true"
            />
            <h2
              id="recent-achievements-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              Recent Achievements
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            {itemCount > 0 ? (
              <>
                Scrolling through your{' '}
                <span className="font-mono font-semibold text-[#1C232B] tabular-nums">
                  {itemCount}
                </span>{' '}
                most recently earned{' '}
                {itemCount === 1 ? 'Mastery Seal' : 'Mastery Seals'} ·{' '}
                <span className="font-mono tabular-nums">
                  {achievementEvaluation.earnedCount}/
                  {achievementEvaluation.totalCount} unlocked
                </span>
              </>
            ) : (
              <>
                Highlights your 5 most recently earned Mastery Seals as you
                complete challenges ·{' '}
                <span className="font-mono tabular-nums">
                  0/{achievementEvaluation.totalCount} unlocked
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {itemCount > 1 && (
            <div
              role="group"
              aria-label="Recent achievements playback controls"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DFD8CA] bg-[#EFECE3] p-0.5"
            >
              <button
                type="button"
                data-testid="recent-achievements-prev"
                onClick={() => handleStep(-1)}
                aria-label="Previous recent achievement"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#46515E] transition-colors hover:bg-white hover:text-[#1C232B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1D4ED8]"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="recent-achievements-toggle"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-label={
                  isPaused
                    ? 'Resume automatic achievement scrolling'
                    : 'Pause automatic achievement scrolling'
                }
                aria-pressed={isPaused}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#46515E] transition-colors hover:bg-white hover:text-[#1C232B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1D4ED8]"
              >
                {isPaused ? (
                  <Play className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Pause className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                data-testid="recent-achievements-next"
                onClick={() => handleStep(1)}
                aria-label="Next recent achievement"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#46515E] transition-colors hover:bg-white hover:text-[#1C232B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1D4ED8]"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenNotebook}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
          >
            All {achievementEvaluation.totalCount} Seals
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Populated Scrolling Spotlight + 5-Item Scannable Index Rail */}
      {activeItem ? (
        <div className="mt-4">
          <div
            data-testid="recent-achievements-spotlight"
            data-active-badge-id={activeItem.id}
            aria-live={livePolite ? 'polite' : 'off'}
            aria-atomic="true"
            className="min-h-[84px] rounded-xl border border-[#ECE7DD] bg-[#FAF8F4] px-4 py-3.5 sm:px-5"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeItem.id}
                initial={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: 6 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -6 }
                }
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <AchievementSealIcon
                    id={activeItem.id}
                    accent={activeItem.accent}
                    earned
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <h3
                        data-testid="recent-achievements-active-title"
                        className="font-display text-base font-semibold text-[#1C232B]"
                      >
                        {activeItem.title}
                      </h3>
                      <span aria-hidden="true" className="text-[#CFC6B4]">
                        ·
                      </span>
                      <span
                        className={`text-xs font-semibold ${accentTitleColor}`}
                      >
                        {activeItem.criteriaNote}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#5A6572]">
                      {activeItem.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-[#5A6572] tabular-nums sm:flex-col sm:items-end sm:gap-0.5">
                  <span className="font-semibold text-[#1C232B]">
                    Earned {activeItem.dateLabel}
                  </span>
                  <span aria-hidden="true" className="text-[#CFC6B4] sm:hidden">
                    ·
                  </span>
                  <span>
                    #{safeIndex + 1} of {itemCount} recent
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Interactive 5-Slot Selector Strip */}
          {itemCount > 1 && (
            <div
              role="tablist"
              aria-label="Select a recently earned achievement"
              className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5"
            >
              {recentItems.map((item, idx) => {
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    data-testid={`recent-achievement-slot-${idx}`}
                    aria-selected={isSelected}
                    onClick={() => handleSelectIndex(idx)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1D4ED8] ${
                      isSelected
                        ? 'border-[#1D4ED8]/45 bg-[#EFF5FF] text-[#1C232B]'
                        : 'border-[#ECE7DD] bg-white text-[#5A6572] hover:border-[#D8D1C4] hover:text-[#1C232B]'
                    }`}
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {item.shortTitle}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-80">
                      {item.dateLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div
          data-testid="recent-achievements-empty"
          className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-[#D8D1C4] bg-[#FAF8F4] px-4 py-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1C232B]">
              No Mastery Seals earned yet
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#5A6572]">
              Solve today&apos;s Daily Math Challenge or win a Factor Grid match
              to unlock your first seal—your 5 most recent achievements will
              appear and scroll smoothly here.
            </p>
          </div>
          <SampleDailyActions
            className="flex shrink-0 flex-wrap items-center gap-2"
            hasSampleData={hasSampleData}
            onLoadSampleDashboard={onLoadSampleDashboard}
            onOpenDaily={onOpenDaily}
          />
        </div>
      )}
    </section>
  );
}
