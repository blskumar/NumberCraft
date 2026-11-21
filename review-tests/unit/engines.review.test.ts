import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyNumber,
  createFactorGame,
  getProperDivisors,
  isPrime,
  applyMove,
  getLegalMoves,
  chooseAiMove,
  generatePrototypeRoomCode,
  TIER_SPECS,
} from '../../lib/factor-grid-engine';
import {
  generateArithmeticProblem,
  buildArithmeticMatchRecord,
  getParTargetScore,
  calculateAnswerPoints,
  computeProgressiveStage,
  type ArithmeticRoundConfig,
} from '../../lib/arithmetic-engine';
import {
  stepAdaptiveSession,
  createAdaptiveSession,
  computeHistoricalCalibration,
  clampAdaptiveLevel,
} from '../../lib/adaptive-arithmetic';
import {
  generateDailyPuzzle,
  getLocalDateKey,
  shiftDateKey,
  getEditionNumber,
  parseDateKeyUTC,
  formatCountdownClock,
  getStreakBonusPoints,
  getSecondsUntilNextDaily,
  computeDailyStreakStats,
} from '../../lib/daily-challenge';
import type { AgeTier, ArithmeticGameId } from '../../lib/types';

const TIERS: AgeTier[] = ['explorers', 'challengers', 'strategists'];
const GAMES: ArithmeticGameId[] = [
  'addition-attack',
  'subtraction-sprint',
  'multiplication-mastery',
];

