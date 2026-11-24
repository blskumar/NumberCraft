import { ARITHMETIC_GAMES } from '../arithmetic-engine';
import { getEditionNumber, getLocalDateKey, shiftDateKey } from '../daily-challenge';
import type { AgeTier, ArithmeticGameId, DailyChallengeCompletion, MatchRecord } from '../types';

export function isSampleDailyCompletion(c: DailyChallengeCompletion): boolean {
  return c.isSample === true;
}

export function createSampleDashboardData(
  todayKey: string = getLocalDateKey()
): {
  sampleMatches: MatchRecord[];
  sampleDaily: DailyChallengeCompletion[];
} {
  const arithSpecs: {
    daysAgo: number;
    gameId: ArithmeticGameId;
    tier: AgeTier;
    solved: number;
    attempted: number;
    durationSeconds: number;
    score: number;
    startLvl: number;
    endLvl: number;
    peakLvl: number;
  }[] = [
    {
      daysAgo: 12,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 10,
      attempted: 14,
      durationSeconds: 60,
      score: 112,
      startLvl: 2,
      endLvl: 2,
      peakLvl: 2,
    },
    {
      daysAgo: 10,
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      solved: 11,
      attempted: 14,
      durationSeconds: 60,
      score: 126,
      startLvl: 2,
      endLvl: 2,
      peakLvl: 3,
    },
    {
      daysAgo: 9,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 12,
      attempted: 15,
      durationSeconds: 60,
      score: 142,
      startLvl: 1,
      endLvl: 2,
      peakLvl: 2,
    },
    {
      daysAgo: 7,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 14,
      attempted: 16,
      durationSeconds: 60,
      score: 168,
      startLvl: 2,
      endLvl: 3,
      peakLvl: 3,
    },
    {
      daysAgo: 5,
      gameId: 'subtraction-sprint',
      tier: 'challengers',
      solved: 15,
      attempted: 17,
      durationSeconds: 60,
      score: 184,
      startLvl: 2,
      endLvl: 3,
      peakLvl: 4,
    },
    {
      daysAgo: 3,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 16,
      attempted: 17,
      durationSeconds: 60,
      score: 212,
      startLvl: 2,
      endLvl: 4,
      peakLvl: 4,
    },
    {
      daysAgo: 2,
      gameId: 'addition-attack',
      tier: 'challengers',
      solved: 18,
      attempted: 19,
      durationSeconds: 60,
      score: 244,
      startLvl: 3,
      endLvl: 4,
      peakLvl: 4,
    },
    {
      daysAgo: 1,
      gameId: 'subtraction-sprint',
      tier: 'strategists',
      solved: 17,
      attempted: 18,
      durationSeconds: 60,
      score: 238,
      startLvl: 3,
      endLvl: 4,
      peakLvl: 5,
    },
    {
      daysAgo: 0,
      gameId: 'multiplication-mastery',
      tier: 'challengers',
      solved: 19,
      attempted: 20,
      durationSeconds: 60,
      score: 276,
      startLvl: 3,
      endLvl: 5,
      peakLvl: 5,
    },
  ];

  const sampleMatches: MatchRecord[] = arithSpecs.map((item, i) => {
    const dk = shiftDateKey(todayKey, -item.daysAgo);
    const acc = Math.round((item.solved / item.attempted) * 100);
    return {
      id: `sample-dash-arith-${i + 1}`,
      gameTitle: ARITHMETIC_GAMES[item.gameId].title,
      mode: 'solo',
      tier: item.tier,
      variant: 'classic',
      playerScore: item.score,
      opponentScore: 130,
      opponentName: '60s Par (130)',
      result: item.score >= 130 ? 'win' : 'loss',
      primesClaimed: 0,
      playedAt: `${dk}T16:30:00.000Z`,
      arithmeticMeta: {
        gameId: item.gameId,
        pace: 'standard',
        solved: item.solved,
        attempted: item.attempted,
        accuracyPercent: acc,
        bestStreak: Math.max(3, Math.floor(item.solved / 2)),
        durationSeconds: item.durationSeconds,
        maxStageReached: item.peakLvl,
        adaptiveEnabled: true,
        startAdaptiveLevel: item.startLvl,
        endAdaptiveLevel: item.endLvl,
        peakAdaptiveLevel: item.peakLvl,
      },
    };
  });

  const dailyOffsets: {
    daysAgo: number;
    archetype: DailyChallengeCompletion['archetype'];
    title: string;
    secondsUsed: number;
    mistakes: number;
    hintsUsed: number;
    score: number;
    streakDays: number;
    streakBonus: number;
  }[] = [
    {
      daysAgo: 24,
      archetype: 'equation-vault',
      title: 'Equation Vault',
      secondsUsed: 62,
      mistakes: 1,
      hintsUsed: 1,
      score: 156,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 23,
      archetype: 'divisor-cipher',
      title: 'Divisor & Sequence Cipher',
      secondsUsed: 54,
      mistakes: 1,
      hintsUsed: 0,
      score: 195,
      streakDays: 2,
      streakBonus: 15,
    },
    {
      daysAgo: 11,
      archetype: 'balance-scale',
      title: 'Algebraic Balance Scale',
      secondsUsed: 48,
      mistakes: 0,
      hintsUsed: 1,
      score: 182,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 2,
      archetype: 'mystery-number',
      title: 'Mystery Number Deduction',
      secondsUsed: 41,
      mistakes: 0,
      hintsUsed: 0,
      score: 254,
      streakDays: 1,
      streakBonus: 0,
    },
    {
      daysAgo: 1,
      archetype: 'equation-vault',
      title: 'Equation Vault',
      secondsUsed: 34,
      mistakes: 0,
      hintsUsed: 0,
      score: 277,
      streakDays: 2,
      streakBonus: 15,
    },
    {
      daysAgo: 0,
      archetype: 'balance-scale',
      title: 'Algebraic Balance Scale',
      secondsUsed: 29,
      mistakes: 0,
      hintsUsed: 0,
      score: 298,
      streakDays: 3,
      streakBonus: 30,
    },
  ];

  const sampleDaily: DailyChallengeCompletion[] = dailyOffsets.map((d) => {
    const dk = shiftDateKey(todayKey, -d.daysAgo);
    return {
      dateKey: dk,
      editionNumber: getEditionNumber(dk),
      tier: 'challengers',
      archetype: d.archetype,
      archetypeTitle: d.title,
      solved: true,
      stepsSolved: 3,
      secondsUsed: d.secondsUsed,
      timeLimitSeconds: 90,
      mistakes: d.mistakes,
      hintsUsed: d.hintsUsed,
      score: d.score,
      streakDays: d.streakDays,
      streakBonus: d.streakBonus > 0 ? d.streakBonus : undefined,
      completedAt: `${dk}T15:00:00.000Z`,
      isSample: true,
    };
  });

  return { sampleMatches, sampleDaily };
}
