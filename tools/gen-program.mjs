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
 * Input (vendored, read-only):
 *   docs/source/SYNTHESIZED_PRESCRIPTIONS_V3.json   48 sessions, 24 impact sessions,
 *                                                   week-13 deferred-test contingency.
 *   Every session carries its own cut rule and sequencing checks (deload and test-day
 *   versions included), so nothing is parsed out of the Markdown cards any more.
 *
 * COACHING AMENDMENTS A1–A3 (applied to v4.0-syn2 in this file) are NOT re-applied.
 * The V3 source already carries their resolved form, decided by Brian on 24 Sep 2026:
 *   A1 — calves on both lower days (V3: ≥3 varied sets Mon/Fri) and a 2-set Friday
 *        single-leg RDL are in the source. The Monday lying leg curl was NOT adopted:
 *        Brian asked to avoid machines ("RDL vs hamstring curl"). Watch item for the
 *        faster sprint weeks 8–11.
 *   A2 — week-11 Sunday dip back-offs 3×6 @ +47.5 are in the source.
 *   A3 — no broad-jump measurement, and week-12 Friday carries no power work and no
 *        kettlebell complex (approved exception E11) — both in the source.
 * test.mjs asserts all three resolutions against the generated program.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = ROOT + "docs/source/SYNTHESIZED_PRESCRIPTIONS_V3.json";
const raw = readFileSync(SRC, "utf8");
const src = JSON.parse(raw);
const srcHash = createHash("sha256").update(raw).digest("hex");

const DAY_ID = { sunday: "sun", monday: "mon", wednesday: "wed", friday: "fri", saturday: "sat" };

/* ---------------------------------------------------------------- exercise ids
   Stable slug per exercise so logs, rest keys and the "LAST WK" reference line up
   week to week. Variants that occupy the SAME slot share an id on purpose (a top set
   and its deload version; a week-12 target test and the ordinary exposure of that
   lift). Exercises that ROTATE by three-week block (Sunday power, calves, biceps) get
   their own ids, so "LAST WK" never compares two different exercises. */
