# Phase 1 — Cloud Sync and Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tracker quietly copies Brian's training data and week reports to a private GitHub repo (`bjoliveira8/Workout-Data`) with zero taps, so his logs are backed up and a Saturday review can read them.

**Architecture:** A new framework-free module, `src/sync.js`, holds all sync logic (hashing, GitHub calls, the second-device guard, a one-at-a-time queue) with `fetch` injected, so Node tests import it directly. `src/App.jsx` wires it in: the sync config lives in its own storage key (`pp-sync-v1`), five triggers call one `doSync()`, and Settings gains a Cloud sync section with Restore from cloud. Nothing about the program, the prescriptions or the existing backup format changes.

**Tech Stack:** React 18 (single-file app), esbuild bundle, jsdom + Node 24 test suite (`test.mjs`), GitHub REST Contents API (`api.github.com`, fine-grained token).

**Spec:** `docs/superpowers/specs/2026-10-04-weekly-ai-review-design.md` (revision 2) — this plan implements **§4 and the Phase 1 row of §11** only. Phases 2 and 3 get their own plans when their gates are reached (Phase 2 after sync is verified on the iPhone; Phase 3 after a go/no-go on 2–3 real proposals).

## Global Constraints

- Storage key **`pp-tracker-v3`** never changes. The sync config lives in a separate key, **`pp-sync-v1`**.
- The GitHub key **never** appears in Copy backup, `data/bundle.json`, any week report, or `pp-tracker-v3`.
- Backup format stays **version 16** in Phase 1 (v17 arrives with `reviews` in Phase 2). Week report stays **version 17**.
- Private repo: owner `bjoliveira8`, repo `Workout-Data`. Files: `data/bundle.json`, `reports/week-NN.json` (zero-padded).
- Triggers (spec §4.3): tissue/note fields **3 s** after the change; **Finish**; **app hidden or shown** when a tissue/note change is pending, the last attempt failed, or the last upload was **≥ 10 min** ago; **cold app open**. (Approve/Decline/Undo triggers arrive in Phase 2/3.)
- Upload a file **only when its content hash changed** (the backup hashed **without** its `exported` stamp). **One sync at a time.** `PUT` uses the cached `sha` (one request).
- `409`/`422` → `GET` remote; for the bundle, **if the remote holds more logged sets, pause and never overwrite**. Same guard on the **first sync from a device**.
- Every request times out after **20 s**.
- **Never define a component inside the app component** (focus-loss rule). New UI = plain render functions.
- Theme variables only, **0.5 px hairline** borders, Barlow Condensed uppercase buttons, no `nowrap` on long text; **`scrollWidth − clientWidth === 0` at 375 px** in a real browser.
- New enum/identifier string values use **underscores** (Brian's rule): `no_token`, not `no-token`.
- Every code block gets plain-language comments (Brian's rule), matching the file's existing comment density.
- **Every git command needs Brian's explicit yes**, shown exactly first. **Deploy only after he sees the diff and says yes.** Give him full absolute paths.
- `npm run build && npm test` before every commit — and read the build output (a failed build leaves a stale bundle).

## Review Focus

1. **A request that never answers** (one bar of signal in the gym) — must fail after 20 s and free the queue, not freeze every later sync. Pinned in Task 2 (`sync-hang-not-timed-out`).
2. **A backup larger than 1 MB** (the `archived` list carries four earlier programs) — GitHub then returns no inline content; the app must fetch the raw body. Pinned in Task 2 (`sync-large-file-fallback`).
3. **Notes typed on an iPhone keyboard** (–, ≤, ’, emoji) — base64 must be UTF-8 safe or the upload throws. Pinned in Task 1 (`sync-utf8-roundtrip`).
4. **A key pasted with spaces or a trailing newline** (as GitHub's copy button produces) — must be trimmed, or GitHub answers 401 forever. Pinned in Task 1 (`sync-token-not-trimmed`) and Task 4 (`app-key-not-trimmed-or-saved`).
5. **Late Saturday night and the 1 Nov 2026 clock change** — the calendar week must follow the phone's local date, or a report lands under the wrong week. Pinned in Task 1 (`sync-calendar-week`).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/sync.js` | Create | All sync logic, no React: config shape, hashing, UTF-8 base64, logged-set count, calendar week, GitHub GET/PUT with timeout, per-file sync with the guard, `runSync`, queue, status words. |
| `src/App.jsx` | Modify | Sync state + persistence, backup refactor (`backupObject`, `applyBackup`), `syncFiles`/`doSync`, the triggers, header dot, Settings → Cloud sync, Restore from cloud, CSS. |
| `test.mjs` | Modify | Stale-build list gains `src/sync.js`; shared fake GitHub; block 14 (engine unit tests); block 15 (app-level sync tests). |
| `CLAUDE.md` | Modify | Architecture and testing notes for sync; replaces "No API calls from the app". |
| `README.md` | Modify | Plain-language Cloud sync setup guide for Brian. |

---

### Task 1: Sync helpers (pure functions)

**Files:**
- Create: `src/sync.js`
- Modify: `test.mjs:16` (stale-build list), `test.mjs:~766` (new block 14 before the final `if (fail.length)`)

**Interfaces:**
- Consumes: nothing.
- Produces (exports of `src/sync.js`):
  - `SYNC_KEY = "pp-sync-v1"`, `BUNDLE_PATH = "data/bundle.json"`, `reportPath(w: number) → string`
  - `DAY_MS`, `HIDDEN_THROTTLE_MS = 600000`, `PRIORITY_DELAY_MS = 3000`, `REQUEST_TIMEOUT_MS = 20000`
  - `EMPTY_SYNC` = `{ token, owner, repo, tokenExpires, lastOk, lastUpload, lastAttempt, lastError, paused, files }`
  - `normalizeConfig(raw: any) → config` (merges `EMPTY_SYNC`, trims `token`)
  - `hashText(str) → string`, `stableForHash(path, text) → string`
  - `encodeBase64Utf8(str) → string`, `decodeBase64Utf8(b64) → string`
  - `countLoggedSets(bundle) → number`
  - `calendarWeek(now: Date, startDate: "YYYY-MM-DD", weeks: number) → number` (1..weeks)
  - `syncStatus(cfg, nowMs) → { tone: "ok"|"warn"|"bad"|"off", text }`, `needsAttention(cfg, nowMs) → boolean`, `expiryText(cfg, nowMs) → string`

- [ ] **Step 1: Add `src/sync.js` to the stale-build guard**

In `test.mjs`, line 16, change:

```js
for (const src of ["src/App.jsx", "src/entry.jsx", "src/program.js", "build.mjs"]) {
```

to:

```js
for (const src of ["src/App.jsx", "src/entry.jsx", "src/program.js", "src/sync.js", "build.mjs"]) {
```

- [ ] **Step 2: Write the failing tests (block 14, part 1)**

In `test.mjs`, insert immediately **before** the line `if (fail.length) { console.error("FAIL: " + fail.join(", ")); process.exit(1); }`:

```js
// 14) CLOUD SYNC ENGINE (src/sync.js) — spec §4. A plain module, imported straight into Node.
{
  const S = await import("./src/sync.js");
  // Compare as JSON so arrays and objects can be checked in one line.
  const eq = (a, b, tag) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail.push(`${tag}=${JSON.stringify(a)}`); };

  // The key is trimmed (GitHub's copy button can add a space or newline) and the repo defaults right.
  const cfg0 = S.normalizeConfig({ token: "  github_pat_TEST \n" });
  if (cfg0.token !== "github_pat_TEST") fail.push("sync-token-not-trimmed");
  if (cfg0.owner !== "bjoliveira8" || cfg0.repo !== "Workout-Data") fail.push("sync-default-repo");
  if (S.reportPath(2) !== "reports/week-02.json" || S.reportPath(11) !== "reports/week-11.json") fail.push("sync-report-path");

  // Hashing ignores the backup's `exported` stamp, and nothing else.
  const b1 = JSON.stringify({ exported: "2026-10-03T10:00:00Z", logs: { 1: {} } });
  const b2 = JSON.stringify({ exported: "2026-10-04T10:00:00Z", logs: { 1: {} } });
  if (S.hashText(S.stableForHash(S.BUNDLE_PATH, b1)) !== S.hashText(S.stableForHash(S.BUNDLE_PATH, b2))) fail.push("sync-hash-sees-exported");
  if (S.hashText(S.stableForHash(S.reportPath(1), b1)) === S.hashText(S.stableForHash(S.reportPath(1), b2))) fail.push("sync-report-hash-too-loose");
  if (S.hashText("a") === S.hashText("b")) fail.push("sync-hash-collides");

  // UTF-8 survives base64 both ways — iPhone notes carry –, ≤, ’ and emoji.
  const uni = "Adductors quiet – RPE ≤4, it’s fine 💪";
  if (S.decodeBase64Utf8(S.encodeBase64Utf8(uni)) !== uni) fail.push("sync-utf8-roundtrip");

  // Logged-set count: only rows holding a weight or reps.
  const logsFix = { 1: { sun: { dipheavy: [{ w: "45", r: "2" }, { w: "", r: "" }], bench: [{ w: "180" }] }, mon: { pullup: [null, { r: "3" }] } } };
  if (S.countLoggedSets({ logs: logsFix }) !== 3) fail.push("sync-count=" + S.countLoggedSets({ logs: logsFix }));
  if (S.countLoggedSets({}) !== 0 || S.countLoggedSets(null) !== 0) fail.push("sync-count-empty");

  // Calendar week by LOCAL date: Sunday 27 Sep 2026 starts week 1, late Saturday is still the
  // same week, the 1 Nov 2026 clock change shifts nothing, and the ends clamp to 1 and 12.
  const cw = (y, m, d, h = 12) => S.calendarWeek(new Date(y, m - 1, d, h), "2026-09-27", 12);
  eq([cw(2026, 9, 27), cw(2026, 10, 3, 23), cw(2026, 10, 4, 0), cw(2026, 11, 7, 23), cw(2026, 11, 8, 1), cw(2026, 9, 1), cw(2027, 3, 1)],
     [1, 1, 2, 6, 7, 1, 12], "sync-calendar-week");

  // Status words and the header dot.
  const now = Date.UTC(2026, 9, 10, 18, 7);
  const on = S.normalizeConfig({ token: "github_pat_TEST" });
  if (S.syncStatus(S.normalizeConfig({}), now).tone !== "off") fail.push("sync-status-off");
  if (!S.syncStatus({ ...on, lastOk: now - 120000 }, now).text.startsWith("Synced 2 min ago")) fail.push("sync-status-ok");
  if (!S.syncStatus({ ...on, paused: true }, now).text.startsWith("Sync paused")) fail.push("sync-status-paused");
  if (!S.syncStatus({ ...on, lastError: "auth" }, now).text.startsWith("Key expired")) fail.push("sync-status-auth");
  if (!S.syncStatus({ ...on, lastError: "error:0" }, now).text.startsWith("Last sync failed")) fail.push("sync-status-error");
  // [ADDED] audit gap 1: no signal is reported as "offline", not as a failure.
  if (!S.syncStatus({ ...on, lastError: "offline" }, now).text.startsWith("Offline")) fail.push("sync-status-offline");
  if (S.needsAttention(S.normalizeConfig({}), now)) fail.push("sync-dot-when-off");
  if (S.needsAttention({ ...on, lastOk: now - 3600000 }, now)) fail.push("sync-dot-when-fresh");
  if (!S.needsAttention({ ...on, lastOk: now - S.DAY_MS - 1 }, now)) fail.push("sync-dot-missing-after-24h");
  if (!S.needsAttention({ ...on, lastOk: now, paused: true }, now)) fail.push("sync-dot-missing-when-paused");
  if (!S.expiryText({ ...on, tokenExpires: "2027-01-31" }, now).startsWith("Key expires 31 Jan 2027")) fail.push("sync-expiry-text");
  if (!S.expiryText({ ...on, tokenExpires: "2026-10-20" }, now).endsWith("renew soon")) fail.push("sync-expiry-soon");
  if (!S.expiryText({ ...on, tokenExpires: "2026-10-01" }, now).startsWith("Key expired")) fail.push("sync-expiry-past");
}
```

- [ ] **Step 3: Run the suite to verify it fails**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: the test run aborts with `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `./src/sync.js` (or the stale-build check fails because `src/sync.js` does not exist — `statSync` throws). Either way: not "✓ all smoke tests…".

- [ ] **Step 4: Write `src/sync.js` (helpers only)**

Create `src/sync.js`:

```js
/* ═══════════ CLOUD SYNC — phone → private GitHub repo (Workout-Data) ═══════════
   Spec: docs/superpowers/specs/2026-10-04-weekly-ai-review-design.md §4.
   Framework-free on purpose: no React in here, so test.mjs imports it straight into Node,
   and nothing here can trip the focus-loss rule (no components).

   The key lives in its OWN storage entry (SYNC_KEY), never inside pp-tracker-v3, so it can
   never leak into Copy backup, data/bundle.json or a week report. */

export const SYNC_KEY = "pp-sync-v1";
export const BUNDLE_PATH = "data/bundle.json";
// Week reports are zero-padded so the repo lists them in order: reports/week-02.json.
export const reportPath = (w) => `reports/week-${String(w).padStart(2, "0")}.json`;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HIDDEN_THROTTLE_MS = 10 * 60 * 1000; // set logs: upload at most every 10 min on leave/return
export const PRIORITY_DELAY_MS = 3000;            // tissue checks and notes: upload 3 s after the edit
export const REQUEST_TIMEOUT_MS = 20000;          // one bar of signal must fail, not freeze the queue

/* Everything the phone remembers about sync. `files` caches, per path, GitHub's `sha` (needed
   to update a file in ONE request) and the hash of what was last uploaded (to skip re-uploads). */
export const EMPTY_SYNC = {
  token: "", owner: "bjoliveira8", repo: "Workout-Data", tokenExpires: "",
  lastOk: null, lastUpload: null, lastAttempt: null, lastError: null, paused: false, files: {},
};

// Fill any missing fields and trim the key — a stray space or newline makes GitHub answer 401.
export const normalizeConfig = (raw) => {
  const c = { ...EMPTY_SYNC, ...(raw && typeof raw === "object" ? raw : {}) };
  c.files = c.files && typeof c.files === "object" ? c.files : {};
  c.token = String(c.token || "").trim();
  return c;
};

/* cyrb53 — a fast, well-spread 53-bit string hash. Not cryptographic; it only answers
   "is this the same text we uploaded last time?" */
export const hashText = (str) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

/* The backup carries `exported: <now>`, which changes every time it is built. Hash it without
   that stamp, or every sync would look like new data and commit again. Reports have no stamp. */
export const stableForHash = (path, text) => {
  if (path !== BUNDLE_PATH) return text;
  try { const o = JSON.parse(text); delete o.exported; return JSON.stringify(o); }
  catch (e) { return text; }
};

/* GitHub's Contents API speaks base64. btoa only accepts Latin-1, and notes carry "–", "≤",
   "’" and emoji, so convert through UTF-8 first. (escape/unescape are old but exist everywhere,
   including jsdom, which is why they are used instead of TextEncoder.) */
export const encodeBase64Utf8 = (str) => btoa(unescape(encodeURIComponent(str)));
export const decodeBase64Utf8 = (b64) => decodeURIComponent(escape(atob(String(b64).replace(/\s/g, ""))));

/* How much training a bundle holds: every logged set row with a weight or reps in it. Used only
   to stop a near-empty device from overwriting a fuller cloud copy. logs[week][day][exId] = rows. */
export const countLoggedSets = (bundle) => {
  let n = 0;
  const logs = (bundle && bundle.logs) || {};
  for (const wk of Object.values(logs))
    for (const dy of Object.values(wk || {}))
      for (const rows of Object.values(dy || {}))
        if (Array.isArray(rows)) for (const e of rows) if (e && (e.w || e.r)) n++;
  return n;
};

/* Which block week today falls in, by the phone's LOCAL date — a late-Saturday sync must not
   tip into next week because UTC already has. Math.round absorbs the 23- or 25-hour day of a
   clock change. Clamped to 1..weeks. */
export const calendarWeek = (now, startDate, weeks) => {
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today - start) / DAY_MS);
  return Math.min(weeks, Math.max(1, Math.floor(days / 7) + 1));
};

// "3 min ago", "5 h ago", "2 days ago".
const ago = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

/* What Settings says, in plain words. `tone` picks the colour: ok | warn | bad | off. */
export const syncStatus = (cfg, nowMs) => {
  if (!cfg.token) return { tone: "off", text: "Cloud sync is off" };
  if (cfg.paused) return { tone: "bad", text: "Sync paused — the cloud copy has more training logged than this phone" };
  if (cfg.lastError === "auth") return { tone: "bad", text: "Key expired or revoked — paste a new one" };
  // [ADDED] audit gap 1 — no signal (a gym basement): not an error, it catches up by itself.
  if (cfg.lastError === "offline") return { tone: "warn", text: "Offline — will sync when there's a signal" };
  if (cfg.lastError) return { tone: "warn", text: "Last sync failed — tap Sync now to retry" };
  if (cfg.lastOk) return { tone: "ok", text: `Synced ${ago(nowMs - cfg.lastOk)}` };
  return { tone: "warn", text: "Not synced yet" };
};

/* The header dot: sync is on, and it is paused, refused, or hasn't succeeded for a day. */
export const needsAttention = (cfg, nowMs) =>
  !!cfg.token && (cfg.paused || cfg.lastError === "auth" || !cfg.lastOk || nowMs - cfg.lastOk > DAY_MS);

/* "Key expires 31 Jan 2027" — with a nudge in the last two weeks, and a plain notice after. */
export const expiryText = (cfg, nowMs) => {
  if (!cfg.tokenExpires) return "";
  const [y, m, d] = String(cfg.tokenExpires).split("-").map(Number);
  if (!y || !m || !d) return "";
  const exp = new Date(y, m - 1, d);
  const label = exp.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const days = Math.ceil((exp.getTime() - nowMs) / DAY_MS);
  if (days < 0) return `Key expired ${label}`;
  return days <= 14 ? `Key expires ${label} — renew soon` : `Key expires ${label}`;
};
```

- [ ] **Step 5: Run the suite to verify it passes**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `dist/index.html built (… KB)` then `✓ all smoke tests and program invariants passed`.

- [ ] **Step 6: Commit (show Brian the command; run only after his yes)**

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && git add src/sync.js test.mjs && git commit -m "feat(sync): pure helpers for cloud sync

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: GitHub client, guarded upload, `runSync`, queue

**Files:**
- Modify: `src/sync.js` (append)
- Modify: `test.mjs` (shared `fakeGitHub` before block 14; block 14 part 2 appended inside block 14)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `ghGet(cfg, path, fetchImpl, timeoutMs?) → Promise<{ status: number, sha?: string, text?: string }>` — `status 0` = network failure or timeout.
  - `ghPut(cfg, path, text, sha|undefined, fetchImpl, timeoutMs?) → Promise<{ status: number, sha?: string }>`
  - `syncFile(cfg, { path, text, localSets? }, fetchImpl, { force?, timeoutMs? }) → Promise<{ files, result: "uploaded"|"unchanged"|"paused"|"auth"|"error", status? }>`
  - `runSync(cfg, files[], { fetchImpl, now, online = true, force = false, timeoutMs? }) → Promise<{ patch, outcome: "ok"|"no_token"|"offline"|"paused"|"auth"|"error", uploaded: string[] }>` — `patch` holds **only** `files, lastAttempt, lastOk, lastUpload, lastError, paused`.
  - `createQueue() → (task: () => Promise<T>) => Promise<T>`
  - In `test.mjs`: top-level `fakeGitHub(seed?) → { repo, calls, fetchImpl, script(fn) }`, reused by Tasks 3–4.

- [ ] **Step 1: Add the shared fake GitHub to `test.mjs`**

Insert immediately **before** the `// 14) CLOUD SYNC ENGINE` comment:

```js
/* A fake GitHub Contents API for the sync tests: an in-memory repo plus a log of every request.
   `script(fn)` makes the NEXT request answer however fn says (401, oversized file, …). Buffer
   does its own base64 so these tests don't lean on the code under test. */
const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s) => Buffer.from(s, "base64").toString("utf8");
const fakeGitHub = (seed = {}) => {
  const repo = { ...seed };            // path → { text, sha }
  const calls = []; const scripted = []; let n = 0;
  const res = (status, body, raw) => ({ status, json: async () => body, text: async () => raw ?? JSON.stringify(body) });
  const fetchImpl = async (url, init = {}) => {
    const path = url.split("/contents/")[1].split("/").map(decodeURIComponent).join("/");
    const method = init.method || "GET";
    const hdrs = init.headers || {};
    calls.push({ method, path, accept: hdrs.Accept || "", auth: hdrs.Authorization, body: init.body ? JSON.parse(init.body) : null });
    if (scripted.length) return scripted.shift()(res, repo, path, init);
    if (method === "GET") {
      const f = repo[path];
      if (!f) return res(404, { message: "Not Found" });
      if ((hdrs.Accept || "").includes("raw")) return res(200, null, f.text);
      return res(200, { sha: f.sha, encoding: "base64", content: b64(f.text) });
    }
    // PUT: GitHub demands the current sha to update, and refuses a stale one.
    const body = JSON.parse(init.body);
    const cur = repo[path];
    if (cur && !body.sha) return res(422, { message: "sha wasn't supplied" });
    if (cur && body.sha !== cur.sha) return res(409, { message: "sha mismatch" });
    const sha = "sha" + (++n);
    repo[path] = { text: unb64(body.content), sha };
    return res(cur ? 200 : 201, { content: { sha } });
  };
  return { repo, calls, fetchImpl, script: (fn) => scripted.push(fn) };
};
```

- [ ] **Step 2: Write the failing tests (block 14, part 2)**

Inside block 14, immediately **before** its closing `}`, append:

```js
  // ── the network half ──
  const files = (bundleText, extra = []) =>
    [{ path: S.BUNDLE_PATH, text: bundleText, localSets: S.countLoggedSets(JSON.parse(bundleText)) }, ...extra];
  const bundleA = JSON.stringify({ exported: "x", logs: logsFix });                 // 3 sets
  const rep = { path: S.reportPath(2), text: '{"week":2}' };

  // Off, or offline: no network at all.
  { const gh = fakeGitHub();
    const r = await S.runSync(S.normalizeConfig({}), files(bundleA), { fetchImpl: gh.fetchImpl, now });
    if (r.outcome !== "no_token" || gh.calls.length) fail.push("sync-no-token-touched-network");
    const r2 = await S.runSync(on, files(bundleA), { fetchImpl: gh.fetchImpl, now, online: false });
    if (r2.outcome !== "offline" || gh.calls.length) fail.push("sync-offline-touched-network");
    // [ADDED] audit gap 1: the miss is remembered, so the next return to the app retries at once.
    if (r2.patch.lastError !== "offline") fail.push("sync-offline-not-remembered"); }

  // First sync into an empty repo: look first (404), then create; sha and hash are cached.
  const gh = fakeGitHub();
  let r = await S.runSync(on, files(bundleA, [rep]), { fetchImpl: gh.fetchImpl, now });
  eq(gh.calls.map((c) => c.method + " " + c.path),
     ["GET data/bundle.json", "PUT data/bundle.json", "GET reports/week-02.json", "PUT reports/week-02.json"], "sync-first-calls");
  if (r.outcome !== "ok" || r.patch.lastOk !== now || r.patch.lastUpload !== now) fail.push("sync-first-outcome");
  if (gh.calls[1].auth !== "Bearer github_pat_TEST") fail.push("sync-auth-header");
  if (JSON.parse(gh.repo["data/bundle.json"].text).logs[1].sun.bench[0].w !== "180") fail.push("sync-bundle-content");
  let cfg = { ...on, ...r.patch };

  // Same content again (only `exported` moved): zero requests, and lastUpload stays put.
  gh.calls.length = 0;
  r = await S.runSync(cfg, files(JSON.stringify({ exported: "y", logs: logsFix }), [rep]), { fetchImpl: gh.fetchImpl, now: now + 1 });
  if (gh.calls.length || r.outcome !== "ok" || r.uploaded.length) fail.push("sync-unchanged-not-free");
  if ("lastUpload" in r.patch) fail.push("sync-unchanged-moved-lastUpload");
  cfg = { ...cfg, ...r.patch };

  // Changed content: exactly ONE request, using the cached sha.
  gh.calls.length = 0;
  const logsB = JSON.parse(JSON.stringify(logsFix)); logsB[1].wed = { ohptop: [{ w: "117.5", r: "2" }] };
  const bundleB = JSON.stringify({ exported: "z", logs: logsB });                   // 4 sets
  r = await S.runSync(cfg, files(bundleB, [rep]), { fetchImpl: gh.fetchImpl, now: now + 2 });
  eq(gh.calls.map((c) => c.method + " " + c.path), ["PUT data/bundle.json"], "sync-changed-one-request");
  cfg = { ...cfg, ...r.patch };

  // 401: stop, say "auth", keep the cache.
  gh.script((res) => res(401, { message: "Bad credentials" }));
  r = await S.runSync(cfg, files(JSON.stringify({ logs: { ...logsB, 2: { sun: { bench: [{ w: "185" }] } } } })), { fetchImpl: gh.fetchImpl, now: now + 3 });
  if (r.outcome !== "auth" || r.patch.lastError !== "auth" || r.patch.lastOk !== undefined) fail.push("sync-401");

  // Conflict, and the cloud holds MORE training (another device): pause, never overwrite.
  { const remote = JSON.stringify({ logs: { ...logsB, 3: { fri: { squat: [{ w: "225" }, { w: "225" }, { w: "225" }] } } } }); // 7 sets
    const g2 = fakeGitHub({ "data/bundle.json": { text: remote, sha: "remote1" } });
    const c2 = { ...on, files: { "data/bundle.json": { sha: "stale", hash: "old" } } };
    const r2 = await S.runSync(c2, files(bundleB), { fetchImpl: g2.fetchImpl, now });
    if (r2.outcome !== "paused" || r2.patch.paused !== true) fail.push("sync-conflict-not-paused");
    if (g2.repo["data/bundle.json"].text !== remote) fail.push("sync-conflict-overwrote-cloud");
    eq(g2.calls.map((c) => c.method), ["PUT", "GET"], "sync-conflict-calls");
    // Paused stays paused, with no requests, until Restore or an explicit overwrite.
    g2.calls.length = 0;
    const r3 = await S.runSync({ ...c2, ...r2.patch }, files(bundleB), { fetchImpl: g2.fetchImpl, now });
    if (r3.outcome !== "paused" || g2.calls.length) fail.push("sync-paused-not-sticky");
    const r4 = await S.runSync({ ...c2, ...r2.patch }, files(bundleB), { fetchImpl: g2.fetchImpl, now, force: true });
    if (r4.outcome !== "ok" || r4.patch.paused !== false || JSON.parse(g2.repo["data/bundle.json"].text).logs[3]) fail.push("sync-force-overwrite"); }

  // Conflict, and the cloud holds LESS (a stale cache on this phone): refresh the sha, upload.
  { const g3 = fakeGitHub({ "data/bundle.json": { text: JSON.stringify({ logs: {} }), sha: "remote1" } });
    const r5 = await S.runSync({ ...on, files: { "data/bundle.json": { sha: "stale", hash: "old" } } }, files(bundleB), { fetchImpl: g3.fetchImpl, now });
    if (r5.outcome !== "ok") fail.push("sync-stale-cache-not-recovered");
    eq(g3.calls.map((c) => c.method), ["PUT", "GET", "PUT"], "sync-stale-cache-calls"); }

  // First sync from a NEW device whose cloud copy holds more: pause before writing anything.
  { const g4 = fakeGitHub({ "data/bundle.json": { text: bundleB, sha: "remote1" } });
    const r6 = await S.runSync(on, files(JSON.stringify({ logs: {} })), { fetchImpl: g4.fetchImpl, now });
    if (r6.outcome !== "paused" || g4.calls.some((c) => c.method === "PUT")) fail.push("sync-new-device-overwrote"); }

  // Network failure, and a request that never answers: an error — never a crash or a hang.
  { const r7 = await S.runSync(on, files(bundleA), { fetchImpl: async () => { throw new TypeError("Load failed"); }, now });
    if (r7.outcome !== "error" || !String(r7.patch.lastError).startsWith("error")) fail.push("sync-network-error");
    const t0 = Date.now();
    const r8 = await S.runSync(on, files(bundleA), { fetchImpl: () => new Promise(() => {}), now, timeoutMs: 50 });
    if (r8.outcome !== "error" || Date.now() - t0 > 2000) fail.push("sync-hang-not-timed-out"); }

  // Files over 1 MB come back without inline content: fetch the raw body instead.
  { const g5 = fakeGitHub({ "data/bundle.json": { text: bundleB, sha: "big1" } });
    g5.script((res) => res(200, { sha: "big1", encoding: "none", content: "" }));
    const g = await S.ghGet(on, S.BUNDLE_PATH, g5.fetchImpl);
    if (g.status !== 200 || g.sha !== "big1" || g.text !== bundleB) fail.push("sync-large-file-fallback");
    if (!g5.calls[1] || !g5.calls[1].accept.includes("raw")) fail.push("sync-large-file-raw-accept"); }

  // One sync at a time, and a failed task never jams the queue.
  { const q = S.createQueue(); const order = [];
    const a = q(async () => { order.push("a1"); await new Promise((res) => setTimeout(res, 30)); order.push("a2"); });
    const b = q(async () => { order.push("b"); });
    await Promise.all([a, b]);
    eq(order, ["a1", "a2", "b"], "sync-queue-order");
    const c = q(async () => { throw new Error("x"); }).catch(() => "caught");
    const d = q(async () => "ran");
    if ((await c) !== "caught" || (await d) !== "ran") fail.push("sync-queue-jammed"); }
```

- [ ] **Step 3: Run the suite to verify it fails**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `TypeError: S.runSync is not a function` (the test run throws before the summary).

- [ ] **Step 4: Append the network half to `src/sync.js`**

```js
/* ── GitHub Contents API ── */

// https://api.github.com/repos/<owner>/<repo>/contents/<path>, each path segment escaped.
const contentsUrl = (cfg, path) =>
  `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/` +
  path.split("/").map(encodeURIComponent).join("/");
const ghHeaders = (cfg, accept = "application/vnd.github+json") => ({
  Authorization: `Bearer ${cfg.token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28",
});

