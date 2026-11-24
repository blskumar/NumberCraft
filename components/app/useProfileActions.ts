'use client';

import { useCallback, useEffect, useState } from 'react';
import { clampDailyProblemGoal, DAILY_PROBLEM_GOAL } from '@/lib/daily-goal';
import { upsertUserProfileDoc } from '@/lib/firebase';
import { saveProfile } from '@/lib/storage';
import { playSoundPreviewChime } from '@/lib/sound';
import { applyThemeToDocument, saveThemePreference } from '@/lib/theme';
import type {
  AchievementId,
  AgeTier,
  StudentProfile,
  ThemePreference,
} from '@/lib/types';
import type { AppData } from './useAppData';

/** Profile mutations (tier, theme, sound, goal, featured seal) that persist locally and, for signed-in players, sync to the cloud profile. */
export function useProfileActions({ profileRef, setProfile }: AppData) {
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');

  const syncProfileToCloudIfSignedIn = useCallback((next: StudentProfile) => {
    if (next.sessionKind === 'authenticated' && next.uid && next.email) {
      void upsertUserProfileDoc({
        uid: next.uid,
        displayName: next.displayName,
        email: next.email,
        ageTier: next.ageTier,
        dailyProblemGoal: next.dailyProblemGoal ?? DAILY_PROBLEM_GOAL,
      }).catch(() => {
        // Non-blocking cloud profile sync
      });
    }
  }, []);

  const handleUpdateProfile = useCallback(
    (next: StudentProfile) => {
      profileRef.current = next;
      setProfile(next);
      saveProfile(next);
      syncProfileToCloudIfSignedIn(next);
    },
    [profileRef, setProfile, syncProfileToCloudIfSignedIn]
  );

  /** Functional profile update that mirrors the result into the ref + storage, then runs an optional side effect. */
  const patchProfile = useCallback(
    (patch: (prev: StudentProfile) => StudentProfile, after?: (next: StudentProfile) => void) => {
      setProfile((prev) => {
        const next = patch(prev);
        profileRef.current = next;
        saveProfile(next);
        after?.(next);
        return next;
      });
    },
    [profileRef, setProfile]
  );

  const handleSelectFeaturedBadge = useCallback(
    (id: AchievementId | null) => patchProfile((p) => ({ ...p, featuredBadgeId: id })),
    [patchProfile]
  );

  const handleChangeTier = useCallback(
    (tier: AgeTier) =>
      patchProfile((p) => ({ ...p, ageTier: tier }), syncProfileToCloudIfSignedIn),
    [patchProfile, syncProfileToCloudIfSignedIn]
  );

  const handleChangeTheme = useCallback(
    (nextTheme: ThemePreference) => {
      setThemePreference(nextTheme);
      saveThemePreference(nextTheme);
      applyThemeToDocument(nextTheme);
      patchProfile((p) => ({ ...p, themePreference: nextTheme }));
    },
    [patchProfile]
  );

  // Follow OS prefers-color-scheme live when user selected System mode
  useEffect(() => {
    applyThemeToDocument(themePreference);
    if (
      themePreference !== 'system' ||
      typeof window === 'undefined' ||
      !window.matchMedia
    ) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeToDocument('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePreference]);

  const handleToggleSound = useCallback(
    () =>
      patchProfile(
        (p) => ({ ...p, soundEnabled: !p.soundEnabled }),
        (next) => {
          if (next.soundEnabled) playSoundPreviewChime(true);
        }
      ),
    [patchProfile]
  );

  const handleChangeDailyGoal = useCallback(
    (nextGoal: number) =>
      patchProfile(
        (p) => ({ ...p, dailyProblemGoal: clampDailyProblemGoal(nextGoal) }),
        syncProfileToCloudIfSignedIn
      ),
    [patchProfile, syncProfileToCloudIfSignedIn]
  );

  return {
    themePreference,
    setThemePreference,
    handleUpdateProfile,
    handleSelectFeaturedBadge,
    handleChangeTier,
    handleChangeTheme,
    handleToggleSound,
    handleChangeDailyGoal,
  };
}
