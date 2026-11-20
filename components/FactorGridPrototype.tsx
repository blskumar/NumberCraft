'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import type { AchievementDefinition } from '@/lib/achievements';
import {
  applyMove,
  chooseAiMove,
  classifyNumber,
  createFactorGame,
  getBestHintMove,
  getLegalMoves,
  isLegalMove,
  isPrime,
  previewMove,
  PRIME_TRAP_BONUS,
  TIER_SPECS,
} from '@/lib/factor-grid-engine';
import {
  playAchievementChime,
  playFactorGridMoveSound,
  playTileClaimSound,
  playVictoryChord,
} from '@/lib/sound';
import type {
  AgeTier,
  AiDifficulty,
  FactorGameState,
  FactorVariant,
  MatchRecord,
  PlayMode,
} from '@/lib/types';

interface FactorGridPrototypeProps {
  ageTier: AgeTier;
  onChangeTier: (tier: AgeTier) => void;
  playerName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBackToStudio: () => void;
  onOpenRooms: () => void;
  onOpenNotebook: () => void;
  onRecordMatch: (record: MatchRecord) => AchievementDefinition[];
  autoStart?: boolean;
}

type StageView = 'setup' | 'playing';

export default function FactorGridPrototype({
  ageTier,
  onChangeTier,
  playerName,
  soundEnabled,
  onToggleSound,
  onBackToStudio,
  onOpenRooms,
  onOpenNotebook,
  onRecordMatch,
  autoStart = false,
}: FactorGridPrototypeProps) {
  const [stage, setStage] = useState<StageView>(autoStart ? 'playing' : 'setup');
  const [mode, setMode] = useState<PlayMode>('vs-ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('scholar');
  const [variant, setVariant] = useState<FactorVariant>('classic');
  const [customP1Name, setCustomP1Name] = useState<string | null>(null);
  const [p2Input, setP2Input] = useState<string>('Player 2');

  const p1Input = customP1Name ?? (playerName || 'You');

  const [game, setGame] = useState<FactorGameState>(() =>
    createFactorGame({
      tier: ageTier,
      mode: 'vs-ai',
      aiDifficulty: 'scholar',
      variant: 'classic',
      player1Name: playerName || 'You',
    })
  );

  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [hintTile, setHintTile] = useState<number | null>(null);
  const [hintNote, setHintNote] = useState<string | null>(null);
  const [newlyUnlockedSeals, setNewlyUnlockedSeals] = useState<
    AchievementDefinition[]
  >([]);

  const aiThinking =
    stage === 'playing' &&
    game.status === 'playing' &&
    game.mode === 'vs-ai' &&
    game.currentTurn === 'p2';

  const recordedMatchRef = useRef<boolean>(false);

  useEffect(() => {
    if (stage === 'setup') {
      document.body.dataset.state = 'title';
    } else if (game.status === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
    return () => {
      delete document.body.dataset.state;
    };
  }, [stage, game.status]);

  // Keyboard shortcuts: Enter on setup starts; H during play triggers Hint
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (stage === 'setup' && e.key === 'Enter') {
        e.preventDefault();
        startNewMatch();
      } else if (
        stage === 'playing' &&
        (e.key === 'h' || e.key === 'H') &&
        game.status === 'playing' &&
        !aiThinking
      ) {
        e.preventDefault();
        const suggestion = getBestHintMove(game);
        if (suggestion) {
          setHintTile(suggestion.tile);
          setHintNote(suggestion.rationale);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, ageTier, mode, aiDifficulty, variant, p1Input, p2Input, game, aiThinking]);

  const finalizeIfGameOver = useCallback(
    (next: FactorGameState) => {
      if (next.status !== 'gameover') return;
      if (recordedMatchRef.current) return;
      recordedMatchRef.current = true;

      playVictoryChord(soundEnabled);

      const result: 'win' | 'loss' | 'draw' =
        next.winner === 'p1' ? 'win' : next.winner === 'p2' ? 'loss' : 'draw';

      const unlocked = onRecordMatch({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        gameTitle: 'Factor Grid',
        mode: next.mode,
        aiDifficulty: next.mode === 'vs-ai' ? next.aiDifficulty : undefined,
        tier: next.tier,
        variant: next.variant,
        playerScore: next.scores.p1,
        opponentScore: next.scores.p2,
        opponentName: next.player2Name,
        result,
        primesClaimed: next.primesClaimed.p1,
        playedAt: new Date().toISOString(),
      });
      if (unlocked.length > 0) {
        setNewlyUnlockedSeals(unlocked);
        playAchievementChime(soundEnabled);
      }
    },
    [soundEnabled, onRecordMatch]
  );

  // Trigger AI turn smoothly when it's p2's turn in vs-ai mode
  useEffect(() => {
    if (!aiThinking) {
      return;
    }

    const timer = window.setTimeout(() => {
      const suggestion = chooseAiMove(game, game.aiDifficulty);
      if (suggestion) {
        const next = applyMove(game, suggestion.tile);
        next.lastInsight = suggestion.rationale;
        playTileClaimSound(
          soundEnabled,
          suggestion.preview.classification.kind === 'prime'
        );
        setGame(next);
        setHintTile(null);
        setHintNote(null);
        finalizeIfGameOver(next);
      }
    }, 620);

    return () => window.clearTimeout(timer);
  }, [aiThinking, game, soundEnabled, finalizeIfGameOver]);

  function startNewMatch(overrideTier?: AgeTier) {
    const targetTier = overrideTier ?? ageTier;
    recordedMatchRef.current = false;
    setHoveredTile(null);
    setHintTile(null);
    setHintNote(null);
    setNewlyUnlockedSeals([]);
    setGame(
      createFactorGame({
        tier: targetTier,
        mode,
        aiDifficulty,
        variant,
        player1Name: p1Input.trim() || 'You',
        player2Name: p2Input.trim() || 'Player 2',
      })
    );
    setStage('playing');
  }

  function handleTileClick(tileNumber: number) {
    if (stage !== 'playing' || game.status !== 'playing' || aiThinking) return;
    if (game.mode === 'vs-ai' && game.currentTurn === 'p2') return;
    if (!isLegalMove(game, tileNumber)) {
      playFactorGridMoveSound(soundEnabled, { legal: false });
      return;
    }

    const preview = previewMove(game, tileNumber);
    playFactorGridMoveSound(soundEnabled, {
      legal: true,
      isPrimeClaim: preview.classification.kind === 'prime',
    });
    const next = applyMove(game, tileNumber);
    setGame(next);
    setHoveredTile(null);
    setHintTile(null);
    setHintNote(null);
    finalizeIfGameOver(next);
  }

  function handleRequestHint() {
    if (game.status !== 'playing' || aiThinking) return;
    if (game.mode === 'vs-ai' && game.currentTurn === 'p2') return;
    const suggestion = getBestHintMove(game);
    if (suggestion) {
      setHintTile(suggestion.tile);
      setHintNote(suggestion.rationale);
    }
  }

  const legalMovesSet = useMemo(() => new Set(getLegalMoves(game)), [game]);

  const activePreview = useMemo(() => {
    if (hoveredTile === null) return null;
    return previewMove(game, hoveredTile);
  }, [game, hoveredTile]);

  const inspectedNumber = useMemo(() => {
    if (hoveredTile !== null) return classifyNumber(hoveredTile);
    if (game.moves.length > 0) {
      return classifyNumber(game.moves[game.moves.length - 1].claimedTile);
    }
    return classifyNumber(game.boardMax);
  }, [hoveredTile, game.moves, game.boardMax]);

  const highlightedDivisors = useMemo(() => {
    if (!activePreview || !activePreview.legal) return new Set<number>();
    return new Set(activePreview.opponentDivisors);
  }, [activePreview]);

  const latestMove =
    game.moves.length > 0 ? game.moves[game.moves.length - 1] : null;
  const freshTilesSet = useMemo(() => {
    if (!latestMove) return new Set<number>();
    return new Set([latestMove.claimedTile, ...latestMove.surrenderedDivisors]);
  }, [latestMove]);

  const spec = TIER_SPECS[game.tier];
  const setupSpec = TIER_SPECS[ageTier];
  const tilesArray = useMemo(
    () => Array.from({ length: game.boardMax }, (_, i) => i + 1),
    [game.boardMax]
  );

  const gridColsClass =
    spec.columns === 5
      ? 'grid-cols-5'
      : spec.columns === 6
        ? 'grid-cols-6'
        : 'grid-cols-7';

  // ==================== SETUP / MODE LAUNCHER VIEW ====================
  if (stage === 'setup') {
    return (
      <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBackToStudio}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6572] hover:text-[#1C232B] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Games
        </button>

        <div className="card-tactile mt-5 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-6">
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8]">
                Set 03 · Strategy Number Theory · Interactive Prototype
              </p>
              <h1 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
                Factor Grid
              </h1>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[#46515E]">
                Choose a number that still has at least one unclaimed proper
                divisor. You score the number you pick, and your opponent
                automatically collects all of its remaining proper divisors.
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#5A6572] tabular-nums">
              <p className="font-semibold text-[#1C232B]">
                Grid 1–{setupSpec.boardMax}
              </p>
              <p>
                {setupSpec.label} ({setupSpec.ageRange})
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Config Controls */}
            <div className="space-y-6 lg:col-span-7">
              <div>
                <label className="block text-xs font-semibold text-[#1C232B]">
                  1. Select Play Mode
                </label>
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      id: 'vs-ai' as PlayMode,
                      title: 'Human vs. AI',
                      desc: 'Minimax strategist',
                      icon: Bot,
                    },
                    {
                      id: 'solo' as PlayMode,
                      title: 'Solo · Taxman',
                      desc: 'Beat the collector',
                      icon: User,
                    },
                    {
                      id: 'local' as PlayMode,
                      title: 'Pass-and-Play',
                      desc: '2 players, 1 device',
                      icon: Users,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setMode(item.id)}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                          active
                            ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1C232B] shadow-[0_2px_0_#1D4ED8]'
                            : 'border-[#DFD8CA] bg-[#FAF8F4] text-[#46515E] shadow-[0_2px_0_#E7E1D4] hover:border-[#B8B0A0]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${active ? 'text-[#1D4ED8]' : 'text-[#5A6572]'}`}
                          aria-hidden="true"
                        />
                        <span className="mt-2 text-sm font-semibold text-[#1C232B]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 text-xs text-[#5A6572]">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {mode === 'vs-ai' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1C232B]">
                    2. AI Opponent Strength
                  </label>
                  <div className="mt-2.5 inline-flex flex-wrap gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1">
                    {(
                      [
                        { id: 'apprentice', label: 'Apprentice (Gentle)' },
                        { id: 'scholar', label: 'Scholar (Tactical)' },
                        { id: 'master', label: 'Master (Minimax)' },
                      ] as { id: AiDifficulty; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={aiDifficulty === opt.id}
                        onClick={() => setAiDifficulty(opt.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                          aiDifficulty === opt.id
                            ? 'bg-white text-[#1C232B] shadow-xs'
                            : 'text-[#5A6572] hover:text-[#1C232B]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'local' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="p1-name"
                      className="block text-xs font-semibold text-[#1C232B]"
                    >
                      Player 1 Name
                    </label>
                    <input
                      id="p1-name"
                      type="text"
                      maxLength={24}
                      value={p1Input}
                      onChange={(e) => setCustomP1Name(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="p2-name"
                      className="block text-xs font-semibold text-[#1C232B]"
                    >
                      Player 2 Name
                    </label>
                    <input
                      id="p2-name"
                      type="text"
                      maxLength={24}
                      value={p2Input}
                      onChange={(e) => setP2Input(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1C232B]">
                    Adaptive Board Tier
                  </label>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {(['explorers', 'challengers', 'strategists'] as AgeTier[]).map(
                      (tid) => {
                        const t = TIER_SPECS[tid];
                        const active = ageTier === tid;
                        return (
                          <button
                            key={tid}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChangeTier(tid)}
                            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs transition-all ${
                              active
                                ? 'border-[#1D4ED8] bg-[#EFF6FF] font-semibold text-[#1C232B]'
                                : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#5A6572] hover:text-[#1C232B]'
                            }`}
                          >
                            <span>
                              {t.label} ({t.ageRange})
                            </span>
                            <span className="font-mono tabular-nums">
                              1–{t.boardMax}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C232B]">
                    Rule Variant
                  </label>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <button
                      type="button"
                      aria-pressed={variant === 'classic'}
                      onClick={() => setVariant('classic')}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                        variant === 'classic'
                          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1C232B]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#5A6572]'
                      }`}
                    >
                      <span className="block font-semibold text-[#1C232B]">
                        Classic Factor Capture
                      </span>
                      <span className="text-[#5A6572]">
                        Pure divisor scoring across the grid.
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={variant === 'prime-trap'}
                      onClick={() => setVariant('prime-trap')}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                        variant === 'prime-trap'
                          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1C232B]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#5A6572]'
                      }`}
                    >
                      <span className="block font-semibold text-[#1C232B]">
                        Prime Trap (+{PRIME_TRAP_BONUS} bonus)
                      </span>
                      <span className="text-[#5A6572]">
                        Extra points for claiming prime numbers.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Quick-Rule Notebook Card */}
            <aside className="flex flex-col justify-between rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-5 lg:col-span-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1C232B]">
                  How a Turn Works
                </h2>
                <ol className="mt-3 space-y-2.5 text-sm text-[#46515E]">
                  <li>
                    <strong className="font-semibold text-[#1C232B]">
                      1. Pick an open tile:
                    </strong>{' '}
                    It must have at least one unclaimed proper divisor.
                  </li>
                  <li>
                    <strong className="font-semibold text-[#1C232B]">
                      2. Preview the trade:
                    </strong>{' '}
                    Hovering highlights your opponent&apos;s captured divisors
                    in ochre gold before you commit.
                  </li>
                  <li>
                    <strong className="font-semibold text-[#1C232B]">
                      3. Spot primes &amp; traps:
                    </strong>{' '}
                    Large primes only give away <span className="font-mono">1</span>
                    , while abundant numbers like{' '}
                    <span className="font-mono">24</span> can hand away more
                    points than they earn!
                  </li>
                </ol>

                <div className="mt-5 border-t border-[#E5E0D5] pt-4 text-xs text-[#5A6572]">
                  Want to play across two devices?{' '}
                  <button
                    type="button"
                    onClick={onOpenRooms}
                    className="font-semibold text-[#1D4ED8] underline underline-offset-2 hover:text-[#1E40AF]"
                  >
                    Preview Online Room Codes
                  </button>
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={() => startNewMatch()}
                className="btn-cobalt mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap"
              >
                Start Factor Grid
              </button>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  // ==================== ACTIVE GAMEPLAY SANDBOX VIEW ====================
  const activeActorName =
    game.currentTurn === 'p1' ? game.player1Name : game.player2Name;
  const remainingLegalCount = legalMovesSet.size;
  const biggestSwing = game.moves.reduce(
    (best, m) => (m.netSwing > best ? m.netSwing : best),
    0
  );
  const totalScored = game.scores.p1 + game.scores.p2;
  const p1SharePercent =
    totalScored > 0 ? Math.round((game.scores.p1 / totalScored) * 100) : 50;
  const scoreDiff = game.scores.p1 - game.scores.p2;

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Compact Game Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DCCF] pb-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStage('setup')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6572] hover:text-[#1C232B] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Mode Setup
          </button>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            /
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="font-display text-xl font-semibold text-[#1C232B]">
              Factor Grid
            </h1>
            <span className="text-xs text-[#5A6572] font-mono tabular-nums">
              1–{game.boardMax} · {spec.label} ·{' '}
              {game.variant === 'prime-trap'
                ? `Prime Trap (+${PRIME_TRAP_BONUS})`
                : 'Classic'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRequestHint}
            disabled={game.status !== 'playing' || aiThinking}
            title="Show optimal hint (H)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#047857] hover:text-[#047857] disabled:opacity-45 transition-all whitespace-nowrap"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            Hint
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute game sounds' : 'Unmute game sounds'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#1D4ED8] transition-all whitespace-nowrap"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Sound On' : 'Muted'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => startNewMatch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#1D4ED8] transition-all whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restart
          </button>
        </div>
      </div>

      {/* Compact Mobile Score Strip (visible only below lg breakpoint) */}
      <div className="card-tactile mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-mono tabular-nums lg:hidden">
        <span className="font-semibold text-[#1D4ED8]">
          {game.player1Name}: {game.scores.p1}
        </span>
        <span aria-hidden="true" className="text-[#D8D1C4]">
          vs
        </span>
        <span className="font-semibold text-[#8A5108]">
          {game.player2Name}: {game.scores.p2}
        </span>
      </div>

      {/* Two-Zone Sandbox Layout (65% Board Left, 35% HUD & Math Deck Right) */}
      <div className="mt-4 lg:mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT ZONE: Tactile Ceramic Drafting Grid */}
        <section
          aria-label="Factor Grid interactive board"
          className="card-tactile rounded-2xl p-4 sm:p-6 lg:col-span-8"
        >
          {/* Live Preview & Turn Bar */}
          <div className="mb-5 flex min-h-[50px] flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-4 py-2.5 text-sm">
            {activePreview ? (
              activePreview.legal ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs sm:text-sm tabular-nums">
                  <span className="font-semibold text-[#1D4ED8]">
                    Claim {activePreview.tile} (+{activePreview.claimPoints})
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">
                    ·
                  </span>
                  <span className="font-medium text-[#B45309]">
                    {game.player2Name} gets{' '}
                    {'{' + activePreview.opponentDivisors.join(', ') + '}'} (+
                    {activePreview.opponentPoints})
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">
                    ·
                  </span>
                  <span
                    className={`font-semibold ${
                      activePreview.netSwing >= 0
                        ? 'text-[#047857]'
                        : 'text-[#BE123C]'
                    }`}
                  >
                    Net {activePreview.netSwing >= 0 ? '+' : ''}
                    {activePreview.netSwing}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-medium text-[#5A6572]">
                  {game.tiles[activePreview.tile] !== 'unclaimed'
                    ? `Tile ${activePreview.tile} is already claimed.`
                    : `Tile ${activePreview.tile} is locked — none of its proper divisors remain open.`}
                </span>
              )
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1C232B]">
                {game.status === 'gameover' ? (
                  <>
                    <Trophy
                      className="h-4 w-4 text-[#047857]"
                      aria-hidden="true"
                    />
                    <span>Match complete — review your board summary.</span>
                  </>
                ) : aiThinking ? (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="flex items-center gap-2 text-[#8A5108]"
                  >
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    <span>{game.player2Name} is evaluating divisor trades…</span>
                  </motion.div>
                ) : (
                  <>
                    <CheckCircle2
                      className="h-4 w-4 text-[#1D4ED8]"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{activeActorName}&apos;s turn</strong> — select an
                      open tile ({remainingLegalCount} legal{' '}
                      {remainingLegalCount === 1 ? 'move' : 'moves'}).
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] font-medium text-[#5A6572]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]"
                />
                {game.player1Name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-xs border border-[#C6A26A] bg-[#EFE3CE]"
                />
                {game.player2Name}
              </span>
            </div>
          </div>

          {/* Hint Banner */}
          {hintNote && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#047857]/35 bg-[#ECFDF5] px-4 py-2.5 text-xs text-[#065F46]"
            >
              <div className="flex items-start gap-2">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                  aria-hidden="true"
                />
                <span>{hintNote}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHintTile(null);
                  setHintNote(null);
                }}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Tactile Ceramic Numbered Grid */}
          <div
            data-testid="factor-grid-board"
            className={`grid gap-2.5 sm:gap-3 ${gridColsClass}`}
          >
            {tilesArray.map((n) => {
              const owner = game.tiles[n];
              const legal = legalMovesSet.has(n);
              const isHovered = hoveredTile === n;
              const isDivisorHighlight = highlightedDivisors.has(n);
              const isHint = hintTile === n && legal;
              const isFresh = freshTilesSet.has(n);
              const primeFlag = isPrime(n);

              let tileClass =
                'relative flex min-h-[54px] sm:min-h-[64px] flex-col items-center justify-center rounded-xl border font-mono text-base sm:text-lg font-semibold tabular-nums transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]';

              if (owner === 'p1') {
                tileClass +=
                  ' border-[#1539A3] bg-[#1D4ED8] text-white shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)] cursor-default';
              } else if (owner === 'p2') {
                tileClass +=
                  ' border-[#C9AA79] bg-[#EFE3CE] text-[#6B4208] shadow-[inset_0_2px_4px_rgba(107,66,8,0.12)] cursor-default';
              } else if (isDivisorHighlight) {
                tileClass +=
                  ' border-[#D97706] bg-[#FEF3C7] text-[#92400E] shadow-[0_3px_0_#D97706] -translate-y-0.5';
              } else if (isHint) {
                tileClass +=
                  ' border-[#047857] bg-[#ECFDF5] text-[#065F46] shadow-[0_3px_0_#047857] hover:-translate-y-0.5 cursor-pointer';
              } else if (legal && !aiThinking) {
                tileClass += isHovered
                  ? ' border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8] shadow-[0_4px_0_#1D4ED8] -translate-y-0.5 cursor-pointer'
                  : ' border-[#D8D0C0] bg-white text-[#1C232B] shadow-[0_3px_0_#DDD5C5] hover:border-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:shadow-[0_4px_0_#1D4ED8] hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-[0_1px_0_#1D4ED8] cursor-pointer';
              } else {
                tileClass +=
                  ' border-dashed border-[#DDD6C7] bg-[#F5F1E8] text-[#9AA3AD] cursor-not-allowed';
              }

              const ownerLabel =
                owner === 'p1'
                  ? `Claimed by ${game.player1Name}`
                  : owner === 'p2'
                    ? `Claimed by ${game.player2Name}`
                    : legal
                      ? 'Playable'
                      : 'Locked';

              return (
                <motion.button
                  key={n}
                  type="button"
                  disabled={!legal || aiThinking || game.status !== 'playing'}
                  aria-label={`Tile ${n}, ${primeFlag ? 'prime, ' : ''}${ownerLabel}`}
                  animate={isFresh ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onMouseEnter={() => setHoveredTile(n)}
                  onMouseLeave={() =>
                    setHoveredTile((prev) => (prev === n ? null : prev))
                  }
                  onFocus={() => setHoveredTile(n)}
                  onBlur={() =>
                    setHoveredTile((prev) => (prev === n ? null : prev))
                  }
                  onClick={() => handleTileClick(n)}
                  className={tileClass}
                >
                  {primeFlag && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-1.5 right-2 font-sans text-[10px] font-bold leading-none ${
                        owner === 'p1'
                          ? 'text-white/80'
                          : owner === 'p2'
                            ? 'text-[#92400E]/75'
                            : 'text-[#047857]'
                      }`}
                    >
                      p
                    </span>
                  )}

                  <span>{n}</span>

                  {isDivisorHighlight && (
                    <span className="mt-0.5 font-sans text-[10px] font-semibold leading-none text-[#92400E]">
                      divisor
                    </span>
                  )}
                  {isHint && !isDivisorHighlight && (
                    <span className="mt-0.5 font-sans text-[10px] font-semibold leading-none text-[#047857]">
                      hint
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-[#5A6572]">
            Tiles marked with <span className="font-semibold text-[#047857]">p</span>{' '}
            are prime numbers. Dashed tiles have no unclaimed proper divisors
            remaining. Press <span className="font-mono font-semibold text-[#1C232B]">H</span> for a hint.
          </p>
        </section>

        {/* RIGHT ZONE: Scoreboard HUD, Territory Balance, Math Insight & Move Ledger */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Scoreboard Card */}
          <div className="card-tactile rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#5A6572]">
                Live Scoreboard
              </h2>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-[#5A6572]">
                {scoreDiff > 0
                  ? `${game.player1Name} +${scoreDiff}`
                  : scoreDiff < 0
                    ? `${game.player2Name} +${Math.abs(scoreDiff)}`
                    : 'Level'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl border p-3.5 transition-colors ${
                  game.status === 'playing' && game.currentTurn === 'p1'
                    ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                    : 'border-[#ECE7DD] bg-[#FAF8F4]'
                }`}
              >
                <p className="truncate text-xs font-semibold text-[#1C232B]">
                  {game.player1Name}
                </p>
                <p
                  data-testid="score-p1"
                  className="mt-1 font-mono text-3xl font-semibold text-[#1D4ED8] tabular-nums"
                >
                  {game.scores.p1}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6572] font-mono tabular-nums">
                  Primes: {game.primesClaimed.p1}
                </p>
              </div>

              <div
                className={`rounded-xl border p-3.5 transition-colors ${
                  game.status === 'playing' && game.currentTurn === 'p2'
                    ? 'border-[#D97706] bg-[#FEF3C7]/60'
                    : 'border-[#ECE7DD] bg-[#FAF8F4]'
                }`}
              >
                <p className="truncate text-xs font-semibold text-[#1C232B]">
                  {game.player2Name}
                </p>
                <p
                  data-testid="score-p2"
                  className="mt-1 font-mono text-3xl font-semibold text-[#8A5108] tabular-nums"
                >
                  {game.scores.p2}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6572] font-mono tabular-nums">
                  Primes: {game.primesClaimed.p2}
                </p>
              </div>
            </div>

            {/* Territory Balance Bar */}
            <div className="mt-3.5" aria-label="Score share balance">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE3CE]">
                <div
                  className="h-full bg-[#1D4ED8] transition-all duration-300"
                  style={{ width: `${p1SharePercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[#5A6572] tabular-nums">
                <span>{p1SharePercent}% share</span>
                <span>{100 - p1SharePercent}% share</span>
              </div>
            </div>

            {/* Latest Move / AI Reasoning Strip */}
            <div className="mt-4 border-t border-[#ECE7DD] pt-3.5">
              <p className="text-[11px] font-semibold text-[#5A6572]">
                Latest Play Note
              </p>
              <p
                data-testid="latest-insight"
                className="mt-1 text-xs leading-relaxed text-[#1C232B]"
              >
                {game.lastInsight}
              </p>
            </div>
          </div>

          {/* Live Number Theory Inspector */}
          <div className="card-tactile rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold text-[#5A6572]">
                Number Inspector
              </h2>
              <span className="font-mono text-xs font-semibold text-[#1C232B] tabular-nums">
                n = {inspectedNumber.value} ·{' '}
                {inspectedNumber.kind.charAt(0).toUpperCase() +
                  inspectedNumber.kind.slice(1)}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#46515E]">
              {inspectedNumber.summary}
            </p>

            {inspectedNumber.properDivisors.length > 0 && (
              <p className="mt-2.5 font-mono text-xs text-[#5A6572] tabular-nums">
                Proper divisors: {'{' + inspectedNumber.properDivisors.join(', ') + '}'}{' '}
                (sum = {inspectedNumber.divisorSum})
              </p>
            )}
          </div>

          {/* Algebraic Move Ledger */}
          <div className="card-tactile rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#5A6572]">
                Move Ledger
              </h2>
              <span className="font-mono text-xs text-[#5A6572] tabular-nums">
                {game.moves.length} {game.moves.length === 1 ? 'turn' : 'turns'}
              </span>
            </div>

            {game.moves.length === 0 ? (
              <p className="mt-3 text-xs text-[#5A6572]">
                No tiles claimed yet. Try hovering a high prime number first!
              </p>
            ) : (
              <ol className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1 text-xs">
                {[...game.moves].reverse().map((m) => (
                  <li
                    key={m.turnNumber}
                    className="flex items-center justify-between gap-2 border-b border-[#F1EDE4] pb-2 last:border-b-0 last:pb-0 font-mono tabular-nums"
                  >
                    <span className="truncate font-sans text-[#1C232B]">
                      <span className="font-mono text-[#5A6572]">
                        #{m.turnNumber}
                      </span>{' '}
                      <strong>{m.actorName}</strong> took{' '}
                      <span className="font-mono font-semibold">
                        {m.claimedTile}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[#5A6572]">
                      +{m.claimPoints} / −{m.surrenderedPoints}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {/* End-of-Game Summary Modal */}
      {game.status === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C232B]/45 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="card-tactile w-full max-w-md rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
              {game.winner === 'p1' ? (
                <>
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  <span>Victory · Match Recorded in Notebook</span>
                </>
              ) : game.winner === 'draw' ? (
                <>
                  <Sparkles className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
                  <span className="text-[#B45309]">Exact Draw · Match Recorded</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-[#BE123C]" aria-hidden="true" />
                  <span className="text-[#BE123C]">
                    {game.player2Name} Won · Match Recorded
                  </span>
                </>
              )}
            </div>

            <h2
              id="gameover-title"
              className="mt-2 font-display text-2xl font-semibold text-[#1C232B]"
            >
              {game.winner === 'p1'
                ? `${game.player1Name} conquered the grid!`
                : game.winner === 'draw'
                  ? 'Dead heat on the Factor Grid!'
                  : `${game.player2Name} claimed the higher total.`}
            </h2>

            <p className="mt-2 text-sm text-[#46515E]">{game.lastInsight}</p>

            <div className="mt-5 grid grid-cols-3 gap-2.5 border-y border-[#ECE7DD] py-4 text-center font-mono tabular-nums">
              <div>
                <p className="font-sans text-[11px] text-[#5A6572]">
                  {game.player1Name}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#1D4ED8]">
                  {game.scores.p1}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] text-[#5A6572]">
                  {game.player2Name}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#8A5108]">
                  {game.scores.p2}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] text-[#5A6572]">
                  Best Swing
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#047857]">
                  +{biggestSwing}
                </p>
              </div>
            </div>

            {newlyUnlockedSeals.length > 0 && (
              <div
                data-testid="gameover-unlocked-seals"
                className="mt-4 rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[#B45309]">
                    {newlyUnlockedSeals.length === 1
                      ? 'New Mastery Seal Unlocked'
                      : `${newlyUnlockedSeals.length} New Mastery Seals Unlocked`}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenNotebook}
                    className="text-[11px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] underline underline-offset-2 whitespace-nowrap"
                  >
                    View in Notebook
                  </button>
                </div>
                <div className="mt-2.5 space-y-2">
                  {newlyUnlockedSeals.map((seal) => (
                    <div
                      key={seal.id}
                      className="flex items-center gap-3 text-left"
                    >
                      <AchievementSealIcon
                        id={seal.id}
                        accent={seal.accent}
                        earned
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-[#1C232B]">
                          {seal.title}
                        </p>
                        <p className="truncate text-[11px] text-[#5A6572]">
                          {seal.criteriaNote}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewMatch()}
                className="btn-cobalt flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => setStage('setup')}
                className="rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] transition-colors whitespace-nowrap"
              >
                Change Mode
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
