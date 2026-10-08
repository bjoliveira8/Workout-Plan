// Smoke test for dist/index.html — run `npm run build && npm test` before shipping.
// Simulates a real browser (jsdom + executed scripts) and real typing (native value
// setter + input events, which is required for React controlled inputs).
//
// Two jobs:
//   A. UI regression guards — the three historic bugs (focus-loss, border-reset,
//      stale-build) plus the core logging/persistence paths.
//   B. PROGRAM INVARIANTS — the caps, floors, ceilings and gates of the synthesized
//      block, checked against src/program.js. A weekly autoregulation edit can change
//      a prescription; it can never silently breach the block.
import { JSDOM } from "jsdom";
import { readFileSync, statSync } from "fs";

// A failed build leaves a STALE dist/index.html behind, and the suite would then happily
// pass against the previous bundle. Refuse to run unless the build is newer than its source.
for (const src of ["src/App.jsx", "src/entry.jsx", "src/program.js", "src/sync.js", "src/review.js", "build.mjs"]) {
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
const week = (n) => [...doc.querySelectorAll(".wave-col")][n - 1];

// The app opens on whichever session matches TODAY's weekday, so the suite must pin the
// tab itself. (This bit the suite once: it passed on a Sunday and failed on the Monday.)
tab("SUN").click();
await wait(150);

/* ═══════════ A. UI REGRESSION GUARDS ═══════════ */

// 1) Core content renders — Sunday week 1 is the dip-priority session
for (const p of ["FINISH SESSION", "＋ Add Set", "Weighted dip heavy double", "Weighted dip back-offs",
                 "Paused bench press", "One-arm chest-supported dumbbell row (incline bench)", "WEEK 1"])
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
// `.rx` must wrap. This block's prescriptions are long; nowrap produced 66px of
// horizontal overflow at 375px in the previous cycle.
if (!/\.rx\{[^}]*white-space:normal/.test(css)) fail.push("rx-must-wrap");
// ...and the load slot inside it must wrap too. It carries whole sentences of accessory
// guidance in this block; a blanket `.rx>span{nowrap}` pushed 426px into a 375px column.
if (/\.rx>span\{[^}]*white-space:nowrap/.test(css)) fail.push("rx-span-blanket-nowrap");
if (!/\.rx-load,\.rx-pct\{[^}]*white-space:normal/.test(css)) fail.push("rx-load-must-wrap");

// 4) Auto-rest fires only when a set becomes complete (wt+reps), not on weight alone
fire(doc.querySelector('input[aria-label="Weighted dip heavy double set 1 weight"]'), "45");
await wait(40);
if (doc.querySelector(".timerbar")) fail.push("timer-fired-on-weight-only");
fire(doc.querySelector('input[aria-label="Weighted dip heavy double set 1 reps"]'), "2");
await wait(40);
if (!doc.querySelector(".timerbar")) fail.push("autorest-did-not-fire");

// 5) CRITICAL: logging another exercise must work while the timer is running.
//    (History: inline component definitions caused remounts on every timer tick,
//    destroying input focus. TimerBar must stay module-level with its own tick,
//    and cards must stay plain render functions.)
const bench = doc.querySelector('input[aria-label="Paused bench press set 1 weight"]');
fire(bench, "180");
await wait(500);
if (doc.querySelector('input[aria-label="Paused bench press set 1 weight"]').value !== "180") fail.push("logging-during-timer");

// 6) Persistence: debounced save lands in localStorage under the stable key
await wait(900);
const saved = window.localStorage.getItem("pp-tracker-v3");
if (!saved || !saved.includes("180")) fail.push("localStorage-persist");

// 7) Alt toggle swaps and reverts. Revert afterwards, or the renamed card breaks later
//    lookups. Only the row / shoulder / trunk items carry alts — the plan says plainly
//    that no primary-lift substitution is scheduled.
const altBtn = [...doc.querySelectorAll(".inlbtn")].find((b) => b.textContent.trim() === "Alt Exercise");
if (!altBtn) fail.push("alt-button-missing");
else {
  altBtn.click();
  await wait(60);
  const revert = [...doc.querySelectorAll(".inlbtn")].find((b) => b.textContent.trim() === "Original");
  if (!revert) fail.push("alt-toggle");
  else { revert.click(); await wait(60); }
  if ([...doc.querySelectorAll(".inlbtn")].some((b) => b.textContent.trim() === "Original")) fail.push("alt-revert");
}
// A primary lift must NOT offer a substitution.
{
  const dipCard = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Weighted dip heavy double");
  if (dipCard?.querySelector(".inlbtn")) fail.push("primary-lift-offers-alt");
}

// 7.5) Bar-speed tag on a loaded lift persists (required co-signal for autoregulation)
const bsFast = doc.querySelector('[aria-label="Weighted dip heavy double bar speed fast"]');
if (!bsFast) fail.push("barspeed-control-missing");
else {
  bsFast.click();
  await wait(900);
  const s = window.localStorage.getItem("pp-tracker-v3") || "";
  if (!s.includes('"barSpeed"') || !s.includes("fast")) fail.push("barspeed-persist");
}

// 7.6) Global session clock appears once a set is logged
if (!doc.querySelector(".sessionclock")) fail.push("session-clock-missing");

// 7.7) The dip pair renders as two cards at the block's week-1 loads, with the
//      bodyweight+external system load shown (thresholds use system load, never external).
{
  const heavy = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Weighted dip heavy double");
  const back = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Weighted dip back-offs");
  if (!heavy || !back) fail.push("dip-cards-missing");
  else {
    if (heavy.querySelectorAll(".set-row").length !== 1) fail.push("dip-heavy-row-count");
    if (back.querySelectorAll(".set-row").length !== 3) fail.push("dip-backoff-row-count");
    const bw = back.querySelector('input[aria-label="Weighted dip back-offs set 1 weight"]');
    if (!bw || bw.placeholder !== "35") fail.push("backoff-placeholder=" + (bw && bw.placeholder));
    if (!heavy.textContent.includes("Total system load")) fail.push("system-load-missing");
    if (!heavy.textContent.includes("215")) fail.push("system-load-value"); // BW 170 + 45
  }
}

// 7.75) The Rx button must fill BOTH weight and reps in one write. Two setEntry calls in
//       the same tick each rebuilt the row from the closure's `logs`, so the second
//       discarded the first and Rx filled the reps while silently dropping the weight.
{
  const back = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Weighted dip back-offs");
  back.querySelector(".set-row .rxfill").click();
  await wait(120);
  const w = back.querySelector('input[aria-label="Weighted dip back-offs set 1 weight"]').value;
  const r = back.querySelector('input[aria-label="Weighted dip back-offs set 1 reps"]').value;
  if (w !== "35" || r !== "6") fail.push(`rxfill-partial=w:${w},r:${r}`);
  // An accessory with a text prescription has no number to fill — reps only, never an
  // invented weight.
  const row = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "One-arm chest-supported dumbbell row (incline bench)");
  row.querySelector(".set-row .rxfill").click();
  await wait(120);
  const aw = row.querySelector('input[aria-label="One-arm chest-supported dumbbell row (incline bench) set 1 weight"]').value;
  const ar = row.querySelector('input[aria-label="One-arm chest-supported dumbbell row (incline bench) set 1 reps"]').value;
  if (aw !== "" || ar !== "8") fail.push(`rxfill-textload=w:${aw},r:${ar}`);
}

// 7.8) A card with no set grid must not report itself complete before anything is logged.
//      (Real bug from the previous cycle: isAutoDone returned true when rx.sets was absent.)
if (out().includes("9 / 9 items done")) fail.push("auto-done-without-logging");

// 8) Impact and running placement. Sunday and Monday carry no impact — it never follows
//    a ride or precedes the deadlift day. Wednesday and Friday do.
if (out().includes("Impact Block")) fail.push("impact-on-sunday");
tab("MON").click();
await wait(120);
if (out().includes("Impact Block")) fail.push("impact-on-monday");
if (!out().includes("Conventional deadlift")) fail.push("mon-deadlift-missing");
if (!out().includes("Neutral-grip pull-up")) fail.push("mon-pullup-missing");
if (!out().includes("Knee-supported short-lever Copenhagen")) fail.push("mon-copen-missing");

tab("WED").click();
await wait(150);
if (!out().includes("Impact Block")) fail.push("impact-missing-wed");
if (!out().includes("Adductor Check")) fail.push("addcheck-missing-wed");
if (!out().includes("Strict OHP top double")) fail.push("wed-w1-ohp-missing");
if (out().includes("Strict OHP calibration")) fail.push("wed-w1-calibration-should-be-gone");
if (!out().includes("OHP anchor")) fail.push("wed-w1-ohp-anchor-note-missing");
if (doc.querySelector(".sprintcard")) fail.push("running-on-wednesday");

// 8.5) Impact contacts log and persist, at the week's prescribed targets
{
  const low = doc.querySelector('input[aria-label="Low · pogos / line hops contacts completed"]');
  if (!low) fail.push("impact-input-missing");
  else if (low.placeholder !== "40") fail.push("impact-target-w1-wed=" + low.placeholder);
  else {
    fire(low, "40");
    await wait(900);
    const s = window.localStorage.getItem("pp-tracker-v3") || "";
    if (!s.includes('"elastic"')) fail.push("impact-persist");
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
    doc.querySelector('[aria-label="After this session adductor normal"]').click();
    await wait(120);
  }
}

// 8.7) Friday week 1: no broad-jump test; hill accelerations from the first week, with
//      the plan's own rest (120 s at ≤20 m) rather than a hard-coded one.
tab("FRI").click();
await wait(150);
if (!out().includes("Low-bar squat")) fail.push("fri-squat-missing");
if (!doc.querySelector(".sprintcard")) fail.push("running-missing-w1");
if (!out().includes("120 s between reps")) fail.push("run-rest-w1");
if (!out().includes("Dumbbell incline bench press")) fail.push("fri-incline-missing");

// 8.8) Friday week 5 runs the hill block with the ceiling shown.
week(5).click();
await wait(150);
if (!doc.querySelector(".sprintcard")) fail.push("running-missing-w5");
if (!out().includes("ceiling 250 / 500 m")) fail.push("run-ceiling-missing");
if (!out().includes("hill")) fail.push("w5-should-be-hill");

// 8.9) Week-12 tests are split: OHP on Wednesday; dip then pull-up on Friday.
week(12).click();
await wait(120);
tab("WED").click();
await wait(150);
if (!out().includes("Strict OHP target test")) fail.push("testweek:wed-ohp-test-missing");
if (out().includes("Weighted dip target test") || out().includes("Neutral-grip pull-up target test")) fail.push("testweek:wed-has-friday-tests");
tab("FRI").click();
await wait(200);
for (const p of ["Weighted dip target test", "Neutral-grip pull-up target test", "Test rules"])
  if (!out().includes(p)) fail.push("testweek:" + p);
