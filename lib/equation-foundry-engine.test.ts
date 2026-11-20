import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateFoundryTokens,
  formatFoundryTokens,
  generateFoundryPuzzle,
  scoreFoundrySubmission,
  solveFoundryPuzzle,
  type FoundryToken,
} from './equation-foundry-engine';

describe('Equation Foundry Engine (lib/equation-foundry-engine.ts)', () => {
  it('evaluates PEMDAS order of operations, parentheses, division, and squares accurately', () => {
    // (9 + 4) × 6 = 78
    const tokens1: FoundryToken[] = [
      { kind: 'op', op: '(' },
      { kind: 'tile', tileId: 't1', value: 9 },
      { kind: 'op', op: '+' },
      { kind: 'tile', tileId: 't2', value: 4 },
      { kind: 'op', op: ')' },
      { kind: 'op', op: '×' },
      { kind: 'tile', tileId: 't3', value: 6 },
    ];
    const r1 = evaluateFoundryTokens(tokens1);
    assert.equal(r1.valid, true);
    assert.equal(r1.value, 78);
    assert.equal(formatFoundryTokens(tokens1), '(9 + 4) × 6');

    // 12² + 5 × 4 = 164
    const tokens2: FoundryToken[] = [
      { kind: 'tile', tileId: 'a', value: 12 },
      { kind: 'op', op: '²' },
      { kind: 'op', op: '+' },
      { kind: 'tile', tileId: 'b', value: 5 },
      { kind: 'op', op: '×' },
      { kind: 'tile', tileId: 'c', value: 4 },
    ];
    const r2 = evaluateFoundryTokens(tokens2);
    assert.equal(r2.valid, true);
    assert.equal(r2.value, 164);
  });

  it('rejects duplicate tile reuse, unbalanced parentheses, and division by zero', () => {
    const dup = evaluateFoundryTokens([
      { kind: 'tile', tileId: 't1', value: 5 },
      { kind: 'op', op: '+' },
      { kind: 'tile', tileId: 't1', value: 5 },
    ]);
    assert.equal(dup.valid, false);

    const divZero = evaluateFoundryTokens([
      { kind: 'tile', tileId: 't1', value: 12 },
      { kind: 'op', op: '÷' },
      { kind: 'op', op: '(' },
      { kind: 'tile', tileId: 't2', value: 4 },
      { kind: 'op', op: '−' },
      { kind: 'tile', tileId: 't3', value: 4 },
      { kind: 'op', op: ')' },
    ]);
    assert.equal(divZero.valid, false);
    assert.match(divZero.error ?? '', /divide by zero/i);
  });

  it('generates guaranteed-solvable puzzles across Explorers, Challengers, and Strategists', () => {
    for (const tier of ['explorers', 'challengers', 'strategists'] as const) {
      for (let r = 1; r <= 3; r++) {
        const puzzle = generateFoundryPuzzle(tier, r, 10);
        assert.equal(puzzle.tiles.length, 5);
        assert.equal(
          puzzle.solverSolution.exact,
          true,
          `Expected exact solution for ${tier} round ${r} target ${puzzle.target}`
        );
        assert.equal(puzzle.solverSolution.value, puzzle.target);
      }
    }
  });

  it('Expression Solver AI finds exact targets from arbitrary tiles', () => {
    const solved = solveFoundryPuzzle(
      [
        { id: '1', value: 9 },
        { id: '2', value: 4 },
        { id: '3', value: 6 },
        { id: '4', value: 2 },
      ],
      78,
      'challengers'
    );
    assert.equal(solved.exact, true);
    assert.equal(solved.value, 78);
  });

  it('awards exact craft bonus, partial precision points, and hint adjustment accurately', () => {
    const exact = scoreFoundrySubmission({
      value: 78,
      target: 78,
      usedTileCount: 3,
      hintUsed: false,
    });
    assert.equal(exact.exact, true);
    assert.equal(exact.points, 115);

    const close = scoreFoundrySubmission({
      value: 76,
      target: 78,
      usedTileCount: 3,
      hintUsed: false,
    });
    assert.equal(close.exact, false);
    assert.equal(close.distance, 2);
    assert.ok(close.points > 40 && close.points < 100);
  });
});
