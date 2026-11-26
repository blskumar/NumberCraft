import { getLocalDateKey, shiftDateKey } from '../daily-challenge';
import { finiteOr, formatMonthDayFromDateKey, indexDailyByDate } from './helpers';
import { STREAK_MASTERY_MILESTONES, getStreakMasteryMilestone } from './types';
import type { DailyStreakDurationPoint, PeakStreakPeriod, DailyStreakTrendData } from './types';
import type { DailyChallengeCompletion } from '../types';

export function buildDailyStreakDurationSeries(
  dailyCompletions: DailyChallengeCompletion[],
  todayKey: string = getLocalDateKey(),
  days: number = 30
): DailyStreakTrendData {
  const safeDays = Math.max(7, Math.min(90, Math.floor(finiteOr(days, 30))));
  const dailyByDate = indexDailyByDate(dailyCompletions);
  const solvedDates = new Set<string>();

  for (const c of dailyCompletions) {
    if (c.solved) {
      solvedDates.add(c.dateKey);
    }
  }

  // Compute exact streak entering the first day of the window
  const firstWindowDate = shiftDateKey(todayKey, -(safeDays - 1));
  let priorStreak = 0;
  let probe = shiftDateKey(firstWindowDate, -1);
  while (solvedDates.has(probe)) {
    priorStreak += 1;
    probe = shiftDateKey(probe, -1);
  }

  const rawPoints: Omit<
    DailyStreakDurationPoint,
    'isPeakPoint' | 'inPeakPeriod' | 'isMasteryMilestone' | 'milestone'
  >[] = [];
  let running = priorStreak;
  let peakStreakDuration = 0;
  let activeStreakDays = 0;

  for (let offset = -(safeDays - 1); offset <= 0; offset += 1) {
    const dateKey = shiftDateKey(todayKey, offset);
    const parts = dateKey.split('-').map(Number);
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const shortDay = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const entry = dailyByDate.get(dateKey);
    const solved = Boolean(entry?.solved);

    if (solved) {
      running += 1;
      activeStreakDays += 1;
      if (running > peakStreakDuration) {
        peakStreakDuration = running;
      }
    } else {
      running = 0;
    }

    rawPoints.push({
      index: offset + safeDays,
      dateKey,
      dateLabel: formatMonthDayFromDateKey(dateKey),
      shortDay,
      isToday: dateKey === todayKey,
      solved,
      streakLength: running,
      editionNumber: entry?.editionNumber ?? null,
      archetypeTitle: entry?.archetypeTitle ?? null,
      score: entry?.score ?? 0,
    });
  }

  // Segment contiguous solved runs to identify peak streak periods & average run length
  interface RunSpan {
    startIdx: number;
    endIdx: number;
    maxLength: number;
  }
  const runs: RunSpan[] = [];
  let runStart = -1;
  let runMax = 0;

  for (let i = 0; i < rawPoints.length; i += 1) {
    const pt = rawPoints[i];
    if (pt.solved) {
      if (runStart === -1) {
        runStart = i;
        runMax = pt.streakLength;
      } else if (pt.streakLength > runMax) {
        runMax = pt.streakLength;
      }
    } else if (runStart !== -1) {
      runs.push({ startIdx: runStart, endIdx: i - 1, maxLength: runMax });
      runStart = -1;
      runMax = 0;
    }
  }
  if (runStart !== -1) {
    runs.push({
      startIdx: runStart,
      endIdx: rawPoints.length - 1,
      maxLength: runMax,
    });
  }

  const peakRunIndexSet = new Set<number>();
  const peakPeriods: PeakStreakPeriod[] = [];

  if (peakStreakDuration > 0) {
    for (const run of runs) {
      if (run.maxLength === peakStreakDuration) {
        for (let idx = run.startIdx; idx <= run.endIdx; idx += 1) {
          peakRunIndexSet.add(idx);
        }
        const first = rawPoints[run.startIdx];
        const last = rawPoints[run.endIdx];
        peakPeriods.push({
          startDateKey: first.dateKey,
          endDateKey: last.dateKey,
          startLabel: first.dateLabel,
          endLabel: last.dateLabel,
          peakLength: run.maxLength,
        });
      }
    }
  }

  const points: DailyStreakDurationPoint[] = rawPoints.map((pt, idx) => {
    const milestone = pt.solved
      ? getStreakMasteryMilestone(pt.streakLength)
      : null;
    return {
      ...pt,
      isPeakPoint:
        peakStreakDuration > 0 && pt.streakLength === peakStreakDuration,
      inPeakPeriod: peakRunIndexSet.has(idx),
      isMasteryMilestone: milestone !== null,
      milestone,
    };
  });

  const milestoneDays = points.filter((p) => p.isMasteryMilestone);

  const lastPt = points[points.length - 1];
  const prevPt = points.length >= 2 ? points[points.length - 2] : null;
  const currentStreakDuration =
    lastPt && lastPt.streakLength > 0
      ? lastPt.streakLength
      : prevPt?.streakLength ?? 0;

  const nextMilestoneTarget =
    STREAK_MASTERY_MILESTONES.find(
      (m) => m.streakDay > currentStreakDuration
    ) ?? null;

  const averageRunLength =
    runs.length > 0
      ? Number(
          (
            runs.reduce((sum, r) => sum + r.maxLength, 0) / runs.length
          ).toFixed(1)
        )
      : 0;

  return {
    points,
    peakPeriods,
    milestoneDays,
    nextMilestoneTarget,
    peakStreakDuration,
    currentStreakDuration,
    averageRunLength,
    activeStreakDays,
    windowDays: safeDays,
    startDateLabel: points[0]?.dateLabel ?? todayKey,
    endDateLabel: points[points.length - 1]?.dateLabel ?? todayKey,
  };
}
