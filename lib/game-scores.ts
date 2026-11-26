import { getLocalDateKey } from './daily-challenge';
import {
  PLAYABLE_GAME_CATALOG,
  type PlayableGameId,
} from './guest-trial';
import type { AgeTier } from './types';

export type LeaderboardPeriod = 'day' | 'week';
export type GameLeaderboardFilter = 'all' | PlayableGameId;

export interface CloudGameScoreRecord {
  id: string;
  uid: string;
  displayName: string;
  gameId: PlayableGameId;
  gameTitle: string;
  tier: AgeTier;
  score: number;
  accuracyPercent: number;
  dateKey: string; // YYYY-MM-DD
  weekKey: string; // YYYY-Www (ISO week)
  visibility: 'public';
  createdAtMs: number;
}

export interface TopTenLeaderboardRow {
  rank: number;
  uid: string;
  displayName: string;
  gameId: PlayableGameId;
  gameTitle: string;
  tier: AgeTier;
  score: number;
  accuracyPercent: number;
  dateKey: string;
  weekKey: string;
  gamesPlayedInPeriod: number;
  isCurrentUser: boolean;
}

/**
 * Strictly parses YYYY-MM-DD (non-padded parts allowed). Returns null for malformed or
 * impossible dates instead of rolling them into a neighbouring month or year.
 */
function parseDateKeyStrict(dateKey: string): Date | null {
  const m =
    typeof dateKey === 'string'
      ? /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(dateKey)
      : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = new Date(0);
  utc.setUTCFullYear(y, mo - 1, d); // unlike Date.UTC, years 0-99 stay literal
  utc.setUTCHours(0, 0, 0, 0);
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== mo - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return utc;
}

/**
 * Computes the canonical ISO 8601 week key (e.g., "2026-W47") from a YYYY-MM-DD date key.
 * Returns '' for an invalid date key (never a made-up week).
 */
