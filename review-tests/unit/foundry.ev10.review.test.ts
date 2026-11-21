import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateFoundryTokens,
  formatFoundryTokens,
  solveFoundryPuzzle,
  generateFoundryPuzzle,
  scoreFoundrySubmission,
  computeAiFoundryScore,
  buildFoundryMatchRecord,
  FOUNDRY_OPERATORS_BY_TIER,
  type FoundryToken,
  type FoundryOperator,
} from '../../lib/equation-foundry-engine';
import type { AgeTier, AiDifficulty, PlayMode } from '../../lib/types';

const TIERS: AgeTier[] = ['explorers', 'challengers', 'strategists'];
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const tile = (id: string, value: number): FoundryToken => ({ kind: 'tile', tileId: id, value });
const op = (o: FoundryOperator): FoundryToken => ({ kind: 'op', op: o });

// ---- independent reference: random expression AST -> tokens + value ----
type Ast = { t: 'n'; v: number } | { t: 'b'; o: '+' | '−' | '×' | '÷'; l: Ast; r: Ast } | { t: 'sq'; e: Ast };
let tid = 0;
function genAst(rng: () => number, depth: number): Ast {
  if (depth <= 0 || rng() < 0.3) return { t: 'n', v: 1 + Math.floor(rng() * 12) };
  const k = rng();
  if (k < 0.1) return { t: 'sq', e: genAst(rng, depth - 1) };
  const ops = ['+', '−', '×', '÷'] as const;
  return { t: 'b', o: ops[Math.floor(rng() * 4)], l: genAst(rng, depth - 1), r: genAst(rng, depth - 1) };
}
function evalAst(a: Ast): number {
  if (a.t === 'n') return a.v;
  if (a.t === 'sq') {
    const v = evalAst(a.e);
    return v * v;
  }
  const l = evalAst(a.l);
  const r = evalAst(a.r);
  if (a.o === '+') return l + r;
  if (a.o === '−') return l - r;
  if (a.o === '×') return l * r;
  if (Math.abs(r) < 1e-9) throw new Error('div0');
  return l / r;
}
// emit with full parentheses (so precedence never matters) - the engine must agree with the AST
function emit(a: Ast, out: FoundryToken[]) {
  if (a.t === 'n') {
    out.push(tile(`t${tid++}`, a.v));
    return;
  }
  if (a.t === 'sq') {
    out.push(op('('));
    emit(a.e, out);
    out.push(op(')'), op('²'));
    return;
  }
  out.push(op('('));
  emit(a.l, out);
  out.push(op(a.o));
  emit(a.r, out);
  out.push(op(')'));
}

