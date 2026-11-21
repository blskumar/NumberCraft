import type { DailyChallengeCompletion, MatchRecord } from './types';

export type PlayableGameId =
  | 'addition-attack'
  | 'subtraction-sprint'
  | 'multiplication-mastery'
  | 'equation-foundry'
  | 'odds-urns'
  | 'factor-grid'
  | 'daily-challenge';

export const PLAYABLE_GAME_CATALOG: Record<
  PlayableGameId,
  { id: PlayableGameId; title: string; shortTitle: string }
> = {
  'addition-attack': {
    id: 'addition-attack',
    title: 'Addition Attack',
    shortTitle: 'Addition',
  },
  'subtraction-sprint': {
    id: 'subtraction-sprint',
    title: 'Subtraction Sprint',
    shortTitle: 'Subtraction',
  },
  'multiplication-mastery': {
    id: 'multiplication-mastery',
    title: 'Multiplication Mastery',
    shortTitle: 'Multiplication',
  },
  'equation-foundry': {
    id: 'equation-foundry',
    title: 'Equation Foundry',
    shortTitle: 'Equation Foundry',
  },
  'odds-urns': {
    id: 'odds-urns',
    title: 'Odds & Urns',
    shortTitle: 'Odds & Urns',
  },
  'factor-grid': {
    id: 'factor-grid',
    title: 'Factor Grid',
    shortTitle: 'Factor Grid',
  },
  'daily-challenge': {
    id: 'daily-challenge',
    title: 'Daily Math Challenge',
    shortTitle: 'Daily Challenge',
  },
};

export const PLAYABLE_GAME_IDS: readonly PlayableGameId[] = [
  'addition-attack',
  'subtraction-sprint',
  'multiplication-mastery',
  'equation-foundry',
  'odds-urns',
  'factor-grid',
  'daily-challenge',
] as const;

export const MAX_GUEST_FREE_LEVELS_PER_GAME = 1;

const GUEST_TRIALS_STORAGE_KEY = 'numbercraft_guest_trials_v1';

export type GuestTrialUsageMap = Partial<Record<PlayableGameId, number>>;

const TITLE_TO_GAME_ID = new Map<string, PlayableGameId>();
for (const id of PLAYABLE_GAME_IDS) {
  const { title, shortTitle } = PLAYABLE_GAME_CATALOG[id];
  TITLE_TO_GAME_ID.set(title.toLowerCase(), id);
  TITLE_TO_GAME_ID.set(shortTitle.toLowerCase(), id);
}

/**
 * Resolves a MatchRecord back to its PlayableGameId, or null when it cannot be identified
 * (never guesses: an unknown title must not consume another game's trial).
 */
export function resolveGameIdFromMatch(match: MatchRecord): PlayableGameId | null {
  if (match.dailyMeta) return 'daily-challenge';
  if (match.arithmeticMeta && PLAYABLE_GAME_IDS.includes(match.arithmeticMeta.gameId)) {
    return match.arithmeticMeta.gameId;
  }
  if (typeof match.gameTitle !== 'string') return null;
  return TITLE_TO_GAME_ID.get(match.gameTitle.trim().toLowerCase()) ?? null;
}

export function loadGuestTrialUsage(): GuestTrialUsageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(GUEST_TRIALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: GuestTrialUsageMap = {};
    for (const id of PLAYABLE_GAME_IDS) {
      const val = parsed[id];
      if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
        clean[id] = Math.floor(val);
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveGuestTrialUsage(usage: GuestTrialUsageMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_TRIALS_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearGuestTrialUsage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_TRIALS_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Computes effective per-game guest trial counts by taking the maximum of stored
 * trial usage and real (non-sample) locally recorded rounds for that game.
 */
export function computeEffectiveGuestTrials(
  storedUsage: GuestTrialUsageMap,
  matches: MatchRecord[],
  dailyCompletions: DailyChallengeCompletion[]
): Record<PlayableGameId, number> {
  const counts: Record<PlayableGameId, number> = {
    'addition-attack': storedUsage['addition-attack'] ?? 0,
    'subtraction-sprint': storedUsage['subtraction-sprint'] ?? 0,
    'multiplication-mastery': storedUsage['multiplication-mastery'] ?? 0,
    'equation-foundry': storedUsage['equation-foundry'] ?? 0,
    'odds-urns': storedUsage['odds-urns'] ?? 0,
    'factor-grid': storedUsage['factor-grid'] ?? 0,
    'daily-challenge': storedUsage['daily-challenge'] ?? 0,
  };

  const matchCounts: Record<PlayableGameId, number> = {
    'addition-attack': 0,
    'subtraction-sprint': 0,
    'multiplication-mastery': 0,
    'equation-foundry': 0,
    'odds-urns': 0,
    'factor-grid': 0,
    'daily-challenge': 0,
  };

  for (const m of matches) {
    if (!m || typeof m.id !== 'string' || m.id.startsWith('sample-')) continue;
    if (m.signedIn) continue; // signed-in rounds are credited to the cloud, not the guest trial
    const gameId = resolveGameIdFromMatch(m);
    if (gameId) matchCounts[gameId] += 1;
  }

  let realDailyCount = 0;
  for (const dc of dailyCompletions) {
    if (dc.isSample || typeof dc.completedAt !== 'string' || Number.isNaN(Date.parse(dc.completedAt))) continue;
    realDailyCount += 1;
  }
  matchCounts['daily-challenge'] = Math.max(
    matchCounts['daily-challenge'],
    realDailyCount
  );

  for (const id of PLAYABLE_GAME_IDS) {
    counts[id] = Math.max(counts[id], matchCounts[id]);
  }
  return counts;
}

/**
 * Returns true when a guest user has exhausted their 1 free trial level for the
 * given game and must register (free, any email) to keep playing it.
 */
export function isGuestGameLocked(params: {
  isSignedIn: boolean;
  gameId: PlayableGameId;
  trialUsage: Record<PlayableGameId, number>;
}): boolean {
  if (params.isSignedIn) return false;
  return (params.trialUsage[params.gameId] ?? 0) >= MAX_GUEST_FREE_LEVELS_PER_GAME;
}

export function incrementGuestTrialUsage(
  usage: GuestTrialUsageMap,
  gameId: PlayableGameId
): GuestTrialUsageMap {
  return {
    ...usage,
    [gameId]: (usage[gameId] ?? 0) + 1,
  };
}