/* fetch with a deadline. A request that never answers rejects after `ms`, so the queue moves on. */
const timedFetch = async (fetchImpl, url, init, ms) => {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  let timer;
  const deadline = new Promise((_, rej) => { timer = setTimeout(() => { if (ctl) ctl.abort(); rej(new Error("timeout")); }, ms); });
  try { return await Promise.race([fetchImpl(url, { ...init, signal: ctl ? ctl.signal : undefined }), deadline]); }
  finally { clearTimeout(timer); }
};

/* Read one file → { status, sha, text }. status 0 means no answer (offline, timeout, blocked). */
export const ghGet = async (cfg, path, fetchImpl, timeoutMs = REQUEST_TIMEOUT_MS) => {
  try {
    const r = await timedFetch(fetchImpl, contentsUrl(cfg, path), { headers: ghHeaders(cfg) }, timeoutMs);
    if (r.status !== 200) return { status: r.status };
    const j = await r.json();
    if (j && j.encoding === "base64" && typeof j.content === "string")
      return { status: 200, sha: j.sha, text: decodeBase64Utf8(j.content) };
    // Over 1 MB GitHub leaves `content` empty — ask again for the raw body.
    const raw = await timedFetch(fetchImpl, contentsUrl(cfg, path), { headers: ghHeaders(cfg, "application/vnd.github.raw+json") }, timeoutMs);
    if (raw.status !== 200) return { status: raw.status };
    return { status: 200, sha: j.sha, text: await raw.text() };
  } catch (e) { return { status: 0 }; }
};

