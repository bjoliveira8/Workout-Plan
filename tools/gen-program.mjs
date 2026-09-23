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
  "Lying leg curl": "legcurl",              // coaching amendment A1
  "Standing calf raise": "calf",            // coaching amendment A1
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

/* ------------------------------------------------------- COACHING AMENDMENTS
   Changes made to the source plan AFTER it was reviewed, at Brian's instruction.
   They live here, in one place, applied to the source structure before anything
   else runs — so the vendored source stays pristine and read-only, the timing
   and audit arithmetic downstream recomputes itself, and every amendment is
   reviewable in a single diff.

   Each one records WHY, because a future session will otherwise assume the
   source said this.

   A1. Plantarflexor and hamstring work on both lower days.
       The source prescribes 40–60 pogo contacts a week plus hill and flat
       accelerations, while giving the calf ZERO direct work and the hamstring
       twelve reps a week (one set of supported single-leg RDL). The adductor,
       which has a symptom history, gets thirty-six. The hamstring is the primary
       sprint-injury site and the plantarflexors take the dominant load in pogos
       and acceleration; both were being asked to absorb new impact without any
       preparation. Monday gets knee-flexion work, which is the function its
       deadlift does not train; Friday's existing hinge is doubled.

   A2. Dip six-rep ladder made an even climb.
       The source ran 35 → 37.5 → 40 → 42.5 → 45 and then tested at 50, so the
       final step was +5 where every previous step was +2.5, and the last actual
       six-rep exposure was two weeks before the test. Week 11 becomes a six at
       +47.5 so the test is the same size step as all the others.

   A3. Broad-jump measurement removed.
       The source listed "+4 inches" as one of four success targets while
       prescribing 18 maximal jump attempts across twelve weeks — six of them the
       tests themselves — and holding high-tier contacts flat at six a week from
       week 5 with no progression. That is a maintenance dose against a
       development target, so the measurement could only ever report
       familiarisation. Brian elected to drop it. The TRAINING jumps in weeks 5
       and 7–11 stay: they are the Friday power slot and they are gated normally.
       Week 1 takes the same double-kettlebell clean the following weeks use.
       Week 12 Friday now carries no power work at all, which is deliberate —
       nothing belongs in front of three maximal strength tests.                */

const REDUCED_WEEKS = new Set([6, 12]);

const calfItem = (reduced) => ({
  exercise: "Standing calf raise",
  sets: reduced ? 1 : 2,
  reps: "12", reps_max: 12,
  load: "Light to moderate, full range, one-second pause at the top and a controlled lower. Record the setting that meets the reserve; add the smallest step only after two comparable clean exposures.",
  family: "leg_accessory",
  rir: reduced ? "≥5" : "3",
  rest_seconds: 60, per_side: false, seconds_per_rep: 2,
  purpose: "Plantarflexor and Achilles preparation for the pogo, hurdle-hop and acceleration load this block prescribes",
  cut_priority: "cut_second", clock: "strength",
  unilateral: false, lower_strength: false, direct_abdominal: false,
  shoulder_health: false, direct_arm: false, dynamic_rotation: false,
  power: false, work_set: false, system_load: false,
  fallback: "Seated calf raise, or single-leg bodyweight raises at 2×12 per side if no machine is free. Either keeps the exposure; neither is a reason to add load quickly.",
  progression: "This is preparation for impact, not a strength lift. Full range and a controlled lower matter more than the number. Add the smallest available step only after two comparable clean exposures with a normal next morning. Calf or Achilles soreness that changes how you walk or land means hold the dose and review the impact block first — the jumps are the larger stressor, not this.",
  execution_seconds: reduced ? 24 : 48,
});

const hamstringItem = (reduced) => ({
  exercise: "Lying leg curl",
  sets: reduced ? 1 : 2,
  reps: "8", reps_max: 8,
  load: "Light trial to the stated reserve; save the setting. Compare only with the last normal appearance.",
  family: "leg_accessory",
  rir: reduced ? "≥5" : "3",
  rest_seconds: 90, per_side: false, seconds_per_rep: 3,
  purpose: "Knee-flexion hamstring capacity — the primary sprint-injury site, and the function Monday's deadlift does not train",
  cut_priority: "cut_second", clock: "strength",
  unilateral: false, lower_strength: false, direct_abdominal: false,
  shoulder_health: false, direct_arm: false, dynamic_rotation: false,
  power: false, work_set: false, system_load: false,
  fallback: "Seated leg curl, or a band-resisted prone curl at the same sets and reserve. A Nordic or razor curl is NOT a like-for-like swap here — it is far more eccentric, and introducing it mid-block would add soreness that interferes with the Wednesday impact session. If you want one, bring it to a weekly review once running tolerance is established.",
  progression: "Two sets of eight at three reps in reserve. Add reps within the set before adding load; once both sets are comfortable at eight, take the smallest load step. Stop the set if you feel a sharp or pulling sensation rather than working effort — this exercise exists to protect the hamstring, and training it into soreness before a sprint day defeats the point.",
  execution_seconds: reduced ? 24 : 48,
});

