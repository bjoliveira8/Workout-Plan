/* Builds docs/12-week-concurrent-block-v3.md from the vendored source narrative.
 *
 *   node tools/gen-block-doc.mjs
 *
 * The source document is used as written — its tables and its 21 sections are the author's
 * and are not rewritten here. This script only:
 *   1. prepends a §0 recording provenance, status and what this repo verified independently,
 *   2. rewrites the absolute links in §21 to point at the vendored copies in docs/source/,
 *   3. cross-checks the source's own verification table against the prescription JSON the
 *      app actually runs on, and REFUSES to write the document if they disagree.
 *
 * Step 3 matters: the document and the tracker must never drift apart. If this script
 * fails, do not hand-edit around it — find out which of the two is wrong.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const rawJson = readFileSync(ROOT + "docs/source/SYNTHESIZED_PRESCRIPTIONS.json", "utf8");
const src = JSON.parse(rawJson);
const jsonHash = createHash("sha256").update(rawJson).digest("hex");
let doc = readFileSync(ROOT + "docs/source/SYNTHESIZED_TRAINING_BLOCK.md", "utf8");
const verif = readFileSync(ROOT + "docs/source/SYNTHESIS_VERIFICATION.md", "utf8");

/* ── cross-check: the source's verification table vs the prescriptions the app runs ── */
const problems = [];
// Volume rows look like:  | 1 | 18 | 9 | 6 | 1.200 | 2 | 3/3 | 2/2/2 |
const volRows = [...verif.matchAll(/^\|\s*(\d{1,2})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*(\d+)\s*\|\s*(\d)\/(\d)\s*\|/gm)];
if (volRows.length !== 12) problems.push(`verification volume table: found ${volRows.length} rows, expected 12`);
for (const m of volRows) {
  const w = +m[1];
  const a = src.weekly_audit.find((x) => x.week === w);
  if (!a) { problems.push(`no audit for week ${w}`); continue; }
  if (+m[2] !== a.press) problems.push(`w${w} press: doc ${m[2]} vs data ${a.press}`);
  if (+m[3] !== a.vertical) problems.push(`w${w} vertical: doc ${m[3]} vs data ${a.vertical}`);
  if (+m[4] !== a.horizontal) problems.push(`w${w} row: doc ${m[4]} vs data ${a.horizontal}`);
  if (Math.abs(+m[5] - a.ratio) > 0.0005) problems.push(`w${w} ratio: doc ${m[5]} vs data ${a.ratio}`);
  if (+m[6] !== a.lower) problems.push(`w${w} lower: doc ${m[6]} vs data ${a.lower}`);
  if (+m[7] !== a.shoulder || +m[8] !== a.abs) problems.push(`w${w} shoulder/abs`);
}
// Minute rows look like:  | 1 | 7+5+... = **65** | ... one bolded total per day
const minRows = [...verif.matchAll(/^\|\s*(\d{1,2})\s*\|((?:[^|]*\*\*\d+\*\*[^|]*\|){4})/gm)];
if (minRows.length !== 12) problems.push(`verification time table: found ${minRows.length} rows, expected 12`);
const DAYS = ["Sunday", "Monday", "Wednesday", "Friday"];
for (const m of minRows) {
  const w = +m[1];
  const totals = [...m[2].matchAll(/\*\*(\d+)\*\*/g)].map((x) => +x[1]);
  DAYS.forEach((d, i) => {
    const s = src.sessions.find((x) => x.week === w && x.day === d);
    if (s && totals[i] !== s.total_minutes) problems.push(`w${w} ${d} minutes: doc ${totals[i]} vs data ${s.total_minutes}`);
  });
  // ...and the printed sums must actually add up.
  const sums = [...m[2].matchAll(/([\d+]+)\s*=\s*\*\*(\d+)\*\*/g)];
  for (const [, expr, total] of sums) {
    const got = expr.split("+").reduce((a, b) => a + +b, 0);
    if (got !== +total) problems.push(`w${w} printed sum ${expr} = ${total}, actually ${got}`);
  }
}
if (problems.length) {
  console.error("✗ the source document and the prescription data DISAGREE:");
  for (const p of problems) console.error("   " + p);
  process.exit(1);
}
console.log(`✓ cross-check: the source's own verification agrees with all ${src.sessions.length} sessions`);

/* ── rewrite the §21 links to the vendored copies ── */
const CODEX = "/Users/brianoliveira/.codex/.chatgpt-projects/g-p-6aafee30a4d88191a0d93eaa59940002/";
doc = doc.replace(/\]\(\/Users\/[^)]*\/([A-Z_]+\.md)\)/g, "](source/$1)")
         .replace(/\]\(SYNTHESIS_([A-Z_]+)\.md\)/g, "](source/SYNTHESIS_$1.md)");