/* Write one file → { status, sha }. GitHub requires the current `sha` to replace a file. */
export const ghPut = async (cfg, path, text, sha, fetchImpl, timeoutMs = REQUEST_TIMEOUT_MS) => {
  try {
    const body = { message: `sync: ${path}`, content: encodeBase64Utf8(text) };
    if (sha) body.sha = sha;
    const r = await timedFetch(fetchImpl, contentsUrl(cfg, path), {
      method: "PUT", headers: { ...ghHeaders(cfg), "Content-Type": "application/json" }, body: JSON.stringify(body),
    }, timeoutMs);
    if (r.status !== 200 && r.status !== 201) return { status: r.status };
    const j = await r.json();
    return { status: r.status, sha: j && j.content ? j.content.sha : undefined };
  } catch (e) { return { status: 0 }; }
};

/* The second-device guard: true when the cloud bundle holds MORE training than this phone,
   in which case this phone must not overwrite it. Only the bundle is guarded. */
const cloudHasMore = (path, remoteText, localSets) => {
  if (path !== BUNDLE_PATH || remoteText == null) return false;
  try { return countLoggedSets(JSON.parse(remoteText)) > (localSets || 0); } catch (e) { return false; }
};

/* Upload one file if — and only if — it changed. `force` skips the guard (Brian chose to
   overwrite the cloud). Returns { files, result } with result:
   "uploaded" | "unchanged" | "paused" | "auth" | "error". */
