import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIsoWeekKey,
  formatIsoWeekRange,
  buildSanitizedScorePayload,
  computeTopTenLeaderboard,
  type CloudGameScoreRecord,
} from '../../lib/game-scores';
import {
  resolveGameIdFromMatch,
  computeEffectiveGuestTrials,
  isGuestGameLocked,
  incrementGuestTrialUsage,
  loadGuestTrialUsage,
  saveGuestTrialUsage,
  clearGuestTrialUsage,
  PLAYABLE_GAME_IDS,
} from '../../lib/guest-trial';
import {
  clampDailyProblemGoal,
  getTodayProblemBreakdown,
  computeDailyGoalProgress,
} from '../../lib/daily-goal';
import {
  shouldTriggerMasteryUnlockPulse,
  getRecentEarnedAchievements,
  getMasterySealProgressPercent,
  ACHIEVEMENT_CATALOG,
  type AchievementEvaluation,
  type AchievementStatus,
} from '../../lib/achievements';
import {
  computeDashboardOverview,
  buildDailyChallenge30DayFrequency,
  buildDailyGoalCompletionRate30Day,
  buildArithmeticAccuracySeries,
  buildDailyStreakDurationSeries,
  detectStreakGrowthEvent,
  getStreakMasteryMilestone,
} from '../../lib/performance-dashboard';
import { formatFirebaseAuthError, isEmailPasswordProviderDisabledError } from '../../lib/firebase';
import type { MatchRecord, DailyChallengeCompletion } from '../../lib/types';

// ---------- helpers ----------
function rec(p: Partial<CloudGameScoreRecord> & { uid: string }): CloudGameScoreRecord {
  return {
    id: p.id ?? `${p.uid}-${Math.random()}`,
    displayName: p.uid,
    gameId: 'addition-attack',
    gameTitle: 'Addition Attack',
    tier: 'challengers',
    score: 100,
    accuracyPercent: 90,
    dateKey: '2026-11-20',
    weekKey: '2026-W47',
    visibility: 'public',
    createdAtMs: 1000,
    ...p,
  } as CloudGameScoreRecord;
}
const lb = (records: CloudGameScoreRecord[], over: Record<string, unknown> = {}) =>
  computeTopTenLeaderboard({
    records,
    period: 'day',
    gameFilter: 'all',
    todayKey: '2026-11-20',
    ...over,
  } as never);

function match(p: Partial<MatchRecord>): MatchRecord {
  return {
    id: 'm1',
    gameTitle: 'Factor Grid',
    mode: 'ai',
    tier: 'challengers',
    variant: 'classic',
    playerScore: 0,
    opponentScore: 0,
    opponentName: 'x',
    result: 'win',
    primesClaimed: 0,
    playedAt: new Date(2026, 10, 20, 12).toISOString(),
    ...p,
  } as MatchRecord;
}
function daily(p: Partial<DailyChallengeCompletion>): DailyChallengeCompletion {
  return {
    dateKey: '2026-11-20',
    editionNumber: 1,
    tier: 'challengers',
    archetype: 'a',
    archetypeTitle: 'A',
    solved: true,
    stepsSolved: 3,
    secondsUsed: 10,
    timeLimitSeconds: 60,
    mistakes: 0,
    hintsUsed: 0,
    score: 100,
    completedAt: '2026-11-20T10:00:00.000Z',
    ...p,
  } as unknown as DailyChallengeCompletion;
}
function status(id: string, earned: boolean, unlockedAt: string | null): AchievementStatus {
  const def = ACHIEVEMENT_CATALOG.find((d) => d.id === id)!;
  return { definition: def, earned, unlockedAt, current: 0, target: 1, percent: 0, progressLabel: '' };
}
function evalOf(statuses: AchievementStatus[]): AchievementEvaluation {
  return { statuses } as AchievementEvaluation;
}

// ---------- game-scores ----------
describe('getIsoWeekKey / formatIsoWeekRange', () => {
  const cases: [string, string][] = [
    ['2020-12-31', '2020-W53'],
    ['2021-01-01', '2020-W53'],
    ['2021-01-03', '2020-W53'],
    ['2021-01-04', '2021-W01'],
    ['2024-12-29', '2024-W52'],
    ['2024-12-30', '2025-W01'],
    ['2025-12-29', '2026-W01'],
    ['2026-01-01', '2026-W01'],
    ['2027-01-01', '2026-W53'],
    ['2024-02-29', '2024-W09'],
    ['2026-11-20', '2026-W47'],
    ['2026-11-22', '2026-W47'],
    ['2026-11-23', '2026-W48'],
  ];
  for (const [d, k] of cases) it(`week of ${d} = ${k}`, () => assert.equal(getIsoWeekKey(d), k));

  it('is deterministic and pure', () => {
    assert.equal(getIsoWeekKey('2026-06-15'), getIsoWeekKey('2026-06-15'));
  });
  it('accepts non-padded parts', () => assert.equal(getIsoWeekKey('2026-1-5'), '2026-W02'));
  it('REVIEW FINDING: bad input silently returns hard-coded 2026-W01 (not derived from date)', () => {
    for (const bad of ['', 'garbage', '2026-11', '2026-11-20-1', 'a-b-c']) {
      assert.notEqual(getIsoWeekKey(bad), '2026-W01', `input ${JSON.stringify(bad)} should not map to a fixed week`);
    }
  });
  it('REVIEW FINDING: out-of-range date parts are silently normalised into a real week', () => {
    // 2026-13-45 is not a valid date; a validator should reject, not roll into 2027.
    assert.equal(getIsoWeekKey('2026-13-45'), '2026-W01');
  });
  it('REVIEW FINDING: years 0-99 are mapped to 19xx by Date.UTC', () => {
    assert.ok(getIsoWeekKey('0050-06-01').startsWith('0050-'), getIsoWeekKey('0050-06-01'));
  });
  it('formatIsoWeekRange Monday..Sunday and year boundary', () => {
    assert.equal(formatIsoWeekRange('2026-11-20'), 'Nov 16 – Nov 22');
    assert.equal(formatIsoWeekRange('2026-11-22'), 'Nov 16 – Nov 22');
    assert.equal(formatIsoWeekRange('2026-11-16'), 'Nov 16 – Nov 22');
    assert.equal(formatIsoWeekRange('2024-12-31'), 'Dec 30 – Jan 5');
  });
  it('formatIsoWeekRange bad input returns input', () => {
    assert.equal(formatIsoWeekRange('nope'), 'nope');
  });
  it('week key is timezone independent (pure UTC math)', () => {
    const before = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Kiritimati';
      const a = getIsoWeekKey('2026-12-31');
      process.env.TZ = 'Pacific/Pago_Pago';
      const b = getIsoWeekKey('2026-12-31');
      assert.equal(a, b);
      assert.equal(a, '2026-W53');
    } finally {
      if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
    }
  });
});

