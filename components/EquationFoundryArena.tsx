'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Calculator,
  Check,
  Cpu,
  Delete,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  buildFoundryMatchRecord,
  computeAiFoundryScore,
  evaluateFoundryTokens,
  FOUNDRY_OPERATORS_BY_TIER,
  formatFoundryTokens,
  generateFoundryPuzzle,
  scoreFoundrySubmission,
  type FoundryOperator,
  type FoundryPuzzle,
  type FoundryRoundOutcome,
  type FoundryTile,
  type FoundryToken,
} from '@/lib/equation-foundry-engine';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import {
  playArithmeticFeedbackSound,
  playTileClaimSound,
  playVictoryChord,
} from '@/lib/sound';
import type { AchievementDefinition } from '@/lib/achievements';
import type {
  AgeTier,
  AiDifficulty,
  MatchRecord,
  PlayMode,
} from '@/lib/types';

interface EquationFoundryArenaProps {
  ageTier: AgeTier;
  onChangeTier: (tier: AgeTier) => void;
  playerName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBackToStudio: () => void;
  onOpenNotebook: () => void;
  onRecordMatch: (record: MatchRecord) => AchievementDefinition[];
  guestTrialLocked?: boolean;
  onRequireRegistration?: () => void;
}

const TOTAL_ROUNDS = 5;
const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];
const DIFFICULTIES: { id: AiDifficulty; label: string; desc: string }[] = [
  { id: 'apprentice', label: 'Apprentice', desc: 'Aims within ±3 of target' },
  { id: 'scholar', label: 'Scholar', desc: 'Solves most targets exactly' },
  { id: 'master', label: 'Master', desc: 'Optimal solver every round' },
];

