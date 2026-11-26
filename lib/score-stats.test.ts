import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailyScoreStats, buildMatchScoreStats } from './score-stats';
import type { DailyChallengeCompletion, MatchRecord } from './types';

const base = { id: 'x', gameTitle: 'G', mode: 'solo', tier: 'explorers', variant: 'classic', playerScore: 10, opponentScore: 20.4, opponentName: 'o', result: 'loss', primesClaimed: 0, playedAt: '' } as MatchRecord;

test('arithmetic stats carry meta and infer untimed from duration', () => {
  const meta = { gameId: 'addition-attack', pace: 'standard', solved: 5, attempted: 6, accuracyPercent: 83, bestStreak: 3, durationSeconds: 60 } as const;
  assert.deepEqual(buildMatchScoreStats({ ...base, arithmeticMeta: meta }), { solved: 5, attempted: 6, durationSeconds: 60, pace: 'standard', bestStreak: 3, untimed: false });
  assert.equal(buildMatchScoreStats({ ...base, arithmeticMeta: { ...meta, durationSeconds: 200 } }).untimed, true);
});
test('non-arithmetic stats carry opponent score; daily stats carry steps', () => {
  assert.deepEqual(buildMatchScoreStats(base), { opponentScore: 20 });
  const c = { stepsSolved: 3, mistakes: 1, hintsUsed: 0, secondsUsed: 40.6, solved: true } as DailyChallengeCompletion;
  assert.deepEqual(buildDailyScoreStats(c), { stepsSolved: 3, mistakes: 1, hintsUsed: 0, secondsUsed: 41, solved: true });
});