export const syncFile = async (cfg, file, fetchImpl, opts = {}) => {
  const t = opts.timeoutMs;
  const hash = hashText(stableForHash(file.path, file.text));
  const cached = cfg.files[file.path];
  if (cached && cached.hash === hash) return { files: cfg.files, result: "unchanged" };
  const uploaded = (sha) => ({ files: { ...cfg.files, [file.path]: { sha, hash } }, result: "uploaded" });
  const failed = (status) => ({ files: cfg.files, result: status === 401 ? "auth" : "error", status });
  const paused = () => ({ files: cfg.files, result: "paused" });

  let sha = cached && cached.sha;
  if (!sha) {
    // First upload of this path from this device: look before writing.
    const g = await ghGet(cfg, file.path, fetchImpl, t);
    if (g.status === 200) {
      if (!opts.force && cloudHasMore(file.path, g.text, file.localSets)) return paused();
      sha = g.sha;
    } else if (g.status !== 404) return failed(g.status);
  }
  const p = await ghPut(cfg, file.path, file.text, sha, fetchImpl, t);
  if (p.status === 200 || p.status === 201) return uploaded(p.sha);
  if (p.status !== 409 && p.status !== 422) return failed(p.status);
  // The file changed since we last wrote it (another device, or a stale cache): look again.
  const g = await ghGet(cfg, file.path, fetchImpl, t);
  if (g.status !== 200) return failed(g.status);
  if (!opts.force && cloudHasMore(file.path, g.text, file.localSets)) return paused();
  const p2 = await ghPut(cfg, file.path, file.text, g.sha, fetchImpl, t);
  return p2.status === 200 || p2.status === 201 ? uploaded(p2.sha) : failed(p2.status);
};

/* One sync pass over the files, in order. Returns { patch, outcome, uploaded }.
   `patch` holds ONLY status fields, so a key pasted while this ran is never overwritten by a
   stale copy of the config. outcome: "ok" | "no_token" | "offline" | "paused" | "auth" | "error". */
export const runSync = async (cfg, files, { fetchImpl, now, online = true, force = false, timeoutMs } = {}) => {
  if (!cfg.token) return { patch: {}, outcome: "no_token", uploaded: [] };
  if (cfg.paused && !force) return { patch: {}, outcome: "paused", uploaded: [] };
  // [ADJUSTED] audit gap 1 — remember the miss (lastError "offline") so a return to the app, or the
  // "online" event, retries straight away instead of waiting out the 10-minute window.
  if (!online || typeof fetchImpl !== "function") return { patch: { lastAttempt: now, lastError: "offline" }, outcome: "offline", uploaded: [] };
  let fileState = cfg.files;
  const uploaded = [];
  for (const f of files) {
    const r = await syncFile({ ...cfg, files: fileState }, f, fetchImpl, { force, timeoutMs });
    fileState = r.files;
    if (r.result === "uploaded") uploaded.push(f.path);
    if (r.result === "paused" || r.result === "auth" || r.result === "error") {
      const lastError = r.result === "error" ? `error:${r.status ?? 0}` : r.result;
      return { patch: { files: fileState, lastAttempt: now, lastError, paused: r.result === "paused",
                        ...(uploaded.length ? { lastUpload: now } : {}) },
               outcome: r.result, uploaded };
    }
  }
  return { patch: { files: fileState, lastAttempt: now, lastOk: now, lastError: null, paused: false,
                    ...(uploaded.length ? { lastUpload: now } : {}) },
           outcome: "ok", uploaded };
};

/* One sync at a time, app-wide. Overlapping triggers (Finish while leaving the app) wait their
   turn instead of racing two uploads against the same cached sha. A failed task never jams it. */
