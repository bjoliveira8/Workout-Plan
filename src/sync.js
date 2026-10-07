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
