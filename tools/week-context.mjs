/* Week context for the Saturday routine (spec §6.3).
     node tools/week-context.mjs <forWeek> [report.json]
   Prints every exercise in <forWeek> that a weekly change may touch, with its planned values and
   the ONLY values each field may take — so the routine copies `from` values from here and never
   has to read the 400 KB program.js. The report (version 18) supplies the last performed loads.
   Zero dependencies: plain Node, run straight from a download. */
import { readFileSync } from "node:fs";
import { SESSIONS, META } from "../src/program.js";
import { DAY_IDS, REDUCED_WEEKS, allowedFor, lastPerformedFromReport } from "../src/review.js";

const [, , weekArg, reportFile] = process.argv;
const forWeek = Number(weekArg);
if (!Number.isInteger(forWeek) || forWeek < 1 || forWeek > META.weeks + 1) {
  console.error("usage: node tools/week-context.mjs <forWeek 1–13> [report.json]");
  process.exit(2);
}
if (forWeek > META.weeks) {
  console.log(`Week ${forWeek} is the optional week-13 slot: write a summary-only proposal with no changes.`);
  process.exit(0);
}
let report = null;
if (reportFile) {
  try { report = JSON.parse(readFileSync(reportFile, "utf8")); }
  catch (e) { console.error(`cannot read ${reportFile}: ${e.message}`); process.exit(2); }
}

const sec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const span = (r) => (r.max > r.min ? `${r.min}–${r.max}` : `${r.min}`);
console.log(`WEEK ${forWeek} — ${REDUCED_WEEKS.has(forWeek) ? "reduced week: volume floors waived, reserve floor 4" : "normal week: reserve floor 2"}`);
console.log(`Use only the values after "→". "fixed" = that field cannot change. Dips and pull-ups are ADDED load.`);
for (const d of DAY_IDS) {
  console.log(`\n${d.toUpperCase()}`);
  for (const it of SESSIONS[forWeek][d].items) {
    if (it.clock !== "strength") continue;
    if (it.test) { console.log(`  ${it.id} — ${it.name}: TARGET TEST, never changes`); continue; }
    const lp = report ? lastPerformedFromReport(report, d, it.id, forWeek) : null;
    const a = allowedFor(it, forWeek, lp);
    const parts = [];
    if (typeof it.load === "number") parts.push(`load ${it.load}${a.load ? ` → ${a.load.values.join(" / ")}` : " fixed"}${lp != null ? ` (last performed ${lp})` : ""}`);
    parts.push(`sets ${it.sets}${a.sets ? ` → ${span(a.sets)}` : " fixed"}`);
    if (a.remove) parts.push(`remove allowed ("from": false, "to": true)`);
    parts.push(`reps ${JSON.stringify(it.reps)}${a.reps ? ` → ${span(a.reps)}` : " fixed"}`);
    parts.push(`rir ${JSON.stringify(it.rir)}${a.rir ? ` → easier only, first number ≥ ${a.rir.minTarget}` : " fixed"}`);
    if (typeof it.rest === "number") parts.push(`rest ${it.rest}s (${sec(it.rest)})${a.rest ? ` → ${a.rest.min}–${a.rest.max}s` : " fixed"}`);
    console.log(`  ${it.id} — ${it.name}: ${parts.join(" · ")}`);
  }
}