if (out().includes("Strict OHP target test")) fail.push("testweek:fri-has-ohp-test");
if (doc.querySelectorAll(".tab.testtab").length !== 2) fail.push("test-tabs-not-both-marked=" + doc.querySelectorAll(".tab.testtab").length);

// 9) Structured JSON export (AI Analysis) is valid and versioned
let copied = null;
try { Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async (t) => { copied = t; } }, configurable: true }); } catch (e) {}
week(1).click();
await wait(150);
const aiBtn = [...doc.querySelectorAll(".tool")].find((b) => b.textContent.includes("AI Analysis"));
if (!aiBtn) fail.push("ai-analysis-missing");
else {
  aiBtn.click();
  await wait(150);
  try {
    const j = JSON.parse(copied);
    if (j.version !== 18 || j.kind !== "week-report" || !Array.isArray(j.days)) fail.push("json-shape");
    if (!j.volumeAudit || !j.phase || !j.targetRir || !j.source) fail.push("json-week-fields");
    if (j.days.length !== 4) fail.push("json-day-count");
    const sun = j.days.find((d) => d.day === "sun");
    const dip = sun.exercises.find((e) => e.id === "dipheavy");
    if (!dip || !dip.isPrimary || !("barSpeed" in dip) || !dip.rx || !dip.cut) fail.push("json-primary-fields");
    if (dip.rx.systemLoad !== 215) fail.push("json-system-load=" + dip.rx.systemLoad);
    // Version 18: every row carries the heaviest completed load, so the review can see a stall.
    if (!("performedLoad" in dip) || dip.performedLoad !== 45) fail.push("json-performed-load=" + dip.performedLoad);
    if (sun.impact !== null) fail.push("json-sunday-has-impact");
    const wed = j.days.find((d) => d.day === "wed");
    if (!wed.impact || !Array.isArray(wed.impact.tiers)) fail.push("json-impact");
    const fri = j.days.find((d) => d.day === "fri");
    if (!fri.running || fri.running.reps !== 4) fail.push("json-w1-running");
    if (!sun.minuteBudget || sun.minuteBudget.isHardCap !== true || sun.minuteBudget.limit !== 75) fail.push("json-hard-cap");
    if (!j.impactLedger || j.impactLedger.capOk !== true) fail.push("json-impact-ledger");
    if (j.volumeAudit.press !== 20 || j.volumeAudit.ratio !== 1.25) fail.push("json-volume=" + j.volumeAudit.press + "/" + j.volumeAudit.ratio);
    if (j.volumeAudit.triceps !== 6 || j.volumeAudit.biceps !== 6) fail.push("json-arms=" + j.volumeAudit.biceps + "/" + j.volumeAudit.triceps);
  } catch (e) { fail.push("json-parse"); }
}

// 10) Reorder: nudging the first exercise down changes the order and persists it.
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

// 10.5) V2 FEATURES — the things this block added over the previous one.
{
  // (a) Daily power is a real prescribed card with its own QUALITY control, not the old
  //     kettlebell primer. Most power items carry a text load, so the bar-speed row would
  //     never appear for them — quality is the stop rule and must be loggable.
  week(1).click(); await wait(90); tab("SUN").click(); await wait(150);
  const kb = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Plyometric push-up (hands leave the floor)");
  if (!kb) fail.push("power-card-missing");
  else {
    const q = kb.querySelector('[aria-label="Plyometric push-up (hands leave the floor) power quality crisp"]');
    if (!q) fail.push("power-quality-control-missing");
    else {
      q.click(); await wait(900);
      const s = window.localStorage.getItem("pp-tracker-v3") || "";
      if (!s.includes('"powerQual"') || !s.includes("crisp")) fail.push("power-quality-persist");
    }
    const stop = kb.querySelector('[aria-label="Plyometric push-up (hands leave the floor) power quality stopped"]');
    stop.click(); await wait(120);
    if (!kb.textContent.includes("omitted")) fail.push("stopped-power-not-marked-omitted");
    q.click(); await wait(80);
    // A power item must NOT offer the bar-speed control.
    if (kb.querySelector('[aria-label$="bar speed fast"]')) fail.push("power-shows-bar-speed");
  }
  // (b) Impact: Wednesday is a HARD 15 minutes, Friday a ~30-minute TARGET. No travel budget.
  tab("WED").click(); await wait(150);
  if (!out().includes("15-min hard limit")) fail.push("wed-cap-not-15-hard");
  week(2).click(); await wait(90); tab("FRI").click(); await wait(180);
  if (!out().includes("30-min target")) fail.push("fri-cap-not-30-target");
  if (out().includes("left for travel")) fail.push("travel-budget-still-shown");
  // The impact card must print the prescribed event sequence, which is what makes the
  // cut decision possible BEFORE travelling.
  if (!out().includes("Preparation")) fail.push("impact-events-missing");
  // (b2) The high-tier ceiling follows the weekly tier table (18 in week 11), counted
  //      across both impact days.
  week(11).click(); await wait(90); tab("FRI").click(); await wait(180);
  {
    const card = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Impact Block");
    if (!card) fail.push("w11-fri-impact-missing");
    else if (!card.textContent.includes("week high tier 18 / cap 18")) fail.push("w11-high-cap-display");
  }

  // (c) Strength time is a HARD 75-minute limit — week-12 Friday included.
  week(12).click(); await wait(90); tab("FRI").click(); await wait(200);
  if (!out().includes("75-min hard limit")) fail.push("w12-hard-limit-not-shown");
  if (out().includes("over the 75-min")) fail.push("w12-fri-over-limit");
  if (!out().includes("Sequencing checks and cut order")) fail.push("session-rules-panel-missing");
  // (d) Week 13 is reachable, optional, and refuses to be a retry.
  const cols = [...doc.querySelectorAll(".wave-col")];
  if (cols.length !== 13) fail.push("week-strip-count=" + cols.length);
  cols[12].click(); await wait(220);
  for (const p of ["Not a retry", "deferred", "FINISH WEEK 13", "Saturday, 26 December 2026"])
    if (!out().includes(p)) fail.push("w13:" + p);
  if (!out().includes("no thirteenth deadlift") && !out().includes("No thirteenth deadlift")) fail.push("w13-deadlift-note-missing");
  // (d2) The warm-up header must show real minutes and the named drills. V2 renamed the
  //      block from "Preparation" to "Warm-up" and the header silently read "0 min".
  week(1).click(); await wait(90); tab("SUN").click(); await wait(150);
  {
    const toggle = doc.querySelector(".warm-toggle");
    if (!toggle) fail.push("warmup-toggle-missing");
    else {
      if (/·\s*0\s*min warm-up/.test(toggle.textContent)) fail.push("warmup-minutes-zero");
      toggle.click(); await wait(140);
      const card = toggle.closest(".card");
      if (!card.textContent.includes("Brisk walk")) fail.push("warmup-drills-missing");
      toggle.click(); await wait(80);
    }
  }

  // (e) Arms: biceps on Sunday and Wednesday only, triceps on Monday and Friday only.
  week(1).click(); await wait(90);
  for (const [d, arm] of [["SUN", "biceps"], ["MON", "triceps"], ["WED", "biceps"], ["FRI", "triceps"]]) {
    tab(d).click(); await wait(140);
    const tags = [...doc.querySelectorAll(".session .card .tag")].map((x) => x.textContent.trim());
    for (const k of ["biceps", "triceps"]) {
      const has = tags.includes(k);
      if (has !== (k === arm)) fail.push(`arm-day:${d}-${k}=${has}`);
    }
  }
  week(1).click(); await wait(90); tab("SUN").click(); await wait(150);
}

// 11) Every one of the 48 sessions renders without an error and without an empty body.
{
  for (const w of [1, 2, 6, 7, 11, 12]) {
    week(w).click();
    await wait(90);
    for (const t of ["SUN", "MON", "WED", "FRI"]) {
      tab(t).click();
      await wait(110);
      const cards = doc.querySelectorAll(".session .card[data-exid]").length;
      if (cards === 0) fail.push(`empty-session:w${w}-${t}`);
      if (out().includes("undefined") || out().includes("NaN")) fail.push(`render-artefact:w${w}-${t}`);
    }
  }
  week(1).click(); await wait(90); tab("SUN").click(); await wait(120);
}

/* ═══════════ B. PROGRAM INVARIANTS ═══════════ */

