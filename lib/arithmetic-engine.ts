import type {
  AgeTier,
  ArithmeticGameId,
  ArithmeticPace,
  MatchRecord,
} from './types';

export type MultiplicationTableFocus =
  | 'progressive'
  | 'foundations'
  | 'core-6-9'
  | 'twelves'
  | 'extended';

export interface ArithmeticGameSpec {
  id: ArithmeticGameId;
  title: string;
  shortTag: string;
  tagline: string;
  description: string;
  operatorSymbol: '+' | '−' | '×';
  accentHex: string;
  tierSummaries: Record<AgeTier, string>;
}

export interface ArithmeticPaceSpec {
  id: ArithmeticPace;
  label: string;
  seconds: number;
  note: string;
}

export interface MultiplicationStageSpec {
  stage: number; // 1..5
  name: string;
  rangeLabel: string;
  leftPool: number[];
  rightRange: [number, number];
}

export interface ArithmeticProblem {
  id: string;
  gameId: ArithmeticGameId;
  left: number;
  right: number;
  operator: '+' | '−' | '×';
  answer: number;
  stage: number;
  stageLabel: string;
  hint: string;
  allowNegative: boolean;
}

export interface ArithmeticRoundConfig {
  gameId: ArithmeticGameId;
  tier: AgeTier;
  pace: ArithmeticPace;
  untimed: boolean;
  startStage: number; // 1..5 (used by Multiplication Mastery; 1 for others)
  tableFocus: MultiplicationTableFocus;
  allowSignedStrategistSub: boolean;
  adaptiveDifficulty?: boolean;
  adaptiveLevel?: number; // 1..5 when adaptiveDifficulty is active
}

export interface ArithmeticAnswerEntry {
  problem: ArithmeticProblem;
  submitted: number;
  correct: boolean;
  pointsEarned: number;
}

export const ARITHMETIC_GAMES: Record<ArithmeticGameId, ArithmeticGameSpec> = {
  'addition-attack': {
    id: 'addition-attack',
    title: 'Addition Attack',
    shortTag: 'Timed Addition',
    tagline: 'Solve addition problems against the clock and build streak combos.',
    description:
      'Race the countdown timer with crisp mental addition. Chain consecutive right answers to raise your streak multiplier and unlock regrouping hints whenever you want a nudge.',
    operatorSymbol: '+',
    accentHex: '#1D4ED8',
    tierSummaries: {
      explorers: 'Sums 4–40 · Single & two-digit friendly pairs',
      challengers: 'Sums 25–190 · Two-digit carrying & bridging tens',
      strategists: 'Sums 120–980 · Rapid three-digit mental regrouping',
    },
  },
  'subtraction-sprint': {
    id: 'subtraction-sprint',
    title: 'Subtraction Sprint',
    shortTag: 'Rapid Subtraction',
    tagline: 'Rapid-fire subtraction focused on speed, pace, and clean borrowing.',
    description:
      'Build effortless subtraction speed with live pace tracking (problems/min). Explorers stay strictly non-negative, Challengers master borrowing, and Strategists can toggle signed integers.',
    operatorSymbol: '−',
    accentHex: '#047857',
    tierSummaries: {
      explorers: 'Minuends 8–35 · Always positive differences',
      challengers: 'Minuends 30–140 · Borrowing across tens',
      strategists: 'Minuends 100–650 · Fast differences & optional negatives',
    },
  },
  'multiplication-mastery': {
    id: 'multiplication-mastery',
    title: 'Multiplication Mastery',
    shortTag: 'Progressive Tables',
    tagline: 'Climb 5 progressively harder multiplication table stages as you solve.',
    description:
      'Start on foundational tables and automatically level up as you prove mastery—or focus directly on a specific table band to close fluency gaps.',
    operatorSymbol: '×',
    accentHex: '#B45309',
    tierSummaries: {
      explorers: '5 stages: 2×/5×/10× → 4×/6× → 7×/8× → full 9× → 12×',
      challengers: '5 stages: 3×–7× → 6×–9× → 12×12 → teen tables (15×)',
      strategists: '5 stages: 6×–12× → 15× → squares & 19× → mental 29×',
    },
  },
};

