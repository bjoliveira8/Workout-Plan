/* Regenerates the checker fixtures (spec §10.3): one valid proposal, one failing fixture per rule,
   a malformed file, a wrong week, and a minimal week-2 report. The JSON files are committed; run
   this again only if the fixture set changes:  node tools/fixtures/make-fixtures.mjs */
import { writeFileSync } from "node:fs";

const at = (name) => new URL(`./${name}.json`, import.meta.url);
const write = (name, obj) => writeFileSync(at(name), typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) + "\n");
const ch = (day, id, field, from, to) => ({ day, id, field, from, to, why: "Fixture change.", rule: "fixture", reverseIf: "Fixture reversal." });

// A valid week-3 proposal: hold the OHP top double at last week's 117.5, rest toward 3:00, skip the
// Friday DB incline bench (press 18, ratio 1.125 — still legal).
const valid = {
  schema: 1, program: "astra-synthesis-v5", reviewedWeek: 2, forWeek: 3, createdAt: "2026-10-10T18:07:00Z",
  basedOn: { bundleExported: "2026-10-10T17:55:00.000Z" }, status: "proposed",
  fatigueLevel: 1, fatigueEvidence: "One poor exposure: Wednesday's OHP top double came in at 1 RIR against 2–3.",
  findings: [{ kind: "observation", text: "Wed OHP top double at 117.5: first set 1 RIR against a 2–3 target." },
             { kind: "hypothesis", text: "Short sleep before Wednesday may explain it — one exposure only." }],
  summary: "Hold the OHP top double at 117.5 and rest toward 3:00; everything else as planned.",
  alerts: [{ level: "info", days: ["wed"], text: "Start the OHP ramp a few minutes earlier to fit the longer rests.", rule: "§6" }],
  changes: [ch("wed", "ohptop", "load", 120, 117.5), ch("wed", "ohptop", "rest", 150, 180), ch("fri", "inclinedb", "remove", false, true)],
  holds: [{ day: "fri", id: "squat", why: "Last exposure was 2 RIR; squat increases need 3.", rule: "§2" }],
  notes: [{ day: "fri", id: "calfseat", text: "Every set reached 20 — add the smallest load step.", rule: "§5 calves" }],
  check: { passed: true, failures: [] },
};
write("valid", valid);
const one = (name, change) => write(name, { ...valid, changes: [change] });
one("fail-load-above", ch("wed", "ohptop", "load", 120, 122.5));        // above the plan
one("fail-load-floor", ch("wed", "ohptop", "load", 120, 105));          // under min(plan, last 117.5) − 2 steps
one("fail-dlback-step", ch("mon", "dlback", "load", 405, 402.5));       // deadlift steps by 10
one("fail-sets-protected", ch("sun", "dipback", "sets", 3, 2));         // protected at 3
one("fail-single-set", ch("sun", "bench", "sets", 3, 1));               // two-set rule
one("fail-remove-protected", ch("sun", "bench", "remove", false, true)); // only protectedSets 0 can go
one("fail-rest-down", ch("wed", "ohptop", "rest", 150, 120));           // rest up only
one("fail-rest-squat", ch("fri", "squat", "rest", 180, 170));           // squat rest never changes
one("fail-rir-harder", ch("sun", "dipback", "rir", "2–3", "1–2"));      // reserve easier only
one("fail-impact-card", ch("wed", "impact", "sets", 1, 1));             // impact is never a change
one("fail-triceps-floor", ch("mon", "pushdown", "sets", 3, 2));         // legal cut, but triceps 5 < 6
write("fail-test-item", { ...valid, reviewedWeek: 11, forWeek: 12, changes: [ch("fri", "dip", "load", 50, 47.5)] }); // a target test
write("fail-wrong-forweek", { ...valid, reviewedWeek: 3, forWeek: 4, changes: [] }); // report is week 2 → expects 3
write("fail-malformed", '{ "schema": 1, "program": \n');
// Minimal version-18 report for week 2: what the checker needs (the week and last performed loads).
write("report-w2", { week: 2, days: [
  { day: "mon", exercises: [{ id: "dlback", performedLoad: 405 }] },
  { day: "wed", exercises: [{ id: "ohptop", performedLoad: 117.5 }, { id: "ohpback", performedLoad: 112.5 }] },
], history: {} });
console.log("fixtures written");
