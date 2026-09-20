// Smoke test for dist/index.html — run `npm run build && npm test` before shipping.
// Simulates a real browser (jsdom + executed scripts) and real typing (native value
// setter + input events, which is required for React controlled inputs).
import { JSDOM } from "jsdom";
import { readFileSync, statSync } from "fs";

// A failed build leaves a STALE dist/index.html behind, and the suite would then happily
// pass against the previous bundle. Refuse to run unless the build is newer than its source.
for (const src of ["src/App.jsx", "src/entry.jsx", "build.mjs"]) {
  if (statSync(src).mtimeMs > statSync("dist/index.html").mtimeMs) {
    console.error(`FAIL: dist/index.html is older than ${src} — run \`npm run build\` and check it succeeded.`);
    process.exit(1);
  }
}

const html = readFileSync("dist/index.html", "utf8");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously" });
const { window } = dom;
const doc = window.document;
await new Promise((r) => setTimeout(r, 900));

const fail = [];
const out = () => doc.getElementById("root").innerHTML;
const setNative = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
const fire = (el, v) => { setNative.call(el, v); el.dispatchEvent(new window.Event("input", { bubbles: true })); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tab = (name) => [...doc.querySelectorAll(".tab")].find((b) => b.textContent.includes(name));

// 1) Core content renders — Sunday is the default first session (dip priority day)
for (const p of ["Alt Exercise", "FINISH SESSION", "＋ Add Set", "Weighted Dip", "Paused Bench Press", "WEEK 1"])
  if (!out().includes(p)) fail.push("content:" + p);

// 2) YouTube icon button sits in the header actions next to the checkmark
const acts = doc.querySelector(".ex-actions");
if (!acts || !acts.querySelector(".ytbtn") || !acts.querySelector(".donebtn")) fail.push("yt-placement");

// 3) Border regression guard: interactive buttons must stay 0.5px hairlines.
//    (History: a global `.app button{border:none}` reset once silently killed all
//    button borders; later the user pushed borders down to faint 0.5px hairlines.)
const css = [...doc.querySelectorAll("style")].map((s) => s.textContent).join("");
for (const cls of ["inlbtn", "ghost", "solid", "rxfill", "ytbtn", "donebtn", "finishbtn", "bs-btn"]) {
  const m = css.match(new RegExp("\\." + cls + "\\{[^}]*?border:([^;]+)"));
  const b = m ? m[1] : "(none)";
  if (!b.startsWith("0.5px")) fail.push(`border:${cls}=${b}`);
}
// The global reset must NOT force `border:none` — it overrode the 0.5px hairlines with a
// 3px medium border in real browsers (source-text check above was blind to it).
if (/\.app button\{[^}]*border:none/.test(css)) fail.push("reset-forces-border-none");

// 4) Auto-rest fires only when a set becomes complete (wt+reps), not on weight alone
fire(doc.querySelector('input[aria-label="Weighted Dip set 1 weight"]'), "37.5");
await wait(40);
if (doc.querySelector(".timerbar")) fail.push("timer-fired-on-weight-only");
fire(doc.querySelector('input[aria-label="Weighted Dip set 1 reps"]'), "6");
await wait(40);
if (!doc.querySelector(".timerbar")) fail.push("autorest-did-not-fire");

// 5) CRITICAL: logging another exercise must work while the timer is running.
//    (History: inline component definitions caused remounts on every timer tick,
//    destroying input focus. TimerBar must stay module-level with its own tick,
//    and cards must stay plain render functions.)
const bench = doc.querySelector('input[aria-label="Paused Bench Press set 1 weight"]');
fire(bench, "180");
await wait(500);
if (doc.querySelector('input[aria-label="Paused Bench Press set 1 weight"]').value !== "180") fail.push("logging-during-timer");

// 6) Persistence: debounced save lands in localStorage under the stable key
await wait(900);
const saved = window.localStorage.getItem("pp-tracker-v3");
if (!saved || !saved.includes("180")) fail.push("localStorage-persist");

// 7) Alt toggle swaps and reverts. Revert afterwards — the first alt button on Sunday
//    belongs to the dip, and leaving it swapped would rename the card the later
//    top-set/bar-speed checks look for.
const altBtn = [...doc.querySelectorAll(".inlbtn")].find((b) => b.textContent.trim() === "Alt Exercise");
altBtn.click();
await wait(60);
const revert = [...doc.querySelectorAll(".inlbtn")].find((b) => b.textContent.trim() === "Original");
if (!revert) fail.push("alt-toggle");
else { revert.click(); await wait(60); }
if ([...doc.querySelectorAll(".inlbtn")].some((b) => b.textContent.trim() === "Original")) fail.push("alt-revert");

// 7.5) Bar-speed tag on a main lift persists (required co-signal for autoregulation)
const bsFast = doc.querySelector('[aria-label="Weighted Dip bar speed fast"]');
if (!bsFast) fail.push("barspeed-control-missing");
else {
  bsFast.click();
  await wait(900);
  const s = window.localStorage.getItem("pp-tracker-v3") || "";
  if (!s.includes('"barSpeed"') || !s.includes("fast")) fail.push("barspeed-persist");
}

// 7.6) Global session clock appears once a set is logged
if (!doc.querySelector(".sessionclock")) fail.push("session-clock-missing");

// 7.7) Top set and back-offs live on ONE card: the dip card must show a top-set row
//      plus back-off rows, with the top row pre-filled at the heavier load.
{
  const dipCard = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Weighted Dip");
  if (!dipCard) fail.push("dip-card-missing");
  else {
    if (!dipCard.querySelector(".set-row.topset")) fail.push("topset-row-missing");
    if (dipCard.querySelectorAll(".set-row").length !== 4) fail.push("dip-row-count");
    const back = dipCard.querySelector('input[aria-label="Weighted Dip set 2 weight"]');
    if (!back || back.placeholder !== "22.5") fail.push("backoff-placeholder=" + (back && back.placeholder));
    if (!dipCard.textContent.includes("Total system load")) fail.push("system-load-missing");
  }
}

// 8) Sunday carries no elastic work (it follows the long ride) but Monday/Wed/Fri do.
if (out().includes("Elastic Block")) fail.push("elastic-on-post-ride-day");
tab("MON").click();
await wait(120);
if (!out().includes("Elastic Block")) fail.push("elastic-missing-mon");
if (!out().includes("Adductor Check")) fail.push("addcheck-missing-mon");
if (!out().includes("Conventional Deadlift")) fail.push("mon-deadlift-missing");

// 8.5) Elastic contacts log and persist
{
  const t1 = doc.querySelector('input[aria-label="Tier 1 · low contacts completed"]');
  if (!t1) fail.push("elastic-input-missing");
  else if (t1.placeholder !== "20") fail.push("elastic-target-w1-mon=" + t1.placeholder);
  else {
    fire(t1, "20");
    await wait(900);
    const s = window.localStorage.getItem("pp-tracker-v3") || "";
    if (!s.includes('"elastic"')) fail.push("elastic-persist");
  }
}

// 8.6) Adductor gate: marking abnormal raises the block-level banner
{
  const bad = doc.querySelector('[aria-label="After this session adductor abnormal"]');
  if (!bad) fail.push("addcheck-control-missing");
  else {
    bad.click();
    await wait(120);
    if (!out().includes("Adductor gate is open")) fail.push("adductor-banner-missing");
    if (!out().includes("Capture all seven")) fail.push("adductor-capture-missing");
    bad.click(); // leave it set; the normal button is a separate control
    const ok = doc.querySelector('[aria-label="After this session adductor normal"]');
    ok.click();
    await wait(120);
  }
}

// 8.7) Friday carries the acceleration block, with the session ceiling respected
tab("FRI").click();
await wait(120);
if (!out().includes("Acceleration")) fail.push("sprint-card-missing");
if (!out().includes("Low-Bar Back Squat")) fail.push("fri-squat-missing");
if (!out().includes("ceiling 250 m")) fail.push("sprint-ceiling-missing");

// 8.8) Week 12 Wednesday is the test session
[...doc.querySelectorAll(".wave-col")].at(-1).click();
await wait(120);
tab("WED").click();
await wait(150);
for (const p of ["Standing Broad Jump", "Strict OHP", "Weighted NG Pull-Up", "FINISH TEST SESSION"])
  if (!out().includes(p)) fail.push("testweek:" + p);

// 9) Structured JSON export (AI Analysis) is valid and versioned
let copied = null;
try { Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async (t) => { copied = t; } }, configurable: true }); } catch (e) {}
const aiBtn = [...doc.querySelectorAll(".tool")].find((b) => b.textContent.includes("AI Analysis"));
if (!aiBtn) fail.push("ai-analysis-missing");
else {
  aiBtn.click();
  await wait(120);
  try {
    const j = JSON.parse(copied);
    if (j.version !== 14 || j.kind !== "week-report" || !Array.isArray(j.days)) fail.push("json-shape");
    if (!j.volumeAudit || !j.phase || !j.targetRir) fail.push("json-week-fields");
    const sun = j.days.find((d) => d.day === "sun");
    const dip = sun.exercises.find((e) => e.id === "dip");
    if (!dip || !dip.isMain || !("barSpeed" in dip) || !dip.rx || !dip.cut) fail.push("json-main-fields");
    const mon = j.days.find((d) => d.day === "mon");
    if (!mon.elastic || !Array.isArray(mon.elastic.tiers)) fail.push("json-elastic");
    const fri = j.days.find((d) => d.day === "fri");
    if (!fri.sprint || fri.sprint.ceilingOk !== true) fail.push("json-sprint");
  } catch (e) { fail.push("json-parse"); }
}

