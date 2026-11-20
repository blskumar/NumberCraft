# Numbercraft — Full Product Specification, Wireframes & Test Matrix

**Version:** 1.0 (Prototype & Full-Build Reference)  
**Target Audience:** Students aged 8–16 (*Explorers 8–10*, *Challengers 11–13*, *Strategists 14–16*)  
**Play Modes:** Single Player (Solo), Human vs. AI (Deterministic Math AI), Local Pass-and-Play, Online Room Codes (Firestore Real-Time Sync)  
**Visual System:** Tactile Notebook Studio — Warm Drafting Paper (`#FAF8F4`), Archival White (`#FFFFFF`), Graphite Ink (`#1C232B`), Blueprint Cobalt (`#1D4ED8`), Chalk Emerald (`#047857`), Ochre Gold (`#B45309`), Red-Pen Crimson (`#BE123C`). Fonts: `Fraunces` (display), `Plus Jakarta Sans` (UI), `IBM Plex Mono` (`tabular-nums` for math & scores).

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

---

## 2. Page-by-Page Wireframes (Desktop & Mobile)

### 2.1 Studio Hub (Games Landing — Desktop `1440×900` & Mobile `390×844`)
```
DESKTOP (1440×900)
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Numbercraft            Games   Online Rooms   Notebook   Blueprint   [👤 Guest]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐ ┌────────────────────────────────┐  │
│  │ Interactive UI Prototype · Ages 8–16    │ │   [Editorial Flat-Lay Desk     │  │
│  │ Mathematics and probability learned     │ │    Illustration: Ceramic Tiles │  │
│  │ through strategic play.                 │ │    Marbles, Maple Dice, Brass  │  │
│  │ [Play Factor Grid Prototype →]          │ │    Compass on Graph Paper]     │  │
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
└──────────────────────────────────────────────────────────────────────────────────┘

MOBILE (390×844)
┌──────────────────────────────────┐
│ Numbercraft     [👤 Guest · In]  │
├──────────────────────────────────┤
│ Games  Rooms  Notebook Blueprint │
├──────────────────────────────────┤
│ Hero Copy + Primary CTA          │
│ [Desk Flat-Lay Illustration]     │
│ Adaptive Tier Segmented Switcher │
│ Set 03 → Set 01 → Set 02 Cards   │
└──────────────────────────────────┘
```

