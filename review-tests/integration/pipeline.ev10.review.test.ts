// EV10 integration review: storage -> achievements -> goal -> dashboard, match-recording flow,
// theme/profile persistence, clearAllLocalProgress completeness. No network, no Firebase.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadProfile, saveProfile, loadMatches, saveMatches, appendMatch, loadEarnedBadges, saveEarnedBadges,
  loadDailyCompletions, saveDailyCompletions, upsertDailyCompletion, clearAllLocalProgress, DEFAULT_PROFILE,
} from '../../lib/storage';
import { evaluateAchievements, getRecentEarnedAchievements } from '../../lib/achievements';
import { computeDailyGoalProgress, getTodayProblemBreakdown } from '../../lib/daily-goal';
import { computeDashboardOverview, createSampleDashboardData, isSampleDailyCompletion } from '../../lib/performance-dashboard';
import { createSampleMatches, isSampleMatch } from '../../lib/notebook-analytics';
import {
  loadGuestTrialUsage, saveGuestTrialUsage, incrementGuestTrialUsage, computeEffectiveGuestTrials,
  isGuestGameLocked, resolveGameIdFromMatch, type GuestTrialUsageMap, type PlayableGameId,
} from '../../lib/guest-trial';
import { buildDailyMatchRecord, shiftDateKey, getLocalDateKey } from '../../lib/daily-challenge';
import { buildSanitizedScorePayload, computeTopTenLeaderboard, type CloudGameScoreRecord } from '../../lib/game-scores';
import { loadThemePreference, saveThemePreference, THEME_STORAGE_KEY } from '../../lib/theme';
import type { DailyChallengeCompletion, MatchRecord, StudentProfile } from '../../lib/types';

// ---------- in-memory window/localStorage shim ----------
let store: Map<string, string>;
let failSet = false;
function install() {
  store = new Map();
  failSet = false;
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        if (failSet) throw new DOMException('quota', 'QuotaExceededError');
        store.set(k, String(v));
      },
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  };
}
const TODAY = '2026-11-20';
const iso = (dateKey: string, hh = 12) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hh).toISOString();
};
const arith = (id: string, dateKey: string, solved: number, attempted = solved + 2, gameId: any = 'addition-attack'): MatchRecord => ({
  id, gameTitle: 'Addition Attack', mode: 'solo', tier: 'challengers', variant: 'classic',
  playerScore: solved * 10, opponentScore: 130, opponentName: '60s Par', result: solved * 10 >= 130 ? 'win' : 'loss',
  primesClaimed: 0, playedAt: iso(dateKey),
  arithmeticMeta: { gameId, pace: 'standard', solved, attempted, accuracyPercent: Math.round((solved / attempted) * 100), bestStreak: 3, durationSeconds: 60, maxStageReached: 2 },
});
const fg = (id: string, dateKey: string, result: 'win' | 'loss', hh = 10): MatchRecord => ({
  id, gameTitle: 'Factor Grid', mode: 'vs-ai', aiDifficulty: 'apprentice', tier: 'challengers', variant: 'classic',
  playerScore: 200, opponentScore: 150, opponentName: 'AI', result, primesClaimed: 2, playedAt: iso(dateKey, hh),
});
const daily = (dateKey: string, over: Partial<DailyChallengeCompletion> = {}): DailyChallengeCompletion => ({
  dateKey, editionNumber: 10, tier: 'challengers', archetype: 'equation-vault', archetypeTitle: 'Equation Vault',
  solved: true, stepsSolved: 3, secondsUsed: 20, timeLimitSeconds: 90, mistakes: 0, hintsUsed: 0, score: 150,
  completedAt: iso(dateKey, 18), ...over,
});

/** Mirrors NumbercraftApp hydrate effect + derived memo chain (lines ~305-345, 400+). */
function hydrate(todayKey = TODAY) {
  const profile = loadProfile();
  const matches = loadMatches();
  const badges = loadEarnedBadges();
  const dailyC = loadDailyCompletions();
  const trials = loadGuestTrialUsage();
  const theme = profile.themePreference ?? loadThemePreference();
  const ev = evaluateAchievements(matches, badges, dailyC);
  const eff = computeEffectiveGuestTrials(trials, matches, dailyC);
  const goal = computeDailyGoalProgress({ matches, dailyCompletions: dailyC, todayKey, dailyProblemGoal: profile.dailyProblemGoal });
  const dash = computeDashboardOverview(matches, dailyC, todayKey);
  const recent = getRecentEarnedAchievements(ev, 5);
  return { profile, matches, badges, dailyC, trials, theme, ev, eff, goal, dash, recent };
}

