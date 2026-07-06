# Press / Priority — Workout Tracker

Single-file mobile workout tracker for a 12-week press-priority hybrid strength
program, plus the full program document. Built to run as a static page (GitHub
Pages / Netlify) and used on iPhone via Safari → Add to Home Screen.

**Read `CLAUDE.md` first** — it contains the architecture, invariants, known-bug
history, and design rules this project must respect.

## Quick start

```bash
npm install
npm run build   # → dist/index.html (self-contained, React bundled + inlined)
npm test        # jsdom smoke suite (run after every build)
```

## Deploy

Upload `dist/index.html` to the GitHub repo (bjoliveira8/Workout-Plan, Pages on
main//root) or drag a folder containing it to app.netlify.com/drop. User training
data lives in the phone's localStorage (key `pp-tracker-v3`) and survives redeploys;
the in-app Backup/Restore buttons move data across devices or domains.

## Contents

- `src/App.jsx` — the whole app (program data, logic, UI, CSS-in-JS string)
- `src/entry.jsx` — mount + localStorage shim for the `window.storage` API
- `docs/12-week-press-priority-program.md` — the training program (source of truth)
- `dist/index.html` — prebuilt current version
