import { ARITHMETIC_GAMES } from './arithmetic-engine';
import { clampDailyProblemGoal, DAILY_PROBLEM_GOAL } from './daily-goal';
import { clearGuestTrialUsage } from './guest-trial';
import { isValidThemePreference, loadThemePreference, saveThemePreference } from './theme';
import type {
  AchievementId,
  DailyChallengeCompletion,
  EarnedBadgeRecord,
  MatchRecord,
  StudentProfile,
} from './types';

const PROFILE_KEY = 'numbercraft_profile_v1';
const MATCHES_KEY = 'numbercraft_matches_v1';
const BADGES_KEY = 'numbercraft_badges_v1';
const DAILY_KEY = 'numbercraft_daily_v1';
const MAX_STORED_MATCHES = 100;
const MAX_STORED_DAILY = 90;
// Demo data lives beside real data: it can never push real records out of storage.
const MAX_STORED_SAMPLES = 25;

function capKeepingRealFirst<T>(items: T[], isSample: (x: T) => boolean, maxReal: number): T[] {
  let real = 0;
  let samples = 0;
  return items.filter((x) => {
    if (isSample(x)) return samples++ < MAX_STORED_SAMPLES;
    return real++ < maxReal;
  });
}

const isSampleMatchRecord = (m: MatchRecord) => typeof m?.id === 'string' && m.id.startsWith('sample-');
const capMatches = (m: MatchRecord[]) => capKeepingRealFirst(m, isSampleMatchRecord, MAX_STORED_MATCHES);
const capDaily = (d: DailyChallengeCompletion[]) => capKeepingRealFirst(d, (c) => c.isSample === true, MAX_STORED_DAILY);

function safeWrite(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // quota or blocked storage
  }
}


const VALID_BADGE_IDS = new Set<AchievementId>([
  'first-victory',
  'perfect-streak',
  'top-scorer',
  'prime-collector',
  'scholar-rival',
  'master-strategist',
  'taxman-victor',
  'tier-explorer',
  'daily-pioneer',
  'daily-lightning',
  'daily-flawless',
  'daily-streak-3',
  'daily-streak-7',
  'daily-streak-14',
]);

export const DEFAULT_PROFILE: StudentProfile = {
  uid: null,
  displayName: 'Guest Explorer',
  ageTier: 'challengers',
  soundEnabled: true,
  themePreference: 'system',
  dailyProblemGoal: DAILY_PROBLEM_GOAL,
  sessionKind: 'guest',
  authProvider: 'guest',
  email: null,
  sharedDeviceMode: false,
  featuredBadgeId: null,
};

// The theme key is what the pre-hydration init script paints, so it is the single source of truth.
function withStoredTheme(p: StudentProfile): StudentProfile {
  const themePreference = loadThemePreference();
  return themePreference === p.themePreference ? p : { ...p, themePreference };
}

