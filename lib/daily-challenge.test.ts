import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyMatchRecord,
  buildDailyShareSummary,
  calculateDailyScore,
  computeDailyStreakStats,
  formatCountdownClock,
  generateDailyPuzzle,
  getEditionNumber,
  shiftDateKey,
} from './daily-challenge';
import { evaluateAchievements } from './achievements';
import type { AgeTier, DailyChallengeCompletion } from './types';

test('generateDailyPuzzle is deterministic per date and rotates across all 4 archetypes', () => {
  const p1 = generateDailyPuzzle('2026-11-19', 'challengers');
  const p2 = generateDailyPuzzle('2026-11-19', 'challengers');
  assert.deepEqual(p1, p2);

  const archetypes = new Set<string>();
  const editions = new Set<number>();
  const tiers: AgeTier[] = ['explorers', 'challengers', 'strategists'];

  for (let offset = 0; offset < 12; offset++) {
    const key = shiftDateKey('2026-11-19', offset);
    editions.add(getEditionNumber(key));
    for (const tier of tiers) {
      const puzzle = generateDailyPuzzle(key, tier);
      archetypes.add(puzzle.archetype);
      assert.equal(puzzle.steps.length, 3);
      for (const step of puzzle.steps) {
        assert.ok(Number.isInteger(step.answer) && step.answer > 0);
        assert.ok(step.hint.length > 5);
        assert.ok(step.explanation.length > 5);
      }
    }
  }

  assert.equal(editions.size, 12);
  assert.equal(archetypes.size, 4);
});

test('computeDailyStreakStats computes consecutive daily streaks and 7-day rolling calendar accurately', () => {
  const mk = (dateKey: string, solved = true): DailyChallengeCompletion => ({
    dateKey,
    editionNumber: getEditionNumber(dateKey),
    tier: 'challengers',
    archetype: 'equation-vault',
    archetypeTitle: 'Equation Vault',
    solved,
    stepsSolved: solved ? 3 : 1,
    secondsUsed: 32,
    timeLimitSeconds: 90,
    mistakes: 0,
    hintsUsed: 0,
    score: 260,
    completedAt: `${dateKey}T12:00:00.000Z`,
  });

  const completions = [
    mk('2026-11-17', true),
    mk('2026-11-18', true),
    mk('2026-11-19', true),
  ];

  const stats = computeDailyStreakStats(completions, '2026-11-19');
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.bestStreak, 3);
  assert.equal(stats.totalSolved, 3);
  assert.equal(stats.solvedToday, true);
  assert.equal(stats.last7Days.length, 7);
  assert.equal(stats.last7Days[6].isToday, true);
  assert.equal(stats.last7Days[6].solved, true);
  assert.equal(stats.last7Days[4].solved, true);
  assert.equal(stats.last7Days[3].solved, false);
});

