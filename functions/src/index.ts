import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as functionsV1 from 'firebase-functions/v1';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import type { AuthLike, Deps } from './common';
import {
  applyConsentDecision,
  eraseUserData as eraseUserDataImpl,
  previewConsentToken,
  recordSelfConsent as recordSelfConsentImpl,
  requestParentalConsent as requestParentalConsentImpl,
  withdrawConsent as withdrawConsentImpl,
} from './consent';
import { renderConsentPage } from './consent-page';
import { LogMailer, UnconfiguredMailer, type Mailer } from './mailer';
import { startRound as startRoundImpl, submitScore as submitScoreImpl } from './scores';

if (getApps().length === 0) initializeApp();

// Region: Mumbai, to keep processing in India (docs/legal/09). The Firestore
// location must match or be near it; confirm the database location.
const REGION = 'asia-south1';
// Turn on once App Check is enabled in the client (agent G): ENFORCE_APP_CHECK=true.
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';
const callOpts = { region: REGION, enforceAppCheck, maxInstances: 10 } as const;

// Replace with a real vendor implementation under a DPA before launch.
function getMailer(): Mailer {
  return process.env.FUNCTIONS_EMULATOR === 'true' || process.env.MAILER === 'log'
    ? new LogMailer()
    : new UnconfiguredMailer();
}

function deps(): Deps {
  return {
    db: getFirestore(),
    now: () => Date.now(),
    mailer: getMailer(),
    consentBaseUrl: process.env.CONSENT_BASE_URL ?? 'https://example.invalid/confirmParentalConsent',
    archiveSalt: process.env.CONSENT_ARCHIVE_SALT ?? 'dev-only-salt',
  };
}

const auth = (a: unknown) => a as AuthLike | undefined;

export const startRound = onCall(callOpts, (req) => startRoundImpl(deps(), auth(req.auth), req.data));
export const submitScore = onCall(callOpts, (req) => submitScoreImpl(deps(), auth(req.auth), req.data));
export const requestParentalConsent = onCall(callOpts, (req) =>
  requestParentalConsentImpl(deps(), auth(req.auth), req.data)
);
export const recordSelfConsent = onCall(callOpts, (req) => recordSelfConsentImpl(deps(), auth(req.auth)));
export const withdrawConsent = onCall(callOpts, (req) => withdrawConsentImpl(deps(), auth(req.auth)));

/**
 * Parent link target. GET ?t=token shows the notice and Yes/No buttons; POST
 * records the decision. Tokens are random 256-bit, stored hashed, single use.
 */
export const confirmParentalConsent = onRequest({ region: REGION, maxInstances: 5 }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  const d = deps();
  const token = String((req.method === 'POST' ? req.body?.t : req.query.t) ?? '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    res.status(400).send(renderConsentPage({ kind: 'invalid' }));
    return;
  }
  if (req.method === 'GET') {
    const p = await previewConsentToken(d, token);
    res.status(p ? 200 : 404).send(renderConsentPage(p ? { kind: p.type === 'withdraw' ? 'withdraw' : 'ask', token, displayName: p.displayName } : { kind: 'invalid' }));
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const decision = req.body?.decision;
  if (decision !== 'yes' && decision !== 'no' && decision !== 'withdraw') {
    res.status(400).send(renderConsentPage({ kind: 'invalid' }));
    return;
  }
  const outcome = await applyConsentDecision(d, token, decision);
  res.status(outcome === 'invalid' || outcome === 'expired' ? 410 : 200).send(renderConsentPage({ kind: 'done', outcome }));
});

/** Account deletion cleanup (rules deny client deletes of scores/consents). */
export const eraseUserData = functionsV1
  .region(REGION)
  .auth.user()
  .onDelete((user) => eraseUserDataImpl(deps(), user.uid));
