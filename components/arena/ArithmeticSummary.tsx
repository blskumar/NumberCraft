import { ADAPTIVE_BANDS } from '@/lib/adaptive-arithmetic';
import { ARITHMETIC_GAMES } from '@/lib/arithmetic-engine';
import { ArrowRight, Award, RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { ArithmeticCtx } from './useArithmeticArena';

export default function ArithmeticSummary({ r }: { r: ArithmeticCtx }) {
  const {
    accuracyPercent, activeSpec, adaptiveDifficulty, adaptiveState, attempted,
    bestStreak, gameId, isGameLockedForGuest, maxStageReached, missedEntries,
    onOpenNotebook, onRequireRegistration, parTarget, score, setPhase, solved,
    startRound, tierSpec,
  } = r;
  return (
        <section
          data-testid="arithmetic-summary"
          className="card-tactile mx-auto mt-6 max-w-2xl rounded-2xl p-6 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8]">
                {activeSpec.title} · {tierSpec.label} ({tierSpec.ageRange})
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-[#1C232B]">
                {score >= parTarget
                  ? 'Mastery Par Beaten!'
                  : attempted === 0
                    ? 'Round Ended Early'
                    : 'Strong Practice Round'}
              </h2>
              <p className="mt-1 text-sm text-[#5A6572]">
                {attempted > 0
                  ? 'Your session has been recorded in your Mastery Notebook.'
                  : 'Answer at least one question to log a round in your notebook.'}
              </p>
            </div>
            {score >= parTarget ? (
              <Award
                className="h-10 w-10 shrink-0 text-[#B45309]"
                aria-hidden="true"
              />
            ) : (
              <Sparkles
                className="h-9 w-9 shrink-0 text-[#1D4ED8]"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Final Score', value: `${score} pts` },
              {
                label: 'Solved',
                value: `${solved} / ${attempted}`,
              },
              { label: 'Accuracy', value: `${accuracyPercent}%` },
              {
                label:
                  gameId === 'multiplication-mastery'
                    ? 'Highest Stage'
                    : 'Best Streak',
                value:
                  gameId === 'multiplication-mastery'
                    ? `Stage ${maxStageReached}`
                    : `${bestStreak}×`,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5"
              >
                <p className="text-[11px] text-[#5A6572]">{kpi.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#1C232B] tabular-nums">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {adaptiveDifficulty && attempted > 0 && (
            <div
              data-testid="adaptive-summary-journey"
              className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9E4F7] bg-[#F3F7FF] px-4 py-3 text-xs"
            >
              <div className="flex items-center gap-2 text-[#1C232B]">
                <SlidersHorizontal
                  className="h-4 w-4 text-[#1D4ED8]"
                  aria-hidden="true"
                />
                <span className="font-semibold">Adaptive Band Journey:</span>
                <span className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                  {ADAPTIVE_BANDS[adaptiveState.startLevel].shortLabel} →{' '}
                  {ADAPTIVE_BANDS[adaptiveState.level].shortLabel}
                </span>
              </div>
              <span className="font-mono text-[#46515E] tabular-nums">
                Peak Lv {adaptiveState.peakLevel} · {adaptiveState.stepUps}{' '}
                {adaptiveState.stepUps === 1 ? 'step-up' : 'step-ups'} ·{' '}
                {adaptiveState.stepDowns}{' '}
                {adaptiveState.stepDowns === 1 ? 'gentle ease' : 'gentle eases'}
              </span>
            </div>
          )}

          {missedEntries.length > 0 && (
            <div className="mt-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
              <p className="text-xs font-semibold text-[#1C232B]">
                Review Missed Problems ({missedEntries.length})
              </p>
              <ul className="mt-2.5 space-y-2">
                {missedEntries.slice(0, 6).map((m, idx) => (
                  <li
                    key={`${m.problem.id}-${idx}`}
                    className="rounded-lg border border-[#ECE7DD] bg-white p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono font-semibold text-[#1C232B]">
                      <span>
                        {m.problem.left} {m.problem.operator} {m.problem.right} ={' '}
                        <span className="text-[#047857]">
                          {m.problem.answer}
                        </span>
                      </span>
                      <span className="text-[#BE123C]">
                        You entered {m.submitted}
                      </span>
                    </div>
                    <p className="mt-1 text-[#5A6572]">{m.problem.hint}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isGameLockedForGuest?.(gameId) && (
            <div
              data-testid="arena-guest-trial-notice"
              className="mt-5 rounded-xl border border-[#1D4ED8]/35 bg-[#EFF5FF] px-4 py-3 text-xs text-[#1C232B]"
            >
              <strong>Free Guest Trial Complete:</strong> You&apos;ve completed
              your 1 free level for {ARITHMETIC_GAMES[gameId].title}. Register
              for free with any email address (no payment required) to unlock
              unlimited levels and save your scores to the Top 10 Leaderboards.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {isGameLockedForGuest?.(gameId) ? (
                <button
                  type="button"
                  data-testid="arena-guest-register-btn"
                  onClick={() => onRequireRegistration?.(gameId)}
                  className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                >
                  Register Free to Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startRound()}
                  className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Play Again
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Change Difficulty
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
            >
              View in Mastery Notebook
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
  );
}
