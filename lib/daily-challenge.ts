import { getProperDivisors } from './factor-grid-engine';
import type {
  AgeTier,
  DailyArchetype,
  DailyChallengeCompletion,
  MatchRecord,
} from './types';

export interface DailyClueStep {
  stepNumber: 1 | 2 | 3;
  variableLabel: 'A' | 'B' | 'Vault';
  title: string;
  prompt: string;
  formulaDisplay: string;
  hint: string;
  explanation: string;
  answer: number;
}

export interface DailyPuzzle {
  dateKey: string;
  editionNumber: number;
  formattedDate: string;
  tier: AgeTier;
  archetype: DailyArchetype;
  archetypeTitle: string;
  archetypeTagline: string;
  timeLimitSeconds: number;
  steps: [DailyClueStep, DailyClueStep, DailyClueStep];
}

export interface DailyCalendarSlot {
  dateKey: string;
  shortDay: string;
  dayNumber: number;
  solved: boolean;
  isToday: boolean;
}

export interface DailyStreakMilestone {
  days: number;
  title: string;
  bonusPoints: number;
  rewardNote: string;
}

export interface DailyStreakRewardSummary {
  currentBonusPoints: number;
  projectedStreakIfSolvedToday: number;
  projectedBonusPoints: number;
  currentMilestone: DailyStreakMilestone | null;
  nextMilestone: DailyStreakMilestone | null;
  daysToNextMilestone: number;
  progressPercent: number;
}

export interface DailyStreakStats {
  currentStreak: number;
  bestStreak: number;
  totalSolved: number;
  solvedToday: boolean;
  last7Days: DailyCalendarSlot[];
}

export const DAILY_STREAK_MILESTONES: DailyStreakMilestone[] = [
  {
    days: 2,
    title: 'Back-to-Back',
    bonusPoints: 15,
    rewardNote: '+15 pts daily bonus',
  },
  {
    days: 3,
    title: 'Streak Keeper',
    bonusPoints: 30,
    rewardNote: '+30 pts & Mastery Seal',
  },
  {
    days: 5,
    title: "Scholar's Flame",
    bonusPoints: 50,
    rewardNote: '+50 pts daily bonus',
  },
  {
    days: 7,
    title: 'Weekly Crown',
    bonusPoints: 75,
    rewardNote: '+75 pts full-week bonus',
  },
];

export function getStreakBonusPoints(streakDays: number): number {
  const safe = Math.max(0, Math.floor(streakDays));
  let bonus = 0;
  for (const milestone of DAILY_STREAK_MILESTONES) {
    if (safe >= milestone.days) {
      bonus = milestone.bonusPoints;
    }
  }
  return bonus;
}

export function getStreakRewardSummary(
  currentStreak: number,
  solvedToday: boolean
): DailyStreakRewardSummary {
  const safeStreak = Math.max(0, Math.floor(currentStreak));
  const currentBonusPoints = getStreakBonusPoints(safeStreak);
  const projectedStreakIfSolvedToday = solvedToday
    ? safeStreak
    : safeStreak + 1;
  const projectedBonusPoints = getStreakBonusPoints(
    projectedStreakIfSolvedToday
  );

  let currentMilestone: DailyStreakMilestone | null = null;
  for (const m of DAILY_STREAK_MILESTONES) {
    if (safeStreak >= m.days) {
      currentMilestone = m;
    }
  }

  const nextMilestone =
    DAILY_STREAK_MILESTONES.find((m) => safeStreak < m.days) ?? null;
  const daysToNextMilestone = nextMilestone
    ? Math.max(0, nextMilestone.days - safeStreak)
    : 0;
  const progressPercent = nextMilestone
    ? Math.min(100, Math.round((safeStreak / nextMilestone.days) * 100))
    : 100;

  return {
    currentBonusPoints,
    projectedStreakIfSolvedToday,
    projectedBonusPoints,
    currentMilestone,
    nextMilestone,
    daysToNextMilestone,
    progressPercent,
  };
}

export const DAILY_TIME_LIMITS: Record<AgeTier, number> = {
  explorers: 120,
  challengers: 90,
  strategists: 75,
};

