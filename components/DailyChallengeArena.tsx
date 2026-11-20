'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  Check,
  Clock,
  Copy,
  Delete,
  Flame,
  Lightbulb,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import type {
  AchievementDefinition,
  AchievementEvaluation,
} from '@/lib/achievements';
import {
  buildDailyShareSummary,
  calculateDailyScore,
  computeDailyStreakStats,
  DAILY_STREAK_MILESTONES,
  formatCountdownClock,
  generateDailyPuzzle,
  getLocalDateKey,
  getSecondsUntilNextDaily,
  getStreakBonusPoints,
  getStreakRewardSummary,
} from '@/lib/daily-challenge';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { playTileClaimSound, playVictoryChord } from '@/lib/sound';
import type {
  AgeTier,
  DailyChallengeCompletion,
} from '@/lib/types';

interface DailyChallengeArenaProps {
  ageTier: AgeTier;
  onChangeTier: (tier: AgeTier) => void;
  playerName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  dailyCompletions: DailyChallengeCompletion[];
  achievementEvaluation: AchievementEvaluation;
  onCompleteDaily: (
    completion: DailyChallengeCompletion
  ) => AchievementDefinition[];
  onBackToStudio: () => void;
  onOpenNotebook: () => void;
}

type DailyPhase = 'briefing' | 'playing' | 'completed';

const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];

const DAILY_BADGE_IDS = new Set([
  'daily-pioneer',
  'daily-lightning',
  'daily-flawless',
  'daily-streak-3',
]);

