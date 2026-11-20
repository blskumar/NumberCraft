import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDailyGoalProgress, DAILY_PROBLEM_GOAL } from './daily-goal';
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
          untimed: false,
          solved: 7,
          attempted: 8,
          accuracy: 88,
          bestStreak: 5,
          elapsedSeconds: 60,
        },
      },
    ];

    const dailyCompletions: DailyChallengeCompletion[] = [
      {
        dateKey: '2026-11-19',
        editionNumber: 100,
        tier: 'challengers',
        archetype: 'number-trail',
        solved: true,
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
        archetype: 'factor-lock',
        solved: true,
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
  });
});