const EPOCH_UTC_MS = Date.UTC(2025, 9, 1); // Oct 1, 2025 -> Edition #1

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyUTC(dateKey: string): number {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return EPOCH_UTC_MS;
  }
  // Date.UTC maps years 0-99 to 1900-1999; setUTCFullYear does not.
  const d = new Date(0);
  d.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
  return d.getTime();
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const ms = parseDateKeyUTC(dateKey) + deltaDays * 86_400_000;
  const d = new Date(ms);
  const year = String(d.getUTCFullYear()).padStart(4, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEditionNumber(dateKey: string): number {
  const diffDays = Math.floor(
    (parseDateKeyUTC(dateKey) - EPOCH_UTC_MS) / 86_400_000
  );
  return Math.max(1, diffDays + 1);
}

export function formatDateKeyLong(dateKey: string): string {
  const ms = parseDateKeyUTC(dateKey);
  return new Date(ms).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function getSecondsUntilNextDaily(now: Date = new Date()): number {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(0, Math.ceil((tomorrow.getTime() - now.getTime()) / 1000));
}

export function formatCountdownClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const mins = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
}

// Deterministic FNV-1a 32-bit hash + Mulberry32 PRNG
function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(min: number, max: number, rng: () => number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function pickFrom<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)] ?? list[0];
}

const ARCHETYPE_ROTATION: DailyArchetype[] = [
  'equation-vault',
  'divisor-cipher',
  'balance-scale',
  'mystery-number',
];

function gcdInt(a: number, b: number): number {
  return b === 0 ? a : gcdInt(b, a % b);
}

function digitSum(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((acc, ch) => acc + Number(ch), 0);
}

