# Numbercraft — Elephant-Goldfish Model (EGM) Planning & App Review

**Review Scope:** Full current codebase (`Numbercraft` interactive prototype) + upcoming **Badge & Achievement System** + full-studio roadmap (**Equation Foundry**, **Odds & Urns**, **Firebase Online Rooms**).  
**Method:** Under the **Elephant-Goldfish Model**, we separate **Deep Context Drafting (The Elephant)** from **Zero-Context Adversarial Review (The Goldfish)** before writing new code, preventing confirmation bias, hidden mathematical bugs, and spec-to-code drift.

---

## Part 1 — The Elephant: Full Context & Current App Inventory

As project historian, the Elephant maps what is already built and verified versus what remains planned:

### 1.1 Implemented & Verified Today
- **Shell & Navigation (`TopNav`, `StudioHub`, `NumbercraftApp`)**: Warm drafting-paper tactile notebook design (`Fraunces` + `Plus Jakarta Sans` + `IBM Plex Mono` `tabular-nums`), strict 3-zone header, Adaptive Age Tier bar (*Explorers 8–10*, *Challengers 11–13*, *Strategists 14–16*), and elevated cardstock/tile/marble visuals.
- **Set 03 — Factor Grid (`factor-grid-engine.ts`, `FactorGridPrototype.tsx`)**: Playable across `1–20` (`5×4`), `1–36` (`6×6`), and `1–49` (`7×7`); supports **Solo (Outsmart the Taxman)**, **Human vs. AI** (*Apprentice*, *Scholar*, *Master* Alpha-Beta Minimax), **Local Pass-and-Play**, and **Classic / Prime Trap (`+3`)** rules with divisor hover previews, Territory Balance tug-of-war bar, `H` Hint shortcut, and `6` passing `node:test` unit tests.
- **Mastery Notebook (`MasteryNotebook.tsx`, `PerformanceTrendsChart.tsx`, `notebook-analytics.ts`)**: KPI strip, **Recharts** visualizations (*Score Over Time* with `Scores | Net Margin` toggle, *By Age Tier*, *By Game Mode*), synchronized Mode/Tier filters, sample data loader/clearer, match ledger, and `5` passing `node:test` unit tests.
- **UI Models & Docs**: `OnlineRoomsPreview`, `AccountModal` (local profile + sign-in flow preview), `BlueprintOverview`, and `SPECIFICATION_AND_WIREFRAMES.md`.

### 1.2 Pending Roadmap Scope
1. **Badge & Achievement System** *(Immediate Next Milestone)*: Milestone rewards in `MasteryNotebook` (such as *Perfect Streak* and *Top Scorer*) plus visual profile indicators.
2. **Set 01 — Equation Foundry** *(Arithmetic + Expression Solver AI)*.
3. **Set 02 — Odds & Urns** *(Modular Probability Chambers + Optimal-EV Bot)*.
4. **Firebase Auth & Live Firestore Sync** *(Real Google Sign-In, Guest→Cloud merge, and cross-device `/rooms/{code}`)*.

---

## Part 2 — The Goldfish: Zero-Context Adversarial App Review

Acting with **zero assumed intent**, the Goldfish audited the live codebase and specifications and uncovered **6 concrete gaps, math fairness flaws, and spec-to-code drifts**:

| ID | Severity | Finding (Observed in Code / Spec) | Why It Breaks Trust or Logic | Recommended Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **G1** | **High** | **Storage Cap Mismatch (`30` vs. `40`) & Ephemeral History** (`lib/storage.ts` lines 57 & 68) | `saveMatches` stores up to `40` matches, but `loadMatches` silently slices to `30` on reload! Even worse, computing badges purely from a capped 30-match array causes earned achievements to vanish once older matches roll off. | Align both limits (e.g., `100` matches locally) **and** latch real earned badges in persistent profile/storage (`earnedBadges`) with `unlockedAt` + `triggerMatchId`. |
| **G2** | **High** | **Stale Profile Name Input in `AccountModal`** (`components/AccountModal.tsx` line 22) | `AccountModal` stays mounted while closed and initializes `useState(profile.displayName)` on first mount (`"Guest Explorer"`). When `localStorage` hydrates a saved custom name (`"Maya"`) 1 tick later, opening the modal still displays `"Guest Explorer"` in the input box! | Sync `nameInput` when `open` transitions to `true` (or mount modal content conditionally when `open` is true). |
| **G3** | **High** | **Sample Progress Contaminating Real Badges** (`lib/notebook-analytics.ts` `sample-1..9`) | Clicking **Load Sample Progress** injects 9 sample matches (including score `668`, a 2-win run, and synthetic `primesClaimed: 5`). A naive achievement engine would permanently award real badges (`Top Scorer`, `Prime Collector`) from synthetic sample games! | Strictly exclude `isSampleMatch(m)` from permanent badge unlocks; show a clear `"Sample Progress Preview Active"` note so real student progress stays authentic. |
| **G4** | **High** | **Board-Scale Unfairness in `"Top Scorer"`** (`factor-grid-engine.ts` `boardMax = 20 / 36 / 49`) | Total board point pools are `210` (*Explorers 1–20*), `666` (*Challengers 1–36*), and `1225` (*Strategists 1–49*). A flat cutoff like `score >= 300` is **mathematically impossible** for 8–10-year-old *Explorers*! | Define **Top Scorer** using **percentage of the board's base sum** (`>= 60%`: `126+` on `1–20`, `400+` on `1–36`, `735+` on `1–49`), making it equally fair across all three age tiers. |
| **G5** | **Medium** | **Pass-and-Play Streak Farming & Spec Drift** (`FactorGridPrototype.tsx` line 172 & `TopNav.tsx`) | Local Pass-and-Play logs P1 results alongside Solo/vs-AI. A single user could play both sides locally to farm `"Perfect Streak"`. Also: `implementation_plan.md` says `"How to Play"` in nav while `TopNav` uses `"Blueprint"`, and unused starter `hooks/use-mobile.ts` causes `npm run lint` to exit `1`. | Count `"Perfect Streak"` strictly across **Solo (`solo`) and Human vs. AI (`vs-ai`)** matches (with `local` rewarded separately via a collaborative `"Tabletop Duelist"` badge). Clean up `hooks/use-mobile.ts` lint error & sync spec labels. |
| **G6** | **Medium** | **Tier Hydration Race on `?autostart=1` + Deep-Linking** (`NumbercraftApp.tsx` & `FactorGridPrototype.tsx`) | On `?autostart=1`, `FactorGridPrototype` initializes `game` before `localStorage` finishes hydrating `ageTier`, potentially opening the wrong grid size. Also, clicking `"View in Notebook"` from a profile modal needs direct tab navigation. | Wait for profile hydration (or initialize synchronously in a safe client guard) before locking `?autostart=1` board tier, and wire an explicit `onOpenNotebook()` callback from `AccountModal`. |

---

## Part 3 — Elephant Draft: Badge & Achievement System Specification

Designed to fit **Tactile Notebook Studio** craft: **Archival Wax & Ink Mastery Seals**—never noisy neon pills, never breaking the 3-zone `TopNav` contract, and never cluttering gameplay.

### 3.1 Architecture & Data Flow
```
  Match Finishes (FactorGridPrototype)
         │  (excludes isSampleMatch & respects mode rules)
         ▼
  Pure Evaluator (lib/achievements.ts — unit-tested via node:test)
         │  Computes:
         │   1. Newly unlocked AchievementIds (never revokes real earned seals)
         │   2. Live progress toward locked seals (e.g., "2 / 3 consecutive wins")
         ▼
  ┌──────────────────────────────┬────────────────────────────────────┐
  ▼                              ▼                                    ▼
MasteryNotebook             AccountModal (Profile)             TopNav Zone 3 Button
• "Mastery Seals" Shelf     • "Profile Seals Strip"            • Compact single-line count
• Filter: All/Earned/Locked • Pick 1 Featured Seal Title         only inside existing button
• Progress bars + Match     • Shortcut → Mastery Notebook        (e.g. "Maya · 3 Seals")
  timestamp on each seal
```

### 3.2 Calibrated Milestone Catalog (8 Milestones)

