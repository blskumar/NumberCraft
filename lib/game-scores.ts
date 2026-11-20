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
 * Computes the canonical ISO 8601 week key (e.g., "2026-W47") from a YYYY-MM-DD date key.
 */
export function getIsoWeekKey(dateKey: string = getLocalDateKey()): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return '2026-W01';
  }
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const dayNum = utc.getUTCDay() || 7; // Monday=1 .. Sunday=7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns a human-readable week date span for an ISO week key (e.g., "Nov 16 – Nov 22").
 */
export function formatIsoWeekRange(dateKey: string = getLocalDateKey()): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
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
  const dateKey = params.dateKey ?? getLocalDateKey();
  const safeName = params.displayName.trim().slice(0, 28) || 'Scholar';
  const catalogEntry = PLAYABLE_GAME_CATALOG[params.gameId];

  return {
    uid: params.uid,
    displayName: safeName,
    gameId: params.gameId,
    gameTitle: catalogEntry.title.slice(0, 48),
    tier: params.tier,
    score: Math.min(100000, Math.max(0, Math.round(params.score))),
    accuracyPercent: Math.min(
      100,
      Math.max(0, Math.round(params.accuracyPercent))
    ),
    dateKey,
    weekKey: getIsoWeekKey(dateKey),
    visibility: 'public',
  };
}

/**
 * Ranks the Top 10 individuals for a chosen period (Day or Week) and game filter.
 * When a user submits multiple scores in the same period, keeps their highest score
 * (tie-breaking by highest accuracy, then earliest achieved) while counting rounds played.
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
    const matchesPeriod =
      params.period === 'day'
        ? r.dateKey === params.todayKey
        : r.weekKey === weekKey;
    if (!matchesPeriod) return false;
    if (params.gameFilter !== 'all' && r.gameId !== params.gameFilter) {
      return false;
    }
    return true;
  });

  // Deduplicate per individual user (best score in this game/period)
  const bestByUser = new Map<
    string,
    { best: CloudGameScoreRecord; count: number }
  >();

  for (const rec of filtered) {
    const existing = bestByUser.get(rec.uid);
    if (!existing) {
      bestByUser.set(rec.uid, { best: rec, count: 1 });
    } else {
      existing.count += 1;
      const isBetter =
        rec.score > existing.best.score ||
        (rec.score === existing.best.score &&
          rec.accuracyPercent > existing.best.accuracyPercent) ||
        (rec.score === existing.best.score &&
          rec.accuracyPercent === existing.best.accuracyPercent &&
          rec.createdAtMs < existing.best.createdAtMs);
      if (isBetter) {
        existing.best = rec;
      }
    }
  }

  const ranked: TopTenLeaderboardRow[] = Array.from(bestByUser.values())
    .sort((a, b) => {
      if (b.best.score !== a.best.score) return b.best.score - a.best.score;
      if (b.best.accuracyPercent !== a.best.accuracyPercent) {
        return b.best.accuracyPercent - a.best.accuracyPercent;
      }
      return a.best.createdAtMs - b.best.createdAtMs;
    })
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
