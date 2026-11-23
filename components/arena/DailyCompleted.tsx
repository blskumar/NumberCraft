import AchievementSealIcon from '@/components/AchievementSealIcon';
import { ArrowRight, Award, Check, Copy, RotateCcw } from 'lucide-react';
import type { DailyCtx } from './useDailyChallengeArena';

export default function DailyCompleted({ r }: { r: DailyCtx }) {
  const {
    activeCompletion, copiedSummary, countdownText, handleCopyShareSummary,
    newlyUnlockedBadges, onBackToStudio, onOpenNotebook, practiceReplay, puzzle,
    startDailyRun, streakRewards, streakStats, tierSpec,
  } = r;
  if (!activeCompletion) return null;
  return (
        <section
          data-testid="daily-completed-card"
          className="card-tactile mx-auto mt-6 max-w-3xl rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
            <div>
              <p className="font-mono text-xs font-semibold text-[#047857]">
                Edition #{activeCompletion.editionNumber} ·{' '}
                {puzzle.formattedDate} · {tierSpec.label}
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-[#1C232B]">
                {activeCompletion.solved
                  ? 'Daily Vault Cracked!'
                  : 'Chronometer Expired'}
              </h2>
              <p className="mt-1 text-sm text-[#5A6572]">
                {practiceReplay
                  ? 'Unranked practice replay complete. Your official daily stamp remains locked for today.'
                  : activeCompletion.solved
                    ? `Your ${puzzle.archetypeTitle} run is stamped in your Mastery Notebook. Come back in ${countdownText} for Edition #${activeCompletion.editionNumber + 1}.`
                    : 'Review the exact 3-step solution below, or run an unranked practice replay.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyShareSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] px-3.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap"
            >
              {copiedSummary ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                  Score Card Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy Score Card
                </>
              )}
            </button>
          </div>

          {/* KPI Summary Strip */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Daily Score', value: `${activeCompletion.score} pts` },
              {
                label: 'Solve Time',
                value: `${activeCompletion.secondsUsed}s / ${activeCompletion.timeLimitSeconds}s`,
              },
              {
                label: 'Accuracy',
                value: `${activeCompletion.mistakes} ${activeCompletion.mistakes === 1 ? 'miss' : 'misses'}`,
              },
              {
                label: 'Hints Used',
                value: String(activeCompletion.hintsUsed),
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5"
              >
                <p className="text-[11px] text-[#5A6572]">{kpi.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold text-[#1C232B] tabular-nums">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Current Streak Celebration & Consecutive Bonus Strip */}
          {activeCompletion.solved && (
            <div
              data-testid="daily-completed-streak"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DFC99B] bg-[#FDFBF5] px-4 py-3 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Award
                  className="h-4 w-4 shrink-0 text-[#B45309]"
                  aria-hidden="true"
                />
                <span className="font-semibold text-[#1C232B]">
                  Current Streak:{' '}
                  <span className="font-mono text-[#B45309] tabular-nums">
                    {streakStats.currentStreak}{' '}
                    {streakStats.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </span>
                {activeCompletion.streakBonus &&
                activeCompletion.streakBonus > 0 ? (
                  <span className="font-mono font-semibold text-[#047857] tabular-nums">
                    (+{activeCompletion.streakBonus} pts consecutive bonus
                    awarded!)
                  </span>
                ) : null}
              </div>
              <span className="font-mono text-[#5A6572] tabular-nums">
                {streakRewards.nextMilestone
                  ? `${streakRewards.daysToNextMilestone}d to ${streakRewards.nextMilestone.title} (+${streakRewards.nextMilestone.bonusPoints} pts)`
                  : 'Weekly Crown (+75 pts) unlocked!'}
              </span>
            </div>
          )}

          {/* Newly Unlocked Daily Badges Callout */}
          {newlyUnlockedBadges.length > 0 && (
            <div
              data-testid="daily-unlocked-badges"
              className="mt-5 rounded-xl border border-[#DFC99B] bg-[#FFFBEB] p-4"
            >
              <p className="text-xs font-semibold text-[#B45309]">
                New Daily Mastery{' '}
                {newlyUnlockedBadges.length === 1 ? 'Seal' : 'Seals'} Stamped!
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {newlyUnlockedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 rounded-lg border border-[#ECE1C6] bg-white p-2.5"
                  >
                    <AchievementSealIcon
                      id={badge.id}
                      accent={badge.accent}
                      earned={true}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#1C232B]">
                        {badge.title}
                      </p>
                      <p className="text-[11px] text-[#5A6572]">
                        {badge.criteriaNote}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full 3-Step Archival Solution Breakdown */}
          <div className="mt-6">
            <h3 className="font-display text-base font-semibold text-[#1C232B]">
              Edition #{puzzle.editionNumber} Verified Solution
            </h3>
            <div className="mt-3 space-y-2.5">
              {puzzle.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1C232B]">
                      {step.title}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#047857] tabular-nums">
                      {step.variableLabel} = {step.answer}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#46515E]">
                    {step.formulaDisplay}
                  </p>
                  <p className="mt-1 text-xs text-[#5A6572]">
                    {step.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenNotebook}
                className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
              >
                View Seals in Notebook
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => startDailyRun(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] px-3.5 py-2.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Practice Replay (Unranked)
              </button>
            </div>
            <button
              type="button"
              onClick={onBackToStudio}
              className="text-xs font-semibold text-[#5A6572] hover:text-[#1C232B]"
            >
              Return to Games
            </button>
          </div>
        </section>
  );
}
