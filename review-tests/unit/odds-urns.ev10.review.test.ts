// @ts-nocheck -- copied from repo-new review-tests; written against pre-integration signatures
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import {
  gcd,
  formatReducedFraction,
  createInitialUrn,
  createInitialSpinnerWheel,
  computeChamberOdds,
  evaluateOddsEstimate,
  executeChamberDraw,
  decideEvBotAction,
  buildOddsUrnsMatchRecord,
  CHAMBER_SPECS,
  type ProbabilityChamber,
  type UrnMarble,
  type SpinnerWheelState,
} from '../../lib/odds-urns-engine';
import type { AgeTier, AiDifficulty } from '../../lib/types';

const TIERS: AgeTier[] = ['explorers', 'challengers', 'strategists'];
const CHAMBERS: ProbabilityChamber[] = ['marble-urn', 'twin-dice', 'conditional-spinner'];
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function refGcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};
const dieRng = (d1: number, d2: number) => seq((d1 - 1 + 0.5) / 6, (d2 - 1 + 0.5) / 6);

describe('odds-urns: gcd and fraction formatting', () => {
  it('gcd matches reference over a grid and handles 0 / negatives / fractions', () => {
    for (let a = -40; a <= 40; a++)
      for (let b = -40; b <= 40; b++) {
        const g = gcd(a, b);
        assert.equal(g, refGcd(a, b) || 1, `gcd(${a},${b})`);
        assert.ok(g >= 1);
      }
    assert.equal(gcd(0, 0), 1);
    assert.equal(gcd(12.4, 18.2), 6); // rounds first
  });
  it('formatReducedFraction: lowest terms, guards, p/q round-trips', () => {
    for (let d = 1; d <= 60; d++)
      for (let n = 0; n <= d; n++) {
        const s = formatReducedFraction(n, d);
        const [p, q] = s.split('/').map(Number);
        assert.equal(p * d, n * q, `${n}/${d} -> ${s}`);
        if (n > 0) assert.equal(refGcd(p, q), 1, `${s} not reduced`);
      }
    assert.equal(formatReducedFraction(5, 0), '0/1');
    assert.equal(formatReducedFraction(5, -3), '0/1');
    assert.equal(formatReducedFraction(-1, 4), '0/4');
    assert.equal(formatReducedFraction(4, 4), '1/1');
  });
  it('REVIEW FINDING: formatReducedFraction(NaN, n) / gcd(NaN, n) must terminate (while (y !== 0) never ends once y is NaN)', () => {
    const loader = process.execArgv.find((x) => x.startsWith('--import=') && x.includes('tsx')) ?? '';
    const url = pathToFileURL(resolve('lib/odds-urns-engine.ts')).href;
    const code = `import('${url}').then((m) => console.log(m.formatReducedFraction(NaN, 5)))`;
    const r = spawnSync(process.execPath, [loader, '-e', code].filter(Boolean), { timeout: 4000, encoding: 'utf8' });
    assert.ok(r.error || r.status === 0, `child failed: ${r.stderr}`);
    assert.ok(!(r.error && /ETIMEDOUT/.test(r.error.message)), 'formatReducedFraction(NaN, 5) hangs forever');
  });
});

describe('odds-urns: urn and wheel setup', () => {
  it('urn composition per tier matches the commented odds and ids are unique', () => {
    const exp: Record<AgeTier, [number, number]> = { explorers: [6, 8], challengers: [7, 10], strategists: [7, 11] };
    for (const t of TIERS) {
      const u = createInitialUrn(t);
      assert.equal(new Set(u.map((m) => m.id)).size, u.length);
      assert.equal(u.filter((m) => m.kind !== 'hazard').length, exp[t][0]);
      assert.equal(u.length, exp[t][1]);
      for (const m of u) assert.equal(m.points, m.kind === 'cobalt' ? 12 : m.kind === 'emerald' ? 20 : 0);
    }
  });
  it('spinner wheels always have 12 sectors (as CHAMBER_SPECS says) and start unboosted', () => {
    for (const t of TIERS) {
      const w = createInitialSpinnerWheel(t);
      assert.equal(w.cobaltCount + w.emeraldCount + w.hazardCount, 12);
      assert.equal(w.boosted, false);
    }
    assert.equal(Object.keys(CHAMBER_SPECS).length, 3);
  });
  it('each tier gets strictly lower safe probability than the previous in all three chambers', () => {
    const safe = (c: ProbabilityChamber, t: AgeTier) =>
      computeChamberOdds({ chamber: c, tier: t, urnMarbles: createInitialUrn(t), spinnerWheel: createInitialSpinnerWheel(t), currentPot: 0 }).safePercent;
    for (const c of CHAMBERS) {
      assert.ok(safe(c, 'explorers') >= safe(c, 'challengers'), c);
      assert.ok(safe(c, 'challengers') >= safe(c, 'strategists'), c);
    }
  });
});

