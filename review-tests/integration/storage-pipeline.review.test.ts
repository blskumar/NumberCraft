import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadProfile,
  saveProfile,
  loadMatches,
  saveMatches,
  appendMatch,
  loadEarnedBadges,
  saveEarnedBadges,
  loadDailyCompletions,
  upsertDailyCompletion,
  clearAllLocalProgress,
  DEFAULT_PROFILE,
} from '../../lib/storage';
import { evaluateAchievements } from '../../lib/achievements';
import { buildTimelineSeries, createSampleMatches, isSampleMatch, filterMatches } from '../../lib/notebook-analytics';
import {
  buildDailyMatchRecord,
  computeDailyStreakStats,
  getLocalDateKey,
  shiftDateKey,
  generateDailyPuzzle,
  calculateDailyScore,
} from '../../lib/daily-challenge';
import {
  buildArithmeticAccuracySeries,
  buildArithmeticGameBreakdown,
  buildChallengeCompletionHistory,
  computeDashboardOverview,
  createSampleDashboardData,
} from '../../lib/performance-dashboard';
import { computeHistoricalCalibration } from '../../lib/adaptive-arithmetic';
import { buildArithmeticMatchRecord } from '../../lib/arithmetic-engine';
import type { DailyChallengeCompletion, MatchRecord } from '../../lib/types';

let store: Map<string, string>;
function installStorage(opts: { throwOnSet?: boolean; throwOnGet?: boolean } = {}) {
  store = new Map();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => {
        if (opts.throwOnGet) throw new Error('SecurityError');
        return store.has(k) ? store.get(k)! : null;
      },
      setItem: (k: string, v: string) => {
        if (opts.throwOnSet) throw new DOMException('quota', 'QuotaExceededError');
        store.set(k, String(v));
      },
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  };
}

const daily = (dateKey: string, over: Partial<DailyChallengeCompletion> = {}): DailyChallengeCompletion => ({
  dateKey, editionNumber: 5, tier: 'challengers', archetype: 'equation-vault', archetypeTitle: 'Equation Vault',
  solved: true, stepsSolved: 3, secondsUsed: 20, timeLimitSeconds: 90, mistakes: 0, hintsUsed: 0, score: 100,
  completedAt: new Date().toISOString(), ...over,
});

