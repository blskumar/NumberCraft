// Builds the `stats` object sent to the submitScore function from a finished
// match / daily completion. Pure; the server re-validates everything.
import { ARITHMETIC_PACES } from './arithmetic-engine';
import type { DailyChallengeCompletion, MatchRecord } from './types';

export type ScoreStats = Record<string, number | string | boolean>;

export function buildMatchScoreStats(record: MatchRecord): ScoreStats {
  const meta = record.arithmeticMeta;
  if (meta) {
    // The arena does not record "untimed"; a played duration beyond the pace
    // limit can only come from untimed practice.
    const paceSeconds = ARITHMETIC_PACES[meta.pace].seconds;
    return {
      solved: meta.solved,
      attempted: meta.attempted,
      durationSeconds: meta.durationSeconds,
      pace: meta.pace,
      bestStreak: meta.bestStreak,
      untimed: meta.durationSeconds > paceSeconds + 3,
    };
  }
  return { opponentScore: Math.max(0, Math.round(record.opponentScore)) };
}

export function buildDailyScoreStats(c: DailyChallengeCompletion): ScoreStats {
  return {
    stepsSolved: c.stepsSolved,
    mistakes: c.mistakes,
    hintsUsed: c.hintsUsed,
    secondsUsed: Math.max(0, Math.round(c.secondsUsed)),
    solved: c.solved,
  };
}
