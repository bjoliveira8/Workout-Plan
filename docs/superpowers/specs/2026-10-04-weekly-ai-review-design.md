# Weekly AI Review — Design (revision 2)

**Date:** 2026-10-04 · **Status:** revision 2 after adversarial review; awaiting Brian's review
**Block:** Astra Synthesized Concurrent Block v5.0-syn3 (`PROGRAM_ID = "astra-synthesis-v5"`)
Revision 1 → 2 changes are listed in the appendix (§14).

---

## In plain language

Every Saturday afternoon a Claude routine (Opus 5.5, in Anthropic's cloud) reviews the week you
just trained against the brain's rules and writes a proposal for next week. The tracker shows it
as a **Next week** card. Safety warnings and coaching notes are pinned to the day they matter and
can't be dismissed. Weight, set, rep, reserve and rest changes apply only when you tap
**Approve**. Your logs reach the routine because the app copies them to a **private** GitHub repo;
the public app repo never holds your data, and the routine cannot write to it.

It is built in three phases, each useful on its own: **cloud backup** first, then the **Saturday
review shown in the app**, then **one-tap Approve** — scoped by what the first real reviews
actually needed.

---

## 1. Decisions (Brian, 2026-10-04)

| Question | Decision |
|---|---|
| How hands-off? | **Propose, I approve.** No prescription changes without an explicit Approve. |
| How does data leave the phone? | **Zero taps.** The app syncs to a private repo on its own. |
| Where to read and approve? | **Inside the workout app** — a Next week card. |
| Approach | **A — changes apply on the phone**, as a layer over `src/program.js`. |
| Standing exception to "never push without approval" | The app and the routine may write to the **private `Workout-Data` repo only**, within the paths in §3. Nothing automated can write to `Workout-Plan` (§8 makes that structural, not just an instruction). |
| Approval granularity | **All or nothing**, with Undo (for Approve and Decline) until the week's first set is logged. |
| Schedule | **Saturday 14:07 local**, weekly. |
| **Volume floors** | **Floors hold.** A planned weekly change may never take a normal week below a volume floor (press 16–20, vertical 8, horizontal 6, press:pull ≤ 1.30, biceps 6, triceps 6, calves 6) or any structural floor in any week. A cut that would need to go below one becomes a `manual` alert. In-gym time cuts by the cut order are unaffected. |
| Critique | All 21 recommendations from the adversarial review are adopted (§14). |

Rejected: **B** (Approve triggers a redeploy) and **C** (in-app API call with a paid key).

---

## 2. Architecture

```
iPhone tracker (bjoliveira8.github.io/Workout-Plan)
  │  GitHub Contents API, fine-grained token scoped to Workout-Data only
  ▼
bjoliveira8/Workout-Data   (PRIVATE — the only repo attached to the routine)
  data/bundle.json         ← phone writes (includes decisions, in `reviews`)
  reports/week-NN.json     ← phone writes
  proposals/week-NN.json   ← routine writes
  CLAUDE.md                ← the routine's instructions (§8)
  ▲
  │  clone / pull --rebase / push (GitHub proxy)
Cloud routine "Weekly training review" (Opus 5.5, Sat 14:07 local)
  │  read-only HTTPS download (raw.githubusercontent.com, on the default Trusted allowlist)
  ▼
bjoliveira8/Workout-Plan   (PUBLIC — NOT attached, so the routine has no push access)
  src/program.js, src/review.js, tools/week-context.mjs, tools/check-proposal.mjs,
  docs/autoregulation-criteria.md, docs/12-week-concurrent-block-v5.md
```

The phone and the routine never write the same file.

**Verified 2026-10-04 (Claude Code docs, "Cloud environments"):** the GitHub proxy "doesn't limit
which branches a push can update" on an attached repo — so attaching `Workout-Plan` would let a
run push to the branch Pages deploys from. Files from public repos arrive through
`raw.githubusercontent.com`, which is on the default Trusted list. Node 22 is preinstalled.
`api.github.com` answers a cross-origin preflight from `https://bjoliveira8.github.io` with
`access-control-allow-origin: *`, allowing `PUT` with an `Authorization` header.

---

## 3. The private data repo — `bjoliveira8/Workout-Data`

| Path | Writer | Contents |
|---|---|---|
| `data/bundle.json` | phone | The full backup in exactly the `exportBackup` format (so Restore from cloud reuses `restoreBackup`). Backup `version` **17**: adds `reviews` (§7.2), which is also where decisions live — there is no separate decisions folder. |
| `reports/week-NN.json` | phone | `buildReviewJSON(n)` for the **calendar week** (from today's local date and `META.startDate`) and, if different, the week on screen. Report `version` **18** (§7.6). |
| `proposals/week-NN.json` | routine | §5. `NN` = the week the proposal is **for**. |
| `CLAUDE.md` | Brian, via a reviewed commit | The routine's full instructions (§8). |
| `practice/` | Brian, via a reviewed commit | The four practice weeks (§10.4). |

GitHub keeps every version of every file — a cloud history of the training data.

---

## 4. Phone → private repo sync

### 4.1 Setup (once)
Brian creates the private repo and a **fine-grained personal access token**: *Only select
repositories → Workout-Data*, *Contents: Read and write*, **expiring 31 Jan 2027** (just after the
block ends — least exposure; renew with the next block). He pastes it into **Settings → Cloud
sync** with that expiry date.

### 4.2 Where the key lives
A separate localStorage key **`pp-sync-v1`** =
`{ token, owner, repo, tokenExpires, lastOk, lastError, paused, files: { [path]: { sha, hash } } }`.
It is **not** inside `pp-tracker-v3` (whose key never changes), so it never appears in Copy backup,
`bundle.json` or any report. Every page on `bjoliveira8.github.io` shares this storage; today the
root of that origin is empty (HTTP 404) and only Brian's own project pages live there.

### 4.3 When it syncs
iOS freezes a home-screen app the moment it leaves the screen, so **no sync may depend on a
timer firing after the app is closed.** The only timer is 3 s, while the app is still on screen.
Triggers:

| Trigger | Why |
|---|---|
| **3 s after a change to a tissue or note field** — adductor post/next-morning checks, session notes, exercise notes | Carries the Saturday-morning check while the app is still open |
| **Finish** on a session | The session is complete |
| **App goes to background** (`visibilitychange` → hidden), if anything changed and the last upload was ≥ 10 min ago | Catches set logs without uploading after every set |
| **App open**, if anything changed since the last upload or the last attempt failed | Catch-up |
| **Approve / Decline / Undo** | The review state changed |

A sync uploads a file **only when its content hash differs** from the last successful upload of
that path. Syncs run **one at a time** (a single queue). Each `PUT` uses the cached `sha` from
`pp-sync-v1`, so it is one request (best chance of finishing before iOS suspends the app).

The routine treats a missing next-morning check as **unknown**, never as normal (brain §7.4), and
says so in the proposal — the honest fallback if a sync still doesn't land.

### 4.4 Conflicts and the second-device guard
- `409`/`422` on `PUT` (the remote changed since our cached `sha`): `GET` the remote file. For
  `data/bundle.json`, **if the remote holds more logged sets than the local bundle, stop**: set
  `paused`, show "Another device has newer data — sync paused", never overwrite. Otherwise update
  the cached `sha` and retry once.
- **First sync on a device** (no cached `sha`): `GET` first, and apply the same guard. If the cloud
  copy has more logged sets, offer Restore from cloud instead of uploading.

### 4.5 Status and restore
- Settings: "Synced 2 min ago" · "Sync failed — tap to retry" · "Key expired — paste a new one"
  (HTTP 401) · "Sync paused — another device" · key expiry date · **Sync now**.
- Header warning dot when there has been no successful sync for more than 24 h.
- **Restore from cloud** (Settings): shows the cloud copy's date and logged-set count next to the
  phone's, asks to confirm, then feeds it to `restoreBackup`.
- Offline: the app behaves exactly as today and catches up later.

---

## 5. The proposal file

```json
{
  "schema": 1,
  "program": "astra-synthesis-v5",
  "reviewedWeek": 2,
  "forWeek": 3,
  "createdAt": "2026-10-10T18:07:00Z",
  "basedOn": { "reportExported": "<report timestamp>", "bundleExported": "<bundle timestamp>" },
  "status": "proposed",
  "fatigueLevel": 1,
  "fatigueEvidence": "One poor exposure: Wednesday's OHP top double. Every other first work set landed inside its reserve; next-morning checks normal.",
  "findings": [
    { "kind": "observation", "text": "Wed OHP top double at 117.5: first set at 1 RIR against a 2–3 target." },
    { "kind": "hypothesis",  "text": "Short sleep before Wednesday may explain it — one exposure only." }
  ],
  "summary": "≤ 80 words, plain language.",
  "alerts": [
    { "level": "stop", "days": ["wed", "fri"], "text": "…the brain's printed response…", "rule": "§4 tissue gate" }
  ],
  "changes": [
    { "day": "wed", "id": "ohptop", "field": "load", "from": 120, "to": 117.5,
      "why": "Hold at last week's load instead of taking the planned +2.5: the first set came in about 1 RIR harder than prescribed.",
      "rule": "§3 level 1 — hold loads; §2 no automatic increase",
      "reverseIf": "Next Wednesday's first set lands at 2–3 RIR with normal speed." },
    { "day": "wed", "id": "ohptop", "field": "rest", "from": 150, "to": 180,
      "why": "Rest toward 3:00 after one poor exposure.", "rule": "§3 level 1",
      "reverseIf": "Same as the load hold." }
  ],
  "holds": [
    { "day": "fri", "id": "squat", "why": "Last exposure was 2 RIR; squat increases need ≥3.", "rule": "§2" }
  ],
  "notes": [
    { "day": "fri", "id": "calfseat", "text": "Every set reached 20 — add the smallest load step.", "rule": "§5 calves" }
  ],
  "check": { "passed": true, "failures": [] }
}
```

- `status`: `proposed` · `hold` (no changes warranted; `changes` empty) · `no-data` (no report for
  the reviewed week) · `summary-only` (rails check failed twice, or `forWeek` would be 13).
- `fatigueLevel` 0–3 with evidence, `findings` (≤ 5, observations separated from hypotheses),
  `holds`, and a `reverseIf` on every change — the brain's §7 required output.
- `alerts[].level`: `stop` (tissue-gate trigger or "stop the affected work"), `manual` (needs a
  change outside §6 — including any cut below a floor), `info`. `days` pins it (§7.4).
- `notes` (≤ 8, each ≤ 140 characters): advisory coaching lines pinned to an exercise, to `impact`
  or to the session (`id: "session"`) for next week. They change no prescription, so they carry
  most of brain §5 (arms, calves, DB incline, leg accessories, power, core — weights Brian chooses
  in the gym) and gym-ready tissue instructions ("start Wednesday impact at the lower pogo dose").
- `check` is informational only. **The phone never trusts it** (§7.3).

---

## 6. What a change may do, and the rails check

### 6.1 Change rules (`validateChange` in `src/review.js`)

Changes apply only to **default set-grid items** (not `impact`, `run` or `check` cards), never to
an item with `test: true`, only in `forWeek`, never in week 13. At most one change per
`(day, id, field)`. Every change's `from` must equal the plan's current value.

| field | Rule |
|---|---|
| `load` | Only the twelve loaded ids in the step map below (a test asserts the map covers every numeric-load item in `program.js`). `to` ≤ planned. `to` ≥ min(planned, last performed) − 2 steps, where **last performed** = the heaviest completed work-set load for that `(day, id)` in the most recent **non-reduced** week it was logged (weeks 6 and 12 excluded, so a deload never sets the floor). Multiple of 2.5. Dips and pull-ups change the **added** load. |
| `sets` | Integer, `to` < planned, `to` ≥ `protectedSets`, never below 2 unless the plan itself prescribes 1 (two-set rule). |
| `remove` | Only when `protectedSets === 0` (today: the Friday DB incline bench). `to: true`. |
| `reps` | Only fixed rep targets (`repsNum === repsMax`). planned − 2 ≤ `to` ≤ planned, ≥ 1. |
| `rir` | Only reserve targets with a numeric floor (RPE effort targets excluded). Easier only: new floor ≥ planned floor and ≥ `RIR_FLOOR(forWeek)`. |
| `rest` | **Up only, priority lifts only:** ids `ohp ohptop ohpback dipheavy dipback dip pullup pulluplong bench`; planned < `to` ≤ 180 s. No other rest may change (brain §6: priority rests never below 2:00, squat/deadlift never below 2:30). |

**Step map** (verified against all twelve weeks of `program.js`, 2026-10-04):

| Step | ids |
|---|---|
| 2.5 lb | `ohp`, `ohptop`, `ohpback`, `dipheavy`, `dipback`, `dip`, `pullup`, `pulluplong` |
| 5 lb | `bench`, `squat` |
| 10 lb | `dl`, `dlback` |

Everything else — impact and sprint progressions, power, swapping an exercise, frequency, deloads,
tests, targets, any cut below a floor — is an **alert** or a **note**, never a change.

### 6.2 The rails check (`checkRails` in `src/review.js`)

A **new** rules check, deliberately separate from `test.mjs`. `test.mjs`'s invariants verify that
the plan matches its source **exactly** (pressing = 20, calves = 6, row count = 464, the live audit
equals the stored `AUDIT`); applied to a changed week they would reject every legitimate cut. They
stay untouched and keep guarding the unchanged plan.

`checkRails(week, effectiveSessions, META)` recomputes the week's audit from the effective table and
enforces the **limits**:
- Normal weeks: press 16–20 · vertical ≥ 8 · horizontal ≥ 6 · press:pull ≤ 1.30 · biceps ≥ 6 ·
  triceps ≥ 6 · calves ≥ 6 (`META.floors`). Weeks 6 and 12 waive these volume floors only.
- Every week: lower days = 2 · shoulder ≥ 3 · abs ≥ 4 · adductor = 2 · carry ≥ 2 · unilateral ≥ 4 ·
  power ≥ 4 (3 in week 12) · no item below 2 sets unless the plan prescribes 1 · every reserve
  target ≥ `RIR_FLOOR`.
- **Time:** holds by construction — nothing adds sets, reps or exercises, and the only increase
  (priority rest up to 3:00) is already inside `secondsIfMaxRests` ≤ 4500 s, which the source plan
  computes with every OHP/dip/pull-up/bench rest at 3:00. `checkRails` asserts
  `secondsIfMaxRests ≤ 4500` for the week as a tripwire.

### 6.3 Code layout

| File | New? | Purpose |
|---|---|---|
| `src/review.js` | new | Pure, zero-dependency: `STEP_MAP`, `PRIORITY_REST_IDS`, `validateChange`, `applyChanges(sessions, week, changes) → { sessions, applied, skipped }`, `checkRails`, `lastPerformedLoad`. `rirTarget` and `RIR_FLOOR` move here from `App.jsx` and are imported back. No React components (focus-loss rule untouched). |
| `tools/week-context.mjs` | new | `node tools/week-context.mjs <forWeek> <report.json>` → a compact table of every changeable item for that week: day, id, name, planned load/sets/reps/rir/rest, step, allowed range for each field, last performed load. The routine copies `from` values from here — never from the 400 KB `program.js`. |
| `tools/check-proposal.mjs` | new | `node tools/check-proposal.mjs <proposal.json> <report.json>`: schema → `validateChange` per change → `applyChanges` → `checkRails`. Exit 0/1, prints failures. **Zero dependencies** — no `npm ci`. |
| `src/App.jsx` | edit | Sync, card, pinned alerts/notes, apply layer, Settings sections. |
| `test.mjs` | additions only | §10. Existing invariants unchanged. |

---

## 7. The app

### 7.1 Fetching
On open (and after each sync), the app GETs `proposals/week-{calendar week}.json` and
`proposals/week-{calendar week + 1}.json`. A proposal whose `program` ≠ `PROGRAM_ID` is ignored.

### 7.2 State — `reviews` in the bundle
`reviews[forWeek] = { proposal, status: "pending" | "approved" | "declined", decidedAt, applied, skipped }`.
A fetched proposal is stored as `pending`. Missing → `{}`. The **program-collision migration
archives `reviews`** with the rest of the training data. Because `reviews` is in `bundle.json`, the
routine reads decisions from there.

### 7.3 Approve, Decline, Undo
- **Approve** first re-runs `validateChange` and `checkRails` **on the phone**, using the phone's own
  logs for last-performed loads. If either fails, Approve is disabled and the card says why.
- Approve applies all valid changes. A change whose `from` no longer matches the plan (e.g.
  `program.js` was edited in a manual session) is **skipped** and listed; the rest apply.
- **Late approval:** if any set is already logged in `forWeek`, only days with no logged sets
  change; the card says so before the tap.
- **Decline** leaves prescriptions as planned.
- **Undo** works for both, returning to `pending`, until the first set of `forWeek` is logged.

### 7.4 What is always shown, whatever the decision
**Alerts and notes are advisory and are never hidden by Decline.** Each `alert` with `days` shows
as a banner at the top of those sessions in `forWeek` (`stop` in the warning colour, first). Each
`note` shows as a coaching line on its exercise card, on the impact card, or at the top of the
session. Brain §4's in-app tissue banner keeps working as today; the review adds to it, never
replaces it.

### 7.5 Applying (Phase 3)
- A memoised **effective session table** = `applyChanges(SESSIONS, w, approved changes)` for every
  approved week. Every session read already goes through `sessionFor()`
  ([src/App.jsx:131](../../../src/App.jsx)) — the only direct `SESSIONS[…]` read in the app — so
  that is the single hook. `sessionFor` is module-level, so the component publishes the effective
  table to it (module variable set on change) rather than defining anything inside the component.
- Changed exercises show a small **adjusted** chip (0.5 px hairline, existing chip styling);
  tapping it shows `from → to`, `why` and `reverseIf`.
- The week strip's bar heights (`WEEK_LOAD`) and the report's volume audit are recomputed from the
  effective table instead of the stored `AUDIT`.
- **Sunday prompt:** logging the first set of a week whose review is still `pending` shows a
  one-time prompt: "Next week's review is waiting — look at it first?"

### 7.6 The week report (version 18)
- Rows report **effective** prescriptions and add `adjusted: { field, planned, to, rule }` where a
  change applied.
- Rows and `history` entries add **`performedLoad`** — the heaviest completed work-set load. Today
  `history[].load` is the *planned* load of the earlier week ([src/App.jsx:723](../../../src/App.jsx)),
  so the review cannot currently see a stall. `history` also reads effective prescriptions.

### 7.7 UI
- **Next week card**, top of the main screen while a proposal is `pending`: alerts → fatigue level
  → findings → change list (day · exercise · from → to · why) → holds → **Approve** / **Decline**.
  Phase 2 shows it read-only (§11).
- Iron theme vars only, 0.5 px hairlines, Barlow Condensed buttons, no `nowrap` on long text (the
  `.rx` overflow trap).
- **Settings → Cloud sync** (§4.5) and **Settings → Weekly reviews** (past proposals, decision, date).
- The **AI Analysis** copy button and the text report stay.

---

## 8. The Saturday routine

| Setting | Value |
|---|---|
| Name | Weekly training review |
| Trigger | Schedule, weekly, **Saturday 14:07** local time |
| Model | **Opus 5.5** (`claude-opus-5-5`) |
| Repositories | **`bjoliveira8/Workout-Data` only** |
| Environment | Default (Trusted network) |
| Connectors | **None** (remove every default) |
| Saved prompt | "Run the weekly training review exactly as `CLAUDE.md` in this repository describes." |

**`Workout-Data/CLAUDE.md` instructs the run to:**
1. Download, read-only, from `https://raw.githubusercontent.com/bjoliveira8/Workout-Plan/main/` into
   a scratch folder with the same layout: `src/program.js`, `src/review.js`,
   `tools/week-context.mjs`, `tools/check-proposal.mjs`, `docs/autoregulation-criteria.md`,
   `docs/12-week-concurrent-block-v5.md`. Never clone, commit to or push to Workout-Plan.
2. Compute the reviewed week N from Brian's local date and `META.startDate` (2026-09-27; week N's
   Sunday = start + 7(N − 1)); `forWeek = N + 1`. Cross-check against the report's own week.
3. If `proposals/week-{forWeek}.json` exists **and** `data/bundle.json` → `reviews[forWeek].status` is
   `approved` or `declined`, stop — never overwrite a decided proposal.
4. If `reports/week-NN.json` is missing, write a `no-data` proposal and stop.
5. Run `node tools/week-context.mjs <forWeek> <report>`. Read the brain, the program doc, the report,
   earlier proposals and `reviews`. Apply the brain exactly — load gate on first work sets, domain
   review, fatigue levels, tissue gate, §5 gates; missing data is unknown. The block wins.
6. Draft the proposal (§5): changes only within §6.1 and only with values inside the ranges
   `week-context` printed; everything else becomes an alert or a note; any cut below a floor is a
   `manual` alert.
7. `node tools/check-proposal.mjs`. On failure revise once; still failing → `summary-only` with the
   failures listed.
8. If `forWeek` is 13: `summary-only`, no changes, no week-13 advice.
9. Write `proposals/week-{forWeek}.json`, `git pull --rebase`, commit
   `review: week N → proposal for week N+1`, push to **Workout-Data `main`**. Never write outside
   `proposals/`.
10. The brain's "Never" list applies in full.

Usage: one Opus 5.5 run a week on Brian's subscription; the routine reads compact tool output, not
the full program file.

---

## 9. Failure handling

| Failure | What Brian sees | Recovery |
|---|---|---|
| Key expired / revoked (401) | "Key expired — paste a new one", header dot | Paste a new key |
| Offline in the gym | Nothing different | Next trigger catches up |
| Saturday-morning check didn't sync | The proposal names it as unknown | Re-run from the routine page if it matters |
| Another device wrote newer data | "Sync paused — another device" | Restore from cloud, or resolve, then resume |
| Routine failed or skipped | From Sunday: "No review for week N" in Settings | Copy-paste AI Analysis (unchanged) |
| Rails check fails twice | Card with findings, **no changes**, failures listed | Manual Claude Code session if wanted |
| Phone's own re-check fails | Approve disabled, reason shown | Decline, or a manual session |
| Proposal arrives after the week started | Card notes "applies to days you haven't started" | Approve applies to unstarted days only |
| `program.js` edited after the proposal | Mismatched changes listed as skipped | Nothing — by design |
| Phone data lost | — | Settings → Restore from cloud |
| New program loaded | Old proposals ignored | Update `Workout-Data/CLAUDE.md` for the new block |
| Routines research preview changes | Possibly no card | Copy-paste fallback stays |

---

## 10. Testing

### 10.1 `test.mjs` additions (jsdom, mocked `fetch`)
- **Step map completeness:** every numeric-load item in all twelve weeks of `program.js` has a
  `STEP_MAP` entry (would have caught `dlback`).
- **Sync:** each trigger in §4.3; hash dedupe (no upload when unchanged); one-at-a-time queue;
  cached-`sha` single-request `PUT`; 401 → "Key expired"; 409 → `GET` → second-device guard pauses
  when the remote has more logged sets; first-sync guard; the token never appears in Copy backup,
  `bundle.json` or a report.
- **Card and decisions:** each status renders; Approve / Decline / Undo write the right `reviews`;
  Undo disappears once a set is logged; late approval skips started days; Sunday prompt fires once.
- **Advisory display:** alerts and notes still show after Decline, on the right days and cards.
- **Apply:** effective values reach the set grid, Rx button and placeholders; stale `from` skipped;
  wrong-program proposal ignored; collision migration archives `reviews`; week strip and volume
  audit follow the effective table.
- **Report v18:** effective values, `adjusted`, `performedLoad` in rows and `history`.
- Existing suite passes **unchanged**.

### 10.2 Rules unit tests (`src/review.js`)
One passing and at least one failing case per row of §6.1 and per rail in §6.2, including: load
above plan; load three steps below the floor; a deload week setting the floor (must be ignored);
`dlback` stepping by 2.5 (must fail); sets below `protectedSets`; a single set on a multi-set item;
`remove` on a protected item; any rest decrease; a rest increase on squat; reserve harder than
planned; a change to a `test: true` item or an impact card; a cut taking normal-week triceps to 5;
a cut taking press:pull above 1.30.

### 10.3 `check-proposal.mjs` fixtures
`tools/fixtures/` — one valid proposal that must pass and one failing fixture per rule above;
plus a malformed file and a wrong `forWeek`.

### 10.4 Practice weeks (before the schedule is enabled)
Four synthetic week reports in `Workout-Data/practice/`, each with an answer fixed by the brain's
tables:

| Practice week | Required outcome |
|---|---|
| Normal week, every first set inside its reserve | `hold` or planned increments only; fatigue 0 |
| Wed OHP first work set 1 RIR harder than prescribed | Fatigue level 1; next week's `ohptop` **held** at this week's load (planned increment not taken), rest toward 3:00 allowed, each change with a `reverseIf`. Updated 2026-10-07 (Brian — the block wins): the same day's back-offs may follow the top double (~96%) and Wednesday's cut-first sets may drop; nothing on any other day changes |
| Abnormal next-morning adductor check after Friday | `stop` alert pinned to Wed + Fri; no impact or sprint progression |
| No report for the week | `no-data` |

The routine's instructions are run against all four in a local Claude Code session on Opus 5.5;
all four must come out right. Then one cloud **Run now** on real data, which Brian reviews in the
app, before the Saturday schedule is switched on.

### 10.5 Real browser
The card, pinned banners, notes and the adjusted chip at 375 px: `scrollWidth − clientWidth === 0`.

---

## 11. Build phases

Each phase ends with `npm run build && npm test`, a 375 px browser check where UI changed, and a
deploy only after Brian sees the diff and says yes.

1. **Cloud sync and backup.** `pp-sync-v1`, the §4.3 triggers, dedupe, queue, conflict and
   second-device guards, status UI, Restore from cloud. Brian creates the private repo and key;
   confirm sync from the iPhone home-screen app. *Value: a cloud backup from day one, and real data
   to build the review against.*
2. **The Saturday review, read-only.** `src/review.js` (rules + rails), `tools/week-context.mjs`,
   `tools/check-proposal.mjs` + fixtures, report v18, proposal fetch, `reviews` (pending only), the
   Next week card **without Approve**, pinned alerts and notes, and each proposed change shown as a
   suggestion line on its exercise card ("Saturday review: 120 instead of 122.5"). Then
   `Workout-Data/CLAUDE.md`, the four practice weeks, the routine, one dry run, schedule on.
   *Value: no more copy-paste; the review arrives in the app every Saturday.*
3. **One-tap Approve.** Only after **2–3 real proposals**, and a short go/no-go with Brian on what
   they actually contained: the effective table, Approve / Decline / Undo, the adjusted chip, the
   Sunday prompt, effective values in the report, week-strip recompute. The §6.1 scope is
   trimmed or extended to match those proposals (any extension needs Brian's approval and a spec
   update).

**Docs to update:** `CLAUDE.md` (architecture, the weekly loop, backup v17 / report v18, backlog
item 1, and that the app now makes network calls — reversing "No API calls from the app"), the
brain's §9 "Applying an accepted change" (the card for §6.1 changes; a Claude Code session for the
rest), `README.md`.