doc = doc.replace(/\]\(SYNTHESIZED_([A-Z_]+)\.md\)/g, "](source/SYNTHESIZED_$1.md)")
         .replace(/`synthesized_session_cards\/`/g, "`docs/source/session_cards/`");
if (doc.includes(CODEX)) { console.error("✗ an absolute path to the planning folder survived"); process.exit(1); }

/* ── prepend §0 ── */
const header = `# Astra Synthesized Concurrent Block — v3.0-syn1

## 0. Status and provenance — read this first

This is the source of truth for the tracker in this repo.

**Where it came from.** A planning session compared two earlier 12-week plans — the Astra
Concurrent Block this repo ran until September 2026, and a second plan — and synthesized
this third one. Everything below section 0 is that session's document, unedited apart from
link paths.

**What is and is not settled.** Brian approved the ten conflict resolutions C01–C10. He has
**not** approved the training plan itself, and its own author does not claim he did: the
session's handoff records that the finished draft "has not been labeled approved". It is
loaded into the tracker because Brian chose to train it, not because it passed a review.

**What the author verified.** All 13 required checks are documented in
[SYNTHESIS_VERIFICATION.md](source/SYNTHESIS_VERIFICATION.md), with the arithmetic printed
in full. Nine pass outright, four pass with an explicitly approved exception, and two carry
an honest **unverified** half — measured time feasibility (check 1) and actual readiness for
impact (check 7), neither of which can be settled on paper. The seven-column comparison
against both source plans is in [SYNTHESIS_COMPARISON_AUDIT.md](source/SYNTHESIS_COMPARISON_AUDIT.md),
the evidence ledger in [SYNTHESIS_EVIDENCE_LEDGER.md](source/SYNTHESIS_EVIDENCE_LEDGER.md).

**What this repo verified independently**, so that the document and the app can never drift:

- All 402 prescribed rows across 48 sessions parse into \`src/program.js\`, and the weekly
  volume audit re-derives from them exactly — press, vertical, row, ratio and every day count.
- The tracker recomputes that audit at runtime; \`test.mjs\` asserts it matches for all
  twelve weeks. \`tools/gen-block-doc.mjs\` additionally re-reads the verification tables
  *in this document* and refuses to publish it if they disagree with the data — including
  re-adding every printed minute sum.
- The block's rails are enforced mechanically, not by reading: week-12 target loads as caps
  at equal or higher reps; twelve fixed-Monday deadlift exposures, ten heavy and two light,
  no max; six high-tier contacts a week, none before week 5; no running in weeks 1 or 12;
  hill through week 8 and flat only from week 9; the 60 m / 120 m per-session ceilings;
  Copenhagen 3×6 per side twice weekly at short lever; the 75-minute cap on all 48 sessions;
  and the six excluded exercises absent from the app and its data. Every one of those guards
  was mutation-tested — the program was deliberately broken twelve ways and each break was
  caught.

That is arithmetic and rule compliance. It is **not** an assessment of whether the training
decisions are correct, and no outcome is predicted by any of it.

**Source data:** \`docs/source/SYNTHESIZED_PRESCRIPTIONS.json\`, version ${src.version},
${src.sessions.length} sessions, ${src.sessions.reduce((a, s) => a + s.items.length, 0)} prescribed rows,
sha256 \`${jsonHash}\`. Generated into \`src/program.js\` by \`tools/gen-program.mjs\`;
this document assembled by \`tools/gen-block-doc.mjs\` on 21 September 2026.

---

`;
doc = header + doc.replace(/^# .*\n/, "");

writeFileSync(ROOT + "docs/12-week-concurrent-block-v3.md", doc);
console.log(`✓ docs/12-week-concurrent-block-v3.md written (${Math.round(doc.length / 1024)} KB)`);
if (/<!--[A-Z_]+-->/.test(doc)) { console.error("✗ an unfilled placeholder survived"); process.exit(1); }

/* ── every relative link must resolve ── */
const { existsSync } = await import("node:fs");
const broken = [...doc.matchAll(/\]\((?!https?:)([^)#]+)\)/g)]
  .map((m) => m[1]).filter((rel) => !existsSync(ROOT + "docs/" + rel));
if (broken.length) { console.error("✗ broken relative links: " + [...new Set(broken)].join(", ")); process.exit(1); }
console.log(`✓ all relative links resolve`);
