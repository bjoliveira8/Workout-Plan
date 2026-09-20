# Feature Design — AI Autoregulation Loop (weekly, Claude-driven)

**Date:** 2026-07-05 · **Status:** approved, pending build plan
**Depends on:** the deploy pipeline (git connect + one-command deploy to GitHub Pages).

## Goal

Close the weekly loop: the athlete taps **AI Analysis**, pastes the export into Claude
Code, and gets a plain-language brief that adjusts next week's prescriptions per the
approved criteria (`docs/autoregulation-criteria.md`) — main lifts can move up when
warranted, down when required. Approved changes are edited into the program and deployed
to the phone.

## The weekly flow

1. Athlete logs sets in the gym, taps **AI Analysis**.
2. App copies a **structured JSON export**: current week + a compact trailing history per
   lift (for the 2-session repeat check).
3. Athlete pastes it into Claude Code.
4. Claude applies the criteria + runs the 5-coach panel **inline**, returns a
   plain-language brief: per lift → hold / up / down, magnitude, rule cited, any veto.
5. Athlete approves (or edits) the brief.
6. Claude edits the `WAVE` table (and reps/sets if needed), rebuilds, runs tests, shows
   the exact before/after diff.
7. Athlete gives one "yes" → Claude pushes → GitHub Pages updates → phone refresh shows
   new numbers.

## Components to build

1. **JSON export** — extend the AI Analysis button to emit machine-readable JSON
   (prescribed vs actual per set, RIR, bar-speed tag, notes, block/protected/deload flags,
   trailing history of each main lift). Keep the existing human-readable report available too.
2. **Bar-speed tag** — a one-tap per-main-lift control: **fast / on-target / grindy**.
   Feeds the export; it is the required co-signal for main-lift increases. Defaults to
   `on-target` if untouched.
3. **Criteria doc** — `docs/autoregulation-criteria.md` (the brain), versioned & followed
   each week. Already written.
4. **Deploy pipeline** — repo → private; git connect; one-command deploy (build → test →
   copy `dist/index.html` to root `index.html` → commit → push). Athlete approves each push.
5. **Invariant tests** — extend `test.mjs` so a pre-push check fails if any edit breaks a
   hard rail (squat >225, bench double >195, OHP double >115, RIR floor). No push on failure.

## Data model changes

- Add `barSpeed` to the per-main-lift stored data (part of the `pp-tracker-v3` bundle).
- **Bump backup `version` 12 → 13**; keep `restoreBackup` / load-time migration backward
  compatible (old backups without `barSpeed` load fine, default `on-target`).
- Storage key `pp-tracker-v3` is **never** changed.

## Export JSON shape (draft)

```
{
  "app": "press-priority", "kind": "week-report", "version": 13,
  "week": 6, "block": "Block 2 · Load", "flags": { "protected": false, "deload": false },
  "days": [ { "day": "mon", "lift": "Bench", "exercises": [
    { "id": "bench", "isMain": true, "rx": { "sets":4,"reps":"3","load":180,"rir":2 },
      "actual": [ {"w":180,"r":3,"rir":4}, ... ], "barSpeed": "fast", "note": "" } ] } ],
  "history": { "bench": [ { "week":5, "rirMin":4, "barSpeed":"fast", "allSets":true } ] },
  "autoFlags": { "subTwoRir": 0 }
}
```

## Error handling

- Malformed / old-version paste → Claude says so, asks for a fresh export.
- Missing bar speed (old data / untagged) → main-lift *increase* defaults to **hold**;
  Claude asks "how did the bar move?" only when it's decision-relevant.
- Proposed edit breaks an invariant → tests fail → **no push**; Claude reports it.
- Push/deploy failure → reported, not silently retried.
- Phone cache stale after deploy → test on first deploy; add a version-stamp nudge if sticky.

## Testing discipline

`npm run build && npm test` before every deploy. New tests: JSON export shape includes
history + bar-speed; bar-speed control persists across reload; WAVE invariant validation
(caps + RIR floor).

## Out of scope (future)

- Real multi-agent panel debate for borderline calls (inline is the default).
- In-app "paste-a-patch" ingest (we chose edit-and-deploy instead).
- Phone bar-speed / velocity hardware integration.
- Auto trend charts.