// 12) The rails of the V3 block, read straight from the generated program.
{
  const P = await import("./src/program.js");
  const { SESSIONS, IMPACT, AUDIT, META, WEEK13, SOURCE } = P;
  const DAYS = ["sun", "mon", "wed", "fri"];
  const NORMAL = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11];
  const allItems = (w) => DAYS.flatMap((d) => SESSIONS[w][d].items.map((i) => ({ ...i, day: d })));
  const find = (w, d, id) => SESSIONS[w][d].items.find((i) => i.id === id);

  // Shape: 48 sessions, row count from the source, 24 impact sessions, V3 program id.
  let sessions = 0, rows = 0;
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    if (!SESSIONS[w]?.[d]) { fail.push(`missing-session:w${w}-${d}`); continue; }
    sessions++; rows += SESSIONS[w][d].items.length;
  }
  if (sessions !== 48) fail.push("session-count=" + sessions);
  if (rows !== SOURCE.rows) fail.push(`row-count=${rows}, source says ${SOURCE.rows}`);
  if (SOURCE.impactSessions !== 24) fail.push("impact-session-count");
  if (META.programId !== "astra-synthesis-v5" || META.blockVersion !== "v5.0-syn3") fail.push("program-id");

  // Every id is a STRING (interning once shipped them as integers), and prose fields are text.
  for (let w = 1; w <= 12; w++) for (const it of allItems(w)) {
    if (typeof it.id !== "string") fail.push(`non-string-id:w${w}-${it.day}=${typeof it.id}`);
    if (typeof it.name !== "string" || !it.name) fail.push(`bad-name:w${w}-${it.day}`);
    for (const k of ["purpose", "rir"]) if (typeof it[k] !== "string") fail.push(`non-string-${k}:w${w}-${it.day}-${it.id}`);
  }
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    const s = SESSIONS[w][d];
    for (const k of ["objective", "cuts", "sequencing"]) if (typeof s[k] !== "string" || s[k].length < 20) fail.push(`session-${k}:w${w}-${d}`);
    for (const n of s.notes || []) if (typeof n.text !== "string") fail.push(`note-text:w${w}-${d}`);
  }
  for (const t of WEEK13.tests) if (typeof t.id !== "string") fail.push("w13-non-string-id");

  // The app's live audit must agree with the generated audit, every week.
  for (let w = 1; w <= 12; w++) {
    const a = AUDIT[w];
    const s = { press: 0, vertical: 0, horizontal: 0 };
    let biceps = 0, triceps = 0, calves = 0;
    const days = { lower: new Set(), shoulder: new Set(), abs: new Set(), adductor: new Set(),
                   carry: new Set(), unilateral: new Set(), power: new Set() };
    allItems(w).forEach((i) => {
      if (i.workSet && s[i.family] != null) s[i.family] += i.sets;
      if (i.armKind === "biceps") biceps += i.sets;
      if (i.armKind === "triceps") triceps += i.sets;
      if (i.calf) calves += i.sets;
      if (i.lowerStrength) days.lower.add(i.day);
      if (i.shoulderHealth) days.shoulder.add(i.day);
      if (i.directAbs) days.abs.add(i.day);
      if (i.family === "adductor") days.adductor.add(i.day);
      if (i.family === "carry") days.carry.add(i.day);
      if (i.power) days.power.add(i.day);
      if (i.unilateral) days.unilateral.add(i.day);
    });
    const chk = (k, v) => { if (v !== a[k]) fail.push(`audit-${k}:w${w}=${v}!=${a[k]}`); };
    chk("press", s.press); chk("vertical", s.vertical); chk("horizontal", s.horizontal);
    chk("biceps", biceps); chk("triceps", triceps); chk("calves", calves);
    chk("lower", days.lower.size); chk("shoulder", days.shoulder.size); chk("abs", days.abs.size);
    chk("adductor", days.adductor.size); chk("carry", days.carry.size); chk("unilateral", days.unilateral.size);
    chk("powerDays", days.power.size);
    if (Math.abs(Math.round((s.press / (s.vertical + s.horizontal)) * 1000) / 1000 - a.ratio) > 1e-9) fail.push(`audit-ratio:w${w}`);
  }

  // Normal weeks: 20 press / 9 vertical / 7 horizontal (ratio 1.25), 6 biceps, 6 triceps, 6 calf sets.
  for (const w of NORMAL) {
    const a = AUDIT[w];
    if (a.press !== 20 || a.vertical !== 9 || a.horizontal !== 7) fail.push(`normal-volume:w${w}=${a.press}/${a.vertical}/${a.horizontal}`);
    if (a.press < META.floors.press || a.press > META.floors.pressMax) fail.push(`press-band:w${w}`);
    if (Math.abs(a.ratio - 1.25) > 1e-9 || a.ratio > META.floors.ratioMax) fail.push(`normal-ratio:w${w}=${a.ratio}`);
    if (a.biceps !== 6 || a.triceps !== 6) fail.push(`normal-arms:w${w}=${a.biceps}/${a.triceps}`);
    if (a.calves !== 6) fail.push(`normal-calves:w${w}=${a.calves}`);
  }
  if (AUDIT[6].press !== 12 || AUDIT[12].press !== 8) fail.push(`reduced-press=${AUDIT[6].press}/${AUDIT[12].press}`);
  for (const w of [6, 12]) {
    if (AUDIT[w].ratio > META.floors.ratioMax) fail.push(`reduced-ratio:w${w}`);
    if (AUDIT[w].biceps !== 4 || AUDIT[w].triceps !== 4 || AUDIT[w].calves !== 4) fail.push(`reduced-accessories:w${w}`);
  }
  // Structural floors hold every week; week 12 has 3 power days by approved exception E11.
  for (let w = 1; w <= 12; w++) {
    const a = AUDIT[w];
    if (a.lower !== 2) fail.push(`lower-days:w${w}=${a.lower}`);
    if (a.shoulder < 3) fail.push(`shoulder-days:w${w}=${a.shoulder}`);
    if (a.abs < 4) fail.push(`abs-days:w${w}=${a.abs}`);
    if (a.adductor !== 2) fail.push(`adductor-days:w${w}=${a.adductor}`);
    if (a.carry < 2) fail.push(`carry-days:w${w}=${a.carry}`);
    if (a.powerDays !== (w === 12 ? 3 : 4)) fail.push(`power-days:w${w}=${a.powerDays}`);
    if (a.unilateral !== 4) fail.push(`unilateral-days:w${w}=${a.unilateral}`);
    if (a.patterns.length !== 2) fail.push(`dynamic-patterns:w${w}=${a.patterns.length}`);
  }
  // Lower-body strength lives on Monday and Friday only.
  for (let w = 1; w <= 12; w++) for (const d of ["sun", "wed"])
    if (SESSIONS[w][d].items.some((i) => i.lowerStrength)) fail.push(`lower-on-upper-day:w${w}-${d}`);

  // Direct arms: exactly one exercise per session — biceps Sun/Wed, triceps Mon/Fri.
  const ARM = { sun: "biceps", mon: "triceps", wed: "biceps", fri: "triceps" };
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    const arms = SESSIONS[w][d].items.filter((i) => i.directArm).map((i) => i.armKind);
    if (arms.length !== 1 || arms[0] !== ARM[d]) fail.push(`arms:w${w}-${d}=${arms.join("/")}`);
  }
  // Calves Monday and Friday only: ≥3 sets in normal weeks, exactly 2 in weeks 6 and 12.
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    const c = SESSIONS[w][d].items.filter((i) => i.calf);
    if (d === "sun" || d === "wed") { if (c.length) fail.push(`calves-on-upper-day:w${w}-${d}`); continue; }
    if (c.length !== 1) { fail.push(`calf-missing:w${w}-${d}`); continue; }
    if ((w === 6 || w === 12) ? c[0].sets !== 2 : c[0].sets < 3) fail.push(`calf-sets:w${w}-${d}=${c[0].sets}`);
  }

  // Brian's rule: no exercise is ever done for fewer than 2 sets (one-set target tests
  // excepted), and a cut keeps ≥2 sets or skips the whole optional exercise.
  const base = (n) => n.replace(/ (top double|back-off doubles|back-off double|back-offs|heavy double|target-rep practice|triples)$/, "")
                       .replace(/ \((moderate|light technique, C02)\)$/, "");
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    const g = {};
    for (const i of SESSIONS[w][d].items) {
      if (i.test) continue;
      g[base(i.name)] = (g[base(i.name)] || 0) + i.sets;
      if (i.cut !== "never" && !(i.protectedSets === 0 || i.protectedSets >= 2)) fail.push(`cut-to-one-set:w${w}-${d}-${i.id}`);
    }
    for (const [k, n] of Object.entries(g)) if (n < 2) fail.push(`single-set:w${w}-${d}-${k}`);
  }

  // Friday DB incline bench (Brian, 24 Sep): weeks 1–11, 2 sets, supersetted with the single-leg RDL.
  for (let w = 1; w <= 12; w++) {
    const inc = find(w, "fri", "inclinedb");
    for (const d of ["sun", "mon", "wed"]) if (find(w, d, "inclinedb")) fail.push(`incline-off-friday:w${w}-${d}`);
    if (w === 12) { if (inc) fail.push("incline-on-test-day"); continue; }
    if (!inc || inc.sets !== 2 || inc.family !== "press") fail.push(`incline:w${w}`);
    else if (!/single-leg RDL/.test(inc.supersetWith || "")) fail.push(`incline-not-supersetted:w${w}`);
  }

  // Week-12 tests: OHP 130×2 Wednesday; dip +50×6 then pull-up +45×5 Friday; nothing in front of them.
  const w12w = SESSIONS[12].wed.items, w12f = SESSIONS[12].fri.items;
  const tOhp = w12w.find((i) => i.name === "Strict OHP target test");
  const tDip = w12f.find((i) => i.name === "Weighted dip target test");
  const tPull = w12f.find((i) => i.name === "Neutral-grip pull-up target test");
  if (!tOhp || tOhp.load !== 130 || tOhp.repsNum !== 2 || tOhp.sets !== 1) fail.push("test-ohp");
  if (!tDip || tDip.load !== 50 || tDip.repsNum !== 6 || tDip.sets !== 1) fail.push("test-dip");
  if (!tPull || tPull.load !== 45 || tPull.repsNum !== 5 || tPull.sets !== 1) fail.push("test-pullup");
  if (tDip && tPull && w12f.indexOf(tDip) > w12f.indexOf(tPull)) fail.push("test-order");
  if (w12f.some((i) => i.power)) fail.push("power-before-friday-tests");                  // A3 / E11
  if (SESSIONS[12].fri.blocks[0].drills?.some((d) => /KB complex/.test(d))) fail.push("kb-complex-before-friday-tests");
  if (w12w.some((i) => i.family === "vertical" || /dip/i.test(i.name))) fail.push("dip-or-pullup-on-w12-wednesday");
  if (JSON.stringify(META.testDays) !== '["wed","fri"]' || META.testWeek !== 12) fail.push("test-session-placement");
  const recov = SESSIONS[12].fri.blocks.filter((b) => /Passive recovery between tests/.test(b.name));
  if (recov.length !== 1 || recov[0].seconds !== 600) fail.push("w12-recovery-between-tests");
  if (META.targets.ohp !== "130 × 2" || META.targets.dip !== "+50 × 6" || META.targets.pullup !== "+45 × 5" || META.targets.broad) fail.push("targets");
  // No training set exceeds a target at equal or higher reps.
  const capAtReps = [
    { re: /OHP/i, reps: 2, cap: 130, label: "ohp" },
    { re: /\bdip\b/i, reps: 6, cap: 50, label: "dip" },
    { re: /pull-up/i, reps: 5, cap: 45, label: "pullup" },
  ];
  for (let w = 1; w <= 12; w++) for (const i of allItems(w)) {
    if (i.load == null || typeof i.repsNum !== "number") continue;
    for (const c of capAtReps)
      if (c.re.test(i.name) && i.repsNum >= c.reps && i.load > c.cap) fail.push(`cap-${c.label}:w${w}-${i.day}=${i.repsNum}rep@${i.load}`);
  }

  // OHP path (approved table): Wednesday top double 117.5 → 127.5; no calibration single.
  const OHP_WED = { 1: 117.5, 2: 117.5, 3: 120, 4: 120, 5: 122.5, 7: 122.5, 8: 122.5, 9: 125, 10: 125, 11: 127.5 };
  for (const [w, top] of Object.entries(OHP_WED)) {
    const t = find(+w, "wed", "ohptop");
    if (!t || t.load !== top || t.repsNum !== 2 || t.sets !== 1) fail.push(`ohp-path:w${w}`);
  }
  for (let w = 1; w <= 12; w++) for (const i of allItems(w)) if (/calibration/i.test(i.name)) fail.push(`calibration-single:w${w}`);

  // Amendment A2 — the dip six-rep ladder climbs in even 2.5 lb steps into the +50 test.
  {
    const sixes = [];
    for (let w = 1; w <= 11; w++) { const b = find(w, "sun", "dipback"); if (b && b.repsNum === 6) sixes.push(b.load); }
    const last = sixes[sixes.length - 1];
    if (last !== 47.5) fail.push(`dip-last-six=${last}, want 47.5`);
    if (tDip && tDip.load - last !== 2.5) fail.push(`dip-final-step=${tDip.load - last}`);
    for (let i = 1; i < sixes.length; i++) {
      const step = sixes[i] - sixes[i - 1];
      if (step !== 0 && step !== 2.5) fail.push(`dip-uneven-step:${sixes[i - 1]}->${sixes[i]}`);
    }
  }
  // Amendment A1 as resolved on 24 Sep: 2-set lunge and single-leg RDL, calves (above), NO leg curl.
  for (let w = 1; w <= 12; w++) {
    if (find(w, "mon", "legcurl")) fail.push(`legcurl-present:w${w}`);
    const sl = find(w, "fri", "slrdl"), lg = find(w, "mon", "lunge");
    if (!sl || sl.sets < 2) fail.push(`slrdl:w${w}`);
    if (!lg || lg.sets < 2) fail.push(`lunge:w${w}`);
  }

  // Deadlift: Monday only, 12 exposures — 10 heavy (450 top + 405 back-off), 2 light (2×2 @ 390).
  let heavy = 0, light = 0;
  for (let w = 1; w <= 12; w++) {
    const dl = find(w, "mon", "dl"), back = find(w, "mon", "dlback");
    if (!dl) { fail.push(`dl-missing:w${w}`); continue; }
    if (dl.load === 450 && dl.sets === 1 && back && back.load === 405 && back.sets === 1) heavy++;
    else if (dl.load === 390 && dl.sets === 2 && !back) light++;
    else fail.push(`dl-unexpected:w${w}`);
    for (const d of ["sun", "wed", "fri"]) if (find(w, d, "dl")) fail.push(`dl-off-monday:w${w}-${d}`);
  }
  if (heavy !== 10 || light !== 2) fail.push(`dl-split=${heavy}/${light}`);
  if (WEEK13.deadliftExposures !== 0) fail.push("w13-has-deadlift");

  // Reduced weeks must reduce: week 6 loads at or below week 5 on every lift.
  for (const d of DAYS) for (const i of SESSIONS[5][d].items) {
    if (i.load == null) continue;
    const six = find(6, d, i.id);
    if (six && six.load != null && six.load > i.load) fail.push(`deload-not-lighter:${d}-${i.id}`);
  }

  // Impact: Wednesday and Friday only; Wednesday ≤15 min HARD; Friday ~30 min target;
  // contacts add up; high tier matches the weekly table and is absent before week 5.
  const tiers = (w) => ({ low: IMPACT[w].wed.low + IMPACT[w].fri.low,
                          moderate: IMPACT[w].wed.moderate + IMPACT[w].fri.moderate,
                          high: IMPACT[w].wed.high + IMPACT[w].fri.high });
  for (let w = 1; w <= 12; w++) {
    const wed = IMPACT[w]?.wed, fri = IMPACT[w]?.fri;
    if (!wed || !fri) { fail.push(`impact-missing:w${w}`); continue; }
    if (IMPACT[w].sun || IMPACT[w].mon) fail.push(`impact-wrong-day:w${w}`);
    if (wed.capType !== "hard" || wed.capSeconds !== 900) fail.push(`wed-cap:w${w}`);
    if (fri.capType !== "target" || fri.capSeconds !== 1800) fail.push(`fri-cap:w${w}`);
    if (wed.baseSeconds > 900) fail.push(`wed-over-15:w${w}=${wed.baseSeconds}`);
    if (fri.baseSeconds > 1800) fail.push(`fri-over-30:w${w}=${fri.baseSeconds}`);
    for (const [lbl, im] of [["wed", wed], ["fri", fri]]) {
      if (im.events.reduce((a, e) => a + e.seconds, 0) !== im.baseSeconds) fail.push(`impact-event-sum:w${w}-${lbl}`);
      if (im.test) fail.push(`measurement-session:w${w}-${lbl}`);
      for (const k of ["low", "moderate", "high"]) {
        const c = im.events.filter((e) => e.tier === k).reduce((a, e) => a + (e.contacts || 0), 0);
        if (c !== im[k]) fail.push(`contacts-mismatch:w${w}-${lbl}-${k}`);
      }
    }
    const high = wed.high + fri.high;
    if (high !== (META.highContactCapByWeek[w] ?? 0)) fail.push(`high-contacts:w${w}=${high}`);
    if (w < 5 && high > 0) fail.push(`high-tier-too-early:w${w}`);
  }
  // ≤15% weekly growth within an established tier, except the named week-5 entry and the
  // week-7 restoration after the deload (C04).
  for (let w = 2; w <= 12; w++) {
    if (w === 5 || w === 7) continue;
    const a = tiers(w - 1), b = tiers(w);
    for (const k of ["low", "moderate", "high"]) if (a[k] > 0 && b[k] > a[k] * 1.15 + 1e-9) fail.push(`tier-growth:w${w}-${k}`);
  }
  if (tiers(6).moderate + tiers(6).high > 0) fail.push("deload-w6-not-low-only");
  if (tiers(12).moderate + tiers(12).high > 0) fail.push("w12-impact-not-low-only");

  // Sprints: Friday only, every week; ≤250 m of accelerations; 2–3 min rest; hill through
  // week 7, flat from week 8; one variable per stage; each stage twice before advancing.
  const stages = [];
  for (let w = 1; w <= 12; w++) {
    if (IMPACT[w].wed.run) fail.push(`running-on-wednesday:w${w}`);
    const r = IMPACT[w].fri.run;
    if (!r) { fail.push(`running-missing:w${w}`); continue; }
    if (typeof r.reps !== "number") fail.push(`run-reps-not-a-number:w${w}`);
    if (r.accelM > META.runCeiling.accelM || r.totalM > META.runCeiling.totalM) fail.push(`run-ceiling:w${w}`);
    if (r.restSeconds < 120 || r.restSeconds > 180) fail.push(`run-rest:w${w}=${r.restSeconds}`);
    if (r.distance > 20) fail.push(`run-distance:w${w}`);
    if (w <= 7 && /flat/i.test(r.terrain)) fail.push(`flat-too-early:w${w}`);
    if (w >= 8 && !/flat/i.test(r.terrain)) fail.push(`flat-expected:w${w}`);
    if (r.runout < r.distance) fail.push(`runout-short:w${w}`);
    stages.push([w, r.reps, r.distance, r.terrain, r.effort]);
  }
  {
    let cur = null, count = 0;
    for (const [w, ...st] of stages) {
      if (w === 6 || w === 12) continue;
      const key = JSON.stringify(st);
      if (cur !== null && key !== cur) {
        if (count < 2) fail.push(`sprint-stage-advanced-early:w${w}`);
        const a = JSON.parse(cur);
        const up = [a[0] < st[0], a[1] !== st[1], a[2] !== st[2], a[3] !== st[3]].filter(Boolean).length;
        if (up > 1) fail.push(`sprint-stage-two-changes:w${w}`);
      }
      if (key !== cur) { cur = key; count = 1; } else count++;
    }
  }

  // Copenhagen: 3×6 per side on Monday and Friday, every week, short lever.
  for (let w = 1; w <= 12; w++) for (const d of ["mon", "fri"]) {
    const c = find(w, d, "copen");
    if (!c) { fail.push(`copen-missing:w${w}-${d}`); continue; }
    if (c.sets !== 3 || c.repsNum !== 6 || !c.perSide) fail.push(`copen-dose:w${w}-${d}`);
    if (!/short-lever/i.test(c.name)) fail.push(`copen-lever:w${w}-${d}`);
  }

  // Time: a HARD 75-minute strength limit for every session, week-12 Friday included —
  // and still inside it if every priority rest runs to three minutes.
  if (META.strengthIsHardCap !== true || META.strengthLimitMinutes !== 75) fail.push("strength-hard-cap");
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    const s = SESSIONS[w][d];
    const blockSum = s.blocks.reduce((a, b) => a + b.seconds, 0);
    if (blockSum !== s.seconds) fail.push(`block-sum:w${w}-${d}=${blockSum}!=${s.seconds}`);
    if (Math.abs(s.seconds / 60 - s.minutes) > 0.01) fail.push(`minutes:w${w}-${d}`);
    if (s.minutes > META.strengthLimitMinutes) fail.push(`over-75:w${w}-${d}=${s.minutes}`);
    if (s.secondsIfMaxRests > 4500) fail.push(`over-75-at-3min-rests:w${w}-${d}`);
    if (!s.blocks.some((b) => b.name === "Delay reserve" && b.seconds === 300)) fail.push(`no-delay-reserve:w${w}-${d}`);
  }

  // Week 13: an optional Saturday (26 Dec) slot for deferred tests only; same loads as week 12.
  if (WEEK13.week !== 13 || WEEK13.day !== "sat" || WEEK13.date !== "2026-12-26") fail.push("w13-placement");
  if (WEEK13.countsToward48 !== false) fail.push("w13-counts-toward-48");
  if (WEEK13.tests.length !== 3) fail.push("w13-test-count=" + WEEK13.tests.length);
  if (WEEK13.interTestSeconds !== 600) fail.push("w13-inter-test=" + WEEK13.interTestSeconds);
  for (const wt of WEEK13.tests) {
    const cap = wt.id === "ohp" ? 130 : wt.id === "dip" ? 50 : 45;
    if (wt.load !== cap) fail.push(`w13-load:${wt.id}=${wt.load}`);
  }

  // Fresh-slot ordering: power first (except week-12 Friday), then the day's priority lift.
  const PRIORITY = { sun: "dipheavy", mon: "pullup", wed: "ohptop", fri: "squat" };
  for (const w of NORMAL) for (const d of DAYS) {
    const items = SESSIONS[w][d].items;
    if (!items[0].power) fail.push(`power-not-first:w${w}-${d}`);
    const firstMain = items.find((i) => !i.power);
    const want = PRIORITY[d] === "pullup" && w >= 7 ? "pulluplong" : PRIORITY[d];
    if (firstMain.id !== want) fail.push(`fresh-slot:w${w}-${d}=${firstMain.id}`);
  }

  // Excluded exercises must not appear anywhere — prescriptions, alts or fallback text.
  // (Dumbbell and cable rows were allowed again on 23 Sep.)
  const appSrc = readFileSync("src/App.jsx", "utf8") + readFileSync("src/program.js", "utf8");
  for (const bad of ["Turkish get-up", "Bulgarian", "Barbell RDL", "Cable flye"]) {
    if (new RegExp("\\b" + bad + "\\b", "i").test(appSrc)) fail.push("excluded-exercise:" + bad);
  }
}

