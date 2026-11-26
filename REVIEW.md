# NumberCraft — Code Review and Test Report

> **Status (2026-11-26):** sections 1-9 describe the code as reviewed. For what was fixed and what is still open, read section 10 first.

Repo: https://github.com/blskumar/NumberCraft (sections 1-7: commit `9605513`; section 8: delta review of `8c9f49c`)
Reviewed: 2026-11-20. Stack: Next.js 15.5 / React 19 / TypeScript / Tailwind 4, about 18.7k lines of source.

**No repository code was changed.** The clone was verified clean (`git status` empty) after all work. Builds and tests ran in a separate copy. All test code lives in this folder, outside the repo.

---

## 1. Verdict

The pure game logic is in good shape. Static checks are clean: `tsc --noEmit` and `eslint` report no errors, and the production build succeeds. The 68 existing unit tests pass. The e2e happy paths pass on all 8 browser profiles.

The risks are around the engine rather than in it:

1. A corrupt `localStorage` value freezes the whole app on load.
2. The "sign-in" is fake, yet its UI makes privacy claims that are false.
3. The layout breaks at tablet and small-phone widths.
4. About 20% of the source is unreachable dead code.
5. Accessibility and security-header gaps.

Of 55 new tests I wrote for the engine and storage layers, 9 fail. Each of those failures is a confirmed defect, not a flaky test. The browser probe tests confirm 6 more defects across the 8 profiles.

## 2. Test results

| Layer | Scope | Result |
|---|---|---|
| Static | `tsc --noEmit`, `eslint .`, `next build` | all pass |
| Existing unit/integration | 14 files in `lib/*.test.ts` | **68 / 68 pass** |
| New unit (engines) | `tests/unit/engines.review.test.ts`, 29 tests, 38,880 generated arithmetic problems, 3 years × 3 tiers of daily puzzles | 25 pass, **4 fail** (real defects) |
| New integration (storage → achievements → analytics) | `tests/integration/storage-pipeline.review.test.ts`, 26 tests | 21 pass, **5 fail** (real defects) |
| Coverage of `lib/` (all suites together) | | 93.6% lines, 89.8% branches. `sound.ts` 38%, `odds-urns-engine.ts` 73%. **Components: 0% unit-tested.** |
| E2E | Playwright 1.62, 8 profiles: Chromium, Chrome, Edge, Firefox, WebKit, Pixel 7, iPhone 13, iPad gen 7. 160 passed, 71 failed, 145 skipped by design in the first full run | see below |
| Accessibility | axe-core WCAG 2.0/2.1 A and AA plus best-practice, 6 screens plus play and modal | serious violations on every screen |
| Performance | prod build, local | first paint under 3 s. Details are in the logs. |

**Cross-browser functional tests pass on all 8 profiles.** These cover load, all tabs, tier persistence, a full arithmetic round (keyboard and on-screen keypad), timer expiry with a fake clock (exactly one match saved), a full Factor Grid game against the AI with UI scores matching the engine, a Daily Challenge solve, the account modal, an XSS probe, and unavailable or junk `localStorage`.

**Probe tests that fail by design, each confirming a defect:**

| Probe | Failed on |
|---|---|
| Ctrl+0 (zoom reset) swallowed during play | 8/8 profiles |
| Answered question silently lost on game switch | 8/8 |
| Any email and password "signs in" | 8/8 |
| "Session-only classroom mode" still stores the email | 8/8 |
| Malformed stored match leaves the app stuck | 8/8 |
| Modal does not trap focus | 7/8. Firefox passed, but its Tab behaviour in headless mode is not comparable, so treat that result as inconclusive. |

**Responsive failures** (re-run with corrected selectors; the first run had false positives from my test using "Online Rooms" where the phone nav says "Rooms"):

- 768 px: fails on Chromium, Firefox and WebKit.
- 375 px: fails on all three engines.
- 320 px: fails on all three engines. The arithmetic play screen also overflows at 320.
- 414, 1024 and 1440 px: pass.

**Not covered:**

