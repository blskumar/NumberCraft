'use client';

import { useCallback } from 'react';
import {
  clearAllLocalProgress,
  loadProfile,
  saveDailyCompletions,
  saveMatches,
} from '@/lib/storage';
import { createSampleMatches, isSampleMatch } from '@/lib/notebook-analytics';
import {
  createSampleDashboardData,
  isSampleDailyCompletion,
} from '@/lib/performance-dashboard';
import type { MatchRecord } from '@/lib/types';
import type { AppData } from './useAppData';

/** Real matches + fresh samples (plus any extras), newest first. */
const withSamples = (prev: MatchRecord[], extra: MatchRecord[] = []) =>
  [...prev.filter((m) => !isSampleMatch(m)), ...createSampleMatches(), ...extra].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

/** Handlers that load / clear sample progress or wipe all local progress. */
export function useSampleData({
  profileRef, setProfile, matchesRef, setMatches, earnedBadgesRef, setEarnedBadges,
  dailyRef, setDailyCompletions, storedGuestTrialsRef, setStoredGuestTrials,
}: AppData) {
  const handleClearLocalProgress = useCallback(() => {
    clearAllLocalProgress(); // also clears guest trials + profile prefs
    storedGuestTrialsRef.current = {};
    setStoredGuestTrials({});
    const resetProfile = loadProfile();
    profileRef.current = resetProfile;
    setProfile(resetProfile);
    earnedBadgesRef.current = [];
    matchesRef.current = [];
    dailyRef.current = [];
    setMatches([]);
    setEarnedBadges([]);
    setDailyCompletions([]);
  }, [
    storedGuestTrialsRef, setStoredGuestTrials, profileRef, setProfile, earnedBadgesRef,
    matchesRef, dailyRef, setMatches, setEarnedBadges, setDailyCompletions,
  ]);

  const handleLoadSampleMatches = useCallback(() => {
    setMatches((prev) => {
      const merged = withSamples(prev);
      matchesRef.current = merged;
      saveMatches(merged);
      return merged;
    });
  }, [setMatches, matchesRef]);

  const handleClearSampleMatches = useCallback(() => {
    setMatches((prev) => {
      const realOnly = prev.filter((m) => !isSampleMatch(m));
      matchesRef.current = realOnly;
      saveMatches(realOnly);
      return realOnly;
    });
    setDailyCompletions((prev) => {
      const realDaily = prev.filter((c) => !isSampleDailyCompletion(c));
      dailyRef.current = realDaily;
      saveDailyCompletions(realDaily);
      return realDaily;
    });
  }, [setMatches, matchesRef, setDailyCompletions, dailyRef]);

  const handleLoadSampleDashboard = useCallback(() => {
    const { sampleMatches, sampleDaily } = createSampleDashboardData();
    setMatches((prev) => {
      const merged = withSamples(prev, sampleMatches);
      matchesRef.current = merged;
      saveMatches(merged);
      return merged;
    });
    setDailyCompletions((prev) => {
      const realOnly = prev.filter((c) => !isSampleDailyCompletion(c));
      const existingDates = new Set(realOnly.map((c) => c.dateKey));
      const mergedDaily = [
        ...realOnly,
        ...sampleDaily.filter((c) => !existingDates.has(c.dateKey)),
      ].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
      dailyRef.current = mergedDaily;
      saveDailyCompletions(mergedDaily);
      return mergedDaily;
    });
  }, [setMatches, matchesRef, setDailyCompletions, dailyRef]);

  return {
    handleClearLocalProgress,
    handleLoadSampleMatches,
    handleClearSampleMatches,
    handleLoadSampleDashboard,
  };
}
