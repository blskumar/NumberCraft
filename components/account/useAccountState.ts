'use client';

import { useEffect, useState } from 'react';
import { getAchievementById } from '@/lib/achievements';
import { checkEmailVerified } from '@/lib/firebase';
import { readLocalConsentHint, type LocalConsentHint } from '@/lib/consent';
import { EMPTY_CONSENT_GATE, type ConsentGateValue } from '@/components/ConsentGate';
import type { AgeTier } from '@/lib/types';
import {
  evaluatePasswordStrength,
  type AccountAuthMode,
  type AccountBodyProps,
  type AccountModalSection,
} from './types';

/** All AccountModal state and derived seal data. */
export function useAccountState(props: AccountBodyProps) {
  const {
    initialSection = 'profile',
    initialAuthMode = 'signin',
    registrationGateGameTitle = null,
    profile,
    achievementEvaluation,
    recentlyUnlockedBadgeIds = [],
  } = props;
  const isAuthenticated =
    profile.sessionKind === 'authenticated' && Boolean(profile.uid);

  const [section, setSection] = useState<AccountModalSection>(
    registrationGateGameTitle && !isAuthenticated ? 'auth' : initialSection
  );
  const [authMode, setAuthMode] = useState<AccountAuthMode>(
    registrationGateGameTitle && !isAuthenticated ? 'signup' : initialAuthMode
  );
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email & Password authentication fields
  const [emailInput, setEmailInput] = useState(profile.email ?? '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupName, setSignupName] = useState(
    profile.displayName === 'Guest Explorer' ? '' : profile.displayName
  );
  const [signupTier, setSignupTier] = useState<AgeTier>(profile.ageTier);
  // Child-safe default: session-only sign-in unless 'remember me' is ticked.
  const [rememberMe, setRememberMe] = useState(false);
  const sharedDevice = !rememberMe;
  const [consentGate, setConsentGate] =
    useState<ConsentGateValue>(EMPTY_CONSENT_GATE);
  const [consentHint, setConsentHint] = useState<LocalConsentHint | null>(
    () => readLocalConsentHint()
  );
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    checkEmailVerified()
      .then((ok) => alive && setEmailVerified(ok))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [wipeSharedOnSignOut, setWipeSharedOnSignOut] = useState(false);

  const earnedSet = new Set(
    achievementEvaluation.earnedRecords.map((record) => record.id)
  );
  const recentlyUnlockedSet = new Set(recentlyUnlockedBadgeIds);
  const newlyUnlockedDefs = recentlyUnlockedBadgeIds
    .map((id) => getAchievementById(id))
    .filter((def): def is NonNullable<typeof def> => Boolean(def));
  const activeFeatured =
    profile.featuredBadgeId && earnedSet.has(profile.featuredBadgeId)
      ? getAchievementById(profile.featuredBadgeId)
      : null;

  const pwStrength = evaluatePasswordStrength(passwordInput);

  return {
    ...props,
    registrationGateGameTitle,
    recentlyUnlockedBadgeIds,
    isAuthenticated,
    section, setSection,
    authMode, setAuthMode,
    nameInput, setNameInput,
    statusMessage, setStatusMessage,
    errorMessage, setErrorMessage,
    isSubmitting, setIsSubmitting,
    emailInput, setEmailInput,
    passwordInput, setPasswordInput,
    showPassword, setShowPassword,
    signupName, setSignupName,
    signupTier, setSignupTier,
    rememberMe, setRememberMe, sharedDevice,
    consentGate, setConsentGate,
    consentHint, setConsentHint,
    emailVerified, setEmailVerified,
    confirmDelete, setConfirmDelete,
    confirmWithdraw, setConfirmWithdraw,
    deletePassword, setDeletePassword,
    confirmSignOut, setConfirmSignOut,
    wipeSharedOnSignOut, setWipeSharedOnSignOut,
    earnedSet, recentlyUnlockedSet, newlyUnlockedDefs, activeFeatured, pwStrength,
  };
}

export type AccountState = ReturnType<typeof useAccountState>;
