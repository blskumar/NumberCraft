'use client';

import { useCallback, useState, type MutableRefObject } from 'react';
import {
  evaluateAchievements,
  type AchievementDefinition,
  type AchievementEvaluation,
} from '@/lib/achievements';
import { hintAllowsCloudScores, readLocalConsentHint } from '@/lib/consent';
import { buildDailyMatchRecord, getLocalDateKey } from '@/lib/daily-challenge';
import {
  DAILY_MILESTONE_MULTIPLIER,
  evaluateDailyMilestone,
  getDailyMilestoneForDate,
  isMatchForDailyMilestoneArena,
} from '@/lib/daily-milestone';
import { saveCloudGameScore } from '@/lib/firebase';
import {
  incrementGuestTrialUsage,
  resolveGameIdFromMatch,
  saveGuestTrialUsage,
  type PlayableGameId,
} from '@/lib/guest-trial';
import {
  buildDailyScoreStats,
  buildMatchScoreStats,
  type ScoreStats,
} from '@/lib/score-stats';
import { playAchievementChime } from '@/lib/sound';
import {
  saveEarnedBadges,
  saveProfile,
  tryAppendMatch,
  upsertDailyCompletion,
} from '@/lib/storage';
import type {
  AchievementId,
  AgeTier,
  DailyChallengeCompletion,
  MatchRecord,
  StudentProfile,
} from '@/lib/types';
import { estimateMatchAccuracy } from './appHelpers';
import type { AppData } from './useAppData';
import type { SessionTracking } from './useSessionTracking';