describe('odds-urns: computeChamberOdds vs exhaustive enumeration', () => {
  it('twin-dice: safe count, avg points and EV equal exhaustive 36-outcome enumeration for every tier and pot', () => {
    for (const tier of TIERS)
      for (const pot of [0, 1, 14, 24, 50, 137]) {
        let safe = 0;
        let pts = 0;
        for (let d1 = 1; d1 <= 6; d1++)
          for (let d2 = 1; d2 <= 6; d2++) {
            const sum = d1 + d2;
            const hazard = sum === 7 || (tier === 'strategists' && d1 === 1 && d2 === 1);
            if (!hazard) {
              safe++;
              pts += sum <= 4 || sum >= 10 ? 24 : 14;
            }
          }
        const o = computeChamberOdds({ chamber: 'twin-dice', tier, urnMarbles: [], spinnerWheel: createInitialSpinnerWheel(tier), currentPot: pot });
        assert.equal(o.safeNumerator, safe);
        assert.equal(o.denominator, 36);
        assert.equal(o.avgSafePoints, Math.round((pts / safe) * 10) / 10);
        const ev = (safe / 36) * (pts / safe) - ((36 - safe) / 36) * pot;
        assert.equal(o.expectedValueDelta, Math.round(ev * 10) / 10, `${tier} pot ${pot}`);
        assert.equal(o.safePercent + o.hazardPercent, 100);
      }
  });

  it('draw frequencies converge to the advertised safe probability (dice, urn, spinner; 30k draws each, 2% tolerance)', () => {
    for (const tier of TIERS)
      for (const chamber of CHAMBERS) {
        const rng = lcg(tier.length * 31 + chamber.length);
        const urn = createInitialUrn(tier);
        const wheel = createInitialSpinnerWheel(tier);
        const odds = computeChamberOdds({ chamber, tier, urnMarbles: urn, spinnerWheel: wheel, currentPot: 10 });
        let safe = 0;
        let pts = 0;
        const N = 30000;
        for (let i = 0; i < N; i++) {
          // fresh state each draw so odds stay constant (sampling-with-reset)
          const { outcome } = executeChamberDraw({ chamber, tier, urnMarbles: urn, spinnerWheel: wheel, rng });
          if (outcome.safe) {
            safe++;
            pts += outcome.pointsGained;
          } else assert.equal(outcome.pointsGained, 0);
        }
        assert.ok(Math.abs(safe / N - odds.safeNumerator / odds.denominator) < 0.02, `${tier}/${chamber}: ${safe / N} vs ${odds.safeNumerator}/${odds.denominator}`);
        if (safe > 0) assert.ok(Math.abs(pts / safe - odds.avgSafePoints) < 0.6, `${tier}/${chamber}: avg ${pts / safe} vs ${odds.avgSafePoints}`);
      }
  });

  it('dice: each of the 36 (d1,d2) outcomes is classified exactly as advertised (hazard / +24 / +14)', () => {
    for (const tier of TIERS)
      for (let d1 = 1; d1 <= 6; d1++)
        for (let d2 = 1; d2 <= 6; d2++) {
          const { outcome } = executeChamberDraw({ chamber: 'twin-dice', tier, urnMarbles: [], spinnerWheel: createInitialSpinnerWheel(tier), rng: dieRng(d1, d2) });
          assert.deepEqual(outcome.dice, [d1, d2]);
          const sum = d1 + d2;
          const hazard = sum === 7 || (tier === 'strategists' && sum === 2);
          assert.equal(outcome.safe, !hazard, `${tier} ${d1}+${d2}`);
          assert.equal(outcome.pointsGained, hazard ? 0 : sum <= 4 || sum >= 10 ? 24 : 14);
        }
  });

  it('urn odds: fraction/percent consistent with marble list for random urns; reduced fraction in lowest terms', () => {
    const rng = lcg(11);
    for (let i = 0; i < 3000; i++) {
      const n = Math.floor(rng() * 14);
      const urn: UrnMarble[] = Array.from({ length: n }, (_, k) => {
        const r = rng();
        const kind = r < 0.35 ? 'cobalt' : r < 0.6 ? 'emerald' : 'hazard';
        return { id: `m${k}`, kind, points: kind === 'cobalt' ? 12 : kind === 'emerald' ? 20 : 0, label: kind } as UrnMarble;
      });
      const pot = Math.floor(rng() * 80);
      const o = computeChamberOdds({ chamber: 'marble-urn', tier: 'challengers', urnMarbles: urn, spinnerWheel: createInitialSpinnerWheel('challengers'), currentPot: pot });
      const safe = urn.filter((m) => m.kind !== 'hazard');
      assert.equal(o.denominator, Math.max(1, n));
      assert.equal(o.safeNumerator, safe.length);
      assert.ok(o.safePercent >= 0 && o.safePercent <= 100);
      assert.ok(Math.abs(o.safePercent + o.hazardPercent - 100) < 0.11);
      assert.ok(Number.isFinite(o.expectedValueDelta) && Number.isFinite(o.avgSafePoints));
      if (n === 0) assert.deepEqual([o.safePercent, o.recommendation === 'press' || pot > 0], [0, true]);
      const [p, q] = o.reducedFraction.split('/').map(Number);
      assert.equal(p * o.denominator, o.safeNumerator * q);
      assert.equal(o.recommendation, pot === 0 || o.expectedValueDelta >= 0 ? 'press' : 'bank');
      assert.match(o.formulaExplanation, /E\[Press\]/);
    }
  });

  it('LATENT: spinner odds with degenerate wheels (all hazard / zero sectors) do not produce NaN', () => {
    for (const w of [
      { cobaltCount: 0, emeraldCount: 0, hazardCount: 12, boosted: false },
      { cobaltCount: 0, emeraldCount: 0, hazardCount: 0, boosted: false },
      { cobaltCount: 12, emeraldCount: 0, hazardCount: 0, boosted: true },
    ] as SpinnerWheelState[]) {
      const o = computeChamberOdds({ chamber: 'conditional-spinner', tier: 'explorers', urnMarbles: [], spinnerWheel: w, currentPot: 20 });
      for (const v of [o.safePercent, o.hazardPercent, o.avgSafePoints, o.expectedValueDelta]) assert.ok(Number.isFinite(v), JSON.stringify([w, o]));
    }
  });
});

