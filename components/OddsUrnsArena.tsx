'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Compass,
  Dices,
  Eye,
  EyeOff,
  Landmark,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  buildOddsUrnsMatchRecord,
  CHAMBER_SPECS,
  computeChamberOdds,
  createInitialSpinnerWheel,
  createInitialUrn,
  decideEvBotAction,
  evaluateOddsEstimate,
  executeChamberDraw,
  type DrawOutcome,
  type MarbleKind,
  type ProbabilityChamber,
  type SpinnerWheelState,
  type UrnMarble,
} from '@/lib/odds-urns-engine';
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

interface OddsUrnsArenaProps {
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
const CHAMBER_ORDER: ProbabilityChamber[] = [
  'marble-urn',
  'twin-dice',
  'conditional-spinner',
];
const DIFFICULTIES: { id: AiDifficulty; label: string; desc: string }[] = [
  { id: 'apprentice', label: 'Apprentice', desc: 'Banks conservatively early' },
  { id: 'scholar', label: 'Scholar', desc: 'Balanced expected value play' },
  { id: 'master', label: 'Master', desc: 'Exact optimal EV ≥ 0 cutoff' },
];

const MARBLE_GRADIENTS: Record<MarbleKind, string> = {
  cobalt: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)',
  emerald: 'radial-gradient(circle at 32% 28%, #34D399, #047857 60%, #064E3B)',
  hazard: 'radial-gradient(circle at 32% 28%, #FB7185, #BE123C 60%, #881337)',
};

const DICE_PIP_COORDS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 25],
    [72, 25],
    [28, 50],
    [72, 50],
    [28, 75],
    [72, 75],
  ],
};

const DICE_SUM_WAYS: { sum: number; ways: number }[] = [
  { sum: 2, ways: 1 },
  { sum: 3, ways: 2 },
  { sum: 4, ways: 3 },
  { sum: 5, ways: 4 },
  { sum: 6, ways: 5 },
  { sum: 7, ways: 6 },
  { sum: 8, ways: 5 },
  { sum: 9, ways: 4 },
  { sum: 10, ways: 3 },
  { sum: 11, ways: 2 },
  { sum: 12, ways: 1 },
];

function MapleDie({ value, hazard }: { value: number; hazard: boolean }) {
  const pips = DICE_PIP_COORDS[value] ?? DICE_PIP_COORDS[1];
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_4px_6px_rgba(28,35,43,0.14)]"
      role="img"
      aria-label={`Die showing ${value}`}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="18"
        fill={hazard ? '#FFF1F2' : '#FFFDF8'}
        stroke={hazard ? '#BE123C' : '#C9BCA6'}
        strokeWidth="3.5"
      />
      {pips.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r="8.5"
          fill={hazard ? '#BE123C' : '#1C232B'}
        />
      ))}
    </svg>
  );
}