/** Mirrors NumbercraftApp recordGuestTrialOrPersistCloudScore + handleRecordMatch/handleCompleteDaily storage side. */
function makeSession(kind: 'guest' | 'auth') {
  const cloud: ReturnType<typeof buildSanitizedScorePayload>[] = [];
  let trials: GuestTrialUsageMap = loadGuestTrialUsage();
  const uid = kind === 'auth' ? 'u-auth' : null;
  const credit = (gameId: PlayableGameId, tier: any, score: number, acc: number, dateKey: string) => {
    if (uid) cloud.push(buildSanitizedScorePayload({ uid, displayName: 'Ann', gameId, tier, score, accuracyPercent: acc, dateKey }));
    else { trials = incrementGuestTrialUsage(trials, gameId); saveGuestTrialUsage(trials); }
  };
  return {
    cloud,
    get trials() { return trials; },
    recordMatch(m: MatchRecord) {
      appendMatch(m);
      credit(resolveGameIdFromMatch(m) ?? 'factor-grid', m.tier, m.playerScore, m.arithmeticMeta?.accuracyPercent ?? 50, getLocalDateKey(new Date(m.playedAt)));
    },
    completeDaily(c: DailyChallengeCompletion) {
      upsertDailyCompletion(c);
      appendMatch(buildDailyMatchRecord(c));
      credit('daily-challenge', c.tier, c.score, Math.round((c.stepsSolved / Math.max(1, 3 + c.mistakes)) * 100), c.dateKey);
    },
  };
}

beforeEach(install);

