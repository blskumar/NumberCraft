# Numbercraft — Mathematics & Probability Game Studio Blueprint

**Numbercraft** is a unified, tactile notebook-style web application featuring three distinct sets of mathematics and probability games—**Basic Arithmetic**, **Modular Probability**, and **Strategy-Based Number Theory**—engineered so students aged 8 to 16 build genuine intuition through play across **Solo**, **Human vs. AI**, **Local Pass-and-Play**, and **Online Room Code** modes.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Your preferences from the discovery questions are locked into this blueprint. Please review the game lineup, inclusion/exclusion boundaries, and sign-in/sign-out flow below, then click **Proceed** to begin building—or share any adjustments you would like before code generation begins.

- **Confirmed Decision 1 — Target Audience & Adaptive Tiers**: Ages **8 to 16**, organized into three adaptive difficulty tiers (*Explorers 8–10*, *Challengers 11–13*, *Strategists 14–16*) that students can switch manually or let adjust automatically based on recent accuracy and streaks.
- **Confirmed Decision 2 — Visual Aesthetic**: **Tactile notebook studio with warm paper**—drafting-paper surfaces, graphite and blueprint-cobalt ink, crisp tabular math numerals, and interactive manipulatives instead of arcade neon clutter.
- **Confirmed Decision 3 — Multiplayer Scope**: **Both Local Pass-and-Play** (same device, turn handoff) and **Online Room Codes** (6-character shareable codes synchronized in real time via Firestore listeners).
- **Confirmed Decision 4 — Accounts & Persistence**: **Instant Guest Play plus optional Google Sign-In** (Firebase Authentication via popup), merging guest progress seamlessly when a student chooses to sign in.
- **Recommended Default — Launch Scope (3 Deep Flagship Games + Modular Variants)**: Launch Version 1 with one deeply polished, multi-mode game per requested discipline (each featuring modular challenge decks/variants, deterministic math AI opponents, live visual math explainers, and all 4 play modes), alongside a structured expansion blueprint for Version 2 games.

---

## 1. Overview & Core Concept

### What It Does
Numbercraft brings multiple mathematical disciplines into one cohesive play studio. Rather than presenting timed worksheets disguised as games, every game embeds a visual mathematical mechanism—combining operation tiles, inspecting live urn/dice probability chambers, or mapping factor and prime relationships across a strategy grid—so players see *why* a strategy works while competing against themselves, an explainable AI opponent, a classmate beside them, or a friend via a room code.

### Target Audience & Adaptive Tiers
| Tier | Age Range | Mathematical Focus | Scaffolding & Pacing |
| :--- | :--- | :--- | :--- |
| **Tier 1: Explorers** | Ages 8–10 | Addition, subtraction, introductory multiplication, simple fractions & basic dice odds, factors up to 20 | Visual hints on demand, no harsh countdown penalties, concrete manipulatives |
| **Tier 2: Challengers** | Ages 11–13 | All four operations & parentheses, sampling with/without replacement, primes & divisibility up to 36 | Live probability bar charts, step-by-step move recaps, moderate tactical AI |
| **Tier 3: Strategists** | Ages 14–16 | Multi-step expressions & powers, conditional probability & expected value ($E[X]$), number theory grids up to 49 | Optimal EV comparison lines, Minimax AI opponent, algebraic move ledger |

### Complete Game Curriculum Blueprint

#### Set 1: Basic Arithmetic & Number Sense — **Equation Foundry**
- **Core Mechanic**: Players receive a shared rack of 5–6 tactile number tiles and a Target Number. Clicking tiles and operators (`+`, `−`, `×`, `÷`, and parentheses/powers in higher tiers) constructs a live expression tree that evaluates step-by-step. Players score full mastery points for an exact match and scaled proximity points for the closest valid expression.
- **Math Concepts Taught**: Mental arithmetic fluency, order of operations, inverse thinking, factoring large targets into reachable sub-products.
- **Play Modes**:
  - *Solo*: 5-round Target Sprint with adaptive tier progression and an optional "Reveal Optimal Solution" breakdown.
  - *Human vs. AI*: Round-by-round duel against an algorithmic Expression Solver calibrated across 3 skill levels (*Apprentice*, *Scholar*, *Master*).
  - *Local Pass-and-Play*: Alternating secret-draft turns on one device with a privacy handoff screen before revealing both formulas side by side.
  - *Online Room Code*: Shared round seed synchronized via Firestore; players lock in expressions simultaneously and see live round scoring.

