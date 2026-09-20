# App Fixes Batch — Implementation Plan

> Steps use `- [ ]` tracking. Execute interactively; every deploy PAUSES for approval.
> Run `npm run build && npm test` before every deploy.

**Goal:** Six gym-usability fixes to the tracker, shippable as one batch.

**Architecture:** Single-file React app (`src/App.jsx` → `dist/index.html`). Persisted
state lives in the `pp-tracker-v3` localStorage bundle; adding persisted fields bumps the
backup `version` and keeps load/restore backward-compatible.

**Tech Stack:** React 18, esbuild, jsdom smoke tests.

**Decisions locked (2026-07-05):** borders thinner = fainter (lower accent opacity, keep
0.5px) · rearrange = up/down arrows, program order is the default, "reset to recommended"
available · plyo/ballistic default first (recommendation, not a lock).

---

### Task 1: One timer at a time (first timer wins)

**Files:** Modify `src/App.jsx` (`startRestById` ~line 286), `test.mjs`

- [ ] Write failing test: start a rest timer, then call start again for a different
  exercise; assert the timer's `label`/`endsAt` is still the first one (not replaced).
- [ ] Run → FAIL.
- [ ] Implement: in `startRestById`, if a timer is currently running
  (`timer && timer.endsAt > Date.now()`), return early — no new timer, no tone. Guard via a
  ref/functional check so it's race-safe with the debounced saves.
- [ ] Run → PASS. Commit `fix: first rest timer takes precedence`.

### Task 2: Global session timer (elapsed workout clock)

**Files:** Modify `src/App.jsx` (state, session header render, persisted bundle + version),
`test.mjs`

- [ ] Write failing test: log the first set of a session; assert a `sessionStart[week-day]`
  timestamp is recorded and persists across a reload; assert it does NOT reset on a second set.
- [ ] Run → FAIL.
- [ ] Implement: on the first logged set of a session, stamp `sessionStart[k]=Date.now()`;
  render a live `elapsed` readout (MM:SS) in the session header near the 60-min cap note;
  freeze it when the session is marked finished (`sessDone`). Add `sessionStart` to the saved
  bundle; bump backup `version`; migration tolerates its absence.
- [ ] Run → PASS. Commit `feat: global session elapsed timer`.

### Task 3: Rearrange exercises (up/down, per session)

**Files:** Modify `src/App.jsx` (order state, card render, persisted bundle), `test.mjs`

- [ ] Write failing test: move an exercise down; assert the session's stored order changes
  and persists across reload; assert "reset to recommended" restores program order.
- [ ] Run → FAIL.
- [ ] Implement: derive each session's render order from `order[week-day]` (default = program
  order from `DAYS`); add ▲/▼ controls per card that reorder within the session; add a "reset
  to recommended" action; persist `order` in the bundle. Logs stay keyed by exercise id, so
  reordering never touches logged data. Keep cards as plain render functions (no inline
  components — protects the focus-loss fix).
- [ ] Run → PASS. Commit `feat: reorder exercises per session with recommended default`.

### Task 4: Timer sound plays over music (iOS audio session)

**Files:** Modify `src/App.jsx` (`ensureAudio` ~line 282)

- [ ] Implement: in `ensureAudio`, after creating the context, feature-detect and set
  `navigator.audioSession.type = 'transient'` (guarded — new API). This ducks other audio for
  the alert instead of being suppressed by it. Confirm the context resumes on the first
  gesture.
- [ ] Run `npm run build && npm test` → PASS (no regressions).
- [ ] **Device check (required):** on the athlete's iPhone with music playing, start a rest
  timer and confirm the tone is audible over the music. Only mark done after this passes.
- [ ] Commit `fix: alert tone ducks music instead of being silenced (iOS)`.

### Task 5: Plyo/ballistic default to session start

**Files:** Modify `src/App.jsx` (order default logic from Task 3)

- [ ] Confirm the recommended default order already places primers (plyo/broad/box jumps) and
  ballistic/power first per `DAYS`; ensure "reset to recommended" restores exactly that. No
  hard lock (athlete can still move them). Covered by Task 3's test + one assertion that the
  default order leads with the primer.
- [ ] Commit if any change needed; otherwise fold into Task 3.

### Task 6: Lighter buttons — fainter outline + muted contrast ("Lighter" variant, chosen)

**Files:** Modify `src/App.jsx` CSS (`.tool`, `.tab`, `.tab-lift`, `.ytbtn`, `.inlbtn`, and
peers ~lines 757–808)

**Theme-safe rule:** all values use existing CSS vars via `color-mix` — NO hardcoded hex
(honors the "colors reference vars" invariant so all 5 themes get the treatment).

- [ ] **Fainter outline:** in the bordered button classes, change the border
  `color-mix(in srgb, var(--accent) 12%, transparent)` → `... 6% ...`, keeping `0.5px` width.
- [ ] **Muted button contrast (resting state only):**
  - `.tool` label: `color: var(--ink)` → `color-mix(in srgb, var(--ink) 60%, var(--muted))`.
  - `.tool .ic` icon: `color: var(--accent)` → `color-mix(in srgb, var(--accent) 75%, var(--muted))`.
  - `.inlbtn` text: `var(--accent)` → `color-mix(in srgb, var(--accent) 75%, var(--muted))`.
  - `.tab` / `.tab-lift` text: dim toward `var(--muted)` by the same 75/25 mix.
- [ ] **Keep selected/active states at full strength** — `.tool.on`, `.tab.on`,
  `.tab.on .tab-lift`, `.inlbtn.on` stay at full `var(--accent)` so the current day/tool
  still reads clearly (matches the approved mockup's highlighted tab).
- [ ] Do NOT reintroduce `border:none` on styled button classes (protects the border-reset
  fix); keep the `border-style:solid` safety-net list intact and add any new bordered class.
- [ ] Run `npm run build && npm test` → PASS.
- [ ] Visual check on device; commit `style: lighter buttons — fainter outline + muted contrast`.

---

### Deploy (PAUSE for approval)
After all tasks pass: `npm run deploy -- --push` (once the deploy pipeline from the
autoregulation plan / baseline exists), show the diff, get the "yes", verify on device.

**Note:** if this batch ships before the autoregulation feature, its version bump is the
first (12 → 13) and the autoregulation feature then uses the next number.
