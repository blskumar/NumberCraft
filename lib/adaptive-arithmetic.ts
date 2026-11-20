import type { AgeTier, ArithmeticGameId, MatchRecord } from './types';

export type AdaptiveLevel = 1 | 2 | 3 | 4 | 5;

export interface AdaptiveBandMeta {
  level: AdaptiveLevel;
  label: string;
  shortLabel: string;
  description: string;
}

export interface HistoricalCalibration {
  startingLevel: AdaptiveLevel;
  recentRoundsAnalyzed: number;
  avgAccuracyPercent: number | null;
  avgSolvedPerMinute: number | null;
  rationale: string;
}

export interface AdaptiveAdjustmentEvent {
  direction: 'up' | 'down';
  fromLevel: AdaptiveLevel;
  toLevel: AdaptiveLevel;
  reason: string;
}

export interface AdaptiveSessionState {
  level: AdaptiveLevel;
  startLevel: AdaptiveLevel;
  peakLevel: AdaptiveLevel;
  recentOutcomes: boolean[]; // sliding window up to 6 answers
  recentResponseMs: number[]; // sliding window up to 6 response times
  consecutiveCorrect: number;
  consecutiveWrong: number;
  turnsSinceChange: number;
  stepUps: number;
  stepDowns: number;
  suggestHint: boolean;
  lastAdjustment: AdaptiveAdjustmentEvent | null;
}

export const ADAPTIVE_BANDS: Record<AdaptiveLevel, AdaptiveBandMeta> = {
  1: {
    level: 1,
    label: 'Level 1 · Warm-Up',
    shortLabel: 'Lv 1 · Warm-Up',
    description: 'Friendly operands with minimal regrouping to build rhythm.',
  },
  2: {
    level: 2,
    label: 'Level 2 · Steady',
    shortLabel: 'Lv 2 · Steady',
    description: 'Balanced core difficulty for steady fluency.',
  },
  3: {
    level: 3,
    label: 'Level 3 · Brisk',
    shortLabel: 'Lv 3 · Brisk',
    description: 'Active carrying, borrowing, and full mid-tier products.',
  },
  4: {
    level: 4,
    label: 'Level 4 · Stretch',
    shortLabel: 'Lv 4 · Stretch',
    description: 'Upper-tier numbers and trickier combinations.',
  },
  5: {
    level: 5,
    label: 'Level 5 · Mastery',
    shortLabel: 'Lv 5 · Mastery',
    description: 'Peak challenge complexity for your age tier.',
  },
};

export function clampAdaptiveLevel(value: number): AdaptiveLevel {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as AdaptiveLevel;
}

/**
 * Calibrates the initial adaptive difficulty level (1..5) from the student's
 * most recent completed rounds for the same arithmetic game & age tier.
 */
export function computeHistoricalCalibration(
  allMatches: MatchRecord[],
  gameId: ArithmeticGameId,
  tier: AgeTier
): HistoricalCalibration {
  const relevant = allMatches
    .filter(
      (m) =>
        m.arithmeticMeta &&
        m.arithmeticMeta.gameId === gameId &&
        m.tier === tier &&
        m.arithmeticMeta.attempted > 0
    )
    .sort(
      (a, b) =>
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    )
    .slice(0, 5);

  if (relevant.length === 0) {
    // Multiplication starts gently on Stage 1 (Foundations), Addition/Subtraction on Level 2 (Steady)
    const defaultStart: AdaptiveLevel =
      gameId === 'multiplication-mastery' ? 1 : 2;
    return {
      startingLevel: defaultStart,
      recentRoundsAnalyzed: 0,
      avgAccuracyPercent: null,
      avgSolvedPerMinute: null,
      rationale:
        gameId === 'multiplication-mastery'
          ? 'Fresh baseline: starting on Stage 1 Foundations and scaling up as you solve.'
          : 'Fresh baseline: starting at Level 2 Steady and adapting to every answer.',
    };
  }

  // Recency-weighted accuracy & speed across last <= 5 rounds
  let weightedAccSum = 0;
  let weightedPaceSum = 0;
  let weightTotal = 0;
  let winCount = 0;

  relevant.forEach((m, idx) => {
    const meta = m.arithmeticMeta!;
    const weight = relevant.length - idx; // newest round carries highest weight
    const pacePerMin =
      meta.durationSeconds > 0
        ? (meta.solved / meta.durationSeconds) * 60
        : meta.solved;
    weightedAccSum += meta.accuracyPercent * weight;
    weightedPaceSum += pacePerMin * weight;
    weightTotal += weight;
    if (m.result === 'win') winCount += 1;
  });

  const avgAccuracyPercent = Math.round(weightedAccSum / weightTotal);
  const avgSolvedPerMinute = Math.round(weightedPaceSum / weightTotal);
  const latestEndLevel = relevant[0].arithmeticMeta?.endAdaptiveLevel;

  // Base level from recent accuracy + pace + prior ending level
  let computed = latestEndLevel ?? (gameId === 'multiplication-mastery' ? 2 : 2);

  if (avgAccuracyPercent >= 92 && avgSolvedPerMinute >= 14) {
    computed = Math.max(computed, 4);
    if (winCount >= 2 && avgAccuracyPercent >= 95 && avgSolvedPerMinute >= 18) {
      computed = 5;
    }
  } else if (avgAccuracyPercent >= 85 && avgSolvedPerMinute >= 10) {
    computed = Math.max(computed, 3);
  } else if (avgAccuracyPercent >= 72) {
    computed = Math.min(3, Math.max(2, computed));
  } else if (avgAccuracyPercent < 65) {
    // Soft landing so learners rebuild momentum without discouragement
    computed = Math.max(1, Math.min(2, computed - 1));
    if (avgAccuracyPercent < 55) {
      computed = 1;
    }
  }

  const startingLevel = clampAdaptiveLevel(computed);
  const band = ADAPTIVE_BANDS[startingLevel];

  let rationale: string;
  if (avgAccuracyPercent >= 88) {
    rationale = `Calibrated to ${band.label} from your last ${relevant.length} ${relevant.length === 1 ? 'round' : 'rounds'} (${avgAccuracyPercent}% avg accuracy, ${avgSolvedPerMinute}/min).`;
  } else if (avgAccuracyPercent < 68) {
    rationale = `Eased to ${band.label} from your last ${relevant.length} ${relevant.length === 1 ? 'round' : 'rounds'} (${avgAccuracyPercent}% accuracy) to rebuild momentum smoothly.`;
  } else {
    rationale = `Calibrated to ${band.label} from your last ${relevant.length} ${relevant.length === 1 ? 'round' : 'rounds'} (${avgAccuracyPercent}% avg accuracy).`;
  }

  return {
    startingLevel,
    recentRoundsAnalyzed: relevant.length,
    avgAccuracyPercent,
    avgSolvedPerMinute,
    rationale,
  };
}

