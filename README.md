# Astra Concurrent Block — Workout Tracker

Single-file mobile workout tracker for the **Astra 12-week concurrent training block (v2.0-w1)**,
plus the full program document. Runs as a static page (GitHub Pages) and is used on iPhone via
Safari → Add to Home Screen.

**Read `CLAUDE.md` first** — it contains the architecture, invariants, known-bug history, and
design rules this project must respect.

## What the block is

Four strength sessions — **Sunday, Monday, Wednesday, Friday** — around three to four TrainerRoad
rides, with elastic and acceleration work sitting outside the 75-minute strength cap. Priorities,
in order: strict OHP, weighted dip, weighted neutral-grip pull-up, low-bar squat, paused bench.
Deloads in weeks 6 and 12; the block tests on **week 12 Wednesday** (broad jump → OHP → dip →
pull-up). Tennis is excluded.

The tracker implements four domains the previous program had no concept of:

- **Elastic block** — plyometric contacts logged per tier against the weekly target, with a
  contact-quality tag. Tier 3 is gated until week 5 and never rises more than 15% a week.
- **Acceleration** — the hill-to-flat sprint ladder, with the 250 m per-session ceiling shown.
- **Primer response** — readying / neutral / fatiguing, which is a real programming signal.
- **Adductor gate** — a one-tap normal/abnormal check after the session and the next morning.
  Abnormal raises a block-level banner and holds every running and tier progression.

Plus a live **volume-floor audit** computed straight from the loading tables, so a floor cannot be
broken silently.

## Quick start

```bash
npm install
npm run build   # → dist/index.html (self-contained, React bundled + inlined)
npm test        # jsdom smoke suite + program-invariant guards (build first)
```

`npm test` refuses to run against a stale bundle, so **read the build output** — a failed build is
not a failed test run.

## Deploy

`node deploy.mjs` builds, tests, and copies `dist/index.html` → root `index.html` (the file
GitHub Pages serves at <https://bjoliveira8.github.io/Workout-Plan/>). Add `--push` to commit and
push — but show the diff and get an explicit yes first.

Training data lives in the phone's localStorage (key `pp-tracker-v3`) and survives redeploys; the
in-app Backup/Restore buttons move data across devices.

## Contents

- `src/App.jsx` — the whole app (program data, logic, UI, CSS-in-JS string)
- `src/entry.jsx` — mount + localStorage shim for the `window.storage` API
- `docs/12-week-concurrent-block.md` — the training program (source of truth)
- `docs/autoregulation-criteria.md` — the weekly-review decision lens
- `docs/archive/` — the superseded Press-Priority v1.3 program, kept for reference
- `dist/index.html` — prebuilt current version