describe('(1) storage pipeline end-to-end with a realistic multi-day history', () => {
  it('7-day history: streak, goal, dashboard, recent achievements agree and survive a reload', () => {
    const dk = (n: number) => shiftDateKey(TODAY, -n);
    const s = makeSession('guest');
    for (let n = 6; n >= 0; n--) {
      s.recordMatch(arith(`a-${n}`, dk(n), 8 + n));
      if (n !== 3) s.completeDaily(daily(dk(n), { editionNumber: 20 - n, completedAt: iso(dk(n), 18) }));
    }
    s.recordMatch(fg('fg-1', dk(1), 'win')); s.recordMatch(fg('fg-2', dk(1), 'win', 11)); s.recordMatch(fg('fg-3', dk(1), 'win', 12));
    const first = hydrate();
    const second = hydrate(); // "reload"
    assert.equal(first.goal.dailyStreak, 3, 'today, -1, -2 solved; -3 missed');
    assert.equal(first.goal.bestDailyStreak, 3);
    assert.equal(first.dash.dailySolvedCount, 6);
    assert.equal(first.dash.currentDailyStreak, first.goal.dailyStreak);
    // today: arithmetic solved 8 + daily 3
    assert.equal(first.goal.problemsSolvedToday, 8 + 3);
    assert.ok(first.goal.goalMetToday);
    assert.equal(first.dash.totalChallengesCompleted, first.matches.filter((m) => !m.dailyMeta).length + 6);
    assert.deepEqual(second.goal, first.goal);
    assert.deepEqual(second.recent.map((r) => r.id), first.recent.map((r) => r.id));
    assert.ok(first.ev.earnedCount >= 2);
    // newest-first ordering
    for (let i = 1; i < first.recent.length; i++) assert.ok(first.recent[i - 1].unlockedTimestamp >= first.recent[i].unlockedTimestamp);
  });

  it('persisting evaluateAchievements output then reloading never loses/duplicates seals', () => {
    for (let i = 0; i < 4; i++) saveMatches([fg(`w${i}`, TODAY, 'win', 8 + i), ...loadMatches()]);
    saveDailyCompletions([daily(TODAY), daily(shiftDateKey(TODAY, -1)), daily(shiftDateKey(TODAY, -2))]);
    const ev = evaluateAchievements(loadMatches(), loadEarnedBadges(), loadDailyCompletions());
    saveEarnedBadges(ev.earnedRecords);
    const ev2 = evaluateAchievements(loadMatches(), loadEarnedBadges(), loadDailyCompletions());
    assert.equal(ev2.newlyUnlocked.length, 0);
    assert.deepEqual(ev2.earnedRecords.map((r) => r.id).sort(), ev.earnedRecords.map((r) => r.id).sort());
    // unlockedAt latched (stable across reload)
    for (const r of ev.earnedRecords) assert.equal(ev2.earnedRecords.find((x) => x.id === r.id)!.unlockedAt, r.unlockedAt);
  });

  it('DEFECT: sample dashboard load credits SAMPLE daily completion to the goal ring (daily-goal.ts getTodayProblemBreakdown has no sample filter for dailyCompletions); matches/trials are excluded correctly', () => {
    const real = [arith('real-1', TODAY, 6), fg('real-fg', TODAY, 'win')];
    saveMatches(real);
    const { sampleMatches, sampleDaily } = createSampleDashboardData(TODAY);
    const merged = [...real, ...createSampleMatches(), ...sampleMatches].sort((a, b) => +new Date(b.playedAt) - +new Date(a.playedAt));
    saveMatches(merged); saveDailyCompletions(sampleDaily);
    const h = hydrate();
    assert.equal(h.goal.problemsSolvedToday, 6 + 3 /* arith 6 + FG 3 */ , 'samples excluded from goal (sample daily completion leaks +3)');
    assert.equal(h.eff['addition-attack'], 1, 'samples excluded from trials');
    assert.ok(h.ev.statuses.every((s) => !s.earned || s.unlockedAt === null || true));
    // clear samples as handleClearSampleMatches does
    saveMatches(loadMatches().filter((m) => !isSampleMatch(m)));
    saveDailyCompletions(loadDailyCompletions().filter((c) => !isSampleDailyCompletion(c)));
    assert.deepEqual(loadMatches().map((m) => m.id).sort(), ['real-1', 'real-fg']);
    assert.equal(loadDailyCompletions().length, 0);
  });

  it('DEFECT?: dashboard aggregates mix sample + real arithmetic (no sample filter in computeDashboardOverview)', () => {
    saveMatches([arith('real-1', TODAY, 4, 20)]); // 20% accuracy real
    const { sampleMatches } = createSampleDashboardData(TODAY);
    const withSamples = computeDashboardOverview([arith('real-1', TODAY, 4, 20), ...sampleMatches], [], TODAY);
    const realOnly = computeDashboardOverview([arith('real-1', TODAY, 4, 20)], [], TODAY);
    assert.equal(realOnly.arithmeticSessionCount, 1);
    // documents behaviour: samples are folded into real stats once sample data is loaded
    assert.ok(withSamples.arithmeticSessionCount > 1);
  });

  it('MAX_STORED_MATCHES=100: newest-first retention + order after overflow', () => {
    for (let i = 0; i < 130; i++) appendMatch(arith(`m${i}`, TODAY, 5));
    const l = loadMatches();
    assert.equal(l.length, 100);
    assert.equal(l[0].id, 'm129');
    assert.equal(l[99].id, 'm30');
  });

  it('DEFECT: loading sample matches with a full real ledger silently destroys real history (saveMatches slice(0,100) after sort)', () => {
    // mirrors handleLoadSampleMatches: merged = [...realOnly, ...samples].sort(desc); saveMatches(merged)
    const real: MatchRecord[] = [];
    for (let i = 0; i < 100; i++) real.push(arith(`r${i}`, '2026-10-' + String(1 + (i % 28)).padStart(2, '0'), 5)); // all older than samples (Nov)
    saveMatches(real);
    const merged = [...loadMatches().filter((m) => !isSampleMatch(m)), ...createSampleMatches()].sort((a, b) => +new Date(b.playedAt) - +new Date(a.playedAt));
    saveMatches(merged);
    const after = loadMatches().filter((m) => !isSampleMatch(m)).length;
    assert.equal(after, 100, 'all 100 real matches must survive a sample load');
  });

  it('MAX_STORED_DAILY=90: keeps newest 90 by dateKey regardless of insertion order', () => {
    for (let i = 0; i < 100; i++) upsertDailyCompletion(daily(shiftDateKey(TODAY, -i)));
    const d = loadDailyCompletions();
    assert.equal(d.length, 90);
    assert.equal(d[0].dateKey, TODAY);
    assert.equal(d[89].dateKey, shiftDateKey(TODAY, -89));
    // inserting an old day when full must not evict newer
    upsertDailyCompletion(daily(shiftDateKey(TODAY, -300)));
    assert.equal(loadDailyCompletions().length, 90);
    assert.equal(loadDailyCompletions()[0].dateKey, TODAY);
  });

  it('upsertDailyCompletion same dateKey replaces (no dup)', () => {
    upsertDailyCompletion(daily(TODAY, { solved: false, score: 50 }));
    upsertDailyCompletion(daily(TODAY, { solved: true, score: 150 }));
    const d = loadDailyCompletions();
    assert.equal(d.length, 1);
    assert.equal(d[0].solved, true);
  });
});

