import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ARITHMETIC_PACES, calculateAnswerPoints } from './arithmetic-engine';
import { DAILY_STREAK_MILESTONES, DAILY_TIME_LIMITS, calculateDailyScore } from './daily-challenge';
import { PRIME_TRAP_BONUS, TIER_SPECS, applyMove, createFactorGame, getLegalMoves } from './factor-grid-engine';
import { scoreFoundrySubmission } from './equation-foundry-engine';
import { PLAYABLE_GAME_CATALOG, PLAYABLE_GAME_IDS } from './guest-trial';
import * as L from '../functions/src/limits';
import { replayFactorGridSolo } from '../functions/src/replay';

test('functions/src/limits mirror the client engines', () => {
  for (const p of ['relaxed', 'standard', 'blitz'] as const) {
    assert.equal(L.ARITHMETIC_PACE_SECONDS[p], ARITHMETIC_PACES[p].seconds);
  }
  assert.equal(L.ARITHMETIC_MAX_POINTS_PER_ANSWER, calculateAnswerPoints(true, 100, 5));
  assert.deepEqual(L.DAILY_TIME_LIMITS, DAILY_TIME_LIMITS);
  for (const t of L.TIERS) assert.equal(L.FACTOR_BOARD_MAX[t], TIER_SPECS[t].boardMax);
  assert.equal(L.PRIME_TRAP_BONUS, PRIME_TRAP_BONUS);
  assert.deepEqual([...L.GAME_IDS].sort(), [...PLAYABLE_GAME_IDS].sort());
  for (const id of PLAYABLE_GAME_IDS) assert.equal(L.GAME_TITLES[id], PLAYABLE_GAME_CATALOG[id].title);
  assert.equal(L.FOUNDRY_MAX_PER_ROUND, scoreFoundrySubmission({ value: 10, target: 10, usedTileCount: 3, hintUsed: false }).points);
  const maxStreak = Math.max(...DAILY_STREAK_MILESTONES.map((m) => m.bonusPoints));
  assert.equal(L.DAILY_HARD_MAX, calculateDailyScore({ solved: true, stepsSolved: 3, secondsUsed: 0, timeLimitSeconds: 100, mistakes: 0, hintsUsed: 0, streakDays: 999 }));
  assert.equal(L.DAILY_HARD_MAX, 150 + 100 + 50 + maxStreak);
  for (const t of L.TIERS) for (const g of ['addition-attack', 'equation-foundry', 'odds-urns', 'factor-grid', 'daily-challenge'] as const) {
    assert.ok(L.MIN_ROUND_SECONDS[g] > 0 && t);
  }
});

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 1013904223 >>> 0) / 4294967296);
}

test('Factor Grid solo replay equals the real engine on random games; hard max holds', () => {
  const r = rng(7);
  for (const tier of L.TIERS) for (const variant of ['classic', 'prime-trap'] as const) for (let g = 0; g < 25; g++) {
    let st = createFactorGame({ tier, mode: 'solo', variant });
    const moves: number[] = [];
    while (st.status === 'playing') {
      const legal = getLegalMoves(st);
      const pick = legal[Math.floor(r() * legal.length)];
      moves.push(pick);
      st = applyMove(st, pick);
    }
    const res = replayFactorGridSolo(TIER_SPECS[tier].boardMax, moves, variant === 'prime-trap');
    assert.equal(res.ok, true);
    assert.equal(res.playerScore, st.scores.p1);
    assert.ok(st.scores.p1 <= L.factorGridHardMax(tier));
  }
});

test('shared moderation copies in functions/src/shared are in sync with lib', () => {
  for (const f of ['name-moderation.ts', 'name-blocklist.ts']) {
    const lib = fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
    const copy = fs.readFileSync(new URL(`../functions/src/shared/${f}`, import.meta.url), 'utf8');
    assert.equal(copy.replace(/\r\n/g, '\n').split('\n').slice(1).join('\n'), lib.replace(/\r\n/g, '\n'), `${f} drifted: run npm run sync-shared in functions/`);
  }
});