#### Set 2: Modular Probability Challenges — **Odds & Urns**
- **Core Mechanic**: A modular probability table featuring three switchable challenge decks—**Marble Urn Sampling** (with or without replacement), **Twin Dice Distribution** (sum & parity thresholds), and **Spinner & Conditional Draw**. In each round, players inspect the visual probability chamber, estimate or calculate the chance of a safe draw using an interactive fraction/percentage dial, and decide whether to **Bank** accumulated points or **Press Your Luck** for a multiplier before hitting a hazard outcome.
- **Math Concepts Taught**: Sample spaces, independent vs. dependent events, conditional probability, and expected value ($E[X]$) decision-making.
- **Play Modes**:
  - *Solo*: 6-chamber Expected Value expedition that grades both outcome and decision quality against the mathematically optimal EV line.
  - *Human vs. AI*: Compete against an Expected-Value Bot (*Cautious*, *Balanced*, *Optimal-EV*) that transparently prints its probability math after each decision.
  - *Local Pass-and-Play*: 2-player hotseat risk-reward duel drawing from a shared visible chamber.
  - *Online Room Code*: Real-time synchronized chamber state where players take turns drawing or banking with instant state updates.

#### Set 3: Strategy-Based Number Theory — **Factor Grid**
- **Core Mechanic**: A numbered board (`1–20`, `1–36`, or `1–49` depending on tier). On your turn, select any unclaimed number $N$ that has at least one unclaimed proper divisor on the grid. You claim $N$ points, and your opponent automatically captures **all** remaining unclaimed proper divisors of $N$. Includes a modular rule toggle between **Classic Factor Capture** and **Prime Trap** (bonus points for isolating primes late in the game).
- **Math Concepts Taught**: Factors, proper divisors, multiples, prime vs. composite numbers, abundant vs. deficient numbers, and two-step game-theoretic lookahead.
- **Play Modes**:
  - *Solo*: *Outsmart the Taxman* optimization challenge—try to capture the highest share of the board's total value before no legal moves remain.
  - *Human vs. AI*: Face a deterministic Minimax + Alpha-Beta Pruning AI opponent (depth-scaled for Apprentice / Scholar / Master) with a post-move insight badge explaining why a number was prime, deficient, or risky.
  - *Local Pass-and-Play*: 2-player head-to-head territorial duel on the same screen with live hover previews showing which divisors will be surrendered.
  - *Online Room Code*: Live turn-based grid synced through Firestore with turn-owner validation and a scrollable move ledger.

*(Planned Version 2 Expansion Slots in the Studio Architecture: **Fraction Balance** for Set 1, **Monty & Bayes Doors** for Set 2, and **Modular Clock Nim** for Set 3—supported directly by the modular game registry without changing navigation or room infrastructure.)*

---

### Blueprint Guardrails: What to Include vs. What NOT to Include

