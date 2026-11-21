import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDailyProblemGoal,
  computeDailyGoalProgress,
  DAILY_PROBLEM_GOAL,
  getTodayProblemBreakdown,
  MAX_DAILY_PROBLEM_GOAL,
  MIN_DAILY_PROBLEM_GOAL,
} from './daily-goal';
import type { DailyChallengeCompletion, MatchRecord } from './types';

describe('Daily Goal Progress Ring & Streak Counter (lib/daily-goal.ts)', () => {
  it('computes remaining daily problems and streak flame stats cleanly from empty state', () => {
    const progress = computeDailyGoalProgress({
      matches: [],
      dailyCompletions: [],
      todayKey: '2026-11-20',
    });

    assert.equal(progress.problemsSolvedToday, 0);
    assert.equal(progress.problemsRemaining, DAILY_PROBLEM_GOAL);
    assert.equal(progress.ringPercent, 0);
    assert.equal(progress.goalMetToday, false);
    assert.equal(progress.dailyStreak, 0);
    assert.equal(progress.streakDaysRemaining, 3);
  });

  it('aggregates arithmetic solved problems + daily challenge clues + consecutive daily streak', () => {
    const todayIso = '2026-11-20T15:30:00.000Z';
    const matches: MatchRecord[] = [
      {
        id: 'm-arith-1',
        gameTitle: 'Addition Attack',
        mode: 'solo',
        tier: 'challengers',
        variant: 'classic',
        playerScore: 140,
        opponentScore: 100,
        opponentName: 'Par',
        result: 'win',
        primesClaimed: 0,
        playedAt: todayIso,
        arithmeticMeta: {
          gameId: 'addition-attack',
          pace: 'standard',
          solved: 7,
          attempted: 8,
          accuracyPercent: 88,
          bestStreak: 5,
          durationSeconds: 60,
        },
      },
    ];

    const dailyCompletions: DailyChallengeCompletion[] = [
      {
        dateKey: '2026-11-19',
        editionNumber: 100,
        tier: 'challengers',
        archetype: 'equation-vault',
        archetypeTitle: 'Equation Vault',
        solved: true,
        stepsSolved: 3,
        score: 210,
        secondsUsed: 42,
        timeLimitSeconds: 90,
        mistakes: 0,
        hintsUsed: 0,
        completedAt: '2026-11-19T16:00:00.000Z',
      },
      {
        dateKey: '2026-11-20',
        editionNumber: 101,
        tier: 'challengers',
        archetype: 'divisor-cipher',
        archetypeTitle: 'Divisor & Sequence Cipher',
        solved: true,
        stepsSolved: 3,
        score: 230,
        secondsUsed: 38,
        timeLimitSeconds: 90,
        mistakes: 0,
        hintsUsed: 0,
        completedAt: todayIso,
      },
    ];

    const progress = computeDailyGoalProgress({
      matches,
      dailyCompletions,
      todayKey: '2026-11-20',
    });

    // 7 arithmetic + 3 daily puzzle clues = 10/10 (100%)
    assert.equal(progress.problemsSolvedToday, 10);
    assert.equal(progress.problemsRemaining, 0);
    assert.equal(progress.ringPercent, 100);
    assert.equal(progress.goalMetToday, true);
    assert.equal(progress.dailyStreak, 2);
    assert.equal(progress.solvedDailyToday, true);
    assert.equal(progress.streakDaysRemaining, 1);

    // Custom higher target (e.g., 25) dynamically updates remaining count and ring percent
    const customProgress = computeDailyGoalProgress({
      matches,
      dailyCompletions,
      todayKey: '2026-11-20',
      dailyProblemGoal: 25,
    });
    assert.equal(customProgress.dailyProblemGoal, 25);
    assert.equal(customProgress.problemsRemaining, 15);
    assert.equal(customProgress.ringPercent, 40);
    assert.equal(customProgress.goalMetToday, false);
  });

  it('clamps custom daily goals safely and breaks down today counts by source', () => {
    assert.equal(clampDailyProblemGoal(1), MIN_DAILY_PROBLEM_GOAL);
    assert.equal(clampDailyProblemGoal(250), MAX_DAILY_PROBLEM_GOAL);
    assert.equal(clampDailyProblemGoal(NaN), DAILY_PROBLEM_GOAL);
    assert.equal(clampDailyProblemGoal(22.4), 22);

    const todayIso = '2026-11-20T14:00:00.000Z';
    const matches: MatchRecord[] = [
      {
        id: 'sample-dash-arith-9',
        gameTitle: 'Multiplication Mastery',
        mode: 'solo',
        tier: 'challengers',
        variant: 'classic',
        playerScore: 276,
        opponentScore: 130,
        opponentName: 'Par',
        result: 'win',
        primesClaimed: 0,
        playedAt: todayIso,
        arithmeticMeta: {
          gameId: 'multiplication-mastery',
          pace: 'standard',
          solved: 19,
          attempted: 20,
          accuracyPercent: 95,
          bestStreak: 9,
          durationSeconds: 60,
        },
      },
      {
        id: 'real-ef-1',
        gameTitle: 'Equation Foundry',
        mode: 'solo',
        tier: 'challengers',
        variant: 'classic',
        playerScore: 180,
        opponentScore: 120,
        opponentName: 'Par',
        result: 'win',
        primesClaimed: 0,
        playedAt: todayIso,
        solvedProblems: 5,
      },
    ];

    assert.equal(clampDailyProblemGoal(Infinity), MAX_DAILY_PROBLEM_GOAL);
    assert.equal(clampDailyProblemGoal(-Infinity), MIN_DAILY_PROBLEM_GOAL);

    const breakdownRealOnly = getTodayProblemBreakdown(
      matches,
      [],
      '2026-11-20',
      false
    );
    assert.equal(breakdownRealOnly.arithmeticProblems, 0);
    assert.equal(breakdownRealOnly.arenaProblems, 5);
    assert.equal(breakdownRealOnly.totalProblems, 5);

    const breakdownWithSample = getTodayProblemBreakdown(
      matches,
      [],
      '2026-11-20',
      true
    );
    assert.equal(breakdownWithSample.arithmeticProblems, 19);
    assert.equal(breakdownWithSample.arenaProblems, 5);
    assert.equal(breakdownWithSample.totalProblems, 24);
  });
});
