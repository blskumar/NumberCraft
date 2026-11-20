import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHistoricalCalibration,
  createAdaptiveSession,
  stepAdaptiveSession,
} from './adaptive-arithmetic';
import {
  buildArithmeticMatchRecord,
  generateArithmeticProblem,
  type ArithmeticRoundConfig,
} from './arithmetic-engine';
import type { MatchRecord } from './types';

function makeArithmeticHistoryMatch(overrides: {
  gameId?: 'addition-attack' | 'subtraction-sprint' | 'multiplication-mastery';
  tier?: 'explorers' | 'challengers' | 'strategists';
  solved?: number;
  attempted?: number;
  durationSeconds?: number;
  score?: number;
  endAdaptiveLevel?: number;
  playedAt?: string;
}): MatchRecord {
  const gameId = overrides.gameId ?? 'addition-attack';
  const tier = overrides.tier ?? 'challengers';
  const config: ArithmeticRoundConfig = {
    gameId,
    tier,
    pace: 'standard',
    untimed: false,
    startStage: 1,
    tableFocus: 'progressive',
    allowSignedStrategistSub: false,
    adaptiveDifficulty: true,
    adaptiveLevel: overrides.endAdaptiveLevel ?? 2,
  };
  return buildArithmeticMatchRecord({
    config,
    score: overrides.score ?? 150,
    solved: overrides.solved ?? 16,
    attempted: overrides.attempted ?? 16,
    bestStreak: 8,
    elapsedSeconds: overrides.durationSeconds ?? 60,
    maxStageReached: overrides.endAdaptiveLevel ?? 2,
    adaptiveEnabled: true,
    startAdaptiveLevel: 2,
    endAdaptiveLevel: overrides.endAdaptiveLevel ?? 2,
    peakAdaptiveLevel: overrides.endAdaptiveLevel ?? 2,
    playedAt: overrides.playedAt ?? '2026-11-18T12:00:00.000Z',
  });
}

describe('Adaptive Arithmetic Difficulty — Historical Calibration', () => {
  it('provides gentle fresh baselines when a student has no prior history', () => {
    const addCal = computeHistoricalCalibration([], 'addition-attack', 'challengers');
    assert.equal(addCal.startingLevel, 2);
    assert.equal(addCal.recentRoundsAnalyzed, 0);

    const subCal = computeHistoricalCalibration([], 'subtraction-sprint', 'explorers');
    assert.equal(subCal.startingLevel, 2);

    const mulCal = computeHistoricalCalibration([], 'multiplication-mastery', 'explorers');
    assert.equal(mulCal.startingLevel, 1);
  });

  it('elevates starting level for strong returning students with high accuracy & pace', () => {
    const history: MatchRecord[] = [
      makeArithmeticHistoryMatch({
        solved: 20,
        attempted: 20,
        durationSeconds: 60,
        score: 210,
        endAdaptiveLevel: 4,
        playedAt: '2026-11-18T14:00:00.000Z',
      }),
      makeArithmeticHistoryMatch({
        solved: 19,
        attempted: 20,
        durationSeconds: 60,
        score: 195,
        endAdaptiveLevel: 4,
        playedAt: '2026-11-18T13:00:00.000Z',
      }),
    ];

    const cal = computeHistoricalCalibration(history, 'addition-attack', 'challengers');
    assert.equal(cal.startingLevel, 5);
    assert.equal(cal.recentRoundsAnalyzed, 2);
    assert.ok((cal.avgAccuracyPercent ?? 0) >= 95);
  });

  it('eases starting level down to Level 1 Warm-Up when recent accuracy is low (< 55%)', () => {
    const history: MatchRecord[] = [
      makeArithmeticHistoryMatch({
        solved: 4,
        attempted: 10,
        durationSeconds: 60,
        score: 40,
        endAdaptiveLevel: 2,
        playedAt: '2026-11-18T14:00:00.000Z',
      }),
    ];

    const cal = computeHistoricalCalibration(history, 'addition-attack', 'challengers');
    assert.equal(cal.startingLevel, 1);
    assert.ok(cal.rationale.toLowerCase().includes('eased'));
  });

  it('isolates calibration per gameId and age tier', () => {
    const history: MatchRecord[] = [
      makeArithmeticHistoryMatch({
        gameId: 'addition-attack',
        tier: 'strategists',
        solved: 20,
        attempted: 20,
        score: 240,
        endAdaptiveLevel: 5,
      }),
    ];

    const explorersSub = computeHistoricalCalibration(
      history,
      'subtraction-sprint',
      'explorers'
    );
    assert.equal(explorersSub.recentRoundsAnalyzed, 0);
    assert.equal(explorersSub.startingLevel, 2);
  });
});