// 13) MIGRATION: Brian's phone holds a bundle from the PREVIOUS block (astra-concurrent-v2),
//     which itself already carries the Press-Priority archive. `squat`, `dl`, `pullup` and
//     `copen` are live ids in both blocks, so inheriting the old logs would surface an old
//     prescription as this block's — and as "LAST WK". The old data must be preserved,
//     the earlier archive must SURVIVE, and the new block must start clean.
{
  const prev = JSON.stringify({
    program: "astra-synthesis-v4", version: 16, week: 4, day: "fri",
    // A phone that has now run THREE programs: two already archived, v3 live.
    archived: [
      { program: "press-priority-v1.3", logs: { 3: { fri: { squat: [{ w: "225", r: "3" }] } } }, notes: { "3-fri": "ancient squat note" } },
      { program: "astra-concurrent-v2", logs: { 2: { fri: { squat: [{ w: "215", r: "4" }] } } }, notes: { "2-fri": "v2 squat note" } },
      { program: "astra-synthesis-v3", logs: { 1: { fri: { squat: [{ w: "195", r: "2" }] } } }, notes: { "1-fri": "syn3 squat note" } },
    ],
    logs: { 4: { fri: { squat: [{ w: "205", r: "5", rir: "2" }] }, wed: { ohp: [{ w: "115", r: "3" }] } } },
    extraSets: {}, notes: { "4-fri": "v3 squat note" }, exNotes: {}, altChoice: {},
    done: {}, sessDone: { "4-fri": true }, tested: { ohp: "", dip: "", pullup: "", broad: "", broadBase: "88" },
    settings: { theme: "chalk", tone: "sonar", vibrate: false, autoRest: true,
                planName: "A renamed plan", dayMap: { sun: 0, mon: 1, wed: 3, fri: 5 } },
    order: {}, barSpeed: { "4-fri-squat": "grindy" }, sessionTime: {},
    elastic: { "4-fri-t3": "20" }, elasticQ: {}, sprintLog: {}, primerResp: {}, addCheck: {},
  });
  const d2 = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) { w.localStorage.setItem("pp-tracker-v3", prev); } });
  await new Promise((r) => setTimeout(r, 1400));
  const doc2 = d2.window.document, w2 = d2.window;
  const body2 = doc2.getElementById("root")?.innerHTML || "";
  if (!doc2.querySelector(".session .card")) fail.push("migration-no-cards");
  if (!body2.includes("WEEK 1")) fail.push("migration-week-not-reset");

  const stored = JSON.parse(w2.localStorage.getItem("pp-tracker-v3") || "{}");
  if (stored.program !== "astra-synthesis-v5") fail.push("migration-no-program-stamp");
  if (stored.settings.theme !== "chalk" || stored.settings.tone !== "sonar") fail.push("migration-prefs-lost");
  if (stored.settings.planName === "A renamed plan") fail.push("migration-old-planname-kept");
  // The colliding old logs must NOT appear as this block's data.
  const live = JSON.stringify(stored.logs || {});
  if (live.includes("205") || live.includes("115")) fail.push("migration-old-logs-bled-through");
  if (stored.tested && stored.tested.broadBase === "88") fail.push("migration-old-baseline-bled-through");
  // ...but they must still exist, archived — AND the older archive must have survived.
  const arch = JSON.stringify(stored.archived || []);
  if (!Array.isArray(stored.archived)) fail.push("migration-archive-not-a-list");
  if (!arch.includes("205") || !arch.includes("v3 squat note")) fail.push("migration-v4-archive-incomplete");
  if (!arch.includes("195") || !arch.includes("syn3 squat note")) fail.push("migration-clobbered-syn3-archive");
  if (!arch.includes("215") || !arch.includes("v2 squat note")) fail.push("migration-clobbered-v2-archive");
  if (!arch.includes("225") || !arch.includes("ancient squat note")) fail.push("migration-clobbered-oldest-archive");
  if ((stored.archived || []).length !== 4) fail.push("migration-archive-depth=" + (stored.archived || []).length);

  // Re-opening must not re-archive (which would stack empty state onto the real archive).
  const again = w2.localStorage.getItem("pp-tracker-v3");
  const d3 = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) { w.localStorage.setItem("pp-tracker-v3", again); } });
  await new Promise((r) => setTimeout(r, 1400));
  const s3 = JSON.parse(d3.window.localStorage.getItem("pp-tracker-v3") || "{}");
  const a3 = JSON.stringify(s3.archived || []);
  if (!a3.includes("205") || !a3.includes("225")) fail.push("migration-not-idempotent");
  if ((s3.archived || []).length !== (stored.archived || []).length) fail.push("migration-archive-grew-on-reopen");
  d2.window.close(); d3.window.close();
}

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
}

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
}

