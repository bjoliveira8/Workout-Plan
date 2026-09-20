# Astra Concurrent Block — Tracker + Training Program

## What this project is

Two coupled artifacts:

1. **The program** (`docs/12-week-concurrent-block.md`) — the Astra 12-week concurrent
   training block, **v2.0-w1**. It is the **source of truth for all training logic**.
   The tracker implements it. Its §-numbers are cited throughout this file and in code comments.
2. **The tracker** (`src/App.jsx` → `dist/index.html`) — a single-file mobile web app
   used in the gym on iPhone (GitHub Pages, Add to Home Screen).

The athlete: male, 38, 6'0", 170 lb, ten-plus years of serious strength training, regular
TrainerRoad cyclist (FTP 229 W), aerobically fit but **sprint-tissue deconditioned**.
No current injury. Tennis is excluded from this block.

**Provisional e1RMs (§5.4, low-rep derived):** OHP 129 · Bench 220 · Squat 265 · DL 500 ·
Dip +85 external · NG pull-up +72 external. Bodyweight anchor 170 lb.

### History — this repo previously held a different program

Through July 2026 this repo tracked the **Press-Priority Hybrid v1.3** program (bench/DL/OHP/squat
on Mon/Tue/Thu/Fri, 13-week cycle, tennis Wed/Sat). That program and its autoregulation brain are
preserved in `docs/archive/` — they were not deleted, and the old block's numbers are not
interchangeable with this one. Everything in the app was rewired for the new block in September 2026.
Old logs in localStorage survive untouched under session ids that the new program does not use.

## Repo layout

```
CLAUDE.md                            ← you are here
README.md                            ← quick start + deploy
package.json                         ← esbuild/jsdom/react devDeps
build.mjs                            ← bundles src/entry.jsx, inlines into dist/index.html
test.mjs                             ← jsdom smoke tests + PROGRAM INVARIANT guards
src/App.jsx                          ← the entire app: data, logic, UI, CSS (one file, by design)
src/entry.jsx                        ← mount + localStorage shim for window.storage
docs/12-week-concurrent-block.md     ← THE PROGRAM (source of truth)
docs/autoregulation-criteria.md      ← the weekly-review decision lens ("the brain")
docs/archive/                        ← the superseded Press-Priority v1.3 program + its brain
dist/index.html                      ← built artifact; THE deliverable (self-contained, ~236 KB)
index.html                           ← root copy that GitHub Pages actually serves
```

## Commands

```bash
npm install
npm run build    # → dist/index.html
npm test         # jsdom smoke suite + invariant guards (build first)
```

