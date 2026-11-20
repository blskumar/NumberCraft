import {
  calculateDailyScore,
  DAILY_TIME_LIMITS,
  generateDailyPuzzle,
  getLocalDateKey,
  parseDateKeyUTC,
} from './daily-challenge';
import { TIER_SPECS } from './factor-grid-engine';
import type {
  AgeTier,
  DailyChallengeCompletion,
  StudentProfile,
} from './types';

export type LeaderboardTierFilter = 'all' | AgeTier;

export interface DailyLeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  tier: AgeTier;
  tierLabel: string;
  score: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  mistakes: number;
  hintsUsed: number;
  streakDays: number;
  flawless: boolean;
  isCurrentUser: boolean;
}

export interface DailyLeaderboardSnapshot {
  dateKey: string;
  editionNumber: number;
  formattedDate: string;
  archetypeTitle: string;
  tierFilter: LeaderboardTierFilter;
  topFive: DailyLeaderboardEntry[];
  currentUserEntry: DailyLeaderboardEntry | null;
  currentUserSolvedToday: boolean;
  topFiveCutoffScore: number;
  pointsToTopFive: number | null;
  pointsToFirst: number | null;
  totalCohortSize: number;
}

interface CohortScholarSeed {
  id: string;
  displayName: string;
  tier: AgeTier;
}

const STUDIO_SCHOLAR_ROSTER: CohortScholarSeed[] = [
  { id: 'scholar-maya', displayName: 'Maya Lin', tier: 'challengers' },
  { id: 'scholar-leo', displayName: 'Leo Patel', tier: 'explorers' },
  { id: 'scholar-nora', displayName: 'Nora Vance', tier: 'strategists' },
  { id: 'scholar-samir', displayName: 'Samir Rao', tier: 'challengers' },
  { id: 'scholar-clara', displayName: 'Clara Osei', tier: 'strategists' },
  { id: 'scholar-owen', displayName: 'Owen Brooks', tier: 'explorers' },
  { id: 'scholar-hana', displayName: 'Hana Sato', tier: 'challengers' },
  { id: 'scholar-mateo', displayName: 'Mateo Cruz', tier: 'strategists' },
  { id: 'scholar-iris', displayName: 'Iris Chen', tier: 'explorers' },
  { id: 'scholar-elias', displayName: 'Elias Ward', tier: 'challengers' },
  { id: 'scholar-zara', displayName: 'Zara Malik', tier: 'strategists' },
  { id: 'scholar-noah', displayName: 'Noah Park', tier: 'explorers' },
  { id: 'scholar-tessa', displayName: 'Tessa Reed', tier: 'challengers' },
  { id: 'scholar-arjun', displayName: 'Arjun Nair', tier: 'strategists' },
  { id: 'scholar-milo', displayName: 'Milo Grant', tier: 'explorers' },
];

function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function compareEntries(
  a: Omit<DailyLeaderboardEntry, 'rank'>,
  b: Omit<DailyLeaderboardEntry, 'rank'>
): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.secondsUsed !== b.secondsUsed) return a.secondsUsed - b.secondsUsed;
  if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;
  if (a.hintsUsed !== b.hintsUsed) return a.hintsUsed - b.hintsUsed;
  if (a.isCurrentUser !== b.isCurrentUser) return a.isCurrentUser ? -1 : 1;
  return a.displayName.localeCompare(b.displayName);
}

/**
 * Generates deterministic daily studio cohort entries for a given dateKey and
 * merges the student's real completion for today (if solved) to compute the
 * Top 5 Daily Leaderboard snapshot.
 */
