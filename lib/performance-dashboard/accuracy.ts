import { ARITHMETIC_GAMES } from '../arithmetic-engine';
import { getLocalDateKey, shiftDateKey } from '../daily-challenge';
import { TIER_SPECS } from '../factor-grid-engine';
import { finiteOr, formatMonthDayFromDateKey, formatMonthDayFromIso, indexDailyByDate, toLocalDateKeyFromIso } from './helpers';
import type { DashboardGameFilter, DashboardTierFilter, ArithmeticAccuracyPoint, ArithmeticGameSummary, DailyCompletionHistoryBucket } from './types';
import type { ArithmeticGameId, DailyChallengeCompletion, MatchRecord } from '../types';

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
      // unparseable dates sort last so the order of valid sessions never depends on input order
      const tA = finiteOr(new Date(a.playedAt).getTime(), Infinity);
      const tB = finiteOr(new Date(b.playedAt).getTime(), Infinity);
      return tA === tB ? 0 : tA < tB ? -1 : 1;
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
  const safeDays = Math.max(7, Math.min(30, finiteOr(days, 14)));
  const dailyByDate = indexDailyByDate(dailyCompletions);

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
