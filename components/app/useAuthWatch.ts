'use client';

import { useEffect, useState } from 'react';
import { DAILY_PROBLEM_GOAL } from '@/lib/daily-goal';
import { fetchUserProfileDoc, subscribeToAuthState } from '@/lib/firebase';
import { saveProfile } from '@/lib/storage';
import type { StudentProfile } from '@/lib/types';
import type { AppData } from './useAppData';

/** Guests never load Firebase: auth is watched only once a signed-in profile is seen (restored from storage, or after sign-in). */
export function useAuthWatch(
  { profile, profileRef, setProfile }: AppData,
  hydrated: boolean
) {
  const [watchAuth, setWatchAuth] = useState(false);
  if (profile.sessionKind === 'authenticated' && !watchAuth) {
    setWatchAuth(true);
  }

  useEffect(() => {
    // Wait for hydration so the auth callback never overwrites the stored profile.
    if (!watchAuth || !hydrated) return;
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        let remoteProfile = null;
        try {
          remoteProfile = await fetchUserProfileDoc(firebaseUser.uid);
        } catch {
          remoteProfile = null;
        }

        const current = profileRef.current;
        const resolvedName =
          remoteProfile?.displayName ||
          firebaseUser.displayName?.trim() ||
          (current.displayName !== 'Guest Explorer'
            ? current.displayName
            : (firebaseUser.email ?? 'Scholar').split('@')[0].slice(0, 24));

        const nextProfile: StudentProfile = {
          ...current,
          uid: firebaseUser.uid,
          displayName: resolvedName.slice(0, 28),
          ageTier: remoteProfile?.ageTier ?? current.ageTier,
          dailyProblemGoal:
            remoteProfile?.dailyProblemGoal ??
            current.dailyProblemGoal ??
            DAILY_PROBLEM_GOAL,
          sessionKind: 'authenticated',
          authProvider: 'email',
          email: firebaseUser.email ?? remoteProfile?.email ?? current.email,
        };
        profileRef.current = nextProfile;
        setProfile(nextProfile);
        saveProfile(nextProfile);
      } else {
        const current = profileRef.current;
        if (current.sessionKind === 'authenticated' || current.uid) {
          const guestProfile: StudentProfile = {
            ...current,
            uid: null,
            sessionKind: 'guest',
            authProvider: 'guest',
            email: null,
          };
          profileRef.current = guestProfile;
          setProfile(guestProfile);
          saveProfile(guestProfile);
        }
      }
    });

    return () => unsubscribe();
  }, [watchAuth, hydrated, profileRef, setProfile]);
}