export function buildDailyLeaderboard(params: {
  profile: StudentProfile;
  dailyCompletions: DailyChallengeCompletion[];
  todayKey?: string;
  tierFilter?: LeaderboardTierFilter;
}): DailyLeaderboardSnapshot {
  const todayKey = params.todayKey ?? getLocalDateKey();
  const tierFilter: LeaderboardTierFilter = params.tierFilter ?? 'all';
  const puzzle = generateDailyPuzzle(todayKey, params.profile.ageTier);

  const dateSeed = parseDateKeyUTC(todayKey) / 86400000;
  const rng = createSeededRng(hashSeed(`nc-daily-lb-${todayKey}-${dateSeed}`));

  const normalizedUserName = params.profile.displayName.trim().toLowerCase();

  // Build deterministic studio cohort entries using the real Daily Challenge scoring formula
  const cohortCandidates: Omit<DailyLeaderboardEntry, 'rank'>[] =
    STUDIO_SCHOLAR_ROSTER.filter(
      (s) => s.displayName.toLowerCase() !== normalizedUserName
    ).map((scholar, idx) => {
      const limit = DAILY_TIME_LIMITS[scholar.tier];
      // Realistic spread from rapid 24% time used up to 74% time used
      const paceFraction = 0.24 + rng() * 0.5;
      const secondsUsed = Math.max(
        18,
        Math.min(limit - 6, Math.round(limit * paceFraction))
      );
      const rollPrecision = rng();
      const mistakes = rollPrecision < 0.58 ? 0 : rollPrecision < 0.88 ? 1 : 2;
      const hintsUsed = rng() < 0.72 ? 0 : 1;
      const streakRoll = rng();
      const streakDays =
        streakRoll < 0.25
          ? 1
          : streakRoll < 0.55
            ? 2
            : streakRoll < 0.8
              ? 3
              : streakRoll < 0.94
                ? 5
                : 7;

      const score = calculateDailyScore({
        solved: true,
        stepsSolved: 3,
        secondsUsed,
        timeLimitSeconds: limit,
        mistakes,
        hintsUsed,
        streakDays,
      });

      return {
        id: `${scholar.id}-${idx}`,
        displayName: scholar.displayName,
        tier: scholar.tier,
        tierLabel: TIER_SPECS[scholar.tier].label,
        score,
        secondsUsed,
        timeLimitSeconds: limit,
        mistakes,
        hintsUsed,
        streakDays,
        flawless: mistakes === 0 && hintsUsed === 0,
        isCurrentUser: false,
      };
    });

  const filteredCohort =
    tierFilter === 'all'
      ? cohortCandidates
      : cohortCandidates.filter((e) => e.tier === tierFilter);

  // Locate the student's completion for today (solved entries qualify for the leaderboard)
  const todayCompletion =
    params.dailyCompletions.find(
      (c) => c.dateKey === todayKey && c.solved
    ) ?? null;

  const userIncluded =
    todayCompletion !== null &&
    (tierFilter === 'all' || todayCompletion.tier === tierFilter);

  const combined: Omit<DailyLeaderboardEntry, 'rank'>[] = [...filteredCohort];

  if (userIncluded && todayCompletion) {
    combined.push({
      id: `current-user-${todayKey}`,
      displayName: params.profile.displayName || 'Guest Explorer',
      tier: todayCompletion.tier,
      tierLabel: TIER_SPECS[todayCompletion.tier].label,
      score: todayCompletion.score,
      secondsUsed: todayCompletion.secondsUsed,
      timeLimitSeconds: todayCompletion.timeLimitSeconds,
      mistakes: todayCompletion.mistakes,
      hintsUsed: todayCompletion.hintsUsed,
      streakDays: todayCompletion.streakDays ?? 1,
      flawless: todayCompletion.mistakes === 0 && todayCompletion.hintsUsed === 0,
      isCurrentUser: true,
    });
  }

  combined.sort(compareEntries);

  const ranked: DailyLeaderboardEntry[] = combined.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  const topFive = ranked.slice(0, 5);
  const currentUserEntry = ranked.find((r) => r.isCurrentUser) ?? null;
  const topFiveCutoffScore = topFive[topFive.length - 1]?.score ?? 0;
  const firstScore = topFive[0]?.score ?? 0;

  const pointsToTopFive =
    currentUserEntry === null
      ? topFiveCutoffScore + 1
      : currentUserEntry.rank <= 5
        ? 0
        : Math.max(1, topFiveCutoffScore - currentUserEntry.score + 1);

  const pointsToFirst =
    currentUserEntry === null
      ? null
      : currentUserEntry.rank === 1
        ? 0
        : Math.max(1, firstScore - currentUserEntry.score + 1);

  return {
    dateKey: todayKey,
    editionNumber: puzzle.editionNumber,
    formattedDate: puzzle.formattedDate,
    archetypeTitle: puzzle.archetypeTitle,
    tierFilter,
    topFive,
    currentUserEntry,
    currentUserSolvedToday: todayCompletion !== null,
    topFiveCutoffScore,
    pointsToTopFive,
    pointsToFirst,
    totalCohortSize: ranked.length,
  };
}