describe('storage: robustness against hostile / corrupt localStorage', () => {
  beforeEach(() => installStorage());

  it('profile: junk JSON, wrong types, XSS-ish strings, oversize values are sanitised', () => {
    store.set('numbercraft_profile_v1', '{not json');
    assert.deepEqual(loadProfile(), DEFAULT_PROFILE);

    store.set('numbercraft_profile_v1', JSON.stringify({ displayName: '<img src=x onerror=alert(1)>'.repeat(5), ageTier: 'hacker', soundEnabled: 'yes', email: 'a'.repeat(500), sessionKind: 'signed-in-preview', authProvider: 'weird', featuredBadgeId: '__proto__' }));
    const p = loadProfile();
    assert.ok(p.displayName.length <= 28);
    assert.equal(p.ageTier, DEFAULT_PROFILE.ageTier);
    assert.equal(p.soundEnabled, true);
    assert.equal(p.email!.length, 120);
    assert.equal(p.authProvider, 'google'); // unknown provider silently becomes google
    assert.equal(p.featuredBadgeId, null);
  });

  it('profile: displayName with only whitespace falls back', () => {
    store.set('numbercraft_profile_v1', JSON.stringify({ displayName: '    ' }));
    assert.equal(loadProfile().displayName, DEFAULT_PROFILE.displayName);
  });

  it('profile: displayName is 28 UTF-16 units — emoji can be cut in half (REVIEW FINDING)', () => {
    const name = '😀'.repeat(20); // 40 UTF-16 units
    store.set('numbercraft_profile_v1', JSON.stringify({ displayName: name }));
    const p = loadProfile().displayName;
    // lone surrogate check
    const broken = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(p);
    console.log(`  [info] sliced displayName has lone surrogate: ${broken}`);
    assert.equal(broken, false, 'slice(0,28) splits a surrogate pair');
  });

  it('storage throws on get/set (private mode / quota): no crash, defaults returned', () => {
    installStorage({ throwOnGet: true, throwOnSet: true });
    assert.deepEqual(loadProfile(), DEFAULT_PROFILE);
    assert.deepEqual(loadMatches(), []);
    assert.deepEqual(loadEarnedBadges(), []);
    assert.deepEqual(loadDailyCompletions(), []);
    saveProfile(DEFAULT_PROFILE);
    saveMatches([]);
    saveEarnedBadges([]);
    clearAllLocalProgress();
  });

  it('SSR (no window): safe defaults', () => {
    delete (globalThis as any).window;
    assert.deepEqual(loadMatches(), []);
    assert.deepEqual(loadProfile(), DEFAULT_PROFILE);
    assert.deepEqual(appendMatch({} as MatchRecord).length >= 0, true);
    installStorage();
  });

  it('matches array containing null / primitives must not crash achievements+analytics (REVIEW FINDING: loadMatches does not validate items)', () => {
    store.set('numbercraft_matches_v1', JSON.stringify([null, 5, 'x', { id: 'a' }]));
    const m = loadMatches();
    assert.equal(m.length, 0, 'junk items must be dropped on load');
    assert.doesNotThrow(() => evaluateAchievements(m), 'evaluateAchievements crashes on junk records -> whole app white-screens on load');
  });

  it('matches record with missing tier/playedAt does not crash timeline', () => {
    store.set('numbercraft_matches_v1', JSON.stringify([{ id: 'a', mode: 'solo', result: 'win' }]));
    const m = loadMatches();
    assert.doesNotThrow(() => buildTimelineSeries(m));
    assert.doesNotThrow(() => filterMatches(m, 'all', 'all'));
  });

  it('prototype pollution style keys are inert', () => {
    store.set('numbercraft_badges_v1', JSON.stringify([{ id: '__proto__' }, { id: 'constructor' }, { id: 'first-victory' }]));
    const b = loadEarnedBadges();
    assert.deepEqual(b.map((x) => x.id), ['first-victory']);
  });

  it('badges de-duplicate and ignore unknown ids', () => {
    store.set('numbercraft_badges_v1', JSON.stringify([{ id: 'first-victory' }, { id: 'first-victory' }, { id: 'nope' }]));
    assert.equal(loadEarnedBadges().length, 1);
  });

  it('daily completions: wrong-typed entries are dropped, but numbers like NaN-able fields are not validated', () => {
    store.set('numbercraft_daily_v1', JSON.stringify([daily('2025-01-01'), { dateKey: '2025-01-02', editionNumber: 1 }, { dateKey: 3 }, null]));
    const d = loadDailyCompletions();
    assert.equal(d.length, 1);
    // Entry passes validation but lacks solved/secondsUsed/... -> downstream
    assert.doesNotThrow(() => computeDailyStreakStats(d));
    assert.doesNotThrow(() => evaluateAchievements([], [], d));
    assert.doesNotThrow(() => buildChallengeCompletionHistory([], d));
  });

  it('match cap 100 and newest-first ordering', () => {
    const base = createSampleMatches()[0];
    for (let i = 0; i < 130; i++) appendMatch({ ...base, id: 'm' + i });
    const m = loadMatches();
    assert.equal(m.length, 100);
    assert.equal(m[0].id, 'm129');
  });

  it('saveMatches silently drops real data older than 100 including sample merge (cap interaction)', () => {
    // 100 real + sample merge in app => samples + 100 real > 100 => the OLDEST REAL history is silently truncated by saveMatches
    const real: MatchRecord[] = Array.from({ length: 100 }, (_, i) => ({ ...createSampleMatches()[0], id: 'real' + i, playedAt: new Date(Date.now() - i * 1000).toISOString() }));
    real.forEach((r) => { (r as any).id = 'real' + r.id; });
    const merged = [...real.filter((m) => !isSampleMatch(m)), ...createSampleMatches()];
    saveMatches(merged);
    const back = loadMatches();
    console.log(`  [info] merged ${merged.length} -> persisted ${back.length}`);
    assert.ok(back.length <= 100);
  });

  it('upsertDailyCompletion: same dateKey replaces (cannot farm streak), sorted desc, cap 90', () => {
    for (let i = 0; i < 100; i++) upsertDailyCompletion(daily(shiftDateKey('2025-01-01', i)));
    upsertDailyCompletion(daily('2025-01-01', { score: 999 }));
    const d = loadDailyCompletions();
    assert.equal(d.length, 90);
    assert.ok(d[0].dateKey > d[1].dateKey);
  });

  it('clearAllLocalProgress keeps the profile (documented) and removes matches/badges/daily', () => {
    saveProfile({ ...DEFAULT_PROFILE, displayName: 'Mia' });
    saveMatches([{ id: 'x' } as any]);
    saveEarnedBadges([{ id: 'first-victory', unlockedAt: 'x' }]);
    upsertDailyCompletion(daily('2025-01-01'));
    clearAllLocalProgress();
    assert.equal(loadMatches().length, 0);
    assert.equal(loadEarnedBadges().length, 0);
    assert.equal(loadDailyCompletions().length, 0);
    assert.equal(loadProfile().displayName, 'Mia');
    // featured badge persists after clear -> dangling reference?
  });

  it('after clearAllLocalProgress profile.featuredBadgeId can still point to a badge that is no longer earned (REVIEW FINDING)', () => {
    saveProfile({ ...DEFAULT_PROFILE, featuredBadgeId: 'first-victory' });
    saveEarnedBadges([{ id: 'first-victory', unlockedAt: 'x' }]);
    clearAllLocalProgress();
    assert.equal(loadProfile().featuredBadgeId, 'first-victory');
  });
});

