import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import {
  classifyNumber,
  createFactorGame,
  getProperDivisors,
  isPrime,
  applyMove,
  getLegalMoves,
  previewMove,
  chooseAiMove,
  getBestHintMove,
  isLegalMove,
  PRIME_TRAP_BONUS,
  TIER_SPECS,
} from '../../lib/factor-grid-engine';
import type { AgeTier, AiDifficulty, FactorGameState, PlayMode } from '../../lib/types';

const TIERS: AgeTier[] = ['explorers', 'challengers', 'strategists'];
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
// independent reference implementations
function refDivisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d < n; d++) if (n % d === 0) out.push(d);
  return out;
}
function refPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
function runChild(body: string, timeout = 4000) {
  const loader = process.execArgv.find((a) => a.startsWith('--import=') && a.includes('tsx')) ?? '';
  const url = pathToFileURL(resolve('lib/factor-grid-engine.ts')).href;
  const code = `import('${url}').then((m) => { ${body} })`;
  return spawnSync(process.execPath, [loader, '-e', code].filter(Boolean), { timeout, encoding: 'utf8' });
}
function hung(r: ReturnType<typeof runChild>) {
  assert.ok(r.error || r.status === 0, `child failed to run: ${r.stderr}`);
  return Boolean(r.error && /ETIMEDOUT/.test(r.error.message));
}

describe('number theory vs independent reference (0..5000)', () => {
  it('isPrime and getProperDivisors agree with brute force', () => {
    for (let n = 0; n <= 5000; n++) {
      assert.equal(isPrime(n), refPrime(n), `isPrime(${n})`);
      assert.deepEqual(getProperDivisors(n), refDivisors(n), `divisors(${n})`);
    }
  });
  it('classifyNumber kind matches definition for 2..5000', () => {
    for (let n = 2; n <= 5000; n++) {
      const sum = refDivisors(n).reduce((a, b) => a + b, 0);
      const exp = refPrime(n) ? 'prime' : sum === n ? 'perfect' : sum > n ? 'abundant' : 'deficient';
      const c = classifyNumber(n);
      assert.equal(c.kind, exp, `n=${n}`);
      assert.equal(c.divisorSum, sum);
      assert.equal(c.value, n);
    }
    assert.equal(classifyNumber(1).kind, 'unit');
  });
  it('perfect numbers up to 10000 are exactly 6, 28, 496, 8128', () => {
    const perfect: number[] = [];
    for (let n = 2; n <= 10000; n++) if (classifyNumber(n).kind === 'perfect') perfect.push(n);
    assert.deepEqual(perfect, [6, 28, 496, 8128]);
  });
  it('large inputs: Mersenne prime 2^31-1, 999999937, big composite, perfect 33550336', () => {
    assert.equal(isPrime(2147483647), true);
    assert.equal(isPrime(2147483645), false);
    assert.equal(isPrime(999999937), true);
    assert.equal(isPrime(1_000_000_007 * 3), false);
    assert.equal(classifyNumber(33550336).kind, 'perfect');
  });
  it('0, 1 and negatives never report as prime and have no divisors', () => {
    for (const n of [0, 1, -1, -2, -7, -100]) {
      assert.equal(isPrime(n), false);
      assert.deepEqual(getProperDivisors(n), []);
    }
  });
  it('classifyNumber(1) is unit with empty divisors; classifyNumber(2) prime', () => {
    const one = classifyNumber(1);
    assert.deepEqual([one.kind, one.properDivisors, one.divisorSum], ['unit', [], 0]);
    assert.deepEqual(classifyNumber(2).properDivisors, [1]);
  });
  it('REVIEW FINDING: classifyNumber(0 / NaN) must not be perfect/abundant/deficient', () => {
    // divisorSum is 0 for every n<=1 and NaN, so 0 === 0 -> "perfect"; NaN falls to "deficient".
    for (const n of [0, NaN]) {
      const k = classifyNumber(n).kind;
      assert.ok(!['perfect', 'abundant', 'deficient'].includes(k), `classifyNumber(${n}) => ${k}`);
    }
  });
  it('REVIEW FINDING: isPrime(non-integer) must be false (2.5, 7.25, 1e12+0.5)', () => {
    // isPrime only guards n<2; non-integers with n%2 != 0 fall through the odd-trial loop and return true.
    for (const n of [2.5, 3.5, 7.25, 1e12 + 0.5]) assert.equal(isPrime(n), false, String(n));
  });
  it('REVIEW FINDING: getProperDivisors(non-integer) must be empty (returns [1] for 2.5)', () => {
    assert.deepEqual(getProperDivisors(2.5), []);
  });
  it('REVIEW FINDING: isPrime(Infinity) must terminate', () => {
    // loop bound Math.floor(sqrt(Infinity)) is Infinity and Infinity % d is NaN (never 0) => infinite loop.
    const r = runChild('console.log(m.isPrime(Infinity))');
    assert.equal(hung(r), false, 'isPrime(Infinity) hangs');
  });
  it('REVIEW FINDING: getProperDivisors(Infinity) must terminate', () => {
    const r = runChild('console.log(m.getProperDivisors(Infinity).length)');
    assert.equal(hung(r), false, 'getProperDivisors(Infinity) hangs');
  });
});

