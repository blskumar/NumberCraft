import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArithmeticHint,
  buildArithmeticMatchRecord,
  calculateAnswerPoints,
  computeProgressiveStage,
  CORRECT_ANSWERS_PER_STAGE,
  generateArithmeticProblem,
  getParTargetScore,
  type ArithmeticRoundConfig,
} from './arithmetic-engine';
import { evaluateAchievements } from './achievements';

function createSeededRng(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('Addition Attack generates exact sums scaled by difficulty tier', () => {
  const rng = createSeededRng(101);
  const explorerCfg: ArithmeticRoundConfig = {
    gameId: 'addition-attack',
    tier: 'explorers',
    pace: 'standard',
    untimed: false,
    startStage: 1,
    tableFocus: 'progressive',
    allowSignedStrategistSub: false,
  };
  const strategistCfg: ArithmeticRoundConfig = {
    ...explorerCfg,
    tier: 'strategists',
  };

  for (let i = 0; i < 25; i++) {
    const eProb = generateArithmeticProblem(explorerCfg, i, undefined, rng);
    assert.equal(eProb.operator, '+');
    assert.equal(eProb.answer, eProb.left + eProb.right);
    assert.ok(eProb.answer <= 40, `Explorer sum ${eProb.answer} stayed <= 40`);

    const sProb = generateArithmeticProblem(strategistCfg, i, undefined, rng);
    assert.equal(sProb.answer, sProb.left + sProb.right);
    assert.ok(sProb.answer >= 80, `Strategist sum ${sProb.answer} scaled up`);
  }
});

test('Subtraction Sprint keeps Explorers & Challengers strictly positive and supports signed Strategists', () => {
  const rng = createSeededRng(202);
  const explorerCfg: ArithmeticRoundConfig = {
    gameId: 'subtraction-sprint',
    tier: 'explorers',
    pace: 'standard',
    untimed: false,
    startStage: 1,
    tableFocus: 'progressive',
    allowSignedStrategistSub: false,
  };
  const challengerCfg: ArithmeticRoundConfig = {
    ...explorerCfg,
    tier: 'challengers',
  };
  const signedStrategistCfg: ArithmeticRoundConfig = {
    ...explorerCfg,
    tier: 'strategists',
    allowSignedStrategistSub: true,
  };

  for (let i = 0; i < 40; i++) {
    const eProb = generateArithmeticProblem(explorerCfg, i, undefined, rng);
    assert.equal(eProb.operator, '−');
    assert.equal(eProb.answer, eProb.left - eProb.right);
    assert.ok(eProb.answer > 0, 'Explorers subtraction must stay positive');

    const cProb = generateArithmeticProblem(challengerCfg, i, undefined, rng);
    assert.equal(cProb.answer, cProb.left - cProb.right);
    assert.ok(cProb.answer > 0, 'Challengers subtraction must stay positive');
  }

  let sawNegative = false;
  for (let i = 0; i < 40; i++) {
    const sProb = generateArithmeticProblem(
      signedStrategistCfg,
      i,
      undefined,
      rng
    );
    assert.equal(sProb.answer, sProb.left - sProb.right);
    assert.equal(sProb.allowNegative, true);
    if (sProb.answer < 0) sawNegative = true;
  }
  assert.ok(sawNegative, 'Signed Strategist mode should generate negative differences');
});

test('Multiplication Mastery advances progressively through 5 harder table stages and respects focus bands', () => {
  assert.equal(computeProgressiveStage(1, 0), 1);
  assert.equal(computeProgressiveStage(1, CORRECT_ANSWERS_PER_STAGE - 1), 1);
  assert.equal(computeProgressiveStage(1, CORRECT_ANSWERS_PER_STAGE), 2);
  assert.equal(computeProgressiveStage(1, CORRECT_ANSWERS_PER_STAGE * 4), 5);
  assert.equal(computeProgressiveStage(1, 99), 5);

  const rng = createSeededRng(303);
  const progCfg: ArithmeticRoundConfig = {
    gameId: 'multiplication-mastery',
    tier: 'explorers',
    pace: 'standard',
    untimed: false,
    startStage: 1,
    tableFocus: 'progressive',
    allowSignedStrategistSub: false,
  };

  const stage1 = generateArithmeticProblem(progCfg, 0, undefined, rng);
  const stage5 = generateArithmeticProblem(
    progCfg,
    CORRECT_ANSWERS_PER_STAGE * 4,
    undefined,
    rng
  );
  assert.equal(stage1.stage, 1);
  assert.equal(stage5.stage, 5);
  assert.equal(stage1.answer, stage1.left * stage1.right);
  assert.equal(stage5.answer, stage5.left * stage5.right);

  const coreFocusCfg: ArithmeticRoundConfig = {
    ...progCfg,
    tableFocus: 'core-6-9',
  };
  for (let i = 0; i < 20; i++) {
    const p = generateArithmeticProblem(coreFocusCfg, i, undefined, rng);
    assert.ok(
      (p.left >= 6 && p.left <= 9) || (p.right >= 6 && p.right <= 9),
      `Expected one factor in 6..9, got ${p.left}×${p.right}`
    );
  }
});

test('Scoring, mental math hints, and MatchRecord isolation from Factor Grid seals work accurately', () => {
  assert.equal(calculateAnswerPoints(false, 0, 3), 0);
  assert.ok(
    calculateAnswerPoints(true, 4, 3) > calculateAnswerPoints(true, 1, 1)
  );
  assert.ok(buildArithmeticHint(48, 37, '+').includes('Split'));
  assert.ok(buildArithmeticHint(63, 28, '−').length > 10);
  assert.ok(buildArithmeticHint(8, 9, '×').includes('10'));

  const cfg: ArithmeticRoundConfig = {
    gameId: 'multiplication-mastery',
    tier: 'explorers',
    pace: 'standard',
    untimed: false,
    startStage: 1,
    tableFocus: 'progressive',
    allowSignedStrategistSub: false,
  };
  const par = getParTargetScore(cfg.gameId, cfg.tier, cfg.pace, cfg.untimed);
  const record = buildArithmeticMatchRecord({
    config: cfg,
    score: par + 40,
    solved: 15,
    attempted: 16,
    bestStreak: 9,
    elapsedSeconds: 60,
    maxStageReached: 4,
  });

  assert.equal(record.gameTitle, 'Multiplication Mastery');
  assert.equal(record.result, 'win');
  assert.equal(record.arithmeticMeta?.accuracyPercent, 94);
  assert.equal(record.arithmeticMeta?.maxStageReached, 4);

  // Arithmetic rounds must NOT falsely unlock Factor Grid Mastery Seals
  const evalResult = evaluateAchievements([record], []);
  assert.equal(evalResult.earnedCount, 0);
});