---

## 12. Out of scope

Impact, sprint and power progression **changes** (alerts and notes only) · cuts below a floor
(manual) · per-change approval · push notifications · more than one device · week 13 · cycle-2
regeneration · nutrition, ride content, readiness formulas (permanently out, per the brain).

---

## 13. Risks

- **Routines are a research preview.** Mitigation: the copy-paste path is untouched.
- **iOS may suspend a sync mid-flight.** Mitigation: single-request uploads, several triggers, and
  the review treating missing data as unknown.
- **Key expiry stops sync.** Mitigation: expiry date in Settings, header dot after 24 h.
- **Review quality.** Mitigation: the practice weeks, a narrow change scope, mechanical rails
  checked twice (routine and phone), and nothing applies without Approve.
- **Manual edits to `program.js` mid-block** can make approved changes stale. Mitigation: `from`
  matching skips them visibly.
- **The brain changes** (a new block, an edited rule). Mitigation: the routine downloads the brain
  fresh each run; the step map test fails loudly when loaded ids change.

---

## 14. Appendix — revision 2 changes (adversarial review, 2026-10-04)

| # | Problem in revision 1 | Change | Where |
|---|---|---|---|
| 1 | Reusing `test.mjs` invariants on a changed plan rejects every legitimate cut (they are exact-match checks) | New limits-based `checkRails`; `test.mjs` untouched, no extraction | §6.2 |
| 2 | "Others ≤ planned" let rest drop below brain §6 minimums | Rest up only, priority ids only, ≤ 180 s | §6.1 |
| 3 | Deadlift matched by `dl` only — `dlback` got a 2.5 lb step | Explicit verified step map + completeness test | §6.1, §10.1 |
| 4 | Decline hid stop alerts; gym instructions lived only on a Saturday card | Alerts and notes always shown, pinned to days and cards; `note` type added | §5, §7.4 |
| 5 | A 30-s timer never fires once iOS freezes the app | Tissue/note fields sync after 3 s; background, Finish, open, decision triggers; single-request `PUT` | §4.3 |
| 6 | Floor anchored to plan → forced catch-up after a stall | Floor = min(planned, last performed in a non-reduced week) − 2 steps; report gains `performedLoad` | §6.1, §7.6 |
| 7 | Proposal lacked brain §7's required output | `fatigueLevel`, evidence, ≤ 5 findings (observation/hypothesis), `holds`, `reverseIf` | §5 |
| 8 | Only 13 of 39 exercises in week 3 have a programmed load; most §5 progressions inexpressible | `notes` carry them | §5 |
| 9 | Phone trusted the file's "check passed" | Phone re-runs the rules on Approve | §7.3 |
| 10 | Hardest part built first on an untested assumption | Phases reordered: sync → read-only review → Approve after 2–3 real proposals | §11 |
| 11 | One dry run only | Four practice weeks with fixed answers, then a dry run | §10.4 |
| 12 | Hundreds of commits a week; write races | Hash dedupe, one-at-a-time queue, cached `sha`, `pull --rebase` | §4.3, §4.4, §8 |
| 13 | A second device could overwrite the backup | Logged-set guard on conflict and first sync; Restore shows both dates | §4.4, §4.5 |
| 14 | Decisions recorded twice | Decisions live only in `reviews` inside `bundle.json` | §3, §7.2 |
| 15 | An attached `Workout-Plan` could be pushed to (proxy doesn't limit branches) | Only `Workout-Data` attached; Workout-Plan files read via raw.githubusercontent.com | §2, §8 |
| 16 | Routine would read 400 KB `program.js` and `npm ci` | `week-context.mjs` + zero-dependency checker | §6.3 |
| 17 | Key expiry "longest offered" | Expires 31 Jan 2027 | §4.1 |
| 18 | Decline had no Undo | Undo for both | §7.3 |
| 19 | Week strip and volume audit used stored `AUDIT` | Recomputed from the effective table | §7.5 |
| 20 | First Sunday set before seeing the card skipped Sunday's changes | One-time prompt | §7.5 |
| 21 | Spec silently reversed "No API calls from the app" | Recorded in the docs update | §11 |
| — | Floors question | Brian: floors hold for planned changes | §1, §6.2 |
