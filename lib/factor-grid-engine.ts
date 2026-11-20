import type {
  AgeTier,
  AiDifficulty,
  FactorGameState,
  FactorMovePreview,
  FactorMoveRecord,
  FactorVariant,
  NumberClassification,
  PlayMode,
  TierSpec,
  TileOwner,
} from './types';

export const TIER_SPECS: Record<AgeTier, TierSpec> = {
  explorers: {
    id: 'explorers',
    label: 'Explorers',
    ageRange: 'Ages 8–10',
    boardMax: 20,
    columns: 5,
    arithmeticSummary: 'Addition, subtraction & early multiplication (targets 12–48)',
    probabilitySummary: 'Single urns & fair dice odds with visual marble counts',
    numberTheorySummary: 'Factor Grid 1–20 with guided divisor previews',
  },
  challengers: {
    id: 'challengers',
    label: 'Challengers',
    ageRange: 'Ages 11–13',
    boardMax: 36,
    columns: 6,
    arithmeticSummary: 'All four operations & parentheses (targets 30–140)',
    probabilitySummary: 'Sampling with/without replacement & twin-dice sums',
    numberTheorySummary: 'Factor Grid 1–36 exploring primes & abundant traps',
  },
  strategists: {
    id: 'strategists',
    label: 'Strategists',
    ageRange: 'Ages 14–16',
    boardMax: 49,
    columns: 7,
    arithmeticSummary: 'Multi-step expressions, integers & powers (targets 60–320)',
    probabilitySummary: 'Conditional probability chambers & expected value E[X]',
    numberTheorySummary: 'Factor Grid 1–49 with deep Minimax number theory strategy',
  },
};

export const PRIME_TRAP_BONUS = 3;