// 16) WEEKLY REVIEW RULES (src/review.js) — spec §6: every row of §6.1, every rail of §6.2,
//     the effective table, and the fetch merge. Imported straight into Node like sync.js.
{
  const R = await import("./src/review.js");
  const { SESSIONS: SS, META: M, AUDIT: A } = await import("./src/program.js");
  const ok = (v, tag) => { if (!v.ok) fail.push(`${tag}=${v.reason || (v.failures || []).join("; ")}`); };
  const no = (v, tag) => { if (v.ok) fail.push(tag); };
  const ctx = (forWeek, lp = {}) => ({ sessions: SS, forWeek, lastPerformedFor: (d, id) => lp[`${d}-${id}`] ?? null });
  const ch = (day, id, field, from, to) => ({ day, id, field, from, to, why: "test", rule: "test", reverseIf: "test" });

  // The step map covers every numeric-load item in all twelve weeks (this would have caught dlback).
  for (let w = 1; w <= 12; w++) for (const d of R.DAY_IDS) for (const it of SS[w][d].items)
    if (typeof it.load === "number" && !(it.id in R.STEP_MAP)) fail.push(`step-map-missing:${it.id}`);
  if (R.STEP_MAP.dlback !== 10 || R.STEP_MAP.dl !== 10 || R.STEP_MAP.squat !== 5 || R.STEP_MAP.ohptop !== 2.5) fail.push("step-map-values");

  // The rails' own audit agrees with the generated AUDIT, and the rails accept the unchanged plan.
  for (let w = 1; w <= 12; w++) {
    const a = R.auditWeek(SS[w]);
    for (const k of ["press", "vertical", "horizontal", "biceps", "triceps", "calves", "lower", "shoulder", "abs", "unilateral", "powerDays", "carry", "adductor", "ratio"])
      if (a[k] !== A[w][k]) fail.push(`review-audit-${k}:w${w}=${a[k]}!=${A[w][k]}`);
    const rails = R.checkRails(w, SS, SS);
    if (!rails.ok) fail.push(`rails-reject-plan:w${w}=${rails.failures.join("; ")}`);
  }

  // load — week 3 Wednesday OHP top double is 120 (2.5 lb steps); Monday deadlift back-off 405 (10 lb).
  ok(R.validateChange(ch("wed", "ohptop", "load", 120, 117.5), ctx(3)), "load-hold-rejected");
  no(R.validateChange(ch("wed", "ohptop", "load", 120, 122.5), ctx(3)), "load-above-plan-accepted");
  no(R.validateChange(ch("wed", "ohptop", "load", 120, 105), ctx(3, { "wed-ohptop": 117.5 })), "load-under-floor-accepted");
  ok(R.validateChange(ch("wed", "ohptop", "load", 120, 112.5), ctx(3, { "wed-ohptop": 117.5 })), "load-two-steps-under-last-rejected");
  no(R.validateChange(ch("mon", "dlback", "load", 405, 402.5), ctx(3)), "dlback-2.5-step-accepted");
  ok(R.validateChange(ch("mon", "dlback", "load", 405, 395), ctx(3)), "dlback-10-step-rejected");
  no(R.validateChange(ch("wed", "ohptop", "load", 117.5, 115), ctx(3)), "load-stale-from-accepted");
  no(R.validateChange(ch("sun", "row", "load", null, 50), ctx(3)), "load-on-unloaded-accepted");
  // A deload never sets the floor: week 6 is skipped when looking back from week 7.
  if (R.lastPerformedLoad({ 5: 120, 6: 100 }, 7) !== 120) fail.push("deload-set-the-floor");
  if (R.lastPerformedLoad({ 5: 120, 6: 100, 7: 122.5 }, 8) !== 122.5) fail.push("last-performed-latest");
  if (R.performedLoad([{ w: "115", r: "2" }, { w: "117.5", r: "2" }, { w: "125", r: "" }]) !== 117.5) fail.push("performed-load");
  if (R.lastPerformedFromLogs({ 2: { wed: { ohptop: [{ w: "117.5", r: "2" }] } } }, "wed", "ohptop", 3) !== 117.5) fail.push("last-performed-logs");
  // sets — Sunday bench 3 (protected 2); Sunday dip back-offs 3 (protected 3).
  ok(R.validateChange(ch("sun", "bench", "sets", 3, 2), ctx(3)), "sets-cut-rejected");
  no(R.validateChange(ch("sun", "bench", "sets", 3, 1), ctx(3)), "single-set-accepted");
  no(R.validateChange(ch("sun", "dipback", "sets", 3, 2), ctx(3)), "below-protected-accepted");
  no(R.validateChange(ch("sun", "bench", "sets", 3, 4), ctx(3)), "sets-up-accepted");
  // remove — only the Friday DB incline bench (protectedSets 0).
  ok(R.validateChange(ch("fri", "inclinedb", "remove", false, true), ctx(3)), "remove-incline-rejected");
  no(R.validateChange(ch("sun", "bench", "remove", false, true), ctx(3)), "remove-protected-accepted");
  // reps — fixed targets only, at most two fewer.
  ok(R.validateChange(ch("sun", "dipback", "reps", 6, 5), ctx(3)), "reps-cut-rejected");
  no(R.validateChange(ch("sun", "dipback", "reps", 6, 3), ctx(3)), "reps-three-under-accepted");
  no(R.validateChange(ch("sun", "curlhammer", "reps", 8, 7), ctx(3)), "reps-range-accepted");
  // rir — easier only; never an RPE target.
  ok(R.validateChange(ch("sun", "dipback", "rir", "2–3", "3–4"), ctx(3)), "rir-easier-rejected");
  no(R.validateChange(ch("sun", "dipback", "rir", "2–3", "1–2"), ctx(3)), "rir-harder-accepted");
  no(R.validateChange(ch("mon", "dl", "rir", "RPE 7–8 (2–3 RIR)", "3–4"), ctx(3)), "rir-on-rpe-accepted");
  // rest — up only, priority lifts only, at most 3:00.
  ok(R.validateChange(ch("wed", "ohptop", "rest", 150, 180), ctx(3)), "rest-up-rejected");
  no(R.validateChange(ch("wed", "ohptop", "rest", 150, 120), ctx(3)), "rest-down-accepted");
  no(R.validateChange(ch("wed", "ohptop", "rest", 150, 200), ctx(3)), "rest-over-3min-accepted");
  no(R.validateChange(ch("fri", "squat", "rest", 180, 170), ctx(3)), "squat-rest-accepted");
  no(R.validateChange(ch("sun", "row", "rest", 75, 90), ctx(3)), "accessory-rest-accepted");
  // never — a target test, an impact card, week 13, an unknown field, a missing reversal condition.
  const w12Test = SS[12].fri.items.find((i) => i.test);
  no(R.validateChange(ch("fri", w12Test.id, "load", w12Test.load, w12Test.load - 2.5), ctx(12)), "test-item-accepted");
  no(R.validateChange(ch("wed", "impact", "sets", 1, 1), ctx(3)), "impact-card-accepted");
  no(R.validateChange(ch("wed", "ohptop", "load", 120, 117.5), ctx(13)), "week-13-accepted");
  no(R.validateChange(ch("wed", "ohptop", "name", "a", "b"), ctx(3)), "unknown-field-accepted");
  no(R.validateChange({ ...ch("wed", "ohptop", "load", 120, 117.5), reverseIf: "" }, ctx(3)), "missing-reverseIf-accepted");

  // Rails: a cut taking normal-week triceps to 5, or press:pull above 1.30, is refused; a deload
  // waives volume floors but never the two-set rule; the 75-minute tripwire holds.
  const patch = (w, d, id, p) => ({ ...SS, [w]: { ...SS[w], [d]: { ...SS[w][d], items: SS[w][d].items.map((i) => (i.id === id ? { ...i, ...p } : i)) } } });
  const tri = R.checkRails(3, patch(3, "mon", "pushdown", { sets: 2 }), SS);
  if (tri.ok || !tri.failures.some((x) => /triceps/.test(x))) fail.push("rails-triceps-5-accepted");
  const rat = R.checkRails(3, patch(3, "wed", "pullup", { sets: 2 }), SS);
  if (rat.ok || !rat.failures.some((x) => /press:pull/.test(x))) fail.push("rails-ratio-accepted");
  if (!R.checkRails(6, patch(6, "mon", "pushdown", { sets: 1 }), SS).failures.some((x) => /single set/.test(x))) fail.push("rails-single-set-in-deload");
  if (R.checkRails(3, { ...SS, 3: { ...SS[3], sun: { ...SS[3].sun, secondsIfMaxRests: 4600 } } }, SS).ok) fail.push("rails-time-accepted");

  // applyChanges never mutates the plan, skips a stale `from` and started days, and records `adjusted`.
  const ap = R.applyChanges(SS, 3, [ch("wed", "ohptop", "load", 120, 117.5), ch("wed", "ohptop", "rest", 150, 180),
    ch("fri", "inclinedb", "remove", false, true), ch("sun", "bench", "load", 999, 180)]);
  const ohpE = ap.sessions[3].wed.items.find((i) => i.id === "ohptop");
  if (ohpE.load !== 117.5 || ohpE.rest !== 180 || ohpE.adjusted.length !== 2) fail.push("apply-values");
  if (SS[3].wed.items.find((i) => i.id === "ohptop").load !== 120) fail.push("apply-mutated-plan");
  if (ap.sessions[3].fri.items.some((i) => i.id === "inclinedb") || !(ap.sessions[3].fri.removed || []).length) fail.push("apply-remove");
  if (ap.applied.length !== 3 || ap.skipped.length !== 1 || !/plan changed/.test(ap.skipped[0].reason)) fail.push("apply-stale-from-not-skipped");
  if (ap.sessions[2] !== SS[2]) fail.push("apply-touched-other-week");
  const late = R.applyChanges(SS, 3, [ch("wed", "ohptop", "load", 120, 117.5), ch("fri", "inclinedb", "remove", false, true)], { skipDays: new Set(["wed"]) });
  if (late.applied.length !== 1 || late.skipped[0].reason !== "day already started") fail.push("apply-late-days");
  // Skipping the incline bench keeps the week legal (press 18, ratio 1.125).
  const legal = R.checkRails(3, ap.sessions, SS);
  if (!legal.ok) fail.push("rails-reject-legal-cut=" + legal.failures.join("; "));

  // validateProposal — the whole file: schema, every change, then the rails.
  const prop = (over = {}) => ({ schema: 1, program: M.programId, reviewedWeek: 2, forWeek: 3, createdAt: "2026-10-10T18:07:00Z",
    status: "proposed", fatigueLevel: 1, fatigueEvidence: "One poor exposure.", findings: [{ kind: "observation", text: "x" }],
    summary: "Hold the OHP top double.", alerts: [{ level: "stop", days: ["wed", "fri"], text: "x", rule: "§4" }],
    changes: [ch("wed", "ohptop", "load", 120, 117.5)], holds: [], notes: [], check: { passed: true, failures: [] }, ...over });
  ok(R.validateProposal(prop(), { sessions: SS }), "proposal-valid-rejected");
  no(R.validateProposal(prop({ program: "astra-synthesis-v4" }), { sessions: SS }), "proposal-wrong-program-accepted");
  no(R.validateProposal(prop({ status: "hold" }), { sessions: SS }), "hold-with-changes-accepted");
  no(R.validateProposal(prop({ changes: [ch("wed", "ohptop", "load", 120, 117.5), ch("wed", "ohptop", "load", 120, 115)] }), { sessions: SS }), "duplicate-change-accepted");
  no(R.validateProposal(prop({ findings: Array(6).fill({ kind: "observation", text: "x" }) }), { sessions: SS }), "six-findings-accepted");
  no(R.validateProposal(prop({ notes: [{ day: "fri", id: "calfseat", text: "x".repeat(141) }] }), { sessions: SS }), "long-note-accepted");
  no(R.validateProposal(prop(), { sessions: SS, expectedForWeek: 4 }), "wrong-forweek-accepted");
  no(R.validateProposal(prop({ changes: [ch("mon", "pushdown", "sets", 3, 2)] }), { sessions: SS }), "proposal-floor-break-accepted");
  ok(R.validateProposal(prop({ forWeek: 13, reviewedWeek: 12, status: "summary-only", changes: [] }), { sessions: SS }), "week13-summary-rejected");
  no(R.validateProposal(prop({ forWeek: 13, reviewedWeek: 12 }), { sessions: SS }), "week13-changes-accepted");
  ok(R.validateProposal({ schema: 1, program: M.programId, reviewedWeek: 2, forWeek: 3, createdAt: "x", status: "no-data", fatigueLevel: null,
    summary: "No report reached the review.", findings: [], alerts: [], changes: [], holds: [], notes: [] }, { sessions: SS }), "no-data-rejected");

  // Fetch merge: the same proposal is a no-op, a newer one replaces a WAITING one, a decided week is never replaced.
  const pend = { 3: { proposal: prop(), status: "pending" } };
  if (R.mergeProposals(pend, [prop()], "t") !== pend) fail.push("merge-same-not-noop");
  if (R.mergeProposals(pend, [prop({ createdAt: "2026-10-10T19:00:00Z" })], "t")[3].proposal.createdAt !== "2026-10-10T19:00:00Z") fail.push("merge-newer-not-taken");
  const dec = { 3: { proposal: prop(), status: "declined" } };
  if (R.mergeProposals(dec, [prop({ createdAt: "later" })], "t") !== dec) fail.push("merge-replaced-decided");
  if (R.isProposalFor(prop({ program: "astra-synthesis-v4" }), 3) || !R.isProposalFor(prop(), 3) || R.isProposalFor(prop(), 4)) fail.push("is-proposal-for");
  // The effective table applies approved weeks only, and is the plan itself when nothing is approved.
  const eff = R.buildEffective(SS, { 3: { status: "approved", applied: [ch("wed", "ohptop", "load", 120, 117.5)] },
    4: { status: "declined", applied: [] }, 5: { status: "pending" } });
  if (eff[3].wed.items.find((i) => i.id === "ohptop").load !== 117.5 || eff[4] !== SS[4] || eff[5] !== SS[5]) fail.push("build-effective");
  if (R.buildEffective(SS, {}) !== SS) fail.push("build-effective-identity");
}