describe('buildSanitizedScorePayload', () => {
  const base = { uid: 'u', displayName: 'Ann', gameId: 'factor-grid' as const, tier: 'explorers' as const, score: 10, accuracyPercent: 50, dateKey: '2026-11-20' };
  it('clamps and rounds', () => {
    const p = buildSanitizedScorePayload({ ...base, score: 1e12, accuracyPercent: 1000 });
    assert.equal(p.score, 100000);
    assert.equal(p.accuracyPercent, 100);
    const n = buildSanitizedScorePayload({ ...base, score: -5, accuracyPercent: -1 });
    assert.equal(n.score, 0);
    assert.equal(n.accuracyPercent, 0);
    assert.equal(buildSanitizedScorePayload({ ...base, score: 0.5 }).score, 1);
    assert.equal(buildSanitizedScorePayload({ ...base, score: Infinity }).score, 100000);
    assert.equal(buildSanitizedScorePayload({ ...base, score: -Infinity }).score, 0);
    assert.ok(Object.is(buildSanitizedScorePayload({ ...base, score: -0.4 }).score, 0));
  });
  it('name trimming/fallback/truncation', () => {
    assert.equal(buildSanitizedScorePayload({ ...base, displayName: '   ' }).displayName, 'Scholar');
    assert.equal(buildSanitizedScorePayload({ ...base, displayName: 'x'.repeat(100) }).displayName.length, 28);
    assert.equal(buildSanitizedScorePayload({ ...base, displayName: '  Bo  ' }).displayName, 'Bo');
  });
  it('REVIEW FINDING: NaN score/accuracy pass through unsanitised', () => {
    const p = buildSanitizedScorePayload({ ...base, score: NaN, accuracyPercent: NaN });
    assert.ok(Number.isFinite(p.score), `score=${p.score}`);
    assert.ok(Number.isFinite(p.accuracyPercent), `acc=${p.accuracyPercent}`);
  });
  it('REVIEW FINDING: slice(0,28) can split a surrogate pair leaving a lone surrogate', () => {
    const name = 'a'.repeat(27) + '😀';
    const out = buildSanitizedScorePayload({ ...base, displayName: name }).displayName;
    assert.doesNotMatch(out, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/, 'lone high surrogate');
  });
  it('REVIEW FINDING: empty-string dateKey is kept (?? only guards null) and weekKey mismatches', () => {
    const p = buildSanitizedScorePayload({ ...base, dateKey: '' });
    assert.notEqual(p.dateKey, '');
  });
  it('derives weekKey from dateKey and gameTitle from catalog', () => {
    const p = buildSanitizedScorePayload(base);
    assert.equal(p.weekKey, '2026-W47');
    assert.equal(p.gameTitle, 'Factor Grid');
    assert.equal(p.visibility, 'public');
  });
  it('unknown gameId throws (no input guard)', () => {
    assert.throws(() => buildSanitizedScorePayload({ ...base, gameId: 'nope' as never }));
  });
  it('non-string displayName throws', () => {
    assert.throws(() => buildSanitizedScorePayload({ ...base, displayName: null as never }));
  });
});