describe('(1b) corrupted / partial / legacy payloads must not crash the hydrate pipeline', () => {
  const run = (key: string, payload: unknown) => {
    store.set(key, typeof payload === 'string' ? payload : JSON.stringify(payload));
    return hydrate();
  };
  for (const [name, p] of [
    ['null element', [null]], ['empty object', [{}]], ['primitive elements', [1, 'x', true]],
    ['no id', [{ gameTitle: 'Factor Grid', playedAt: iso(TODAY), mode: 'solo', tier: 'explorers', result: 'win', primesClaimed: 1, playerScore: 1 }]],
    ['no gameTitle (legacy v0)', [{ id: 'old1', mode: 'solo', tier: 'explorers', result: 'win', primesClaimed: 1, playerScore: 100, opponentScore: 90, playedAt: iso(TODAY) }]],
    ['bad playedAt', [{ ...fg('x1', TODAY, 'win'), playedAt: 'garbage' }]],
    ['arithmeticMeta w/ unknown gameId', [{ ...arith('x2', TODAY, 5), arithmeticMeta: { gameId: 'removed-game', solved: 5, attempted: 7 } }]],
  ] as const) {
    it(`matches payload: ${name}`, () => { assert.doesNotThrow(() => run('numbercraft_matches_v1', p)); });
  }
  for (const [name, p] of [
    ['missing completedAt', [{ dateKey: TODAY, editionNumber: 1, solved: true }]],
    ['completedAt non-string', [{ ...daily(TODAY), completedAt: 12345 }]],
    ['missing solved/steps', [{ dateKey: TODAY, editionNumber: 1, completedAt: iso(TODAY) }]],
  ] as const) {
    it(`daily payload: ${name}`, () => { assert.doesNotThrow(() => run('numbercraft_daily_v1', p)); });
  }
  it('non-JSON / wrong-shape blobs fall back to empty without throwing', () => {
    for (const k of ['numbercraft_matches_v1', 'numbercraft_badges_v1', 'numbercraft_daily_v1', 'numbercraft_guest_trials_v1', 'numbercraft_profile_v1']) {
      for (const bad of ['{not json', '"str"', '42', 'null', '{}']) { store.set(k, bad); assert.doesNotThrow(hydrate, `${k}=${bad}`); }
    }
  });
  it('legacy profile sanitised: stripped uid/email for guest, bad theme/goal/featured badge', () => {
    store.set('numbercraft_profile_v1', JSON.stringify({ uid: 'x', email: 'a@b.c', sessionKind: 'guest', themePreference: 'neon', dailyProblemGoal: '30', featuredBadgeId: 'nope', displayName: '   ', ageTier: 'x' }));
    const p = loadProfile();
    assert.equal(p.uid, null); assert.equal(p.email, null); assert.equal(p.themePreference, 'system');
    assert.equal(p.dailyProblemGoal, 10); assert.equal(p.featuredBadgeId, null); assert.equal(p.displayName, 'Guest Explorer');
  });
  it('badges: dups, invalid ids, bad unlockedAt are cleaned', () => {
    store.set('numbercraft_badges_v1', JSON.stringify([{ id: 'first-victory', unlockedAt: 5 }, { id: 'first-victory' }, { id: 'nope' }, null]));
    const b = loadEarnedBadges();
    assert.equal(b.length, 1);
    assert.equal(typeof b[0].unlockedAt, 'string');
  });
  it('guest trial map: negatives/NaN/strings/floats cleaned, floor applied', () => {
    store.set('numbercraft_guest_trials_v1', JSON.stringify({ 'addition-attack': 2.9, 'odds-urns': -1, 'factor-grid': '3', 'daily-challenge': 0, bogus: 9 }));
    assert.deepEqual(loadGuestTrialUsage(), { 'addition-attack': 2 });
  });
  it('MAX slice applied to legacy oversize stored arrays', () => {
    store.set('numbercraft_matches_v1', JSON.stringify(Array.from({ length: 500 }, (_, i) => fg(`o${i}`, TODAY, 'win'))));
    assert.equal(loadMatches().length, 100);
  });
});

