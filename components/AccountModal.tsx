'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import {
  getAchievementById,
  type AchievementEvaluation,
} from '@/lib/achievements';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { playSoundPreviewChime } from '@/lib/sound';
import type { AchievementId, AgeTier, StudentProfile } from '@/lib/types';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  profile: StudentProfile;
  matchCount: number;
  achievementEvaluation: AchievementEvaluation;
  recentlyUnlockedBadgeIds?: AchievementId[];
  onUpdateProfile: (next: StudentProfile) => void;
  onClearLocalProgress: () => void;
  onOpenNotebook: () => void;
}

type ModalSection = 'profile' | 'auth';
type AuthMode = 'signin' | 'signup' | 'recovery';

function evaluatePasswordStrength(pw: string): {
  score: number;
  label: string;
  hasLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
} {
  const hasLength = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const score = [hasLength, hasLetter, hasNumber].filter(Boolean).length;
  const label =
    score === 0
      ? 'Enter 8+ characters'
      : score === 1
        ? 'Weak'
        : score === 2
          ? 'Fair'
          : 'Strong';
  return { score, label, hasLength, hasLetter, hasNumber };
}

function AccountModalBody({
  onClose,
  profile,
  matchCount,
  achievementEvaluation,
  recentlyUnlockedBadgeIds = [],
  onUpdateProfile,
  onClearLocalProgress,
  onOpenNotebook,
}: Omit<AccountModalProps, 'open'>) {
  // Mounted fresh each time modal opens so hydrated localStorage displayName is never stale (G2)
  const [section, setSection] = useState<ModalSection>('profile');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Interactive Auth Flow prototype fields
  const [emailInput, setEmailInput] = useState(profile.email ?? '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupName, setSignupName] = useState(
    profile.displayName === 'Guest Explorer' ? '' : profile.displayName
  );
  const [signupTier, setSignupTier] = useState<AgeTier>(profile.ageTier);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [sharedDevice, setSharedDevice] = useState(
    Boolean(profile.sharedDeviceMode)
  );
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [wipeSharedOnSignOut, setWipeSharedOnSignOut] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const cleaned = nameInput.trim();
    if (!cleaned) {
      setErrorMessage('Please enter a display name (at least 1 character).');
      return;
    }
    onUpdateProfile({ ...profile, displayName: cleaned.slice(0, 28) });
    setStatusMessage('Display name updated and saved locally.');
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

  function handleGoogleSignInPreview() {
    setErrorMessage(null);
    const cleaned = nameInput.trim() || profile.displayName;
    const nextName = cleaned === 'Guest Explorer' ? 'Maya Chen' : cleaned;
    onUpdateProfile({
      ...profile,
      displayName: nextName,
      sessionKind: 'signed-in-preview',
      authProvider: 'google',
      email: 'maya.student@example.edu',
      sharedDeviceMode: sharedDevice,
    });
    setNameInput(nextName);
    setSection('profile');
    setStatusMessage(
      `Google Sign-In UX preview active. ${matchCount} local ${matchCount === 1 ? 'match' : 'matches'} and ${achievementEvaluation.earnedCount} latched seals ready for per-account cloud sync.`
    );
  }

  function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const cleanedEmail = emailInput.trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      setErrorMessage('Enter a valid email address to continue.');
      return;
    }
    if (passwordInput.length < 8) {
      setErrorMessage(
        'Invalid email or password. Passwords must be at least 8 characters.'
      );
      return;
    }
    const inferredName =
      profile.displayName !== 'Guest Explorer'
        ? profile.displayName
        : cleanedEmail.split('@')[0].slice(0, 20);
    onUpdateProfile({
      ...profile,
      displayName: inferredName,
      sessionKind: 'signed-in-preview',
      authProvider: 'email',
      email: cleanedEmail,
      sharedDeviceMode: sharedDevice,
    });
    setNameInput(inferredName);
    setPasswordInput('');
    setSection('profile');
    setStatusMessage(
      `Signed-in preview active via Email/Password (${sharedDevice ? 'Session-only classroom mode' : 'Remembered on this device'}).`
    );
  }

  function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const cleanedName = signupName.trim();
    const cleanedEmail = emailInput.trim().toLowerCase();
    if (!cleanedName) {
      setErrorMessage('Choose a student display name (pseudonyms welcome).');
      return;
    }
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      setErrorMessage('Enter a valid student or parent email address.');
      return;
    }
    if (pwStrength.score < 3) {
      setErrorMessage(
        'Use at least 8 characters with both letters and numbers.'
      );
      return;
    }
    if (signupTier === 'explorers' && !guardianConsent) {
      setErrorMessage(
        'Parent or guardian consent is required to create an Explorers (8–10) account.'
      );
      return;
    }

    onUpdateProfile({
      ...profile,
      displayName: cleanedName.slice(0, 28),
      ageTier: signupTier,
      sessionKind: 'signed-in-preview',
      authProvider: 'email',
      email: cleanedEmail,
      sharedDeviceMode: sharedDevice,
    });
    setNameInput(cleanedName.slice(0, 28));
    setPasswordInput('');
    setSection('profile');
    setStatusMessage(
      `Account created (UX preview). ${matchCount} local guest ${matchCount === 1 ? 'match' : 'matches'} merged without exposing your email publicly.`
    );
  }

  function handlePasswordRecovery(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const cleanedEmail = emailInput.trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      setErrorMessage('Enter the email address associated with your account.');
      return;
    }
    setStatusMessage(
      `If an account exists for ${cleanedEmail}, a single-use password reset link (valid 15 minutes) has been prepared. Active sessions revoke automatically on reset.`
    );
  }

  function handleConfirmSignOut() {
    setErrorMessage(null);
    if (wipeSharedOnSignOut) {
      onClearLocalProgress();
    }
    onUpdateProfile({
      ...profile,
      displayName: 'Guest Explorer',
      sessionKind: 'guest',
      authProvider: 'guest',
      email: null,
      sharedDeviceMode: false,
      featuredBadgeId: wipeSharedOnSignOut ? null : profile.featuredBadgeId,
    });
    setNameInput('Guest Explorer');
    setConfirmSignOut(false);
    setWipeSharedOnSignOut(false);
    setStatusMessage(
      wipeSharedOnSignOut
        ? 'Signed out securely and cleared cached local progress for the next classroom student.'
        : 'Signed out securely. Cloud listeners detached cleanly; you remain in Guest Mode.'
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C232B]/45 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="card-tactile max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#ECE7DD] pb-4">
          <div>
            <p className="text-xs font-medium text-[#5A6572]">
              Student Session ·{' '}
              {profile.sessionKind === 'signed-in-preview'
                ? `Signed-In Preview (${profile.authProvider === 'email' ? 'Email' : 'Google'})`
                : 'Guest Mode (Local Storage)'}
            </p>
            <h2
              id="account-modal-title"
              className="mt-1 font-display text-2xl font-semibold text-[#1C232B]"
            >
              Profile &amp; Account Flow
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="rounded-lg p-1.5 text-[#5A6572] hover:bg-[#F3EFE7] hover:text-[#1C232B] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Section Switcher: Profile & Seals | Account Auth Flow */}
        <div
          role="tablist"
          aria-label="Account modal views"
          className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'profile'}
            onClick={() => {
              setSection('profile');
              setErrorMessage(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all ${
              section === 'profile'
                ? 'bg-white text-[#1C232B] shadow-[0_1px_3px_rgba(28,35,43,0.12)]'
                : 'text-[#5A6572] hover:text-[#1C232B]'
            }`}
          >
            Profile &amp; Mastery Seals
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'auth'}
            onClick={() => {
              setSection('auth');
              setErrorMessage(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all ${
              section === 'auth'
                ? 'bg-white text-[#1C232B] shadow-[0_1px_3px_rgba(28,35,43,0.12)]'
                : 'text-[#5A6572] hover:text-[#1C232B]'
            }`}
          >
            {profile.sessionKind === 'signed-in-preview'
              ? 'Session & Security'
              : 'Sign In / Sign Up'}
          </button>
        </div>

        {/* VIEW 1: PROFILE & MASTERY SEALS */}
        {section === 'profile' && (
          <>
            {/* Profile Mastery Seals Visual Indicator Strip */}
            <section
              aria-label="Profile mastery seals"
              data-testid="profile-seals-strip"
              className="mt-4 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#1C232B]">
                    Mastery Seals ·{' '}
                    <span className="font-mono tabular-nums text-[#1D4ED8]">
                      {achievementEvaluation.earnedCount} /{' '}
                      {achievementEvaluation.totalCount}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5A6572]">
                    {activeFeatured
                      ? `Featured Seal: ${activeFeatured.title} (${activeFeatured.criteriaNote})`
                      : achievementEvaluation.earnedCount > 0
                        ? 'Click any unlocked medallion to pin it to your profile.'
                        : 'Win Factor Grid matches to stamp your first archival seal.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNotebook();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
                >
                  Notebook
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <AnimatePresence>
                {newlyUnlockedDefs.length > 0 && (
                  <motion.div
                    data-testid="account-new-badge-banner"
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 26,
                    }}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-[#DFC99B] bg-[#FFFBEB] px-3 py-2 text-[11px] font-semibold text-[#92400E]"
                  >
                    <Sparkles
                      className="h-3.5 w-3.5 shrink-0 text-[#B45309]"
                      aria-hidden="true"
                    />
                    <span>
                      Newly Unlocked:{' '}
                      {newlyUnlockedDefs.map((d) => d.title).join(', ')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {achievementEvaluation.statuses.map((status, idx) => {
                  const { definition, earned } = status;
                  const isPinned = activeFeatured?.id === definition.id;
                  const isNewlyUnlocked =
                    earned && recentlyUnlockedSet.has(definition.id);

                  return (
                    <motion.button
                      key={definition.id}
                      type="button"
                      data-testid={`account-badge-${definition.id}`}
                      data-newly-unlocked={isNewlyUnlocked ? 'true' : 'false'}
                      disabled={!earned}
                      onClick={() => handlePinSeal(definition.id)}
                      initial={
                        isNewlyUnlocked
                          ? { opacity: 0, scale: 0.55, y: 8 }
                          : { opacity: 0, scale: 0.9, y: 4 }
                      }
                      animate={
                        isNewlyUnlocked
                          ? {
                              opacity: 1,
                              scale: [0.55, 1.18, 0.94, 1.06, 1],
                              rotate: [0, -7, 6, -3, 0],
                              y: 0,
                            }
                          : { opacity: 1, scale: 1, y: 0 }
                      }
                      transition={
                        isNewlyUnlocked
                          ? {
                              duration: 0.68,
                              delay: 0.06 + idx * 0.025,
                              ease: [0.22, 1, 0.36, 1],
                            }
                          : {
                              type: 'spring',
                              stiffness: 340,
                              damping: 26,
                              delay: idx * 0.02,
                            }
                      }
                      whileHover={earned ? { scale: 1.09, y: -2 } : undefined}
                      whileTap={earned ? { scale: 0.93 } : undefined}
                      title={
                        earned
                          ? `${definition.title} — Click to ${isPinned ? 'unpin' : 'pin'} as Featured Seal`
                          : `${definition.title} (Locked · ${status.progressLabel})`
                      }
                      aria-label={
                        earned
                          ? `${definition.title} (Earned${isPinned ? ', Featured' : ''}${isNewlyUnlocked ? ', Newly Unlocked' : ''})`
                          : `${definition.title} (Locked, ${status.progressLabel})`
                      }
                      className={`relative flex flex-col items-center justify-center rounded-lg p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                        isPinned
                          ? 'bg-[#EFF5FF]'
                          : earned
                            ? 'hover:bg-white cursor-pointer'
                            : 'cursor-default opacity-80'
                      }`}
                    >
                      {isPinned && (
                        <motion.span
                          layoutId="account-featured-seal-ring"
                          aria-hidden="true"
                          transition={{
                            type: 'spring',
                            stiffness: 420,
                            damping: 30,
                          }}
                          className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#1D4ED8]"
                        />
                      )}

                      {isNewlyUnlocked && (
                        <>
                          <motion.span
                            aria-hidden="true"
                            initial={{ scale: 0.75, opacity: 0.75 }}
                            animate={{ scale: 1.45, opacity: 0 }}
                            transition={{
                              duration: 0.85,
                              delay: 0.14 + idx * 0.025,
                              ease: 'easeOut',
                            }}
                            className="pointer-events-none absolute inset-1 rounded-full border-2 border-[#B45309]"
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-[#B45309] ring-2 ring-[#FAF8F4]"
                          />
                        </>
                      )}

                      <AchievementSealIcon
                        id={definition.id}
                        accent={definition.accent}
                        earned={earned}
                        size="sm"
                      />
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <form onSubmit={handleSaveName} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="student-display-name"
                  className="block text-xs font-semibold text-[#1C232B]"
                >
                  Display Name (Shown on Scoreboards &amp; Rooms)
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="student-display-name"
                    type="text"
                    maxLength={28}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
                  >
                    Save Name
                  </button>
                </div>
              </div>
            </form>

            {/* Preferred Tier & Audio */}
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#ECE7DD] pt-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#1C232B]">
                  Default Adaptive Tier
                </label>
                <select
                  aria-label="Default Adaptive Tier"
                  value={profile.ageTier}
                  onChange={(e) =>
                    onUpdateProfile({
                      ...profile,
                      ageTier: e.target.value as AgeTier,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-medium text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                >
                  {(
                    ['explorers', 'challengers', 'strategists'] as AgeTier[]
                  ).map((id) => (
                    <option key={id} value={id}>
                      {TIER_SPECS[id].label} ({TIER_SPECS[id].ageRange})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    id="global-sound-label"
                    className="block text-xs font-semibold text-[#1C232B]"
                  >
                    Global Sound Feedback
                  </span>
                  <button
                    type="button"
                    data-testid="account-sound-test"
                    disabled={!profile.soundEnabled}
                    onClick={() => playSoundPreviewChime(profile.soundEnabled)}
                    className="text-[11px] font-semibold text-[#1D4ED8] hover:underline disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:no-underline"
                  >
                    Test Chime
                  </button>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.soundEnabled}
                  aria-labelledby="global-sound-label"
                  data-testid="account-sound-toggle"
                  onClick={() => {
                    const nextEnabled = !profile.soundEnabled;
                    onUpdateProfile({
                      ...profile,
                      soundEnabled: nextEnabled,
                    });
                    if (nextEnabled) {
                      playSoundPreviewChime(true);
                    }
                  }}
                  className={`mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                    profile.soundEnabled
                      ? 'border-[#1D4ED8]/45 bg-[#EFF5FF] text-[#1D4ED8]'
                      : 'border-[#D8D1C4] bg-[#FAF8F4] text-[#5A6572] hover:border-[#1D4ED8]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {profile.soundEnabled ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Audio On
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Muted
                      </>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                      profile.soundEnabled ? 'bg-[#1D4ED8]' : 'bg-[#C9C1B3]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                        profile.soundEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5A6572]">
              Synced globally across Addition Attack, Subtraction Sprint,
              Multiplication Mastery, Daily Challenge, and Factor Grid.
            </p>

            {/* Quick Auth Status Card */}
            <div className="mt-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#1C232B]">
                    {profile.sessionKind === 'signed-in-preview'
                      ? 'Per-Account Progress Sync (Preview Active)'
                      : 'Save Progress Across Devices (Auth UX Prototype)'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5A6572]">
                    {profile.sessionKind === 'signed-in-preview'
                      ? `Signed in via ${profile.authProvider === 'email' ? 'Email/Password' : 'Google'} (${profile.email ?? 'private'}). Your email is never exposed on scoreboards.`
                      : 'Students play immediately in Guest Mode. Sign in with Google or Email/Password to preview cross-device progress merge, recovery, and secure sign-out.'}
                  </p>
                </div>
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-[#047857]"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                {profile.sessionKind === 'guest' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setSection('auth');
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] transition-colors whitespace-nowrap"
                    >
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign In / Create Account
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleSignInPreview}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
                    >
                      Continue with Google
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmSignOut(true);
                      setSection('auth');
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#BE123C]/40 bg-white px-3.5 py-2 text-xs font-semibold text-[#BE123C] hover:bg-[#BE123C]/5 transition-colors whitespace-nowrap"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Secure Sign-Out
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-[#5A6572] hover:text-[#1C232B]"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}

        {/* VIEW 2: AUTHENTICATION FLOW (SIGN IN / SIGN UP / PASSWORD RECOVERY / SECURE SIGN-OUT) */}
        {section === 'auth' && (
          <div className="mt-4 space-y-4">
            {profile.sessionKind === 'signed-in-preview' ? (
              <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#047857]">
                    Active Student Session (UX Preview)
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1C232B]">
                    {profile.displayName}
                  </p>
                  <p className="font-mono text-xs text-[#5A6572]">
                    Private Email: {profile.email ?? 'hidden'} · Provider:{' '}
                    {profile.authProvider === 'email'
                      ? 'Email & Password'
                      : 'Google OAuth'}
                  </p>
                </div>

                <dl className="space-y-1.5 border-y border-[#ECE7DD] py-3 text-xs text-[#46515E]">
                  <div className="flex justify-between">
                    <dt>Account-Scoped Progress</dt>
                    <dd className="font-mono font-semibold text-[#1C232B] tabular-nums">
                      {matchCount} matches · {achievementEvaluation.earnedCount}{' '}
                      seals
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Session Persistence</dt>
                    <dd className="font-semibold text-[#1C232B]">
                      {profile.sharedDeviceMode
                        ? 'Session-Only (Shared Classroom)'
                        : 'Local Device Remembered'}
                    </dd>
                  </div>
                </dl>

                {!confirmSignOut ? (
                  <button
                    type="button"
                    onClick={() => setConfirmSignOut(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#BE123C]/40 bg-white px-4 py-2 text-xs font-semibold text-[#BE123C] hover:bg-[#BE123C]/5"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign Out Securely
                  </button>
                ) : (
                  <div className="rounded-lg border border-[#FECDD3] bg-[#FFF5F7] p-3.5 space-y-3">
                    <p className="text-xs font-semibold text-[#1C232B]">
                      Confirm Secure Sign-Out
                    </p>
                    <p className="text-xs leading-relaxed text-[#5A6572]">
                      Signing out detaches active sync listeners and revokes the
                      current session token.
                    </p>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-[#1C232B]">
                      <input
                        type="checkbox"
                        checked={wipeSharedOnSignOut}
                        onChange={(e) =>
                          setWipeSharedOnSignOut(e.target.checked)
                        }
                        className="mt-0.5 h-3.5 w-3.5 rounded accent-[#BE123C]"
                      />
                      <span>
                        Shared classroom device: also clear cached local matches
                        and seals from this browser.
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="confirm-signout-btn"
                        onClick={handleConfirmSignOut}
                        className="rounded-lg bg-[#BE123C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#9F1239]"
                      >
                        Confirm Sign-Out
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSignOut(false)}
                        className="rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#5A6572]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Auth Sub-Mode Switcher */}
                <div className="flex items-center gap-2 border-b border-[#ECE7DD] pb-3 text-xs font-semibold">
                  {(
                    [
                      { id: 'signin', label: 'Sign In', icon: LogIn },
                      { id: 'signup', label: 'Create Account', icon: UserPlus },
                      {
                        id: 'recovery',
                        label: 'Reset Password',
                        icon: KeyRound,
                      },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setAuthMode(id);
                        setErrorMessage(null);
                        setStatusMessage(null);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        authMode === id
                          ? 'bg-[#EFF5FF] text-[#1D4ED8]'
                          : 'text-[#5A6572] hover:text-[#1C232B]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* SIGN IN FORM */}
                {authMode === 'signin' && (
                  <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                    <button
                      type="button"
                      onClick={handleGoogleSignInPreview}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8D1C4] bg-white py-2.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      Continue with Google (Popup Auth Preview)
                    </button>

                    <div className="flex items-center gap-3 text-[11px] text-[#7A8490]">
                      <span className="h-px flex-1 bg-[#E5E0D5]" />
                      <span>or sign in with email</span>
                      <span className="h-px flex-1 bg-[#E5E0D5]" />
                    </div>

                    <div>
                      <label
                        htmlFor="auth-signin-email"
                        className="block text-xs font-semibold text-[#1C232B]"
                      >
                        Email Address
                      </label>
                      <div className="relative mt-1">
                        <Mail
                          className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A8490]"
                          aria-hidden="true"
                        />
                        <input
                          id="auth-signin-email"
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="student@school.edu"
                          className="w-full rounded-lg border border-[#D8D1C4] bg-white py-2 pl-9 pr-3 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="auth-signin-password"
                          className="block text-xs font-semibold text-[#1C232B]"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('recovery');
                            setErrorMessage(null);
                          }}
                          className="text-[11px] font-semibold text-[#1D4ED8] hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative mt-1">
                        <Lock
                          className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A8490]"
                          aria-hidden="true"
                        />
                        <input
                          id="auth-signin-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className="w-full rounded-lg border border-[#D8D1C4] bg-white py-2 pl-9 pr-9 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          className="absolute right-2.5 top-2 text-[#7A8490] hover:text-[#1C232B]"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[#46515E]">
                      <input
                        type="checkbox"
                        checked={sharedDevice}
                        onChange={(e) => setSharedDevice(e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-[#1D4ED8]"
                      />
                      Shared classroom computer (session-only sign-in)
                    </label>

                    <button
                      type="submit"
                      data-testid="auth-signin-submit"
                      className="btn-cobalt w-full rounded-xl py-2.5 text-xs font-semibold"
                    >
                      Sign In &amp; Sync Local Progress
                    </button>
                  </form>
                )}

                {/* SIGN UP FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleEmailSignUp} className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignInPreview}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8D1C4] bg-white py-2.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                    >
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Sign Up with Google (Fastest for Schools)
                    </button>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="auth-signup-name"
                          className="block text-xs font-semibold text-[#1C232B]"
                        >
                          Public Display Name
                        </label>
                        <input
                          id="auth-signup-name"
                          type="text"
                          required
                          maxLength={28}
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          placeholder="e.g. PrismFox"
                          className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="auth-signup-tier"
                          className="block text-xs font-semibold text-[#1C232B]"
                        >
                          Learner Age Tier
                        </label>
                        <select
                          id="auth-signup-tier"
                          value={signupTier}
                          onChange={(e) =>
                            setSignupTier(e.target.value as AgeTier)
                          }
                          className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-medium text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                        >
                          {(
                            [
                              'explorers',
                              'challengers',
                              'strategists',
                            ] as AgeTier[]
                          ).map((t) => (
                            <option key={t} value={t}>
                              {TIER_SPECS[t].label} ({TIER_SPECS[t].ageRange})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="auth-signup-email"
                        className="block text-xs font-semibold text-[#1C232B]"
                      >
                        {signupTier === 'explorers'
                          ? 'Parent / Guardian Email (Private)'
                          : 'Student Email (Private)'}
                      </label>
                      <input
                        id="auth-signup-email"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="never-shown-publicly@example.com"
                        className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="auth-signup-password"
                        className="block text-xs font-semibold text-[#1C232B]"
                      >
                        Create Password
                      </label>
                      <input
                        id="auth-signup-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="8+ chars with letters & numbers"
                        className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5A6572]">
                        <span>Strength: {pwStrength.label}</span>
                        <span className="font-mono">
                          {pwStrength.hasLength ? '✓' : '·'} 8+ chars ·{' '}
                          {pwStrength.hasLetter ? '✓' : '·'} letter ·{' '}
                          {pwStrength.hasNumber ? '✓' : '·'} number
                        </span>
                      </div>
                    </div>

                    {signupTier === 'explorers' && (
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#DFC99B] bg-[#FDF6E7] p-2.5 text-xs text-[#6B4209]">
                        <input
                          type="checkbox"
                          checked={guardianConsent}
                          onChange={(e) => setGuardianConsent(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded accent-[#B45309]"
                        />
                        <span>
                          Parent/guardian approval confirmed for this under-13
                          learner (COPPA child-privacy safeguard).
                        </span>
                      </label>
                    )}

                    <button
                      type="submit"
                      data-testid="auth-signup-submit"
                      className="btn-cobalt w-full rounded-xl py-2.5 text-xs font-semibold"
                    >
                      Create Student Account &amp; Merge {matchCount} Local{' '}
                      {matchCount === 1 ? 'Match' : 'Matches'}
                    </button>
                  </form>
                )}

                {/* PASSWORD RECOVERY FORM */}
                {authMode === 'recovery' && (
                  <form
                    onSubmit={handlePasswordRecovery}
                    className="space-y-3.5"
                  >
                    <p className="text-xs leading-relaxed text-[#46515E]">
                      Enter your account email to receive a single-use,
                      15-minute password reset link. For privacy, we show the
                      same confirmation whether or not an email is registered.
                    </p>
                    <div>
                      <label
                        htmlFor="auth-recovery-email"
                        className="block text-xs font-semibold text-[#1C232B]"
                      >
                        Account Email
                      </label>
                      <input
                        id="auth-recovery-email"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="student@school.edu"
                        className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="auth-recovery-submit"
                      className="btn-cobalt w-full rounded-xl py-2.5 text-xs font-semibold"
                    >
                      Send Password Reset Link
                    </button>
                  </form>
                )}

                <p className="rounded-lg border border-[#E5E0D5] bg-[#FAF8F4] px-3 py-2 text-[11px] leading-relaxed text-[#5A6572]">
                  <strong>Privacy &amp; Prototype Note:</strong> Emails remain
                  strictly private and are never shown on scoreboards. This
                  modal previews the full Firebase Auth + Firestore lifecycle
                  locally until cloud provisioning is enabled.
                </p>
              </>
            )}
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-[#FECDD3] bg-[#FFF5F7] px-3 py-2 text-xs font-medium text-[#BE123C]"
          >
            {errorMessage}
          </p>
        )}

        {statusMessage && (
          <p className="mt-3 rounded-lg border border-[#D1FAE5] bg-[#F2FBF7] px-3 py-2 text-xs font-medium text-[#047857]">
            {statusMessage}
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function AccountModal(props: AccountModalProps) {
  if (!props.open) return null;
  return (
    <AccountModalBody
      onClose={props.onClose}
      profile={props.profile}
      matchCount={props.matchCount}
      achievementEvaluation={props.achievementEvaluation}
      recentlyUnlockedBadgeIds={props.recentlyUnlockedBadgeIds}
      onUpdateProfile={props.onUpdateProfile}
      onClearLocalProgress={props.onClearLocalProgress}
      onOpenNotebook={props.onOpenNotebook}
    />
  );
}
