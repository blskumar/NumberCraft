import { TOTAL_ROUNDS } from './arena-shared';
import { BookOpen, RotateCcw, Trophy } from 'lucide-react';
import type { OddsUrnsCtx } from './useOddsUrnsArena';

export default function OddsUrnsSummary({ r }: { r: OddsUrnsCtx }) {
  const {
    ageTier, botScore, calibrationHits, chamberSpec, mode, onOpenNotebook,
    playerName, playerScore, setPhase, startSession, unlockedBadges,
  } = r;
  return (
        <section
          data-testid="odds-summary"
          className="card-tactile mt-7 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#047857]">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Odds &amp; Urns Complete · Saved to Mastery Notebook
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
                {playerScore > (mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore)
                  ? `Victory in ${chamberSpec.title}!`
                  : playerScore === (mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore)
                    ? 'Exact Tie — Perfectly Matched EV Discipline!'
                    : 'Match Complete — Review Your Expected Value Timing'}
              </h2>
            </div>

            <div className="flex items-center gap-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-5 py-3 font-mono tabular-nums">
              <div>
                <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                <p className="text-2xl font-semibold text-[#1D4ED8]">
                  {playerScore}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">
                  {mode === 'solo' ? 'EV Par' : 'EV Bot'}
                </p>
                <p className="text-2xl font-semibold text-[#1C232B]">
                  {mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">Calibrations</p>
                <p className="text-2xl font-semibold text-[#047857]">
                  {calibrationHits}/{TOTAL_ROUNDS}
                </p>
              </div>
            </div>
          </div>

          {unlockedBadges.length > 0 && (
            <div className="mt-5 rounded-xl border border-[#DFC99B] bg-[#FFFDF7] p-4">
              <p className="text-xs font-semibold text-[#B45309]">
                New Mastery Seal Unlocked!
              </p>
              <p className="mt-1 text-sm text-[#1C232B]">
                {unlockedBadges.map((b) => b.title).join(', ')}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => startSession(ageTier)}
              className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Play {chamberSpec.title} Again
            </button>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              Switch Chamber
            </button>
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Open Mastery Notebook
            </button>
          </div>
        </section>
  );
}