describe('equation-foundry evaluator', () => {
  it('matches an independent fully-parenthesised reference over 6000 random expressions', () => {
    const rng = lcg(2024);
    let valid = 0;
    for (let i = 0; i < 6000; i++) {
      const ast = genAst(rng, 4);
      const toks: FoundryToken[] = [];
      tid = 0;
      emit(ast, toks);
      let expected: number | null;
      try {
        expected = evalAst(ast);
      } catch {
        expected = null;
      }
      const res = evaluateFoundryTokens(toks);
      if (expected === null) {
        assert.equal(res.valid, false, formatFoundryTokens(toks));
        assert.match(res.error ?? '', /zero/i);
      } else if (!Number.isFinite(expected)) {
        assert.equal(res.valid, false);
      } else {
        valid++;
        assert.equal(res.valid, true, `${formatFoundryTokens(toks)}: ${res.error}`);
        assert.equal(res.value, Math.round(expected * 1000) / 1000, formatFoundryTokens(toks));
      }
    }
    assert.ok(valid > 3000);
  });

  it('PEMDAS: × ÷ before + −, ² binds tightest, left-associative', () => {
    const v = (...t: FoundryToken[]) => evaluateFoundryTokens(t).value;
    assert.equal(v(tile('a', 2), op('+'), tile('b', 3), op('×'), tile('c', 4)), 14);
    assert.equal(v(tile('a', 10), op('−'), tile('b', 4), op('−'), tile('c', 3)), 3);
    assert.equal(v(tile('a', 100), op('÷'), tile('b', 10), op('÷'), tile('c', 5)), 2);
    assert.equal(v(tile('a', 3), op('²'), op('+'), tile('b', 1)), 10);
    assert.equal(v(tile('a', 2), op('×'), tile('b', 3), op('²')), 18);
    assert.equal(v(tile('a', 2), op('²'), op('²')), 16);
    assert.equal(v(op('('), tile('a', 2), op('+'), tile('b', 3), op(')'), op('²')), 25);
  });

  it('structural errors never throw and never yield a value', () => {
    const bad: FoundryToken[][] = [
      [],
      [op('+')],
      [tile('a', 1), op('+')],
      [tile('a', 1), tile('b', 2)],
      [op('('), tile('a', 1)],
      [tile('a', 1), op(')')],
      [op(')'), tile('a', 1), op('(')],
      [op('²'), tile('a', 2)],
      [tile('a', 2), op('×'), op('×'), tile('b', 3)],
      [op('('), op(')')],
      [tile('a', 2), op('('), tile('b', 3), op(')')], // implicit multiplication not allowed
      [tile('a', 1), op('÷'), tile('z', 0)],
      [op('+'), op('−')],
      [tile('a', 5), tile('a', 5)], // duplicate tile id
    ];
    for (const t of bad) {
      const r = evaluateFoundryTokens(t);
      assert.equal(r.valid, false, JSON.stringify(t));
      assert.equal(r.value, null);
      assert.ok(typeof r.error === 'string' && r.error.length > 0);
    }
    assert.equal(evaluateFoundryTokens([op('('), op(')')]).error, 'Include at least one number tile.');
  });

  it('deep nesting / long chains / overflow do not throw', () => {
    const deep: FoundryToken[] = [];
    for (let i = 0; i < 20000; i++) deep.push(op('('));
    deep.push(tile('a', 1));
    for (let i = 0; i < 20000; i++) deep.push(op(')'));
    assert.doesNotThrow(() => evaluateFoundryTokens(deep));
    const sq: FoundryToken[] = [tile('a', 99999)];
    for (let i = 0; i < 20; i++) sq.push(op('²'));
    const r = evaluateFoundryTokens(sq);
    assert.equal(r.valid, false, 'Infinity must be rejected');
    assert.equal(r.error, 'Value is out of bounds.');
    const chain: FoundryToken[] = [tile('t0', 1)];
    for (let i = 1; i < 3000; i++) chain.push(op('+'), tile(`t${i}`, 1));
    assert.equal(evaluateFoundryTokens(chain).value, 3000);
  });

  it('division: exact fractions rounded to 3dp; tiny divisor treated as zero', () => {
    const r = evaluateFoundryTokens([tile('a', 1), op('÷'), tile('b', 3)]);
    assert.equal(r.value, 0.333);
    for (let a = 1; a <= 60; a++)
      for (let b = 1; b <= 60; b++) {
        const x = evaluateFoundryTokens([op('('), tile('a', a), op('÷'), tile('b', b), op(')'), op('×'), tile('c', b)]);
        assert.equal(x.value, a, `(${a}÷${b})×${b}`);
      }
  });

  it('characterisation: evaluator does not enforce tier operator sets (no tier argument; enforcement is UI-only)', () => {
    const r = evaluateFoundryTokens([tile('a', 9), op('÷'), tile('b', 3)]);
    assert.ok(!FOUNDRY_OPERATORS_BY_TIER.explorers.includes('÷'));
    assert.equal(r.valid, true);
  });

  it('formatFoundryTokens: spacing & idempotent on empty', () => {
    assert.equal(formatFoundryTokens([]), '');
    assert.equal(
      formatFoundryTokens([op('('), tile('a', 2), op('+'), tile('b', 3), op(')'), op('²'), op('×'), tile('c', 4)]),
      '(2 + 3)² × 4'
    );
  });
});