export const createQueue = () => {
  let tail = Promise.resolve();
  return (task) => {
    const run = tail.then(task, task);
    tail = run.catch(() => {});
    return run;
  };
};
```

- [ ] **Step 5: Run the suite to verify it passes**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `✓ all smoke tests and program invariants passed`.

- [ ] **Step 6: Commit (show Brian the command; run only after his yes)**

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && git add src/sync.js test.mjs && git commit -m "feat(sync): GitHub client, guarded upload and queue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Wire sync into the app — state, backup refactor, triggers

**Files:**
- Modify: `src/App.jsx` — import (line 2), module scope (after line 37), state (after line 369), effects (after the debounced-save effect, ~line 459), backup/restore (lines 575–592), sync functions + trigger effects (after `buildReviewJSON`, ~line 752), five edit handlers (lines 1009, 1069, 1204, 1302, 1525)
- Modify: `test.mjs` (new block 15 before the final `if (fail.length)`)

**Interfaces:**
- Consumes: `SYNC_KEY, BUNDLE_PATH, EMPTY_SYNC, PRIORITY_DELAY_MS, HIDDEN_THROTTLE_MS, normalizeConfig, reportPath, calendarWeek, countLoggedSets, runSync, createQueue` from Task 1–2; `fakeGitHub` from Task 2.
- Produces (inside the component, used by Task 4): state `sync` / `setSync`; refs `syncRef`, `syncLoaded`; functions `backupObject()`, `applyBackup(d)`, `doSync({ force? }) → Promise<runSync result | null>`, `touchPriority()`.

- [ ] **Step 1: Write the failing app-level tests (block 15, part 1)**

In `test.mjs`, insert immediately **before** `if (fail.length) { console.error(...`:

```js
// 15) CLOUD SYNC IN THE APP — triggers and privacy (spec §4.3). Each case boots a fresh copy of
//     the app with a fake GitHub and, when needed, a saved sync config.
{
  const TOKEN = "github_pat_SECRET_123";
  const on = { token: TOKEN, tokenExpires: "2027-01-31" };
  const boot = async ({ syncCfg, bundle, gh } = {}) => {
    const d = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
      beforeParse(w) {
        w.fetch = gh ? gh.fetchImpl : undefined;
        if (syncCfg) w.localStorage.setItem("pp-sync-v1", JSON.stringify(syncCfg));
        if (bundle) w.localStorage.setItem("pp-tracker-v3", bundle);
      } });
    await new Promise((r) => setTimeout(r, 1400));
    return d;
  };
  // Real typing inside a booted copy (its own window's value setter, as React needs).
  const typeIn = (w, el, v) => {
    const proto = el.tagName === "TEXTAREA" ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const setVisibility = (w, state) => {
    Object.defineProperty(w.document, "visibilityState", { value: state, configurable: true });
    w.document.dispatchEvent(new w.Event("visibilitychange"));
  };
  const puts = (gh) => gh.calls.filter((c) => c.method === "PUT").map((c) => c.path);

  // a) Sync OFF (no key): the app makes no network request at all, even on Finish.
  { const gh = fakeGitHub(); const d = await boot({ gh });
    d.window.document.querySelector(".finishbtn").click();
    await wait(400);
    if (gh.calls.length) fail.push("app-sync-off-made-requests=" + gh.calls.length);
    d.window.close(); }

  // b–e share one booted copy with sync ON.
  const gh = fakeGitHub(); const d = await boot({ syncCfg: on, gh }); const w = d.window, docS = w.document;
  await wait(300);

  // b) Opening the app uploads the backup and a week report; the key appears nowhere in them,
  //    nor in pp-tracker-v3, nor in Copy backup.
  if (!puts(gh).includes("data/bundle.json")) fail.push("app-open-no-bundle-upload");
  if (!puts(gh).some((p) => /^reports\/week-\d\d\.json$/.test(p))) fail.push("app-open-no-report-upload");
  if (!(gh.repo["data/bundle.json"]?.text || "").includes('"logs"')) fail.push("app-bundle-not-a-backup");
  for (const f of Object.values(gh.repo)) if (f.text.includes(TOKEN)) fail.push("app-token-uploaded");
  if ((w.localStorage.getItem("pp-tracker-v3") || "").includes(TOKEN)) fail.push("app-token-in-pp-tracker-v3");
  let copiedB = null;
  Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async (t) => { copiedB = t; } }, configurable: true });
  [...docS.querySelectorAll(".tool")].find((b) => b.textContent.includes("Backup")).click();
  await wait(100);
  if (!copiedB || copiedB.includes(TOKEN)) fail.push("app-token-in-copy-backup");

  // c) Finish uploads again (the session changed).
  gh.calls.length = 0;
  docS.querySelector(".finishbtn").click();
  await wait(300);
  if (!puts(gh).includes("data/bundle.json")) fail.push("app-finish-no-upload");

  // d) The Saturday-morning check: "Next morning" uploads ~3 s later, with the app still open.
  gh.calls.length = 0;
  [...docS.querySelectorAll(".tab")].find((b) => b.textContent.includes("FRI")).click();
  await wait(200);
  const nm = docS.querySelector('button[aria-label="Next morning adductor normal"]');
  if (!nm) fail.push("app-no-next-morning-check");
  else {
    nm.click();
    await wait(1000);
    if (puts(gh).length) fail.push("app-priority-sync-too-early");
    await wait(2800);
    if (!(gh.repo["data/bundle.json"]?.text || "").includes('"next":"normal"')) fail.push("app-next-morning-not-synced");
  }

  // e) Leaving and returning: a set log alone waits for the 10-minute window (the phone is
  //    locked between sets) — but a note goes up the moment the app is hidden.
  gh.calls.length = 0;
  const wt = docS.querySelector('input[aria-label$="set 1 weight"]');
  typeIn(w, wt, "100");
  await wait(900);
  setVisibility(w, "hidden"); await wait(300);
  setVisibility(w, "visible"); await wait(300);
  if (puts(gh).length) fail.push("app-set-log-ignored-throttle");
  const note = docS.querySelector('textarea[placeholder^="e.g. Last OHP double"]');
  typeIn(w, note, "Adductors quiet – fine");
  await wait(200);
  setVisibility(w, "hidden"); await wait(400);
  if (!(gh.repo["data/bundle.json"]?.text || "").includes("Adductors quiet – fine")) fail.push("app-hidden-dropped-note");
  setVisibility(w, "visible");

  // e3) [ADDED] audit gap 2 — swiping the app away can skip visibilitychange on iOS: pagehide
  //     alone must carry a pending note.
  typeIn(w, note, "Calves fine after pogos");
  await wait(200);
  w.dispatchEvent(new w.Event("pagehide"));
  await wait(400);
  if (!(gh.repo["data/bundle.json"]?.text || "").includes("Calves fine after pogos")) fail.push("app-pagehide-dropped-note");

  // e2) [ADDED] audit gap 1 — no signal: Finish makes no request, and the "online" event
  //     catches up at once.
  gh.calls.length = 0;
  Object.defineProperty(w.navigator, "onLine", { value: false, configurable: true });
  docS.querySelector(".finishbtn").click();
  await wait(300);
  if (gh.calls.length) fail.push("app-offline-made-requests");
  Object.defineProperty(w.navigator, "onLine", { value: true, configurable: true });
  w.dispatchEvent(new w.Event("online"));
  await wait(300);
  if (!puts(gh).includes("data/bundle.json")) fail.push("app-online-no-catch-up");
  d.window.close();
}
```

- [ ] **Step 2: Run the suite to verify it fails**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `FAIL: app-open-no-bundle-upload, app-open-no-report-upload, app-bundle-not-a-backup, app-finish-no-upload, app-next-morning-not-synced, app-hidden-dropped-note, app-pagehide-dropped-note, app-online-no-catch-up` (case a passes already — that is correct). [ADJUSTED] by the audit.

- [ ] **Step 3: Import the sync module and create the app-wide queue**

`src/App.jsx` line 2 — after `import { SESSIONS, IMPACT, AUDIT, META, WEEK13, SOURCE } from "./program.js";` add:

```js
import { SYNC_KEY, BUNDLE_PATH, EMPTY_SYNC, PRIORITY_DELAY_MS, HIDDEN_THROTTLE_MS, normalizeConfig, reportPath,
         calendarWeek, countLoggedSets, runSync, createQueue, ghGet, syncStatus, needsAttention, expiryText } from "./sync.js";
```

After `const BW = META.bw;` (line 37) add:

```js
/* Cloud sync runs one pass at a time, app-wide (spec §4.3). Module-level so every trigger —
   timers, listeners, buttons — lines up behind the same queue. */
const syncQueue = createQueue();
```

- [ ] **Step 4: Add sync state**

After `const saveTimer = useRef(null);` add:

```js
  /* cloud sync (spec §4) — its own storage key, never inside pp-tracker-v3 */
  const [sync, setSync] = useState(EMPTY_SYNC);
  const [keyDraft, setKeyDraft] = useState({ token: "", expires: "2027-01-31" }); // the key field before Save
  const [cloudRestore, setCloudRestore] = useState(null); // null | {busy} | {error} | {data, sha, cloudSets, cloudDate}
  const syncRef = useRef(EMPTY_SYNC);      // latest config, for timers and listeners that outlive a render
  const syncLoaded = useRef(false);
  const latest = useRef(null);             // latest file builder, refreshed after every render
  const priorityDirty = useRef(false);     // a tissue check or note changed since the last good sync
  const priorityTimer = useRef(null);
```

- [ ] **Step 5: Load and persist the sync config**

Immediately after the debounced-save `useEffect` (the one ending `}, [week, day, logs, … addCheck, archived]);`) add:

```js
  /* load the sync config once — a separate key, so a missing or broken one never touches training data */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(SYNC_KEY);
        const c = normalizeConfig(JSON.parse(r.value));
        syncLoaded.current = true;
        syncRef.current = c; setSync(c);
      } catch (e) { syncLoaded.current = true; /* no key saved yet: sync stays off */ }
    })();
  }, []);
  /* persist it whenever it changes */
  useEffect(() => {
    if (!syncLoaded.current) return;
    window.storage.set(SYNC_KEY, JSON.stringify(sync)).catch(() => {});
  }, [sync]);