describe('computeTopTenLeaderboard', () => {
  it('empty', () => {
    const r = lb([]);
    assert.deepEqual(r.topTen, []);
    assert.equal(r.currentUserRow, null);
    assert.equal(r.totalPlayersInPeriod, 0);
    assert.equal(r.periodKey, '2026-11-20');
  });
  it('periodKey for week', () => {
    assert.equal(lb([], { period: 'week' }).periodKey, '2026-W47');
  });
  it('dedupes per uid keeping best score and counts rounds', () => {
    const r = lb([rec({ uid: 'a', score: 10 }), rec({ uid: 'a', score: 50 }), rec({ uid: 'a', score: 30 }), rec({ uid: 'b', score: 40 })]);
    assert.equal(r.topTen.length, 2);
    assert.equal(r.topTen[0].uid, 'a');
    assert.equal(r.topTen[0].score, 50);
    assert.equal(r.topTen[0].gamesPlayedInPeriod, 3);
  });
  it('tie-break: score, then accuracy, then earliest createdAtMs', () => {
    const r = lb([
      rec({ uid: 'late', score: 10, accuracyPercent: 80, createdAtMs: 5 }),
      rec({ uid: 'early', score: 10, accuracyPercent: 80, createdAtMs: 1 }),
      rec({ uid: 'acc', score: 10, accuracyPercent: 95, createdAtMs: 9 }),
      rec({ uid: 'top', score: 11, accuracyPercent: 1, createdAtMs: 9 }),
    ]);
    assert.deepEqual(r.topTen.map((x) => x.uid), ['top', 'acc', 'early', 'late']);
    assert.deepEqual(r.topTen.map((x) => x.rank), [1, 2, 3, 4]);
  });
  it('same-uid best selection tie-breaks by accuracy then earliest', () => {
    const r = lb([
      rec({ id: 'x1', uid: 'a', score: 10, accuracyPercent: 70, createdAtMs: 1 }),
      rec({ id: 'x2', uid: 'a', score: 10, accuracyPercent: 90, createdAtMs: 9 }),
      rec({ id: 'x3', uid: 'a', score: 10, accuracyPercent: 90, createdAtMs: 2 }),
    ]);
    assert.equal(r.topTen[0].accuracyPercent, 90);
    assert.equal(r.topTen[0].gamesPlayedInPeriod, 3);
  });
  it('identical records keep stable (insertion) order', () => {
    const r = lb([rec({ uid: 'p' }), rec({ uid: 'q' }), rec({ uid: 'r' })]);
    assert.deepEqual(r.topTen.map((x) => x.uid), ['p', 'q', 'r']);
  });
  it('caps at 10, reports total and current user beyond top 10', () => {
    const rs = Array.from({ length: 15 }, (_, i) => rec({ uid: `u${i}`, score: 100 - i }));
    const r = lb(rs, { currentUserUid: 'u12' });
    assert.equal(r.topTen.length, 10);
    assert.equal(r.totalPlayersInPeriod, 15);
    assert.equal(r.currentUserRow?.rank, 13);
    assert.equal(r.topTen.some((x) => x.isCurrentUser), false);
  });
  it('currentUserUid null/empty marks nobody', () => {
    const rs = [rec({ uid: '' }), rec({ uid: 'a' })];
    assert.equal(lb(rs, { currentUserUid: '' }).currentUserRow, null);
    assert.equal(lb(rs, { currentUserUid: null }).currentUserRow, null);
  });
  it('day filter ignores other days and week filter uses weekKey', () => {
    const rs = [rec({ uid: 'a', dateKey: '2026-11-19' }), rec({ uid: 'b' })];
    assert.equal(lb(rs).totalPlayersInPeriod, 1);
    assert.equal(lb(rs, { period: 'week' }).totalPlayersInPeriod, 2);
    assert.equal(lb([rec({ uid: 'c', weekKey: '2026-W46' })], { period: 'week' }).totalPlayersInPeriod, 0);
  });
  it('game filter restricts', () => {
    const rs = [rec({ uid: 'a', gameId: 'factor-grid' }), rec({ uid: 'b' })];
    assert.equal(lb(rs, { gameFilter: 'factor-grid' }).topTen[0].uid, 'a');
    assert.equal(lb(rs, { gameFilter: 'odds-urns' }).topTen.length, 0);
  });
  it('REVIEW FINDING: "all" filter ranks raw scores across different games (and mixes them into one dedupe)', () => {
    const r = lb([
      rec({ uid: 'a', gameId: 'daily-challenge', score: 900 }),
      rec({ uid: 'a', gameId: 'addition-attack', score: 20 }),
    ]);
    // Rounds from different games are conflated into gamesPlayedInPeriod and the row's gameId is arbitrary.
    assert.equal(r.topTen.length, 1);
    assert.equal(r.topTen[0].gamesPlayedInPeriod, 1, 'games from different titles counted as one game played');
  });
  it('REVIEW FINDING: NaN score corrupts ordering (NaN comparator)', () => {
    const r = lb([rec({ uid: 'n', score: NaN }), rec({ uid: 'a', score: 10 }), rec({ uid: 'b', score: 20 })]);
    assert.deepEqual(r.topTen.map((x) => x.uid).filter((u) => u !== 'n'), ['b', 'a']);
    assert.equal(r.topTen[0].uid, 'b', 'valid top score must rank first');
  });
  it('REVIEW FINDING: records whose stored weekKey disagrees with dateKey are trusted (week filter keyed off weekKey only)', () => {
    const r = lb([rec({ uid: 'x', dateKey: '2026-11-20', weekKey: '2026-W01' })], { period: 'week' });
    assert.equal(r.totalPlayersInPeriod, 1, 'record dated 2026-11-20 belongs to W47');
  });
  it('does not mutate input', () => {
    const rs = [rec({ uid: 'a', score: 1 }), rec({ uid: 'b', score: 2 })];
    const copy = JSON.stringify(rs);
    lb(rs);
    assert.equal(JSON.stringify(rs), copy);
  });
});

// ---------- guest-trial ----------
describe('resolveGameIdFromMatch', () => {
  it('dailyMeta and arithmeticMeta take precedence', () => {
    assert.equal(resolveGameIdFromMatch(match({ gameTitle: 'Odds', dailyMeta: {} as never })), 'daily-challenge');
    assert.equal(resolveGameIdFromMatch(match({ gameTitle: 'Odds', arithmeticMeta: { gameId: 'subtraction-sprint' } as never })), 'subtraction-sprint');
  });
  const t: [string, string][] = [
    ['Equation Foundry', 'equation-foundry'],
    ['EQUATION FOUNDRY', 'equation-foundry'],
    ['Odds & Urns', 'odds-urns'],
    ['Addition Attack', 'addition-attack'],
    ['Subtraction Sprint', 'subtraction-sprint'],
    ['Multiplication Mastery', 'multiplication-mastery'],
    ['Daily Math Challenge', 'daily-challenge'],
    ['Factor Grid', 'factor-grid'],
  ];
  for (const [title, id] of t) it(`title ${title}`, () => assert.equal(resolveGameIdFromMatch(match({ gameTitle: title })), id));
  it('REVIEW FINDING: unknown/empty/unicode titles silently become factor-grid', () => {
    for (const title of ['', '数学', 'Mystery Game']) {
      assert.notEqual(resolveGameIdFromMatch(match({ gameTitle: title })), 'factor-grid', title);
    }
  });
  it('REVIEW FINDING: substring heuristics misclassify ("Goddess"/"Daily Odds"/"Odds Addition")', () => {
    assert.notEqual(resolveGameIdFromMatch(match({ gameTitle: 'Addition Odds Drill' })), 'odds-urns');
    assert.notEqual(resolveGameIdFromMatch(match({ gameTitle: 'Dodds Factor Grid' })), 'odds-urns');
    assert.notEqual(resolveGameIdFromMatch(match({ gameTitle: 'Factor Grid Daily Edition' })), 'daily-challenge');
  });
  it('REVIEW FINDING: missing gameTitle throws', () => {
    assert.doesNotThrow(() => resolveGameIdFromMatch(match({ gameTitle: undefined as never })));
  });
});

