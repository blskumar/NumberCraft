import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENT_CATALOG,
  evaluateAchievements,
  getBoardBaseSum,
  getMasterySealProgressPercent,
  getTopScorerThreshold,
} from './achievements';
import { createSampleMatches } from './notebook-analytics';
import type { EarnedBadgeRecord, MatchRecord } from './types';

function makeMatch(overrides: Partial<MatchRecord> & { id: string }): MatchRecord {
  return {
    gameTitle: 'Factor Grid',
    mode: 'vs-ai',
    aiDifficulty: 'apprentice',
    tier: 'explorers',
    variant: 'classic',
    playerScore: 110,
    opponentScore: 100,
    opponentName: 'AI · Apprentice',
    result: 'win',
    primesClaimed: 1,
    playedAt: '2026-11-10T10:00:00.000Z',
    ...overrides,
  };
}

test('board base sums and Top Scorer 55% thresholds scale fairly across age tiers', () => {
  assert.equal(getBoardBaseSum('explorers'), 210);
  assert.equal(getTopScorerThreshold('explorers'), 116);

  assert.equal(getBoardBaseSum('challengers'), 666);
  assert.equal(getTopScorerThreshold('challengers'), 367);

  assert.equal(getBoardBaseSum('strategists'), 1225);
  assert.equal(getTopScorerThreshold('strategists'), 674);
});

test('sample matches never unlock permanent student badges (G3)', () => {
  const sample = createSampleMatches();
  const result = evaluateAchievements(sample, []);

  assert.equal(result.hasSampleMatches, true);
  assert.equal(result.realMatchCount, 0);
  assert.equal(result.earnedCount, 0);
  assert.equal(result.newlyUnlocked.length, 0);
  assert.equal(result.totalCount, ACHIEVEMENT_CATALOG.length);
});

test('Perfect Streak requires 3 consecutive Solo/vs-AI wins and ignores Pass-and-Play (G5)', () => {
  // 2 vs-AI wins + 2 local wins should NOT trigger Perfect Streak
  const withLocal = [
    makeMatch({ id: 'm1', mode: 'vs-ai', result: 'win', playedAt: '2026-11-10T10:00:00.000Z' }),
    makeMatch({ id: 'm2', mode: 'local', result: 'win', playedAt: '2026-11-10T11:00:00.000Z' }),
    makeMatch({ id: 'm3', mode: 'vs-ai', result: 'win', playedAt: '2026-11-10T12:00:00.000Z' }),
    makeMatch({ id: 'm4', mode: 'local', result: 'win', playedAt: '2026-11-10T13:00:00.000Z' }),
  ];

  const eval1 = evaluateAchievements(withLocal, []);
  const streak1 = eval1.statuses.find((s) => s.definition.id === 'perfect-streak');
  assert.ok(streak1);
  assert.equal(streak1.earned, false);
  assert.equal(eval1.currentStreak, 2);

  // Adding a loss breaks the streak, then 3 consecutive Solo/vs-AI wins unlock it
  const brokenThenWon = [
    ...withLocal,
    makeMatch({ id: 'm5', mode: 'vs-ai', result: 'loss', playedAt: '2026-11-10T14:00:00.000Z' }),
    makeMatch({ id: 'm6', mode: 'solo', result: 'win', playedAt: '2026-11-10T15:00:00.000Z' }),
    makeMatch({ id: 'm7', mode: 'vs-ai', result: 'win', playedAt: '2026-11-10T16:00:00.000Z' }),
    makeMatch({ id: 'm8', mode: 'solo', result: 'win', playedAt: '2026-11-10T17:00:00.000Z' }),
  ];

  const eval2 = evaluateAchievements(brokenThenWon, []);
  const streak2 = eval2.statuses.find((s) => s.definition.id === 'perfect-streak');
  assert.ok(streak2);
  assert.equal(streak2.earned, true);
  assert.equal(eval2.bestStreak, 3);
  assert.equal(eval2.currentStreak, 3);
});

test('Top Scorer, Scholar Rival, Master Strategist, Taxman Victor, and Tier Explorer unlock accurately', () => {
  const matches: MatchRecord[] = [
    // Explorers Solo win with >= 126 (60% of 210)
    makeMatch({
      id: 'r1',
      mode: 'solo',
      tier: 'explorers',
      playerScore: 128,
      opponentScore: 82,
      result: 'win',
      playedAt: '2026-11-11T10:00:00.000Z',
    }),
    // Challengers vs Master AI win
    makeMatch({
      id: 'r2',
      mode: 'vs-ai',
      aiDifficulty: 'master',
      tier: 'challengers',
      playerScore: 360,
      opponentScore: 306,
      result: 'win',
      playedAt: '2026-11-12T10:00:00.000Z',
    }),
    // Strategists match completes 3 tiers
    makeMatch({
      id: 'r3',
      mode: 'vs-ai',
      aiDifficulty: 'scholar',
      tier: 'strategists',
      playerScore: 590,
      opponentScore: 635,
      result: 'loss',
      playedAt: '2026-11-13T10:00:00.000Z',
    }),
  ];

  const evaluation = evaluateAchievements(matches, []);
  const earnedIds = new Set(evaluation.earnedRecords.map((b) => b.id));

  assert.equal(earnedIds.has('first-victory'), true);
  assert.equal(earnedIds.has('top-scorer'), true);
  assert.equal(earnedIds.has('taxman-victor'), true);
  assert.equal(earnedIds.has('scholar-rival'), true);
  assert.equal(earnedIds.has('master-strategist'), true);
  assert.equal(earnedIds.has('tier-explorer'), true);
  assert.equal(earnedIds.has('perfect-streak'), false);
  assert.equal(earnedIds.has('prime-collector'), false);
});

test('Prime Collector unlocks at 10 cumulative primes and persisted badges stay latched (G1)', () => {
  const persisted: EarnedBadgeRecord[] = [
    {
      id: 'top-scorer',
      unlockedAt: '2026-10-01T10:00:00.000Z',
      triggerMatchId: 'old-match-trimmed',
    },
  ];

  const tenMatches = Array.from({ length: 10 }, (_, idx) =>
    makeMatch({
      id: `p-${idx + 1}`,
      primesClaimed: 1,
      playerScore: 100,
      opponentScore: 110,
      result: 'loss',
      playedAt: `2026-11-${String(idx + 1).padStart(2, '0')}T10:00:00.000Z`,
    })
  );

  const evaluation = evaluateAchievements(tenMatches, persisted);
  const earnedIds = new Set(evaluation.earnedRecords.map((b) => b.id));

  // Previously persisted top-scorer stays latched even though none of these 10 matches qualified
  assert.equal(earnedIds.has('top-scorer'), true);
  // Prime collector unlocks freshly on the 10th prime
  assert.equal(earnedIds.has('prime-collector'), true);
  assert.deepEqual(
    evaluation.newlyUnlocked.map((d) => d.id),
    ['prime-collector']
  );
});

test('getMasterySealProgressPercent calculates clamped percentage progress accurately', () => {
  assert.equal(getMasterySealProgressPercent(0, 12), 0);
  assert.equal(getMasterySealProgressPercent(3, 12), 25);
  assert.equal(getMasterySealProgressPercent(5, 12), 42);
  assert.equal(getMasterySealProgressPercent(12, 12), 100);
  assert.equal(getMasterySealProgressPercent(15, 12), 100);
  assert.equal(getMasterySealProgressPercent(-2, 12), 0);
  assert.equal(getMasterySealProgressPercent(3, 0), 0);
});
