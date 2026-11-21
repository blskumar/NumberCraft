'use client';

import { ArrowLeft, Clock, Flame } from 'lucide-react';
import DailyStreakPanel from './arena/DailyStreakPanel';
import DailyBriefing from './arena/DailyBriefing';
import DailyPlay from './arena/DailyPlay';
import DailyCompleted from './arena/DailyCompleted';
import { useDailyChallengeArena, type DailyChallengeArenaProps } from './arena/useDailyChallengeArena';

export default function DailyChallengeArena(props: DailyChallengeArenaProps) {
  const r = useDailyChallengeArena(props);
  const {
    activeCompletion,
    countdownText,
    onBackToStudio,
    phase,
    puzzle,
    streakStats,
  } = r;
  return (
    <main className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D5] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Games
          </button>
          <div>
            <p className="font-mono text-[11px] font-medium text-[#B45309]">
              Daily Edition #{puzzle.editionNumber} · {puzzle.formattedDate} ·{' '}
              {puzzle.archetypeTitle}
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              Daily Math Challenge
            </h1>
          </div>
        </div>

        {/* Live Retention Countdown & Current Streak Readout */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div
            data-testid="daily-header-streak"
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono tabular-nums ${
              streakStats.currentStreak > 0
                ? 'border-[#DFC99B] bg-[#FFFBEB] text-[#1C232B]'
                : 'border-[#DFD8CA] bg-white text-[#1C232B]'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${
                streakStats.currentStreak > 0
                  ? 'text-[#B45309]'
                  : 'text-[#9AA3AD]'
              }`}
              aria-hidden="true"
            />
            <span className="text-[#5A6572]">Current Streak</span>
            <strong className="font-semibold text-[#1C232B]">
              {streakStats.currentStreak}{' '}
              {streakStats.currentStreak === 1 ? 'day' : 'days'}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[#DFD8CA] bg-[#FAF8F4] px-3 py-1.5 font-mono text-[#5A6572] tabular-nums">
            <Clock className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
            <span>Next puzzle</span>
            <strong className="text-[#1C232B]">{countdownText}</strong>
          </div>
        </div>
      </div>

      {/* Current Streak Counter + Consecutive Rewards & 7-Day Archival Stamp Strip */}
      <DailyStreakPanel r={r} />

      {/* PHASE 1: DAILY BRIEFING */}
      {phase === 'briefing' && (
        <DailyBriefing r={r} />
      )}

      {/* PHASE 2: TIMED DAILY PUZZLE ARENA */}
      {phase === 'playing' && (
        <DailyPlay r={r} />
      )}

      {/* PHASE 3: DAILY COMPLETION STAMP & SOLUTION BREAKDOWN */}
      {phase === 'completed' && activeCompletion && (
        <DailyCompleted r={r} />
      )}
    </main>
  );
}
