import TierPicker from './TierPicker';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import { generateDailyPuzzle } from '@/lib/daily-challenge';
import { ArrowRight, Play, Volume2, VolumeX } from 'lucide-react';
import type { DailyCtx } from './useDailyChallengeArena';

export default function DailyBriefing({ r }: { r: DailyCtx }) {
  const {
    ageTier, dailyBadgeStatuses, onChangeTier, onOpenNotebook, onToggleSound,
    playerName, puzzle, soundEnabled, startDailyRun, todayKey,
  } = r;
  return (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="card-tactile rounded-2xl p-6 sm:p-7 lg:col-span-7">
            <p className="text-xs font-semibold text-[#B45309]">
              One Unique Timed Puzzle Per Day · Edition #{puzzle.editionNumber}
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#1C232B]">
              Today’s Theme: {puzzle.archetypeTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
              {puzzle.archetypeTagline} Solve all three linked clues before the
              chronometer reaches zero to stamp today’s date and earn unique
              Daily Mastery Seals.
            </p>

            {/* Tier Selector Before Starting Today's Clock */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                Choose Today’s Challenge Tier (Locks once you start)
              </p>
              <TierPicker
                ageTier={ageTier}
                onChangeTier={onChangeTier}
                detail={(t) => (
                  <p className="mt-1.5 font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
                    {generateDailyPuzzle(todayKey, t).timeLimitSeconds}s Chronometer
                  </p>
                )}
              />
            </div>

            {/* 3-Clue Chain Preview */}
            <div className="mt-6 border-t border-[#ECE7DD] pt-5">
              <p className="text-xs font-semibold text-[#1C232B]">
                3-Step Linked Vault Structure
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {puzzle.steps.map((s) => (
                  <div
                    key={s.stepNumber}
                    className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3"
                  >
                    <p className="font-mono text-[11px] font-semibold text-[#B45309]">
                      Step {s.stepNumber} · {s.variableLabel}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#1C232B]">
                      {s.title.replace(/^Clue \d · /, '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="start-daily-btn"
                onClick={() => startDailyRun(false)}
                className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Start Edition #{puzzle.editionNumber} ({puzzle.timeLimitSeconds}
                s)
              </button>
              <button
                type="button"
                onClick={onToggleSound}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] px-3.5 py-3 text-xs font-semibold text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1C232B]"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Chimes On
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    Chimes Muted
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Card: 4 Unique Daily Mastery Seals Preview */}
          <aside className="card-tactile rounded-2xl p-6 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-[#ECE7DD] pb-3.5">
              <div>
                <p className="text-xs font-medium text-[#5A6572]">
                  Exclusive Rewards · {playerName}
                </p>
                <h3 className="font-display text-lg font-semibold text-[#1C232B]">
                  Daily Challenge Seals
                </h3>
              </div>
              <button
                type="button"
                onClick={onOpenNotebook}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
              >
                All Seals
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {dailyBadgeStatuses.map((status) => (
                <div
                  key={status.definition.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    status.earned
                      ? 'border-[#DFD8CA] bg-white'
                      : 'border-[#ECE7DD] bg-[#FAF8F4]'
                  }`}
                >
                  <AchievementSealIcon
                    id={status.definition.id}
                    accent={status.definition.accent}
                    earned={status.earned}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#1C232B]">
                        {status.definition.title}
                      </p>
                      <span className="font-mono text-[10px] font-semibold text-[#5A6572]">
                        {status.earned ? 'Earned' : status.definition.criteriaNote}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#5A6572]">
                      {status.definition.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
  );
}