| What We MUST Include | What We MUST NOT Include |
| :--- | :--- |
| **Instant 1-Click Play**: Guests jump into any game immediately without mandatory signup walls. | **No Mandatory Login Gate**: Students or teachers testing the app should never hit a forced sign-up wall. |
| **Deterministic, Explainable Math AI**: Algorithmic solvers (expression search, EV calculators, Minimax) that teach strategy transparently. | **No Unsolicited LLM Chatbots or "Ask AI" Widgets**: Avoid distracting chat sidebars or hallucinated math answers. |
| **Interactive Visual Intuition Aids**: Live divisor highlighting, urn marble counts, fraction/EV meters, and post-round breakdowns. | **No Stressful Flashcard Drills or Punitive Timers**: Avoid ticking red panic clocks or "3 lives & locked out" mechanics that trigger math anxiety. |
| **Child-Safe Online Rooms**: 6-character private room codes with structured turn moves and quick-reaction math stickers only. | **No Open Public Chat Rooms or Unmoderated Matchmaking**: Protects minors (ages 8–16) from unsafe stranger messaging and PII exposure. |
| **Clean Mastery & Growth Tracking**: Personal bests, concept accuracy by set, and win/loss summaries per tier. | **No Loot Boxes, Coins, Streak Shaming, or Dark-Pattern Monetization**: Keep motivation intrinsically tied to curiosity and mastery. |
| **Accessible Touch & Keyboard Play**: $\ge 44\text{px}$ tap targets, dual-coded states (icons + text, never hue-only), tabular numbers. | **No Visual Clutter or Fake Telemetry**: No pulsing status dots, neon cyberpunk glows, or nested card-within-card walls. |

---

## 2. User Experience & Visual Design

### Sign-In, Sign-Out & Guest-to-Cloud Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER ARRIVES AT STUDIO                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
   ┌─────────────────────────────┐     ┌─────────────────────────────┐
   │   INSTANT GUEST SESSION     │     │    GOOGLE SIGN-IN (POPUP)   │
   │ • Plays all Solo, vs. AI,   │     │ • Triggered via top-bar     │
   │   and Local Pass-and-Play   │     │   "Sign In" or Online Room  │
   │ • Stats & tier saved in     │     │   hosting prompt            │
   │   browser localStorage      │     │ • Firebase Auth Google      │
   └──────────────┬──────────────┘     │   signInWithPopup           │
                  │                    └──────────────┬──────────────┘
                  │  Student later clicks "Sign In"   │
                  └─────────────────┬─────────────────┘
                                    ▼
                  ┌───────────────────────────────────┐
                  │   AUTHENTICATED STUDENT SESSION   │
                  │ • One-time merge of local guest   │
                  │   stats into Firestore profile    │
                  │ • Cross-device progress & history │
                  │ • Host & join Online Room Codes   │
                  └─────────────────┬─────────────────┘
                                    │  User clicks Profile → "Sign Out"
                                    ▼
                  ┌───────────────────────────────────┐
                  │          CLEAN SIGN-OUT           │
                  │ • Detaches all Firestore room &   │
                  │   profile listeners cleanly       │
                  │ • Calls Firebase signOut()        │
                  │ • Clears in-memory cloud state    │
                  │ • Returns smoothly to Guest Mode  │
                  │   with a subtle confirmation note │
                  └───────────────────────────────────┘
