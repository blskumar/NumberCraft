import { TIER_SPECS } from './factor-grid-engine';
import type { AgeTier, MatchRecord, PlayMode } from './types';

export type ModeFilter = 'all' | PlayMode;
export type TierFilter = 'all' | AgeTier;

export interface TrendPoint {
  index: number;
  label: string;
  dateLabel: string;
  playerScore: number;
  opponentScore: number;
  scoreMargin: number;
  primesClaimed: number;
  mode: PlayMode;
  modeLabel: string;
  tier: AgeTier;
  tierLabel: string;
  result: 'win' | 'loss' | 'draw';
  opponentName: string;
}

export interface BreakdownBucket {
  key: string;
  label: string;
  shortLabel: string;
  matches: number;
  wins: number;
  winRate: number;
  avgScore: number;
  avgOpponentScore: number;
  avgMargin: number;
  totalPrimes: number;
}

export interface TrendSummary {
  hasTrend: boolean;
  scoreDelta: number;
  winRatePercent: number;
  avgScore: number;
  avgMargin: number;
}

export const MODE_LABELS: Record<PlayMode, string> = {
  solo: 'Solo · Taxman',
  'vs-ai': 'Human vs. AI',
  local: 'Pass-and-Play',
};

const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];
const MODE_ORDER: PlayMode[] = ['vs-ai', 'solo', 'local'];

export function filterMatches(
  matches: MatchRecord[],
  modeFilter: ModeFilter,
  tierFilter: TierFilter
): MatchRecord[] {
  return matches.filter((m) => {
    const modeOk = modeFilter === 'all' || m.mode === modeFilter;
    const tierOk = tierFilter === 'all' || m.tier === tierFilter;
    return modeOk && tierOk;
  });
}

function formatShortDate(iso: string, fallbackIndex: number): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return `Match ${fallbackIndex}`;
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function buildTimelineSeries(matches: MatchRecord[]): TrendPoint[] {
  if (matches.length === 0) return [];

  // Sort chronologically oldest -> newest so trends read left-to-right over time
  const sorted = [...matches].sort((a, b) => {
    const tA = new Date(a.playedAt).getTime();
    const tB = new Date(b.playedAt).getTime();
    if (Number.isNaN(tA) || Number.isNaN(tB)) return 0;
    return tA - tB;
  });

  return sorted.map((m, idx) => ({
    index: idx + 1,
    label: `#${idx + 1}`,
    dateLabel: formatShortDate(m.playedAt, idx + 1),
    playerScore: m.playerScore,
    opponentScore: m.opponentScore,
    scoreMargin: m.playerScore - m.opponentScore,
    primesClaimed: m.primesClaimed,
    mode: m.mode,
    modeLabel: MODE_LABELS[m.mode],
    tier: m.tier,
    tierLabel: TIER_SPECS[m.tier].label,
    result: m.result,
    opponentName: m.opponentName,
  }));
}

function aggregateBucket(
  key: string,
  label: string,
  shortLabel: string,
  items: MatchRecord[]
): BreakdownBucket {
  const count = items.length;
  if (count === 0) {
    return {
      key,
      label,
      shortLabel,
      matches: 0,
      wins: 0,
      winRate: 0,
      avgScore: 0,
      avgOpponentScore: 0,
      avgMargin: 0,
      totalPrimes: 0,
    };
  }

  const wins = items.filter((m) => m.result === 'win').length;
  const totalPlayer = items.reduce((s, m) => s + m.playerScore, 0);
  const totalOpp = items.reduce((s, m) => s + m.opponentScore, 0);
  const totalPrimes = items.reduce((s, m) => s + m.primesClaimed, 0);

  return {
    key,
    label,
    shortLabel,
    matches: count,
    wins,
    winRate: Math.round((wins / count) * 100),
    avgScore: Math.round(totalPlayer / count),
    avgOpponentScore: Math.round(totalOpp / count),
    avgMargin: Math.round((totalPlayer - totalOpp) / count),
    totalPrimes,
  };
}

export function buildTierBreakdown(matches: MatchRecord[]): BreakdownBucket[] {
  return TIER_ORDER.map((tier) => {
    const spec = TIER_SPECS[tier];
    const items = matches.filter((m) => m.tier === tier);
    return aggregateBucket(
      tier,
      `${spec.label} (${spec.ageRange})`,
      spec.label,
      items
    );
  });
}

export function buildModeBreakdown(matches: MatchRecord[]): BreakdownBucket[] {
  return MODE_ORDER.map((mode) => {
    const items = matches.filter((m) => m.mode === mode);
    const shortLabel =
      mode === 'vs-ai' ? 'vs. AI' : mode === 'solo' ? 'Solo' : 'Pass & Play';
    return aggregateBucket(mode, MODE_LABELS[mode], shortLabel, items);
  });
}