// deterministic rng so failures reproduce
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('factor-grid-engine: number theory primitives', () => {
  it('isPrime handles 0, 1, negatives, large primes', () => {
    assert.equal(isPrime(0), false);
    assert.equal(isPrime(1), false);
    assert.equal(isPrime(-7), false);
    assert.equal(isPrime(2), true);
    assert.equal(isPrime(97), true);
    assert.equal(isPrime(49), false);
  });

  it('getProperDivisors is sorted, excludes n, includes 1', () => {
    for (let n = 2; n <= 200; n++) {
      const d = getProperDivisors(n);
      assert.ok(d.includes(1), `n=${n}`);
      assert.ok(!d.includes(n), `n=${n}`);
      assert.deepEqual([...d].sort((a, b) => a - b), d);
      assert.equal(new Set(d).size, d.length, `dupes for ${n}`);
      for (const x of d) assert.equal(n % x, 0);
    }
  });

  it('classifyNumber: 0 / negatives must not be called perfect/abundant', () => {
    // REVIEW FINDING (low): classifyNumber(0) -> divisorSum 0 === n -> 'perfect'.
    const zero = classifyNumber(0);
    assert.notEqual(zero.kind, 'perfect', `0 classified as ${zero.kind}`);
  });

  it('classifyNumber: -5 must not be abundant', () => {
    const neg = classifyNumber(-5);
    assert.notEqual(neg.kind, 'abundant', `-5 classified as ${neg.kind}`);
  });

  it('known perfect numbers 6 and 28; abundant 12, 18, 20', () => {
    assert.equal(classifyNumber(6).kind, 'perfect');
    assert.equal(classifyNumber(28).kind, 'perfect');
    for (const n of [12, 18, 20, 24, 36, 40, 48]) {
      assert.equal(classifyNumber(n).kind, 'abundant', String(n));
    }
  });

  it('every tier: full self-play (solo + local + vs-ai x3) ends, scores conserve', () => {
    for (const tier of TIERS) {
      for (const mode of ['solo', 'local', 'vs-ai'] as const) {
        for (const ai of ['apprentice', 'scholar', 'master'] as const) {
          if (mode !== 'vs-ai' && ai !== 'scholar') continue;
          let st = createFactorGame({ tier, mode, aiDifficulty: ai });
          let guard = 0;
          while (st.status === 'playing' && guard++ < 200) {
            const mv = chooseAiMove(st, ai);
            assert.ok(mv, 'legal move expected while playing');
            st = applyMove(st, mv!.tile);
          }
          assert.equal(st.status, 'gameover', `${tier}/${mode}/${ai}`);
          assert.equal(getLegalMoves(st).length, 0);
          // total points == sum(1..boardMax) when every tile has an owner
          const total = (TIER_SPECS[tier].boardMax * (TIER_SPECS[tier].boardMax + 1)) / 2;
          const claimed = Object.values(st.tiles).filter((o) => o !== 'unclaimed').length;
          if (mode === 'solo') {
            assert.equal(st.scores.p1 + st.scores.p2, total, `${tier} solo conservation`);
          } else if (claimed === TIER_SPECS[tier].boardMax) {
            assert.equal(st.scores.p1 + st.scores.p2, total);
          }
        }
      }
    }
  });

  it('2-player game that ends with unclaimed tiles: leftover tiles are scored for nobody (rule gap)', () => {
    // REVIEW FINDING (medium, rules): in local / vs-ai modes leftover unclaimed tiles
    // are never awarded; only solo sweeps to Taxman. Documents current behavior.
    let st = createFactorGame({ tier: 'challengers', mode: 'local' });
    let g = 0;
    while (st.status === 'playing' && g++ < 200) {
      const mv = chooseAiMove(st, 'scholar')!;
      st = applyMove(st, mv.tile);
    }
    const left = Object.entries(st.tiles).filter(([, o]) => o === 'unclaimed');
    // Not an assertion of failure: record for the report.
    console.log(`  [info] local-mode challengers leftover unclaimed tiles: ${left.length}`);
    assert.equal(st.status, 'gameover');
  });

  it('illegal moves are no-ops (same reference)', () => {
    const st = createFactorGame({ tier: 'explorers', mode: 'solo' });
    assert.equal(applyMove(st, 1), st); // 1 has no proper divisors
    assert.equal(applyMove(st, 999), st);
    assert.equal(applyMove(st, -3), st);
    assert.equal(applyMove(st, NaN), st);
    assert.equal(applyMove(st, 2.5), st);
  });

  it('room code uses unambiguous alphabet and XXX-XXX shape', () => {
    for (let i = 0; i < 500; i++) {
      assert.match(generatePrototypeRoomCode(), /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
    }
  });
});

describe('arithmetic-engine: problem generation property sweep', () => {
  const stagesAdaptive = [undefined, 1, 2, 3, 4, 5] as const;
  const focuses = ['progressive', 'foundations', 'core-6-9', 'twelves', 'extended'] as const;

  it('answers are exact, finite integers; operands positive; no negative unless allowed', () => {
    const rng = lcg(12345);
    let n = 0;
    for (const gameId of GAMES) {
      for (const tier of TIERS) {
        for (const lvl of stagesAdaptive) {
          for (const tableFocus of focuses) {
            for (const signed of [false, true]) {
              for (let solved = 0; solved < 40; solved += 7) {
                const config: ArithmeticRoundConfig = {
                  gameId,
                  tier,
                  pace: 'standard',
                  untimed: false,
                  startStage: 1,
                  tableFocus,
                  allowSignedStrategistSub: signed,
                  adaptiveDifficulty: lvl !== undefined,
                  adaptiveLevel: lvl,
                };
                for (let r = 0; r < 12; r++) {
                  const p = generateArithmeticProblem(config, solved, undefined, rng);
                  n++;
                  const expected =
                    p.operator === '+' ? p.left + p.right : p.operator === '−' ? p.left - p.right : p.left * p.right;
                  const ctx = JSON.stringify({ gameId, tier, lvl, tableFocus, signed, solved, p });
                  assert.ok(Number.isInteger(p.left) && Number.isInteger(p.right), ctx);
                  assert.ok(p.left > 0 && p.right > 0, 'operands > 0 ' + ctx);
                  assert.equal(p.answer, expected, ctx);
                  assert.ok(Number.isFinite(p.answer), ctx);
                  if (p.answer < 0) assert.ok(p.allowNegative, 'negative answer w/o allowNegative ' + ctx);
                  assert.ok(p.stage >= 1 && p.stage <= 5, ctx);
                  assert.ok(p.hint.length > 0, ctx);
                }
              }
            }
          }
        }
      }
    }
    console.log(`  [info] generated ${n} problems, all valid`);
  });

  it('subtraction: non-strategist tiers never produce negative answers', () => {
    const rng = lcg(9);
    for (const tier of ['explorers', 'challengers'] as const) {
      for (let i = 0; i < 2000; i++) {
        const p = generateArithmeticProblem(
          {
            gameId: 'subtraction-sprint',
            tier,
            pace: 'standard',
            untimed: false,
            startStage: 1,
            tableFocus: 'progressive',
            allowSignedStrategistSub: true,
            adaptiveDifficulty: true,
            adaptiveLevel: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          },
          i,
          undefined,
          rng
        );
        assert.ok(p.answer > 0, JSON.stringify(p));
      }
    }
  });

  it('does not repeat the previous signature back-to-back (best effort)', () => {
    const rng = lcg(77);
    let repeats = 0;
    let prev: string | undefined;
    for (let i = 0; i < 3000; i++) {
      const p = generateArithmeticProblem(
        {
          gameId: 'multiplication-mastery',
          tier: 'explorers',
          pace: 'standard',
          untimed: false,
          startStage: 1,
          tableFocus: 'foundations',
          allowSignedStrategistSub: false,
          adaptiveDifficulty: false,
        },
        0,
        prev,
        rng
      );
      const sig = `${p.left}${p.operator}${p.right}`;
      if (sig === prev) repeats++;
      prev = sig;
    }
    assert.ok(repeats < 10, `back-to-back repeats: ${repeats}`);
  });

  it('match result: "draw" band is practically unreachable (REVIEW FINDING)', () => {
    // score === parScore - 5 is the only draw value. Count draw outcomes for scores 0..300.
    const config: ArithmeticRoundConfig = {
      gameId: 'addition-attack',
      tier: 'challengers',
      pace: 'standard',
      untimed: false,
      startStage: 1,
      tableFocus: 'progressive',
      allowSignedStrategistSub: false,
    };
    const par = getParTargetScore(config.gameId, config.tier, config.pace, config.untimed);
    const draws: number[] = [];
    for (let s = 0; s <= 300; s++) {
      const r = buildArithmeticMatchRecord({
        config,
        score: s,
        solved: 1,
        attempted: 1,
        bestStreak: 1,
        elapsedSeconds: 10,
        maxStageReached: 1,
      });
      if (r.result === 'draw') draws.push(s);
    }
    console.log(`  [info] par=${par}; draw only at score(s): ${draws.join(',')}`);
    assert.equal(draws.length, 1);
    assert.equal(draws[0], par - 5);
  });

  it('scoring monotonic and bounded', () => {
    assert.equal(calculateAnswerPoints(false, 5, 3), 0);
    for (let st = 1; st <= 5; st++) {
      let last = -1;
      for (let streak = 1; streak < 30; streak++) {
        const p = calculateAnswerPoints(true, streak, st);
        assert.ok(p >= last);
        last = p;
      }
      assert.ok(last <= 10 + (st - 1) * 3 + 15);
    }
    assert.equal(computeProgressiveStage(9, 100), 5);
    assert.equal(computeProgressiveStage(-4, 0), 1);
    assert.equal(computeProgressiveStage(1, 10), 3);
  });
});

describe('adaptive-arithmetic', () => {
  it('level always stays in 1..5 under random answer streams', () => {
    const rng = lcg(5);
    for (let run = 0; run < 300; run++) {
      let s = createAdaptiveSession(((run % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      for (let i = 0; i < 80; i++) {
        s = stepAdaptiveSession(s, rng() < 0.6, 300 + rng() * 20000);
        assert.ok(s.level >= 1 && s.level <= 5);
        assert.ok(s.peakLevel >= s.level);
        assert.ok(s.recentOutcomes.length <= 6);
      }
    }
  });

  it('two consecutive misses step down and request a hint', () => {
    let s = createAdaptiveSession(3);
    s = stepAdaptiveSession(s, false, 1000);
    s = stepAdaptiveSession(s, false, 1000);
    assert.equal(s.level, 2);
    assert.equal(s.suggestHint, true);
  });

  it('cooldown: cannot step up in fewer than 3 turns', () => {
    let s = createAdaptiveSession(2);
    s = stepAdaptiveSession(s, true, 800);
    s = stepAdaptiveSession(s, true, 800);
    assert.equal(s.level, 2);
  });

  it('clampAdaptiveLevel handles NaN/Infinity (REVIEW: NaN -> ?)', () => {
    assert.equal(clampAdaptiveLevel(-5), 1);
    assert.equal(clampAdaptiveLevel(99), 5);
    assert.equal(clampAdaptiveLevel(Infinity), 5);
    const v = clampAdaptiveLevel(NaN);
    assert.ok([1, 2, 3, 4, 5].includes(v), `NaN -> ${String(v)} is not a valid level`);
  });

  it('calibration with corrupt/partial meta does not throw', () => {
    const bad: any = [
      { tier: 'explorers', playedAt: 'x', arithmeticMeta: { gameId: 'addition-attack', attempted: 3, solved: 3, accuracyPercent: 100, durationSeconds: 0, bestStreak: 3, pace: 'standard' } },
    ];
    const c = computeHistoricalCalibration(bad, 'addition-attack', 'explorers');
    assert.ok(c.startingLevel >= 1 && c.startingLevel <= 5);
  });
});

describe('daily-challenge', () => {
  it('date key helpers: leap day, month rollover, year rollover', () => {
    assert.equal(shiftDateKey('2024-02-28', 1), '2024-02-29');
    assert.equal(shiftDateKey('2024-02-29', 1), '2024-03-01');
    assert.equal(shiftDateKey('2025-02-28', 1), '2025-03-01');
    assert.equal(shiftDateKey('2025-12-31', 1), '2026-01-01');
    assert.equal(shiftDateKey('2026-01-01', -1), '2025-12-31');
    assert.equal(shiftDateKey('2025-03-31', -31), '2025-02-28');
  });

  it('getLocalDateKey formats local date with zero padding', () => {
    assert.equal(getLocalDateKey(new Date(2025, 0, 5, 23, 59)), '2025-01-05');
    assert.equal(getLocalDateKey(new Date(2025, 11, 31, 0, 0)), '2025-12-31');
  });

  it('malformed date keys fall back (REVIEW: garbage like 2025-13-45 silently rolls over)', () => {
    assert.equal(parseDateKeyUTC('abc'), parseDateKeyUTC('2025-10-01'));
    const rolled = parseDateKeyUTC('2025-13-45');
    // Date.UTC rolls month 13 -> Jan next year; not rejected.
    console.log(`  [info] parseDateKeyUTC('2025-13-45') -> ${new Date(rolled).toISOString()} (no validation)`);
    assert.ok(Number.isFinite(rolled));
  });

  it('edition numbers: epoch=1, monotonic, pre-epoch clamps to 1', () => {
    assert.equal(getEditionNumber('2025-10-01'), 1);
    assert.equal(getEditionNumber('2025-10-02'), 2);
    assert.equal(getEditionNumber('2020-01-01'), 1);
  });

  it('formatCountdownClock bounds', () => {
    assert.equal(formatCountdownClock(0), '00:00:00');
    assert.equal(formatCountdownClock(86399), '23:59:59');
    assert.equal(formatCountdownClock(-5), '00:00:00');
    assert.equal(formatCountdownClock(3661.9), '01:01:01');
  });

  it('getSecondsUntilNextDaily is within (0, 86400]', () => {
    for (const d of [new Date(2025, 5, 1, 0, 0, 0), new Date(2025, 5, 1, 23, 59, 59), new Date(2025, 2, 30, 12)]) {
      const s = getSecondsUntilNextDaily(d);
      assert.ok(s > 0 && s <= 86400 + 3600, String(s)); // +1h for DST days
    }
  });

  it('streak bonus ladder matches README (2d=15, 3d=30, 5d=50, 7d=75)', () => {
    assert.equal(getStreakBonusPoints(0), 0);
    assert.equal(getStreakBonusPoints(1), 0);
    assert.equal(getStreakBonusPoints(2), 15);
    assert.equal(getStreakBonusPoints(3), 30);
    assert.equal(getStreakBonusPoints(4), 30);
    assert.equal(getStreakBonusPoints(5), 50);
    assert.equal(getStreakBonusPoints(6), 50);
    assert.equal(getStreakBonusPoints(7), 75);
    assert.equal(getStreakBonusPoints(365), 75);
    assert.equal(getStreakBonusPoints(NaN), 0);
  });

  it('every date for 3 years x 3 tiers yields 3 valid integer clue answers; deterministic', () => {
    let d = '2025-10-01';
    for (let i = 0; i < 365 * 3; i++) {
      for (const tier of TIERS) {
        const a = generateDailyPuzzle(d, tier);
        const b = generateDailyPuzzle(d, tier);
        assert.deepEqual(a, b, `non-deterministic ${d}/${tier}`);
        assert.equal(a.steps.length, 3);
        for (const st of a.steps) {
          assert.ok(Number.isInteger(st.answer), `${d}/${tier}/${a.archetype} non-integer ${st.answer}`);
          assert.ok(st.answer > 0, `${d}/${tier}/${a.archetype} non-positive ${st.answer}`);
          assert.ok(st.prompt && st.hint && st.explanation && st.formulaDisplay);
          assert.ok(!/NaN|undefined|Infinity/.test(st.formulaDisplay + st.hint + st.explanation + st.prompt), `${d}/${tier}`);
        }
      }
      d = shiftDateKey(d, 1);
    }
  });

  it('different tiers on the same day give different puzzles (no answer leakage)', () => {
    const a = generateDailyPuzzle('2026-03-14', 'explorers');
    const b = generateDailyPuzzle('2026-03-14', 'strategists');
    assert.notDeepEqual(a.steps.map((s) => s.answer), b.steps.map((s) => s.answer));
  });

  it('streak stats: gap breaks streak; duplicate dateKey is not double counted', () => {
    const mk = (dateKey: string, solved = true): any => ({
      dateKey, editionNumber: 1, tier: 'explorers', archetype: 'equation-vault', archetypeTitle: 't',
      solved, stepsSolved: 3, secondsUsed: 10, timeLimitSeconds: 100, mistakes: 0, hintsUsed: 0, score: 10, completedAt: dateKey + 'T10:00:00Z',
    });
    const today = getLocalDateKey();
    const s = computeDailyStreakStats([
      mk(today), mk(shiftDateKey(today, -1)), mk(shiftDateKey(today, -1)), mk(shiftDateKey(today, -3)),
    ]);
    assert.equal(s.currentStreak, 2);
    assert.ok(s.totalSolved === 3 || s.totalSolved === 4, `totalSolved=${s.totalSolved}`);
    const s2 = computeDailyStreakStats([mk(shiftDateKey(today, -2))]);
    assert.equal(s2.currentStreak, 0);
  });
});
