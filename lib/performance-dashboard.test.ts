import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArithmeticAccuracySeries,
  buildArithmeticGameBreakdown,
  buildChallengeCompletionHistory,
  buildDailyChallenge30DayFrequency,
  buildDailyGoalCompletionRate30Day,
  buildDailyScoreSpeedSeries,
  buildDailyStreakDurationSeries,
  computeDashboardOverview,
  createSampleDashboardData,
  detectStreakGrowthEvent,
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
  assert.equal(emptyTrend.milestoneDays.length, 0);
  assert.equal(emptyTrend.nextMilestoneTarget?.streakDay, 3);
  assert.equal(emptyTrend.currentStreakDuration, 0);
});

test('buildDailyStreakDurationSeries flags Mastery Milestone days at 3d, 7d, 14d, and 30d and tracks next target', () => {
  const { sampleDaily } = createSampleDashboardData('2026-11-19');
  const sampleTrend = buildDailyStreakDurationSeries(sampleDaily, '2026-11-19', 30);

  // Sample reaches a 3-day streak on today (2026-11-19) -> Three-Day Scholar milestone
  assert.equal(sampleTrend.milestoneDays.length, 1);
  assert.equal(sampleTrend.milestoneDays[0].dateKey, '2026-11-19');
  assert.equal(sampleTrend.milestoneDays[0].isMasteryMilestone, true);
  assert.equal(sampleTrend.milestoneDays[0].milestone?.title, 'Three-Day Scholar');
  assert.equal(sampleTrend.nextMilestoneTarget?.streakDay, 7);

  // Build an 8-day continuous streak ending 2026-11-19 -> hits both 3d and 7d milestones
  const eightDayCompletions = Array.from({ length: 8 }, (_, idx) => {
    const day = 12 + idx;
    const dk = `2026-11-${String(day).padStart(2, '0')}`;
    return {
      dateKey: dk,
      editionNumber: 400 + idx,
      tier: 'challengers' as const,
      archetype: 'equation-vault' as const,
      archetypeTitle: 'Equation Vault',
      solved: true,
      stepsSolved: 3,
      secondsUsed: 35,
      timeLimitSeconds: 90,
      mistakes: 0,
      hintsUsed: 0,
      score: 265,
      streakDays: idx + 1,
      completedAt: `${dk}T15:00:00.000Z`,
    };
  });

  const eightDayTrend = buildDailyStreakDurationSeries(
    eightDayCompletions,
    '2026-11-19',
    14
  );
  assert.equal(eightDayTrend.milestoneDays.length, 2);
  assert.equal(eightDayTrend.milestoneDays[0].streakLength, 3);
  assert.equal(eightDayTrend.milestoneDays[0].milestone?.title, 'Three-Day Scholar');
  assert.equal(eightDayTrend.milestoneDays[1].streakLength, 7);
  assert.equal(eightDayTrend.milestoneDays[1].milestone?.title, 'Weekly Tactician');
  assert.equal(eightDayTrend.nextMilestoneTarget?.streakDay, 14);
});

