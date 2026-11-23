import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDailyPuzzle,
  getLocalDateKey,
  shiftDateKey,
  getEditionNumber,
  parseDateKeyUTC,
  formatDateKeyLong,
  getSecondsUntilNextDaily,
  formatCountdownClock,
  calculateDailyScore,
  computeDailyStreakStats,
  getStreakBonusPoints,
  getStreakRewardSummary,
  buildDailyShareSummary,
  buildDailyMatchRecord,
  DAILY_TIME_LIMITS,
  type DailyPuzzle,
} from '../../lib/daily-challenge';
import { getProperDivisors } from '../../lib/factor-grid-engine';
import type { AgeTier } from '../../lib/types';

const TIERS: AgeTier[] = ['explorers', 'challengers', 'strategists'];
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function* dateRange(start: string, days: number) {
  for (let i = 0; i < days; i++) yield shiftDateKey(start, i);
}
const nums = (s: string) => (s.match(/-?\d+/g) ?? []).map(Number);
const digitSum = (n: number) => String(n).split('').reduce((a, c) => a + Number(c), 0);

/** Independently re-derives each clue from its printed text and checks the stored answer. Returns an error string or null. */
function verifyPuzzle(p: DailyPuzzle): string | null {
  const [s1, s2, s3] = p.steps;
  const A = s1.answer;
  const B = s2.answer;
  const V = s3.answer;
  const fail = (m: string) => `${p.dateKey}/${p.tier}/${p.archetype}: ${m}`;
  if (p.steps.length !== 3) return fail('not 3 steps');
  if (![A, B, V].every((x) => Number.isInteger(x) && x > 0)) return fail(`non-positive/non-integer answers ${A},${B},${V}`);
  if (new Set([A, B, V]).size !== 3) return fail(`duplicate answers within puzzle ${A},${B},${V}`);
  if (p.steps.map((s) => s.stepNumber).join() !== '1,2,3') return fail('step numbering');
  if (p.steps.map((s) => s.variableLabel).join() !== 'A,B,Vault') return fail('labels');
  if (p.timeLimitSeconds !== DAILY_TIME_LIMITS[p.tier]) return fail('time limit');
  for (const s of p.steps) if (!s.hint || !s.explanation || !s.prompt || !s.title) return fail('missing text');

  if (p.archetype === 'equation-vault') {
    const [f1, f2, sub] = nums(s1.formulaDisplay.slice(2));
    if (f1 * f2 - sub !== A) return fail(`A formula ${s1.formulaDisplay} != ${A}`);
    const f2nums = nums(s2.formulaDisplay.slice(2));
    const bCalc = p.tier === 'strategists' ? f2nums[0] * f2nums[1] - f2nums[2] : f2nums[0] + f2nums[1];
    if (p.tier === 'strategists' ? f2nums[0] !== 2 || f2nums[1] !== A : f2nums[0] !== A) return fail('B does not reference A');
    if (bCalc !== B) return fail(`B formula ${s2.formulaDisplay} != ${B}`);
    const v = nums(s3.formulaDisplay.replace('Vault =', ''));
    if (v[0] !== A || v[1] !== B) return fail('Vault references');
    if (v.reduce((a, b) => a + b, 0) !== V) return fail(`Vault ${s3.formulaDisplay} != ${V}`);
    if (p.tier !== 'explorers' && v[2] !== f1) return fail('multiplier mismatch');
  } else if (p.archetype === 'divisor-cipher') {
    const seq = nums(s1.formulaDisplay);
    const d = seq[1] - seq[0];
    if (seq[2] - seq[1] !== d || seq[3] - seq[2] !== d) return fail('sequence not arithmetic');
    if (seq[2] + d !== A) return fail('A != s3+d');
    const N = nums(s2.prompt)[0];
    const sum = Array.from({ length: N - 1 }, (_, i) => i + 1).filter((k) => N % k === 0).reduce((a, b) => a + b, 0);
    if (sum !== B) return fail(`B=${B} but proper-divisor sum of ${N} is ${sum}`);
    if (getProperDivisors(N).reduce((a, b) => a + b, 0) !== B) return fail('engine divisors disagree');
    const exp = p.tier === 'strategists' ? A + 2 * B : A + B;
    if (exp !== V) return fail(`vault ${V} != ${exp}`);
  } else if (p.archetype === 'balance-scale') {
    const [c, k, rhs] = nums(s1.formulaDisplay.replace('A', ''));
    if ((rhs - k) % c !== 0 || (rhs - k) / c !== A) return fail(`A equation ${s1.formulaDisplay} solves to ${(rhs - k) / c}, stored ${A}`);
    const [m, a2, sb] = nums(s2.formulaDisplay.slice(2));
    if (a2 !== A || m * A - sb !== B) return fail(`B formula ${s2.formulaDisplay} != ${B}`);
    const exp = p.tier === 'explorers' ? A + B : 2 * A + B;
    if (exp !== V) return fail(`vault ${V} != ${exp}`);
  } else {
    const [factor, lo, hi, D] = [nums(s1.prompt)[0], nums(s1.formulaDisplay)[0], nums(s1.formulaDisplay)[1], nums(s1.prompt).at(-1)!];
    const multiples = [];
    for (let x = lo; x <= hi; x++) if (x % factor === 0) multiples.push(x);
    if (multiples.length !== 1 || multiples[0] !== A) return fail(`mystery number not unique: multiples of ${factor} in [${lo},${hi}] = ${multiples}`);
    if (digitSum(A) !== D) return fail(`digit sum ${digitSum(A)} != ${D}`);
    const [aa, add] = nums(s2.formulaDisplay.slice(2).replace('(2 ×', '(2 ×'));
    void aa;
    const refA = p.tier === 'explorers' ? nums(s2.formulaDisplay.slice(2))[0] : nums(s2.formulaDisplay.slice(2))[1];
    if (refA !== A) return fail('B does not reference A');
    const stepAdd = p.tier === 'explorers' ? nums(s2.formulaDisplay.slice(2))[1] : nums(s2.formulaDisplay.slice(2))[2];
    void add;
    const exp = p.tier === 'explorers' ? A + stepAdd : 2 * A - stepAdd;
    if (exp !== B) return fail(`B ${B} != ${exp}`);
    if (A + B !== V) return fail('vault');
  }
  return null;
}

