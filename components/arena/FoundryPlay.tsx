import { TOTAL_ROUNDS } from './foundry-constants';
import { ArrowRight, Check, Cpu, Delete, Lightbulb, Sparkles, Target, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { FoundryCtx } from './useEquationFoundryArena';

export default function FoundryPlay({ r }: { r: FoundryCtx }) {
  const {
    activeTierSpec,
    aiDifficulty,
    aiTotal,
    currentDelta,
    evaluation,
    exactHitsCount,
    exactMatchNow,
    handleBackspace,
    handleClearBench,
    handleNextRound,
    handleRemoveTokenAt,
    handleSelectOperator,
    handleSelectTile,
    handleSubmitRound,
    hintRevealed,
    history,
    mode,
    playerName,
    playerTotal,
    prefersReducedMotion,
    puzzle,
    roundNumber,
    roundRevealed,
    setHintRevealed,
    setStepsRevealed,
    stepsRevealed,
    tokens,
    usedTileSet,
  } = r;
  return (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left / Main Workbench */}
          <div className="space-y-5 lg:col-span-8">
            {/* Round & Score Header */}
            <div className="card-tactile flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                  {roundNumber}/{TOTAL_ROUNDS}
                </div>
                <div>
                  <p className="font-mono text-[11px] text-[#5A6572]">
                    Round {roundNumber} of {TOTAL_ROUNDS}
                  </p>
                  <p className="text-sm font-semibold text-[#1C232B]">
                    {playerName} vs.{' '}
                    {mode === 'solo'
                      ? 'Foundry Par'
                      : `Solver AI (${aiDifficulty})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 font-mono tabular-nums">
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                  <p className="text-lg font-semibold text-[#1D4ED8]">
                    {playerTotal} pts
                  </p>
                </div>
                <div className="h-7 w-px bg-[#E5E0D5]" aria-hidden="true" />
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">
                    {mode === 'solo' ? 'Par' : 'Solver AI'}
                  </p>
                  <p className="text-lg font-semibold text-[#1C232B]">
                    {aiTotal} pts
                  </p>
                </div>
              </div>
            </div>

            {/* Target & Expression Bench */}
            <div className="card-tactile rounded-2xl p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE7DD] pb-5">
                <div>
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#B45309]">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    TARGET NUMBER
                  </p>
                  <p
                    data-testid="foundry-target"
                    className="mt-1 font-mono text-4xl font-semibold tracking-tight text-[#1C232B] sm:text-5xl tabular-nums"
                  >
                    {puzzle.target}
                  </p>
                </div>

                {/* Live Evaluation Readout */}
                <div
                  data-testid="foundry-live-eval"
                  aria-live="polite"
                  className={`rounded-xl border px-4 py-3 text-right font-mono tabular-nums transition-colors ${
                    exactMatchNow
                      ? 'border-[#047857]/40 bg-[#ECFDF5] text-[#047857]'
                      : evaluation.valid
                        ? 'border-[#1D4ED8]/30 bg-[#EFF5FF] text-[#1D4ED8]'
                        : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#5A6572]'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Live Expression Value
                  </p>
                  {evaluation.valid && evaluation.value !== null ? (
                    <div className="mt-0.5 flex items-baseline justify-end gap-2">
                      <span className="text-2xl font-semibold">
                        = {evaluation.value}
                      </span>
                      <span className="text-xs font-semibold">
                        {exactMatchNow ? (
                          <span className="inline-flex items-center gap-1 text-[#047857]">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Exact Match
                          </span>
                        ) : currentDelta !== null ? (
                          `(${currentDelta > 0 ? `+${currentDelta}` : currentDelta} from target)`
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-[#5A6572]">
                      {evaluation.error ?? 'Tap number tiles and operators below.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Expression Bench (Clickable tokens to remove) */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#5A6572]">
                    Expression Bench{' '}
                    <span className="font-normal">
                      (click any placed chip to remove)
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={tokens.length === 0 || Boolean(roundRevealed)}
                      onClick={handleBackspace}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#D8D0C0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] disabled:opacity-40 transition-colors"
                    >
                      <Delete className="h-3.5 w-3.5" aria-hidden="true" />
                      Undo
                    </button>
                    <button
                      type="button"
                      disabled={tokens.length === 0 || Boolean(roundRevealed)}
                      onClick={handleClearBench}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#D8D0C0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5A6572] hover:border-[#BE123C] hover:text-[#BE123C] disabled:opacity-40 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  data-testid="foundry-bench"
                  className="mt-2.5 flex min-h-[76px] flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#D2C9B8] bg-[#FAF8F4] p-3.5"
                >
                  {tokens.length === 0 ? (
                    <span className="text-xs text-[#737E8A]">
                      Select ceramic number tiles and operators below to forge{' '}
                      <strong className="font-mono text-[#1C232B]">
                        {puzzle.target}
                      </strong>
                      …
                    </span>
                  ) : (
                    tokens.map((tok, idx) => {
                      const isTile = tok.kind === 'tile';
                      return (
                        <motion.button
                          key={`${idx}-${isTile ? tok.tileId : tok.op}`}
                          type="button"
                          disabled={Boolean(roundRevealed)}
                          onClick={() => handleRemoveTokenAt(idx)}
                          initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.14 }}
                          title="Click to remove from expression"
                          className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-3 font-mono text-lg font-semibold tabular-nums transition-all hover:-translate-y-0.5 ${
                            isTile
                              ? 'border-[#1D4ED8]/45 bg-white text-[#1C232B] shadow-[0_2px_0_#C7D7FA]'
                              : 'border-[#D4B88C] bg-[#FDF6E7] text-[#8A5108] shadow-[0_2px_0_#DEC59D]'
                          }`}
                        >
                          {isTile ? tok.value : tok.op}
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Ceramic Number Tiles */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Available Number Tiles{' '}
                  <span className="font-normal text-[#5A6572]">
                    (use each tile at most once)
                  </span>
                </p>
                <div className="mt-2.5 grid grid-cols-5 gap-2.5 sm:gap-3">
                  {puzzle.tiles.map((tile, idx) => {
                    const used = usedTileSet.has(tile.id);
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        data-testid={`foundry-tile-${idx}`}
                        disabled={used || Boolean(roundRevealed)}
                        aria-pressed={used}
                        onClick={() => handleSelectTile(tile)}
                        className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl border font-mono text-xl font-semibold tabular-nums transition-all ${
                          used
                            ? 'border-[#E5E0D5] bg-[#F1EDE4] text-[#9AA3AE] line-through shadow-none'
                            : 'border-[#CFC6B4] bg-white text-[#1C232B] shadow-[0_3px_0_#D8D0C0] hover:-translate-y-0.5 hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:translate-y-0'
                        }`}
                      >
                        <span>{tile.value}</span>
                        <span className="mt-0.5 font-sans text-[10px] font-medium">
                          {used ? 'Placed' : 'Tile'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operator Keys */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Operator Keys ({activeTierSpec.label} Set)
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {puzzle.allowedOperators.map((op) => (
                    <button
                      key={op}
                      type="button"
                      data-testid={`foundry-op-${op}`}
                      disabled={Boolean(roundRevealed)}
                      onClick={() => handleSelectOperator(op)}
                      className="inline-flex min-h-[46px] min-w-[52px] items-center justify-center rounded-xl border border-[#D4B88C] bg-[#FDF6E7] px-3.5 font-mono text-lg font-semibold text-[#8A5108] shadow-[0_2px_0_#DEC59D] hover:-translate-y-0.5 hover:border-[#B45309] active:translate-y-0 disabled:opacity-40 transition-all"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Row */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-5">
                {!roundRevealed ? (
                  <>
                    <button
                      type="button"
                      data-testid="foundry-hint-btn"
                      onClick={() => setHintRevealed(true)}
                      disabled={hintRevealed}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DFC99B] bg-[#FFFDF7] px-4 py-2 text-xs font-semibold text-[#8A5108] hover:border-[#B45309] disabled:opacity-60 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4" aria-hidden="true" />
                      {hintRevealed ? 'Strategy Clue Shown (−15 pts)' : 'Show Solver Clue (−15 pts)'}
                    </button>

                    <button
                      type="button"
                      data-testid="foundry-submit-btn"
                      disabled={!evaluation.valid || evaluation.value === null}
                      onClick={handleSubmitRound}
                      className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-45"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      {exactMatchNow ? 'Lock Exact Match' : 'Submit Expression'}
                    </button>
                  </>
                ) : (
                  <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {roundRevealed.exact ? (
                        <span className="inline-flex items-center gap-1.5 text-[#047857]">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Exact match forged! +{roundRevealed.playerPoints} pts
                        </span>
                      ) : (
                        <span className="text-[#B45309]">
                          Evaluated to {roundRevealed.playerValue} (off by{' '}
                          {roundRevealed.playerDistance}) · +
                          {roundRevealed.playerPoints} pts
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid="foundry-next-btn"
                      onClick={handleNextRound}
                      className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
                    >
                      {roundNumber >= TOTAL_ROUNDS
                        ? 'Finish Foundry Session'
                        : `Next Target (Round ${roundNumber + 1})`}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Concept & Solver Panel */}
          <aside className="space-y-5 lg:col-span-4">
            {/* Hint / Solver Breakdown */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8]">
                <Cpu className="h-4 w-4" aria-hidden="true" />
                <span>Expression Solver Notebook</span>
              </div>

              {roundRevealed ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5">
                    <p className="font-mono text-[11px] font-semibold text-[#5A6572]">
                      Your Expression
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                      {roundRevealed.playerExpression} ={' '}
                      {roundRevealed.playerValue}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#1D4ED8]/30 bg-[#EFF5FF] p-3.5">
                    <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                      Solver AI Solution (+{roundRevealed.aiPoints} pts)
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                      {puzzle.solverSolution.expression} ={' '}
                      {puzzle.solverSolution.value}
                    </p>
                    {puzzle.solverSolution.steps.length > 0 && (
                      <ol className="mt-2.5 space-y-1 border-t border-[#C7D7FA] pt-2 font-mono text-xs text-[#334155]">
                        {puzzle.solverSolution.steps.map((step, idx) => (
                          <li key={idx}>
                            {idx + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              ) : hintRevealed ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-[#DFC99B] bg-[#FFFDF7] p-3.5">
                    <p className="text-xs font-semibold text-[#8A5108]">
                      Strategy Clue
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#46515E]">
                      {puzzle.hintText}
                    </p>
                  </div>

                  {!stepsRevealed ? (
                    <button
                      type="button"
                      onClick={() => setStepsRevealed(true)}
                      className="w-full rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
                    >
                      Reveal First Step From Solver Tree
                    </button>
                  ) : (
                    <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3 font-mono text-xs text-[#1C232B]">
                      Step 1:{' '}
                      {puzzle.solverSolution.steps[0] ??
                        puzzle.solverSolution.expression}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2.5 text-xs leading-relaxed text-[#5A6572]">
                  Submit your expression to compare against the deterministic
                  Expression Solver AI’s step tree, or request a clue if you get
                  stuck.
                </p>
              )}
            </div>

            {/* Completed Rounds Ledger */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Round Ledger
                </p>
                <span className="font-mono text-xs text-[#5A6572] tabular-nums">
                  {exactHitsCount} exact
                </span>
              </div>
              {history.length === 0 ? (
                <p className="mt-2.5 text-xs text-[#737E8A]">
                  Your forged expressions and scores for each round appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {history.map((item) => (
                    <li
                      key={item.roundNumber}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] px-3 py-2 text-xs font-mono tabular-nums"
                    >
                      <span className="truncate text-[#1C232B]">
                        R{item.roundNumber}: {item.playerExpression} ={' '}
                        {item.playerValue}
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          item.exact ? 'text-[#047857]' : 'text-[#B45309]'
                        }`}
                      >
                        +{item.playerPoints}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
  );
}
