import type { AchievementEvaluation, AchievementStatus } from './achievements';
import type { StudioTab } from '@/components/TopNav';

export interface ArenaSessionStats {
  arenaTab: StudioTab;
  arenaLabel: string;
  elapsedSeconds: number;
  problemsSolved: number;
  problemsAttempted: number;
  accuracyPercent: number | null;
  matchesRecorded: number;
  newlyEarnedSeals: string[];
  nextSeal: AchievementStatus | null;
}

export const ACTIVE_GAME_TABS: ReadonlySet<StudioTab> = new Set<StudioTab>([
  'play-arithmetic',
  'play-factor-grid',
  'daily',
  'play-equation-foundry',
  'play-odds-urns',
]);

export function isActiveGameTab(tab: StudioTab): boolean {
  return ACTIVE_GAME_TABS.has(tab);
}

/**
 * Formats elapsed session seconds into crisp mm:ss (or h:mm:ss above an hour).
 */
export function formatElapsedSessionClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Selects the closest unearned Mastery Seal so the End-of-Session modal
 * shows actionable progress toward the student's next milestone.
 */
export function selectNextMasterySeal(
  evaluation: AchievementEvaluation
): AchievementStatus | null {
  const unearned = evaluation.statuses.filter((s) => !s.earned);
  if (unearned.length === 0) return null;
  // Prefer the seal with the highest completion percentage (closest to unlock)
  return [...unearned].sort((a, b) => {
    if (b.percent !== a.percent) return b.percent - a.percent;
    return a.target - b.target;
  })[0];
}

export function buildEndOfSessionSummary(params: {
  arenaTab: StudioTab;
  arenaLabel: string;
  elapsedSeconds: number;
  problemsSolved: number;
  problemsAttempted: number;
  matchesRecorded: number;
  newlyEarnedSeals: string[];
  evaluation: AchievementEvaluation;
}): ArenaSessionStats {
  const accuracyPercent =
    params.problemsAttempted > 0
      ? Math.min(
          100,
          Math.round((params.problemsSolved / params.problemsAttempted) * 100)
        )
      : null;

  return {
    arenaTab: params.arenaTab,
    arenaLabel: params.arenaLabel,
    elapsedSeconds: Math.max(0, Math.floor(params.elapsedSeconds)),
    problemsSolved: Math.max(0, Math.floor(params.problemsSolved)),
    problemsAttempted: Math.max(0, Math.floor(params.problemsAttempted)),
    accuracyPercent,
    matchesRecorded: Math.max(0, Math.floor(params.matchesRecorded)),
    newlyEarnedSeals: params.newlyEarnedSeals,
    nextSeal: selectNextMasterySeal(params.evaluation),
  };
}
