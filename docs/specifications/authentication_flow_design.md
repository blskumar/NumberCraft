# Numbercraft — User Authentication Flow & Student Data Privacy Design

**Target Audience:** Learners aged **8–16** (*Explorers 8–10*, *Challengers 11–13*, *Strategists 14–16*), parents/guardians, and classroom teachers.  
**Core Principle:** **Guest-First, Zero-Friction Entry** with progressive, privacy-preserving account upgrade via Firebase Authentication + Firestore.

---

## 1. End-to-End Authentication Lifecycle Overview

```text
  [First Visit] ──► Guest Mode (localStorage: matches, seals, tier)
                         │
                         ▼ (Optional upgrade via TopNav Profile / Account Modal)
           ┌─────────────┴─────────────┐
           ▼                           ▼
   [Create Account]                [Sign In]
   • Google Popup OAuth            • Google Popup OAuth
   • Email + Password              • Email + Password
   • Under-13 Guardian Check       • Shared Classroom Toggle
           │                           │
           └─────────────┬─────────────┘
                         ▼
       [Deterministic Guest → Account Merge]
       • Deduplicate matches by match.id
       • Union-merge earned seals (keep earliest unlockedAt)
       • Attach account-scoped Firestore listeners
                         │
                         ▼
           [Authenticated Student Session]
           • Public profile (/users/{uid}) — pseudonym only
           • Private PII (/users/{uid}/private/account) — owner-only
                         │
                         ▼ (Secure Sign-Out)
       1. Detach all Firestore onSnapshot listeners
       2. Call signOut(auth) & revoke session persistence
       3. Optional: wipe local browser cache on shared classroom PC
       4. Return cleanly to Guest Mode
```

---

## 2. Sign-Up Process (Email/Password & Social Login Options)

### 2.1 Social Login (Recommended Primary Path for Students & Schools)
- **Google Sign-In (`signInWithPopup`):**
  - Recommended as the primary low-friction option for school Chromebooks and Google Workspace for Education accounts.
  - Uses `signInWithPopup` (avoiding iframe redirect allowlist issues).
  - **First-time onboarding:** After OAuth completes, the student chooses or confirms a **public pseudonym / display name** (defaulting to a shortened first name or pseudonym, never exposing their email address) and selects their **Adaptive Age Tier** (`Explorers 8–10`, `Challengers 11–13`, or `Strategists 14–16`).
- **Account Linking & Provider Collisions:**
  - If an email already exists under another provider (`auth/account-exists-with-different-credential`), prompt the user to sign in with the existing provider first and link credentials cleanly rather than creating duplicate student records.

### 2.2 Email & Password Sign-Up
1. **Inputs Collected (Data Minimization):**
   - **Public Display Name** (1–28 chars, sanitized; pseudonyms explicitly encouraged).
   - **Learner Age Tier** (`Explorers 8–10`, `Challengers 11–13`, `Strategists 14–16`).
   - **Email Address** (labeled *"Parent / Guardian Email"* when `Explorers 8–10` is selected; strictly private).
   - **Password** with live strength validation: minimum **8 characters**, at least **1 letter** and **1 number**, masked by default with an accessible show/hide toggle.
2. **Under-13 Child Privacy Gate (COPPA Alignment):**
   - Selecting *Explorers (8–10)* surfaces an explicit **Parent/Guardian Consent** confirmation step and directs verification & recovery notices to the parent/guardian email.
3. **Email Verification:**
   - Immediately dispatches `sendEmailVerification(user)` after `createUserWithEmailAndPassword`.
   - Students can keep playing Core Arithmetic and Factor Grid right away, while verified-only features (such as hosting persistent Online Rooms) require email verification.

---

## 3. Sign-In Process

1. **Dual Entry:** Students can click **Continue with Google** or enter **Email + Password**.
2. **Anti-Enumeration Error Handling:**
   - Failed email/password attempts return a single generic message (`"Invalid email or password"`) without revealing whether an email is registered.
   - Exponential backoff / Firebase built-in brute-force throttling protects student accounts.
3. **Classroom / Shared Device Session Persistence:**
   - Includes a **"Shared classroom computer (session-only sign-in)"** checkbox:
     - **Unchecked (personal device):** Uses `browserLocalPersistence` so progress stays connected across browser restarts.
     - **Checked (shared lab/tablet):** Uses `browserSessionPersistence` so closing the tab automatically terminates the session.
4. **Auth State Hydration:**
   - `onAuthStateChanged` resolves before any Firestore `onSnapshot` listener is attached, preventing flash-of-guest-state or unauthorized read errors.