export function generateDailyPuzzle(
  dateKey: string,
  tier: AgeTier
): DailyPuzzle {
  const editionNumber = getEditionNumber(dateKey);
  // Unclamped day index so pre-epoch dates keep rotating through archetypes.
  const rotationIndex = Math.floor(
    (parseDateKeyUTC(dateKey) - EPOCH_UTC_MS) / 86_400_000
  );
  const formattedDate = formatDateKeyLong(dateKey);
  const timeLimitSeconds = DAILY_TIME_LIMITS[tier];
  const archetype =
    ARCHETYPE_ROTATION[
      ((rotationIndex % ARCHETYPE_ROTATION.length) + ARCHETYPE_ROTATION.length) %
        ARCHETYPE_ROTATION.length
    ];
  const rng = createMulberry32(hashSeed(`numbercraft-daily:${dateKey}:${tier}`));

  if (archetype === 'equation-vault') {
    const f1 =
      tier === 'explorers'
        ? randInt(3, 8, rng)
        : tier === 'challengers'
          ? randInt(6, 12, rng)
          : randInt(9, 17, rng);
    const f2 =
      tier === 'explorers'
        ? randInt(3, 7, rng)
        : tier === 'challengers'
          ? randInt(5, 11, rng)
          : randInt(7, 14, rng);
    const sub =
      tier === 'explorers'
        ? randInt(4, Math.min(14, f1 * f2 - 5), rng)
        : randInt(11, Math.min(35, f1 * f2 - 12), rng);
    const a = f1 * f2 - sub;

    let addOffset =
      tier === 'explorers'
        ? randInt(7, 18, rng)
        : tier === 'challengers'
          ? randInt(14, 38, rng)
          : randInt(25, 64, rng);
    // strategists: B = 2A - offset would equal A when offset == A
    if (tier === 'strategists' && addOffset === a) addOffset += 1;
    const b = tier === 'strategists' ? a * 2 - addOffset : a + addOffset;
    const vault = tier === 'explorers' ? a + b : a + b + f1;

    return {
      dateKey,
      editionNumber,
      formattedDate,
      tier,
      archetype,
      archetypeTitle: 'Equation Vault',
      archetypeTagline: 'Chain three linked arithmetic clues to crack today’s vault.',
      timeLimitSeconds,
      steps: [
        {
          stepNumber: 1,
          variableLabel: 'A',
          title: 'Clue 1 · Unlock Key A',
          prompt: 'Evaluate the product first, then subtract to reveal Key A.',
          formulaDisplay: `A = (${f1} × ${f2}) − ${sub}`,
          hint: `First compute ${f1} × ${f2} = ${f1 * f2}, then subtract ${sub}.`,
          explanation: `${f1} × ${f2} = ${f1 * f2}, and ${f1 * f2} − ${sub} = ${a}.`,
          answer: a,
        },
        {
          stepNumber: 2,
          variableLabel: 'B',
          title: 'Clue 2 · Forge Key B',
          prompt:
            tier === 'strategists'
              ? 'Double Key A, then subtract the offset to obtain Key B.'
              : 'Add the vault offset to Key A to reveal Key B.',
          formulaDisplay:
            tier === 'strategists'
              ? `B = (2 × ${a}) − ${addOffset}`
              : `B = ${a} + ${addOffset}`,
          hint:
            tier === 'strategists'
              ? `Double ${a} to get ${a * 2}, then subtract ${addOffset}.`
              : `Break ${addOffset} into tens and ones before adding to ${a}.`,
          explanation:
            tier === 'strategists'
              ? `2 × ${a} = ${a * 2}, minus ${addOffset} gives ${b}.`
              : `${a} + ${addOffset} = ${b}.`,
          answer: b,
        },
        {
          stepNumber: 3,
          variableLabel: 'Vault',
          title: 'Clue 3 · Final Vault Code',
          prompt:
            tier === 'explorers'
              ? 'Combine Key A and Key B to open today’s Equation Vault.'
              : `Add Key A, Key B, and the opening multiplier (${f1}) to seal the vault.`,
          formulaDisplay:
            tier === 'explorers'
              ? `Vault = ${a} + ${b}`
              : `Vault = ${a} + ${b} + ${f1}`,
          hint: `Add the tens first: ${a} + ${b} = ${a + b}${tier === 'explorers' ? '.' : `, then add ${f1}.`}`,
          explanation:
            tier === 'explorers'
              ? `${a} + ${b} = ${vault}.`
              : `${a} + ${b} + ${f1} = ${vault}.`,
          answer: vault,
        },
      ],
    };
  }

  if (archetype === 'divisor-cipher') {
    // Clue 1: Missing term in arithmetic sequence
    let start =
      tier === 'explorers'
        ? randInt(4, 15, rng)
        : tier === 'challengers'
          ? randInt(9, 28, rng)
          : randInt(17, 45, rng);
    const diff =
      tier === 'explorers'
        ? randInt(3, 8, rng)
        : tier === 'challengers'
          ? randInt(6, 14, rng)
          : randInt(9, 19, rng);
    // Clue 2: Sum of proper divisors of a crafted composite number
    const candidateN =
      tier === 'explorers'
        ? [10, 12, 14, 15, 16, 18, 20]
        : tier === 'challengers'
          ? [18, 20, 24, 28, 30, 32, 36]
          : [24, 28, 30, 36, 40, 42, 48];
    const targetN = pickFrom(candidateN, rng);
    const divisors = getProperDivisors(targetN);
    const b = divisors.reduce((sum, d) => sum + d, 0);
    if (start + diff * 3 === b) start += 1; // keep Key A distinct from Key B
    const s1 = start;
    const s2 = start + diff;
    const s3 = start + diff * 2;
    const a = start + diff * 3;
    const s5 = start + diff * 4;

    // Clue 3: Combine A and B
    const vault = tier === 'strategists' ? a + b * 2 : a + b;

    return {
      dateKey,
      editionNumber,
      formattedDate,
      tier,
      archetype,
      archetypeTitle: 'Divisor & Sequence Cipher',
      archetypeTagline:
        'Decode a number pattern and proper-divisor sum to unlock the daily cipher.',
      timeLimitSeconds,
      steps: [
        {
          stepNumber: 1,
          variableLabel: 'A',
          title: 'Clue 1 · Missing Pattern Term A',
          prompt:
            'Find the constant step between terms to uncover the missing number A.',
          formulaDisplay: `${s1},  ${s2},  ${s3},  [ A ],  ${s5}`,
          hint: `Notice each term rises by +${diff} (${s2} − ${s1} = ${diff}). Add ${diff} to ${s3}.`,
          explanation: `Constant step is +${diff}, so A = ${s3} + ${diff} = ${a}.`,
          answer: a,
        },
        {
          stepNumber: 2,
          variableLabel: 'B',
          title: 'Clue 2 · Proper Divisor Sum B',
          prompt: `Add all proper divisors of ${targetN} (positive factors strictly smaller than ${targetN}).`,
          formulaDisplay: `B = sum of proper divisors of ${targetN}`,
          hint: `List every factor of ${targetN} except ${targetN} itself: ${divisors.slice(0, Math.max(2, divisors.length - 1)).join(', ')}...`,
          explanation: `Proper divisors of ${targetN} are {${divisors.join(', ')}}, summing to ${b}.`,
          answer: b,
        },
        {
          stepNumber: 3,
          variableLabel: 'Vault',
          title: 'Clue 3 · Final Cipher Code',
          prompt:
            tier === 'strategists'
              ? 'Add Key A to twice the divisor sum B to crack the cipher.'
              : 'Sum Pattern Key A and Divisor Sum B to unlock the daily cipher.',
          formulaDisplay:
            tier === 'strategists' ? `Vault = ${a} + (2 × ${b})` : `Vault = ${a} + ${b}`,
          hint:
            tier === 'strategists'
              ? `Double ${b} first (${b * 2}), then add ${a}.`
              : `Combine ${a} + ${b} by adding tens then ones.`,
          explanation:
            tier === 'strategists'
              ? `${a} + (2 × ${b}) = ${a} + ${b * 2} = ${vault}.`
              : `${a} + ${b} = ${vault}.`,
          answer: vault,
        },
      ],
    };
  }

  if (archetype === 'balance-scale') {
    const coeff =
      tier === 'explorers'
        ? randInt(2, 4, rng)
        : tier === 'challengers'
          ? randInt(3, 6, rng)
          : randInt(4, 9, rng);
    const a =
      tier === 'explorers'
        ? randInt(4, 11, rng)
        : tier === 'challengers'
          ? randInt(7, 16, rng)
          : randInt(9, 21, rng);
    const constant =
      tier === 'explorers'
        ? randInt(3, 12, rng)
        : tier === 'challengers'
          ? randInt(8, 24, rng)
          : randInt(13, 39, rng);
    const rhs = coeff * a + constant;

    const multB = tier === 'explorers' ? 3 : tier === 'challengers' ? 4 : 5;
    let subB = randInt(2, Math.min(15, a * multB - 3), rng);
    if (a * multB - subB === a) subB += 1; // keep Key B distinct from Key A
    const b = a * multB - subB;
    const vault = tier === 'explorers' ? a + b : a * 2 + b;

    return {
      dateKey,
      editionNumber,
      formattedDate,
      tier,
      archetype,
      archetypeTitle: 'Algebraic Balance Scale',
      archetypeTagline:
        'Isolate an unknown weight and balance the final equation.',
      timeLimitSeconds,
      steps: [
        {
          stepNumber: 1,
          variableLabel: 'A',
          title: 'Clue 1 · Isolate Weight A',
          prompt:
            'Find the value of A that keeps both sides of the scale equal.',
          formulaDisplay: `${coeff} × A + ${constant} = ${rhs}`,
          hint: `Subtract ${constant} from ${rhs} to get ${rhs - constant}, then divide by ${coeff}.`,
          explanation: `${rhs} − ${constant} = ${rhs - constant}, and ${rhs - constant} ÷ ${coeff} = ${a}.`,
          answer: a,
        },
        {
          stepNumber: 2,
          variableLabel: 'B',
          title: 'Clue 2 · Counterweight B',
          prompt: 'Use Weight A to calculate Counterweight B.',
          formulaDisplay: `B = (${multB} × ${a}) − ${subB}`,
          hint: `Compute ${multB} × ${a} = ${multB * a}, then subtract ${subB}.`,
          explanation: `${multB} × ${a} = ${multB * a}, minus ${subB} equals ${b}.`,
          answer: b,
        },
        {
          stepNumber: 3,
          variableLabel: 'Vault',
          title: 'Clue 3 · Equilibrium Code',
          prompt:
            tier === 'explorers'
              ? 'Find the combined total of Weight A and Counterweight B.'
              : 'Calculate two A-weights plus one B-weight to seal the scale.',
          formulaDisplay:
            tier === 'explorers'
              ? `Vault = ${a} + ${b}`
              : `Vault = (2 × ${a}) + ${b}`,
          hint:
            tier === 'explorers'
              ? `Add ${a} and ${b}.`
              : `First find 2 × ${a} = ${a * 2}, then add ${b}.`,
          explanation:
            tier === 'explorers'
              ? `${a} + ${b} = ${vault}.`
              : `(2 × ${a}) + ${b} = ${a * 2} + ${b} = ${vault}.`,
          answer: vault,
        },
      ],
    };
  }

  // archetype === 'mystery-number'
  // Construct a guaranteed-unique mystery number A in a tight interval.
  // The (factor, k, stepAdd) space is small, so walk it with a coprime stride
  // instead of random draws: no repeat until every combination has been used.
  const factors =
    tier === 'explorers'
      ? [4, 5, 6, 7]
      : tier === 'challengers'
        ? [6, 7, 8, 9]
        : [7, 8, 9, 11, 12];
  const [kLo, kHi] =
    tier === 'explorers' ? [3, 6] : tier === 'challengers' ? [5, 9] : [7, 13];
  const [addLo, addHi] =
    tier === 'explorers' ? [5, 12] : tier === 'challengers' ? [8, 19] : [12, 27];
  const nK = kHi - kLo + 1;
  const nAdd = addHi - addLo + 1;
  const total = factors.length * nK * nAdd;
  let stride = Math.max(1, Math.round(total * 0.618));
  while (gcdInt(stride, total) !== 1) stride++;
  const cycle = Math.floor(rotationIndex / ARCHETYPE_ROTATION.length);
  const slot =
    (((cycle * stride + (hashSeed(`mystery:${tier}`) % total)) % total) + total) %
    total;
  const factor = factors[slot % factors.length];
  const k = kLo + (Math.floor(slot / factors.length) % nK);
  const stepAdd = addLo + Math.floor(slot / (factors.length * nK));
  const a = factor * k;
  // Tight bounds around A containing ONLY A as a multiple of `factor`
  const lowBound = a - (factor - 1);
  const highBound = a + (factor - 1);
  const dSum = digitSum(a);

  const b = tier === 'explorers' ? a + stepAdd : a * 2 - stepAdd;
  const vault = a + b;

  return {
    dateKey,
    editionNumber,
    formattedDate,
    tier,
    archetype,
    archetypeTitle: 'Mystery Number Deduction',
    archetypeTagline:
      'Use divisibility and digit clues to pinpoint today’s secret number.',
    timeLimitSeconds,
    steps: [
      {
        stepNumber: 1,
        variableLabel: 'A',
        title: 'Clue 1 · Pinpoint Secret Number A',
        prompt: `I am the ONLY multiple of ${factor} strictly between ${lowBound - 1} and ${highBound + 1}. My digits add up to ${dSum}. Who am I?`,
        formulaDisplay: `${lowBound} ≤ A ≤ ${highBound}  ·  ${factor} | A  ·  digit sum = ${dSum}`,
        hint: `Skip-count by ${factor}: ${factor * (k - 1)}, ?, ${factor * (k + 1)}. Check which one sits between ${lowBound} and ${highBound}.`,
        explanation: `${factor} × ${k} = ${a}, which is between ${lowBound} and ${highBound} with digit sum ${dSum}.`,
        answer: a,
      },
      {
        stepNumber: 2,
        variableLabel: 'B',
        title: 'Clue 2 · Transform to Key B',
        prompt:
          tier === 'explorers'
            ? `Add ${stepAdd} to Secret Number A to find Key B.`
            : `Double Secret Number A and subtract ${stepAdd} to find Key B.`,
        formulaDisplay:
          tier === 'explorers'
            ? `B = ${a} + ${stepAdd}`
            : `B = (2 × ${a}) − ${stepAdd}`,
        hint:
          tier === 'explorers'
            ? `Start at ${a} and add ${stepAdd}.`
            : `Double ${a} to ${a * 2}, then subtract ${stepAdd}.`,
        explanation:
          tier === 'explorers'
            ? `${a} + ${stepAdd} = ${b}.`
            : `(2 × ${a}) − ${stepAdd} = ${b}.`,
        answer: b,
      },
      {
        stepNumber: 3,
        variableLabel: 'Vault',
        title: 'Clue 3 · Seal the Mystery',
        prompt: 'Sum Secret Number A and Key B to lock in today’s solution.',
        formulaDisplay: `Vault = ${a} + ${b}`,
        hint: `Add tens and ones of ${a} and ${b} separately.`,
        explanation: `${a} + ${b} = ${vault}.`,
        answer: vault,
      },
    ],
  };
}

