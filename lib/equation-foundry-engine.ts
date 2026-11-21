import type {
  AgeTier,
  AiDifficulty,
  MatchRecord,
  PlayMode,
} from './types';

export type FoundryOperator = '+' | '−' | '×' | '÷' | '(' | ')' | '²';

export type FoundryToken =
  | { kind: 'tile'; tileId: string; value: number }
  | { kind: 'op'; op: FoundryOperator };

export interface FoundryTile {
  id: string;
  value: number;
}

export interface FoundryEvaluationResult {
  valid: boolean;
  value: number | null;
  error?: string;
  usedTileIds: string[];
}

export interface FoundrySolverResult {
  expression: string;
  value: number;
  exact: boolean;
  distance: number;
  steps: string[];
}

export interface FoundryPuzzle {
  id: string;
  tier: AgeTier;
  roundNumber: number;
  target: number;
  tiles: FoundryTile[];
  allowedOperators: FoundryOperator[];
  solverSolution: FoundrySolverResult;
  hintText: string;
}

export interface FoundryRoundOutcome {
  roundNumber: number;
  target: number;
  playerExpression: string;
  playerValue: number | null;
  playerDistance: number;
  playerPoints: number;
  aiExpression: string;
  aiValue: number;
  aiPoints: number;
  exact: boolean;
  hintUsed: boolean;
}

export const FOUNDRY_OPERATORS_BY_TIER: Record<AgeTier, FoundryOperator[]> = {
  explorers: ['+', '−', '×'],
  challengers: ['+', '−', '×', '÷', '(', ')'],
  strategists: ['+', '−', '×', '÷', '(', ')', '²'],
};

function seededRandom(seed: number): () => number {
  // Hash the seed first: raw Park-Miller makes the first draws of small seeds near-constant.
  // (`| 0` also turns NaN into 0, so degenerate round numbers still give a usable stream.)
  let s = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0) % 2147483646 + 1;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  next();
  next();
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Pure recursive-descent arithmetic evaluator with exact PEMDAS precedence
 * and safe division-by-zero checks (zero eval / Function).
 */
