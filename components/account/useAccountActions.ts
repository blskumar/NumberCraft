'use client';

import { getAchievementById } from '@/lib/achievements';
import { consentGateError, EMPTY_CONSENT_GATE } from '@/components/ConsentGate';
import { readLocalConsentHint, writeLocalConsentHint } from '@/lib/consent';
import {
  recordSelfConsent,
  refreshConsentStatus,
  requestParentalConsent,
  withdrawConsent,
} from '@/lib/consent-client';
import { DAILY_PROBLEM_GOAL } from '@/lib/daily-goal';
import {
  deleteAccount,
  formatFirebaseAuthError,
  isEmailPasswordProviderDisabledError,
  registerWithEmail,
  resendVerificationEmail,
  sendAccountPasswordReset,
  signInWithEmail,
  signOutAccount,
  upsertUserProfileDoc,
} from '@/lib/firebase';
import { MODERATION_MESSAGES, validateDisplayName } from '@/lib/name-moderation';
import { DEFAULT_PROFILE } from '@/lib/storage';
import type { AchievementId, StudentProfile } from '@/lib/types';
import type { AccountState } from './useAccountState';

type NameCheck = ReturnType<typeof validateDisplayName>;
const nameError = (c: NameCheck) =>
  `${MODERATION_MESSAGES[c.reason!]} Try "${c.suggestion}".`;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isEmail = (email: string) => Boolean(email) && email.includes('@');

