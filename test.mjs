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
for (const src of ["src/App.jsx", "src/entry.jsx", "src/program.js", "build.mjs"]) {
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
    if (j.version !== 17 || j.kind !== "week-report" || !Array.isArray(j.days)) fail.push("json-shape");
    if (!j.volumeAudit || !j.phase || !j.targetRir || !j.source) fail.push("json-week-fields");
    if (j.days.length !== 4) fail.push("json-day-count");
    const sun = j.days.find((d) => d.day === "sun");
    const dip = sun.exercises.find((e) => e.id === "dipheavy");
    if (!dip || !dip.isPrimary || !("barSpeed" in dip) || !dip.rx || !dip.cut) fail.push("json-primary-fields");
    if (dip.rx.systemLoad !== 215) fail.push("json-system-load=" + dip.rx.systemLoad);
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

if (fail.length) { console.error("FAIL: " + fail.join(", ")); process.exit(1); }
console.log("✓ all smoke tests and program invariants passed");
// The app's own intervals (rest TimerBar, SessionClock) keep jsdom's event loop alive,
// so exit explicitly instead of hanging after a successful run.
process.exit(0);
