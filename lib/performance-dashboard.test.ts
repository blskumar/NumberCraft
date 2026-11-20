import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArithmeticAccuracySeries,
  buildArithmeticGameBreakdown,
  buildChallengeCompletionHistory,
  buildDailyScoreSpeedSeries,
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