export function calculateDailyScore(params: {
  solved: boolean;
  stepsSolved: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  mistakes: number;
  hintsUsed: number;
  streakDays?: number;
}): number {
  const {
    solved,
    stepsSolved,
    secondsUsed,
    timeLimitSeconds,
    mistakes,
    hintsUsed,
    streakDays = 0,
  } = params;
  const fin = (n: number) => (Number.isFinite(n) ? n : 0);
  const stepPoints = Math.max(0, fin(stepsSolved)) * 50;
  if (!solved) return Math.max(0, stepPoints - fin(mistakes) * 5);
  // Unknown elapsed time earns no bonus; negative time cannot earn more than zero time.
  const used = Number.isFinite(secondsUsed)
    ? Math.max(0, secondsUsed)
    : timeLimitSeconds;
  const secondsLeft = Math.max(0, timeLimitSeconds - used);
  const timeBonus = Math.round((secondsLeft / Math.max(1, timeLimitSeconds)) * 100);
  const flawlessBonus = fin(mistakes) === 0 && fin(hintsUsed) === 0 ? 50 : 0;
  const streakBonus = getStreakBonusPoints(streakDays);
  const penalties = fin(mistakes) * 10 + fin(hintsUsed) * 15;
  return Math.max(50, stepPoints + timeBonus + flawlessBonus + streakBonus - penalties);
}