function amendmentBlock(name, detail, items, indices, seconds, execution) {
  return {
    name, item_indices: indices, ramps: [], drills: [], detail,
    components_seconds: {
      execution, between_set_or_ramp_rest: 0, side_changes: 0,
      setup_and_load_changes: 0, transition: 0, rehearsal: 0,
      rehearsal_rest: 0, finish_recovery: 0, delay_reserve: 0,
    },
    rounding_buffer_seconds: seconds - execution,
    total_seconds: seconds,
  };
}

function applyAmendments(src) {
  const sessionOf = (w, d) => src.sessions.find((s) => s.week === w && s.day === d);
  const impactOf = (w, d) => src.impact_sessions.find((s) => s.week === w && s.day === d);

  for (let w = 1; w <= 12; w++) {
    const reduced = REDUCED_WEEKS.has(w);

    /* ── A1 · Monday: knee-flexion hamstring + calf ─────────────────────────── */
    {
      const s = sessionOf(w, "monday");
      const ham = hamstringItem(reduced), calf = calfItem(reduced);
      const i0 = s.items.length;
      s.items.push(ham, calf);
      // 2×8 curls at 3 s/rep + one 90 s rest + setup; 2×12 raises at 2 s/rep + one
      // 60 s rest + setup. Reduced weeks run one set of each and no interset rest.
      const secs = reduced ? 180 : 330;
      const exec = ham.execution_seconds + calf.execution_seconds;
      s.timeline.push(amendmentBlock(
        "Hamstring and calf",
        "Added after review: the block prescribes pogos, hurdle hops and accelerations while the calf had no direct work and the hamstring twelve reps a week. Knee-flexion work here because Monday's deadlift is hip-extension. Full rest between sets; this is protective preparation, not a set to chase.",
        s.items, [i0, i0 + 1], secs, exec));
      s.total_seconds += secs;
      s.minutes = Math.round((s.total_seconds / 60) * 100) / 100;
    }

    /* ── A1 · Friday: double the existing hinge, and add calf ───────────────── */
    friday: {
      const s = sessionOf(w, "friday");
      const slrdl = s.items.find((i) => i.exercise === "Supported dumbbell single-leg RDL");
      let added = 0;
      if (slrdl && !reduced && slrdl.sets === 1) {
        slrdl.sets = 2;
        slrdl.purpose = "Hip-extension hamstring capacity ahead of the accelerations, at a dose that can actually protect the tissue";
        // one more pair: 6 reps/side at 3 s + a 20 s side change + one 90 s rest
        const blk = s.timeline.find((b) => b.name === "Additional leg accessory");
        if (blk) {
          blk.components_seconds.execution += 36;
          blk.components_seconds.side_changes += 20;
          blk.components_seconds.between_set_or_ramp_rest += 90;
          blk.total_seconds += 150;
          blk.detail += " Second pair added after review: one set of six per side is not a protective hamstring dose in a block that introduces sprinting.";
          added += 150;
        }
      }
      // Week-12 Friday is three maximal strength tests. Nothing gets added in
      // front of them — not even two minutes of calf raises.
      if (w === 12) break friday;
      const calf = calfItem(reduced);
      const i0 = s.items.length;
      s.items.push(calf);
      const secs = reduced ? 90 : 150;
      s.timeline.push(amendmentBlock(
        "Calf",
        "Added after review. The plantarflexors and Achilles take the dominant load in pogos and acceleration and had no direct preparation anywhere in the block.",
        s.items, [i0], secs, calf.execution_seconds));
      added += secs;
      s.total_seconds += added;
      s.minutes = Math.round((s.total_seconds / 60) * 100) / 100;
    }
  }

  /* ── A2 · the dip ladder's last step ──────────────────────────────────────── */
  {
    const s = sessionOf(11, "sunday");
    const back = s.items.find((i) => i.exercise === "Weighted dip back-offs");
    if (!back || back.load !== 47.5) throw new Error("A2: week-11 dip back-off not where expected");
    back.reps = "6"; back.reps_max = 6;
    back.purpose = "Rep capacity toward the six-rep target — the last six-rep exposure before the test, so the test is a 2.5 lb step like every other";
    // three extra reps at 4 s
    const blk = s.timeline.find((b) => b.name === "Dip work");
    if (blk) { blk.components_seconds.execution += 12; blk.total_seconds += 12; s.total_seconds += 12; }
    s.minutes = Math.round((s.total_seconds / 60) * 100) / 100;
  }

  /* ── A3 · remove the broad-jump measurement ───────────────────────────────── */
  for (const w of [1, 12]) {
    const im = impactOf(w, "friday");
    im.events = im.events.filter((e) =>
      !/Standing broad jump measurement/i.test(e.name) && !/Broad-jump rehearsals/i.test(e.name));
    im.high = 0; im.moderate = 0; im.test = false;
    im.base_seconds = im.events.reduce((a, e) => a + e.seconds, 0);
    im.available_travel_and_extra_prep_seconds = im.cap_seconds - im.base_seconds;
    im.selection_rule = "No measurement this week. Preserve full preparation and the low-tier dose; if the clock binds, cut contacts rather than preparation, and log the smaller actual dose. A reduced dose does not qualify a larger one.";
  }
  {
    // Week 1 takes the same power movement weeks 2-4 use, so the Friday power slot
    // survives the loss of the jump.
    const s1 = sessionOf(1, "friday");
    const src2 = sessionOf(2, "friday");
    const idx = s1.items.findIndex((i) => /broad jump/i.test(i.exercise));
    const donor = src2.items.find((i) => i.exercise === "Double-kettlebell clean");
    if (idx < 0 || !donor) throw new Error("A3: week-1 Friday power swap failed");
    s1.items[idx] = JSON.parse(JSON.stringify(donor));
    // it moves from the impact clock onto the strength clock, and needs its block
    const donorBlk = src2.timeline.find((b) => b.name === "Daily power");
    const blk = JSON.parse(JSON.stringify(donorBlk));
    blk.item_indices = [idx];
    s1.timeline.splice(1, 0, blk);
    s1.total_seconds += blk.total_seconds;
    s1.minutes = Math.round((s1.total_seconds / 60) * 100) / 100;
  }
  {
    // Week 12 Friday carries no power work. Three maximal strength tests are the
    // session; nothing belongs in front of them.
    const s = sessionOf(12, "friday");
    const idx = s.items.findIndex((i) => /broad jump/i.test(i.exercise));
    if (idx < 0) throw new Error("A3: week-12 Friday jump not found");
    s.items.splice(idx, 1);
    s.timeline.forEach((b) => {
      b.item_indices = b.item_indices.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i));
    });
  }

  /* ── the audit is now stale; recompute it from the amended rows ───────────── */
  for (const a of src.weekly_audit) {
    const items = src.sessions.filter((s) => s.week === a.week)
      .flatMap((s) => s.items.map((i) => ({ ...i, day: s.day })));
    const daysOf = (k) => new Set(items.filter((i) => i[k]).map((i) => i.day)).size;
    a.lower_days = daysOf("lower_strength");
    a.shoulder_days = daysOf("shoulder_health");
    a.abdominal_days = daysOf("direct_abdominal");
    a.unilateral_days = daysOf("unilateral");
    a.power_days = daysOf("power");
    a.carry_days = new Set(items.filter((i) => i.family === "carry").map((i) => i.day)).size;
  }
  return src;
}