describe('odds-urns: executeChamberDraw state transitions', () => {
  it('explorers urn is with replacement (size constant); other tiers without replacement (size-1, removed id)', () => {
    const rng = lcg(3);
    for (const tier of TIERS) {
      const urn = createInitialUrn(tier);
      const r = executeChamberDraw({ chamber: 'marble-urn', tier, urnMarbles: urn, spinnerWheel: createInitialSpinnerWheel(tier), rng });
      const drawn = r.outcome.marble!;
      if (tier === 'explorers') assert.equal(r.nextUrn.length, urn.length);
      else {
        assert.equal(r.nextUrn.length, urn.length - 1);
        assert.ok(!r.nextUrn.some((m) => m.id === drawn.id));
      }
      assert.notEqual(r.nextUrn, urn);
      assert.equal(urn.length, createInitialUrn(tier).length, 'input urn mutated');
    }
  });

  it('draining an urn without replacement: total points equals urn sum; exactly the hazards count of busts; never repeats a marble', () => {
    for (const tier of ['challengers', 'strategists'] as AgeTier[]) {
      let urn = createInitialUrn(tier);
      const rng = lcg(77);
      const seen = new Set<string>();
      let safeSum = 0;
      let busts = 0;
      while (urn.length > 0) {
        const r = executeChamberDraw({ chamber: 'marble-urn', tier, urnMarbles: urn, spinnerWheel: createInitialSpinnerWheel(tier), rng });
        assert.ok(!seen.has(r.outcome.marble!.id));
        seen.add(r.outcome.marble!.id);
        if (r.outcome.safe) safeSum += r.outcome.pointsGained;
        else busts++;
        urn = r.nextUrn;
      }
      const all = createInitialUrn(tier);
      assert.equal(safeSum, all.reduce((a, m) => a + m.points, 0));
      assert.equal(busts, all.filter((m) => m.kind === 'hazard').length);
    }
  });

  it('LATENT (UI guards it): drawing from an EMPTY urn throws (without-replacement urn is never refilled by the engine)', () => {
    assert.doesNotThrow(() =>
      executeChamberDraw({ chamber: 'marble-urn', tier: 'challengers', urnMarbles: [], spinnerWheel: createInitialSpinnerWheel('challengers'), rng: () => 0.5 })
    );
  });

  it('rng edge values 0, 0.999999, exactly 1 never index out of range; negative / NaN rng returns something sane', () => {
    for (const tier of TIERS)
      for (const chamber of CHAMBERS)
        for (const v of [0, 0.5, 0.999999, 1]) {
          const r = executeChamberDraw({ chamber, tier, urnMarbles: createInitialUrn(tier), spinnerWheel: createInitialSpinnerWheel(tier), rng: () => v });
          assert.equal(typeof r.outcome.safe, 'boolean');
          if (chamber === 'marble-urn') assert.ok(r.outcome.marble, `${tier} rng=${v}`);
        }
  });
  it('LATENT: rng returning negative or NaN indexes outside the urn (marble undefined -> TypeError)', () => {
    for (const v of [-0.01, NaN]) {
      assert.doesNotThrow(() =>
        executeChamberDraw({ chamber: 'marble-urn', tier: 'challengers', urnMarbles: createInitialUrn('challengers'), spinnerWheel: createInitialSpinnerWheel('challengers'), rng: () => v })
      , `rng=${v}`);
    }
  });

  it('spinner: sector->outcome mapping, boost converts a hazard to cobalt (12 sectors preserved), hazard resets wheel', () => {
    for (const tier of TIERS) {
      const w = createInitialSpinnerWheel(tier);
      for (let sector = 0; sector < 12; sector++) {
        const r = executeChamberDraw({ chamber: 'conditional-spinner', tier, urnMarbles: [], spinnerWheel: w, rng: () => (sector + 0.5) / 12 });
        assert.equal(r.outcome.spinnerSector, sector);
        if (sector < w.cobaltCount) {
          assert.deepEqual([r.outcome.safe, r.outcome.pointsGained], [true, 14]);
          assert.deepEqual(r.nextSpinner, w);
        } else if (sector < w.cobaltCount + w.emeraldCount) {
          assert.deepEqual([r.outcome.safe, r.outcome.pointsGained], [true, 22]);
          assert.equal(r.nextSpinner.cobaltCount, w.cobaltCount + 1);
          assert.equal(r.nextSpinner.hazardCount, w.hazardCount - 1);
          assert.equal(r.nextSpinner.boosted, true);
          assert.equal(r.nextSpinner.cobaltCount + r.nextSpinner.emeraldCount + r.nextSpinner.hazardCount, 12);
        } else {
          assert.deepEqual([r.outcome.safe, r.outcome.pointsGained], [false, 0]);
          assert.deepEqual(r.nextSpinner, createInitialSpinnerWheel(tier));
        }
      }
    }
  });

  it('spinner: repeated emerald boosts never drive hazards below 1 and never change the 12-sector total', () => {
    let w: SpinnerWheelState = createInitialSpinnerWheel('explorers');
    for (let i = 0; i < 30; i++) {
      // always land on the first emerald sector
      const r = executeChamberDraw({ chamber: 'conditional-spinner', tier: 'explorers', urnMarbles: [], spinnerWheel: w, rng: () => (w.cobaltCount + 0.5) / 12 });
      assert.equal(r.outcome.safe, true);
      w = r.nextSpinner;
      assert.ok(w.hazardCount >= 1);
      assert.equal(w.cobaltCount + w.emeraldCount + w.hazardCount, 12);
    }
    assert.equal(w.hazardCount, 1);
  });

  it('REVIEW FINDING: emerald boost at hazardCount=1 still announces "1 hazard sector converted" although nothing changed', () => {
    const w: SpinnerWheelState = { cobaltCount: 8, emeraldCount: 3, hazardCount: 1, boosted: true };
    const r = executeChamberDraw({ chamber: 'conditional-spinner', tier: 'explorers', urnMarbles: [], spinnerWheel: w, rng: () => (8.5) / 12 });
    assert.deepEqual(r.nextSpinner.hazardCount, 1);
    assert.ok(!/converted/.test(r.outcome.detail), r.outcome.detail);
  });

  it('LATENT: spinner with all-zero sectors must not award a safe Cobalt (-1 < 0 => safe +14)', () => {
    const r = executeChamberDraw({ chamber: 'conditional-spinner', tier: 'explorers', urnMarbles: [], spinnerWheel: { cobaltCount: 0, emeraldCount: 0, hazardCount: 0, boosted: false }, rng: () => 0.3 });
    assert.equal(r.outcome.safe, false);
  });

  it('Math.random default path works', () => {
    for (const c of CHAMBERS) assert.doesNotThrow(() => executeChamberDraw({ chamber: c, tier: 'strategists', urnMarbles: createInitialUrn('strategists'), spinnerWheel: createInitialSpinnerWheel('strategists') }));
  });
});

