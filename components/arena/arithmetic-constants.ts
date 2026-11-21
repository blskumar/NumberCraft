import { type AgeTier, type ArithmeticPace } from '@/lib/types';

export const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];
export const PACE_ORDER: ArithmeticPace[] = ['relaxed', 'standard', 'blitz'];

export type ArenaPhase = 'setup' | 'playing' | 'summary';
