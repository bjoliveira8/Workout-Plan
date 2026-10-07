/* Practice weeks for the Saturday routine (spec §10.4).
     node tools/make-practice.mjs <outDir>          (run `npm run build` first)
   Builds four synthetic week-2 situations, runs each through the BUILT app in jsdom — so every
   report and bundle is exactly what the phone would upload — and writes
   <outDir>/<name>/{report.json, bundle.json, TODAY}. Synthetic data only, never Brian's real logs.
   The expected answers live in Workout-Data/practice/grade.mjs, not here. */
import { JSDOM } from "jsdom";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SESSIONS, IMPACT } from "../src/program.js";
import { rirTarget } from "../src/review.js";

const out = process.argv[2];
if (!out) { console.error("usage: node tools/make-practice.mjs <outDir>"); process.exit(2); }
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const W = 2;              // the reviewed week; each practice review proposes week 3
const TODAY = "2026-10-10"; // Saturday of week 2

// The reserve to log for a clean set: the prescription's own RIR number, never below the floor of 2.
const reserveOf = (txt) => {
  const m = String(txt || "").match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*\d+(?:\.\d+)?)?\s*\+?\s*RIR/);
  const n = m ? parseFloat(m[1]) : rirTarget(txt);
  return n == null ? "" : String(Math.max(n, 2));
};

// A clean, fully logged week 2: every set at its planned load and reps, inside its reserve, every
// session finished, impact and running as prescribed, every adductor check normal.
const cleanWeek = () => {
  const s = { logs: { [W]: {} }, barSpeed: {}, powerQual: {}, addCheck: {}, sessDone: {}, elastic: {}, elasticQ: {}, sprintLog: {} };
  for (const d of ["sun", "mon", "wed", "fri"]) {
    s.logs[W][d] = {};
    for (const it of SESSIONS[W][d].items) {
      if (it.clock !== "strength") continue;
      const w = typeof it.load === "number" ? String(it.load) : "40";
      s.logs[W][d][it.id] = Array.from({ length: it.sets }, () => ({ w, r: String(it.repsNum ?? 8), rir: reserveOf(it.rir) }));
      if (typeof it.load === "number" && !it.power) s.barSpeed[`${W}-${d}-${it.id}`] = "on-target";
      if (it.power) s.powerQual[`${W}-${d}-${it.id}`] = "crisp";
    }
    s.sessDone[`${W}-${d}`] = true;
    const px = IMPACT[W][d];
    if (px) {
      for (const t of ["low", "moderate", "high"]) if (px[t] > 0) s.elastic[`${W}-${d}-${t}`] = String(px[t]);
      s.elasticQ[`${W}-${d}`] = "clean";
      s.addCheck[`${W}-${d}`] = { post: "normal", next: "normal" };
    }
  }
  if (IMPACT[W].fri?.run) s.sprintLog[W] = { reps: String(IMPACT[W].fri.run.reps) };
  return s;
};

const SCENARIOS = {
  // Everything inside its reserve: expect fatigue 0 and no changes (the plan already carries the increments).
  normal: (s) => s,
  // Wednesday's OHP top double came in 1 RIR harder than its 2–3 target.
  "ohp-hard": (s) => { s.logs[W].wed.ohptop[0].rir = "1"; return s; },
  // Abnormal next-morning adductor check after Friday, with an altered stride.
  adductor: (s) => { s.addCheck[`${W}-fri`] = { post: "normal", next: "abnormal", detail: "Left adductor tight going down stairs; stride felt short for the first 10 minutes." }; return s; },
  // No report reached the repo (the bundle still exists).
  "no-data": (s) => s,
};

for (const [name, mutate] of Object.entries(SCENARIOS)) {
  const seed = { program: "astra-synthesis-v5", version: 17, week: W, day: "fri", settings: {}, reviews: {}, ...mutate(cleanWeek()) };
  let clip = null;
  const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously",
    beforeParse(w) { w.localStorage.setItem("pp-tracker-v3", JSON.stringify(seed)); } });
  await new Promise((r) => setTimeout(r, 1500));
  Object.defineProperty(dom.window.navigator, "clipboard", { value: { writeText: async (t) => { clip = t; } }, configurable: true });
  const tool = (txt) => [...dom.window.document.querySelectorAll(".tool")].find((b) => b.textContent.includes(txt));
  tool("AI Analysis").click(); await new Promise((r) => setTimeout(r, 200)); const report = clip;
  tool("Backup").click(); await new Promise((r) => setTimeout(r, 200)); const bundle = clip;
  dom.window.close();
  const dir = join(out, name);
  mkdirSync(dir, { recursive: true });
  if (name !== "no-data") writeFileSync(join(dir, "report.json"), report + "\n");
  writeFileSync(join(dir, "bundle.json"), JSON.stringify(JSON.parse(bundle), null, 2) + "\n");
  writeFileSync(join(dir, "TODAY"), TODAY + "\n");
  console.log(`practice/${name} written`);
}
process.exit(0);
