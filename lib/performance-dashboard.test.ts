import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArithmeticAccuracySeries,
  buildArithmeticGameBreakdown,
  buildChallengeCompletionHistory,
  buildDailyChallenge30DayFrequency,
  buildDailyScoreSpeedSeries,
  buildDailyStreakDurationSeries,
  computeDashboardOverview,
  createSampleDashboardData,
  isSampleDailyCompletion,
} from './performance-dashboard';

test('buildArithmeticAccuracySeries sorts chronologically, computes 3-session rolling accuracy, and filters cleanly', () => {
  const { sampleMatches } = createSampleDashboardData('2026-11-19');
  const all = buildArithmeticAccuracySeries(sampleMatches, 'all', 'all');

  assert.equal(all.length, 9);
  assert.equal(all[0].label, '#1');
  assert.equal(all[all.length - 1].label, '#9');
  assert.ok(all[all.length - 1].accuracyPercent > all[0].accuracyPercent);
  assert.ok(all[all.length - 1].rollingAccuracy >= 90);

  const addOnly = buildArithmeticAccuracySeries(
    sampleMatches,
    'addition-attack',
    'all'
  );
  assert.equal(addOnly.length, 3);
  assert.ok(addOnly.every((p) => p.gameId === 'addition-attack'));

  const stratOnly = buildArithmeticAccuracySeries(
    sampleMatches,
    'all',
    'strategists'
  );
  assert.equal(stratOnly.length, 1);
  assert.equal(stratOnly[0].tier, 'strategists');
});

test('buildArithmeticGameBreakdown aggregates per-game averages and peak adaptive bands', () => {
  const { sampleMatches } = createSampleDashboardData('2026-11-19');
  const breakdown = buildArithmeticGameBreakdown(sampleMatches, 'all');

  assert.equal(breakdown.length, 3);
  for (const row of breakdown) {
    assert.equal(row.sessions, 3);
    assert.ok((row.avgAccuracy ?? 0) >= 75);
    assert.ok((row.peakAdaptiveLevel ?? 0) >= 4);
  }
});

test('buildChallengeCompletionHistory builds 14-day stacked history and daily score/speed timeline', () => {
  const { sampleMatches, sampleDaily } = createSampleDashboardData('2026-11-19');
  const history = buildChallengeCompletionHistory(
    sampleMatches,
    sampleDaily,
    '2026-11-19',
    14
  );

  assert.equal(history.length, 14);
  assert.equal(history[13].dateKey, '2026-11-19');
  assert.equal(history[13].isToday, true);
  assert.equal(history[13].dailySolved, 1);
  assert.equal(history[13].arithmeticRounds, 1);
  assert.equal(history[13].totalChallenges, 2);

  const dailySeries = buildDailyScoreSpeedSeries(sampleDaily);
  assert.equal(dailySeries.length, 6);
  assert.ok(dailySeries[dailySeries.length - 1].score > dailySeries[0].score);
  assert.ok(
    dailySeries[dailySeries.length - 1].secondsUsed < dailySeries[0].secondsUsed
  );
  assert.ok(sampleDaily.every((d) => isSampleDailyCompletion(d)));
});

test('computeDashboardOverview calculates accurate averages, positive trend delta, and streak totals', () => {
  const { sampleMatches, sampleDaily } = createSampleDashboardData('2026-11-19');
  const overview = computeDashboardOverview(
    sampleMatches,
    sampleDaily,
    '2026-11-19'
  );

  assert.equal(overview.arithmeticSessionCount, 9);
  assert.equal(overview.dailySolvedCount, 6);
  assert.equal(overview.currentDailyStreak, 3);
  assert.equal(overview.bestDailyStreak, 3);
  assert.ok((overview.avgArithmeticAccuracy ?? 0) >= 85);
  assert.ok((overview.accuracyDelta ?? 0) > 0);
  assert.equal(overview.totalChallengesCompleted, 15);
});