export function createAdaptiveSession(
  startLevel: AdaptiveLevel
): AdaptiveSessionState {
  return {
    level: startLevel,
    startLevel,
    peakLevel: startLevel,
    recentOutcomes: [],
    recentResponseMs: [],
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    turnsSinceChange: 0,
    stepUps: 0,
    stepDowns: 0,
    suggestHint: false,
    lastAdjustment: null,
  };
}

/**
 * Steps the live in-session adaptive difficulty state after each answered problem.
 * - Steps UP after sustained mastery (3-streak with >=85% window or 5/6 window >=88%)
 *   subject to a 3-turn cooldown to avoid jitter.
 * - Steps DOWN promptly after 2 consecutive misses or <=50% accuracy over 4+ recent
 *   answers so students never get stuck or discouraged.
 */
export function stepAdaptiveSession(
  prev: AdaptiveSessionState,
  correct: boolean,
  responseMs: number
): AdaptiveSessionState {
  const safeMs = Math.max(200, Math.min(60_000, responseMs));
  const recentOutcomes = [...prev.recentOutcomes, correct].slice(-6);
  const recentResponseMs = [...prev.recentResponseMs, safeMs].slice(-6);

  const consecutiveCorrect = correct ? prev.consecutiveCorrect + 1 : 0;
  const consecutiveWrong = correct ? 0 : prev.consecutiveWrong + 1;
  const turnsSinceChange = prev.turnsSinceChange + 1;

  const recentCorrectCount = recentOutcomes.filter(Boolean).length;
  const recentAccuracy = recentCorrectCount / recentOutcomes.length;
  const avgResponseMs =
    recentResponseMs.reduce((sum, t) => sum + t, 0) / recentResponseMs.length;

  let nextLevel = prev.level;
  let nextTurnsSinceChange = turnsSinceChange;
  let stepUps = prev.stepUps;
  let stepDowns = prev.stepDowns;
  let lastAdjustment: AdaptiveAdjustmentEvent | null = null;
  let suggestHint = false;

  // 1. Check Step-Down (anti-discouragement priority)
  const shouldStepDown =
    !correct &&
    prev.level > 1 &&
    (consecutiveWrong >= 2 ||
      (recentOutcomes.length >= 4 &&
        recentAccuracy <= 0.5 &&
        turnsSinceChange >= 2));

  if (shouldStepDown) {
    nextLevel = clampAdaptiveLevel(prev.level - 1);
    nextTurnsSinceChange = 0;
    stepDowns += 1;
    suggestHint = true;
    lastAdjustment = {
      direction: 'down',
      fromLevel: prev.level,
      toLevel: nextLevel,
      reason: `Eased to ${ADAPTIVE_BANDS[nextLevel].label} to keep your momentum steady.`,
    };
  } else if (!correct && consecutiveWrong >= 2 && prev.level === 1) {
    // Already at gentle Warm-Up; offer a non-punitive mental-math hint cue
    suggestHint = true;
  } else {
    // 2. Check Step-Up (sustained flow & mastery)
    const fastAndAccurate =
      consecutiveCorrect >= 3 &&
      recentAccuracy >= 0.8 &&
      avgResponseMs <= 12_000;
    const highWindowMastery =
      recentOutcomes.length >= 5 &&
      recentAccuracy >= 0.88 &&
      consecutiveCorrect >= 2;

    const shouldStepUp =
      correct &&
      prev.level < 5 &&
      turnsSinceChange >= 3 &&
      (fastAndAccurate || highWindowMastery);

    if (shouldStepUp) {
      nextLevel = clampAdaptiveLevel(prev.level + 1);
      nextTurnsSinceChange = 0;
      stepUps += 1;
      lastAdjustment = {
        direction: 'up',
        fromLevel: prev.level,
        toLevel: nextLevel,
        reason: `Stepped up to ${ADAPTIVE_BANDS[nextLevel].label} — strong accuracy & flow!`,
      };
    }
  }

  return {
    level: nextLevel,
    startLevel: prev.startLevel,
    peakLevel: Math.max(prev.peakLevel, nextLevel) as AdaptiveLevel,
    recentOutcomes,
    recentResponseMs,
    consecutiveCorrect: lastAdjustment ? 0 : consecutiveCorrect,
    consecutiveWrong: lastAdjustment ? 0 : consecutiveWrong,
    turnsSinceChange: nextTurnsSinceChange,
    stepUps,
    stepDowns,
    suggestHint,
    lastAdjustment,
  };
}