export function loadProfile(): StudentProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return withStoredTheme(DEFAULT_PROFILE);
    const parsed = JSON.parse(raw) as Partial<StudentProfile>;
    if (!parsed || typeof parsed !== 'object') return withStoredTheme(DEFAULT_PROFILE);
    const featuredBadgeId =
      typeof parsed.featuredBadgeId === 'string' &&
      VALID_BADGE_IDS.has(parsed.featuredBadgeId as AchievementId)
        ? (parsed.featuredBadgeId as AchievementId)
        : null;
    const sessionKind =
      parsed.sessionKind === 'authenticated' ? 'authenticated' : 'guest';
    const authProvider = sessionKind === 'authenticated' ? 'email' : 'guest';
    const themePreference = isValidThemePreference(parsed.themePreference)
      ? parsed.themePreference
      : DEFAULT_PROFILE.themePreference;
    const dailyProblemGoal =
      typeof parsed.dailyProblemGoal === 'number'
        ? clampDailyProblemGoal(parsed.dailyProblemGoal)
        : DAILY_PROBLEM_GOAL;
    return withStoredTheme({
      uid:
        sessionKind === 'authenticated' && typeof parsed.uid === 'string'
          ? parsed.uid.slice(0, 128)
          : null,
      displayName:
        typeof parsed.displayName === 'string' && parsed.displayName.trim()
          ? parsed.displayName.trim().slice(0, 28).replace(/[�-�]$/, '')
          : DEFAULT_PROFILE.displayName,
      ageTier:
        parsed.ageTier === 'explorers' ||
        parsed.ageTier === 'challengers' ||
        parsed.ageTier === 'strategists'
          ? parsed.ageTier
          : DEFAULT_PROFILE.ageTier,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_PROFILE.soundEnabled,
      themePreference,
      dailyProblemGoal,
      sessionKind,
      authProvider,
      email:
        sessionKind === 'authenticated' && typeof parsed.email === 'string'
          ? parsed.email.slice(0, 120)
          : null,
      sharedDeviceMode: Boolean(parsed.sharedDeviceMode),
      featuredBadgeId,
    });
  } catch {
    return withStoredTheme(DEFAULT_PROFILE);
  }
}

export function saveProfile(profile: StudentProfile): boolean {
  if (typeof window === 'undefined') return false;
  if (profile.themePreference) saveThemePreference(profile.themePreference); // keep both stores in step
  return safeWrite(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Wipes local progress. Defaults suit the shared-device sign-out wipe: guest trials and
 * personal profile prefs (age tier, goal, sound, featured seal) are reset too. Identity
 * and theme are left untouched.
 */
export function clearAllLocalProgress(
  options: { includeTrials?: boolean; includeProfilePrefs?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  const { includeTrials = true, includeProfilePrefs = true } = options;
  try {
    window.localStorage.removeItem(MATCHES_KEY);
    window.localStorage.removeItem(BADGES_KEY);
    window.localStorage.removeItem(DAILY_KEY);
  } catch {
    // Ignore storage errors
  }
  if (includeTrials) clearGuestTrialUsage();
  if (includeProfilePrefs) {
    const p = loadProfile();
    saveProfile({
      ...p,
      ageTier: DEFAULT_PROFILE.ageTier,
      dailyProblemGoal: DEFAULT_PROFILE.dailyProblemGoal,
      soundEnabled: DEFAULT_PROFILE.soundEnabled,
      featuredBadgeId: null,
    });
  }
}

const TIERS = ['explorers', 'challengers', 'strategists'];
const MODES = ['solo', 'vs-ai', 'local'];
const RESULTS = ['win', 'loss', 'draw'];

function isValidArithmeticMeta(a: unknown): boolean {
  if (!a || typeof a !== 'object') return false;
  const r = a as Record<string, unknown>;
  return (
    typeof r.gameId === 'string' &&
    Object.prototype.hasOwnProperty.call(ARITHMETIC_GAMES, r.gameId) &&
    typeof r.solved === 'number' &&
    typeof r.attempted === 'number'
  );
}

function isValidMatchRecord(m: unknown): m is MatchRecord {
  if (!m || typeof m !== 'object') return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.gameTitle === 'string' &&
    (r.arithmeticMeta === undefined || isValidArithmeticMeta(r.arithmeticMeta)) &&
    (r.dailyMeta === undefined || (!!r.dailyMeta && typeof r.dailyMeta === 'object')) &&
    typeof r.playedAt === 'string' &&
    typeof r.playerScore === 'number' &&
    typeof r.opponentScore === 'number' &&
    typeof r.primesClaimed === 'number' &&
    typeof r.tier === 'string' && TIERS.includes(r.tier) &&
    typeof r.mode === 'string' && MODES.includes(r.mode) &&
    typeof r.result === 'string' && RESULTS.includes(r.result)
  );
}

function isValidDailyCompletion(c: unknown): c is DailyChallengeCompletion {
  if (!c || typeof c !== 'object') return false;
  const r = c as Record<string, unknown>;
  return (
    typeof r.dateKey === 'string' &&
    typeof r.editionNumber === 'number' &&
    typeof r.solved === 'boolean' &&
    typeof r.secondsUsed === 'number' &&
    typeof r.timeLimitSeconds === 'number' &&
    typeof r.mistakes === 'number' &&
    typeof r.hintsUsed === 'number' &&
    typeof r.score === 'number' &&
    typeof r.completedAt === 'string' &&
    typeof r.tier === 'string' && TIERS.includes(r.tier)
  );
}

export function loadMatches(): MatchRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return capMatches(
      (parsed as unknown[])
        .filter(isValidMatchRecord)
        .filter((m, i, all) => all.findIndex((o) => o.id === m.id) === i)
    );
  } catch {
    return [];
  }
}