describe('equation-foundry puzzle generation and solver', () => {
  it('deterministic, well-formed, ids unique, tiles are positive ints, operator set matches tier', () => {
    for (const t of TIERS)
      for (let r = 1; r <= 40; r++)
        for (let off = 0; off < 2; off++) {
          const a = generateFoundryPuzzle(t, r, off);
          const b = generateFoundryPuzzle(t, r, off);
          assert.deepEqual(a, b);
          assert.equal(a.tiles.length, 5);
          assert.equal(new Set(a.tiles.map((x) => x.id)).size, 5);
          for (const x of a.tiles) assert.ok(Number.isInteger(x.value) && x.value > 0);
          assert.ok(Number.isInteger(a.target) && a.target > 0, `target ${a.target}`);
          assert.deepEqual(a.allowedOperators, FOUNDRY_OPERATORS_BY_TIER[t]);
          assert.ok(a.hintText.length > 10);
        }
  });

  it('solver result is verifiable: expression re-evaluates to its value using each tile at most once', () => {
    for (const t of TIERS)
      for (let r = 1; r <= 80; r++) {
        const p = generateFoundryPuzzle(t, r);
        const s = p.solverSolution;
        assert.ok(Number.isInteger(s.value));
        assert.equal(s.distance, Math.abs(s.value - p.target));
        assert.equal(s.exact, s.distance === 0);
        // multiset of numbers appearing in the expression must be sub-multiset of tile values
        const pool = p.tiles.map((x) => x.value);
        const nums = (s.expression.match(/\d+/g) ?? []).map(Number);
        // squared literals appear as "9²" (digit still the tile value)
        for (const n of nums) {
          const idx = pool.indexOf(n);
          assert.ok(idx >= 0, `${t} r${r}: ${s.expression} uses ${n} not in tiles ${pool}`);
          pool.splice(idx, 1);
        }
        // evaluate expression text through the real evaluator
        const toks: FoundryToken[] = [];
        const used = new Set<number>();
        let tidx = 0;
        for (const m of s.expression.matchAll(/(\d+)|(\+|−|×|÷|\(|\)|²)/g)) {
          if (m[1]) {
            toks.push(tile(`s${tidx++}`, Number(m[1])));
          } else toks.push(op(m[2] as FoundryOperator));
        }
        void used;
        const ev = evaluateFoundryTokens(toks);
        assert.equal(ev.valid, true, `${s.expression}: ${ev.error}`);
        assert.equal(ev.value, s.value, `${t} r${r}: ${s.expression} evaluates to ${ev.value}, solver claims ${s.value}`);
      }
  });

  it('REVIEW FINDING: "guaranteed-solvable" puzzles: solver AI finds an exact answer for every generated puzzle', () => {
    // generateFoundryPuzzle documents "guaranteed-solvable" and the AI par score assumes a solution; the DFS has a
    // hard 3200-expansion cap and forbids negative intermediates, so some constructed puzzles come back inexact.
    const miss: string[] = [];
    for (const t of TIERS)
      for (let r = 1; r <= 200; r++)
        for (let off = 0; off < 2; off++) {
          const p = generateFoundryPuzzle(t, r, off);
          if (!p.solverSolution.exact) miss.push(`${t} r${r} off${off} target=${p.target} tiles=${p.tiles.map((x) => x.value)}`);
        }
    assert.equal(miss.length, 0, `${miss.length} of 3600 puzzles of 1200 puzzles not exactly solved by the engine solver, e.g. ${miss.slice(0, 3).join(' ; ')}`);
  });

  it('solver respects tier: explorers never get ÷ or ²; non-strategists never get ²', () => {
    for (let r = 1; r <= 200; r++) {
      const e = generateFoundryPuzzle('explorers', r).solverSolution.expression;
      assert.ok(!/[÷²]/.test(e), e);
      const c = generateFoundryPuzzle('challengers', r).solverSolution.expression;
      assert.ok(!/²/.test(c), c);
    }
  });

  it('solver on adversarial inputs: empty tiles, single tile, unreachable target, huge target, duplicates - no throw, terminates fast', () => {
    const t0 = performance.now();
    assert.doesNotThrow(() => solveFoundryPuzzle([], 10, 'explorers'));
    assert.equal(solveFoundryPuzzle([], 10, 'explorers').value, 0);
    assert.equal(solveFoundryPuzzle([{ id: 'a', value: 10 }], 10, 'explorers').exact, true);
    const unreachable = solveFoundryPuzzle([{ id: 'a', value: 1 }, { id: 'b', value: 1 }, { id: 'c', value: 1 }], 1_000_000, 'strategists');
    assert.equal(unreachable.exact, false);
    const eight = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, value: i + 2 }));
    assert.doesNotThrow(() => solveFoundryPuzzle(eight, 9999, 'strategists'));
    assert.ok(performance.now() - t0 < 5000, 'solver must stay bounded');
  });

  it('REVIEW FINDING: early rounds are not random - seededRandom(Park-Miller) first draw is ~seed*7.8e-6, so the first tile pick is constant', () => {
    // rounds 1..12 all start with the same first operand a (3 / 4 / 7), lowering variety for new students.
    const firstOperand = (t: AgeTier, r: number) => {
      const h = generateFoundryPuzzle(t, r).hintText;
      return (h.match(/(\d+)/) ?? [])[1];
    };
    for (const t of TIERS) {
      const seen = new Set<string | undefined>();
      for (let r = 1; r <= 12; r++) seen.add(firstOperand(t, r));
      assert.ok(seen.size >= 3, `${t}: first operand across rounds 1-12 only ${[...seen]}`);
    }
  });

  it('REVIEW FINDING: distinct (tier, round, seedOffset) triples should not collide to the same puzzle', () => {
    for (const t of TIERS) {
      const seen = new Map<string, string>();
      let dup = 0;
      for (let r = 1; r <= 400; r++) {
        const p = generateFoundryPuzzle(t, r);
        const key = `${p.target}|${p.tiles.map((x) => x.value).join(',')}`;
        if (seen.has(key)) dup++;
        seen.set(key, `r${r}`);
      }
      assert.ok(dup <= 8, `${t}: ${dup}/400 rounds repeat an earlier puzzle verbatim`);
    }
  });

  it('LATENT: degenerate round numbers (0, negative, NaN, huge, fractional) do not throw; NaN yields usable puzzle', () => {
    for (const r of [0, -1, -997, 1e9, 2 ** 31, 3.7, Number.MAX_SAFE_INTEGER]) {
      for (const t of TIERS) assert.doesNotThrow(() => generateFoundryPuzzle(t, r), `r=${r}`);
    }
    const p = generateFoundryPuzzle('explorers', NaN);
    assert.ok(p.tiles.every((x) => Number.isFinite(x.value)), 'NaN round produced NaN/undefined tiles');
    assert.ok(Number.isFinite(p.target));
  });
});

