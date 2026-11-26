// Client side of consent. All consent WRITES go through Cloud Functions
// (functions/src/consent.ts): the client cannot write consents/ or
// consentRequests/ (rules deny it). The client only calls the callables and
// reads its own consent record to refresh the local UI hint.
import {
  CONSENT_VERSION,
  writeLocalConsentHint,
  type ConsentRecord,
} from '@/lib/consent';
import {
  callRecordSelfConsent,
  callRequestParentalConsent,
  callWithdrawConsent,
  readOwnConsentDoc,
} from '@/lib/firebase';

/** Asks the backend to email the parent a single-use consent link. */
export async function requestParentalConsent(params: {
  uid: string;
  parentEmail: string;
}): Promise<void> {
  await callRequestParentalConsent(params.parentEmail.trim().toLowerCase());
  writeLocalConsentHint({
    uid: params.uid,
    status: 'pending-parental-consent',
    version: CONSENT_VERSION,
  });
}

/** Adult sign-up: records self-consent server-side (needed to post scores). */
export async function recordSelfConsent(uid: string): Promise<void> {
  await callRecordSelfConsent();
  writeLocalConsentHint({ uid, status: 'granted', version: CONSENT_VERSION });
}

/** Withdraws consent server-side (also erases the user's scores and rounds). */
export async function withdrawConsent(uid: string): Promise<void> {
  await callWithdrawConsent();
  writeLocalConsentHint({ uid, status: 'withdrawn', version: CONSENT_VERSION });
}

/** Reads consents/{uid} and refreshes the local UI hint. */
export async function refreshConsentStatus(
  uid: string
): Promise<ConsentRecord | null> {
  const data = (await readOwnConsentDoc(uid)) as ConsentRecord | null;
  if (!data) return null;
  writeLocalConsentHint({ uid, status: data.status, version: data.version });
  return data;
}
