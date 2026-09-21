/* One-shot generator: source plan JSON  →  src/program.js
 *
 *   node tools/gen-program.mjs
 *
 * This is NOT part of `npm run build`. It runs once when a new synthesized block
 * arrives from the planning session. The file it emits, src/program.js, is committed
 * and is thereafter hand-edited by the weekly autoregulation review — it plays the
 * role the old WAVE table played. Re-running this generator DISCARDS those edits,
 * so only re-run it for a genuinely new block.
 *
 * Inputs (vendored, read-only):
 *   docs/source/SYNTHESIZED_PRESCRIPTIONS.json   402 prescribed rows across 48 sessions
 *   docs/source/session_cards/week_NN.md         the per-session impact scripts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = ROOT + "docs/source/SYNTHESIZED_PRESCRIPTIONS.json";
const raw = readFileSync(SRC, "utf8");
const src = JSON.parse(raw);
const srcHash = createHash("sha256").update(raw).digest("hex");

const DAY_ID = { Sunday: "sun", Monday: "mon", Wednesday: "wed", Friday: "fri" };

/* ---------------------------------------------------------------- exercise ids
   Stable slug per exercise so logs, rest keys and the "LAST WK" reference line up
   week to week. Variants that occupy the SAME slot share an id on purpose:
   the week-1 OHP calibration sits in the top-set position (source §8), and the
   week-12 target tests replace that day's ordinary exposure of the same lift. */
const ID = {
  "Weighted dip heavy double": "dipheavy",
  "Weighted dip back-offs": "dipback",
  "Weighted dip": "dip",
  "Weighted dip target test": "dip",
  "Paused bench press": "bench",
  "Chest-supported machine row": "row",
  "Cable external rotation": "extrot",
  "Dumbbell curl": "curl",
  "Dumbbell lateral raise": "lat",
  "Ab wheel": "abwheel",
  "Farmer carry": "farmer",
  "Neutral-grip pull-up": "pullup",
  "Neutral-grip pull-up target test": "pullup",
  "Conventional deadlift": "dl",
  "Strict OHP": "ohp",
  "Strict OHP calibration": "ohptop",
  "Strict OHP top double": "ohptop",
  "Strict OHP back-offs": "ohpback",
  "Strict OHP target test": "ohp",
  "Knee-supported short-lever Copenhagen": "copen",
  "Rope press-down": "pressdown",
  "Pallof press": "pallof",
  "Face pull": "facepull",
  "Cable chop": "chop",
  "Hanging knee raise": "hkr",
  "Suitcase carry": "suitcase",
  "Low-bar squat": "squat",
  "Wall slide": "wallslide",
};

/* Display tag under the exercise name, by movement family. */
const TAG = {
  press: "press", vertical: "vertical pull", horizontal: "row", lower: "lower",
  adductor: "prophylactic", shoulder: "shoulder health", abs: "core",
  rotation: "anti-rotation", carry: "carry", isolation: "arm / delt",
};

/* The app's three cut chips. */
const CUT = { "never-cut": "never", "cut-second": "second", "cut-first": "first" };

/* An item's work block maps to the ramp block that precedes it. */
const RAMP_OF = {
  "Dip work": "Dip ramps", "Dip test": "Dip ramps",
  "Bench work": "Bench ramps",
  "Deadlift work": "Deadlift ramps",
  "OHP work": "OHP ramps", "OHP test": "OHP ramps",
  "Moderate OHP work": "Moderate OHP ramps",
  "Pull-up work": "Pull-up ramps", "Pull-up test": "Pull-up ramps",
  "Squat work": "Squat ramps",
};

/* "45×5, 95×3, 135×2, 185×1, 205×1; rest 45 / 60 …"  →  [{w:45,r:5}, …]
   "BW×3, +20×2, +35×1, +45×1 readiness. Rest …"      →  [{w:"BW",r:3}, …] */
function parseRamp(detail) {
  const head = detail.split(/[;.]/)[0];
  const out = [];
  for (const m of head.matchAll(/(BW|\+?\d+(?:\.\d+)?)\s*×\s*(\d+)/g)) {
    out.push({ w: m[1] === "BW" ? "BW" : m[1], r: Number(m[2]) });
  }
  return out.length ? out : null;
}

/* The impact block lives on its own 15-minute clock, so it is not in `blocks`.
   Pull the per-session script out of the week cards. */
