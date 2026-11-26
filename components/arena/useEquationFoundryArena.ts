import { AiArenaProps, TOTAL_ROUNDS } from './arena-shared';
import { useRoundProgress } from './useRoundProgress';
import { type AchievementDefinition } from '@/lib/achievements';
import { buildFoundryMatchRecord, computeAiFoundryScore, evaluateFoundryTokens, formatFoundryTokens, generateFoundryPuzzle, scoreFoundrySubmission, type FoundryOperator, type FoundryPuzzle, type FoundryRoundOutcome, type FoundryTile, type FoundryToken } from '@/lib/equation-foundry-engine';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { playArithmeticFeedbackSound, playTileClaimSound, playVictoryChord } from '@/lib/sound';
import { type AgeTier, type AiDifficulty, type PlayMode } from '@/lib/types';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type EquationFoundryArenaProps = AiArenaProps;

export function useEquationFoundryArena(props: EquationFoundryArenaProps) {
  const {
    ageTier, onChangeTier, playerName, soundEnabled, onToggleSound,
    onBackToStudio, onOpenNotebook, onRecordMatch,
    guestTrialLocked = false,
    onRequireRegistration,
  } = props;
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

  useRoundProgress(
    props.onRoundProgress,
    phase === 'playing',
    history.filter((h) => h.exact).length,
    history.length
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
      ageTier, guestTrialLocked, onRequireRegistration, sessionSeed,
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
    aiDifficulty, evaluation, hintRevealed, mode, puzzle, roundNumber,
    roundRevealed, soundEnabled, tokens,
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
    ageTier, aiDifficulty, aiTotal, history, mode, onRecordMatch, playerTotal,
    roundNumber, roundRevealed, sessionSeed, soundEnabled,
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
    handleBackspace, handleNextRound, handleSubmitRound, phase, roundRevealed,
  ]);

  const exactHitsCount = history.filter((h) => h.exact).length;

  return {
    ...props,
    activeTierSpec, aiDifficulty, aiTotal, currentDelta, evaluation,
    exactHitsCount, exactMatchNow, handleBackspace, handleClearBench,
    handleNextRound, handleRemoveTokenAt, handleSelectOperator,
    handleSelectTile, handleSubmitRound, hintRevealed, history, mode, phase,
    playerTotal, prefersReducedMotion, puzzle, roundNumber, roundRevealed,
    setAiDifficulty, setHintRevealed, setMode, setPhase, setStepsRevealed,
    startSession, stepsRevealed, tokens, unlockedBadges, usedTileSet,
  };
}

export type FoundryCtx = ReturnType<typeof useEquationFoundryArena>;
