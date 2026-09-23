# Astra Synthesized Concurrent Block — Tracker + Training Program

## What this project is

Two coupled artifacts:

1. **The program** (`docs/12-week-concurrent-block-v5.md`) — the Astra Synthesized
   Concurrent Block, **v5.0-syn3**. It is the **source of truth for all training logic**.
   The tracker implements it. Its §-numbers are cited throughout this file and in code comments.
2. **The tracker** (`src/App.jsx` + `src/program.js` → `dist/index.html`) — a single-file
   mobile web app used in the gym on iPhone (GitHub Pages, Add to Home Screen).

The athlete: male, 38, 6'0", 170 lb, ten-plus years of serious lifting, regular TrainerRoad
cyclist (3–4 h/week, FTP 229 W), aerobically fit but sprint-tissue deconditioned. Mild
next-day running-associated adductor tightness without altered gait; no current injury.
Long femurs, shorter torso. 2.5 lb total microloading available; roughly 5% outdoor hill.

**Time is the binding constraint, and V3 made it hard again.** Strength sessions have a
**hard 75-minute limit**, 5-minute delay reserve included; every session plans at 73.5 minutes
or less, and at 75.0 or less even if every OHP/dip/pull-up/bench rest runs the full 3:00.
Wednesday impact is a **hard 15 minutes**; Friday impact a **~30-minute target**. Travel is not
budgeted (Brian, 23 Sep).

### Status — the plan is loaded, not approved

Brian approved the V3 **design decisions** (23–24 Sep 2026); the finished plan is **ready for
review, not approved**. `docs/source/SYNTHESIS_VERIFICATION_V3.md` records 92 written-program
checks — 0 failures, 9 passes under named approved exceptions, 5 real-world unknowns (actual
time, equipment, recovery, outcomes, snatch proficiency). Do not describe this block as
verified training advice. It is arithmetic that checks out.

### History — this repo has carried five programs

Press-Priority Hybrid v1.3 (through July 2026) → Astra Concurrent Block v2.0-w1 (September
2026, one day) → Synthesized v3.0-syn1 (21 September) → v4.0-syn2 (22 September, plus coaching
amendments A1–A3) → this block, v5.0-syn3 (loaded 24 September, starts 27 September). All
earlier ones are preserved in `docs/archive/`, none are interchangeable, and old training data
is preserved in the app too (see the migration below).

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
tools/gen-program.mjs                ← one-shot: V3 source JSON → src/program.js
tools/gen-block-doc.mjs              ← one-shot: source narrative → the program doc, with a cross-check
docs/12-week-concurrent-block-v5.md  ← THE PROGRAM (source of truth)
docs/autoregulation-criteria.md      ← the weekly-review decision lens ("the brain")
docs/source/                         ← the V3 planning artifacts (JSON, block, cards, verification,
                                        change log, proposal, build scripts), vendored read-only
docs/archive/                        ← the four superseded programs, their brains, v3's and v4's sources
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

**COACHING AMENDMENTS A1–A3 are now IN THE SOURCE, not applied by the generator.** They were
applied to v4.0-syn2 by `applyAmendments`; V3 carries their resolved form, decided by Brian on
24 Sep:
- **A1** — calves on both lower days (V3: ≥3 varied sets Monday and Friday) and a 2-set Friday
  single-leg RDL are in. The Monday **lying leg curl was not adopted** (Brian: avoid machines —
  "RDL vs hamstring curl"). Watch item for the faster sprint weeks 8–11.
- **A2** — week-11 Sunday dip back-offs 3×6 @ +47.5 (even 2.5 lb steps into the +50×6 test).
- **A3** — no broad-jump measurement; week-12 Friday carries **no power work and no
  kettlebell complex** (approved exception E11).
`tools/gen-block-doc.mjs` refuses to publish the program document unless all three
resolutions are present, and `test.mjs` asserts each one.

