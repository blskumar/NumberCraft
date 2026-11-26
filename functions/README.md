# NumberCraft Cloud Functions

Server side of the leaderboard and the parental-consent flow. **Never deployed from this repo by CI or an agent**: a human runs `firebase deploy --only functions` after review.

## What it validates (and what it does not)

The server **cannot replay a game**. `submitScore` is plausibility + rate limiting + provenance, not proof of play:

- auth + `email_verified`, current granted consent (`consents/{uid}`), round exists / open / owned / unexpired (3 h TTL)
- server-measured elapsed time (per-game minimum; arithmetic must be >= played duration)
- score <= game-specific hard bound derived from the engine constants (`src/limits.ts`, kept equal to the engines by `lib/server-limits.test.ts`)
- accuracy consistent with stats; answer rate not faster than a human (0.4 s/answer)
- per uid: 60 submits/day, 2 s between `startRound` calls, 300 rounds/day; one open round per uid+game
- doc id `{uid}_{gameId}_{serverUTCDate}`, best-of-day, written with the Admin SDK; `displayName` read from `users/{uid}` and re-moderated (blocked names are replaced by a generated one and flagged)
- anomalies go to `scoreFlags` (admin only): `too-fast`, `score-too-high`, `impossible-speed`, `accuracy-mismatch` (rejected, round consumed) and `above-p99`, `near-max`, `high-answer-rate`, `name-blocked` (accepted, for review)

Residual risk: a cheater who forges plausible stats, waits the minimum time and stays under the hard bound is accepted. The Odds & Urns bounds and all `p99` values are heuristics (no production data yet). Factor Grid **solo** supports deterministic move-log replay (`src/replay.ts`, verified against the engine in `lib/server-limits.test.ts`); the client does not send move logs yet. Upgrade path: seeded RNG + move logs for Foundry/Odds, then reuse the pure engines server-side.

Leaderboard day = server **UTC** date (IST players near midnight see scores under the previous UTC day).

## Functions

| name | type | notes |
| --- | --- | --- |
| `startRound({gameId,tier})` | callable | writes `rounds/{uid}_{roundId}` with TTL field `expiresAt` |
| `submitScore({roundId,score,accuracyPercent,stats})` | callable | see above |
| `recordSelfConsent()` | callable | adults; cannot override a minor/parent record |
| `requestParentalConsent({parentEmail})` | callable | token stored hashed (`consentRequests/{sha256}`), 7 d TTL, 3 per child/24 h, 5 per parent/day, sends via `Mailer` |
| `confirmParentalConsent` | HTTPS | `GET ?t=` page, `POST` decision yes/no/withdraw, single use |
| `withdrawConsent()` | callable | withdraws and erases scores |
| `eraseUserData` | Auth v1 `onDelete` | erases scores/rounds/flags/requests/profile, archives the consent evidence under a salted hash of the uid |

Minors and adults alike need `consents/{uid}.status == 'granted'` with the current `CONSENT_VERSION` (mirror of `lib/consent.ts` on fix/ws-F) to start rounds or submit scores.

## Deploy needs (for the deploy/runbook owner)

- `firebase.json` `"functions": {"source": "functions", "predeploy": "npm --prefix functions run build"}` (Node 20, region `asia-south1`).
- Firestore TTL policies on field `expiresAt` for collection groups `rounds`, `consentRequests`, `rateLimits`.
- Env/secrets: `CONSENT_BASE_URL` (public URL of `confirmParentalConsent`), `CONSENT_ARCHIVE_SALT` (Secret Manager), `ENFORCE_APP_CHECK=true` once App Check ships in the client, `MAILER`.
- **A real mailer**: only `LogMailer` (emulator/dev, logs no recipient) and a fail-closed `UnconfiguredMailer` exist. Implement `Mailer` for the chosen vendor under a DPA and return it from `getMailer()` in `src/index.ts`.
- Deploy rules and functions together with the client (`firestore:rules`, `functions`). Rules deny all client writes to `gameScores`, `rounds`, `scoreFlags`, `rateLimits`, `consents`, `consentRequests`, `consentArchive`.
- Auth v1 triggers need the Blaze plan; callables need the Cloud Run/Artifact APIs enabled.

## Tests

`npm run build` copies `../lib/name-moderation.ts` and `name-blocklist.ts` into `src/shared` (committed copies; a lib test fails on drift) and compiles. Integration tests use only the Firestore emulator (JDK 21+, JDK 25 works):

```
firebase emulators:exec --only firestore --project demo-nc-fn "node --test functions/dist/test/functions.test.js"
```

Rules tests: `firestore.rules.emu.test.mjs` (same emulator command).