function playRandom(tier: AgeTier, mode: PlayMode, variant: 'classic' | 'prime-trap', rng: () => number) {
  let s: FactorGameState = createFactorGame({ tier, mode, variant, aiDifficulty: 'scholar' });
  const snaps: FactorGameState[] = [s];
  let guard = 0;
  while (s.status === 'playing' && guard++ < 200) {
    const legal = getLegalMoves(s);
    assert.ok(legal.length > 0, 'playing state must have a legal move');
    s = applyMove(s, legal[Math.floor(rng() * legal.length)]);
    snaps.push(s);
  }
  return snaps;
}

describe('factor-grid game invariants over random playouts', () => {
  it('score = owned tile sum + prime-trap bonuses; all tiles present; winner consistent; turns sequential', () => {
    const rng = lcg(1234);
    let games = 0;
    for (const tier of TIERS)
      for (const mode of ['solo', 'local', 'vs-ai'] as PlayMode[])
        for (const variant of ['classic', 'prime-trap'] as const)
          for (let g = 0; g < 40; g++) {
            const snaps = playRandom(tier, mode, variant, rng);
            games++;
            for (const s of snaps) {
              let own1 = 0;
              let own2 = 0;
              for (let n = 1; n <= s.boardMax; n++) {
                if (s.tiles[n] === 'p1') own1 += n;
                else if (s.tiles[n] === 'p2') own2 += n;
              }
              const b1 = s.moves.filter((m) => m.actor === 'p1').reduce((a, m) => a + m.primeBonus, 0);
              const b2 = s.moves.filter((m) => m.actor === 'p2').reduce((a, m) => a + m.primeBonus, 0);
              assert.equal(s.scores.p1, own1 + b1, `${tier}/${mode}/${variant} p1`);
              assert.equal(s.scores.p2, own2 + b2, `${tier}/${mode}/${variant} p2`);
              if (variant === 'classic') assert.equal(b1 + b2, 0);
              assert.equal(Object.keys(s.tiles).length, s.boardMax);
            }
            const last = snaps[snaps.length - 1];
            assert.equal(last.status, 'gameover');
            const exp = last.scores.p1 > last.scores.p2 ? 'p1' : last.scores.p2 > last.scores.p1 ? 'p2' : 'draw';
            assert.equal(last.winner, exp);
            assert.equal(getLegalMoves(last).length, 0);
            last.moves.forEach((m, i) => assert.equal(m.turnNumber, i + 1));
          }
    assert.ok(games >= 700);
  });

  it('solo: Taxman sweep leaves every tile owned so p1+p2 === n(n+1)/2', () => {
    const rng = lcg(99);
    for (const tier of TIERS)
      for (let g = 0; g < 30; g++) {
        const last = playRandom(tier, 'solo', 'classic', rng).pop()!;
        const max = last.boardMax;
        assert.equal(last.scores.p1 + last.scores.p2, (max * (max + 1)) / 2);
        for (let n = 1; n <= max; n++) assert.notEqual(last.tiles[n], 'unclaimed');
        assert.equal(last.currentTurn, 'p1');
      }
  });

  it('previewMove predicts the exact score delta applyMove produces; applyMove never mutates its input', () => {
    const rng = lcg(7);
    for (const tier of TIERS)
      for (const variant of ['classic', 'prime-trap'] as const)
        for (let g = 0; g < 25; g++) {
          let s = createFactorGame({ tier, mode: 'local', variant });
          while (s.status === 'playing') {
            const legal = getLegalMoves(s);
            const n = legal[Math.floor(rng() * legal.length)];
            const before = JSON.stringify(s);
            const pv = previewMove(s, n);
            const actor = s.currentTurn;
            const opp = actor === 'p1' ? 'p2' : 'p1';
            const next = applyMove(s, n);
            assert.equal(JSON.stringify(s), before, 'input mutated');
            assert.equal(next.scores[actor] - s.scores[actor], pv.claimPoints);
            assert.equal(next.scores[opp] - s.scores[opp], pv.opponentPoints);
            assert.equal(pv.legal, true);
            assert.equal(pv.primeBonus, variant === 'prime-trap' && isPrime(n) ? PRIME_TRAP_BONUS : 0);
            s = next;
          }
        }
  });

  it('illegal / out-of-range / non-integer moves are no-ops returning the same reference', () => {
    const s = createFactorGame({ tier: 'explorers', mode: 'local' });
    for (const n of [0, 1, -3, 21, 1000, 2.5, NaN, Infinity, -Infinity]) {
      assert.equal(applyMove(s, n), s, `n=${n}`);
      assert.equal(isLegalMove(s, n), false);
    }
    const done = { ...s, status: 'gameover' as const };
    assert.equal(applyMove(done, 6), done);
    assert.deepEqual(getLegalMoves(done), []);
  });

  it('previewMove on out-of-range / illegal tile reports legal=false, no prime bonus, no crash', () => {
    const s = createFactorGame({ tier: 'explorers', mode: 'local', variant: 'prime-trap' });
    for (const n of [0, 1, 25, -4, 2.5]) {
      const pv = previewMove(s, n);
      assert.equal(pv.legal, false, `n=${n}`);
      assert.equal(pv.primeBonus, 0);
    }
  });

  it('REVIEW FINDING: previewMove on an already-claimed tile advertises claimPoints > 0 although illegal', () => {
    let s = createFactorGame({ tier: 'explorers', mode: 'local' });
    s = applyMove(s, 7);
    const pv = previewMove(s, 7);
    assert.equal(pv.legal, false);
    assert.equal(pv.claimPoints, 0, `illegal preview shows claimPoints=${pv.claimPoints}, netSwing=${pv.netSwing}`);
  });

  it('AI: every difficulty on every reachable state picks a legal move; hint legal; null at game over', () => {
    const rng = lcg(31337);
    const diffs: AiDifficulty[] = ['apprentice', 'scholar', 'master'];
    for (const tier of TIERS) {
      let s = createFactorGame({ tier, mode: 'vs-ai', variant: 'prime-trap' });
      while (s.status === 'playing') {
        for (const d of diffs) {
          const mv = chooseAiMove(s, d)!;
          assert.ok(mv, 'ai returns a move while playing');
          assert.ok(isLegalMove(s, mv.tile), `${tier}/${d} illegal ${mv.tile}`);
          assert.equal(mv.preview.tile, mv.tile);
        }
        const h = getBestHintMove(s)!;
        assert.ok(isLegalMove(s, h.tile));
        const legal = getLegalMoves(s);
        s = applyMove(s, legal[Math.floor(rng() * legal.length)]);
      }
      for (const d of diffs) assert.equal(chooseAiMove(s, d), null);
      assert.equal(getBestHintMove(s), null);
    }
  });

  it('AI determinism: same state -> same move', () => {
    const s = createFactorGame({ tier: 'challengers', mode: 'vs-ai' });
    for (const d of ['apprentice', 'scholar', 'master'] as AiDifficulty[])
      assert.equal(chooseAiMove(s, d)!.tile, chooseAiMove(s, d)!.tile);
  });

  it('master AI latency on the largest board stays under 1.5s per move', () => {
    let s = createFactorGame({ tier: 'strategists', mode: 'vs-ai', aiDifficulty: 'master' });
    let worst = 0;
    for (let i = 0; i < 6 && s.status === 'playing'; i++) {
      const t0 = performance.now();
      const mv = chooseAiMove(s, 'master')!;
      worst = Math.max(worst, performance.now() - t0);
      s = applyMove(s, mv.tile);
    }
    assert.ok(worst < 1500, `master AI took ${worst.toFixed(0)}ms`);
  });

  it('aggregate: master AI is not weaker than greedy scholar over 6 head-to-head games', () => {
    let masterDiff = 0;
    for (const tier of TIERS)
      for (const masterFirst of [true, false]) {
        let s = createFactorGame({ tier, mode: 'local' });
        while (s.status === 'playing') {
          const isMasterTurn = (s.currentTurn === 'p1') === masterFirst;
          s = applyMove(s, chooseAiMove(s, isMasterTurn ? 'master' : 'scholar')!.tile);
        }
        const m = masterFirst ? 'p1' : 'p2';
        const o = masterFirst ? 'p2' : 'p1';
        masterDiff += s.scores[m] - s.scores[o];
      }
    assert.ok(masterDiff >= 0, `aggregate master-minus-scholar diff ${masterDiff}`);
  });

  it('createFactorGame name handling and board sizes; unknown tier throws', () => {
    const a = createFactorGame({ tier: 'explorers', mode: 'local', player1Name: '  Ann ', player2Name: '   ' });
    assert.equal(a.player1Name, 'Ann');
    assert.equal(a.player2Name, 'Player 2');
    assert.equal(createFactorGame({ tier: 'explorers', mode: 'solo', player2Name: 'x' }).player2Name, 'The Taxman');
    assert.equal(createFactorGame({ tier: 'explorers', mode: 'vs-ai', aiDifficulty: 'master' }).player2Name, 'AI · Master');
    for (const t of TIERS)
      assert.equal(Object.keys(createFactorGame({ tier: t, mode: 'solo' }).tiles).length, TIER_SPECS[t].boardMax);
    assert.throws(() => createFactorGame({ tier: 'bogus' as AgeTier, mode: 'solo' }));
  });

  it('REVIEW FINDING: vs-ai with an unknown aiDifficulty yields player2Name undefined', () => {
    const g = createFactorGame({ tier: 'explorers', mode: 'vs-ai', aiDifficulty: 'legend' as AiDifficulty });
    assert.equal(typeof g.player2Name, 'string');
  });
});