export function getProperDivisors(n: number): number[] {
  if (n <= 1) return [];
  const divisors: number[] = [1];
  const limit = Math.floor(Math.sqrt(n));
  for (let d = 2; d <= limit; d++) {
    if (n % d === 0) {
      divisors.push(d);
      const pair = n / d;
      if (pair !== d && pair < n) {
        divisors.push(pair);
      }
    }
  }
  return divisors.sort((a, b) => a - b);
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  const limit = Math.floor(Math.sqrt(n));
  for (let d = 3; d <= limit; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

export function classifyNumber(n: number): NumberClassification {
  const properDivisors = getProperDivisors(n);
  const divisorSum = properDivisors.reduce((acc, d) => acc + d, 0);

  if (n === 1) {
    return {
      value: 1,
      kind: 'unit',
      properDivisors: [],
      divisorSum: 0,
      summary: '1 is the unit divisor — it unlocks every prime number on the board.',
    };
  }

  if (isPrime(n)) {
    return {
      value: n,
      kind: 'prime',
      properDivisors,
      divisorSum,
      summary: `${n} is prime — its only proper divisor is 1, making it a high-efficiency claim while 1 is open.`,
    };
  }

  if (divisorSum === n) {
    return {
      value: n,
      kind: 'perfect',
      properDivisors,
      divisorSum,
      summary: `${n} is a perfect number — its proper divisors (${properDivisors.join(', ')}) sum to exactly ${n}.`,
    };
  }

  if (divisorSum > n) {
    return {
      value: n,
      kind: 'abundant',
      properDivisors,
      divisorSum,
      summary: `${n} is abundant — its proper divisors sum to ${divisorSum}, which is larger than ${n} itself!`,
    };
  }

  return {
    value: n,
    kind: 'deficient',
    properDivisors,
    divisorSum,
    summary: `${n} is deficient — its proper divisors sum to ${divisorSum}, leaving a positive net gain even on a fresh board.`,
  };
}

export interface CreateGameOptions {
  tier: AgeTier;
  mode: PlayMode;
  aiDifficulty?: AiDifficulty;
  variant?: FactorVariant;
  player1Name?: string;
  player2Name?: string;
}

export function createFactorGame(options: CreateGameOptions): FactorGameState {
  const spec = TIER_SPECS[options.tier];
  const tiles: Record<number, TileOwner> = {};
  for (let i = 1; i <= spec.boardMax; i++) {
    tiles[i] = 'unclaimed';
  }

  const aiDifficulty = options.aiDifficulty ?? 'scholar';
  const variant = options.variant ?? 'classic';
  const player1Name = options.player1Name?.trim() || 'You';
  let player2Name = options.player2Name?.trim() || 'Player 2';

  if (options.mode === 'solo') {
    player2Name = 'The Taxman';
  } else if (options.mode === 'vs-ai') {
    const labelMap: Record<AiDifficulty, string> = {
      apprentice: 'AI · Apprentice',
      scholar: 'AI · Scholar',
      master: 'AI · Master',
    };
    player2Name = labelMap[aiDifficulty];
  }

  return {
    tier: options.tier,
    boardMax: spec.boardMax,
    mode: options.mode,
    aiDifficulty,
    variant,
    player1Name,
    player2Name,
    tiles,
    scores: { p1: 0, p2: 0 },
    primesClaimed: { p1: 0, p2: 0 },
    currentTurn: 'p1',
    status: 'playing',
    winner: null,
    moves: [],
    lastInsight:
      options.mode === 'solo'
        ? 'Pick any number that still has at least one unclaimed proper divisor. Unclaimed leftovers go to The Taxman at the end.'
        : 'Hover any number to preview which proper divisors your opponent will capture automatically.',
    sweptTiles: [],
  };
}

export function getUnclaimedProperDivisors(
  state: Pick<FactorGameState, 'tiles'>,
  n: number
): number[] {
  return getProperDivisors(n).filter((d) => state.tiles[d] === 'unclaimed');
}

export function isLegalMove(
  state: Pick<FactorGameState, 'tiles' | 'status'>,
  n: number
): boolean {
  if (state.status !== 'playing') return false;
  if (state.tiles[n] !== 'unclaimed') return false;
  return getUnclaimedProperDivisors(state, n).length > 0;
}

export function getLegalMoves(
  state: Pick<FactorGameState, 'tiles' | 'boardMax' | 'status'>
): number[] {
  if (state.status !== 'playing') return [];
  const legal: number[] = [];
  for (let n = 2; n <= state.boardMax; n++) {
    if (isLegalMove(state, n)) {
      legal.push(n);
    }
  }
  return legal;
}

export function previewMove(
  state: Pick<FactorGameState, 'tiles' | 'status' | 'variant'>,
  n: number
): FactorMovePreview {
  const classification = classifyNumber(n);
  const opponentDivisors = getUnclaimedProperDivisors(state, n);
  const legal = state.status === 'playing' && state.tiles[n] === 'unclaimed' && opponentDivisors.length > 0;
  const primeBonus =
    legal && state.variant === 'prime-trap' && classification.kind === 'prime'
      ? PRIME_TRAP_BONUS
      : 0;
  const claimPoints = n + primeBonus;
  const opponentPoints = opponentDivisors.reduce((acc, d) => acc + d, 0);
  const netSwing = claimPoints - opponentPoints;

  return {
    tile: n,
    legal,
    claimPoints,
    primeBonus,
    opponentDivisors,
    opponentPoints,
    netSwing,
    classification,
  };
}

function buildMoveInsight(
  actorName: string,
  preview: FactorMovePreview,
  opponentName: string
): string {
  const divList = preview.opponentDivisors.join(', ');
  const bonusText = preview.primeBonus > 0 ? ` (+${preview.primeBonus} Prime Trap bonus)` : '';
  if (preview.classification.kind === 'prime') {
    return `${actorName} claimed prime ${preview.tile}${bonusText}, surrendering only ${divList} to ${opponentName} (net ${preview.netSwing >= 0 ? '+' : ''}${preview.netSwing}).`;
  }
  if (preview.netSwing < 0) {
    return `${actorName} picked ${preview.tile}, but ${opponentName} swept ${preview.opponentPoints} pts in divisors (${divList}) for a ${preview.netSwing} swing.`;
  }
  return `${actorName} claimed ${preview.tile} (+${preview.claimPoints}) while ${opponentName} captured divisors {${divList}} (+${preview.opponentPoints}), net +${preview.netSwing}.`;
}

export function applyMove(state: FactorGameState, n: number): FactorGameState {
  if (!isLegalMove(state, n)) {
    return state;
  }

  const preview = previewMove(state, n);
  const actor = state.currentTurn;
  const opponent: 'p1' | 'p2' = actor === 'p1' ? 'p2' : 'p1';
  const actorName = actor === 'p1' ? state.player1Name : state.player2Name;
  const opponentName = opponent === 'p1' ? state.player1Name : state.player2Name;

  const nextTiles: Record<number, TileOwner> = { ...state.tiles };
  nextTiles[n] = actor;
  for (const d of preview.opponentDivisors) {
    nextTiles[d] = opponent;
  }

  const nextScores = {
    p1: state.scores.p1,
    p2: state.scores.p2,
  };
  nextScores[actor] += preview.claimPoints;
  nextScores[opponent] += preview.opponentPoints;

  const nextPrimes = {
    p1: state.primesClaimed.p1,
    p2: state.primesClaimed.p2,
  };
  if (preview.classification.kind === 'prime') {
    nextPrimes[actor] += 1;
  }

  const insight = buildMoveInsight(actorName, preview, opponentName);
  const moveRecord: FactorMoveRecord = {
    turnNumber: state.moves.length + 1,
    actor,
    actorName,
    claimedTile: n,
    claimPoints: preview.claimPoints,
    primeBonus: preview.primeBonus,
    surrenderedDivisors: preview.opponentDivisors,
    surrenderedPoints: preview.opponentPoints,
    netSwing: preview.netSwing,
    insight,
  };

  // Determine next turn: in Solo (Taxman) mode, p1 keeps choosing until no legal moves remain.
  const nextTurn: 'p1' | 'p2' = state.mode === 'solo' ? 'p1' : opponent;

  const draftState: FactorGameState = {
    ...state,
    tiles: nextTiles,
    scores: nextScores,
    primesClaimed: nextPrimes,
    currentTurn: nextTurn,
    moves: [...state.moves, moveRecord],
    lastInsight: insight,
  };

  const remainingLegal = getLegalMoves(draftState);
  if (remainingLegal.length > 0) {
    return draftState;
  }

  // No legal moves left — handle endgame sweep
  const sweptTiles: number[] = [];
  if (state.mode === 'solo') {
    let sweepSum = 0;
    for (let k = 1; k <= state.boardMax; k++) {
      if (nextTiles[k] === 'unclaimed') {
        nextTiles[k] = 'p2';
        sweptTiles.push(k);
        sweepSum += k;
      }
    }
    nextScores.p2 += sweepSum;
  }

  let winner: 'p1' | 'p2' | 'draw' = 'draw';
  if (nextScores.p1 > nextScores.p2) winner = 'p1';
  else if (nextScores.p2 > nextScores.p1) winner = 'p2';

  const endSummary =
    state.mode === 'solo' && sweptTiles.length > 0
      ? `No legal factors remain — The Taxman collected ${sweptTiles.length} leftover tile${sweptTiles.length === 1 ? '' : 's'} (${sweptTiles.join(', ')}).`
      : `Board complete! No unclaimed number has an available proper divisor.`;

  return {
    ...draftState,
    tiles: nextTiles,
    scores: nextScores,
    status: 'gameover',
    winner,
    sweptTiles,
    lastInsight: `${insight} ${endSummary}`,
  };
}

function evaluateBoardFor(state: FactorGameState, perspective: 'p1' | 'p2'): number {
  const diff =
    perspective === 'p1'
      ? state.scores.p1 - state.scores.p2
      : state.scores.p2 - state.scores.p1;
  return diff;
}

function alphabeta(
  state: FactorGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingFor: 'p1' | 'p2'
): number {
  if (depth === 0 || state.status === 'gameover') {
    return evaluateBoardFor(state, maximizingFor);
  }

  const legal = getLegalMoves(state);
  if (legal.length === 0) {
    return evaluateBoardFor(state, maximizingFor);
  }

  // Order candidate moves by immediate net swing descending for better pruning
  const ordered = legal
    .map((n) => ({ n, swing: previewMove(state, n).netSwing }))
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 12);

  const isMax = state.currentTurn === maximizingFor;

  if (isMax) {
    let best = -Infinity;
    for (const { n } of ordered) {
      const child = applyMove(state, n);
      const val = alphabeta(child, depth - 1, alpha, beta, maximizingFor);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const { n } of ordered) {
      const child = applyMove(state, n);
      const val = alphabeta(child, depth - 1, alpha, beta, maximizingFor);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export interface SuggestedMove {
  tile: number;
  preview: FactorMovePreview;
  rationale: string;
}

export function chooseAiMove(
  state: FactorGameState,
  difficulty: AiDifficulty = state.aiDifficulty
): SuggestedMove | null {
  const legal = getLegalMoves(state);
  if (legal.length === 0) return null;

  const scored = legal.map((n) => ({
    tile: n,
    preview: previewMove(state, n),
  }));
  scored.sort((a, b) => b.preview.netSwing - a.preview.netSwing || b.tile - a.tile);

  if (difficulty === 'apprentice') {
    // Pick a solid but beatable move from the middle-upper band (deterministic index based on turn)
    const bandSize = Math.max(1, Math.min(4, Math.ceil(scored.length * 0.45)));
    const idx = Math.min(scored.length - 1, (state.moves.length + 1) % bandSize);
    const chosen = scored[idx];
    return {
      tile: chosen.tile,
      preview: chosen.preview,
      rationale: `Apprentice AI spotted ${chosen.tile} for a ${chosen.preview.netSwing >= 0 ? '+' : ''}${chosen.preview.netSwing} point swing.`,
    };
  }

  if (difficulty === 'scholar') {
    // 1-ply greedy with bonus preference for claiming largest prime while 1 is open
    const chosen = scored[0];
    return {
      tile: chosen.tile,
      preview: chosen.preview,
      rationale:
        chosen.preview.classification.kind === 'prime'
          ? `Scholar AI locked in prime ${chosen.tile} while 1 was still open (+${chosen.preview.netSwing} net).`
          : `Scholar AI chose ${chosen.tile} to maximize immediate net gain (${chosen.preview.netSwing >= 0 ? '+' : ''}${chosen.preview.netSwing}).`,
    };
  }

  // Master: Alpha-Beta Minimax search (depth 3 on larger boards, 4 when <= 14 legal moves)
  const depth = legal.length <= 14 ? 4 : 3;
  const aiActor = state.currentTurn;
  let bestChoice = scored[0];
  let bestScore = -Infinity;

  const candidates = scored.slice(0, 14);
  for (const candidate of candidates) {
    const child = applyMove(state, candidate.tile);
    const val = alphabeta(child, depth - 1, -Infinity, Infinity, aiActor);
    if (
      val > bestScore ||
      (val === bestScore && candidate.preview.netSwing > bestChoice.preview.netSwing)
    ) {
      bestScore = val;
      bestChoice = candidate;
    }
  }

  const rationale =
    bestChoice.preview.classification.kind === 'prime'
      ? `Master AI calculated ${bestChoice.tile} (prime) gives the strongest multi-turn lead (+${bestChoice.preview.netSwing} net).`
      : `Master AI evaluated ${depth} moves ahead and selected ${bestChoice.tile} to restrict your divisor replies.`;

  return {
    tile: bestChoice.tile,
    preview: bestChoice.preview,
    rationale,
  };
}

export function getBestHintMove(state: FactorGameState): SuggestedMove | null {
  const legal = getLegalMoves(state);
  if (legal.length === 0) return null;

  if (state.mode === 'solo') {
    // For Taxman solo mode, recommend high net swing while preserving small divisors when possible
    const scored = legal
      .map((n) => {
        const preview = previewMove(state, n);
        // Prefer claiming numbers that surrender few divisors (especially primes first!)
        const efficiencyBonus = preview.opponentDivisors.length === 1 ? 6 : 0;
        return {
          tile: n,
          preview,
          heuristic: preview.netSwing + efficiencyBonus,
        };
      })
      .sort((a, b) => b.heuristic - a.heuristic || b.tile - a.tile);

    const best = scored[0];
    return {
      tile: best.tile,
      preview: best.preview,
      rationale:
        best.preview.classification.kind === 'prime'
          ? `Try ${best.tile}: it is the highest open prime and only surrenders 1 to The Taxman (+${best.preview.netSwing} net).`
          : `Try ${best.tile}: you gain +${best.preview.claimPoints} while surrendering only {${best.preview.opponentDivisors.join(', ')}} (+${best.preview.opponentPoints}).`,
    };
  }

  const suggestion = chooseAiMove(state, 'master');
  if (!suggestion) return null;

  return {
    ...suggestion,
    rationale:
      suggestion.preview.classification.kind === 'prime'
        ? `Hint: Claim prime ${suggestion.tile} now while 1 is open — net swing +${suggestion.preview.netSwing}.`
        : `Hint: ${suggestion.tile} gives a strong net swing (${suggestion.preview.netSwing >= 0 ? '+' : ''}${suggestion.preview.netSwing}) and limits opponent counter-moves.`,
  };
}

export function generatePrototypeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}
