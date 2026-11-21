'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Crown, Flame, Medal, Trophy } from 'lucide-react';
import {
  buildDailyLeaderboard,
  type LeaderboardTierFilter,
} from '@/lib/daily-leaderboard';
import type { DailyChallengeCompletion, StudentProfile } from '@/lib/types';

interface DailyLeaderboardCardProps {
  profile: StudentProfile;
  dailyCompletions: DailyChallengeCompletion[];
  todayKey: string;
  onOpenDaily: () => void;
}

const TIER_FILTER_OPTIONS: { id: LeaderboardTierFilter; label: string }[] = [
  { id: 'all', label: 'All Tiers' },
  { id: 'explorers', label: 'Explorers' },
  { id: 'challengers', label: 'Challengers' },
  { id: 'strategists', label: 'Strategists' },
];

export default function DailyLeaderboardCard({
  profile,
  dailyCompletions,
  todayKey,
  onOpenDaily,
}: DailyLeaderboardCardProps) {
  const [tierFilter, setTierFilter] = useState<LeaderboardTierFilter>('all');

  const snapshot = useMemo(
    () =>
      buildDailyLeaderboard({
        profile,
        dailyCompletions,
        todayKey,
        tierFilter,
      }),
    [profile, dailyCompletions, todayKey, tierFilter]
  );

  const userInTopFive =
    snapshot.currentUserEntry !== null && snapshot.currentUserEntry.rank <= 5;

  return (
    <section
      data-testid="dashboard-daily-leaderboard"
      aria-labelledby="daily-leaderboard-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
            <h2
              id="daily-leaderboard-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              Daily Leaderboard
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            Top 5 scores for Daily Edition #{snapshot.editionNumber} ·{' '}
            {snapshot.formattedDate} ({snapshot.archetypeTitle}).
          </p>
          <p
            data-testid="leaderboard-simulated-note"
            className="mt-1 text-xs font-semibold text-[#46515E]"
          >
            Practice rivals (simulated): other names here are made-up
            players for practice, not real students.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter daily leaderboard by age tier"
          className="inline-flex flex-wrap items-center gap-1 self-start rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1 lg:self-auto"
        >
          {TIER_FILTER_OPTIONS.map((opt) => {
            const selected = tierFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                data-testid={`leaderboard-tier-${opt.id}`}
                aria-selected={selected}
                onClick={() => setTierFilter(opt.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selected
                    ? 'bg-white text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Unboxed Standing Summary */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-[#1C232B] tabular-nums">
          <span>
            <span className="text-[#5A6572]">Leading Score </span>
            <strong
              data-testid="leaderboard-top-score"
              className="font-semibold text-[#B45309]"
            >
              {snapshot.topFive[0]?.score ?? 0} pts
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Top 5 Cutoff </span>
            <strong className="font-semibold text-[#1D4ED8]">
              {snapshot.topFiveCutoffScore} pts
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            ·
          </span>
          <span>
            <span className="text-[#5A6572]">Your Standing </span>
            <strong
              data-testid="leaderboard-user-standing"
              className={
                userInTopFive
                  ? 'font-semibold text-[#047857]'
                  : 'font-semibold text-[#1C232B]'
              }
            >
              {snapshot.currentUserEntry
                ? `#${snapshot.currentUserEntry.rank} of ${snapshot.totalCohortSize} (with simulated rivals)`
                : snapshot.currentUserSolvedToday
                  ? 'Solved (Other Tier)'
                  : 'Not Ranked Yet'}
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenDaily}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
        >
          {snapshot.currentUserSolvedToday
            ? 'Review Today’s Daily'
            : 'Play Today’s Daily'}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* Top 5 Leaderboard Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E0D5] text-[11px] font-semibold text-[#5A6572]">
              <th scope="col" className="py-2.5 pr-3 font-mono w-14">
                Rank
              </th>
              <th scope="col" className="py-2.5 px-3">
                Student
              </th>
              <th scope="col" className="py-2.5 px-3">
                Tier
              </th>
              <th scope="col" className="py-2.5 px-3 text-right font-mono">
                Solve Time
              </th>
              <th scope="col" className="py-2.5 px-3 text-right font-mono">
                Precision
              </th>
              <th scope="col" className="py-2.5 px-3 text-right font-mono">
                Streak
              </th>
              <th scope="col" className="py-2.5 pl-3 text-right font-mono">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECE7DD]">
            {snapshot.topFive.map((entry) => (
              <tr
                key={entry.id}
                data-testid={`leaderboard-row-${entry.rank}`}
                data-current-user={entry.isCurrentUser ? 'true' : 'false'}
                className={`transition-colors ${
                  entry.isCurrentUser
                    ? 'bg-[#EFF5FF]'
                    : 'hover:bg-[#FAF8F4]'
                }`}
              >
                <td className="py-3 pr-3 font-mono font-semibold tabular-nums">
                  {entry.rank === 1 ? (
                    <span className="inline-flex items-center gap-1.5 text-[#B45309]">
                      <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      #1
                    </span>
                  ) : entry.rank === 2 || entry.rank === 3 ? (
                    <span className="inline-flex items-center gap-1.5 text-[#1D4ED8]">
                      <Medal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      #{entry.rank}
                    </span>
                  ) : (
                    <span className="pl-5 text-[#5A6572]">#{entry.rank}</span>
                  )}
                </td>

                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        entry.isCurrentUser
                          ? 'text-[#1D4ED8]'
                          : 'text-[#1C232B]'
                      }`}
                    >
                      {entry.displayName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                        (You)
                      </span>
                    )}
                    {'isSimulated' in entry && entry.isSimulated === true && (
                      <span
                        data-testid="leaderboard-simulated-badge"
                        className="rounded border border-[#D8D1C4] px-1 font-mono text-[11px] text-[#46515E]"
                      >
                        Practice rival (simulated)
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3 px-3 text-[#5A6572]">{entry.tierLabel}</td>

                <td className="py-3 px-3 text-right font-mono text-[#1C232B] tabular-nums">
                  {entry.secondsUsed}s
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {entry.flawless ? (
                    <span className="font-semibold text-[#047857]">
                      Flawless
                    </span>
                  ) : (
                    <span className="text-[#5A6572]">
                      {entry.mistakes}m · {entry.hintsUsed}h
                    </span>
                  )}
                </td>

                <td className="py-3 px-3 text-right font-mono text-[#5A6572] tabular-nums">
                  <span className="inline-flex items-center justify-end gap-1">
                    <Flame
                      className="h-3 w-3 text-[#B45309]"
                      aria-hidden="true"
                    />
                    {entry.streakDays}d
                  </span>
                </td>

                <td className="py-3 pl-3 text-right font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                  {entry.score}
                  <span className="ml-0.5 text-[11px] font-normal text-[#5A6572]">
                    pts
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Friendly Competition Footer Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-3.5 text-xs text-[#46515E]">
        {snapshot.currentUserEntry ? (
          userInTopFive ? (
            <p>
              <strong className="font-semibold text-[#047857]">
                Top 5 Finisher:
              </strong>{' '}
              You hold rank #{snapshot.currentUserEntry.rank} for Edition #
              {snapshot.editionNumber} with{' '}
              <span className="font-mono font-semibold tabular-nums">
                {snapshot.currentUserEntry.score} pts
              </span>
              {snapshot.pointsToFirst && snapshot.pointsToFirst > 0
                ? ` — ${snapshot.pointsToFirst} pts shy of #1.`
                : ' — leading today’s studio board!'}
            </p>
          ) : (
            <p>
              <strong className="font-semibold text-[#1C232B]">
                Your Today’s Rank: #{snapshot.currentUserEntry.rank}
              </strong>{' '}
              ({snapshot.currentUserEntry.score} pts in{' '}
              {snapshot.currentUserEntry.secondsUsed}s) —{' '}
              <span className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                {snapshot.pointsToTopFive} pts
              </span>{' '}
              needed to break into the Top 5.
            </p>
          )
        ) : (
          <p>
            Crack today’s 3-clue vault (Edition #{snapshot.editionNumber}) and
            aim above{' '}
            <span className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
              {snapshot.topFiveCutoffScore} pts
            </span>{' '}
            to claim a spot in today’s Top 5.
          </p>
        )}

        {!snapshot.currentUserSolvedToday && (
          <button
            type="button"
            data-testid="leaderboard-play-daily-btn"
            onClick={onOpenDaily}
            className="btn-cobalt inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Enter Today’s Board
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