// 17) THE ROUTINE'S TOOLS — check-proposal.mjs against one valid and one failing fixture per rule,
//     and week-context.mjs's ranges. Spawned exactly as the routine runs them (plain Node).
{
  const { spawnSync } = await import("node:child_process");
  const run = (...args) => spawnSync(process.execPath, args, { encoding: "utf8" });
  const FX = "tools/fixtures/";
  const pass = run("tools/check-proposal.mjs", FX + "valid.json", FX + "report-w2.json");
  if (pass.status !== 0 || !pass.stdout.startsWith("PASS")) fail.push("checker-valid-failed=" + (pass.stdout + pass.stderr).slice(0, 300));
  for (const f of ["fail-load-above", "fail-load-floor", "fail-dlback-step", "fail-sets-protected", "fail-single-set",
                   "fail-remove-protected", "fail-rest-down", "fail-rest-squat", "fail-rir-harder", "fail-test-item",
                   "fail-impact-card", "fail-triceps-floor", "fail-wrong-forweek", "fail-malformed"]) {
    const r = f === "fail-test-item" ? run("tools/check-proposal.mjs", FX + f + ".json")
                                     : run("tools/check-proposal.mjs", FX + f + ".json", FX + "report-w2.json");
    if (r.status !== 1 || !r.stdout.startsWith("FAIL")) fail.push(`checker-accepted:${f}=${r.status}`);
  }
  const wc = run("tools/week-context.mjs", "3", FX + "report-w2.json");
  if (wc.status !== 0) fail.push("week-context-exit=" + wc.status + wc.stderr.slice(0, 200));
  // Last week's 117.5 is offered for the OHP top double; deadlift back-offs step by 10.
  if (!/ohptop[^\n]*117\.5/.test(wc.stdout) || !/dlback[^\n]*395/.test(wc.stdout)) fail.push("week-context-ranges");
  if (!/TARGET TEST/.test(run("tools/week-context.mjs", "12").stdout)) fail.push("week-context-tests");
  if (!/summary-only/.test(run("tools/week-context.mjs", "13").stdout)) fail.push("week-context-13");
}

/* Shared by blocks 18–19: a week-3 proposal (hold the OHP top double at 117.5 with a longer rest,
   lighter Friday dips), a bundle that opens on week 3 Wednesday holding it, and a fresh booted copy. */
const rvChange = (day, id, field, from, to, why) => ({ day, id, field, from, to, why, rule: "§3 level 1", reverseIf: "Next Wednesday's first set lands at 2–3 RIR." });
const rvProposal = (over = {}) => ({
  schema: 1, program: "astra-synthesis-v5", reviewedWeek: 2, forWeek: 3, createdAt: "2026-10-10T18:07:00Z", basedOn: {},
  status: "proposed", fatigueLevel: 1, fatigueEvidence: "One poor exposure: Wednesday's OHP top double.",
  findings: [{ kind: "observation", text: "Wed OHP top double at 117.5: first set 1 RIR against 2–3." }],
  summary: "Hold the OHP top double at 117.5 and rest toward 3:00.",
  alerts: [{ level: "stop", days: ["wed", "fri"], text: "Calf soreness two mornings running — start impact at the lower pogo dose.", rule: "§4" }],
  changes: [rvChange("wed", "ohptop", "load", 120, 117.5, "The first set came in 1 RIR harder than prescribed."),
            rvChange("wed", "ohptop", "rest", 150, 180, "Rest toward 3:00 after one poor exposure."),
            rvChange("fri", "dip", "load", 32.5, 30, "Friday dips slowed on the last set.")],
  holds: [{ day: "fri", id: "squat", why: "Last exposure was 2 RIR; squat increases need 3.", rule: "§2" }],
  notes: [{ day: "fri", id: "calfseat", text: "Every set reached 20 — add the smallest load step.", rule: "§5" },
          { day: "wed", id: "session", text: "Keep Wednesday impact at the lower pogo dose.", rule: "§4" }],
  check: { passed: true, failures: [] }, ...over });
