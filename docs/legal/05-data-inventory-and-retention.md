# 05 Data inventory and retention

As of 21 Nov 2026, from repo at base cb4d60e. Legal basis column: **Consent** = DPDP s.6 (parent's for under-18, s.9(1)); **Legitimate use** = s.7 (counsel to confirm); **Legal duty** = s.7(d)/other law. "Proposed" retention = recommendation needing owner and counsel approval.

## A. Browser localStorage (guests and signed-in; never sent to us unless stated)

| Key | Fields | Purpose | Basis | Retention | Deletion path |
|---|---|---|---|---|---|
| `numbercraft_profile_v1` (lib/storage.ts) | uid, displayName, ageTier, soundEnabled, themePreference, dailyProblemGoal, sessionKind, authProvider, email (signed-in), sharedDeviceMode, featuredBadgeId | App state | Functional; consent for account fields | Until cleared | Sign-out/reset (`clearAllLocalProgress`), browser clear |
| `numbercraft_matches_v1` | match history (scores, accuracy, games) | Progress, dashboard | Functional (stays on device) | Until cleared | same |
| `numbercraft_badges_v1` | unlocked achievements | Progress | Functional | Until cleared | same |
| `numbercraft_daily_v1` | daily-goal / challenge state | Daily goal | Functional | Until cleared | same |
| `numbercraft_guest_trials_v1` (lib/guest-trial.ts) | per-game free-trial counts | Guest trial limit | Functional | Until cleared | same |
| `numbercraft_theme_v1` (lib/theme.ts) | light/dark/system | UI preference | Functional | Until cleared | same |
| `numbercraft_consent_v1` (lib/consent.ts) | uid, consent status, version | UI hint only; server authoritative | Functional | Until cleared / account deletion | Cleared on sign-out (TODO owner: add to clearAllLocalProgress) |

No cookies set by the app. Firebase Auth stores session tokens in IndexedDB/localStorage (session-only by default).

## B. Firebase Authentication (Google, global)

| Field | Purpose | Basis | Retention | Deletion |
|---|---|---|---|---|
| email, uid, password hash, emailVerified, provider, created/last-sign-in time | Account, security | Consent | Until account deleted | `deleteUser` (lib/firebase.ts deleteAccount) |
| IP/device in Google's auth logs | Abuse prevention | Legitimate use | Per Google; see 09 | Google schedule |

## C. Firestore (database id in firebase-applet-config.json)

| Collection/doc | Fields | Purpose | Basis | Proposed retention | Deletion path |
|---|---|---|---|---|---|
| `users/{uid}` | uid, displayName, email, ageTier, dailyProblemGoal, createdAt, updatedAt | Profile (owner-only) | Consent | Account life; purge after 24 months inactivity with prior email | deleteAccount; server inactivity job (E) |
| `gameScores/{uid}_{gameId}_{dateKey}` | uid, displayName, tier, gameId, gameTitle, score, accuracyPercent, dateKey, createdAt | Leaderboards (readable by any signed-in user) | Consent (parent for minors) | 90 days rolling | deleteAccount; TTL policy on createdAt (E) |
| `consents/{uid}` (new, spec 04) | ageBand, status, version, purposes, method, grantedAt, withdrawnAt, ipHash? | Proof of consent | Legal duty / legitimate use (evidence) | Account life + 3 years after withdrawal/deletion, keyed by hashed uid | Backend job |
| `consentRequests/{uid}` (new, spec 04) | uid, parentEmail, version, createdAt, expiresAt | Send one parent email | Consent | Until used or 7 days (Firestore TTL on expiresAt) | Backend on confirm; TTL |
| `rounds` | **No such collection exists in repo** | n/a | n/a | n/a | n/a |

Minimisation notes for agent E: public score docs expose `uid` and the `explorers` tier (implies a young child). Prefer an opaque public id and a coarse tier label, or drop tier from public docs.

## D. Logs and backups

| Item | Retention | Note |
|---|---|---|
| Hosting/Functions/Cloud Logging | Min 180 days (CERT-In), 1 year proposed (DPDP Rule 8 VERIFY); keep in India | Log buckets in asia-south1; no emails/names in log lines |
| Firestore backups/PITR | If enabled, <= 35 days | Deleted data persists until backup expiry; state this in notice |

## E. Not collected
No analytics IDs, ad IDs, device fingerprints, geolocation, photos, contacts, phone numbers, payment data, birthdays.