function ConditionalSpinnerSvg({
  wheel,
  rotationDeg,
  reducedMotion,
}: {
  wheel: SpinnerWheelState;
  rotationDeg: number;
  reducedMotion: boolean | null;
}) {
  const total = wheel.cobaltCount + wheel.emeraldCount + wheel.hazardCount;
  const sectors: { kind: MarbleKind; index: number }[] = [];
  for (let i = 0; i < wheel.cobaltCount; i++) {
    sectors.push({ kind: 'cobalt', index: sectors.length });
  }
  for (let i = 0; i < wheel.emeraldCount; i++) {
    sectors.push({ kind: 'emerald', index: sectors.length });
  }
  for (let i = 0; i < wheel.hazardCount; i++) {
    sectors.push({ kind: 'hazard', index: sectors.length });
  }

  const fillMap: Record<MarbleKind, string> = {
    cobalt: '#1D4ED8',
    emerald: '#047857',
    hazard: '#BE123C',
  };

  return (
    <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56">
      {/* Top brass pointer */}
      <div
        aria-hidden="true"
        className="absolute -top-1.5 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[15px] border-x-transparent border-t-[#1C232B]"
      />
      <motion.svg
        viewBox="0 0 200 200"
        animate={{ rotate: rotationDeg }}
        transition={
          reducedMotion
            ? { duration: 0.05 }
            : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
        }
        className="h-full w-full drop-shadow-[0_6px_12px_rgba(28,35,43,0.14)]"
        role="img"
        aria-label={`Conditional spinner wheel with ${wheel.cobaltCount} cobalt, ${wheel.emeraldCount} emerald, and ${wheel.hazardCount} crimson hazard sectors`}
      >
        {sectors.map((sec, i) => {
          const startAngle = (i * 360) / total - 90;
          const endAngle = ((i + 1) * 360) / total - 90;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 100 + 92 * Math.cos(startRad);
          const y1 = 100 + 92 * Math.sin(startRad);
          const x2 = 100 + 92 * Math.cos(endRad);
          const y2 = 100 + 92 * Math.sin(endRad);
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          const d = `M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 92 92 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
          return (
            <path
              key={i}
              d={d}
              fill={fillMap[sec.kind]}
              stroke="#FAF8F4"
              strokeWidth="2"
            />
          );
        })}
        <circle
          cx="100"
          cy="100"
          r="20"
          fill="#FAF8F4"
          stroke="#1C232B"
          strokeWidth="3"
        />
        <circle cx="100" cy="100" r="6" fill="#B45309" />
      </motion.svg>
    </div>
  );
}

interface TurnLogEntry {
  id: string;
  actor: string;
  message: string;
  tone: 'safe' | 'hazard' | 'bank' | 'bot';
}

export default function OddsUrnsArena({
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
}: OddsUrnsArenaProps) {
  const prefersReducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [chamber, setChamber] = useState<ProbabilityChamber>('marble-urn');
  const [mode, setMode] = useState<PlayMode>('vs-ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('scholar');

  const [roundNumber, setRoundNumber] = useState(1);
  const [turnOwner, setTurnOwner] = useState<'player' | 'bot'>('player');
  const [urnMarbles, setUrnMarbles] = useState<UrnMarble[]>(() =>
    createInitialUrn(ageTier)
  );
  const [drawnMarbles, setDrawnMarbles] = useState<UrnMarble[]>([]);
  const [spinnerWheel, setSpinnerWheel] = useState<SpinnerWheelState>(() =>
    createInitialSpinnerWheel(ageTier)
  );
  const [spinnerRotation, setSpinnerRotation] = useState(0);
  const [lastDice, setLastDice] = useState<[number, number]>([4, 2]);
  const [lastOutcome, setLastOutcome] = useState<DrawOutcome | null>(null);

  const [currentPot, setCurrentPot] = useState(0);
  const [drawsThisTurn, setDrawsThisTurn] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [calibrationHits, setCalibrationHits] = useState(0);

  // Estimate Odds calibration state (1 per player turn)
  const [estimateSlider, setEstimateSlider] = useState(70);
  const [estimateFeedback, setEstimateFeedback] = useState<{
    locked: boolean;
    accurate: boolean;
    errorMargin: number;
    bonusPoints: number;
    actual: number;
  } | null>(null);
  const [showEvCoach, setShowEvCoach] = useState(true);
  const [turnLog, setTurnLog] = useState<TurnLogEntry[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<AchievementDefinition[]>(
    []
  );

  const botTimerRef = useRef<number | null>(null);

  const activeTierSpec = TIER_SPECS[ageTier];
  const chamberSpec = CHAMBER_SPECS[chamber];

  const odds = useMemo(
    () =>
      computeChamberOdds({
        chamber,
        tier: ageTier,
        urnMarbles,
        spinnerWheel,
        currentPot,
      }),
    [ageTier, chamber, currentPot, spinnerWheel, urnMarbles]
  );

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearBotTimer, [clearBotTimer]);

  const appendLog = useCallback(
    (actor: string, message: string, tone: TurnLogEntry['tone']) => {
      setTurnLog((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          actor,
          message,
          tone,
        },
        ...prev.slice(0, 9),
      ]);
    },
    []
  );

  const resetChamberForTurn = useCallback(
    (tier: AgeTier) => {
      setUrnMarbles(createInitialUrn(tier));
      setDrawnMarbles([]);
      setSpinnerWheel(createInitialSpinnerWheel(tier));
      setCurrentPot(0);
      setDrawsThisTurn(0);
      setEstimateFeedback(null);
    },
    []
  );

  const finishMatch = useCallback(
    (finalPlayerScore: number, finalBotScore: number) => {
      clearBotTimer();
      const targetOpponentScore =
        mode === 'solo' ? TOTAL_ROUNDS * 32 : finalBotScore;
      const record = buildOddsUrnsMatchRecord({
        tier: ageTier,
        mode,
        aiDifficulty,
        chamber,
        playerScore: finalPlayerScore,
        opponentScore: targetOpponentScore,
      });
      const newlyUnlocked = onRecordMatch(record);
      setUnlockedBadges(newlyUnlocked);
      setPhase('finished');
      playVictoryChord(soundEnabled);
    },
    [
      ageTier,
      aiDifficulty,
      chamber,
      clearBotTimer,
      mode,
      onRecordMatch,
      soundEnabled,
    ]
  );

  const startSession = useCallback(
    (nextTier: AgeTier = ageTier) => {
      if (guestTrialLocked) {
        onRequireRegistration?.();
        return;
      }
      clearBotTimer();
      setRoundNumber(1);
      setTurnOwner('player');
      resetChamberForTurn(nextTier);
      setLastOutcome(null);
      setLastDice([4, 2]);
      setSpinnerRotation(0);
      setPlayerScore(0);
      setBotScore(0);
      setCalibrationHits(0);
      setEstimateSlider(70);
      setUnlockedBadges([]);
      setTurnLog([
        {
          id: 'start',
          actor: 'Chamber Ready',
          message: `${CHAMBER_SPECS[chamber].title} initialized for ${TIER_SPECS[nextTier].label}.`,
          tone: 'safe',
        },
      ]);
      setPhase('playing');
      playTileClaimSound(soundEnabled, true);
    },
    [
      ageTier,
      chamber,
      clearBotTimer,
      guestTrialLocked,
      onRequireRegistration,
      resetChamberForTurn,
      soundEnabled,
    ]
  );

  const advanceAfterPlayerTurn = useCallback(
    (nextPlayerScore: number) => {
      if (mode === 'solo') {
        if (roundNumber >= TOTAL_ROUNDS) {
          finishMatch(nextPlayerScore, TOTAL_ROUNDS * 32);
          return;
        }
        setRoundNumber((r) => r + 1);
        resetChamberForTurn(ageTier);
        setTurnOwner('player');
        return;
      }

      // Hand over to EV Bot
      resetChamberForTurn(ageTier);
      setTurnOwner('bot');
    },
    [ageTier, finishMatch, mode, resetChamberForTurn, roundNumber]
  );

  const handleLockEstimate = useCallback(() => {
    if (turnOwner !== 'player' || estimateFeedback?.locked) return;
    const result = evaluateOddsEstimate(estimateSlider, odds.safePercent);
    setEstimateFeedback({
      locked: true,
      accurate: result.accurate,
      errorMargin: result.errorMargin,
      bonusPoints: result.bonusPoints,
      actual: odds.safePercent,
    });

    if (result.accurate) {
      setPlayerScore((prev) => prev + result.bonusPoints);
      setCalibrationHits((c) => c + 1);
      playArithmeticFeedbackSound(soundEnabled, 'streak');
      appendLog(
        playerName,
        `Calibrated safe odds at ${estimateSlider}% (exact ${odds.safePercent}%, ±${result.errorMargin}%) → +10 bonus pts!`,
        'safe'
      );
    } else {
      playArithmeticFeedbackSound(soundEnabled, 'wrong');
      appendLog(
        playerName,
        `Estimated ${estimateSlider}% vs exact ${odds.safePercent}% (off by ${result.errorMargin}%).`,
        'bank'
      );
    }
  }, [
    appendLog,
    estimateFeedback?.locked,
    estimateSlider,
    odds.safePercent,
    playerName,
    soundEnabled,
    turnOwner,
  ]);

  const handlePlayerPress = useCallback(() => {
    if (phase !== 'playing' || turnOwner !== 'player') return;
    if (chamber === 'marble-urn' && urnMarbles.length === 0) return;

    const { outcome, nextUrn, nextSpinner } = executeChamberDraw({
      chamber,
      tier: ageTier,
      urnMarbles,
      spinnerWheel,
    });

    setLastOutcome(outcome);
    setUrnMarbles(nextUrn);
    setSpinnerWheel(nextSpinner);
    if (outcome.marble) {
      setDrawnMarbles((prev) => [...prev, outcome.marble!]);
    }
    if (outcome.dice) {
      setLastDice(outcome.dice);
    }
    if (typeof outcome.spinnerSector === 'number') {
      const total =
        spinnerWheel.cobaltCount +
        spinnerWheel.emeraldCount +
        spinnerWheel.hazardCount;
      const sectorAngle = 360 / total;
      const targetAngle = 360 - outcome.spinnerSector * sectorAngle - sectorAngle / 2;
      setSpinnerRotation((prev) => prev + 360 + ((targetAngle - (prev % 360) + 360) % 360));
    }

    if (!outcome.safe) {
      playArithmeticFeedbackSound(soundEnabled, 'wrong');
      appendLog(playerName, `${outcome.headline} Pot cleared.`, 'hazard');
      advanceAfterPlayerTurn(playerScore);
      return;
    }

    const nextPot = currentPot + outcome.pointsGained;
    setCurrentPot(nextPot);
    setDrawsThisTurn((d) => d + 1);
    playArithmeticFeedbackSound(
      soundEnabled,
      outcome.pointsGained >= 20 ? 'streak' : 'correct'
    );
    appendLog(
      playerName,
      `${outcome.headline} Unbanked pot is now ${nextPot} pts.`,
      'safe'
    );

    // If urn has no safe marbles remaining, auto-bank safely
    const remainingSafe =
      chamber === 'marble-urn'
        ? nextUrn.filter((m) => m.kind !== 'hazard').length
        : 1;
    if (remainingSafe === 0) {
      const nextScore = playerScore + nextPot;
      setPlayerScore(nextScore);
      appendLog(
        playerName,
        `Cleared every safe marble! Auto-banked +${nextPot} pts.`,
        'bank'
      );
      advanceAfterPlayerTurn(nextScore);
    }
  }, [
    advanceAfterPlayerTurn,
    ageTier,
    appendLog,
    chamber,
    currentPot,
    phase,
    playerName,
    playerScore,
    soundEnabled,
    spinnerWheel,
    turnOwner,
    urnMarbles,
  ]);

  const handlePlayerBank = useCallback(() => {
    if (phase !== 'playing' || turnOwner !== 'player' || currentPot <= 0) return;
    const nextScore = playerScore + currentPot;
    setPlayerScore(nextScore);
    playArithmeticFeedbackSound(soundEnabled, 'stage-up');
    appendLog(
      playerName,
      `Banked +${currentPot} pts safely (total ${nextScore} pts).`,
      'bank'
    );
    advanceAfterPlayerTurn(nextScore);
  }, [
    advanceAfterPlayerTurn,
    appendLog,
    currentPot,
    phase,
    playerName,
    playerScore,
    soundEnabled,
    turnOwner,
  ]);

  // Explainable EV Bot automated turn playback
  useEffect(() => {
    if (phase !== 'playing' || turnOwner !== 'bot') return;

    botTimerRef.current = window.setTimeout(() => {
      const decision = decideEvBotAction({
        odds,
        currentPot,
        difficulty: aiDifficulty,
        drawsThisTurn,
      });

      if (decision.action === 'bank' || (chamber === 'marble-urn' && urnMarbles.length === 0)) {
        const nextBotTotal = botScore + currentPot;
        setBotScore(nextBotTotal);
        appendLog('EV Bot', decision.reasoning, 'bot');
        playTileClaimSound(soundEnabled, true);

        if (roundNumber >= TOTAL_ROUNDS) {
          finishMatch(playerScore, nextBotTotal);
        } else {
          setRoundNumber((r) => r + 1);
          resetChamberForTurn(ageTier);
          setTurnOwner('player');
        }
        return;
      }

      // Bot presses!
      appendLog('EV Bot', decision.reasoning, 'bot');
      const { outcome, nextUrn, nextSpinner } = executeChamberDraw({
        chamber,
        tier: ageTier,
        urnMarbles,
        spinnerWheel,
      });

      setLastOutcome(outcome);
      setUrnMarbles(nextUrn);
      setSpinnerWheel(nextSpinner);
      if (outcome.marble) {
        setDrawnMarbles((prev) => [...prev, outcome.marble!]);
      }
      if (outcome.dice) {
        setLastDice(outcome.dice);
      }
      if (typeof outcome.spinnerSector === 'number') {
        setSpinnerRotation((prev) => prev + 280);
      }

      if (!outcome.safe) {
        playArithmeticFeedbackSound(soundEnabled, 'wrong');
        appendLog('EV Bot', `${outcome.headline} Bot busts 0 pts.`, 'hazard');
        if (roundNumber >= TOTAL_ROUNDS) {
          finishMatch(playerScore, botScore);
        } else {
          setRoundNumber((r) => r + 1);
          resetChamberForTurn(ageTier);
          setTurnOwner('player');
        }
        return;
      }

      playTileClaimSound(soundEnabled, false);
      setCurrentPot((p) => p + outcome.pointsGained);
      setDrawsThisTurn((d) => d + 1);
    }, 650);

    return clearBotTimer;
  }, [
    ageTier,
    aiDifficulty,
    appendLog,
    botScore,
    chamber,
    clearBotTimer,
    currentPot,
    drawsThisTurn,
    finishMatch,
    odds,
    phase,
    playerScore,
    resetChamberForTurn,
    roundNumber,
    soundEnabled,
    spinnerWheel,
    turnOwner,
    urnMarbles,
  ]);

  return (
    <main
      data-testid="odds-urns-arena"
      className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 lg:px-8"
    >
      {/* Top Studio Header */}
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
            <p className="font-mono text-[11px] font-semibold text-[#047857]">
              Set 02 · Modular Probability Lab
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              Odds &amp; Urns
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
            <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
              <Dices className="h-4 w-4" aria-hidden="true" />
              <span>5-Round Probability &amp; Expected Value Match</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#1C232B] sm:text-3xl">
              Read live odds, estimate fractions, and know when to bank.
            </h2>
            <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-[#46515E]">
              Choose one of three tactile probability chambers. Every turn, you
              can lock an optional Safe-Odds estimate for a +10 pt calibration
              bonus, then press for higher rewards or bank before a hazard hits.
            </p>

            {/* Chamber Picker */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                1. Select Probability Chamber
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CHAMBER_ORDER.map((cid) => {
                  const spec = CHAMBER_SPECS[cid];
                  const selected = chamber === cid;
                  const Icon =
                    cid === 'marble-urn'
                      ? Sparkles
                      : cid === 'twin-dice'
                        ? Dices
                        : Compass;
                  return (
                    <button
                      key={cid}
                      type="button"
                      data-testid={`odds-chamber-${cid}`}
                      aria-pressed={selected}
                      onClick={() => setChamber(cid)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] shadow-[0_2px_0_#BFDBFE]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          selected ? 'text-[#1D4ED8]' : 'text-[#5A6572]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="mt-2 text-sm font-semibold text-[#1C232B]">
                        {spec.title}
                      </span>
                      <span className="mt-0.5 text-xs text-[#5A6572]">
                        {spec.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tier Selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                2. Adaptive Age Tier
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeTier(t)}
                      className={`rounded-xl border px-3.5 py-3 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1C232B]'
                          : 'border-[#E2DCCF] bg-white text-[#46515E] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#1C232B]">
                        {spec.label} · {spec.ageRange}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6572]">
                        {t === 'explorers'
                          ? 'With replacement · gentle hazards'
                          : t === 'challengers'
                            ? 'Without replacement · live shifts'
                            : 'Full EV analysis · tighter margins'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode & EV Bot Difficulty */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                3. Opponent Mode
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={mode === 'vs-ai'}
                  onClick={() => setMode('vs-ai')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    mode === 'vs-ai'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      vs. Explainable EV Bot
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Watch the Bot explain every Press/Bank choice in plain
                      English using expected value.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    mode === 'solo'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      Solo Probability Lab
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Explore 5 rounds against EV Par (160 pts) with zero
                      turn pressure.
                    </p>
                  </div>
                </button>
              </div>

              {mode === 'vs-ai' && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={aiDifficulty === d.id}
                      onClick={() => setAiDifficulty(d.id)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                        aiDifficulty === d.id
                          ? 'border-[#1D4ED8] bg-white text-[#1C232B] shadow-[0_2px_0_#D8D0C0]'
                          : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#5A6572]'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#1C232B]">
                        {d.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6572]">
                        {d.desc}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="start-odds-btn"
                onClick={() => startSession(ageTier)}
                className="btn-cobalt inline-flex min-h-[46px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Open {chamberSpec.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="font-mono text-xs text-[#5A6572]">
                5 rounds · Live fractions + E[Press] coach
              </span>
            </div>
          </div>

          <aside className="card-tactile flex flex-col justify-between rounded-2xl bg-[#FFFDF9] p-6 lg:col-span-4">
            <div>
              <p className="font-mono text-xs font-semibold text-[#047857]">
                Active Chamber Briefing
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                {chamberSpec.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
                {chamberSpec.ruleSummary}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
              <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                Expected Value Formula
              </p>
              <p className="mt-1 font-mono text-xs text-[#1C232B]">
                E[Press] = P(Safe) × AvgGain − P(Hazard) × Pot
              </p>
              <p className="mt-1.5 text-xs text-[#5A6572]">
                When E[Press] drops below 0, banking protects your expected
                score over the long run.
              </p>
            </div>
          </aside>
        </section>
      )}

      {/* PHASE 2: ACTIVE GAMEPLAY */}
      {phase === 'playing' && (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Interactive Chamber Stage */}
          <div className="space-y-5 lg:col-span-7">
            {/* Score & Turn Banner */}
            <div className="card-tactile flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                  R{roundNumber}/{TOTAL_ROUNDS}
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                    {turnOwner === 'player'
                      ? `${playerName}’s Turn`
                      : 'EV Bot Calculating…'}
                  </p>
                  <p className="text-sm font-semibold text-[#1C232B]">
                    {chamberSpec.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 font-mono tabular-nums">
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                  <p className="text-lg font-semibold text-[#1D4ED8]">
                    {playerScore} pts
                  </p>
                </div>
                <div className="h-7 w-px bg-[#E5E0D5]" aria-hidden="true" />
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">
                    {mode === 'solo' ? 'EV Par' : 'EV Bot'}
                  </p>
                  <p className="text-lg font-semibold text-[#1C232B]">
                    {mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore} pts
                  </p>
                </div>
              </div>
            </div>

            {/* Tactile Chamber Surface */}
            <div className="card-tactile rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE7DD] pb-4">
                <div>
                  <p className="font-mono text-[11px] text-[#5A6572]">
                    Unbanked Turn Pot
                  </p>
                  <p
                    data-testid="odds-current-pot"
                    className="font-mono text-3xl font-semibold text-[#B45309] tabular-nums"
                  >
                    {currentPot} pts
                  </p>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <p className="text-[11px] text-[#5A6572]">
                    Exact Safe Probability
                  </p>
                  <p className="text-lg font-semibold text-[#047857]">
                    {odds.safeNumerator}/{odds.denominator}{' '}
                    <span className="text-xs font-normal text-[#5A6572]">
                      ({odds.reducedFraction} · {odds.safePercent}%)
                    </span>
                  </p>
                </div>
              </div>

              {/* Chamber Visual */}
              <div className="mt-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-5">
                {chamber === 'marble-urn' && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6572]">
                      <span className="font-semibold text-[#1C232B]">
                        Remaining in Glass Urn ({urnMarbles.length} marbles)
                      </span>
                      <span className="font-mono">
                        {ageTier === 'explorers'
                          ? 'With Replacement'
                          : 'Without Replacement'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 py-2">
                      {urnMarbles.map((m) => (
                        <motion.div
                          key={m.id}
                          layout={!prefersReducedMotion}
                          className="flex flex-col items-center gap-1"
                        >
                          <span
                            aria-label={m.label}
                            className="h-10 w-10 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_8px_rgba(28,35,43,0.18)]"
                            style={{ background: MARBLE_GRADIENTS[m.kind] }}
                          />
                          <span className="font-mono text-[10px] font-semibold text-[#5A6572]">
                            {m.kind === 'hazard' ? 'HAZ' : `+${m.points}`}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {drawnMarbles.length > 0 && (
                      <div className="mt-4 border-t border-[#E5E0D5] pt-3">
                        <p className="font-mono text-[11px] text-[#5A6572]">
                          Drawn Tray This Turn:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {drawnMarbles.map((m, idx) => (
                            <span
                              key={`${m.id}-${idx}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DCCF] bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-[#1C232B]"
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ background: MARBLE_GRADIENTS[m.kind] }}
                              />
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {chamber === 'twin-dice' && (
                  <div>
                    <div className="flex items-center justify-center gap-5 py-2">
                      <MapleDie
                        value={lastDice[0]}
                        hazard={lastOutcome?.safe === false}
                      />
                      <span className="font-mono text-2xl font-semibold text-[#5A6572]">
                        +
                      </span>
                      <MapleDie
                        value={lastDice[1]}
                        hazard={lastOutcome?.safe === false}
                      />
                    </div>
                    <p className="mt-2 text-center font-mono text-xs text-[#5A6572]">
                      Last Roll Sum:{' '}
                      <strong className="text-[#1C232B]">
                        {lastDice[0] + lastDice[1]}
                      </strong>{' '}
                      · Hazard: Sum 7
                      {ageTier === 'strategists' ? ' or 1+1' : ''}
                    </p>

                    {/* 36-Outcome Distribution Bar Strip */}
                    <div className="mt-4 grid grid-cols-11 gap-1 pt-2">
                      {DICE_SUM_WAYS.map((bar) => {
                        const isHaz =
                          bar.sum === 7 ||
                          (ageTier === 'strategists' && bar.sum === 2);
                        const isOuter = bar.sum <= 4 || bar.sum >= 10;
                        return (
                          <div
                            key={bar.sum}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className="flex h-14 w-full items-end justify-center">
                              <div
                                className={`w-full rounded-t ${
                                  isHaz
                                    ? 'bg-[#BE123C]'
                                    : isOuter
                                      ? 'bg-[#047857]'
                                      : 'bg-[#1D4ED8]'
                                }`}
                                style={{ height: `${(bar.ways / 6) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-semibold text-[#1C232B] tabular-nums">
                              {bar.sum}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {chamber === 'conditional-spinner' && (
                  <div>
                    <ConditionalSpinnerSvg
                      wheel={spinnerWheel}
                      rotationDeg={spinnerRotation}
                      reducedMotion={prefersReducedMotion}
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 font-mono text-xs">
                      <span className="text-[#1D4ED8] font-semibold">
                        Cobalt (+14): {spinnerWheel.cobaltCount}/12
                      </span>
                      <span className="text-[#047857] font-semibold">
                        Emerald Boost (+22): {spinnerWheel.emeraldCount}/12
                      </span>
                      <span className="text-[#BE123C] font-semibold">
                        Hazard: {spinnerWheel.hazardCount}/12
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Latest Draw Feedback */}
              {lastOutcome && (
                <div
                  aria-live="polite"
                  className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                    lastOutcome.safe
                      ? 'border-[#047857]/35 bg-[#ECFDF5] text-[#065F46]'
                      : 'border-[#BE123C]/35 bg-[#FFF1F2] text-[#9F1239]'
                  }`}
                >
                  {lastOutcome.safe ? (
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-semibold">{lastOutcome.headline}</p>
                    <p className="mt-0.5 opacity-90">{lastOutcome.detail}</p>
                  </div>
                </div>
              )}

              {/* Primary Turn Actions */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  data-testid="odds-press-btn"
                  disabled={turnOwner !== 'player'}
                  onClick={handlePlayerPress}
                  className="btn-cobalt flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-45"
                >
                  <Dices className="h-4 w-4" aria-hidden="true" />
                  {chamber === 'marble-urn'
                    ? 'Draw Marble (Press)'
                    : chamber === 'twin-dice'
                      ? 'Roll Twin Dice (Press)'
                      : 'Spin Wheel (Press)'}
                </button>

                <button
                  type="button"
                  data-testid="odds-bank-btn"
                  disabled={turnOwner !== 'player' || currentPot <= 0}
                  onClick={handlePlayerBank}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#047857]/45 bg-[#ECFDF5] px-5 py-3 text-sm font-semibold text-[#047857] shadow-[0_2px_0_#A7F3D0] hover:bg-[#D1FAE5] disabled:opacity-40 transition-colors"
                >
                  <Landmark className="h-4 w-4" aria-hidden="true" />
                  Bank {currentPot} pts
                </button>
              </div>
            </div>
          </div>

          {/* Right: Calibration, EV Coach & Bot Reasoning Log */}
          <aside className="space-y-5 lg:col-span-5">
            {/* Probability Calibration Slider */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Estimate Safe Odds (+10 Calibration Bonus)
                </p>
                <span className="font-mono text-sm font-semibold text-[#1D4ED8] tabular-nums">
                  {estimateSlider}%
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5A6572]">
                Lock your percentage estimate within ±6% of the exact safe odds
                once per turn for +10 bonus points.
              </p>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                aria-label="Estimate safe draw percentage"
                disabled={turnOwner !== 'player' || Boolean(estimateFeedback?.locked)}
                value={estimateSlider}
                onChange={(e) => setEstimateSlider(Number(e.target.value))}
                className="mt-3 w-full accent-[#1D4ED8]"
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                {estimateFeedback?.locked ? (
                  <p
                    className={`text-xs font-semibold ${
                      estimateFeedback.accurate
                        ? 'text-[#047857]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    {estimateFeedback.accurate
                      ? `Spot-on! Exact ${estimateFeedback.actual}% (+10 pts)`
                      : `Exact was ${estimateFeedback.actual}% (off by ${estimateFeedback.errorMargin}%)`}
                  </p>
                ) : (
                  <span className="font-mono text-[11px] text-[#5A6572]">
                    0% (Certain Hazard) → 100% (Certain Safe)
                  </span>
                )}

                <button
                  type="button"
                  data-testid="odds-estimate-lock-btn"
                  disabled={turnOwner !== 'player' || Boolean(estimateFeedback?.locked)}
                  onClick={handleLockEstimate}
                  className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-[#1D4ED8] bg-[#EFF5FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] disabled:opacity-45 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Lock Estimate
                </button>
              </div>
            </div>

            {/* Live EV Coach */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Live Expected Value Coach
                </p>
                <button
                  type="button"
                  onClick={() => setShowEvCoach((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6572] hover:text-[#1D4ED8]"
                >
                  {showEvCoach ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Show
                    </>
                  )}
                </button>
              </div>

              {showEvCoach ? (
                <div className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                    <div className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-2.5">
                      <p className="text-[10px] text-[#5A6572]">Safe Odds</p>
                      <p className="mt-0.5 font-semibold text-[#047857]">
                        {odds.safePercent}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-2.5">
                      <p className="text-[10px] text-[#5A6572]">Hazard</p>
                      <p className="mt-0.5 font-semibold text-[#BE123C]">
                        {odds.hazardPercent}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-2.5">
                      <p className="text-[10px] text-[#5A6572]">E[Press]</p>
                      <p
                        className={`mt-0.5 font-semibold ${
                          odds.expectedValueDelta >= 0
                            ? 'text-[#1D4ED8]'
                            : 'text-[#B45309]'
                        }`}
                      >
                        {odds.expectedValueDelta >= 0 ? '+' : ''}
                        {odds.expectedValueDelta.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="rounded-lg border border-[#E5E0D5] bg-[#FAF8F4] px-3 py-2 font-mono text-[11px] text-[#334155]">
                    {odds.formulaExplanation}
                  </p>
                  <p className="text-xs text-[#46515E]">
                    EV Guidance:{' '}
                    <strong className="font-semibold text-[#1C232B]">
                      {odds.recommendation === 'press'
                        ? 'Positive expected value — pressing is favorable.'
                        : 'Negative expected value — banking protects your lead.'}
                    </strong>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#5A6572]">
                  EV Coach hidden for independent mental probability practice.
                </p>
              )}
            </div>

            {/* Explainable EV Bot & Chamber Log */}
            <div className="card-tactile rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#1C232B]">
                Turn &amp; EV Bot Reasoning Log
              </p>
              <ul
                data-testid="odds-turn-log"
                className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1"
              >
                {turnLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] px-3 py-2 text-xs"
                  >
                    <span
                      className={`font-semibold ${
                        entry.tone === 'hazard'
                          ? 'text-[#BE123C]'
                          : entry.tone === 'bot'
                            ? 'text-[#1D4ED8]'
                            : entry.tone === 'bank'
                              ? 'text-[#B45309]'
                              : 'text-[#047857]'
                      }`}
                    >
                      {entry.actor}:
                    </span>{' '}
                    <span className="text-[#46515E]">{entry.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      )}

      {/* PHASE 3: FINISHED SUMMARY */}
      {phase === 'finished' && (
        <section
          data-testid="odds-summary"
          className="card-tactile mt-7 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#047857]">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Odds &amp; Urns Complete · Saved to Mastery Notebook
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
                {playerScore > (mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore)
                  ? `Victory in ${chamberSpec.title}!`
                  : playerScore === (mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore)
                    ? 'Exact Tie — Perfectly Matched EV Discipline!'
                    : 'Match Complete — Review Your Expected Value Timing'}
              </h2>
            </div>

            <div className="flex items-center gap-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-5 py-3 font-mono tabular-nums">
              <div>
                <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                <p className="text-2xl font-semibold text-[#1D4ED8]">
                  {playerScore}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">
                  {mode === 'solo' ? 'EV Par' : 'EV Bot'}
                </p>
                <p className="text-2xl font-semibold text-[#1C232B]">
                  {mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore}
                </p>
              </div>
              <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-[#5A6572]">Calibrations</p>
                <p className="text-2xl font-semibold text-[#047857]">
                  {calibrationHits}/{TOTAL_ROUNDS}
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => startSession(ageTier)}
              className="btn-cobalt inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Play {chamberSpec.title} Again
            </button>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              Switch Chamber
            </button>
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D8D0C0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Open Mastery Notebook
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
