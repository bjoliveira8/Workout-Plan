# Astra Synthesized Concurrent Block — Tracker + Training Program

## What this project is

Two coupled artifacts:

1. **The program** (`docs/12-week-concurrent-block-v4.md`) — the Astra Synthesized
   Concurrent Block, **v4.0-syn2**. It is the **source of truth for all training logic**.
   The tracker implements it. Its §-numbers are cited throughout this file and in code comments.
2. **The tracker** (`src/App.jsx` + `src/program.js` → `dist/index.html`) — a single-file
   mobile web app used in the gym on iPhone (GitHub Pages, Add to Home Screen).

The athlete: male, 38, 6'0", 170 lb, ten-plus years of serious lifting, regular TrainerRoad
cyclist (3–4 h/week, FTP 229 W), aerobically fit but sprint-tissue deconditioned. Mild
next-day running-associated adductor tightness without altered gait; no current injury.
Long femurs, shorter torso. 2.5 lb total microloading available; roughly 5% outdoor hill.

**Time is the binding constraint, and V2 changed how it binds.** Strength time is now a
**guideline, not a hard cap** — an explicit instruction. Normal sessions project to
66.5–73.5 minutes and **week-12 Friday is deliberately 94 minutes** of testing. What remains
a HARD cap is the impact clock, and it now differs by day: **Wednesday 15 minutes, Friday
30**, both starting before travel. The fullest Wednesday leaves only **65 seconds** for
transit, which is the constraint most likely to bind in practice.

### Status — the plan is loaded, not approved

The author's own grade is **"A, provisionally"** and the copy is explicitly **not labeled
approved**. Twenty revision checks plus the original thirteen are documented in
`docs/source/SYNTHESIS_VERIFICATION_V2.md`; several pass with an explicitly approved
exception. Measured time, ride intensity, recovery and every target outcome remain
**unverified** — the source says so and so should you. Do not describe this block as
verified training advice. It is arithmetic that checks out.

### History — this repo has carried four programs

Press-Priority Hybrid v1.3 (through July 2026) → Astra Concurrent Block v2.0-w1 (September
2026, one day) → Synthesized v3.0-syn1 (21 September 2026, one day) → this block. All are
preserved in `docs/archive/`, none are interchangeable, and old training data is preserved
in the app too (see the migration below).

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
docs/12-week-concurrent-block-v4.md  ← THE PROGRAM (source of truth)
docs/autoregulation-criteria.md      ← the weekly-review decision lens ("the brain")
docs/source/                         ← the planning session's own artifacts, vendored read-only
docs/archive/                        ← the three superseded programs, their brains and v3's sources
dist/index.html                      ← built artifact; THE deliverable (self-contained, ~484 KB)
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

**COACHING AMENDMENTS (`tools/gen-program.mjs`, `applyAmendments`).** The app does NOT run the
source plan unmodified. Three changes were made after an adversarial review, at Brian's
instruction, and they are applied to the source structure *before* the build so the timing and
audit arithmetic recomputes itself:
- **A1** — calf raises on both lower days and a Monday lying leg curl; Friday's single-leg RDL
  doubled. The source gave the calf zero direct work and the hamstring twelve reps a week while
  prescribing 40–60 pogo contacts plus accelerations. Cost: fourteen ordinary sessions at
  78–78.5 min, capped at `META.strengthCeilingMinutes` (80).
- **A2** — week-11 dip back-offs 3×5 → 3×6 @ +47.5, so the six-rep ladder climbs in even
  2.5 lb steps into the test instead of ending on a +5.
- **A3** — the broad-jump measurement withdrawn; `META.targets.broad` is gone, weeks 1 and 12
  carry no high-tier contacts, and week-12 Friday carries **no power work at all**. The
  training jumps in weeks 5 and 7–11 stay.

`tools/gen-block-doc.mjs` asserts all three are present in the generated program before it will
publish the block document, and `test.mjs` mutation-guards each one. If you regenerate, the
amendments come along; if you delete them from the generator, the doc build fails loudly.

**The program is generated, the app is hand-written.** `src/program.js` is emitted once by
`tools/gen-program.mjs` from `docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json` (48 sessions, 397 source rows
→ 431 after the amendments above, 24 impact sessions). After that it is committed and **hand-edited by the
weekly review** — it is
this block's `WAVE`. **Never re-run the generator to apply a weekly change**; it would discard
every accepted edit. Run it only to load a genuinely new block.

**Sessions are a per-week table, not a day list with a load wave.** Composition varies by
week: week 12 Wednesday carries no overhead press at all, and the three target tests replace
Friday's ordinary exposures. So `SESSIONS[week][dayId]` holds the objective, the minute
budget, the timed block plan, the impact script and the items. `DAYS` is only four shells.