describe('computeEffectiveGuestTrials / lock', () => {
  it('empty -> all zeros for every game', () => {
    const c = computeEffectiveGuestTrials({}, [], []);
    for (const id of PLAYABLE_GAME_IDS) assert.equal(c[id], 0);
  });
  it('max of stored and match counts; sample- ids ignored', () => {
    const c = computeEffectiveGuestTrials(
      { 'addition-attack': 3 },
      [match({ id: 'a', gameTitle: 'Addition Attack' }), match({ id: 'sample-1', gameTitle: 'Addition Attack' }), match({ id: 'b', gameTitle: 'Factor Grid' })],
      []
    );
    assert.equal(c['addition-attack'], 3);
    assert.equal(c['factor-grid'], 1);
  });
  it('match counts exceed stored', () => {
    const ms = [1, 2, 3].map((i) => match({ id: `r${i}`, gameTitle: 'Odds & Urns' }));
    assert.equal(computeEffectiveGuestTrials({ 'odds-urns': 1 }, ms, [])['odds-urns'], 3);
  });
  it('daily: .111Z samples skipped, real counted, max with matches', () => {
    const dc = [daily({ completedAt: 'x.111Z' }), daily({ dateKey: '2026-11-19', completedAt: '2026-11-19T01:00:00.500Z' })];
    assert.equal(computeEffectiveGuestTrials({}, [], dc)['daily-challenge'], 1);
    const withMatch = computeEffectiveGuestTrials({}, [match({ id: 'd1', dailyMeta: {} as never }), match({ id: 'd2', dailyMeta: {} as never })], dc);
    assert.equal(withMatch['daily-challenge'], 2);
  });
  it('REVIEW FINDING: real completion with ms=.111 is misclassified as sample (1/1000 false positive)', () => {
    const c = computeEffectiveGuestTrials({}, [], [daily({ completedAt: '2026-11-20T10:00:00.111Z' })]);
    assert.equal(c['daily-challenge'], 1);
  });
  it('REVIEW FINDING: completion lacking completedAt (loadDailyCompletions does not validate it) throws', () => {
    assert.doesNotThrow(() => computeEffectiveGuestTrials({}, [], [{ ...daily({}), completedAt: undefined } as never]));
  });
  it('isGuestGameLocked truth table', () => {
    const z = computeEffectiveGuestTrials({}, [], []);
    assert.equal(isGuestGameLocked({ isSignedIn: false, gameId: 'factor-grid', trialUsage: z }), false);
    assert.equal(isGuestGameLocked({ isSignedIn: false, gameId: 'factor-grid', trialUsage: { ...z, 'factor-grid': 1 } }), true);
    assert.equal(isGuestGameLocked({ isSignedIn: true, gameId: 'factor-grid', trialUsage: { ...z, 'factor-grid': 99 } }), false);
    assert.equal(isGuestGameLocked({ isSignedIn: false, gameId: 'factor-grid', trialUsage: {} as never }), false);
  });
  it('increment is immutable', () => {
    const a = {};
    const b = incrementGuestTrialUsage(a, 'odds-urns');
    assert.deepEqual(a, {});
    assert.equal(b['odds-urns'], 1);
    assert.equal(incrementGuestTrialUsage(b, 'odds-urns')['odds-urns'], 2);
  });
});

describe('guest trial localStorage', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
  });
  it('roundtrip, clear', () => {
    saveGuestTrialUsage({ 'factor-grid': 2 });
    assert.deepEqual(loadGuestTrialUsage(), { 'factor-grid': 2 });
    clearGuestTrialUsage();
    assert.deepEqual(loadGuestTrialUsage(), {});
  });
  it('sanitises corrupt values', () => {
    store.set('numbercraft_guest_trials_v1', JSON.stringify({ 'factor-grid': 2.9, 'odds-urns': -1, 'addition-attack': 'x', bogus: 5, 'daily-challenge': null }));
    assert.deepEqual(loadGuestTrialUsage(), { 'factor-grid': 2 });
  });
  it('bad JSON / null JSON', () => {
    store.set('numbercraft_guest_trials_v1', '{bad');
    assert.deepEqual(loadGuestTrialUsage(), {});
    store.set('numbercraft_guest_trials_v1', 'null');
    assert.deepEqual(loadGuestTrialUsage(), {});
  });
  it('save swallows quota errors', () => {
    (globalThis as any).window.localStorage.setItem = () => { throw new Error('quota'); };
    assert.doesNotThrow(() => saveGuestTrialUsage({}));
  });
});