```

- [ ] **Step 6: Refactor backup and restore so sync can reuse them**

Replace lines 575–592 (from `const exportBackup = () => copyText(JSON.stringify({ app:"concurrent-block", …` through the end of `restoreBackup`) with:

```js
  // The full backup object — Copy backup and cloud sync both send exactly this (version 16).
  const backupObject = () => ({ app:"concurrent-block", program:PROGRAM_ID, version:16, exported:new Date().toISOString(), archived, week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, powerQual, addCheck });
  const exportBackup = () => copyText(JSON.stringify(backupObject()), "Backup JSON copied — keep it somewhere safe");
  // Replace the phone's training data with backup `d` — shared by paste-restore and Restore from cloud.
  const applyBackup = (d) => {
    if (!d || !d.logs) throw new Error("bad");
    setLogs(d.logs||{}); setExtraSets(d.extraSets||{}); setNotes(d.notes||{});
    setExNotes(d.exNotes||{});
    const ac = {};
    Object.entries(d.altChoice || {}).forEach(([k, v]) => { if (v) ac[k] = true; });
    setAltChoice(ac);
    setDone(d.done||{}); setSessDone(d.sessDone||{});
    setTested({ ohp:"", dip:"", pullup:"", ...(d.tested||{}) });
    setOrder(d.order||{}); setBarSpeed(d.barSpeed||{}); setSessionTime(d.sessionTime||{});
    setElastic(d.elastic||{}); setElasticQ(d.elasticQ||{}); setSprintLog(d.sprintLog||{});
    setPowerQual(d.powerQual||{}); setAddCheck(d.addCheck||{}); setArchived(asArchiveList(d.archived));
    if (d.settings) { const st = { ...DEFAULT_SETTINGS, ...d.settings }; if (!TONES[st.tone]) st.tone = "radar"; setSettings(st); }
  };
  const restoreBackup = () => {
    try { applyBackup(JSON.parse(restorePaste)); setRestorePaste(""); flash("Backup restored"); }
    catch (e) { flash("That doesn't look like a valid backup"); }
  };
```

- [ ] **Step 7: Add the file builder, `doSync`, and the triggers**

Immediately after the end of `buildReviewJSON` (the `};` after `}, null, 2);`) and before `/* derived */`, add:

```js
  /* ── cloud sync (spec §4) ── */
  // What one sync uploads: the full backup, plus the week report for the calendar week and —
  // if different — the week on screen. Week 13 has no report.
  const syncFiles = () => {
    const cw = calendarWeek(new Date(), META.startDate, META.weeks);
    const weeks = [...new Set([cw, week])].filter(w => w >= 1 && w <= META.weeks);
    return [
      { path: BUNDLE_PATH, text: JSON.stringify(backupObject()), localSets: countLoggedSets({ logs }) },
      ...weeks.map(w => ({ path: reportPath(w), text: buildReviewJSON(w) })),
    ];
  };
  // Timers and listeners outlive the render that created them; give them the newest builder.
  useEffect(() => { latest.current = { syncFiles }; syncRef.current = sync; });

  // Run one sync through the shared queue. Only status fields come back, so a key saved while
  // a sync was in flight is kept. Cheap to call often: unchanged files cost no request.
  const doSync = (opts = {}) => {
    if (!syncLoaded.current || !loaded.current || !syncRef.current.token || !latest.current) return Promise.resolve(null);
    return syncQueue(async () => {
      const r = await runSync(syncRef.current, latest.current.syncFiles(), {
        fetchImpl: typeof window.fetch === "function" ? window.fetch.bind(window) : null,
        now: Date.now(), online: navigator.onLine !== false, force: !!opts.force,
      });
      if (r.outcome === "ok") priorityDirty.current = false;
      const next = { ...syncRef.current, ...r.patch };
      syncRef.current = next; setSync(next);
      return r;
    });
  };

  // Trigger: a tissue check or note changed — upload 3 s later, while the app is still open.
  // This is what carries the Saturday-morning adductor check to the review.
  const touchPriority = () => {
    priorityDirty.current = true;
    clearTimeout(priorityTimer.current);
    priorityTimer.current = setTimeout(() => doSync(), PRIORITY_DELAY_MS);
  };

  // Trigger: cold open (once both the training data and the sync config are loaded), and
  // right after a key is saved.
  const ready = status !== "loading";
  useEffect(() => { if (ready && sync.token) doSync(); }, [ready, sync.token]);

  // Trigger: Finish (or un-finish) a session.
  useEffect(() => { if (loaded.current) doSync(); }, [sessDone]);

  // Triggers: leaving the app and coming back. iOS freezes a home-screen app the moment it is
  // hidden, so this uploads now rather than on a timer. Set logs alone wait for the 10-minute
  // window (the phone is locked between sets); a pending note or a failed sync goes immediately.
  // `pagehide` too: swiping the app away can skip `visibilitychange` on iOS.
  useEffect(() => {
    const onVis = () => {
      const c = syncRef.current;
      if (!c.token) return;
      const recent = c.lastUpload && Date.now() - c.lastUpload < HIDDEN_THROTTLE_MS;
      if (priorityDirty.current || c.lastError || !recent) doSync();
    };
    // [ADDED] audit gap 1 — back from a dead spot with the app open: catch up at once.
    const onOnline = () => { if (syncRef.current.token) doSync(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, []);
```

- [ ] **Step 8: Mark the five tissue/note edit handlers**

Use exact replacements in `src/App.jsx`:

1. Both exercise-note inputs (lines 1009 and 1204 — identical text; replace **all** occurrences):

```js
          onChange={e => setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value }))} />
```
→
```js
          onChange={e => { setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value })); touchPriority(); }} />
```

2. Adductor check (line 1069):

```js
    const setC = (f, v) => setAddCheck(p => ({ ...p, [sessKey]: { ...(p[sessKey] || {}), [f]: v } }));
```
→
```js
    const setC = (f, v) => { setAddCheck(p => ({ ...p, [sessKey]: { ...(p[sessKey] || {}), [f]: v } })); touchPriority(); };
```

3. Week-13 notes (line 1302):

```js
          onChange={e => setNotes(p => ({ ...p, [`${W13_WEEK}-fri`]: e.target.value }))} />
```
→
```js
          onChange={e => { setNotes(p => ({ ...p, [`${W13_WEEK}-fri`]: e.target.value })); touchPriority(); }} />
```

4. Session notes (line 1525):

```js
              onChange={e => setNotes(p => ({ ...p, [sessKey]: e.target.value }))} />
```
→
```js
              onChange={e => { setNotes(p => ({ ...p, [sessKey]: e.target.value })); touchPriority(); }} />
```

Then confirm none were missed:

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && grep -n "setExNotes(p\|setNotes(p\|setAddCheck(p" src/App.jsx`
Expected: every line printed also contains `touchPriority()`.

- [ ] **Step 9: Run the suite to verify it passes**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `✓ all smoke tests and program invariants passed`. (Existing guards — focus-loss, persistence, migration — must still pass untouched.)

- [ ] **Step 10: Commit (show Brian the command; run only after his yes)**

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && git add src/App.jsx test.mjs && git commit -m "feat(sync): sync the backup and week reports from the app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Settings → Cloud sync, Restore from cloud, header dot, docs

**Files:**
- Modify: `src/App.jsx` — sync actions (after `touchPriority`), header status (the `.hdr-row`), `renderSettings` (before "Restore from backup"), CSS string (append rules)
- Modify: `test.mjs` (block 15, part 2 — appended inside block 15 before its closing `}`)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: Task 3's `sync`, `setSync`, `syncRef`, `keyDraft`, `setKeyDraft`, `cloudRestore`, `setCloudRestore`, `doSync`, `applyBackup`, `logs`, `flash`; Task 1–2's `ghGet`, `syncStatus`, `needsAttention`, `expiryText`, `countLoggedSets`, `normalizeConfig`, `EMPTY_SYNC`, `BUNDLE_PATH`.
- Produces: user-visible Settings section (labels used by tests: input `aria-label="GitHub key"`, input `aria-label="Key expiry date"`, buttons "Save key and sync", "Sync now", "Restore from cloud", "Replace phone data", "Cancel", "Keep this phone's data (overwrite cloud)", "Turn off sync"); `.syncstatus`, `.syncdot`, `.cloudrestore`.

- [ ] **Step 1: Write the failing tests (block 15, part 2)**

Inside block 15, immediately before its closing `}`, append:

