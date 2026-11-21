# Numbercraft Firestore Security Specification

## 1. Data invariants
1. **Private profiles (`/users/{userId}`)**: only the authenticated owner may get, create, update or delete. `list` is denied. The stored `email` must equal `request.auth.token.email`.
2. **Identity integrity**: `uid` must equal `request.auth.uid` on create; `uid` and `createdAt` cannot change on update.
3. **One score per user, game and day (`/gameScores/{uid}_{gameId}_{dateKey}`)**: the document id is deterministic, so an account cannot flood the board. A score can only be RAISED (best-of-day); lowering or editing other fields is denied. `createdAt` is set to `request.time` on each raise. Scores need a verified email (`email_verified`).
4. **Bounded values**: `0 <= score <= 100000`, `0 <= accuracyPercent <= 100`, `gameId` from the allowlist, `gameTitle` bound to `gameId`, `dateKey` must be the server UTC day +/- 1 (covers client time zones). `weekKey` is not stored; the week is derived client-side from `dateKey`.
5. **No impersonation**: `displayName` on a score must equal `users/{uid}.displayName` (checked with `get()`).
6. **Server time**: `createdAt` / `updatedAt` must equal `request.time`.
7. **Erasure**: an owner may delete their own profile and scores (account deletion). The score ledger is therefore NOT append-only; the deterministic id limits abuse to one doc per user/game/day.

## 2. What is public (be honest)
Scores are readable by **any signed-in user** (no anonymous reads). Each score exposes: `uid` (stable Firebase UID), `displayName`, age `tier` (the `explorers` tier implies a young child), `gameId`, `score`, `accuracyPercent`, `dateKey`. Email is never stored on scores. This is **not** "zero-PII": the display name is chosen by the child and shown to other signed-in players. The UI tells users not to use their real name.

## 3. Residual risks (need backend / console / legal action by the owner)
- **Scores are client-asserted.** Rules cannot verify gameplay. Any verified account can post up to 100000 for itself. Real anti-cheat needs a trusted backend (Cloud Function or Admin SDK validating scores). Not built here.
- **Sybil accounts**: many free accounts can still fill the leaderboard window (`limit(250)`). Enable App Check and Auth quotas in the console.
- **Display-name moderation**: no profanity filter; names are free text (1-28 chars).
- **Delete then re-post** the same day is possible (the id is free again after delete).
- **Child consent / COPPA / GDPR-K**: the UI adds a guardian-consent checkbox and privacy notice, but this is not legal verification of parental consent. Legal review is required before launch to under-13/16 users.
- Enable Firebase Auth email-enumeration protection, restrict the API key by HTTP referrer, and enable App Check (console actions).

## 4. Adversarial cases covered by the emulator test (`firestore.rules.emu.test.mjs`)
Unauthenticated read/write denied; uid spoofing; ghost/legacy fields (`weekKey`, `isAdmin`); random doc id or id not matching uid/game/date; lower or equal score update; editing non-score fields; unverified email; displayName not matching profile; gameTitle not matching gameId; score out of bounds; dateKey far past/future or malformed; forged `createdAt`; cross-user delete; profile email not matching token; cross-user profile read; `users` list; extra profile fields.

Run: start the Firestore emulator (needs JDK 21+) and `node --test firestore.rules.emu.test.mjs` with `@firebase/rules-unit-testing` installed (not a project dependency).
