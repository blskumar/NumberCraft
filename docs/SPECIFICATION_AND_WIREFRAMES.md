# Numbercraft — Full Product Specification, Wireframes & Test Matrix

**Version:** 1.0 (Prototype & Full-Build Reference)  
**Target Audience:** Students aged 8–16 (*Explorers 8–10*, *Challengers 11–13*, *Strategists 14–16*)  
**Play Modes:** Single Player (Solo), Human vs. AI (Deterministic Math AI), Local Pass-and-Play, Online Room Codes (Firestore Real-Time Sync)  
**Visual System:** Tactile Notebook Studio — Warm Drafting Paper (`#FAF8F4`), Archival White (`#FFFFFF`), Graphite Ink (`#1C232B`), Blueprint Cobalt (`#1D4ED8`), Chalk Emerald (`#047857`), Ochre Gold (`#B45309`), Red-Pen Crimson (`#BE123C`). Fonts: `Fraunces` (display), `Plus Jakarta Sans` (UI), `IBM Plex Mono` (`tabular-nums` for math & scores).

---

## Table of Contents
1. [System State Machines & Global Rules](#1-system-state-machines--global-rules)
2. [Page-by-Page Wireframes (Desktop & Mobile)](#2-page-by-page-wireframes-desktop--mobile)
   - [2.1 Studio Hub (Games Landing)](#21-studio-hub-games-landing)
   - [2.2 Mode Launcher (Pre-Game Setup)](#22-mode-launcher-pre-game-setup)
   - [2.3 Set 01 — Equation Foundry (Basic Arithmetic)](#23-set-01--equation-foundry-basic-arithmetic)
   - [2.4 Set 02 — Odds & Urns (Modular Probability)](#24-set-02--odds--urns-modular-probability)
   - [2.5 Set 03 — Factor Grid (Strategy Number Theory — Active Prototype)](#25-set-03--factor-grid-strategy-number-theory--active-prototype)
   - [2.6 Online Room Codes (Lobby, Active Sync & Failure States)](#26-online-room-codes-lobby-active-sync--failure-states)
   - [2.7 Mastery Notebook (Empty & Populated States)](#27-mastery-notebook-empty--populated-states)
   - [2.8 Account, Sign-In, Guest Merge & Sign-Out Modal](#28-account-sign-in-guest-merge--sign-out-modal)
3. [Exhaustive Situational & Corner-Case Matrix](#3-exhaustive-situational--corner-case-matrix)
4. [Unit-Test Specification Matrix](#4-unit-test-specification-matrix)
5. [End-to-End (E2E) Test Specification Matrix](#5-end-to-end-e2e-test-specification-matrix)
6. [Firestore Security & Data Integrity Specification](#6-firestore-security--data-integrity-specification)

---

## 1. System State Machines & Global Rules

### 1.1 Adaptive Age Tier Matrix
| Tier ID | Label | Age Range | Equation Foundry (Set 01) | Odds & Urns (Set 02) | Factor Grid (Set 03) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `explorers` | Explorers | 8–10 | `+`, `−`, `×`; 5 tiles; targets `12–48` | Single Urn (8 marbles) & 1d6; visual counts | Grid `1–20` (`5×4`); divisor hover always on |
| `challengers` | Challengers | 11–13 | `+`, `−`, `×`, `÷`, `( )`; 6 tiles; targets `30–140` | Sampling w/o replacement & 2d6 sums | Grid `1–36` (`6×6`); primes + abundant traps |
| `strategists` | Strategists | 14–16 | All ops, brackets, powers (`x²`); 6 tiles; targets `60–320` | Conditional spinners & Expected Value `E[X]` | Grid `1–49` (`7×7`); deep Alpha-Beta Minimax |

### 1.2 Global Game Lifecycle State Machine
```
  ┌─────────────┐   Start / ?autostart=1   ┌─────────────┐
  │    SETUP    │ ───────────────────────► │   PLAYING   │
  │ (Mode/Tier) │                          │ (Turn Loop) │
  └──────▲──────┘                          └──┬───┬───┬──┘
         │ Change Mode                        │   │   │
         │                Local Secret Turn ──┘   │   └── AI Turn (620ms lock)
         │                                        ▼
         │                                 ┌─────────────┐
         │                                 │  HANDOFF /  │
         │                                 │ ROUND_RECAP │
         │                                 └──────┬──────┘
         │                                        │ Next Round / Final Move
         │                                        ▼
         │         Play Again (Clean Reset)┌─────────────┐
         └─────────────────────────────────┤  GAME_OVER  │
                                           │(Frozen Snap)│
                                           └─────────────┘
```
*Invariant:* Every screen mirrors game phase to `document.body.dataset.state` (`'title' | 'playing' | 'gameover'`) and prevents orphaned timers on route change, restart, or unmount.

---

## 2. Page-by-Page Wireframes (Desktop & Mobile)

### 2.1 Studio Hub (Games Landing)

**Desktop (`1440×900`)**
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Numbercraft            Games   Online Rooms   Notebook   Blueprint   [👤 Guest]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐ ┌────────────────────────────────┐  │
│  │ Interactive UI Prototype · Ages 8–16    │ │                                │  │
│  │                                         │ │   [Editorial Flat-Lay Desk     │  │
│  │ Mathematics and probability learned     │ │    Illustration: Ceramic Tiles │  │
│  │ through strategic play.                 │ │    Marbles, Maple Dice, Brass  │  │
│  │                                         │ │    Compass on Graph Paper]     │  │
│  │ [Play Factor Grid Prototype →]          │ │                                │  │
│  │ [👥 Preview Online Rooms]               │ │                                │  │
│  └─────────────────────────────────────────┘ └────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Adaptive Age Tier                            [Explorers 8-10|Challengers|Strat]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Three Core Game Sets                                  Active Tier · N matches    │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────────────────┐ │
│ │ [Ceramic Grid Art]   │ │ Target Number: 78    │ │ Urn Chamber · 7/10 (70%)   │ │
│ │ ──────────────────── │ │ [(][9][+][4][)][×][6]│ │ ● ● ● ● ●   ● ● ● ● ●      │ │
│ │ Set 03 · Prototype   │ │ ──────────────────── │ │ ────────────────────────── │ │
│ │ Factor Grid          │ │ Set 01 · Arithmetic  │ │ Set 02 · Probability       │ │
│ │ Board: 1–36 (6×6)    │ │ Equation Foundry     │ │ Odds & Urns                │ │
│ │ [Open Factor Grid]   │ │ [Inspect Blueprint]  │ │ [Inspect Blueprint]        │ │
│ └──────────────────────┘ └──────────────────────┘ └────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Numbercraft · Mathematics & Probability Game Studio          Prototype Build     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Mobile (`390×844`)**
```
┌──────────────────────────────────┐
│ Numbercraft     [👤 Guest · In]  │
├──────────────────────────────────┤
│ Games  Rooms  Notebook Blueprint │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Mathematics and probability  │ │
│ │ learned through play.        │ │
│ │ [Play Factor Grid →]         │ │
│ │ [Preview Online Rooms]       │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ [Desk Flat-Lay Illustration] │ │
│ └──────────────────────────────┘ │
│ Adaptive Age Tier                │
│ [Explorers] [Challengers]        │
│ [Strategists]                    │
│ ┌──────────────────────────────┐ │
│ │ Set 03 · Factor Grid Card    │ │
│ └──────────────────────────────┘ │
│ ... (Set 01, Set 02 stacked)     │
└──────────────────────────────────┘
```

---

### 2.2 Mode Launcher (Pre-Game Setup)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Games                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ Set 03 · Strategy Number Theory                                Grid 1–36     │ │
│ │ Factor Grid                                              Challengers (11–13) │ │
│ │ Choose a number with ≥1 open proper divisor; opponent gets its divisors.     │ │
│ ├──────────────────────────────────────────────┬───────────────────────────────┤ │
│ │ 1. Select Play Mode                          │ How a Turn Works              │ │
│ │ [🤖 Human vs. AI] [👤 Solo] [👥 Pass & Play] │ 1. Pick an open tile          │ │
│ │                                              │ 2. Preview ochre divisors     │ │
│ │ 2. AI Strength (if vs. AI)                   │ 3. Spot primes & traps        │ │
│ │ [Apprentice] [Scholar] [Master (Minimax)]    │                               │ │
│ │ (OR Player 1 / Player 2 inputs if Local)     │ Want two separate devices?    │ │
│ │                                              │ Preview Online Room Codes     │ │
│ │ Adaptive Tier        Rule Variant            │                               │ │
│ │ [Explorers   1–20]   [Classic Capture]       │ ┌───────────────────────────┐ │ │
│ │ [Challengers 1–36]   [Prime Trap (+3)]       │ │     Start Factor Grid     │ │ │
│ │ [Strategists 1–49]                           │ └───────────────────────────┘ │ │
│ └──────────────────────────────────────────────┴───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Set 01 — Equation Foundry (Basic Arithmetic)

**Active Workbench State**
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Mode Setup / Equation Foundry · Round 2 of 5 · Challengers   [💡 Hint] [🔊]    │
├────────────────────────────────────────────────────┬─────────────────────────────┤
│ ┌────────────────────────────────────────────────┐ │ Live Scoreboard             │
│ │ TARGET NUMBER:   78    │ Current Value: 78 ✓   │ │ ┌───────────┐ ┌───────────┐ │
│ │ Expression:  ( 9 + 4 ) × 6                     │ │ │ You   180 │ │ AI    145 │ │
│ └────────────────────────────────────────────────┘ │ └───────────┘ └───────────┘ │
│                                                    │                             │
│  Available Number Tiles (click once each):         │ Step-by-Step Evaluator      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │ 1. (9 + 4) = 13             │
│  │  3 │ │ [4]│ │ [6]│ │  8 │ │ [9]│ │ 25 │         │ 2. 13 × 6  = 78             │
│  └────┘ └used┘ └used┘ └────┘ └used┘ └────┘         │ Distance from target: 0     │
│                                                    │                             │
│  Operator Palette:                                 │ Round History               │
│  [ + ] [ − ] [ × ] [ ÷ ] [ ( ] [ ) ] [⌫ Undo] [Clear]│ #1 Target 42 · Exact (+100) │
│                                                    │ #2 Target 78 · Building...  │
│  [Lock In Expression →]                            │                             │
└────────────────────────────────────────────────────┴─────────────────────────────┘
```

**Scenario Wireframe — Local Pass-and-Play Privacy Handoff & Side-by-Side Reveal**
```
  [Handoff Overlay — prevents Player 2 seeing Player 1's formula]
  ┌──────────────────────────────────────────────┐
  │ Player 1 locked in an expression for Target  │
  │ 78. Pass the device to Player 2.             │
  │             [Ready — Show Rack]              │
  └──────────────────────────────────────────────┘

  [Side-by-Side Round Reveal]
  ┌──────────────────────────────────────────────────────────┐
  │ Round 2 Reveal · Target 78                               │
  │ Player 1: (9 + 4) × 6 = 78   (Exact · +100 pts)          │
  │ Player 2: 25 × 3 + 4  = 79   (Off by 1 · +90 pts)        │
  │ Optimal Reference: (9 + 4) × 6 = 78                      │
  │                      [Next Round →]                      │
  └──────────────────────────────────────────────────────────┘
```

---

### 2.4 Set 02 — Odds & Urns (Modular Probability)

**Active Probability Chamber State (Marble Urn / Twin Dice / Conditional Spinner)**
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Mode Setup / Odds & Urns · Chamber 3 of 6 · Module: [Urn|Dice|Spinner] [🔊]    │
├────────────────────────────────────────────────────┬─────────────────────────────┤
│ ┌────────────────────────────────────────────────┐ │ Scoreboard & Banked Vault   │
│ │ Sampling WITHOUT Replacement · 8 Marbles Left  │ │ You: 42 banked (+14 at risk)│
│ │   🔵 🔵 🟢 🔵 🔴 🟢 🔵 🔴                      │ │ EV Bot: 38 banked           │
│ │ Safe: 6 (75% · 3/4)  │  Hazard: 2 (25% · 1/4)  │ ├─────────────────────────────┤
│ └────────────────────────────────────────────────┘ │ Expected Value Inspector    │
│                                                    │ Safe Reward: +10 pts        │
│ Step 1 — Estimate Safe Draw Odds (optional bonus): │ Hazard Loss: −14 at-risk    │
│  [ 0% ═══════════════●═════ 100% ]   Est: 75% (3/4)│ E[Draw] = (3/4)(+10)        │
│                                                    │         + (1/4)(−14) = +4.0  │
│ Step 2 — Choose Action:                            │ Optimal Move: PRESS (+EV)   │
│  [🎲 Draw Next Marble (+10 if safe)]               ├─────────────────────────────┤
│  [🏦 Bank +14 Safe Points]                         │ Chamber Draw Log            │
│                                                    │ Draw 1: 🟢 Safe (+6)        │
│  (If Bust occurs: Red-Pen alert banner with exact  │ Draw 2: 🔵 Safe (+8)        │
│   conditional probability breakdown + next turn)   │ Bot Note: Banked at E=-1.2  │
└────────────────────────────────────────────────────┴─────────────────────────────┘
```

---

### 2.5 Set 03 — Factor Grid (Strategy Number Theory — Active Prototype)

**Desktop Active Gameplay (`1440×900`)**
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Mode Setup / Factor Grid  1–20 · Explorers · Classic    [💡 Hint] [🔊] [↺]     │
├────────────────────────────────────────────────────┬─────────────────────────────┤
│ ┌────────────────────────────────────────────────┐ │ Live Scoreboard             │
│ │ Claim 19 (+19) · AI gets {1} (+1) · Net +18    │ │ ┌───────────┐ ┌───────────┐ │
│ └────────────────────────────────────────────────┘ │ │ You    19 │ │ AI      1 │ │
│                                                    │ │ Primes: 1 │ │ Primes: 0 │ │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │ └───────────┘ └───────────┘ │
│  │  1   │ │  2 p │ │  3 p │ │  4   │ │  5 p │      │ Latest Play Note            │
│  │divisr│ │      │ │      │ │      │ │      │      │ Claimed 19 (prime) -> AI    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │ captured {1}.               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      ├─────────────────────────────┤
│  │  6   │ │  7 p │ │  8   │ │  9   │ │ 10   │      │ Number Inspector  n=19 Prime│
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │ Only proper divisor is 1.   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │ Proper divisors: {1} sum=1  │
│  │ 11 p │ │ 12   │ │ 13 p │ │ 14   │ │ 15   │      ├─────────────────────────────┤
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │ Move Ledger         1 turn  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │ #1 You took 19   +19 / -1   │
│  │ 16   │ │ 17 p │ │ 18   │ │[19 p]│ │ 20   │      │                             │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │                             │
│  Tiles marked p are prime. Dashed = locked.        │                             │
└────────────────────────────────────────────────────┴─────────────────────────────┘
```

**Game Over Modal (Victory / Draw / Defeat + Taxman Sweep)**
```
  ┌──────────────────────────────────────────────┐
  │ 🏆 Victory · Match Recorded in Notebook      │
  │ You conquered the grid!                      │
  │ No legal factors remain — Taxman swept 3.    │
  │ ──────────────────────────────────────────── │
  │     You          AI · Scholar    Best Swing  │
  │     118               92            +18      │
  │ ──────────────────────────────────────────── │
  │      [ Play Again ]     [ Change Mode ]      │
  └──────────────────────────────────────────────┘
```

**Mobile Active Gameplay (`390×844`)**
```
┌──────────────────────────────────┐
│ ← Setup / Factor Grid  [💡][🔊][↺]│
├──────────────────────────────────┤
│ You: 27        vs     AI: 16     │  ◄── Compact Mobile Score Strip
├──────────────────────────────────┤
│ Your turn — 9 legal moves        │
│ [1] [2p] [3p] [4] [5p]           │  ◄── 5×4 Grid (≥44px touch targets)
│ [6] [7p] [8]  [9] [10]           │
│ [11][12] [13] [14][15]           │
│ [16][17] [18] [19][20]           │
├──────────────────────────────────┤
│ Live Scoreboard + Inspector +    │  ◄── Stacked cleanly below board
│ Move Ledger                      │
└──────────────────────────────────┘
```

---

### 2.6 Online Room Codes (Lobby, Active Sync & Failure States)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Online Room Codes · Child-Safe Private 6-Character Codes                         │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│ Host a Private Room                    │ Join a Friend's Room                    │
│ ┌────────────────────────────────────┐ │ 6-Character Room Code                   │
│ │ Generated Room Code                │ │ [ K7M-4QP            ] [Join Room]      │
│ │   K 7 M - 4 Q P       [📋 Copy]    │ │                                         │
│ │ ────────────────────────────────── │ │ Validation / Error States:              │
│ │ Seat 1 (Host):  Aarav K. · Ready   │ │ • Invalid format -> Crimson inline msg  │
│ │ Seat 2 (Guest): Waiting...         │ │ • Not found -> "No active room found" │
│ └────────────────────────────────────┘ │ • Room full -> "Room already has 2..."  │
│ [Generate Room Code] [Local Play Now]  │ • Disconnected -> Auto-reconnect banner │
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

### 2.7 Mastery Notebook (Empty & Populated States)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Mastery Notebook · Aarav K.                                 [Play Factor Grid →] │
├─────────────────┬─────────────────┬──────────────────────┬───────────────────────┤
│ Matches: 4      │ Win Rate: 75%   │ Best Score: 124      │ Primes Claimed: 9     │
├─────────────────┴─────────────────┴──────────────────────┴───────────────────────┤
│ Match Ledger                                                          4 recorded │
│ Game & Mode                     Tier          Score     Primes    Result         │
│ Factor Grid · vs. AI Scholar    Explorers     118 – 92     3      Won            │
│ Factor Grid · vs. The Taxman    Challengers   342 – 324    5      Won            │
│ ... (Empty state displays BookOpen icon + "Start Your First Match" CTA)          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.8 Account, Sign-In, Guest Merge & Sign-Out Modal

```
  ┌──────────────────────────────────────────────────────┐
  │ Student Session · Guest Mode (Local Storage)     [×] │
  │ Profile & Sign-In Flow                               │
  │ ──────────────────────────────────────────────────── │
  │ Display Name: [ Guest Explorer          ] [Save Name]│
  │ Default Tier: [ Challengers (11–13) ▾ ]  [🔊 Sound]  │
  │ ┌──────────────────────────────────────────────────┐ │
  │ │ Google Sign-In & Sign-Out Flow                   │ │
  │ │ Guests play instantly. Optional Google Sign-In   │ │
  │ │ merges local stats into Firestore & unlocks      │ │
  │ │ verified Online Room hosting.                    │ │
  │ │ [🔑 Sign In with Google]              [Done]     │ │
  │ │ (When signed in: [🚪 Sign Out to Guest Mode])    │ │
  │ └──────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────┘
```

---

## 3. Exhaustive Situational & Corner-Case Matrix

| Domain | Scenario / Edge Condition | Expected Deterministic Behavior |
| :--- | :--- | :--- |
| **Factor Grid** | User clicks or hovers tile `1` | Tile `1` has zero proper divisors (`[]`), so it is NEVER a legal claim; clicking is blocked and Inspector explains `"1 is the unit divisor — it unlocks every prime"`. |
| **Factor Grid** | Opening prime claimed (`19` on 1–20) | Player 1 gains `19` (+3 in Prime Trap), Player 2 captures `1`. Immediately, ALL other primes (`2, 3, 5, 7, 11, 13, 17`) become locked (dashed, disabled) because their only proper divisor (`1`) is already gone. |
| **Factor Grid** | Claiming a square of a prime (e.g., `9 = 3²`, `25 = 5²`, `49 = 7²`) after `1` and `3`/`5`/`7` are claimed | Has zero unclaimed proper divisors → automatically locks and cannot be clicked. |
| **Factor Grid** | Rapid double-click on a tile or clicking during AI 620ms thinking window | Input guard (`aiThinking === true` or `tiles[n] !== 'unclaimed'`) drops duplicate clicks cleanly; turn never skips or double-scores. |
| **Factor Grid** | Solo Taxman endgame with multiple unplayable leftovers (e.g., primes + `1` already gone) | All remaining unclaimed tiles are swept to The Taxman (`p2`), `sweptTiles` lists them, and `scores.p1 + scores.p2 === N*(N+1)/2` holds exactly (Classic mode). |
| **Factor Grid** | Exact tie score at end of 2-player match | `winner === 'draw'`, Game Over modal displays `"Exact Draw"` in Ochre Gold (not Victory or Defeat), and Notebook logs `result: 'draw'`. |
| **Equation Foundry** | Division producing non-integer (e.g., `7 ÷ 3`) or division by zero (`5 ÷ (4 − 4)`) | Evaluator flags expression invalid inline (`"Division must be exact / cannot divide by 0"`) and disables Lock-In until fixed; never throws `NaN` or `Infinity`. |
| **Equation Foundry** | Reusing a single tile twice or unbalanced parentheses `((4 + 5)` | Used tile becomes disabled until undone; unbalanced parentheses show inline red-pen syntax indicator; Lock-In stays disabled. |
| **Equation Foundry** | Both players tie distance from Target (e.g., both off by 2) | Tie-breaker awards full round credit to both (encouraging collaboration/learning) or highlights fewest operations used. |
| **Odds & Urns** | Sampling without replacement until 0 safe marbles remain (`P(safe) = 0`) | Draw button shows `0% Safe — Guaranteed Hazard` warning; pressing triggers deterministic Bust and hands turn cleanly without `0/0` division error. |
| **Odds & Urns** | Player banks with `0` at-risk points on turn start | Bank button disabled when `atRiskPoints === 0` with clear label `"Draw at least once to build points"`. |
| **Odds & Urns** | Exact probability estimate matches true fraction (e.g., `3/4 = 75%`) | Awards Calibration Bonus (`+3 pts`) independent of luck outcome—reinforcing that sound math matters even when a rare hazard hits! |
| **Online Rooms** | Guest enters lowercase code with/without hyphen (`k7m4qp` or `k7m-4qp`) | Input normalizer strips non-alphanumerics, uppercases, and validates exact 6-char length before Firestore lookup. |
| **Online Rooms** | Third user tries joining a room where `guestUid` is already populated | Firestore Security Rule & client guard reject join with friendly message `"This room is already full (2/2 players)."` |
| **Online Rooms** | Player refreshes browser mid-online match | Room subscription re-attaches via room code, restores authoritative Firestore board state idempotently without duplicating moves. |
| **Auth & Storage** | User cancels Google Sign-In popup (`auth/popup-closed-by-user`) | Suppresses crash, keeps Guest session intact, shows calm inline note `"Sign-in cancelled — continuing in Guest Mode."` |
| **Auth & Storage** | Guest plays 3 matches, then signs in with Google for first time | One-time idempotent merge copies local matches (deduplicated by `match.id`) to `/users/{uid}/matches` and adopts max best scores. |
| **Auth & Storage** | Signed-in user clicks Sign Out while viewing a room or notebook | Unsubscribes all active `onSnapshot` listeners *before* calling `signOut()`, clears cloud state, resets to Guest Mode with confirmation toast. |
| **Accessibility & Layout** | `localStorage` unavailable (private browsing) or corrupted JSON | `loadProfile` / `loadMatches` catch parse/quota exceptions and fall back cleanly to `DEFAULT_PROFILE` / `[]`. |

---

## 4. Unit-Test Specification Matrix

Run pure logic suites via `npx --yes tsx --test <file>` using `node:test` and `node:assert/strict`.

### 4.1 Factor Grid Engine (`lib/factor-grid-engine.test.ts` — Implemented & Passing)
| Test ID | Target Function | Input / Setup | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `UT-FG-01` | `getProperDivisors` | `1`, `12`, `29`, `36` | `[]`, `[1,2,3,4,6]`, `[1]`, `[1,2,3,4,6,9,12,18]` |
| `UT-FG-02` | `isPrime` | `1, 2, 19, 21, 49` | `false, true, true, false, false` |
| `UT-FG-03` | `classifyNumber` | `1, 17, 6, 28, 12, 15` | `unit, prime, perfect, perfect, abundant, deficient` |
| `UT-FG-04` | `isLegalMove` & `applyMove` | Open `1–20` board, claim `19` | `p1=19, p2=1`, `tiles[1]='p2'`, `isLegalMove(17)===false`, `isLegalMove(18)===true` |
| `UT-FG-05` | `previewMove` & `applyMove` (`prime-trap`) | Claim `19` in `prime-trap` | `primeBonus===3`, `claimPoints===22`, `netSwing===21`, `primesClaimed.p1===1` |
| `UT-FG-06` | `applyMove` (`solo` Taxman sweep) | Full playout to `gameover` on `1–20` | `currentTurn==='p1'` every turn; zero unclaimed tiles at end; `p1 + p2 === 210` |
| `UT-FG-07` | `chooseAiMove` & `getBestHintMove` | Master opening + full Scholar vs Master playout | Hint picks `19`; every AI move is legal; terminates cleanly with valid `winner` |
| `UT-FG-08` | `applyMove` (immutability & illegal guard) | Attempt clicking `1` or already-claimed tile | Returns identical state reference unchanged; scores untouched |
| `UT-FG-09` | `TIER_SPECS` scaling | `explorers`, `challengers`, `strategists` | `boardMax` equals `20`, `36`, `49` and `columns` equals `5`, `6`, `7` |

### 4.2 Equation Foundry Engine (`lib/equation-foundry-engine.test.ts` — Full Build)
| Test ID | Target Function | Input / Setup | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `UT-EF-01` | `evaluateExpression` | `(9 + 4) * 6` | `{ valid: true, value: 78, steps: [...] }` |
| `UT-EF-02` | `evaluateExpression` (PEMDAS) | `3 + 4 * 5` | `value === 23` (never `35`) |
| `UT-EF-03` | `evaluateExpression` (Div by zero / non-int) | `8 / (4 - 4)` and `7 / 2` | `{ valid: false, reason: 'DIV_ZERO' | 'NON_INTEGER' }` |
| `UT-EF-04` | `validateTileUsage` | Tile `[4]` used twice when rack has one `4` | `{ valid: false, reason: 'TILE_REUSED' }` |
| `UT-EF-05` | `scoreSubmission` | Exact match vs off-by-1 vs off-by-10 | `100`, `90`, `40` (monotonic decay, floored at `0`) |
| `UT-EF-06` | `solveTargetAI` | Rack `[3,4,6,8,9,25]`, Target `78` | Returns legal expression using subset of rack hitting exact `78` |

### 4.3 Odds & Urns Engine (`lib/odds-urns-engine.test.ts` — Full Build)
| Test ID | Target Function | Input / Setup | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `UT-OU-01` | `calculateSafeProbability` | Urn: 6 safe, 2 hazard | `{ numerator: 3, denominator: 4, percent: 75 }` (reduced GCD) |
| `UT-OU-02` | `drawWithoutReplacement` | Draw safe marble from 6S/2H | Remaining count becomes 5S/2H; next safe prob `5/7` |
| `UT-OU-03` | `calculateExpectedValue` | `P(safe)=3/4`, reward `+10`, atRisk `14` | `E[X] = 0.75 * 10 - 0.25 * 14 = +4.0` |
| `UT-OU-04` | `chooseEvBotAction` | `E[X] = +4.0` vs `E[X] = -2.5` (Optimal-EV) | Returns `'press'` when `E[X] > 0`, `'bank'` when `E[X] <= 0` and `atRisk > 0` |
| `UT-OU-05` | `twinDiceDistribution` | Target sum `>= 7` on 2d6 | Exact probability `21/36 = 7/12` |
| `UT-OU-06` | `emptyChamberGuard` | 0 safe marbles remaining | `P(safe) === 0`, no division-by-zero exception |

### 4.4 Profile, Merge & Room Utilities (`lib/session-utils.test.ts` — Full Build)
| Test ID | Target Function | Input / Setup | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `UT-SS-01` | `normalizeRoomCode` | `'k7m 4qp'`, `'K7M-4QP'`, `'123'` | `'K7M-4QP'`, `'K7M-4QP'`, `null` (invalid) |
| `UT-SS-02` | `mergeGuestAndCloudMatches` | 2 overlapping IDs + 1 unique local | Merged list deduplicates by `id`, sorted newest first, max 30 |
| `UT-SS-03` | `sanitizeDisplayName` | `'   '`, 60-char string | Falls back to `'Guest Explorer'`, truncates cleanly to `<= 28` chars |

---

## 5. End-to-End (E2E) Test Specification Matrix

Executable via Playwright (`playwright-cli` / automated browser flows) at Desktop (`1440×900`) and Mobile (`390×844`).

| Test ID | User Journey | Steps | Acceptance Criteria (Visibly True) |
| :--- | :--- | :--- | :--- |
| `E2E-01` | Studio Hub First Paint & Tier Scaling | Open `/` → click `Explorers · Ages 8–10` → click `Strategists · Ages 14–16` | Zero console errors; Factor Grid card updates `1–36` → `1–20` → `1–49`; Equation Foundry & Odds & Urns previews adapt dynamically; tier bar stays 1 row on desktop. |
| `E2E-02` | Factor Grid Hover Preview & Math Inspector | Open Factor Grid → Start (`1–20`, vs. AI Scholar) → hover `19` → hover `12` | Hovering `19` highlights tile `1` in ochre (`divisor`), preview shows `Claim 19 (+19) · Net +18`, Inspector says `n = 19 · Prime`. Hovering `12` highlights `{1,2,3,4,6}` and says `Abundant`. |
| `E2E-03` | Human vs. AI Turn Cycle & Hint | Click `19` → wait 900ms → click `Hint` | P1 score updates to `19`; AI takes legal move after delay; AI rationale updates in Latest Play Note; primes without `1` become disabled/dashed; Hint highlights optimal legal tile in emerald. |
| `E2E-04` | Rapid Click Guard During AI Turn | Click `19` → immediately click `18` within 100ms | Second click is ignored while AI thinks; Move Ledger records exactly 1 P1 turn followed by 1 AI turn. |
| `E2E-05` | Full Solo Taxman Playout → Game Over → Notebook | Select `Solo · Taxman` (`1–20`) → click legal moves until `gameover` → inspect modal → open `Notebook` | Game Over modal displays final scores + Best Swing; `scores.p1 + scores.p2 === 210`; clicking `Notebook` shows `Matches Completed: 1` with matching score row. |
| `E2E-06` | Play Again & Restart Clean Reset | From Game Over modal, click `Play Again` | Modal closes, scores reset to `0 – 0`, Move Ledger clears to `0 turns`, all legal tiles become playable, no duplicate match recorded. |
| `E2E-07` | Local Pass-and-Play Custom Names | Select `Pass-and-Play` → enter `"Maya"` & `"Leo"` → Start → alternate 2 moves | Turn banner switches `Maya's turn` → `Leo's turn`; Move Ledger attributes turns to `Maya` and `Leo`. |
| `E2E-08` | Prime Trap Variant Bonus | Toggle `Prime Trap (+3)` → Start → claim `19` | P1 score increments by `22` (`19 + 3`), not `19`; Move Ledger shows `+22 / −1`. |
| `E2E-09` | Direct Autostart URL | Navigate to `/?autostart=1` | Skips Studio Hub & Setup; renders active Factor Grid board with `document.body.dataset.state === "playing"`. |
| `E2E-10` | Online Room Create & Copy | Open `Online Rooms` → click `Generate Room Code` → click `Copy Code` | Displays 6-char `XXX-XXX` code, Host Seat 1 shows active user name, Copy button confirms `Copied`. |
| `E2E-11` | Online Room Code Validation | Enter `AB1` → click `Join Room`; then enter `k7m4qp` → click `Join Room` | Short code shows Crimson validation error; valid 6-char code normalizes to `K7M-4QP` and confirms cleanly. |
| `E2E-12` | Guest Profile Persistence Across Reload | Click top-bar Account → enter `"Aarav K."` → Save → reload page | Top-bar displays `Aarav K. · Sign In` after full browser reload. |
| `E2E-13` | Sign-In / Sign-Out Lifecycle | Open Account modal → trigger Sign-In → verify header → trigger Sign Out | Header switches to signed-in name; Sign Out restores `Guest Explorer · Sign In` cleanly without errors. |
| `E2E-14` | Mobile Responsive & Touch Targets (`390×844`) | Resize to `390×844` on Studio Hub & active Factor Grid | `scrollWidth <= innerWidth` (zero horizontal overflow); compact mobile score strip visible above grid; all tiles ≥ 44px tall. |
| `E2E-15` | Keyboard Accessibility & Focus | Tab through TopNav, Tier buttons, and Grid tiles; press `Enter` on Setup screen | Visible cobalt `focus-visible` ring on every control; `Enter` launches Factor Grid from Setup; modals use `role="dialog"` + `aria-modal="true"`. |
| `E2E-16` | Full-Build Two-Device Room Sync *(Post-Firebase)* | Context A creates room → Context B joins code → A moves → B sees update & replies | Both browsers converge on identical `tiles`, `scores`, `turnUid` within `<1s` via Firestore `onSnapshot`; third browser attempting join receives Room Full rejection. |

---

## 6. Firestore Security & Data Integrity Specification

*(Applies when activating Firebase Auth + Firestore in the full build)*

1. **`/users/{uid}`**:
   - `read, write`: `request.auth != null && request.auth.uid == uid`
   - Validation: `displayName` string `1..28` chars; `ageTier in ['explorers', 'challengers', 'strategists']`; `soundEnabled` bool; no public `list` queries allowed.
2. **`/users/{uid}/matches/{matchId}`**:
   - `read, create`: owner-only (`request.auth.uid == uid`); immutable (`update, delete: if false`).
   - Validation: bounded `playerScore`, `opponentScore` integers `>= 0`; valid `result in ['win', 'loss', 'draw']`.
3. **`/rooms/{roomCode}`**:
   - `roomCode` matches `^[A-Z0-9]{3}-[A-Z0-9]{3}$`.
   - `create`: authenticated user; `request.resource.data.hostUid == request.auth.uid`; `status == 'waiting'`; `guestUid == null`.
   - `get`: authenticated user AND (`status == 'waiting'` OR `request.auth.uid in [resource.data.hostUid, resource.data.guestUid]`). `list: if false` (prevents room scraping!).
   - `update` (Join slot): authenticated non-host claiming `guestUid == request.auth.uid` when `resource.data.status == 'waiting' && resource.data.guestUid == null`, leaving `hostUid` immutable.
   - `update` (Active turn): participant-only (`request.auth.uid in [resource.data.hostUid, resource.data.guestUid]`) with immutable `hostUid` and `guestUid`, bounded payload size, and zero PII/email fields allowed.
