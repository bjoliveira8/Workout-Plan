# Astra Synthesized Concurrent Block — Tracker + Training Program

## What this project is

Two coupled artifacts:

1. **The program** (`docs/12-week-concurrent-block-v3.md`) — the Astra Synthesized
   Concurrent Block, **v3.0-syn1**. It is the **source of truth for all training logic**.
   The tracker implements it. Its §-numbers are cited throughout this file and in code comments.
2. **The tracker** (`src/App.jsx` + `src/program.js` → `dist/index.html`) — a single-file
   mobile web app used in the gym on iPhone (GitHub Pages, Add to Home Screen).

The athlete: male, 38, 6'0", 170 lb, ten-plus years of serious lifting, regular TrainerRoad
cyclist (3–4 h/week, FTP 229 W), aerobically fit but sprint-tissue deconditioned. Mild
next-day running-associated adductor tightness without altered gait; no current injury.
Long femurs, shorter torso. 2.5 lb total microloading available; roughly 5% outdoor hill.

**Time is the binding constraint of this block.** Four strength sessions under a 75-minute
hard cap, plus **15 additional minutes on each of Wednesday and Friday, travel included**,
for all impact and running. That 15-minute figure is Brian's own answer, interpreted as
per-day; the plan's §1 names it as the weakest consequential assumption in the whole block.

### Status — the plan is loaded, not approved

Brian approved the ten conflict resolutions C01–C10. He has **not** approved the training
plan itself, and its author does not claim he did. All 13 of the plan's own checks are
documented in `docs/source/SYNTHESIS_VERIFICATION.md`: nine pass, four pass with an approved
exception, and two carry an honest *unverified* half — measured time feasibility and actual
readiness for impact, neither settleable on paper. Do not describe this block as verified
training advice. It is arithmetic that checks out.

### History — this repo has carried three programs

Press-Priority Hybrid v1.3 (through July 2026) → Astra Concurrent Block v2.0-w1 (September
2026, one day, never trained) → this block. All are preserved in `docs/archive/`, none are
interchangeable, and old training data is preserved in the app too (see the migration below).

## Repo layout