export function computeDailyStreakStats(
  completions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DailyStreakStats {
  const solvedDateSet = new Set(
    completions.filter((c) => c.solved).map((c) => c.dateKey)
  );
  const sortedSolvedDates = Array.from(solvedDateSet).sort();

  // Compute best streak across all recorded solved dates
  let bestStreak = 0;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of sortedSolvedDates) {
    if (prevKey && shiftDateKey(prevKey, 1) === key) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > bestStreak) bestStreak = run;
    prevKey = key;
  }

  // Compute active current streak ending today (or yesterday if today is not yet solved)
  const solvedToday = solvedDateSet.has(todayKey);
  let currentStreak = 0;
  let cursor = solvedToday ? todayKey : shiftDateKey(todayKey, -1);
  while (solvedDateSet.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  // Build rolling 7-day calendar strip ending on todayKey
  const last7Days: DailyCalendarSlot[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const dateKey = shiftDateKey(todayKey, offset);
    const ms = parseDateKeyUTC(dateKey);
    const d = new Date(ms);
    last7Days.push({
      dateKey,
      shortDay: d.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      }),
      dayNumber: d.getUTCDate(),
      solved: solvedDateSet.has(dateKey),
      isToday: dateKey === todayKey,
    });
  }

  return {
    currentStreak,
    bestStreak,
    totalSolved: solvedDateSet.size,
    solvedToday,
    last7Days,
  };
}