**The program is generated, the app is hand-written.** `src/program.js` is emitted once by
`tools/gen-program.mjs` from `docs/source/SYNTHESIZED_PRESCRIPTIONS_V3.json` (48 sessions, 464 rows,
24 impact sessions). Each session also carries its own cut order, sequencing checks and card notes
(OHP anchor, longer pull-up set, test rules), which the app shows under "Sequencing checks and cut order". After that it is committed and **hand-edited by the
weekly review** — it is
this block's `WAVE`. **Never re-run the generator to apply a weekly change**; it would discard
every accepted edit. Run it only to load a genuinely new block.

**Sessions are a per-week table, not a day list with a load wave.** Composition varies by
week: week-12 tests are split (OHP on Wednesday; dip then pull-up on Friday) and replace
those days' ordinary exposures. So `SESSIONS[week][dayId]` holds the objective, the minute
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
it.** One debounced (700 ms) save of a single JSON bundle. Backup `version` is now **16**; the week report is version **17**.

**THE PROGRAM-COLLISION MIGRATION (do not remove).** Every saved bundle is stamped
`program: "astra-synthesis-v5"` (`PROGRAM_ID`). A bundle carrying a different id was written by
an earlier program, and its training data must not be inherited: `squat`, `dl`, `pullup` and
`copen` are live ids in more than one program, so an old log would otherwise render as this
block's prescription and as its "LAST WK" reference — wrong data, mid-session, on a priority
lift. On detecting a foreign stamp the app moves the whole bundle into `archived`, starts this
block's state clean, keeps theme / tone / vibrate / auto-rest, and resets `planName`.

`archived` is a **LIST**, and that matters: this repo has had five programs, so archiving the
v4 block must not clobber the three archives already inside it. Older saves held a
single object; `asArchiveList` lifts that shape into the list. The migration is idempotent — a
bundle with no training data adds nothing, so re-opening cannot stack empty entries.
`test.mjs` asserts all of it with a four-deep archive, including that every older one survives.

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

**No prescribed row sits on the impact clock in V3.** Plyometrics and sprints are counted on
the impact card only; Friday's power exercise (double-KB clean) is on the strength clock.
`impactItemsFor` is kept for safety and returns nothing.

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
  (36 normally, 23 in week 6, 15 in week 12), not from an invented "intensity" percentage.

## Program invariants (the tracker must enforce these)

- **Sessions are Sunday / Monday / Wednesday / Friday**, dated from Sunday 27 Sep 2026. Fresh
  slots (after the day's power exercise): Sun = heavy dip double, Mon = pull-up (weeks 7–11 the
  longer target-rep set), Wed = strict OHP top double, Fri = low-bar squat.
- **Three targets**: OHP 130×2 at RPE ≤9 · dip +50×6 and pull-up +45×5 at ≥2 RIR. They are caps
  at equal-or-higher reps. Squat and deadlift are maintenance; plyometric capacity has no test.
- **Week-12 tests are split** (`META.testDays` = wed, fri): OHP Wednesday; dip, **10 minutes**,
  then pull-up on Friday. Wednesday has no dip or pull-up work (E5). Friday has no power work
  and no kettlebell complex (E11).
- **Week 13** (`WEEK13`): optional **Saturday 26 Dec**, deferred tests only, not one of the 48,
  no deadlift, never a retry; its result is labelled week 13.
- **Deadlift**: Monday only, 12 exposures — ten heavy (450 top double + 405 back-off double)
  and two light (2×2 @ 390 in weeks 6 and 12), **no max** (C01, C02).
- **OHP path**: Wednesday top double 117.5 → 127.5 (+2.5 at most every two weeks), no
  calibration single — the 20 Sep 125×1 @ RPE 8.5 is the anchor.
- **Volume floors**, from the plan's own `workSet` flag: pressing **16–20** (20 normally) ·
  vertical 8 (9) · horizontal 6 (7) · **press:pull ≤ 1.30** (1.25 normally) · biceps 6 · triceps
  6 · calves 6. Weeks 6 and 12 waive the volume floors (C09). **Structural floors are never
  waived**: exactly 2 lower days · 3 shoulder days · 4 direct-abdominal days · 4 power days
  (3 in week 12, E11) · 4 unilateral days · 2 adductor days · 2 dynamic-rotation patterns ·
  2 carry days.