/** Recording of finished rounds (match ledger, daily completions, guest-trial credit / cloud score, seal unlocks and celebration signals). */
export function useMatchRecording(
  {
    profileRef, setProfile, matchesRef, setMatches, earnedBadgesRef, setEarnedBadges,
    dailyRef, setDailyCompletions, storedGuestTrialsRef, setStoredGuestTrials,
  }: AppData,
  sessionAccumulatorRef: SessionTracking['sessionAccumulatorRef']
) {
  const [recentlyUnlockedBadgeIds, setRecentlyUnlockedBadgeIds] = useState<
    AchievementId[]
  >([]);
  // Confetti burst counter & MasteryProgressBar unlock highlight signal
  const [confettiTriggerKey, setConfettiTriggerKey] = useState(0);
  const [masteryUnlockEventKey, setMasteryUnlockEventKey] = useState(0);
  const [latestUnlockedSealTitle, setLatestUnlockedSealTitle] = useState<
    string | null
  >(null);

  const recordGuestTrialOrPersistCloudScore = useCallback(
    (params: {
      gameId: PlayableGameId;
      tier: AgeTier;
      score: number;
      accuracyPercent: number;
      dateKey: string;
      stats: ScoreStats;
    }) => {
      const currentProfile = profileRef.current;
      const signedIn =
        currentProfile.sessionKind === 'authenticated' &&
        Boolean(currentProfile.uid);

      // Minors without granted parental consent never write cloud scores
      // (docs/legal/04); server rules must enforce the same (owner action).
      if (
        signedIn &&
        currentProfile.uid &&
        hintAllowsCloudScores(readLocalConsentHint(), currentProfile.uid)
      ) {
        void saveCloudGameScore({
          uid: currentProfile.uid,
          displayName: currentProfile.displayName,
          gameId: params.gameId,
          tier: params.tier,
          score: params.score,
          accuracyPercent: params.accuracyPercent,
          dateKey: params.dateKey,
          stats: params.stats,
        }).catch(() => {
          // Non-blocking cloud score write (logged by handleFirestoreError)
        });
      } else {
        const updatedTrials = incrementGuestTrialUsage(
          storedGuestTrialsRef.current,
          params.gameId
        );
        storedGuestTrialsRef.current = updatedTrials;
        setStoredGuestTrials(updatedTrials);
        saveGuestTrialUsage(updatedTrials);
      }
    },
    [profileRef, storedGuestTrialsRef, setStoredGuestTrials]
  );

  /** Persists newly unlocked seals, signals the unlock highlight, and features the first seal if none is pinned. */
  const registerUnlocks = useCallback(
    (evaluation: AchievementEvaluation) => {
      const acc = sessionAccumulatorRef.current;
      const newIds = evaluation.newlyUnlocked.map((b) => b.id);
      const newTitles = evaluation.newlyUnlocked.map((b) => b.title);
      acc.newlyEarnedSeals = Array.from(
        new Set([...acc.newlyEarnedSeals, ...newTitles])
      );
      earnedBadgesRef.current = evaluation.earnedRecords;
      setEarnedBadges(evaluation.earnedRecords);
      setRecentlyUnlockedBadgeIds((prev) =>
        Array.from(new Set([...prev, ...newIds]))
      );
      saveEarnedBadges(evaluation.earnedRecords);
      setLatestUnlockedSealTitle(evaluation.newlyUnlocked[0].title);
      setMasteryUnlockEventKey((k) => k + 1);

      if (!profileRef.current.featuredBadgeId) {
        const nextProfile: StudentProfile = {
          ...profileRef.current,
          featuredBadgeId: evaluation.newlyUnlocked[0].id,
        };
        profileRef.current = nextProfile;
        setProfile(nextProfile);
        saveProfile(nextProfile);
      }
    },
    [sessionAccumulatorRef, earnedBadgesRef, setEarnedBadges, profileRef, setProfile]
  );

  const celebrate = useCallback(() => {
    setConfettiTriggerKey((k) => k + 1);
    playAchievementChime(profileRef.current.soundEnabled);
  }, [profileRef]);

  const handleRecordMatch = useCallback(
    (record: MatchRecord): AchievementDefinition[] => {
      const todayKey = getLocalDateKey();
      const todayMilestone = getDailyMilestoneForDate(todayKey);
      const wasCompletedBefore = evaluateDailyMilestone(
        matchesRef.current,
        todayKey
      ).completedToday;

      const qualifiesForDailyMilestone = isMatchForDailyMilestoneArena(
        record,
        todayMilestone.arenaId
      );
      const enrichedRecord: MatchRecord = qualifiesForDailyMilestone
        ? {
            ...record,
            dailyMilestoneMultiplier: DAILY_MILESTONE_MULTIPLIER,
          }
        : record;

      const appended = tryAppendMatch(enrichedRecord);
      const updatedMatches = appended.matches;
      matchesRef.current = updatedMatches;
      setMatches(updatedMatches);
      if (!appended.saved) {
        console.warn('Numbercraft: could not save this match (browser storage is full or blocked).');
      }

      // Track 1-level guest trial usage OR save score to Cloud Leaderboard for logged-in users.
      // Unknown titles map to null and are not credited; replays (same id) are not credited twice.
      const gameId = resolveGameIdFromMatch(enrichedRecord);
      if (gameId && appended.isNew) {
        recordGuestTrialOrPersistCloudScore({
          gameId,
          tier: enrichedRecord.tier,
          score: enrichedRecord.playerScore,
          accuracyPercent: estimateMatchAccuracy(enrichedRecord),
          dateKey: todayKey,
          stats: buildMatchScoreStats(enrichedRecord),
        });
      }

      if (qualifiesForDailyMilestone && !wasCompletedBefore) celebrate();

      // Accumulate session metrics for End-of-Session reflection modal
      const acc = sessionAccumulatorRef.current;
      acc.matchesRecorded += 1;
      if (record.arithmeticMeta) {
        acc.problemsSolved += record.arithmeticMeta.solved;
        acc.problemsAttempted += record.arithmeticMeta.attempted;
      } else if (
        record.gameTitle === 'Equation Foundry' ||
        record.gameTitle === 'Odds & Urns'
      ) {
        acc.problemsSolved += record.solvedProblems ?? 0;
        acc.problemsAttempted += 5;
      } else {
        acc.problemsSolved += record.result === 'win' ? 1 : 0;
        acc.problemsAttempted += 1;
      }

      const evaluation = evaluateAchievements(
        updatedMatches,
        earnedBadgesRef.current,
        dailyRef.current
      );

      if (evaluation.newlyUnlocked.length > 0) {
        registerUnlocks(evaluation);
        celebrate();
      }

      return evaluation.newlyUnlocked;
    },
    [
      matchesRef, setMatches, recordGuestTrialOrPersistCloudScore, celebrate,
      sessionAccumulatorRef, earnedBadgesRef, dailyRef, registerUnlocks,
    ]
  );

  const handleCompleteDaily = useCallback(
    (completion: DailyChallengeCompletion): AchievementDefinition[] => {
      const updatedDaily = upsertDailyCompletion(completion);
      dailyRef.current = updatedDaily;
      setDailyCompletions(updatedDaily);

      const dailyMatch = buildDailyMatchRecord(completion);
      const appended = tryAppendMatch(dailyMatch);
      const updatedMatches = appended.matches;
      matchesRef.current = updatedMatches;
      setMatches(updatedMatches);
      if (!appended.saved) {
        console.warn('Numbercraft: could not save the daily result (browser storage is full or blocked).');
      }

      const attempts = Math.max(1, 3 + completion.mistakes);
      const accuracyPercent = Math.round(
        (completion.stepsSolved / attempts) * 100
      );
      // A replayed daily has the same match id: credit the trial / cloud score once.
      if (appended.isNew) {
        recordGuestTrialOrPersistCloudScore({
          gameId: 'daily-challenge',
          tier: completion.tier,
          score: completion.score,
          accuracyPercent,
          dateKey: completion.dateKey,
          stats: buildDailyScoreStats(completion),
        });
      }

      const acc = sessionAccumulatorRef.current;
      acc.matchesRecorded += 1;
      acc.problemsSolved += completion.solved ? 3 : 0;
      acc.problemsAttempted += 3 + completion.mistakes;

      const evaluation = evaluateAchievements(
        updatedMatches,
        earnedBadgesRef.current,
        updatedDaily
      );

      if (evaluation.newlyUnlocked.length > 0) registerUnlocks(evaluation);

      if (completion.solved || evaluation.newlyUnlocked.length > 0) celebrate();

      return evaluation.newlyUnlocked;
    },
    [
      dailyRef, setDailyCompletions, matchesRef, setMatches, recordGuestTrialOrPersistCloudScore,
      sessionAccumulatorRef, earnedBadgesRef, registerUnlocks, celebrate,
    ]
  );

  return {
    recentlyUnlockedBadgeIds,
    setRecentlyUnlockedBadgeIds,
    confettiTriggerKey,
    masteryUnlockEventKey,
    latestUnlockedSealTitle,
    handleRecordMatch,
    handleCompleteDaily,
  };
}