// ---------- daily-goal ----------
describe('daily-goal', () => {
  it('clampDailyProblemGoal', () => {
    assert.equal(clampDailyProblemGoal(undefined), 10);
    assert.equal(clampDailyProblemGoal('25'), 10);
    assert.equal(clampDailyProblemGoal(NaN), 10);
    assert.equal(clampDailyProblemGoal(null), 10);
    assert.equal(clampDailyProblemGoal(-100), 5);
    assert.equal(clampDailyProblemGoal(0), 5);
    assert.equal(clampDailyProblemGoal(4.5), 5);
    assert.equal(clampDailyProblemGoal(7.5), 8);
    assert.equal(clampDailyProblemGoal(100.4), 100);
    assert.equal(clampDailyProblemGoal(1e9), 100);
  });
  it('REVIEW FINDING: +Infinity resets to default 10 instead of clamping to max 100', () => {
    assert.equal(clampDailyProblemGoal(Infinity), 100);
    assert.equal(clampDailyProblemGoal(-Infinity), 5);
  });
  const dk = '2026-11-20';
  it('breakdown arithmetic, arena, multiplier and daily', () => {
    const ms = [
      match({ id: 'a', arithmeticMeta: { solved: 7 } as never }),
      match({ id: 'b', gameTitle: 'Equation Foundry' }),
      match({ id: 'c', gameTitle: 'Odds & Urns', dailyMilestoneMultiplier: 1.5 }),
      match({ id: 'd', gameTitle: 'Factor Grid' }),
      match({ id: 'e', dailyMeta: {} as never }),
      match({ id: 'sample-1', arithmeticMeta: { solved: 50 } as never }),
      match({ id: 'f', playedAt: new Date(2026, 10, 19, 23, 59).toISOString(), arithmeticMeta: { solved: 9 } as never }),
    ];
    const b = getTodayProblemBreakdown(ms, [daily({}), daily({ dateKey: dk, solved: false }), daily({ dateKey: '2026-11-19' })], dk);
    assert.equal(b.arithmeticProblems, 7);
    assert.equal(b.arenaProblems, 5 + 8 + 3); // 7.5 rounds to 8
    assert.equal(b.dailyChallengeProblems, 3);
    assert.equal(b.totalProblems, 7 + 16 + 3);
    assert.equal(getTodayProblemBreakdown(ms, [], dk, true).arithmeticProblems, 57);
  });
  it('late-night local play stays on its local day (DST/tz-safe via local constructor)', () => {
    const m = match({ id: 'z', playedAt: new Date(2026, 10, 20, 23, 59, 59).toISOString(), arithmeticMeta: { solved: 4 } as never });
    assert.equal(getTodayProblemBreakdown([m], [], '2026-11-20').arithmeticProblems, 4);
    assert.equal(getTodayProblemBreakdown([m], [], '2026-11-21').arithmeticProblems, 0);
  });
  it('invalid playedAt ignored, negative solved clamped, multiplier <=1 ignored', () => {
    const b = getTodayProblemBreakdown([
      match({ id: 'i', playedAt: 'not-a-date', arithmeticMeta: { solved: 5 } as never }),
      match({ id: 'n', arithmeticMeta: { solved: -9 } as never }),
      match({ id: 'm', arithmeticMeta: { solved: 2 } as never, dailyMilestoneMultiplier: 0.5 }),
    ], [], dk);
    assert.equal(b.arithmeticProblems, 2);
  });
  it('REVIEW FINDING: NaN solved poisons the whole total with NaN', () => {
    const b = getTodayProblemBreakdown([match({ id: 'nn', arithmeticMeta: { solved: NaN } as never })], [], dk);
    assert.ok(Number.isFinite(b.totalProblems), `total=${b.totalProblems}`);
  });
  it('progress: ring, remaining, singular headline, goal met', () => {
    const p1 = computeDailyGoalProgress({ matches: [match({ id: 'a', arithmeticMeta: { solved: 9 } as never })], dailyCompletions: [], todayKey: dk });
    assert.equal(p1.problemsRemaining, 1);
    assert.equal(p1.ringPercent, 90);
    assert.match(p1.headlineNote, /1 more problem today/);
    const p2 = computeDailyGoalProgress({ matches: [match({ id: 'a', arithmeticMeta: { solved: 500 } as never })], dailyCompletions: [], todayKey: dk });
    assert.equal(p2.ringPercent, 100);
    assert.equal(p2.goalMetToday, true);
    assert.match(p2.headlineNote, /Daily problem goal met/);
  });
  it('REVIEW FINDING: duplicate same-day daily completions are each credited 3 problems', () => {
    const p3 = computeDailyGoalProgress({ matches: [], dailyCompletions: [daily({}), daily({}), daily({}), daily({})], todayKey: dk, dailyProblemGoal: 5 });
    assert.equal(p3.problemsSolvedToday, 3);
  });
  it('progress: goal 0/NaN is clamped (no division by zero)', () => {
    const p = computeDailyGoalProgress({ matches: [], dailyCompletions: [], todayKey: dk, dailyProblemGoal: 0 });
    assert.equal(p.dailyProblemGoal, 5);
    assert.equal(p.ringPercent, 0);
    assert.equal(computeDailyGoalProgress({ matches: [], dailyCompletions: [], todayKey: dk, dailyProblemGoal: NaN }).dailyProblemGoal, 10);
  });
  it('streak milestone targets', () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => daily({ dateKey: `2026-11-${String(20 - i).padStart(2, '0')}` }));
    assert.equal(computeDailyGoalProgress({ matches: [], dailyCompletions: mk(2), todayKey: dk }).nextStreakTargetDays, 3);
    assert.equal(computeDailyGoalProgress({ matches: [], dailyCompletions: mk(3), todayKey: dk }).nextStreakTargetDays, 7);
    assert.equal(computeDailyGoalProgress({ matches: [], dailyCompletions: mk(7), todayKey: dk }).nextStreakTargetDays, 14);
    const p14 = computeDailyGoalProgress({ matches: [], dailyCompletions: mk(14), todayKey: dk });
    assert.equal(p14.nextStreakTargetDays, 14);
    assert.equal(p14.streakDaysRemaining, 0);
  });
});

// ---------- achievements ----------
describe('shouldTriggerMasteryUnlockPulse truth table', () => {
  const oracle = (i: any) => {
    if (!i.isHydrated || !i.hasBaseline) return false;
    return i.nextEventKey > i.prevEventKey || i.nextEarnedCount > i.prevEarnedCount;
  };
  it('exhaustive small domain', () => {
    for (const isHydrated of [true, false])
      for (const hasBaseline of [true, false])
        for (const prevEarnedCount of [0, 2])
          for (const nextEarnedCount of [0, 1, 2, 3])
            for (const prevEventKey of [0, 1])
              for (const nextEventKey of [0, 1, 2]) {
                const i = { isHydrated, hasBaseline, prevEarnedCount, nextEarnedCount, prevEventKey, nextEventKey };
                assert.equal(shouldTriggerMasteryUnlockPulse(i), oracle(i), JSON.stringify(i));
              }
  });
  it('named cases', () => {
    const base = { isHydrated: true, hasBaseline: true, prevEarnedCount: 2, nextEarnedCount: 2, prevEventKey: 0, nextEventKey: 0 };
    assert.equal(shouldTriggerMasteryUnlockPulse(base), false);
    assert.equal(shouldTriggerMasteryUnlockPulse({ ...base, nextEarnedCount: 3 }), true);
    assert.equal(shouldTriggerMasteryUnlockPulse({ ...base, nextEarnedCount: 1 }), false);
    assert.equal(shouldTriggerMasteryUnlockPulse({ ...base, nextEventKey: 1 }), true);
    assert.equal(shouldTriggerMasteryUnlockPulse({ ...base, isHydrated: false, nextEarnedCount: 9 }), false);
    assert.equal(shouldTriggerMasteryUnlockPulse({ ...base, hasBaseline: false, nextEventKey: 9 }), false);
  });
  it('count decrease with event-key increase still pulses (documented precedence)', () => {
    assert.equal(shouldTriggerMasteryUnlockPulse({ isHydrated: true, hasBaseline: true, prevEarnedCount: 5, nextEarnedCount: 4, prevEventKey: 0, nextEventKey: 1 }), true);
  });
  it('NaN inputs do not pulse', () => {
    assert.equal(shouldTriggerMasteryUnlockPulse({ isHydrated: true, hasBaseline: true, prevEarnedCount: NaN, nextEarnedCount: NaN, prevEventKey: NaN, nextEventKey: NaN }), false);
  });
});

