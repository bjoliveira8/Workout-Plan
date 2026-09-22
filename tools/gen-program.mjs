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
 *   docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json   397 rows across 48 sessions,
 *                                                   24 impact sessions, week-13 contingency
 *   docs/source/session_cards/week_NN.md            per-session cut rules
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = ROOT + "docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json";
const raw = readFileSync(SRC, "utf8");
const src = JSON.parse(raw);
const srcHash = createHash("sha256").update(raw).digest("hex");

const DAY_ID = { sunday: "sun", monday: "mon", wednesday: "wed", friday: "fri" };

/* ---------------------------------------------------------------- exercise ids
   Stable slug per exercise so logs, rest keys and the "LAST WK" reference line up
   week to week. Variants that occupy the SAME slot share an id on purpose: the
   week-1 OHP calibration sits in the top-double position, and the week-12 target
   tests replace that day's ordinary exposure of the same lift.

   The three Monday pull-up variants (§10) also share `pullup`: weeks 7–11 split the
   old four triples into one longer target-rep set plus three triples, which is the
   same slot with a different rep scheme, not a new exercise. Keeping one id means
   the "LAST WK" column still compares Monday pull-ups with Monday pull-ups. */
const ID = {
  // power (§ "Daily power" blocks)
  "Single-arm kettlebell clean": "kbclean",
  "Two-hand kettlebell swing": "kbswing",
  "Rotational medicine-ball scoop throw": "scoop",
  "Double-kettlebell clean": "dblclean",
  "Standing broad jump — daily power": "broadpower",
  // pressing
  "Weighted dip heavy double": "dipheavy",
  "Weighted dip back-offs": "dipback",
  "Weighted dip": "dip",
  "Weighted dip target test": "dip",
  "Paused bench press": "bench",
  "Strict OHP": "ohp",
  "Strict OHP calibration": "ohptop",
  "Strict OHP top double": "ohptop",
  "Strict OHP back-offs": "ohpback",
  "Strict OHP target test": "ohp",
  // pulling
  "Neutral-grip pull-up": "pullup",
  "Neutral-grip pull-up triples": "pullup",
  "Neutral-grip pull-up target-rep practice": "pulluplong",
  "Neutral-grip pull-up target test": "pullup",
  "Chest-supported machine row": "row",
  "Single-arm chest-supported machine row": "row",
  // lower
  "Conventional deadlift": "dl",
  "Low-bar squat": "squat",
  "Reverse lunge": "lunge",
  "Supported dumbbell single-leg RDL": "slrdl",
  "Knee-supported short-lever Copenhagen": "copen",
  // shoulder health
  "Cable external rotation": "extrot",
  "Face pull": "facepull",
  "Prone Y": "proney",
  // direct biceps (§8 — three recurring Sunday/Wednesday pairs)
  "Alternating dumbbell curl": "curlalt",
  "Incline dumbbell curl": "curlincline",
  "Dumbbell hammer curl": "curlhammer",
  "Cambered-bar curl": "curlcambered",
  "Straight-bar cable curl": "curlstraight",
  "Rope cable hammer curl": "curlrope",
  // trunk
  "Pallof press": "pallof",
  "Landmine rotation": "landmine",
  "Ab wheel": "abwheel",
  "Hollow-body hold": "hollow",
  "Body saw": "bodysaw",
  "Hanging leg raise": "hlr",
  // carries
  "Farmer carry": "farmer",
  "Suitcase carry": "suitcase",
};

/* Display tag per family. The source's family values drive the audit; these are
   only the chips shown on a card. */
const TAG = {
  press: "press",
  vertical: "vertical pull",
  horizontal: "horizontal pull",
  power: "power",
  lower: "lower",
  leg_accessory: "leg accessory",
  adductor: "adductor",
  shoulder: "shoulder health",
  biceps: "biceps",
  abs: "core",
  anti_rotation: "anti-rotation",
  dynamic_rotation: "rotation",
  carry: "carry",
};

const CUT = { never_cut: "never", cut_second: "second", cut_first: "first" };

/* ------------------------------------------------------------------- helpers */
const idFor = (name) => {
  const id = ID[name];
  if (!id) throw new Error(`No id mapped for exercise: ${JSON.stringify(name)}`);
  return id;
};