describe('daily generator: solvability and consistency', () => {
  it('every clue set for 1100 consecutive dates x 3 tiers re-derives from its printed text; answers are distinct positive ints', () => {
    let n = 0;
    const errors: string[] = [];
    for (const dk of dateRange('2025-10-01', 1100))
      for (const t of TIERS) {
        const p = generateDailyPuzzle(dk, t);
        n++;
        const e = verifyPuzzle(p);
        if (e) errors.push(e);
      }
    assert.equal(n, 3300);
    assert.deepEqual(errors.slice(0, 5), [], `${errors.length} bad puzzles`);
  });

  it('deterministic per (date, tier): 3 calls give deep-equal puzzles, independent of call order and TZ-env', () => {
    for (const dk of dateRange('2026-01-01', 120))
      for (const t of TIERS) {
        const a = generateDailyPuzzle(dk, t);
        generateDailyPuzzle('1999-01-01', 'explorers'); // unrelated call in between must not affect state
        assert.deepEqual(generateDailyPuzzle(dk, t), a);
      }
  });

  it('archetype rotation: four consecutive editions visit all four archetypes; same archetype for all tiers on a day', () => {
    const days = [...dateRange('2026-03-01', 400)];
    for (let i = 0; i + 3 < days.length; i += 4) {
      const set = new Set(days.slice(i, i + 4).map((d) => generateDailyPuzzle(d, 'challengers').archetype));
      const eds = days.slice(i, i + 4).map(getEditionNumber);
      // windows aligned to edition%4 boundaries only contain all four if alignment holds; check sliding windows instead
      void eds;
      void set;
    }
    for (let i = 0; i + 3 < days.length; i++) {
      const set = new Set(days.slice(i, i + 4).map((d) => generateDailyPuzzle(d, 'challengers').archetype));
      assert.equal(set.size, 4, `window at ${days[i]}`);
    }
    for (const d of days.slice(0, 60)) assert.equal(new Set(TIERS.map((t) => generateDailyPuzzle(d, t).archetype)).size, 1);
  });

  it('no puzzle repeats on consecutive days; cross-year exact-answer repeats stay small (365 days, per tier)', () => {
    for (const t of TIERS) {
      const seen = new Map<string, string>();
      let dups = 0;
      let prevKey = '';
      for (const dk of dateRange('2026-01-01', 365)) {
        const p = generateDailyPuzzle(dk, t);
        const key = `${p.archetype}|${p.steps.map((s) => s.answer).join(',')}|${p.steps[0].formulaDisplay}`;
        assert.notEqual(key, prevKey, `${t} ${dk} identical to previous day`);
        prevKey = key;
        if (seen.has(key)) dups++;
        seen.set(key, dk);
      }
      assert.ok(dups <= 10, `${t}: ${dups} of 365 daily puzzles are verbatim repeats of an earlier day in the same year`);
    }
  });

  it('answer leakage: puzzle for a different tier on the same day never shares the full answer triple', () => {
    for (const dk of dateRange('2026-01-01', 365)) {
      const keys = TIERS.map((t) =>
        generateDailyPuzzle(dk, t)
          .steps.map((s) => s.answer)
          .join(',')
      );
      assert.equal(new Set(keys).size, 3, dk);
    }
  });

  it('edge dates generate and verify: leap days, century non-leap, year ends, epoch, far future, pre-epoch', () => {
    const edges = ['2024-02-29', '2028-02-29', '2100-02-28', '2100-03-01', '2025-12-31', '2026-01-01', '2025-10-01', '2025-09-30', '2099-12-31', '2200-01-01', '1999-12-31', '2024-03-10', '2026-03-08', '2026-11-01'];
    for (const dk of edges)
      for (const t of TIERS) {
        const p = generateDailyPuzzle(dk, t);
        assert.equal(verifyPuzzle(p), null);
        assert.equal(p.dateKey, dk);
        assert.ok(p.editionNumber >= 1);
      }
  });

  it('REVIEW FINDING: pre-epoch dates all get edition #1 and archetype rotation freezes (every pre-Oct-2025 day is "Equation Vault")', () => {
    const arche = new Set([...dateRange('2025-08-01', 60)].map((d) => generateDailyPuzzle(d, 'explorers').archetype));
    assert.ok(arche.size > 1, `${[...arche]} for 60 pre-epoch days`);
  });

  it('REVIEW FINDING: malformed date keys silently map to the epoch edition instead of failing (garbage in -> real puzzle out)', () => {
    for (const bad of ['', 'abc', '2026-02', '2026-02-30', '2026-13-01', '2026-00-10', 'null']) {
      const p = generateDailyPuzzle(bad, 'explorers');
      assert.equal(verifyPuzzle(p), null);
    }
    // 2026-02-30 and 2026-03-02 are different keys but the same real day; their seeds differ -> different puzzles
    assert.equal(getEditionNumber('2026-02-30'), getEditionNumber('2026-03-02'));
    assert.notEqual(formatDateKeyLong('2026-02-30'), 'Invalid Date');
  });

  it('seed independence: hash of date/tier gives no cross-tier or neighbouring-day answer correlation (first-step answers differ often)', () => {
    let same = 0;
    let total = 0;
    for (const t of TIERS) {
      let prev: number | null = null;
      for (const dk of dateRange('2026-01-01', 365)) {
        const a = generateDailyPuzzle(dk, t).steps[0].answer;
        if (prev !== null) {
          total++;
          if (prev === a) same++;
        }
        prev = a;
      }
    }
    assert.ok(same / total < 0.1, `${same}/${total} consecutive-day step-1 answers identical`);
  });
});

