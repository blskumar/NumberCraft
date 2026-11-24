'use client';

import { useRef, useState } from 'react';
import type { GuestTrialUsageMap } from '@/lib/guest-trial';
import { DEFAULT_PROFILE } from '@/lib/storage';
import type {
  DailyChallengeCompletion,
  EarnedBadgeRecord,
  MatchRecord,
  StudentProfile,
} from '@/lib/types';

/** Persisted app data (profile, match ledger, badges, daily history, guest trials) plus the ref mirrors read by async handlers. */
export function useAppData() {
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeRecord[]>([]);
  const [dailyCompletions, setDailyCompletions] = useState<
    DailyChallengeCompletion[]
  >([]);
  const [storedGuestTrials, setStoredGuestTrials] =
    useState<GuestTrialUsageMap>({});

  const earnedBadgesRef = useRef<EarnedBadgeRecord[]>(earnedBadges);
  const profileRef = useRef<StudentProfile>(profile);
  const matchesRef = useRef<MatchRecord[]>(matches);
  const dailyRef = useRef<DailyChallengeCompletion[]>(dailyCompletions);
  const storedGuestTrialsRef = useRef<GuestTrialUsageMap>(storedGuestTrials);

  return {
    profile, setProfile, profileRef,
    matches, setMatches, matchesRef,
    earnedBadges, setEarnedBadges, earnedBadgesRef,
    dailyCompletions, setDailyCompletions, dailyRef,
    storedGuestTrials, setStoredGuestTrials, storedGuestTrialsRef,
  };
}

export type AppData = ReturnType<typeof useAppData>;
