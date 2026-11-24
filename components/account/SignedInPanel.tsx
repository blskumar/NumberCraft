import { Loader2, LogOut } from 'lucide-react';
import { readLocalConsentHint } from '@/lib/consent';
import { refreshConsentStatus } from '@/lib/consent-client';
import { CancelButton } from './fields';
import type { AccountCtx } from './useAccount';

/** Account & Security view for a signed-in student: sign-out, email verification, consent and deletion. */
export default function SignedInPanel({ c }: { c: AccountCtx }) {
  const {
    profile, matchCount, achievementEvaluation, isSubmitting, emailVerified, consentHint,
    setConsentHint, confirmSignOut, setConfirmSignOut, wipeSharedOnSignOut,
    setWipeSharedOnSignOut, confirmWithdraw, setConfirmWithdraw, confirmDelete,
    setConfirmDelete, deletePassword, setDeletePassword, handleConfirmSignOut,
    handleResendVerification, handleWithdrawConsent, handleDeleteAccount,
  } = c;
  return (
      <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-[#047857]">
            Active Student Account
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C232B]">
            {profile.displayName}
          </p>
          <p className="font-mono text-xs text-[#5A6572]">
            Private Email: {profile.email ?? 'hidden'} · Email &amp;
            Password
          </p>
        </div>

        <dl className="space-y-1.5 border-y border-[#ECE7DD] py-3 text-xs text-[#46515E]">
          <div className="flex justify-between">
            <dt>Saved Progress</dt>
            <dd className="font-mono font-semibold text-[#1C232B] tabular-nums">
              {matchCount} matches · {achievementEvaluation.earnedCount}{' '}
              seals
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Game Access &amp; Cloud Scores</dt>
            <dd className="font-semibold text-[#047857]">
              Unlimited Levels · Top 10 Leaderboards Active
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Session Persistence</dt>
            <dd className="font-semibold text-[#1C232B]">
              {profile.sharedDeviceMode
                ? 'Session-Only (Shared Classroom)'
                : 'Remembered on This Device'}
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
              Signing out ends your authenticated session on this
              browser and returns to Guest Mode.
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
                disabled={isSubmitting}
                data-testid="confirm-signout-btn"
                onClick={handleConfirmSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#BE123C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#9F1239] disabled:opacity-60"
              >
                {isSubmitting && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Confirm Sign-Out
              </button>
              <CancelButton onClick={() => setConfirmSignOut(false)} />
            </div>
          </div>
        )}

        {emailVerified === false && (
          <div
            data-testid="verify-email-notice"
            className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#78350F]"
          >
            <p className="font-semibold">Verify your email</p>
            <p className="mt-1 leading-relaxed">
              We sent a link to your email. Click it so your scores can
              appear on the leaderboard.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              className="mt-2 rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 font-semibold text-[#1D4ED8]"
            >
              Send the email again
            </button>
          </div>
        )}

        {consentHint && consentHint.status !== 'granted' && (
          <div
            role="status"
            data-testid="consent-pending-banner"
            className="rounded-xl border border-[#D8D1C4] bg-[#FFFDF2] p-3 text-xs text-[#1C232B]"
          >
            Waiting for your parent or guardian to say yes. Until
            then your scores are not saved online or shown on the
            leaderboard.
            <button
              type="button"
              onClick={async () => {
                try {
                  await refreshConsentStatus(profile.uid ?? '');
                } catch {
                  // offline or not yet granted
                }
                setConsentHint(readLocalConsentHint());
              }}
              className="mt-2 block rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 font-semibold text-[#1D4ED8]"
            >
              Check again
            </button>
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-[#5A6572]">
          Parents and adults can withdraw consent or ask for data
          deletion at any time: delete the account below, or see{' '}
          <a
            href="/grievance"
            className="font-semibold text-[#1D4ED8] underline"
          >
            how to contact us
          </a>
          .
        </p>

        {!confirmWithdraw ? (
          <button
            type="button"
            data-testid="withdraw-consent-btn"
            onClick={() => setConfirmWithdraw(true)}
            className="block text-[11px] font-semibold text-[#1D4ED8] underline"
          >
            Withdraw consent (keep my account)
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-[#D8D1C4] bg-[#FFFDF2] p-3">
            <p className="text-xs leading-relaxed text-[#1C232B]">
              This removes your scores from the online leaderboard and
              stops new online scores. Your account and local progress
              stay.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                data-testid="confirm-withdraw-consent-btn"
                onClick={handleWithdrawConsent}
                className="rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                Withdraw consent
              </button>
              <CancelButton onClick={() => setConfirmWithdraw(false)} />
            </div>
          </div>
        )}

        {!confirmDelete ? (
          <button
            type="button"
            data-testid="delete-account-btn"
            onClick={() => setConfirmDelete(true)}
            className="block text-[11px] font-semibold text-[#BE123C] underline"
          >
            Delete my account
          </button>
        ) : (
          <form
            onSubmit={handleDeleteAccount}
            className="space-y-2 rounded-lg border border-[#FECDD3] bg-[#FFF5F7] p-3.5"
          >
            <p className="text-xs font-semibold text-[#1C232B]">
              Delete account permanently
            </p>
            <p className="text-xs leading-relaxed text-[#5A6572]">
              This deletes your sign-in, profile and leaderboard
              scores. It cannot be undone. Enter your password to
              confirm.
            </p>
            <label
              htmlFor="delete-account-password"
              className="block text-xs font-semibold text-[#1C232B]"
            >
              Password
            </label>
            <input
              id="delete-account-password"
              type="password"
              required
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !deletePassword}
                data-testid="confirm-delete-account-btn"
                className="rounded-lg bg-[#BE123C] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                Delete forever
              </button>
              <CancelButton
                onClick={() => {
                  setConfirmDelete(false);
                  setDeletePassword('');
                }}
              />
            </div>
          </form>
        )}
      </div>
  );
}
