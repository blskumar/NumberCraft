# Numbercraft Firestore Security Specification

## 1. Data invariants
1. **Private profiles (`/users/{userId}`)**: only the authenticated owner may get, create, update or delete. `list` is denied. The stored `email` must equal `request.auth.token.email`. `displayName` must pass a rules-level check (2-20 chars, letters of any script, combining marks, digits, space `- _ .`; no leading/trailing space). Profanity, PII and impersonation checks cannot be written in rules and run in `lib/name-moderation.ts` (client) and again in the `submitScore` function.
2. **Identity integrity**: `uid` must equal `request.auth.uid` on create; `uid` and `createdAt` cannot change on update.
3. **Scores are server-written only (`/gameScores/{uid}_{gameId}_{serverUTCDate}`)**: clients get `read` (signed-in) but **no create/update/delete**. The `submitScore` Cloud Function (Admin SDK) validates and writes one best-of-day document per user, game and day.
4. **Server-only collections**: `rounds` (server-timed round tokens, TTL), `scoreFlags` (anomalies, admin only), `rateLimits`, `consentRequests`, `consentArchive`: no client access at all.
5. **Consent (`/consents/{uid}`)**: the owner may `get` their own status; **no client writes**. Only the backend writes it (see section 5).
6. **No impersonation**: the name on a score is read from `users/{uid}` by the function and re-moderated; a blocked name is replaced by a generated one.
7. **Erasure**: the `eraseUserData` Auth-trigger function deletes scores, rounds, flags, consent requests and the profile when the account is deleted; the consent evidence is archived under a salted hash of the uid (retention to be confirmed by counsel).

## 2. What is public (be honest)
Scores are readable by **any signed-in user** (no anonymous reads). Each score exposes: `uid` (stable Firebase UID), `displayName`, age `tier` (the `explorers` tier implies a young child), `gameId`, `score`, `accuracyPercent`, `dateKey`. Email is never stored on scores. This is **not** "zero-PII". Only users with a current granted consent record ever get a score document, so nobody without consent appears on the board.

## 3. Score validation and its limits
The server cannot replay the game. `submitScore` checks: verified email, current granted consent, an open, owned, unexpired server-issued round, server-measured elapsed time, per-game hard score bound derived from the engine constants, accuracy consistent with stats, per-uid daily caps and one open round per uid+game. Anomalies are written to `scoreFlags`. Residual: a forged but plausible score under the hard bound is accepted; Odds & Urns bounds and p99 flags are heuristic; sybil accounts can still fill the board (enable App Check, Auth quotas). Factor Grid solo supports move-log replay on the server; other games need seeded RNG and move logs. Details: `functions/README.md`.

## 4. Other residual risks (owner action)
- Enable App Check (set `ENFORCE_APP_CHECK=true` on the functions once the client ships it), Auth email-enumeration protection, API-key referrer restriction.
- A child who self-declares adult is not detected (age is not verified). Without consent a user has no cloud presence. Legal review (DPDP s.9, Rule 10) decides whether email-link verification is sufficient.
- The leaderboard day is the server UTC date.

## 5. Parental consent flow (docs/legal/04 has the legal spec)
1. Sign-up asks the age band only. Adults call `recordSelfConsent` (status `granted`, method `self`).
2. A minor calls `requestParentalConsent({parentEmail})`. The function checks the address (not the child's own), rate limits (3 per child per 24 h, 5 per parent address per day), writes `consents/{uid}` as `pending-parental-consent`, stores the SHA-256 of a random 256-bit token in `consentRequests/{hash}` (7-day TTL, parent email kept only until the decision) and sends the link through the `Mailer` interface.
3. The parent opens `confirmParentalConsent?t=token`, sees the notice and the child's display name only, and chooses Yes or No (POST). The token is single use. Yes writes `consents/{uid}` `{status: granted, method: parent-email-link, version, grantedAt}`, deletes the request and emails a receipt with a withdrawal link (a new single-use token, 1-year validity).
4. While status is not `granted` for the current `CONSENT_VERSION` (pending, declined, expired, withdrawn, version bump, no record), `startRound` and `submitScore` fail with `consent-required` and no score document exists. Withdrawal (parent link or `withdrawConsent`) erases scores. Account deletion triggers `eraseUserData`.
5. Rules: clients cannot create, update or delete `consents`/`consentRequests`; only the owner can read their own `consents` doc.

## 6. Tests
- `firestore.rules.emu.test.mjs` (15 cases): signed-in reads, every client write to `gameScores`, `rounds`, `scoreFlags`, `rateLimits`, `consentRequests`, `consentArchive`, `consents` denied, displayName rules check, email/token match, cross-user access.
- `functions/test/functions.test.ts` (25 cases, Firestore emulator): happy path, replay of a round id, forged score, too-fast round, unverified email, wrong owner, rate limits, best-of-day, expired round, name re-moderation, consent gating, the full parent consent flow (request, confirm, single use, decline, expiry, withdraw, erase), rate limits, replay verification.
- Run with the Firestore emulator (JDK 21+): `firebase emulators:exec --only firestore "node --test ..."`.