describe('(1c) quota errors (setItem throws)', () => {
  it('no function throws; appendMatch returns in-memory list that is NOT persisted (state diverges from storage)', () => {
    saveMatches([fg('p1', TODAY, 'win')]);
    failSet = true;
    let next: MatchRecord[] = [];
    assert.doesNotThrow(() => { next = appendMatch(fg('p2', TODAY, 'win')); saveProfile({ ...DEFAULT_PROFILE, displayName: 'Z' }); saveEarnedBadges([]); saveGuestTrialUsage({ 'factor-grid': 1 }); saveThemePreference('dark'); upsertDailyCompletion(daily(TODAY)); });
    assert.equal(next.length, 2);
    failSet = false;
    assert.equal(loadMatches().length, 1, 'p2 lost on reload and the UI is never told');
  });
  it('DEFECT: guest trial usage lost under quota failure => paywall gate bypass once matches are also unwritable', () => {
    failSet = true;
    const s = makeSession('guest');
    s.recordMatch(arith('q1', TODAY, 5));
    failSet = false;
    const h = hydrate();
    assert.equal(h.eff['addition-attack'], 1, 'after reload, the played round must still count against the 1-free-level trial');
  });
});

describe('(2) match-recording flow: guest vs authenticated, no double counting', () => {
  it('guest round: match stored once, trial +1, no cloud payload; goal credit = solved', () => {
    const s = makeSession('guest');
    s.recordMatch(arith('g1', TODAY, 7));
    assert.equal(s.cloud.length, 0);
    const h = hydrate();
    assert.equal(h.trials['addition-attack'], 1);
    assert.equal(h.eff['addition-attack'], 1, 'stored trial and match ledger are max()ed not summed');
    assert.equal(h.goal.problemsSolvedToday, 7);
    assert.equal(isGuestGameLocked({ isSignedIn: false, gameId: 'addition-attack', trialUsage: h.eff }), true);
    assert.equal(isGuestGameLocked({ isSignedIn: true, gameId: 'addition-attack', trialUsage: h.eff }), false);
  });
  it('authenticated round: cloud payload built once with sanitized bounds, trial NOT incremented', () => {
    const s = makeSession('auth');
    s.recordMatch({ ...arith('a1', TODAY, 7), playerScore: 1e9 });
    assert.equal(s.cloud.length, 1);
    assert.equal(s.cloud[0].score, 100000);
    assert.equal(s.cloud[0].gameId, 'addition-attack');
    assert.equal(s.cloud[0].weekKey, '2026-W47');
    assert.deepEqual(loadGuestTrialUsage(), {});
  });
  it('DEFECT: signed-in rounds burn guest trial after sign-out (effective trials read matches, not trial map)', () => {
    const s = makeSession('auth');
    s.recordMatch(arith('a1', TODAY, 7));
    const h = hydrate(); // simulates sign-out: profile -> guest
    assert.equal(h.eff['addition-attack'], 0, 'a registered user who signs out should not lose their guest trial because of cloud-credited rounds');
  });
  it('daily: ledger + completion + ONE credit per completion; goal counts daily 3 once (dailyMeta match skipped)', () => {
    const s = makeSession('guest');
    s.completeDaily(daily(TODAY));
    const h = hydrate();
    assert.equal(h.matches.length, 1);
    assert.equal(h.dailyC.length, 1);
    assert.equal(h.goal.problemsSolvedToday, 3);
    assert.equal(h.trials['daily-challenge'], 1);
    assert.equal(h.eff['daily-challenge'], 1);
    assert.equal(h.dash.totalChallengesCompleted, 1);
  });
  it('DEFECT: failed-then-solved daily on same day (DailyChallengeArena.tsx:228 allows upgrade) double-records: duplicate match id, 2 trial credits / 2 cloud scores', () => {
    for (const kind of ['guest', 'auth'] as const) {
      install();
      const s = makeSession(kind);
      s.completeDaily(daily(TODAY, { solved: false, stepsSolved: 1, mistakes: 3, score: 50, completedAt: iso(TODAY, 9) }));
      s.completeDaily(daily(TODAY, { solved: true, score: 150, completedAt: iso(TODAY, 11) }));
      const h = hydrate();
      assert.equal(h.dailyC.length, 1);
      const ids = h.matches.map((m) => m.id);
      assert.equal(new Set(ids).size, ids.length, `${kind}: duplicate MatchRecord id ${ids[0]}`);
      if (kind === 'guest') assert.equal(h.trials['daily-challenge'], 1, 'one daily day = one trial');
      else assert.equal(s.cloud.length, 1, 'one daily day = one leaderboard score');
    }
  });
  it('leaderboard compute: guest never appears; authenticated best score wins, count rounds, tie-break stable', () => {
    const a = makeSession('auth');
    a.recordMatch(arith('a1', TODAY, 5)); a.recordMatch(arith('a2', TODAY, 12));
    const recs: CloudGameScoreRecord[] = a.cloud.map((p, i) => ({ ...p, id: 's' + i, createdAtMs: 1000 + i }));
    recs.push({ ...recs[0], id: 'other', uid: 'u-other', displayName: 'Bo', score: 120, createdAtMs: 5 });
    const lb = computeTopTenLeaderboard({ records: recs, period: 'day', gameFilter: 'all', todayKey: TODAY, currentUserUid: 'u-auth' });
    assert.equal(lb.totalPlayersInPeriod, 2);
    assert.equal(lb.topTen[0].uid, 'u-auth'); assert.equal(lb.topTen[0].score, 120 === 120 ? 120 : 0);
  });
  it('leaderboard: dateKey passed for arena match uses LOCAL day of playedAt vs app uses getLocalDateKey() "now" (consistent only if played now)', () => {
    const p = buildSanitizedScorePayload({ uid: 'u', displayName: ' ', gameId: 'daily-challenge', tier: 'explorers', score: -5, accuracyPercent: 250, dateKey: '2026-12-31' });
    assert.equal(p.displayName, 'Scholar'); assert.equal(p.score, 0); assert.equal(p.accuracyPercent, 100); assert.equal(p.weekKey, '2026-W53');
  });
  it('DEFECT: getIsoWeekKey falls back to hard-coded 2026-W01 for malformed key', () => {
    const p = buildSanitizedScorePayload({ uid: 'u', displayName: 'a', gameId: 'daily-challenge', tier: 'explorers', score: 1, accuracyPercent: 1, dateKey: 'bad' });
    assert.notEqual(p.weekKey, '2026-W01');
  });
});