const rvSeed = (extra = {}) => JSON.stringify({ program: "astra-synthesis-v5", version: 17, week: 3, day: "wed", logs: {}, settings: {},
  reviews: { 3: { proposal: rvProposal(), status: "pending", fetchedAt: "2026-10-10T19:00:00Z" } }, ...extra });
const rvBoot = async ({ bundle, syncCfg, gh } = {}) => {
  const d = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) {
      w.fetch = gh ? gh.fetchImpl : undefined;
      if (bundle) w.localStorage.setItem("pp-tracker-v3", bundle);
      if (syncCfg) w.localStorage.setItem("pp-sync-v1", JSON.stringify(syncCfg));
    } });
  await new Promise((r) => setTimeout(r, 1400));
  return d;
};
const rvBtn = (docX, t) => [...docX.querySelectorAll("button")].find((b) => b.textContent.trim() === t);
const rvTab = (docX, n) => [...docX.querySelectorAll(".tab")].find((b) => b.textContent.includes(n));
const rvStored = (wX) => JSON.parse(wX.localStorage.getItem("pp-tracker-v3") || "{}");
const rvType = (wX, el, v) => {
  Object.getOwnPropertyDescriptor(wX.HTMLInputElement.prototype, "value").set.call(el, v);
  el.dispatchEvent(new wX.Event("input", { bubbles: true }));
};
// Only what is PINNED to the day on screen — the card at the top lists every alert on every day.
const rvPins = (docX) => [...docX.querySelectorAll(".revpin, .session > div > .revline")].map((e) => e.textContent).join(" ");
const rvWeight = (docX, exId) => docX.querySelector(`.card[data-exid="${exId}"] input[aria-label$="set 1 weight"]`);

// 18) SATURDAY REVIEW IN THE APP, READ-ONLY (Phase 2) — the card, pinned alerts and notes, the
//     suggestion lines, Settings history, and fetching from the private repo.
{
  { const d = await rvBoot({ bundle: rvSeed() }); const wR = d.window, docR = wR.document;
    const card = docR.querySelector(".reviewcard");
    if (!card || !card.textContent.includes("plan for week 3") || !card.textContent.includes("Fatigue level 1")) fail.push("review-card-missing");
    else if (!card.textContent.includes("117.5 lb instead of 120") || !card.textContent.includes("Reverse if")) fail.push("review-card-changes");
    if (rvBtn(docR, "Approve")) fail.push("review-approve-shown-while-off");
    const ohp = docR.querySelector('.card[data-exid="ohptop"]');
    if (!ohp || !ohp.textContent.includes("Saturday review suggests") || !ohp.textContent.includes("117.5 lb instead of 120")) fail.push("review-suggestion-line");
    if (rvWeight(docR, "ohptop")?.placeholder !== "120") fail.push("review-changed-plan-while-off");
    const sessW = rvPins(docR);
    if (!sessW.includes("Calf soreness two mornings running") || !sessW.includes("Keep Wednesday impact at the lower pogo dose")) fail.push("review-wed-pins");
    rvTab(docR, "FRI").click(); await wait(200);
    if (!rvPins(docR).includes("Calf soreness two mornings running")) fail.push("review-fri-alert");
    if (!docR.querySelector('.card[data-exid="calfseat"] .revline')?.textContent.includes("add the smallest load step")) fail.push("review-exercise-note");
    rvTab(docR, "SUN").click(); await wait(200);
    if (rvPins(docR).includes("Calf soreness two mornings running")) fail.push("review-alert-on-wrong-day");
    [...docR.querySelectorAll(".tool")].find((b) => b.textContent.includes("Settings")).click(); await wait(150);
    const st = docR.querySelector(".settings").textContent;
    if (!/Week 3 · 3 changes/.test(st) || !st.includes("waiting")) fail.push("review-settings-history");
    d.window.close(); }

  // [ADDED] audit gap 3 — every status renders: no data, summary only (with the checker's reasons), hold.
  { const nd = rvProposal({ status: "no-data", fatigueLevel: null, fatigueEvidence: "", findings: [], alerts: [], changes: [], holds: [], notes: [], summary: "No report." });
    const so = rvProposal({ status: "summary-only", changes: [], check: { passed: false, failures: ["change 1: wed ohptop load: 125 is above the plan's 120"] } });
    const ho = rvProposal({ status: "hold", changes: [], forWeek: 4, reviewedWeek: 3 });
    const d = await rvBoot({ bundle: rvSeed({ reviews: { 3: { proposal: nd, status: "pending" }, 4: { proposal: ho, status: "pending" } } }) }); const docR = d.window.document;
    const txt = [...docR.querySelectorAll(".reviewcard")].map((c) => c.textContent).join(" | ");
    if (!txt.includes("No week report reached the review") || !/no data/i.test(txt)) fail.push("status-no-data");
    if (!/plan for week 4/.test(txt) || !/hold/i.test(txt)) fail.push("status-hold");
    d.window.close();
    const d2 = await rvBoot({ bundle: rvSeed({ reviews: { 3: { proposal: so, status: "pending" } } }) });
    if (!d2.window.document.querySelector(".reviewcard")?.textContent.includes("rules check failed")) fail.push("status-summary-only");
    d2.window.close(); }

  // Fetching: the phone picks up this calendar week's proposal, ignores another program's, and
  // never replaces a week that is already decided. (Weeks come from today's date, like the app.)
  { const S = await import("./src/sync.js");
    const cw = S.calendarWeek(new Date(), "2026-09-27", 12);
    const holdFor = (w, over = {}) => rvProposal({ forWeek: w, reviewedWeek: w - 1, status: "hold", changes: [], ...over });
    const repo = { [S.proposalPath(cw)]: { text: JSON.stringify(holdFor(cw)), sha: "p1" } };
    if (cw + 1 <= 12) repo[S.proposalPath(cw + 1)] = { text: JSON.stringify(holdFor(cw + 1, { program: "astra-synthesis-v4" })), sha: "p2" };
    const gh = fakeGitHub(repo);
    const base = { program: "astra-synthesis-v5", version: 17, week: cw, day: "sun", logs: {}, settings: {} };
    const d = await rvBoot({ bundle: JSON.stringify(base), syncCfg: { token: "github_pat_REVIEW_TEST" }, gh });
    await wait(1200);
    const rv = rvStored(d.window).reviews || {};
    if (!rv[cw] || rv[cw].status !== "pending" || rv[cw].proposal.status !== "hold") fail.push("review-fetch-missed");
    if (rv[cw + 1]) fail.push("review-fetch-took-wrong-program");
    if (!gh.calls.some((c) => c.method === "GET" && c.path === S.proposalPath(cw))) fail.push("review-fetch-no-request");
    d.window.close();
    const gh2 = fakeGitHub({ [S.proposalPath(cw)]: { text: JSON.stringify(holdFor(cw, { createdAt: "2026-10-11T09:00:00Z" })), sha: "p3" } });
    const d2 = await rvBoot({ bundle: JSON.stringify({ ...base, reviews: { [cw]: { proposal: holdFor(cw), status: "declined",
      decidedAt: "2026-10-10T20:00:00Z", applied: [], skipped: [] } } }), syncCfg: { token: "github_pat_REVIEW_TEST" }, gh: gh2 });
    await wait(1200);
    const rv2 = rvStored(d2.window).reviews || {};
    if (rv2[cw]?.status !== "declined" || rv2[cw]?.proposal.createdAt !== "2026-10-10T18:07:00Z") fail.push("review-fetch-replaced-decided");
    d2.window.close(); }
}

