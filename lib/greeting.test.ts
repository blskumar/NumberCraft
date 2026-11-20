import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStudioGreeting } from './greeting';

describe('getStudioGreeting', () => {
  it('returns morning greeting for hours 5 through 11', () => {
    for (const hour of [5, 7, 11]) {
      const result = getStudioGreeting(hour);
      assert.equal(result.period, 'morning');
      assert.equal(result.headline, 'Good morning, scholar!');
    }
  });

  it('returns afternoon greeting for hours 12 through 16', () => {
    for (const hour of [12, 14, 16]) {
      const result = getStudioGreeting(hour);
      assert.equal(result.period, 'afternoon');
      assert.equal(result.headline, 'Good afternoon, scholar!');
    }
  });

  it('returns evening greeting for hours 17 through 20', () => {
    for (const hour of [17, 19, 20]) {
      const result = getStudioGreeting(hour);
      assert.equal(result.period, 'evening');
      assert.equal(result.headline, 'Good evening, scholar!');
    }
  });

  it('returns late-night greeting for hours 21 through 4', () => {
    for (const hour of [21, 23, 0, 2, 4]) {
      const result = getStudioGreeting(hour);
      assert.equal(result.period, 'night');
      assert.equal(result.headline, 'Late-night study, scholar!');
    }
  });

  it('personalizes with custom player first name and falls back to scholar for Guest Explorer', () => {
    assert.equal(
      getStudioGreeting(8, 'Guest Explorer').headline,
      'Good morning, scholar!'
    );
    assert.equal(
      getStudioGreeting(8, 'Maya Lin').headline,
      'Good morning, Maya!'
    );
    assert.equal(
      getStudioGreeting(15, '  Aarav  ').headline,
      'Good afternoon, Aarav!'
    );
  });

  it('returns hydration-safe fallback when hour is null', () => {
    const result = getStudioGreeting(null, 'Guest Explorer');
    assert.equal(result.headline, 'Welcome back, scholar!');
  });
});