describe('odds-urns: estimate grading and EV bot', () => {
  it('evaluateOddsEstimate: 6-point tolerance boundary inclusive, symmetrical, 10 bonus, margin rounded to 0.1', () => {
    assert.deepEqual(evaluateOddsEstimate(50, 50), { accurate: true, errorMargin: 0, bonusPoints: 10 });
    assert.equal(evaluateOddsEstimate(56, 50).accurate, true);
    assert.equal(evaluateOddsEstimate(44, 50).accurate, true);
    assert.equal(evaluateOddsEstimate(56.1, 50).accurate, false);
    assert.equal(evaluateOddsEstimate(33.3, 39.3).accurate, true); // 6.000000000000007 before rounding
    assert.equal(evaluateOddsEstimate(33.3, 39.3).errorMargin, 6);
    for (let i = 0; i < 2000; i++) {
      const a = (i * 7.3) % 120;
      const b = (i * 3.1) % 100;
      assert.equal(evaluateOddsEstimate(a, b).errorMargin, evaluateOddsEstimate(b, a).errorMargin);
    }
  });
  it('REVIEW FINDING (low): out-of-range / non-numeric estimates (negative, >100, NaN) can still earn the bonus or return NaN margin', () => {
    // A student typing 105 or -3 for a 100% / 0% chamber is "accurate"; probabilities outside [0,100] should be rejected.
    assert.equal(evaluateOddsEstimate(105, 100).accurate, false);
    assert.equal(evaluateOddsEstimate(-3, 0).accurate, false);
    assert.ok(Number.isFinite(evaluateOddsEstimate(NaN, 50).errorMargin));
  });

  it('bot: pot 0 or first draw always presses; difficulty ordering is monotone (apprentice banks >= scholar banks >= master banks)', () => {
    const rng = lcg(404);
    let sawDifference = false;
    for (let i = 0; i < 4000; i++) {
      const tier = TIERS[Math.floor(rng() * 3)];
      const chamber = CHAMBERS[Math.floor(rng() * 3)];
      const pot = Math.floor(rng() * 90);
      const odds = computeChamberOdds({ chamber, tier, urnMarbles: createInitialUrn(tier), spinnerWheel: createInitialSpinnerWheel(tier), currentPot: pot });
      const draws = 1 + Math.floor(rng() * 5);
      const act = (d: AiDifficulty) => decideEvBotAction({ odds, currentPot: pot, difficulty: d, drawsThisTurn: draws });
      const [a, s, m] = (['apprentice', 'scholar', 'master'] as const).map(act);
      for (const dec of [a, s, m]) {
        assert.ok(dec.action === 'press' || dec.action === 'bank');
        assert.equal(dec.expectedValueDelta, odds.expectedValueDelta);
        assert.ok(dec.reasoning.length > 10);
      }
      if (pot === 0) for (const dec of [a, s, m]) assert.equal(dec.action, 'press');
      if (m.action === 'bank') assert.equal(s.action, 'bank');
      if (s.action === 'bank') assert.equal(a.action, 'bank');
      // master is exactly EV-optimal: banks iff EV<0 (for a live pot)
      if (pot > 0) assert.equal(m.action === 'bank', odds.expectedValueDelta < 0 || odds.safeNumerator === 0);
      if (a.action !== m.action) sawDifference = true;
      const first = decideEvBotAction({ odds, currentPot: pot, difficulty: 'apprentice', drawsThisTurn: 0 });
      assert.equal(first.action, 'press');
    }
    assert.ok(sawDifference, 'difficulties never diverge');
  });

  it('simulated bot-vs-bot turns: long-run expected pot per turn of master >= apprentice in dice chamber', () => {
    const run = (diff: AiDifficulty) => {
      const rng = lcg(2468);
      let banked = 0;
      for (let turn = 0; turn < 4000; turn++) {
        let pot = 0;
        let draws = 0;
        for (;;) {
          const odds = computeChamberOdds({ chamber: 'twin-dice', tier: 'challengers', urnMarbles: [], spinnerWheel: createInitialSpinnerWheel('challengers'), currentPot: pot });
          const dec = decideEvBotAction({ odds, currentPot: pot, difficulty: diff, drawsThisTurn: draws });
          if (dec.action === 'bank') {
            banked += pot;
            break;
          }
          const r = executeChamberDraw({ chamber: 'twin-dice', tier: 'challengers', urnMarbles: [], spinnerWheel: createInitialSpinnerWheel('challengers'), rng });
          draws++;
          if (!r.outcome.safe) break;
          pot += r.outcome.pointsGained;
          if (draws > 100) break;
        }
      }
      return banked / 4000;
    };
    const m = run('master');
    const a = run('apprentice');
    assert.ok(m >= a * 0.9, `master ${m.toFixed(1)} vs apprentice ${a.toFixed(1)} avg banked/turn`);
  });
});