export function getIsoWeekKey(dateKey: string = getLocalDateKey()): string {
  const utc = parseDateKeyStrict(dateKey);
  if (!utc) return '';
  const dayNum = utc.getUTCDay() || 7; // Monday=1 .. Sunday=7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(0);
  yearStart.setUTCFullYear(utc.getUTCFullYear(), 0, 1);
  yearStart.setUTCHours(0, 0, 0, 0);
  const weekNo = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${String(utc.getUTCFullYear()).padStart(4, '0')}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns a human-readable week date span for an ISO week key (e.g., "Nov 16 – Nov 22").
 */
export function formatIsoWeekRange(dateKey: string = getLocalDateKey()): string {
  const utc = parseDateKeyStrict(dateKey);
  if (!utc) return dateKey;
  const dayNum = utc.getUTCDay() || 7;
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() - (dayNum - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  return `${fmt(monday)} – ${fmt(sunday)}`;
}

const clampInt = (n: number, min: number, max: number) =>
  Number.isNaN(n) ? min : Math.min(max, Math.max(min, Math.round(n)));

/**
 * Sanitizes an outgoing score payload to strictly match firebase-blueprint.json bounds.
 */
export function buildSanitizedScorePayload(params: {
  uid: string;
  displayName: string;
  gameId: PlayableGameId;
  tier: AgeTier;
  score: number;
  accuracyPercent: number;
  dateKey?: string;
}): {
  uid: string;
  displayName: string;
  gameId: PlayableGameId;
  gameTitle: string;
  tier: AgeTier;
  score: number;
  accuracyPercent: number;
  dateKey: string;
  weekKey: string;
  visibility: 'public';
} {
  // Invalid or empty keys fall back to today so dateKey and weekKey always agree.
  const dateKey = getIsoWeekKey(params.dateKey ?? '')
    ? (params.dateKey as string)
    : getLocalDateKey();
  // slice(0, 28) can cut an emoji in half; drop a trailing lone high surrogate.
  const safeName =
    params.displayName
      .trim()
      .slice(0, 28)
      .replace(/[\uD800-\uDBFF]$/, '') || 'Scholar';
  const catalogEntry = PLAYABLE_GAME_CATALOG[params.gameId];

  return {
    uid: params.uid,
    displayName: safeName,
    gameId: params.gameId,
    gameTitle: catalogEntry.title.slice(0, 48),
    tier: params.tier,
    score: clampInt(params.score, 0, 100000),
    accuracyPercent: clampInt(params.accuracyPercent, 0, 100),
    dateKey,
    weekKey: getIsoWeekKey(dateKey),
    visibility: 'public',
  };
}

type Best = { best: CloudGameScoreRecord; count: number };

const isBetterRecord = (a: CloudGameScoreRecord, b: CloudGameScoreRecord) =>
  a.score > b.score ||
  (a.score === b.score && a.accuracyPercent > b.accuracyPercent) ||
  (a.score === b.score &&
    a.accuracyPercent === b.accuracyPercent &&
    a.createdAtMs < b.createdAtMs);

/**
 * Ranks the Top 10 individuals for a chosen period (Day or Week) and game filter.
 * When a user submits multiple scores in the same period, keeps their highest score
 * (tie-breaking by highest accuracy, then earliest achieved) while counting rounds played.
 * For the 'all' filter, raw scores of different games are never compared: each user's best
 * per game is first normalised against that game's top score of the period (0..1).
 */
export function computeTopTenLeaderboard(params: {
  records: CloudGameScoreRecord[];
  period: LeaderboardPeriod;
  gameFilter: GameLeaderboardFilter;
  todayKey: string;
  currentUserUid?: string | null;
}): {
  topTen: TopTenLeaderboardRow[];
  currentUserRow: TopTenLeaderboardRow | null;
  totalPlayersInPeriod: number;
  periodKey: string;
} {
  const weekKey = getIsoWeekKey(params.todayKey);
  const periodKey = params.period === 'day' ? params.todayKey : weekKey;

  const filtered = params.records.filter((r) => {
    if (!Number.isFinite(r.score) || !Number.isFinite(r.accuracyPercent)) {
      return false;
    }
    // The week is derived from dateKey, never trusted from the stored weekKey.
    const matchesPeriod =
      params.period === 'day'
        ? r.dateKey === params.todayKey
        : weekKey !== '' && getIsoWeekKey(r.dateKey) === weekKey;
    if (!matchesPeriod) return false;
    if (params.gameFilter !== 'all' && r.gameId !== params.gameFilter) {
      return false;
    }
    return true;
  });

  // Best score per (user, game) within the period.
  const bestByUserGame = new Map<string, Best>();
  for (const rec of filtered) {
    const key = `${rec.uid}\u0000${rec.gameId}`;
    const existing = bestByUserGame.get(key);
    if (!existing) {
      bestByUserGame.set(key, { best: rec, count: 1 });
    } else {
      existing.count += 1;
      if (isBetterRecord(rec, existing.best)) existing.best = rec;
    }
  }

  const topByGame = new Map<string, number>();
  for (const { best } of bestByUserGame.values()) {
    topByGame.set(
      best.gameId,
      Math.max(topByGame.get(best.gameId) ?? 0, best.score)
    );
  }
  const strength = (e: Best) => {
    if (params.gameFilter !== 'all') return e.best.score;
    const top = topByGame.get(e.best.gameId) ?? 0;
    return top > 0 ? e.best.score / top : 0;
  };
  const compare = (a: Best, b: Best) => {
    const sa = strength(a);
    const sb = strength(b);
    if (sb !== sa) return sb - sa;
    if (b.best.accuracyPercent !== a.best.accuracyPercent) {
      return b.best.accuracyPercent - a.best.accuracyPercent;
    }
    return a.best.createdAtMs - b.best.createdAtMs;
  };

  // One row per user: their strongest game.
  const bestByUser = new Map<string, Best>();
  for (const entry of bestByUserGame.values()) {
    const cur = bestByUser.get(entry.best.uid);
    if (!cur || compare(entry, cur) < 0) bestByUser.set(entry.best.uid, entry);
  }

  const ranked: TopTenLeaderboardRow[] = Array.from(bestByUser.values())
    .sort(compare)
    .map((entry, idx) => ({
      rank: idx + 1,
      uid: entry.best.uid,
      displayName: entry.best.displayName,
      gameId: entry.best.gameId,
      gameTitle: entry.best.gameTitle,
      tier: entry.best.tier,
      score: entry.best.score,
      accuracyPercent: entry.best.accuracyPercent,
      dateKey: entry.best.dateKey,
      weekKey: entry.best.weekKey,
      gamesPlayedInPeriod: entry.count,
      isCurrentUser: Boolean(
        params.currentUserUid && entry.best.uid === params.currentUserUid
      ),
    }));

  const currentUserRow =
    ranked.find((row) => row.isCurrentUser) ?? null;

  return {
    topTen: ranked.slice(0, 10),
    currentUserRow,
    totalPlayersInPeriod: ranked.length,
    periodKey,
  };
}
