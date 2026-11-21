'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Crown,
  Medal,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { subscribeToPeriodGameScores } from '@/lib/firebase';
import {
  computeTopTenLeaderboard,
  formatIsoWeekRange,
  getIsoWeekKey,
  type CloudGameScoreRecord,
  type GameLeaderboardFilter,
  type LeaderboardPeriod,
} from '@/lib/game-scores';
import {
  PLAYABLE_GAME_CATALOG,
  PLAYABLE_GAME_IDS,
  type PlayableGameId,
} from '@/lib/guest-trial';
import type { StudentProfile } from '@/lib/types';

interface GameTopTenLeaderboardProps {
  profile: StudentProfile;
  todayKey: string;
  onOpenRegister: () => void;
  onLaunchGame: (gameId: PlayableGameId) => void;
}

const GAME_FILTER_TABS: { id: GameLeaderboardFilter; label: string }[] = [
  { id: 'all', label: 'All Games' },
  ...PLAYABLE_GAME_IDS.map((id) => ({
    id,
    label: PLAYABLE_GAME_CATALOG[id].shortTitle,
  })),
];

function formatDateLabel(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function GameTopTenLeaderboard({
  profile,
  todayKey,
  onOpenRegister,
  onLaunchGame,
}: GameTopTenLeaderboardProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('day');
  const [gameFilter, setGameFilter] = useState<GameLeaderboardFilter>('all');
  const [records, setRecords] = useState<CloudGameScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isSignedIn =
    profile.sessionKind === 'authenticated' && Boolean(profile.uid);

  useEffect(() => {
    const startTimer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
    }, 0);

    const unsubscribe = subscribeToPeriodGameScores({
      period,
      todayKey,
      signedIn: isSignedIn,
      onUpdate: (nextRecords) => {
        window.clearTimeout(startTimer);
        setRecords(nextRecords);
        setLoading(false);
        setLoadError(null);
      },
      onError: (message) => {
        window.clearTimeout(startTimer);
        setLoading(false);
        setLoadError(
          isSignedIn
            ? 'Live cloud scores are temporarily unavailable. Scores will appear once connected.'
            : message
        );
      },
    });

    return () => {
      window.clearTimeout(startTimer);
      unsubscribe();
    };
  }, [period, todayKey, isSignedIn]);

  const board = useMemo(
    () =>
      computeTopTenLeaderboard({
        records,
        period,
        gameFilter,
        todayKey,
        currentUserUid: profile.uid ?? null,
      }),
    [records, period, gameFilter, todayKey, profile.uid]
  );

  const periodLabel = useMemo(() => {
    if (period === 'day') {
      return `Today · ${formatDateLabel(todayKey)}`;
    }
    return `Week ${getIsoWeekKey(todayKey)} · ${formatIsoWeekRange(todayKey)}`;
  }, [period, todayKey]);

  const activeGameTarget: PlayableGameId =
    gameFilter === 'all' ? 'addition-attack' : gameFilter;

  return (
    <section
      data-testid="game-top10-leaderboard"
      aria-labelledby="game-top10-heading"
      className="card-tactile mt-6 rounded-2xl p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
            <h2
              id="game-top10-heading"
              className="font-display text-xl font-semibold text-[#1C232B]"
            >
              Top 10 Per-Game Leaderboard
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6572]">
            Saved scores for signed-in players ranked across today and this week
            ({periodLabel}).
          </p>
        </div>

        {/* Period Toggle: Today vs This Week */}
        <div
          role="tablist"
          aria-label="Leaderboard time period"
          className="inline-flex items-center gap-1 self-start rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1 lg:self-auto"
        >
          <button
            type="button"
            role="tab"
            data-testid="top10-period-day"
            aria-selected={period === 'day'}
            onClick={() => setPeriod('day')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              period === 'day'
                ? 'bg-white text-[#1C232B] shadow-xs'
                : 'text-[#5A6572] hover:text-[#1C232B]'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Today (Top 10)
          </button>
          <button
            type="button"
            role="tab"
            data-testid="top10-period-week"
            aria-selected={period === 'week'}
            onClick={() => setPeriod('week')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              period === 'week'
                ? 'bg-white text-[#1C232B] shadow-xs'
                : 'text-[#5A6572] hover:text-[#1C232B]'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            This Week (Top 10)
          </button>
        </div>
      </div>

      {/* Game Selector Filter Strip */}
      <div
        role="tablist"
        aria-label="Filter Top 10 leaderboard by game"
        className="mt-4 flex flex-wrap items-center gap-1.5"
      >
        {GAME_FILTER_TABS.map((tab) => {
          const active = gameFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-testid={`top10-game-${tab.id}`}
              aria-selected={active}
              onClick={() => setGameFilter(tab.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1D4ED8]'
                  : 'border-[#DFD8CA] bg-[#FAF8F4] text-[#5A6572] hover:border-[#1D4ED8]/50 hover:text-[#1C232B]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Auth / Standing Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-4 py-3 text-xs">
        {isSignedIn ? (
          <>
            <p className="text-[#46515E]">
              <strong className="font-semibold text-[#1C232B]">
                {profile.displayName}
              </strong>{' '}
              ·{' '}
              {board.currentUserRow ? (
                <span>
                  Ranked{' '}
                  <strong className="font-mono font-semibold text-[#047857] tabular-nums">
                    #{board.currentUserRow.rank}
                  </strong>{' '}
                  of {board.totalPlayersInPeriod} players (
                  <span className="font-mono font-semibold tabular-nums">
                    {board.currentUserRow.score} pts
                  </span>
                  ).
                </span>
              ) : (
                <span>
                  Complete a round to automatically record your score on this{' '}
                  {period === 'day' ? 'daily' : 'weekly'} Top 10 board.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => onLaunchGame(activeGameTarget)}
              className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
            >
              Play {PLAYABLE_GAME_CATALOG[activeGameTarget].shortTitle}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <p className="text-[#46515E]">
              <strong className="font-semibold text-[#1C232B]">
                Save Your Scores Free:
              </strong>{' '}
              Register with any email address (100% free, no payment required) to
              record per-game scores and compete for the Daily &amp; Weekly Top
              10.
            </p>
            <button
              type="button"
              data-testid="top10-register-cta"
              onClick={onOpenRegister}
              className="btn-cobalt inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Register Free
            </button>
          </>
        )}
      </div>

      {/* Leaderboard Table or Empty/Loading State */}
      {loadError ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#D8D1C4] bg-[#FAF8F4] px-5 py-8 text-center text-xs text-[#5A6572]">
          {loadError}
        </div>
      ) : loading ? (
        <div className="mt-4 space-y-2 py-4">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-10 w-full animate-pulse rounded-lg bg-[#EFECE3]"
            />
          ))}
        </div>
      ) : board.topTen.length === 0 ? (
        <div
          data-testid="top10-empty-state"
          className="mt-4 rounded-xl border border-dashed border-[#D8D1C4] bg-[#FAF8F4] px-6 py-10 text-center"
        >
          <Trophy
            className="mx-auto h-6 w-6 text-[#9AA3AD]"
            aria-hidden="true"
          />
          <p className="mt-2.5 font-display text-base font-semibold text-[#1C232B]">
            No saved{' '}
            {gameFilter === 'all'
              ? 'game'
              : PLAYABLE_GAME_CATALOG[gameFilter].title}{' '}
            scores for {period === 'day' ? 'today' : 'this week'} yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#5A6572]">
            {isSignedIn
              ? 'Finish a round to claim #1 on the live Top 10 leaderboard.'
              : 'Create a free account with any email and complete a round to claim the #1 spot.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {!isSignedIn && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="btn-cobalt inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Register Free to Post Scores
              </button>
            )}
            <button
              type="button"
              onClick={() => onLaunchGame(activeGameTarget)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
            >
              Play {PLAYABLE_GAME_CATALOG[activeGameTarget].title}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[580px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#ECE7DD] text-[11px] font-semibold text-[#5A6572]">
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3">Game</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3 text-right">Accuracy</th>
                <th className="py-2 pr-3 text-right">Rounds</th>
                <th className="py-2 text-right">Best Score</th>
              </tr>
            </thead>
            <tbody
              data-testid="top10-rows"
              className="divide-y divide-[#ECE7DD]"
            >
              {board.topTen.map((row) => (
                <tr
                  key={`${row.uid}-${row.gameId}`}
                  data-testid={`top10-row-${row.rank}`}
                  className={
                    row.isCurrentUser
                      ? 'bg-[#EFF5FF] font-semibold text-[#1C232B]'
                      : 'text-[#1C232B] hover:bg-[#FAF8F4]'
                  }
                >
                  <td className="py-2.5 pr-3 font-mono font-semibold tabular-nums">
                    {row.rank === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[#B45309]">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        #1
                      </span>
                    ) : row.rank === 2 ? (
                      <span className="inline-flex items-center gap-1 text-[#46515E]">
                        <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                        #2
                      </span>
                    ) : row.rank === 3 ? (
                      <span className="inline-flex items-center gap-1 text-[#92400E]">
                        <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                        #3
                      </span>
                    ) : (
                      <span className="text-[#5A6572]">#{row.rank}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold text-[#1C232B]">
                      {row.displayName}
                    </span>
                    {row.isCurrentUser && (
                      <span className="ml-1.5 font-mono text-[11px] font-semibold text-[#1D4ED8]">
                        (You)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-[#46515E]">
                    {row.gameTitle}
                  </td>
                  <td className="py-2.5 pr-3 text-[#5A6572]">
                    {TIER_SPECS[row.tier].label}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-[#047857] tabular-nums">
                    {row.accuracyPercent}%
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-[#5A6572] tabular-nums">
                    {row.gamesPlayedInPeriod}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-[#1D4ED8] tabular-nums">
                    {row.score} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