```js
  const openSettings = async (docX) => {
    [...docX.querySelectorAll(".tool")].find((b) => b.textContent.includes("Settings")).click();
    await wait(150);
  };
  const button = (docX, text) => [...docX.querySelectorAll("button")].find((b) => b.textContent.includes(text));

  // f) Pasting a key (with the stray spaces GitHub's copy can add) saves it trimmed, in
  //    pp-sync-v1 only, keeps the default expiry, hides the field, and syncs straight away.
  { const ghF = fakeGitHub(); const dF = await boot({ gh: ghF }); const wF = dF.window, docF = wF.document;
    await openSettings(docF);
    if (!docF.querySelector(".syncstatus") || !docF.querySelector(".syncstatus").textContent.includes("Cloud sync is off")) fail.push("app-sync-off-not-shown");
    const key = docF.querySelector('input[aria-label="GitHub key"]');
    if (!key) fail.push("app-no-key-field");
    else {
      typeIn(wF, key, "   " + TOKEN + "  ");
      await wait(50);
      button(docF, "Save key and sync").click();
      await wait(900);
      const saved = JSON.parse(wF.localStorage.getItem("pp-sync-v1") || "{}");
      if (saved.token !== TOKEN) fail.push("app-key-not-trimmed-or-saved");
      if (saved.tokenExpires !== "2027-01-31") fail.push("app-key-expiry-default");
      if ((wF.localStorage.getItem("pp-tracker-v3") || "").includes(TOKEN)) fail.push("app-key-leaked-to-bundle");
      if (!puts(ghF).includes("data/bundle.json")) fail.push("app-key-save-no-sync");
      if (docF.querySelector('input[aria-label="GitHub key"]')) fail.push("app-key-field-still-shown");
      if (!docF.querySelector(".syncstatus").textContent.includes("Synced")) fail.push("app-synced-not-shown");
      // [ADDED] audit gap 4 — Turn off sync forgets the key and shows the field again.
      button(docF, "Turn off sync").click();
      await wait(300);
      if (JSON.parse(wF.localStorage.getItem("pp-sync-v1") || "{}").token) fail.push("app-turn-off-kept-key");
      if (!docF.querySelector('input[aria-label="GitHub key"]')) fail.push("app-turn-off-no-key-field");
    }
    dF.window.close(); }

  // g) GitHub refuses the key (401): Settings says so in plain words and the header shows the dot.
  { const ghG = fakeGitHub(); const dG = await boot({ syncCfg: on, gh: ghG }); const wG = dG.window, docG = wG.document;
    await wait(300);
    if (docG.querySelector(".syncdot")) fail.push("app-dot-when-healthy");
    typeIn(wG, docG.querySelector('input[aria-label$="set 1 weight"]'), "90");
    await wait(900);
    await openSettings(docG);
    ghG.script((res) => res(401, { message: "Bad credentials" }));
    button(docG, "Sync now").click();
    await wait(400);
    if (!docG.querySelector(".syncstatus").textContent.includes("Key expired")) fail.push("app-401-not-explained");
    if (!docG.querySelector(".syncdot")) fail.push("app-401-no-header-dot");
    dG.window.close(); }

  // h) Restore from cloud: shows both counts, writes nothing until confirmed, then replaces the
  //    phone's data and lifts the pause.
  { const cloud = JSON.stringify({ app: "concurrent-block", program: "astra-synthesis-v5", version: 16,
      exported: "2026-10-03T09:00:00.000Z", logs: { 1: { sun: { dipheavy: [{ w: "47.5", r: "2", rir: "2" }] } } }, settings: {} });
    const ghH = fakeGitHub({ "data/bundle.json": { text: cloud, sha: "c1" } });
    const dH = await boot({ syncCfg: { ...on, paused: true }, gh: ghH }); const wH = dH.window, docH = wH.document;
    await openSettings(docH);
    if (!docH.querySelector(".syncstatus").textContent.includes("Sync paused")) fail.push("app-paused-not-shown");
    if (!button(docH, "Keep this phone's data")) fail.push("app-no-force-option-when-paused");
    button(docH, "Restore from cloud").click();
    await wait(300);
    const box = docH.querySelector(".cloudrestore");
    if (!box || !box.textContent.includes("Cloud copy: 1 set") || !box.textContent.includes("This phone: 0 sets")) fail.push("app-restore-counts");
    if (ghH.repo["data/bundle.json"].text !== cloud) fail.push("app-restore-wrote-before-confirm");
    button(docH, "Replace phone data").click();
    await wait(1100);
    const stH = JSON.parse(wH.localStorage.getItem("pp-tracker-v3") || "{}");
    if (!JSON.stringify(stH.logs || {}).includes("47.5")) fail.push("app-restore-not-applied");
    if (JSON.parse(wH.localStorage.getItem("pp-sync-v1") || "{}").paused) fail.push("app-restore-left-paused");
    dH.window.close(); }
```

- [ ] **Step 2: Run the suite to verify it fails**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `FAIL: app-sync-off-not-shown, app-no-key-field, …` (the Settings section does not exist yet) — the run may also throw on `button(...).click()` of an undefined button; either way it does not print "✓ all smoke tests…".

- [ ] **Step 3: Add the sync actions**

Immediately after the `touchPriority` definition (Task 3, Step 7) add:

```js
  // Save the pasted key and start clean: no cached files, so the first sync looks before it
  // writes (the second-device guard). The [ready, sync.token] effect starts that first sync.
  const saveKey = () => {
    const next = normalizeConfig({ ...syncRef.current, token: keyDraft.token, tokenExpires: keyDraft.expires,
                                   lastError: null, paused: false, files: {} });
    syncRef.current = next; setSync(next);
    setKeyDraft(k => ({ ...k, token: "" }));
  };
  // Turn sync off: forget the key and every cached sha. Training data is untouched.
  const turnOffSync = () => { const next = { ...EMPTY_SYNC }; syncRef.current = next; setSync(next); setCloudRestore(null); };
  // Brian chose to overwrite the cloud with this phone's data (only offered while paused).
  const forceUpload = () => { doSync({ force: true }); };

  // Restore from cloud, step 1: fetch the cloud copy and show it beside the phone's — nothing
  // is replaced yet.
  const startCloudRestore = async () => {
    setCloudRestore({ busy: true });
    const g = await ghGet(syncRef.current, BUNDLE_PATH, typeof window.fetch === "function" ? window.fetch.bind(window) : null);
    if (g.status !== 200) {
      setCloudRestore({ error: g.status === 404 ? "There is no cloud copy yet."
                             : g.status === 401 ? "GitHub refused the key — paste a new one."
                             : "Couldn't reach GitHub — try again with a signal." });
      return;
    }
    try {
      const data = JSON.parse(g.text);
      if (!data.logs) throw new Error("bad");
      setCloudRestore({ data, sha: g.sha, cloudSets: countLoggedSets(data), cloudDate: data.exported || null });
    } catch (e) { setCloudRestore({ error: "The cloud copy isn't a valid backup." }); }
  };
  // Step 2, after Brian confirms: replace the phone's data and lift the pause — the phone now
  // holds what the cloud holds. Caching the cloud sha lets the next sync update in one request.
  const confirmCloudRestore = () => {
    const cr = cloudRestore;
    if (!cr || !cr.data) return;
    applyBackup(cr.data);
    const next = { ...syncRef.current, paused: false, lastError: null,
                   files: { ...syncRef.current.files, [BUNDLE_PATH]: { sha: cr.sha, hash: "" } } };
    syncRef.current = next; setSync(next); setCloudRestore(null);
    flash("Restored from cloud");
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  // The confirm panel — a plain render function (never a component inside the app).
  const renderCloudRestore = () => {
    const cr = cloudRestore;
    if (cr.busy) return <div className="syncstatus t-off">Fetching the cloud copy…</div>;
    if (cr.error) return <div className="syncstatus t-warn">{cr.error}</div>;
    const when = cr.cloudDate ? new Date(cr.cloudDate).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "an unknown date";
    return (
      <div className="cloudrestore">
        <p>Cloud copy: <b>{plural(cr.cloudSets, "set")}</b> logged, saved {when}.<br />This phone: <b>{plural(countLoggedSets({ logs }), "set")}</b> logged.</p>
        <p>Restoring replaces everything on this phone with the cloud copy.</p>
        <div className="syncrow">
          <button className="solid" onClick={confirmCloudRestore}>Replace phone data</button>
          <button className="ghost" onClick={() => setCloudRestore(null)}>Cancel</button>
        </div>
      </div>
    );
  };
```

- [ ] **Step 4: Add the Cloud sync section to Settings**

In `renderSettings`, immediately **before** `<div className="set-label">Restore from backup</div>`, add:

```jsx
      <div className="set-label">Cloud sync — private backup for the Saturday review</div>
      {(() => {
        const st = syncStatus(sync, Date.now()), ex = expiryText(sync, Date.now());
        return <div className={`syncstatus t-${st.tone}`} role="status">{st.text}{ex && <span className="syncexp"> · {ex}</span>}</div>;
      })()}
      {!sync.token ? (
        <>
          <input className="synckey" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false}
            aria-label="GitHub key" placeholder="Paste the GitHub key (github_pat_…)"
            value={keyDraft.token} onChange={e => setKeyDraft(k => ({ ...k, token: e.target.value }))} />
          <input className="synckey" type="date" aria-label="Key expiry date"
            value={keyDraft.expires} onChange={e => setKeyDraft(k => ({ ...k, expires: e.target.value }))} />
          <button className="solid full" onClick={saveKey} disabled={!keyDraft.token.trim()}>Save key and sync</button>
        </>
      ) : (
        <>
          <div className="syncrow">
            <button className="ghost" onClick={() => doSync()}>Sync now</button>
            <button className="ghost" onClick={startCloudRestore}>Restore from cloud</button>
          </div>
          {sync.paused && <button className="ghost sync-full" onClick={forceUpload}>Keep this phone's data (overwrite cloud)</button>}
          {cloudRestore && renderCloudRestore()}
          <button className="ghost sync-full" onClick={turnOffSync}>Turn off sync</button>
        </>
      )}
```

- [ ] **Step 5: Add the header dot**

In the header, replace:

```jsx
          <div className={`status s-${status}`}>{toast || (status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved" : "")}</div>
```

with:

```jsx
          <div className={`status s-${status}`}>
            {needsAttention(sync, Date.now()) && <span className="syncdot" role="img" aria-label="Cloud sync needs attention" />}
            {toast || (status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved" : "")}
          </div>
```

- [ ] **Step 6: Add the CSS**

Append to the `css` template string (after the `.set-label{…}` rule):

```css
.syncdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warn);margin-right:6px;vertical-align:middle}
.syncstatus{font-size:12.5px;line-height:1.45;color:var(--muted);overflow-wrap:anywhere}
.syncstatus.t-ok{color:var(--ok)}
.syncstatus.t-warn,.syncstatus.t-bad{color:var(--warn)}
.syncexp{color:var(--faint)}
.synckey{font-family:'Inter'!important;font-size:14px!important;font-weight:400!important;text-align:left!important;padding:8px 12px!important;margin-top:8px;box-sizing:border-box}
.syncrow{display:flex;gap:8px;margin-top:8px}
.sync-full{width:100%;margin-top:8px;flex:none}
.cloudrestore{margin-top:10px;padding:10px 12px;border:0.5px solid color-mix(in srgb,var(--accent) 10%,transparent);border-radius:9px;font-size:12.5px;line-height:1.5;color:var(--ink);overflow-wrap:anywhere}
.cloudrestore p{margin:0 0 8px}
```

