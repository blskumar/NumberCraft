import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAchievements } from './achievements';
import {
  buildEndOfSessionSummary,
  formatElapsedSessionClock,
  isActiveGameTab,
  selectNextMasterySeal,
} from './session-tracker';

describe('Session Tracker & End-of-Session Summary (lib/session-tracker.ts)', () => {
  it('formats elapsed session clocks accurately into mm:ss and h:mm:ss', () => {
    assert.equal(formatElapsedSessionClock(0), '00:00');
    assert.equal(formatElapsedSessionClock(9), '00:09');
    assert.equal(formatElapsedSessionClock(65), '01:05');
    assert.equal(formatElapsedSessionClock(3661), '1:01:01');
  });

  it('identifies active game arenas vs. non-arena studio views', () => {
    assert.equal(isActiveGameTab('play-arithmetic'), true);
    assert.equal(isActiveGameTab('play-factor-grid'), true);
    assert.equal(isActiveGameTab('daily'), true);
    assert.equal(isActiveGameTab('play-equation-foundry'), true);
    assert.equal(isActiveGameTab('play-odds-urns'), true);
    assert.equal(isActiveGameTab('studio'), false);
    assert.equal(isActiveGameTab('dashboard'), false);
    assert.equal(isActiveGameTab('notebook'), false);
  });

  it('computes End-of-Session accuracy and picks the closest unearned Mastery Seal', () => {
    const evalZero = evaluateAchievements([], [], []);
    const nextSeal = selectNextMasterySeal(evalZero);
    assert.ok(nextSeal !== null);
    assert.equal(nextSeal.earned, false);

    const summary = buildEndOfSessionSummary({
      arenaTab: 'play-arithmetic',
      arenaLabel: 'Core Arithmetic',
      elapsedSeconds: 83,
      problemsSolved: 9,
      problemsAttempted: 10,
      matchesRecorded: 1,
      newlyEarnedSeals: [],
      evaluation: evalZero,
    });

    assert.equal(summary.accuracyPercent, 90);
    assert.equal(summary.problemsSolved, 9);
    assert.equal(summary.elapsedSeconds, 83);
    assert.ok(summary.nextSeal !== null);
  });
});