### 2.2 Mode Launcher (Pre-Game Setup)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Games                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ Set 03 · Strategy Number Theory                                Grid 1–36     │ │
│ │ Factor Grid                                              Challengers (11–13) │ │
│ ├──────────────────────────────────────────────┬───────────────────────────────┤ │
│ │ 1. Play Mode: [vs. AI] [Solo] [Pass & Play]  │ How a Turn Works              │ │
│ │ 2. AI Strength: [Apprentice|Scholar|Master]  │ 1. Pick an open tile          │ │
│ │    (or Player 1 / Player 2 inputs if Local)  │ 2. Preview ochre divisors     │ │
│ │ Adaptive Tier        Rule Variant            │ 3. Spot primes & traps        │ │
│ │ [Explorers   1–20]   [Classic Capture]       │ Preview Online Room Codes     │ │
│ │ [Challengers 1–36]   [Prime Trap (+3)]       │ [     Start Factor Grid     ] │ │
│ │ [Strategists 1–49]                           │                               │ │
│ └──────────────────────────────────────────────┴───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Set 01 — Equation Foundry (Basic Arithmetic)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Mode Setup / Equation Foundry · Round 2 of 5 · Challengers   [💡 Hint] [🔊]    │
├────────────────────────────────────────────────────┬─────────────────────────────┤
│ TARGET NUMBER: 78  │ Current Value: 78 ✓           │ Live Scoreboard             │
│ Expression:  ( 9 + 4 ) × 6                         │ You: 180   │  AI: 145       │
│                                                    ├─────────────────────────────┤
│ Number Tiles: [3] [4✓] [6✓] [8] [9✓] [25]          │ Step-by-Step Evaluator      │
│ Operators:    [+][-][×][÷][(][)] [⌫ Undo] [Clear]  │ 1. (9 + 4) = 13             │
│               [Lock In Expression →]               │ 2. 13 × 6  = 78 (Exact!)    │
│                                                    ├─────────────────────────────┤
│ (Pass-and-Play Privacy Handoff & Side-by-Side      │ Round History               │
│  Formula Reveal overlay between Player 1 & 2)      │ #1 Target 42 · Exact (+100) │
└────────────────────────────────────────────────────┴─────────────────────────────┘
```

### 2.4 Set 02 — Odds & Urns (Modular Probability)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Mode Setup / Odds & Urns · Chamber 3 of 6 · Module: [Urn|Dice|Spinner] [🔊]    │
├────────────────────────────────────────────────────┬─────────────────────────────┤
│ Sampling WITHOUT Replacement · 8 Marbles Left      │ Scoreboard & Vault          │
│   🔵 🔵 🟢 🔵 🔴 🟢 🔵 🔴                          │ You: 42 banked (+14 risk)   │
│ Safe: 6 (75% · 3/4)  │  Hazard: 2 (25% · 1/4)      │ EV Bot: 38 banked           │
│                                                    ├─────────────────────────────┤
│ Step 1 — Estimate Safe Odds (Calibration Bonus):   │ Expected Value Inspector    │
│ [0% ═══════════════●═════ 100%]   Est: 75% (3/4)   │ E[Draw] = (3/4)(+10)        │
│                                                    │         + (1/4)(−14) = +4.0  │
│ Step 2 — Decision:                                 │ Optimal Move: PRESS (+EV)   │
│ [🎲 Draw Next Marble (+10)] [🏦 Bank +14 Safe]     ├─────────────────────────────┤
│                                                    │ Chamber Draw Log            │
│ (Bust State: Red-Pen breakdown + exact odds note)  │ #1 🟢 Safe · #2 🔵 Safe     │
└────────────────────────────────────────────────────┴─────────────────────────────┘
```

### 2.5 Set 03 — Factor Grid (Strategy Number Theory — Active Prototype)
```
DESKTOP ACTIVE BOARD
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Mode Setup / Factor Grid  1–20 · Explorers · Classic    [💡 Hint] [🔊] [↺]     │
├────────────────────────────────────────────────────┬─────────────────────────────┤
│ Claim 19 (+19) · AI gets {1} (+1) · Net +18        │ Live Scoreboard             │
│  [1 div] [2 p]  [3 p]  [4]    [5 p]                │ You: 19 (1 prime)           │
│  [6]     [7 p]  [8]    [9]    [10]                 │ AI:  1  (0 primes)          │
│  [11 p]  [12]   [13 p] [14]   [15]                 ├─────────────────────────────┤
│  [16]    [17 p] [18]   [19*]  [20]                 │ Number Inspector: n=19 Prime│
│  p = prime · dashed = locked                       │ Proper divisors: {1} sum=1  │
│                                                    ├─────────────────────────────┤
│ (Mobile 390px adds compact score bar above grid)   │ Move Ledger: #1 You took 19 │
└────────────────────────────────────────────────────┴─────────────────────────────┘

GAME OVER MODAL (Victory / Draw / Defeat + Taxman Sweep)
┌──────────────────────────────────────────────────┐
│ 🏆 Victory · Match Recorded in Notebook          │
│ You conquered the grid!                          │
│     You: 118  │  AI: 92  │  Best Swing: +18      │
│         [ Play Again ]   [ Change Mode ]         │
└──────────────────────────────────────────────────┘
```