test('buildDailyChallenge30DayFrequency maps 30 chronological days, statuses, longest run, and 6-day rollup blocks', () => {
  const { sampleDaily } = createSampleDashboardData('2026-11-19');
  const withTimedOut = [
    ...sampleDaily,
    {
      dateKey: '2026-11-12',
      editionNumber: 120,
      tier: 'challengers' as const,
      archetype: 'mystery-number' as const,
      archetypeTitle: 'Mystery Number Deduction',
      solved: false,
      stepsSolved: 1,
      secondsUsed: 90,
      timeLimitSeconds: 90,
      mistakes: 2,
      hintsUsed: 1,
      score: 40,
      streakDays: 0,
      completedAt: '2026-11-12T15:00:00.000Z',
    },
  ];

  const freq = buildDailyChallenge30DayFrequency(withTimedOut, '2026-11-19');

  assert.equal(freq.points.length, 30);
  assert.equal(freq.points[0].dateKey, '2026-10-21');
  assert.equal(freq.points[29].dateKey, '2026-11-19');
  assert.equal(freq.points[29].isToday, true);
  assert.equal(freq.points[29].status, 'solved');
  assert.equal(freq.points[29].barHeight, 1);

  const timedOutDay = freq.points.find((p) => p.dateKey === '2026-11-12');
  assert.ok(timedOutDay);
  assert.equal(timedOutDay.status, 'attempted');
  assert.equal(timedOutDay.completedCount, 0);
  assert.ok(timedOutDay.barHeight > 0.1 && timedOutDay.barHeight < 1);

  assert.equal(freq.solvedDays, 6);
  assert.equal(freq.attemptedOnlyDays, 1);
  assert.equal(freq.missedDays, 23);
  assert.equal(freq.activeDaysIn30Days, 7);
  assert.equal(freq.consistencyPercent, 20);
  assert.equal(freq.longestRunIn30Days, 3);

  assert.equal(freq.weeklyBuckets.length, 5);
  const totalInBlocks = freq.weeklyBuckets.reduce(
    (sum, b) => sum + b.completedDays,
    0
  );
  assert.equal(totalInBlocks, 6);
});

test('buildDailyStreakDurationSeries tracks streak duration over time and highlights peak streak periods', () => {
  const { sampleDaily } = createSampleDashboardData('2026-11-19');
  const trend = buildDailyStreakDurationSeries(sampleDaily, '2026-11-19', 30);

  assert.equal(trend.points.length, 30);
  assert.equal(trend.peakStreakDuration, 3);
  assert.equal(trend.currentStreakDuration, 3);
  assert.equal(trend.activeStreakDays, 6);
  assert.equal(trend.averageRunLength, 2);

  // Sample has a 2-day run (daysAgo 24..23), 1-day run (daysAgo 11), and 3-day peak run (daysAgo 2..0)
  assert.equal(trend.peakPeriods.length, 1);
  assert.equal(trend.peakPeriods[0].startDateKey, '2026-11-17');
  assert.equal(trend.peakPeriods[0].endDateKey, '2026-11-19');
  assert.equal(trend.peakPeriods[0].peakLength, 3);

  const peakPoints = trend.points.filter((p) => p.isPeakPoint);
  assert.equal(peakPoints.length, 1);
  assert.equal(peakPoints[0].dateKey, '2026-11-19');
  assert.equal(peakPoints[0].streakLength, 3);

  const inPeakCount = trend.points.filter((p) => p.inPeakPeriod).length;
  assert.equal(inPeakCount, 3);

  // Empty completions return safe zeros and no peak periods
  const emptyTrend = buildDailyStreakDurationSeries([], '2026-11-19', 14);
  assert.equal(emptyTrend.points.length, 14);
  assert.equal(emptyTrend.peakStreakDuration, 0);
  assert.equal(emptyTrend.peakPeriods.length, 0);
  assert.equal(emptyTrend.currentStreakDuration, 0);
});
