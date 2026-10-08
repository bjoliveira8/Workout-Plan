/* Amendment A4 (Brian, 8 Oct 2026) — a one-off edit of src/program.js, kept as the record of what
   changed.   node tools/amend-a4.mjs
   From week 3 on (weeks 1–2 stay exactly as logged):
     - the moderate OHP moves from Monday to SUNDAY, after the dips and before the paused bench
       (it is a goal lift and outranks bench in the conflict hierarchy);
     - Sunday's one-arm chest-supported DB row moves to MONDAY, after the deadlifts.
   Each exercise travels with its own timed blocks, so every session's minutes are recomputed from
   its blocks, and the "every priority rest at 3:00" figure moves with the OHP's own rests. Weekly
   totals, floors and AUDIT do not change (nothing is added or removed). The Sunday/Monday summary,
   cut order and checks are rewritten for the new layout as plain (non-interned) text, so the
   interned originals still serve weeks 1–2. Refuses to run twice. */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/program.js", import.meta.url);
const FROM_WEEK = 3, LAST_WEEK = 12;
const src = readFileSync(FILE, "utf8");

// The interned string table (line `const S = [...]`) and the raw session table (`const SESSIONS_RAW = {...};`).
const sLine = src.match(/^const S = (\[.*\]);$/m);
const rawLine = src.match(/^const SESSIONS_RAW = (\{.*\});$/m);
if (!sLine || !rawLine) throw new Error("program.js layout not recognised — S or SESSIONS_RAW line missing");
const S = JSON.parse(sLine[1]);
const RAW = JSON.parse(rawLine[1]);
const text = (v) => (typeof v === "number" ? S[v] : v);   // read a possibly-interned field

// Exact phrase swaps for the rewritten summaries and cut orders. Each must match where expected.
const SWAPS = {
  sun: {
    objective: [
      ["Fresh dip priority, paused bench, one-arm chest-supported rows;", "Fresh dip priority, moderate OHP, paused bench;"],
      ["easy dips and bench (≥4 RIR), rows, biceps", "easy dips, OHP technique and bench (≥4 RIR), biceps"],
    ],
    cuts: [["Never cut: dip work, row sets,", "Never cut: dip work, OHP work sets,"]],
  },
  mon: {
    objective: [
      ["conventional deadlift maintenance, moderate OHP;", "conventional deadlift maintenance, one-arm chest-supported rows;"],
      ["light deadlift (C02), OHP technique, easy accessories", "light deadlift (C02), rows, easy accessories"],
    ],
    cuts: [["Never cut: pull-up, deadlift and OHP work sets,", "Never cut: pull-up and deadlift work sets, row sets,"]],
  },
};
const SEQ_ADD = {
  sun: " Moderate OHP follows the dips (amendment A4): practice at 3+ RIR, not a test — if the dips left the elbows or shoulders tired, keep the load and stop short rather than grind; the paused bench comes after it.",
  mon: " Rows follow the deadlifts with the chest supported (amendment A4) — if grip or lower back is tired, use the machine-row fallback at the same dose.",
};
const ROW_PURPOSE = "Horizontal pull with the chest supported, sparing the lower back after deadlifts";

// Apply the phrase swaps to one field; report any field where an expected phrase was missing.
const misses = [];
const swapField = (w, d, ses, field) => {
  let t = text(ses[field]);
  const before = t;
  for (const [from, to] of SWAPS[d][field] || []) if (t.includes(from)) t = t.replace(from, to);
  if (t === before && (SWAPS[d][field] || []).length && !/^Deload week:/.test(t)) misses.push(`w${w} ${d}.${field}`);
  if (t !== before) ses[field] = t;
};

const blockIdx = (ses, name) => ses.blocks.findIndex((b) => text(b.name) === name);

for (let w = FROM_WEEK; w <= LAST_WEEK; w++) {
  const sun = RAW[w].sun, mon = RAW[w].mon;
  if (sun.items.some((i) => i.id === "ohp")) throw new Error(`week ${w}: A4 already applied (Sunday has the OHP) — not running twice`);
  const ohp = mon.items.find((i) => i.id === "ohp"), row = sun.items.find((i) => i.id === "row");
  if (!ohp || !row) throw new Error(`week ${w}: expected Monday ohp and Sunday row`);

  // Move the timed blocks: OHP ramps + work go in after Sunday's dip work; Row goes in after Monday's deadlift work.
  const ohpBlocks = mon.blocks.filter((b) => /^Moderate OHP (ramps|work)$/.test(text(b.name)));
  const rowBlock = sun.blocks.find((b) => text(b.name) === "Row");
  if (ohpBlocks.length !== 2 || !rowBlock) throw new Error(`week ${w}: OHP or Row blocks not found`);
  sun.blocks = sun.blocks.filter((b) => b !== rowBlock);
  sun.blocks.splice(blockIdx(sun, "Dip work (fresh priority)") + 1, 0, ...ohpBlocks);
  mon.blocks = mon.blocks.filter((b) => !ohpBlocks.includes(b));
  mon.blocks.splice(blockIdx(mon, "Deadlift work") + 1, 0, rowBlock);

  // Move the exercises: OHP right after the last dip item (before bench); row right after the last deadlift item.
  sun.items = sun.items.filter((i) => i !== row);
  const lastDip = Math.max(...sun.items.map((i, k) => (["dipheavy", "dipback", "dip"].includes(i.id) ? k : -1)));
  sun.items.splice(lastDip + 1, 0, ohp);
  mon.items = mon.items.filter((i) => i !== ohp);
  const lastDl = Math.max(...mon.items.map((i, k) => (["dl", "dlback"].includes(i.id) ? k : -1)));
  mon.items.splice(lastDl + 1, 0, { ...row, purpose: ROW_PURPOSE });
  if (lastDip < 0 || lastDl < 0) throw new Error(`week ${w}: dip or deadlift anchor not found`);

  // Time: minutes come from the blocks; the max-rest figure moves with the OHP's own rests
  // (each rest between its work sets counted at 3:00).
  const ohpMaxExtra = (ohp.sets - 1) * (180 - ohp.rest);
  for (const [ses, extra] of [[sun, ohpMaxExtra], [mon, -ohpMaxExtra]]) {
    const seconds = ses.blocks.reduce((a, b) => a + b.seconds, 0);
    ses.secondsIfMaxRests += seconds - ses.seconds + extra;
    ses.seconds = seconds;
    ses.minutes = Math.round((seconds / 60) * 10) / 10;
  }

  // Words: summaries, cut orders and checks for the new layout.
  for (const d of ["sun", "mon"]) {
    const ses = RAW[w][d];
    swapField(w, d, ses, "objective");
    swapField(w, d, ses, "cuts");
    ses.sequencing = text(ses.sequencing) + SEQ_ADD[d];
  }
  console.log(`week ${w}: Sun ${sun.minutes} min (≤${(sun.secondsIfMaxRests / 60).toFixed(1)} at 3:00 rests), Mon ${mon.minutes} min (≤${(mon.secondsIfMaxRests / 60).toFixed(1)})`);
}
if (misses.length) throw new Error(`expected phrases not found (nothing written): ${misses.join(", ")}`);

writeFileSync(FILE, src.replace(rawLine[0], `const SESSIONS_RAW = ${JSON.stringify(RAW)};`));
console.log("A4 applied to src/program.js (weeks 3–12)");