(`.ghost` and `.solid` already carry the 0.5 px hairline; nothing here sets a thicker border.)

- [ ] **Step 7: Run the suite to verify it passes**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `✓ all smoke tests and program invariants passed`.

- [ ] **Step 8: Check the layout at iPhone width in a real browser**

Load the Playwright tools (`ToolSearch` → `select:mcp__playwright__browser_navigate,mcp__playwright__browser_resize,mcp__playwright__browser_click,mcp__playwright__browser_evaluate,mcp__playwright__browser_take_screenshot`), then:
1. `browser_resize` to 375 × 812.
2. `browser_navigate` to `file:///Users/brianoliveira/Desktop/Claude%20Code%20Projects/Workout%20Plan/dist/index.html`.
3. Click the **Settings** tool button.
4. `browser_evaluate`:

```js
() => ({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  borders: [...document.querySelectorAll(".settings .ghost, .settings .solid")].map(b => getComputedStyle(b).borderTopWidth),
  keyAlign: getComputedStyle(document.querySelector('input[aria-label="GitHub key"]')).textAlign,
})
```

Expected: `overflow: 0`; every border `"0.5px"`; `keyAlign: "left"`. Take one screenshot of the Cloud sync section and look at it.

5. [ADDED] audit gap 3 — check the **key-saved, paused** view too (the longest status line, both button rows, the overwrite button). Seed a placeholder config that makes **no network request** (paused short-circuits every sync; `"layout-check"` is not a credential), reload, reopen Settings:

```js
() => { localStorage.setItem("pp-sync-v1", JSON.stringify({ token: "layout-check", paused: true, tokenExpires: "2027-01-31" })); location.reload(); }
```

6. After the reload, click **Settings**, then run the same `browser_evaluate` overflow/border check (skip `keyAlign` — the key field is hidden in this view). Expected: `overflow: 0`, every border `"0.5px"`. Screenshot it. **Do not tap Restore from cloud** here (it would call GitHub).
7. Clean up: `() => localStorage.removeItem("pp-sync-v1")`.

- [ ] **Step 9: Update `CLAUDE.md`**

1. In **Repo layout**, after the `src/entry.jsx` line add:
   `src/sync.js                          ← cloud sync to the private Workout-Data repo (no React; spec §4)`
2. In **window.storage abstraction**, append: `Cloud sync keeps its own key, **`pp-sync-v1`** (the GitHub key, cached shas, status). It is never written into `pp-tracker-v3`, Copy backup, `data/bundle.json` or a report — test.mjs block 15 asserts it.`
3. In **THE STALE-BUILD TRAP**, change the file list to `src/App.jsx`, `src/program.js`, `src/entry.jsx`, `src/sync.js` or `build.mjs`.
4. In **Weekly AI-review loop**, replace the final sentence `No API calls from the app.` with: `The app's only network calls are cloud sync (§ Cloud sync below), and only once Brian has saved a key — with no key it makes none (test.mjs block 15a).`
5. Add a new section after **Weekly AI-review loop**:

```markdown
## Cloud sync (Phase 1 of the weekly AI review)

Spec: `docs/superpowers/specs/2026-10-04-weekly-ai-review-design.md` §4. The app copies the full
backup (`data/bundle.json`, version 16) and week reports (`reports/week-NN.json`) to the PRIVATE
repo `bjoliveira8/Workout-Data` with a fine-grained key scoped to that repo only. Triggers: tissue
checks and notes 3 s after the edit; Finish; leaving or returning to the app (set logs at most every
10 min; a pending note or a failed sync immediately); cold open. Unchanged files are never
re-uploaded (the backup is hashed without `exported`). A conflict where the cloud holds more logged
sets pauses sync instead of overwriting (second-device guard). **Never put training data in the
public Workout-Plan repo.**
```

6. In **Testing discipline**, append: `Blocks 14–15 cover cloud sync with a fake GitHub (fakeGitHub in test.mjs) — engine unit tests and app-level triggers, privacy, Settings and Restore from cloud.`

- [ ] **Step 10: Run the suite once more and commit (show Brian the command; run only after his yes)**

Run: `cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test`
Expected: `✓ all smoke tests and program invariants passed`.

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && git add src/App.jsx test.mjs CLAUDE.md && git commit -m "feat(sync): Settings cloud sync, Restore from cloud, header dot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Go live — private repo, key, deploy, verify on the iPhone

Every step here is outward-facing: **show Brian exactly what will happen and wait for his yes at each one.** Claude never sees or types the GitHub key — Brian creates it and pastes it on his own phone.

**Files:**
- Modify: `README.md` (setup guide)

**Interfaces:**
- Consumes: the finished app from Tasks 1–4.
- Produces: a live private repo receiving syncs; the verified answer to the spec's open question (does the iPhone home-screen app reach GitHub?).

- [ ] **Step 1: Write the setup guide into `README.md`**

Append:

```markdown
## Cloud sync — one-time setup (private backup for the Saturday review)

1. **Private repo.** `bjoliveira8/Workout-Data`, **private** — never make it public.
2. **Key.** github.com → your photo → **Settings** → **Developer settings** → **Personal access
   tokens** → **Fine-grained tokens** → **Generate new token**.
   - Name: `Workout tracker sync` · Expiration: **Custom → 31 Jan 2027**
   - Repository access: **Only select repositories → Workout-Data**
   - Permissions → Repository permissions → **Contents: Read and write** (nothing else)
   - **Generate token**, then copy it (it is shown once).
3. **Phone.** Open the tracker → **Settings** → **Cloud sync** → paste the key → check the date
   says 31 Jan 2027 → **Save key and sync**. The line underneath should read "Synced just now".

If the line ever says "Key expired", repeat steps 2–3. If it says "Sync paused", the cloud copy
holds more training than the phone: tap **Restore from cloud** unless you know the phone is right.
```

Run the suite (README is not in the stale-build list, but confirm nothing else moved):
`cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && npm run build && npm test` → `✓ …`.

Commit (show Brian; run only after his yes):

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && git add README.md && git commit -m "docs: cloud sync setup guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Create the private repo (Brian's yes first)**

Check the GitHub CLI is signed in: `gh auth status`. Then show Brian and, on his yes, run:

```bash
gh repo create bjoliveira8/Workout-Data --private --description "Private training data for the Workout-Plan tracker. Never make this repo public."
```

Verify: `gh repo view bjoliveira8/Workout-Data --json visibility --jq .visibility` → `PRIVATE`.

- [ ] **Step 3: Brian creates the key**

Walk Brian through README step 2 in plain language. Claude does not open the token page for him and never handles the key.

- [ ] **Step 4: Merge to main and deploy (Brian's yes at each command)**

`deploy.mjs` pushes `main`, so the feature branch is merged first. Show the diff summary (`git diff --stat main...feature/weekly-ai-review`), then on his yes:

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && git checkout main && git merge --ff-only feature/weekly-ai-review
```

Then the no-push deploy to stage `index.html` and show its status:

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && node deploy.mjs
```

Then, on a separate explicit yes (this publishes the app):

```bash
cd "/Users/brianoliveira/Desktop/Claude Code Projects/Workout Plan" && node deploy.mjs --push
```

- [ ] **Step 5: Brian turns sync on, on the iPhone**

Brian pull-to-refreshes the home-screen app, then follows README step 3. Expected: Settings reads "Synced just now · Key expires 31 Jan 2027"; no dot in the header.

- [ ] **Step 6: Verify from the Mac without reading his training data**

```bash
gh api repos/bjoliveira8/Workout-Data/contents/data --jq '.[].name'
```
Expected: `bundle.json`.

```bash
gh api repos/bjoliveira8/Workout-Data/contents/reports --jq '.[].name'
```
Expected: at least the current calendar week, e.g. `week-02.json`.

```bash
gh api repos/bjoliveira8/Workout-Data/contents/data/bundle.json -H "Accept: application/vnd.github.raw+json" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s);let n=0;for(const w of Object.values(d.logs||{}))for(const x of Object.values(w||{}))for(const r of Object.values(x||{}))if(Array.isArray(r))for(const e of r)if(e&&(e.w||e.r))n++;console.log("version",d.version,"logged sets",n,"size KB",Math.round(Buffer.byteLength(s)/1024),"has token field",JSON.stringify(d).includes("github_pat_"))})'
```
Expected: `version 16`, a logged-set count matching the phone, `has token field false`. [ADDED] audit gap 5 — `size KB` under ~900 (GitHub returns files over 1 MB differently; the code handles it, but a bundle near that size means the archived programs should be trimmed before Phase 2). Report the number to Brian.

- [ ] **Step 7: Verify one live trigger**

Brian taps any adductor check (or edits a session note) and waits 5 seconds with the app open. Then:

```bash
gh api repos/bjoliveira8/Workout-Data/commits --jq '.[0:3][] | .commit.message + "  " + .commit.author.date'
```
Expected: a `sync: data/bundle.json` commit from the last minute. This closes the spec's open question (§4.5): the iPhone home-screen app can reach GitHub. If it cannot (no commit, Settings says "Last sync failed"), stop and report — the spec's fallback (a small relay) becomes a decision for Brian before Phase 2.

- [ ] **Step 8: Record the outcome**

Update the project memory (`~/.claude/projects/-Users-brianoliveira/memory/project_workout_plan.md`) with: the `Workout-Data` repo exists and is private, the key expires 31 Jan 2027, sync verified on the iPhone (date), and that Phase 2's plan is next. Tell Brian in two sentences what is now live and what Phase 2 adds.
