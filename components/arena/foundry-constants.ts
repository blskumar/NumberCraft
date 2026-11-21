import { type AgeTier, type AiDifficulty } from '@/lib/types';

export const TOTAL_ROUNDS = 5;
export const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];
export const DIFFICULTIES: { id: AiDifficulty; label: string; desc: string }[] = [
  { id: 'apprentice', label: 'Apprentice', desc: 'Aims within ±3 of target' },
  { id: 'scholar', label: 'Scholar', desc: 'Solves most targets exactly' },
  { id: 'master', label: 'Master', desc: 'Optimal solver every round' },
];