### 2.6 Online Rooms, Mastery Notebook & Account Modal
```
ONLINE ROOMS                          MASTERY NOTEBOOK
┌──────────────────┬────────────────┐ ┌─────────────────────────────────────────┐
│ Host Room        │ Join Room      │ │ Matches: 4 | Win: 75% | Best: 124 | P:9 │
│ Code: K7M-4QP    │ [K7M-4QP][Join]│ ├─────────────────────────────────────────┤
│ Seat 1: Ready    │ Inline Error / │ │ Match Ledger (or Empty Zero-State CTA)  │
│ Seat 2: Waiting  │ Full / Sync    │ │ Factor Grid · vs AI · 118–92 · Won      │
└──────────────────┴────────────────┘ └─────────────────────────────────────────┘

ACCOUNT / SIGN-IN / SIGN-OUT MODAL
┌──────────────────────────────────────────────────────┐
│ Profile & Sign-In Flow (Guest / Signed-In)       [×] │
│ Display Name [Guest Explorer] [Save]                 │
│ Default Tier [Challengers ▾]  [🔊 Sound]             │
│ [🔑 Sign In with Google] / [🚪 Sign Out to Guest]    │
└──────────────────────────────────────────────────────┘
```

---

## 3. Exhaustive Situational & Corner-Case Matrix

| Domain | Corner Case / Situation | Expected Behavior |
| :--- | :--- | :--- |
| **Factor Grid** | Click/hover tile `1` | Always illegal (`properDivisors = []`); disabled; Inspector explains unit divisor role. |
| **Factor Grid** | Claiming opening prime (`19`) | Claims `19`, surrenders `1`; all remaining primes immediately lock (dashed + disabled). |
| **Factor Grid** | Rapid double-click or click during AI 620ms delay | Blocked by `aiThinking` & `tiles[n] !== 'unclaimed'` guards; no duplicate move or double scoring. |
| **Factor Grid** | Solo Taxman endgame with unplayable leftovers | All remaining unclaimed tiles sweep to Taxman (`p2`); Classic invariant `p1 + p2 === N*(N+1)/2`. |
| **Factor Grid** | Exact score tie in 2-player match | `winner === 'draw'`, neutral Ochre Draw modal, Notebook logs `Draw`. |
| **Equation Foundry** | Division by zero or non-integer division (`7 ÷ 3`) | Inline Red-Pen validation; Lock-In disabled; zero `NaN`/`Infinity`. |
| **Equation Foundry** | Reusing tile twice or unbalanced parentheses | Used tiles disabled until Undo; unbalanced parens prevent submission. |
| **Odds & Urns** | `0` safe marbles left without replacement | `P(safe) = 0%` warning; pressing triggers deterministic Bust with zero `0/0` error. |
| **Odds & Urns** | Banking with `0` at-risk points | Bank disabled until at least 1 draw builds points. |
| **Online Rooms** | Lowercase / unhyphenated room code (`k7m4qp`) | Normalized to `K7M-4QP` before validation/lookup. |
| **Online Rooms** | Third player tries joining full room | Rejected by client + Firestore rule with `"Room is already full (2/2 players)."`. |
| **Online Rooms** | Mid-match page refresh / disconnect | Re-subscribes to `/rooms/{code}` idempotently; restores exact authoritative state. |
| **Auth & Storage** | Google Popup closed/cancelled | Preserves Guest session; shows non-blocking inline cancellation message. |
| **Auth & Storage** | Guest → Google Sign-In merge | Deduplicates matches by `id`, preserves best scores, persists tier & sound settings. |
| **Auth & Storage** | Clean Sign-Out | Unsubscribes all `onSnapshot` listeners *before* `signOut()`, returns smoothly to Guest Mode. |
| **Resilience** | Private browsing (`localStorage` disabled/corrupted) | Safe `try/catch` fallback to `DEFAULT_PROFILE` and empty match list without crashing. |

---

## 4. Unit-Test Specification Matrix

