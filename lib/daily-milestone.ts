import { getEditionNumber, getLocalDateKey } from './daily-challenge';
import { isSampleMatch } from './notebook-analytics';
import type { ArithmeticGameId, MatchRecord } from './types';

export const DAILY_MILESTONE_MULTIPLIER = 1.5;

export type DailyMilestoneArenaId =
  | ArithmeticGameId
  | 'equation-foundry'
  | 'odds-urns'
  | 'factor-grid';

export interface DailyMilestoneSpec {
  arenaId: DailyMilestoneArenaId;
  dateKey: string;
  formattedDate: string;
  editionNumber: number;
  arenaTitle: string;
  category: string;
  focusPrompt: string;
  multiplier: number;
  actionLabel: string;
}

export interface DailyMilestoneStatus {
  milestone: DailyMilestoneSpec;
  completedToday: boolean;
  roundsCompletedToday: number;
  multiplierActive: boolean;
}

interface ArenaRotationTemplate {
  arenaId: DailyMilestoneArenaId;
  arenaTitle: string;
  category: string;
  focusPrompt: string;
  actionLabel: string;
}

const DAILY_MILESTONE_ROTATION: ArenaRotationTemplate[] = [
  {
    arenaId: 'factor-grid',
    arenaTitle: 'Factor Grid',
    category: 'Set 03 · Strategy Number Theory',
    focusPrompt:
      'Claim high-value primes and out-calculate the Divisor Bank in a Factor Grid match.',
    actionLabel: 'Play Factor Grid',
  },
  {
    arenaId: 'equation-foundry',
    arenaTitle: 'Equation Foundry',
    category: 'Set 01 · Expression Building',
    focusPrompt:
      'Forge exact target numbers from tactile ceramic tiles against the Expression Solver AI.',
    actionLabel: 'Play Equation Foundry',
  },
  {
    arenaId: 'odds-urns',
    arenaTitle: 'Odds & Urns',
    category: 'Set 02 · Modular Probability',
    focusPrompt:
      'Calibrate exact fractional odds and outscore the EV Bot across marble urns, dice, or spinners.',
    actionLabel: 'Play Odds & Urns',
  },
  {
    arenaId: 'addition-attack',
    arenaTitle: 'Addition Attack',
    category: 'Set 01 · Core Arithmetic',
    focusPrompt:
      'Build mental addition speed and unbroken streak combos in a timed or untimed sprint.',
    actionLabel: 'Play Addition Attack',
  },
  {
    arenaId: 'multiplication-mastery',
    arenaTitle: 'Multiplication Mastery',
    category: 'Set 01 · Core Arithmetic',
    focusPrompt:
      'Climb progressive multiplication table stages while keeping your accuracy above 85%.',
    actionLabel: 'Play Multiplication Mastery',
  },
  {
    arenaId: 'subtraction-sprint',
    arenaTitle: 'Subtraction Sprint',
    category: 'Set 01 · Core Arithmetic',
    focusPrompt:
      'Sharpen clean borrowing and rapid mental differences across a focused subtraction round.',
    actionLabel: 'Play Subtraction Sprint',
  },
];

function formatDateKeyReadable(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Deterministically selects today's suggested focus game arena based on the
 * local calendar date key so every day highlights a different studio discipline.
 */
export function getDailyMilestoneForDate(
  dateKey: string = getLocalDateKey()
): DailyMilestoneSpec {
  const editionNumber = getEditionNumber(dateKey);
  const index =
    ((editionNumber % DAILY_MILESTONE_ROTATION.length) +
      DAILY_MILESTONE_ROTATION.length) %
    DAILY_MILESTONE_ROTATION.length;
  const template = DAILY_MILESTONE_ROTATION[index];

  return {
    arenaId: template.arenaId,
    dateKey,
    formattedDate: formatDateKeyReadable(dateKey),
    editionNumber,
    arenaTitle: template.arenaTitle,
    category: template.category,
    focusPrompt: template.focusPrompt,
    multiplier: DAILY_MILESTONE_MULTIPLIER,
    actionLabel: template.actionLabel,
  };
}

/**
 * Returns true if a recorded match corresponds to the specified Daily Milestone arena.
 */
export function isMatchForDailyMilestoneArena(
  match: MatchRecord,
  arenaId: DailyMilestoneArenaId
): boolean {
  if (isSampleMatch(match) || match.dailyMeta) return false;

  switch (arenaId) {
    case 'addition-attack':
    case 'subtraction-sprint':
    case 'multiplication-mastery':
      return match.arithmeticMeta?.gameId === arenaId;
    case 'equation-foundry':
      return match.gameTitle === 'Equation Foundry';
    case 'odds-urns':
      return match.gameTitle === 'Odds & Urns';
    case 'factor-grid':
      return (
        !match.arithmeticMeta &&
        (!match.gameTitle || match.gameTitle === 'Factor Grid')
      );
  }
}

/**
 * Applies the 1.5x Daily Milestone multiplier cleanly to a base progress credit.
 */
export function applyMilestoneMultiplier(
  baseValue: number,
  multiplier: number | undefined
): number {
  if (!Number.isFinite(baseValue) || baseValue <= 0) return 0;
  const safeMult = multiplier && multiplier > 1 ? multiplier : 1;
  return Math.round(baseValue * safeMult);
}

/**
 * Evaluates whether the student has completed today's Daily Milestone focus
 * arena at least once on the given local date key.
 */
export function evaluateDailyMilestone(
  matches: MatchRecord[],
  todayKey: string = getLocalDateKey()
): DailyMilestoneStatus {
  const milestone = getDailyMilestoneForDate(todayKey);

  let roundsCompletedToday = 0;
  for (const m of matches) {
    if (!isMatchForDailyMilestoneArena(m, milestone.arenaId)) continue;
    const playedDateKey = getLocalDateKey(new Date(m.playedAt));
    if (playedDateKey === todayKey) {
      roundsCompletedToday += 1;
    }
  }

  const completedToday = roundsCompletedToday > 0;
  return {
    milestone,
    completedToday,
    roundsCompletedToday,
    multiplierActive: completedToday,
  };
}
