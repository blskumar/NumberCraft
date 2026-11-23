import { ADAPTIVE_BANDS, type AdaptiveLevel } from '@/lib/adaptive-arithmetic';
import { CORRECT_ANSWERS_PER_STAGE } from '@/lib/arithmetic-engine';
import { Check, Clock, Delete, Flame, Lightbulb, SlidersHorizontal, TrendingDown, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import type { ArithmeticCtx } from './useArithmeticArena';

export default function ArithmeticPlay({ r }: { r: ArithmeticCtx }) {
  const {
    accuracyPercent, adaptiveDifficulty, adaptiveState, attempted,
    elapsedSeconds, feedback, finalizeRound, gameId, handleBackspace,
    handleDigitAppend, history, inputValue, multiplicationStages, onToggleSound,
    pacePerMinute, parTarget, problem, score, secondsLeft, setInputValue,
    setShowHint, showHint, solved, soundEnabled, streak, submitAnswer,
    tableFocus, untimed,
  } = r;
  if (!problem) return null;
  return (
        <section className="mt-6 space-y-5">
          {/* Compact Single-Row HUD */}
          <div className="card-tactile grid grid-cols-2 gap-3 rounded-2xl p-4 sm:grid-cols-5">
            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">
                {untimed ? 'Elapsed' : 'Time Left'}
              </p>
              <p
                data-testid="arithmetic-timer"
                className={`mt-0.5 flex items-center gap-1.5 font-mono text-2xl font-semibold tabular-nums ${
                  !untimed && secondsLeft <= 8
                    ? 'text-[#BE123C]'
                    : !untimed && secondsLeft <= 15
                      ? 'text-[#B45309]'
                      : 'text-[#1C232B]'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                {untimed ? `${elapsedSeconds}s` : `${secondsLeft}s`}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">
                Score (Par {parTarget})
              </p>
              <p
                data-testid="arithmetic-score"
                className="mt-0.5 font-mono text-2xl font-semibold text-[#1D4ED8] tabular-nums"
              >
                {score}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">Streak</p>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-2xl font-semibold text-[#B45309] tabular-nums">
                <Flame className="h-4 w-4 shrink-0" aria-hidden="true" />
                {streak}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">
                {gameId === 'subtraction-sprint' ? 'Pace' : 'Accuracy'}
              </p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-[#047857] tabular-nums">
                {gameId === 'subtraction-sprint'
                  ? `${pacePerMinute}/m`
                  : `${accuracyPercent}%`}
              </p>
            </div>

            <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
              <button
                type="button"
                data-testid="arithmetic-hud-sound-toggle"
                aria-pressed={soundEnabled}
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
                title={soundEnabled ? 'Global audio on — click to mute' : 'Global audio muted — click to enable'}
                className={`rounded-lg border p-2 transition-colors ${
                  soundEnabled
                    ? 'border-[#1D4ED8]/40 bg-[#EFF5FF] text-[#1D4ED8]'
                    : 'border-[#D8D1C4] bg-[#FAF8F4] text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1C232B]'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                data-testid="finish-arithmetic-btn"
                onClick={() => finalizeRound()}
                className="rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap"
              >
                Finish Round
              </button>
            </div>
          </div>

          {/* Live Adaptive Difficulty Band Bar */}
          {adaptiveDifficulty && (
            <div
              data-testid="adaptive-band-bar"
              className="card-tactile rounded-2xl px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal
                    className="h-3.5 w-3.5 text-[#1D4ED8]"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-[#1C232B]">
                    Adaptive Band:
                  </span>
                  <span
                    data-testid="adaptive-level-label"
                    className="font-mono text-xs font-semibold text-[#1D4ED8]"
                  >
                    {ADAPTIVE_BANDS[adaptiveState.level].label}
                  </span>
                </div>

                {adaptiveState.lastAdjustment ? (
                  <p
                    data-testid="adaptive-adjustment-banner"
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      adaptiveState.lastAdjustment.direction === 'up'
                        ? 'text-[#047857]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    {adaptiveState.lastAdjustment.direction === 'up' ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <TrendingDown
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    )}
                    {adaptiveState.lastAdjustment.reason}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#5A6572]">
                    {ADAPTIVE_BANDS[adaptiveState.level].description}
                  </p>
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                {([1, 2, 3, 4, 5] as AdaptiveLevel[]).map((lvl) => {
                  const active = lvl === adaptiveState.level;
                  const passed = lvl < adaptiveState.level;
                  return (
                    <div
                      key={lvl}
                      className={`h-2 rounded-full transition-colors ${
                        active
                          ? adaptiveState.lastAdjustment?.direction === 'down'
                            ? 'bg-[#B45309]'
                            : 'bg-[#1D4ED8]'
                          : passed
                            ? 'bg-[#047857]/75'
                            : 'bg-[#E5E0D5]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Progressive Table Ladder (Multiplication Mastery) */}
          {gameId === 'multiplication-mastery' &&
            tableFocus === 'progressive' && (
              <div className="card-tactile rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#1C232B]">
                    Multiplication Ladder · Currently on Stage {problem.stage}{' '}
                    of 5
                  </span>
                  <span className="font-mono text-[#5A6572] tabular-nums">
                    {adaptiveDifficulty
                      ? 'Adapts automatically based on your streak & accuracy'
                      : problem.stage < 5
                        ? `${CORRECT_ANSWERS_PER_STAGE - (solved % CORRECT_ANSWERS_PER_STAGE)} more correct to reach Stage ${problem.stage + 1}`
                        : 'Top Stage Reached · Boss Tables Active'}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-2">
                  {multiplicationStages.map((st) => {
                    const reached = problem.stage >= st.stage;
                    const current = problem.stage === st.stage;
                    return (
                      <div
                        key={st.stage}
                        className={`rounded-lg border px-2.5 py-2 transition-colors ${
                          current
                            ? 'border-[#B45309] bg-[#FDF6E7]'
                            : reached
                              ? 'border-[#047857]/40 bg-[#ECFDF5]'
                              : 'border-[#E5E0D5] bg-[#FAF8F4] opacity-70'
                        }`}
                      >
                        <p className="font-mono text-[10px] font-semibold text-[#5A6572]">
                          Stage {st.stage}
                        </p>
                        <p className="truncate text-xs font-semibold text-[#1C232B]">
                          {st.rangeLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Main Equation Desk + Keypad + Mini Tape */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="card-tactile flex flex-col justify-between rounded-2xl p-6 sm:p-8 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#5A6572]">
                  {problem.stageLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-[#FAF8F4] px-3 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#B45309] hover:text-[#B45309] transition-colors"
                >
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                  {showHint ? 'Hide Strategy Hint' : 'Strategy Hint (H)'}
                </button>
              </div>

              {/* Oversized Tactile Equation */}
              <div className="my-8 text-center">
                <motion.div
                  key={problem.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.14 }}
                  className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
                >
                  <span
                    data-testid="arithmetic-equation"
                    className="font-mono text-4xl font-semibold tracking-tight text-[#1C232B] tabular-nums sm:text-6xl"
                  >
                    {problem.left} {problem.operator} {problem.right} =
                  </span>
                  <div
                    data-testid="arithmetic-answer-display"
                    aria-live="polite"
                    className="inline-flex h-16 min-w-[120px] items-center justify-center rounded-2xl border-2 border-[#1D4ED8] bg-[#FAF8F4] px-4 font-mono text-4xl font-semibold text-[#1D4ED8] shadow-[inset_0_2px_4px_rgba(28,35,43,0.06)] tabular-nums sm:h-20 sm:min-w-[148px] sm:text-5xl"
                  >
                    {inputValue || (
                      <span className="text-[#C5BEB0]">?</span>
                    )}
                  </div>
                </motion.div>

                {/* Instant Feedback Slot */}
                <div className="mt-4 min-h-[24px]">
                  {feedback && (
                    <p
                      data-testid="arithmetic-feedback"
                      className={`font-mono text-sm font-semibold ${
                        feedback.kind === 'correct'
                          ? 'text-[#047857]'
                          : 'text-[#BE123C]'
                      }`}
                    >
                      {feedback.text}
                    </p>
                  )}
                </div>

                {/* Mental Math Strategy Hint Drawer */}
                {showHint && (
                  <div
                    data-testid="arithmetic-hint-drawer"
                    className="mx-auto mt-4 max-w-lg rounded-xl border border-[#DFC99B] bg-[#FDF6E7] px-4 py-3 text-left text-xs leading-relaxed text-[#6B4209]"
                  >
                    <span className="font-semibold">
                      {adaptiveDifficulty && adaptiveState.suggestHint
                        ? 'Helpful Strategy Cue: '
                        : 'Mental Math Tip: '}
                    </span>
                    {problem.hint}
                  </div>
                )}
              </div>

              {/* Tactile Ceramic Keypad */}
              <div className="mx-auto w-full max-w-sm">
                <div className="grid grid-cols-3 gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigitAppend(digit)}
                      className="rounded-xl border border-[#D8D1C4] bg-white py-3 font-mono text-xl font-semibold text-[#1C232B] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      {digit}
                    </button>
                  ))}

                  {problem.allowNegative ? (
                    <button
                      type="button"
                      onClick={() => handleDigitAppend('-')}
                      aria-label="Toggle negative sign"
                      className="rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] py-3 font-mono text-xl font-semibold text-[#46515E] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8] active:translate-y-0.5 transition-all"
                    >
                      ±
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInputValue('')}
                      className="rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] py-3 text-xs font-semibold text-[#5A6572] shadow-[0_3px_0_#DFD7C8] hover:border-[#BE123C] hover:text-[#BE123C] active:translate-y-0.5 transition-all"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDigitAppend('0')}
                    className="rounded-xl border border-[#D8D1C4] bg-white py-3 font-mono text-xl font-semibold text-[#1C232B] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Backspace"
                    className="flex items-center justify-center rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] py-3 text-[#5A6572] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8] hover:text-[#1C232B] active:translate-y-0.5 transition-all"
                  >
                    <Delete className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="submit-arithmetic-answer"
                  onClick={() => submitAnswer(inputValue)}
                  disabled={!inputValue || inputValue === '-'}
                  className="btn-cobalt mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Check Answer (Enter)
                </button>
              </div>
            </div>

            {/* Right Paper Tape Ledger */}
            <aside className="card-tactile flex flex-col rounded-2xl p-5 lg:col-span-4">
              <div className="flex items-center justify-between border-b border-[#ECE7DD] pb-3">
                <h3 className="font-display text-base font-semibold text-[#1C232B]">
                  Answer Tape
                </h3>
                <span className="font-mono text-xs text-[#5A6572] tabular-nums">
                  {solved} / {attempted} correct
                </span>
              </div>

              {history.length === 0 ? (
                <p className="mt-6 text-center text-xs text-[#7A8490]">
                  Solved problems appear here in real time so you can spot
                  patterns and review misses immediately.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 overflow-y-auto max-h-[380px]">
                  {history.slice(0, 12).map((item, idx) => (
                    <li
                      key={`${item.problem.id}-${idx}`}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs ${
                        item.correct
                          ? 'border-[#D1FAE5] bg-[#F2FBF7] text-[#1C232B]'
                          : 'border-[#FECDD3] bg-[#FFF5F7] text-[#1C232B]'
                      }`}
                    >
                      <span>
                        {item.problem.left} {item.problem.operator}{' '}
                        {item.problem.right} ={' '}
                        <strong>{item.problem.answer}</strong>
                        {!item.correct && (
                          <span className="ml-1.5 text-[#BE123C] line-through">
                            {item.submitted}
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          item.correct
                            ? 'font-semibold text-[#047857]'
                            : 'font-semibold text-[#BE123C]'
                        }
                      >
                        {item.correct ? `+${item.pointsEarned}` : 'Miss'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </section>
  );
}