describe('getMasterySealProgressPercent', () => {
  it('basic', () => {
    assert.equal(getMasterySealProgressPercent(0, 12), 0);
    assert.equal(getMasterySealProgressPercent(6, 12), 50);
    assert.equal(getMasterySealProgressPercent(1, 3), 33);
    assert.equal(getMasterySealProgressPercent(99, 12), 100);
    assert.equal(getMasterySealProgressPercent(-3, 12), 0);
    assert.equal(getMasterySealProgressPercent(3, 0), 0);
    assert.equal(getMasterySealProgressPercent(3, -1), 0);
  });
  it('REVIEW FINDING: NaN totalCount yields NaN; Infinity earned yields 0 instead of 100', () => {
    assert.ok(Number.isFinite(getMasterySealProgressPercent(3, NaN)));
    assert.equal(getMasterySealProgressPercent(Infinity, 12), 100);
  });
});

describe('getRecentEarnedAchievements', () => {
  const ids = ACHIEVEMENT_CATALOG.map((d) => d.id);
  it('newest first, only earned, default limit 5', () => {
    const st = ids.map((id, i) => status(id, true, new Date(Date.UTC(2026, 0, 1 + i, 12)).toISOString()));
    st[1] = status(ids[1], false, null);
    const r = getRecentEarnedAchievements(evalOf(st));
    assert.equal(r.length, 5);
    assert.ok(!r.some((x) => x.id === ids[1]));
    for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].unlockedTimestamp >= r[i].unlockedTimestamp);
    assert.equal(r[0].id, ids[ids.length - 1]);
  });
  it('ties broken by catalog order (stable)', () => {
    const t = '2026-05-05T12:00:00.000Z';
    const r = getRecentEarnedAchievements(evalOf([status(ids[2], true, t), status(ids[0], true, t), status(ids[1], true, t)]));
    assert.deepEqual(r.map((x) => x.id), [ids[2], ids[0], ids[1]]);
  });
  it('limit edge cases', () => {
    const st = ids.slice(0, 4).map((id, i) => status(id, true, `2026-01-0${i + 1}T12:00:00Z`));
    assert.equal(getRecentEarnedAchievements(evalOf(st), 0).length, 0);
    assert.equal(getRecentEarnedAchievements(evalOf(st), -3).length, 0);
    assert.equal(getRecentEarnedAchievements(evalOf(st), 2.9).length, 2);
    assert.equal(getRecentEarnedAchievements(evalOf(st), 1000).length, 4);
    assert.equal(getRecentEarnedAchievements(evalOf(st), Infinity).length, 4);
    assert.equal(getRecentEarnedAchievements(evalOf([]), 5).length, 0);
  });
  it('REVIEW FINDING: NaN limit returns empty list instead of default', () => {
    const st = [status(ids[0], true, '2026-01-01T12:00:00Z')];
    assert.equal(getRecentEarnedAchievements(evalOf(st), NaN).length, 1);
  });
  it('labels: null/invalid/valid', () => {
    const r = getRecentEarnedAchievements(evalOf([
      status(ids[0], true, null),
      status(ids[1], true, 'garbage'),
      status(ids[2], true, '2026-03-09T12:00:00.000Z'),
    ]));
    const by = Object.fromEntries(r.map((x) => [x.id, x]));
    assert.equal(by[ids[0]].dateLabel, 'Recently earned');
    assert.equal(by[ids[0]].fullDateLabel, 'Date unavailable');
    assert.equal(by[ids[1]].dateLabel, 'Recently earned');
    assert.equal(by[ids[1]].unlockedTimestamp, 0);
    assert.equal(by[ids[2]].dateLabel, 'Mar 9');
    assert.equal(by[ids[2]].fullDateLabel, 'Mar 9, 2026');
    assert.equal(r[0].id, ids[2], 'dated item ranks above undated');
  });
  it('REVIEW FINDING: pre-1970 date sorts below unparseable dates (invalid collapses to 0 > negative)', () => {
    const r = getRecentEarnedAchievements(evalOf([status(ids[0], true, '1969-06-01T12:00:00Z'), status(ids[1], true, 'garbage')]));
    assert.equal(r[0].id, ids[0]);
  });
  it('REVIEW FINDING: date-only unlockedAt label shifts a day in negative-UTC timezones', () => {
    const before = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      const r = getRecentEarnedAchievements(evalOf([status(ids[0], true, '2026-03-09')]));
      assert.equal(r[0].dateLabel, 'Mar 9');
    } finally {
      if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
    }
  });
  it('does not mutate evaluation.statuses order', () => {
    const st = [status(ids[0], true, '2026-01-01T12:00:00Z'), status(ids[1], true, '2026-02-01T12:00:00Z')];
    getRecentEarnedAchievements(evalOf(st));
    assert.equal(st[0].definition.id, ids[0]);
  });
});

