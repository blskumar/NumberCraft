import { ArenaBaseProps, StageView } from './arena-shared';
import { type AchievementDefinition } from '@/lib/achievements';
import { TIER_SPECS, applyMove, chooseAiMove, classifyNumber, createFactorGame, getBestHintMove, getLegalMoves, isLegalMove, previewMove } from '@/lib/factor-grid-engine';
import { playAchievementChime, playFactorGridMoveSound, playTileClaimSound, playVictoryChord } from '@/lib/sound';
import { type AgeTier, type AiDifficulty, type FactorGameState, type FactorVariant, type MatchRecord, type PlayMode } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface FactorGridPrototypeProps extends ArenaBaseProps {
  onOpenRooms: () => void;
  onRecordMatch: (record: MatchRecord) => AchievementDefinition[];
  autoStart?: boolean;
  guestTrialLocked?: boolean;
  onRequireRegistration?: () => void;
}

export function useFactorGrid(props: FactorGridPrototypeProps) {
  const {
    ageTier, onChangeTier, playerName, soundEnabled, onToggleSound,
    onBackToStudio, onOpenRooms, onOpenNotebook, onRecordMatch,
    autoStart = false,
    guestTrialLocked = false,
    onRequireRegistration,
  } = props;
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
    if (guestTrialLocked) {
      onRequireRegistration?.();
      return;
    }
    const targetTier = overrideTier ?? ageTier;
    recordedMatchRef.current = false;
    setHoveredTile(null);
    setHintTile(null);
    setHintNote(null);
    setNewlyUnlockedSeals([]);
    setGame(
      createFactorGame({
        tier: targetTier,
        mode, aiDifficulty, variant,
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
  return {
    activeActorName, activePreview, ageTier, aiDifficulty, aiThinking,
    biggestSwing, freshTilesSet, game, gridColsClass, guestTrialLocked,
    handleRequestHint, handleTileClick, highlightedDivisors, hintNote, hintTile,
    hoveredTile, inspectedNumber, legalMovesSet, mode, newlyUnlockedSeals,
    onBackToStudio, onChangeTier, onOpenNotebook, onOpenRooms,
    onRequireRegistration, onToggleSound, p1Input, p1SharePercent, p2Input,
    remainingLegalCount, scoreDiff, setAiDifficulty, setCustomP1Name,
    setHintNote, setHintTile, setHoveredTile, setMode, setP2Input, setStage,
    setVariant, setupSpec, soundEnabled, spec, stage, startNewMatch, tilesArray,
    variant,
  };
}

export type FactorGridCtx = ReturnType<typeof useFactorGrid>;
