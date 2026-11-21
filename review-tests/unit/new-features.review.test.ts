import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyMilestoneForDate,
  evaluateDailyMilestone,
  isMatchForDailyMilestoneArena,
  applyMilestoneMultiplier,
  DAILY_MILESTONE_MULTIPLIER,
} from '../../lib/daily-milestone';
import { countProblemsSolvedOnDate, computeDailyGoalProgress } from '../../lib/daily-goal';
import { buildDailyLeaderboard } from '../../lib/daily-leaderboard';
import {
  formatElapsedSessionClock,
  selectNextMasterySeal,
  buildEndOfSessionSummary,
} from '../../lib/session-tracker';
import { evaluateAchievements } from '../../lib/achievements';
import {
  resolveEffectiveTheme,
  cycleThemePreference,
  isValidThemePreference,
} from '../../lib/theme';
import { buildFoundryMatchRecord } from '../../lib/equation-foundry-engine';
import { buildOddsUrnsMatchRecord } from '../../lib/odds-urns-engine';
import { DEFAULT_PROFILE } from '../../lib/storage';
import type { MatchRecord, DailyChallengeCompletion } from '../../lib/types';

const TODAY = '2026-11-20';
const NOON = '2026-11-20T12:00:00.000Z';

function foundry(result: 'win' | 'loss', playerScore: number, opp: number): MatchRecord {
  const r = buildFoundryMatchRecord({
    tier: 'challengers',
    mode: 'vs-ai',
    aiDifficulty: 'scholar',
    playerScore,
    opponentScore: opp,
    exactHits: 0,
    roundsPlayed: 5,
  });
  return { ...r, result, playedAt: NOON, id: `f-${Math.random()}` };
}

describe('daily-milestone', () => {
  it('rotation covers all 6 arenas in 6 consecutive days', () => {
    const ids = new Set<string>();
    for (let d = 1; d <= 6; d++) {
      ids.add(getDailyMilestoneForDate(`2026-12-0${d}`).arenaId);
    }
    assert.equal(ids.size, 6);
  });

  it('REVIEW FINDING: invalid date key must not throw', () => {
    assert.doesNotThrow(() => getDailyMilestoneForDate('not-a-date'));
  });

  it('REVIEW FINDING: empty date key must not throw', () => {
    assert.doesNotThrow(() => getDailyMilestoneForDate(''));
  });

  it('matcher is exclusive: a Foundry match is not a Factor Grid match', () => {
    const m = foundry('win', 90, 40);
    assert.equal(isMatchForDailyMilestoneArena(m, 'equation-foundry'), true);
    assert.equal(isMatchForDailyMilestoneArena(m, 'factor-grid'), false);
    assert.equal(isMatchForDailyMilestoneArena(m, 'odds-urns'), false);
  });

  it('applyMilestoneMultiplier handles bad input', () => {
    assert.equal(applyMilestoneMultiplier(NaN, 1.5), 0);
    assert.equal(applyMilestoneMultiplier(-3, 1.5), 0);
    assert.equal(applyMilestoneMultiplier(4, undefined), 4);
    assert.equal(applyMilestoneMultiplier(4, 1.5), 6);
  });

  it('evaluateDailyMilestone only counts matches played today', () => {
    const spec = getDailyMilestoneForDate(TODAY);
    const st = evaluateDailyMilestone([], TODAY);
    assert.equal(st.completedToday, false);
    assert.equal(st.milestone.arenaId, spec.arenaId);
  });
});

describe('daily-goal', () => {
  it('REVIEW FINDING: a LOST Equation Foundry match with 0 exact hits earns +5 problems', () => {
    const lost = foundry('loss', 0, 80);
    const n = countProblemsSolvedOnDate([lost], [], TODAY);
    assert.ok(n < 5, `credited ${n} problems for a match with 0 solved`);
  });

  it('REVIEW FINDING: a lost Odds & Urns match earns +5 problems', () => {
    const r = buildOddsUrnsMatchRecord({
      tier: 'challengers',
      mode: 'vs-ai',
      aiDifficulty: 'scholar',
      chamber: 'marble-urn' as never,
      playerScore: 0,
      opponentScore: 99,
    });
    const n = countProblemsSolvedOnDate([{ ...r, playedAt: NOON }], [], TODAY);
    assert.ok(n < 5, `credited ${n} problems for a lost match`);
  });

  it('REVIEW FINDING: milestone multiplier inflates "problems solved" count above real solves', () => {
    const m: MatchRecord = {
      id: 'a1',
      gameTitle: 'Addition Attack',
      mode: 'solo',
      tier: 'challengers',
      variant: 'classic',
      playerScore: 100,
      opponentScore: 0,
      opponentName: 'Par',
      result: 'win',
      primesClaimed: 0,
      playedAt: NOON,
      arithmeticMeta: { gameId: 'addition-attack', solved: 8, attempted: 10 } as never,
      dailyMilestoneMultiplier: DAILY_MILESTONE_MULTIPLIER,
    };
    assert.equal(countProblemsSolvedOnDate([m], [], TODAY), 8);
  });

  it('ring percent is clamped 0..100 and goal 0 does not divide by zero', () => {
    const p = computeDailyGoalProgress({ matches: [], dailyCompletions: [], todayKey: TODAY, dailyProblemGoal: 0 });
    assert.ok(Number.isFinite(p.ringPercent) && p.ringPercent >= 0 && p.ringPercent <= 100);
  });

  it('REVIEW FINDING: next-streak copy only names seals that exist', () => {
    const daily: DailyChallengeCompletion[] = [];
    const p = computeDailyGoalProgress({ matches: [], dailyCompletions: daily, todayKey: TODAY });
    const ev = evaluateAchievements([], [], []);
    const titles = ev.statuses.map((s) => s.definition.title);
    const promised = ['7-Day Consistent Compass', '14-Day Master Flame'];
    for (const t of promised) assert.ok(titles.includes(t), `UI promises "${t}" but no such seal exists`);
    assert.ok(p.nextStreakBadgeTitle);
  });
});

