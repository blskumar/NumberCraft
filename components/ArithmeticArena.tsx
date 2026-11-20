'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Clock,
  Delete,
  Flame,
  Lightbulb,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  ADAPTIVE_BANDS,
  computeHistoricalCalibration,
  createAdaptiveSession,
  stepAdaptiveSession,
  type AdaptiveLevel,
  type AdaptiveSessionState,
} from '@/lib/adaptive-arithmetic';
import {
  ARITHMETIC_GAME_ORDER,
  ARITHMETIC_GAMES,
  ARITHMETIC_PACES,
  buildArithmeticMatchRecord,
  calculateAnswerPoints,
  CORRECT_ANSWERS_PER_STAGE,
  generateArithmeticProblem,
  getParTargetScore,
  MULTIPLICATION_STAGES_BY_TIER,
  TABLE_FOCUS_OPTIONS,
  type ArithmeticAnswerEntry,
  type ArithmeticProblem,
  type ArithmeticRoundConfig,
  type MultiplicationTableFocus,
} from '@/lib/arithmetic-engine';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import {
  getArithmeticSoundCue,
  playArithmeticFeedbackSound,
  playVictoryChord,
} from '@/lib/sound';
import type {
  AgeTier,
  ArithmeticGameId,
  ArithmeticPace,
  MatchRecord,
} from '@/lib/types';

interface ArithmeticArenaProps {
  initialGameId: ArithmeticGameId;
  ageTier: AgeTier;
  onChangeTier: (tier: AgeTier) => void;
  playerName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBackToStudio: () => void;
  onOpenNotebook: () => void;
  onRecordMatch: (record: MatchRecord) => void;
  matches: MatchRecord[];
  isGameLockedForGuest?: (gameId: ArithmeticGameId) => boolean;
  onRequireRegistration?: (gameId: ArithmeticGameId) => void;
}

const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];
const PACE_ORDER: ArithmeticPace[] = ['relaxed', 'standard', 'blitz'];

type ArenaPhase = 'setup' | 'playing' | 'summary';

