import { AiArenaProps, TOTAL_ROUNDS, TurnLogEntry } from './arena-shared';
import { type AchievementDefinition } from '@/lib/achievements';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { CHAMBER_SPECS, buildOddsUrnsMatchRecord, computeChamberOdds, createInitialSpinnerWheel, createInitialUrn, decideEvBotAction, evaluateOddsEstimate, executeChamberDraw, type DrawOutcome, type ProbabilityChamber, type SpinnerWheelState, type UrnMarble } from '@/lib/odds-urns-engine';
import { playArithmeticFeedbackSound, playTileClaimSound, playVictoryChord } from '@/lib/sound';
import { type AgeTier, type AiDifficulty, type PlayMode } from '@/lib/types';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type OddsUrnsArenaProps = AiArenaProps;

export function useOddsUrnsArena(props: OddsUrnsArenaProps) {
  const {
    ageTier, onChangeTier, playerName, soundEnabled, onToggleSound,
    onBackToStudio, onOpenNotebook, onRecordMatch,
    guestTrialLocked = false,
    onRequireRegistration,
  } = props;
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
        urnMarbles, spinnerWheel, currentPot,
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
          actor, message, tone,
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
        mode, aiDifficulty, chamber,
        playerScore: finalPlayerScore,
        opponentScore: targetOpponentScore,
        solvedRounds: calibrationHits,
      });
      const newlyUnlocked = onRecordMatch(record);
      setUnlockedBadges(newlyUnlocked);
      setPhase('finished');
      playVictoryChord(soundEnabled);
    },
    [
      ageTier, aiDifficulty, calibrationHits, chamber, clearBotTimer, mode,
      onRecordMatch, soundEnabled,
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
      ageTier, chamber, clearBotTimer, guestTrialLocked, onRequireRegistration,
      resetChamberForTurn, soundEnabled,
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
    playerName, soundEnabled, turnOwner,
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
    advanceAfterPlayerTurn, ageTier, appendLog, chamber, currentPot, phase,
    playerName, playerScore, soundEnabled, spinnerWheel, turnOwner, urnMarbles,
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
    advanceAfterPlayerTurn, appendLog, currentPot, phase, playerName,
    playerScore, soundEnabled, turnOwner,
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
    ageTier, aiDifficulty, appendLog, botScore, chamber, clearBotTimer,
    currentPot, drawsThisTurn, finishMatch, odds, phase, playerScore,
    resetChamberForTurn, roundNumber, soundEnabled, spinnerWheel, turnOwner,
    urnMarbles,
  ]);

  return {
    ...props,
    activeTierSpec, aiDifficulty, botScore, calibrationHits, chamber,
    chamberSpec, currentPot, drawnMarbles, estimateFeedback, estimateSlider,
    handleLockEstimate, handlePlayerBank, handlePlayerPress, lastDice,
    lastOutcome, mode, odds, phase, playerScore, prefersReducedMotion,
    roundNumber, setAiDifficulty, setChamber, setEstimateSlider, setMode,
    setPhase, setShowEvCoach, showEvCoach, spinnerRotation, spinnerWheel,
    startSession, turnLog, turnOwner, unlockedBadges, urnMarbles,
  };
}

export type OddsUrnsCtx = ReturnType<typeof useOddsUrnsArena>;
