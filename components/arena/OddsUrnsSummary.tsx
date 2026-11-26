import { TOTAL_ROUNDS } from './arena-shared';
import { BookOpen, RotateCcw } from 'lucide-react';
import { AiSummaryHeader, SealUnlockedNotice } from './AiSummaryParts';
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
          <AiSummaryHeader
            title="Odds & Urns Complete · Saved to Mastery Notebook"
            heading={
              playerScore > (mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore)
                ? `Victory in ${chamberSpec.title}!`
                : playerScore === (mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore)
                  ? 'Exact Tie — Perfectly Matched EV Discipline!'
                  : 'Match Complete — Review Your Expected Value Timing'
            }
            scores={[
              { label: playerName, value: playerScore, color: 'text-[#1D4ED8]' },
              { label: mode === 'solo' ? 'EV Par' : 'EV Bot', value: mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore, color: 'text-[#1C232B]' },
              { label: 'Calibrations', value: <>{calibrationHits}/{TOTAL_ROUNDS}</>, color: 'text-[#047857]' },
            ]}
          />

          <SealUnlockedNotice badges={unlockedBadges} />

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
