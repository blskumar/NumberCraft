'use client';

import { useModalFocus } from '@/components/useModalFocus';
import { motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import GuestAuthPanel from '@/components/account/GuestAuthPanel';
import ProfileSection from '@/components/account/ProfileSection';
import SignedInPanel from '@/components/account/SignedInPanel';
import type {
  AccountAuthMode,
  AccountBodyProps,
  AccountModalProps,
  AccountModalSection,
} from '@/components/account/types';
import { useAccount } from '@/components/account/useAccount';

export type { AccountAuthMode, AccountModalSection };

const tabClass = (active: boolean) =>
  `rounded-lg py-2 text-xs font-semibold transition-all ${
    active
      ? 'bg-white text-[#1C232B] shadow-[0_1px_3px_rgba(28,35,43,0.12)]'
      : 'text-[#5A6572] hover:text-[#1C232B]'
  }`;

function AccountModalBody(props: AccountBodyProps) {
  const { onClose, registrationGateGameTitle = null } = props;
  const c = useAccount(props);
  const { isAuthenticated, section, setSection, setErrorMessage } = c;

  const dialogRef = useModalFocus<HTMLDivElement>(true, onClose);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      data-testid="account-modal"
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
              {isAuthenticated
                ? 'Signed In (Email Account · Unlimited Access)'
                : 'Free Guest Mode (1 Free Level per Game)'}
            </p>
            <h2
              id="account-modal-title"
              className="mt-1 font-display text-2xl font-semibold text-[#1C232B]"
            >
              {registrationGateGameTitle && !isAuthenticated
                ? 'Free Account Required to Continue'
                : 'Profile & Account'}
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

        {/* Free Guest Trial Limit Callout Banner when triggered by 1-level gate */}
        {registrationGateGameTitle && !isAuthenticated && (
          <div
            data-testid="guest-trial-gate-banner"
            className="mt-4 rounded-xl border border-[#1D4ED8]/35 bg-[#EFF5FF] p-4 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#1C232B]">
                  Free Trial Level Complete for {registrationGateGameTitle}
                </p>
                <p className="mt-1 leading-relaxed text-[#46515E]">
                  Guest explorers can try 1 free level of every game. Create a{' '}
                  <strong>100% free account</strong> with any email address (no
                  payment or card required) to unlock unlimited levels and save
                  scores to the Daily &amp; Weekly Top 10 Leaderboards.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section Switcher: Profile & Seals | Email Account */}
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
            className={tabClass(section === 'profile')}
          >
            Profile &amp; Mastery Seals
          </button>
          <button
            type="button"
            role="tab"
            data-testid="account-tab-auth"
            aria-selected={section === 'auth'}
            onClick={() => {
              setSection('auth');
              setErrorMessage(null);
            }}
            className={tabClass(section === 'auth')}
          >
            {isAuthenticated ? 'Account & Security' : 'Email Sign In / Register'}
          </button>
        </div>

        {section === 'profile' && <ProfileSection c={c} />}

        {/* EMAIL AUTHENTICATION (SIGN IN / FREE REGISTRATION / RESET / SIGN-OUT) */}
        {section === 'auth' && (
          <div className="mt-4 space-y-4">
            {isAuthenticated ? <SignedInPanel c={c} /> : <GuestAuthPanel c={c} />}
          </div>
        )}

        {c.errorMessage && (
          <div
            role="alert"
            data-testid="account-modal-error"
            className="mt-3 rounded-lg border border-[#FECDD3] bg-[#FFF5F7] px-3 py-2.5 text-xs font-medium text-[#BE123C]"
          >
            <p className="leading-relaxed">{c.errorMessage}</p>
          </div>
        )}

        {c.statusMessage && (
          <p
            data-testid="account-modal-status"
            className="mt-3 rounded-lg border border-[#D1FAE5] bg-[#F2FBF7] px-3 py-2 text-xs font-medium text-[#047857]"
          >
            {c.statusMessage}
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
      key={`${props.initialSection ?? 'profile'}-${props.initialAuthMode ?? 'signin'}-${props.registrationGateGameTitle ?? ''}`}
      onClose={props.onClose}
      initialSection={props.initialSection}
      initialAuthMode={props.initialAuthMode}
      registrationGateGameTitle={props.registrationGateGameTitle}
      profile={props.profile}
      matchCount={props.matchCount}
      achievementEvaluation={props.achievementEvaluation}
      recentlyUnlockedBadgeIds={props.recentlyUnlockedBadgeIds}
      themePreference={props.themePreference}
      onChangeTheme={props.onChangeTheme}
      onUpdateProfile={props.onUpdateProfile}
      onClearLocalProgress={props.onClearLocalProgress}
      onOpenNotebook={props.onOpenNotebook}
    />
  );
}
