import {
  LogIn,
  LogOut,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { playSoundPreviewChime } from '@/lib/sound';
import type { AgeTier } from '@/lib/types';
import SealsStrip from './SealsStrip';
import type { AccountCtx } from './useAccount';

/** Profile & Mastery Seals view: seals, display name, tier, sound, appearance and sign-in status. */
export default function ProfileSection({ c }: { c: AccountCtx }) {
  const {
    profile, onClose, onUpdateProfile, themePreference, onChangeTheme, isAuthenticated,
    nameInput, setNameInput, handleSaveName, setStatusMessage, setAuthMode, setSection,
    setConfirmSignOut,
  } = c;
  return (
    <>
      <SealsStrip c={c} />

      <form onSubmit={handleSaveName} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="student-display-name"
            className="block text-xs font-semibold text-[#1C232B]"
          >
            Display Name (Shown on Scoreboards &amp; Leaderboards)
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
                  <Volume2
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  Audio On
                </>
              ) : (
                <>
                  <VolumeX
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
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
                  profile.soundEnabled
                    ? 'translate-x-3.5'
                    : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Appearance Mode: Light / Dark / System */}
      <div className="mt-5 border-t border-[#ECE7DD] pt-4">
        <div className="flex items-center justify-between gap-2">
          <span
            id="appearance-theme-label"
            className="text-xs font-semibold text-[#1C232B]"
          >
            Appearance Mode
          </span>
          <span className="font-mono text-[11px] text-[#5A6572]">
            Light · Dark · System
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="appearance-theme-label"
          className="mt-2 grid grid-cols-3 gap-2"
        >
          {(
            [
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const active = themePreference === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`theme-option-${id}`}
                onClick={() => {
                  onChangeTheme(id);
                  setStatusMessage(`Appearance mode set to ${label}.`);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                  active
                    ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1D4ED8]'
                    : 'border-[#D8D1C4] bg-[#FAF8F4] text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1C232B]'
                }`}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Auth Status Card (Email-Only — Zero Google Login) */}
      <div className="mt-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#1C232B]">
              {isAuthenticated
                ? 'Email Account Active · Cloud Scores Enabled'
                : 'Free Email Registration · Unlimited Play & Top 10 Scores'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#5A6572]">
              {isAuthenticated
                ? `Signed in with ${profile.email ?? 'your email'}. Every game score saves automatically to the Daily & Weekly Top 10 Leaderboards. Your email stays strictly private.`
                : 'Guests can try 1 free level of each game. Register for free with any email address (no payment required) to unlock unlimited levels and save scores.'}
            </p>
          </div>
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-[#047857]"
            aria-hidden="true"
          />
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="profile-open-register-btn"
                onClick={() => {
                  setAuthMode('signup');
                  setSection('auth');
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] transition-colors whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Register Free with Email
              </button>
              <button
                type="button"
                data-testid="profile-open-signin-btn"
                onClick={() => {
                  setAuthMode('signin');
                  setSection('auth');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Sign In
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
              Sign Out
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
  );
}
