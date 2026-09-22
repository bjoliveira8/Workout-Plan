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
                 "Paused bench press", "Chest-supported machine row", "WEEK 1"])
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
  const row = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Chest-supported machine row");
  row.querySelector(".set-row .rxfill").click();
  await wait(120);
  const aw = row.querySelector('input[aria-label="Chest-supported machine row set 1 weight"]').value;
  const ar = row.querySelector('input[aria-label="Chest-supported machine row set 1 reps"]').value;
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
if (!out().includes("Strict OHP calibration")) fail.push("wed-w1-calibration-missing");
if (doc.querySelector(".sprintcard")) fail.push("running-on-wednesday");

// 8.5) Impact contacts log and persist, at the week's prescribed targets
{
  const low = doc.querySelector('input[aria-label="Low · bilateral pogos contacts completed"]');
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

// 8.7) Friday week 1 takes the jump baseline and runs NO running block.
tab("FRI").click();
await wait(150);
if (!out().includes("Low-bar squat")) fail.push("fri-squat-missing");
if (!out().includes("Broad-jump BASELINE")) fail.push("w1-baseline-input-missing");
if (doc.querySelector(".sprintcard")) fail.push("running-in-week-1");

// 8.8) Friday week 5 runs the hill block with the ceiling shown.
week(5).click();
await wait(150);
if (!doc.querySelector(".sprintcard")) fail.push("running-missing-w5");
if (!out().includes("ceiling 60 / 120 m")) fail.push("run-ceiling-missing");
if (!out().includes("hill")) fail.push("w5-should-be-hill");

// 8.9) Week 12 FRIDAY is the test session — not Wednesday.
week(12).click();
await wait(120);
tab("WED").click();
await wait(150);
if (out().includes("target test")) fail.push("tests-on-wednesday");
tab("FRI").click();
await wait(200);
for (const p of ["Strict OHP target test", "Weighted dip target test", "Neutral-grip pull-up target test",
                 "Broad-jump RESULT", "No retries"])
  if (!out().includes(p)) fail.push("testweek:" + p);
if (!doc.querySelector(".tab.testtab")) fail.push("test-tab-not-marked");

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
    if (j.version !== 16 || j.kind !== "week-report" || !Array.isArray(j.days)) fail.push("json-shape");
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
    if (fri.running !== null) fail.push("json-w1-running-should-be-null");
    if (!j.impactLedger || j.impactLedger.capOk !== true) fail.push("json-impact-ledger");
    if (j.volumeAudit.press !== 18 || j.volumeAudit.ratio !== 1.2) fail.push("json-volume=" + j.volumeAudit.press + "/" + j.volumeAudit.ratio);
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
  const kb = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Single-arm kettlebell clean");
  if (!kb) fail.push("power-card-missing");
  else {
    const q = kb.querySelector('[aria-label="Single-arm kettlebell clean power quality crisp"]');
    if (!q) fail.push("power-quality-control-missing");
    else {
      q.click(); await wait(900);
      const s = window.localStorage.getItem("pp-tracker-v3") || "";
      if (!s.includes('"powerQual"') || !s.includes("crisp")) fail.push("power-quality-persist");
    }
    const stop = kb.querySelector('[aria-label="Single-arm kettlebell clean power quality stopped"]');
    stop.click(); await wait(120);
    if (!kb.textContent.includes("omitted")) fail.push("stopped-power-not-marked-omitted");
    q.click(); await wait(80);
    // A power item must NOT offer the bar-speed control.
    if (kb.querySelector('[aria-label$="bar speed fast"]')) fail.push("power-shows-bar-speed");
  }
  // (b) Impact caps differ by day in this block: Wednesday 15 min, Friday 30.
  tab("WED").click(); await wait(150);
  if (!out().includes("15-min clock")) fail.push("wed-cap-not-15");
  week(2).click(); await wait(90); tab("FRI").click(); await wait(180);
  if (!out().includes("30-min clock")) fail.push("fri-cap-not-30");
  // The impact card must print the prescribed event sequence, which is what makes the
  // cut decision possible BEFORE travelling.
  if (!out().includes("Preparation")) fail.push("impact-events-missing");
  // (b2) The fullest Wednesday leaves only 65 seconds for travel inside the 15-minute
  //      clock. That is the session most likely to overrun, so the card must say so
  //      BEFORE the athlete leaves, not after.
  week(5).click(); await wait(90); tab("WED").click(); await wait(180);
  {
    const card = [...doc.querySelectorAll(".card")].find((c) => c.querySelector(".exname")?.textContent === "Impact Block");
    if (!card) fail.push("w5-wed-impact-missing");
    else {
      if (!card.textContent.includes("This is the tight one")) fail.push("tight-impact-warning-missing");
      if (!card.textContent.includes("1.1 min")) fail.push("tight-impact-travel-figure");
    }
  }

  // (c) Strength time is a guideline, and week-12 Friday is over it by design.
  week(12).click(); await wait(90); tab("FRI").click(); await wait(200);
  if (!out().includes("by design")) fail.push("w12-over-guideline-not-flagged");
  if (!out().includes("94")) fail.push("w12-fri-minutes-missing");
  // (d) Week 13 is reachable, optional, and refuses to be a retry.
  const cols = [...doc.querySelectorAll(".wave-col")];
  if (cols.length !== 13) fail.push("week-strip-count=" + cols.length);
  cols[12].click(); await wait(220);
  for (const p of ["Not a retry", "deferred", "FINISH WEEK 13"])
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

  // (e) Biceps appear on Sunday and Wednesday only, and no direct triceps anywhere.
  week(1).click(); await wait(90);
  for (const [d, want] of [["SUN", true], ["MON", false], ["WED", true], ["FRI", false]]) {
    tab(d).click(); await wait(140);
    const hasCurl = [...doc.querySelectorAll(".exname")].some((e) => /curl/i.test(e.textContent));
    if (hasCurl !== want) fail.push(`biceps-day:${d}=${hasCurl}`);
    if ([...doc.querySelectorAll(".exname")].some((e) => /press-?down|triceps/i.test(e.textContent)))
      fail.push(`direct-triceps-rendered:${d}`);
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

// 12) The rails of the synthesized block, read straight from the generated program.
{
  const P = await import("./src/program.js");
  const { SESSIONS, IMPACT, AUDIT, META, WEEK13, SOURCE } = P;
  const DAYS = ["sun", "mon", "wed", "fri"];
  const allItems = (w) => DAYS.flatMap((d) => SESSIONS[w][d].items.map((i) => ({ ...i, day: d })));
  const find = (w, d, id) => SESSIONS[w][d].items.find((i) => i.id === id);

  // Shape: 48 sessions, 397 rows, 24 impact sessions.
  let sessions = 0, rows = 0;
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    if (!SESSIONS[w]?.[d]) { fail.push(`missing-session:w${w}-${d}`); continue; }
    sessions++; rows += SESSIONS[w][d].items.length;
  }
  if (sessions !== 48) fail.push("session-count=" + sessions);
  if (rows !== SOURCE.rows) fail.push(`row-count=${rows}, source says ${SOURCE.rows}`);

  // Every exercise id must be a STRING. String interning once shipped all 397 of them as
  // integers, which would have broken log keys, rest lookups and alt swaps against real
  // saved data without any visible error.
  for (let w = 1; w <= 12; w++) for (const it of allItems(w)) {
    if (typeof it.id !== "string") fail.push(`non-string-id:w${w}-${it.day}=${typeof it.id}`);
    if (typeof it.name !== "string" || !it.name) fail.push(`bad-name:w${w}-${it.day}`);
  }
  for (const t of WEEK13.tests) if (typeof t.id !== "string") fail.push("w13-non-string-id");

  // The app's live audit must agree with the source plan's own audit, every week.
  // A PRODUCTIVE work set is the plan's `work_set` flag — power, ramps, shoulder-health
  // and core work are real training but must NOT inflate the pressing/pulling floors.
  for (let w = 1; w <= 12; w++) {
    const a = AUDIT[w];
    const s = { press: 0, vertical: 0, horizontal: 0 };
    let biceps = 0;
    const days = { lower: new Set(), shoulder: new Set(), abs: new Set(), adductor: new Set(),
                   carry: new Set(), unilateral: new Set(), power: new Set() };
    allItems(w).forEach((i) => {
      if (i.workSet && s[i.family] != null) s[i.family] += i.sets;
      if (i.directArm) biceps += i.sets;
      if (i.lowerStrength) days.lower.add(i.day);
      if (i.shoulderHealth) days.shoulder.add(i.day);
      if (i.directAbs) days.abs.add(i.day);
      if (i.family === "adductor") days.adductor.add(i.day);
      if (i.family === "carry") days.carry.add(i.day);
      if (i.power) days.power.add(i.day);
      if (i.unilateral) days.unilateral.add(i.day);
    });
    if (s.press !== a.press) fail.push(`audit-press:w${w}=${s.press}!=${a.press}`);
    if (s.vertical !== a.vertical) fail.push(`audit-vertical:w${w}=${s.vertical}!=${a.vertical}`);
    if (s.horizontal !== a.horizontal) fail.push(`audit-horizontal:w${w}=${s.horizontal}!=${a.horizontal}`);
    if (biceps !== a.biceps) fail.push(`audit-biceps:w${w}=${biceps}!=${a.biceps}`);
    if (Math.abs(s.press / (s.vertical + s.horizontal) - a.ratio) > 1e-6) fail.push(`audit-ratio:w${w}`);
    if (days.lower.size !== a.lower) fail.push(`audit-lower-days:w${w}=${days.lower.size}!=${a.lower}`);
    if (days.shoulder.size !== a.shoulder) fail.push(`audit-shoulder-days:w${w}=${days.shoulder.size}!=${a.shoulder}`);
    if (days.abs.size !== a.abs) fail.push(`audit-abs-days:w${w}=${days.abs.size}!=${a.abs}`);
    if (days.power.size !== a.powerDays) fail.push(`audit-power-days:w${w}=${days.power.size}!=${a.powerDays}`);
    if (days.unilateral.size !== a.unilateral) fail.push(`audit-unilateral-days:w${w}=${days.unilateral.size}!=${a.unilateral}`);
    if (days.carry.size !== a.carry) fail.push(`audit-carry-days:w${w}=${days.carry.size}!=${a.carry}`);
    if (days.adductor.size !== a.adductor) fail.push(`audit-adductor-days:w${w}=${days.adductor.size}!=${a.adductor}`);
  }

  // Normal weeks: 18 pressing, 9 vertical, 6 row, ratio 1.200, 4 biceps sets.
  for (const w of [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]) {
    const a = AUDIT[w];
    if (a.press !== 18 || a.vertical !== 9 || a.horizontal !== 6) fail.push(`normal-volume:w${w}`);
    if (Math.abs(a.ratio - 1.2) > 1e-9) fail.push(`normal-ratio:w${w}=${a.ratio}`);
    if (a.ratio > META.floors.ratioMax) fail.push(`ratio-over-cap:w${w}`);
    if (a.biceps !== 4) fail.push(`normal-biceps:w${w}=${a.biceps}`);
  }
  if (AUDIT[6].press !== 10 || AUDIT[12].press !== 7) fail.push("reduced-press-volume");
  if (AUDIT[6].biceps !== 2 || AUDIT[12].biceps !== 2) fail.push("reduced-biceps-volume");
  // STRUCTURAL floors hold in EVERY week, reduced weeks included (C09 waives only the
  // three reduced volumes, never the exposure counts).
  for (let w = 1; w <= 12; w++) {
    const a = AUDIT[w];
    if (a.lower !== 2) fail.push(`lower-days:w${w}=${a.lower}`);
    if (a.shoulder < 3) fail.push(`shoulder-days:w${w}=${a.shoulder}`);
    if (a.abs < 4) fail.push(`abs-days:w${w}=${a.abs}`);
    if (a.adductor !== 2) fail.push(`adductor-days:w${w}=${a.adductor}`);
    if (a.powerDays !== 4) fail.push(`power-days:w${w}=${a.powerDays}`);
    if (a.unilateral !== 4) fail.push(`unilateral-days:w${w}=${a.unilateral}`);
    if (a.patterns.length !== 2) fail.push(`dynamic-patterns:w${w}=${a.patterns.length}`);
  }
  // No direct triceps anywhere — the approved arm redesign removed it entirely.
  for (let w = 1; w <= 12; w++) for (const i of allItems(w))
    if (/triceps|press-?down|skull|kickback/i.test(i.name)) fail.push(`direct-triceps:w${w}=${i.name}`);

  // Week-12 targets are exact, and no training set may exceed them at equal or higher
  // reps. A heavy DOUBLE legitimately sits above the six-rep dip load; the cap compares
  // like reps, not raw load.
  const t = { ohp: 125, dip: 50, pullup: 45 };
  const testFri = SESSIONS[12].fri.items;
  const tOhp = testFri.find((i) => i.name === "Strict OHP target test");
  const tDip = testFri.find((i) => i.name === "Weighted dip target test");
  const tPull = testFri.find((i) => i.name === "Neutral-grip pull-up target test");
  if (!tOhp || tOhp.load !== 125 || tOhp.repsNum !== 2 || tOhp.sets !== 1) fail.push("test-ohp");
  if (!tDip || tDip.load !== 50 || tDip.repsNum !== 6 || tDip.sets !== 1) fail.push("test-dip");
  if (!tPull || tPull.load !== 45 || tPull.repsNum !== 5 || tPull.sets !== 1) fail.push("test-pullup");
  if (META.testDay !== "fri" || META.testWeek !== 12) fail.push("test-session-placement");
  const capAtReps = [
    { re: /OHP/i, reps: 2, cap: t.ohp, label: "ohp" },
    { re: /dip/i, reps: 6, cap: t.dip, label: "dip" },
    { re: /pull-up/i, reps: 5, cap: t.pullup, label: "pullup" },
  ];
  for (let w = 1; w <= 12; w++) for (const i of allItems(w)) {
    if (i.load == null || typeof i.repsNum !== "number") continue;
    for (const c of capAtReps) {
      if (c.re.test(i.name) && i.repsNum >= c.reps && i.load > c.cap)
        fail.push(`cap-${c.label}:w${w}-${i.day}=${i.repsNum}rep@${i.load}>${c.cap}`);
    }
  }

  // Deadlift: one exposure every week on a fixed Monday = 12, ten heavy plus two light,
  // and no max anywhere (C01, C02).
  let dlCount = 0, heavy = 0, light = 0;
  for (let w = 1; w <= 12; w++) {
    const dl = find(w, "mon", "dl");
    if (!dl) { fail.push(`dl-missing:w${w}`); continue; }
    dlCount++;
    if (dl.load === 450 && dl.sets === 2 && dl.repsNum === 2) heavy++;
    else if (dl.load === 390 && dl.sets === 1 && dl.repsNum === 2) light++;
    else fail.push(`dl-unexpected:w${w}=${dl.sets}x${dl.repsNum}@${dl.load}`);
    for (const d of ["sun", "wed", "fri"]) if (find(w, d, "dl")) fail.push(`dl-off-monday:w${w}-${d}`);
  }
  if (dlCount !== 12) fail.push("dl-exposures=" + dlCount);
  if (heavy !== 10) fail.push("dl-heavy=" + heavy);
  if (light !== 2) fail.push("dl-light=" + light);
  if (WEEK13.deadliftExposures !== 0) fail.push("w13-has-deadlift");

  // Reduced weeks must actually reduce: week 6 loads at or below week 5 on every lift.
  for (const d of DAYS) for (const i of SESSIONS[5][d].items) {
    if (i.load == null) continue;
    const six = find(6, d, i.id);
    if (six && six.load != null && six.load > i.load) fail.push(`deload-not-lighter:${d}-${i.id}`);
  }

  // Impact (§12): six high-tier TRAINING contacts a week, absent before week 5. Weeks 1
  // and 12 carry three maximal broad jumps as the approved C03 measurement exception.
  // Impact never lands on Sunday or Monday, and the caps differ by day: Wed 15, Fri 30.
  for (let w = 1; w <= 12; w++) {
    const wed = IMPACT[w]?.wed, fri = IMPACT[w]?.fri;
    if (!wed || !fri) { fail.push(`impact-missing:w${w}`); continue; }
    if (IMPACT[w].sun || IMPACT[w].mon) fail.push(`impact-wrong-day:w${w}`);
    if (wed.capSeconds !== META.impactCapMinutes.wed * 60) fail.push(`wed-cap:w${w}=${wed.capSeconds}`);
    if (fri.capSeconds !== META.impactCapMinutes.fri * 60) fail.push(`fri-cap:w${w}=${fri.capSeconds}`);
    const high = wed.high + fri.high;
    const isMeasure = wed.test || fri.test;
    if (!isMeasure && high > META.highContactCap) fail.push(`high-contacts:w${w}=${high}`);
    if (isMeasure && high > 3) fail.push(`measurement-contacts:w${w}=${high}`);
    // The prescribed work must fit inside the cap with travel left over.
    for (const [lbl, im] of [["wed", wed], ["fri", fri]]) {
      if (im.baseSeconds > im.capSeconds) fail.push(`impact-over-cap:w${w}-${lbl}`);
      if (im.baseSeconds + im.travelSeconds !== im.capSeconds) fail.push(`impact-travel-math:w${w}-${lbl}`);
      const evSum = im.events.reduce((a, e) => a + e.seconds, 0);
      if (evSum !== im.baseSeconds) fail.push(`impact-event-sum:w${w}-${lbl}=${evSum}!=${im.baseSeconds}`);
    }
  }
  for (const w of [2, 3, 4, 6]) {
    const high = IMPACT[w].wed.high + IMPACT[w].fri.high;
    if (high > 0) fail.push(`high-tier-too-early:w${w}=${high}`);
  }
  if (IMPACT[6].wed.moderate + IMPACT[6].fri.moderate > 0) fail.push("deload-w6-not-low-only");
  if (!IMPACT[1].fri.test || !IMPACT[12].fri.test) fail.push("measurement-weeks-not-flagged");

  // Running (§13): Friday only; none in weeks 1 and 12; hill through week 8; flat only
  // from week 9; never over 60 acceleration or 120 total metres in a session.
  for (let w = 1; w <= 12; w++) {
    if (IMPACT[w].wed.run) fail.push(`running-on-wednesday:w${w}`);
    const r = IMPACT[w].fri.run;
    if (w === 1 || w === 12) { if (r) fail.push(`running-in-measurement-week:w${w}`); continue; }
    if (!r) { fail.push(`running-missing:w${w}`); continue; }
    if (typeof r.reps !== "number") fail.push(`run-reps-not-a-number:w${w}=${typeof r.reps}`);
    if (r.accelM > META.runCeiling.accelM) fail.push(`accel-ceiling:w${w}=${r.accelM}`);
    if (r.totalM > META.runCeiling.totalM) fail.push(`run-ceiling:w${w}=${r.totalM}`);
    if (r.reps > 3) fail.push(`run-reps:w${w}=${r.reps}`);
    if (r.effort > 70) fail.push(`run-effort:w${w}=${r.effort}`);
    if (w <= 8 && /flat/i.test(r.terrain)) fail.push(`flat-too-early:w${w}`);
    if (w >= 9 && !/flat/i.test(r.terrain)) fail.push(`flat-expected:w${w}`);
    if (r.runout < r.distance) fail.push(`runout-short:w${w}`);
  }

  // Copenhagen (§14): 3×6 per side on Monday and Friday, every week, short lever.
  for (let w = 1; w <= 12; w++) for (const d of ["mon", "fri"]) {
    const c = find(w, d, "copen");
    if (!c) { fail.push(`copen-missing:w${w}-${d}`); continue; }
    if (c.sets !== 3 || c.repsNum !== 6 || !c.perSide) fail.push(`copen-dose:w${w}-${d}=${c.sets}x${c.repsNum}`);
    if (!/short-lever/i.test(c.name)) fail.push(`copen-lever:w${w}-${d}`);
  }

  // Time (§7, authority update): the 75-minute strength figure is a GUIDELINE in this
  // block, not a hard cap — week-12 Friday is deliberately 94 minutes of testing. What
  // must still hold is that the block minutes add up to the session total, and that the
  // only session over the guideline is the test session.
  if (META.strengthIsHardCap !== false) fail.push("strength-should-be-a-guideline");
  for (let w = 1; w <= 12; w++) for (const d of DAYS) {
    const s = SESSIONS[w][d];
    const blockSum = s.blocks.reduce((a, b) => a + b.seconds, 0);
    if (blockSum !== s.seconds) fail.push(`block-sum:w${w}-${d}=${blockSum}!=${s.seconds}`);
    if (Math.abs(s.seconds / 60 - s.minutes) > 0.01) fail.push(`minutes:w${w}-${d}`);
    const over = s.minutes > META.strengthGuidelineMinutes;
    const isTestSession = w === 12 && d === "fri";
    if (over && !isTestSession) fail.push(`over-guideline:w${w}-${d}=${s.minutes}`);
    if (isTestSession && s.minutes !== 94) fail.push(`w12-fri-minutes=${s.minutes}`);
  }

  // Week 13 (§18): an optional deferred-test slot. Not one of the 48, no deadlift, and
  // its three tests are the same targets at the same loads as week 12.
  if (WEEK13.week !== 13 || WEEK13.day !== "fri") fail.push("w13-placement");
  if (WEEK13.countsToward48 !== false) fail.push("w13-counts-toward-48");
  if (WEEK13.tests.length !== 3) fail.push("w13-test-count=" + WEEK13.tests.length);
  if (WEEK13.interTestSeconds !== 600) fail.push("w13-inter-test=" + WEEK13.interTestSeconds);
  for (const wt of WEEK13.tests) {
    const cap = wt.id === "ohp" ? 125 : wt.id === "dip" ? 50 : 45;
    if (wt.load !== cap) fail.push(`w13-load:${wt.id}=${wt.load}`);
  }
  // Ten minutes between week-12 tests (§18 raised it from five to protect test quality).
  const recov = SESSIONS[12].fri.blocks.filter((b) => /^Recovery after/.test(b.name));
  if (recov.length !== 2) fail.push("w12-recovery-blocks=" + recov.length);
  for (const b of recov) if (b.seconds !== 600) fail.push(`w12-recovery-short:${b.name}=${b.seconds}`);

  // Fresh-slot ordering: one heavy pressing priority per session, in the freshest slot.
  if (SESSIONS[1].wed.items.findIndex((i) => i.id === "ohptop") < 0) fail.push("wed-no-ohp-priority");
  if (SESSIONS[1].fri.items[0].id !== "broadpower") fail.push("fri-jump-not-first");
  if (find(1, "sun", "dipheavy") == null) fail.push("sun-fresh-dip");

  // Excluded exercises must not appear anywhere — prescriptions, alts or fallback text.
  const appSrc = readFileSync("src/App.jsx", "utf8") + readFileSync("src/program.js", "utf8");
  for (const bad of ["Turkish", "Bulgarian", "Barbell RDL", "Dumbbell row", "Cable row", "Cable flye"]) {
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
    program: "astra-synthesis-v3", version: 15, week: 4, day: "fri",
    // A phone that has now run THREE programs: two already archived, v3 live.
    archived: [
      { program: "press-priority-v1.3", logs: { 3: { fri: { squat: [{ w: "225", r: "3" }] } } }, notes: { "3-fri": "ancient squat note" } },
      { program: "astra-concurrent-v2", logs: { 2: { fri: { squat: [{ w: "215", r: "4" }] } } }, notes: { "2-fri": "v2 squat note" } },
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
  if (stored.program !== "astra-synthesis-v4") fail.push("migration-no-program-stamp");
  if (stored.settings.theme !== "chalk" || stored.settings.tone !== "sonar") fail.push("migration-prefs-lost");
  if (stored.settings.planName === "A renamed plan") fail.push("migration-old-planname-kept");
  // The colliding old logs must NOT appear as this block's data.
  const live = JSON.stringify(stored.logs || {});
  if (live.includes("205") || live.includes("115")) fail.push("migration-old-logs-bled-through");
  if (stored.tested && stored.tested.broadBase === "88") fail.push("migration-old-baseline-bled-through");
  // ...but they must still exist, archived — AND the older archive must have survived.
  const arch = JSON.stringify(stored.archived || []);
  if (!Array.isArray(stored.archived)) fail.push("migration-archive-not-a-list");
  if (!arch.includes("205") || !arch.includes("v3 squat note")) fail.push("migration-v3-archive-incomplete");
  if (!arch.includes("215") || !arch.includes("v2 squat note")) fail.push("migration-clobbered-v2-archive");
  if (!arch.includes("225") || !arch.includes("ancient squat note")) fail.push("migration-clobbered-oldest-archive");
  if ((stored.archived || []).length !== 3) fail.push("migration-archive-depth=" + (stored.archived || []).length);

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