- **`UT-FG-01..09` (`lib/factor-grid-engine.test.ts` — Implemented & Passing)**: Divisors, primality, number classifications (`unit/prime/deficient/perfect/abundant`), opening prime locking, `prime-trap` +3 bonus, Solo Taxman sweep & sum invariant (`210` on `1–20`), Master Minimax opening prime & full legal playout, immutability on illegal moves, and tier scaling (`20 / 36 / 49`).
- **`UT-EF-01..06` (Equation Foundry — Full Build)**: Expression evaluation, PEMDAS precedence, division-by-zero & non-integer rejection, single-use tile enforcement, proximity scoring decay, and algorithmic Target Solver verification.
- **`UT-OU-01..06` (Odds & Urns — Full Build)**: GCD-reduced safe probability fractions, without-replacement marble depletion, exact `E[X]` calculation, Optimal-EV bot threshold (`E[X] > 0`), 2d6 distribution table, and empty-chamber zero-guard.
- **`UT-SS-01..03` (Session & Rooms — Full Build)**: Room code normalization (`k7m4qp` → `K7M-4QP`), idempotent Guest-to-Cloud match deduplication, display name trimming & length capping (`<= 28` chars).

---

## 5. End-to-End (E2E) Test Specification Matrix

| ID | Scenario | Verification Target |
| :--- | :--- | :--- |
| `E2E-01` | Studio Hub First Paint & Tier Switch | Zero console errors; board previews update `1–20 / 1–36 / 1–49`; tier bar single-row on desktop. |
| `E2E-02` | Hover Divisor Preview & Number Inspector | Hover `19` highlights `1` (ochre) + `Prime`; hover `12` highlights `{1,2,3,4,6}` + `Abundant`. |
| `E2E-03` | Human vs. AI Turn Cycle & Hint | Click `19` → P1=19 → AI replies legally with rationale → Hint highlights emerald optimal tile. |
| `E2E-04` | Double-Click / AI-Turn Race Guard | Rapid clicks during AI turn do not double-score or corrupt Move Ledger. |
| `E2E-05` | Full Solo Taxman Playout → Game Over → Notebook | Playout triggers Game Over modal (`p1+p2=210`); Notebook logs match & KPIs accurately. |
| `E2E-06` | Play Again Clean State Reset | Resets scores, board, and ledger cleanly with zero reload or duplicate match entry. |
| `E2E-07` | Local Pass-and-Play Custom Names | Custom Player 1 & Player 2 names appear on scoreboard, turn banner, and Move Ledger. |
| `E2E-08` | Prime Trap Variant Scoring | Claiming prime `19` scores `22` (`+3` bonus) and displays `+22 / −1` in ledger. |
| `E2E-09` | Direct `?autostart=1` Entry | Opens straight into active Factor Grid board with `body[data-state="playing"]`. |
| `E2E-10` | Online Room Create & Copy | Generates `XXX-XXX` code, displays Host Ready seat, Copy triggers `Copied` confirmation. |
| `E2E-11` | Online Room Code Validation | Rejects malformed codes with inline crimson error; accepts & normalizes 6-char codes. |
| `E2E-12` | Guest Profile Reload Persistence | Edited Display Name persists in top bar across full page reload. |
| `E2E-13` | Sign-In / Sign-Out Flow | Smooth transition between Guest Mode and Signed-In session with clean reset on Sign-Out. |
| `E2E-14` | Mobile (`390×844`) Layout & Overflow | Zero horizontal scroll (`scrollWidth <= innerWidth`), compact mobile score bar visible, tiles ≥44px. |
| `E2E-15` | Keyboard Navigation & Dialog ARIA | Visible focus rings, `Enter` starts game from setup, modals expose `role="dialog"`. |
| `E2E-16` | Two-Browser Firestore Sync *(Post-Firebase)* | Live `<1s` board sync via `onSnapshot` across two contexts + Room Full rejection for 3rd user. |

---

## 6. Firestore Security & Data Integrity Rules (Full Build Reference)

- **`/users/{uid}`**: Owner-only read/write; strict field types (`displayName <= 28 chars`, valid `ageTier`, boolean `soundEnabled`); `list: if false`.
- **`/users/{uid}/matches/{matchId}`**: Owner-only read/create; immutable (`update, delete: if false`).
- **`/rooms/{roomCode}`**: Regex-validated `^[A-Z0-9]{3}-[A-Z0-9]{3}$`; `list: if false`; single-slot atomic guest join when `status == 'waiting' && guestUid == null`; participant-only updates with immutable `hostUid`/`guestUid` and zero email/PII fields.
