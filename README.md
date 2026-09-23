# Astra Synthesized Concurrent Block — Workout Tracker

Single-file mobile workout tracker for the **Astra Synthesized Concurrent Block (v5.0-syn3)**,
plus the full program document. Runs as a static page (GitHub Pages) and is used on iPhone via
Safari → Add to Home Screen.

**Read `CLAUDE.md` first** — it contains the architecture, invariants, known-bug history, and
design rules this project must respect.

## What the block is

Twelve weeks from **Sunday, 27 September 2026**: four strength sessions — **Sunday, Monday,
Wednesday, Friday** — around three prescribed TrainerRoad rides. Strength sessions have a
**hard 75-minute limit** (5-minute delay reserve included; every session plans at 73.5 or
less). Jumping and sprinting come first on Wednesday (**hard 15 minutes**) and Friday (**~30-minute
target**); travel is not budgeted.

- **Sunday** — plyo push-up or chest pass, heavy dip double and back-offs, paused bench,
  one-arm chest-supported dumbbell rows, biceps with cable external rotation, core, farmer carry.
- **Monday** — kettlebell complex and swings (snatches from week 7 if the gate is met),
  pull-ups first, the week's conventional deadlift (top double + back-off), moderate OHP,
  reverse lunge, Copenhagen with calves, rope pushdown with Pallof.
- **Wednesday** — impact block, scoop throws, then the overhead press in the freshest slot,
  pull-ups, one-arm dumbbell rows, biceps with face pulls, core, suitcase carry.
- **Friday** — impact and hill/flat accelerations, double-KB cleans, low-bar squat, dips,
  pull-ups, DB incline bench with single-leg RDL, Copenhagen with calves, overhead triceps with
  prone Y, landmine rotation.

Three goals: strict OHP **130×2 at RPE ≤9**; weighted dip **+50×6** and neutral-grip pull-up
**+45×5** at **≥2 reps in reserve**. Squat and deadlift are maintained; plyometric capacity
progresses without a test. Deloads in weeks 6 and 12; **week-12 tests are split — OHP on
Wednesday, dip and pull-up on Friday** — with an optional **Saturday, 26 December** slot only
for a test deferred before it was attempted. No exercise is ever done for a single set.

The tracker carries four domains beyond the barbell work:

- **Impact block** — the full prescribed sequence with its time budget. Contacts are logged per
  tier against the weekly target; the high tier is absent before week 5 and follows the weekly
  tier table after that (12 → 18).
- **Sprints** — Friday every week, hill through week 7 and flat from week 8, one variable
  changed per stage, 2–3 minutes between reps.
- **Daily power** — each with its own dose and stop rules. Quality is the stop rule: a movement
  you stop is logged as *omitted*, not completed, and cannot earn a load increase.
- **Tissue gate** — a one-tap normal/abnormal check after the session and the next morning
  (adductors, calves, Achilles). Abnormal raises a block-level banner and holds every sprint
  and high-tier progression. It outranks every other rule in the block.

Plus a live **volume-floor audit** computed straight from the prescriptions, the full **timed
block plan** for each session, and each day's **sequencing checks and cut order**.

## Status

The plan is **ready for review, not approved**. Brian approved the design decisions on 23–24
September 2026. `docs/source/SYNTHESIS_VERIFICATION_V3.md` records 92 written-program checks:
0 failures, 9 passes under named approved exceptions, and 5 real-world unknowns (actual time,
equipment, recovery, outcomes, snatch skill) that only training will settle. See §0 of the
program document.

## Quick start

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm install
```

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test
```

`npm test` refuses to run against a stale bundle, so **read the build output** — a failed build
is not a failed test run.

## Deploy

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && node deploy.mjs
```

That builds, tests, and copies `dist/index.html` → root `index.html` (the file GitHub Pages
serves at <https://bjoliveira8.github.io/Workout-Plan/>). Add `--push` to commit and push — but
show the diff and get an explicit yes first.

Training data lives in the phone's localStorage (key `pp-tracker-v3`) and survives redeploys.
When the app opens a save from an earlier program it archives that data rather than inheriting
it, so nothing is lost and nothing bleeds through. The in-app Backup/Restore buttons move
everything, archives included, across devices.

## Contents

- `src/App.jsx` — the app: logic, UI, CSS-in-JS string
- `src/program.js` — generated prescriptions; the single edit point for every load
- `src/entry.jsx` — mount + localStorage shim for the `window.storage` API
- `tools/gen-program.mjs` — one-shot generator: source plan JSON → `src/program.js`
- `tools/gen-block-doc.mjs` — one-shot generator for the program document, with a cross-check
  that refuses to publish if the document and the data disagree
- `docs/12-week-concurrent-block-v5.md` — the training program (source of truth)
- `docs/autoregulation-criteria.md` — the weekly-review decision lens
- `docs/source/` — the V3 planning artifacts (data, block, cards, verification, change log, build scripts), vendored read-only
- `docs/archive/` — the four superseded programs and their sources, kept for reference
- `index.html` — the built file GitHub Pages serves (`dist/` is a local build artifact and is not committed)
