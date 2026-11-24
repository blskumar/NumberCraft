import { useKeypadKeyboard } from './useKeypadKeyboard';
import { ArenaBaseProps, ArenaPhase } from './arena-shared';
import { computeHistoricalCalibration, createAdaptiveSession, stepAdaptiveSession, type AdaptiveSessionState } from '@/lib/adaptive-arithmetic';
import { ARITHMETIC_GAMES, ARITHMETIC_PACES, MULTIPLICATION_STAGES_BY_TIER, buildArithmeticMatchRecord, calculateAnswerPoints, generateArithmeticProblem, getParTargetScore, type ArithmeticAnswerEntry, type ArithmeticProblem, type ArithmeticRoundConfig, type MultiplicationTableFocus } from '@/lib/arithmetic-engine';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { getArithmeticSoundCue, playArithmeticFeedbackSound, playVictoryChord } from '@/lib/sound';
import { type ArithmeticGameId, type ArithmeticPace, type MatchRecord } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ArithmeticArenaProps extends ArenaBaseProps {
  initialGameId: ArithmeticGameId;
  onRecordMatch: (record: MatchRecord) => void;
  matches: MatchRecord[];
  isGameLockedForGuest?: (gameId: ArithmeticGameId) => boolean;
  onRequireRegistration?: (gameId: ArithmeticGameId) => void;
}

