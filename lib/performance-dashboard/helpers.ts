import { getLocalDateKey } from '../daily-challenge';
import type { DailyChallengeCompletion } from '../types';

export function toLocalDateKeyFromIso(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getLocalDateKey(parsed);
}

export function formatMonthDayFromDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMonthDayFromIso(iso: string, fallback: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** One completion per day; a later failed retry never hides an earlier solve. */
export function indexDailyByDate(
  completions: DailyChallengeCompletion[]
): Map<string, DailyChallengeCompletion> {
  const byDate = new Map<string, DailyChallengeCompletion>();
  for (const c of completions) {
    const cur = byDate.get(c.dateKey);
    if (!(cur?.solved && !c.solved)) byDate.set(c.dateKey, c);
  }
  return byDate;
}

export const finiteOr = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);
