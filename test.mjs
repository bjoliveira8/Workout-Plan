// Smoke test for dist/index.html — run `npm run build && npm test` before shipping.
// Simulates a real browser (jsdom + executed scripts) and real typing (native value
// setter + input events, which is required for React controlled inputs).
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const html = readFileSync("dist/index.html", "utf8");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously" });
const { window } = dom;
const doc = window.document;
await new Promise((r) => setTimeout(r, 900));

const fail = [];
const out = () => doc.getElementById("root").innerHTML;

// 1) Core content renders
for (const p of ["Alt Exercise", "FINISH SESSION", "＋ Add Set", "Plyo Push-Up", "Weighted Pull-Up", "WEEK 1"])
  if (!out().includes(p)) fail.push("content:" + p);

// 2) YouTube icon button sits in the header actions next to the checkmark
const acts = doc.querySelector(".ex-actions");
if (!acts || !acts.querySelector(".ytbtn") || !acts.querySelector(".donebtn")) fail.push("yt-placement");

// 3) Border regression guard: interactive buttons must stay 0.5px hairlines.
//    (History: a global `.app button{border:none}` reset once silently killed all
//    button borders; later the user pushed borders down to faint 0.5px hairlines.)
const css = [...doc.querySelectorAll("style")].map((s) => s.textContent).join("");
for (const cls of ["inlbtn", "ghost", "solid", "rxfill", "ytbtn", "donebtn", "finishbtn"]) {
  const m = css.match(new RegExp("\\." + cls + "\\{[^}]*?border:([^;]+)"));
  const b = m ? m[1] : "(none)";
  if (!b.startsWith("0.5px")) fail.push(`border:${cls}=${b}`);
}
// The global reset must NOT force `border:none` — it overrode the 0.5px hairlines with a
// 3px medium border in real browsers (source-text check above was blind to it).
if (/\.app button\{[^}]*border:none/.test(css)) fail.push("reset-forces-border-none");

// 4) Auto-rest fires only when a set becomes complete (wt+reps), not on weight alone
const setNative = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
const fire = (el, v) => { setNative.call(el, v); el.dispatchEvent(new window.Event("input", { bubbles: true })); };
fire(doc.querySelector('input[aria-label="Bench Press set 1 weight"]'), "160");
await new Promise((r) => setTimeout(r, 40));
if (doc.querySelector(".timerbar")) fail.push("timer-fired-on-weight-only");
fire(doc.querySelector('input[aria-label="Bench Press set 1 reps"]'), "5");
await new Promise((r) => setTimeout(r, 40));
if (!doc.querySelector(".timerbar")) fail.push("autorest-did-not-fire");

// 5) CRITICAL: logging another exercise must work while the timer is running.
//    (History: inline component definitions caused remounts on every timer tick,
//    destroying input focus. TimerBar must stay module-level with its own tick,
//    and cards must stay plain render functions.)
const dip = doc.querySelector('input[aria-label="Weighted Dips set 1 weight"]');
fire(dip, "30");
await new Promise((r) => setTimeout(r, 500));
if (doc.querySelector('input[aria-label="Weighted Dips set 1 weight"]').value !== "30") fail.push("logging-during-timer");

// 6) Persistence: debounced save lands in localStorage under the stable key
await new Promise((r) => setTimeout(r, 900));
const saved = window.localStorage.getItem("pp-tracker-v3");
if (!saved || !saved.includes("160")) fail.push("localStorage-persist");

// 7) Alt toggle swaps and reverts
const altBtn = [...doc.querySelectorAll(".inlbtn")].find((b) => b.textContent.trim() === "Alt Exercise");
altBtn.click();
await new Promise((r) => setTimeout(r, 60));
if (![...doc.querySelectorAll(".inlbtn")].some((b) => b.textContent.trim() === "Original")) fail.push("alt-toggle");

// 7.5) Bar-speed tag on a main lift persists (required co-signal for autoregulation)
const bsFast = doc.querySelector('[aria-label="Bench Press bar speed fast"]');
if (!bsFast) fail.push("barspeed-control-missing");
else {
  bsFast.click();
  await new Promise((r) => setTimeout(r, 900));
  const s = window.localStorage.getItem("pp-tracker-v3") || "";
  if (!s.includes('"barSpeed"') || !s.includes("fast")) fail.push("barspeed-persist");
}

// 7.6) Global session clock appears once a set is logged
if (!doc.querySelector(".sessionclock")) fail.push("session-clock-missing");

// 7.7) Structured JSON export (AI Analysis) is valid and versioned
let copied = null;
try { Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async (t) => { copied = t; } }, configurable: true }); } catch (e) {}
const aiBtn = [...doc.querySelectorAll(".tool")].find((b) => b.textContent.includes("AI Analysis"));
if (!aiBtn) fail.push("ai-analysis-missing");
else {
  aiBtn.click();
  await new Promise((r) => setTimeout(r, 80));
  try {
    const j = JSON.parse(copied);
    if (j.version !== 13 || j.kind !== "week-report" || !Array.isArray(j.days)) fail.push("json-shape");
    const bench = j.days.flatMap((d) => d.exercises).find((e) => e.id === "bench");
    if (!bench || !bench.isMain || !("barSpeed" in bench) || !bench.rx) fail.push("json-main-fields");
  } catch (e) { fail.push("json-parse"); }
}

// 7.8) Reorder: nudging the first exercise down (ArrowDown on its drag handle)
//      changes the order and persists it. The drag handle is keyboard-operable so
//      the same moveEx path that pointer-drag commits can be exercised in jsdom.
const firstBefore = doc.querySelector(".session .card .exname")?.textContent;
const handle = doc.querySelector(".session .card[data-exid] .draghandle");
if (!handle) fail.push("reorder-controls-missing");
else {
  handle.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  await new Promise((r) => setTimeout(r, 900));
  const firstAfter = doc.querySelector(".session .card .exname")?.textContent;
  const s = window.localStorage.getItem("pp-tracker-v3") || "";
  if (firstBefore && firstBefore === firstAfter) fail.push("reorder-no-move");
  if (!s.includes('"order"')) fail.push("reorder-persist");
}

// 8) Test week renders
[...doc.querySelectorAll(".wave-col")].at(-1).click();
await new Promise((r) => setTimeout(r, 80));
if (!doc.body.innerHTML.includes("TEST WEEK")) fail.push("test-week");

// 9) WAVE invariants — future autoregulation edits can never breach the program caps.
{
  const src = readFileSync("src/App.jsx", "utf8");
  const m = src.match(/const WAVE = (\{[\s\S]*?\n\});/);
  if (!m) fail.push("wave-parse");
  else {
    const WAVE = eval("(" + m[1] + ")");
    for (let w = 1; w <= 12; w++) {
      if (WAVE.squat[w] && WAVE.squat[w][2] > 225) fail.push("squat-cap:w" + w);
      if (WAVE.bench[w] && WAVE.bench[w][1] === 2 && WAVE.bench[w][2] > 195) fail.push("bench-double-cap:w" + w);
      if (WAVE.ohp[w] && WAVE.ohp[w][1] === 2 && WAVE.ohp[w][2] > 115) fail.push("ohp-double-cap:w" + w);
    }
  }
}

if (fail.length) { console.error("FAIL: " + fail.join(", ")); process.exit(1); }
console.log("✓ all smoke tests passed");
// The app's own intervals (rest TimerBar, SessionClock) keep jsdom's event loop alive,
// so exit explicitly instead of hanging after a successful run.
process.exit(0);
