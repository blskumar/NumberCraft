import { TOTAL_ROUNDS } from './arena-shared';
import { BookOpen, RotateCcw } from 'lucide-react';
import { AiSummaryHeader, SealUnlockedNotice } from './AiSummaryParts';
import type { FoundryCtx } from './useEquationFoundryArena';

export default function FoundrySummary({ r }: { r: FoundryCtx }) {
  const {
    ageTier, aiTotal, exactHitsCount, history, mode, onOpenNotebook, playerName,
    playerTotal, setPhase, startSession, unlockedBadges,
  } = r;
  return (
        <section
          data-testid="foundry-summary"
          className="card-tactile mt-7 rounded-2xl p-6 sm:p-8"
        >
          <AiSummaryHeader
            title="Equation Foundry Complete · Saved to Mastery Notebook"
            heading={
              playerTotal > aiTotal
                ? `Victory! You out-forged ${mode === 'solo' ? 'Foundry Par' : 'Solver AI'}.`
                : playerTotal === aiTotal
                  ? 'Dead Heat! Balanced precision across all 5 targets.'
                  : 'Session Logged — Inspect the Solver Trees to sharpen your edge.'
            }
            scores={[
              { label: playerName, value: playerTotal, color: 'text-[#1D4ED8]' },
              { label: mode === 'solo' ? 'Par' : 'Solver AI', value: aiTotal, color: 'text-[#1C232B]' },
              { label: 'Exact Matches', value: <>{exactHitsCount}/{TOTAL_ROUNDS}</>, color: 'text-[#047857]' },
            ]}
          />

          <SealUnlockedNotice badges={unlockedBadges} />

          {/* Round-by-round breakdown */}
          <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E0D5] font-mono text-[#5A6572]">
                  <th className="py-2 pr-3">Round</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Your Expression</th>
                  <th className="py-2 pr-3">Solver AI Reference</th>
                  <th className="py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE4] font-mono tabular-nums">
                {history.map((row) => (
                  <tr key={row.roundNumber}>
                    <td className="py-2.5 pr-3 text-[#5A6572]">
                      #{row.roundNumber}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-[#1C232B]">
                      {row.target}
                    </td>
                    <td className="py-2.5 pr-3 text-[#1C232B]">
                      {row.playerExpression} = {row.playerValue}
                    </td>
                    <td className="py-2.5 pr-3 text-[#5A6572]">
                      {row.aiExpression} = {row.aiValue}
                    </td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        row.exact ? 'text-[#047857]' : 'text-[#B45309]'
                      }`}
                    >
                      +{row.playerPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => startSession(ageTier)}
              className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Play 5 Fresh Targets
            </button>
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Open Mastery Notebook
            </button>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#5A6572] hover:text-[#1C232B] transition-colors"
            >
              Change Mode / Tier
            </button>
          </div>
        </section>
  );
}
