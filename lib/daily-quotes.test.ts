import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_MATH_QUOTES, getDailyMathQuote } from './daily-quotes';

describe('Daily Mathematician Quotes (lib/daily-quotes.ts)', () => {
  it('returns the exact same quote deterministically for a given dateKey', () => {
    const first = getDailyMathQuote('2026-11-19');
    const second = getDailyMathQuote('2026-11-19');
    assert.deepEqual(first, second);
    assert.equal(first.total, DAILY_MATH_QUOTES.length);
  });

  it('rotates through distinct quotes on consecutive calendar days without immediate repeats', () => {
    const day1 = getDailyMathQuote('2026-11-19');
    const day2 = getDailyMathQuote('2026-11-20');
    const day3 = getDailyMathQuote('2026-11-21');

    assert.notEqual(day1.quote.id, day2.quote.id);
    assert.notEqual(day2.quote.id, day3.quote.id);
    assert.equal(day2.index, (day1.index + 1) % DAILY_MATH_QUOTES.length);
  });

  it('wraps cleanly across positive and negative browse offsets', () => {
    const today = getDailyMathQuote('2026-11-19', 0);
    const fullCycle = getDailyMathQuote(
      '2026-11-19',
      DAILY_MATH_QUOTES.length
    );
    const prev = getDailyMathQuote('2026-11-19', -1);

    assert.equal(today.quote.id, fullCycle.quote.id);
    assert.equal(
      prev.index,
      (today.index - 1 + DAILY_MATH_QUOTES.length) % DAILY_MATH_QUOTES.length
    );
  });

  it('contains well-formed unique entries for every quote in the catalog', () => {
    const ids = new Set<string>();
    for (const q of DAILY_MATH_QUOTES) {
      assert.ok(q.id.length > 0);
      assert.ok(q.text.length > 15);
      assert.ok(q.author.length > 2);
      assert.ok(q.specialty.length > 2);
      assert.ok(!ids.has(q.id), `Duplicate quote id: ${q.id}`);
      ids.add(q.id);
    }
  });
});
