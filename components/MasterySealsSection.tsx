'use client';

import { useState } from 'react';
import { Check, Pin } from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import type { AchievementEvaluation } from '@/lib/achievements';
import type { AchievementAccent, AchievementId } from '@/lib/types';

interface MasterySealsSectionProps {
  evaluation: AchievementEvaluation;
  featuredBadgeId: AchievementId | null;
  onSelectFeaturedBadge: (id: AchievementId | null) => void;
}

type SealFilter = 'all' | 'earned' | 'locked';

const BAR_FILL_BY_ACCENT: Record<AchievementAccent, string> = {
  cobalt: 'bg-[#1D4ED8]',
  emerald: 'bg-[#047857]',
  ochre: 'bg-[#B45309]',
};

const TEXT_BY_ACCENT: Record<AchievementAccent, string> = {
  cobalt: 'text-[#1D4ED8]',
  emerald: 'text-[#047857]',
  ochre: 'text-[#B45309]',
};

function formatUnlockedDate(iso: string | null): string {
  if (!iso) return 'Earned';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Earned';
  return `Earned ${parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
}

export default function MasterySealsSection({
  evaluation,
  featuredBadgeId,
  onSelectFeaturedBadge,
}: MasterySealsSectionProps) {
  const [filter, setFilter] = useState<SealFilter>('all');

  const visibleStatuses = evaluation.statuses.filter((item) => {
    if (filter === 'earned') return item.earned;
    if (filter === 'locked') return !item.earned;
    return true;
  });

  const lockedCount = evaluation.totalCount - evaluation.earnedCount;

  return (
    <section
      aria-labelledby="mastery-seals-heading"
      data-testid="mastery-seals-section"
      className="card-tactile mt-8 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 md:flex-row md:items-center">
        <div>
          <h2
            id="mastery-seals-heading"
            className="font-display text-xl font-semibold text-[#1C232B]"
          >
            Mastery Seals
          </h2>
          <p className="mt-1 font-mono text-xs text-[#5A6572] tabular-nums">
            {evaluation.earnedCount} of {evaluation.totalCount} earned · Best
            streak {evaluation.bestStreak} · Daily streak{' '}
            {evaluation.bestDailyStreak}d · Peak board share{' '}
            {evaluation.bestBoardSharePercent}%
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter mastery seals"
          className="flex flex-wrap sm:inline-flex sm:flex-nowrap max-w-full items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1 self-start md:self-auto shrink-0"
        >
          {[
            { id: 'all' as SealFilter, label: `All (${evaluation.totalCount})` },
            {
              id: 'earned' as SealFilter,
              label: `Earned (${evaluation.earnedCount})`,
            },
            {
              id: 'locked' as SealFilter,
              label: `In Progress (${lockedCount})`,
            },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                  active
                    ? 'bg-white text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Honest Sample Data Isolation Note (G3) */}
      {evaluation.hasSampleMatches && (
        <p className="mt-3.5 text-xs text-[#5A6572]">
          <strong className="font-semibold text-[#1C232B]">
            Sample Progress Preview Active:
          </strong>{' '}
          Sample matches populate your charts below, while permanent Mastery
          Seals unlock exclusively from real played matches.
        </p>
      )}

      {/* Seals Grid */}
      {visibleStatuses.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#D8D1C4] bg-[#FAF8F4] px-5 py-8 text-center">
          <p className="text-sm font-semibold text-[#1C232B]">
            {filter === 'earned'
              ? 'No Mastery Seals earned yet.'
              : 'Every Factor Grid Mastery Seal has been unlocked!'}
          </p>
          <p className="mt-1 text-xs text-[#5A6572]">
            {filter === 'earned'
              ? 'Win your first Solo or Human vs. AI Factor Grid match to stamp your opening seal.'
              : 'Pin your favorite seal to showcase it in your Student Profile.'}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleStatuses.map((status) => {
            const { definition, earned, unlockedAt, percent, progressLabel } =
              status;
            const isFeatured = earned && featuredBadgeId === definition.id;

            return (
              <article
                key={definition.id}
                data-testid={`seal-card-${definition.id}`}
                data-earned={earned ? 'true' : 'false'}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  earned
                    ? 'border-[#DFD8CA] bg-white'
                    : 'border-[#ECE7DD] bg-[#FAF8F4]/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <AchievementSealIcon
                      id={definition.id}
                      accent={definition.accent}
                      earned={earned}
                      size="md"
                    />
                    <span
                      className={`text-right font-mono text-[11px] font-medium tabular-nums ${
                        earned
                          ? TEXT_BY_ACCENT[definition.accent]
                          : 'text-[#5A6572]'
                      }`}
                    >
                      {earned
                        ? formatUnlockedDate(unlockedAt)
                        : definition.criteriaNote}
                    </span>
                  </div>

                  <h3
                    className={`mt-3 font-display text-base font-semibold leading-snug ${
                      earned ? 'text-[#1C232B]' : 'text-[#46515E]'
                    }`}
                  >
                    {definition.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5A6572]">
                    {definition.description}
                  </p>
                </div>

                {/* Progress Bar (locked) or Pin-to-Profile Action (earned) */}
                <div className="mt-4 border-t border-[#F1EDE4] pt-3">
                  {earned ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectFeaturedBadge(isFeatured ? null : definition.id)
                      }
                      aria-pressed={isFeatured}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                        isFeatured
                          ? 'border-[#1D4ED8]/35 bg-[#EFF5FF] text-[#1D4ED8]'
                          : 'border-[#DFD8CA] bg-[#FAF8F4] text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                      }`}
                    >
                      {isFeatured ? (
                        <>
                          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Pinned to Profile
                        </>
                      ) : (
                        <>
                          <Pin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Pin to Profile
                        </>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[#5A6572] tabular-nums">
                        <span className="truncate">{progressLabel}</span>
                        <span className="shrink-0">{percent}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${definition.title} progress`}
                        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E2D6]"
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${
                            percent > 0
                              ? BAR_FILL_BY_ACCENT[definition.accent]
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
