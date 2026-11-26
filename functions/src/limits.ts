// Per-game plausibility limits. Self-contained (no imports) so lib tests can
// import it and assert it still matches the client engines (lib/server-limits.test.ts).
// These are PLAUSIBILITY bounds derived from the engine constants, not proof of play.

export type GameId =
  | 'addition-attack'
  | 'subtraction-sprint'
  | 'multiplication-mastery'
  | 'equation-foundry'
  | 'odds-urns'
  | 'factor-grid'
  | 'daily-challenge';

export const GAME_IDS: readonly GameId[] = [
  'addition-attack',
  'subtraction-sprint',
  'multiplication-mastery',
  'equation-foundry',
  'odds-urns',
  'factor-grid',
  'daily-challenge',
];

export type Tier = 'explorers' | 'challengers' | 'strategists';
export const TIERS: readonly Tier[] = ['explorers', 'challengers', 'strategists'];

export const GAME_TITLES: Record<GameId, string> = {
  'addition-attack': 'Addition Attack',
  'subtraction-sprint': 'Subtraction Sprint',
  'multiplication-mastery': 'Multiplication Mastery',
  'equation-foundry': 'Equation Foundry',
  'odds-urns': 'Odds & Urns',
  'factor-grid': 'Factor Grid',
  'daily-challenge': 'Daily Math Challenge',
};

/** ARITHMETIC_PACES[*].seconds in lib/arithmetic-engine.ts */
export const ARITHMETIC_PACE_SECONDS = { relaxed: 90, standard: 60, blitz: 45 } as const;
export type Pace = keyof typeof ARITHMETIC_PACE_SECONDS;

/** calculateAnswerPoints: base 10 + (stage-1)*3 at stage 5 = 22, + streak bonus cap 15 */
export const ARITHMETIC_MAX_POINTS_PER_ANSWER = 37;
/** Fastest believable human answer; below this we reject as impossible. */
export const ARITHMETIC_MIN_SECONDS_PER_ANSWER = 0.4;
/** Sustained rate above this (answers/s) is flagged, not rejected. */
export const ARITHMETIC_FLAG_ANSWERS_PER_SECOND = 1.5;
export const ARITHMETIC_UNTIMED_MAX_SECONDS = 3600;

/** TOTAL_ROUNDS in EquationFoundryArena / OddsUrnsArena */
export const FOUNDRY_ROUNDS = 5;
/** scoreFoundrySubmission: exact = max(40, 100 + 15) */
export const FOUNDRY_MAX_PER_ROUND = 115;
export const ODDS_ROUNDS = 5;
/** Odds & Urns pots are unbounded draws in theory; heuristic caps (see README). */
export const ODDS_HARD_MAX = 2500;
export const ODDS_P99 = 640;

/** TIER_SPECS[*].boardMax in lib/factor-grid-engine.ts */
export const FACTOR_BOARD_MAX: Record<Tier, number> = {
  explorers: 20,
  challengers: 36,
  strategists: 49,
};
export const PRIME_TRAP_BONUS = 3;

/** DAILY_TIME_LIMITS in lib/daily-challenge.ts */
export const DAILY_TIME_LIMITS: Record<Tier, number> = {
  explorers: 120,
  challengers: 90,
  strategists: 75,
};
/** 3 steps x 50 + time bonus 100 + flawless 50 + max streak bonus 75 */
export const DAILY_HARD_MAX = 3 * 50 + 100 + 50 + 75;

export const ROUND_TTL_MS = 3 * 3600_000;
/** Minimum server-measured seconds between startRound and submitScore. */
export const MIN_ROUND_SECONDS: Record<GameId, number> = {
  'addition-attack': 3,
  'subtraction-sprint': 3,
  'multiplication-mastery': 3,
  'equation-foundry': 15,
  'odds-urns': 15,
  'factor-grid': 8,
  'daily-challenge': 6,
};

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Sum of all tile values plus prime-trap bonuses: nobody can score more. */
export function factorGridHardMax(tier: Tier): number {
  const n = FACTOR_BOARD_MAX[tier];
  let sum = 0;
  let primes = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
    if (isPrime(i)) primes++;
  }
  return sum + PRIME_TRAP_BONUS * primes;
}

export const RATE = {
  /** minimum gap between two startRound calls by one uid */
  startMinGapMs: 2000,
  startsPerDay: 300,
  submitsPerDay: 60,
  consentRequestsPer24h: 3,
  consentPerParentPerDay: 5,
} as const;
