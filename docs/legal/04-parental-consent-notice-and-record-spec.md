# 04 Verifiable parental consent: notice, record and server spec

As of 21 Nov 2026. Legal anchor: DPDP Act s.9(1) and Rule 10 (fiduciary must adopt technical and organisational measures to obtain verifiable consent of the parent/lawful guardian, including checking that the person is an identifiable adult, by reliable identity/age details already held, details voluntarily provided, or a virtual token from an authorised entity such as DigiLocker). **(VERIFY exact Rule 10 wording and whether email-link alone is "verifiable"; counsel decision, see section 8.)** Implemented client code: `lib/consent.ts`, `lib/consent-client.ts`, `components/ConsentGate.tsx`, wiring in `components/AccountModal.tsx`. **The backend below is NOT implemented**; it is a spec for agent E / owner.

## 1. Age bands
- `adult` (18+): ordinary DPDP s.6 consent by ticking the notice box. `method: 'self'`. No parent email.
- `minor` (under 18): parental consent required. We ask only the band, never a birthday. Existing `ageTier` (explorers/challengers/strategists) is a difficulty tier, not an age proof.

## 2. State machine (`ConsentStatus`)
`pending-parental-consent` -> `granted` | `declined` | `expired`; `granted` -> `withdrawn`; `granted` + new notice version -> effectively `pending-parental-consent` until re-confirmed (`effectiveConsentStatus`).

While not `granted`: no leaderboard visibility, no cloud score writes, guest-style local play only. Enforcement layers:
1. UI hint (`hintAllowsCloudScores`, used in NumbercraftApp): best effort.
2. **Server (required, owner E):** Firestore rules for `gameScores` create/update must also require `get(/databases/$(database)/documents/consents/$(request.auth.uid)).data.status == 'granted'` AND `.version == <current>` **when `ageBand == 'minor'`**; reads of `gameScores` must exclude those users (write score docs only when allowed, so nothing to hide). Adults: no consent doc required for scores (or `status == 'granted'` with method self, if you prefer uniform treatment).

## 3. Client flow (built)
1. Sign-up shows the ConsentGate: age band radio, parent email (minor only), notice checkbox (linking /privacy).
2. After `registerWithEmail`, for minors the client creates `consentRequests/{uid}` `{uid, parentEmail, version, createdAt, expiresAt}` and stores the local hint `pending-parental-consent`.
3. Profile shows a pending banner with "Check again" which reads `consents/{uid}`.
Firestore rules to add (E): `consentRequests/{uid}`: create only if `request.auth.uid == uid`, `expiresAt <= request.time + 7d`, email format check, no read, no update, owner delete denied (backend deletes). `consents/{uid}`: owner `get` only; **no client writes**.

## 4. Server spec (Cloud Functions, region asia-south1)
Trigger `onDocumentCreated('consentRequests/{uid}')`:
1. Validate; reject if parent email equals the child's Auth email.
2. Create a random 256-bit token; store only `SHA-256(token)` plus `uid`, `expiresAt` in a server-only collection `consentTokens/{hash}` (no client access).
3. Send an email (via a processor under DPA, e.g. Firebase Trigger Email/SendGrid/SES Mumbai) from a verified domain with SPF/DKIM/DMARC. Link: `https://<domain>/parent-consent?t=<token>`; single use; **valid 7 days**. Rate-limit to 3 emails per child per 24 h and 5 per parent address per day.
4. Log only the hash and status; never log the parent email.

HTTPS callable/route `confirmParentalConsent` (page `/parent-consent`, needs a small server page, not built):
1. Parent opens link; sees the full notice, the child's display name only (never email), the purposes, and clear Yes / No buttons (no pre-ticked box, no dark patterns).
2. Parent confirms: "I am the parent or lawful guardian of this child, I am 18 or over, and I agree to ...". **Identity step (counsel decides level):** baseline = control of the email address plus a declaration; stronger = DigiLocker virtual token or a small refundable card/UPI check; document upload is **discouraged** (collects more data).
3. On Yes: transaction sets `consents/{uid}` `{status:'granted', version, purposes, method:'parent-email-link', grantedAt: serverTimestamp, ipHash?}`; delete `consentRequests/{uid}` and token; send the parent a receipt email with a **withdrawal link**.
4. On No: `declined`; delete request and token; offer the child account deletion after 7 days.
5. On expiry (scheduled function hourly or Firestore TTL): `expired`, delete request; after 30 days in `expired`/`pending`, delete the Auth user and profile (data minimisation).
`ipHash` (optional) = `HMAC-SHA256(secretFromSecretManager, ip)`; never store raw IP; rotate the secret yearly; skip if counsel prefers.

## 5. Withdrawal flow
- Parent: receipt-email link `/parent-consent/withdraw?t=<token>` (new token, 30-day reissue by request through /grievance). On withdrawal: `status:'withdrawn'`, `withdrawnAt`, then within 7 days erase `gameScores` for the uid, mark the account for deletion (child informed on next login), keep the consent record per retention (05).
- Child/adult: Delete my account (exists, lib/firebase.ts `deleteAccount`) -> **extend the server cleanup to delete `consents` and `consentRequests` per retention**.
- Law: DPDP s.6(4) withdrawal as easy as giving; s.6(6) cease processing within a reasonable time; s.8(7) erase.

## 6. Re-consent on policy change
Bump `CONSENT_VERSION`. At next sign-in, `effectiveConsentStatus` != granted -> adults see the notice and tick again; minors: the server emails the parent a fresh request (reuse flow, status pending). Material change = new purpose, new recipient category, new data field, or change to leaderboard visibility.

## 7. Consent record (`ConsentRecord`)
`uid, ageBand, status, version, purposes[], method, grantedAt, withdrawnAt, ipHash?`. Purposes: `account`, `leaderboard-display`, `progress-sync`. Admin SDK writes only. Keep audit trail as append-only subcollection `consents/{uid}/events/{id}` (granted/withdrawn/version) if counsel wants history. After deletion keep the record under a salted hash of the uid for 3 years (limitation-period evidence, counsel to confirm).

## 8. Open legal questions (counsel)
1. Does email-link plus declaration meet Rule 10's "verifiable"? If not, integrate DigiLocker tokens or payment-instrument check.
2. Can the parent's email be used for a receipt and withdrawal link after deletion of the request? (Design assumes the email is not retained; withdrawal then relies on token links and /grievance.) Alternative: keep an encrypted parent email while consent is granted, with disclosure. Decide and update 02 section 6.
3. Sample notice to the parent (below).

## 9. Parent email template
Subject: Please confirm: [child display name] wants to play NumberCraft
Body: Hello. Someone using this email as their parent or guardian contact asked to create a NumberCraft account for "[display name]". NumberCraft is a children's maths game by [COMPANY LEGAL NAME]. If you agree we will store the child's email, chosen display name, age group and game scores, and show display name, age group and scores to other signed-in players on a leaderboard. No ads, no tracking. You can withdraw consent or delete the account at any time. Read the full notice: [link]. [Yes, I agree] [No] (link valid 7 days). If you did not expect this, ignore this email: nothing will be saved online. We will delete your email address after you reply or after 7 days.