const ID = {
  // power
  "Plyometric push-up (hands leave the floor)": "plyopush",
  "Medicine-ball chest pass to a wall": "chestpass",
  "Two-hand kettlebell swing": "kbswing",
  "One-arm kettlebell snatch (if gate met)": "kbsnatch",
  "Rotational medicine-ball scoop throw (to a wall)": "scoop",
  "Double-kettlebell clean (from the hang)": "dblclean",
  // pressing
  "Weighted dip heavy double": "dipheavy",
  "Weighted dip back-offs": "dipback",
  "Weighted dip": "dip",
  "Weighted dip target test": "dip",
  "Paused bench press": "bench",
  "Dumbbell incline bench press": "inclinedb",
  "Strict OHP (moderate)": "ohp",
  "Strict OHP target test": "ohp",
  "Strict OHP top double": "ohptop",
  "Strict OHP": "ohptop",                      // week-6 Wednesday: the same slot, deloaded
  "Strict OHP back-off doubles": "ohpback",
  // pulling
  "Neutral-grip pull-up": "pullup",
  "Neutral-grip pull-up triples": "pullup",
  "Neutral-grip pull-up target-rep practice": "pulluplong",
  "Neutral-grip pull-up target test": "pullup",
  "One-arm chest-supported dumbbell row (incline bench)": "row",
  "One-arm dumbbell row (bench-supported)": "row",
  // lower
  "Conventional deadlift top double": "dl",
  "Conventional deadlift (light technique, C02)": "dl",
  "Conventional deadlift back-off double": "dlback",
  "Low-bar squat": "squat",
  "Low-bar squat (easy, after tests)": "squat",
  "Dumbbell/kettlebell reverse lunge": "lunge",
  "Dumbbell/kettlebell single-leg RDL": "slrdl",
  "Knee-supported short-lever Copenhagen": "copen",
  // calves (Monday straight-knee, Friday bent-knee; three-week rotation)
  "One-leg dumbbell calf raise on a step": "calfstep",
  "Standing barbell or Smith calf raise on a plate": "calfstand",
  "Seated calf raise": "calfseat",
  "Bent-knee calf raise with 3-s stretch pause": "calfpause",
  // shoulder health
  "Cable external rotation": "extrot",
  "Face pull": "facepull",
  "Prone Y (incline bench)": "proney",
  // direct arms (biceps Sun/Wed on a three-week rotation; triceps Mon/Fri, fixed)
  "Alternating dumbbell curl": "curlalt",
  "Incline dumbbell curl": "curlincline",
  "Dumbbell hammer curl": "curlhammer",
  "Cambered-bar curl": "curlcambered",
  "Straight-bar cable curl": "curlstraight",
  "Rope cable hammer curl": "curlrope",
  "Rope pushdown": "pushdown",
  "Overhead cable triceps extension": "ohtri",
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

/* Display tag per family (card chips only; the audit reads the plan's own flags). */
const TAG = {
  press: "press", vertical: "vertical pull", horizontal: "horizontal pull", power: "power",
  lower: "lower", leg_accessory: "leg accessory", adductor: "adductor", calf: "calf",
  shoulder: "shoulder health", biceps: "biceps", triceps: "triceps", abs: "core",
  anti_rotation: "anti-rotation", dynamic_rotation: "rotation", carry: "carry",
};

const CUT = { never_cut: "never", cut_second: "second", cut_first: "first" };

/* ------------------------------------------------------------------- helpers */
const idFor = (name) => {
  const id = ID[name];
  if (!id) throw new Error(`No id mapped for exercise: ${JSON.stringify(name)}`);
  return id;
};

/* Reps arrive as strings ("2", "8–15", "20 m", "20 s"). The number is the LOW end of a
   range — the honest placeholder; the upper bound drives a load increase. */
const repsNum = (reps) => {
  const m = String(reps).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

/* Ramps live in their own "<Lift> ramps" block, which always immediately precedes the
   work block carrying that lift (asserted). Attach each ramp list to that block's FIRST
   item. */
function rampsByItem(session) {
  const out = {};
  session.timeline.forEach((b, j) => {
    if (!b.ramps.length) return;
    const next = session.timeline[j + 1];
    if (!next || !next.item_indices.length) {
      throw new Error(`${session.id}: ramps block "${b.name}" is not followed by a work block`);
    }
    out[next.item_indices[0]] = { rows: b.ramps.map((r) => ({ w: r.load, r: r.reps })), note: b.detail };
  });
  return out;
}

function blockByItem(session) {
  const out = {};
  session.timeline.forEach((b) => b.item_indices.forEach((i) => { out[i] = b.name; }));
  return out;
}

/* One item in the shape the app reads. */
function mapItem(it, i, blocks, ramps) {
  const numericLoad = typeof it.load === "number" ? it.load : null;
  return {
    id: idFor(it.exercise),
    name: it.exercise,
    tag: TAG[it.family] || it.family,
    family: it.family,
    cut: CUT[it.cut_priority] || "second",
    /* 0 = if cut, skip the WHOLE exercise (never one set); otherwise the minimum sets kept. */
    protectedSets: it.protected_sets,
    sets: it.sets,
    reps: String(it.reps),
    repsNum: repsNum(it.reps),
    repsMax: it.reps_max ?? null,
    load: numericLoad,
    loadText: numericLoad == null ? String(it.load) : null,
    rir: it.rir,
    rest: it.rest_seconds,
    restNote: it.rest_note || null,
    supersetWith: it.superset_with && it.superset_with.length ? it.superset_with.join(" + ") : null,
    purpose: it.purpose,
    perSide: !!it.per_side,
    system: !!it.system_load,
    clock: it.clock,
    /* The plan's OWN classification flags drive the audit; never infer them from family. */
    workSet: !!it.work_set,
    power: !!it.power,
    unilateral: !!it.unilateral,
    lowerStrength: !!it.lower_strength,
    directAbs: !!it.direct_abdominal,
    shoulderHealth: !!it.shoulder_health,
    directArm: !!it.direct_arm,
    armKind: it.direct_arm || null,           // "biceps" | "triceps" | null
    calf: !!it.calf,
    dynamicRotation: !!it.dynamic_rotation,
    rotationPattern: it.rotation_pattern || null,
    test: (it.tags || []).includes("test"),
    fallback: it.fallback || null,
    progression: it.progression || null,
    block: blocks[i] || null,
    ramp: ramps[i] ? ramps[i].rows : null,
    rampNote: ramps[i] ? ramps[i].note : null,
  };
}

/* Card-level notes the Markdown cards print above the exercise table. */
const E5 = (src.approved_exceptions.find((e) => e.id === "E5") || {}).exception;
function notesFor(s) {
  const n = [];
  if (s.week === 1 && s.day === "wednesday") n.push({ title: "OHP anchor", text: src.rules.ohp_anchor });
  if (s.day === "monday" && s.week >= 7 && s.week <= 11) n.push({ title: "Longer pull-up set", text: src.rules.pullup_longer_set });
  if (s.week === 12 && (s.day === "wednesday" || s.day === "friday")) n.push({ title: "Test rules", text: src.rules.tests });
  if (s.week === 12 && s.day === "friday" && E5) n.push({ title: "Named exception (E5)", text: E5 });
  return n;
}

/* ------------------------------------------------------------------- build */
const SESSIONS = {};
const rowsSeen = [];
for (const s of src.sessions) {
  const day = DAY_ID[s.day];
  if (!day) throw new Error(`Unknown day: ${s.day}`);
  const ramps = rampsByItem(s);
  const blocks = blockByItem(s);
  const seen = new Set();
  const items = s.items.map((it, i) => {
    const m = mapItem(it, i, blocks, ramps);
    if (seen.has(m.id)) throw new Error(`${s.id}: duplicate id ${m.id} (${it.exercise})`);
    seen.add(m.id);
    rowsSeen.push(m.id);
    return m;
  });
  (SESSIONS[s.week] ||= {})[day] = {
    date: s.date,
    phase: s.phase,
    objective: s.objective,
    minutes: s.minutes,
    seconds: s.total_seconds,
    secondsIfMaxRests: s.total_seconds_if_max_rests,
    cuts: s.cut_rule,
    sequencing: s.sequencing_rule,
    notes: notesFor(s),
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
   Wednesday and Friday only. Wednesday is a HARD 15-minute limit; Friday is a
   ~30-minute TARGET. Travel is not budgeted (Brian, 23 Sep). The high-tier cap is the
   approved weekly tier table, not a single number. */
const SELECTION_RULE = "If time or tissues say so, cut contacts from the highest tier down — never the preparation or the rests. Log the smaller actual dose; it never qualifies the next stage. No make-up impact after lifting or on Saturday.";
const IMPACT = {};
for (const im of src.impact_sessions) {
  const day = DAY_ID[im.day];
  (IMPACT[im.week] ||= {})[day] = {
    date: im.date,
    capSeconds: im.cap_seconds,
    capMinutes: im.cap_seconds / 60,
    capType: im.cap_type,                     // "hard" (Wednesday) | "target" (Friday)
    low: im.low, moderate: im.moderate, high: im.high,
    baseSeconds: im.total_seconds,
    test: false,                              // no measurement sessions in this block
    events: im.events.map((e) => ({
      name: e.name, dose: e.dose, seconds: e.seconds,
      tier: e.tier || null, contacts: e.contacts ?? null,
    })),
    run: im.run_reps
      ? {
          reps: im.run_reps, distance: im.run_distance, runout: im.run_distance,
          accelM: im.acceleration_m, runoutM: im.runout_m, totalM: im.acceleration_m + im.runout_m,
          terrain: im.terrain, effort: im.effort, restSeconds: im.run_rest_seconds,
        }
      : null,
    selectionRule: SELECTION_RULE,
    gate: im.rules,
  };
}
const HIGH_CAP = Object.fromEntries(Object.entries(src.tier_targets).map(([w, t]) => [Number(w), t.high]));

/* ------------------------------------------------- week 13 deferred contingency
   NOT a thirteenth training week and NOT one of the 48 sessions: Saturday 26 Dec 2026,
   only for a test not attempted in week 12. */
const dt = src.deferred_testing;
const WEEK13 = {
  week: dt.week,
  day: DAY_ID[dt.day],
  date: dt.date,
  easyDaysBefore: dt.easy_days_before,
  note: dt.note,
  countsToward48: dt.counts_toward_48,
  deadliftExposures: dt.deadlift_exposures,
  warmupSeconds: dt.warmup_seconds,
  interTestSeconds: dt.inter_test_recovery_seconds,
  delayReserveSeconds: dt.delay_reserve_seconds,
  tests: dt.tests.map((t) => {
    const it = t.item;
    const rampBlock = t.blocks.find((b) => b.ramps && b.ramps.length);
    const m = mapItem(it, 0, {}, {});
    return {
      ...m,
      key: t.name,
      cut: CUT[it.cut_priority] || "never",
      block: t.blocks.length ? t.blocks[t.blocks.length - 1].name : null,
      ramp: rampBlock ? rampBlock.ramps.map((r) => ({ w: r.load, r: r.reps })) : null,
      rampNote: rampBlock ? rampBlock.detail : null,
      blocks: t.blocks.map((b) => ({
        name: b.name, seconds: b.total_seconds,
        minutes: Math.round((b.total_seconds / 60) * 10) / 10, detail: b.detail,
      })),
    };
  }),
};

/* ------------------------------------------------------------------- audit
   Computed from the SAME item flags the app reads at runtime, so the live audit and
   this table cannot disagree (test.mjs asserts they match). */
const AUDIT = {};
for (let w = 1; w <= 12; w++) {
  const all = ["sun", "mon", "wed", "fri"].flatMap((d) => SESSIONS[w][d].items.map((i) => ({ ...i, day: d })));
  const sets = (pred) => all.filter(pred).reduce((a, i) => a + i.sets, 0);
  const days = (pred) => new Set(all.filter(pred).map((i) => i.day)).size;
  const press = sets((i) => i.workSet && i.family === "press");
  const vertical = sets((i) => i.workSet && i.family === "vertical");
  const horizontal = sets((i) => i.workSet && i.family === "horizontal");
  AUDIT[w] = {
    week: w, press, vertical, horizontal,
    biceps: sets((i) => i.armKind === "biceps"),
    triceps: sets((i) => i.armKind === "triceps"),
    calves: sets((i) => i.calf),
    lower: days((i) => i.lowerStrength), shoulder: days((i) => i.shoulderHealth),
    abs: days((i) => i.directAbs), unilateral: days((i) => i.unilateral),
    powerDays: days((i) => i.power), carry: days((i) => i.family === "carry"),
    adductor: days((i) => i.family === "adductor"),
    patterns: [...new Set(all.filter((i) => i.dynamicRotation).map((i) => i.rotationPattern))].sort(),
    ratio: Math.round((press / (vertical + horizontal)) * 1000) / 1000,
  };
  const src_a = src.weekly_audit[w - 1];
  for (const k of ["press", "vertical", "horizontal"]) {
    if (AUDIT[w][k] !== src_a[k]) throw new Error(`audit ${k} w${w}: app ${AUDIT[w][k]} != source ${src_a[k]}`);
  }
}

/* ------------------------------------------------------------ string interning
   Pool every repeated long string into a table and rehydrate at module load, so the
   bundle stays a sane size and everything downstream sees ordinary strings. */
const INTERN_MIN = 25;
const counts = new Map();
const scan = (v) => {
  if (typeof v === "string") counts.set(v, (counts.get(v) || 0) + 1);
  else if (Array.isArray(v)) v.forEach(scan);
  else if (v && typeof v === "object") Object.values(v).forEach(scan);
};
scan(SESSIONS); scan(IMPACT); scan(WEEK13);
const pool = new Map();
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

/* Fields that can hold an interned (long) string. ASSERTED complete and exclusive
   below — both rules have caught real shipped bugs (ids once shipped as integers; a
   numeric run.reps was once read as a string index). */
const STR_KEYS = [
  "objective", "cuts", "sequencing", "name", "loadText", "rir", "purpose", "fallback",
  "progression", "rampNote", "detail", "dose", "selectionRule", "gate", "rotationPattern",
  "restNote", "supersetWith", "block", "note", "text",
];
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
    throw new Error(`STR_KEYS is missing internable field(s): ${missing.join(", ")}. Add them, or their values will ship as integers.`);
  }
  const ambiguous = STR_KEYS.filter((k) => numeric.has(k));
  if (ambiguous.length) {
    throw new Error(`STR_KEYS contains field(s) that also hold numbers: ${ambiguous.join(", ")}. Rehydration would read those numbers as string-table indices.`);
  }
  /* Arrays of long strings are rehydrated only for block drills (below). Refuse any
     other array that would carry an interned string. */
  const badArrays = [];
  const walkArr = (n, path) => {
    if (Array.isArray(n)) {
      if (n.some((x) => typeof x === "string" && pool.has(x)) && path !== "drills") badArrays.push(path);
      return n.forEach((x) => walkArr(x, path));
    }
    if (!n || typeof n !== "object") return;
    for (const [k, v] of Object.entries(n)) walkArr(v, k);
  };
  walkArr(SESSIONS, ""); walkArr(IMPACT, ""); walkArr(WEEK13, "");
  if (badArrays.length) throw new Error(`Interned strings inside arrays that are never rehydrated: ${[...new Set(badArrays)].join(", ")}`);
}

const out = `/* GENERATED by tools/gen-program.mjs — do not re-run the generator to apply a
 * weekly autoregulation change; edit the prescriptions in this file directly.
 * Re-running regenerates from the source plan and DISCARDS every accepted edit.
 *
 * Source: docs/source/SYNTHESIZED_PRESCRIPTIONS_V3.json
 *         ${src.sessions.length} sessions · ${rowsSeen.length} prescribed rows · ${src.impact_sessions.length} impact sessions
 *         sha256 ${srcHash}
 */

export const SOURCE = ${JSON.stringify({
  version: src.version, status: src.status, sha256: srcHash,
  sessions: src.sessions.length, rows: rowsSeen.length,
  impactSessions: src.impact_sessions.length,
})};

export const META = {
  programId: "astra-synthesis-v5",
  blockVersion: "v5.0-syn3",
  planName: "Astra Synthesized Concurrent Block",
  startDate: ${JSON.stringify(src.start_date)},
  bw: ${src.example_bodyweight_lb},
  weeks: 12,
  deloadWeeks: [6, 12],
  testWeek: 12,
  /* Week-12 tests are split: OHP on Wednesday; dip then pull-up on Friday. */
  testDays: ["wed", "fri"],
  testDayOf: { ohp: "wed", dip: "fri", pullup: "fri" },
  /* The three goal tests. OHP succeeds at RPE ≤9 (≥1 RIR); dip and pull-up at ≥2 RIR,
     aiming for 2 — easier qualifies. Squat and deadlift are maintained; plyometric
     capacity progresses without a test (the broad-jump target was withdrawn, A3). */
  targets: { ohp: "130 × 2", dip: "+50 × 6", pullup: "+45 × 5" },
  targetStandard: { ohp: "RPE ≤9 (≥1 RIR)", dip: "≥2 RIR, aiming for 2", pullup: "≥2 RIR, aiming for 2" },
  /* Normal-week floors (section 19). Weeks 6 and 12 waive the volume floors (C09);
     the structural exposure floors hold every week, except week-12 Friday's power (E11). */
  floors: {
    press: 16, pressMax: 20, vertical: 8, horizontal: 6, ratioMax: 1.3,
    lower: 2, shoulder: 3, abs: 4, biceps: 6, triceps: 6, calves: 6, carry: 2,
    unilateral: 4, power: 4, adductor: 2,
  },
  /* Per-session quality-running ceiling (section 13). */
  runCeiling: { accelM: 250, totalM: 500 },
  /* High-tier contacts per week — the approved tier table (0 before week 5; 12 → 18). */
  highContactCapByWeek: ${JSON.stringify(HIGH_CAP)},
  /* Strength time is a HARD 75-minute limit, 5-minute delay reserve included. */
  strengthLimitMinutes: 75,
  strengthIsHardCap: true,
  impactCapMinutes: { wed: 15, fri: 30 },
  impactCapType: { wed: "hard", fri: "target" },
  approvedExceptions: ${JSON.stringify(src.approved_exceptions)},
};

export const DAY_IDS = ["sun", "mon", "wed", "fri"];

/* Interned strings — see tools/gen-program.mjs. Rehydrated below. */
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