describe('daily-leaderboard', () => {
  it('is deterministic per date', () => {
    const a = buildDailyLeaderboard({ profile: DEFAULT_PROFILE, dailyCompletions: [], todayKey: TODAY });
    const b = buildDailyLeaderboard({ profile: DEFAULT_PROFILE, dailyCompletions: [], todayKey: TODAY });
    assert.deepEqual(a.topFive.map((e) => e.id), b.topFive.map((e) => e.id));
    assert.equal(a.topFive.length, 5);
  });

  it('REVIEW FINDING: simulated cohort entries are not flagged as simulated', () => {
    const a = buildDailyLeaderboard({ profile: DEFAULT_PROFILE, dailyCompletions: [], todayKey: TODAY });
    const e = a.topFive[0] as unknown as Record<string, unknown>;
    assert.ok(
      'isSimulated' in e || 'simulated' in e || 'isDemo' in e,
      'entries carry fake human names + scores with no machine-readable simulated flag'
    );
  });

  it('student sharing a roster name gets exactly one row', () => {
    const profile = { ...DEFAULT_PROFILE, displayName: 'Maya Lin' };
    const s = buildDailyLeaderboard({ profile, dailyCompletions: [], todayKey: TODAY });
    assert.equal(s.topFive.filter((e) => e.displayName === 'Maya Lin').length <= 1, true);
  });
});

describe('session-tracker', () => {
  it('clock formatting', () => {
    assert.equal(formatElapsedSessionClock(65), '01:05');
    assert.equal(formatElapsedSessionClock(3725), '1:02:05');
  });

  it('REVIEW FINDING: NaN seconds renders garbage', () => {
    assert.doesNotMatch(formatElapsedSessionClock(NaN), /NaN/);
  });

  it('accuracy is null with zero attempts and capped at 100', () => {
    const ev = evaluateAchievements([], [], []);
    const s = buildEndOfSessionSummary({
      arenaTab: 'play-arithmetic',
      arenaLabel: 'x',
      elapsedSeconds: 5,
      problemsSolved: 9,
      problemsAttempted: 0,
      matchesRecorded: 0,
      newlyEarnedSeals: [],
      evaluation: ev,
    });
    assert.equal(s.accuracyPercent, null);
    assert.ok(selectNextMasterySeal(ev));
  });
});

describe('achievements x milestone multiplier', () => {
  it('REVIEW FINDING: 2 boosted Factor Grid wins must not unlock the 3-win streak seal / show fractional progress', () => {
    const mk = (i: number): MatchRecord => ({
      ...foundry('win', 90, 10),
      gameTitle: 'Factor Grid',
      id: `w${i}`,
      playedAt: `2026-11-20T0${i}:00:00.000Z`,
      dailyMilestoneMultiplier: 1.5,
    } as MatchRecord);
    const one = evaluateAchievements([mk(1)], [], []).statuses.find((s) => s.definition.id === 'perfect-streak')!;
    assert.ok(Number.isInteger(one.current), `1 win shows streak ${one.current}`);
    const two = evaluateAchievements([mk(1), mk(2)], [], []).statuses.find((s) => s.definition.id === 'perfect-streak')!;
    assert.equal(two.earned, false, '3-consecutive-win seal earned after only 2 wins');
  });

  it('REVIEW FINDING: Foundry/Odds wins must not unlock Factor-Grid-only seals', () => {
    const wins: MatchRecord[] = Array.from({ length: 6 }, (_, i) => ({
      ...foundry('win', 400, 10),
      id: `w${i}`,
      playedAt: `2026-11-1${i}T10:00:00.000Z`,
    }));
    const ev = evaluateAchievements(wins, [], []);
    const earned = ev.statuses.filter((s) => s.earned).map((s) => s.definition.id);
    const fgOnly = ['top-scorer', 'prime-collector', 'master-strategist', 'taxman-victor'];
    const leaked = earned.filter((id) => fgOnly.includes(id));
    assert.deepEqual(leaked, [], `Factor-Grid-only seals unlocked by Foundry wins: ${leaked}`);
  });
});

describe('theme', () => {
  it('resolve / cycle / validate', () => {
    assert.equal(resolveEffectiveTheme('system', true), 'dark');
    assert.equal(resolveEffectiveTheme('light', true), 'light');
    assert.equal(cycleThemePreference('system'), 'light');
    assert.equal(isValidThemePreference('purple'), false);
  });
});
