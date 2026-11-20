import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMove,
  chooseAiMove,
  classifyNumber,
  createFactorGame,
  getBestHintMove,
  getLegalMoves,
  getProperDivisors,
  isLegalMove,
  isPrime,
  previewMove,
  PRIME_TRAP_BONUS,
} from './factor-grid-engine';

test('proper divisors and primality are mathematically exact', () => {
  assert.deepEqual(getProperDivisors(1), []);
  assert.deepEqual(getProperDivisors(12), [1, 2, 3, 4, 6]);
  assert.deepEqual(getProperDivisors(29), [1]);
  assert.deepEqual(getProperDivisors(36), [1, 2, 3, 4, 6, 9, 12, 18]);

  assert.equal(isPrime(1), false);
  assert.equal(isPrime(2), true);
  assert.equal(isPrime(19), true);
  assert.equal(isPrime(21), false);
  assert.equal(isPrime(49), false);
});

test('number classification distinguishes unit, prime, deficient, perfect, and abundant', () => {
  assert.equal(classifyNumber(1).kind, 'unit');
  assert.equal(classifyNumber(17).kind, 'prime');
  assert.equal(classifyNumber(6).kind, 'perfect');
  assert.equal(classifyNumber(28).kind, 'perfect');
  assert.equal(classifyNumber(12).kind, 'abundant');
  assert.equal(classifyNumber(15).kind, 'deficient');
});

test('claiming a prime on opening board removes 1 and makes other primes illegal', () => {
  const initial = createFactorGame({
    tier: 'explorers',
    mode: 'vs-ai',
    aiDifficulty: 'scholar',
  });

  assert.equal(initial.boardMax, 20);
  assert.equal(isLegalMove(initial, 1), false);
  assert.equal(isLegalMove(initial, 19), true);
  assert.equal(isLegalMove(initial, 17), true);

  const after19 = applyMove(initial, 19);
  assert.equal(after19.scores.p1, 19);
  assert.equal(after19.scores.p2, 1);
  assert.equal(after19.tiles[19], 'p1');
  assert.equal(after19.tiles[1], 'p2');
  assert.equal(after19.currentTurn, 'p2');

  // With 1 claimed, prime 17 has no unclaimed proper divisors and is now illegal
  assert.equal(isLegalMove(after19, 17), false);
  // Composite 18 still has unclaimed divisors 2, 3, 6, 9
  assert.equal(isLegalMove(after19, 18), true);
});

test('prime-trap variant awards bonus points for claiming a prime', () => {
  const game = createFactorGame({
    tier: 'explorers',
    mode: 'local',
    variant: 'prime-trap',
  });

  const preview = previewMove(game, 19);
  assert.equal(preview.primeBonus, PRIME_TRAP_BONUS);
  assert.equal(preview.claimPoints, 19 + PRIME_TRAP_BONUS);
  assert.equal(preview.netSwing, 19 + PRIME_TRAP_BONUS - 1);

  const next = applyMove(game, 19);
  assert.equal(next.scores.p1, 19 + PRIME_TRAP_BONUS);
  assert.equal(next.primesClaimed.p1, 1);
});

test('solo Taxman mode keeps turn on p1 and sweeps leftovers to Taxman at end', () => {
  let state = createFactorGame({
    tier: 'explorers',
    mode: 'solo',
  });

  // Play legal moves until game over
  let guard = 0;
  while (state.status === 'playing' && guard < 30) {
    assert.equal(state.currentTurn, 'p1');
    const legal = getLegalMoves(state);
    assert.ok(legal.length > 0);
    state = applyMove(state, legal[legal.length - 1]);
    guard++;
  }

  assert.equal(state.status, 'gameover');
  // Every tile 1..20 must be owned by either p1 or p2 in Solo Taxman mode
  for (let k = 1; k <= 20; k++) {
    assert.notEqual(state.tiles[k], 'unclaimed');
  }
  const totalBoardSum = (20 * 21) / 2;
  assert.equal(state.scores.p1 + state.scores.p2, totalBoardSum);
});

test('Master AI and Hint always return legal moves and Master opens with highest prime', () => {
  const game = createFactorGame({
    tier: 'explorers',
    mode: 'vs-ai',
    aiDifficulty: 'master',
  });

  const hint = getBestHintMove(game);
  assert.ok(hint);
  assert.equal(isLegalMove(game, hint.tile), true);
  assert.equal(hint.tile, 19);

  // Simulate full AI vs AI playout on Explorers board to verify termination and legality
  let sim = game;
  let steps = 0;
  while (sim.status === 'playing' && steps < 40) {
    const move = chooseAiMove(sim, sim.currentTurn === 'p1' ? 'scholar' : 'master');
    assert.ok(move);
    assert.equal(isLegalMove(sim, move.tile), true);
    sim = applyMove(sim, move.tile);
    steps++;
  }

  assert.equal(sim.status, 'gameover');
  assert.ok(sim.winner === 'p1' || sim.winner === 'p2' || sim.winner === 'draw');
});