```

- **Why Popup Auth**: `signInWithPopup` with Google Authentication works cleanly inside embedded browser frames without redirect URL breakage and avoids storing student passwords.
- **Privacy for Ages 8–16**: Only stores minimal profile metadata (`displayName`, optional `photoURL`, preferred `ageTier`, and aggregate game mastery stats). Never exposes user emails to other players in online rooms—rooms display only a chosen first name or nickname.
- **Safe Guest Fallback for Online Rooms**: Guests can play Solo, vs. AI, and Local Pass-and-Play immediately; when opening **Online Room Codes**, guests see a clear inline prompt to sign in with Google so room ownership and turn security rules are cryptographically verified.

### Key User Flows
1. **Landing & Studio Hub**: Opens directly into the warm drafting-paper studio showcasing a focused studio header, an inline Adaptive Tier selector (*Ages 8–10 · 11–13 · 14–16*), and the 3 Game Set Cards (Equation Foundry, Odds & Urns, Factor Grid). Clicking any game opens its Mode Launcher (*Solo*, *Human vs. AI*, *Local Pass-and-Play*, *Online Room*).
2. **Active Gameplay (Two-Zone Sandbox Layout)**:
   - **Left / Primary Interactive Stage (~65% width on desktop)**: Tactile game board (expression workbench, visual marble urn / dice chamber, or numbered factor grid) with direct click/tap interaction and subtle Web Audio feedback chimes (mutable).
   - **Right / Concept & Ledger Deck (~35% width on desktop)**: Compact HUD scoreboard, active turn indicator with explicit text + icon, live mathematical insight panel (e.g., *Expected Value Meter*, *Divisor Preview*, or *Operation Step Trace*), and clean **New Round / Change Mode / Back to Studio** controls.
3. **Online Room Lobby & Live Match**: Host clicks **Create Room** → generates a 6-character code (e.g., `K7M-4QP`) with a 1-click Copy Code button → Friend enters code in **Join Room** → both players see live Ready status → match begins with real-time synchronized moves and an end-of-match **Rematch** button.
4. **Progress & Mastery Notebook**: Dedicated view showing mastery across Arithmetic, Probability, and Number Theory, recent match ledger, and personal bests—synced to Firestore when signed in or stored locally for guests.

### Visual Identity & Theme — *Tactile Notebook Studio*
- **Aesthetic Direction**: Warm, inviting architectural study desk—like an open graph-paper sketchbook paired with crisp wooden/ceramic tiles and fountain-pen ink. Calm, scholarly, playful without looking childish for 15-year-olds or intimidating for 8-year-olds.
- **Color Palette & 60-30-10 Budget**:
  - **60% Dominant Neutral Canvas**: Warm drafting paper (`--background: #FAF8F4`) with a whisper-subtle 24px engineering dot/grid backdrop.
  - **30% Structural Surfaces**: Crisp archival card stock (`--surface: #FFFFFF`), warm graphite hairline borders (`--border: #E5E0D5`), and deep charcoal ink (`--foreground: #1C232B`, muted `#5A6572`).
  - **10% Focal & Semantic Accents**:
    - Blueprint Cobalt (`--primary: #1D4ED8`) for primary actions, active player focus, and selected tiles.
    - Chalk Emerald (`--success: #047857`) paired with check icons for exact solutions, safe draws, and claimed primes.
    - Ochre Gold (`--highlight: #B45309`) for strategic hints, opponent divisor previews, and multiplier cues.
    - Red-Pen Crimson (`--danger: #BE123C`) paired with warning labels for bust hazards or invalid expressions.
- **Typography & Hierarchy (2+1 Rule)**:
  - **Display & Headings**: `Fraunces` (warm, expressive editorial serif with gentle optical softness; `text-wrap: balance`).
  - **UI & Body Prose**: `Plus Jakarta Sans` (friendly, crisp geometric humanist sans for rules, buttons, and concepts).
  - **Numbers, Fractions, Formulas & Scores**: `IBM Plex Mono` with strict `tabular-nums` alignment so digits, fractions, and scoreboards never jitter.
- **Component & Top Bar Discipline**:
  - **3-Zone Top Bar**: `[Numbercraft wordmark]` — `[Games · Online Rooms · Notebook · How to Play]` — `[Sign In / Account Menu]`. Single-line controls, zero pill-badge clutter, zero decorative status dots.
  - **Motion & Tactility**: Subtle compositor-only transitions (`transform`, `opacity`, $\le 200\text{ms}$) for tile placement, marble draw reveals, and grid captures; full support for `prefers-reduced-motion`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Pure Deterministic Game Engines + Algorithmic AI**
  - *Chosen Approach*: Build each game's rules, move validation, scoring, probability math, and AI opponent (Expression Solver, Expected-Value Agent, Minimax/Alpha-Beta Factor AI) as pure TypeScript modules completely decoupled from React UI.
  - *Why*: Guarantees 100% mathematically accurate scoring and probabilities, instant zero-latency AI moves with natural pacing (500–800ms), explainable hints, and fast automated unit testing via `node:test`.
  - *Alternatives Considered*: Using an LLM API to act as the game opponent—rejected due to latency, cost, and risk of arithmetic/probability hallucinations in an educational math tool.