describe('Adaptive Arithmetic Difficulty — Live In-Session Stepping', () => {
  it('steps up after 3 fast accurate answers and enforces 3-turn cooldown against oscillation', () => {
    let state = createAdaptiveSession(2);

    state = stepAdaptiveSession(state, true, 2200);
    assert.equal(state.level, 2);
    assert.equal(state.lastAdjustment, null);

    state = stepAdaptiveSession(state, true, 2100);
    assert.equal(state.level, 2);
    assert.equal(state.lastAdjustment, null);

    state = stepAdaptiveSession(state, true, 2400);
    assert.equal(state.level, 3);
    assert.equal(state.peakLevel, 3);
    assert.equal(state.stepUps, 1);
    assert.equal(state.lastAdjustment?.direction, 'up');

    // Immediately after stepping up, cooldown prevents jumping to 4 on turns 1 & 2
    state = stepAdaptiveSession(state, true, 1800);
    assert.equal(state.level, 3);
    state = stepAdaptiveSession(state, true, 1800);
    assert.equal(state.level, 3);
    // On turn 3 of cooldown with 3-streak + fast pace, steps up to 4
    state = stepAdaptiveSession(state, true, 1800);
    assert.equal(state.level, 4);
    assert.equal(state.stepUps, 2);
  });

  it('steps down promptly after 2 consecutive misses and enables gentle auto-hint', () => {
    let state = createAdaptiveSession(3);

    state = stepAdaptiveSession(state, false, 6000);
    assert.equal(state.level, 3);
    assert.equal(state.suggestHint, false);

    state = stepAdaptiveSession(state, false, 7000);
    assert.equal(state.level, 2);
    assert.equal(state.stepDowns, 1);
    assert.equal(state.suggestHint, true);
    assert.equal(state.lastAdjustment?.direction, 'down');
  });

  it('never drops below Level 1 and still offers non-punitive hint cue on 2 misses at Level 1', () => {
    let state = createAdaptiveSession(1);
    state = stepAdaptiveSession(state, false, 5000);
    state = stepAdaptiveSession(state, false, 5500);
    assert.equal(state.level, 1);
    assert.equal(state.stepDowns, 0);
    assert.equal(state.suggestHint, true);
  });
});

describe('Adaptive Difficulty Integration with Problem Generator', () => {
  it('generates no-carry friendly sums for Challengers Level 1 Addition Attack', () => {
    const cfg: ArithmeticRoundConfig = {
      gameId: 'addition-attack',
      tier: 'challengers',
      pace: 'standard',
      untimed: false,
      startStage: 1,
      tableFocus: 'progressive',
      allowSignedStrategistSub: false,
      adaptiveDifficulty: true,
      adaptiveLevel: 1,
    };
    for (let i = 0; i < 20; i += 1) {
      const p = generateArithmeticProblem(cfg, i);
      assert.equal(p.stage, 1);
      assert.ok((p.left % 10) + (p.right % 10) <= 9, 'Lv 1 Challengers addition avoids ones-carry');
      assert.equal(p.left + p.right, p.answer);
    }
  });

  it('generates no-borrow friendly differences for Challengers Level 1 Subtraction Sprint', () => {
    const cfg: ArithmeticRoundConfig = {
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      pace: 'standard',
      untimed: false,
      startStage: 1,
      tableFocus: 'progressive',
      allowSignedStrategistSub: false,
      adaptiveDifficulty: true,
      adaptiveLevel: 1,
    };
    for (let i = 0; i < 20; i += 1) {
      const p = generateArithmeticProblem(cfg, i);
      assert.equal(p.stage, 1);
      assert.ok((p.left % 10) >= (p.right % 10), 'Lv 1 Challengers subtraction avoids borrowing');
      assert.equal(p.left - p.right, p.answer);
    }
  });

  it('aligns Multiplication Mastery progressive ladder directly to adaptiveLevel', () => {
    const cfg: ArithmeticRoundConfig = {
      gameId: 'multiplication-mastery',
      tier: 'explorers',
      pace: 'standard',
      untimed: false,
      startStage: 1,
      tableFocus: 'progressive',
      allowSignedStrategistSub: false,
      adaptiveDifficulty: true,
      adaptiveLevel: 4,
    };
    const p = generateArithmeticProblem(cfg, 0);
    assert.equal(p.stage, 4);
    assert.equal(p.left * p.right, p.answer);
    assert.ok(p.stageLabel.includes('Stage 4'));
  });
});
