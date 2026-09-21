# Astra Synthesized Concurrent Block — Workout Tracker

Single-file mobile workout tracker for the **Astra Synthesized Concurrent Block (v3.0-syn1)**,
plus the full program document. Runs as a static page (GitHub Pages) and is used on iPhone via
Safari → Add to Home Screen.

**Read `CLAUDE.md` first** — it contains the architecture, invariants, known-bug history, and
design rules this project must respect.

## What the block is

Four strength sessions — **Sunday, Monday, Wednesday, Friday** — around three prescribed
TrainerRoad rides, with all jumping and running on a **separate 15-minute clock** on Wednesday
and Friday, travel included. Strength sessions are capped at 75 minutes.

- **Sunday** — heavy dip double and back-offs, paused bench, chest-supported rows. Starts at
  least six hours after the long ride finishes.
- **Monday** — pull-ups first, then the week's one conventional deadlift, then a moderate OHP.
- **Wednesday** — impact block, then the overhead press in the freshest slot of the week.
- **Friday** — impact and running, then low-bar squat, dip and pull-up.

Four targets: strict OHP **125×2**, weighted dip **+50×6**, neutral-grip pull-up **+45×5**, and
standing broad jump **+4 inches** over the week-1 baseline. The three lifting targets want
**≥2 reps in reserve, aiming for 2** — easier still counts. The jump figure is a goal, not a
prediction. Deloads in weeks 6 and 12; **the block tests on week 12 Friday**.

The tracker carries four domains beyond the barbell work:

- **Impact block** — landings logged per tier against the weekly target, with a landing-quality
  tag. The high tier is capped at six contacts a week and is absent before week 5; weeks 1 and
  12 run the three-attempt broad-jump measurement.
- **Running** — Friday only, 0–3 short efforts, hill through week 8 and flat from week 9, with
  the 60 m acceleration / 120 m total per-session ceiling shown on the card.
- **Primer response** — readying / neutral / fatiguing, which is a real programming signal.
- **Adductor gate** — a one-tap normal/abnormal check after the session and the next morning.
  Abnormal raises a block-level banner and holds every running and high-tier progression. It
  outranks every other rule in the block.

Plus a live **volume-floor audit** computed straight from the prescriptions, so a floor cannot
be broken silently, and the full **timed block plan** for each session.

## Status

The plan's own ten conflict resolutions were approved; the training plan itself has not been
signed off, and its author does not claim otherwise. All 13 of the plan's checks are documented
in `docs/source/SYNTHESIS_VERIFICATION.md` — nine pass, four pass with an approved exception,
and two are honestly marked unverified because they cannot be settled on paper. See §0 of the
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
- `docs/12-week-concurrent-block-v3.md` — the training program (source of truth)
- `docs/autoregulation-criteria.md` — the weekly-review decision lens
- `docs/source/` — the planning session's own artifacts, vendored read-only
- `docs/archive/` — the two superseded programs, kept for reference
- `index.html` — the built file GitHub Pages serves (`dist/` is a local build artifact and is not committed)