describe('integration: daily -> match record -> achievements -> dashboard', () => {
  beforeEach(() => installStorage());

  it('3 consecutive daily solves unlock daily-streak-3, daily-pioneer, flawless; lightning needs <=50% time', () => {
    const today = getLocalDateKey();
    const days = [2, 1, 0].map((o) => shiftDateKey(today, -o));
    days.forEach((d, i) => upsertDailyCompletion(daily(d, { secondsUsed: i === 2 ? 10 : 80, completedAt: d + 'T12:00:00.000Z' })));
    const completions = loadDailyCompletions();
    days.forEach((d) => appendMatch(buildDailyMatchRecord(completions.find((c) => c.dateKey === d)!)));
    const ev = evaluateAchievements(loadMatches(), [], completions);
    const ids = ev.statuses.filter((s) => s.earned).map((s) => s.definition.id).sort();
    assert.deepEqual(ids, ['daily-flawless', 'daily-lightning', 'daily-pioneer', 'daily-streak-3']);
    assert.equal(ev.bestDailyStreak, 3);
  });

  it('daily matches never count toward Factor Grid seals (first-victory etc.)', () => {
    const d = daily(getLocalDateKey());
    appendMatch(buildDailyMatchRecord(d));
    const ev = evaluateAchievements(loadMatches(), [], [d]);
    const fg = ev.statuses.filter((s) => !s.definition.id.startsWith('daily-') && s.earned);
    assert.equal(fg.length, 0, fg.map((s) => s.definition.id).join());
  });

  it('latched badges persist after the match ledger is wiped', () => {
    const ev = evaluateAchievements([], [{ id: 'first-victory', unlockedAt: 'x' }], []);
    assert.equal(ev.earnedCount, 1);
  });

  it('failed daily (solved=false) does not extend streak or unlock pioneer', () => {
    const d = daily(getLocalDateKey(), { solved: false, stepsSolved: 1 });
    const ev = evaluateAchievements([], [], [d]);
    assert.equal(ev.earnedCount, 0);
  });

  it('dashboard analytics survive sample data + real data', () => {
    const { sampleMatches, sampleDaily } = createSampleDashboardData();
    const all = [...sampleMatches, ...createSampleMatches()];
    assert.doesNotThrow(() => buildArithmeticAccuracySeries(all, 'all', 'all'));
    assert.doesNotThrow(() => buildArithmeticGameBreakdown(all, 'all'));
    assert.doesNotThrow(() => buildChallengeCompletionHistory(all, sampleDaily));
    const o = computeDashboardOverview(all, sampleDaily);
    assert.ok(Object.values(o).every((v) => v === null || typeof v !== 'number' || Number.isFinite(v)), 'NaN/Infinity in overview: ' + JSON.stringify(o));
  });

  it('arithmetic record -> calibration loop: perfect rounds raise starting level, bad rounds lower it', () => {
    const cfg: any = { gameId: 'addition-attack', tier: 'challengers', pace: 'standard', untimed: false, startStage: 1, tableFocus: 'progressive', allowSignedStrategistSub: false };
    const good = Array.from({ length: 5 }, (_, i) =>
      buildArithmeticMatchRecord({ config: cfg, score: 200, solved: 20, attempted: 20, bestStreak: 20, elapsedSeconds: 60, maxStageReached: 5, adaptiveEnabled: true, startAdaptiveLevel: 3, endAdaptiveLevel: 4, peakAdaptiveLevel: 4, playedAt: new Date(Date.now() - i * 60000).toISOString() }));
    const bad = Array.from({ length: 5 }, (_, i) =>
      buildArithmeticMatchRecord({ config: cfg, score: 20, solved: 2, attempted: 10, bestStreak: 1, elapsedSeconds: 60, maxStageReached: 1, adaptiveEnabled: true, startAdaptiveLevel: 2, endAdaptiveLevel: 2, peakAdaptiveLevel: 2, playedAt: new Date(Date.now() - i * 60000).toISOString() }));
    const hi = computeHistoricalCalibration(good, 'addition-attack', 'challengers').startingLevel;
    const lo = computeHistoricalCalibration(bad, 'addition-attack', 'challengers').startingLevel;
    assert.ok(hi > lo, `hi=${hi} lo=${lo}`);
    assert.equal(lo, 1);
  });

  it('daily score is non-negative, finite, and has a floor of 50 when solved', () => {
    const base = { solved: true, stepsSolved: 3, timeLimitSeconds: 90, streakDays: 0 };
    const worst = calculateDailyScore({ ...base, secondsUsed: 999, mistakes: 50, hintsUsed: 50 });
    assert.equal(worst, 50);
    const unsolved = calculateDailyScore({ ...base, solved: false, stepsSolved: 0, secondsUsed: 10, mistakes: 99, hintsUsed: 0 });
    assert.equal(unsolved, 0);
    const best = calculateDailyScore({ ...base, secondsUsed: 0, mistakes: 0, hintsUsed: 0, streakDays: 7 });
    assert.equal(best, 150 + 100 + 50 + 75);
  });

  it('REVIEW FINDING: a later FAILED replay of the same date overwrites a SOLVED completion (streak loss)', () => {
    const d = getLocalDateKey();
    upsertDailyCompletion(daily(d, { solved: true }));
    upsertDailyCompletion(daily(d, { solved: false, stepsSolved: 0, score: 0 }));
    const stored = loadDailyCompletions().find((c) => c.dateKey === d)!;
    assert.equal(stored.solved, true, 'solved result was clobbered by later failed attempt');
  });

  it('REVIEW FINDING: replaying the same daily appends duplicate match records (same id)', () => {
    const c = daily(getLocalDateKey());
    appendMatch(buildDailyMatchRecord(c));
    appendMatch(buildDailyMatchRecord(c));
    const ids = loadMatches().map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate ids in ledger: ' + ids.join());
  });
});

describe('sample-data markers', () => {
  it('REVIEW FINDING: a REAL daily completion whose completedAt ends in .111Z is classified as sample data', async () => {
    const { isSampleDailyCompletion } = await import('../../lib/performance-dashboard');
    const real = daily('2026-01-01', { completedAt: '2026-01-01T10:00:00.111Z' });
    assert.equal(isSampleDailyCompletion(real), false, 'real data would be wiped by "Clear sample data"');
  });
  it('REVIEW FINDING: a real match id starting with "sample-" would be classified as sample', () => {
    assert.equal(isSampleMatch({ id: 'sample-abc' } as any), true); // by design, documents the coupling
  });
});