export default function EquationFoundryArena({
  ageTier,
  onChangeTier,
  playerName,
  soundEnabled,
  onToggleSound,
  onBackToStudio,
  onOpenNotebook,
  onRecordMatch,
  guestTrialLocked = false,
  onRequireRegistration,
}: EquationFoundryArenaProps) {
  const prefersReducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [mode, setMode] = useState<PlayMode>('vs-ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('scholar');
  const [sessionSeed, setSessionSeed] = useState(1);

  const [roundNumber, setRoundNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<FoundryPuzzle>(() =>
    generateFoundryPuzzle(ageTier, 1, 1)
  );
  const [tokens, setTokens] = useState<FoundryToken[]>([]);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [stepsRevealed, setStepsRevealed] = useState(false);
  const [roundRevealed, setRoundRevealed] = useState<FoundryRoundOutcome | null>(
    null
  );
  const [history, setHistory] = useState<FoundryRoundOutcome[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [aiTotal, setAiTotal] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<AchievementDefinition[]>(
    []
  );

  const activeTierSpec = TIER_SPECS[ageTier];
  const evaluation = useMemo(() => evaluateFoundryTokens(tokens), [tokens]);
  const usedTileSet = useMemo(
    () => new Set(evaluation.usedTileIds),
    [evaluation.usedTileIds]
  );

  const exactMatchNow =
    evaluation.valid &&
    evaluation.value !== null &&
    Math.abs(evaluation.value - puzzle.target) < 1e-6;

  const currentDelta =
    evaluation.valid && evaluation.value !== null
      ? Math.round((evaluation.value - puzzle.target) * 100) / 100
      : null;

  const startSession = useCallback(
    (nextTier: AgeTier = ageTier) => {
      if (guestTrialLocked) {
        onRequireRegistration?.();
        return;
      }
      const nextSeed = sessionSeed + 1;
      const firstPuzzle = generateFoundryPuzzle(nextTier, 1, nextSeed);
      setSessionSeed(nextSeed);
      setRoundNumber(1);
      setPuzzle(firstPuzzle);
      setTokens([]);
      setHintRevealed(false);
      setStepsRevealed(false);
      setRoundRevealed(null);
      setHistory([]);
      setPlayerTotal(0);
      setAiTotal(0);
      setUnlockedBadges([]);
      setPhase('playing');
      playTileClaimSound(soundEnabled, true);
    },
    [
      ageTier,
      guestTrialLocked,
      onRequireRegistration,
      sessionSeed,
      soundEnabled,
    ]
  );

  const handleSelectTile = useCallback(
    (tile: FoundryTile) => {
      if (roundRevealed || usedTileSet.has(tile.id)) return;
      setTokens((prev) => {
        const last = prev[prev.length - 1];
        // Prevent placing two adjacent numbers without an operator
        if (last && (last.kind === 'tile' || (last.kind === 'op' && (last.op === ')' || last.op === '²')))) {
          return prev;
        }
        playTileClaimSound(soundEnabled, false);
        return [...prev, { kind: 'tile', tileId: tile.id, value: tile.value }];
      });
    },
    [roundRevealed, usedTileSet, soundEnabled]
  );

  const handleSelectOperator = useCallback(
    (op: FoundryOperator) => {
      if (roundRevealed) return;
      setTokens((prev) => {
        const last = prev[prev.length - 1];
        if (op === '(') {
          // '(' allowed at start or after binary operator or '('
          if (
            last &&
            (last.kind === 'tile' ||
              (last.kind === 'op' && (last.op === ')' || last.op === '²')))
          ) {
            return prev;
          }
          playTileClaimSound(soundEnabled, false);
          return [...prev, { kind: 'op', op }];
        }
        if (op === ')' || op === '²') {
          if (
            !last ||
            (last.kind === 'op' && last.op !== ')' && last.op !== '²')
          ) {
            return prev;
          }
          playTileClaimSound(soundEnabled, false);
          return [...prev, { kind: 'op', op }];
        }
        // Binary operators +, −, ×, ÷
        if (!last) return prev;
        if (
          last.kind === 'op' &&
          (last.op === '+' ||
            last.op === '−' ||
            last.op === '×' ||
            last.op === '÷')
        ) {
          // Swap last binary operator smoothly
          playTileClaimSound(soundEnabled, false);
          return [...prev.slice(0, -1), { kind: 'op', op }];
        }
        if (last.kind === 'op' && last.op === '(') return prev;
        playTileClaimSound(soundEnabled, false);
        return [...prev, { kind: 'op', op }];
      });
    },
    [roundRevealed, soundEnabled]
  );

  const handleRemoveTokenAt = useCallback(
    (index: number) => {
      if (roundRevealed) return;
      setTokens((prev) => prev.filter((_, idx) => idx !== index));
    },
    [roundRevealed]
  );

  const handleBackspace = useCallback(() => {
    if (roundRevealed) return;
    setTokens((prev) => prev.slice(0, -1));
  }, [roundRevealed]);

  const handleClearBench = useCallback(() => {
    if (roundRevealed) return;
    setTokens([]);
  }, [roundRevealed]);

  const handleSubmitRound = useCallback(() => {
    if (roundRevealed || !evaluation.valid || evaluation.value === null) return;

    const scored = scoreFoundrySubmission({
      value: evaluation.value,
      target: puzzle.target,
      usedTileCount: evaluation.usedTileIds.length,
      hintUsed: hintRevealed,
    });

    const aiPoints =
      mode === 'vs-ai'
        ? computeAiFoundryScore(aiDifficulty, roundNumber)
        : 85;

    const outcome: FoundryRoundOutcome = {
      roundNumber,
      target: puzzle.target,
      playerExpression: formatFoundryTokens(tokens),
      playerValue: evaluation.value,
      playerDistance: scored.distance,
      playerPoints: scored.points,
      aiExpression: puzzle.solverSolution.expression,
      aiValue: puzzle.solverSolution.value,
      aiPoints,
      exact: scored.exact,
      hintUsed: hintRevealed,
    };

    setRoundRevealed(outcome);
    setHistory((prev) => [...prev, outcome]);
    setPlayerTotal((prev) => prev + scored.points);
    setAiTotal((prev) => prev + aiPoints);

    if (scored.exact) {
      playArithmeticFeedbackSound(soundEnabled, 'stage-up');
    } else if (scored.points >= 25) {
      playArithmeticFeedbackSound(soundEnabled, 'correct');
    } else {
      playArithmeticFeedbackSound(soundEnabled, 'wrong');
    }
  }, [
    aiDifficulty,
    evaluation,
    hintRevealed,
    mode,
    puzzle,
    roundNumber,
    roundRevealed,
    soundEnabled,
    tokens,
  ]);

  const handleNextRound = useCallback(() => {
    if (!roundRevealed) return;

    if (roundNumber >= TOTAL_ROUNDS) {
      const exactHits = history.filter((h) => h.exact).length;
      const record = buildFoundryMatchRecord({
        tier: ageTier,
        mode,
        aiDifficulty,
        playerScore: playerTotal,
        opponentScore: aiTotal,
        exactHits,
        roundsPlayed: TOTAL_ROUNDS,
      });
      const newlyUnlocked = onRecordMatch(record);
      setUnlockedBadges(newlyUnlocked);
      setPhase('finished');
      playVictoryChord(soundEnabled);
      return;
    }

    const nextRound = roundNumber + 1;
    const nextPuzzle = generateFoundryPuzzle(ageTier, nextRound, sessionSeed);
    setRoundNumber(nextRound);
    setPuzzle(nextPuzzle);
    setTokens([]);
    setHintRevealed(false);
    setStepsRevealed(false);
    setRoundRevealed(null);
    playTileClaimSound(soundEnabled, false);
  }, [
    ageTier,
    aiDifficulty,
    aiTotal,
    history,
    mode,
    onRecordMatch,
    playerTotal,
    roundNumber,
    roundRevealed,
    sessionSeed,
    soundEnabled,
  ]);

  // Keyboard shortcuts during active play
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Backspace' && !roundRevealed) {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (roundRevealed) {
          e.preventDefault();
          handleNextRound();
        } else if (evaluation.valid && evaluation.value !== null) {
          e.preventDefault();
          handleSubmitRound();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    evaluation.valid,
    evaluation.value,
    handleBackspace,
    handleNextRound,
    handleSubmitRound,
    phase,
    roundRevealed,
  ]);

  const exactHitsCount = history.filter((h) => h.exact).length;

  return (
    <main
      data-testid="equation-foundry-arena"
      className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 lg:px-8"
    >
      {/* Top Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D5] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Games Studio
          </button>
          <div>
            <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
              Set 01 Extension · Expression Building
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              Equation Foundry
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs text-[#5A6572]">
            Tier:{' '}
            <strong className="font-semibold text-[#1C232B]">
              {activeTierSpec.label} ({activeTierSpec.ageRange})
            </strong>
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                Sound On
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-[#5A6572]" aria-hidden="true" />
                Muted
              </>
            )}
          </button>
        </div>
      </div>

      {/* PHASE 1: SETUP */}
      {phase === 'setup' && (
        <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="card-tactile rounded-2xl p-6 sm:p-8 lg:col-span-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#B45309]">
              <Calculator className="h-4 w-4" aria-hidden="true" />
              <span>5-Round Expression Crafting Session</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#1C232B] sm:text-3xl">
              Forge the target number from five ceramic tiles.
            </h2>
            <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-[#46515E]">
              Each round deals five number tiles and one target. Combine tiles
              with order-of-operations keys to match the target exactly—each
              number tile may be used at most once, while operators are
              unlimited.
            </p>

            {/* Tier Selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                1. Choose Adaptive Age Tier
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
                  const ops = FOUNDRY_OPERATORS_BY_TIER[t].join(' ');
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeTier(t)}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1C232B] shadow-[0_2px_0_#BFDBFE]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#46515E] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <span className="text-sm font-semibold text-[#1C232B]">
                        {spec.label}{' '}
                        <span className="font-mono text-xs font-normal text-[#5A6572]">
                          ({spec.ageRange})
                        </span>
                      </span>
                      <span className="mt-1 font-mono text-xs font-semibold text-[#1D4ED8]">
                        Keys: {ops}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                2. Play Mode &amp; Expression Solver AI
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={mode === 'vs-ai'}
                  onClick={() => setMode('vs-ai')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    mode === 'vs-ai'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      vs. Expression Solver AI
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Compete across 5 targets and inspect the solver’s
                      step-by-step tree after each round.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    mode === 'solo'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      Solo Foundry Studio
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Calm self-paced puzzle crafting with live PEMDAS evaluation
                      and optional strategy hints.
                    </p>
                  </div>
                </button>
              </div>

              {mode === 'vs-ai' && (
                <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((d) => {
                    const active = aiDifficulty === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAiDifficulty(d.id)}
                        className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-[#1D4ED8] bg-white text-[#1C232B] shadow-[0_2px_0_#D8D0C0]'
                            : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#5A6572] hover:text-[#1C232B]'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#1C232B]">
                          {d.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5A6572]">
                          {d.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="start-foundry-btn"
                onClick={() => startSession(ageTier)}
                className="btn-cobalt inline-flex min-h-[46px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Start Equation Foundry
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="font-mono text-xs text-[#5A6572]">
                5 rounds · Guaranteed exact solution on every deal
              </span>
            </div>
          </div>

          {/* Right Preview Blueprint Card */}
          <aside className="card-tactile flex flex-col justify-between rounded-2xl bg-[#FFFDF9] p-6 lg:col-span-4">
            <div>
              <p className="font-mono text-xs font-semibold text-[#5A6572]">
                Scoring &amp; Craft Rules
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                Precision + Order of Operations
              </h3>
              <dl className="mt-4 space-y-3 border-t border-[#ECE7DD] pt-4 text-xs text-[#46515E]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">Exact Target Match</dt>
                  <dd className="font-mono font-semibold text-[#047857] tabular-nums">
                    +100 pts
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">3+ Tile Craft Bonus</dt>
                  <dd className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                    +15 pts
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">Close Approximation (≤5 away)</dt>
                  <dd className="font-mono font-semibold text-[#B45309] tabular-nums">
                    20–68 pts
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">Strategy Hint</dt>
                  <dd className="font-mono text-[#5A6572] tabular-nums">
                    −15 pts
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
              <p className="font-mono text-[11px] font-semibold text-[#B45309]">
                PEMDAS Live Preview
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#46515E]">
                Parentheses and exponents evaluate before multiplication and
                division—watch your expression value update in real time as you
                place tiles.
              </p>
            </div>
          </aside>
        </section>
      )}

      {/* PHASE 2: ACTIVE GAMEPLAY */}
      {phase === 'playing' && (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left / Main Workbench */}
          <div className="space-y-5 lg:col-span-8">
            {/* Round & Score Header */}
            <div className="card-tactile flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                  {roundNumber}/{TOTAL_ROUNDS}
                </div>
                <div>
                  <p className="font-mono text-[11px] text-[#5A6572]">
                    Round {roundNumber} of {TOTAL_ROUNDS}
                  </p>
                  <p className="text-sm font-semibold text-[#1C232B]">
                    {playerName} vs.{' '}
                    {mode === 'solo'
                      ? 'Foundry Par'
                      : `Solver AI (${aiDifficulty})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 font-mono tabular-nums">
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                  <p className="text-lg font-semibold text-[#1D4ED8]">
                    {playerTotal} pts
                  </p>
                </div>
                <div className="h-7 w-px bg-[#E5E0D5]" aria-hidden="true" />
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">
                    {mode === 'solo' ? 'Par' : 'Solver AI'}
                  </p>
                  <p className="text-lg font-semibold text-[#1C232B]">
                    {aiTotal} pts
                  </p>
                </div>
              </div>
            </div>

            {/* Target & Expression Bench */}
            <div className="card-tactile rounded-2xl p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE7DD] pb-5">
                <div>
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#B45309]">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    TARGET NUMBER
                  </p>
                  <p
                    data-testid="foundry-target"
                    className="mt-1 font-mono text-4xl font-semibold tracking-tight text-[#1C232B] sm:text-5xl tabular-nums"
                  >
                    {puzzle.target}
                  </p>
                </div>

                {/* Live Evaluation Readout */}
                <div
                  data-testid="foundry-live-eval"
                  aria-live="polite"
                  className={`rounded-xl border px-4 py-3 text-right font-mono tabular-nums transition-colors ${
                    exactMatchNow
                      ? 'border-[#047857]/40 bg-[#ECFDF5] text-[#047857]'
                      : evaluation.valid
                        ? 'border-[#1D4ED8]/30 bg-[#EFF5FF] text-[#1D4ED8]'
                        : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#5A6572]'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Live Expression Value
                  </p>
                  {evaluation.valid && evaluation.value !== null ? (
                    <div className="mt-0.5 flex items-baseline justify-end gap-2">
                      <span className="text-2xl font-semibold">
                        = {evaluation.value}
                      </span>
                      <span className="text-xs font-semibold">
                        {exactMatchNow ? (
                          <span className="inline-flex items-center gap-1 text-[#047857]">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Exact Match
                          </span>
                        ) : currentDelta !== null ? (
                          `(${currentDelta > 0 ? `+${currentDelta}` : currentDelta} from target)`
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-[#5A6572]">
                      {evaluation.error ?? 'Tap number tiles and operators below.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Expression Bench (Clickable tokens to remove) */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#5A6572]">
                    Expression Bench{' '}
                    <span className="font-normal">
                      (click any placed chip to remove)
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={tokens.length === 0 || Boolean(roundRevealed)}
                      onClick={handleBackspace}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#D8D0C0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] disabled:opacity-40 transition-colors"
                    >
                      <Delete className="h-3.5 w-3.5" aria-hidden="true" />
                      Undo
                    </button>
                    <button
                      type="button"
                      disabled={tokens.length === 0 || Boolean(roundRevealed)}
                      onClick={handleClearBench}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#D8D0C0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5A6572] hover:border-[#BE123C] hover:text-[#BE123C] disabled:opacity-40 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  data-testid="foundry-bench"
                  className="mt-2.5 flex min-h-[76px] flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#D2C9B8] bg-[#FAF8F4] p-3.5"
                >
                  {tokens.length === 0 ? (
                    <span className="text-xs text-[#737E8A]">
                      Select ceramic number tiles and operators below to forge{' '}
                      <strong className="font-mono text-[#1C232B]">
                        {puzzle.target}
                      </strong>
                      …
                    </span>
                  ) : (
                    tokens.map((tok, idx) => {
                      const isTile = tok.kind === 'tile';
                      return (
                        <motion.button
                          key={`${idx}-${isTile ? tok.tileId : tok.op}`}
                          type="button"
                          disabled={Boolean(roundRevealed)}
                          onClick={() => handleRemoveTokenAt(idx)}
                          initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.14 }}
                          title="Click to remove from expression"
                          className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-3 font-mono text-lg font-semibold tabular-nums transition-all hover:-translate-y-0.5 ${
                            isTile
                              ? 'border-[#1D4ED8]/45 bg-white text-[#1C232B] shadow-[0_2px_0_#C7D7FA]'
                              : 'border-[#D4B88C] bg-[#FDF6E7] text-[#8A5108] shadow-[0_2px_0_#DEC59D]'
                          }`}
                        >
                          {isTile ? tok.value : tok.op}
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Ceramic Number Tiles */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Available Number Tiles{' '}
                  <span className="font-normal text-[#5A6572]">
                    (use each tile at most once)
                  </span>
                </p>
                <div className="mt-2.5 grid grid-cols-5 gap-2.5 sm:gap-3">
                  {puzzle.tiles.map((tile, idx) => {
                    const used = usedTileSet.has(tile.id);
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        data-testid={`foundry-tile-${idx}`}
                        disabled={used || Boolean(roundRevealed)}
                        aria-pressed={used}
                        onClick={() => handleSelectTile(tile)}
                        className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl border font-mono text-xl font-semibold tabular-nums transition-all ${
                          used
                            ? 'border-[#E5E0D5] bg-[#F1EDE4] text-[#9AA3AE] line-through shadow-none'
                            : 'border-[#CFC6B4] bg-white text-[#1C232B] shadow-[0_3px_0_#D8D0C0] hover:-translate-y-0.5 hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:translate-y-0'
                        }`}
                      >
                        <span>{tile.value}</span>
                        <span className="mt-0.5 font-sans text-[10px] font-medium">
                          {used ? 'Placed' : 'Tile'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operator Keys */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Operator Keys ({activeTierSpec.label} Set)
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {puzzle.allowedOperators.map((op) => (
                    <button
                      key={op}
                      type="button"
                      data-testid={`foundry-op-${op}`}
                      disabled={Boolean(roundRevealed)}
                      onClick={() => handleSelectOperator(op)}
                      className="inline-flex min-h-[46px] min-w-[52px] items-center justify-center rounded-xl border border-[#D4B88C] bg-[#FDF6E7] px-3.5 font-mono text-lg font-semibold text-[#8A5108] shadow-[0_2px_0_#DEC59D] hover:-translate-y-0.5 hover:border-[#B45309] active:translate-y-0 disabled:opacity-40 transition-all"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Row */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE7DD] pt-5">
                {!roundRevealed ? (
                  <>
                    <button
                      type="button"
                      data-testid="foundry-hint-btn"
                      onClick={() => setHintRevealed(true)}
                      disabled={hintRevealed}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DFC99B] bg-[#FFFDF7] px-4 py-2 text-xs font-semibold text-[#8A5108] hover:border-[#B45309] disabled:opacity-60 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4" aria-hidden="true" />
                      {hintRevealed ? 'Strategy Clue Shown (−15 pts)' : 'Show Solver Clue (−15 pts)'}
                    </button>

                    <button
                      type="button"
                      data-testid="foundry-submit-btn"
                      disabled={!evaluation.valid || evaluation.value === null}
                      onClick={handleSubmitRound}
                      className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-45"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      {exactMatchNow ? 'Lock Exact Match' : 'Submit Expression'}
                    </button>
                  </>
                ) : (
                  <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {roundRevealed.exact ? (
                        <span className="inline-flex items-center gap-1.5 text-[#047857]">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Exact match forged! +{roundRevealed.playerPoints} pts
                        </span>
                      ) : (
                        <span className="text-[#B45309]">
                          Evaluated to {roundRevealed.playerValue} (off by{' '}
                          {roundRevealed.playerDistance}) · +
                          {roundRevealed.playerPoints} pts
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid="foundry-next-btn"
                      onClick={handleNextRound}
                      className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
                    >
                      {roundNumber >= TOTAL_ROUNDS
                        ? 'Finish Foundry Session'
                        : `Next Target (Round ${roundNumber + 1})`}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Concept & Solver Panel */}
          <aside className="space-y-5 lg:col-span-4">
            {/* Hint / Solver Breakdown */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8]">
                <Cpu className="h-4 w-4" aria-hidden="true" />
                <span>Expression Solver Notebook</span>
              </div>

              {roundRevealed ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3.5">
                    <p className="font-mono text-[11px] font-semibold text-[#5A6572]">
                      Your Expression
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                      {roundRevealed.playerExpression} ={' '}
                      {roundRevealed.playerValue}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#1D4ED8]/30 bg-[#EFF5FF] p-3.5">
                    <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                      Solver AI Solution (+{roundRevealed.aiPoints} pts)
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                      {puzzle.solverSolution.expression} ={' '}
                      {puzzle.solverSolution.value}
                    </p>
                    {puzzle.solverSolution.steps.length > 0 && (
                      <ol className="mt-2.5 space-y-1 border-t border-[#C7D7FA] pt-2 font-mono text-xs text-[#334155]">
                        {puzzle.solverSolution.steps.map((step, idx) => (
                          <li key={idx}>
                            {idx + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              ) : hintRevealed ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-[#DFC99B] bg-[#FFFDF7] p-3.5">
                    <p className="text-xs font-semibold text-[#8A5108]">
                      Strategy Clue
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#46515E]">
                      {puzzle.hintText}
                    </p>
                  </div>

                  {!stepsRevealed ? (
                    <button
                      type="button"
                      onClick={() => setStepsRevealed(true)}
                      className="w-full rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
                    >
                      Reveal First Step From Solver Tree
                    </button>
                  ) : (
                    <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-3 font-mono text-xs text-[#1C232B]">
                      Step 1:{' '}
                      {puzzle.solverSolution.steps[0] ??
                        puzzle.solverSolution.expression}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2.5 text-xs leading-relaxed text-[#5A6572]">
                  Submit your expression to compare against the deterministic
                  Expression Solver AI’s step tree, or request a clue if you get
                  stuck.
                </p>
              )}
            </div>

            {/* Completed Rounds Ledger */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Round Ledger
                </p>
                <span className="font-mono text-xs text-[#5A6572] tabular-nums">
                  {exactHitsCount} exact
                </span>
              </div>
              {history.length === 0 ? (
                <p className="mt-2.5 text-xs text-[#737E8A]">
                  Your forged expressions and scores for each round appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {history.map((item) => (
                    <li
                      key={item.roundNumber}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] px-3 py-2 text-xs font-mono tabular-nums"
                    >
                      <span className="truncate text-[#1C232B]">
                        R{item.roundNumber}: {item.playerExpression} ={' '}
                        {item.playerValue}
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          item.exact ? 'text-[#047857]' : 'text-[#B45309]'
                        }`}
                      >
                        +{item.playerPoints}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      )}

      {/* PHASE 3: FINISHED SUMMARY */}
      {phase === 'finished' && (
        <section
          data-testid="foundry-summary"
          className="card-tactile mt-7 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#047857]">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Equation Foundry Complete · Saved to Mastery Notebook
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
                {playerTotal > aiTotal
                  ? `Victory! You out-forged ${mode === 'solo' ? 'Foundry Par' : 'Solver AI'}.`
                  : playerTotal === aiTotal
                    ? 'Dead Heat! Balanced precision across all 5 targets.'
                    : 'Session Logged — Inspect the Solver Trees to sharpen your edge.'}
              </h2>
            </div>

            <div className="flex items-center gap-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-5 py-3 font-mono tabular-nums">
              <div>
                <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                <p className="text-2xl font-semibold text-[#1D4ED8]">
                  {playerTotal}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">
                  {mode === 'solo' ? 'Par' : 'Solver AI'}
                </p>
                <p className="text-2xl font-semibold text-[#1C232B]">
                  {aiTotal}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">Exact Matches</p>
                <p className="text-2xl font-semibold text-[#047857]">
                  {exactHitsCount}/{TOTAL_ROUNDS}
                </p>
              </div>
            </div>
          </div>

          {unlockedBadges.length > 0 && (
            <div className="mt-5 rounded-xl border border-[#DFC99B] bg-[#FFFDF7] p-4">
              <p className="text-xs font-semibold text-[#B45309]">
                New Mastery Seal Unlocked!
              </p>
              <p className="mt-1 text-sm text-[#1C232B]">
                {unlockedBadges.map((b) => b.title).join(', ')}
              </p>
            </div>
          )}

          {/* Round-by-round breakdown */}
          <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E0D5] font-mono text-[#5A6572]">
                  <th className="py-2 pr-3">Round</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Your Expression</th>
                  <th className="py-2 pr-3">Solver AI Reference</th>
                  <th className="py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE4] font-mono tabular-nums">
                {history.map((row) => (
                  <tr key={row.roundNumber}>
                    <td className="py-2.5 pr-3 text-[#5A6572]">
                      #{row.roundNumber}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-[#1C232B]">
                      {row.target}
                    </td>
                    <td className="py-2.5 pr-3 text-[#1C232B]">
                      {row.playerExpression} = {row.playerValue}
                    </td>
                    <td className="py-2.5 pr-3 text-[#5A6572]">
                      {row.aiExpression} = {row.aiValue}
                    </td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        row.exact ? 'text-[#047857]' : 'text-[#B45309]'
                      }`}
                    >
                      +{row.playerPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => startSession(ageTier)}
              className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Play 5 Fresh Targets
            </button>
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Open Mastery Notebook
            </button>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#5A6572] hover:text-[#1C232B] transition-colors"
            >
              Change Mode / Tier
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