export default function ArithmeticArena({
  initialGameId,
  ageTier,
  onChangeTier,
  playerName,
  soundEnabled,
  onToggleSound,
  onBackToStudio,
  onOpenNotebook,
  onRecordMatch,
  matches,
  isGameLockedForGuest,
  onRequireRegistration,
}: ArithmeticArenaProps) {
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
      pace,
      untimed,
      startStage,
      tableFocus,
      allowSignedStrategistSub:
        gameId === 'subtraction-sprint' &&
        ageTier === 'strategists' &&
        allowSignedStrategistSub,
      adaptiveDifficulty,
      adaptiveLevel: adaptiveDifficulty ? adaptiveState.level : undefined,
    }),
    [
      gameId,
      ageTier,
      pace,
      untimed,
      startStage,
      tableFocus,
      allowSignedStrategistSub,
      adaptiveDifficulty,
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
      gameId,
      matches,
      ageTier,
      roundConfig,
      adaptiveDifficulty,
      pace,
      isGameLockedForGuest,
      onRequireRegistration,
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
      phase,
      problem,
      attempted,
      solved,
      streak,
      bestStreak,
      score,
      adaptiveDifficulty,
      adaptiveState,
      roundConfig,
      maxStageReached,
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

  // Global keyboard handler while playing
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
      } else if (e.key === '-') {
        e.preventDefault();
        handleDigitAppend('-');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer(inputValue);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHint((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleDigitAppend, handleBackspace, submitAnswer, inputValue]);

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

  return (
    <main className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8">
      {/* Arena Header & Game Switcher */}
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
            <p className="text-[11px] font-medium text-[#5A6572]">
              Set 01 · Core Arithmetic · {tierSpec.label} ({tierSpec.ageRange})
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              {activeSpec.title}
            </h1>
          </div>
        </div>

        {/* Clean Segmented Switcher Across the 3 Arithmetic Games */}
        <div
          role="group"
          aria-label="Choose arithmetic game"
          className="flex min-w-0 max-w-full flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
        >
          {ARITHMETIC_GAME_ORDER.map((id) => {
            const spec = ARITHMETIC_GAMES[id];
            const active = id === gameId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setGameId(id);
                  setPhase('setup');
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#1C232B] shadow-[0_1px_3px_rgba(28,35,43,0.12)]'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                <span className="mr-1 font-mono">{spec.operatorSymbol}</span>
                {spec.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* PHASE 1: SETUP */}
      {phase === 'setup' && (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="card-tactile rounded-2xl p-6 sm:p-7 lg:col-span-7">
            <p
              className="text-xs font-semibold"
              style={{ color: activeSpec.accentHex }}
            >
              {activeSpec.shortTag} · Adjustable Difficulty
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C232B]">
              Configure Your Session
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
              {activeSpec.description}
            </p>

            {/* Difficulty Level (Adaptive Age Tier) */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-[#1C232B]">
                1. Difficulty Level (Age Tier)
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
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
                      <p className="mt-1.5 text-[11px] leading-snug text-[#46515E]">
                        {activeSpec.tierSummaries[t]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer / Pace Controls */}
            <div className="mt-6 border-t border-[#ECE7DD] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#1C232B]">
                  2. Round Timer &amp; Pace
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#46515E]">
                  <input
                    type="checkbox"
                    checked={untimed}
                    onChange={(e) => setUntimed(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#1D4ED8]"
                  />
                  Untimed Practice Mode
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {PACE_ORDER.map((p) => {
                  const spec = ARITHMETIC_PACES[p];
                  const selected = !untimed && pace === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={untimed}
                      aria-pressed={selected}
                      onClick={() => setPace(p)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        untimed
                          ? 'cursor-not-allowed border-[#ECE7DD] bg-[#F7F4ED] text-[#9AA3AD]'
                          : selected
                            ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1C232B]'
                            : 'border-[#E0D9CA] bg-[#FAF8F4] text-[#46515E] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <p className="font-mono text-xs font-semibold">
                        {spec.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6572]">
                        {spec.note}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adaptive Difficulty Engine Card */}
            <div className="mt-6 border-t border-[#ECE7DD] pt-5">
              <div className="rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <SlidersHorizontal
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1C232B]">
                        Adaptive Difficulty Engine
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6572]">
                        Adjusts operand complexity live from your recent history
                        and in-round streak—stepping up when you&apos;re in flow
                        and easing gently with hints if a problem trips you up.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-xs font-semibold text-[#1C232B]">
                    <input
                      type="checkbox"
                      data-testid="adaptive-difficulty-toggle"
                      checked={adaptiveDifficulty}
                      onChange={(e) => setAdaptiveDifficulty(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D8D1C4] accent-[#1D4ED8]"
                    />
                    {adaptiveDifficulty ? 'Active' : 'Off'}
                  </label>
                </div>

                {adaptiveDifficulty && (
                  <div className="mt-3.5 border-t border-[#E8E2D6] pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-[#1C232B]">
                        Calibrated Start:{' '}
                        <span
                          data-testid="adaptive-calibrated-start"
                          className="font-mono text-[#1D4ED8]"
                        >
                          {ADAPTIVE_BANDS[calibration.startingLevel].label}
                        </span>
                      </span>
                      <span className="font-mono text-[#5A6572] tabular-nums">
                        {calibration.recentRoundsAnalyzed > 0
                          ? `Based on ${calibration.recentRoundsAnalyzed} recent ${calibration.recentRoundsAnalyzed === 1 ? 'round' : 'rounds'}`
                          : 'New baseline'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {([1, 2, 3, 4, 5] as AdaptiveLevel[]).map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 rounded-full transition-colors ${
                            lvl <= calibration.startingLevel
                              ? 'bg-[#1D4ED8]'
                              : 'bg-[#E3DDD0]'
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      data-testid="adaptive-calibration-rationale"
                      className="mt-2 text-[11px] leading-snug text-[#46515E]"
                    >
                      {calibration.rationale}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Game-Specific Adjustable Options */}
            {gameId === 'multiplication-mastery' && (
              <div className="mt-6 border-t border-[#ECE7DD] pt-5 space-y-4">
                <div>
                  <label
                    htmlFor="table-focus-select"
                    className="block text-xs font-semibold text-[#1C232B]"
                  >
                    3. Multiplication Table Progression
                  </label>
                  <select
                    id="table-focus-select"
                    value={tableFocus}
                    onChange={(e) =>
                      setTableFocus(e.target.value as MultiplicationTableFocus)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-medium text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                  >
                    {TABLE_FOCUS_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} — {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {tableFocus === 'progressive' &&
                  (adaptiveDifficulty ? (
                    <p className="rounded-lg border border-[#E8DEC8] bg-[#FDF9EF] px-3 py-2 text-[11px] text-[#6B4209]">
                      Adaptive Difficulty will begin at{' '}
                      <strong className="font-mono">
                        Stage {calibration.startingLevel}
                      </strong>{' '}
                      and automatically climb or ease across all 5 table stages
                      based on your accuracy and pace. Uncheck Adaptive
                      Difficulty above to choose a fixed starting stage.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[#1C232B]">
                        Starting Stage (levels up every{' '}
                        {CORRECT_ANSWERS_PER_STAGE} correct answers)
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
                        {multiplicationStages.map((st) => {
                          const selected = startStage === st.stage;
                          return (
                            <button
                              key={st.stage}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setStartStage(st.stage)}
                              className={`rounded-lg border p-2 text-left transition-all ${
                                selected
                                  ? 'border-[#B45309] bg-[#FDF6E7] text-[#1C232B]'
                                  : 'border-[#E0D9CA] bg-[#FAF8F4] text-[#5A6572] hover:border-[#B45309]/50'
                              }`}
                            >
                              <p className="font-mono text-[11px] font-semibold text-[#B45309]">
                                Stage {st.stage}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-[#1C232B] leading-tight">
                                {st.name}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-[#5A6572]">
                                {st.rangeLabel}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {gameId === 'subtraction-sprint' && ageTier === 'strategists' && (
              <div className="mt-5 border-t border-[#ECE7DD] pt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#1C232B]">
                  <input
                    type="checkbox"
                    checked={allowSignedStrategistSub}
                    onChange={(e) =>
                      setAllowSignedStrategistSub(e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#047857]"
                  />
                  Include signed negative differences (e.g., 42 − 67 = −25)
                </label>
              </div>
            )}

            <div className="mt-5 border-t border-[#ECE7DD] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#46515E]">
                <input
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={(e) => setAutoSubmit(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#1D4ED8]"
                />
                Fast Mode: auto-submit immediately when digits match the answer
              </label>
            </div>
          </div>

          {/* Right Launch Summary Card */}
          <div className="card-tactile flex flex-col justify-between rounded-2xl p-6 sm:p-7 lg:col-span-5">
            <div>
              <p className="text-xs font-medium text-[#5A6572]">
                Ready on Desk · {playerName}
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-[#1C232B]">
                Session Blueprint
              </h3>

              <dl className="mt-5 space-y-3 border-y border-[#ECE7DD] py-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Game Mode</dt>
                  <dd className="font-semibold text-[#1C232B]">
                    {activeSpec.title}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Difficulty Tier</dt>
                  <dd className="font-semibold text-[#1C232B]">
                    {tierSpec.label} ({tierSpec.ageRange})
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Clock</dt>
                  <dd className="font-mono font-semibold text-[#1C232B] tabular-nums">
                    {untimed ? 'Untimed Practice' : ARITHMETIC_PACES[pace].label}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Complexity Engine</dt>
                  <dd className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                    {adaptiveDifficulty
                      ? `Adaptive · ${ADAPTIVE_BANDS[calibration.startingLevel].shortLabel}`
                      : 'Fixed Tier Pace'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Mastery Par Target</dt>
                  <dd className="font-mono font-semibold text-[#047857] tabular-nums">
                    {parTarget} pts
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4 text-xs leading-relaxed text-[#46515E]">
                <p className="font-semibold text-[#1C232B]">
                  Controls &amp; Mental Math Support
                </p>
                <p className="mt-1">
                  Type directly on your keyboard (<span className="font-mono">0–9</span>,{' '}
                  <span className="font-mono">Enter</span>) or tap the tactile
                  ceramic keypad. Press <span className="font-mono">H</span> at
                  any time for a step-by-step mental math decomposition hint.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                data-testid="start-arithmetic-btn"
                onClick={() => startRound()}
                className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Start {activeSpec.title}
              </button>
              <button
                type="button"
                data-testid="arithmetic-setup-sound-toggle"
                aria-pressed={soundEnabled}
                onClick={onToggleSound}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1C232B]"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                    Audio Feedback On (Global)
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    Audio Feedback Muted (Global)
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PHASE 2: ACTIVE PLAY */}
      {phase === 'playing' && problem && (
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
      )}

      {/* PHASE 3: ROUND SUMMARY */}
      {phase === 'summary' && (
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
      )}
    </main>
  );
}