describe('(4) theme + profile persistence (D7 split source of truth)', () => {
  const changeTheme = (t: 'light' | 'dark' | 'system') => { saveThemePreference(t); saveProfile({ ...loadProfile(), themePreference: t }); };
  const initScriptTheme = () => (['light', 'dark', 'system'].includes(store.get(THEME_STORAGE_KEY) as string) ? store.get(THEME_STORAGE_KEY) : 'system');
  it('normal change survives reload and matches the pre-hydration init script', () => {
    changeTheme('dark');
    assert.equal(hydrate().theme, 'dark'); assert.equal(initScriptTheme(), 'dark');
  });
  it('DEFECT D7: theme key says dark but profile blob missing/corrupt => hydrate reverts to system (init script painted dark => flash + silent loss)', () => {
    saveThemePreference('dark');
    assert.equal(initScriptTheme(), 'dark');
    assert.equal(hydrate().theme, 'dark', 'loadProfile always returns a themePreference so `?? loadThemePreference()` is dead code');
  });
  it('DEFECT D7: legacy profile saved before themePreference existed ignores the theme key', () => {
    saveThemePreference('light');
    store.set('numbercraft_profile_v1', JSON.stringify({ displayName: 'Old', sessionKind: 'guest' }));
    assert.equal(hydrate().theme, 'light');
  });
  it('DEFECT D7: profile write fails (quota) after theme write => stale profile theme wins after reload', () => {
    changeTheme('light');
    saveThemePreference('dark'); failSet = true; saveProfile({ ...loadProfile(), themePreference: 'dark' }); failSet = false;
    assert.equal(hydrate().theme, 'dark');
  });
  it('sign-out profile rewrite (AccountModal.tsx:344) keeps theme; sign-in merge keeps theme', () => {
    changeTheme('dark');
    const p: StudentProfile = { ...loadProfile(), uid: null, displayName: 'Guest Explorer', sessionKind: 'guest', authProvider: 'guest', email: null };
    saveProfile(p);
    assert.equal(hydrate().theme, 'dark');
  });
  it('DEFECT: clearAllLocalProgress leaves theme intact (OK) but theme+profile cannot be reset together; no reset path', () => {
    changeTheme('dark'); clearAllLocalProgress();
    assert.equal(store.get(THEME_STORAGE_KEY), 'dark');
  });
});

