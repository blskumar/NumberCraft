import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import ConsentGate from '@/components/ConsentGate';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import type { AgeTier } from '@/lib/types';
import {
  EmailField,
  LABEL,
  PasswordField,
  RememberMe,
  SubmitButton,
} from './fields';
import type { AccountCtx } from './useAccount';

const TIERS: AgeTier[] = ['explorers', 'challengers', 'strategists'];

/** Sign-in / free registration / password reset forms shown to guests (email & password only). */
export default function GuestAuthPanel({ c }: { c: AccountCtx }) {
  const {
    authMode, setAuthMode, setErrorMessage, setStatusMessage, isSubmitting,
    emailInput, setEmailInput, passwordInput, setPasswordInput,
    showPassword, setShowPassword, rememberMe, setRememberMe,
  } = c;
  const passwordProps = {
    value: passwordInput,
    onChange: setPasswordInput,
    show: showPassword,
    onToggle: () => setShowPassword((prev) => !prev),
  };

  return (
    <>
      {/* Auth Sub-Mode Switcher (Email Only) */}
      <div className="flex items-center gap-2 border-b border-[#ECE7DD] pb-3 text-xs font-semibold">
        {(
          [
            { id: 'signup', label: 'Register Free', icon: UserPlus },
            { id: 'signin', label: 'Sign In', icon: LogIn },
            { id: 'recovery', label: 'Reset Password', icon: KeyRound },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-testid={`auth-mode-${id}`}
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

      {/* SIGN IN FORM — EMAIL & PASSWORD ONLY */}
      {authMode === 'signin' && (
        <form onSubmit={c.handleEmailSignIn} className="space-y-3.5">
          <EmailField
            id="auth-signin-email"
            label="Email Address"
            value={emailInput}
            onChange={setEmailInput}
            placeholder="you@example.com"
          />
          <PasswordField
            id="auth-signin-password"
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            {...passwordProps}
            aside={
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
            }
          />
          <RememberMe checked={rememberMe} onChange={setRememberMe} />
          <SubmitButton testId="auth-signin-submit" submitting={isSubmitting}>
            Sign In with Email
          </SubmitButton>
        </form>
      )}

      {/* FREE EMAIL REGISTRATION FORM — ANY EMAIL ADDRESS, ZERO PAYMENT */}
      {authMode === 'signup' && (
        <form onSubmit={c.handleEmailSignUp} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="auth-signup-name" className={LABEL}>
                Display Name (Public)
              </label>
              <p
                id="auth-signup-name-hint"
                className="text-[11px] text-[#5A6572]"
              >
                Do not use your real name.
              </p>
              <input
                id="auth-signup-name"
                type="text"
                autoComplete="nickname"
                required
                maxLength={28}
                value={c.signupName}
                onChange={(e) => c.setSignupName(e.target.value)}
                placeholder="e.g. PrismFox"
                className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="auth-signup-tier" className={LABEL}>
                Learner Age Tier
              </label>
              <select
                id="auth-signup-tier"
                value={c.signupTier}
                onChange={(e) => c.setSignupTier(e.target.value as AgeTier)}
                className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-medium text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_SPECS[t].label} ({TIER_SPECS[t].ageRange})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <EmailField
            id="auth-signup-email"
            label="Email Address (Any Email ID · Kept Private)"
            value={emailInput}
            onChange={setEmailInput}
            placeholder="any-email@example.com"
          />
          <PasswordField
            id="auth-signup-password"
            label="Create Password"
            autoComplete="new-password"
            placeholder="8+ chars with letters & numbers"
            {...passwordProps}
          >
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5A6572]">
              <span>Strength: {c.pwStrength.label}</span>
              <span className="font-mono">
                {c.pwStrength.hasLength ? '✓' : '·'} 8+ chars ·{' '}
                {c.pwStrength.hasLetter ? '✓' : '·'} letter ·{' '}
                {c.pwStrength.hasNumber ? '✓' : '·'} number
              </span>
            </div>
          </PasswordField>
          <RememberMe checked={rememberMe} onChange={setRememberMe} />

          <ConsentGate value={c.consentGate} onChange={c.setConsentGate} />
          <p className="text-[11px] leading-relaxed text-[#5A6572]">
            <strong>Privacy:</strong> we store your email, display name, age
            tier and game scores. Your display name, age tier and scores are
            visible to other signed-in players on the leaderboard. Your email
            is private. You can delete your account and scores at any time
            from your profile.
          </p>

          <SubmitButton testId="auth-signup-submit" submitting={isSubmitting}>
            Create Free Account — Unlock Unlimited Levels
          </SubmitButton>
        </form>
      )}

      {/* PASSWORD RECOVERY FORM */}
      {authMode === 'recovery' && (
        <form onSubmit={c.handlePasswordRecovery} className="space-y-3.5">
          <p className="text-xs leading-relaxed text-[#46515E]">
            Enter the email address you registered with to receive a password
            reset link.
          </p>
          <div>
            <label htmlFor="auth-recovery-email" className={LABEL}>
              Account Email
            </label>
            <input
              id="auth-recovery-email"
              type="email"
              autoComplete="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
          <SubmitButton testId="auth-recovery-submit" submitting={isSubmitting}>
            Send Password Reset Link
          </SubmitButton>
        </form>
      )}

      <p className="rounded-lg border border-[#E5E0D5] bg-[#FAF8F4] px-3 py-2 text-[11px] leading-relaxed text-[#5A6572]">
        <strong>Free, no payment ever.</strong> Your email is never shown to
        other players. Your display name, age tier and scores appear on the Top
        10 leaderboards for signed-in players.
      </p>
    </>
  );
}