```
CLAUDE.md                            ← you are here
README.md                            ← quick start + deploy
package.json                         ← esbuild/jsdom/react devDeps
build.mjs                            ← bundles src/entry.jsx, inlines into dist/index.html
test.mjs                             ← jsdom smoke tests + PROGRAM INVARIANT guards
src/App.jsx                          ← the app: logic, UI, CSS (one file, by design)
src/program.js                       ← GENERATED prescriptions — the single edit point for loads
src/entry.jsx                        ← mount + localStorage shim for window.storage
tools/gen-program.mjs                ← one-shot: source JSON → src/program.js
tools/gen-block-doc.mjs              ← one-shot: source narrative → the program doc, with a cross-check
docs/12-week-concurrent-block-v3.md  ← THE PROGRAM (source of truth)
docs/autoregulation-criteria.md      ← the weekly-review decision lens ("the brain")
docs/source/                         ← the planning session's own artifacts, vendored read-only
docs/archive/                        ← the two superseded programs and their brains
dist/index.html                      ← built artifact; THE deliverable (self-contained, ~339 KB)
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
home-screen app. **Use the full absolute project path in every command you give him.**

## Architecture — the parts that will bite you if you don't know them

**The program is generated, the app is hand-written.** `src/program.js` is emitted once by
`tools/gen-program.mjs` from `docs/source/SYNTHESIZED_PRESCRIPTIONS.json` (48 sessions, 402
prescribed rows). After that it is committed and **hand-edited by the weekly review** — it is
this block's `WAVE`. **Never re-run the generator to apply a weekly change**; it would discard
every accepted edit. Run it only to load a genuinely new block.

**Sessions are a per-week table, not a day list with a load wave.** Composition varies by
week: week 12 Wednesday carries no overhead press at all, and the three target tests replace
Friday's ordinary exposures. So `SESSIONS[week][dayId]` holds the objective, the minute
budget, the timed block plan, the impact script and the items. `DAYS` is only four shells.

**Strings are interned.** The plan repeats block details and impact scripts across 48
sessions — 147 KB of text, 124 distinct strings. `program.js` ships a string table and
rehydrates at module load, saving ~110 KB in the bundle. Everything downstream sees ordinary
strings; don't "simplify" the rehydration loop away.

**window.storage abstraction.** The component persists exclusively through
`window.storage.get/set` (async, `{key, value}` shape, `get` THROWS on missing key).
`src/entry.jsx` shims it onto localStorage. Storage key: **`pp-tracker-v3`** — kept across all
three programs deliberately, so no user data is destroyed by a program change. **Never change
it.** One debounced (700 ms) save of a single JSON bundle. Backup `version` is now **15**.

**THE PROGRAM-COLLISION MIGRATION (do not remove).** Every saved bundle is stamped
`program: "astra-synthesis-v3"` (`PROGRAM_ID`). A bundle carrying a different id was written by
an earlier program, and its training data must not be inherited: `squat`, `dl`, `pullup` and
`copen` are live ids in more than one program, so an old log would otherwise render as this
block's prescription and as its "LAST WK" reference — wrong data, mid-session, on a priority
lift. On detecting a foreign stamp the app moves the whole bundle into `archived`, starts this
block's state clean, keeps theme / tone / vibrate / auto-rest, and resets `planName`.

`archived` is a **LIST**, and that matters: this repo has had three programs, so archiving the
v2.0 block must not clobber the Press-Priority archive already inside it. Older saves held a
single object; `asArchiveList` lifts that shape into the list. The migration is idempotent — a
bundle with no training data adds nothing, so re-opening cannot stack empty entries.
`test.mjs` asserts all of it, including that both archives survive.

**THE FOCUS-LOSS BUG (fixed; do not reintroduce).** Components were once defined *inline*
inside the app component. Every state change — including every 250 ms timer tick — created new
component identities, React remounted the subtree, and inputs lost focus. The fix has two legs:
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
in place, and the suite would then pass against the old bundle. `test.mjs` refuses to run if the
bundle is older than `src/App.jsx`, `src/program.js`, `src/entry.jsx` or `build.mjs`. This caught
a real false pass during the v2.0 rewrite — do not remove it.

**THE `.rx` OVERFLOW TRAP (fixed twice).** The prescription line must wrap. In v2.0,
`white-space:nowrap` on `.rx` produced 66px of horizontal overflow at 375px. In v3.0 the same
bug returned one level down: `.rx>span{nowrap}` was fine for tokens like "@ 105 lb", but this
block puts whole sentences of accessory guidance in `.rx-load` ("light trial setting/pair →
2–3 RIR; save load; ≥4 RIR in W6/12") — 426px of content in a 375px column, on every session.
Only `.rx>span:first-child` may be nowrap. **Re-check `scrollWidth - clientWidth === 0` at
375px in a real browser after any card change** — jsdom does no layout and will not catch it.

**Each prescription carries its own reserve.** `rirTarget()` reads the item's own `rir` field
("2–3", "3+", "≥2; aim 2") for the placeholder and the warning threshold, falling back to the
week floor. "RPE 7.5–8.5" on the week-1 calibration is an effort target, not a reserve, so it
gets no numeric floor and never warns.

**Tests are date-sensitive.** The app opens on whichever session matches today's weekday, so
`test.mjs` clicks the SUN tab before asserting anything. This bit the suite once: it passed on
a Sunday and failed the next morning.

**Five card kinds.** `renderCard` dispatches on `ex.kind`: `impact`, `run`, `primer`, `check`,
and the default set-grid card. The first four have **no set grid and no `rx.sets`** —
`isAutoDone` returns false for them unless `rx.sets > 0`, otherwise they report themselves
complete before anything is logged (a real bug caught in review).

**Tones** are Web-Audio-synthesized, iPhone-alert style. AudioContext is created lazily on
first user gesture (`ensureAudio`) because browsers block autoplay.

## Design system — hard-won user preferences (violate at your peril)

- Dark "Iron" theme default; 4 more skins via CSS custom properties. All colors reference vars
  — never hardcode hex in components.
- **Borders: 0.5px hairlines at ~6–12% accent opacity.** The user pushed back on border
  boldness FOUR times. Never ship thicker/brighter button borders.
- Buttons: Barlow Condensed, 700, uppercase, letter-spacing. Numbers/inputs: tabular-nums.
  Body text: Inter.
- Exercise names wrap to 2 lines (`-webkit-line-clamp:2`) — never single-line-ellipsize.
- Every exercise carries a category tag AND a **cut-priority chip** (`never-cut` / `cut-2nd` /
  `cut-1st`) — green / slate / warn. The chips are the in-gym cut order.
- Header (week strip, day tabs) is NOT sticky.
- The week strip's bar heights are **derived** from each week's compound work-set count
  (33 normally, 19 in week 6, 15 in week 12), not from an invented "intensity" percentage.

## Program invariants (the tracker must enforce these)

- **Sessions are Sunday / Monday / Wednesday / Friday.** Fresh slots: Sun = heavy dip double,
  Mon = pull-up first then deadlift, Wed = strict OHP, Fri = low-bar squat. Never more than one
  heavy pressing priority per session.
- **Week-12 targets are caps at equal-or-higher reps** (§1): OHP 125×2 · dip +50×6 ·
  pull-up +45×5. A heavy *double* legitimately sits above the six-rep dip load — lowering reps
  while raising load is one progression, not two. The cap compares like reps.
- **The test session is week 12 FRIDAY** (`TEST_WEEK`/`TEST_DAY`), not Wednesday. Broad jump
  first on the impact clock, then OHP → dip → pull-up with five minutes between each.
- **Deadlift**: one exposure every 7 days on a **fixed Monday**, 12 exposures — ten heavy
  (2×2 @ 450) and two light (1×2 @ 390 in weeks 6 and 12), **no end-block max** (C01, C02).
- **Volume floors** (§19): pressing 18 · vertical pull 9 · row 6 · exactly 2 lower-body days ·
  3 shoulder-health days · 3 direct-abs days · 2 adductor days · **press:pull ≤ 1.30**
  (1.20 normally). Weeks 6 and 12 waive the three volume floors they deliberately undershoot
  (C09); the **structural** floors are not waived and still hold.
- **Reserve floor**: 2 in a normal week (C08: ≥2 RIR, aiming for 2 — easier qualifies), 4 in
  weeks 6 and 12. Two sets below the floor in a week means hold the next increment.
- **Impact** (§12): **six high-tier contacts a week**, absent before week 5. Weeks 1 and 12
  carry three maximal broad jumps as the C03 measurement exception. Weeks 6 and 12 are low
  tier only. Impact never lands on Sunday or Monday, and never after a ride or after lifting.
- **Running** (§13): Friday only, after the jumps and before lifting. **No running in weeks 1
  or 12.** Hill through week 8; flat only from week 9, and terrain is the *only* change at flat
  entry. Ceiling **60 acceleration metres and 120 total metres per session**. Every rep gets an
  equal runout. The adductor gate outranks all of it.
- **Copenhagen** (§14): knee-supported **short lever, 3×6 per side**, Monday and Friday, every
  week including deloads. The long lever is not an automatic progression and needs review.
- **Time**: all 48 sessions planned inside the 75-minute cap; block minutes must sum to the
  session total. An actual 82-minute session is a failed constraint, not a passed budget.
- **Absolute exercise exclusions:** Turkish get-up · Bulgarian split squat · barbell RDL ·
  dumbbell row · cable row · cable flye. Never prescribe them, offer them as alts, or place
  them in fallback logic. `test.mjs` greps the app and the program data for all six.
- **No primary-lift substitution is scheduled.** Only rows, shoulder work and trunk work carry
  an alt. `test.mjs` asserts a primary lift offers none.
- **Conflict hierarchy** (§5): tissue tolerance → OHP/dip/pull-up → prescribed TrainerRoad →
  elastic and acceleration quality → heavy conventional specificity → squat/bench → secondary
  volume.
- **Out of scope — never add:** nutrition prescriptions, TrainerRoad ride content, wearable-
  derived rules (HRV, sleep, readiness). The app may only recommend moving a ride, making it
  easy, or skipping it. Never advance impact to compensate for a missed ride.

`test.mjs` enforces every one of those mechanically, and each guard has been mutation-tested —
the program was deliberately broken twelve ways and every break was caught. `tools/gen-block-doc.mjs`
additionally re-reads the verification tables *inside the program document* and refuses to
publish it if they disagree with the prescription data, including re-adding every printed
minute sum. The document and the app cannot drift apart silently.

## Weekly AI-review loop

The **AI Analysis** button copies a structured week report (`buildReviewJSON`, version 15) to
the clipboard: prescribed vs actual per lift with system loads, bar speed, impact contacts by
tier, running reps and metres against the ceiling, primer response, adductor checks, the live
volume audit, minute budgets and trailing history per loaded lift. Brian pastes it into Claude
Code, which applies `docs/autoregulation-criteria.md`, returns a plain-language brief, and — on
approval — edits `src/program.js` and deploys. A text report is also available in Settings. No
API calls from the app.

## Backlog / next steps

1. Patch-schema override layer so a Claude review can write next week's prescriptions directly.
2. Cycle 2: regenerate the block from the week-12 test results.
3. Optional PWA hardening: manifest + service worker for offline.
4. Optional: pin specific YouTube video IDs if Brian supplies links (▶ currently opens a search).

## Testing discipline

`npm run build && npm test` before every deliverable, and **read the build output** — a failed
build is not a failed test run. The suite simulates real typing (native value setter + input
events), guards the four historic traps (focus-loss, border-reset, stale-build, `.rx` overflow),
walks all 48 sessions for render errors, and enforces every program invariant above. Extend it
when you add features. The one thing it cannot do is layout: check 375px overflow in a real
browser by hand.
