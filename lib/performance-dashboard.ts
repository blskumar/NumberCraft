import { ARITHMETIC_GAMES } from './arithmetic-engine';
import {
  computeDailyStreakStats,
  getEditionNumber,
  getLocalDateKey,
  shiftDateKey,
} from './daily-challenge';
import { TIER_SPECS } from './factor-grid-engine';
import type {
  AgeTier,
  ArithmeticGameId,
  DailyChallengeCompletion,
  MatchRecord,
} from './types';

export type DashboardGameFilter = 'all' | ArithmeticGameId;
export type DashboardTierFilter = 'all' | AgeTier;

export interface ArithmeticAccuracyPoint {
  index: number;
  label: string;
  dateLabel: string;
  playedAt: string;
  gameId: ArithmeticGameId;
  gameTitle: string;
  tier: AgeTier;
  tierLabel: string;
  accuracyPercent: number;
  rollingAccuracy: number;
  solved: number;
  attempted: number;
  pacePerMinute: number;
  bestStreak: number;
  adaptiveLevel: number;
  score: number;
}

export interface ArithmeticGameSummary {
  gameId: ArithmeticGameId;
  title: string;
  accentHex: string;
  sessions: number;
  avgAccuracy: number | null;
  bestAccuracy: number | null;
  totalSolved: number;
  avgPacePerMinute: number | null;
  peakAdaptiveLevel: number | null;
}

export interface DailyCompletionHistoryBucket {
  dateKey: string;
  dateLabel: string;
  shortDay: string;
  isToday: boolean;
  dailySolved: number;
  dailyScore: number;
  dailySecondsUsed: number;
  arithmeticRounds: number;
  factorGridRounds: number;
  totalChallenges: number;
}

export interface DailyScoreSpeedPoint {
  index: number;
  editionLabel: string;
  dateLabel: string;
  archetypeTitle: string;
  score: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  solved: boolean;
  mistakes: number;
  hintsUsed: number;
  streakBonus: number;
}

export interface DashboardOverviewStats {
  avgArithmeticAccuracy: number | null;
  accuracyDelta: number | null;
  arithmeticSessionCount: number;
  totalProblemsSolved: number;
  avgPacePerMinute: number | null;
  dailySolvedCount: number;
  dailyAttemptedCount: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  totalChallengesCompleted: number;
}

function toLocalDateKeyFromIso(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getLocalDateKey(parsed);
}

function formatMonthDayFromDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatMonthDayFromIso(iso: string, fallback: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function buildArithmeticAccuracySeries(
  matches: MatchRecord[],
  gameFilter: DashboardGameFilter = 'all',
  tierFilter: DashboardTierFilter = 'all'
): ArithmeticAccuracyPoint[] {
  const relevant = matches
    .filter((m) => {
      if (!m.arithmeticMeta || m.arithmeticMeta.attempted <= 0) return false;
      const gameOk =
        gameFilter === 'all' || m.arithmeticMeta.gameId === gameFilter;
      const tierOk = tierFilter === 'all' || m.tier === tierFilter;
      return gameOk && tierOk;
    })
    .sort((a, b) => {
      const tA = new Date(a.playedAt).getTime();
      const tB = new Date(b.playedAt).getTime();
      if (Number.isNaN(tA) || Number.isNaN(tB)) return 0;
      return tA - tB;
    });

  return relevant.map((m, idx) => {
    const meta = m.arithmeticMeta!;
    const windowStart = Math.max(0, idx - 2);
    const windowSlice = relevant.slice(windowStart, idx + 1);
    const rollingAccuracy = Math.round(
      windowSlice.reduce(
        (sum, item) => sum + (item.arithmeticMeta?.accuracyPercent ?? 0),
        0
      ) / windowSlice.length
    );
    const pacePerMinute =
      meta.durationSeconds > 0
        ? Math.round((meta.solved / meta.durationSeconds) * 60)
        : meta.solved;

    return {
      index: idx + 1,
      label: `#${idx + 1}`,
      dateLabel: formatMonthDayFromIso(m.playedAt, `#${idx + 1}`),
      playedAt: m.playedAt,
      gameId: meta.gameId,
      gameTitle: ARITHMETIC_GAMES[meta.gameId].title,
      tier: m.tier,
      tierLabel: TIER_SPECS[m.tier].label,
      accuracyPercent: meta.accuracyPercent,
      rollingAccuracy,
      solved: meta.solved,
      attempted: meta.attempted,
      pacePerMinute,
      bestStreak: meta.bestStreak,
      adaptiveLevel: meta.endAdaptiveLevel ?? meta.maxStageReached ?? 2,
      score: m.playerScore,
    };
  });
}

export function buildArithmeticGameBreakdown(
  matches: MatchRecord[],
  tierFilter: DashboardTierFilter = 'all'
): ArithmeticGameSummary[] {
  const order: ArithmeticGameId[] = [
    'addition-attack',
    'subtraction-sprint',
    'multiplication-mastery',
  ];

  return order.map((gameId) => {
    const spec = ARITHMETIC_GAMES[gameId];
    const items = matches.filter(
      (m) =>
        m.arithmeticMeta &&
        m.arithmeticMeta.gameId === gameId &&
        m.arithmeticMeta.attempted > 0 &&
        (tierFilter === 'all' || m.tier === tierFilter)
    );

    if (items.length === 0) {
      return {
        gameId,
        title: spec.title,
        accentHex: spec.accentHex,
        sessions: 0,
        avgAccuracy: null,
        bestAccuracy: null,
        totalSolved: 0,
        avgPacePerMinute: null,
        peakAdaptiveLevel: null,
      };
    }

    const totalAcc = items.reduce(
      (sum, m) => sum + (m.arithmeticMeta?.accuracyPercent ?? 0),
      0
    );
    const bestAccuracy = items.reduce(
      (max, m) => Math.max(max, m.arithmeticMeta?.accuracyPercent ?? 0),
      0
    );
    const totalSolved = items.reduce(
      (sum, m) => sum + (m.arithmeticMeta?.solved ?? 0),
      0
    );
    const totalPace = items.reduce((sum, m) => {
      const meta = m.arithmeticMeta!;
      const pace =
        meta.durationSeconds > 0
          ? (meta.solved / meta.durationSeconds) * 60
          : meta.solved;
      return sum + pace;
    }, 0);
    const peakAdaptiveLevel = items.reduce((max, m) => {
      const lvl =
        m.arithmeticMeta?.peakAdaptiveLevel ??
        m.arithmeticMeta?.endAdaptiveLevel ??
        m.arithmeticMeta?.maxStageReached ??
        1;
      return Math.max(max, lvl);
    }, 1);

    return {
      gameId,
      title: spec.title,
      accentHex: spec.accentHex,
      sessions: items.length,
      avgAccuracy: Math.round(totalAcc / items.length),
      bestAccuracy,
      totalSolved,
      avgPacePerMinute: Math.round(totalPace / items.length),
      peakAdaptiveLevel,
    };
  });
}

export function buildChallengeCompletionHistory(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey(),
  days: number = 14
): DailyCompletionHistoryBucket[] {
  const safeDays = Math.max(7, Math.min(30, days));
  const dailyByDate = new Map<string, DailyChallengeCompletion>();
  for (const c of dailyCompletions) {
    dailyByDate.set(c.dateKey, c);
  }

  const arithByDate = new Map<string, number>();
  const factorByDate = new Map<string, number>();

  for (const m of matches) {
    const key = m.dailyMeta?.dateKey ?? toLocalDateKeyFromIso(m.playedAt);
    if (!key) continue;
    if (m.arithmeticMeta) {
      arithByDate.set(key, (arithByDate.get(key) ?? 0) + 1);
    } else if (!m.dailyMeta) {
      factorByDate.set(key, (factorByDate.get(key) ?? 0) + 1);
    }
  }

  const buckets: DailyCompletionHistoryBucket[] = [];
  for (let offset = -(safeDays - 1); offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });

    const daily = dailyByDate.get(dateKey);
    const dailySolved = daily?.solved ? 1 : 0;
    const arithmeticRounds = arithByDate.get(dateKey) ?? 0;
    const factorGridRounds = factorByDate.get(dateKey) ?? 0;

    buckets.push({
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      isToday: dateKey === todayKey,
      dailySolved,
      dailyScore: daily?.solved ? daily.score : 0,
      dailySecondsUsed: daily?.solved ? daily.secondsUsed : 0,
      arithmeticRounds,
      factorGridRounds,
      totalChallenges: dailySolved + arithmeticRounds + factorGridRounds,
    });
  }

  return buckets;
}