export function evaluateFoundryTokens(
  tokens: FoundryToken[]
): FoundryEvaluationResult {
  const usedTileIds: string[] = [];
  const seenTiles = new Set<string>();

  if (tokens.length === 0) {
    return { valid: false, value: null, error: 'Add tiles to build an expression.', usedTileIds };
  }

  for (const tok of tokens) {
    if (tok.kind === 'tile') {
      if (seenTiles.has(tok.tileId)) {
        return {
          valid: false,
          value: null,
          error: 'Each number tile may only be used once.',
          usedTileIds,
        };
      }
      seenTiles.add(tok.tileId);
      usedTileIds.push(tok.tileId);
    }
  }

  if (usedTileIds.length === 0) {
    return {
      valid: false,
      value: null,
      error: 'Include at least one number tile.',
      usedTileIds,
    };
  }

  let pos = 0;

  const peek = (): FoundryToken | undefined => tokens[pos];
  const consume = (): FoundryToken => tokens[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (pos < tokens.length) {
      const next = peek();
      if (next?.kind === 'op' && (next.op === '+' || next.op === '−')) {
        consume();
        const right = parseTerm();
        left = next.op === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (pos < tokens.length) {
      const next = peek();
      if (next?.kind === 'op' && (next.op === '×' || next.op === '÷')) {
        consume();
        const right = parsePower();
        if (next.op === '÷') {
          if (Math.abs(right) < 1e-9) {
            throw new Error('Cannot divide by zero.');
          }
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parsePower(): number {
    let val = parsePrimary();
    while (pos < tokens.length) {
      const next = peek();
      if (next?.kind === 'op' && next.op === '²') {
        consume();
        val = val * val;
      } else {
        break;
      }
    }
    return val;
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) {
      throw new Error('Expression ends with an incomplete operator.');
    }
    if (tok.kind === 'tile') {
      consume();
      return tok.value;
    }
    if (tok.kind === 'op' && tok.op === '(') {
      consume();
      const val = parseExpression();
      const close = peek();
      if (!close || close.kind !== 'op' || close.op !== ')') {
        throw new Error('Missing closing parenthesis ).');
      }
      consume();
      return val;
    }
    throw new Error(`Unexpected operator "${tok.op}".`);
  }

  try {
    const raw = parseExpression();
    if (pos < tokens.length) {
      const stray = tokens[pos];
      const sym = stray.kind === 'tile' ? String(stray.value) : stray.op;
      return {
        valid: false,
        value: null,
        error: `Check placement near "${sym}".`,
        usedTileIds,
      };
    }
    if (!Number.isFinite(raw)) {
      return {
        valid: false,
        value: null,
        error: 'Value is out of bounds.',
        usedTileIds,
      };
    }
    const rounded = Math.round(raw * 1000) / 1000;
    return { valid: true, value: rounded, usedTileIds };
  } catch (err) {
    return {
      valid: false,
      value: null,
      error: err instanceof Error ? err.message : 'Incomplete expression.',
      usedTileIds,
    };
  }
}

export function formatFoundryTokens(tokens: FoundryToken[]): string {
  return tokens
    .map((t) => {
      if (t.kind === 'tile') return String(t.value);
      if (t.op === '(' || t.op === ')' || t.op === '²') return t.op;
      return ` ${t.op} `;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

interface SearchNode {
  value: number;
  expr: string;
  steps: string[];
  usedCount: number;
}

/**
 * Deterministic Expression Solver AI: explores valid arithmetic combinations
 * across subsets of the provided tiles to find an exact (or closest) expression.
 */
export function solveFoundryPuzzle(
  tiles: FoundryTile[],
  target: number,
  tier: AgeTier
): FoundrySolverResult {
  const allowDivision = tier !== 'explorers';
  const allowSquare = tier === 'strategists';

  let best: FoundrySolverResult = {
    expression: String(tiles[0]?.value ?? 0),
    value: tiles[0]?.value ?? 0,
    exact: (tiles[0]?.value ?? 0) === target,
    distance: Math.abs((tiles[0]?.value ?? 0) - target),
    steps: [`Start with ${tiles[0]?.value ?? 0}`],
  };

  function consider(node: SearchNode) {
    if (!Number.isInteger(node.value)) return;
    const dist = Math.abs(node.value - target);
    const better =
      dist < best.distance ||
      (dist === best.distance &&
        node.steps.length < best.steps.length);
    if (better) {
      best = {
        expression: node.expr,
        value: node.value,
        exact: dist === 0,
        distance: dist,
        steps: node.steps,
      };
    }
  }

  let expansions = 0;
  const MAX_EXPANSIONS = 3200;

  function dfs(pool: SearchNode[]) {
    if (best.exact && best.steps.length <= 3) return;
    if (expansions > MAX_EXPANSIONS) return;

    for (const item of pool) {
      consider(item);
      if (allowSquare && item.usedCount === 1 && item.value >= 2 && item.value <= 16 && !item.expr.includes('²')) {
        const sq = item.value * item.value;
        consider({
          value: sq,
          expr: `${item.expr}²`,
          steps: [...item.steps, `${item.expr}² = ${sq}`],
          usedCount: item.usedCount,
        });
      }
    }

    if (pool.length <= 1) return;

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        expansions++;
        if (expansions > MAX_EXPANSIONS) return;

        const a = pool[i];
        const b = pool[j];
        const rest = pool.filter((_, idx) => idx !== i && idx !== j);

        const wrap = (n: SearchNode) => (n.usedCount > 1 ? `(${n.expr})` : n.expr);
        const candidates: SearchNode[] = [];

        // Addition
        const sum = a.value + b.value;
        candidates.push({
          value: sum,
          expr: `${wrap(a)} + ${wrap(b)}`,
          steps: [...a.steps, ...b.steps, `${a.value} + ${b.value} = ${sum}`],
          usedCount: a.usedCount + b.usedCount,
        });

        // Subtraction (keep non-negative intermediate values for clean clarity)
        if (a.value >= b.value) {
          const diff = a.value - b.value;
          if (diff > 0) {
            candidates.push({
              value: diff,
              expr: `${wrap(a)} − ${wrap(b)}`,
              steps: [...a.steps, ...b.steps, `${a.value} − ${b.value} = ${diff}`],
              usedCount: a.usedCount + b.usedCount,
            });
          }
        } else {
          const diff = b.value - a.value;
          if (diff > 0) {
            candidates.push({
              value: diff,
              expr: `${wrap(b)} − ${wrap(a)}`,
              steps: [...b.steps, ...a.steps, `${b.value} − ${a.value} = ${diff}`],
              usedCount: a.usedCount + b.usedCount,
            });
          }
        }

        // Multiplication
        if (a.value !== 1 && b.value !== 1) {
          const prod = a.value * b.value;
          if (prod <= 600) {
            candidates.push({
              value: prod,
              expr: `${wrap(a)} × ${wrap(b)}`,
              steps: [...a.steps, ...b.steps, `${a.value} × ${b.value} = ${prod}`],
              usedCount: a.usedCount + b.usedCount,
            });
          }
        }

        // Exact integer division
        if (allowDivision) {
          if (b.value > 1 && a.value % b.value === 0) {
            const quot = a.value / b.value;
            candidates.push({
              value: quot,
              expr: `${wrap(a)} ÷ ${wrap(b)}`,
              steps: [...a.steps, ...b.steps, `${a.value} ÷ ${b.value} = ${quot}`],
              usedCount: a.usedCount + b.usedCount,
            });
          } else if (a.value > 1 && b.value % a.value === 0) {
            const quot = b.value / a.value;
            candidates.push({
              value: quot,
              expr: `${wrap(b)} ÷ ${wrap(a)}`,
              steps: [...b.steps, ...a.steps, `${b.value} ÷ ${a.value} = ${quot}`],
              usedCount: a.usedCount + b.usedCount,
            });
          }
        }

        for (const cand of candidates) {
          consider(cand);
          if (rest.length > 0) {
            dfs([...rest, cand]);
          }
        }
      }
    }
  }

  const initialNodes: SearchNode[] = tiles.map((t) => ({
    value: t.value,
    expr: String(t.value),
    steps: [],
    usedCount: 1,
  }));

  // Also seed one squared tile variant for Strategists
  if (allowSquare) {
    for (let i = 0; i < initialNodes.length; i++) {
      const base = initialNodes[i];
      if (base.value >= 4 && base.value <= 15) {
        const sq = base.value * base.value;
        const squaredPool = initialNodes.map((n, idx) =>
          idx === i
            ? {
                value: sq,
                expr: `${base.value}²`,
                steps: [`${base.value}² = ${sq}`],
                usedCount: 1,
              }
            : n
        );
        dfs(squaredPool);
        if (best.exact) break;
      }
    }
  }

  if (!best.exact) {
    dfs(initialNodes);
  }

  return best;
}

/**
 * Generates a guaranteed-solvable Equation Foundry puzzle tailored to the active age tier.
 */
export function generateFoundryPuzzle(
  tier: AgeTier,
  roundNumber: number,
  seedOffset = 0
): FoundryPuzzle {
  const rng = seededRandom(
    roundNumber * 997 +
      seedOffset * 131 +
      (tier === 'explorers' ? 17 : tier === 'challengers' ? 53 : 89)
  );
  const pick = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(rng() * arr.length)];

  const allowedOperators = FOUNDRY_OPERATORS_BY_TIER[tier];

  let nums: number[];
  let target: number;
  let hintText: string;
  let known: { expression: string; steps: string[] };

  if (tier === 'explorers') {
    // Construct a friendly guaranteed target: (a × b) ± c
    const a = pick([3, 4, 5, 6, 7, 8]);
    const b = pick([2, 3, 4, 5, 6]);
    const c = pick([2, 3, 4, 5, 6, 7, 8, 9]);
    const useAdd = rng() > 0.45 || a * b <= c + 6;
    target = useAdd ? a * b + c : a * b - c;
    const d = pick([1, 2, 3, 5, 7, 9]);
    const e = pick([4, 6, 8, 10]);
    nums = [a, b, c, d, e];
    known = {
      expression: `${a} × ${b} ${useAdd ? '+' : '−'} ${c}`,
      steps: [`${a} × ${b} = ${a * b}`, `${a * b} ${useAdd ? '+' : '−'} ${c} = ${target}`],
    };
    hintText = `Try multiplying ${a} × ${b} first (${a * b}), then ${useAdd ? 'add' : 'subtract'} ${c}.`;
  } else if (tier === 'challengers') {
    // Construct a guaranteed parenthesized target: (a + b) × c ± d
    const a = pick([4, 5, 6, 7, 8, 9]);
    const b = pick([3, 4, 5, 6, 7]);
    const c = pick([4, 5, 6, 7, 8, 9]);
    const d = pick([2, 3, 4, 5, 6, 8, 10]);
    const addD = rng() > 0.5;
    target = addD ? (a + b) * c + d : (a + b) * c - d;
    const e = pick([2, 3, 6, 12]);
    nums = [a, b, c, d, e];
    known = {
      expression: `(${a} + ${b}) × ${c} ${addD ? '+' : '−'} ${d}`,
      steps: [`${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${(a + b) * c}`, `${(a + b) * c} ${addD ? '+' : '−'} ${d} = ${target}`],
    };
    hintText = `Group (${a} + ${b}) = ${a + b}, multiply by ${c} to reach ${(a + b) * c}, then adjust by ${d}.`;
  } else {
    // Strategists: a² + (b × c) ± d
    const a = pick([7, 8, 9, 10, 11, 12, 13]);
    const b = pick([4, 5, 6, 7, 8]);
    const c = pick([3, 4, 5, 6, 7]);
    const d = pick([2, 3, 5, 6, 9, 12]);
    const addD = rng() > 0.45;
    target = addD ? a * a + b * c + d : a * a + b * c - d;
    const e = pick([2, 3, 4, 8]);
    nums = [a, b, c, d, e];
    known = {
      expression: `${a}² + ${b} × ${c} ${addD ? '+' : '−'} ${d}`,
      steps: [`${a}² = ${a * a}`, `${b} × ${c} = ${b * c}`, `${a * a + b * c} ${addD ? '+' : '−'} ${d} = ${target}`],
    };
    hintText = `Start with ${a}² = ${a * a}, then combine ${b} × ${c} (${b * c}) and adjust by ${d}.`;
  }

  // Deterministic shuffle of tile display order
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  const tiles: FoundryTile[] = nums.map((value, idx) => ({
    id: `r${roundNumber}-t${idx}`,
    value,
  }));

  // The search is capped, so fall back to the construction the puzzle was built from:
  // every generated puzzle is guaranteed solvable.
  const searched = solveFoundryPuzzle(tiles, target, tier);
  const solverSolution: FoundrySolverResult = searched.exact
    ? searched
    : { ...known, value: target, exact: true, distance: 0 };

  return {
    id: `foundry-${tier}-r${roundNumber}-${seedOffset}`,
    tier,
    roundNumber,
    target,
    tiles,
    allowedOperators,
    solverSolution,
    hintText,
  };
}

export function scoreFoundrySubmission(params: {
  value: number | null;
  target: number;
  usedTileCount: number;
  hintUsed: boolean;
}): { points: number; exact: boolean; distance: number } {
  if (params.value === null || !Number.isFinite(params.value)) {
    return { points: 0, exact: false, distance: Math.abs(params.target) };
  }
  const distance = Math.round(Math.abs(params.value - params.target) * 100) / 100;
  const exact = distance < 1e-6;
  const hintPenalty = params.hintUsed ? 15 : 0;

  if (exact) {
    const craftBonus = params.usedTileCount >= 3 ? 15 : 5;
    return {
      points: Math.max(40, 100 + craftBonus - hintPenalty),
      exact: true,
      distance: 0,
    };
  }

  if (distance <= 5) {
    const base = Math.round(80 - distance * 12);
    return {
      points: Math.max(15, base - hintPenalty),
      exact: false,
      distance,
    };
  }

  if (distance <= 15) {
    // continues from the 20 pts the first band ends on, so score never rises with distance
    const base = Math.round(20 - (distance - 5) * 1.5);
    return {
      points: Math.max(5, base - Math.floor(hintPenalty / 2)),
      exact: false,
      distance,
    };
  }

  return { points: 0, exact: false, distance };
}

export function computeAiFoundryScore(
  difficulty: AiDifficulty,
  roundNumber: number
): number {
  if (difficulty === 'apprentice') {
    return roundNumber % 2 === 0 ? 70 : 82;
  }
  if (difficulty === 'scholar') {
    return roundNumber % 3 === 0 ? 85 : 100;
  }
  return 108;
}

export function buildFoundryMatchRecord(params: {
  tier: AgeTier;
  mode: PlayMode;
  aiDifficulty: AiDifficulty;
  playerScore: number;
  opponentScore: number;
  exactHits: number;
  roundsPlayed: number;
}): MatchRecord {
  const result: 'win' | 'loss' | 'draw' =
    params.playerScore > params.opponentScore
      ? 'win'
      : params.playerScore < params.opponentScore
        ? 'loss'
        : 'draw';

  const opponentLabel =
    params.mode === 'solo'
      ? `Foundry Par (${params.roundsPlayed} rounds)`
      : params.mode === 'local' || !params.aiDifficulty
        ? 'Local Opponent'
        : `Expression Solver AI (${params.aiDifficulty[0].toUpperCase()}${params.aiDifficulty.slice(1)})`;

  return {
    id: `foundry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    gameTitle: 'Equation Foundry',
    mode: params.mode,
    aiDifficulty: params.mode === 'vs-ai' ? params.aiDifficulty : undefined,
    tier: params.tier,
    variant: 'classic',
    playerScore: params.playerScore,
    opponentScore: params.opponentScore,
    opponentName: opponentLabel,
    result,
    primesClaimed: 0,
    playedAt: new Date().toISOString(),
    solvedProblems: Number.isFinite(params.exactHits) ? Math.max(0, Math.floor(params.exactHits)) : 0,
  };
}