/* Reps arrive as strings ("2", "8–12", "3"). Keep the label for display and pull a
   number out for the placeholder and the rep-vs-target colouring. For a range the
   number is the LOW end — the set row shades red below it, and the upper bound is
   what drives a load increase, so the low end is the honest placeholder. */
const repsNum = (reps) => {
  const m = String(reps).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

/* Ramps live in their own "<Lift> ramps" timeline block, which always immediately
   precedes the work block carrying that lift's items (asserted below). Attach each
   ramp list to the FIRST item of the following block. */
function rampsByItem(session) {
  const out = {};
  session.timeline.forEach((b, j) => {
    if (!b.ramps.length) return;
    const next = session.timeline[j + 1];
    if (!next || !next.item_indices.length) {
      throw new Error(`${session.id}: ramps block "${b.name}" is not followed by a work block`);
    }
    out[next.item_indices[0]] = {
      rows: b.ramps.map((r) => ({ w: r.load, r: r.reps })),
      note: b.detail,
      name: b.name,
    };
  });
  return out;
}

/* Which timeline block carries an item, for the per-card "block" label. */
function blockByItem(session) {
  const out = {};
  session.timeline.forEach((b) => b.item_indices.forEach((i) => { out[i] = b.name; }));
  return out;
}

/* ------------------------------------------------------------- session cards
   The cards carry one thing the JSON does not: the day's cut-order sentence.
   It varies by weekday only (four distinct strings across all 48 sessions), so
   read it once per day rather than per session. */
function cutRules() {
  const out = {};
  for (let w = 1; w <= 12; w++) {
    const file = `${ROOT}docs/source/session_cards/week_${String(w).padStart(2, "0")}.md`;
    const text = readFileSync(file, "utf8");
    const parts = text.split(/^### Week \d+ — (\w+)/m).slice(1);
    for (let i = 0; i < parts.length; i += 2) {
      const day = DAY_ID[parts[i].toLowerCase()];
      const m = parts[i + 1].match(/\*\*Cuts and consequences:\*\*\s*(.+)/);
      if (m && !out[day]) out[day] = m[1].trim();
    }
  }
  const missing = ["sun", "mon", "wed", "fri"].filter((d) => !out[d]);
  if (missing.length) throw new Error(`No cut rule found for: ${missing.join(", ")}`);
  return out;
}

/* ------------------------------------------------------------------- build */
const CUTS = cutRules();
const SESSIONS = {};
const rowsSeen = [];

for (const s of src.sessions) {
  const day = DAY_ID[s.day];
  if (!day) throw new Error(`Unknown day: ${s.day}`);
  const ramps = rampsByItem(s);
  const blocks = blockByItem(s);
  const seen = new Set();

  const items = s.items.map((it, i) => {
    const id = idFor(it.exercise);
    if (seen.has(id)) throw new Error(`${s.id}: duplicate id ${id} (${it.exercise})`);
    seen.add(id);
    rowsSeen.push(id);
    const numericLoad = typeof it.load === "number" ? it.load : null;
    return {
      id,
      name: it.exercise,
      tag: TAG[it.family] || it.family,
      family: it.family,
      cut: CUT[it.cut_priority] || "second",
      sets: it.sets,
      reps: String(it.reps),
      repsNum: repsNum(it.reps),
      repsMax: it.reps_max ?? null,
      load: numericLoad,
      loadText: numericLoad == null ? String(it.load) : null,
      rir: it.rir,
      rest: it.rest_seconds,
      purpose: it.purpose,
      perSide: !!it.per_side,
      system: !!it.system_load,
      clock: it.clock,
      /* The plan's OWN classification flags. These drive the audit and must be carried
         through rather than inferred from `family`: `direct_abdominal` spans three
         families (abs, anti-rotation and dynamic rotation) — four exposure days, not the
         two that counting family "abs" would give. */
      workSet: !!it.work_set,
      power: !!it.power,
      unilateral: !!it.unilateral,
      lowerStrength: !!it.lower_strength,
      directAbs: !!it.direct_abdominal,
      shoulderHealth: !!it.shoulder_health,
      directArm: !!it.direct_arm,
      dynamicRotation: !!it.dynamic_rotation,
      rotationPattern: it.rotation_pattern || null,
      fallback: it.fallback || null,
      progression: it.progression || null,
      block: blocks[i] || null,
      ramp: ramps[i] ? ramps[i].rows : null,
      rampNote: ramps[i] ? ramps[i].note : null,
    };
  });

  (SESSIONS[s.week] ||= {})[day] = {
    objective: s.objective,
    minutes: s.minutes,
    seconds: s.total_seconds,
    cuts: CUTS[day],
    blocks: s.timeline.map((b) => ({
      name: b.name,
      seconds: b.total_seconds,
      minutes: Math.round((b.total_seconds / 60) * 10) / 10,
      detail: b.detail,
      drills: b.drills.length ? b.drills.map((d) => `${d.exercise} — ${d.dose}`) : null,
      ramps: b.ramps.length ? b.ramps.map((r) => ({ w: r.load, r: r.reps })) : null,
    })),
    items,
  };
}

/* ------------------------------------------------------------------- impact
   Wednesday and Friday only, each on its own clock that starts BEFORE travel.
   Wednesday's cap is 15 minutes, Friday's 30 (the approved authority update). */
const IMPACT = {};
for (const im of src.impact_sessions) {
  const day = DAY_ID[im.day];
  const events = im.events.map((e) => ({
    name: e.name, dose: e.dose, seconds: e.seconds,
    tier: e.tier || null, contacts: e.contacts ?? null,
  }));
  (IMPACT[im.week] ||= {})[day] = {
    capSeconds: im.cap_seconds,
    capMinutes: im.cap_seconds / 60,
    low: im.low, moderate: im.moderate, high: im.high,
    baseSeconds: im.base_seconds,
    travelSeconds: im.available_travel_and_extra_prep_seconds,
    test: im.test,
    events,
    run: im.run_reps
      ? {
          reps: im.run_reps, distance: im.run_distance, runout: im.runout_per_rep,
          accelM: im.acceleration_m, runoutM: im.runout_m,
          totalM: im.acceleration_m + im.runout_m,
          terrain: im.terrain, effort: im.effort,
        }
      : null,
    selectionRule: im.selection_rule,
    gate: im.gate,
  };
}

/* ------------------------------------------------- week 13 deferred contingency
   NOT a thirteenth training week and NOT one of the 48 sessions. It exists only to
   carry a measurement that was deferred BEFORE its target attempt in week 12. */
const dt = src.deferred_testing;
const WEEK13 = {
  week: dt.week,
  day: DAY_ID[dt.day],
  countsToward48: dt.counts_toward_48,
  deadliftExposures: dt.deadlift_exposures,
  warmupSeconds: dt.warmup_seconds,
  interTestSeconds: dt.inter_test_recovery_seconds,
  delayReserveSeconds: dt.delay_reserve_seconds,
  tests: dt.tests.map((t) => {
    const it = t.item;
    const rampBlock = t.blocks.find((b) => b.ramps && b.ramps.length);
    return {
      key: t.name,
      id: idFor(it.exercise),
      name: it.exercise,
      tag: TAG[it.family] || it.family,
      family: it.family,
      cut: CUT[it.cut_priority] || "never",
      sets: it.sets,
      reps: String(it.reps),
      repsNum: repsNum(it.reps),
      load: typeof it.load === "number" ? it.load : null,
      loadText: typeof it.load === "number" ? null : String(it.load),
      rir: it.rir,
      rest: it.rest_seconds,
      purpose: it.purpose,
      perSide: !!it.per_side,
      system: !!it.system_load,
      clock: it.clock,
      /* The plan's OWN classification flags. These drive the audit and must be carried
         through rather than inferred from `family`: `direct_abdominal` spans three
         families (abs, anti-rotation and dynamic rotation) — four exposure days, not the
         two that counting family "abs" would give. */
      workSet: !!it.work_set,
      power: !!it.power,
      unilateral: !!it.unilateral,
      lowerStrength: !!it.lower_strength,
      directAbs: !!it.direct_abdominal,
      shoulderHealth: !!it.shoulder_health,
      directArm: !!it.direct_arm,
      dynamicRotation: !!it.dynamic_rotation,
      rotationPattern: it.rotation_pattern || null,
      block: t.blocks.length ? t.blocks[t.blocks.length - 1].name : null,
      ramp: rampBlock ? rampBlock.ramps.map((r) => ({ w: r.load, r: r.reps })) : null,
      rampNote: rampBlock ? rampBlock.detail : null,
      blocks: t.blocks.map((b) => ({
        name: b.name,
        seconds: b.total_seconds,
        minutes: Math.round((b.total_seconds / 60) * 10) / 10,
        detail: b.detail,
      })),
    };
  }),
};

/* ------------------------------------------------------------------- audit */
const AUDIT = {};
for (const a of src.weekly_audit) {
  AUDIT[a.week] = {
    week: a.week, press: a.press, vertical: a.vertical, horizontal: a.horizontal,
    biceps: a.biceps, lower: a.lower_days, shoulder: a.shoulder_days, abs: a.abdominal_days,
    unilateral: a.unilateral_days, powerDays: a.power_days, carry: a.carry_days,
    /* Not in the source audit table, but §19 states it as a retained floor, so it is
       derived here and asserted by test.mjs like the rest. */
    adductor: [...new Set(src.sessions.filter((s) => s.week === a.week)
      .flatMap((s) => s.items.filter((i) => i.family === "adductor").map(() => s.day)))].length,
    patterns: a.dynamic_patterns, ratio: a.ratio,
  };
}

/* ------------------------------------------------------------ string interning
   The plan repeats long block details, purposes, progression notes and impact
   gates across 48 sessions — well over a megabyte of mostly duplicate text. Pool
   every repeated string into a table and rehydrate at module load, so everything
   downstream sees ordinary strings and the bundle stays a sane size. */
const INTERN_MIN = 25;
const pool = new Map();
const counts = new Map();
const scan = (v) => {
  if (typeof v === "string") counts.set(v, (counts.get(v) || 0) + 1);
  else if (Array.isArray(v)) v.forEach(scan);
  else if (v && typeof v === "object") Object.values(v).forEach(scan);
};
scan(SESSIONS); scan(IMPACT); scan(WEEK13);

/* Only PROSE is interned. A short string is left alone, which removes an entire
   class of bug: ramp loads use `w`, which holds either a number (45) or the string
   "BW", so that field can never be safely dereferenced. Nothing under the threshold
   is ever replaced by an index, so no short field needs rehydrating at all. */
const TABLE = [];
for (const [str, n] of counts) {
  if (str.length >= INTERN_MIN && n > 1) { pool.set(str, TABLE.length); TABLE.push(str); }
}
const intern = (v) => {
  if (typeof v === "string") return pool.has(v) ? pool.get(v) : v;
  if (Array.isArray(v)) return v.map(intern);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = intern(val);
    return o;
  }
  return v;
};

/* Fields that can hold an interned (long) string, and so may carry an index.
   Rehydration walks exactly these, so a genuine number elsewhere — sets, reps, a
   ramp load — is never mistaken for a table index.

   This list is ASSERTED complete below rather than maintained by hand. Getting it
   wrong is silent and severe: `id` was once missing, every exercise id in all 397
   rows shipped as an integer, and log keys, rest lookups and alt swaps would all
   have broken against real saved data. */
const STR_KEYS = [
  "objective", "cuts", "name", "loadText", "rir", "purpose", "fallback",
  "progression", "rampNote", "detail", "dose", "selectionRule", "gate", "rotationPattern",
];

/* Two assertions, both of which have already caught a real shipped bug.

   1. COMPLETENESS — every key that can hold an internable string must be listed, or
      its value silently stays an integer. `id` was once missing and every exercise id
      in all 397 rows shipped as a number.
   2. EXCLUSIVITY — no key in the list may EVER hold a number anywhere, or rehydration
      will mistake that number for a table index. `reps` was once listed while
      `run.reps` held 3, and the run card rendered a block of warm-up prose as its
      rep count. A key that is sometimes text and sometimes a number cannot be
      dereferenced; give one of the two uses a different name. */
{
  const long = new Set(), numeric = new Set();
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== "object") return;
    for (const [k, v] of Object.entries(n)) {
      if (typeof v === "string") { if (v.length >= INTERN_MIN) long.add(k); }
      else if (typeof v === "number") numeric.add(k);
      else walk(v);
    }
  };
  walk(SESSIONS); walk(IMPACT); walk(WEEK13);
  const missing = [...long].filter((k) => !STR_KEYS.includes(k));
  if (missing.length) {
    throw new Error(`STR_KEYS is missing internable field(s): ${missing.join(", ")}. ` +
      `Add them, or their values will ship as integers.`);
  }
  const ambiguous = STR_KEYS.filter((k) => numeric.has(k));
  if (ambiguous.length) {
    throw new Error(`STR_KEYS contains field(s) that also hold numbers: ${ambiguous.join(", ")}. ` +
      `Rehydration would read those numbers as string-table indices.`);
  }
}