export const ARITHMETIC_GAME_ORDER: ArithmeticGameId[] = [
  'addition-attack',
  'subtraction-sprint',
  'multiplication-mastery',
];

export const ARITHMETIC_PACES: Record<ArithmeticPace, ArithmeticPaceSpec> = {
  relaxed: {
    id: 'relaxed',
    label: 'Relaxed · 90s',
    seconds: 90,
    note: 'Extra breathing room for steady accuracy',
  },
  standard: {
    id: 'standard',
    label: 'Standard · 60s',
    seconds: 60,
    note: 'Balanced 1-minute fluency sprint',
  },
  blitz: {
    id: 'blitz',
    label: 'Blitz · 45s',
    seconds: 45,
    note: 'High-tempo speed drill',
  },
};

export const MULTIPLICATION_STAGES_BY_TIER: Record<
  AgeTier,
  MultiplicationStageSpec[]
> = {
  explorers: [
    {
      stage: 1,
      name: 'Foundations',
      rangeLabel: '2×, 3×, 5×, 10×',
      leftPool: [2, 3, 5, 10],
      rightRange: [2, 9],
    },
    {
      stage: 2,
      name: 'Doubles & Sixes',
      rangeLabel: '4×, 6×',
      leftPool: [4, 6],
      rightRange: [2, 9],
    },
    {
      stage: 3,
      name: 'Core Climb',
      rangeLabel: '7×, 8×',
      leftPool: [7, 8],
      rightRange: [2, 9],
    },
    {
      stage: 4,
      name: 'Single-Digit Mix',
      rangeLabel: '3×–9×',
      leftPool: [3, 4, 6, 7, 8, 9],
      rightRange: [3, 9],
    },
    {
      stage: 5,
      name: 'Explorer Boss',
      rangeLabel: '4×–12×',
      leftPool: [4, 6, 7, 8, 9, 11, 12],
      rightRange: [3, 12],
    },
  ],
  challengers: [
    {
      stage: 1,
      name: 'Warm-Up',
      rangeLabel: '3×–7×',
      leftPool: [3, 4, 5, 6, 7],
      rightRange: [3, 10],
    },
    {
      stage: 2,
      name: 'Tricky Middles',
      rangeLabel: '6×–9×',
      leftPool: [6, 7, 8, 9],
      rightRange: [4, 11],
    },
    {
      stage: 3,
      name: 'Full 12×12',
      rangeLabel: '6×–12×',
      leftPool: [6, 7, 8, 9, 11, 12],
      rightRange: [4, 12],
    },
    {
      stage: 4,
      name: 'Teen Factors',
      rangeLabel: '11×–15×',
      leftPool: [11, 12, 13, 14, 15],
      rightRange: [3, 9],
    },
    {
      stage: 5,
      name: 'Challenger Boss',
      rangeLabel: '7×–16×',
      leftPool: [7, 8, 9, 12, 13, 14, 15, 16],
      rightRange: [4, 12],
    },
  ],
  strategists: [
    {
      stage: 1,
      name: 'Sharp Fluency',
      rangeLabel: '6×–12×',
      leftPool: [6, 7, 8, 9, 11, 12],
      rightRange: [6, 12],
    },
    {
      stage: 2,
      name: 'Extended Tables',
      rangeLabel: '11×–15×',
      leftPool: [11, 12, 13, 14, 15],
      rightRange: [5, 12],
    },
    {
      stage: 3,
      name: 'Squares & Teens',
      rangeLabel: '12×–19×',
      leftPool: [12, 13, 14, 15, 16, 17, 18, 19],
      rightRange: [6, 15],
    },
    {
      stage: 4,
      name: 'Double-Digit Craft',
      rangeLabel: '14×–24×',
      leftPool: [14, 15, 16, 17, 18, 19, 21, 22, 24],
      rightRange: [6, 16],
    },
    {
      stage: 5,
      name: 'Strategist Boss',
      rangeLabel: '15×–29×',
      leftPool: [15, 16, 17, 18, 19, 21, 23, 24, 25, 27, 29],
      rightRange: [7, 19],
    },
  ],
};