**Strings are interned — and the interning has bitten twice.** The plan repeats block
details, progression rules and impact gates across 48 sessions. `program.js` ships a string
table and rehydrates at module load; everything downstream sees ordinary strings, so don't
"simplify" the rehydration loop away.

Two rules make it safe, and `tools/gen-program.mjs` now ASSERTS both:
1. **Only prose is interned** (≥25 characters). Short values are left alone, which is why a
   ramp load of `"BW"` and an exercise id of `"ohp"` survive as strings.
2. **A field that is rehydrated may never also hold a number.** `id` was once missing from
   the rehydrate list and all 397 exercise ids shipped as integers — log keys, rest lookups
   and alt swaps would all have broken silently against real saved data. Then `reps` was on
   the list while `run.reps` held `3`, and the running card rendered a block of warm-up prose
   as its rep count. The generator throws on either mistake now; `test.mjs` also asserts every
   id is a string.

**window.storage abstraction.** The component persists exclusively through
`window.storage.get/set` (async, `{key, value}` shape, `get` THROWS on missing key).
`src/entry.jsx` shims it onto localStorage. Storage key: **`pp-tracker-v3`** — kept across all
four programs deliberately, so no user data is destroyed by a program change. **Never change
it.** One debounced (700 ms) save of a single JSON bundle. Backup `version` is now **16**.

**THE PROGRAM-COLLISION MIGRATION (do not remove).** Every saved bundle is stamped
`program: "astra-synthesis-v4"` (`PROGRAM_ID`). A bundle carrying a different id was written by
an earlier program, and its training data must not be inherited: `squat`, `dl`, `pullup` and
`copen` are live ids in more than one program, so an old log would otherwise render as this
block's prescription and as its "LAST WK" reference — wrong data, mid-session, on a priority
lift. On detecting a foreign stamp the app moves the whole bundle into `archived`, starts this
block's state clean, keeps theme / tone / vibrate / auto-rest, and resets `planName`.

`archived` is a **LIST**, and that matters: this repo has had four programs, so archiving the
v3 block must not clobber the two archives already inside it. Older saves held a
single object; `asArchiveList` lifts that shape into the list. The migration is idempotent — a
bundle with no training data adds nothing, so re-opening cannot stack empty entries.
`test.mjs` asserts all of it with a three-deep archive, including that every older one survives.

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

**Four card kinds.** `renderCard` dispatches on `ex.kind`: `impact`, `run`, `check`, and the
default set-grid card. The first three have **no set grid and no `rx.sets`** — `isAutoDone`
returns false for them unless `rx.sets > 0`, otherwise they report themselves complete before
anything is logged (a real bug caught in review). The V1 `primer` card is **gone**: V2
replaced the generic kettlebell circuit with explicit daily power rows, which are ordinary
set-grid cards carrying a power-quality control instead of bar speed.

**The Friday broad jump is a prescribed row on the IMPACT clock** (`clock: "impact"`), not the
strength clock. `exercisesFor` filters it out of the set grid and `impactItemsFor` renders it
inside the impact card, because it is paid for out of the 15/30-minute budget.

**The warm-up block is named "Warm-up" in V2, not "Preparation".** The header matched only
the old name and silently read "0 min"; it now matches either, and `test.mjs` guards it.

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
  Mon = pull-up first then deadlift, Wed = strict OHP, Fri = jumps then squat.
- **Three targets, not four**: OHP 125×2 · dip +50×6 · pull-up +45×5. The broad jump was
  withdrawn (A3). They are caps at equal-or-higher reps.
  A heavy *double* legitimately sits above the six-rep dip load — lowering reps while raising
  load is one progression, not two. The cap compares like reps.
- **The test session is week 12 FRIDAY** (`TEST_WEEK`/`TEST_DAY`), 94 minutes by design, with
  **ten minutes** between tests (raised from five in V2 to protect the later ones).
- **Week 13 is an OPTIONAL deferred-test slot** (`WEEK13`): not one of the 48, no deadlift,
  never a retry of a completed or failed target, and its result is labelled week 13.
- **Deadlift**: one exposure every 7 days on a fixed Monday, 12 exposures — ten heavy
  (2×2 @ 450) and two light (1×2 @ 390 in weeks 6 and 12), **no max** (C01, C02).
