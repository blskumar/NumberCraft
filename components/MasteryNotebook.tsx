'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Database, Trash2 } from 'lucide-react';
import MasterySealsSection from '@/components/MasterySealsSection';
import PerformanceTrendsChart from '@/components/PerformanceTrendsChart';
import {
  getAchievementById,
  type AchievementEvaluation,
} from '@/lib/achievements';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import {
  filterMatches,
  isSampleMatch,
  MODE_LABELS,
  type ModeFilter,
  type TierFilter,
} from '@/lib/notebook-analytics';
import type { AchievementId, MatchRecord, StudentProfile } from '@/lib/types';

interface MasteryNotebookProps {
  profile: StudentProfile;
  matches: MatchRecord[];
  achievementEvaluation: AchievementEvaluation;
  onSelectFeaturedBadge: (id: AchievementId | null) => void;
  onPlayFactorGrid: () => void;
  onLoadSampleMatches: () => void;
  onClearSampleMatches: () => void;
}

export default function MasteryNotebook({
  profile,
  matches,
  achievementEvaluation,
  onSelectFeaturedBadge,
  onPlayFactorGrid,
  onLoadSampleMatches,
  onClearSampleMatches,
}: MasteryNotebookProps) {
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const hasSampleData = useMemo(
    () => matches.some((m) => isSampleMatch(m)),
    [matches]
  );

  const filteredMatches = useMemo(
    () => filterMatches(matches, modeFilter, tierFilter),
    [matches, modeFilter, tierFilter]
  );

  const featuredSeal = useMemo(() => {
    if (!profile.featuredBadgeId) return null;
    const isEarned = achievementEvaluation.earnedRecords.some(
      (b) => b.id === profile.featuredBadgeId
    );
    return isEarned ? getAchievementById(profile.featuredBadgeId) : null;
  }, [profile.featuredBadgeId, achievementEvaluation.earnedRecords]);

  const gamesPlayed = filteredMatches.length;
  const wins = filteredMatches.filter((m) => m.result === 'win').length;
  const bestScore = filteredMatches.reduce(
    (max, m) => (m.playerScore > max ? m.playerScore : max),
    0
  );
  const totalPrimes = filteredMatches.reduce(
    (sum, m) => sum + m.primesClaimed,
    0
  );

  function handleResetFilters() {
    setModeFilter('all');
    setTierFilter('all');
  }

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E0D5] pb-5">
        <div>
          <p className="text-xs font-medium text-[#5A6572]">
            Student Progress · {profile.displayName} ·{' '}
            {profile.sessionKind === 'authenticated'
              ? 'Email Account · Cloud Scores Active'
              : 'Saved Locally in Guest Mode'}
            {featuredSeal && (
              <>
                {' '}
                ·{' '}
                <span className="font-semibold text-[#1D4ED8]">
                  Profile Seal: {featuredSeal.title}
                </span>
              </>
            )}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
            Mastery Notebook
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {hasSampleData ? (
            <button
              type="button"
              onClick={onClearSampleMatches}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#5A6572] hover:border-[#BE123C] hover:text-[#BE123C] transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear Sample Data
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoadSampleMatches}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              Load Sample Progress
            </button>
          )}

          <button
            type="button"
            onClick={onPlayFactorGrid}
            className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
          >
            Play Factor Grid
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <section
        aria-label="Mastery statistics"
        className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {[
          {
            label: 'Matches Completed',
            value: String(gamesPlayed),
            sub: gamesPlayed === matches.length ? 'All modes & tiers' : 'Filtered view',
          },
          {
            label: 'Win Rate',
            value:
              gamesPlayed > 0
                ? `${Math.round((wins / gamesPlayed) * 100)}%`
                : '—',
            sub: gamesPlayed > 0 ? `${wins} of ${gamesPlayed} won` : 'No results yet',
          },
          {
            label: 'Best Factor Score',
            value: gamesPlayed > 0 ? String(bestScore) : '—',
            sub: 'Highest single board',
          },
          {
            label: 'Primes Claimed',
            value: String(totalPrimes),
            sub: 'High-efficiency captures',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card-tactile rounded-2xl p-5"
          >
            <p className="text-xs font-medium text-[#5A6572]">{stat.label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-[#7A8490]">{stat.sub}</p>
          </div>
        ))}
      </section>

      {/* Mastery Seals & Milestones Showcase */}
      <MasterySealsSection
        evaluation={achievementEvaluation}
        featuredBadgeId={featuredSeal ? featuredSeal.id : null}
        onSelectFeaturedBadge={onSelectFeaturedBadge}
      />

      {/* Recharts Visual Performance Trends */}
      {matches.length > 0 && (
        <PerformanceTrendsChart
          matches={filteredMatches}
          allMatches={matches}
          modeFilter={modeFilter}
          tierFilter={tierFilter}
          onChangeModeFilter={setModeFilter}
          onChangeTierFilter={setTierFilter}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Recent Match Ledger */}
      <section className="card-tactile mt-8 rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-[#ECE7DD] pb-4">
          <h2 className="font-display text-xl font-semibold text-[#1C232B]">
            Match Ledger
          </h2>
          <span className="font-mono text-xs text-[#5A6572] tabular-nums">
            {filteredMatches.length} of {matches.length} shown
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen
              className="mx-auto h-8 w-8 text-[#9AA3AD]"
              aria-hidden="true"
            />
            <p className="mt-3 font-display text-lg font-semibold text-[#1C232B]">
              Your notebook page is ready for your first match
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[#5A6572]">
              Complete a game of Factor Grid to plot your real performance
              trends over time, or load sample progress to explore the charts
              across all age tiers and game modes right away.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onPlayFactorGrid}
                className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Start Your First Match
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onLoadSampleMatches}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
              >
                <Database className="h-4 w-4" aria-hidden="true" />
                Load Sample Progress
              </button>
            </div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-[#1C232B]">
              No matches match the current mode and tier filter.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-3 text-xs font-semibold text-[#1D4ED8] underline underline-offset-2 hover:text-[#1E40AF]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ECE7DD] text-xs text-[#5A6572]">
                  <th className="py-2.5 pr-4 font-semibold">Game &amp; Mode</th>
                  <th className="py-2.5 pr-4 font-semibold">Tier</th>
                  <th className="py-2.5 pr-4 font-semibold">Score</th>
                  <th className="py-2.5 pr-4 font-semibold">Primes</th>
                  <th className="py-2.5 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EDE4]">
                {filteredMatches.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-[#1C232B]">
                        {m.gameTitle}
                      </span>
                      <span className="block text-xs text-[#5A6572]">
                        {m.dailyMeta ? (
                          <>
                            Edition #{m.dailyMeta.editionNumber} ·{' '}
                            {m.dailyMeta.archetypeTitle} ·{' '}
                            {m.dailyMeta.stepsSolved}/3 clues in{' '}
                            {m.dailyMeta.secondsUsed}s ·{' '}
                            {m.dailyMeta.hintsUsed} hints
                          </>
                        ) : m.arithmeticMeta ? (
                          <>
                            {m.arithmeticMeta.solved}/{m.arithmeticMeta.attempted}{' '}
                            solved ({m.arithmeticMeta.accuracyPercent}%) · Streak{' '}
                            {m.arithmeticMeta.bestStreak}×
                            {m.arithmeticMeta.maxStageReached
                              ? ` · Stage ${m.arithmeticMeta.maxStageReached}`
                              : ''}
                            {m.arithmeticMeta.adaptiveEnabled &&
                            m.arithmeticMeta.endAdaptiveLevel
                              ? m.arithmeticMeta.startAdaptiveLevel &&
                                m.arithmeticMeta.startAdaptiveLevel !==
                                  m.arithmeticMeta.endAdaptiveLevel
                                ? ` · Adaptive Lv ${m.arithmeticMeta.startAdaptiveLevel}→${m.arithmeticMeta.endAdaptiveLevel}`
                                : ` · Adaptive Lv ${m.arithmeticMeta.endAdaptiveLevel}`
                              : ''}
                          </>
                        ) : (
                          <>
                            {MODE_LABELS[m.mode]} · vs. {m.opponentName} ·{' '}
                            {m.variant === 'prime-trap' ? 'Prime Trap' : 'Classic'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#46515E]">
                      {TIER_SPECS[m.tier].label}
                    </td>
                    <td className="py-3 pr-4 font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                      {m.dailyMeta || m.arithmeticMeta
                        ? `${m.playerScore} pts`
                        : `${m.playerScore} – ${m.opponentScore}`}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[#46515E] tabular-nums">
                      {m.dailyMeta || m.arithmeticMeta ? '—' : m.primesClaimed}
                    </td>
                    <td className="py-3 text-xs font-semibold">
                      <span
                        className={
                          m.result === 'win'
                            ? 'text-[#047857]'
                            : m.result === 'draw'
                              ? 'text-[#B45309]'
                              : 'text-[#BE123C]'
                        }
                      >
                        {m.result === 'win'
                          ? 'Won'
                          : m.result === 'draw'
                            ? 'Draw'
                            : 'Lost'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
