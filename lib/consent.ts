// Consent model for NumberCraft. Pure logic, no I/O. See docs/legal/04-*.md.
// Not legal advice: counsel must review before launch.

/** Bump on ANY material change to the privacy notice or purposes; triggers re-consent. */
export const CONSENT_VERSION = '2026-11-v1';

/** DPDP Act 2023 s.2(f): "child" means an individual under 18. */
export const ADULT_AGE = 18;

/** Parent link validity (spec 04): 7 days, single use. */
export const PARENT_REQUEST_TTL_HOURS = 24 * 7;

export type AgeBand = 'adult' | 'minor';

export type ConsentStatus =
  | 'pending-parental-consent'
  | 'granted'
  | 'withdrawn'
  | 'expired'
  | 'declined';

export type ConsentPurpose =
  | 'account'
  | 'leaderboard-display'
  | 'progress-sync';

export const CONSENT_PURPOSES: readonly ConsentPurpose[] = [
  'account',
  'leaderboard-display',
  'progress-sync',
];

/** Shape of Firestore consents/{uid}. Written ONLY by the trusted backend (spec 04). */
export interface ConsentRecord {
  uid: string;
  ageBand: AgeBand;
  status: ConsentStatus;
  version: string;
  purposes: ConsentPurpose[];
  /** 'self' for adults; 'parent-email-link' for minors. */
  method: 'self' | 'parent-email-link';
  grantedAt: number | null; // epoch ms (server timestamp in Firestore)
  withdrawnAt: number | null;
  /** Optional salted hash of the confirming IP; never the raw IP. */
  ipHash?: string;
}

/** Shape of consentRequests/{uid}: short-lived, holds the parent's email only until TTL. */
export interface ConsentRequestDoc {
  uid: string;
  parentEmail: string;
  version: string;
  createdAt: number;
  expiresAt: number; // Firestore TTL policy deletes the doc after this
}

export function ageBandFromAge(age: number): AgeBand {
  return age >= ADULT_AGE ? 'adult' : 'minor';
}

export function requiresParentalConsent(band: AgeBand): boolean {
  return band === 'minor';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlausibleEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value.trim());
}

/** The parent must not be the child's own address (weak but cheap check). */
export function validateParentEmail(
  parentEmail: string,
  childEmail: string
): string | null {
  if (!isPlausibleEmail(parentEmail)) {
    return 'Enter your parent or guardian’s email address.';
  }
  if (parentEmail.trim().toLowerCase() === childEmail.trim().toLowerCase()) {
    return 'Please use your parent or guardian’s own email, not yours.';
  }
  return null;
}

export function consentRequestExpiry(now: number): number {
  return now + PARENT_REQUEST_TTL_HOURS * 3600_000;
}

export function isConsentCurrent(record: Pick<ConsentRecord, 'version'>): boolean {
  return record.version === CONSENT_VERSION;
}

/**
 * Effective status: a granted record for an older notice version needs
 * re-consent, so it is treated as pending until re-confirmed.
 */
export function effectiveConsentStatus(
  record: ConsentRecord | null
): ConsentStatus {
  if (!record) return 'pending-parental-consent';
  if (record.status === 'granted' && !isConsentCurrent(record)) {
    return 'pending-parental-consent';
  }
  return record.status;
}

/** Cloud score writes and leaderboard visibility require current granted consent. */
export function canUseCloudFeatures(record: ConsentRecord | null): boolean {
  return effectiveConsentStatus(record) === 'granted';
}

/** Local mirror (UI hint only; the server is authoritative). */
export const LOCAL_CONSENT_KEY = 'numbercraft_consent_v1';

export interface LocalConsentHint {
  uid: string;
  status: ConsentStatus;
  version: string;
}

const STATUSES: ConsentStatus[] = [
  'pending-parental-consent',
  'granted',
  'withdrawn',
  'expired',
  'declined',
];

export function parseLocalConsentHint(
  raw: string | null
): LocalConsentHint | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LocalConsentHint>;
    if (typeof v.uid !== 'string' || typeof v.version !== 'string') return null;
    if (!STATUSES.includes(v.status as ConsentStatus)) return null;
    return v as LocalConsentHint;
  } catch {
    return null;
  }
}

/**
 * UI gate. Hint missing => allowed (adult accounts and legacy accounts have no
 * hint); only an explicit non-granted hint for this uid blocks.
 */
export function hintAllowsCloudScores(
  hint: LocalConsentHint | null,
  uid: string
): boolean {
  if (!hint || hint.uid !== uid) return true;
  return hint.status === 'granted' && hint.version === CONSENT_VERSION;
}

export function readLocalConsentHint(): LocalConsentHint | null {
  try {
    return parseLocalConsentHint(
      window.localStorage.getItem(LOCAL_CONSENT_KEY)
    );
  } catch {
    return null;
  }
}

export function writeLocalConsentHint(hint: LocalConsentHint | null): void {
  try {
    if (hint) {
      window.localStorage.setItem(LOCAL_CONSENT_KEY, JSON.stringify(hint));
    } else {
      window.localStorage.removeItem(LOCAL_CONSENT_KEY);
    }
  } catch {
    // storage unavailable: server remains authoritative
  }
}
