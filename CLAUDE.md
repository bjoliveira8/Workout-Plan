# Press / Priority — Workout Tracker + Training Program

## What this project is

Two coupled artifacts, built together over many iterations in Claude.ai chat:

1. **The program** (`docs/12-week-press-priority-program.md`) — a 12-week press-priority
   hybrid strength program (v1.3), authored through a staged multi-coach review process.
   It is the **source of truth for all training logic**. The tracker implements it.
2. **The tracker** (`src/App.jsx` → `dist/index.html`) — a single-file mobile web app
   the athlete uses in the gym on iPhone (GitHub Pages / Netlify, Add to Home Screen).

The athlete: 37, dentist and technical founder, plays tennis Wed/Sat, cycles Sun.
Fixed 1RMs this cycle: Bench 215 · OHP 128 · Squat 282 · DL 515.

## Repo layout

```
CLAUDE.md                 ← you are here
README.md                 ← quick start + deploy
package.json              ← esbuild/jsdom/react devDeps; npm run build / npm test
build.mjs                 ← bundles src/entry.jsx, inlines into dist/index.html
test.mjs                  ← jsdom smoke tests (run before every ship)
src/App.jsx               ← the entire app: data, logic, UI, CSS (one file, by design)
src/entry.jsx             ← mount + localStorage shim for window.storage
docs/12-week-press-priority-program.md  ← full program incl. coach-review record
dist/index.html           ← built artifact; THE deliverable (self-contained, ~190 KB)
```

## Commands

```bash
npm install
npm run build    # → dist/index.html
npm test         # jsdom smoke suite against dist/index.html (build first)
```

**Deploy (v13):** the folder is now a git repo wired to **github.com/bjoliveira8/Workout-Plan**
(the repo is **private**; GitHub Pages serves root `index.html` at bjoliveira8.github.io/Workout-Plan/).
`node deploy.mjs` builds + tests + copies `dist/index.html` → root `index.html`; add `--push`
(`npm run deploy -- --push`) to commit + push. **Always show the diff and get Brian's explicit
yes before pushing** (his standing rule). User data survives redeploys — it lives in the phone's
localStorage, not the file. After a push, pull-to-refresh the home-screen app to pick up the build.

**Weekly autoregulation loop (v13):** the AI Analysis button now copies a structured JSON week
report (`buildReviewJSON`) — Brian pastes it into Claude Code, which applies
`docs/autoregulation-criteria.md` (the "brain": main lifts may increase only on RIR +2 across
all sets, fast bar speed, repeated 2 exposures; 5-coach panel; hard caps enforced), returns a
plain-language brief, and — on approval — edits `WAVE` and deploys. `test.mjs` guards the caps
(squat ≤225, bench double ≤195, OHP double ≤115) so an autoregulation edit can never breach them.
The text report (`buildReview`) is still available in Settings.

## Architecture — the parts that will bite you if you don't know them

**One component file.** All program data, helpers, the app component, and a CSS
template string live in `src/App.jsx`. This is deliberate: it doubles as a Claude.ai
artifact. Keep it single-file.

**window.storage abstraction.** The component persists exclusively through
`window.storage.get/set` (async, `{key, value}` shape, `get` THROWS on missing key).
`src/entry.jsx` shims it onto localStorage. Storage key: **`pp-tracker-v3`** — never
change it, or users lose data. One debounced (700 ms) save of a single JSON bundle:
`{ week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings,
order, barSpeed, sessionTime }`.
Backup JSON carries a `version` field (currently **13**) — bump it on any schema change
and keep `restoreBackup`/load-time migrations backward compatible. (v13 added `order`
[per-session exercise order], `barSpeed` [main-lift fast/on-target/grindy tag], and
`sessionTime` [{start,end} per session for the global workout clock]; old backups load fine.)

**THE FOCUS-LOSS BUG (fixed; do not reintroduce).** Components were once defined
*inline* inside the app component. Every state change — including every 250 ms timer
tick — created new component identities, React remounted the subtree, and inputs lost
focus; the user couldn't log anything while a timer ran. The fix has two legs:
1. `TimerBar` is a **module-level component that owns its own tick state**. The parent
   only stores `{label, endsAt}`; nothing else re-renders during a countdown.
2. Cards/rows/settings are **plain render functions** (`renderCard(ex)`, called as
   functions, not `<Card/>`), so element identity is stable across parent re-renders.
Never define a component inside the app component. `test.mjs` guards this
(logging-during-timer check).

**THE BORDER-RESET BUG (fixed; do not reintroduce).** The global reset
`.app button{border:none}` (specificity 0,1,1) silently beat single-class button
styles (0,1,0). It didn't strip borders — it forced them to a **3px medium** border in
currentcolor, which is why the buttons looked "too thick" (the old test only checked
source text, so it missed the computed 3px). **Fix (v13):** `.app button` no longer sets
`border` or `color`, so the class hairlines (`0.5px solid color-mix(--accent 6%)`) apply.
Truly borderless buttons set `border:none` explicitly (`.step,.warm-toggle,.wave-col`, plus
`.movebtn`,`.resetorder`). `test.mjs` now guards that the reset never re-adds `border:none`.
If you add a bordered button class, keep its `0.5px` border and (for the reset-safe list)
add it to `.app .…{border-style:solid}`. **Buttons are deliberately quiet:** 6% accent
outline + muted text; only active/selected states use full `--accent`.