export const TABLE_FOCUS_OPTIONS: {
  id: MultiplicationTableFocus;
  label: string;
  description: string;
}[] = [
  {
    id: 'progressive',
    label: 'Progressive Ladder (1→5)',
    description: 'Advances into harder tables as you prove mastery',
  },
  {
    id: 'foundations',
    label: '2×–5× Tables',
    description: 'Build rapid confidence on foundational multiples',
  },
  {
    id: 'core-6-9',
    label: '6×–9× Tables',
    description: 'Targeted practice on the highest-miss core tables',
  },
  {
    id: 'twelves',
    label: '10×–12× Tables',
    description: 'Master upper classic multiplication tables',
  },
  {
    id: 'extended',
    label: '13×–19× Tables',
    description: 'Extended mental multiplication for advanced learners',
  },
];

export const CORRECT_ANSWERS_PER_STAGE = 5;

function randInt(min: number, max: number, rng: () => number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function pickFrom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] ?? arr[0];
}

export function computeProgressiveStage(
  startStage: number,
  solvedCount: number
): number {
  const clampedStart = Math.max(1, Math.min(5, Math.floor(startStage)));
  const bonus = Math.floor(Math.max(0, solvedCount) / CORRECT_ANSWERS_PER_STAGE);
  return Math.min(5, clampedStart + bonus);
}

export function buildArithmeticHint(
  left: number,
  right: number,
  operator: '+' | '−' | '×'
): string {
  if (operator === '+') {
    if (left >= 10 && right >= 10) {
      const lTens = Math.floor(left / 10) * 10;
      const lOnes = left % 10;
      const rTens = Math.floor(right / 10) * 10;
      const rOnes = right % 10;
      return `Split into tens & ones: (${lTens} + ${rTens}) + (${lOnes} + ${rOnes}) = ${lTens + rTens} + ${lOnes + rOnes}`;
    }
    const toTen = 10 - (left % 10);
    if (toTen > 0 && toTen < right) {
      return `Bridge to a friendly ten: ${left} + ${toTen} = ${left + toTen}, then add ${right - toTen}.`;
    }
    return `Count up from the larger number: start at ${Math.max(left, right)} and add ${Math.min(left, right)}.`;
  }

  if (operator === '−') {
    if (left < right) {
      return `Flip and negate: −(${right} − ${left}) = −${right - left}.`;
    }
    const nextTen = Math.ceil(right / 10) * 10;
    const adjust = nextTen - right;
    if (right >= 12 && adjust > 0 && adjust <= 4) {
      return `Round up to ${nextTen}: (${left} − ${nextTen}) + ${adjust} = ${left - nextTen} + ${adjust}.`;
    }
    if (right >= 10) {
      const rTens = Math.floor(right / 10) * 10;
      const rOnes = right % 10;
      return `Subtract in two hops: ${left} − ${rTens} = ${left - rTens}, then subtract ${rOnes}.`;
    }
    return `Think addition in reverse: what number plus ${right} equals ${left}?`;
  }

  // Multiplication hint via distributive decomposition
  if (right === 10 || left === 10) {
    const other = left === 10 ? right : left;
    return `Multiplying by 10 shifts digits one place left: ${other} → ${other * 10}.`;
  }
  if (right === 9 || left === 9) {
    const other = left === 9 ? right : left;
    return `Multiply by 10 and subtract one group: (${other} × 10) − ${other} = ${other * 10} − ${other}.`;
  }
  if (right >= 11) {
    const tens = Math.floor(right / 10) * 10;
    const ones = right % 10;
    return `Distribute: (${left} × ${tens}) + (${left} × ${ones}) = ${left * tens} + ${left * ones}.`;
  }
  if (left >= 11) {
    const tens = Math.floor(left / 10) * 10;
    const ones = left % 10;
    return `Distribute: (${tens} × ${right}) + (${ones} × ${right}) = ${tens * right} + ${ones * right}.`;
  }
  if (right >= 6) {
    const rem = right - 5;
    return `Anchor on 5s: (${left} × 5) + (${left} × ${rem}) = ${left * 5} + ${left * rem}.`;
  }
  return `Think of ${left} groups of ${right} (or skip-count by ${Math.max(left, right)}).`;
}

