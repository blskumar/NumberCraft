import { useKeypadKeyboard } from './useKeypadKeyboard';
import { DAILY_BADGE_IDS, DailyPhase } from './daily-constants';
import { type AchievementDefinition, type AchievementEvaluation } from '@/lib/achievements';
import { buildDailyShareSummary, calculateDailyScore, computeDailyStreakStats, formatCountdownClock, generateDailyPuzzle, getLocalDateKey, getSecondsUntilNextDaily, getStreakBonusPoints, getStreakRewardSummary } from '@/lib/daily-challenge';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { playTileClaimSound, playVictoryChord } from '@/lib/sound';
import { type AgeTier, type DailyChallengeCompletion } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface DailyChallengeArenaProps {
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

export function useDailyChallengeArena(props: DailyChallengeArenaProps) {
  const {
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
  } = props;
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

  useKeypadKeyboard(phase === 'playing', {
    onDigit: handleDigitAppend,
    onBackspace: handleBackspace,
    onClear: () => setInputValue(''),
    onSubmit: () => handleSubmitStep(inputValue),
    onHint: handleRevealHint,
  });

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

  return {
    activeCompletion,
    ageTier,
    copiedSummary,
    countdownText,
    currentStep,
    dailyBadgeStatuses,
    feedback,
    handleBackspace,
    handleCopyShareSummary,
    handleDigitAppend,
    handleRevealHint,
    handleSubmitStep,
    hintsUsed,
    inputValue,
    mistakes,
    newlyUnlockedBadges,
    onBackToStudio,
    onChangeTier,
    onOpenNotebook,
    onToggleSound,
    phase,
    playerName,
    practiceReplay,
    puzzle,
    secondsLeft,
    setInputValue,
    showHint,
    solvedValues,
    soundEnabled,
    startDailyRun,
    stepIdx,
    streakRewards,
    streakStats,
    tierSpec,
    todayKey,
  };
}

export type DailyCtx = ReturnType<typeof useDailyChallengeArena>;