**Deploy:** `node deploy.mjs` builds + tests + copies `dist/index.html` → root `index.html`.
Add `--push` to commit and push. **Always show the diff and get Brian's explicit yes before
pushing** — his standing rule, and it applies to every git command, not just push. User data
survives redeploys (it lives in the phone's localStorage). After a push, pull-to-refresh the
home-screen app.

## Architecture — the parts that will bite you if you don't know them

**One component file.** All program data, helpers, the app component, and a CSS template
string live in `src/App.jsx`. Deliberate — keep it single-file.

**window.storage abstraction.** The component persists exclusively through
`window.storage.get/set` (async, `{key, value}` shape, `get` THROWS on missing key).
`src/entry.jsx` shims it onto localStorage. Storage key: **`pp-tracker-v3`** — kept from the
previous program deliberately, so no user data is destroyed by the program change. **Never
change it.** One debounced (700 ms) save of a single JSON bundle. Backup `version` is now **14**
(added `elastic`, `elasticQ`, `sprintLog`, `primerResp`, `addCheck`, `archived`; `tested` changed
shape from `{bench,ohp}` to `{ohp,dip,pullup,broad,broadBase}`).

**THE PROGRAM-COLLISION MIGRATION (do not remove).** Every saved bundle is stamped
`program: "astra-concurrent-v2"` (`PROGRAM_ID`). A bundle **without** that stamp was written by
the previous program, and its training data must not be inherited: `mon/suitcase` and `fri/squat`
are the **same exercise ids in both programs**, so an old 225 lb back squat would otherwise render
as this block's low-bar squat and as its "LAST WK" reference — wrong data, mid-session, on a
priority lift. On detecting an unstamped bundle the app moves the whole of it into `archived`
(preserved, and carried in backups), starts this block's state clean, keeps theme / tone / vibrate /
auto-rest, and resets `planName` and `dayMap` to the new defaults. The migration is idempotent —
a second open must not re-archive over the real archive. `test.mjs` asserts all of it, including
that the old squat does **not** bleed through.

**THE FOCUS-LOSS BUG (fixed; do not reintroduce).** Components were once defined *inline* inside
the app component. Every state change — including every 250 ms timer tick — created new component
identities, React remounted the subtree, and inputs lost focus. The fix has two legs:
1. `TimerBar` and `SessionClock` are **module-level components that own their own tick state**.
2. Cards/rows/settings are **plain render functions** (`renderCard(ex)`, called as functions,
   not `<Card/>`), so element identity is stable across parent re-renders.
Never define a component inside the app component. `test.mjs` guards this.

**THE BORDER-RESET BUG (fixed; do not reintroduce).** The global reset `.app button{border:none}`
(specificity 0,1,1) silently beat single-class button styles (0,1,0) and forced a **3px medium**
border. `.app button` no longer sets `border` or `color`. Truly borderless buttons set
`border:none` explicitly. `test.mjs` guards that the reset never re-adds it, and that
`inlbtn/ghost/solid/rxfill/ytbtn/donebtn/finishbtn/bs-btn` keep `0.5px` hairlines.

**THE STALE-BUILD TRAP (guarded).** A failed `npm run build` leaves the previous `dist/index.html`
in place, and the suite would then pass against the old bundle. `test.mjs` now refuses to run if
`dist/index.html` is older than `src/App.jsx`, `src/entry.jsx`, or `build.mjs`. This caught a real
false pass during the v2.0 rewrite — do not remove it.

**Keys are day-qualified.** `REST` and `EX_INDEX` are keyed **`"day-exId"`**, not `exId`, because
the same exercise id appears on more than one day (`copen` on Monday and Friday, `elastic` and
`addcheck` on three days). `restKey(exId)` builds the lookup. Logs remain keyed
`logs[week][dayId][exId][setIndex]`.

**Top sets and back-offs share one card.** The block prescribes them together
("+37.5 × 6, then 3 × 6 @ +22.5"), so `getRx` returns a **`rows[]` array of per-set targets**.
`renderSetRow` reads `rx.rows[i]` for placeholders and for the `Rx` fill button. A top row is
tagged `T`, the week-1 OHP calibration single is tagged `C` and its `Rx` button is disabled.
When a prescription is self-describing (`rx.selfDescribing`), the headline must NOT be prefixed
with `{sets}×` — that produced "4×1×5 + 3×5" during the rewrite.

**Auto-rest logic** (in `setEntry`): the rest timer auto-starts when a set row *transitions* to
complete (weight AND reps present) or when RIR is first entered. Gated by `settings.autoRest`.
Supersetted exercises have `REST[key] = null` and never get timers.

**Five card kinds.** `renderCard` dispatches on `ex.kind`: `elastic`, `sprint`, `primer`, `check`,
and the default set-grid card. The first four have **no set grid and no `rx.sets`** — `isAutoDone`
returns false for them unless `rx.sets > 0`, otherwise they report themselves complete before
anything is logged (a real bug caught in review).

**Tones** are Web-Audio-synthesized, iPhone-alert style. AudioContext is created lazily on first
user gesture (`ensureAudio`) because browsers block autoplay.

## Design system — hard-won user preferences (violate at your peril)

- Dark "Iron" theme default; 4 more skins via CSS custom properties. All colors reference vars —
  never hardcode hex in components.
- **Borders: 0.5px hairlines at ~6–12% accent opacity.** The user pushed back on border boldness
  FOUR times. Never ship thicker/brighter button borders.
- Buttons: Barlow Condensed, 700, uppercase, letter-spacing. Numbers/inputs: tabular-nums.
  Body text: Inter.
- Exercise names wrap to 2 lines (`-webkit-line-clamp:2`) — never single-line-ellipsize.
- **`.rx` must WRAP.** This block's prescriptions are long ("1×5 + 3×5 @ +32.5 lb 45%") and the
  primer line is longer still. `white-space:nowrap` on `.rx` caused **66px of horizontal overflow
  at 375px**. `.rx` wraps; `.rx>span` stays nowrap so tokens never split. **Re-check
  `document.scrollWidth - clientWidth === 0` at 375px after any card change.**
- Every exercise carries a category tag AND a **cut-priority chip** (`never-cut` / `cut-2nd` /
  `cut-1st`) from §5.2 — green / slate / warn. The chips are the in-gym cut order.
- Header (week wave strip, day tabs) is NOT sticky.

## Program invariants (from the program doc — the tracker must enforce these)

- **`WAVE` in App.jsx is the single edit point for every load.** Entry shapes:
  `{s,r,l,rl?}`, `{top:{s,r,l}, back:{s,r,l}}`, or `null` (off that week).
- **Sessions are Sunday / Monday / Wednesday / Friday.** Fresh slots: Sun = weighted dip,
  Mon = conventional deadlift, Wed = strict OHP, Fri = low-bar squat. Never more than one heavy
  pressing priority per session.
- **Week-12 target loads are hard caps** (§5.5): OHP 125 · dip +50 · pull-up +45 · squat 245 ·
  DL 455 · bench 205. Week 11 rehearses the exact test load on OHP, dip, and pull-up.
- **Deadlift**: one exposure every 7 days on a **fixed weekday (Monday)**, 12 exposures, crisp
  doubles at RPE 7–8, **no end-block max test**. (The program doc says "13 exposures" — that is an
  arithmetic conflict inside the source, quoted and resolved in its §2. Twelve is correct.)
- **Deloads are weeks 6 and 12.** Week 12 is deload **plus** testing, and the test session is
  **week 12 Wednesday** (`TEST_WEEK`/`TEST_DAY`) — there is no week 13.
- **Volume floors** (§5.3): pressing 16–20 · vertical pull 8–12 · horizontal pull 6 · exactly 2
  lower-body exposures · shoulder health 3 of 4 · direct abs 3 · **press:pull ≤ 1.30**. The app
  computes these live from `WAVE` (`weekVolume`) and shows them in the Week Volume Floors panel.
  Deload weeks waive the three volume floors they deliberately undershoot; the structural ones
  still hold.
- **RIR floor is phase-dependent** (`RIR_FLOOR`): 2 in accumulation, 1 in intensification, 4 in a
  deload week. Two sets below the floor in a week is a Level 1 signal — hold the next increment and
  cut the Monday OHP technical exposure first.
- **Plyometrics** (§5.8): tier 3 is **absent before week 5**; no tier rises more than **15% week
  over week**, measured against the highest previously tolerated volume in that tier (the
  post-deload restore reading declared in the program's §2). Weeks 6 and 12 run low tier only.
- **Sprinting** (§5.9): **250 m ceiling per session** (block peak is 230 m in week 11); hill only
  through week 6, flat from week 7.
- **Copenhagen** (§5.10): short lever first; long lever not before three clean weeks; 6–8 reps
  per side throughout. The **adductor reactive gate** outranks everything — an abnormal check
  raises a block-level banner and holds running and tier progressions.
- **Absolute exercise exclusions:** Turkish get-up · Bulgarian split squat · barbell RDL ·
  dumbbell row · cable row · cable flye. Never prescribe them, offer them as alts, or place them
  in fallback logic. `test.mjs` greps the source for all six.
- **Conflict hierarchy** (§5.1), which settles every trade-off: health → OHP/dip/pull-up →
  prescribed TrainerRoad → elastic quality → deadlift maintenance → squat/bench → secondary volume.
- **Out of scope — never add:** nutrition prescriptions, TrainerRoad ride content (intervals,
  duration, power targets), wearable-derived rules (HRV, sleep, readiness). The app may only
  recommend moving a ride, making it easy, or skipping it.

`test.mjs` enforces the caps, the deadlift exposure count, the deload direction, the tier-3 gate,
the 15% plyometric rule, the sprint ceiling, the hill→flat transition, the Copenhagen ladder, and
the exercise exclusions — so an autoregulation edit to `WAVE` can never silently breach the block.

## Weekly AI-review loop

The **AI Analysis** button copies a structured week report (`buildReviewJSON`, version 14) to the
clipboard: prescribed vs actual per lift, bar speed, elastic contacts by tier, sprint reps and
metres against the ceiling, primer response, adductor checks, the live volume audit, minute
budgets, and trailing history per main lift. Brian pastes it into Claude Code, which applies
`docs/autoregulation-criteria.md`, returns a plain-language brief, and — on approval — edits
`WAVE` and deploys. A text report is also available in Settings. No API calls from the app.

## Backlog / next steps

1. Patch-schema override layer so a Claude review can write next week's prescriptions directly.
2. Cycle 2: regenerate `WAVE` from the week-12 test results.
3. Optional PWA hardening: manifest + service worker for offline.
4. Optional: pin specific YouTube video IDs if Brian supplies links (▶ currently opens a search).

## Testing discipline

`npm run build && npm test` before every deliverable, and **read the build output** — a failed
build is not a failed test run. The suite simulates real typing (native value setter + input
events), guards the three historic bugs (focus-loss, border-reset, stale-build), and enforces
every program invariant above. Extend it when you add features.
