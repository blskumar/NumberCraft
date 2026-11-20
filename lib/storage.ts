import { clampDailyProblemGoal, DAILY_PROBLEM_GOAL } from './daily-goal';
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

export function loadProfile(): StudentProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<StudentProfile>;
    const featuredBadgeId =
      typeof parsed.featuredBadgeId === 'string' &&
      VALID_BADGE_IDS.has(parsed.featuredBadgeId as AchievementId)
        ? (parsed.featuredBadgeId as AchievementId)
        : null;
    const sessionKind =
      parsed.sessionKind === 'authenticated' ? 'authenticated' : 'guest';
    const authProvider = sessionKind === 'authenticated' ? 'email' : 'guest';
    const themePreference =
      parsed.themePreference === 'light' ||
      parsed.themePreference === 'dark' ||
      parsed.themePreference === 'system'
        ? parsed.themePreference
        : DEFAULT_PROFILE.themePreference;
    const dailyProblemGoal =
      typeof parsed.dailyProblemGoal === 'number'
        ? clampDailyProblemGoal(parsed.dailyProblemGoal)
        : DAILY_PROBLEM_GOAL;
    return {
      uid:
        sessionKind === 'authenticated' && typeof parsed.uid === 'string'
          ? parsed.uid.slice(0, 128)
          : null,
      displayName:
        typeof parsed.displayName === 'string' && parsed.displayName.trim()
          ? parsed.displayName.trim().slice(0, 28)
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
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: StudentProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllLocalProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MATCHES_KEY);
    window.localStorage.removeItem(BADGES_KEY);
    window.localStorage.removeItem(DAILY_KEY);
  } catch {
    // Ignore storage errors
  }
}

const TIERS = ['explorers', 'challengers', 'strategists'];
const MODES = ['solo', 'vs-ai', 'local'];
const RESULTS = ['win', 'loss', 'draw'];

function isValidMatchRecord(m: unknown): m is MatchRecord {
  if (!m || typeof m !== 'object') return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
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
    return (parsed as unknown[])
      .filter(isValidMatchRecord)
      .slice(0, MAX_STORED_MATCHES);
  } catch {
    return [];
  }
}

export function saveMatches(matches: MatchRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      MATCHES_KEY,
      JSON.stringify(matches.slice(0, MAX_STORED_MATCHES))
    );
  } catch {
    // Ignore storage errors
  }
}

export function appendMatch(record: MatchRecord): MatchRecord[] {
  const existing = loadMatches();
  const next = [record, ...existing].slice(0, MAX_STORED_MATCHES);
  saveMatches(next);
  return next;
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

export function saveEarnedBadges(badges: EarnedBadgeRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  } catch {
    // Ignore storage errors
  }
}

export function loadDailyCompletions(): DailyChallengeCompletion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .filter(isValidDailyCompletion)
      .slice(0, MAX_STORED_DAILY);
  } catch {
    return [];
  }
}

export function saveDailyCompletions(
  completions: DailyChallengeCompletion[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      DAILY_KEY,
      JSON.stringify(completions.slice(0, MAX_STORED_DAILY))
    );
  } catch {
    // Ignore storage errors
  }
}

export function upsertDailyCompletion(
  completion: DailyChallengeCompletion
): DailyChallengeCompletion[] {
  const existing = loadDailyCompletions();
  const filtered = existing.filter((c) => c.dateKey !== completion.dateKey);
  const next = [completion, ...filtered]
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
    .slice(0, MAX_STORED_DAILY);
  saveDailyCompletions(next);
  return next;
}