- **Decision 2 — Firestore Real-Time Rooms (`onSnapshot`) for Online Multiplayer**
  - *Chosen Approach*: Use Firebase Firestore documents keyed by 6-character room codes with real-time `onSnapshot` listeners and hardened Firestore Security Rules enforcing participant-only access and valid turn transitions.
  - *Why*: Integrates seamlessly with Google Sign-In, requires zero custom WebSocket server maintenance, survives browser refreshes cleanly, and fits turn-based & synchronized-round math games effortlessly.
  - *Alternatives Considered*: Custom Socket.IO server—rejected because ephemeral in-memory sockets lose room state on server restart and duplicate authentication logic already handled cleanly by Firebase.

- **Decision 3 — Three Deep, Modular Flagship Games at Launch**
  - *Chosen Approach*: Ship 3 complete, richly interactive games (one per requested category: Arithmetic, Probability, Number Theory), each with modular challenge variants, 3 age tiers, and all 4 play modes.
  - *Why*: Delivers genuine depth, visual manipulatives, and polished AI/multiplayer across every discipline rather than 8 shallow trivia quizzes.
  - *Alternatives Considered*: Building 6+ thin mini-games—rejected because each game needs custom visualizers, AI heuristics, pass-and-play handoffs, and room sync handlers.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATION (Next.js)                     │
│                                                                            │
│  ┌──────────────────────────┐    ┌──────────────────────────────────────┐  │
│  │    Top Navigation Bar    │    │      Auth & Profile Provider         │  │
│  │ Wordmark · Nav · Account │◄──►│ • Guest State (localStorage)         │  │
│  └────────────┬─────────────┘    │ • Firebase Auth (Google Popup)       │  │
│               │                  │ • Guest→Cloud Stats Merger           │  │
│               ▼                  └──────────────────┬───────────────────┘  │
│  ┌──────────────────────────────────────────────┐   │                      │
│  │           Studio Views & Workbenches         │   │                      │
│  │ ┌──────────────┐ ┌────────────┐ ┌──────────┐ │   │                      │
│  │ │ Studio Hub & │ │ Active Game│ │ Mastery  │ │   │                      │
│  │ │ Mode Picker  │ │  Sandbox   │ │ Notebook │ │   │                      │
│  │ └──────┬───────┘ └─────┬──────┘ └────┬─────┘ │   │                      │
│  └────────┼───────────────┼─────────────┼───────┘   │                      │
│           │               │             │           │                      │
│           ▼               ▼             ▼           ▼                      │
│  ┌──────────────────────────────────────────────┐  ┌────────────────────┐  │
│  │        Pure Math & Game Engine Layer         │  │  Firestore Service │  │
│  │ • Arithmetic Engine + Expression Solver AI   │  │ • User Profiles    │  │
│  │ • Probability Engine + EV Decision AI        │  │ • Match Records    │  │
│  │ • Factor Grid Engine + Minimax/Alpha-Beta AI │  │ • Live Room Sync   │  │
│  │ • Adaptive Tier Evaluator & Unit Test Suite  │  │   (onSnapshot)     │  │
│  └──────────────────────────────────────────────┘  └─────────┬──────────┘  │
└──────────────────────────────────────────────────────────────┼─────────────┘
                                                               │
                                                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      FIREBASE CLOUD INFRASTRUCTURE                         │