// 19) ONE-TAP APPROVE (Phase 3, behind the Settings switch) — the effective table reaches the set
//     grid, Rx and rest; Undo; Decline keeps the advisories; late approval; the phone's own re-check;
//     the one-time prompt; report v18; the week strip; and the migration archiving `reviews`.
{
  const on = (extra = {}) => rvSeed({ settings: { approveEnabled: true }, ...extra });

  // a) Approve: placeholder, rest, chip, Rx fill all follow; suggestion lines go; the decision syncs.
  { const gh = fakeGitHub();
    const d = await rvBoot({ bundle: on(), syncCfg: { token: "github_pat_REVIEW_TEST" }, gh }); const w3 = d.window, doc3 = w3.document;
    const ap = rvBtn(doc3, "Approve");
    if (!ap) fail.push("approve-missing-when-on");
    else {
      ap.click(); await wait(300);
      const ohp = doc3.querySelector('.card[data-exid="ohptop"]');
      if (rvWeight(doc3, "ohptop").placeholder !== "117.5") fail.push("approve-placeholder=" + rvWeight(doc3, "ohptop").placeholder);
      if (!ohp.textContent.includes("Rest 3:00")) fail.push("approve-rest");
      if (ohp.textContent.includes("Saturday review suggests")) fail.push("approve-left-suggestion");
      const chip = ohp.querySelector(".adj-tag");
      if (!chip) fail.push("approve-no-chip");
      else { chip.click(); await wait(80); if (!doc3.querySelector('.card[data-exid="ohptop"]').textContent.includes("Reverse if")) fail.push("approve-chip-panel"); }
      doc3.querySelector('.card[data-exid="ohptop"] button[aria-label="Fill prescribed"]').click(); await wait(80);
      if (rvWeight(doc3, "ohptop").value !== "117.5") fail.push("approve-rx-fill");
      await wait(1000);
      const r3 = rvStored(w3).reviews[3];
      if (r3.status !== "approved" || r3.applied.length !== 3) fail.push("approve-stored=" + r3.status + "/" + (r3.applied || []).length);
      if (!(gh.repo["data/bundle.json"]?.text || "").includes('"status":"approved"')) fail.push("approve-not-synced");
    }
    d.window.close(); }

  // b) Undo returns to waiting; c) Decline keeps the plan, the stop alert and the session note;
  //    Undo disappears once a set of the week is logged.
  { const d = await rvBoot({ bundle: on() }); const doc3 = d.window.document;
    rvBtn(doc3, "Approve").click(); await wait(200);
    rvBtn(doc3, "Undo").click(); await wait(200);
    if (rvWeight(doc3, "ohptop").placeholder !== "120") fail.push("undo-kept-change");
    if (!rvBtn(doc3, "Approve")) fail.push("undo-no-approve");
    rvBtn(doc3, "Decline").click(); await wait(200);
    const s = doc3.querySelector(".session").textContent, pinned = rvPins(doc3);
    if (!pinned.includes("Calf soreness two mornings running") || !pinned.includes("Keep Wednesday impact")) fail.push("decline-hid-advisories");
    if (s.includes("Saturday review suggests")) fail.push("decline-left-suggestions");
    if (rvWeight(doc3, "ohptop").placeholder !== "120") fail.push("decline-changed-plan");
    rvType(d.window, rvWeight(doc3, "ohptop"), "115"); await wait(150);
    if (rvBtn(doc3, "Undo")) fail.push("undo-after-logging");
    d.window.close(); }

  // d) Late approval: Wednesday has started, so only Friday's change applies.
  { const d = await rvBoot({ bundle: on({ logs: { 3: { wed: { scoop: [{ w: "20", r: "3" }] } } } }) }); const doc3 = d.window.document;
    if (!doc3.querySelector(".reviewcard").textContent.includes("Some days have started")) fail.push("late-no-warning");
    rvBtn(doc3, "Approve").click(); await wait(1000);
    const r3 = rvStored(d.window).reviews[3];
    if ((r3.applied || []).length !== 1 || r3.applied[0].id !== "dip" || (r3.skipped || []).length !== 2) fail.push("late-approval=" + JSON.stringify((r3.applied || []).map((c) => c.id)));
    if (rvWeight(doc3, "ohptop").placeholder !== "120") fail.push("late-changed-started-day");
    d.window.close(); }

  // e) The phone never trusts the file: a load above the plan disables Approve and says why.
  { const bad = rvProposal({ changes: [rvChange("wed", "ohptop", "load", 120, 125, "x")] });
    const d = await rvBoot({ bundle: on({ reviews: { 3: { proposal: bad, status: "pending" } } }) }); const doc3 = d.window.document;
    const ap = rvBtn(doc3, "Approve");
    if (!ap || !ap.disabled || !doc3.querySelector(".reviewcard").textContent.includes("own check failed")) fail.push("recheck-not-enforced");
    d.window.close(); }

  // f) The one-time prompt: the first entry of a waiting week logs nothing and offers the review;
  //    "Log anyway" lets the next entry through, and the prompt never returns.
  { const d = await rvBoot({ bundle: on() }); const w3 = d.window, doc3 = w3.document;
    rvType(w3, rvWeight(doc3, "ohptop"), "120"); await wait(150);
    if (!doc3.querySelector(".revprompt")) fail.push("prompt-missing");
    if (rvWeight(doc3, "ohptop").value !== "") fail.push("prompt-logged-anyway");
    rvBtn(doc3, "Log anyway").click(); await wait(100);
    rvType(w3, rvWeight(doc3, "ohptop"), "120"); await wait(150);
    if (rvWeight(doc3, "ohptop").value !== "120" || doc3.querySelector(".revprompt")) fail.push("prompt-blocked-second-entry");
    await wait(900);
    if (!rvStored(w3).reviews[3].prompted) fail.push("prompt-not-remembered");
    d.window.close(); }

  // g) Report v18 after Approve: effective values, `adjusted`, performedLoad in rows and history.
  { let clip = null;
    const d = await rvBoot({ bundle: on({ logs: { 2: { wed: { ohptop: [{ w: "117.5", r: "2", rir: "1" }] } } } }) }); const w3 = d.window, doc3 = w3.document;
    Object.defineProperty(w3.navigator, "clipboard", { value: { writeText: async (t) => { clip = t; } }, configurable: true });
    rvBtn(doc3, "Approve").click(); await wait(200);
    [...doc3.querySelectorAll(".tool")].find((b) => b.textContent.includes("AI Analysis")).click(); await wait(150);
    try {
      const j = JSON.parse(clip);
      const row = j.days.find((x) => x.day === "wed").exercises.find((e) => e.id === "ohptop");
      if (j.version !== 18 || row.rx.load !== 117.5 || !row.adjusted || row.adjusted[0].field !== "load" || !("performedLoad" in row)) fail.push("report-v18-row");
      if (j.history["wed-ohptop"]?.[0]?.performedLoad !== 117.5) fail.push("report-v18-history");
      if (j.review?.status !== "approved") fail.push("report-v18-review");
    } catch (e) { fail.push("report-v18-parse"); }
    d.window.close(); }

  // h) Skipping the Friday incline bench: the week strip drops to 34 and Friday says why.
  { const rm = rvProposal({ changes: [{ day: "fri", id: "inclinedb", field: "remove", from: false, to: true, why: "Shoulder felt pinchy.", rule: "§5", reverseIf: "Two clean Fridays." }] });
    const d = await rvBoot({ bundle: on({ reviews: { 3: { proposal: rm, status: "pending" } } }) }); const doc3 = d.window.document;
    rvBtn(doc3, "Approve").click(); await wait(200);
    const col = [...doc3.querySelectorAll(".wave-col")][2];
    if (!/Week 3, 34 compound work sets/.test(col.getAttribute("aria-label") || "")) fail.push("strip-not-effective=" + col.getAttribute("aria-label"));
    rvTab(doc3, "FRI").click(); await wait(200);
    if (doc3.querySelector('.card[data-exid="inclinedb"]') || !doc3.querySelector(".session").textContent.includes("Skipped by the Saturday review")) fail.push("remove-not-shown");
    d.window.close(); }

  // i) The program-collision migration archives `reviews` with the rest of the old block.
  { const old = JSON.stringify({ program: "astra-synthesis-v4", version: 17, week: 3, logs: { 1: { sun: { bench: [{ w: "180", r: "3" }] } } }, settings: {},
      reviews: { 3: { proposal: rvProposal(), status: "approved", applied: [] } } });
    const d = await rvBoot({ bundle: old }); await wait(800);
    const s = rvStored(d.window), arch = s.archived || [];
    if (!arch.length || !arch[arch.length - 1].reviews?.[3] || Object.keys(s.reviews || {}).length) fail.push("migration-reviews");
    d.window.close(); }

  // k) [ADDED] audit gap 1 — a change whose `from` no longer matches the plan is skipped and listed;
  //    the rest still apply (spec §7.3), instead of the whole review being refused.
  { const st = rvProposal({ changes: [rvChange("wed", "ohptop", "load", 122.5, 120, "x"), rvChange("fri", "dip", "load", 32.5, 30, "x")] });
    const d = await rvBoot({ bundle: on({ reviews: { 3: { proposal: st, status: "pending" } } }) }); const doc3 = d.window.document;
    const ap = rvBtn(doc3, "Approve");
    if (!ap || ap.disabled || !doc3.querySelector(".reviewcard").textContent.includes("no longer matches")) fail.push("stale-blocked-approve");
    else {
      ap.click(); await wait(1000);
      const r3 = rvStored(d.window).reviews[3];
      if ((r3.applied || []).length !== 1 || (r3.skipped || [])[0]?.reason !== "the plan changed since the review") fail.push("stale-not-skipped=" + JSON.stringify(r3.skipped));
    }
    d.window.close(); }

  // j) The switch: off by default; turning it on in Settings shows Approve on the card.
  { const d = await rvBoot({ bundle: rvSeed() }); const doc3 = d.window.document;
    [...doc3.querySelectorAll(".tool")].find((b) => b.textContent.includes("Settings")).click(); await wait(150);
    const pill = doc3.querySelector('button[aria-label="One-tap Approve"]');
    if (!pill || pill.getAttribute("aria-pressed") !== "false") fail.push("switch-not-off-by-default");
    else { pill.click(); await wait(900); if (!rvStored(d.window).settings?.approveEnabled || !rvBtn(doc3, "Approve")) fail.push("switch-not-working"); }
    d.window.close(); }
}

// 20) AMENDMENT A4 (Brian, 8 Oct 2026) — from week 3 the moderate OHP lives on Sunday (after the dips,
//     before the bench) and the chest-supported DB row on Monday (after the deadlifts). Weeks 1–2 stay
//     as logged. In the first week after the move, LAST WK reads the day each exercise lived on before.
{
  const { SESSIONS: SS } = await import("./src/program.js");
  const ids = (w, d) => SS[w][d].items.map((i) => i.id);
  for (const w of [1, 2]) if (!ids(w, "mon").includes("ohp") || !ids(w, "sun").includes("row")) fail.push(`a4-touched-week-${w}`);
  for (let w = 3; w <= 12; w++) {
    const sun = ids(w, "sun"), mon = ids(w, "mon");
    if (mon.includes("ohp") || !sun.includes("ohp") || sun.includes("row") || !mon.includes("row")) { fail.push(`a4-not-moved-w${w}`); continue; }
    const lastDip = Math.max(sun.lastIndexOf("dipheavy"), sun.lastIndexOf("dipback"), sun.lastIndexOf("dip"));
    if (sun.indexOf("ohp") !== lastDip + 1 || sun.indexOf("bench") !== sun.indexOf("ohp") + 1) fail.push(`a4-sunday-order-w${w}=${sun.join(",")}`);
    if (mon.indexOf("row") !== Math.max(mon.lastIndexOf("dl"), mon.lastIndexOf("dlback")) + 1) fail.push(`a4-monday-order-w${w}=${mon.join(",")}`);
    const sb = SS[w].sun.blocks.map((b) => b.name), mb = SS[w].mon.blocks.map((b) => b.name);
    if (!sb.includes("Moderate OHP work") || sb.includes("Row") || mb.includes("Moderate OHP work") || !mb.includes("Row")) fail.push(`a4-blocks-w${w}`);
    if (/rows/.test(SS[w].sun.objective) || !/rows/.test(SS[w].mon.objective)) fail.push(`a4-objective-w${w}`);
    if (/row sets/.test(SS[w].sun.cuts) || /OHP work sets/.test(SS[w].mon.cuts)) fail.push(`a4-cuts-w${w}`);
  }
  // LAST WK in week 3: Sunday's OHP shows last Monday's OHP; Monday's row shows last Sunday's row.
  const d = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) { w.localStorage.setItem("pp-tracker-v3", JSON.stringify({ program: "astra-synthesis-v5", version: 17, week: 3, day: "sun", settings: {},
      logs: { 2: { mon: { ohp: [{ w: "102.5", r: "4" }] }, sun: { row: [{ w: "45", r: "8" }] } } } })); } });
  await new Promise((r) => setTimeout(r, 1400));
  const prevOf = (exId) => d.window.document.querySelector(`.card[data-exid="${exId}"] .set-row .prev`)?.textContent;
  if (prevOf("ohp") !== "102.5×4") fail.push("a4-last-week-ohp=" + prevOf("ohp"));
  [...d.window.document.querySelectorAll(".tab")].find((b) => b.textContent.includes("MON")).click();
  await new Promise((r) => setTimeout(r, 200));
  if (prevOf("row") !== "45×8") fail.push("a4-last-week-row=" + prevOf("row"));
  d.window.close();
}

if (fail.length) { console.error("FAIL: " + fail.join(", ")); process.exit(1); }
console.log("✓ all smoke tests and program invariants passed");
// The app's own intervals (rest TimerBar, SessionClock) keep jsdom's event loop alive,
// so exit explicitly instead of hanging after a successful run.
process.exit(0);
