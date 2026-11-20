import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStudioTabA11yMeta } from './studio-a11y';
import type { StudioTab } from '@/components/TopNav';
import type { ArithmeticGameId } from './types';

describe('Studio Tab Accessibility Metadata (lib/studio-a11y.ts)', () => {
  it('provides unique region labels and announcements for every studio tab', () => {
    const tabs: StudioTab[] = [
      'studio',
      'daily',
      'dashboard',
      'play-arithmetic',
      'play-factor-grid',
      'play-equation-foundry',
      'play-odds-urns',
      'rooms',
      'notebook',
      'rules',
    ];
    const labels = new Set<string>();
    const ids = new Set<string>();

    for (const tab of tabs) {
      const meta = getStudioTabA11yMeta(tab, 'addition-attack');
      assert.ok(meta.regionLabel.length > 5);
      assert.ok(meta.announcement.startsWith('Switched to '));
      assert.ok(!labels.has(meta.regionLabel));
      assert.ok(!ids.has(meta.containerId));
      labels.add(meta.regionLabel);
      ids.add(meta.containerId);
    }
  });

  it('customizes arithmetic arena labels and announcements per arithmetic game', () => {
    const games: [ArithmeticGameId, string][] = [
      ['addition-attack', 'Addition Attack'],
      ['subtraction-sprint', 'Subtraction Sprint'],
      ['multiplication-mastery', 'Multiplication Mastery'],
    ];

    for (const [gameId, expectedName] of games) {
      const meta = getStudioTabA11yMeta('play-arithmetic', gameId);
      assert.equal(meta.isGameArena, true);
      assert.ok(meta.regionLabel.includes(expectedName));
      assert.ok(meta.announcement.includes(expectedName));
    }
  });

  it('flags active game arenas accurately for ARIA role descriptions', () => {
    assert.equal(
      getStudioTabA11yMeta('daily', 'addition-attack').isGameArena,
      true
    );
    assert.equal(
      getStudioTabA11yMeta('play-factor-grid', 'addition-attack').isGameArena,
      true
    );
    assert.equal(
      getStudioTabA11yMeta('play-equation-foundry', 'addition-attack').isGameArena,
      true
    );
    assert.equal(
      getStudioTabA11yMeta('play-odds-urns', 'addition-attack').isGameArena,
      true
    );
    assert.equal(
      getStudioTabA11yMeta('dashboard', 'addition-attack').isGameArena,
      false
    );
    assert.equal(
      getStudioTabA11yMeta('notebook', 'addition-attack').isGameArena,
      false
    );
  });
});
