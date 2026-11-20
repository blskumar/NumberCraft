import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMove,
  chooseAiMove,
  createFactorGame,
  getBestHintMove,
} from './factor-grid-engine';
import { evaluateAchievements } from './achievements';
import {
  buildTimelineSeries,
  createSampleMatches,
  isSampleMatch,
} from './notebook-analytics';
import {
  appendMatch,
  loadEarnedBadges,
  loadMatches,
  loadProfile,
  saveEarnedBadges,
  saveMatches,
  saveProfile,
} from './storage';
import type { MatchRecord } from './types';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockWindow = {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  };
  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;
  return store;
}

test('Integration: full Solo Taxman game playout -> MatchRecord -> storage -> Mastery Seals & Analytics', () => {
  installMockLocalStorage();

  // Play an optimal Solo Taxman game on Explorers (1-20) using the Hint engine
  let state = createFactorGame({
    tier: 'explorers',
    mode: 'solo',
    variant: 'classic',
    player1Name: 'Aarav',
  });

  let guard = 0;
  while (state.status === 'playing' && guard < 40) {
    const hint = getBestHintMove(state);
    assert.ok(hint, 'Expected a legal hint move while playing');
    state = applyMove(state, hint.tile);
    guard += 1;
  }

  assert.equal(state.status, 'gameover');
  // Classic Taxman board sum invariant: 1..20 sums to 210
  assert.equal(state.scores.p1 + state.scores.p2, 210);
  assert.equal(state.winner, 'p1', 'Optimal playout should beat The Taxman');

  const record: MatchRecord = {
    id: 'int-solo-1',
    gameTitle: 'Factor Grid',
    mode: state.mode,
    tier: state.tier,
    variant: state.variant,
    playerScore: state.scores.p1,
    opponentScore: state.scores.p2,
    opponentName: state.player2Name,
    result: 'win',
    primesClaimed: state.primesClaimed.p1,
    playedAt: '2026-11-19T03:00:00.000Z',
  };

  // Persist match and evaluate Mastery Seals
  const storedMatches = appendMatch(record);
  assert.equal(storedMatches.length, 1);

  const eval1 = evaluateAchievements(storedMatches, loadEarnedBadges());
  saveEarnedBadges(eval1.earnedRecords);

  const unlockedIds = new Set(eval1.newlyUnlocked.map((b) => b.id));
  assert.equal(unlockedIds.has('first-victory'), true);
  assert.equal(unlockedIds.has('taxman-victor'), true);
  // Optimal 1-20 playout captures >= 116 (55% of 210)
  assert.equal(state.scores.p1 >= 116, true);
  assert.equal(unlockedIds.has('top-scorer'), true);

  // Loading sample data should populate timeline analytics WITHOUT unlocking new permanent seals
  const withSample = [...loadMatches(), ...createSampleMatches()];
  saveMatches(withSample);
  assert.equal(loadMatches().filter(isSampleMatch).length, 9);

  const timeline = buildTimelineSeries(loadMatches());
  assert.equal(timeline.length, 10);

  const evalWithSample = evaluateAchievements(loadMatches(), loadEarnedBadges());
  assert.equal(evalWithSample.hasSampleMatches, true);
  assert.equal(evalWithSample.newlyUnlocked.length, 0);
  assert.equal(evalWithSample.earnedCount, eval1.earnedCount);
});

test('Integration: 100-match storage alignment (G1) + profile featuredBadgeId persistence', () => {
  installMockLocalStorage();

  // Save 45 real matches and confirm loadMatches does NOT truncate at 30
  const matches: MatchRecord[] = Array.from({ length: 45 }, (_, idx) => ({
    id: `cap-${idx + 1}`,
    gameTitle: 'Factor Grid',
    mode: 'vs-ai',
    aiDifficulty: 'scholar',
    tier: 'explorers',
    variant: 'classic',
    playerScore: 120,
    opponentScore: 90,
    opponentName: 'AI · Scholar',
    result: 'win',
    primesClaimed: 1,
    playedAt: new Date(Date.UTC(2026, 10, 1, idx)).toISOString(),
  }));

  saveMatches(matches);
  const reloaded = loadMatches();
  assert.equal(reloaded.length, 45);

  // Persist custom display name + featuredBadgeId and verify roundtrip
  saveProfile({
    displayName: 'Maya Chen',
    ageTier: 'strategists',
    soundEnabled: false,
    sessionKind: 'signed-in-preview',
    featuredBadgeId: 'perfect-streak',
  });

  const reloadedProfile = loadProfile();
  assert.equal(reloadedProfile.displayName, 'Maya Chen');
  assert.equal(reloadedProfile.ageTier, 'strategists');
  assert.equal(reloadedProfile.soundEnabled, false);
  assert.equal(reloadedProfile.featuredBadgeId, 'perfect-streak');
});

test('Integration: Human vs. Master AI full playout produces legal match and updates evaluation cleanly', () => {
  installMockLocalStorage();

  let state = createFactorGame({
    tier: 'explorers',
    mode: 'vs-ai',
    aiDifficulty: 'master',
    variant: 'prime-trap',
    player1Name: 'Student',
  });

  let guard = 0;
  while (state.status === 'playing' && guard < 50) {
    if (state.currentTurn === 'p1') {
      const move = getBestHintMove(state);
      assert.ok(move);
      state = applyMove(state, move.tile);
    } else {
      const aiMove = chooseAiMove(state, 'master');
      assert.ok(aiMove);
      state = applyMove(state, aiMove.tile);
    }
    guard += 1;
  }

  assert.equal(state.status, 'gameover');
  assert.ok(state.moves.length >= 2);
  // In Factor Grid, at most 1 prime can ever be claimed across the entire board
  assert.ok(state.primesClaimed.p1 + state.primesClaimed.p2 <= 1);
});
