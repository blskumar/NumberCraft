import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveGuestTrials,
  incrementGuestTrialUsage,
  isGuestGameLocked,
  resolveGameIdFromMatch,
} from './guest-trial';
import type { MatchRecord } from './types';

describe('Free Guest Trial Enforcement (lib/guest-trial.ts)', () => {
  it('allows guests to play 1 free level per game, then locks that game while keeping other games unlocked', () => {
    const emptyUsage = computeEffectiveGuestTrials({}, [], []);
    assert.equal(
      isGuestGameLocked({
        isSignedIn: false,
        gameId: 'addition-attack',
        trialUsage: emptyUsage,
      }),
      false
    );

    const afterOne = incrementGuestTrialUsage({}, 'addition-attack');
    const effective = computeEffectiveGuestTrials(afterOne, [], []);

    // Addition Attack is now locked for guests after 1 trial level
    assert.equal(
      isGuestGameLocked({
        isSignedIn: false,
        gameId: 'addition-attack',
        trialUsage: effective,
      }),
      true
    );

    // Other games remain open for their 1 free level
    assert.equal(
      isGuestGameLocked({
        isSignedIn: false,
        gameId: 'factor-grid',
        trialUsage: effective,
      }),
      false
    );
    assert.equal(
      isGuestGameLocked({
        isSignedIn: false,
        gameId: 'equation-foundry',
        trialUsage: effective,
      }),
      false
    );

    // Registered / signed-in users are never locked
    assert.equal(
      isGuestGameLocked({
        isSignedIn: true,
        gameId: 'addition-attack',
        trialUsage: effective,
      }),
      false
    );
  });

  it('ignores sample dashboard matches when computing guest trial lock state', () => {
    const sampleMatch: MatchRecord = {
      id: 'sample-dash-arith-1',
      gameTitle: 'Addition Attack',
      mode: 'solo',
      tier: 'challengers',
      variant: 'classic',
      playerScore: 180,
      opponentScore: 130,
      opponentName: 'Par',
      result: 'win',
      primesClaimed: 0,
      playedAt: '2026-11-20T15:00:00.000Z',
      arithmeticMeta: {
        gameId: 'addition-attack',
        pace: 'standard',
        solved: 14,
        attempted: 15,
        accuracyPercent: 93,
        bestStreak: 6,
        durationSeconds: 60,
      },
    };
    const realMatch: MatchRecord = {
      ...sampleMatch,
      id: 'real-ef-1',
      gameTitle: 'Equation Foundry',
      arithmeticMeta: undefined,
    };

    assert.equal(resolveGameIdFromMatch(realMatch), 'equation-foundry');

    const effective = computeEffectiveGuestTrials(
      {},
      [sampleMatch, realMatch],
      []
    );
    assert.equal(effective['addition-attack'], 0);
    assert.equal(effective['equation-foundry'], 1);
  });
});
