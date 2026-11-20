import type {
  AgeTier,
  AiDifficulty,
  MatchRecord,
  PlayMode,
} from './types';

export type ProbabilityChamber =
  | 'marble-urn'
  | 'twin-dice'
  | 'conditional-spinner';

export type MarbleKind = 'cobalt' | 'emerald' | 'hazard';

export interface UrnMarble {
  id: string;
  kind: MarbleKind;
  points: number;
  label: string;
}

export interface ChamberOddsSummary {
  safeNumerator: number;
  denominator: number;
  reducedFraction: string;
  safePercent: number;
  hazardPercent: number;
  avgSafePoints: number;
  expectedValueDelta: number;
  recommendation: 'press' | 'bank';
  formulaExplanation: string;
}

export interface DrawOutcome {
  safe: boolean;
  pointsGained: number;
  headline: string;
  detail: string;
  marble?: UrnMarble;
  dice?: [number, number];
  spinnerSector?: number;
}

export interface EvBotDecision {
  action: 'press' | 'bank';
  reasoning: string;
  expectedValueDelta: number;
}

export interface ChamberSpec {
  id: ProbabilityChamber;
  title: string;
  subtitle: string;
  ruleSummary: string;
}

export const CHAMBER_SPECS: Record<ProbabilityChamber, ChamberSpec> = {
  'marble-urn': {
    id: 'marble-urn',
    title: 'Marble Urn',
    subtitle: 'Sampling with & without replacement',
    ruleSummary:
      'Cobalt (+12) and Emerald (+20) marbles build your pot. A Crimson Hazard marble busts unbanked points.',
  },
  'twin-dice': {
    id: 'twin-dice',
    title: 'Twin Dice',
    subtitle: '36-outcome sum distributions',
    ruleSummary:
      'Outer sums (2–4, 10–12) earn +24, middle sums earn +14. Rolling Sum = 7 busts your unbanked pot.',
  },
  'conditional-spinner': {
    id: 'conditional-spinner',
    title: 'Conditional Spinner',
    subtitle: '12-sector shifting-odds wheel',
    ruleSummary:
      'Land on Cobalt (+14) or Emerald Boost (+22 & upgrades wheel odds). Crimson Hazard sectors bust your pot.',
  },
};

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatReducedFraction(num: number, den: number): string {
  if (den <= 0) return '0/1';
  if (num <= 0) return `0/${den}`;
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

export function createInitialUrn(tier: AgeTier): UrnMarble[] {
  const counts =
    tier === 'explorers'
      ? { cobalt: 4, emerald: 2, hazard: 2 } // 6/8 safe (75%)
      : tier === 'challengers'
        ? { cobalt: 4, emerald: 3, hazard: 3 } // 7/10 safe (70%)
        : { cobalt: 4, emerald: 3, hazard: 4 }; // 7/11 safe (63.6%)

  const marbles: UrnMarble[] = [];
  for (let i = 0; i < counts.cobalt; i++) {
    marbles.push({
      id: `c-${i}`,
      kind: 'cobalt',
      points: 12,
      label: 'Cobalt (+12)',
    });
  }
  for (let i = 0; i < counts.emerald; i++) {
    marbles.push({
      id: `e-${i}`,
      kind: 'emerald',
      points: 20,
      label: 'Emerald (+20)',
    });
  }
  for (let i = 0; i < counts.hazard; i++) {
    marbles.push({
      id: `h-${i}`,
      kind: 'hazard',
      points: 0,
      label: 'Crimson Hazard',
    });
  }
  return marbles;
}

export interface SpinnerWheelState {
  cobaltCount: number;
  emeraldCount: number;
  hazardCount: number;
  boosted: boolean;
}

export function createInitialSpinnerWheel(tier: AgeTier): SpinnerWheelState {
  if (tier === 'explorers') {
    return { cobaltCount: 6, emeraldCount: 3, hazardCount: 3, boosted: false };
  }
  if (tier === 'challengers') {
    return { cobaltCount: 5, emeraldCount: 3, hazardCount: 4, boosted: false };
  }
  return { cobaltCount: 4, emeraldCount: 3, hazardCount: 5, boosted: false };
}

/**
 * Computes exact fractions, percentages, and Expected Value (E[Δ]) for pressing
 * versus banking the current unbanked pot across all three probability chambers.
 */
export function computeChamberOdds(params: {
  chamber: ProbabilityChamber;
  tier: AgeTier;
  urnMarbles: UrnMarble[];
  spinnerWheel: SpinnerWheelState;
  currentPot: number;
}): ChamberOddsSummary {
  const { chamber, tier, urnMarbles, spinnerWheel, currentPot } = params;

  let safeNum = 0;
  let den = 1;
  let avgSafePoints = 0;

  if (chamber === 'marble-urn') {
    den = Math.max(1, urnMarbles.length);
    const safeMarbles = urnMarbles.filter((m) => m.kind !== 'hazard');
    safeNum = safeMarbles.length;
    avgSafePoints =
      safeNum > 0
        ? safeMarbles.reduce((acc, m) => acc + m.points, 0) / safeNum
        : 0;
  } else if (chamber === 'twin-dice') {
    den = 36;
    // Sum = 7 has 6 ways; Strategists also treat snake-eyes (1,1) as a hazard (7/36)
    const hazardWays = tier === 'strategists' ? 7 : 6;
    safeNum = 36 - hazardWays;
    // Outer sums (2,3,4,10,11,12) = 12 ways (11 for strategists without 1+1) worth +24; middle sums (5,6,8,9) = 18 ways worth +14
    const outerWays = tier === 'strategists' ? 11 : 12;
    const middleWays = 18;
    avgSafePoints = (outerWays * 24 + middleWays * 14) / safeNum;
  } else {
    den =
      spinnerWheel.cobaltCount +
      spinnerWheel.emeraldCount +
      spinnerWheel.hazardCount;
    safeNum = spinnerWheel.cobaltCount + spinnerWheel.emeraldCount;
    avgSafePoints =
      safeNum > 0
        ? (spinnerWheel.cobaltCount * 14 + spinnerWheel.emeraldCount * 22) /
          safeNum
        : 0;
  }

  const pSafe = safeNum / den;
  const pHazard = 1 - pSafe;
  const safePercent = Math.round(pSafe * 1000) / 10;
  const hazardPercent = Math.round(pHazard * 1000) / 10;
  const expectedValueDelta =
    Math.round((pSafe * avgSafePoints - pHazard * currentPot) * 10) / 10;

  const recommendation: 'press' | 'bank' =
    currentPot === 0 || expectedValueDelta >= 0 ? 'press' : 'bank';

  const formulaExplanation = `E[Press] = (${safeNum}/${den} × +${avgSafePoints.toFixed(1)}) − (${den - safeNum}/${den} × ${currentPot}) = ${expectedValueDelta >= 0 ? '+' : ''}${expectedValueDelta.toFixed(1)} pts`;

  return {
    safeNumerator: safeNum,
    denominator: den,
    reducedFraction: formatReducedFraction(safeNum, den),
    safePercent,
    hazardPercent,
    avgSafePoints: Math.round(avgSafePoints * 10) / 10,
    expectedValueDelta,
    recommendation,
    formulaExplanation,
  };
}

/**
 * Evaluates a student's probability estimate against the exact safe percentage.
 */
export function evaluateOddsEstimate(
  estimatedPercent: number,
  actualSafePercent: number
): { accurate: boolean; errorMargin: number; bonusPoints: number } {
  const errorMargin = Math.round(Math.abs(estimatedPercent - actualSafePercent) * 10) / 10;
  const accurate = errorMargin <= 6;
  return {
    accurate,
    errorMargin,
    bonusPoints: accurate ? 10 : 0,
  };
}

/**
 * Executes one random draw/roll/spin in the active probability chamber.
 */
export function executeChamberDraw(params: {
  chamber: ProbabilityChamber;
  tier: AgeTier;
  urnMarbles: UrnMarble[];
  spinnerWheel: SpinnerWheelState;
  rng?: () => number;
}): {
  outcome: DrawOutcome;
  nextUrn: UrnMarble[];
  nextSpinner: SpinnerWheelState;
} {
  const rand = params.rng ?? Math.random;

  if (params.chamber === 'marble-urn') {
    const idx = Math.min(
      params.urnMarbles.length - 1,
      Math.floor(rand() * params.urnMarbles.length)
    );
    const marble = params.urnMarbles[idx];
    const withoutReplacement = params.tier !== 'explorers';
    const nextUrn = withoutReplacement
      ? params.urnMarbles.filter((_, i) => i !== idx)
      : [...params.urnMarbles];

    if (marble.kind === 'hazard') {
      return {
        outcome: {
          safe: false,
          pointsGained: 0,
          headline: 'Crimson Hazard Drawn!',
          detail: 'Unbanked turn pot lost. Chamber resets for the next turn.',
          marble,
        },
        nextUrn,
        nextSpinner: params.spinnerWheel,
      };
    }

    return {
      outcome: {
        safe: true,
        pointsGained: marble.points,
        headline: `${marble.label} Drawn!`,
        detail: withoutReplacement
          ? 'Removed from urn without replacement—check how the remaining odds shifted.'
          : 'Returned to urn with replacement—base odds stay constant.',
        marble,
      },
      nextUrn,
      nextSpinner: params.spinnerWheel,
    };
  }

  if (params.chamber === 'twin-dice') {
    const d1 = Math.floor(rand() * 6) + 1;
    const d2 = Math.floor(rand() * 6) + 1;
    const sum = d1 + d2;
    const isHazard =
      sum === 7 || (params.tier === 'strategists' && d1 === 1 && d2 === 1);

    if (isHazard) {
      return {
        outcome: {
          safe: false,
          pointsGained: 0,
          headline: sum === 7 ? `Rolled ${d1} + ${d2} = 7 (Hazard!)` : 'Rolled 1 + 1 Snake Eyes (Hazard!)',
          detail: 'Hazard sum hit—unbanked turn pot is cleared.',
          dice: [d1, d2],
        },
        nextUrn: params.urnMarbles,
        nextSpinner: params.spinnerWheel,
      };
    }

    const isOuter = sum <= 4 || sum >= 10;
    const pts = isOuter ? 24 : 14;
    return {
      outcome: {
        safe: true,
        pointsGained: pts,
        headline: `Rolled ${d1} + ${d2} = ${sum} (+${pts} pts)`,
        detail: isOuter
          ? 'Rare outer sum bonus (+24 pts)!'
          : 'Solid mid-distribution roll (+14 pts).',
        dice: [d1, d2],
      },
      nextUrn: params.urnMarbles,
      nextSpinner: params.spinnerWheel,
    };
  }

  // Conditional Spinner (12 sectors)
  const total =
    params.spinnerWheel.cobaltCount +
    params.spinnerWheel.emeraldCount +
    params.spinnerWheel.hazardCount;
  const sector = Math.min(total - 1, Math.floor(rand() * total));
  if (sector < params.spinnerWheel.cobaltCount) {
    return {
      outcome: {
        safe: true,
        pointsGained: 14,
        headline: 'Cobalt Sector (+14 pts)',
        detail: 'Safe sector hit—press again or bank your current pot.',
        spinnerSector: sector,
      },
      nextUrn: params.urnMarbles,
      nextSpinner: params.spinnerWheel,
    };
  }
  if (sector < params.spinnerWheel.cobaltCount + params.spinnerWheel.emeraldCount) {
    // Conditional upgrade: shifts 1 hazard sector into a safe cobalt sector!
    const nextSpinner: SpinnerWheelState =
      params.spinnerWheel.hazardCount > 1
        ? {
            cobaltCount: params.spinnerWheel.cobaltCount + 1,
            emeraldCount: params.spinnerWheel.emeraldCount,
            hazardCount: params.spinnerWheel.hazardCount - 1,
            boosted: true,
          }
        : { ...params.spinnerWheel, boosted: true };
    return {
      outcome: {
        safe: true,
        pointsGained: 22,
        headline: 'Emerald Boost Sector (+22 pts!)',
        detail:
          'Conditional upgrade triggered—1 hazard sector converted to safe Cobalt for your next spin!',
        spinnerSector: sector,
      },
      nextUrn: params.urnMarbles,
      nextSpinner,
    };
  }

  return {
    outcome: {
      safe: false,
      pointsGained: 0,
      headline: 'Crimson Hazard Sector!',
      detail: 'Unbanked turn pot cleared and wheel returns to base odds.',
      spinnerSector: sector,
    },
    nextUrn: params.urnMarbles,
    nextSpinner: createInitialSpinnerWheel(params.tier),
  };
}

/**
 * Explainable Expected-Value Bot: chooses Press vs. Bank using exact E[Press]
 * thresholds scaled by difficulty.
 */
export function decideEvBotAction(params: {
  odds: ChamberOddsSummary;
  currentPot: number;
  difficulty: AiDifficulty;
  drawsThisTurn: number;
}): EvBotDecision {
  const { odds, currentPot, difficulty, drawsThisTurn } = params;

  if (currentPot === 0 || drawsThisTurn === 0) {
    return {
      action: 'press',
      expectedValueDelta: odds.expectedValueDelta,
      reasoning: `Pot is 0 with ${odds.safeNumerator}/${odds.denominator} (${odds.safePercent}%) safe odds → Bot presses.`,
    };
  }

  // Apprentice banks conservatively early; Scholar uses EV >= 1.5; Master plays exact optimal EV >= 0
  const threshold =
    difficulty === 'apprentice' ? 4.5 : difficulty === 'scholar' ? 1.5 : 0;

  if (odds.safeNumerator === 0 || odds.expectedValueDelta < threshold) {
    return {
      action: 'bank',
      expectedValueDelta: odds.expectedValueDelta,
      reasoning: `Safe odds ${odds.safeNumerator}/${odds.denominator} (${odds.safePercent}%), E[Press] = ${odds.expectedValueDelta >= 0 ? '+' : ''}${odds.expectedValueDelta.toFixed(1)} pts → Bot banks ${currentPot} pts.`,
    };
  }

  return {
    action: 'press',
    expectedValueDelta: odds.expectedValueDelta,
    reasoning: `Safe odds ${odds.safeNumerator}/${odds.denominator} (${odds.safePercent}%), E[Press] = +${odds.expectedValueDelta.toFixed(1)} pts → Bot presses!`,
  };
}

export function buildOddsUrnsMatchRecord(params: {
  tier: AgeTier;
  mode: PlayMode;
  aiDifficulty: AiDifficulty;
  chamber: ProbabilityChamber;
  playerScore: number;
  opponentScore: number;
}): MatchRecord {
  const result: 'win' | 'loss' | 'draw' =
    params.playerScore > params.opponentScore
      ? 'win'
      : params.playerScore < params.opponentScore
        ? 'loss'
        : 'draw';

  const chamberTitle = CHAMBER_SPECS[params.chamber].title;
  const opponentName =
    params.mode === 'solo'
      ? `EV Par (${chamberTitle})`
      : `EV Bot · ${params.aiDifficulty[0].toUpperCase()}${params.aiDifficulty.slice(1)}`;

  return {
    id: `odds-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    gameTitle: 'Odds & Urns',
    mode: params.mode,
    aiDifficulty: params.mode === 'vs-ai' ? params.aiDifficulty : undefined,
    tier: params.tier,
    variant: 'classic',
    playerScore: params.playerScore,
    opponentScore: params.opponentScore,
    opponentName,
    result,
    primesClaimed: 0,
    playedAt: new Date().toISOString(),
  };
}