│  ┌──────────────────────────────┐   ┌───────────────────────────────────┐  │
│  │     Firebase Auth (Google)   │   │   Cloud Firestore + Hardened      │  │
│  │ • Popup Sign-In / Sign-Out   │   │   Security Rules                  │  │
│  │ • UID Identity Tokens        │   │   • /users/{uid}                  │  │
│  └──────────────────────────────┘   │   • /users/{uid}/matches/{id}     │  │
│                                     │   • /rooms/{roomCode}             │  │
│                                     └───────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Security Strategy
- **Student Profile (`/users/{uid}`)**: Stores `displayName`, `ageTier` (`explorers` | `challengers` | `strategists`), `soundEnabled`, cumulative `stats` per game (`gamesPlayed`, `gamesWon`, `bestScore`, `currentStreak`), and `updatedAt`. Strictly owner-read / owner-write only; never publicly listable.
- **Match History (`/users/{uid}/matches/{matchId}`)**: Immutable completed game logs (`gameType`, `mode`, `ageTier`, `score`, `opponentScore`, `result`, `accuracyNote`, `playedAt`) powering the Mastery Notebook. Owner-only read/create.
- **Online Multiplayer Rooms (`/rooms/{roomCode}`)**: Document keyed by uppercase 6-character code containing `gameType`, `ageTier`, `variant`, `status` (`waiting` | `playing` | `finished`), `hostUid`, `guestUid` (nullable until joined), `hostName`, `guestName`, `turnUid`, `roundNumber`, serialized deterministic `gameState`, `winnerUid`, and `updatedAt`.
  - **Security Rules Enforcement**: Only authenticated users may create rooms; any authenticated user may join a `waiting` room with an empty `guestUid` (single-slot atomic claim); once `playing`, only `hostUid` or `guestUid` can read/update room state; strict field/size validation prevents arbitrary payload injection or email leakage.

### Interactive Component & State Mapping
- **Studio Hub & Tier Bar**: Switching the adaptive tier updates global session state (persisted to `localStorage` or Firestore) and dynamically previews the grade-appropriate board size/operators on all 3 game cards.
- **Mode Launcher Modal / View**: Lets the student pick *Solo*, *vs. AI* (with AI skill selector), *Local Pass-and-Play* (with editable Player 1 & Player 2 names), or *Online Room* (Create Room / Enter 6-Character Code) before initializing the game engine state machine (`SETUP` → `PLAYING` → `HANDOFF` [local only] → `ROUND_SUMMARY` → `GAME_OVER`).
- **Equation Foundry Stage**: Tile clicks append tokens with real-time syntax validation (preventing invalid double operators or division by zero), live expression evaluation preview, Undo/Clear controls, and a Submit handler that scores the attempt and triggers either the AI turn, local handoff overlay, or Firestore round update.
- **Odds & Urns Stage**: Module switcher (*Urn*, *Dice*, *Spinner*) renders live SVG/DOM visuals of remaining marbles or probability spaces; interactive probability slider/fraction picker records the student's estimate, while **Draw** and **Bank** buttons execute seeded stochastic transitions, update expected-value metrics, and hand off turns cleanly.
- **Factor Grid Stage**: Hovering any valid unclaimed tile previews its unclaimed proper divisors in Ochre Gold and shows the exact point delta (`+N for you / +D for opponent`); clicking claims the tile, animates divisor captures, appends to the move ledger, triggers the AI Minimax response (with a 600ms thinking delay and move explanation), or writes the validated move to Firestore in Online Room mode.
- **Account & Error Boundaries**: Top-bar Account control handles Google Popup Sign-In, displays signed-in name with a clean Sign-Out action, and surfaces friendly inline alerts (never `window.alert`) for popup cancellation, invalid room codes, or network offline states.

### Online Room Synchronization Sequence

```
Host Client                    Firestore (/rooms/{code})              Guest Client
    │                                     │                                │
    ├─ Create Room (status: "waiting") ──►│                                │
    │◄──── Subscribe onSnapshot ──────────┤                                │
    │                                     │◄─ Join Room (claim guestUid) ──┤
    │◄──── Live Update: Guest Joined ─────┼─── Subscribe onSnapshot ──────►│
    │                                     │                                │
    ├─ Start Match (initial seed/state) ─►│                                │
    │◄──── Broadcast: status="playing" ───┼─── Broadcast: status="playing"►│
    │                                     │                                │
    ├─ Submit Validated Move (turn flip) ►│                                │
    │◄──── Confirm State ─────────────────┼─── Live Board Update ─────────►│
    │                                     │◄─ Submit Counter-Move ─────────┤
    │◄──── Live Board Update ─────────────┼─── Confirm State ─────────────►│
    │                                     │                                │
    └─ Match End → Save Match Record ────►│◄─ Save Match Record ───────────┘
```
