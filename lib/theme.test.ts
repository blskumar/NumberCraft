import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cycleThemePreference,
  getThemeLabel,
  isValidThemePreference,
  resolveEffectiveTheme,
} from './theme';

describe('Theme Mode Resolution (lib/theme.ts)', () => {
  it('resolves light, dark, and system theme preferences deterministically', () => {
    assert.equal(resolveEffectiveTheme('light', true), 'light');
    assert.equal(resolveEffectiveTheme('light', false), 'light');
    assert.equal(resolveEffectiveTheme('dark', false), 'dark');
    assert.equal(resolveEffectiveTheme('dark', true), 'dark');
    assert.equal(resolveEffectiveTheme('system', true), 'dark');
    assert.equal(resolveEffectiveTheme('system', false), 'light');
  });

  it('cycles cleanly through light -> dark -> system -> light', () => {
    assert.equal(cycleThemePreference('light'), 'dark');
    assert.equal(cycleThemePreference('dark'), 'system');
    assert.equal(cycleThemePreference('system'), 'light');
  });

  it('validates preference strings and returns human-readable labels', () => {
    assert.equal(isValidThemePreference('light'), true);
    assert.equal(isValidThemePreference('dark'), true);
    assert.equal(isValidThemePreference('system'), true);
    assert.equal(isValidThemePreference('neon'), false);
    assert.equal(getThemeLabel('light'), 'Light');
    assert.equal(getThemeLabel('dark'), 'Dark');
    assert.equal(getThemeLabel('system'), 'System');
  });
});