const out = `/* GENERATED by tools/gen-program.mjs — do not re-run the generator to apply a
 * weekly autoregulation change; edit the prescriptions in this file directly.
 * Re-running regenerates from the source plan and DISCARDS every accepted edit.
 *
 * Source: docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json
 *         ${src.sessions.length} sessions · ${rowsSeen.length} prescribed rows · ${src.impact_sessions.length} impact sessions
 *         sha256 ${srcHash}
 */

export const SOURCE = ${JSON.stringify({
  version: src.version, status: src.status, sha256: srcHash,
  sessions: src.sessions.length, rows: rowsSeen.length,
  impactSessions: src.impact_sessions.length,
})};

export const META = {
  programId: "astra-synthesis-v4",
  blockVersion: "v4.0-syn2",
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
  /* §19 — work-set floors. Weeks 6 and 12 waive press / vertical / horizontal per
     approved resolution C09; the structural floors still hold in every week. */
  floors: {
    press: 18, vertical: 9, horizontal: 6, ratioMax: 1.3,
    lower: 2, shoulder: 3, abs: 4, biceps: 4, carry: 2, power: 4, unilateral: 4,
  },
  /* §13 — per-session running ceilings. */
  runCeiling: { accelM: 60, totalM: 120 },
  /* §12 — high-tier contacts per week outside the two measurement weeks. */
  highContactCap: 6,
  /* The approved authority updates. Strength time is a GUIDELINE in this block, not
     the hard cap it was in v3: week-12 Friday is deliberately 94 minutes of testing.
     The impact clocks are hard caps, and they differ by day. */
  strengthGuidelineMinutes: 75,
  strengthIsHardCap: false,
  impactCapMinutes: { wed: ${src.authority_updates.wednesday_impact_cap_minutes}, fri: ${src.authority_updates.friday_impact_cap_minutes} },
  authority: ${JSON.stringify(src.authority_updates)},
};

export const DAY_IDS = ["sun", "mon", "wed", "fri"];

/* Interned strings — see the note in tools/gen-program.mjs. Rehydrated below, so
   everything downstream sees ordinary strings. */
const S = ${JSON.stringify(TABLE)};

const SESSIONS_RAW = ${JSON.stringify(intern(SESSIONS))};
const IMPACT_RAW = ${JSON.stringify(intern(IMPACT))};
const WEEK13_RAW = ${JSON.stringify(intern(WEEK13))};

/* Rehydrate: walk only the known string-bearing fields and swap indices back. */
const STR_KEYS = new Set(${JSON.stringify(STR_KEYS)});
const deref = (v) => (typeof v === "number" && S[v] !== undefined ? S[v] : v);
function hydrate(node) {
  if (Array.isArray(node)) { node.forEach(hydrate); return node; }
  if (!node || typeof node !== "object") return node;
  for (const [k, v] of Object.entries(node)) {
    if (STR_KEYS.has(k)) node[k] = deref(v);
    else if (v && typeof v === "object") hydrate(v);
    else if (Array.isArray(v)) hydrate(v);
  }
  return node;
}
hydrate(SESSIONS_RAW); hydrate(IMPACT_RAW); hydrate(WEEK13_RAW);
// \`drills\` is an array of plain strings, so it needs its own pass.
for (const w of Object.values(SESSIONS_RAW))
  for (const d of Object.values(w))
    for (const b of d.blocks) if (b.drills) b.drills = b.drills.map(deref);

export const SESSIONS = SESSIONS_RAW;
export const IMPACT = IMPACT_RAW;
export const WEEK13 = WEEK13_RAW;
export const AUDIT = ${JSON.stringify(AUDIT)};
`;

writeFileSync(ROOT + "src/program.js", out);
console.log(
  `✓ src/program.js written — ${src.sessions.length} sessions, ${rowsSeen.length} rows, ` +
  `${src.impact_sessions.length} impact sessions, ${TABLE.length} interned strings, ` +
  `source sha256 ${srcHash.slice(0, 12)}…`
);