export function computeTrendSummary(series: TrendPoint[]): TrendSummary {
  if (series.length === 0) {
    return {
      hasTrend: false,
      scoreDelta: 0,
      winRatePercent: 0,
      avgScore: 0,
      avgMargin: 0,
    };
  }

  const wins = series.filter((p) => p.result === 'win').length;
  const avgScore = Math.round(
    series.reduce((acc, p) => acc + p.playerScore, 0) / series.length
  );
  const avgMargin = Math.round(
    series.reduce((acc, p) => acc + p.scoreMargin, 0) / series.length
  );

  if (series.length < 2) {
    return {
      hasTrend: false,
      scoreDelta: 0,
      winRatePercent: Math.round((wins / series.length) * 100),
      avgScore,
      avgMargin,
    };
  }

  const split = Math.floor(series.length / 2);
  const early = series.slice(0, split);
  const recent = series.slice(split);

  const earlyAvg =
    early.reduce((acc, p) => acc + p.scoreMargin, 0) / early.length;
  const recentAvg =
    recent.reduce((acc, p) => acc + p.scoreMargin, 0) / recent.length;

  return {
    hasTrend: true,
    scoreDelta: Math.round((recentAvg - earlyAvg) * 10) / 10,
    winRatePercent: Math.round((wins / series.length) * 100),
    avgScore,
    avgMargin,
  };
}

export function isSampleMatch(match: MatchRecord): boolean {
  return match.id.startsWith('sample-');
}

export function createSampleMatches(): MatchRecord[] {
  return [
    {
      id: 'sample-1',
      gameTitle: 'Factor Grid',
      mode: 'solo',
      tier: 'explorers',
      variant: 'classic',
      playerScore: 98,
      opponentScore: 112,
      opponentName: 'The Taxman',
      result: 'loss',
      primesClaimed: 1,
      playedAt: '2026-11-04T15:10:00.000Z',
    },
    {
      id: 'sample-2',
      gameTitle: 'Factor Grid',
      mode: 'vs-ai',
      aiDifficulty: 'apprentice',
      tier: 'explorers',
      variant: 'classic',
      playerScore: 118,
      opponentScore: 86,
      opponentName: 'AI · Apprentice',
      result: 'win',
      primesClaimed: 2,
      playedAt: '2026-11-06T16:20:00.000Z',
    },
    {
      id: 'sample-3',
      gameTitle: 'Factor Grid',
      mode: 'local',
      tier: 'explorers',
      variant: 'prime-trap',
      playerScore: 126,
      opponentScore: 92,
      opponentName: 'Leo',
      result: 'win',
      primesClaimed: 2,
      playedAt: '2026-11-08T14:45:00.000Z',
    },
    {
      id: 'sample-4',
      gameTitle: 'Factor Grid',
      mode: 'solo',
      tier: 'challengers',
      variant: 'classic',
      playerScore: 318,
      opponentScore: 348,
      opponentName: 'The Taxman',
      result: 'loss',
      primesClaimed: 2,
      playedAt: '2026-11-10T17:00:00.000Z',
    },
    {
      id: 'sample-5',
      gameTitle: 'Factor Grid',
      mode: 'vs-ai',
      aiDifficulty: 'scholar',
      tier: 'challengers',
      variant: 'classic',
      playerScore: 346,
      opponentScore: 312,
      opponentName: 'AI · Scholar',
      result: 'win',
      primesClaimed: 3,
      playedAt: '2026-11-12T15:30:00.000Z',
    },
    {
      id: 'sample-6',
      gameTitle: 'Factor Grid',
      mode: 'local',
      tier: 'challengers',
      variant: 'prime-trap',
      playerScore: 362,
      opponentScore: 310,
      opponentName: 'Maya',
      result: 'win',
      primesClaimed: 4,
      playedAt: '2026-11-14T18:05:00.000Z',
    },
    {
      id: 'sample-7',
      gameTitle: 'Factor Grid',
      mode: 'vs-ai',
      aiDifficulty: 'master',
      tier: 'strategists',
      variant: 'classic',
      playerScore: 594,
      opponentScore: 618,
      opponentName: 'AI · Master',
      result: 'loss',
      primesClaimed: 3,
      playedAt: '2026-11-15T16:40:00.000Z',
    },
    {
      id: 'sample-8',
      gameTitle: 'Factor Grid',
      mode: 'solo',
      tier: 'strategists',
      variant: 'prime-trap',
      playerScore: 642,
      opponentScore: 590,
      opponentName: 'The Taxman',
      result: 'win',
      primesClaimed: 4,
      playedAt: '2026-11-17T15:15:00.000Z',
    },
    {
      id: 'sample-9',
      gameTitle: 'Factor Grid',
      mode: 'vs-ai',
      aiDifficulty: 'master',
      tier: 'strategists',
      variant: 'prime-trap',
      playerScore: 668,
      opponentScore: 572,
      opponentName: 'AI · Master',
      result: 'win',
      primesClaimed: 5,
      playedAt: '2026-11-18T17:10:00.000Z',
    },
  ];
}