- Safari on real macOS or iOS (WebKit is Playwright's build, not Apple Safari).
- Real touch devices.
- Screen-reader walkthroughs (NVDA, VoiceOver). axe finds only a subset of problems.
- Network throttling.
- `next dev` StrictMode behaviour (see M1).
- Real users. Usability findings below are heuristic.

## 3. Findings

Each finding lists severity, evidence, location and a fix direction. Line numbers refer to commit `9605513`.

### High

**H1. Malformed stored data freezes the app on load.** (Confirmed, 8/8 profiles)
`loadMatches()` validates only that the value is an array and never checks the items (`lib/storage.ts:112-124`). If any item is `null`, `evaluateAchievements` throws `Cannot read properties of null (reading 'id')`. That runs inside a `setTimeout` in the hydration effect (`components/NumbercraftApp.tsx:102-137`). Nothing catches it, so `setHydrated(true)` never runs. The page stays `aria-busy="true"` with empty state and no message. A shared classroom device, a browser extension, or an older schema version could trigger it. `loadDailyCompletions` has the same shape: its filter only checks `dateKey` and `editionNumber`.
Fix direction: validate each item with a type guard, as `loadEarnedBadges` already does. Wrap the hydration body in try/catch with a reset path. Consider an error boundary.

**H2. Fake authentication with false privacy claims.** (Confirmed)
`components/AccountModal.tsx:141-168`: any email containing `@` plus any password of 8 or more characters switches the profile to `signed-in-preview`. The Google button hard-codes the identity "Maya Chen" with `maya.student@example.edu` (lines 124-139) and renames a child's profile. The text "Signed-in" and "Remembered on this device" reads as a real session. The "Shared classroom computer (session-only sign-in)" option does not do what it says. `onUpdateProfile` always writes the email to `localStorage` (verified: `sharedDeviceMode:true` alongside `email:"kid@school.test"` in storage). The under-13 guardian-consent checkbox is purely client-side. The app targets ages 8-16, so wiring a real backend to this UI as-is would create COPPA/GDPR-K exposure.
Fix direction: until a backend exists, remove the email/password and Google flows or label them unmistakably as non-functional. Do not store the email. Make shared-device mode actually avoid persistence.

**H3. Layout overflows at tablet and small-phone widths.** (Confirmed on 3 engines, screenshots in `evidence/`)
- **768-875 px** (iPad portrait is 768): the header switches to the desktop nav at `md`, but brand + 6 tabs + profile button need about 876 px. The profile button is clipped off-screen and the page scrolls sideways (`components/TopNav.tsx:55, 66-68, 98-123`).
- **320 px:** the profile button ("Guest Explorer · Sign In", `shrink-0` plus `whitespace-nowrap`) overflows by 25 px on every screen.
- **375 px:** the "Join Room" button on the Online Rooms tab overflows by 10 px.
Fix direction: raise the desktop-nav breakpoint to `lg`, or let the profile label truncate or become icon-only on narrow widths. Find the Online Rooms row that has no `min-w-0` or `flex-wrap`.

### Medium

**M1. Side effects inside React state updaters.** (By inspection; not reproduced in the prod build)
- `components/ArithmeticArena.tsx:284-290`: `finalizeRound` (which calls the parent's `onRecordMatch` and plays audio) runs inside a `setSecondsLeft` updater.
- Lines 428-436: `queueMicrotask(() => submitAnswer(next))` runs inside a `setInputValue` updater, so with auto-submit on, StrictMode's double-invoked updater can submit twice.
- `components/NumbercraftApp.tsx:160-188, 274-329`: `saveProfile`, `playSoundPreviewChime` and `saveMatches` inside updaters.
The code already guards against double finalize with a ref, which suggests the author hit this. Verify under `next dev` (React StrictMode). The fix is to move effects out of updaters.

**M2. Ctrl/Cmd+digit is swallowed during play.** (Confirmed 8/8)
The global key handler calls `preventDefault()` for any digit with no modifier check (`ArithmeticArena.tsx:456`, `DailyChallengeArena.tsx:404`; this is also duplicated code). Ctrl+0 (reset zoom) and Ctrl+1-9 (switch tab) stop working mid-game, which hurts low-vision users who rely on zoom. Fix: `if (e.ctrlKey || e.metaKey || e.altKey) return;` in a shared hook.

**M3. In-progress rounds are lost silently.** (Confirmed 8/8, usability)
Switching the game pill or tab mid-round discards the round and records nothing, with no confirmation. For a child, one accidental tap on the game switcher erases the session.

**M4. Accessibility: axe serious violations on every screen.**
- `color-contrast`: `#7A8490` text on the cream background is 3.4-3.8:1 (needs 4.5:1). It is used at 10 px in 12 places. The `#8C8476` icon colour on the mastery bar is 3.3:1.
- `label-content-name-mismatch` (`TopNav.tsx:103`): the accessible name "Open student profile and mastery seals" does not contain the visible text "Guest Explorer · Sign In". Voice-control users cannot say what they see.
- Moderate: `landmark-main-is-top-level`, `landmark-unique`, `region`. `<main>` sits inside `role=region` containers, and every arena renders its own `<main>`.
- The account modal does not trap focus (Tab moves into the page behind). `Escape` works.
- The mobile nav buttons have no `focus-visible` style, unlike the desktop ones (`TopNav.tsx:141`).
- 111 uses of `text-[10px]` or `text-[11px]` for readers aged 8-16. The under-12 px text share passed my 10% threshold on the hub, but it is dense in game HUDs.
- "Mastery Seals" link is 93×17 px, under the WCAG 2.2 minimum target of 24 px.
Positives: skip link, live-region tab announcements, `aria-pressed` on toggles, reduced-motion support, tile `aria-label`s that describe owner and primality, an XSS-safe name field.

**M5. Dead code: about 3,660 lines (about 20% of source).** (Confirmed by import search)

*Superseded: see section 8.2. Equation Foundry and Odds & Urns are now live.*
`EquationFoundryArena.tsx` (1,141), `OddsUrnsArena.tsx` (1,458), `equation-foundry-engine.ts` (598) and `odds-urns-engine.ts` (465) are imported by nothing. No tab renders them, though `TIER_SPECS.probabilitySummary` and the README advertise probability games. Their tests (238 lines) exercise unreachable code. `hooks/use-mobile.ts` and `lib/utils.ts` are also unused.
Fix: wire them in or delete them, or move them to a branch.

**M6. Daily data layer can clobber a solved day and duplicate matches.** (Confirmed in tests; the UI currently guards it)
`upsertDailyCompletion` replaces by `dateKey` with no "keep if already solved" rule (`storage.ts:226-236`), so a later unsolved write would erase a solved day and the streak. `buildDailyMatchRecord` gives a deterministic id, but `appendMatch` does not de-duplicate, so ids repeat (`daily-challenge.ts:707-712`). The UI avoids both through an "unranked practice replay". Treat as latent: any new entry point would hit it.

**M7. Explorers can get `7 − 7 = 0` and a nonsense hint.** (Confirmed in unit test)
Adaptive Level 1 subtraction (`lib/arithmetic-engine.ts:452-455`) allows `b === a` for `a` in 7-9. The README promises "strictly positive" differences for this tier. The hint reads "what number plus 7 equals 7?".

**M8. The "draw" result is practically unreachable.** (Confirmed)
`arithmetic-engine.ts:667-668`: `score === parScore - 5` is the only draw value (125 of 0-300 for the standard pace).

**M9. No security headers.** (Confirmed on the prod build)
Missing: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` (or CSP `frame-ancestors`), `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`. `X-Powered-By: Next.js` is exposed. No secrets are in the repo. `.env.example` lists a `GEMINI_API_KEY` that nothing uses.

**M10. Dependency and tooling hygiene.**
- `npm audit`: 1 high and 1 moderate, via `next` pulling a vulnerable `postcss` (XSS and source-map file read). The fix needs a major Next upgrade.
- Unused dependencies: `@google/genai`, `@hookform/resolvers`, `class-variance-authority`, `firebase-tools` (very large; it caused a very slow install), `clsx` and `tailwind-merge` (used only by the dead `lib/utils.ts`).
- `eslint-config-next@16` with `next@15`. Two ESLint configs (`.eslintrc.json` legacy and `eslint.config.mjs` flat). `next.config.ts` has `eslint.ignoreDuringBuilds: true`, so lint never gates a build.
- `output: 'standalone'` makes `next start` warn.
- Package name is `ai-studio-applet`.
- `images.remotePatterns` allows `picsum.photos` but nothing uses it.
- `next/font/google` needs network at build time.
- No `test` script and no CI. README says "all 37 tests" and lists 7 files; there are 68 tests in 14 files. The README claims "Playwright end-to-end verification", but the repo contains no e2e tests. `docs/SPECIFICATION_AND_WIREFRAMES.md` (457 lines) and `docs/specifications/specification_and_wireframes.md` (244 lines) differ.

### Low

- `classifyNumber(0)` returns "perfect" and negatives return "abundant" (`factor-grid-engine.ts:76-127`). Not reachable from the UI today.
- `clampAdaptiveLevel(NaN)` returns `NaN` (`adaptive-arithmetic.ts:75-80`). Line 145 has a dead ternary: `(gameId === ... ? 2 : 2)`.
- `parseDateKeyUTC('2025-13-45')` silently rolls over to February 2026 instead of falling back.
- Sample data is identified by magic strings: `completedAt.endsWith('.111Z')` (`performance-dashboard.ts:384`) and the `sample-` id prefix (`notebook-analytics.ts:214`). A real completion whose millisecond is 111 (about 1 in 1,000) would be treated as sample data and deleted by "Clear sample data".
- In local and vs-AI Factor Grid games, tiles left unclaimed at the end score for nobody (5 of 36 on Challengers, one deterministic game). Solo mode awards them to the Taxman. Check whether this is intended.
- The profile's featured badge stays set after "clear local progress" (`storage.ts:101-110`). The modal hides it, so only the stored value is stale.
- The countdown counts one-second ticks instead of comparing timestamps (`ArithmeticArena.tsx:275-296`). Background throttling or device sleep can stretch a "60 s" round. Not tested.
- `suppressHydrationWarning` on `<body>` (`app/layout.tsx`) can hide real hydration mismatches.
- The last mobile tab ("Blueprint") is clipped with no scroll hint (see `evidence/phone-375-nav.png`). The nav label is "Rooms" on phones and "Online Rooms" on desktop.

## 4. Repeated code

| Repeated code | Where | Suggested consolidation |
|---|---|---|
| Badge unlock and profile-featured logic, about 20 duplicated lines | `NumbercraftApp.tsx:206-224` and 248-266 (`handleRecordMatch` vs `handleCompleteDaily`) | one `applyAchievementResult(evaluation)` helper |
| `TIER_ORDER = ['explorers','challengers','strategists']`, 6 copies | `ArithmeticArena:74`, `DailyChallengeArena:65`, `EquationFoundryArena:64`, `OddsUrnsArena:66`, `StudioHub:57`, `notebook-analytics:50` | export once next to `TIER_SPECS` |
| Tier-picker card grid | 5 arenas plus `AccountModal` | shared `<TierPicker>` |
| Global keydown handler (digits, `-`, Backspace, Escape, Enter, `h`), including the M2 bug | `ArithmeticArena:446-478`, `DailyChallengeArena:~394-430` | one `useKeypadInput` hook with a modifier guard |
| `randInt` / `pickFrom` | `arithmetic-engine.ts:299-307`, `daily-challenge.ts:233-241` | one `lib/rng.ts` |
| Seeded PRNG | `daily-challenge.ts:223` (Mulberry32) and `equation-foundry-engine.ts:65` (`seededRandom`) | one implementation |
| Date-key formatting (`YYYY-MM-DD` padding) | `daily-challenge.ts:151-156` and 166-173 | one `formatDateKey(Y, M, D)` |
| Match-id generation (`Date.now()` plus random), 6 variants | `arithmetic-engine:587, 671`, `equation-foundry:585`, `odds-urns:452`, `FactorGridPrototype:159`, `OddsUrnsArena:333` | one `makeId(prefix)` (or `crypto.randomUUID()`) |
| Timer/interval and sound-toggle plumbing | 13 `setInterval`/`setTimeout` uses, `onToggleSound` threaded through 20 places | a timer hook and a context for sound and profile |
| `localStorage` load/save pairs | `storage.ts`, 4 near-identical `try/parse/validate/slice` blocks | one generic `readJson(key, validate)` (also fixes H1) |
| Sample-clear logic | `handleClearSampleMatches` and `handleLoadSampleDashboard` merge code in `NumbercraftApp` | extract merge helper |
| Duplicated specification docs | `docs/` | keep one |

Textual scan for 8-line copy-paste blocks found only 6 hits, so most duplication is structural (shared patterns re-implemented), not literal copies. The two oversized components (`ArithmeticArena` 1,468 lines, `OddsUrnsArena` 1,458) are the main maintainability risk.

## 5. Usability notes (heuristic, no user sessions)

- Strong: clear tab structure, non-punitive adaptive difficulty (a hint opens after two misses), streak feedback, an on-screen keypad that works as well as the keyboard path (tested on all profiles).
- Risky for the age group: dense 10-11 px labels, low-contrast helper text, silent loss of progress, a header that clips on iPad portrait, a fake sign-in that looks real.
- No confirmation before leaving a round, no "resume" path, no empty-state or error message when stored data is bad (H1).

## 6. Priorities

1. H1: validate stored data and wrap hydration (small change, high value).
2. H3: fix the header breakpoint and 320 px overflow.
3. H2: decide about fake auth now, before any backend work.
4. M2: add the modifier guard (one-line fix, but it exists in two files).
5. M5: delete or wire in the 3,660 dead lines.
6. M9 and M10: security headers, dependency cleanup, a `test` script, CI.
7. M4: contrast tokens, `aria-label` fix, focus trap.

## 7. Reproduce

Nothing in this folder depends on the repo being modified. To re-run, copy the repo to a working directory, then:

```
npm install --legacy-peer-deps
npx tsx --test lib/*.test.ts tests/unit/*.test.ts tests/integration/*.test.ts
npx next build && npx next start -p 3100
# in a separate folder with @playwright/test@1.62.0 and @axe-core/playwright:
npx playwright test
```

The review's unit and integration tests import from `../../lib/...`, so place them in a folder two levels below the repo root (for example `review-tests/unit`). The e2e specs import the engines from `../../work/lib/...`; adjust that path to your layout.

Environment notes: the clone had to go to a short path (`C:\nc-review`) because the default workspace path exceeded the Windows path limit. A stray empty `C:\c\nc-review\shots` folder was created by one screenshot script and was not removed (the safety check blocked the delete). It is safe to delete.

Evidence files are in `evidence/`: the full e2e logs, the first-run matrix, build log and two screenshots.

---

## 8. Delta review: upstream commit `8c9f49c` ("feat(theme): implement dark mode with system preference")

Reviewed 2026-11-20. One new commit on `main`: 38 files, +5,203 / −355 lines. It adds dark mode, a Rules guide, a Daily Goal ring, a Daily Milestone (1.5x multiplier), a Daily Leaderboard, an End-of-Session modal, a session timer, confetti and sounds. It also wires in Equation Foundry and Odds & Urns, which were dead code in section 3 (M5). `BlueprintOverview` was deleted and replaced by `GameRulesGuide`.

I tested it in a separate clean worktree (`C:\nc-review\repo-new`). The repo and its uncommitted H1–H3 fixes were not touched, and no repository code was changed for this delta.

### 8.1 Results

| Check | Result |
|---|---|
| `eslint .` | clean |
| `next build` | passes |
| `tsc --noEmit` | **fails**: 3 errors in new `lib/daily-goal.test.ts` (see D10) |
| Existing unit tests | 85 pass, 0 fail (was 68) |
| My review tests (old 55 + new 20) | 58 pass, **17 fail**. All 17 are real defects (10 old, 7 new) |
| e2e, 3 profiles (chromium, firefox, mobile-chrome), new spec, 27 tests each | 38 pass, 43 fail. Fails are defects, apart from the 2 game-start smoke tests (my selector, see 8.4) |
| e2e, existing suites, 3 profiles | all old REVIEW defects reproduce unchanged |

An earlier 8-profile run was noisy: heavy load caused timeouts, and two older tests failed only because they did not click through the new End-of-Session dialog. I updated those two helpers and reran on 3 profiles. The raw first run is in `evidence/delta-8c9f49c/new-run1.json`.

### 8.2 Old findings: status on upstream

| Finding | Status |
|---|---|
| H1 corrupt `localStorage` freezes the app | **Still present** (`matches=[null]` test fails on all profiles) |
| H2 fake sign-in, email persisted | **Still present** |
| H3 header clipped at 768 px, overflow at 320 px | **Still present, and worse** (see D1) |
| M2 Ctrl+0 swallowed while playing | Still present |
| M3 silent loss of an in-progress round | Still present |
| M4 `#7A8490` contrast, profile button name mismatch, no focus trap | Still present |
| M5 dead code | **Resolved**: both games are now reachable. They are new to the review (see 8.4) |
| M9 no security headers | Still present |

My H1–H3 patch (`evidence/delta-8c9f49c/h1h3.patch`) applies cleanly to `AccountModal`, `NumbercraftApp`, `OnlineRoomsPreview` and `storage.ts`. It **conflicts in `TopNav.tsx`**, which the commit rewrote. That file needs a manual port.

### 8.3 New findings

**D1 · High · Header overflows at tablet and phone widths.** The page scrolls sideways by 160 px at 768 px and 108 px at 820 px, and by 27 px at 320 px. The profile button's right edge sits at x=928 on a 768 px screen, so it is off-screen. The new theme button added width, and the desktop nav still appears at `md` (768 px). Reproduce: `evidence/delta-8c9f49c/ovf-probe.mjs`. Fix as before: show the desktop nav from `lg`, allow the profile label to shrink (`min-w-0`), and keep the theme button icon-only below `lg`.

**D2 · High · The Daily Leaderboard is fake and not disclosed.** `lib/daily-leaderboard.ts` invents 15 named "students" (Maya Lin, Leo Patel, Nora Vance and so on) with seeded-random scores, and ranks the child against them as "#N of 16". The card says "Top 5 scores for Daily Edition #N" and never says the peers are simulated. Entries have no `simulated` flag. In a children's app that promises "never email addresses", ranking a child against invented children is misleading. Add a visible "Practice cohort (simulated)" label, or remove the card until a real backend exists.

**D3 · Medium · Dark mode fails contrast.** axe, WCAG AA, dark theme: Notebook 64 nodes, Daily 11, Dashboard 4, Games 3. Worst case on Daily: amber `#fbbf24` text on a light `#fdfbf5` surface, 1.61:1, unreadable. Cause: dark mode is about 60 global `!important` rules keyed to exact Tailwind class names (`.bg-\[\#FAF8F4\]` and so on). Any colour not in the list stays light, and accent text colours show up on slate at 2.6–3.5:1. A token-based palette (CSS variables, or Tailwind `dark:` variants, which the commit already enables with `@custom-variant`) would fix this properly.

**D4 · Medium · End-of-Session modal.**
- It appears after an *idle* visit to Daily or any arena. Leaving Daily after one second shows "Solved 0 · Accuracy — · Time 00:01". It should show only when something was played.
- Every nav out of an arena now needs a second click.
- It sets `role=dialog aria-modal` but does not move focus into the dialog, does not trap Tab (focus escaped in 12 presses) and does not restore focus on close. `AccountModal` has the same gap (M4).

**D5 · Medium · Daily Goal credit and session summary are wrong for the two new games.** `daily-goal.ts` and `NumbercraftApp.tsx` give a flat **+5 solved / +5 attempted** per finished Equation Foundry or Odds & Urns match, regardless of result. A match lost with 0 exact hits earns +5 and shows 100% accuracy; two lost matches fill the 10-problem ring. The milestone multiplier also inflates "problems solved": 8 real solves display as 12. The match record does not carry per-round results (`exactHits` is computed and then dropped in `buildFoundryMatchRecord`), so the real number is not available at the call site.

**D6 · Medium · Fractional win streaks.** A boosted win adds 1.5 to the streak (`Number((n + 1.5).toFixed(2))`), so Perfect Streak progress becomes non-integer (e.g. 4.5 of 5). The seal's progress also depends on which game the daily rotation happens to pick. I recommend counting wins as 1 and showing the bonus separately.

**D7 · Low · Theme source of truth is split.** `DEFAULT_PROFILE.themePreference` is `'system'`, so `loadedProfile.themePreference ?? loadThemePreference()` can never fall through to the stored theme key. If only `numbercraft_theme_v1` exists, hydration overwrites it with `system`: the page paints dark, then flips (reproduced on Firefox). Keep one store.

**D8 · Low · UI promises seals that do not exist.** The Daily Goal ring names "7-Day Consistent Compass" and "14-Day Master Flame". Only "Three-Day Scholar" exists in `achievements.ts`.

**D9 · Low · Session timer.** `formatElapsedSessionClock(NaN)` returns "NaN:NaN". The timer is positioned with hard-coded `top-[142px]` / `top-[106px]` values tied to the header height, which break when the header wraps (see D1). Tooltips set `aria-describedby` on a wrapper span rather than on the button.

**D10 · Low · `tsc --noEmit` fails.** `lib/daily-goal.test.ts` uses `untimed` (not in `ArithmeticMatchMeta`) and the archetypes `'number-trail'` and `'factor-lock'` (not in `DailyArchetype`). The tests pass under `tsx` because it does not type-check. `next build` still passes; I did not find out why it does not report these. Add `tsc --noEmit` and a `test` script to CI (see M10).

### 8.4 Not covered, and what I could not verify

- Equation Foundry and Odds & Urns **gameplay was not automated**. Both arenas mount without page errors, and their engines pass the 85 existing unit tests, but my start-button smoke test used the wrong selector and failed on all 3 profiles. Their roughly 2,600 lines of arena code deserve a proper play-through next.
- Real Safari was never tested (WebKit and iPhone profiles only). Playwright's WebKit does not cover iOS Safari quirks.
- Dark-mode checks cover contrast only, not visual polish.
- Confetti and sound output were not verified (no audio device, canvas not inspected).

### 8.5 Priorities for this delta

1. D1: header breakpoint (re-port the H3 fix onto the new `TopNav`).
2. D2: label or remove the simulated leaderboard.
3. H1 and H2 from section 3: still open and still the biggest risks.
4. D5 and D6: fix goal credit and the fractional streak before kids see wrong numbers.
5. D4: show the modal only after real activity; add focus handling.
6. D3: move dark mode to tokens.

Evidence: `evidence/delta-8c9f49c/`. New tests: `tests/unit/new-features.review.test.ts` (20) and `tests/e2e/new-features.spec.ts` (27).

---

## 9. Second delta review: upstream `c7611c3` (Firebase auth, cloud leaderboard, achievement history)

Scope: 2 new commits after `8c9f49c` (`3e72277` Firebase auth, `c7611c3` recent achievements); 43 files, +6.7k lines. Reviewed in clean worktree `C:\nc-review\repo-new`. Nothing in the repo was changed. Work was split across 4 parallel streams: static/unit (me), security, unit/integration of new libs, UI/a11y/usability (3 sub-agents), cross-browser e2e (me).

### 9.1 Results at a glance

| Check | Result |
|---|---|
| `eslint .` | clean |
| `next build` | passes |
| `tsc --noEmit` | **clean on product code** (old D10 fixed upstream); only my own review tests had type slips, now fixed |
| Repo unit suite | 96/96 pass (was 85) |
| My review tests (75, first round) | 58 pass / 17 fail, same 17 real defects as before |
| Agent unit/integration tests (111, new libs) | 84 pass / 27 fail, every failure is a real defect |
| `npm audit --omit=dev` | 6 vulnerabilities (5 high, 1 moderate), via `firebase` and `next`'s bundled `postcss` |

### 9.2 Status of earlier findings

- **Fixed upstream:** D10 (`tsc` failures).
- **Still open:** H1, H2, H3, D1 (header overflow at 768/820), D2 (simulated leaderboard, undisclosed), D3 (dark-mode contrast), D4 (end-of-session modal), D5 (flat +5 credit), D6, D8, D9.
- **Correction to D6:** the claim stands (2 boosted Factor Grid wins show streak 1.5 and unlock the 3-win seal; verified by direct probe). My first-round test checked wrong field names and the wrong game title, so it proved nothing by itself; it is rewritten and now fails for the right reason.
- **Correction:** Foundry/Odds wins do NOT unlock Factor-Grid-only seals (upstream filters on `gameTitle`). That check passes.
- **Changed by upstream:** `AuthProviderKind` no longer has `google`; `sessionKind` is now `'guest' | 'authenticated'`. The old H1 to H3 patch will conflict in more than `TopNav.tsx`.

### 9.3 New findings

**Security and privacy (children's app)**

| ID | Sev | Finding |
|---|---|---|
| S1 | High | Public leaderboard exposes a child's chosen name, uid and tier to anyone, with no sign-in (`firestore.rules:178-179`). Spec calls it "Zero-PII". |
| S2 | High | Scores are client-submitted (<= 100000), any free unverified account can post, doc IDs are random, no per-user/day cap, query is `limit(250)` with no `orderBy`. Anyone can forge top scores or push real ones out of the window. |
| S3 | High | Sign-up collects a child's email with no age gate, parental consent, privacy notice or email verification. Rules accept any email string, not tied to the auth token. |
| S4 | High | `displayName` on scores is free text with no filter and not tied to the profile: impersonation and abuse. |
| S5 | Med | `dateKey`/`weekKey` accepted for any date and not tied to each other or to server time. |
| S6 | Med | Raw Firestore error JSON (email, uid, provider data) is thrown, and `formatFirebaseAuthError` returns raw `error.message` for unknown codes. |
| S7 | Med | No account or data deletion path (GDPR/COPPA erasure). |
| S8 | Med | Guest trial gate lives only in `localStorage`; clearing one key resets it. |
| S9 | Med | Score write failures are swallowed silently (`.catch(() => {})`); NaN score is sent and rejected by rules with no feedback. |
| S10 | Med | Firestore is contacted on every guest page load (`testFirestoreConnection`). |
| S11 | Low | Password policy weak (6 on sign-in, 8 letters+digits on sign-up, no breach check); "email already in use" reveals account existence; local persistence by default on shared PCs. |
| S12 | Low | No CSP or security headers; `eslint.ignoreDuringBuilds` is on; pre-release rules plugin in `dependencies`. |
| S13 | Info | Firebase web config committed (normal), but restrict the API key by referrer and enable App Check. Default-deny rule is a no-op because Firestore ORs allows. |

**Functional and logic (unit level)**

- `game-scores.ts`: bad `dateKey` silently becomes hard-coded week `2026-W01`; NaN score/accuracy pass through; an empty `dateKey` is kept; the "all games" board ranks raw scores across different games (200 in Addition outranks 95 in Factor Grid); name truncation can split an emoji; week filter trusts stored `weekKey`.
- `guest-trial.ts`: unknown titles silently become Factor Grid; substring matching misfiles titles (e.g. "Addition Odds Drill"); missing `gameTitle`/`completedAt` throws; a real daily completion ending `.111Z` is treated as sample, which can grant a second free trial.
- `daily-goal.ts`: `clampDailyProblemGoal(Infinity)` returns 10 not 100; NaN `solved` makes the total NaN; duplicate same-day dailies each earn 3 problems.
- `achievements.ts`: NaN from progress percent and from a NaN `limit`; invalid `unlockedAt` sorts above old dates; date-only labels shift a day in negative-UTC time zones.
- `performance-dashboard.ts`: order-dependent series with invalid dates; with duplicate `dateKey` completions the last wins, so a failed retry hides an earlier solve; NaN inputs give NaN rates.
- Verified OK: unlock-pulse truth table (576 cases), ISO week boundaries, leaderboard tie-breaks and dedupe, empty-data dashboard math.

**UI, accessibility, usability**

| ID | Sev | Finding |
|---|---|---|
| N1 | High | AccountModal (and the guest-gate modal) never moves focus in, never traps it, never restores it: 31 of 40 Tab presses left the dialog; Escape drops focus to `body`. |
| N2 | Med | Escape listener is window-level and closes the modal mid-password entry, losing typed data. |
| N3 | Med | Five dashboard chart SVGs are `role="application"` with only `<title>`, no label, no table or text alternative; tooltips look mouse-only. |
| N4 | Med | Create-account error panel shows Firebase console setup steps and console links to 8 to 16 year olds (source review; form not submitted). |
| N7 | Med | Dashboard overflows horizontally at 320px (327px). |
| N8 | Med | Dashboard contrast failures also in light theme (#7A8490 on white at 11px, 3.79:1). |
| N5 | Low | Profile button's accessible name ("Open student profile and mastery seals") does not contain its visible text "Sign In / Register" (WCAG 2.5.3). |
| N6 | Low | No `autocomplete` attributes on auth fields. |
| N9 | Low | Leaderboard skeleton uses `animate-pulse` without a reduced-motion guard. |

Checked and fine: reduced-motion disables the unlock pulse; guest gate copy shows after one trial; heading order; tablist semantics; axe finds 0 violations in the account dialog.

### 9.4 Not covered

Rules emulator tests (`firestore.rules.test.ts`) were not run; no sign-up or sign-in was submitted (live Firebase project); gameplay of Foundry and Odds & Urns still not automated; no real Safari; chart keyboard focus order not tested live.

### 9.5 Cross-browser e2e on `c7611c3` (Chromium, Firefox, mobile Chrome)

Result: **111 passed, 97 failed, 38 skipped** (15.9 min). The failures need sorting, because many belong to old tests written for the previous product:

- **Real product defects confirmed again:** header overflow at 320/768/820 (D1); dark-mode contrast on Games, Daily, Dashboard, Notebook (D3); end-of-session modal on idle visits and without focus trap (D4); undisclosed simulated leaderboard (D2); theme key ignored without a saved profile (D7); no security headers at all (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; `X-Powered-By: Next.js` exposed); axe now reports a serious `label-content-name-mismatch` on the Games and Rules screens (the profile button, N5); a guest page load calls Google/Firebase backends (S10); horizontal scroll at 320, 375 and 768 in Chromium and Firefox.
- **Stale old tests, not product bugs:** the old sign-in tests assumed the previous fake email "sign-in"; real Firebase auth replaced it, so that old privacy finding (any email plus any password "signs in") is resolved by the new commit. The Blueprint tab no longer exists. The Foundry/Odds start-button tests still use a wrong selector.
- **Unverified, need selector work:** the new weak-password, age/guardian and guest-trial-lock tests timed out because the profile button's accessible name no longer matches the text the test clicks (itself N5). Treat them as not run, not as passes. The guest gate was confirmed manually by the UI agent.
- Webkit, Edge, Chrome, tablet and mobile Safari were not rerun on this commit (the earlier 8-browser matrix applies to `8c9f49c` only).

### 9.6 What to fix first (suggested order)

1. S1 to S4: make the leaderboard non-public or anonymised, move score writes server-side, add consent and email verification for children, filter display names.
2. N1: focus management for all modals.
3. Add security headers (CSP, frame, referrer, HSTS).
4. D1, N7: header and dashboard overflow; D3, N8: dark and light contrast.
5. D2: label simulated players; D5/D6: credit and streak math.
6. Remove the Firebase console setup panel from the user-facing error (N4).

## 10. Fixes and final verification (2026-11-26)

### 10.1 What was fixed
- H1-H3 ported to `c7611c3`.
- Server-side score checks: callable `startRound` / `submitScore`; clients can no longer write scores. This is plausibility validation, **not proof of play**.
- Nonce-based CSP, App Check wiring, Firestore rules, display-name moderation.
- Consent flow, guardian confirmation, privacy / terms / grievance pages and `docs/legal/` (**drafts: counsel review required**).
- Game, daily-challenge, keyboard, Factor Grid hover, 320px header and favicon defects.
- Switching arithmetic games mid-round now records the answered questions.
- Large files split. No file in the split set exceeds 449 lines in the second pass. Total line count did not drop: first split -1 line, second split +8.7% (target of +3% missed).

### 10.2 Results on the final build
| Check | Result |
|---|---|
| tsc, eslint | clean |
| Unit tests (lib) | 121 / 121 |
| Production build | pass |
| Firestore rules emulator | 15 / 15 |
| Functions emulator | 25 / 25 |
| e2e, 8 browser projects | all pass; 3 Firefox and 4 tablet failures in the first run passed when re-run serially (flaky under load) |

WebKit-based projects run through a local proxy that removes `upgrade-insecure-requests`, which WebKit applies to http://localhost.

### 10.3 Still open
- Leaving a round through the navigation tabs, and mid-round exits in the other games, still do not record a partial round.
- Move the global `button { min-height: 24px }` rule into `@layer base`.
- `npm audit --omit=dev`: 5 high, 1 moderate (next/postcss, firebase/grpc-js). Fixes are semver-major.
- Signed-in screens were never exercised against a real Firebase project. Nothing was deployed.
- Owner actions: deploy rules and functions **together with** the client (`docs/ops/`), Firebase console settings (App Check, Auth quotas, API key referrers, email-enumeration protection), configure a mail sender for parental consent, fill the legal placeholders, confirm the Firestore region.
- Guests no longer see the live leaderboard; unverified-email users cannot post scores; existing users have no consent record; `bun.lock` was not regenerated.
- A two-word form of one profane name passes moderation.