describe('equation-foundry scoring, AI and match record', () => {
  it('exact answers: 40 <= pts, craft bonus 15 for >=3 tiles else 5, hint -15', () => {
    const e = (usedTileCount: number, hintUsed: boolean) =>
      scoreFoundrySubmission({ value: 50, target: 50, usedTileCount, hintUsed });
    assert.deepEqual(e(3, false), { points: 115, exact: true, distance: 0 });
    assert.equal(e(2, false).points, 105);
    assert.equal(e(5, true).points, 100);
    assert.equal(e(1, true).points, 90);
  });

  it('null / NaN / Infinity value scores 0 and is never exact', () => {
    for (const value of [null, NaN, Infinity, -Infinity]) {
      const r = scoreFoundrySubmission({ value, target: 40, usedTileCount: 3, hintUsed: false });
      assert.equal(r.points, 0);
      assert.equal(r.exact, false);
    }
  });

  it('points are always finite non-negative integers; exact always beats inexact; far (>15) scores 0', () => {
    const rng = lcg(5);
    for (let i = 0; i < 20000; i++) {
      const target = 10 + Math.floor(rng() * 300);
      const value = Math.round((target + (rng() - 0.5) * 80) * 1000) / 1000;
      const used = 1 + Math.floor(rng() * 5);
      const hint = rng() < 0.5;
      const r = scoreFoundrySubmission({ value, target, usedTileCount: used, hintUsed: hint });
      assert.ok(Number.isInteger(r.points) && r.points >= 0, `${value}->${target}: ${r.points}`);
      const d = Math.abs(value - target);
      if (d > 15) assert.equal(r.points, 0);
      if (r.exact) assert.ok(r.points >= 40);
      else assert.ok(r.points < 100);
    }
  });

  it('REVIEW FINDING: scoring is not monotonic - distance 5.01 scores MORE than distance 5 (piecewise bands do not join)', () => {
    // band1: round(80 - 12d) (floor 15) hits 20 at d=5; band2: round(30 - 2(d-5)) starts at 30.
    const s = (d: number) => scoreFoundrySubmission({ value: 100 + d, target: 100, usedTileCount: 2, hintUsed: false }).points;
    let prev = Infinity;
    const bad: string[] = [];
    for (let d = 0.5; d <= 16; d = Math.round((d + 0.01) * 100) / 100) {
      const p = s(d);
      if (p > prev) bad.push(`d=${d}: ${prev}->${p}`);
      prev = p;
    }
    assert.equal(bad.length, 0, `score increases with distance at: ${bad.join(', ')}`);
  });

  it('computeAiFoundryScore: deterministic, ordered by difficulty each round, positive', () => {
    for (let r = 1; r <= 60; r++) {
      const a = computeAiFoundryScore('apprentice', r);
      const s = computeAiFoundryScore('scholar', r);
      const m = computeAiFoundryScore('master', r);
      assert.ok(a > 0 && a < s && s <= m, `r${r}: ${a},${s},${m}`);
      assert.equal(computeAiFoundryScore('scholar', r), s);
    }
    assert.ok(Number.isFinite(computeAiFoundryScore('apprentice', NaN)));
  });

  it('buildFoundryMatchRecord: win / loss / draw (tie), fields and labels', () => {
    const base = { tier: 'strategists' as AgeTier, mode: 'vs-ai' as PlayMode, aiDifficulty: 'master' as AiDifficulty, exactHits: 2, roundsPlayed: 5 };
    const win = buildFoundryMatchRecord({ ...base, playerScore: 300, opponentScore: 299 });
    const loss = buildFoundryMatchRecord({ ...base, playerScore: 299, opponentScore: 300 });
    const draw = buildFoundryMatchRecord({ ...base, playerScore: 300, opponentScore: 300 });
    assert.deepEqual([win.result, loss.result, draw.result], ['win', 'loss', 'draw']);
    assert.equal(win.aiDifficulty, 'master');
    assert.equal(win.opponentName, 'Expression Solver AI (Master)');
    assert.equal(win.gameTitle, 'Equation Foundry');
    const solo = buildFoundryMatchRecord({ ...base, mode: 'solo', playerScore: 1, opponentScore: 2 });
    assert.equal(solo.aiDifficulty, undefined);
    assert.equal(solo.opponentName, 'Foundry Par (5 rounds)');
    assert.ok(!Number.isNaN(Date.parse(win.playedAt)));
    const zero = buildFoundryMatchRecord({ ...base, playerScore: 0, opponentScore: 0 });
    assert.equal(zero.result, 'draw');
  });

  it('REVIEW FINDING: ids are unique within one millisecond (Date.now + 5 base36 chars)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20000; i++)
      ids.add(buildFoundryMatchRecord({ tier: 'explorers', mode: 'solo', aiDifficulty: 'scholar', playerScore: 1, opponentScore: 1, exactHits: 0, roundsPlayed: 1 }).id);
    assert.equal(ids.size, 20000);
  });

  it('LATENT: mode "local" is labelled "Expression Solver AI" (no AI plays a local match); undefined aiDifficulty throws', () => {
    const local = buildFoundryMatchRecord({ tier: 'explorers', mode: 'local', aiDifficulty: 'scholar', playerScore: 1, opponentScore: 0, exactHits: 0, roundsPlayed: 1 });
    assert.ok(!/AI/.test(local.opponentName), local.opponentName);
  });
  it('LATENT: missing aiDifficulty in non-solo mode crashes record building (aiDifficulty[0] on undefined)', () => {
    assert.doesNotThrow(() =>
      buildFoundryMatchRecord({ tier: 'explorers', mode: 'vs-ai', aiDifficulty: undefined as unknown as AiDifficulty, playerScore: 1, opponentScore: 0, exactHits: 0, roundsPlayed: 1 })
    );
  });
});