test('Daily Challenge unlocks all 4 unique Daily Mastery Seals without corrupting Factor Grid seals', () => {
  const mk = (
    dateKey: string,
    overrides: Partial<DailyChallengeCompletion> = {}
  ): DailyChallengeCompletion => ({
    dateKey,
    editionNumber: getEditionNumber(dateKey),
    tier: 'challengers',
    archetype: 'balance-scale',
    archetypeTitle: 'Algebraic Balance Scale',
    solved: true,
    stepsSolved: 3,
    secondsUsed: 30, // <= 45 (50% of 90s)
    timeLimitSeconds: 90,
    mistakes: 0,
    hintsUsed: 0,
    score: calculateDailyScore({
      solved: true,
      stepsSolved: 3,
      secondsUsed: 30,
      timeLimitSeconds: 90,
      mistakes: 0,
      hintsUsed: 0,
    }),
    completedAt: `${dateKey}T14:00:00.000Z`,
    ...overrides,
  });

  const day1 = mk('2026-11-17');
  const day1Match = buildDailyMatchRecord(day1);
  assert.equal(day1Match.gameTitle, 'Daily Math Challenge');
  assert.ok(buildDailyShareSummary(day1).includes('Solved 3/3'));
  assert.equal(formatCountdownClock(3661), '01:01:01');

  const evalDay1 = evaluateAchievements([day1Match], [], [day1]);
  const idsDay1 = new Set(evalDay1.earnedRecords.map((b) => b.id));
  assert.equal(idsDay1.has('daily-pioneer'), true);
  assert.equal(idsDay1.has('daily-lightning'), true);
  assert.equal(idsDay1.has('daily-flawless'), true);
  assert.equal(idsDay1.has('daily-streak-3'), false);
  // Factor Grid badges must NOT unlock from Daily Challenge
  assert.equal(idsDay1.has('first-victory'), false);
  assert.equal(idsDay1.has('taxman-victor'), false);

  const threeDays = [day1, mk('2026-11-18'), mk('2026-11-19')];
  const evalDay3 = evaluateAchievements(
    threeDays.map(buildDailyMatchRecord),
    evalDay1.earnedRecords,
    threeDays
  );
  const idsDay3 = new Set(evalDay3.earnedRecords.map((b) => b.id));
  assert.equal(idsDay3.has('daily-streak-3'), true);
  assert.equal(evalDay3.bestDailyStreak, 3);
});

test('Consecutive daily streak rewards scale bonus points and milestone progress accurately', async () => {
  const { getStreakBonusPoints, getStreakRewardSummary } = await import(
    './daily-challenge'
  );

  assert.equal(getStreakBonusPoints(0), 0);
  assert.equal(getStreakBonusPoints(1), 0);
  assert.equal(getStreakBonusPoints(2), 15);
  assert.equal(getStreakBonusPoints(3), 30);
  assert.equal(getStreakBonusPoints(5), 50);
  assert.equal(getStreakBonusPoints(7), 75);
  assert.equal(getStreakBonusPoints(12), 75);

  const day0 = getStreakRewardSummary(0, false);
  assert.equal(day0.projectedStreakIfSolvedToday, 1);
  assert.equal(day0.projectedBonusPoints, 0);
  assert.equal(day0.nextMilestone?.days, 2);

  const day1Pending = getStreakRewardSummary(1, false);
  assert.equal(day1Pending.projectedStreakIfSolvedToday, 2);
  assert.equal(day1Pending.projectedBonusPoints, 15);
  assert.equal(day1Pending.daysToNextMilestone, 1);

  const day2Pending = getStreakRewardSummary(2, false);
  assert.equal(day2Pending.currentBonusPoints, 15);
  assert.equal(day2Pending.projectedStreakIfSolvedToday, 3);
  assert.equal(day2Pending.projectedBonusPoints, 30);
  assert.equal(day2Pending.nextMilestone?.days, 3);

  const baseScore = calculateDailyScore({
    solved: true,
    stepsSolved: 3,
    secondsUsed: 45,
    timeLimitSeconds: 90,
    mistakes: 0,
    hintsUsed: 0,
    streakDays: 1,
  });
  const streak3Score = calculateDailyScore({
    solved: true,
    stepsSolved: 3,
    secondsUsed: 45,
    timeLimitSeconds: 90,
    mistakes: 0,
    hintsUsed: 0,
    streakDays: 3,
  });
  assert.equal(streak3Score - baseScore, 30);

  const shareWithStreak = buildDailyShareSummary({
    dateKey: '2026-11-19',
    editionNumber: 415,
    tier: 'challengers',
    archetype: 'equation-vault',
    archetypeTitle: 'Equation Vault',
    solved: true,
    stepsSolved: 3,
    secondsUsed: 32,
    timeLimitSeconds: 90,
    mistakes: 0,
    hintsUsed: 0,
    score: streak3Score,
    streakDays: 3,
    streakBonus: 30,
    completedAt: '2026-11-19T12:00:00.000Z',
  });
  assert.ok(shareWithStreak.includes('3d Streak'));
});