// 10) Reorder: nudging the first exercise down (ArrowDown on its drag handle)
//     changes the order and persists it.
[...doc.querySelectorAll(".wave-col")][0].click();
await wait(120);
tab("SUN").click();
await wait(150);
const firstBefore = doc.querySelector(".session .card .exname")?.textContent;
const handle = doc.querySelector(".session .card[data-exid] .draghandle");
if (!handle) fail.push("reorder-controls-missing");
else {
  handle.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  await wait(900);
  const firstAfter = doc.querySelector(".session .card .exname")?.textContent;
  const s = window.localStorage.getItem("pp-tracker-v3") || "";
  if (firstBefore && firstBefore === firstAfter) fail.push("reorder-no-move");
  if (!s.includes('"order"')) fail.push("reorder-persist");
}

// 11) PROGRAM INVARIANTS — an autoregulation edit to WAVE can never breach the block.
//     These are the §5.5/§5.6/§12 rails from docs/12-week-concurrent-block.md.
{
  const src = readFileSync("src/App.jsx", "utf8");
  const grab = (name) => {
    const m = src.match(new RegExp("const " + name + " = (\\{[\\s\\S]*?\\n\\});"));
    if (!m) { fail.push("parse:" + name); return null; }
    return eval("(" + m[1] + ")");
  };
  const WAVE = grab("WAVE"), PLYO = grab("PLYO"), SPRINT = grab("SPRINT"), COPEN = grab("COPEN");

  if (WAVE) {
    const topLoad = (e) => (e == null ? null : e.top ? e.top.l : e.s ? e.l : null);
    // Week-12 targets are the ceiling for training loads (§5.5). Nothing may exceed them.
    const caps = { ohp: 125, dip: 50, pullup: 45, squat: 245, dl: 455, bench: 205 };
    for (let w = 1; w <= 12; w++) {
      for (const [k, cap] of Object.entries(caps)) {
        const l = topLoad(WAVE[k][w]);
        if (l != null && l > cap) fail.push(`cap:${k}:w${w}=${l}>${cap}`);
      }
    }
    // Deadlift: one exposure every week on a fixed weekday = 12 exposures, never a max test.
    const dlWeeks = Object.keys(WAVE.dl).filter((w) => WAVE.dl[w]).length;
    if (dlWeeks !== 12) fail.push("dl-exposures=" + dlWeeks);
    // OHP hits its week-12 target load by week 11 (dress rehearsal at the test load).
    if (topLoad(WAVE.ohp[11]) !== 125) fail.push("ohp-w11-rehearsal=" + topLoad(WAVE.ohp[11]));
    if (topLoad(WAVE.dip[11]) !== 50) fail.push("dip-w11-rehearsal");
    if (topLoad(WAVE.pullup[11]) !== 45) fail.push("pullup-w11-rehearsal");
    // Deload weeks must actually deload: week 6 top loads below week 5.
    for (const k of ["ohp", "dip", "pullup", "squat", "bench", "dl"]) {
      if (topLoad(WAVE[k][6]) >= topLoad(WAVE[k][5])) fail.push("deload-not-lighter:" + k);
    }
  }

  if (PLYO) {
    const tot = (w) => ["mon", "wed", "fri"].reduce((a, d) => {
      const x = PLYO[w][d] || {}; return { t1: a.t1 + (x.t1 || 0), t2: a.t2 + (x.t2 || 0), t3: a.t3 + (x.t3 || 0) };
    }, { t1: 0, t2: 0, t3: 0 });
    // Tier 3 is absent before week 5 (§5.8).
    for (let w = 1; w <= 4; w++) if (tot(w).t3 > 0) fail.push("tier3-early:w" + w);
    // No tier rises more than 15% week over week, measured against the highest previously
    // tolerated volume in that tier (the deload/restore reading declared in §2 of the block).
    const peak = { t1: 0, t2: 0, t3: 0 };
    for (let w = 1; w <= 12; w++) {
      const t = tot(w);
      for (const k of ["t1", "t2", "t3"]) {
        if (t[k] > peak[k]) {
          if (peak[k] > 0 && t[k] > peak[k] * 1.15 + 1e-9) fail.push(`plyo-jump:${k}:w${w}:${peak[k]}->${t[k]}`);
          peak[k] = t[k];
        }
      }
    }
    // Deload weeks run low tier only, at roughly half volume.
    for (const w of [6, 12]) {
      const t = tot(w);
      if (t.t2 > 0 || t.t3 > 0) fail.push("deload-high-tier:w" + w);
      if (t.t1 > 60) fail.push("deload-t1-too-high:w" + w);
    }
  }

  if (SPRINT) {
    for (let w = 1; w <= 12; w++) if (SPRINT[w].m > 250) fail.push(`sprint-ceiling:w${w}=${SPRINT[w].m}`);
    // Hill only through week 6; flat work cannot appear before week 7 (§5.9).
    for (let w = 1; w <= 6; w++) if (/flat/i.test(SPRINT[w].surface)) fail.push("flat-too-early:w" + w);
  }

  if (COPEN) {
    // Long lever is not permitted before three weeks of clean short-lever tolerance (§5.10).
    for (let w = 1; w <= 3; w++) if (/long/i.test(COPEN[w].lever)) fail.push("copen-long-early:w" + w);
    for (let w = 1; w <= 12; w++) if (COPEN[w].r < 6 || COPEN[w].r > 8) fail.push("copen-reps:w" + w);
  }

  // Excluded exercises must not appear anywhere in the app, including alt/fallback lists.
  for (const bad of ["Turkish", "Bulgarian", "Barbell RDL", "DB Row", "Dumbbell Row", "Cable Row", "Cable Flye"]) {
    if (new RegExp(bad, "i").test(src)) fail.push("excluded-exercise:" + bad);
  }
}