| Badge ID | Title | Accent Ink | Exact Mathematical Trigger (Zero Ambiguity) | Progress Metric Shown When Locked |
| :--- | :--- | :--- | :--- | :--- |
| `first-victory` | **First Victory** | Emerald | Win `1` match in Solo or Human vs. AI (`!isSampleMatch`). | `0 / 1 wins` |
| `perfect-streak` | **Perfect Streak** | Cobalt | Win **`3` consecutive** Solo or Human vs. AI matches without a loss or draw (ordered chronologically; Pass-and-Play ignored so streaks aren't reset or farmed). | `Best / Current streak (e.g. 2 / 3)` |
| `top-scorer` | **Top Scorer** | Ochre | Finish any Solo or vs-AI match with score $\ge 60\%$ of the board's base sum (`>= 126` Explorers, `>= 400` Challengers, `>= 735` Strategists). | `Best % share (e.g. 54% / 60%)` |
| `prime-hunter` | **Prime Hunter** | Emerald | Claim **`4+` prime numbers** in a single `vs-ai` or `solo` match (or `3+` on Explorers `1–20` board, where only 8 primes exist and only 1 prime can be taken before `1` disappears—Wait: **Goldfish Catch!** Once any prime is claimed on turn 1, `1` goes to the opponent and NO OTHER PRIMES can ever be claimed!). | **HOLD — SEE GOLDFISH CATCH BELOW!** |

> [!WARNING]
> **Live Goldfish Catch During Spec Drafting!**  
> Look closely at `prime-hunter` above: in Factor Grid / The Taxman, **every prime number $p$ has only one proper divisor: $\{1\}$**. Once *any* prime is taken, **`1` is surrendered to the opponent**, so **it is mathematically impossible to claim more than `1` prime in a single Factor Grid match**!  
> *(Checking `notebook-analytics.ts` sample data: `sample-9` had `primesClaimed: 5`, which was synthetic sample copy—in real `FactorGridPrototype`, `p1` can claim at most **1** prime per board!)*  
> Therefore, a prime mastery badge MUST measure **cumulative primes claimed across matches** (e.g., **`10` cumulative primes claimed across real matches**, or **"Prime Opener"**: win a match after opening with the highest prime on the board)!  
> *This is exactly why the Elephant-Goldfish Model exists!*

Updated mathematically sound **8-Badge Catalog**:
1. **First Victory** (`first-victory`) — Win your first Solo or Human vs. AI match.
2. **Perfect Streak** (`perfect-streak`) — Achieve `3` consecutive wins across Solo and Human vs. AI matches (unbroken by losses/draws).
3. **Top Scorer** (`top-scorer`) — Capture `>= 60%` of a board's Classic point pool in one match (`126+` Explorers, `400+` Challengers, `735+` Strategists).
4. **Prime Collector** (`prime-collector`) — Claim `10` total prime tiles cumulatively across real matches (max 1 per board!).
5. **Scholar's Rival** (`scholar-rival`) — Defeat **AI · Scholar** or **AI · Master** in Human vs. AI.
6. **Master Strategist** (`master-strategist`) — Defeat **AI · Master** on a Challengers (`1–36`) or Strategists (`1–49`) board.
7. **Outsmart the Taxman** (`taxman-victor`) — Win a Solo match against The Taxman in *Prime Trap* or *Classic* mode.
8. **Three-Tier Explorer** (`tier-explorer`) — Record at least `1` completed real match in each of the 3 adaptive tiers (*Explorers*, *Challengers*, *Strategists*).

### 3.3 Visual Design & Anti-Slop Compliance
- **Zero-Pill Discipline**: Achievement cards use clean square/octagonal **Ink & Brass Seal Medallions** (SVG icon inside an archival stamped frame) on crisp cardstock—never neon pill capsules or `border-l-4` stripes.
- **Profile Section (`AccountModal` & `TopNav`)**:
  - **`AccountModal`**: Adds a **"Mastery Seals"** strip right under the session header showing `X of 8 Earned`, miniature medallion icons for unlocked milestones (muted paper outlines for locked ones with hover/focus titles), a **Featured Profile Seal** selector (stored in `StudentProfile.featuredBadgeId`), and an **Inspect in Notebook** action.
  - **`TopNav` Zone 3**: Keeps the single button contract (`Maya Chen · 3 Seals` or `Guest Explorer · Sign In`), preserving single-line `whitespace-nowrap` discipline.
- **Game Over Celebration Hook**: When a finished match unlocks 1 or more new seals, the Factor Grid Game Over modal quietly displays `"New Mastery Seal Unlocked: Perfect Streak"` with a direct **"View in Notebook"** action.

---

## Part 4 — Human Decision Gates Before Implementation

Please confirm or adjust these 3 decisions before I write code:

1. **Resolution on Sample Data vs. Real Badges (`G3`)**: Keep real earned badges strictly tied to played matches (`!isSampleMatch`), and show a subtle `"Sample data preview — real matches unlock permanent seals"` notice when Sample Progress is loaded. *(Recommended: Yes)*
2. **Resolution on Local Pass-and-Play (`G5`)**: Exclude `local` Pass-and-Play matches from `Perfect Streak` and `Top Scorer` so two-handed local play cannot artificially inflate streaks, OR allow it? *(Recommended: Exclude from streaks, optionally add a friendly `"Tabletop Partner"` badge later)*
3. **Implementation Scope for Next Turn**:
   - **Option A (Focused)**: Fix Goldfish findings **G1–G6** + build the complete **Badge & Achievement System** (`lib/achievements.ts`, unit tests, `MasteryNotebook` seals shelf, `AccountModal` & `TopNav` profile indicators, Game Over unlock banner).
   - **Option B (Full Studio)**: Option A **plus** Firebase Auth/Firestore provisioning + **Equation Foundry** & **Odds & Urns**.
