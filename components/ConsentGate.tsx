'use client';

import {
  validateParentEmail,
  type AgeBand,
} from '@/lib/consent';

export interface ConsentGateValue {
  ageBand: AgeBand | null;
  parentEmail: string;
  noticeAck: boolean;
}

export const EMPTY_CONSENT_GATE: ConsentGateValue = {
  ageBand: null,
  parentEmail: '',
  noticeAck: false,
};

/** Returns a child-safe error message, or null when the step is complete. */
export function consentGateError(
  value: ConsentGateValue,
  childEmail: string
): string | null {
  if (!value.ageBand) return 'Please tell us if you are under 18 or 18 or older.';
  if (value.ageBand === 'minor') {
    const e = validateParentEmail(value.parentEmail, childEmail);
    if (e) return e;
  }
  if (!value.noticeAck) return 'Please tick the box to say you have read the privacy notice.';
  return null;
}

interface Props {
  value: ConsentGateValue;
  onChange: (next: ConsentGateValue) => void;
}

export default function ConsentGate({ value, onChange }: Props) {
  const set = (patch: Partial<ConsentGateValue>) =>
    onChange({ ...value, ...patch });

  return (
    <fieldset
      data-testid="consent-gate"
      className="space-y-2 rounded-xl border border-[#D8D1C4] bg-white p-3 text-xs text-[#1C232B]"
    >
      <legend className="px-1 text-xs font-semibold">
        Before you start: how old are you?
      </legend>
      <p className="text-[11px] leading-relaxed text-[#46515E]">
        We only ask this one thing about your age. We do not ask for your
        birthday.
      </p>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="consent-age-band"
          data-testid="consent-age-minor"
          checked={value.ageBand === 'minor'}
          onChange={() => set({ ageBand: 'minor' })}
          className="h-3.5 w-3.5 accent-[#1D4ED8]"
        />
        I am under 18
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="consent-age-band"
          data-testid="consent-age-adult"
          checked={value.ageBand === 'adult'}
          onChange={() => set({ ageBand: 'adult', parentEmail: '' })}
          className="h-3.5 w-3.5 accent-[#1D4ED8]"
        />
        I am 18 or older
      </label>

      {value.ageBand === 'minor' && (
        <div className="space-y-1.5 rounded-lg bg-[#F5F1E8] p-2.5">
          <p className="text-[11px] leading-relaxed text-[#46515E]">
            The law says a parent or guardian must say yes first. We will send
            them one email with a link. Until they say yes, you can still play
            as a guest on this device, but your scores will not be saved online
            or shown on the leaderboard.
          </p>
          <label
            htmlFor="consent-parent-email"
            className="block text-[11px] font-semibold"
          >
            Parent or guardian email
          </label>
          <input
            id="consent-parent-email"
            data-testid="consent-parent-email"
            type="email"
            autoComplete="off"
            value={value.parentEmail}
            onChange={(e) => set({ parentEmail: e.target.value })}
            className="w-full rounded-lg border border-[#D8D1C4] bg-white px-2.5 py-1.5 text-xs"
          />
          <p className="text-[11px] leading-relaxed text-[#5A6572]">
            We use this email only to send that one request. We delete it after
            the link is used or after 7 days.
          </p>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          data-testid="consent-notice-ack"
          checked={value.noticeAck}
          onChange={(e) => set({ noticeAck: e.target.checked })}
          className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1D4ED8]"
        />
        <span>
          I have read the{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#1D4ED8] underline"
          >
            privacy notice
          </a>{' '}
          (opens in a new tab). I know my display name, age group and scores
          can be seen by other signed-in players
          {value.ageBand === 'minor' ? ' once my parent says yes' : ''}.
        </span>
      </label>
    </fieldset>
  );
}
