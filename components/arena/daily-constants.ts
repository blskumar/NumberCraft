import { type AgeTier } from '@/lib/types';

export type DailyPhase = 'briefing' | 'playing' | 'completed';

export const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];

export const DAILY_BADGE_IDS = new Set([
  'daily-pioneer',
  'daily-lightning',
  'daily-flawless',
  'daily-streak-3',
]);
