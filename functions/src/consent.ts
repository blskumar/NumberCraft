// Parental-consent backend (spec: docs/legal/04 on fix/ws-F). Not legal advice:
// counsel decides whether email-link + declaration is "verifiable" (DPDP Rule 10).
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { CONSENT_VERSION, requireSignedIn, sha256, type AuthLike, type Deps } from './common';
import { RATE } from './limits';

export const PARENT_REQUEST_TTL_MS = 7 * 24 * 3600_000;
export const WITHDRAW_TOKEN_TTL_MS = 365 * 24 * 3600_000;
const PURPOSES = ['account', 'leaderboard-display', 'progress-sync'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Adults (18+) record their own consent. Cannot override a minor/parent record. */
export async function recordSelfConsent(deps: Deps, auth: AuthLike | undefined) {
  const { uid } = requireSignedIn(auth);
  const ref = deps.db.doc(`consents/${uid}`);
  const cur = await ref.get();
  if (cur.exists && cur.data()?.ageBand === 'minor') {
    throw new HttpsError('failed-precondition', 'parent-consent-required');
  }
  const now = Timestamp.fromMillis(deps.now());
  await ref.set({
    uid,
    ageBand: 'adult',
    status: 'granted',
    version: CONSENT_VERSION,
    purposes: PURPOSES,
    method: 'self',
    grantedAt: now,
    withdrawnAt: null,
  });
  return { status: 'granted' };
}

export async function requestParentalConsent(deps: Deps, auth: AuthLike | undefined, data: unknown) {
  const { uid } = requireSignedIn(auth);
  const raw = (data as { parentEmail?: unknown } | null)?.parentEmail;
  const parentEmail = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (parentEmail.length > 254 || !EMAIL_RE.test(parentEmail)) throw new HttpsError('invalid-argument', 'bad-parent-email');
  const childEmail = (auth!.token.email ?? '').toLowerCase();
  if (parentEmail === childEmail) throw new HttpsError('invalid-argument', 'parent-email-same-as-child');

  const existing = (await deps.db.doc(`consents/${uid}`).get()).data();
  if (existing?.status === 'granted' && existing.version === CONSENT_VERSION) {
    throw new HttpsError('failed-precondition', 'already-granted');
  }

  const now = deps.now();
  const day = dayOf(now);
  const parentKey = `parent_${sha256(parentEmail)}_${day}`;
  const childKey = `consentReq_${uid}`;

  await deps.db.runTransaction(async (tx) => {
    const [p, c] = await Promise.all([tx.get(deps.db.doc(`rateLimits/${parentKey}`)), tx.get(deps.db.doc(`rateLimits/${childKey}`))]);
    const parentCount = (p.data()?.n as number) ?? 0;
    const recent = ((c.data()?.at as number[]) ?? []).filter((t) => now - t < 24 * 3600_000);
    if (parentCount >= RATE.consentPerParentPerDay || recent.length >= RATE.consentRequestsPer24h) {
      throw new HttpsError('resource-exhausted', 'consent-rate-limit');
    }
    tx.set(deps.db.doc(`rateLimits/${parentKey}`), { n: parentCount + 1, expiresAt: Timestamp.fromMillis(now + 2 * 24 * 3600_000) });
    tx.set(deps.db.doc(`rateLimits/${childKey}`), { at: [...recent, now] });
  });

  // Replace any previous open request for this child.
  const old = await deps.db.collection('consentRequests').where('uid', '==', uid).where('type', '==', 'parent').get();
  const token = randomBytes(32).toString('base64url');
  const hash = sha256(token);
  const batch = deps.db.batch();
  old.forEach((d) => batch.delete(d.ref));
  batch.set(deps.db.doc(`consentRequests/${hash}`), {
    type: 'parent',
    uid,
    // Kept only until confirm/decline/expiry (TTL on expiresAt); needed for the receipt email.
    parentEmail,
    version: CONSENT_VERSION,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + PARENT_REQUEST_TTL_MS),
  });
  batch.set(
    deps.db.doc(`consents/${uid}`),
    {
      uid,
      ageBand: 'minor',
      status: 'pending-parental-consent',
      version: CONSENT_VERSION,
      purposes: PURPOSES,
      method: 'parent-email-link',
      grantedAt: null,
      withdrawnAt: null,
    },
    { merge: false }
  );
  await batch.commit();

  const name = (await deps.db.doc(`users/${uid}`).get()).data()?.displayName ?? 'a child';
  const link = `${deps.consentBaseUrl}?t=${encodeURIComponent(token)}`;
  try {
    await deps.mailer.send({
      to: parentEmail,
      subject: `Please confirm: ${name} wants to play NumberCraft`,
      text:
        `Someone using this email as their parent or guardian contact asked to create a NumberCraft account for "${name}". ` +
        `If you agree we store the child's email, display name, age group and game scores, and show display name and scores to other signed-in players on a leaderboard. ` +
        `Review and answer here (valid 7 days, single use): ${link}\n` +
        `If you did not expect this, ignore this email: nothing will be saved online. Your email address is deleted after you reply or after 7 days.`,
    });
  } catch {
    await deps.db.doc(`consentRequests/${hash}`).delete();
    throw new HttpsError('unavailable', 'email-unavailable');
  }
  return { status: 'pending-parental-consent' };
}

export type ConfirmOutcome = 'granted' | 'declined' | 'withdrawn' | 'expired' | 'invalid';

