import { ARITHMETIC_GAMES } from '@/lib/arithmetic-engine';
import type { StudioTab } from '@/components/TopNav';
import type { ArithmeticGameId } from '@/lib/types';

export interface StudioTabA11yMeta {
  containerId: string;
  regionLabel: string;
  announcement: string;
  isGameArena: boolean;
}

/**
 * Returns accessible ARIA landmark labels and polite screen-reader transition
 * announcements for every dynamic studio view and game container.
 */
export function getStudioTabA11yMeta(
  tab: StudioTab,
  activeArithmeticGame: ArithmeticGameId
): StudioTabA11yMeta {
  switch (tab) {
    case 'studio':
      return {
        containerId: 'studio-region-hub',
        regionLabel: 'Numbercraft Games Studio Hub',
        announcement:
          'Switched to Games Studio Hub. Choose an arithmetic drill, Daily Math Challenge, or Factor Grid.',
        isGameArena: false,
      };
    case 'daily':
      return {
        containerId: 'studio-region-daily',
        regionLabel: 'Daily Math Challenge Arena',
        announcement:
          'Switched to Daily Math Challenge Arena. Solve today’s timed three-clue math puzzle.',
        isGameArena: true,
      };
    case 'dashboard':
      return {
        containerId: 'studio-region-dashboard',
        regionLabel: 'Performance Dashboard Analytics',
        announcement:
          'Switched to Performance Dashboard. Review arithmetic accuracy trends and challenge completion history.',
        isGameArena: false,
      };
    case 'play-arithmetic': {
      const gameTitle = ARITHMETIC_GAMES[activeArithmeticGame].title;
      return {
        containerId: `studio-region-arithmetic-${activeArithmeticGame}`,
        regionLabel: `Core Arithmetic Game Arena: ${gameTitle}`,
        announcement: `Switched to ${gameTitle} arithmetic game arena.`,
        isGameArena: true,
      };
    }
    case 'play-factor-grid':
      return {
        containerId: 'studio-region-factor-grid',
        regionLabel: 'Factor Grid Strategy Game Arena',
        announcement:
          'Switched to Factor Grid strategy game arena.',
        isGameArena: true,
      };
    case 'rooms':
      return {
        containerId: 'studio-region-rooms',
        regionLabel: 'Online Multiplayer Rooms',
        announcement: 'Switched to Online Multiplayer Rooms.',
        isGameArena: false,
      };
    case 'notebook':
      return {
        containerId: 'studio-region-notebook',
        regionLabel: 'Mastery Notebook and Seals Ledger',
        announcement:
          'Switched to Mastery Notebook. Inspect earned seals and match history.',
        isGameArena: false,
      };
    case 'blueprint':
      return {
        containerId: 'studio-region-blueprint',
        regionLabel: 'Studio Game Design Blueprint',
        announcement: 'Switched to Studio Game Design Blueprint.',
        isGameArena: false,
      };
  }
}
