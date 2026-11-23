import { TOTAL_ROUNDS } from './arena-shared';
import { BookOpen, RotateCcw, Trophy } from 'lucide-react';
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
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#047857]">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Equation Foundry Complete · Saved to Mastery Notebook
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
                {playerTotal > aiTotal
                  ? `Victory! You out-forged ${mode === 'solo' ? 'Foundry Par' : 'Solver AI'}.`
                  : playerTotal === aiTotal
                    ? 'Dead Heat! Balanced precision across all 5 targets.'
                    : 'Session Logged — Inspect the Solver Trees to sharpen your edge.'}
              </h2>
            </div>

            <div className="flex items-center gap-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-5 py-3 font-mono tabular-nums">
              <div>
                <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                <p className="text-2xl font-semibold text-[#1D4ED8]">
                  {playerTotal}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">
                  {mode === 'solo' ? 'Par' : 'Solver AI'}
                </p>
                <p className="text-2xl font-semibold text-[#1C232B]">
                  {aiTotal}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">Exact Matches</p>
                <p className="text-2xl font-semibold text-[#047857]">
                  {exactHitsCount}/{TOTAL_ROUNDS}
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

          {/* Round-by-round breakdown */}
          <div className="mt-6 overflow-x-auto">
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