/** Token landing: preview (GET) shows who/what; apply (POST) decides. */
export async function previewConsentToken(deps: Deps, token: string) {
  const snap = await deps.db.doc(`consentRequests/${sha256(token)}`).get();
  const r = snap.data();
  if (!snap.exists || !r || (r.expiresAt as Timestamp).toMillis() < deps.now()) return null;
  const name = (await deps.db.doc(`users/${r.uid}`).get()).data()?.displayName ?? 'a child';
  return { type: r.type as 'parent' | 'withdraw', displayName: String(name) };
}

export async function applyConsentDecision(
  deps: Deps,
  token: string,
  decision: 'yes' | 'no' | 'withdraw'
): Promise<ConfirmOutcome> {
  const hash = sha256(token);
  const ref = deps.db.doc(`consentRequests/${hash}`);
  const now = deps.now();
  let receiptTo: string | null = null;
  let withdrawToken: string | null = null;
  let eraseUid: string | null = null;

  const outcome = await deps.db.runTransaction<ConfirmOutcome>(async (tx) => {
    const snap = await tx.get(ref);
    const r = snap.data();
    if (!snap.exists || !r) return 'invalid';
    if ((r.expiresAt as Timestamp).toMillis() < now) {
      tx.delete(ref); // single use and expired: gone either way
      if (r.type === 'parent') {
        tx.set(deps.db.doc(`consents/${r.uid}`), { status: 'expired' }, { merge: true });
      }
      return 'expired';
    }
    const consentRef = deps.db.doc(`consents/${r.uid}`);
    if (r.type === 'parent' && (decision === 'yes' || decision === 'no')) {
      tx.delete(ref);
      if (decision === 'no') {
        tx.set(consentRef, { status: 'declined' }, { merge: true });
        return 'declined';
      }
      withdrawToken = randomBytes(32).toString('base64url');
      receiptTo = r.parentEmail as string;
      tx.set(consentRef, {
        uid: r.uid,
        ageBand: 'minor',
        status: 'granted',
        version: r.version,
        purposes: PURPOSES,
        method: 'parent-email-link',
        grantedAt: Timestamp.fromMillis(now),
        withdrawnAt: null,
      });
      tx.set(deps.db.doc(`consentRequests/${sha256(withdrawToken)}`), {
        type: 'withdraw',
        uid: r.uid,
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + WITHDRAW_TOKEN_TTL_MS),
      });
      return 'granted';
    }
    if (r.type === 'withdraw' && decision === 'withdraw') {
      tx.delete(ref);
      tx.set(consentRef, { status: 'withdrawn', withdrawnAt: Timestamp.fromMillis(now) }, { merge: true });
      eraseUid = r.uid as string;
      return 'withdrawn';
    }
    return 'invalid';
  });

  if (eraseUid) await eraseScores(deps, eraseUid);
  if (receiptTo && withdrawToken) {
    try {
      await deps.mailer.send({
        to: receiptTo,
        subject: 'NumberCraft: consent recorded',
        text: `Thank you. Consent is recorded. You can withdraw it at any time (scores are then erased): ${deps.consentBaseUrl}?t=${encodeURIComponent(withdrawToken)}&w=1`,
      });
    } catch {
      // Receipt is best effort; consent itself is recorded.
    }
  }
  return outcome;
}

/** Signed-in user (child or adult) withdraws: status withdrawn, scores erased. */
export async function withdrawConsent(deps: Deps, auth: AuthLike | undefined) {
  const { uid } = requireSignedIn(auth);
  await deps.db.doc(`consents/${uid}`).set(
    { uid, status: 'withdrawn', withdrawnAt: Timestamp.fromMillis(deps.now()) },
    { merge: true }
  );
  const reqs = await deps.db.collection('consentRequests').where('uid', '==', uid).get();
  await Promise.all(reqs.docs.map((d) => d.ref.delete()));
  await eraseScores(deps, uid);
  return { status: 'withdrawn' };
}

async function deleteQuery(q: FirebaseFirestore.Query) {
  const snap = await q.get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = q.firestore.batch();
    snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}

export async function eraseScores(deps: Deps, uid: string) {
  await deleteQuery(deps.db.collection('gameScores').where('uid', '==', uid));
  await deleteQuery(deps.db.collection('rounds').where('uid', '==', uid));
}

/**
 * Auth onDelete: erases scores, rounds, flags, requests, rate counters and the
 * live consent doc. The consent evidence is archived under a salted hash of the
 * uid (spec 04 s.7, retention to be confirmed by counsel); no raw uid or email.
 */
export async function eraseUserData(deps: Deps, uid: string) {
  await eraseScores(deps, uid);
  await deleteQuery(deps.db.collection('scoreFlags').where('uid', '==', uid));
  await deleteQuery(deps.db.collection('consentRequests').where('uid', '==', uid));
  const consent = await deps.db.doc(`consents/${uid}`).get();
  if (consent.exists) {
    const c = consent.data()!;
    await deps.db.doc(`consentArchive/${sha256(deps.archiveSalt + uid)}`).set({
      status: 'erased',
      lastStatus: c.status ?? null,
      version: c.version ?? null,
      method: c.method ?? null,
      grantedAt: c.grantedAt ?? null,
      withdrawnAt: c.withdrawnAt ?? null,
      erasedAt: Timestamp.fromMillis(deps.now()),
    });
    await consent.ref.delete();
  }
  await deps.db.doc(`rateLimits/${uid}`).delete();
  await deps.db.doc(`rateLimits/consentReq_${uid}`).delete();
  await deps.db.doc(`users/${uid}`).delete();
}