// ---------- performance-dashboard ----------
describe('performance-dashboard aggregates', () => {
  const tk = '2026-11-20';
  const ar = (id: string, over: any, at = '2026-11-20T10:00:00.000Z', tier: any = 'challengers') =>
    match({ id, tier, playedAt: at, arithmeticMeta: { gameId: 'addition-attack', pace: 'steady', solved: 5, attempted: 10, accuracyPercent: 50, bestStreak: 2, durationSeconds: 60, ...over } });

  it('overview on empty data: nulls and zeros, no NaN', () => {
    const o = computeDashboardOverview([], [], tk);
    assert.equal(o.avgArithmeticAccuracy, null);
    assert.equal(o.accuracyDelta, null);
    assert.equal(o.avgPacePerMinute, null);
    assert.equal(o.totalProblemsSolved, 0);
    assert.equal(o.totalChallengesCompleted, 0);
    assert.equal(o.dailyAttemptedCount, 0);
  });
  it('overview: delta needs >=2, split math, filters attempted<=0', () => {
    assert.equal(computeDashboardOverview([ar('a', {})], [], tk).accuracyDelta, null);
    const ms = [ar('a', { accuracyPercent: 40 }, '2026-11-01T10:00:00Z'), ar('b', { accuracyPercent: 60 }, '2026-11-02T10:00:00Z'), ar('c', { accuracyPercent: 100 }, '2026-11-03T10:00:00Z'), ar('z', { attempted: 0 })];
    const o = computeDashboardOverview(ms, [], tk);
    assert.equal(o.arithmeticSessionCount, 3);
    assert.equal(o.avgArithmeticAccuracy, 67);
    assert.equal(o.accuracyDelta, Math.round(80 - 40));
    assert.equal(o.totalProblemsSolved, 15);
  });
  it('pace: duration 0 uses solved, no division by zero', () => {
    const s = buildArithmeticAccuracySeries([ar('a', { durationSeconds: 0, solved: 7 })]);
    assert.equal(s[0].pacePerMinute, 7);
    assert.equal(buildArithmeticAccuracySeries([ar('a', { durationSeconds: 30, solved: 5 })])[0].pacePerMinute, 10);
  });
  it('rolling accuracy window of 3, filters by game/tier', () => {
    const ms = [10, 20, 30, 40].map((a, i) => ar(`r${i}`, { accuracyPercent: a }, `2026-11-0${i + 1}T10:00:00Z`));
    const s = buildArithmeticAccuracySeries(ms);
    assert.deepEqual(s.map((p) => p.rollingAccuracy), [10, 15, 20, 30]);
    assert.equal(buildArithmeticAccuracySeries(ms, 'subtraction-sprint').length, 0);
    assert.equal(buildArithmeticAccuracySeries(ms, 'all', 'explorers').length, 0);
  });
  it('REVIEW FINDING: NaN/invalid playedAt makes sort comparator inconsistent (order depends on input order)', () => {
    const good1 = ar('g1', { accuracyPercent: 10 }, '2026-11-01T10:00:00Z');
    const good2 = ar('g2', { accuracyPercent: 20 }, '2026-11-02T10:00:00Z');
    const bad = ar('bad', { accuracyPercent: 99 }, 'garbage');
    const a = buildArithmeticAccuracySeries([good2, bad, good1]).map((p) => p.accuracyPercent);
    const b = buildArithmeticAccuracySeries([good1, bad, good2]).map((p) => p.accuracyPercent);
    assert.deepEqual(a.filter((x) => x !== 99), b.filter((x) => x !== 99), 'valid sessions must stay chronologically ordered');
  });
  it('30-day frequency on empty: 30 missed, no NaN, 5 buckets of 6', () => {
    const d = buildDailyChallenge30DayFrequency([], tk);
    assert.equal(d.points.length, 30);
    assert.equal(d.missedDays, 30);
    assert.equal(d.consistencyPercent, 0);
    assert.equal(d.weeklyBuckets.length, 5);
    assert.ok(d.weeklyBuckets.every((b) => b.totalDays === 6 && b.completionRatePercent === 0));
    assert.equal(d.points[29].isToday, true);
    assert.equal(d.points[29].dateKey, tk);
    assert.equal(d.points[0].dateKey, '2026-10-22');
  });
  it('30-day frequency month/leap/year boundaries', () => {
    assert.equal(buildDailyChallenge30DayFrequency([], '2024-03-01').points[0].dateKey, '2024-02-01');
    assert.equal(buildDailyChallenge30DayFrequency([], '2026-01-05').points[0].dateKey, '2025-12-07');
    const dates = buildDailyChallenge30DayFrequency([], '2024-03-15').points.map((p) => p.dateKey);
    assert.ok(dates.includes('2024-02-29'));
    assert.equal(new Set(dates).size, 30);
  });
  it('30-day frequency status counts and longest run', () => {
    const cs = [daily({ dateKey: '2026-11-20' }), daily({ dateKey: '2026-11-19' }), daily({ dateKey: '2026-11-17', solved: false, stepsSolved: 1 }), daily({ dateKey: '2026-11-16' })];
    const d = buildDailyChallenge30DayFrequency(cs, tk);
    assert.equal(d.solvedDays, 3);
    assert.equal(d.attemptedOnlyDays, 1);
    assert.equal(d.missedDays, 26);
    assert.equal(d.longestRunIn30Days, 2);
    assert.equal(d.consistencyPercent, 10);
    assert.equal(d.activeDaysIn30Days, 4);
    assert.equal(d.solvedDays + d.attemptedOnlyDays + d.missedDays, 30);
  });
  it('REVIEW FINDING: duplicate dateKey completions - last one wins, so a later failed retry hides an earlier solve', () => {
    const d = buildDailyChallenge30DayFrequency([daily({ solved: true }), daily({ solved: false, stepsSolved: 1 })], tk);
    assert.equal(d.points[29].status, 'solved');
  });
  it('goal-rate empty and mixed', () => {
    const e = buildDailyGoalCompletionRate30Day([], tk);
    assert.equal(e.points.length, 30);
    assert.equal(e.overallCompletionRatePercent, 0);
    assert.equal(e.last7DaysRatePercent, 0);
    assert.equal(e.bestBlockRatePercent, 0);
    const m = buildDailyGoalCompletionRate30Day([daily({}), daily({ dateKey: '2026-11-19', solved: false, stepsSolved: 2 }), daily({ dateKey: '2026-11-18', solved: false, stepsSolved: 9 })], tk);
    assert.equal(m.daysMet, 1);
    assert.equal(m.partialDays, 2);
    assert.equal(m.points[28].completionRatePercent, 67);
    assert.equal(m.points[27].completionRatePercent, 99, 'steps clamped to 3 then capped at 99');
    assert.equal(m.points[29].rolling7DayRatePercent, Math.round(100 / 7));
    assert.equal(m.points[0].rolling7DayRatePercent, 0);
    assert.equal(m.daysMet + m.partialDays + m.missedDays, 30);
  });
  it('REVIEW FINDING: partial entry with NaN stepsSolved yields NaN completion rate', () => {
    const m = buildDailyGoalCompletionRate30Day([daily({ solved: false, stepsSolved: NaN })], tk);
    assert.ok(m.points.every((p) => Number.isFinite(p.completionRatePercent)));
    assert.ok(Number.isFinite(m.avgDailyRatePercent));
  });
  it('invalid todayKey does not throw', () => {
    assert.doesNotThrow(() => buildDailyChallenge30DayFrequency([], 'garbage'));
    assert.doesNotThrow(() => buildDailyGoalCompletionRate30Day([], ''));
  });
  it('streak duration series: empty, days clamping', () => {
    const e = buildDailyStreakDurationSeries([], tk, 30);
    assert.equal(e.windowDays, 30);
    assert.equal(buildDailyStreakDurationSeries([], tk, 1).windowDays, 7);
    assert.equal(buildDailyStreakDurationSeries([], tk, 500).windowDays, 90);
    assert.equal(buildDailyStreakDurationSeries([], tk, 12.9).windowDays, 12);
  });
  it('REVIEW FINDING: streak series days=NaN yields NaN window (Math.max/min propagate NaN)', () => {
    assert.ok(Number.isFinite(buildDailyStreakDurationSeries([], tk, NaN).windowDays));
  });
  it('detectStreakGrowthEvent truth table', () => {
    const s = (o: any = {}) => ({ currentStreakDuration: 0, milestoneCount: 0, dailyGoalMetToday: false, dailyMilestoneCompletedToday: false, ...o });
    assert.equal(detectStreakGrowthEvent(null, s()).triggered, false);
    assert.equal(detectStreakGrowthEvent(null, s({ milestoneCount: 1, currentStreakDuration: 3 })).reason, 'mastery-milestone');
    assert.equal(detectStreakGrowthEvent(null, s({ milestoneCount: 1, currentStreakDuration: 2 })).triggered, false);
    assert.equal(detectStreakGrowthEvent(null, s({ dailyMilestoneCompletedToday: true })).reason, 'daily-milestone-arena');
    assert.equal(detectStreakGrowthEvent(null, s({ dailyGoalMetToday: true })).reason, 'daily-goal-success');
    assert.equal(detectStreakGrowthEvent(s(), s({ milestoneCount: 1 })).reason, 'mastery-milestone');
    assert.equal(detectStreakGrowthEvent(s({ currentStreakDuration: 1 }), s({ currentStreakDuration: 2 })).reason, 'consecutive-streak');
    assert.equal(detectStreakGrowthEvent(s({ currentStreakDuration: 0 }), s({ currentStreakDuration: 1 })).triggered, false);
    assert.equal(detectStreakGrowthEvent(s({ dailyGoalMetToday: true }), s({ dailyGoalMetToday: true })).triggered, false);
    assert.equal(detectStreakGrowthEvent(s({ currentStreakDuration: 5 }), s({ currentStreakDuration: 4 })).triggered, false);
    const ev = detectStreakGrowthEvent(s(), s({ currentStreakDuration: 9, milestoneCount: 1, dailyGoalMetToday: true, dailyMilestoneCompletedToday: true }));
    assert.equal(ev.reason, 'mastery-milestone', 'priority order');
  });
  it('getStreakMasteryMilestone exact-match only', () => {
    assert.equal(getStreakMasteryMilestone(3)?.title, 'Three-Day Scholar');
    assert.equal(getStreakMasteryMilestone(30)?.streakDay, 30);
    for (const n of [0, 4, 31, -1, NaN, 3.5]) assert.equal(getStreakMasteryMilestone(n), null);
  });
});