/** Form and account-lifecycle handlers (name, seals, sign in/up, reset, sign out, consent, delete). */
export function useAccountActions({
  profile, onUpdateProfile, onClearLocalProgress, isAuthenticated,
  nameInput, setNameInput, setStatusMessage, setErrorMessage, setIsSubmitting,
  emailInput, passwordInput, setPasswordInput, signupName, signupTier, sharedDevice,
  consentGate, setConsentGate, setConsentHint, setEmailVerified, setSection,
  pwStrength, earnedSet, wipeSharedOnSignOut, setConfirmSignOut, setWipeSharedOnSignOut,
  deletePassword, setConfirmDelete, setDeletePassword, setConfirmWithdraw,
}: AccountState) {
  /** Runs an async account action with the shared submitting/error handling. */
  async function submit(action: () => Promise<void>, warnIfProviderDisabled = false) {
    setIsSubmitting(true);
    try {
      await action();
    } catch (err) {
      if (
        warnIfProviderDisabled &&
        process.env.NODE_ENV !== 'production' &&
        isEmailPasswordProviderDisabledError(err)
      ) {
        console.warn('Enable Email/Password sign-in in the Firebase console.');
      }
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Reverts the profile to the signed-out guest identity (callers add their own overrides). */
  const toGuest = (overrides: Partial<StudentProfile>): StudentProfile => ({
    ...profile,
    uid: null,
    displayName: 'Guest Explorer',
    sessionKind: 'guest',
    authProvider: 'guest',
    email: null,
    sharedDeviceMode: false,
    ...overrides,
  });

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const nameCheck = validateDisplayName(nameInput);
    if (!nameCheck.ok) {
      setErrorMessage(nameError(nameCheck));
      return;
    }
    const nextName = nameCheck.clean;
    const updated: StudentProfile = { ...profile, displayName: nextName };
    onUpdateProfile(updated);

    if (isAuthenticated && profile.uid && profile.email) {
      try {
        await upsertUserProfileDoc({
          uid: profile.uid,
          displayName: nextName,
          email: profile.email,
          ageTier: updated.ageTier,
          dailyProblemGoal: updated.dailyProblemGoal ?? DAILY_PROBLEM_GOAL,
        });
        setStatusMessage('Display name updated and synced to your account.');
      } catch {
        setStatusMessage('Display name saved locally.');
      }
    } else {
      setStatusMessage('Display name updated and saved locally.');
    }
  }

  function handlePinSeal(id: AchievementId) {
    if (!earnedSet.has(id)) return;
    const nextFeatured = profile.featuredBadgeId === id ? null : id;
    onUpdateProfile({ ...profile, featuredBadgeId: nextFeatured });
    const def = getAchievementById(id);
    setErrorMessage(null);
    setStatusMessage(
      nextFeatured && def
        ? `Featured profile seal set to "${def.title}".`
        : 'Featured profile seal cleared.'
    );
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const cleanedEmail = normalizeEmail(emailInput);
    if (!isEmail(cleanedEmail)) {
      setErrorMessage('Enter a valid email address to sign in.');
      return;
    }
    if (passwordInput.length < 6) {
      setErrorMessage('Enter your password (at least 6 characters).');
      return;
    }

    await submit(async () => {
      const user = await signInWithEmail({
        email: cleanedEmail,
        password: passwordInput,
        sharedDevice,
      });
      const resolvedName =
        user.displayName?.trim() ||
        (profile.displayName !== 'Guest Explorer'
          ? profile.displayName
          : cleanedEmail.split('@')[0].slice(0, 20));
      onUpdateProfile({
        ...profile,
        uid: user.uid,
        displayName: resolvedName.slice(0, 28),
        sessionKind: 'authenticated',
        authProvider: 'email',
        email: user.email ?? cleanedEmail,
        sharedDeviceMode: sharedDevice,
      });
      setNameInput(resolvedName.slice(0, 28));
      setPasswordInput('');
      setSection('profile');
      // Best effort: align the local consent hint with the server record.
      void refreshConsentStatus(user.uid)
        .then(() => setConsentHint(readLocalConsentHint()))
        .catch(() => {});
      setStatusMessage(
        'Signed in! Unlimited levels unlocked and your per-game scores will save to the Daily & Weekly Top 10 Leaderboards.'
      );
    }, true);
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const nameCheck = validateDisplayName(signupName);
    const cleanedName = nameCheck.clean;
    const cleanedEmail = normalizeEmail(emailInput);
    if (!nameCheck.ok) {
      setErrorMessage(nameError(nameCheck));
      return;
    }
    if (!isEmail(cleanedEmail)) {
      setErrorMessage('Enter any valid email address to register for free.');
      return;
    }
    if (pwStrength.score < 3) {
      setErrorMessage(
        'Use at least 8 characters with both letters and numbers.'
      );
      return;
    }
    const gateError = consentGateError(consentGate, cleanedEmail);
    if (gateError) {
      setErrorMessage(gateError);
      return;
    }

    await submit(async () => {
      const user = await registerWithEmail({
        email: cleanedEmail,
        password: passwordInput,
        displayName: cleanedName,
        ageTier: signupTier,
        dailyProblemGoal: profile.dailyProblemGoal ?? DAILY_PROBLEM_GOAL,
        sharedDevice,
      });
      onUpdateProfile({
        ...profile,
        uid: user.uid,
        displayName: cleanedName.slice(0, 28),
        ageTier: signupTier,
        sessionKind: 'authenticated',
        authProvider: 'email',
        email: user.email ?? cleanedEmail,
        sharedDeviceMode: sharedDevice,
      });
      setNameInput(cleanedName.slice(0, 28));
      setPasswordInput('');
      setSection('profile');
      if (consentGate.ageBand === 'minor') {
        try {
          await requestParentalConsent({
            uid: user.uid,
            parentEmail: consentGate.parentEmail,
          });
        } catch {
          writeLocalConsentHint({
            uid: user.uid,
            status: 'pending-parental-consent',
            version: 'unsent',
          });
        }
        setConsentHint(readLocalConsentHint());
        setConsentGate(EMPTY_CONSENT_GATE);
        setStatusMessage(
          'Account created. We asked your parent or guardian to say yes. Until they do, your scores stay on this device and are not shown on the leaderboard.'
        );
        setEmailVerified(false);
        return;
      }
      try {
        await recordSelfConsent(user.uid);
      } catch {
        // Retry-able: without a server consent record scores are simply not posted.
        writeLocalConsentHint(null);
      }
      setConsentHint(readLocalConsentHint());
      setStatusMessage(
        'Free account created! Check your email and click the verification link: your scores appear on the Top 10 leaderboards once your email is verified.'
      );
      setEmailVerified(false);
    }, true);
  }

  async function handlePasswordRecovery(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const cleanedEmail = normalizeEmail(emailInput);
    if (!isEmail(cleanedEmail)) {
      setErrorMessage('Enter the email address associated with your account.');
      return;
    }

    await submit(async () => {
      await sendAccountPasswordReset(cleanedEmail);
      setStatusMessage(
        `If an account exists for ${cleanedEmail}, a password reset link has been sent to that inbox.`
      );
    });
  }

  async function handleConfirmSignOut() {
    setErrorMessage(null);
    await submit(async () => {
      await signOutAccount();
      writeLocalConsentHint(null); // consent hint belongs to the signed-in user only
      setConsentHint(null);
      if (wipeSharedOnSignOut) {
        onClearLocalProgress();
      }
      onUpdateProfile(
        toGuest({
          featuredBadgeId: wipeSharedOnSignOut ? null : profile.featuredBadgeId,
          // The wipe resets personal prefs; do not write the stale prop values back.
          ...(wipeSharedOnSignOut
            ? {
                ageTier: DEFAULT_PROFILE.ageTier,
                dailyProblemGoal: DEFAULT_PROFILE.dailyProblemGoal,
                soundEnabled: DEFAULT_PROFILE.soundEnabled,
              }
            : {}),
        })
      );
      setNameInput('Guest Explorer');
      setConfirmSignOut(false);
      setWipeSharedOnSignOut(false);
      setStatusMessage(
        wipeSharedOnSignOut
          ? 'Signed out securely and cleared cached local progress for the next student.'
          : 'Signed out securely. You are now back in Guest Mode.'
      );
    });
  }

  async function handleResendVerification() {
    setErrorMessage(null);
    try {
      await resendVerificationEmail();
      setStatusMessage('Verification email sent. Check your inbox (and spam).');
    } catch (err) {
      setErrorMessage(formatFirebaseAuthError(err));
    }
  }

  async function handleWithdrawConsent() {
    setErrorMessage(null);
    setStatusMessage(null);
    await submit(async () => {
      await withdrawConsent(profile.uid ?? '');
      setConsentHint(readLocalConsentHint());
      setConfirmWithdraw(false);
      setStatusMessage(
        'Consent withdrawn. Your online scores were removed and new scores stay on this device.'
      );
    });
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    await submit(async () => {
      await deleteAccount(deletePassword);
      writeLocalConsentHint(null);
      setConsentHint(null);
      onClearLocalProgress();
      onUpdateProfile(toGuest({ featuredBadgeId: null }));
      setNameInput('Guest Explorer');
      setConfirmDelete(false);
      setDeletePassword('');
      setStatusMessage(
        'Your account, profile and leaderboard scores were deleted.'
      );
    });
  }

  return {
    handleSaveName,
    handlePinSeal,
    handleEmailSignIn,
    handleEmailSignUp,
    handlePasswordRecovery,
    handleConfirmSignOut,
    handleResendVerification,
    handleWithdrawConsent,
    handleDeleteAccount,
  };
}
