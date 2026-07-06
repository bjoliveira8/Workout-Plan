# AI Autoregulation Loop — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Execute
> interactively: every git/deploy step PAUSES for the athlete's explicit approval per his
> standing rules. Run `npm run build && npm test` before every deploy.

**Goal:** Close the weekly loop — tap AI Analysis → paste JSON into Claude Code → get a
criteria-driven brief → approved changes are edited into the program and deployed to the phone.

**Architecture:** Single-file React app (`src/App.jsx`) built to `dist/index.html`. The
"analysis engine" is Claude Code following `docs/autoregulation-criteria.md` in chat — not
in-app code. This plan builds the data plumbing (bar-speed capture + JSON export), the
safety net (invariant tests), and the delivery mechanism (git + one-command deploy).

**Tech Stack:** React 18, esbuild (`build.mjs`), jsdom smoke tests (`test.mjs`), gh CLI,
GitHub Pages.

**Reference docs:** `docs/autoregulation-criteria.md` (the brain) ·
`docs/autoregulation-feature-design.md` (design) · `CLAUDE.md` (invariants & bug history).

---

## Chunk 1: Delivery foundation (git + deploy)

### Task 1: Connect repo, make private, baseline deploy

**Files:**
- Create: `deploy.mjs` (one-command deploy)
- Modify: `package.json` (add `"deploy"` script), `CLAUDE.md` (document the deploy flow)

- [ ] **Step 1 — Make the repo private** *(PAUSE for approval — touches GitHub)*
  Run: `gh repo edit bjoliveira8/Workout-Plan --visibility private --accept-visibility-change-consequences`
  Expected: repo visibility flips to private; Pages keeps working.
- [ ] **Step 2 — Initialize git locally, base on existing remote history** *(local only)*
  ```bash
  cd "/Users/brianoliveira/Downloads/workout-plan"
  git init -b main
  git remote add origin https://github.com/bjoliveira8/Workout-Plan.git
  git fetch origin
  git reset --mixed origin/main   # adopt remote history; working tree untouched
  ```
  Expected: local files now show as changes on top of the existing `main`.
- [ ] **Step 3 — Write `deploy.mjs`** — builds, tests, copies `dist/index.html` → root
  `index.html`, stages, commits, and pushes. Aborts on test failure. Prints the diff summary
  and requires an explicit `--push` flag so it never pushes unattended.
- [ ] **Step 4 — Add script** to `package.json`: `"deploy": "node deploy.mjs"`.
- [ ] **Step 5 — Document** the deploy flow + "private repo" fact in `CLAUDE.md`.
- [ ] **Step 6 — Rebuild + test.** Run: `npm run build && npm test` → Expected: PASS.
- [ ] **Step 7 — Baseline commit + first deploy** *(PAUSE for approval — pushes to GitHub)*
  Show the athlete the exact file list and commit message, then push. Verify the live page
  at https://bjoliveira8.github.io/Workout-Plan/ loads and test the phone-refresh behavior;
  add a version-stamp nudge only if the cache proves sticky.

---

## Chunk 2: Data capture + export

### Task 2: Bar-speed tag on main lifts (schema + UI)

**Files:**
- Modify: `src/App.jsx` (state + main-lift card render + settings/version), `test.mjs`

- [ ] **Step 1 — Write the failing test** in `test.mjs`: render the app, tap the bar-speed
  control on a main lift to `fast`, trigger a save, reload from the storage shim, assert the
  restored state has `barSpeed === "fast"` for that lift/week/day.
- [ ] **Step 2 — Run it, verify it FAILS** (`npm test`) — no such control yet.
- [ ] **Step 3 — Implement:** add a `barSpeed` map to the persisted bundle
  (`{week}-{day}-{exId}` → `"fast"|"on-target"|"grindy"`); render a 3-state one-tap control in
  the main-lift card header (only where `ex.wave` is set); include it in the debounced save
  bundle. Default `on-target` when absent.
- [ ] **Step 4 — Bump backup `version` 12 → 13** in `exportBackup`; make `restoreBackup` and
  load-time migration tolerate old backups (missing `barSpeed` → `on-target`). Storage key
  `pp-tracker-v3` unchanged.
- [ ] **Step 5 — Run tests, verify PASS** (`npm run build && npm test`).
- [ ] **Step 6 — Commit** (`feat: bar-speed tag on main lifts + schema v13`).

### Task 3: Structured JSON export from AI Analysis

**Files:**
- Modify: `src/App.jsx` (add `buildReviewJSON(week)`; wire a JSON copy path), `test.mjs`

- [ ] **Step 1 — Write the failing test:** log a week, call the JSON export, `JSON.parse` it,
  assert shape: `version:13`, `week`, `block`, `flags.protected/deload`, per main lift
  `rx{sets,reps,load,rir}` + `actual[]` + `barSpeed`, a `history` block with the prior
  exposure(s) of each main lift, and `autoFlags.subTwoRir`.
- [ ] **Step 2 — Run it, verify FAILS.**
- [ ] **Step 3 — Implement `buildReviewJSON(week)`** per the shape in
  `docs/autoregulation-feature-design.md`; source history from prior weeks in `logs`. Keep the
  existing text `buildReview` available (second button or toggle) so nothing is lost.
- [ ] **Step 4 — Run tests, verify PASS.**
- [ ] **Step 5 — Commit** (`feat: JSON week export for AI autoregulation`).

---

## Chunk 3: Safety net

### Task 4: WAVE invariant validation tests

**Files:**
- Modify: `test.mjs` (add invariant checks importing/parsing WAVE from the built bundle)

- [ ] **Step 1 — Write tests** asserting, across all 12 weeks: squat load ≤ 225; bench
  double weeks ≤ 195; OHP double weeks ≤ 115; no prescribed target RIR < 2; deload weeks 4/8
  unchanged shape. These run against `dist/index.html` so any future WAVE edit that breaks a
  cap fails the suite before a deploy.
- [ ] **Step 2 — Run tests, verify PASS** against current WAVE.
- [ ] **Step 3 — Commit** (`test: WAVE invariant guards (caps + RIR floor)`).
- [ ] **Step 4 — Deploy the feature** *(PAUSE for approval — pushes to GitHub)* via
  `npm run deploy -- --push` after showing the diff. Verify on the live page + phone.

---

## Weekly operating procedure (post-build, no code)

1. Athlete taps **AI Analysis** → pastes JSON here.
2. Claude applies `docs/autoregulation-criteria.md`, runs the 5-coach panel inline, returns a
   plain-language brief (per lift: hold/up/down, magnitude, rule cited, any veto).
3. Athlete approves → Claude edits `WAVE` (single edit point) for the upcoming week(s),
   `npm run build && npm test` (invariant guards must pass), shows the before/after diff.
4. Athlete gives one "yes" → `npm run deploy -- --push` → phone refresh shows new numbers.

## Out of scope (future)
Real multi-agent panel debate for borderline calls · in-app patch ingest · velocity hardware
· trend charts.