// 12) MIGRATION: Brian's phone already holds a bundle from the previous program.
//     `mon/suitcase` and `fri/squat` are the SAME exercise ids in both programs, so
//     inheriting the old logs would surface an old back-squat as this block's low-bar
//     squat (and as "LAST WK"). The old data must be preserved under `archived`, and the
//     new block must start clean. Personal preferences carry over; the old day map does not.
{
  const v13 = JSON.stringify({
    app: "press-priority", version: 13, week: 3, day: "fri",
    logs: { 3: { fri: { squat: [{ w: "225", r: "3", rir: "2" }] }, mon: { suitcase: [{ w: "40", r: "40" }] } } },
    extraSets: {}, notes: { "3-fri": "old squat note" }, exNotes: {}, altChoice: {},
    done: {}, sessDone: { "3-fri": true }, tested: { bench: "220", ohp: "128" },
    settings: { theme: "chalk", tone: "sonar", vibrate: false, autoRest: true,
                planName: "Press / Priority", dayMap: { mon: 1, tue: 2, thu: 4, fri: 5 } },
    order: {}, barSpeed: { "3-fri-squat": "fast" }, sessionTime: {},
  });
  const d2 = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) { w.localStorage.setItem("pp-tracker-v3", v13); } });
  await new Promise((r) => setTimeout(r, 1400));
  const doc2 = d2.window.document, w2 = d2.window;
  const body2 = doc2.getElementById("root")?.innerHTML || "";
  if (!doc2.querySelector(".session .card")) fail.push("migration-no-cards");
  // The new block starts at week 1, not the old bundle's week 3.
  if (!body2.includes("WEEK 1")) fail.push("migration-week-not-reset");
  // Personal preferences survive; the old plan name and day map do not.
  const stored = JSON.parse(w2.localStorage.getItem("pp-tracker-v3") || "{}");
  if (stored.program !== "astra-concurrent-v2") fail.push("migration-no-program-stamp");
  if (stored.settings.theme !== "chalk" || stored.settings.tone !== "sonar") fail.push("migration-prefs-lost");
  if (stored.settings.planName === "Press / Priority") fail.push("migration-old-planname-kept");
  if (stored.settings.dayMap.tue !== undefined) fail.push("migration-old-daymap-kept");
  // The colliding old logs must NOT appear as this block's data.
  if (JSON.stringify(stored.logs || {}).includes("225")) fail.push("migration-old-squat-bled-through");
  // ...but they must still exist, archived.
  if (!stored.archived) fail.push("migration-archive-missing");
  else {
    const a = JSON.stringify(stored.archived);
    if (!a.includes("225") || !a.includes("old squat note")) fail.push("migration-archive-incomplete");
  }
  // Re-opening must not re-archive (which would clobber the real archive with empty state).
  const again = w2.localStorage.getItem("pp-tracker-v3");
  const d3 = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) { w.localStorage.setItem("pp-tracker-v3", again); } });
  await new Promise((r) => setTimeout(r, 1400));
  const s3 = JSON.parse(d3.window.localStorage.getItem("pp-tracker-v3") || "{}");
  if (!s3.archived || !JSON.stringify(s3.archived).includes("225")) fail.push("migration-not-idempotent");
  d2.window.close(); d3.window.close();
}

if (fail.length) { console.error("FAIL: " + fail.join(", ")); process.exit(1); }
console.log("✓ all smoke tests passed");
// The app's own intervals (rest TimerBar, SessionClock) keep jsdom's event loop alive,
// so exit explicitly instead of hanging after a successful run.
process.exit(0);
