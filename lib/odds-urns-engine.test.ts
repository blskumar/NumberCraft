import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeChamberOdds,
  createInitialSpinnerWheel,
  createInitialUrn,
  decideEvBotAction,
  evaluateOddsEstimate,
  executeChamberDraw,
  formatReducedFraction,
} from './odds-urns-engine';

describe('Odds & Urns Probability Engine (lib/odds-urns-engine.ts)', () => {
  it('computes exact fractions, percentages, and EV for Marble Urn across tiers', () => {
    const urn = createInitialUrn('challengers'); // 4 cobalt (+12), 3 emerald (+20), 3 hazard
    const wheel = createInitialSpinnerWheel('challengers');
    const odds0 = computeChamberOdds({
      chamber: 'marble-urn',
      tier: 'challengers',
      urnMarbles: urn,
      spinnerWheel: wheel,
      currentPot: 0,
    });

    assert.equal(odds0.safeNumerator, 7);
    assert.equal(odds0.denominator, 10);
    assert.equal(odds0.reducedFraction, '7/10');
    assert.equal(odds0.safePercent, 70);
    assert.equal(odds0.recommendation, 'press');
    assert.ok(odds0.expectedValueDelta > 10);

    // At pot = 60, E[Press] = (7/10 * 15.43) - (3/10 * 60) = 10.8 - 18 = -7.2 => bank
    const oddsHighPot = computeChamberOdds({
      chamber: 'marble-urn',
      tier: 'challengers',
      urnMarbles: urn,
      spinnerWheel: wheel,
      currentPot: 60,
    });
    assert.equal(oddsHighPot.recommendation, 'bank');
    assert.ok(oddsHighPot.expectedValueDelta < 0);
  });

  it('handles sampling without replacement for Challengers and with replacement for Explorers', () => {
    const challengersUrn = createInitialUrn('challengers');
    const wheel = createInitialSpinnerWheel('challengers');
    const res1 = executeChamberDraw({
      chamber: 'marble-urn',
      tier: 'challengers',
      urnMarbles: challengersUrn,
      spinnerWheel: wheel,
      rng: () => 0.01,
    });
    assert.equal(res1.outcome.safe, true);
    assert.equal(res1.nextUrn.length, challengersUrn.length - 1);

    const explorersUrn = createInitialUrn('explorers');
    const res2 = executeChamberDraw({
      chamber: 'marble-urn',
      tier: 'explorers',
      urnMarbles: explorersUrn,
      spinnerWheel: createInitialSpinnerWheel('explorers'),
      rng: () => 0.01,
    });
    assert.equal(res2.outcome.safe, true);
    assert.equal(res2.nextUrn.length, explorersUrn.length);
  });

  it('computes exact 36-outcome Twin Dice probabilities and Conditional Spinner upgrades', () => {
    const diceOdds = computeChamberOdds({
      chamber: 'twin-dice',
      tier: 'challengers',
      urnMarbles: [],
      spinnerWheel: createInitialSpinnerWheel('challengers'),
      currentPot: 0,
    });
    assert.equal(diceOdds.safeNumerator, 30);
    assert.equal(diceOdds.denominator, 36);
    assert.equal(diceOdds.reducedFraction, '5/6');
    assert.equal(formatReducedFraction(6, 8), '3/4');

    // Landing on Emerald Boost reduces hazard count by 1
    const baseWheel = createInitialSpinnerWheel('challengers'); // 5 cobalt, 3 emerald, 4 hazard
    const spin = executeChamberDraw({
      chamber: 'conditional-spinner',
      tier: 'challengers',
      urnMarbles: [],
      spinnerWheel: baseWheel,
      rng: () => 0.5, // sector 6 => emerald (indices 5..7)
    });
    assert.equal(spin.outcome.safe, true);
    assert.equal(spin.outcome.pointsGained, 22);
    assert.equal(spin.nextSpinner.hazardCount, baseWheel.hazardCount - 1);
    assert.equal(spin.nextSpinner.boosted, true);
  });

  it('scores probability calibration estimates and EV Bot decisions deterministically', () => {
    const exact = evaluateOddsEstimate(70, 70);
    assert.equal(exact.accurate, true);
    assert.equal(exact.bonusPoints, 10);

    const far = evaluateOddsEstimate(40, 70);
    assert.equal(far.accurate, false);
    assert.equal(far.bonusPoints, 0);

    const urn = createInitialUrn('challengers');
    const wheel = createInitialSpinnerWheel('challengers');
    const negEvOdds = computeChamberOdds({
      chamber: 'marble-urn',
      tier: 'challengers',
      urnMarbles: urn,
      spinnerWheel: wheel,
      currentPot: 60,
    });
    const decision = decideEvBotAction({
      odds: negEvOdds,
      currentPot: 60,
      difficulty: 'master',
      drawsThisTurn: 3,
    });
    assert.equal(decision.action, 'bank');
    assert.match(decision.reasoning, /Bot banks 60 pts/);
  });
});