export default function DailyChallengeArena({
  ageTier,
  onChangeTier,
  playerName,
  soundEnabled,
  onToggleSound,
  dailyCompletions,
  achievementEvaluation,
  onCompleteDaily,
  onBackToStudio,
  onOpenNotebook,
}: DailyChallengeArenaProps) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const existingToday = useMemo(
    () => dailyCompletions.find((c) => c.dateKey === todayKey) ?? null,
    [dailyCompletions, todayKey]
  );

  // If the student already completed today's official puzzle, keep the tier it was solved on for breakdown
  const displayTier = existingToday ? existingToday.tier : ageTier;
  const puzzle = useMemo(
    () => generateDailyPuzzle(todayKey, displayTier),
    [todayKey, displayTier]
  );
  const streakStats = useMemo(
    () => computeDailyStreakStats(dailyCompletions, todayKey),
    [dailyCompletions, todayKey]
  );
  const streakRewards = useMemo(
    () =>
      getStreakRewardSummary(
        streakStats.currentStreak,
        streakStats.solvedToday
      ),
    [streakStats.currentStreak, streakStats.solvedToday]
  );

  const [phase, setPhase] = useState<DailyPhase>(
    existingToday ? 'completed' : 'briefing'
  );
  const [practiceReplay, setPracticeReplay] = useState(false);

  const [stepIdx, setStepIdx] = useState<0 | 1 | 2>(0);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintUsedOnStep, setHintUsedOnStep] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solvedValues, setSolvedValues] = useState<(number | null)[]>([
    null,
    null,
    null,
  ]);
  const [feedback, setFeedback] = useState<{
    kind: 'correct' | 'wrong';
    text: string;
  } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number>(
    puzzle.timeLimitSeconds
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [latestCompletion, setLatestCompletion] =
    useState<DailyChallengeCompletion | null>(existingToday);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<
    AchievementDefinition[]
  >([]);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [countdownText, setCountdownText] = useState('--:--:--');

  const finalizedRef = useRef(false);
  const liveStatsRef = useRef({
    stepsSolved: 0,
    mistakes: 0,
    hintsUsed: 0,
    elapsedSeconds: 0,
  });

  // Live countdown to tomorrow's unique Daily Math Challenge
  useEffect(() => {
    const tick = () =>
      setCountdownText(formatCountdownClock(getSecondsUntilNextDaily()));
    const init = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(init);
      window.clearInterval(id);
    };
  }, []);

  const activeCompletion = latestCompletion ?? existingToday;

  const finalizeDailyAttempt = useCallback(
    (solvedAll: boolean, overrideSecondsUsed?: number, overrideSteps?: number) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;

      const snap = liveStatsRef.current;
      const stepsSolved = overrideSteps ?? snap.stepsSolved;
      const secondsUsed = Math.max(
        1,
        Math.min(
          puzzle.timeLimitSeconds,
          overrideSecondsUsed ?? snap.elapsedSeconds
        )
      );
      const achievedStreak =
        solvedAll && !practiceReplay
          ? streakStats.solvedToday
            ? streakStats.currentStreak
            : streakStats.currentStreak + 1
          : 0;
      const earnedStreakBonus =
        solvedAll && !practiceReplay
          ? getStreakBonusPoints(achievedStreak)
          : 0;

      const score = calculateDailyScore({
        solved: solvedAll,
        stepsSolved,
        secondsUsed,
        timeLimitSeconds: puzzle.timeLimitSeconds,
        mistakes: snap.mistakes,
        hintsUsed: snap.hintsUsed,
        streakDays: achievedStreak,
      });

      const completion: DailyChallengeCompletion = {
        dateKey: puzzle.dateKey,
        editionNumber: puzzle.editionNumber,
        tier: puzzle.tier,
        archetype: puzzle.archetype,
        archetypeTitle: puzzle.archetypeTitle,
        solved: solvedAll,
        stepsSolved,
        secondsUsed,
        timeLimitSeconds: puzzle.timeLimitSeconds,
        mistakes: snap.mistakes,
        hintsUsed: snap.hintsUsed,
        score,
        streakDays: achievedStreak > 0 ? achievedStreak : undefined,
        streakBonus: earnedStreakBonus > 0 ? earnedStreakBonus : undefined,
        completedAt: new Date().toISOString(),
      };

      setLatestCompletion(completion);
      if (solvedAll) {
        playVictoryChord(soundEnabled);
      }

      // Only official first attempt (or upgrading an earlier expired attempt on same day if not already solved) persists & unlocks badges
      if (!practiceReplay) {
        const unlocked = onCompleteDaily(completion);
        setNewlyUnlockedBadges(unlocked);
      } else {
        setNewlyUnlockedBadges([]);
      }

      setPhase('completed');
    },
    [
      onCompleteDaily,
      practiceReplay,
      puzzle,
      soundEnabled,
      streakStats.currentStreak,
      streakStats.solvedToday,
    ]
  );

  const startDailyRun = useCallback(
    (isPractice: boolean) => {
      const freshLimit = generateDailyPuzzle(
        todayKey,
        isPractice ? displayTier : ageTier
      ).timeLimitSeconds;

      finalizedRef.current = false;
      liveStatsRef.current = {
        stepsSolved: 0,
        mistakes: 0,
        hintsUsed: 0,
        elapsedSeconds: 0,
      };
      setPracticeReplay(isPractice);
      setStepIdx(0);
      setInputValue('');
      setShowHint(false);
      setHintUsedOnStep([false, false, false]);
      setMistakes(0);
      setHintsUsed(0);
      setSolvedValues([null, null, null]);
      setFeedback(null);
      setSecondsLeft(freshLimit);
      setElapsedSeconds(0);
      setNewlyUnlockedBadges([]);
      setCopiedSummary(false);
      setPhase('playing');
    },
    [ageTier, displayTier, todayKey]
  );

  // Active challenge countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = window.setInterval(() => {
      const nextElapsed = liveStatsRef.current.elapsedSeconds + 1;
      liveStatsRef.current.elapsedSeconds = nextElapsed;
      setElapsedSeconds(nextElapsed);

      const nextRemaining = Math.max(0, puzzle.timeLimitSeconds - nextElapsed);
      setSecondsLeft(nextRemaining);
      if (nextRemaining <= 0) {
        window.clearInterval(interval);
        finalizeDailyAttempt(false, puzzle.timeLimitSeconds);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase, puzzle.timeLimitSeconds, finalizeDailyAttempt]);

  const currentStep = puzzle.steps[stepIdx];

  const handleRevealHint = useCallback(() => {
    if (phase !== 'playing') return;
    if (!showHint && !hintUsedOnStep[stepIdx]) {
      setHintUsedOnStep((prev) => {
        const copy = [...prev];
        copy[stepIdx] = true;
        return copy;
      });
      const nextHints = liveStatsRef.current.hintsUsed + 1;
      liveStatsRef.current.hintsUsed = nextHints;
      setHintsUsed(nextHints);
    }
    setShowHint((prev) => !prev);
  }, [hintUsedOnStep, phase, showHint, stepIdx]);

  const handleSubmitStep = useCallback(
    (raw: string) => {
      if (phase !== 'playing') return;
      const trimmed = raw.trim();
      if (!trimmed || trimmed === '-') return;
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return;

      if (numeric === currentStep.answer) {
        playTileClaimSound(soundEnabled, stepIdx === 2);
        const nextSolved = [...solvedValues];
        nextSolved[stepIdx] = currentStep.answer;
        setSolvedValues(nextSolved);

        const nextCount = stepIdx + 1;
        liveStatsRef.current.stepsSolved = nextCount;
        setInputValue('');
        setShowHint(false);

        if (stepIdx < 2) {
          setFeedback({
            kind: 'correct',
            text: `${currentStep.variableLabel} = ${currentStep.answer} unlocked! Advancing to Clue ${stepIdx + 2}.`,
          });
          setStepIdx((stepIdx + 1) as 0 | 1 | 2);
        } else {
          setFeedback({
            kind: 'correct',
            text: `Vault unlocked! Code ${currentStep.answer} verified.`,
          });
          finalizeDailyAttempt(
            true,
            Math.max(1, liveStatsRef.current.elapsedSeconds),
            3
          );
        }
      } else {
        const nextMistakes = mistakes + 1;
        liveStatsRef.current.mistakes = nextMistakes;
        setMistakes(nextMistakes);
        setInputValue('');
        setFeedback({
          kind: 'wrong',
          text: `${numeric} doesn't balance ${currentStep.variableLabel}. Try again or press H for a hint.`,
        });
      }
    },
    [
      currentStep,
      finalizeDailyAttempt,
      mistakes,
      phase,
      solvedValues,
      soundEnabled,
      stepIdx,
    ]
  );

  const handleDigitAppend = useCallback(
    (digit: string) => {
      if (phase !== 'playing') return;
      setInputValue((prev) => {
        if (prev.length >= 5) return prev;
        return prev === '0' ? digit : `${prev}${digit}`;
      });
    },
    [phase]
  );

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  // Keyboard support during timed challenge
  useEffect(() => {
    if (phase !== 'playing') return;
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitAppend(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitStep(inputValue);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleRevealHint();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    handleDigitAppend,
    handleBackspace,
    handleSubmitStep,
    inputValue,
    handleRevealHint,
  ]);

  function handleCopyShareSummary() {
    if (!activeCompletion) return;
    const text = buildDailyShareSummary(activeCompletion);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 2500);
  }

  const dailyBadgeStatuses = useMemo(
    () =>
      achievementEvaluation.statuses.filter((s) =>
        DAILY_BADGE_IDS.has(s.definition.id)
      ),
    [achievementEvaluation.statuses]
  );

  const tierSpec = TIER_SPECS[displayTier];

  return (
    <main className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D5] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Games
          </button>
          <div>
            <p className="font-mono text-[11px] font-medium text-[#B45309]">
              Daily Edition #{puzzle.editionNumber} · {puzzle.formattedDate} ·{' '}
              {puzzle.archetypeTitle}
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              Daily Math Challenge
            </h1>
          </div>
        </div>

        {/* Live Retention Countdown & Current Streak Readout */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div
            data-testid="daily-header-streak"
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono tabular-nums ${
              streakStats.currentStreak > 0
                ? 'border-[#DFC99B] bg-[#FFFBEB] text-[#1C232B]'
                : 'border-[#DFD8CA] bg-white text-[#1C232B]'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${
                streakStats.currentStreak > 0
                  ? 'text-[#B45309]'
                  : 'text-[#9AA3AD]'
              }`}
              aria-hidden="true"
            />
            <span className="text-[#5A6572]">Current Streak</span>
            <strong className="font-semibold text-[#1C232B]">
              {streakStats.currentStreak}{' '}
              {streakStats.currentStreak === 1 ? 'day' : 'days'}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[#DFD8CA] bg-[#FAF8F4] px-3 py-1.5 font-mono text-[#5A6572] tabular-nums">
            <Clock className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
            <span>Next puzzle</span>
            <strong className="text-[#1C232B]">{countdownText}</strong>
          </div>
        </div>
      </div>

      {/* Current Streak Counter + Consecutive Rewards & 7-Day Archival Stamp Strip */}
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

      {/* PHASE 1: DAILY BRIEFING */}
      {phase === 'briefing' && (
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
              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
                  const limit = generateDailyPuzzle(todayKey, t).timeLimitSeconds;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeTier(t)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] shadow-[0_2px_0_#C7DAFC]'
                          : 'border-[#E0D9CA] bg-[#FAF8F4] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#1C232B]">
                        {spec.label}
                      </p>
                      <p className="font-mono text-[11px] text-[#5A6572]">
                        {spec.ageRange}
                      </p>
                      <p className="mt-1.5 font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
                        {limit}s Chronometer
                      </p>
                    </button>
                  );
                })}
              </div>
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
      )}

      {/* PHASE 2: TIMED DAILY PUZZLE ARENA */}
      {phase === 'playing' && (
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
      )}

      {/* PHASE 3: DAILY COMPLETION STAMP & SOLUTION BREAKDOWN */}
      {phase === 'completed' && activeCompletion && (
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
      )}
    </main>
  );
}
