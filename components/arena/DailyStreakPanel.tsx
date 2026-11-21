import { DAILY_STREAK_MILESTONES, getStreakBonusPoints } from '@/lib/daily-challenge';
import { Calendar, Check, Flame, Sparkles, Trophy } from 'lucide-react';
import type { DailyCtx } from './useDailyChallengeArena';

export default function DailyStreakPanel({ r }: { r: DailyCtx }) {
  const {
    streakRewards,
    streakStats,
  } = r;
  return (
      <section
        aria-label="Current streak counter and 7-day daily challenge calendar"
        className="card-tactile mt-5 rounded-2xl p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left: Dedicated Current Streak Counter & Milestone Progress */}
          <div
            data-testid="daily-current-streak-panel"
            className="flex flex-col justify-between rounded-xl border border-[#E8DEC8] bg-[#FDFBF5] p-4 lg:col-span-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B45309]">
                  Current Streak
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    data-testid="daily-current-streak-value"
                    className="font-mono text-4xl font-semibold leading-none text-[#1C232B] tabular-nums"
                  >
                    {streakStats.currentStreak}
                  </span>
                  <span className="font-mono text-sm font-semibold text-[#5A6572]">
                    {streakStats.currentStreak === 1
                      ? 'consecutive day'
                      : 'consecutive days'}
                  </span>
                </div>
              </div>

              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                  streakStats.currentStreak > 0
                    ? 'border-[#DFC99B] bg-[#FFFBEB] text-[#B45309]'
                    : 'border-[#E5E0D5] bg-white text-[#9AA3AD]'
                }`}
              >
                <Flame className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <p
              data-testid="daily-streak-status-message"
              className="mt-2.5 text-xs leading-relaxed text-[#46515E]"
            >
              {streakStats.solvedToday ? (
                <>
                  Today&apos;s edition is stamped! Return tomorrow to extend to{' '}
                  <strong className="font-mono text-[#1C232B]">
                    {streakStats.currentStreak + 1} days
                  </strong>
                  {getStreakBonusPoints(streakStats.currentStreak + 1) > 0 && (
                    <>
                      {' '}
                      for a{' '}
                      <strong className="font-mono text-[#047857]">
                        +{getStreakBonusPoints(streakStats.currentStreak + 1)}{' '}
                        pts
                      </strong>{' '}
                      streak bonus
                    </>
                  )}
                  .
                </>
              ) : streakStats.currentStreak > 0 ? (
                <>
                  Solve today&apos;s vault to extend your streak to{' '}
                  <strong className="font-mono text-[#1C232B]">
                    {streakRewards.projectedStreakIfSolvedToday} days
                  </strong>
                  {streakRewards.projectedBonusPoints > 0 && (
                    <>
                      {' '}
                      and earn{' '}
                      <strong className="font-mono text-[#047857]">
                        +{streakRewards.projectedBonusPoints} pts
                      </strong>{' '}
                      streak bonus!
                    </>
                  )}
                </>
              ) : (
                <>
                  Solve today&apos;s puzzle to start your streak. Chain{' '}
                  <strong className="text-[#1C232B]">2+ consecutive days</strong>{' '}
                  to unlock Daily Score bonuses &amp; the Streak Keeper Seal.
                </>
              )}
            </p>

            {/* Next Streak Reward Progress Bar */}
            <div
              data-testid="daily-streak-progress"
              className="mt-3.5 border-t border-[#ECE4D4] pt-3"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-semibold text-[#1C232B]">
                  {streakRewards.nextMilestone
                    ? `Next: ${streakRewards.nextMilestone.title} (${streakRewards.nextMilestone.days}d)`
                    : 'Top Tier: Weekly Crown Active'}
                </span>
                <span className="shrink-0 font-mono font-semibold text-[#B45309] tabular-nums">
                  {streakRewards.nextMilestone
                    ? `${streakRewards.daysToNextMilestone}d left · +${streakRewards.nextMilestone.bonusPoints} pts`
                    : '+75 pts / day'}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#ECE7DD]">
                <div
                  className="h-full rounded-full bg-[#B45309] transition-all duration-300"
                  style={{ width: `${streakRewards.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: 7-Day Archival Stamp Strip + Consecutive Reward Tiers */}
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#1C232B]">
                  <Calendar
                    className="h-3.5 w-3.5 text-[#B45309]"
                    aria-hidden="true"
                  />
                  7-Day Archival Stamp Strip
                </span>
                <span className="font-mono text-[#5A6572] tabular-nums">
                  {streakStats.totalSolved} total solved · Best streak{' '}
                  <strong className="text-[#1C232B]">
                    {streakStats.bestStreak}d
                  </strong>
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-7 gap-2">
                {streakStats.last7Days.map((slot) => (
                  <div
                    key={slot.dateKey}
                    className={`flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition-colors ${
                      slot.solved
                        ? 'border-[#047857]/40 bg-[#ECFDF5] text-[#047857]'
                        : slot.isToday
                          ? 'border-[#B45309]/50 bg-[#FFFBEB] text-[#1C232B]'
                          : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#7A8490]'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      {slot.shortDay}
                    </span>
                    <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                      {slot.dayNumber}
                    </span>
                    <span className="mt-1 flex h-4 w-4 items-center justify-center">
                      {slot.solved ? (
                        <Check
                          className="h-3.5 w-3.5 text-[#047857]"
                          aria-hidden="true"
                        />
                      ) : slot.isToday ? (
                        <Sparkles
                          className="h-3.5 w-3.5 text-[#B45309]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-[10px] font-mono">·</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consecutive Streak Reward Ladder */}
            <div
              data-testid="daily-streak-rewards-ladder"
              className="mt-3.5 border-t border-[#ECE7DD] pt-3"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#1C232B]">
                  <Trophy
                    className="h-3.5 w-3.5 text-[#047857]"
                    aria-hidden="true"
                  />
                  Consecutive Streak Rewards
                </span>
                <span className="font-mono text-[#5A6572]">
                  {streakRewards.currentBonusPoints > 0
                    ? `Active Bonus: +${streakRewards.currentBonusPoints} pts`
                    : 'Unlocks at 2-day streak'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DAILY_STREAK_MILESTONES.map((milestone) => {
                  const unlocked = streakStats.currentStreak >= milestone.days;
                  const nextUp =
                    !unlocked &&
                    streakRewards.nextMilestone?.days === milestone.days;
                  return (
                    <div
                      key={milestone.days}
                      className={`rounded-lg border px-2.5 py-2 transition-colors ${
                        unlocked
                          ? 'border-[#047857]/40 bg-[#ECFDF5]'
                          : nextUp
                            ? 'border-[#DFC99B] bg-[#FFFBEB]'
                            : 'border-[#E5E0D5] bg-[#FAF8F4]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono text-[10px] font-semibold">
                        <span
                          className={
                            unlocked
                              ? 'text-[#047857]'
                              : nextUp
                                ? 'text-[#B45309]'
                                : 'text-[#5A6572]'
                          }
                        >
                          {milestone.days}d
                        </span>
                        <span
                          className={
                            unlocked
                              ? 'text-[#047857]'
                              : 'text-[#1C232B]'
                          }
                        >
                          +{milestone.bonusPoints} pts
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-[#1C232B]">
                        {milestone.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
