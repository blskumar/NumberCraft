import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMilestoneMultiplier,
  DAILY_MILESTONE_MULTIPLIER,
  evaluateDailyMilestone,
  getDailyMilestoneForDate,
  isMatchForDailyMilestoneArena,
} from './daily-milestone';
import { evaluateAchievements } from './achievements';
import { countProblemsSolvedOnDate } from './daily-goal';
import type { MatchRecord } from './types';

function makeBaseMatch(overrides: Partial<MatchRecord>): MatchRecord {
  return {
    id: 'm-1',
    gameTitle: 'Factor Grid',
    mode: 'vs-ai',
    aiDifficulty: 'apprentice',
    tier: 'challengers',
    variant: 'classic',
    playerScore: 200,
    opponentScore: 150,
    opponentName: 'AI · Apprentice',
    result: 'win',
    primesClaimed: 4,
    playedAt: '2026-11-20T18:00:00.000Z',
    ...overrides,
  };
}

describe('Daily Milestone Focus Arena & 1.5x Multiplier (lib/daily-milestone.ts)', () => {
  it('rotates deterministically across all 6 studio arenas over 6 consecutive days', () => {
    const dates = [
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
    ];
    const arenas = dates.map((d) => getDailyMilestoneForDate(d).arenaId);
    assert.equal(new Set(arenas).size, 6);
    assert.equal(
      getDailyMilestoneForDate('2026-11-20').multiplier,
      DAILY_MILESTONE_MULTIPLIER
    );
  });

  it('matches completed real sessions accurately against the daily focus arena and ignores sample matches', () => {
    const todayKey = '2026-11-20';
    const milestone = getDailyMilestoneForDate(todayKey);

    const matchingRecord =
      milestone.arenaId === 'factor-grid'
        ? makeBaseMatch({ id: 'real-fg', gameTitle: 'Factor Grid' })
        : milestone.arenaId === 'equation-foundry'
          ? makeBaseMatch({ id: 'real-ef', gameTitle: 'Equation Foundry' })
          : milestone.arenaId === 'odds-urns'
            ? makeBaseMatch({ id: 'real-ou', gameTitle: 'Odds & Urns' })
            : makeBaseMatch({
                id: 'real-arith',
                gameTitle: milestone.arenaTitle,
                arithmeticMeta: {
                  gameId: milestone.arenaId,
                  pace: 'standard',
                  solved: 8,
                  attempted: 9,
                  accuracyPercent: 89,
                  bestStreak: 4,
                  durationSeconds: 60,
                },
              });

    const sampleRecord = { ...matchingRecord, id: 'sample-ignored' };

    assert.equal(
      isMatchForDailyMilestoneArena(matchingRecord, milestone.arenaId),
      true
    );
    assert.equal(
      isMatchForDailyMilestoneArena(sampleRecord, milestone.arenaId),
      false
    );

    const status = evaluateDailyMilestone(
      [sampleRecord, matchingRecord],
      todayKey
    );
    assert.equal(status.completedToday, true);
    assert.equal(status.roundsCompletedToday, 1);
    assert.equal(status.multiplierActive, true);
  });

  it('applies the 1.5x Mastery Seal multiplier to achievement counters and daily goal credit', () => {
    assert.equal(applyMilestoneMultiplier(4, 1.5), 6);
    assert.equal(applyMilestoneMultiplier(10, 1.5), 15);
    assert.equal(applyMilestoneMultiplier(4, undefined), 4);

    // 2 boosted Factor Grid wins: prime credit is boosted (12) but the win streak stays an integer (2)
    const boostedMatches: MatchRecord[] = [
      makeBaseMatch({
        id: 'boost-1',
        primesClaimed: 4,
        dailyMilestoneMultiplier: 1.5,
        playedAt: '2026-11-20T16:00:00.000Z',
      }),
      makeBaseMatch({
        id: 'boost-2',
        primesClaimed: 4,
        dailyMilestoneMultiplier: 1.5,
        playedAt: '2026-11-20T17:00:00.000Z',
      }),
    ];

    const evalRes = evaluateAchievements(boostedMatches, []);
    const earnedIds = new Set(evalRes.earnedRecords.map((r) => r.id));
    assert.equal(evalRes.dailyMilestoneBoostedCount, 2);
    assert.equal(earnedIds.has('prime-collector'), true);
    assert.equal(earnedIds.has('perfect-streak'), false);
    assert.equal(evalRes.currentStreak, 2);

    // Daily goal credit is NOT inflated by the multiplier (it boosts points, not problem counts): 3 each -> 6
    const todayProblems = countProblemsSolvedOnDate(
      boostedMatches,
      [],
      '2026-11-20'
    );
    assert.equal(todayProblems, 6);
  });
});