export function buildDailyScoreSpeedSeries(
  dailyCompletions: DailyChallengeCompletion[]
): DailyScoreSpeedPoint[] {
  const sorted = [...dailyCompletions].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  return sorted.map((c, idx) => ({
    index: idx + 1,
    editionLabel: `#${c.editionNumber}`,
    dateLabel: formatMonthDayFromDateKey(c.dateKey),
    archetypeTitle: c.archetypeTitle,
    score: c.score,
    secondsUsed: c.secondsUsed,
    timeLimitSeconds: c.timeLimitSeconds,
    solved: c.solved,
    mistakes: c.mistakes,
    hintsUsed: c.hintsUsed,
    streakBonus: c.streakBonus ?? 0,
  }));
}

export function computeDashboardOverview(
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DashboardOverviewStats {
  const accuracySeries = buildArithmeticAccuracySeries(matches, 'all', 'all');
  const streakStats = computeDailyStreakStats(dailyCompletions, todayKey);

  let avgArithmeticAccuracy: number | null = null;
  let accuracyDelta: number | null = null;
  let avgPacePerMinute: number | null = null;
  let totalProblemsSolved = 0;

  if (accuracySeries.length > 0) {
    avgArithmeticAccuracy = Math.round(
      accuracySeries.reduce((sum, p) => sum + p.accuracyPercent, 0) /
        accuracySeries.length
    );
    avgPacePerMinute = Math.round(
      accuracySeries.reduce((sum, p) => sum + p.pacePerMinute, 0) /
        accuracySeries.length
    );
    totalProblemsSolved = accuracySeries.reduce((sum, p) => sum + p.solved, 0);

    if (accuracySeries.length >= 2) {
      const split = Math.floor(accuracySeries.length / 2);
      const early = accuracySeries.slice(0, split);
      const recent = accuracySeries.slice(split);
      const earlyAvg =
        early.reduce((s, p) => s + p.accuracyPercent, 0) / early.length;
      const recentAvg =
        recent.reduce((s, p) => s + p.accuracyPercent, 0) / recent.length;
      accuracyDelta = Math.round(recentAvg - earlyAvg);
    }
  }

  const nonDailyMatchesCount = matches.filter((m) => !m.dailyMeta).length;
  const totalChallengesCompleted =
    nonDailyMatchesCount + streakStats.totalSolved;

  return {
    avgArithmeticAccuracy,
    accuracyDelta,
    arithmeticSessionCount: accuracySeries.length,
    totalProblemsSolved,
    avgPacePerMinute,
    dailySolvedCount: streakStats.totalSolved,
    dailyAttemptedCount: dailyCompletions.length,
    currentDailyStreak: streakStats.currentStreak,
    bestDailyStreak: streakStats.bestStreak,
    totalChallengesCompleted,
  };
}

export function isSampleDailyCompletion(c: DailyChallengeCompletion): boolean {
  return c.completedAt.endsWith('.111Z');
}

export function createSampleDashboardData(
  todayKey: string = getLocalDateKey()
): {
  sampleMatches: MatchRecord[];
  sampleDaily: DailyChallengeCompletion[];
} {
  const arithSpecs: {
    daysAgo: number;
    gameId: ArithmeticGameId;
    tier: AgeTier;
    solved: number;
    attempted: number;
    durationSeconds: number;
    score: number;
    startLvl: number;
    endLvl: number;
    peakLvl: number;
  }[] = [
    {
      daysAgo: 12,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 10,
      attempted: 14,
      durationSeconds: 60,
      score: 112,
      startLvl: 2,
      endLvl: 2,
      peakLvl: 2,
    },
    {
      daysAgo: 10,
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      solved: 11,
      attempted: 14,
      durationSeconds: 60,
      score: 126,
      startLvl: 2,
      endLvl: 2,
      peakLvl: 3,
    },
    {
      daysAgo: 9,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 12,
      attempted: 15,
      durationSeconds: 60,
      score: 142,
      startLvl: 1,
      endLvl: 2,
      peakLvl: 2,
    },
    {
      daysAgo: 7,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 14,
      attempted: 16,
      durationSeconds: 60,
      score: 168,
      startLvl: 2,
      endLvl: 3,
      peakLvl: 3,
    },
    {
      daysAgo: 5,
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      solved: 15,
      attempted: 17,
      durationSeconds: 60,
      score: 184,
      startLvl: 2,
      endLvl: 3,
      peakLvl: 4,
    },
    {
      daysAgo: 3,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 16,
      attempted: 17,
      durationSeconds: 60,
      score: 212,
      startLvl: 2,
      endLvl: 4,
      peakLvl: 4,
    },
    {
      daysAgo: 2,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 18,
      attempted: 19,
      durationSeconds: 60,
      score: 244,
      startLvl: 3,
      endLvl: 4,
      peakLvl: 4,
    },
    {
      daysAgo: 1,
      gameId: 'subtraction-sprint',
      tier: 'strategists',
      solved: 17,
      attempted: 18,
      durationSeconds: 60,
      score: 238,
      startLvl: 3,
      endLvl: 4,
      peakLvl: 5,
    },
    {
      daysAgo: 0,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 19,
      attempted: 20,
      durationSeconds: 60,
      score: 276,
      startLvl: 3,
      endLvl: 5,
      peakLvl: 5,
    },
  ];

  const sampleMatches: MatchRecord[] = arithSpecs.map((item, i) => {
    const dk = shiftDateKey(todayKey, -item.daysAgo);
    const acc = Math.round((item.solved / item.attempted) * 100);
    return {
      id: `sample-dash-arith-${i + 1}`,
      gameTitle: ARITHMETIC_GAMES[item.gameId].title,
      mode: 'solo',
      tier: item.tier,
      variant: 'classic',
      playerScore: item.score,
      opponentScore: 130,
      opponentName: '60s Par (130)',
      result: item.score >= 130 ? 'win' : 'loss',
      primesClaimed: 0,
      playedAt: `${dk}T16:30:00.000Z`,
      arithmeticMeta: {
        gameId: item.gameId,
        pace: 'standard',
        solved: item.solved,
        attempted: item.attempted,
        accuracyPercent: acc,
        bestStreak: Math.max(3, Math.floor(item.solved / 2)),
        durationSeconds: item.durationSeconds,
        maxStageReached: item.peakLvl,
        adaptiveEnabled: true,
        startAdaptiveLevel: item.startLvl,
        endAdaptiveLevel: item.endLvl,
        peakAdaptiveLevel: item.peakLvl,
      },
    };
  });

  const dailyOffsets: {
    daysAgo: number;
    archetype: DailyChallengeCompletion['archetype'];
    title: string;
    secondsUsed: number;
    mistakes: number;
    hintsUsed: number;
    score: number;
    streakDays: number;
    streakBonus: number;
  }[] = [
    {
      daysAgo: 10,
      archetype: 'equation-vault',
      title: 'Equation Vault',
      secondsUsed: 62,
      mistakes: 1,
      hintsUsed: 1,
      score: 156,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 9,
      archetype: 'divisor-cipher',
      title: 'Divisor & Sequence Cipher',
      secondsUsed: 54,
      mistakes: 1,
      hintsUsed: 0,
      score: 195,
      streakDays: 2,
      streakBonus: 15,
    },
    {
      daysAgo: 5,
      archetype: 'balance-scale',
      title: 'Algebraic Balance Scale',
      secondsUsed: 48,
      mistakes: 0,
      hintsUsed: 1,
      score: 182,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 2,
      archetype: 'mystery-number',
      title: 'Mystery Number Deduction',
      secondsUsed: 41,
      mistakes: 0,
      hintsUsed: 0,
      score: 254,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 1,
      archetype: 'equation-vault',
      title: 'Equation Vault',
      secondsUsed: 34,
      mistakes: 0,
      hintsUsed: 0,
      score: 277,
      streakDays: 2,
      streakBonus: 15,
    },
    {
      daysAgo: 0,
      archetype: 'balance-scale',
      title: 'Algebraic Balance Scale',
      secondsUsed: 29,
      mistakes: 0,
      hintsUsed: 0,
      score: 298,
      streakDays: 3,
      streakBonus: 30,
    },
  ];

  const sampleDaily: DailyChallengeCompletion[] = dailyOffsets.map((d) => {
    const dk = shiftDateKey(todayKey, -d.daysAgo);
    return {
      dateKey: dk,
      editionNumber: getEditionNumber(dk),
      tier: 'challengers',
      archetype: d.archetype,
      archetypeTitle: d.title,
      solved: true,
      stepsSolved: 3,
      secondsUsed: d.secondsUsed,
      timeLimitSeconds: 90,
      mistakes: d.mistakes,
      hintsUsed: d.hintsUsed,
      score: d.score,
      streakDays: d.streakDays,
      streakBonus: d.streakBonus > 0 ? d.streakBonus : undefined,
      completedAt: `${dk}T15:00:00.111Z`,
    };
  });

  return { sampleMatches, sampleDaily };
}
