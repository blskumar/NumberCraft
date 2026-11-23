import type { AchievementDefinition } from '@/lib/achievements';
import type { AgeTier, ArithmeticPace, MatchRecord } from '@/lib/types';

export const TOTAL_ROUNDS = 5;
export const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];
export const PACE_ORDER: ArithmeticPace[] = ['relaxed', 'standard', 'blitz'];

export type ArenaPhase = 'setup' | 'playing' | 'summary';
export type DailyPhase = 'briefing' | 'playing' | 'completed';
export type StageView = 'setup' | 'playing';

export const DAILY_BADGE_IDS = new Set([
  'daily-pioneer',
  'daily-lightning',
  'daily-flawless',
  'daily-streak-3',
]);

export interface TurnLogEntry {
  id: string;
  actor: string;
  message: string;
  tone: 'safe' | 'hazard' | 'bank' | 'bot';
}

/** Props every arena takes: tier picker, player name, sound toggle and navigation. */
export interface ArenaBaseProps {
  ageTier: AgeTier;
  onChangeTier: (tier: AgeTier) => void;
  playerName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBackToStudio: () => void;
  onOpenNotebook: () => void;
}

/** Props shared by the two AI-opponent arenas (Equation Foundry, Odds & Urns). */
export interface AiArenaProps extends ArenaBaseProps {
  onRecordMatch: (record: MatchRecord) => AchievementDefinition[];
  guestTrialLocked?: boolean;
  onRequireRegistration?: () => void;
}
