import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyLeaderboard } from './daily-leaderboard';
import type { DailyChallengeCompletion, StudentProfile } from './types';

const TEST_PROFILE: StudentProfile = {
  displayName: 'Avery Quinn',
  ageTier: 'challengers',
  soundEnabled: true,
  sessionKind: 'guest',
};

describe('Daily Leaderboard Engine (lib/daily-leaderboard.ts)', () => {
  it('returns exactly 5 deterministically sorted top scholars for a given date', () => {
    const first = buildDailyLeaderboard({
      profile: TEST_PROFILE,
      dailyCompletions: [],
      todayKey: '2026-11-20',
      tierFilter: 'all',
    });
    const second = buildDailyLeaderboard({
      profile: TEST_PROFILE,
      dailyCompletions: [],
      todayKey: '2026-11-20',
      tierFilter: 'all',
    });

    assert.equal(first.topFive.length, 5);
    assert.deepEqual(first.topFive, second.topFive);
    assert.equal(first.currentUserSolvedToday, false);
    assert.equal(first.currentUserEntry, null);

    // Strictly non-increasing scores across ranks 1..5
    for (let i = 1; i < first.topFive.length; i += 1) {
      assert.equal(first.topFive[i].rank, i + 1);
      assert.ok(first.topFive[i - 1].score >= first.topFive[i].score);
    }
  });

  it('inserts and ranks the current student when they solve today’s Daily Challenge', () => {
    const highCompletion: DailyChallengeCompletion = {
      dateKey: '2026-11-20',
      editionNumber: 416,
      tier: 'challengers',
      archetype: 'mystery-number',
      archetypeTitle: 'Mystery Number Deduction',
      solved: true,
      stepsSolved: 3,
      secondsUsed: 18,
      timeLimitSeconds: 90,
      mistakes: 0,
      hintsUsed: 0,
      score: 395,
      streakDays: 5,
      completedAt: '2026-11-20T12:00:00.000Z',
    };

    const snapshot = buildDailyLeaderboard({
      profile: TEST_PROFILE,
      dailyCompletions: [highCompletion],
      todayKey: '2026-11-20',
      tierFilter: 'all',
    });

    assert.equal(snapshot.currentUserSolvedToday, true);
    assert.ok(snapshot.currentUserEntry);
    assert.equal(snapshot.currentUserEntry.rank, 1);
    assert.equal(snapshot.topFive[0].isCurrentUser, true);
    assert.equal(snapshot.topFive[0].displayName, 'Avery Quinn');
    assert.equal(snapshot.pointsToFirst, 0);
    assert.equal(snapshot.pointsToTopFive, 0);
  });

  it('filters cleanly by age tier and keeps exactly 5 entries per tier', () => {
    const challengersOnly = buildDailyLeaderboard({
      profile: TEST_PROFILE,
      dailyCompletions: [],
      todayKey: '2026-11-20',
      tierFilter: 'challengers',
    });

    assert.equal(challengersOnly.topFive.length, 5);
    assert.ok(challengersOnly.topFive.every((e) => e.tier === 'challengers'));
  });
});