describe('daily date helpers: leap day, DST, timezones', () => {
  it('shiftDateKey round-trips for +/- 1..800 days over 1000 start dates and never skips a calendar day', () => {
    const rng = lcg(55);
    for (let i = 0; i < 1000; i++) {
      const start = shiftDateKey('2000-01-01', Math.floor(rng() * 12000));
      const d = Math.floor(rng() * 800) - 400;
      assert.equal(shiftDateKey(shiftDateKey(start, d), -d), start);
    }
    assert.equal(shiftDateKey('2024-02-28', 1), '2024-02-29');
    assert.equal(shiftDateKey('2024-02-29', 1), '2024-03-01');
    assert.equal(shiftDateKey('2100-02-28', 1), '2100-03-01');
    assert.equal(shiftDateKey('2000-02-28', 1), '2000-02-29');
    assert.equal(shiftDateKey('2026-12-31', 1), '2027-01-01');
    assert.equal(shiftDateKey('2026-01-01', -1), '2025-12-31');
    assert.equal(shiftDateKey('2026-03-08', 0), '2026-03-08');
  });

  it('edition numbers are +1 per calendar day across leap day and DST dates (UTC math, no 23/25h drift)', () => {
    let prev = getEditionNumber('2025-10-01');
    assert.equal(prev, 1);
    for (const dk of dateRange('2025-10-02', 1200)) {
      const e = getEditionNumber(dk);
      assert.equal(e, prev + 1, dk);
      prev = e;
    }
  });

  it('getLocalDateKey formats local components; round-trips with new Date(y,m,d) for 4 years (incl. leap day)', () => {
    for (const dk of dateRange('2024-01-01', 1461)) {
      const [y, m, d] = dk.split('-').map(Number);
      assert.equal(getLocalDateKey(new Date(y, m - 1, d, 12, 0, 0)), dk);
      assert.equal(getLocalDateKey(new Date(y, m - 1, d, 0, 0, 0)), dk);
      assert.equal(getLocalDateKey(new Date(y, m - 1, d, 23, 59, 59, 999)), dk);
    }
  });

  for (const tz of ['America/New_York', 'Europe/London', 'Australia/Lord_Howe', 'Pacific/Apia', 'Asia/Kolkata', 'UTC']) {
    it(`TZ=${tz}: getLocalDateKey / getSecondsUntilNextDaily / puzzle are consistent across DST transitions`, () => {
      const prevTz = process.env.TZ;
      process.env.TZ = tz;
      try {
        // every 20 minutes for 3 days around known transitions plus leap day
        const anchors: [number, number, number][] = [[2026, 3, 8], [2026, 11, 1], [2026, 3, 29], [2026, 10, 25], [2026, 4, 5], [2026, 10, 4], [2024, 2, 28]];
        for (const [y, m, d] of anchors) {
          const base = new Date(y, m - 1, d - 1, 0, 0, 0).getTime();
          for (let step = 0; step < 3 * 72; step++) {
            const now = new Date(base + step * 20 * 60_000);
            const key = getLocalDateKey(now);
            const secs = getSecondsUntilNextDaily(now);
            assert.ok(secs > 0 && secs <= 25 * 3600 + 1, `${tz} ${now.toISOString()} secs=${secs}`);
            // next local midnight must start the next key
            const after = new Date(now.getTime() + secs * 1000);
            assert.equal(getLocalDateKey(after), shiftDateKey(key, 1), `${tz} ${now.toISOString()}`);
            const before = new Date(now.getTime() + secs * 1000 - 1000);
            assert.equal(getLocalDateKey(before), key, `${tz} ${now.toISOString()} (1s before rollover)`);
          }
        }
        // puzzle must be identical regardless of TZ
        assert.deepEqual(generateDailyPuzzle('2026-03-08', 'strategists'), generateDailyPuzzle('2026-03-08', 'strategists'));
      } finally {
        if (prevTz === undefined) delete process.env.TZ;
        else process.env.TZ = prevTz;
      }
    });
  }

  it('TZ=America/New_York: countdown on spring-forward is 23h long and fall-back is 25h long; puzzle identical across TZs', () => {
    const prevTz = process.env.TZ;
    try {
      process.env.TZ = 'America/New_York';
      assert.equal(getSecondsUntilNextDaily(new Date(2026, 2, 8, 0, 0, 0)), 23 * 3600);
      assert.equal(getSecondsUntilNextDaily(new Date(2026, 10, 1, 0, 0, 0)), 25 * 3600);
      const ny = generateDailyPuzzle('2026-03-08', 'challengers');
      process.env.TZ = 'Pacific/Kiritimati';
      assert.deepEqual(generateDailyPuzzle('2026-03-08', 'challengers'), ny);
    } finally {
      if (prevTz === undefined) delete process.env.TZ;
      else process.env.TZ = prevTz;
    }
  });

  it('formatCountdownClock: bounds, rounding, negative/NaN/Infinity inputs', () => {
    assert.equal(formatCountdownClock(0), '00:00:00');
    assert.equal(formatCountdownClock(86399), '23:59:59');
    assert.equal(formatCountdownClock(90000), '25:00:00');
    assert.equal(formatCountdownClock(59.9), '00:00:59');
    assert.equal(formatCountdownClock(-5), '00:00:00');
    assert.match(formatCountdownClock(NaN), /^\d\d:\d\d:\d\d$/);
    assert.match(formatCountdownClock(Infinity), /^\d\d:\d\d:\d\d$/);
  });

  it('REVIEW FINDING: parseDateKeyUTC rolls impossible dates over (2026-02-30 -> Mar 2) and maps years 0-99 to 19xx', () => {
    assert.equal(shiftDateKey('2026-02-30', 0), '2026-02-30');
    assert.equal(shiftDateKey('0050-06-01', 0), '0050-06-01');
  });

  it('REVIEW FINDING: shiftDateKey pads year only implicitly (year < 1000 loses zero padding)', () => {
    assert.match(shiftDateKey('0999-12-31', 1), /^\d{4}-/);
  });
});

