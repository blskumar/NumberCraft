import type { StudioTab } from '@/components/TopNav';
import type { PlayableGameId } from '@/lib/guest-trial';
import type { ArithmeticGameId, MatchRecord } from '@/lib/types';

export const TAB_DEST_LABELS: Record<StudioTab, string> = {
  studio: 'Games Studio',
  daily: 'Daily Challenge',
  dashboard: 'Performance Dashboard',
  'play-arithmetic': 'Core Arithmetic',
  'play-factor-grid': 'Factor Grid',
  'play-equation-foundry': 'Equation Foundry',
  'play-odds-urns': 'Odds & Urns',
  rooms: 'Online Rooms',
  notebook: 'Mastery Notebook',
  rules: 'Rules & Guide',
};

export function resolveGameIdForTab(
  tab: StudioTab,
  activeArithmeticGame: ArithmeticGameId
): PlayableGameId | null {
  switch (tab) {
    case 'play-arithmetic':
      return activeArithmeticGame;
    case 'play-factor-grid':
      return 'factor-grid';
    case 'play-equation-foundry':
      return 'equation-foundry';
    case 'play-odds-urns':
      return 'odds-urns';
    case 'daily':
      return 'daily-challenge';
    default:
      return null;
  }
}

export function estimateMatchAccuracy(record: MatchRecord): number {
  if (record.arithmeticMeta) {
    return record.arithmeticMeta.accuracyPercent;
  }
  if (record.dailyMeta) {
    const attempts = Math.max(1, 3 + record.dailyMeta.mistakes);
    return Math.round((record.dailyMeta.stepsSolved / attempts) * 100);
  }
  const total = record.playerScore + record.opponentScore;
  if (total > 0) {
    return Math.min(100, Math.max(0, Math.round((record.playerScore / total) * 100)));
  }
  return record.result === 'win' ? 100 : 50;
}
