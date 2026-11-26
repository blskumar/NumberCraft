import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import type { Mailer } from './mailer';

/** Mirrors CONSENT_VERSION in lib/consent.ts (fix/ws-F). Bump together. */
export const CONSENT_VERSION = '2026-11-v1';

export interface Deps {
  db: Firestore;
  now: () => number;
  mailer: Mailer;
  /** Public URL of the confirmParentalConsent function (no trailing slash). */
  consentBaseUrl: string;
  /** Secret salt for the erased-consent archive key (set via Secret Manager in prod). */
  archiveSalt: string;
}

export interface AuthLike {
  uid: string;
  token: { email_verified?: boolean; email?: string };
}

export function requireAuth(auth: AuthLike | undefined | null): { uid: string } {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'sign-in-required');
  if (auth.token?.email_verified !== true) throw new HttpsError('failed-precondition', 'email-not-verified');
  return { uid: auth.uid };
}

/** Auth without the email_verified requirement (consent flow runs before verification). */
export function requireSignedIn(auth: AuthLike | undefined | null): { uid: string } {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'sign-in-required');
  return { uid: auth.uid };
}

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/**
 * Score/round access needs a CURRENT granted consent record (written only by
 * this backend). Adults get theirs from recordSelfConsent, minors from the
 * parent confirmation link. No record, a stale version, withdrawn, declined or
 * pending all fail closed, so those users have no leaderboard presence.
 */
export async function requireConsent(deps: Deps, uid: string): Promise<void> {
  const snap = await deps.db.doc(`consents/${uid}`).get();
  const c = snap.data();
  if (!snap.exists || !c || c.status !== 'granted' || c.version !== CONSENT_VERSION) {
    throw new HttpsError('failed-precondition', 'consent-required');
  }
}