- **Arms**: exactly one direct-arm exercise a session — biceps Sunday/Wednesday, triceps
  Monday/Friday (`armKind`), 3×8–15 at 1–2 RIR (2 easy sets in weeks 6/12).
- **Calves**: Monday (straight-knee) and Friday (bent-knee) only, ≥3 sets (exactly 2 in
  weeks 6/12), rotating every three weeks.
- **The two-set rule**: no exercise is ever done for a single set (target tests excepted); a
  cut keeps ≥2 sets (`protectedSets`) or skips a whole optional exercise (`protectedSets: 0`,
  only the Friday DB incline bench).
- **Friday DB incline bench**: weeks 1–11, 2 sets, supersetted with the single-leg RDL; counts
  toward pressing, offset by Sunday's 4th row set.
- **Read the plan's flags, never infer an exposure from `family`.** The generator carries
  `workSet`, `power`, `unilateral`, `lowerStrength`, `directAbs`, `shoulderHealth`,
  `directArm`/`armKind`, `calf` and `dynamicRotation`, and computes `AUDIT` from those same
  flags so the live audit and the table cannot disagree. The app's volume counter adds only the
  three compound families to the floors (arm family names once double-counted arm sets).
- **Reserve floor**: 2 in a normal week, 4 in weeks 6 and 12. An RPE instruction is an effort
  target, not a reserve, so `rirTarget()` gives it no numeric floor.
- **Impact**: Wednesday and Friday only. **Wednesday is a HARD 15 minutes**; Friday a ~30-minute
  **target**; travel is not budgeted. Event seconds sum to `baseSeconds`; contacts by tier sum to
  the session totals. **High tier follows `META.highContactCapByWeek`** (0 before week 5, 12 in
  weeks 5 and 7, then 13 → 18); **≤15% weekly growth per tier** except the named week-5 entry and
  week-7 restoration (C04). Weeks 6 and 12 are low tier only.
- **Sprints**: Friday only, **every week**; hill through week 7, flat from week 8; one variable
  per stage, each stage twice before advancing (C05); rest 2–3 min at ≤20 m; ceiling 250 m.
- **Power**: four days a week (three in week 12). Quality is the stop rule — a "stopped"
  movement is logged as **omitted** and cannot qualify a load increase.
- **Copenhagen**: knee-supported **short lever, 3×6 per side**, Monday and Friday, every week.
- **Time**: every session ≤ 75 minutes (`META.strengthIsHardCap === true`), a 300-s delay
  reserve in each, and ≤ 75 even when every priority rest runs to 3:00 (`secondsIfMaxRests`).
- **Absolute exercise exclusions:** Turkish get-up · Bulgarian split squat · bilateral barbell
  RDL · cable flye. (Dumbbell and cable rows were allowed again on 23 Sep.)
- **Conflict hierarchy**: tissue tolerance → OHP/dip/pull-up → prescribed TrainerRoad → squat →
  jumping/sprinting → bench → deadlift → secondary volume.
- **Out of scope — never add:** nutrition, TrainerRoad ride content, wearable-derived
  readiness rules. Never advance impact to compensate for a missed ride.

`test.mjs` enforces every one of those mechanically, and the V3 guards were mutation-tested
when the block was loaded (each deliberate break was caught by the guard meant to catch it).
`tools/gen-block-doc.mjs` refuses to publish the program document if the app's program
disagrees with the V3 source or its verification.

## Weekly AI-review loop

The **AI Analysis** button copies a structured week report (`buildReviewJSON`, version 17) to
the clipboard: prescribed vs actual per lift with system loads, bar speed, power quality,
`countsTowardFloors` per row, impact contacts by tier with each day's cap type and
allowance, running reps and metres against the ceiling, adductor checks, the live volume
audit, minute budgets against the 75-minute hard limit, and trailing history per loaded lift. Brian pastes it into Claude
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