test('detectStreakGrowthEvent triggers cleanly on new milestones, consecutive streak gains, and daily goal successes', () => {
  const empty = {
    currentStreakDuration: 0,
    milestoneCount: 0,
    dailyGoalMetToday: false,
    dailyMilestoneCompletedToday: false,
  };

  // No growth when remaining empty
  assert.equal(detectStreakGrowthEvent(null, empty).triggered, false);
  assert.equal(detectStreakGrowthEvent(empty, empty).triggered, false);

  // Mastery milestone jump triggers mastery-milestone highlight
  const milestoneEvent = detectStreakGrowthEvent(empty, {
    currentStreakDuration: 3,
    milestoneCount: 1,
    dailyGoalMetToday: true,
    dailyMilestoneCompletedToday: false,
  });
  assert.equal(milestoneEvent.triggered, true);
  assert.equal(milestoneEvent.reason, 'mastery-milestone');

  // Consecutive streak growth (1 -> 2) triggers consecutive-streak highlight
  const streakGain = detectStreakGrowthEvent(
    {
      currentStreakDuration: 1,
      milestoneCount: 0,
      dailyGoalMetToday: false,
      dailyMilestoneCompletedToday: false,
    },
    {
      currentStreakDuration: 2,
      milestoneCount: 0,
      dailyGoalMetToday: false,
      dailyMilestoneCompletedToday: false,
    }
  );
  assert.equal(streakGain.triggered, true);
  assert.equal(streakGain.reason, 'consecutive-streak');

  // Daily goal met flip triggers daily-goal-success highlight
  const goalHit = detectStreakGrowthEvent(
    {
      currentStreakDuration: 1,
      milestoneCount: 0,
      dailyGoalMetToday: false,
      dailyMilestoneCompletedToday: false,
    },
    {
      currentStreakDuration: 1,
      milestoneCount: 0,
      dailyGoalMetToday: true,
      dailyMilestoneCompletedToday: false,
    }
  );
  assert.equal(goalHit.triggered, true);
  assert.equal(goalHit.reason, 'daily-goal-success');

  // Daily Milestone arena completion triggers daily-milestone-arena highlight
  const arenaHit = detectStreakGrowthEvent(empty, {
    currentStreakDuration: 0,
    milestoneCount: 0,
    dailyGoalMetToday: false,
    dailyMilestoneCompletedToday: true,
  });
  assert.equal(arenaHit.triggered, true);
  assert.equal(arenaHit.reason, 'daily-milestone-arena');

  // Decreasing or unchanged state does not re-trigger
  const unchanged = detectStreakGrowthEvent(
    {
      currentStreakDuration: 3,
      milestoneCount: 1,
      dailyGoalMetToday: true,
      dailyMilestoneCompletedToday: true,
    },
    {
      currentStreakDuration: 3,
      milestoneCount: 1,
      dailyGoalMetToday: true,
      dailyMilestoneCompletedToday: true,
    }
  );
  assert.equal(unchanged.triggered, false);
});

test('buildDailyGoalCompletionRate30Day calculates 30-day rates, partial steps, 7-day rolling rate, and 6-day blocks from dailyCompletions', () => {
  const { sampleDaily } = createSampleDashboardData('2026-11-20');
  const withPartial = [
    ...sampleDaily,
    {
      dateKey: '2026-11-15',
      editionNumber: 120,
      tier: 'challengers' as const,
      archetype: 'equation-vault' as const,
      archetypeTitle: 'Equation Vault',
      solved: false,
      stepsSolved: 2,
      secondsUsed: 90,
      timeLimitSeconds: 90,
      mistakes: 2,
      hintsUsed: 1,
      score: 64,
      completedAt: '2026-11-15T12:00:00.000Z',
    },
  ];

  const rateData = buildDailyGoalCompletionRate30Day(withPartial, '2026-11-20');
  assert.equal(rateData.points.length, 30);
  assert.equal(rateData.periodBuckets.length, 5);
  assert.equal(rateData.daysMet, 6);
  assert.equal(rateData.partialDays, 1);
  assert.equal(rateData.missedDays, 23);
  assert.equal(rateData.overallCompletionRatePercent, 20); // 6 / 30 = 20%
  assert.equal(rateData.last7DaysRatePercent, 43); // 3 solved in last 7 days = 42.85 -> 43%

  const partialPt = rateData.points.find((p) => p.dateKey === '2026-11-15');
  assert.ok(partialPt);
  assert.equal(partialPt.status, 'partial');
  assert.equal(partialPt.completionRatePercent, 67); // 2 / 3 -> 67%

  const todayPt = rateData.points[rateData.points.length - 1];
  assert.equal(todayPt.dateKey, '2026-11-20');
  assert.equal(todayPt.isToday, true);
  assert.equal(todayPt.status, 'met');
  assert.equal(todayPt.completionRatePercent, 100);
  assert.equal(todayPt.rolling7DayRatePercent, 43);

  // Empty completions produce clean 0% baseline across all 30 days
  const emptyData = buildDailyGoalCompletionRate30Day([], '2026-11-20');
  assert.equal(emptyData.points.length, 30);
  assert.equal(emptyData.daysMet, 0);
  assert.equal(emptyData.overallCompletionRatePercent, 0);
  assert.equal(emptyData.last7DaysRatePercent, 0);
});