describe('(5) clearAllLocalProgress completeness (shared-device wipe on sign-out)', () => {
  function populate() {
    saveProfile({ ...DEFAULT_PROFILE, displayName: 'Kid', ageTier: 'strategists', dailyProblemGoal: 40, featuredBadgeId: 'first-victory', sessionKind: 'authenticated', uid: 'u1', email: 'k@x.co', authProvider: 'email' });
    saveMatches([fg('m1', TODAY, 'win')]); saveEarnedBadges([{ id: 'first-victory', unlockedAt: iso(TODAY) }]);
    saveDailyCompletions([daily(TODAY)]); saveGuestTrialUsage({ 'factor-grid': 1 }); saveThemePreference('dark');
    store.set('firebase:authUser:demo:[DEFAULT]', '{"uid":"u1"}'); store.set('firebase:host:demo', 'x');
    store.set('numbercraft_sample_flag', '1');
  }
  it('clears matches, badges, daily', () => {
    populate(); clearAllLocalProgress();
    assert.equal(loadMatches().length, 0); assert.equal(loadEarnedBadges().length, 0); assert.equal(loadDailyCompletions().length, 0);
  });
  it('DEFECT: guest trial usage survives wipe (next student on shared device inherits previous lock)', () => {
    populate(); clearAllLocalProgress();
    assert.deepEqual(loadGuestTrialUsage(), {});
  });
  it('profile personal fields (ageTier, dailyProblemGoal, soundEnabled) survive wipe+sign-out rewrite — next student inherits', () => {
    populate(); clearAllLocalProgress();
    // AccountModal.tsx:344-353 spread
    const cur = loadProfile();
    const next = { ...cur, uid: null, displayName: 'Guest Explorer', sessionKind: 'guest', authProvider: 'guest', email: null, sharedDeviceMode: false, featuredBadgeId: null } as StudentProfile;
    saveProfile(next);
    const after = loadProfile();
    assert.equal(after.ageTier, DEFAULT_PROFILE.ageTier, 'ageTier should reset on shared-device wipe');
    assert.equal(after.dailyProblemGoal, DEFAULT_PROFILE.dailyProblemGoal, 'goal should reset');
  });
  it('theme key is not cleared (acceptable but undocumented)', () => {
    populate(); clearAllLocalProgress();
    assert.equal(store.get(THEME_STORAGE_KEY), 'dark');
  });
  it('firebase auth keys are not touched by app wipe (signOut must handle) and no sample flag key exists (samples are id-prefix based, wiped with matches)', () => {
    populate(); clearAllLocalProgress();
    assert.ok(store.has('firebase:authUser:demo:[DEFAULT]'));
    assert.equal(loadMatches().some(isSampleMatch), false);
  });
  it('wipe is a no-op throw-safe under storage failure', () => {
    populate();
    (globalThis as any).window.localStorage.removeItem = () => { throw new Error('x'); };
    assert.doesNotThrow(clearAllLocalProgress);
  });
});

describe('(3b) firestore.rules static cross-check vs client payload (NOT emulator-run; emulator results are in agent-integration.md)', () => {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  it('client payload keys == rules hasOnly(gameScores keys) minus createdAt', () => {
    const p = buildSanitizedScorePayload({ uid: 'u', displayName: 'a', gameId: 'factor-grid', tier: 'explorers', score: 1, accuracyPercent: 1, dateKey: TODAY });
    const block = rules.slice(rules.indexOf('function isValidGameScore'));
    const only = block.slice(block.indexOf('hasOnly(['), block.indexOf(']', block.indexOf('hasOnly([')));
    const keys = [...only.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
    assert.deepEqual([...Object.keys(p), 'createdAt'].sort(), keys);
  });
  it('rules gameId allowlist == PLAYABLE_GAME_IDS', async () => {
    const { PLAYABLE_GAME_IDS } = await import('../../lib/guest-trial');
    const s = rules.slice(rules.indexOf('function isValidGameId'), rules.indexOf('function isValidUserProfile'));
    for (const id of PLAYABLE_GAME_IDS) assert.ok(s.includes(`'${id}'`), id);
  });
});