export function buildDailyMatchRecord(
  completion: DailyChallengeCompletion
): MatchRecord {
  const parScore = 180;
  return {
    id: `daily-${completion.dateKey}-${completion.editionNumber}`,
    gameTitle: 'Daily Math Challenge',
    mode: 'solo',
    tier: completion.tier,
    variant: 'classic',
    playerScore: completion.score,
    opponentScore: parScore,
    opponentName: `Edition #${completion.editionNumber} · ${completion.archetypeTitle}`,
    result: completion.solved ? 'win' : 'loss',
    primesClaimed: 0,
    playedAt: completion.completedAt,
    dailyMeta: {
      dateKey: completion.dateKey,
      editionNumber: completion.editionNumber,
      archetypeTitle: completion.archetypeTitle,
      stepsSolved: completion.stepsSolved,
      secondsUsed: completion.secondsUsed,
      timeLimitSeconds: completion.timeLimitSeconds,
      mistakes: completion.mistakes,
      hintsUsed: completion.hintsUsed,
    },
  };
}

export function buildDailyShareSummary(
  completion: DailyChallengeCompletion
): string {
  const status = completion.solved ? 'Solved 3/3' : `${completion.stepsSolved}/3 Clues`;
  const streakNote =
    completion.streakDays && completion.streakDays >= 2
      ? ` · ${completion.streakDays}d Streak`
      : '';
  return `Numbercraft Daily #${completion.editionNumber} (${completion.archetypeTitle}) · ${status} in ${completion.secondsUsed}s · ${completion.hintsUsed} Hints · ${completion.score} pts${streakNote}`;
}
