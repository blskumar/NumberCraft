import { getLocalDateKey, shiftDateKey } from '../daily-challenge';
import { finiteOr, formatMonthDayFromDateKey, indexDailyByDate } from './helpers';
import type { DailyScoreSpeedPoint, DailyConsistencyStatus, DailyFrequency30DayPoint, WeeklyConsistencyBucket, DailyConsistency30DayData, DailyGoalRateStatus, DailyGoalRateDayPoint, DailyGoalRatePeriodBucket, DailyGoalCompletionRate30DayData } from './types';
import type { DailyChallengeCompletion } from '../types';

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

export function buildDailyChallenge30DayFrequency(
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DailyConsistency30DayData {
  const dailyByDate = indexDailyByDate(dailyCompletions);

  const points: DailyFrequency30DayPoint[] = [];
  let solvedDays = 0;
  let attemptedOnlyDays = 0;
  let longestRunIn30Days = 0;
  let currentRun = 0;

  for (let offset = -29; offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const entry = dailyByDate.get(dateKey);

    let status: DailyConsistencyStatus = 'missed';
    let completedCount = 0;
    let barHeight = 0.08;

    if (entry?.solved) {
      status = 'solved';
      completedCount = 1;
      barHeight = 1;
      solvedDays += 1;
      currentRun += 1;
      if (currentRun > longestRunIn30Days) {
        longestRunIn30Days = currentRun;
      }
    } else if (entry) {
      status = 'attempted';
      completedCount = 0;
      barHeight = 0.42;
      attemptedOnlyDays += 1;
      currentRun = 0;
    } else {
      currentRun = 0;
    }

    points.push({
      index: offset + 30,
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      dayOfMonth: String(parts[2] ?? ''),
      isToday: dateKey === todayKey,
      status,
      completedCount,
      barHeight,
      editionNumber: entry?.editionNumber ?? null,
      archetypeTitle: entry?.archetypeTitle ?? null,
      score: entry?.score ?? 0,
      secondsUsed: entry?.secondsUsed ?? 0,
      timeLimitSeconds: entry?.timeLimitSeconds ?? 0,
      mistakes: entry?.mistakes ?? 0,
      hintsUsed: entry?.hintsUsed ?? 0,
    });
  }

  const weeklyBuckets: WeeklyConsistencyBucket[] = [];
  const bucketSize = 6;
  for (let b = 0; b < 5; b += 1) {
    const slice = points.slice(b * bucketSize, (b + 1) * bucketSize);
    const completedDays = slice.filter((p) => p.status === 'solved').length;
    const attemptedDays = slice.filter((p) => p.status === 'attempted').length;
    const first = slice[0];
    const last = slice[slice.length - 1];
    weeklyBuckets.push({
      periodIndex: b + 1,
      label: `Days ${b * bucketSize + 1}–${(b + 1) * bucketSize}`,
      rangeLabel:
        first && last ? `${first.dateLabel} – ${last.dateLabel}` : `Block ${b + 1}`,
      completedDays,
      attemptedDays,
      totalDays: slice.length,
      completionRatePercent: Math.round((completedDays / slice.length) * 100),
    });
  }

  const missedDays = 30 - solvedDays - attemptedOnlyDays;

  return {
    points,
    weeklyBuckets,
    solvedDays,
    attemptedOnlyDays,
    missedDays,
    consistencyPercent: Math.round((solvedDays / 30) * 100),
    longestRunIn30Days,
    activeDaysIn30Days: solvedDays + attemptedOnlyDays,
    startDateLabel: points[0]?.dateLabel ?? todayKey,
    endDateLabel: points[points.length - 1]?.dateLabel ?? todayKey,
  };
}

/**
 * Computes a 30-day Daily Goal Completion Rate series directly from dailyCompletions.
 * Each calendar day records 100% when solved (3/3 clues), partial progress percentage
 * (stepsSolved / 3) when attempted without finishing, or 0% when missed, alongside
 * trailing 7-day rolling completion rates and five 6-day block completion rates.
 */
export function buildDailyGoalCompletionRate30Day(
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey()
): DailyGoalCompletionRate30DayData {
  const dailyByDate = indexDailyByDate(dailyCompletions);

  const rawPoints: Omit<DailyGoalRateDayPoint, 'rolling7DayRatePercent'>[] = [];
  let daysMet = 0;
  let partialDays = 0;

  for (let offset = -29; offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const entry = dailyByDate.get(dateKey);

    let status: DailyGoalRateStatus = 'missed';
    let completionRatePercent = 0;
    let stepsSolved = 0;

    if (entry?.solved) {
      status = 'met';
      completionRatePercent = 100;
      stepsSolved = Math.max(3, finiteOr(entry.stepsSolved, 3));
      daysMet += 1;
    } else if (entry) {
      status = 'partial';
      stepsSolved = Math.max(0, Math.min(3, Math.round(finiteOr(entry.stepsSolved, 0))));
      completionRatePercent = Math.min(
        99,
        Math.round((stepsSolved / 3) * 100)
      );
      partialDays += 1;
    }

    rawPoints.push({
      index: offset + 30,
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      isToday: dateKey === todayKey,
      status,
      completionRatePercent,
      stepsSolved,
      editionNumber: entry?.editionNumber ?? null,
      archetypeTitle: entry?.archetypeTitle ?? null,
      score: entry?.score ?? 0,
    });
  }

  const points: DailyGoalRateDayPoint[] = rawPoints.map((pt, idx) => {
    const startIdx = Math.max(0, idx - 6);
    const windowSlice = rawPoints.slice(startIdx, idx + 1);
    const metInWindow = windowSlice.filter((p) => p.status === 'met').length;
    const rolling7DayRatePercent = Math.round(
      (metInWindow / windowSlice.length) * 100
    );
    return {
      ...pt,
      rolling7DayRatePercent,
    };
  });

  const periodBuckets: DailyGoalRatePeriodBucket[] = [];
  const bucketSize = 6;
  for (let b = 0; b < 5; b += 1) {
    const slice = points.slice(b * bucketSize, (b + 1) * bucketSize);
    const bucketMet = slice.filter((p) => p.status === 'met').length;
    const bucketPartial = slice.filter((p) => p.status === 'partial').length;
    const avgDailyRatePercent = Math.round(
      slice.reduce((sum, p) => sum + p.completionRatePercent, 0) / slice.length
    );
    const first = slice[0];
    const last = slice[slice.length - 1];
    periodBuckets.push({
      periodIndex: b + 1,
      label: `Days ${b * bucketSize + 1}–${(b + 1) * bucketSize}`,
      rangeLabel:
        first && last
          ? `${first.dateLabel} – ${last.dateLabel}`
          : `Block ${b + 1}`,
      daysMet: bucketMet,
      partialDays: bucketPartial,
      totalDays: slice.length,
      completionRatePercent: Math.round((bucketMet / slice.length) * 100),
      avgDailyRatePercent,
    });
  }

  const missedDays = 30 - daysMet - partialDays;
  const overallCompletionRatePercent = Math.round((daysMet / 30) * 100);
  const avgDailyRatePercent = Math.round(
    points.reduce((sum, p) => sum + p.completionRatePercent, 0) / 30
  );
  const last7Slice = points.slice(-7);
  const last7DaysRatePercent = Math.round(
    (last7Slice.filter((p) => p.status === 'met').length / last7Slice.length) *
      100
  );
  const bestBlockRatePercent = periodBuckets.reduce(
    (max, b) => Math.max(max, b.completionRatePercent),
    0
  );

  return {
    points,
    periodBuckets,
    daysMet,
    partialDays,
    missedDays,
    overallCompletionRatePercent,
    avgDailyRatePercent,
    last7DaysRatePercent,
    bestBlockRatePercent,
    startDateLabel: points[0]?.dateLabel ?? todayKey,
    endDateLabel: points[points.length - 1]?.dateLabel ?? todayKey,
  };
}