/** Returns false when the write failed (quota / blocked storage). */
export function saveMatches(matches: MatchRecord[]): boolean {
  if (typeof window === 'undefined') return false;
  return safeWrite(MATCHES_KEY, JSON.stringify(capMatches(matches)));
}

/**
 * Adds a match, de-duplicating by id (a replayed daily has a deterministic id): a stored win
 * is never replaced by a non-win. `isNew` is false when the id already existed, so callers
 * can skip trial / cloud-score credit. `saved` is false when persisting failed.
 */
export function tryAppendMatch(record: MatchRecord): {
  matches: MatchRecord[];
  saved: boolean;
  isNew: boolean;
} {
  const existing = loadMatches();
  const prior = existing.find((m) => m.id === record.id);
  const stamped: MatchRecord =
    loadProfile().sessionKind === 'authenticated' ? { ...record, signedIn: true } : record;
  if (prior && prior.result === 'win' && record.result !== 'win') {
    return { matches: existing, saved: true, isNew: false };
  }
  const next = capMatches([stamped, ...existing.filter((m) => m.id !== record.id)]);
  return { matches: next, saved: saveMatches(next), isNew: !prior };
}

export function appendMatch(record: MatchRecord): MatchRecord[] {
  return tryAppendMatch(record).matches;
}

export function loadEarnedBadges(): EarnedBadgeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BADGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<AchievementId>();
    const clean: EarnedBadgeRecord[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        VALID_BADGE_IDS.has(item.id as AchievementId) &&
        !seen.has(item.id as AchievementId)
      ) {
        seen.add(item.id as AchievementId);
        clean.push({
          id: item.id as AchievementId,
          unlockedAt:
            typeof item.unlockedAt === 'string'
              ? item.unlockedAt
              : new Date().toISOString(),
          triggerMatchId:
            typeof item.triggerMatchId === 'string'
              ? item.triggerMatchId
              : undefined,
        });
      }
    }
    return clean;
  } catch {
    return [];
  }
}

export function saveEarnedBadges(badges: EarnedBadgeRecord[]): boolean {
  if (typeof window === 'undefined') return false;
  return safeWrite(BADGES_KEY, JSON.stringify(badges));
}

export function loadDailyCompletions(): DailyChallengeCompletion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return capDaily((parsed as unknown[]).filter(isValidDailyCompletion));
  } catch {
    return [];
  }
}

export function saveDailyCompletions(
  completions: DailyChallengeCompletion[]
): boolean {
  if (typeof window === 'undefined') return false;
  return safeWrite(DAILY_KEY, JSON.stringify(capDaily(completions)));
}

export function upsertDailyCompletion(
  completion: DailyChallengeCompletion
): DailyChallengeCompletion[] {
  const existing = loadDailyCompletions();
  const prior = existing.find((c) => c.dateKey === completion.dateKey);
  // A later failed replay must not erase a solved day (and its streak).
  if (prior?.solved && !completion.solved) return existing;
  const filtered = existing.filter((c) => c.dateKey !== completion.dateKey);
  const next = capDaily(
    [completion, ...filtered].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
  );
  saveDailyCompletions(next);
  return next;
}
