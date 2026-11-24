import type { StreakGrowthEvent, StreakGrowthTriggerSnapshot } from './types';

/**
 * Detects whether a new daily Mastery Milestone, Daily Milestone arena win,
 * consecutive streak increase, or Daily Goal success was just recorded so the
 * streak line chart can play its celebratory CSS "growing" highlight animation.
 */
export function detectStreakGrowthEvent(
  prev: StreakGrowthTriggerSnapshot | null,
  next: StreakGrowthTriggerSnapshot
): StreakGrowthEvent {
  if (!prev) {
    if (next.milestoneCount > 0 && next.currentStreakDuration >= 3) {
      return {
        triggered: true,
        reason: 'mastery-milestone',
        bannerText: `Mastery Milestone active (${next.currentStreakDuration}d streak) — curve highlighted!`,
      };
    }
    if (next.dailyMilestoneCompletedToday) {
      return {
        triggered: true,
        reason: 'daily-milestone-arena',
        bannerText: 'Today’s Daily Milestone completed — 1.5× momentum active!',
      };
    }
    if (next.dailyGoalMetToday) {
      return {
        triggered: true,
        reason: 'daily-goal-success',
        bannerText: 'Daily Goal target met — streak momentum highlighted!',
      };
    }
    return { triggered: false, reason: null, bannerText: null };
  }

  if (next.milestoneCount > prev.milestoneCount) {
    return {
      triggered: true,
      reason: 'mastery-milestone',
      bannerText: `New Mastery Milestone recorded (${next.currentStreakDuration}d streak)!`,
    };
  }
  if (next.dailyMilestoneCompletedToday && !prev.dailyMilestoneCompletedToday) {
    return {
      triggered: true,
      reason: 'daily-milestone-arena',
      bannerText: 'Daily Milestone Arena completed — 1.5× streak boost recorded!',
    };
  }
  if (
    next.currentStreakDuration > prev.currentStreakDuration &&
    next.currentStreakDuration >= 2
  ) {
    return {
      triggered: true,
      reason: 'consecutive-streak',
      bannerText: `Consecutive streak grew to ${next.currentStreakDuration} days!`,
    };
  }
  if (next.dailyGoalMetToday && !prev.dailyGoalMetToday) {
    return {
      triggered: true,
      reason: 'daily-goal-success',
      bannerText: 'Daily Goal reached — consecutive goal momentum growing!',
    };
  }

  return { triggered: false, reason: null, bannerText: null };
}