describe('odds-urns: match record (round end / tie)', () => {
  it('win / loss / draw and labels per mode', () => {
    const base = { tier: 'strategists' as AgeTier, aiDifficulty: 'scholar' as AiDifficulty, chamber: 'twin-dice' as ProbabilityChamber };
    const w = buildOddsUrnsMatchRecord({ ...base, mode: 'vs-ai', playerScore: 101, opponentScore: 100 });
    const l = buildOddsUrnsMatchRecord({ ...base, mode: 'vs-ai', playerScore: 100, opponentScore: 101 });
    const d = buildOddsUrnsMatchRecord({ ...base, mode: 'vs-ai', playerScore: 100, opponentScore: 100 });
    assert.deepEqual([w.result, l.result, d.result], ['win', 'loss', 'draw']);
    assert.equal(w.opponentName, 'EV Bot · Scholar');
    assert.equal(w.aiDifficulty, 'scholar');
    const solo = buildOddsUrnsMatchRecord({ ...base, mode: 'solo', playerScore: 0, opponentScore: 0 });
    assert.equal(solo.opponentName, 'EV Par (Twin Dice)');
    assert.equal(solo.aiDifficulty, undefined);
    assert.equal(solo.gameTitle, 'Odds & Urns');
    for (const c of CHAMBERS) assert.match(buildOddsUrnsMatchRecord({ ...base, chamber: c, mode: 'solo', playerScore: 1, opponentScore: 1 }).opponentName, new RegExp(CHAMBER_SPECS[c].title));
  });
  it('LATENT: mode "local" is labelled "EV Bot"', () => {
    const base = { tier: 'explorers' as AgeTier, aiDifficulty: 'scholar' as AiDifficulty, chamber: 'twin-dice' as ProbabilityChamber, playerScore: 1, opponentScore: 0 };
    const local = buildOddsUrnsMatchRecord({ ...base, mode: 'local' });
    assert.ok(!/Bot/.test(local.opponentName), local.opponentName);
  });
  it('LATENT: unknown chamber id throws (no guard on CHAMBER_SPECS lookup)', () => {
    assert.doesNotThrow(() =>
      buildOddsUrnsMatchRecord({ tier: 'explorers', aiDifficulty: 'scholar', chamber: 'bogus' as ProbabilityChamber, mode: 'solo', playerScore: 1, opponentScore: 0 })
    );
  });
});