---

## 4. Password Recovery Flow

1. **Trigger:** Accessible directly from Sign In (`"Forgot password?"`) or the `Reset Password` tab inside `AccountModal`.
2. **Non-Enumerating Dispatch:**
   - Calls `sendPasswordResetEmail(auth, email)`.
   - Always displays the same privacy-preserving confirmation regardless of whether the email exists: *"If an account exists for that email, a single-use reset link (valid 15 minutes) has been sent."*
3. **Social-Provider Guidance:**
   - The reset email and help text remind users who signed up with Google to use **Continue with Google** instead of creating a separate password.
4. **Session Revocation:**
   - Completing a password reset invalidates existing refresh tokens across other devices, forcing fresh sign-in on any previously shared computer.

---

## 5. Secure Sign-Out Mechanism

A secure sign-out for an educational app must prevent both **Firestore permission race conditions** and **shared-device data leakage**:

1. **Confirmation Step:** Clicking **Secure Sign-Out** prompts an inline confirmation (no browser `window.confirm`).
2. **Shared-Device Cache Wipe Option:** Offers a checkbox: *"Shared classroom device: also clear cached local matches and seals from this browser."*
3. **Deterministic Teardown Sequence:**
   - Step 1: Unsubscribe/detach all active Firestore `onSnapshot` listeners.
   - Step 2: Execute `await signOut(auth)`.
   - Step 3: Clear in-memory profile/session state and (if opted in or if `sharedDeviceMode === true`) purge `localStorage` match/badge caches.
   - Step 4: Transition smoothly back to **Guest Mode** with zero broken UI or permission errors.

---

## 6. User Data Privacy & Child Safety Architecture

| Privacy Dimension | Numbercraft Control |
| :--- | :--- |
| **Strict PII Isolation** | Email, auth provider, and parental-consent timestamps live exclusively in `/users/{uid}/private/account` (owner-only read/write). Public leaderboards/rooms only ever read `displayName`, `ageTier`, and `featuredBadgeId`. |
| **Data Minimization** | No full legal name, exact birthdate, school street address, phone number, or photo upload is required. Age is stored solely as a coarse 3-band tier (`explorers` / `challengers` / `strategists`). |
| **Zero Tracking / No Ads** | No third-party ad networks, behavioral analytics trackers, or cross-site cookies. |
| **Firestore Security Rules** | Every student collection enforces `request.auth != null && request.auth.uid == userId`, strict field allowlists, max-length constraints (`displayName <= 28`), and server-validated schema types. |
| **Data Portability & Deletion** | Parents/students can export their Mastery Notebook JSON or request full account + subcollection deletion (deleting `/users/{uid}` subcollections + Auth record). |

---

## 7. Per-User Progress Persistence & Guest-to-Account Merge

### 7.1 Firestore Schema per User Account
```text
/users/{uid}                           # Profile preferences (displayName, ageTier, soundEnabled, featuredBadgeId)
/users/{uid}/private/account           # Private PII (email, authProvider, guardianConsentAt, sharedDeviceMode)
/users/{uid}/matches/{matchId}         # Factor Grid + Core Arithmetic match ledger (score, tier, accuracy, playedAt)
/users/{uid}/badges/{badgeId}          # Permanently latched Mastery Seals (id, unlockedAt, triggerMatchId)
/users/{uid}/arithmeticStats/{gameId}  # Aggregated personal bests, max Multiplication Stage, & pace records
```

### 7.2 Deterministic Guest-to-Account Merge Strategy
When a learner plays in Guest Mode and later signs in or creates an account:
1. **Matches:** Upload local non-sample matches (`!isSampleMatch(m)`) using `match.id` as the Firestore document ID (`setDoc(..., { merge: false })` only if absent) so duplicates never occur even on retry.
2. **Mastery Seals:** Perform a **set union** between local latched badges and cloud badges, preserving the **earliest `unlockedAt`** timestamp for each seal (earned seals never regress).
3. **Arithmetic Bests:** Keep `Math.max()` for best score, best streak, and highest Multiplication Mastery stage reached per tier.
4. **Offline Continuity:** Firestore local persistence queues match writes while offline and syncs seamlessly when connectivity returns.

### 7.3 Enabling Live Auth in Firebase (Next Step When Ready)
- Provision Firebase (Auth + Firestore) via the studio integration flow, which configures **Google Sign-In** automatically.
- To also activate **Email/Password** and **Password Reset** live in production: open **Firebase Console → Authentication → Sign-in method → Enable Email/Password**, and customize the Password Reset email template with Numbercraft's branding.