// ---------- firebase pure helpers ----------
describe('firebase pure helpers', () => {
  it('isEmailPasswordProviderDisabledError', () => {
    assert.equal(isEmailPasswordProviderDisabledError({ code: 'auth/operation-not-allowed' }), true);
    assert.equal(isEmailPasswordProviderDisabledError({ code: 'auth/other' }), false);
    for (const v of [null, undefined, 'auth/operation-not-allowed', 42, {}, { code: null }]) {
      assert.equal(isEmailPasswordProviderDisabledError(v), false);
    }
  });
  it('formatFirebaseAuthError known codes and fallbacks', () => {
    for (const c of ['auth/email-already-in-use', 'auth/invalid-email', 'auth/weak-password', 'auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/too-many-requests', 'auth/operation-not-allowed']) {
      const m = formatFirebaseAuthError({ code: c });
      assert.ok(m.length > 10 && !m.includes('auth/'), c);
    }
    assert.equal(formatFirebaseAuthError({ code: 'auth/invalid-credential' }), formatFirebaseAuthError({ code: 'auth/user-not-found' }));
    assert.equal(formatFirebaseAuthError(new Error('boom')), 'boom');
    assert.match(formatFirebaseAuthError(null), /Unable to complete/);
    assert.match(formatFirebaseAuthError('str'), /Unable to complete/);
    assert.match(formatFirebaseAuthError(undefined), /Unable to complete/);
  });
  it('REVIEW FINDING: unknown auth code with FirebaseError leaks raw SDK message ("Firebase: Error (auth/network-request-failed).") to the UI', () => {
    const e = Object.assign(new Error('Firebase: Error (auth/network-request-failed).'), { code: 'auth/network-request-failed' });
    assert.doesNotMatch(formatFirebaseAuthError(e), /Firebase: Error/);
  });
  it('REVIEW FINDING: empty Error message falls through as empty string', () => {
    assert.notEqual(formatFirebaseAuthError(new Error('')), '');
  });
});