function impactScripts() {
  const byWeek = {};
  for (let w = 1; w <= 12; w++) {
    const file = `${ROOT}docs/source/session_cards/week_${String(w).padStart(2, "0")}.md`;
    const text = readFileSync(file, "utf8");
    const scripts = {};
    let day = null;
    for (const line of text.split("\n")) {
      const h = line.match(/^###\s+Week\s+\d+\s+—\s+(Sunday|Monday|Wednesday|Friday)/);
      if (h) { day = DAY_ID[h[1]]; continue; }
      if (day && line.startsWith("**Before strength:**")) {
        const body = line.replace("**Before strength:**", "").trim();
        if (!/^No impact block/.test(body)) scripts[day] = body;
        day = null;
      }
    }
    byWeek[w] = scripts;
  }
  return byWeek;
}

/* ------------------------------------------------------------------- sessions */
const SCRIPTS = impactScripts();
const SESSIONS = {};
let rowCount = 0;

for (const ses of src.sessions) {
  const day = DAY_ID[ses.day];
  const blocks = ses.blocks.map(b => ({ name: b.name, minutes: b.minutes, detail: b.detail }));
  const blockByName = Object.fromEntries(blocks.map(b => [b.name, b]));
  const rampUsed = new Set();
  const items = [];

  for (const it of ses.items) {
    const id = ID[it.exercise];
    if (!id) throw new Error(`No id mapped for "${it.exercise}"`);
    rowCount++;

    const numeric = typeof it.load === "number";
    const rampName = RAMP_OF[it.block];
    let ramp = null, rampNote = null;
    if (rampName && blockByName[rampName] && !rampUsed.has(rampName)) {
      rampUsed.add(rampName);
      ramp = parseRamp(blockByName[rampName].detail);
      rampNote = blockByName[rampName].detail;
    }

    items.push({
      id,
      name: it.exercise,
      tag: TAG[it.family] || it.family,
      family: it.family,
      cut: CUT[it.cut],
      sets: it.sets,
      reps: it.reps,
      load: numeric ? it.load : null,
      loadText: numeric ? null : it.load,
      rir: it.rir,
      rest: it.rest_seconds,
      purpose: it.purpose,
      perSide: it.per_side,
      system: it.system_load,          // bodyweight + external (dip / pull-up)
      bar: numeric && !it.system_load, // plate math applies
      block: it.block,
      ramp,
      rampNote,
    });
  }

  const ids = items.map(i => i.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate id in W${ses.week} ${ses.day}: ${ids}`);

  (SESSIONS[ses.week] ||= {})[day] = {
    objective: ses.objective,
    minutes: ses.total_minutes,
    blocks,
    impact: SCRIPTS[ses.week][day] || null,
    items,
  };
}

/* --------------------------------------------------------------------- impact */
const IMPACT = {};
for (const i of src.impact) {
  IMPACT[i.week] = {
    low: i.low, moderate: i.moderate, high: i.high,
    wed: { low: i.wed[0], moderate: i.wed[1], high: i.wed[2], minutes: i.wed_minutes },
    fri: { low: i.fri[0], moderate: i.fri[1], high: i.fri[2], minutes: i.fri_minutes },
    run: i.run_reps ? {
      reps: i.run_reps, distance: i.run_distance, runout: i.runout_per_rep,
      effort: i.effort, terrain: i.terrain,
      accelM: i.acceleration_m, runoutM: i.runout_m, totalM: i.total_running_m,
    } : null,
  };
}

/* ---------------------------------------------------------------------- audit */
const AUDIT = Object.fromEntries(src.weekly_audit.map(a => [a.week, a]));

/* --------------------------------------------------------------- string table
   The plan repeats its block details, purposes, ramp notes and impact scripts
   across 48 sessions — 147 KB of text, only 124 distinct strings. Intern them
   and rehydrate at module load; saves roughly 110 KB in the shipped bundle. */
const TABLE = [];
const POOL = new Map();
const S = (str) => {
  if (str == null) return null;
  if (!POOL.has(str)) { POOL.set(str, TABLE.length); TABLE.push(str); }
  return POOL.get(str);
};
const INTERN_SESSION = ["objective", "impact"];
const INTERN_BLOCK = ["name", "detail"];
const INTERN_ITEM = ["name", "tag", "family", "cut", "rir", "purpose", "block", "rampNote", "loadText"];

for (const week of Object.values(SESSIONS)) {
  for (const ses of Object.values(week)) {
    for (const f of INTERN_SESSION) ses[f] = S(ses[f]);
    for (const b of ses.blocks) for (const f of INTERN_BLOCK) b[f] = S(b[f]);
    for (const it of ses.items) for (const f of INTERN_ITEM) it[f] = S(it[f]);
  }
}
for (const im of Object.values(IMPACT)) if (im.run) im.run.terrain = S(im.run.terrain);

/* ----------------------------------------------------------------------- emit */
const j = (v) => JSON.stringify(v);
const out = `/* GENERATED by tools/gen-program.mjs — do not re-run casually.
 *
 * Source: docs/source/SYNTHESIZED_PRESCRIPTIONS.json
 *   version ${src.version}
 *   sha256  ${srcHash}
 *   ${src.sessions.length} sessions · ${rowCount} prescribed rows
 *
 * THE SOURCE IS A REVIEW DRAFT. Its own narrative document is headed "not yet
 * approved", four of its tables are unfilled placeholders, and the two verification
 * files it cites were never written. The numbers below are internally consistent —
 * every weekly-audit figure re-derives exactly from the 402 rows — but the reasoning
 * behind them has not been audited. See docs/12-week-concurrent-block-v3.md §0.
 *
 * This file is the single edit point for every prescription, the way WAVE was in the
 * previous block. The weekly review edits it directly; test.mjs guards the block's
 * invariants so an edit can never silently breach a cap, floor or ceiling.
 */

export const SOURCE = ${j({ version: src.version, status: src.status, sha256: srcHash, sessions: src.sessions.length, rows: rowCount })};

export const META = {
  programId: "astra-synthesis-v3",
  blockVersion: "v3.0-syn1",
  planName: "Astra Synthesized Concurrent Block",
  bw: ${src.bodyweight_example_lb},
  weeks: 12,
  deloadWeeks: [6, 12],
  testWeek: 12,
  testDay: "fri",
  /* §1 — the four success targets. The three lifting targets require the prescribed
     reps at >= 2 RIR, aiming for 2 (approved resolution C08). Easier qualifies. */
  targets: {
    ohp: "125 × 2", dip: "+50 × 6", pullup: "+45 × 5",
    broad: "week-1 baseline + 4 in (desired, not predicted)",
  },
  /* §19 — work-set floors. Weeks 6 and 12 waive press / vertical / horizontal
     per approved resolution C09; the structural floors still hold. */
  floors: { press: 18, vertical: 9, horizontal: 6, lower: 2, shoulder: 3, abs: 3, ratioMax: 1.3 },
  /* §13 — per-session running ceilings. */
  runCeiling: { accelM: 60, totalM: 120 },
  /* §12 — high-tier contacts per week outside the two test weeks. */
  highContactCap: 6,
};

export const DAY_IDS = ["sun", "mon", "wed", "fri"];

/* Interned strings — see the note in tools/gen-program.mjs. Rehydrated below, so
   everything downstream sees ordinary strings. */
const S = ${j(TABLE)};

export const SESSIONS = ${j(SESSIONS)};

export const IMPACT = ${j(IMPACT)};

for (const week of Object.values(SESSIONS)) {
  for (const ses of Object.values(week)) {
    ses.objective = S[ses.objective];
    ses.impact = ses.impact == null ? null : S[ses.impact];
    for (const b of ses.blocks) { b.name = S[b.name]; b.detail = S[b.detail]; }
    for (const it of ses.items) {
      for (const f of ["name", "tag", "family", "cut", "rir", "purpose", "block"]) it[f] = S[it[f]];
      it.rampNote = it.rampNote == null ? null : S[it.rampNote];
      it.loadText = it.loadText == null ? null : S[it.loadText];
    }
  }
}
for (const im of Object.values(IMPACT)) if (im.run) im.run.terrain = S[im.run.terrain];

/* The source's own weekly volume audit, kept so test.mjs can prove the app's live
   computation still agrees with the plan it was generated from. */
export const AUDIT = ${j(AUDIT)};
`;

writeFileSync(ROOT + "src/program.js", out);
console.log(`✓ src/program.js written — ${src.sessions.length} sessions, ${rowCount} rows, source sha256 ${srcHash.slice(0, 12)}…`);
