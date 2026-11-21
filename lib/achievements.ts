import { computeDailyStreakStats } from './daily-challenge';
import { TIER_SPECS } from './factor-grid-engine';
import { isSampleMatch } from './notebook-analytics';
import type {
  AchievementAccent,
  AchievementId,
  AgeTier,
  DailyChallengeCompletion,
  EarnedBadgeRecord,
  MatchRecord,
} from './types';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  shortTitle: string;
  description: string;
  criteriaNote: string;
  accent: AchievementAccent;
}

export interface AchievementStatus {
  definition: AchievementDefinition;
  earned: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
  percent: number;
  progressLabel: string;
}

export interface AchievementEvaluation {
  statuses: AchievementStatus[];
  earnedRecords: EarnedBadgeRecord[];
  newlyUnlocked: AchievementDefinition[];
  earnedCount: number;
  totalCount: number;
  currentStreak: number;
  bestStreak: number;
  bestBoardSharePercent: number;
  realMatchCount: number;
  hasSampleMatches: boolean;
  dailySolvedCount: number;
  bestDailyStreak: number;
  dailyMilestoneBoostedCount: number;
}

export const TOP_SCORER_SHARE_THRESHOLD = 0.55; // 55% of Classic board sum

export function getBoardBaseSum(tier: AgeTier): number {
  const n = TIER_SPECS[tier].boardMax;
  return (n * (n + 1)) / 2;
}

export function getTopScorerThreshold(tier: AgeTier): number {
  return Math.ceil(getBoardBaseSum(tier) * TOP_SCORER_SHARE_THRESHOLD);
}

/**
 * Returns the clamped integer percentage (0–100) of Mastery Seals earned
 * relative to the total available achievements.
 */
export function getMasterySealProgressPercent(
  earnedCount: number,
  totalCount: number
): number {
  if (Number.isNaN(earnedCount) || Number.isNaN(totalCount) || totalCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((earnedCount / totalCount) * 100)));
}

export interface MasteryUnlockPulseCheck {
  isHydrated: boolean;
  hasBaseline: boolean;
  prevEarnedCount: number;
  nextEarnedCount: number;
  prevEventKey: number;
  nextEventKey: number;
}

/**
 * Determines whether MasteryProgressBar should play its subtle badge-unlock
 * entrance & glow animation. Suppresses initial hydration/baseline setup and
 * count decreases (e.g. clearing sample data), while triggering on any post-
 * hydration earnedCount increase or explicit badge-unlock event increment.
 */
export function shouldTriggerMasteryUnlockPulse(
  input: MasteryUnlockPulseCheck
): boolean {
  if (!input.isHydrated || !input.hasBaseline) return false;
  if (input.nextEventKey > input.prevEventKey && input.nextEventKey > 0) {
    return true;
  }
  return input.nextEarnedCount > input.prevEarnedCount;
}

export interface RecentAchievementItem {
  id: AchievementId;
  title: string;
  shortTitle: string;
  description: string;
  criteriaNote: string;
  accent: AchievementAccent;
  unlockedAt: string | null;
  unlockedTimestamp: number;
  dateLabel: string;
  fullDateLabel: string;
}

