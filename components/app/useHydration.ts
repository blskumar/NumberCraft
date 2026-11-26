'use client';

import { useEffect, useState } from 'react';
import { evaluateAchievements } from '@/lib/achievements';
import { loadGuestTrialUsage } from '@/lib/guest-trial';
import {
  loadDailyCompletions,
  loadEarnedBadges,
  loadMatches,
  loadProfile,
  saveEarnedBadges,
  saveProfile,
} from '@/lib/storage';
import {
  applyThemeToDocument,
  loadThemePreference,
  readStoredThemePreference,
} from '@/lib/theme';
import type { ThemePreference } from '@/lib/types';
import type { AppData } from './useAppData';

/** Hydrates local profile, guest trial usage, match ledger, daily history, and latched Mastery Seals once on mount. */
export function useHydration(
  {
    profileRef, earnedBadgesRef, matchesRef, dailyRef, storedGuestTrialsRef,
    setProfile, setMatches, setEarnedBadges, setDailyCompletions, setStoredGuestTrials,
  }: AppData,
  setThemePreference: (t: ThemePreference) => void
) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
      const loadedProfile = loadProfile();
      const loadedMatches = loadMatches();
      const loadedBadges = loadEarnedBadges();
      const loadedDaily = loadDailyCompletions();
      const loadedGuestTrials = loadGuestTrialUsage();
      // Single source of truth: the theme key wins over the profile mirror.
      const loadedTheme = readStoredThemePreference() ?? loadedProfile.themePreference ?? loadThemePreference();
      applyThemeToDocument(loadedTheme);
      setThemePreference(loadedTheme);

      const reconciled = evaluateAchievements(
        loadedMatches,
        loadedBadges,
        loadedDaily
      );
      let nextProfile = loadedProfile;
      if (reconciled.newlyUnlocked.length > 0) {
        saveEarnedBadges(reconciled.earnedRecords);
        if (!loadedProfile.featuredBadgeId) {
          nextProfile = {
            ...loadedProfile,
            featuredBadgeId: reconciled.newlyUnlocked[0].id,
          };
          saveProfile(nextProfile);
        }
      }

      profileRef.current = nextProfile;
      earnedBadgesRef.current = reconciled.earnedRecords;
      matchesRef.current = loadedMatches;
      dailyRef.current = loadedDaily;
      storedGuestTrialsRef.current = loadedGuestTrials;
      setProfile(nextProfile);
      setMatches(loadedMatches);
      setEarnedBadges(reconciled.earnedRecords);
      setDailyCompletions(loadedDaily);
      setStoredGuestTrials(loadedGuestTrials);
      } catch {
        // Unexpected stored data: fall back to defaults instead of hanging.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    profileRef, earnedBadgesRef, matchesRef, dailyRef, storedGuestTrialsRef,
    setProfile, setMatches, setEarnedBadges, setDailyCompletions, setStoredGuestTrials,
    setThemePreference,
  ]);

  return hydrated;
}