- **Volume floors** (§19), computed from the plan's OWN `work_set` flag: pressing 18 ·
  vertical 9 · horizontal 6 · **press:pull ≤ 1.30** (1.20 normally) · direct biceps 4 sets.
  Weeks 6 and 12 waive those four (C09). **Structural floors are never waived**: exactly 2
  lower days · 3 shoulder days · **4 direct-abdominal days** · 4 power days · 4 unilateral
  days · 2 adductor days · 2 dynamic-rotation patterns · 2 carry days (flexible).
- **Read the plan's flags, never infer an exposure from `family`.** `direct_abdominal` spans
  three families (abs, anti-rotation, dynamic rotation) — four exposure days, where counting
  family `abs` gives two. The generator carries `workSet`, `power`, `unilateral`,
  `lowerStrength`, `directAbs`, `shoulderHealth`, `directArm` and `dynamicRotation` through
  for exactly this reason.
- **Ramps, power, shoulder-health and core work do NOT inflate the pressing/pulling floors.**
  That is what `workSet` is for, and the review export marks every row `countsTowardFloors`.
- **Reserve floor**: 2 in a normal week (C08: ≥2 RIR, aiming for 2 — easier qualifies), 4 in
  weeks 6 and 12. An RPE instruction ("RPE ≤4; fast intent") is an effort target, not a
  reserve, so `rirTarget()` gives it no numeric floor and it never warns.
- **Impact** (§12): **six high-tier contacts a week**, absent before week 5 — and now before
  week 5 includes week 1, because the measurement that used to justify three maximal jumps
  there is gone. **No impact session is flagged `test` any more.** Impact never lands on
  Sunday or Monday.
- **The impact clocks are HARD caps and differ by day**: Wednesday 15 min, Friday 30, both
  starting before travel. `base + travel === cap` for all 24 impact sessions, and the event
  seconds must sum to `base`. The fullest Wednesday leaves 65 seconds — the app shows a
  "this is the tight one" warning whenever the allowance is ≤2 minutes.
- **Running** (§13): Friday only, after the jumps and before lifting. **None in weeks 1 or
  12.** Hill through week 8; flat only from week 9, and terrain is the *only* change at flat
  entry. Ceiling **60 acceleration metres and 120 total metres**. Equal runout every rep.
- **Power** (§ daily power): four days a week in weeks 1–11, **three in week 12** (the test
  session carries none by design), with its own dose, rehearsal and stop rules.
  Quality is the stop rule — a "stopped" movement is logged as **omitted**, not completed,
  and cannot qualify a load increase. Most power items carry a text load, so they use the
  power-quality control rather than bar speed.
- **Copenhagen** (§14): knee-supported **short lever, 3×6 per side**, Monday and Friday,
  every week including deloads.
- **Biceps**: Sunday and Wednesday only, three recurring variation pairs at 2×8–12.
  **No direct triceps anywhere** — `test.mjs` greps the rendered names for it.
- **Time**: strength is a GUIDELINE (`META.strengthIsHardCap === false`). Block seconds must
  sum to the session total. Fourteen ordinary sessions sit at 78–78.5 min after A1; the guard
  is `META.strengthCeilingMinutes` (80) for ordinary sessions and exactly 94 for the test.
- **Absolute exercise exclusions:** Turkish get-up · Bulgarian split squat · barbell RDL ·
  dumbbell row · cable row · cable flye.
- **Conflict hierarchy** (§5): tissue tolerance → OHP/dip/pull-up → prescribed TrainerRoad →
  elastic and acceleration quality → heavy conventional specificity → squat/bench → secondary
  volume.
- **Out of scope — never add:** nutrition, TrainerRoad ride content, wearable-derived
  readiness rules. Never advance impact to compensate for a missed ride.

`test.mjs` enforces every one of those mechanically, and each guard has been mutation-tested —
the program was deliberately broken in 23 ways and every break was caught, each by the guard
that should have caught it. `tools/gen-block-doc.mjs` additionally re-reads the verification
tables *inside the program document*, re-adds every printed minute sum, and refuses to publish
if any disagrees with the data.

## Weekly AI-review loop

The **AI Analysis** button copies a structured week report (`buildReviewJSON`, version 16) to
the clipboard: prescribed vs actual per lift with system loads, bar speed, power quality,
`countsTowardFloors` per row, impact contacts by tier with each day's cap and travel
allowance, running reps and metres against the ceiling, adductor checks, the live volume
audit, minute budgets against the guideline, and trailing history per loaded lift. Brian pastes it into Claude
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
events), guards the historic traps (focus-loss, border-reset, stale-build, `.rx` overflow, the
zero-minute warm-up header, partial Rx fill), walks all 48 sessions plus week 13 for render
errors, and enforces every program invariant above. Extend it
when you add features. The one thing it cannot do is layout: check 375px overflow in a real
browser by hand.
