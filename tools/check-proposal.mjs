/* The rails check for a Saturday proposal (spec §6.3).
     node tools/check-proposal.mjs <proposal.json> [report.json]
   Schema → every change against the rules → apply → the week's floors and limits. Prints PASS, or
   FAIL with one line per problem, and exits 0 or 1. The report (version 18) supplies the expected
   week and the last performed loads. Zero dependencies. The phone re-runs the same rules
   (src/review.js) before Approve, so the phone never trusts this file's verdict. */
import { readFileSync } from "node:fs";
import { SESSIONS } from "../src/program.js";
import { validateProposal, lastPerformedFromReport } from "../src/review.js";

const [, , proposalFile, reportFile] = process.argv;
if (!proposalFile) { console.error("usage: node tools/check-proposal.mjs <proposal.json> [report.json]"); process.exit(2); }
const load = (f) => {
  try { return JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { console.log(`FAIL\n  - ${f}: ${e.message}`); process.exit(1); }
};
const proposal = load(proposalFile);
const report = reportFile ? load(reportFile) : null;
const res = validateProposal(proposal, {
  sessions: SESSIONS,
  expectedForWeek: report && Number.isInteger(report.week) ? report.week + 1 : undefined,
  lastPerformedFor: (day, id) => (report ? lastPerformedFromReport(report, day, id, proposal.forWeek) : null),
});
if (res.ok) {
  console.log(`PASS — week ${proposal.forWeek}, ${(proposal.changes || []).length} change(s)`);
  process.exit(0);
}
console.log("FAIL");
for (const line of res.failures) console.log(`  - ${line}`);
process.exit(1);