**Auto-rest logic** (in `setEntry`): the rest timer auto-starts when a set row
*transitions* to complete (weight AND reps present) or when RIR is first entered —
not on weight alone, and not re-firing on later edits. Gated by `settings.autoRest`.
Superset exercises (`wpu`, `chins`) have `REST[id] = null` and never get timers —
they rest inside the main lift's rest.

**Logs are keyed by session id** (`mon/tue/thu/fri`), not weekday. The Settings
day-remapper (`settings.dayMap`) only changes labels/today-detection, so remapping
mid-cycle is lossless.

**Tones** are Web-Audio-synthesized, iPhone-alert style (radar default; alarm, pulse,
tritone, sonar, silent). The user rejected two earlier tone sets as "awful" — these
are repeating, insistent alert patterns, not polite chimes. AudioContext is created
lazily on first user gesture (`ensureAudio`) because browsers block autoplay.

## Design system — hard-won user preferences (violate at your peril)

- Dark "Iron" theme default; 4 more skins (chalk/midnight/crimson/mono) via CSS
  custom properties. All colors reference vars — never hardcode hex in components.
- **Borders: 0.5px hairlines at ~12% accent opacity**
  (`0.5px solid color-mix(in srgb,var(--accent) 12%,transparent)`). The user pushed
  back on border boldness FOUR times. Never ship thicker/brighter button borders.
- Buttons: Barlow Condensed, weight 700, uppercase, letter-spacing — uniformly.
  Numbers/inputs: Barlow Condensed tabular-nums. Body text: Inter.
- Exercise names are Title Case ("Plyo Push-Up") and must stay on ONE line
  (`.exname` ellipsizes). Every exercise carries a category tag (primer, main lift,
  superset, press, row, ballistic, unilateral, rotation, carry, core).
- Card header: name+tags left, YouTube icon (red glyph, icon-only, no label) +
  done-check top-right. "Alt Exercise" button on its own row beneath.
- Header (week wave strip, day tabs) is NOT sticky — it scrolls away.
- Plan name is user-editable (Settings → Plan name) and shown uppercase in the brand.

## Program invariants (from docs/…program.md — the tracker must enforce these)

- **Loading tables**: the `WAVE` object in App.jsx is the single edit point for all
  prescriptions. Bench/OHP run 5s→3s→2s→deload waves; squat is CAPPED at 225 lb
  (80%) with set progression 3→4→5 across blocks; DL = dead-stop triples + one
  heavy 2×2 (425→430→435), no heavy pull weeks 4/8/12.
- **RIR ≥ 2 everywhere.** Two sub-2-RIR sets in a week ⇒ next week runs the deload
  template (§9.3). The app counts and banners this automatically.
- Doubles caps: ≤91% bench (195), ≤90% OHP (115). Grindy double → −5 lb.
- Protected weeks 3/7/10/11: accessories floor to 2 sets (`REDUCED` set).
- 60-minute working cap; warm-ups off the clock; primers never exceed 3×3.
- Week 13 tests: Bench Wed, OHP Fri (+48 h), RPE ≤ 9.5 attempt ladders.
  **Revert triggers to check at test time:** bench < ~222 ⇒ reinstate Thu
  touch-and-go bench 3×5@150 next cycle; OHP < ~130 ⇒ reinstate Mon barbell OHP
  practice next cycle (both slots were traded away in v1.2/v1.3 amendments).
- Next-cycle increments: OHP +2.5–5 · Bench +5 · Squat +5–10 · DL +10.
- **Any exercise substitution must pass the program's philosophy lens**: same
  movement pattern (Dan John), submaximal & RIR-governable (Pavel), category
  preserved — unilateral stays unilateral, anti-rotation stays anti-rotation
  (Boyle/McGill), plyo dose & quality preserved (Verkhoshansky). Exactly ONE
  vetted alt per exercise (the `alt` field). Don't add alt lists.
- Shoulder-defense yield order if the shoulder complains: KB snatches→swings first,
  then Incline DB, then dips, then KB press. Dips otherwise never reduced — explicit
  user instruction.

## Weekly AI-review loop

The **AI Analysis** button copies a structured week report (prescribed vs actual,
RIR, notes, auto-flags, coach prompt) to the clipboard. The user pastes it into a
Claude conversation/Project that has the program doc for a coaching review. This is
by design — no API calls from the app (key exposure). A future "patch schema" (Claude
returns JSON the app ingests to override next week's prescriptions) was discussed
and is the top candidate feature.

## Backlog / next steps

1. Patch-schema override layer for weekly Claude-driven adjustments (designed, unbuilt).
2. Cycle 2: regenerate `WAVE` from tested 1RMs after week 13 (WAVE is the only edit point).
3. Ring-dip progression deferred to next cycle (rings for pull-ups/chins allowed now).
4. Optional: pin specific YouTube video IDs if the user supplies links (current ▶
   buttons open a filtered search — deliberate, avoids dead links).
5. Optional PWA hardening: manifest + service worker for offline (currently relies
   on Safari's home-screen caching of a single file).

## Testing discipline

`npm run build && npm test` before every deliverable. The suite simulates real typing
(native value setter + input events — required for React controlled inputs) and guards
the two historic bugs (focus-loss, border-reset) plus auto-rest semantics, persistence,
alt toggling, and test-week rendering. Extend it when you add features.
