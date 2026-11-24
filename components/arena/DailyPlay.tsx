import { Check, Clock, Delete, Flame, Lightbulb, Lock, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import type { DailyCtx } from './useDailyChallengeArena';

export default function DailyPlay({ r }: { r: DailyCtx }) {
  const {
    currentStep, feedback, handleBackspace, handleDigitAppend, handleRevealHint,
    handleSubmitStep, hintsUsed, inputValue, mistakes, onToggleSound,
    practiceReplay, puzzle, secondsLeft, setInputValue, showHint, solvedValues,
    soundEnabled, stepIdx, streakRewards,
  } = r;
  return (
        <section className="mt-6 space-y-5">
          {/* HUD Bar */}
          <div className="card-tactile grid grid-cols-2 gap-3 rounded-2xl p-4 sm:grid-cols-5">
            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">
                Chronometer
              </p>
              <p
                data-testid="daily-timer"
                className={`mt-0.5 flex items-center gap-1.5 font-mono text-2xl font-semibold tabular-nums ${
                  secondsLeft <= 12
                    ? 'text-[#BE123C]'
                    : secondsLeft <= 25
                      ? 'text-[#B45309]'
                      : 'text-[#1C232B]'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                {secondsLeft}s
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">Progress</p>
              <p
                data-testid="daily-step-counter"
                className="mt-0.5 font-mono text-2xl font-semibold text-[#1D4ED8] tabular-nums"
              >
                Clue {stepIdx + 1} / 3
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">Mistakes</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-[#1C232B] tabular-nums">
                {mistakes}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#5A6572]">
                Hints Used
              </p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-[#B45309] tabular-nums">
                {hintsUsed}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
                className="rounded-lg border border-[#D8D1C4] bg-[#FAF8F4] p-2 text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1C232B]"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={handleRevealHint}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#B45309] hover:text-[#B45309] whitespace-nowrap"
              >
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                Hint (H)
              </button>
            </div>
          </div>

          {/* Active Streak Bonus Banner during timed challenge */}
          {!practiceReplay && streakRewards.projectedBonusPoints > 0 && (
            <div
              data-testid="daily-active-streak-cue"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFC99B] bg-[#FFFBEB] px-4 py-2.5 text-xs"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#92400E]">
                <Flame className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
                Streak Bonus On The Line: Finish all 3 clues to lock in Day{' '}
                {streakRewards.projectedStreakIfSolvedToday}
              </span>
              <span className="font-mono font-semibold text-[#047857] tabular-nums">
                +{streakRewards.projectedBonusPoints} pts bonus
              </span>
            </div>
          )}

          {/* 3-Clue Linked Chain Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {puzzle.steps.map((step, idx) => {
              const isSolved = solvedValues[idx] !== null;
              const isCurrent = idx === stepIdx;
              return (
                <div
                  key={step.stepNumber}
                  className={`rounded-xl border px-4 py-3 transition-colors ${
                    isSolved
                      ? 'border-[#047857]/40 bg-[#ECFDF5]'
                      : isCurrent
                        ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                        : 'border-[#E5E0D5] bg-[#FAF8F4] opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[#5A6572]">
                      Clue {step.stepNumber} · {step.variableLabel}
                    </span>
                    {isSolved ? (
                      <span className="font-mono font-semibold text-[#047857] tabular-nums">
                        {step.variableLabel} = {solvedValues[idx]} ✓
                      </span>
                    ) : isCurrent ? (
                      <span className="font-semibold text-[#1D4ED8]">
                        Active
                      </span>
                    ) : (
                      <Lock
                        className="h-3.5 w-3.5 text-[#9AA3AD]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Puzzle Card + Ceramic Keypad */}
          <div className="card-tactile mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
            <p className="font-mono text-xs font-semibold text-[#B45309]">
              {currentStep.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
              {currentStep.prompt}
            </p>

            <motion.div
              key={currentStep.stepNumber}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="mt-5 rounded-2xl border border-[#DFD8CA] bg-[#FAF8F4] px-5 py-6 text-center"
            >
              <p
                data-testid="daily-formula"
                className="font-mono text-2xl font-semibold tracking-tight text-[#1C232B] tabular-nums sm:text-3xl"
              >
                {currentStep.formulaDisplay}
              </p>

              <div className="mt-5 flex items-center justify-center gap-3">
                <span className="font-mono text-lg font-semibold text-[#5A6572]">
                  {currentStep.variableLabel} =
                </span>
                <div
                  data-testid="daily-answer-box"
                  aria-live="polite"
                  className="inline-flex h-14 min-w-[132px] items-center justify-center rounded-xl border-2 border-[#1D4ED8] bg-white px-4 font-mono text-3xl font-semibold text-[#1D4ED8] tabular-nums"
                >
                  {inputValue || <span className="text-[#C5BEB0]">?</span>}
                </div>
              </div>

              {feedback && (
                <p
                  data-testid="daily-feedback"
                  className={`mt-4 font-mono text-xs font-semibold ${
                    feedback.kind === 'correct'
                      ? 'text-[#047857]'
                      : 'text-[#BE123C]'
                  }`}
                >
                  {feedback.text}
                </p>
              )}

              {showHint && (
                <div className="mx-auto mt-4 max-w-md rounded-xl border border-[#DFC99B] bg-[#FDF6E7] px-4 py-2.5 text-left text-xs text-[#6B4209]">
                  <strong>Strategy Hint: </strong>
                  {currentStep.hint}
                </div>
              )}
            </motion.div>

            {/* Ceramic Keypad */}
            <div className="mx-auto mt-6 w-full max-w-xs">
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDigitAppend(d)}
                    className="rounded-xl border border-[#D8D1C4] bg-white py-2.5 font-mono text-lg font-semibold text-[#1C232B] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:translate-y-0.5 transition-all"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] py-2.5 text-xs font-semibold text-[#5A6572] shadow-[0_3px_0_#DFD7C8] hover:border-[#BE123C] hover:text-[#BE123C]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitAppend('0')}
                  className="rounded-xl border border-[#D8D1C4] bg-white py-2.5 font-mono text-lg font-semibold text-[#1C232B] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  className="flex items-center justify-center rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] py-2.5 text-[#5A6572] shadow-[0_3px_0_#DFD7C8] hover:border-[#1D4ED8]"
                >
                  <Delete className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                data-testid="daily-submit-btn"
                onClick={() => handleSubmitStep(inputValue)}
                disabled={!inputValue}
                className="btn-cobalt mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {stepIdx < 2
                  ? `Unlock ${currentStep.variableLabel} (Enter)`
                  : 'Open Daily Vault (Enter)'}
              </button>
            </div>
          </div>
        </section>
  );
}