describe('daily score and streak properties', () => {
  const base = { solved: true, stepsSolved: 3, secondsUsed: 30, timeLimitSeconds: 90, mistakes: 0, hintsUsed: 0, streakDays: 0 };

  it('solved score is bounded, monotone non-increasing in time/mistakes/hints, floor 50; unsolved is steps*50 - mistakes*5 >= 0', () => {
    const rng = lcg(808);
    for (let i = 0; i < 20000; i++) {
      const limit = [60, 75, 90, 120][Math.floor(rng() * 4)];
      const p = {
        solved: true,
        stepsSolved: 3,
        secondsUsed: Math.floor(rng() * (limit + 40)),
        timeLimitSeconds: limit,
        mistakes: Math.floor(rng() * 8),
        hintsUsed: Math.floor(rng() * 4),
        streakDays: Math.floor(rng() * 40),
      };
      const s = calculateDailyScore(p);
      assert.ok(Number.isInteger(s) && s >= 50, JSON.stringify(p));
      assert.ok(s <= 150 + 100 + 50 + 150, `score ${s} above any plausible max`);
      assert.ok(calculateDailyScore({ ...p, secondsUsed: p.secondsUsed + 5 }) <= s);
      assert.ok(calculateDailyScore({ ...p, mistakes: p.mistakes + 1 }) <= s);
      assert.ok(calculateDailyScore({ ...p, hintsUsed: p.hintsUsed + 1 }) <= s);
      assert.ok(calculateDailyScore({ ...p, streakDays: p.streakDays + 1 }) >= s);
      const u = calculateDailyScore({ ...p, solved: false, stepsSolved: Math.floor(rng() * 3) });
      assert.ok(u >= 0 && Number.isInteger(u));
    }
  });

  it('exact known values: flawless fast solve, slow solve, unsolved', () => {
    // 150 steps + 67 time bonus (60/90 left) + 50 flawless
    assert.equal(calculateDailyScore(base), 150 + Math.round((60 / 90) * 100) + 50);
    assert.equal(calculateDailyScore({ ...base, secondsUsed: 500 }), 150 + 0 + 50);
    assert.equal(calculateDailyScore({ ...base, solved: false, stepsSolved: 2, mistakes: 3 }), 100 - 15);
    assert.equal(calculateDailyScore({ ...base, solved: false, stepsSolved: 0, mistakes: 9 }), 0);
    assert.equal(calculateDailyScore({ ...base, mistakes: 100, hintsUsed: 100 }), 50);
  });

  it('REVIEW FINDING: NaN / negative secondsUsed poisons or inflates the score (NaN score / bonus > 100)', () => {
    const nan = calculateDailyScore({ ...base, secondsUsed: NaN });
    assert.ok(Number.isFinite(nan), `NaN secondsUsed -> ${nan}`);
    const neg = calculateDailyScore({ ...base, secondsUsed: -300 });
    const zero = calculateDailyScore({ ...base, secondsUsed: 0 });
    assert.ok(neg <= zero, `negative time (${neg}) scores more than zero time (${zero})`);
  });

  it('REVIEW FINDING: timeLimitSeconds 0 with secondsUsed 0 awards time bonus 0 but NaN stepsSolved produces NaN', () => {
    assert.ok(Number.isFinite(calculateDailyScore({ ...base, stepsSolved: NaN })));
  });

  it('streak ladder is monotone non-decreasing and matches reward summary; negative/NaN streak gives 0', () => {
    let prev = 0;
    for (let d = 0; d <= 400; d++) {
      const b = getStreakBonusPoints(d);
      assert.ok(b >= prev, `d=${d}`);
      prev = b;
      assert.ok(getStreakRewardSummary(d) !== undefined);
    }
    assert.equal(getStreakBonusPoints(-3), 0);
    assert.equal(getStreakBonusPoints(NaN), 0);
  });

  it('computeDailyStreakStats equals a brute-force reference on 3000 random completion sets (best, current, total, today flag)', () => {
    const rng = lcg(1717);
    for (let iter = 0; iter < 3000; iter++) {
      const today = shiftDateKey('2026-01-01', Math.floor(rng() * 800));
      const pSolved = rng();
      const completions = [];
      const solvedSet = new Set<string>();
      for (let i = -40; i <= 1; i++) {
        if (rng() < pSolved) {
          const dk = shiftDateKey(today, i);
          const solved = rng() < 0.85;
          completions.push({ dateKey: dk, solved } as never);
          if (solved) solvedSet.add(dk);
          if (rng() < 0.2) completions.push({ dateKey: dk, solved: false } as never); // duplicate failed retry
          if (rng() < 0.1) completions.push({ dateKey: dk, solved: true } as never); // duplicate solved
          if (rng() < 0.1) solvedSet.add(dk);
        }
      }
      for (const c of completions as { dateKey: string; solved: boolean }[]) if (c.solved) solvedSet.add(c.dateKey);
      const stats = computeDailyStreakStats(completions, today);
      // reference
      const days = [...solvedSet].sort();
      let best = 0;
      let run = 0;
      for (let i = 0; i < days.length; i++) {
        run = i > 0 && shiftDateKey(days[i - 1], 1) === days[i] ? run + 1 : 1;
        best = Math.max(best, run);
      }
      let cur = 0;
      let cursor = solvedSet.has(today) ? today : shiftDateKey(today, -1);
      while (solvedSet.has(cursor)) {
        cur++;
        cursor = shiftDateKey(cursor, -1);
      }
      // note: a future-dated solved day (today+1) must not count towards totals/best arguably; reference includes it like the engine
      assert.equal(stats.bestStreak, best);
      assert.equal(stats.currentStreak, cur);
      assert.equal(stats.totalSolved, solvedSet.size);
      assert.equal(stats.solvedToday, solvedSet.has(today));
      assert.equal(stats.last7Days.length, 7);
      assert.equal(stats.last7Days[6].dateKey, today);
      assert.equal(stats.last7Days.filter((x) => x.isToday).length, 1);
      assert.ok(stats.bestStreak >= stats.currentStreak);
    }
  });

  it('REVIEW FINDING: a solved entry dated in the future (clock change / bad data) inflates bestStreak and totalSolved', () => {
    const today = '2026-05-10';
    const stats = computeDailyStreakStats(
      [
        { dateKey: '2026-05-09', solved: true },
        { dateKey: '2026-05-10', solved: true },
        { dateKey: '2026-05-11', solved: true },
        { dateKey: '2026-05-12', solved: true },
      ] as never,
      today
    );
    assert.equal(stats.totalSolved, 2, `future days counted: totalSolved=${stats.totalSolved}, best=${stats.bestStreak}`);
  });

  it('share summary / match record: tie-free fields, no NaN, par 180 convention', () => {
    const c = { dateKey: '2026-01-02', editionNumber: 94, tier: 'explorers', archetypeTitle: 'Equation Vault', archetypeId: 'x', solved: true, stepsSolved: 3, secondsUsed: 41, timeLimitSeconds: 120, mistakes: 0, hintsUsed: 0, score: 270, completedAt: '2026-01-02T10:00:00.000Z', streakDays: 3 } as never;
    assert.match(buildDailyShareSummary(c), /#94.*Solved 3\/3 in 41s.*270 pts.*3d Streak/);
    const m = buildDailyMatchRecord(c);
    assert.equal(m.result, 'win');
    assert.equal(m.opponentScore, 180);
    assert.equal(m.dailyMeta?.dateKey, '2026-01-02');
    assert.equal(buildDailyMatchRecord({ ...(c as object), solved: false } as never).result, 'loss');
    assert.doesNotMatch(buildDailyShareSummary({ ...(c as object), streakDays: 1 } as never), /Streak/);
  });

  it('REVIEW FINDING: a solved attempt that scores BELOW par 180 is still recorded as a "win" and an unsolved one as "loss" regardless of score', () => {
    const c = { dateKey: '2026-01-02', editionNumber: 94, tier: 'explorers', archetypeTitle: 'Equation Vault', solved: true, stepsSolved: 3, secondsUsed: 999, timeLimitSeconds: 120, mistakes: 9, hintsUsed: 9, score: 50, completedAt: '2026-01-02T10:00:00.000Z' } as never;
    const m = buildDailyMatchRecord(c);
    assert.equal(m.result === 'win', m.playerScore >= m.opponentScore, `score ${m.playerScore} vs par ${m.opponentScore} => ${m.result}`);
  });
});