applyAmendments(src);
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
  /* The broad-jump target was withdrawn after review (coaching amendment A3): the
     prescribed dose was 18 maximal attempts across the block with high-tier contacts
     held flat, which could only have measured familiarisation. Three targets remain. */
  targets: {
    ohp: "125 × 2", dip: "+50 × 6", pullup: "+45 × 5",
  },
  /* §19 — work-set floors. Weeks 6 and 12 waive press / vertical / horizontal per
     approved resolution C09; the structural floors still hold in every week. */
  floors: {
    press: 18, vertical: 9, horizontal: 6, ratioMax: 1.3,
    lower: 2, shoulder: 3, abs: 4, biceps: 4, carry: 2, unilateral: 4,
    /* Four power days in weeks 1–11. Week 12 Friday carries none by design — the
       session is three maximal tests and nothing belongs in front of them. */
    power: 4,
  },
  /* §13 — per-session running ceilings. */
  runCeiling: { accelM: 60, totalM: 120 },
  /* §12 — high-tier contacts per week outside the two measurement weeks. */
  highContactCap: 6,
  /* The approved authority updates. Strength time is a GUIDELINE in this block, not
     the hard cap it was in v3: week-12 Friday is deliberately 94 minutes of testing.
     The impact clocks are hard caps, and they differ by day. */
  strengthGuidelineMinutes: 75,
  /* Amendments A1 pushed fourteen ordinary sessions to 78–78.5 min. The plan's §20
     is explicit that this is "above the suggestion, not automatically a failure" —
     but it is a real cost, so the app shows it and test.mjs caps it at 80. */
  strengthCeilingMinutes: 80,
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