/** Date-only strings ('2026-03-09') are calendar days: parse as local so labels never shift a day. */
function parseUnlockedAt(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

function formatEarnedDateLabel(unlockedAt: string | null): string {
  if (!unlockedAt) return 'Recently earned';
  const parsed = parseUnlockedAt(unlockedAt);
  if (Number.isNaN(parsed.getTime())) return 'Recently earned';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatEarnedFullDateLabel(unlockedAt: string | null): string {
  if (!unlockedAt) return 'Date unavailable';
  const parsed = parseUnlockedAt(unlockedAt);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Extracts up to `limit` (default 5) most recently earned Mastery Seals from an
 * AchievementEvaluation, ordered newest-first by `unlockedAt` timestamp.
 */
export function getRecentEarnedAchievements(
  evaluation: AchievementEvaluation,
  limit = 5
): RecentAchievementItem[] {
  const safeLimit = Number.isNaN(limit) ? 5 : Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];

  return evaluation.statuses
    .filter((status) => status.earned)
    .map((status, catalogIndex) => {
      const parsedMs = status.unlockedAt
        ? parseUnlockedAt(status.unlockedAt).getTime()
        : Number.NaN;
      const unlockedTimestamp = Number.isFinite(parsedMs) ? parsedMs : 0;
      return {
        catalogIndex,
        // undated items sort below every dated one, even pre-1970 dates
        sortKey: Number.isFinite(parsedMs) ? parsedMs : Number.NEGATIVE_INFINITY,
        item: {
          id: status.definition.id,
          title: status.definition.title,
          shortTitle: status.definition.shortTitle,
          description: status.definition.description,
          criteriaNote: status.definition.criteriaNote,
          accent: status.definition.accent,
          unlockedAt: status.unlockedAt,
          unlockedTimestamp,
          dateLabel: formatEarnedDateLabel(status.unlockedAt),
          fullDateLabel: formatEarnedFullDateLabel(status.unlockedAt),
        },
      };
    })
    .sort((a, b) => {
      if (b.sortKey !== a.sortKey) {
        return b.sortKey > a.sortKey ? 1 : -1;
      }
      return a.catalogIndex - b.catalogIndex;
    })
    .slice(0, safeLimit)
    .map((entry) => entry.item);
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: 'first-victory',
    title: 'First Victory',
    shortTitle: 'First Win',
    description: 'Win your first Factor Grid match in Solo or Human vs. AI.',
    criteriaNote: '1 competitive win',
    accent: 'emerald',
  },
  {
    id: 'perfect-streak',
    title: 'Perfect Streak',
    shortTitle: '3-Win Streak',
    description: 'Win 3 consecutive Solo or Human vs. AI matches without a loss or draw.',
    criteriaNote: '3 consecutive wins',
    accent: 'cobalt',
  },
  {
    id: 'top-scorer',
    title: 'Top Scorer',
    shortTitle: '55%+ Board',
    description:
      'Capture at least 55% of a board total in one Solo or vs. AI match (116+ Explorers, 367+ Challengers, 674+ Strategists).',
    criteriaNote: '≥ 55% of board sum',
    accent: 'ochre',
  },
  {
    id: 'prime-collector',
    title: 'Prime Collector',
    shortTitle: '10 Primes',
    description:
      'Claim 10 prime numbers cumulatively across played Factor Grid matches.',
    criteriaNote: '10 total primes',
    accent: 'emerald',
  },
  {
    id: 'scholar-rival',
    title: "Scholar's Rival",
    shortTitle: 'Beat Scholar',
    description: 'Outscore AI · Scholar or AI · Master in a Human vs. AI match.',
    criteriaNote: 'Beat Scholar+ AI',
    accent: 'cobalt',
  },
  {
    id: 'master-strategist',
    title: 'Master Strategist',
    shortTitle: 'Beat Master',
    description:
      'Defeat AI · Master on a Challengers (1–36) or Strategists (1–49) board.',
    criteriaNote: 'Beat Master AI',
    accent: 'ochre',
  },
  {
    id: 'taxman-victor',
    title: 'Outsmart the Taxman',
    shortTitle: 'Solo Victor',
    description: 'Finish ahead of The Taxman in a Solo optimization match.',
    criteriaNote: '1 Solo Taxman win',
    accent: 'emerald',
  },
  {
    id: 'tier-explorer',
    title: 'Three-Tier Explorer',
    shortTitle: 'All 3 Tiers',
    description:
      'Complete at least one real match in Explorers, Challengers, and Strategists.',
    criteriaNote: '3 adaptive tiers',
    accent: 'cobalt',
  },
  {
    id: 'daily-pioneer',
    title: 'Daily Pioneer',
    shortTitle: '1st Daily',
    description:
      'Crack your first timed Daily Math Challenge puzzle before the clock runs out.',
    criteriaNote: '1 daily solve',
    accent: 'ochre',
  },
  {
    id: 'daily-lightning',
    title: 'Chronometer Ace',
    shortTitle: 'Speed Daily',
    description:
      'Solve a Daily Math Challenge with at least half of the timer still remaining.',
    criteriaNote: '≥ 50% time left',
    accent: 'cobalt',
  },
  {
    id: 'daily-flawless',
    title: 'Pure Deduction',
    shortTitle: 'Flawless Daily',
    description:
      'Complete a Daily Math Challenge with zero wrong attempts and zero hints used.',
    criteriaNote: '0 misses · 0 hints',
    accent: 'emerald',
  },
  {
    id: 'daily-streak-3',
    title: 'Three-Day Scholar',
    shortTitle: '3-Day Daily',
    description:
      'Solve the Daily Math Challenge on 3 consecutive calendar days.',
    criteriaNote: '3-day daily streak',
    accent: 'ochre',
  },
  {
    id: 'daily-streak-7',
    title: '7-Day Consistent Compass',
    shortTitle: '7-Day Daily',
    description:
      'Solve the Daily Math Challenge on 7 consecutive calendar days.',
    criteriaNote: '7-day daily streak',
    accent: 'cobalt',
  },
  {
    id: 'daily-streak-14',
    title: '14-Day Master Flame',
    shortTitle: '14-Day Daily',
    description:
      'Solve the Daily Math Challenge on 14 consecutive calendar days.',
    criteriaNote: '14-day daily streak',
    accent: 'emerald',
  },
];

export function getAchievementById(
  id: AchievementId | null | undefined
): AchievementDefinition | null {
  if (!id) return null;
  return ACHIEVEMENT_CATALOG.find((item) => item.id === id) ?? null;
}

function sortChronological(matches: MatchRecord[]): MatchRecord[] {
  // Matches are stored newest-first; reverse first so identical timestamps stay in play order
  return [...matches].reverse().sort((a, b) => {
    const tA = new Date(a.playedAt).getTime();
    const tB = new Date(b.playedAt).getTime();
    if (Number.isNaN(tA) || Number.isNaN(tB)) return 0;
    return tA - tB;
  });
}

function isCompetitiveMatch(m: MatchRecord): boolean {
  return m.mode === 'solo' || m.mode === 'vs-ai';
}

export function evaluateAchievements(
  allMatches: MatchRecord[],
  persistedEarned: EarnedBadgeRecord[] = [],
  dailyCompletions: DailyChallengeCompletion[] = []
): AchievementEvaluation {
  const hasSampleMatches = allMatches.some((m) => isSampleMatch(m));
  // Strictly exclude synthetic sample data and non-Factor-Grid matches from Factor Grid Mastery Seals (G3)
  const realMatches = sortChronological(
    allMatches.filter(
      (m) =>
        !isSampleMatch(m) &&
        (!m.gameTitle || m.gameTitle === 'Factor Grid')
    )
  );
  const competitiveMatches = realMatches.filter(isCompetitiveMatch);
  const dailyMilestoneBoostedCount = allMatches.filter(
    (m) =>
      !isSampleMatch(m) &&
      typeof m.dailyMilestoneMultiplier === 'number' &&
      m.dailyMilestoneMultiplier > 1
  ).length;

  const persistedMap = new Map<AchievementId, EarnedBadgeRecord>();
  for (const rec of persistedEarned) {
    if (!persistedMap.has(rec.id)) {
      persistedMap.set(rec.id, rec);
    }
  }

  // Track exact metrics across real Factor Grid matches
  let competitiveWins = 0;
  let firstWinMatch: MatchRecord | null = null;

  let currentStreak = 0;
  let bestStreak = 0;
  let streakUnlockMatch: MatchRecord | null = null;

  let bestBoardShare = 0;
  let topScorerMatch: MatchRecord | null = null;

  let totalPrimes = 0;
  let primeUnlockMatch: MatchRecord | null = null;

  let scholarWinMatch: MatchRecord | null = null;
  let masterWinMatch: MatchRecord | null = null;
  let taxmanWinMatch: MatchRecord | null = null;

  const tiersPlayed = new Set<AgeTier>();
  let tierExplorerMatch: MatchRecord | null = null;

  for (const m of realMatches) {
    const clampedPrimes = Math.max(0, Math.floor(m.primesClaimed));
    const primeMult =
      m.dailyMilestoneMultiplier && m.dailyMilestoneMultiplier > 1
        ? m.dailyMilestoneMultiplier
        : 1;
    totalPrimes += Math.round(clampedPrimes * primeMult);
    if (!primeUnlockMatch && totalPrimes >= 10) {
      primeUnlockMatch = m;
    }

    tiersPlayed.add(m.tier);
    if (!tierExplorerMatch && tiersPlayed.size === 3) {
      tierExplorerMatch = m;
    }
  }

  for (const m of competitiveMatches) {
    if (m.result === 'win') {
      competitiveWins += 1;
      if (!firstWinMatch) firstWinMatch = m;

      // The milestone multiplier boosts points/primes only; a win is always one win.
      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
      if (!streakUnlockMatch && currentStreak >= 3) {
        streakUnlockMatch = m;
      }

      if (
        m.mode === 'vs-ai' &&
        (m.aiDifficulty === 'scholar' || m.aiDifficulty === 'master') &&
        !scholarWinMatch
      ) {
        scholarWinMatch = m;
      }

      if (
        m.mode === 'vs-ai' &&
        m.aiDifficulty === 'master' &&
        (m.tier === 'challengers' || m.tier === 'strategists') &&
        !masterWinMatch
      ) {
        masterWinMatch = m;
      }

      if (m.mode === 'solo' && !taxmanWinMatch) {
        taxmanWinMatch = m;
      }
    } else {
      currentStreak = 0;
    }

    const baseSum = getBoardBaseSum(m.tier);
    const share = baseSum > 0 ? m.playerScore / baseSum : 0;
    if (share > bestBoardShare) {
      bestBoardShare = share;
    }
    if (!topScorerMatch && m.playerScore >= getTopScorerThreshold(m.tier)) {
      topScorerMatch = m;
    }
  }

  const bestBoardSharePercent = Math.min(100, Math.round(bestBoardShare * 100));

  // Evaluate Daily Math Challenge badges chronologically
  const solvedDailies = [...dailyCompletions]
    .filter((c) => c.solved)
    .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const dailyStats = computeDailyStreakStats(dailyCompletions);
  const firstDaily = solvedDailies[0] ?? null;
  const lightningDaily =
    solvedDailies.find(
      (c) => c.secondsUsed <= Math.floor(c.timeLimitSeconds / 2)
    ) ?? null;
  const flawlessDaily =
    solvedDailies.find((c) => c.mistakes === 0 && c.hintsUsed === 0) ?? null;
  const streak3Daily =
    dailyStats.bestStreak >= 3
      ? solvedDailies[solvedDailies.length - 1] ?? null
      : null;

  const streakSeal = (days: number) => {
    const qualified = dailyStats.bestStreak >= days;
    const trigger = qualified ? solvedDailies[solvedDailies.length - 1] ?? null : null;
    return {
      qualified,
      unlockedAt: trigger?.completedAt,
      triggerId: trigger ? `daily-${trigger.dateKey}` : undefined,
      current: Math.min(days, dailyStats.bestStreak),
      target: days,
      progressLabel: `${Math.min(days, dailyStats.bestStreak)} / ${days} consecutive days`,
    };
  };

  const computedTriggers: Record<
    AchievementId,
    {
      qualified: boolean;
      unlockedAt?: string;
      triggerId?: string;
      current: number;
      target: number;
      progressLabel: string;
    }
  > = {
    'first-victory': {
      qualified: competitiveWins >= 1,
      unlockedAt: firstWinMatch?.playedAt,
      triggerId: firstWinMatch?.id,
      current: Math.min(1, competitiveWins),
      target: 1,
      progressLabel: `${Math.min(1, competitiveWins)} / 1 win`,
    },
    'perfect-streak': {
      qualified: bestStreak >= 3,
      unlockedAt: streakUnlockMatch?.playedAt,
      triggerId: streakUnlockMatch?.id,
      current: Math.min(3, bestStreak),
      target: 3,
      progressLabel: `${Math.min(3, bestStreak)} / 3 consecutive wins`,
    },
    'top-scorer': {
      qualified: topScorerMatch !== null,
      unlockedAt: topScorerMatch?.playedAt,
      triggerId: topScorerMatch?.id,
      current: Math.min(55, bestBoardSharePercent),
      target: 55,
      progressLabel: `${Math.min(100, bestBoardSharePercent)}% / 55% board share`,
    },
    'prime-collector': {
      qualified: totalPrimes >= 10,
      unlockedAt: primeUnlockMatch?.playedAt,
      triggerId: primeUnlockMatch?.id,
      current: Math.min(10, totalPrimes),
      target: 10,
      progressLabel: `${Math.min(10, totalPrimes)} / 10 primes`,
    },
    'scholar-rival': {
      qualified: scholarWinMatch !== null,
      unlockedAt: scholarWinMatch?.playedAt,
      triggerId: scholarWinMatch?.id,
      current: scholarWinMatch ? 1 : 0,
      target: 1,
      progressLabel: scholarWinMatch ? '1 / 1 victory' : '0 / 1 Scholar+ win',
    },
    'master-strategist': {
      qualified: masterWinMatch !== null,
      unlockedAt: masterWinMatch?.playedAt,
      triggerId: masterWinMatch?.id,
      current: masterWinMatch ? 1 : 0,
      target: 1,
      progressLabel: masterWinMatch ? '1 / 1 victory' : '0 / 1 Master win',
    },
    'taxman-victor': {
      qualified: taxmanWinMatch !== null,
      unlockedAt: taxmanWinMatch?.playedAt,
      triggerId: taxmanWinMatch?.id,
      current: taxmanWinMatch ? 1 : 0,
      target: 1,
      progressLabel: taxmanWinMatch ? '1 / 1 solo win' : '0 / 1 solo win',
    },
    'tier-explorer': {
      qualified: tiersPlayed.size === 3,
      unlockedAt: tierExplorerMatch?.playedAt,
      triggerId: tierExplorerMatch?.id,
      current: tiersPlayed.size,
      target: 3,
      progressLabel: `${tiersPlayed.size} / 3 tiers played`,
    },
    'daily-pioneer': {
      qualified: firstDaily !== null,
      unlockedAt: firstDaily?.completedAt,
      triggerId: firstDaily ? `daily-${firstDaily.dateKey}` : undefined,
      current: firstDaily ? 1 : 0,
      target: 1,
      progressLabel: firstDaily ? '1 / 1 daily solve' : '0 / 1 daily solve',
    },
    'daily-lightning': {
      qualified: lightningDaily !== null,
      unlockedAt: lightningDaily?.completedAt,
      triggerId: lightningDaily ? `daily-${lightningDaily.dateKey}` : undefined,
      current: lightningDaily ? 1 : 0,
      target: 1,
      progressLabel: lightningDaily ? '1 / 1 speed solve' : '0 / 1 speed solve',
    },
    'daily-flawless': {
      qualified: flawlessDaily !== null,
      unlockedAt: flawlessDaily?.completedAt,
      triggerId: flawlessDaily ? `daily-${flawlessDaily.dateKey}` : undefined,
      current: flawlessDaily ? 1 : 0,
      target: 1,
      progressLabel: flawlessDaily ? '1 / 1 flawless' : '0 / 1 flawless solve',
    },
    'daily-streak-3': {
      qualified: dailyStats.bestStreak >= 3,
      unlockedAt: streak3Daily?.completedAt,
      triggerId: streak3Daily ? `daily-${streak3Daily.dateKey}` : undefined,
      current: Math.min(3, dailyStats.bestStreak),
      target: 3,
      progressLabel: `${Math.min(3, dailyStats.bestStreak)} / 3 consecutive days`,
    },
    'daily-streak-7': streakSeal(7),
    'daily-streak-14': streakSeal(14),
  };

  const mergedRecords: EarnedBadgeRecord[] = [];
  const newlyUnlocked: AchievementDefinition[] = [];
  const statuses: AchievementStatus[] = [];

  for (const definition of ACHIEVEMENT_CATALOG) {
    const existing = persistedMap.get(definition.id);
    const computed = computedTriggers[definition.id];

    let earned = false;
    let unlockedAt: string | null = null;

    if (existing) {
      // Latched badge remains permanently earned even if old matches age out (G1)
      earned = true;
      unlockedAt = existing.unlockedAt;
      mergedRecords.push(existing);
    } else if (computed.qualified) {
      earned = true;
      unlockedAt = computed.unlockedAt ?? new Date().toISOString();
      const record: EarnedBadgeRecord = {
        id: definition.id,
        unlockedAt,
        triggerMatchId: computed.triggerId,
      };
      mergedRecords.push(record);
      newlyUnlocked.push(definition);
    }

    const current = earned ? computed.target : computed.current;
    const percent = earned
      ? 100
      : Math.min(100, Math.round((computed.current / computed.target) * 100));

    statuses.push({
      definition,
      earned,
      unlockedAt,
      current,
      target: computed.target,
      percent,
      progressLabel: earned ? 'Earned' : computed.progressLabel,
    });
  }

  return {
    statuses,
    earnedRecords: mergedRecords,
    newlyUnlocked,
    earnedCount: mergedRecords.length,
    totalCount: ACHIEVEMENT_CATALOG.length,
    currentStreak,
    bestStreak,
    bestBoardSharePercent,
    realMatchCount: realMatches.length,
    hasSampleMatches,
    dailySolvedCount: dailyStats.totalSolved,
    bestDailyStreak: dailyStats.bestStreak,
    dailyMilestoneBoostedCount,
  };
}
