# Astra Synthesized Concurrent Block — Workout Tracker

Single-file mobile workout tracker for the **Astra Synthesized Concurrent Block (v4.0-syn2)**,
plus the full program document. Runs as a static page (GitHub Pages) and is used on iPhone via
Safari → Add to Home Screen.

**Read `CLAUDE.md` first** — it contains the architecture, invariants, known-bug history, and
design rules this project must respect.

## What the block is

Four strength sessions — **Sunday, Monday, Wednesday, Friday** — around three prescribed
TrainerRoad rides. All jumping and running sits on a **separate clock** that starts before
you travel: **15 minutes on Wednesday, 30 on Friday**. Those are hard limits. Strength time
is a **guideline** of about 75 minutes, not a hard stop — most sessions run 66.5–73.5, and
week-12 Friday is 94 minutes of testing by design.

- **Sunday** — daily power, heavy dip double and back-offs, paused bench, rows. Starts at
  least six hours after the long ride finishes.
- **Monday** — pull-ups first, then the week's one conventional deadlift, a moderate OHP,
  Copenhagen and a reverse lunge.
- **Wednesday** — impact block, then the overhead press in the freshest slot of the week.
- **Friday** — impact and running, then low-bar squat, dip, pull-up and a single-leg hinge.

Four targets: strict OHP **125×2**, weighted dip **+50×6**, neutral-grip pull-up **+45×5**, and
standing broad jump **+4 inches** over the week-1 baseline. The three lifting targets want
**≥2 reps in reserve, aiming for 2** — easier still counts. The jump figure is a goal, not a
prediction. Deloads in weeks 6 and 12; **the block tests on week 12 Friday**, with an
optional **week 13** reserved only for a test deferred before it was attempted.

The tracker carries four domains beyond the barbell work:

- **Impact block** — the full prescribed sequence with its time budget, so you can decide
  before travelling whether it fits. Landings are logged per tier against the weekly target.
  The high tier is capped at six contacts a week and is absent before week 5; weeks 1 and 12
  run the three-attempt broad-jump measurement. The fullest Wednesday leaves only 65 seconds
  for transit, and the card says so.
- **Running** — Friday only, 0–3 short efforts, hill through week 8 and flat from week 9, with
  the 60 m acceleration / 120 m total per-session ceiling shown on the card.
- **Daily power** — one-arm cleans, swings, scoop throws and the Friday jumps, each with its
  own dose and stop rules. Quality is the stop rule: a movement you stop is logged as
  *omitted*, not completed, and cannot earn a load increase.
- **Adductor gate** — a one-tap normal/abnormal check after the session and the next morning.
  Abnormal raises a block-level banner and holds every running and high-tier progression. It
  outranks every other rule in the block.

Plus a live **volume-floor audit** computed straight from the prescriptions, so a floor cannot
be broken silently, and the full **timed block plan** for each session.

## Status

The plan is **not labeled approved** and its author does not claim otherwise. Twenty revision
checks plus the original thirteen are documented
in `docs/source/SYNTHESIS_VERIFICATION_V2.md`. The author's own grade is "A, provisionally",
and the remaining uncertainty is whether the combined cycling, lifting and new power work
fits actual recovery — which only training it will settle. See §0 of the program document.

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
- `docs/12-week-concurrent-block-v4.md` — the training program (source of truth)
- `docs/autoregulation-criteria.md` — the weekly-review decision lens
- `docs/source/` — the planning session's own artifacts, vendored read-only
- `docs/archive/` — the three superseded programs and their sources, kept for reference
- `index.html` — the built file GitHub Pages serves (`dist/` is a local build artifact and is not committed)