export function generateArithmeticProblem(
  config: ArithmeticRoundConfig,
  solvedCount: number,
  previousSignature?: string,
  rng: () => number = Math.random
): ArithmeticProblem {
  const adaptiveActive =
    Boolean(config.adaptiveDifficulty) &&
    typeof config.adaptiveLevel === 'number';
  const stage = adaptiveActive
    ? Math.max(1, Math.min(5, Math.round(config.adaptiveLevel!)))
    : config.gameId === 'multiplication-mastery'
      ? computeProgressiveStage(config.startStage, solvedCount)
      : Math.min(5, 1 + Math.floor(solvedCount / 6));

  let left = 2;
  let right = 2;
  let operator: '+' | '−' | '×' = '+';
  let stageLabel = `Stage ${stage}`;
  let allowNegative = false;

  for (let attempt = 0; attempt < 12; attempt++) {
    if (config.gameId === 'addition-attack') {
      operator = '+';
      if (config.tier === 'explorers') {
        if (adaptiveActive && stage === 1) {
          // Warm-Up: friendly no-carry or small single-digit pairs
          left = randInt(2, 9, rng);
          right = randInt(2, Math.min(9, 14 - left), rng);
          stageLabel = 'Adaptive Lv 1 · Friendly Sums';
        } else {
          const cap = Math.min(20, 7 + stage * 3);
          left = randInt(stage >= 4 ? 7 : 2, cap, rng);
          right = randInt(stage >= 4 ? 6 : 2, cap, rng);
          stageLabel = adaptiveActive
            ? `Adaptive Lv ${stage} · Sums up to ${cap * 2}`
            : `Wave ${stage} · Sums up to ${cap * 2}`;
        }
      } else if (config.tier === 'challengers') {
        if (adaptiveActive && stage === 1) {
          // Warm-Up: clean two-digit addition without heavy carrying
          const lT = randInt(1, 4, rng);
          const lO = randInt(1, 4, rng);
          const rT = randInt(1, 3, rng);
          const rO = randInt(1, 9 - lO, rng);
          left = lT * 10 + lO;
          right = rT * 10 + rO;
          stageLabel = 'Adaptive Lv 1 · Warm-Up Two-Digit';
        } else {
          const minVal = 12 + (stage - 1) * 9;
          const maxVal = Math.min(95, 38 + stage * 13);
          left = randInt(minVal, maxVal, rng);
          right = randInt(stage >= 3 ? 14 : 9, maxVal, rng);
          stageLabel = adaptiveActive
            ? `Adaptive Lv ${stage} · Two-Digit Carry`
            : `Wave ${stage} · Two-Digit Carry`;
        }
      } else {
        const minVal = 45 + (stage - 1) * 40;
        const maxVal = Math.min(490, 150 + stage * 78);
        left = randInt(minVal, maxVal, rng);
        right = randInt(stage === 1 ? 25 : 45, maxVal, rng);
        stageLabel = adaptiveActive
          ? `Adaptive Lv ${stage} · Three-Digit Sprint`
          : `Wave ${stage} · Three-Digit Sprint`;
      }
    } else if (config.gameId === 'subtraction-sprint') {
      operator = '−';
      if (config.tier === 'explorers') {
        if (adaptiveActive && stage === 1) {
          // Warm-Up: gentle no-borrow subtraction
          const a = randInt(7, 18, rng);
          const ones = a % 10;
          // keep the difference strictly positive (a=7..9 would otherwise allow b===a)
          const b = ones >= 2 ? randInt(1, Math.min(ones, a - 1), rng) : randInt(1, a - 2, rng);
          left = a;
          right = b;
          stageLabel = 'Adaptive Lv 1 · Gentle Differences';
        } else {
          const maxA = Math.min(35, 13 + stage * 5);
          const a = randInt(stage >= 4 ? 14 : 6, maxA, rng);
          const b = randInt(stage >= 4 ? 5 : 1, a - 1, rng);
          left = a;
          right = b;
          stageLabel = adaptiveActive
            ? `Adaptive Lv ${stage} · Positive Differences`
            : `Sprint ${stage} · Positive Differences`;
        }
      } else if (config.tier === 'challengers') {
        if (adaptiveActive && stage === 1) {
          // Warm-Up: two-digit subtraction without borrowing
          const aT = randInt(3, 7, rng);
          const aO = randInt(4, 9, rng);
          const bT = randInt(1, aT - 1, rng);
          const bO = randInt(1, aO, rng);
          left = aT * 10 + aO;
          right = bT * 10 + bO;
          stageLabel = 'Adaptive Lv 1 · Smooth Two-Digit';
        } else {
          const maxA = Math.min(140, 52 + stage * 22);
          const a = randInt(24 + (stage - 1) * 6, maxA, rng);
          const b = randInt(8 + (stage - 1) * 4, a - 3, rng);
          left = a;
          right = b;
          stageLabel = adaptiveActive
            ? `Adaptive Lv ${stage} · Rapid Borrowing`
            : `Sprint ${stage} · Rapid Borrowing`;
        }
      } else {
        const maxA = Math.min(620, 160 + stage * 105);
        const a = randInt(65 + (stage - 1) * 20, maxA, rng);
        if (config.allowSignedStrategistSub && rng() < 0.35) {
          const b = randInt(a + 4, a + 85, rng);
          left = a;
          right = b;
          allowNegative = true;
          stageLabel = adaptiveActive
            ? `Adaptive Lv ${stage} · Signed Integers`
            : `Sprint ${stage} · Signed Integers`;
        } else {
          const b = randInt(24, a - 9, rng);
          left = a;
          right = b;
          allowNegative = config.allowSignedStrategistSub;
          stageLabel = adaptiveActive
            ? `Adaptive Lv ${stage} · Three-Digit Rapid`
            : `Sprint ${stage} · Three-Digit Rapid`;
        }
      }
    } else {
      operator = '×';
      if (config.tableFocus === 'progressive') {
        const stageSpec =
          MULTIPLICATION_STAGES_BY_TIER[config.tier][stage - 1] ??
          MULTIPLICATION_STAGES_BY_TIER[config.tier][0];
        const a = pickFrom(stageSpec.leftPool, rng);
        const b = randInt(
          stageSpec.rightRange[0],
          stageSpec.rightRange[1],
          rng
        );
        if (rng() < 0.5) {
          left = a;
          right = b;
        } else {
          left = b;
          right = a;
        }
        stageLabel = adaptiveActive
          ? `Adaptive Stage ${stageSpec.stage} · ${stageSpec.name} (${stageSpec.rangeLabel})`
          : `Stage ${stageSpec.stage} · ${stageSpec.name} (${stageSpec.rangeLabel})`;
      } else {
        const pools: Record<
          Exclude<MultiplicationTableFocus, 'progressive'>,
          { left: number[]; right: [number, number]; label: string }
        > = {
          foundations: {
            left: [2, 3, 4, 5],
            right: [2, 10],
            label: 'Focus · 2×–5× Tables',
          },
          'core-6-9': {
            left: [6, 7, 8, 9],
            right: [3, 11],
            label: 'Focus · 6×–9× Tables',
          },
          twelves: {
            left: [10, 11, 12],
            right: [3, 12],
            label: 'Focus · 10×–12× Tables',
          },
          extended: {
            left: [13, 14, 15, 16, 17, 18, 19],
            right: [3, 12],
            label: 'Focus · 13×–19× Tables',
          },
        };
        const focus = pools[config.tableFocus];
        const a = pickFrom(focus.left, rng);
        // Scale the second factor gently with adaptive stage even inside a focused band
        const rMin = adaptiveActive
          ? Math.min(focus.right[1] - 2, focus.right[0] + Math.max(0, stage - 2))
          : focus.right[0];
        const rMax = adaptiveActive
          ? Math.min(focus.right[1], focus.right[0] + 4 + stage * 2)
          : focus.right[1];
        const b = randInt(rMin, Math.max(rMin, rMax), rng);
        left = rng() < 0.5 ? a : b;
        right = left === a ? b : a;
        stageLabel = adaptiveActive
          ? `${focus.label} · Adaptive Lv ${stage}`
          : focus.label;
      }
    }

    const sig = `${left}${operator}${right}`;
    if (sig !== previousSignature) break;
  }

  const answer =
    operator === '+'
      ? left + right
      : operator === '−'
        ? left - right
        : left * right;

  return {
    id: `prob-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    gameId: config.gameId,
    left,
    right,
    operator,
    answer,
    stage,
    stageLabel,
    hint: buildArithmeticHint(left, right, operator),
    allowNegative,
  };
}

export function calculateAnswerPoints(
  correct: boolean,
  nextStreak: number,
  stage: number
): number {
  if (!correct) return 0;
  const base = 10 + (stage - 1) * 3;
  const streakBonus = Math.min(15, Math.max(0, nextStreak - 1) * 2);
  return base + streakBonus;
}

export function getParTargetScore(
  gameId: ArithmeticGameId,
  tier: AgeTier,
  pace: ArithmeticPace,
  untimed: boolean
): number {
  const baseByPace = untimed
    ? 120
    : pace === 'blitz'
      ? 95
      : pace === 'standard'
        ? 130
        : 165;
  const tierAdj = tier === 'explorers' ? -15 : tier === 'strategists' ? 15 : 0;
  const gameAdj = gameId === 'multiplication-mastery' ? 10 : 0;
  return Math.max(60, baseByPace + tierAdj + gameAdj);
}

export function buildArithmeticMatchRecord(params: {
  config: ArithmeticRoundConfig;
  score: number;
  solved: number;
  attempted: number;
  bestStreak: number;
  elapsedSeconds: number;
  maxStageReached: number;
  adaptiveEnabled?: boolean;
  startAdaptiveLevel?: number;
  endAdaptiveLevel?: number;
  peakAdaptiveLevel?: number;
  playedAt?: string;
}): MatchRecord {
  const {
    config,
    score,
    solved,
    attempted,
    bestStreak,
    elapsedSeconds,
    maxStageReached,
    adaptiveEnabled,
    startAdaptiveLevel,
    endAdaptiveLevel,
    peakAdaptiveLevel,
    playedAt = new Date().toISOString(),
  } = params;

  const spec = ARITHMETIC_GAMES[config.gameId];
  const parScore = getParTargetScore(
    config.gameId,
    config.tier,
    config.pace,
    config.untimed
  );
  const accuracyPercent =
    attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
  const result: 'win' | 'loss' | 'draw' =
    score >= parScore ? 'win' : score === parScore - 5 ? 'draw' : 'loss';

  return {
    id: `arith-${config.gameId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    gameTitle: spec.title,
    mode: 'solo',
    tier: config.tier,
    variant: 'classic',
    playerScore: score,
    opponentScore: parScore,
    opponentName: config.untimed
      ? `Mastery Target (${parScore})`
      : `${ARITHMETIC_PACES[config.pace].seconds}s Par (${parScore})`,
    result,
    primesClaimed: 0,
    playedAt,
    arithmeticMeta: {
      gameId: config.gameId,
      pace: config.pace,
      solved,
      attempted,
      accuracyPercent,
      bestStreak,
      durationSeconds: Math.max(1, Math.round(elapsedSeconds)),
      maxStageReached,
      tableFocus:
        config.gameId === 'multiplication-mastery'
          ? config.tableFocus
          : undefined,
      adaptiveEnabled,
      startAdaptiveLevel,
      endAdaptiveLevel,
      peakAdaptiveLevel,
    },
  };
}