export function useArithmeticArena(props: ArithmeticArenaProps) {
  const {
    initialGameId, ageTier, onChangeTier, playerName, soundEnabled,
    onToggleSound, onBackToStudio, onOpenNotebook, onRecordMatch, matches,
    isGameLockedForGuest, onRequireRegistration,
  } = props;
  const [gameId, setGameId] = useState<ArithmeticGameId>(initialGameId);
  const [pace, setPace] = useState<ArithmeticPace>('standard');
  const [untimed, setUntimed] = useState(false);
  const [startStage, setStartStage] = useState<number>(1);
  const [tableFocus, setTableFocus] =
    useState<MultiplicationTableFocus>('progressive');
  const [allowSignedStrategistSub, setAllowSignedStrategistSub] =
    useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveSessionState>(() =>
    createAdaptiveSession(2)
  );

  const [phase, setPhase] = useState<ArenaPhase>('setup');
  const [problem, setProblem] = useState<ArithmeticProblem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);

  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [maxStageReached, setMaxStageReached] = useState(1);
  const [history, setHistory] = useState<ArithmeticAnswerEntry[]>([]);
  const [feedback, setFeedback] = useState<{
    kind: 'correct' | 'wrong';
    text: string;
  } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number>(
    ARITHMETIC_PACES.standard.seconds
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Refs for deterministic round finalization (avoids StrictMode races)
  const finalizedRef = useRef(false);
  const problemStartedAtRef = useRef<number>(0);
  const statsRef = useRef({
    score: 0,
    solved: 0,
    attempted: 0,
    bestStreak: 0,
    elapsedSeconds: 0,
    maxStageReached: 1,
    adaptiveEnabled: true,
    startAdaptiveLevel: 2,
    endAdaptiveLevel: 2,
    peakAdaptiveLevel: 2,
  });

  const activeSpec = ARITHMETIC_GAMES[gameId];
  const tierSpec = TIER_SPECS[ageTier];
  const multiplicationStages = MULTIPLICATION_STAGES_BY_TIER[ageTier];

  const calibration = useMemo(
    () => computeHistoricalCalibration(matches, gameId, ageTier),
    [matches, gameId, ageTier]
  );

  const roundConfig = useMemo<ArithmeticRoundConfig>(
    () => ({
      gameId,
      tier: ageTier,
      pace, untimed, startStage, tableFocus,
      allowSignedStrategistSub:
        gameId === 'subtraction-sprint' &&
        ageTier === 'strategists' &&
        allowSignedStrategistSub,
      adaptiveDifficulty,
      adaptiveLevel: adaptiveDifficulty ? adaptiveState.level : undefined,
    }),
    [
      gameId, ageTier, pace, untimed, startStage, tableFocus,
      allowSignedStrategistSub, adaptiveDifficulty,
      adaptiveState.level,
    ]
  );

  const parTarget = useMemo(
    () => getParTargetScore(gameId, ageTier, pace, untimed),
    [gameId, ageTier, pace, untimed]
  );

  const finalizeRound = useCallback(
    (overrideElapsed?: number) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const snap = statsRef.current;
      const finalElapsed = Math.max(1, overrideElapsed ?? snap.elapsedSeconds);
      if (snap.attempted > 0) {
        const record = buildArithmeticMatchRecord({
          config: roundConfig,
          score: snap.score,
          solved: snap.solved,
          attempted: snap.attempted,
          bestStreak: snap.bestStreak,
          elapsedSeconds: finalElapsed,
          maxStageReached: snap.maxStageReached,
          adaptiveEnabled: snap.adaptiveEnabled,
          startAdaptiveLevel: snap.adaptiveEnabled
            ? snap.startAdaptiveLevel
            : undefined,
          endAdaptiveLevel: snap.adaptiveEnabled
            ? snap.endAdaptiveLevel
            : undefined,
          peakAdaptiveLevel: snap.adaptiveEnabled
            ? snap.peakAdaptiveLevel
            : undefined,
        });
        onRecordMatch(record);
        if (record.result === 'win') {
          playVictoryChord(soundEnabled);
        }
      }
      setPhase('summary');
    },
    [onRecordMatch, roundConfig, soundEnabled]
  );

  const startRound = useCallback(
    (overrideGameId?: ArithmeticGameId) => {
      const targetGame = overrideGameId ?? gameId;
      if (isGameLockedForGuest?.(targetGame)) {
        onRequireRegistration?.(targetGame);
        return;
      }
      const startCal = computeHistoricalCalibration(
        matches,
        targetGame,
        ageTier
      );
      const initialAdaptive = createAdaptiveSession(startCal.startingLevel);
      const config: ArithmeticRoundConfig = {
        ...roundConfig,
        gameId: targetGame,
        adaptiveDifficulty,
        adaptiveLevel: adaptiveDifficulty ? initialAdaptive.level : undefined,
      };
      const firstProblem = generateArithmeticProblem(config, 0);
      const initialSeconds = ARITHMETIC_PACES[pace].seconds;

      finalizedRef.current = false;
      problemStartedAtRef.current = Date.now();
      statsRef.current = {
        score: 0,
        solved: 0,
        attempted: 0,
        bestStreak: 0,
        elapsedSeconds: 0,
        maxStageReached: firstProblem.stage,
        adaptiveEnabled: adaptiveDifficulty,
        startAdaptiveLevel: initialAdaptive.startLevel,
        endAdaptiveLevel: initialAdaptive.level,
        peakAdaptiveLevel: initialAdaptive.peakLevel,
      };

      setGameId(targetGame);
      setAdaptiveState(initialAdaptive);
      setProblem(firstProblem);
      setInputValue('');
      setShowHint(false);
      setScore(0);
      setSolved(0);
      setAttempted(0);
      setStreak(0);
      setBestStreak(0);
      setMaxStageReached(firstProblem.stage);
      setHistory([]);
      setFeedback(null);
      setSecondsLeft(initialSeconds);
      setElapsedSeconds(0);
      setPhase('playing');
    },
    [
      gameId, matches, ageTier, roundConfig, adaptiveDifficulty, pace,
      isGameLockedForGuest, onRequireRegistration,
    ]
  );

  // Countdown / Elapsed timer during active play
  useEffect(() => {
    if (phase !== 'playing') return;
    const totalSeconds = ARITHMETIC_PACES[pace].seconds;
    const interval = window.setInterval(() => {
      const nextElapsed = statsRef.current.elapsedSeconds + 1;
      statsRef.current.elapsedSeconds = nextElapsed;
      setElapsedSeconds(nextElapsed);

      if (!untimed) {
        const nextRemaining = Math.max(0, totalSeconds - nextElapsed);
        setSecondsLeft(nextRemaining);
        if (nextRemaining <= 0) {
          window.clearInterval(interval);
          finalizeRound(totalSeconds);
        }
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, untimed, pace, finalizeRound]);

  const submitAnswer = useCallback(
    (rawInput: string) => {
      if (phase !== 'playing' || !problem) return;
      const trimmed = rawInput.trim();
      if (!trimmed || trimmed === '-') return;
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return;

      const isCorrect = numeric === problem.answer;
      const now = Date.now();
      const responseMs =
        problemStartedAtRef.current > 0
          ? Math.max(250, now - problemStartedAtRef.current)
          : 3000;
      problemStartedAtRef.current = now;

      const nextAttempted = attempted + 1;
      const nextSolved = isCorrect ? solved + 1 : solved;
      const nextStreak = isCorrect ? streak + 1 : 0;
      const nextBestStreak = Math.max(bestStreak, nextStreak);
      const points = calculateAnswerPoints(isCorrect, nextStreak, problem.stage);
      const nextScore = score + points;

      let nextAdaptive = adaptiveState;
      let nextConfig = roundConfig;
      let autoOpenHint = false;

      if (adaptiveDifficulty) {
        nextAdaptive = stepAdaptiveSession(
          adaptiveState,
          isCorrect,
          responseMs
        );
        nextConfig = {
          ...roundConfig,
          adaptiveDifficulty: true,
          adaptiveLevel: nextAdaptive.level,
        };
        autoOpenHint = nextAdaptive.suggestHint;
      }

      const nextProblem = generateArithmeticProblem(
        nextConfig,
        nextSolved,
        `${problem.left}${problem.operator}${problem.right}`
      );
      const nextMaxStage = Math.max(maxStageReached, nextProblem.stage);

      statsRef.current = {
        ...statsRef.current,
        score: nextScore,
        solved: nextSolved,
        attempted: nextAttempted,
        bestStreak: nextBestStreak,
        maxStageReached: nextMaxStage,
        adaptiveEnabled: adaptiveDifficulty,
        endAdaptiveLevel: nextAdaptive.level,
        peakAdaptiveLevel: nextAdaptive.peakLevel,
      };

      const entry: ArithmeticAnswerEntry = {
        problem,
        submitted: numeric,
        correct: isCorrect,
        pointsEarned: points,
      };

      const leveledUp =
        (adaptiveDifficulty && nextAdaptive.level > adaptiveState.level) ||
        nextMaxStage > maxStageReached;
      playArithmeticFeedbackSound(
        soundEnabled,
        getArithmeticSoundCue({ isCorrect, nextStreak, leveledUp })
      );

      if (adaptiveDifficulty) {
        setAdaptiveState(nextAdaptive);
      }
      setScore(nextScore);
      setSolved(nextSolved);
      setAttempted(nextAttempted);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setMaxStageReached(nextMaxStage);
      setHistory((prev) => [entry, ...prev].slice(0, 40));
      setFeedback(
        isCorrect
          ? {
              kind: 'correct',
              text:
                nextStreak >= 3
                  ? `Correct! +${points} pts (${nextStreak}× streak)`
                  : `Correct! +${points} pts`,
            }
          : {
              kind: 'wrong',
              text: `${problem.left} ${problem.operator} ${problem.right} = ${problem.answer}`,
            }
      );

      setProblem(nextProblem);
      setInputValue('');
      setShowHint(autoOpenHint);
    },
    [
      phase, problem, attempted, solved, streak, bestStreak, score,
      adaptiveDifficulty, adaptiveState, roundConfig, maxStageReached,
      soundEnabled,
    ]
  );

  const handleDigitAppend = useCallback(
    (digit: string) => {
      if (phase !== 'playing' || !problem) return;
      if (digit === '-') {
        if (!problem.allowNegative) return;
        setInputValue((prev) =>
          prev.startsWith('-') ? prev.slice(1) : `-${prev}`
        );
        return;
      }
      if (inputValue.replace('-', '').length >= 5) return;
      const next = inputValue === '0' ? digit : `${inputValue}${digit}`;
      if (autoSubmit && Number(next) === problem.answer) {
        submitAnswer(next);
        return;
      }
      setInputValue(next);
    },
    [phase, problem, inputValue, autoSubmit, submitAnswer]
  );

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  useKeypadKeyboard(phase === 'playing', {
    onDigit: handleDigitAppend,
    onMinus: () => handleDigitAppend('-'),
    onBackspace: handleBackspace,
    onClear: () => setInputValue(''),
    onSubmit: () => submitAnswer(inputValue),
    onHint: () => setShowHint((prev) => !prev),
  });

  const accuracyPercent =
    attempted > 0 ? Math.round((solved / attempted) * 100) : 100;
  const pacePerMinute =
    elapsedSeconds >= 3
      ? Math.round((solved / elapsedSeconds) * 60)
      : solved * 12;
  const missedEntries = useMemo(
    () => history.filter((item) => !item.correct),
    [history]
  );

  return {
    ...props,
    accuracyPercent, activeSpec, adaptiveDifficulty, adaptiveState,
    allowSignedStrategistSub, attempted, autoSubmit, bestStreak, calibration,
    elapsedSeconds, feedback, finalizeRound, gameId, handleBackspace,
    handleDigitAppend, history, inputValue, maxStageReached, missedEntries,
    multiplicationStages, pace, pacePerMinute, parTarget, phase, problem, score,
    secondsLeft, setAdaptiveDifficulty, setAllowSignedStrategistSub,
    setAutoSubmit, setGameId, setInputValue, setPace, setPhase, setShowHint,
    setStartStage, setTableFocus, setUntimed, showHint, solved, startRound,
    startStage, streak, submitAnswer, tableFocus, tierSpec, untimed,
  };
}

export type ArithmeticCtx = ReturnType<typeof useArithmeticArena>;
