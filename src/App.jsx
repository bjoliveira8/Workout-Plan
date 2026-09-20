import { useState, useEffect, useRef } from "react";

/* ═══════════ PROGRAM DATA — Astra Concurrent Block v2.0-w1 ═══════════
   Source of truth: docs/12-week-concurrent-block.md
   WAVE below is the SINGLE edit point for every load in the block.
   Entry shapes:  { s, r, l, rl? }                      → s sets × r reps @ l
                  { top:{s,r,l}, back:{s,r,l}, rl? }    → top set then back-offs
                  null                                   → exercise off this week      */

const BLOCK_VERSION = "v2.0-w1";
// Stamped into every saved bundle. A bundle WITHOUT this id was written by the previous
// program (Press-Priority v1.3) and its training data must not bleed into this block —
// `mon/suitcase` and `fri/squat` are the same ids in both programs, so an old Friday
// back-squat log would otherwise appear as this block's low-bar squat, and as "LAST WK".
const PROGRAM_ID = "astra-concurrent-v2";
// Provisional e1RMs from §5.4 (low-rep derived). Dip/pull-up are EXTERNAL load.
const RM = { ohp: 129, bench: 220, squat: 265, dl: 500, dip: 85, pullup: 72 };
const BW = 170; // bodyweight anchor for total-system-load readouts

const WAVE = {
  /* ── Wednesday: strict OHP priority (block priority 1) ── */
  ohp: {
    1:  { top:null, back:{s:3,r:3,l:105}, calib:true },
    2:  { top:{s:1,r:3,l:112.5}, back:{s:3,r:3,l:105} },
    3:  { top:{s:1,r:3,l:112.5}, back:{s:3,r:3,l:105} },
    4:  { top:{s:1,r:3,l:115},   back:{s:3,r:3,l:107.5} },
    5:  { top:{s:1,r:3,l:115},   back:{s:3,r:3,l:107.5} },
    6:  { top:{s:1,r:3,l:97.5},  back:{s:1,r:3,l:90} },
    7:  { top:{s:1,r:2,l:120},   back:{s:3,r:2,l:110} },
    8:  { top:{s:1,r:2,l:120},   back:{s:3,r:2,l:110} },
    9:  { top:{s:1,r:2,l:122.5}, back:{s:3,r:2,l:112.5} },
    10: { top:{s:1,r:2,l:122.5}, back:{s:3,r:2,l:112.5} },
    11: { top:{s:1,r:2,l:125},   back:{s:3,r:2,l:115} },
    12: null, // week-12 Wednesday is the test session
  },
  /* ── Monday: OHP technical exposure (3rd weekly exposure, first item cut) ── */
  ohptech: {
    1:{s:3,r:3,l:85}, 2:{s:3,r:3,l:90}, 3:{s:3,r:3,l:90}, 4:{s:3,r:3,l:92.5}, 5:{s:3,r:3,l:92.5},
    6:null, 7:{s:2,r:3,l:95}, 8:{s:2,r:3,l:95}, 9:{s:2,r:3,l:97.5}, 10:{s:2,r:3,l:97.5},
    11:{s:2,r:3,l:100}, 12:null,
  },
  /* ── Sunday: weighted dip, heavy (block priority 2) ── */
  dip: {
    1:  { top:{s:1,r:6,l:37.5}, back:{s:3,r:6,l:22.5} },
    2:  { top:{s:1,r:6,l:40},   back:{s:3,r:6,l:25} },
    3:  { top:{s:1,r:6,l:40},   back:{s:3,r:6,l:25} },
    4:  { top:{s:1,r:6,l:42.5}, back:{s:3,r:6,l:27.5} },
    5:  { top:{s:1,r:6,l:42.5}, back:{s:3,r:6,l:27.5} },
    6:  { top:{s:1,r:5,l:25},   back:{s:1,r:5,l:15} },
    7:  { top:{s:1,r:5,l:45},   back:{s:3,r:5,l:30} },
    8:  { top:{s:1,r:5,l:45},   back:{s:3,r:5,l:30} },
    9:  { top:{s:1,r:5,l:47.5}, back:{s:3,r:5,l:32.5} },
    10: { top:{s:1,r:5,l:47.5}, back:{s:3,r:5,l:32.5} },
    11: { top:{s:1,r:5,l:50},   back:{s:3,r:5,l:35} },
    12: { s:2, r:4, l:20 }, // technique only
  },
  /* ── Friday: weighted dip, volume (antagonist-supersetted with pull-ups) ── */
  dipvol: {
    1:{s:3,r:7,l:17.5,rl:"6–8"}, 2:{s:3,r:7,l:20,rl:"6–8"}, 3:{s:3,r:7,l:20,rl:"6–8"},
    4:{s:3,r:7,l:22.5,rl:"6–8"}, 5:{s:3,r:7,l:22.5,rl:"6–8"}, 6:{s:2,r:6,l:10},
    7:{s:3,r:6,l:25}, 8:{s:3,r:6,l:25}, 9:{s:3,r:6,l:27.5}, 10:{s:3,r:6,l:27.5},
    11:{s:3,r:6,l:30}, 12:{s:2,r:6,l:20},
  },
  /* ── Monday: weighted neutral-grip pull-up, heavy (block priority 3) ── */
  pullup: {
    1:  { top:{s:1,r:5,l:32.5}, back:{s:3,r:5,l:22.5} },
    2:  { top:{s:1,r:5,l:35},   back:{s:3,r:5,l:25} },
    3:  { top:{s:1,r:5,l:35},   back:{s:3,r:5,l:25} },
    4:  { top:{s:1,r:5,l:37.5}, back:{s:3,r:5,l:27.5} },
    5:  { top:{s:1,r:5,l:37.5}, back:{s:3,r:5,l:27.5} },
    6:  { top:{s:1,r:4,l:20},   back:{s:1,r:4,l:12.5} },
    7:  { top:{s:1,r:4,l:40},   back:{s:3,r:4,l:30} },
    8:  { top:{s:1,r:4,l:40},   back:{s:3,r:4,l:30} },
    9:  { top:{s:1,r:4,l:42.5}, back:{s:3,r:4,l:32.5} },
    10: { top:{s:1,r:4,l:42.5}, back:{s:3,r:4,l:32.5} },
    11: { top:{s:1,r:4,l:45},   back:{s:3,r:4,l:35} },
    12: { s:2, r:4, l:20 }, // technique only
  },
  /* ── Wednesday: pull-up volume ── */
  pullupvol: {
    1:{s:4,r:5,l:17.5,rl:"5–6"}, 2:{s:4,r:5,l:20,rl:"5–6"}, 3:{s:4,r:5,l:20,rl:"5–6"},
    4:{s:4,r:5,l:22.5,rl:"5–6"}, 5:{s:4,r:5,l:22.5,rl:"5–6"}, 6:{s:2,r:5,l:10},
    7:{s:4,r:5,l:25}, 8:{s:4,r:5,l:25}, 9:{s:4,r:5,l:27.5}, 10:{s:4,r:5,l:27.5},
    11:{s:4,r:5,l:30}, 12:null,
  },
  /* ── Friday: pull-up, supersetted into the dip rest ── */
  pullupss: {
    1:{s:2,r:6,l:10}, 2:{s:2,r:6,l:10}, 3:{s:2,r:6,l:10}, 4:{s:2,r:6,l:10}, 5:{s:2,r:6,l:10},
    6:{s:1,r:6,l:0}, 7:{s:2,r:6,l:15}, 8:{s:2,r:6,l:15}, 9:{s:2,r:6,l:15}, 10:{s:2,r:6,l:15},
    11:{s:2,r:6,l:15}, 12:null,
  },
  /* ── Sunday: paused bench (priority 5 — progresses only while OHP and dips are intact) ── */
  bench: {
    1:{s:3,r:3,l:180}, 2:{s:3,r:3,l:180}, 3:{s:3,r:3,l:185}, 4:{s:3,r:3,l:185},
    5:{s:3,r:3,l:190}, 6:{s:2,r:3,l:155}, 7:{s:3,r:2,l:195}, 8:{s:3,r:2,l:195},
    9:{s:3,r:2,l:200}, 10:{s:3,r:2,l:200}, 11:{s:3,r:2,l:205}, 12:{s:2,r:3,l:165},
  },
  /* ── Friday: low-bar squat (volume held low — Friday's elastic work outranks it) ── */
  squat: {
    1:{s:3,r:3,l:225}, 2:{s:3,r:3,l:225}, 3:{s:3,r:3,l:225}, 4:{s:3,r:3,l:230},
    5:{s:3,r:3,l:230}, 6:{s:2,r:3,l:195}, 7:{s:3,r:2,l:235}, 8:{s:3,r:2,l:235},
    9:{s:3,r:2,l:235}, 10:{s:3,r:2,l:240}, 11:{s:3,r:2,l:240}, 12:{s:2,r:3,l:185},
  },
  /* ── Monday: conventional deadlift — maintenance, fixed weekday, 12 exposures ── */
  dl: {
    1:{s:2,r:2,l:420}, 2:{s:2,r:2,l:435}, 3:{s:2,r:2,l:450}, 4:{s:3,r:2,l:420},
    5:{s:2,r:2,l:450}, 6:{s:2,r:2,l:365}, 7:{s:2,r:2,l:430}, 8:{s:2,r:2,l:450},
    9:{s:3,r:2,l:425}, 10:{s:2,r:2,l:455}, 11:{s:2,r:2,l:450}, 12:{s:2,r:2,l:365},
  },
  /* ── Wednesday: secondary pressing volume ── */
  incline: {
    1:{s:2,r:9,l:50,rl:"8–10"}, 2:{s:2,r:9,l:50,rl:"8–10"}, 3:{s:2,r:9,l:50,rl:"8–10"},
    4:{s:2,r:9,l:50,rl:"8–10"}, 5:{s:2,r:9,l:55,rl:"8–10"}, 6:null,
    7:{s:2,r:9,l:55,rl:"8–10"}, 8:{s:2,r:9,l:55,rl:"8–10"}, 9:{s:2,r:9,l:55,rl:"8–10"},
    10:{s:2,r:9,l:60,rl:"8–10"}, 11:{s:2,r:9,l:60,rl:"8–10"}, 12:null,
  },
};

/* ── Copenhagen adduction ladder (§5.10). Lever length is the load variable and moves alone. ── */
const COPEN = {
  1:{lever:"Short lever · knee supported", s:3, r:6},  2:{lever:"Short lever · knee supported", s:3, r:7},
  3:{lever:"Short lever · knee supported", s:3, r:8},  4:{lever:"Mid lever · support at mid-shin", s:3, r:6},
  5:{lever:"Mid lever · support at mid-shin", s:3, r:7}, 6:{lever:"Short lever · deload", s:2, r:6},
  7:{lever:"Mid lever · support at mid-shin", s:3, r:8}, 8:{lever:"Long lever · support at the ankle", s:3, r:6},
  9:{lever:"Long lever · support at the ankle", s:3, r:7}, 10:{lever:"Long lever · support at the ankle", s:3, r:8},
  11:{lever:"Long lever · support at the ankle", s:3, r:8}, 12:{lever:"Short lever · deload", s:2, r:6},
};
const COPEN_GATE = { 4:"Advance to mid lever only if weeks 1–3 adductor checks were all normal.", 8:"Advance to long lever only if weeks 4–7 adductor checks were all normal." };

/* ── Plyometric contacts by tier and session (§5.8). Counted per limb on unilateral work. ── */
const PLYO = {
  1:  { mon:{t1:20}, wed:{t1:25,t2:12}, fri:{t1:25,t2:8,t3:0} },
  2:  { mon:{t1:24}, wed:{t1:28,t2:15}, fri:{t1:28,t2:8,t3:0} },
  3:  { mon:{t1:28}, wed:{t1:32,t2:18}, fri:{t1:32,t2:8,t3:0} },
  4:  { mon:{t1:30}, wed:{t1:35,t2:21}, fri:{t1:35,t2:8,t3:0} },
  5:  { mon:{t1:30}, wed:{t1:35,t2:21}, fri:{t1:35,t2:8,t3:20} },
  6:  { mon:{t1:15}, wed:{t1:20},       fri:{t1:15} },
  7:  { mon:{t1:28}, wed:{t1:35,t2:21}, fri:{t1:32,t2:8,t3:20} },
  8:  { mon:{t1:30}, wed:{t1:35,t2:24}, fri:{t1:35,t2:9,t3:23} },
  9:  { mon:{t1:30}, wed:{t1:40,t2:26}, fri:{t1:35,t2:10,t3:23} },
  10: { mon:{t1:30}, wed:{t1:40,t2:29}, fri:{t1:35,t2:10,t3:26} },
  11: { mon:{t1:30}, wed:{t1:40,t2:26}, fri:{t1:30,t2:10,t3:26} },
  12: { mon:{t1:20}, wed:{},            fri:{t1:25} },
};
const TIER_NAME = { t1:"Tier 1 · low", t2:"Tier 2 · moderate", t3:"Tier 3 · high" };
const TIER_EX = {
  t1: "Pogo hops · ankle hops · line hops · A-skips · fast skips. Low amplitude, quiet contacts.",
  t2: "Low hurdle hops 12in · submax broad jumps 75–80% · split jumps (wk4+) · single-leg hops in place (wk8+, count per limb) · low-amplitude A-bounds (wk9+).",
  t3: "Depth jump — step off, land tall, one clean contact, step down from the box.",
};
/* Tier 3 changes ONE variable per step (§5.8). */
const TIER3_RX = {
  5:"Depth jump 12 in · 5 × 4", 7:"Depth jump 12 in · 5 × 4 (restore)", 8:"Depth jump 12 in · 5 × 4 + 1 × 3",
  9:"Depth jump 15 in · 5 × 4 + 1 × 3 (height only)", 10:"Depth jump 15 in · 6 × 4 + 1 × 2 (volume only)",
  11:"Depth jump 15 in · 5 × 4, then 6 maximal broad jumps in the test format",
};
const FRI_SEQUENCE = [
  "Adductor isometric squeeze 3 × 20 s",
  "Tier 1 ramp",
  "Tier 2 — opening block",
  "Tier 3 (from week 5)",
  "Acceleration reps — next card",
  "Tier 2 — closing block",
];

/* ── Running and acceleration ladder (§5.9). Ceiling: 250 m of quality volume per session. ── */
const SPRINT = {
  1:  { surface:"Hill ~5%", reps:4, dist:15, label:"4 × 15 m", intensity:"Build, not maximal", rest:150, m:60 },
  2:  { surface:"Hill ~5%", reps:5, dist:15, label:"5 × 15 m", intensity:"Build", rest:150, m:75 },
  3:  { surface:"Hill ~5%", reps:6, dist:15, label:"6 × 15 m", intensity:"Build", rest:150, m:90 },
  4:  { surface:"Hill ~5%", reps:6, dist:20, label:"6 × 20 m", intensity:"Build", rest:150, m:120 },
  5:  { surface:"Hill ~5%", reps:6, dist:25, label:"6 × 25 m", intensity:"Build", rest:210, m:150 },
  6:  { surface:"Hill ~5%", reps:3, dist:15, label:"3 × 15 m", intensity:"Submaximal — technique only", rest:180, m:45 },
  7:  { surface:"Flat, then hill", reps:8, dist:20, label:"4 × 20 m flat + 4 × 20 m hill", intensity:"Flat builds to 80%", rest:150, m:160 },
  8:  { surface:"Flat", reps:5, dist:25, label:"5 × 25 m", intensity:"85%", rest:210, m:125 },
  9:  { surface:"Flat", reps:5, dist:30, label:"5 × 30 m", intensity:"85–90%", rest:210, m:150 },
  10: { surface:"Flat", reps:6, dist:30, label:"6 × 30 m", intensity:"90%", rest:210, m:180 },
  11: { surface:"Flat", reps:7, dist:30, label:"5 × 30 m + 2 × 40 m", intensity:"90–95%", rest:210, m:230 },
  12: { surface:"Flat", reps:2, dist:30, label:"2 × 30 m", intensity:"Submaximal", rest:180, m:60 },
};
const SPRINT_CEILING = 250;

const REDUCED = new Set([6, 12]);
const BADGE = { 1:"Calibration", 5:"Tier 3 enters", 6:"Deload", 7:"Flat sprints enter", 11:"Peak · rehearsal", 12:"Deload · Test" };
const PHASE = (w) => (w === 1 ? "Calibration" : w === 6 ? "Deload" : w === 12 ? "Deload + Test" : w <= 5 ? "Accumulation" : "Intensification");
const INTENSITY = [72, 78, 82, 85, 88, 60, 84, 88, 91, 93, 95, 62];
/* Phase RIR floor — a set below this is flagged (§5.12 effort rules). */
const RIR_FLOOR = (w) => (w === 6 || w === 12 ? 4 : w <= 5 ? 2 : 1);
const TARGET_RIR = (w) => (w === 6 || w === 12 ? "4+" : w <= 5 ? "2–3" : "1–2");

const CUT_LABEL = { never:"never-cut", second:"cut-2nd", first:"cut-1st" };

const DAYS = [
  { id:"sun", lift:"Dip", title:"Pressing volume & horizontal pull", budget:{ warm:14, pri:34, acc:16, fin:6 },
    objective:"Deliver the week's largest pressing dose on the one day where prior cycling cannot reach the working muscles.",
    exercises:[
    { id:"primer", kind:"primer", name:"DFW Primer", tag:"primer", cut:"first", rounds:3, press:true,
      cue:"Three rounds on a 60-second clock. Press component retained — today's priority is a dip, not an overhead press.", alt:null },
    { id:"dip", kind:"main", wave:"dip", rm:"dip", plus:true, name:"Weighted Dip", tag:"main lift", cut:"never", unit:"reps",
      ramp:[["BW",8],[15,5],[25,3]],
      cue:"Fresh slot. Deep ROM below 90° at the elbow, controlled lockout. The heavy outcome is a clean set with reserve — never a max attempt.", alt:"Close-Grip Bench Press" },
    { id:"bench", kind:"main", wave:"bench", rm:"bench", bar:true, name:"Paused Bench Press", tag:"press", cut:"second", unit:"reps",
      cue:"Full stop, bar motionless on the chest. Identical setup every week. Progresses only while OHP and dips are intact.", alt:"Close-Grip Bench Press" },
    { id:"row1", name:"Chest-Supported Row", tag:"row", cut:"second", sets:3, reps:"8–10", load:"select for 2 RIR", unit:"reps",
      cue:"Half the week's horizontal pulling floor. Chest stays on the pad — no body english.", alt:"T-Bar Row" },
    { id:"revflye", name:"DB Reverse Flye", tag:"shoulder health", cut:"never", sets:2, reps:"12–15", load:"15–20 lb", loadNum:17.5, unit:"reps", keepOnDeload:true,
      cue:"Shoulder-health floor, session 1 of 4. Low load, 0–1 RIR. Last item cut in this session.", alt:"Rope Face Pull" },
    { id:"lat1", name:"DB Lateral Raise", tag:"delt", cut:"first", sets:2, reps:"12–15", load:"15–20 lb", loadNum:17.5, unit:"reps",
      cue:"Direct delt work. Flexible floor — first item cut when time runs short.", alt:"Cable Lateral Raise" },
    { id:"abwheel", name:"Ab-Wheel Rollout", tag:"core", cut:"second", sets:2, reps:"8–10", load:"BW", unit:"reps",
      cue:"Direct abdominal session 1 of 3. Ribs down, no lumbar sag.", alt:"Hanging Leg Raise" },
    { id:"farmer", name:"Farmer Carry", tag:"carry", cut:"second", sets:2, reps:"40", load:"2 × 32 kg", unit:"m",
      cue:"Carry exposure 1 of 2. Tall posture, crush the handles.", alt:"Heavy DB Carry" },
  ]},

  { id:"mon", lift:"Deadlift", title:"Deadlift & vertical pull", budget:{ warm:14, pri:38, acc:16, fin:5 },
    objective:"One clean heavy conventional pull and the week's heaviest loaded pull-up, with enough grip recovery between them.",
    exercises:[
    { id:"elastic", kind:"elastic", name:"Elastic Block", tag:"plyometric", cut:"never",
      cue:"Tier 1 only, ~6 min, before the warm-up. Monday is ~30 h after the long ride and cannot produce quality elastic output — this is tissue conditioning. Stop if contact time visibly lengthens." },
    { id:"primer", kind:"primer", name:"DFW Primer", tag:"primer", cut:"first", rounds:3, press:true,
      cue:"Full three rounds. The front squats are trivial by design and do not count toward the lower-body audit." },
    { id:"dl", kind:"main", wave:"dl", rm:"dl", bar:true, name:"Conventional Deadlift", tag:"main lift", cut:"never", unit:"reps",
      cue:"Fresh slot. Crisp singles or doubles at RPE 7–8, never ground. Hook or alternating mixed grip — no straps. Stop the set on the first slow rep.", alt:"Trap-Bar Deadlift" },
    { id:"pullup", kind:"main", wave:"pullup", rm:"pullup", plus:true, name:"Weighted NG Pull-Up", tag:"main lift", cut:"never", unit:"reps",
      ramp:[["BW",5],[15,3]],
      cue:"Standardised for the whole block: parallel neutral handles at shoulder width, full dead hang, collarbone level with the bar, belt in the same position.", alt:"Neutral-Grip Lat Pulldown" },
    { id:"ohptech", kind:"main", wave:"ohptech", rm:"ohp", bar:true, ramp:[[45,6],[65,3]], name:"Strict OHP — Technical", tag:"press", cut:"first", unit:"reps",
      cue:"Third weekly OHP exposure at a load that costs nothing. Rehearse the settled start. FIRST item cut under any fatigue adjustment.", alt:"Pin Press (approved trigger only)" },
    { id:"copen", kind:"copen", name:"Copenhagen Adduction", tag:"prophylactic", cut:"never", unit:"per side", keepOnDeload:true,
      cue:"Mandatory hard floor, twice weekly. Hips driven up until the body is straight, lowered under control. Counts toward the unilateral lower-body floor." },
    { id:"extrot", name:"Band External Rotation", tag:"shoulder health", cut:"never", sets:2, reps:"12–15", load:"light", unit:"reps", keepOnDeload:true,
      cue:"Shoulder-health floor, session 2 of 4. Elbow pinned to the ribs, slow return.", alt:"Cable External Rotation" },
    { id:"lat2", name:"DB Lateral Raise", tag:"delt", cut:"first", sets:1, reps:"15", load:"15 lb", loadNum:15, unit:"reps",
      cue:"Direct delt work, supersetted into the rotation rest.", alt:"Cable Lateral Raise" },
    { id:"suitcase", name:"Suitcase Carry", tag:"carry", cut:"second", sets:2, reps:"40", load:"40 kg", unit:"m/side",
      cue:"Carry exposure 2 of 2 and the week's anti-lateral-flexion exposure. Level hips.", alt:"Offset Front-Rack Carry" },
    { id:"addcheck", kind:"check", name:"Adductor Check", tag:"gate", cut:"never",
      cue:"Run after the session and again the following morning. Normal means no new sensation beyond familiar post-training soreness." },
  ]},

  { id:"wed", lift:"OHP", title:"Overhead press priority", budget:{ warm:14, pri:38, acc:16, fin:5 },
    objective:"Put the block's first-priority lift in the freshest slot of the freshest upper-body day, with nothing ahead of it that costs the shoulder.",
    exercises:[
    { id:"elastic", kind:"elastic", name:"Elastic Block", tag:"plyometric", cut:"never",
      cue:"Tiers 1 then 2, ~14 min, before the warm-up. Bilateral before unilateral, low amplitude before high intensity." },
    { id:"primer", kind:"primer", name:"DFW Primer — reduced", tag:"primer", cut:"first", rounds:2, press:false,
      cue:"OHP-priority day: two rounds, press component DROPPED, so the day's top lift is not pre-fatigued. Omit entirely if the first OHP ramp set feels heavier than last week." },
    { id:"ohp", kind:"main", wave:"ohp", rm:"ohp", bar:true, name:"Strict OHP", tag:"main lift", cut:"never", unit:"reps",
      cue:"Fresh slot, block priority 1. No knee dip, hip drive, rebound, or push-press initiation. Locked knees, controlled settled start, repeatable finish.", alt:"Pin Press (approved trigger only)" },
    { id:"pullupvol", kind:"main", wave:"pullupvol", rm:"pullup", plus:true, name:"Weighted NG Pull-Up — Volume", tag:"main lift", cut:"never", unit:"reps",
      ramp:[["BW",5]],
      cue:"Volume exposure at a load that leaves Monday's heavy session intact. Same standard: dead hang, collarbone to bar.", alt:"Neutral-Grip Lat Pulldown" },
    { id:"row2", name:"Chest-Supported Row", tag:"row", cut:"second", sets:3, reps:"8–10", load:"select for 2 RIR", unit:"reps",
      cue:"Second half of the horizontal pulling floor.", alt:"Seal Row" },
    { id:"ohshrug", name:"Barbell Overhead Shrug", tag:"shoulder health", cut:"never", sets:2, reps:"10–12", load:"65–95 lb", loadNum:75, unit:"reps", keepOnDeload:true,
      cue:"Scapular upward rotation. Shoulder-health floor, session 3 of 4.", alt:"Wall Slide with Lift-Off" },
    { id:"incline", kind:"main", wave:"incline", name:"Incline DB Press", tag:"press", cut:"first", unit:"reps",
      cue:"Secondary pressing volume toward the 16–20 floor. Second item in the design-time cut order.", alt:"Landmine Press" },
    { id:"lat3", name:"DB Lateral Raise", tag:"delt", cut:"first", sets:1, reps:"15", load:"15 lb", loadNum:15, unit:"reps",
      cue:"Direct delt work, supersetted.", alt:"Cable Lateral Raise" },
    { id:"hlr", name:"Hanging Leg Raise", tag:"core", cut:"second", sets:2, reps:"10–12", load:"BW", unit:"reps",
      cue:"Direct abdominal session 2 of 3. No swing.", alt:"Ab-Wheel Rollout" },
    { id:"addcheck", kind:"check", name:"Adductor Check", tag:"gate", cut:"never",
      cue:"Run after the session and again the following morning." },
  ]},

  { id:"fri", lift:"Squat", title:"Squat & dip volume", budget:{ warm:14, pri:38, acc:16, fin:5 },
    objective:"Concentrate every high-quality lower-body demand of the week into one day, in descending order of neural cost, then take the squat afterwards.",
    exercises:[
    { id:"elastic", kind:"elastic", name:"Elastic Block", tag:"plyometric", cut:"never",
      cue:"The freshest lower-body day of the week carries the highest-quality elastic work. Follow the sequence exactly — tier 3 sits ahead of the sprints because depth jumps cost little, while a sprint rep on legs that already took 40 moderate contacts is the higher-risk arrangement." },
    { id:"sprint", kind:"sprint", name:"Acceleration", tag:"acceleration", cut:"never",
      cue:"Quality collapses before you notice it. TWO stop rules, either ends the session: the first rep that feels laboured out of the first three steps, or any rep obviously slower than the one before it." },
    { id:"squat", kind:"main", wave:"squat", rm:"squat", bar:true, name:"Low-Bar Back Squat", tag:"main lift", cut:"never", unit:"reps",
      cue:"Fresh slot of the strength session. At or below parallel every rep — depth consistency matters more than load in this block. Volume stays low by design.", alt:"Front Squat (about −20%)" },
    { id:"dipvol", kind:"main", wave:"dipvol", rm:"dip", plus:true, name:"Weighted Dip — Volume", tag:"press", cut:"never", unit:"reps",
      ramp:[["BW",8],[15,5]],
      cue:"Second dip exposure of the week, submaximal. Antagonist-supersetted with the pull-ups below — that pairing is this session's time budget.", alt:"Close-Grip Bench Press" },
    { id:"pullupss", kind:"main", wave:"pullupss", rm:"pullup", plus:true, name:"NG Pull-Up — Superset", tag:"superset", cut:"never", unit:"reps",
      cue:"Rides inside the dip rest. Third vertical-pull exposure; keeps the press-to-pull ratio comfortable.", alt:"Neutral-Grip Lat Pulldown" },
    { id:"copen", kind:"copen", name:"Copenhagen Adduction", tag:"prophylactic", cut:"never", unit:"per side", keepOnDeload:true,
      cue:"Second mandatory session. Hard floor — never removed." },
    { id:"facepull", name:"Rope Face Pull", tag:"shoulder health", cut:"never", sets:2, reps:"12–15", load:"light", unit:"reps", keepOnDeload:true,
      cue:"Shoulder-health floor, session 4 of 4. High elbows, pull to the forehead.", alt:"Prone Y and T" },
    { id:"curl", name:"EZ-Bar Curl", tag:"arm", cut:"first", sets:2, reps:"10–12", load:"select for 1 RIR", unit:"reps",
      cue:"Direct arm work; flexible floor.", alt:"DB Hammer Curl" },
    { id:"tri", name:"Overhead Rope Triceps Extension", tag:"arm", cut:"first", sets:2, reps:"10–12", load:"select for 1 RIR", unit:"reps",
      cue:"Direct arm work; flexible floor. Cut with the curls.", alt:"Triceps Pushdown" },
    { id:"pallof", name:"Pallof Press", tag:"core", cut:"second", sets:2, reps:"10", load:"light", unit:"per side",
      cue:"Direct abdominal session 3 of 3 and the week's anti-rotation exposure. Ribs stacked, slow press-outs.", alt:"Band Anti-Rotation Press" },
    { id:"addcheck", kind:"check", name:"Adductor Check", tag:"gate", cut:"never",
      cue:"Run after the session and again the following morning. This is the gate on every running and tier progression." },
  ]},
];

const EX_INDEX = {};
DAYS.forEach(d => d.exercises.forEach(ex => { EX_INDEX[`${d.id}-${ex.id}`] = ex; }));

/* Rest in seconds. null = rests inside another lift's rest (supersetted). */
const REST = {
  "sun-dip":240, "sun-bench":180, "sun-row1":75, "sun-revflye":null, "sun-lat1":null, "sun-abwheel":45, "sun-farmer":60,
  "mon-dl":300, "mon-pullup":180, "mon-ohptech":90, "mon-copen":null, "mon-extrot":null, "mon-lat2":null, "mon-suitcase":60,
  "wed-ohp":210, "wed-pullupvol":180, "wed-row2":75, "wed-ohshrug":null, "wed-incline":90, "wed-lat3":null, "wed-hlr":45,
  "fri-squat":240, "fri-dipvol":150, "fri-pullupss":null, "fri-copen":60, "fri-facepull":null, "fri-curl":60, "fri-tri":null, "fri-pallof":45,
};

const WARMUP_MENU = {
  sun: ["Reason: 2–3 h in a flexed riding position leaves the hip flexors short and thoracic extension poor — the dip support position demands the opposite.",
        "90/90 hip switch ×6/side", "Half-kneeling hip-flexor stretch with posterior tilt ×30 s/side",
        "Thoracic extension over foam roller ×8 breaths", "Band pull-apart ×15", "Dip-bar support hold, scapulae depressed ×3 × 10 s"],
  mon: ["Reason: first hip hinge after a long ride and a pressing session — adductors and hamstrings need graded exposure before a 400+ lb pull.",
        "Adductor rock-back ×8/side", "Leg swing sagittal ×10/side, then frontal ×10/side",
        "Kettlebell deadlift 24 kg ×8", "Dead hang ×20 s", "Scapular pull-up ×8"],
  wed: ["Reason: the OHP limitation sits between chest and forehead — a mid-range force problem. The ramp must arrive there with the scapulae already upwardly rotated.",
        "Wall slide with lift-off ×8", "Band pull-apart ×15",
        "Half-kneeling bottoms-up KB press 8 kg ×5/side", "Thoracic extension over foam roller ×8 breaths"],
  fri: ["Reason: the elastic and sprint block already raised tissue temperature and neural drive — this only has to buy squat-specific range. Long femurs make ankle range the limiter, not the hip.",
        "Adductor rock-back ×8/side", "Ankle dorsiflexion wall mobilisation ×8/side",
        "Goblet squat 16 kg ×6", "Band pull-apart ×15"],
};

/* Week-12 Wednesday test session (§5.13). Order: power before strength, priority before secondary. */
const TESTS = [
  { id:"broad", lift:"Standing Broad Jump", rmKey:"broad", unit:"in", minutes:12,
    note:"3 build-up jumps at rising effort, then 3 measured attempts with full recovery. Same footwear and surface as week 1. Static two-foot start with arm swing; measure to the rearmost heel. Best of three.",
    attempts:[["build",1],["build",1],["build",1],["max",1],["max",1],["max",1]], target:"Week-1 baseline + 4 in" },
  { id:"ohptest", lift:"Strict OHP", rmKey:"ohp", unit:"reps", minutes:16,
    note:"Ramp, then one attempt at the standard. Stop on the first grindy rep — a grindy single is not a valid result, it is a miss.",
    attempts:[[45,6],[75,4],[95,3],[105,2],[115,1],[125,2]], target:"125 × 2 at ≤2 RIR" },
  { id:"diptest", lift:"Weighted Dip", rmKey:"dip", unit:"reps", minutes:12,
    note:"A rep that does not reach below 90° at the elbow is not counted.",
    attempts:[["BW",8],[20,5],[35,3],[50,6]], target:"+50 × 6 at ≤2 RIR" },
  { id:"putest", lift:"Weighted NG Pull-Up", rmKey:"pullup", unit:"reps", minutes:12,
    note:"Full dead hang start, collarbone level with the bar. Anything less is not counted.",
    attempts:[["BW",5],[20,3],[45,5]], target:"+45 × 5 at ≤2 RIR" },
];
const TEST_WEEK = 12, TEST_DAY = "wed";
const isTestSession = (w, d) => w === TEST_WEEK && d === TEST_DAY;

const WEEKDAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

/* Cycling placement — recommendations only. Ride content is never prescribed (§4 scope). */
const RIDE_NOTE = {
  sun: "AM: TrainerRoad long ride, ≥6 h before this session. If it overruns and the gap falls under 6 h the session still runs — apply the cut order and protect the fresh slot.",
  mon: "No ride today.",
  wed: "Tuesday's ride was ~34 h ago. No ride today.",
  fri: "Optional fourth ride goes AFTER this session, ≥4 h later, easy. It is the first thing removed when Friday sprint quality or squat bar speed declines.",
};

function sessionFocus(week, dayId) {
  if (week === 6) return "Deload. Everything at 4 RIR or easier, roughly half the sets, low-tier plyometrics only. Volume floors are waived this week by design — the deload is the program.";
  if (week === 12) return "Deload and test week. Technique only at 4 RIR or easier, no novel exercises. Wednesday is the test session.";
  const wk = {
    1:"Calibration week. Wednesday ramps to a single at RPE 7.5–8.5; Friday takes the broad-jump baseline. Everything else is a normal training week.",
    5:"Tier 3 enters on Friday — depth jumps from 12 in. It is the only new variable this week, so tiers 1 and 2 hold at week-4 volume.",
    7:"Intensification begins. Threes become twos on OHP, bench, and squat. First flat sprint exposure on Friday. Every elastic tier returns to a volume already tolerated.",
    8:"Copenhagen advances to the long lever — the largest single jump in the adductor progression.",
    11:"Peak. Every test load is rehearsed this week: OHP Wednesday, dip Sunday, pull-up Monday, maximal broad jumps Friday.",
  }[week];
  const base = {
    sun:"Post-ride day. Dip leads in the fresh slot; bench is secondary and yields first. No elastic work today — it follows a hard ride.",
    mon:"Deadlift is a maintenance exposure, not a target. Pull-up is the priority lift here; the OHP technical set is the first thing cut.",
    wed:"OHP owns the fresh slot. Nothing goes ahead of it. Incline press and lateral raises yield before anything else.",
    fri:"Elastic and sprints come first and get the fresh legs. Squat takes what is left — that ordering is deliberate and is not negotiable.",
  }[dayId];
  return wk ? `${wk} ${base}` : base;
}

/* ═══════════ THEMES ═══════════ */
const THEMES = {
  iron:     { name:"Iron",     v:{ bg:"#131518", panel:"#1a1d21", line:"#2a2e34", ink:"#ece9e2", muted:"#8d939c", accent:"#d9a441", accentDim:"#7a6230", onAccent:"#1a1405", slate:"#5e738a", warn:"#c07257", ok:"#7d9a6f", inputBg:"#101215", prevBg:"#14171b", mainBg:"#1c1b17", mainLine:"#4a3d1f", faint:"#4a4f56", barBg:"#33383f", barDim:"#272d36" } },
  chalk:    { name:"Chalk",    v:{ bg:"#f2efe7", panel:"#fbfaf6", line:"#dfd9cc", ink:"#26241f", muted:"#847d70", accent:"#b4552d", accentDim:"#d9b8a5", onAccent:"#fff6f0", slate:"#7d8ba0", warn:"#b0452e", ok:"#5c7d54", inputBg:"#ffffff", prevBg:"#eae6db", mainBg:"#faf4ec", mainLine:"#e0cdb2", faint:"#b3ab9c", barBg:"#cfc8b9", barDim:"#e0dacd" } },
  midnight: { name:"Midnight", v:{ bg:"#0e1420", panel:"#151d2c", line:"#243044", ink:"#e6ecf5", muted:"#8b9bb4", accent:"#5ea2ff", accentDim:"#2c5285", onAccent:"#04101f", slate:"#64748b", warn:"#e07856", ok:"#69b087", inputBg:"#0a0f18", prevBg:"#111927", mainBg:"#131c2e", mainLine:"#2a4a75", faint:"#45536b", barBg:"#2b3850", barDim:"#1c2536" } },
  crimson:  { name:"Crimson",  v:{ bg:"#141013", panel:"#1c1518", line:"#342229", ink:"#f0e8e6", muted:"#9a8a8c", accent:"#e05252", accentDim:"#7a3030", onAccent:"#1f0808", slate:"#8a7480", warn:"#d9a441", ok:"#7d9a6f", inputBg:"#100c0e", prevBg:"#191214", mainBg:"#201316", mainLine:"#4a2328", faint:"#55464b", barBg:"#3a2a30", barDim:"#291d22" } },
  mono:     { name:"Mono",     v:{ bg:"#0f0f0f", panel:"#171717", line:"#2b2b2b", ink:"#f2f2f2", muted:"#8f8f8f", accent:"#ffffff", accentDim:"#5a5a5a", onAccent:"#0f0f0f", slate:"#9a9a9a", warn:"#d46a6a", ok:"#c9c9c9", inputBg:"#0a0a0a", prevBg:"#131313", mainBg:"#191919", mainLine:"#3d3d3d", faint:"#4d4d4d", barBg:"#333333", barDim:"#222222" } },
};

/* ═══════════ ALERT TONES — iPhone-style, repeating, unmissable ═══════════ */
const TONES = { radar:"Radar", alarm:"Alarm", pulse:"Pulse", tritone:"Tri-Tone", sonar:"Sonar", silent:"Silent" };
function playTone(ctx, tone) {
  if (!ctx || tone === "silent") return;
  const t = ctx.currentTime;
  const note = (freq, start, dur, gain, type = "sine") => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, t + start);
    g.gain.exponentialRampToValueAtTime(gain, t + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t + start); o.stop(t + start + dur + 0.05);
  };
  switch (tone) {
    case "radar": // tight 4-blip clusters, repeated ×3 — the iPhone timer feel
      for (let grp = 0; grp < 3; grp++) {
        const base = grp * 0.62;
        for (let i = 0; i < 4; i++) { note(1250, base + i*0.085, 0.055, 0.65); note(2500, base + i*0.085, 0.04, 0.15); }
      }
      break;
    case "alarm": // classic insistent two-tone alarm clock
      for (let i = 0; i < 5; i++) { note(890, i*0.32, 0.14, 0.6, "square"); note(670, i*0.32 + 0.16, 0.14, 0.55, "square"); }
      break;
    case "pulse": // strong beacon pulses ×6
      for (let i = 0; i < 6; i++) { note(980, i*0.34, 0.19, 0.65, "triangle"); note(1960, i*0.34, 0.1, 0.18); }
      break;
    case "tritone": // ascending three-note alert, played twice
      [0, 0.9].forEach(base => { note(1046, base, 0.16, 0.6); note(1319, base + 0.17, 0.16, 0.62); note(1568, base + 0.34, 0.3, 0.65); });
      break;
    case "sonar": // deep ping with echo, ×3
      for (let i = 0; i < 3; i++) { const base = i * 0.85; note(520, base, 0.45, 0.6); note(1040, base, 0.2, 0.15); note(520, base + 0.28, 0.3, 0.22); }
      break;
    default: break;
  }
}

/* ═══════════ HELPERS ═══════════ */
const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const roundTo = (x, step) => Math.round(x/step)*step;
const fmtLb = (n) => (n == null ? "" : String(Math.round(n * 10) / 10));

// Barbell ramp. Dips and pull-ups carry an explicit `ramp` on the exercise instead,
// because their ladder is bodyweight-relative and does not scale off a percentage.
function generateWarmups(load, rmKey) {
  const isDl = rmKey === "dl", isOhp = rmKey === "ohp";
  const base = isDl ? 135 : 45, step = isOhp ? 2.5 : 5;
  const ladder = [ { w:base, r:isDl?5:8 }, { w:roundTo(load*0.55,step), r:5 }, { w:roundTo(load*0.75,step), r:3 }, { w:roundTo(load*0.9,step), r:1 } ];
  const out = [];
  for (const s of ladder) if (!out.length || s.w >= out[out.length-1].w + step*2) out.push(s);
  return out;
}
function plateMath(total) {
  let per = (total - 45) / 2;
  if (per <= 0) return "empty bar";
  const out = [];
  for (const p of [45,25,10,5,2.5,1.25]) { while (per >= p - 0.001) { out.push(p); per -= p; } }
  return out.length ? out.join(" · ") + " / side" : "empty bar";
}

/* getRx returns, for a given exercise and week:
     sets / repsLabel / repsNum / loadLabel / loadNum   — the headline prescription
     rows[]                                             — PER-SET targets, so a top set and its
                                                           back-offs live on one card (the block
                                                           prescribes both together)
     warmups / plates / pct / system                    — ramp, plate math, %e1RM, total system load
   Returns null when the exercise is off that week. */
function getRx(ex, week) {
  if (ex.kind === "copen") {
    const c = COPEN[week];
    if (!c) return null;
    return { sets:c.s, repsLabel:`${c.r}/side`, repsNum:c.r, loadLabel:c.lever, loadNum:null, pct:null,
             warmups:null, plates:null, rows:Array.from({length:c.s}, () => ({ w:null, r:c.r })), gate:COPEN_GATE[week] || null };
  }
  if (ex.wave) {
    const w = WAVE[ex.wave][week];
    if (!w) return null;
    const rows = [];
    let headLoad, headReps, repsLabel, sets, selfDescribing = false;
    if (w.top || w.calib) {
      if (w.calib) rows.push({ w:null, r:1, calib:true });
      else rows.push({ w:w.top.l, r:w.top.r, top:true });
      for (let i = 0; i < w.back.s; i++) rows.push({ w:w.back.l, r:w.back.r });
      sets = rows.length;
      headLoad = w.top ? w.top.l : w.back.l;
      headReps = w.top ? w.top.r : w.back.r;
      repsLabel = w.calib ? `1 + ${w.back.s}×${w.back.r}` : `1×${w.top.r} + ${w.back.s}×${w.back.r}`;
      selfDescribing = true;
    } else {
      sets = REDUCED.has(week) || !w.s ? w.s : w.s;
      for (let i = 0; i < w.s; i++) rows.push({ w:w.l, r:w.r });
      headLoad = w.l; headReps = w.r; repsLabel = w.rl || String(w.r);
    }
    const label = w.calib
      ? `single @ RPE 7.5–8.5, then ${fmtLb(w.back.l)} lb`
      : ex.plus ? `+${fmtLb(headLoad)} lb` : `${fmtLb(headLoad)} lb`;
    return {
      sets, repsLabel, repsNum:headReps, loadLabel:label, loadNum:headLoad, rows, selfDescribing: !!selfDescribing,
      pct: ex.rm && RM[ex.rm] ? Math.round((headLoad / RM[ex.rm]) * 100) : null,
      system: ex.plus ? BW + headLoad : null,
      warmups: ex.ramp ? ex.ramp.map(([w2, r]) => ({ w:w2 === "BW" ? "BW" : (ex.plus ? `+${fmtLb(w2)}` : fmtLb(w2)), r }))
                       : ex.bar ? generateWarmups(headLoad, ex.rm) : null,
      plates: ex.bar ? plateMath(headLoad) : null,
      calib: !!w.calib,
    };
  }
  // Fixed accessory. Deload weeks floor everything to 2 sets except the shoulder-health
  // and prophylactic items, which §5.11/§5.10 hold at full dose.
  const sets = REDUCED.has(week) && !ex.keepOnDeload ? Math.min(2, ex.sets) : ex.sets;
  const repsNum = parseFloat(ex.reps);
  const rn = isNaN(repsNum) ? "" : repsNum;
  return { sets, repsLabel:ex.reps, repsNum:rn, loadLabel:ex.load, loadNum:ex.loadNum ?? null, pct:null,
           warmups:null, plates:null, rows:Array.from({length:sets}, () => ({ w:ex.loadNum ?? null, r:rn })) };
}

/* Prescribed weekly volume by movement family — the §5.3 hard floors, computed live
   from WAVE so an autoregulation edit can never silently break a floor. */
const PRESS_IDS = ["dip","bench","ohptech","ohp","incline","dipvol"];
const VPULL_IDS = ["pullup","pullupvol","pullupss"];
const HPULL_IDS = ["row1","row2"];
function weekVolume(week) {
  let press = 0, vpull = 0, hpull = 0, lower = 0;
  const shoulder = new Set(), abs = new Set();
  DAYS.forEach(d => d.exercises.forEach(ex => {
    const rx = getRx(ex, week);
    if (!rx || !rx.sets) return;
    if (PRESS_IDS.includes(ex.id)) press += rx.sets;
    if (VPULL_IDS.includes(ex.id)) vpull += rx.sets;
    if (HPULL_IDS.includes(ex.id)) hpull += rx.sets;
    if (ex.tag === "shoulder health") shoulder.add(d.id);
    if (ex.tag === "core") abs.add(d.id);
    if (ex.id === "squat" || ex.id === "dl") lower += 1;
  }));
  const pull = vpull + hpull;
  return { press, vpull, hpull, pull, lower, shoulder:shoulder.size, abs:abs.size,
           ratio: pull ? Math.round((press / pull) * 100) / 100 : null };
}
const FLOORS = { press:[16,20], vpull:[8,12], hpull:[6,null], lower:[2,2], shoulder:[3,null], abs:[3,null], ratio:1.30 };

const ytUrl = (name) => "https://www.youtube.com/results?search_query=" + encodeURIComponent("how to " + name + " form guide") + "&sp=EgIYAQ%253D%253D";
const e1rm = (w, r) => Math.round(w * (1 + r/30));

const DEFAULT_SETTINGS = { theme:"iron", tone:"radar", vibrate:true, autoRest:true,
  planName:"Astra · Concurrent Block", dayMap:{ sun:0, mon:1, wed:3, fri:5 } };

/* ═══════════ TIMER BAR — owns its own tick, so the rest of the app never re-renders during a countdown ═══════════ */
function TimerBar({ label, endsAt, onDone, onExtend, onStop }) {
  const [now, setNow] = useState(Date.now());
  const doneFired = useRef(false);
  useEffect(() => {
    doneFired.current = false;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt && !doneFired.current) { doneFired.current = true; onDone(); }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  const remain = Math.max(0, Math.round((endsAt - now) / 1000));
  return (
    <div className="timerbar" role="timer">
      <div className="timer-info">
        <span className="timer-label">{label}</span>
        <span className="timer-clock">{fmtTime(remain)}</span>
      </div>
      <button className="timer-act" onClick={onExtend}>+15s</button>
      <button className="timer-act stop" aria-label="Stop timer" onClick={onStop}>✕</button>
    </div>
  );
}

/* ═══════════ SESSION CLOCK — module-level, owns its own tick, so the total-workout
   readout never re-renders the app during a set (protects the focus-loss fix) ═══════════ */
function SessionClock({ start, end }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (end) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);
  const elapsed = Math.max(0, Math.round(((end || now) - start) / 1000));
  return <span className="sessionclock" role="timer">{fmtTime(elapsed)}</span>;
}

/* ═══════════ APP ═══════════ */
export default function ConcurrentBlockTracker() {
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState("sun");
  const [logs, setLogs] = useState({});
  const [extraSets, setExtraSets] = useState({});
  const [notes, setNotes] = useState({});
  const [exNotes, setExNotes] = useState({});
  const [altChoice, setAltChoice] = useState({});
  const [done, setDone] = useState({});
  const [sessDone, setSessDone] = useState({});
  const [tested, setTested] = useState({ ohp:"", dip:"", pullup:"", broad:"", broadBase:"" });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restorePaste, setRestorePaste] = useState("");
  const [status, setStatus] = useState("loading");
  const [timer, setTimer] = useState(null); // { label, endsAt }
  const [order, setOrder] = useState({});         // { "week-day": [exId, ...] } — custom session order
  const [dragId, setDragId] = useState(null);     // exercise id currently being drag-reordered (null = none)
  const dragRef = useRef(null);                   // live drag session data (not state — avoids re-render churn per move)
  const [barSpeed, setBarSpeed] = useState({});   // { "week-day-exId": "fast"|"on-target"|"grindy" }
  const [sessionTime, setSessionTime] = useState({}); // { "week-day": { start, end } }
  const [elastic, setElastic] = useState({});     // { "week-day-tier": contacts }
  const [elasticQ, setElasticQ] = useState({});   // { "week-day": "clean"|"degraded"|"stopped" }
  const [sprintLog, setSprintLog] = useState({}); // { "week": { reps, quality, note } }
  const [primerResp, setPrimerResp] = useState({});// { "week-day": "readying"|"neutral"|"fatiguing" }
  const [addCheck, setAddCheck] = useState({});   // { "week-day": { post, next, detail } }
  const [archived, setArchived] = useState(null); // previous program's training data, kept not deleted
  const [warmOpen, setWarmOpen] = useState(false);
  const [wake, setWake] = useState(false);
  const [toast, setToast] = useState("");
  const audioRef = useRef(null);
  const wakeRef = useRef(null);
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  const T = THEMES[settings.theme] || THEMES.iron;
  const themeStyle = Object.fromEntries(Object.entries(T.v).map(([k,v]) => ["--" + k, v]));
  const dayMap = { ...DEFAULT_SETTINGS.dayMap, ...(settings.dayMap || {}) };

  /* load once */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("pp-tracker-v3");
        if (r && r.value) {
          const d = JSON.parse(r.value);
          if (d.program !== PROGRAM_ID) {
            // Bundle from the previous program. Preserve every bit of it under `archived`
            // (it also rides along in backups), reset the block's own state, and keep only
            // the personal preferences that still make sense.
            setArchived(d.archived || {
              program: "press-priority-v1.3", archivedAt: new Date().toISOString(),
              week: d.week, logs: d.logs || {}, extraSets: d.extraSets || {}, notes: d.notes || {},
              exNotes: d.exNotes || {}, altChoice: d.altChoice || {}, done: d.done || {},
              sessDone: d.sessDone || {}, tested: d.tested || {}, order: d.order || {},
              barSpeed: d.barSpeed || {}, sessionTime: d.sessionTime || {},
            });
            const st = { ...DEFAULT_SETTINGS };
            ["theme", "tone", "vibrate", "autoRest"].forEach(k => {
              if (d.settings && d.settings[k] !== undefined) st[k] = d.settings[k];
            });
            if (!TONES[st.tone]) st.tone = "radar";
            setSettings(st);
            const match = DAYS.find(x => st.dayMap[x.id] === new Date().getDay());
            setDay(match ? match.id : "sun");
            loaded.current = true;
            setStatus("ready");
            return;
          }
          setArchived(d.archived || null);
          setWeek(d.week ?? 1);
          setLogs(d.logs || {}); setExtraSets(d.extraSets || {}); setNotes(d.notes || {});
          setExNotes(d.exNotes || {});
          const ac = {};
          Object.entries(d.altChoice || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== false) ac[k] = true; });
          setAltChoice(ac);
          setDone(d.done || {}); setSessDone(d.sessDone || {});
          setTested({ ohp:"", dip:"", pullup:"", broad:"", broadBase:"", ...(d.tested || {}) });
          setOrder(d.order || {}); setBarSpeed(d.barSpeed || {}); setSessionTime(d.sessionTime || {});
          setElastic(d.elastic || {}); setElasticQ(d.elasticQ || {}); setSprintLog(d.sprintLog || {});
          setPrimerResp(d.primerResp || {}); setAddCheck(d.addCheck || {});
          const st = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
          if (!TONES[st.tone]) st.tone = "radar";
          setSettings(st);
          const dm = { ...DEFAULT_SETTINGS.dayMap, ...(st.dayMap || {}) };
          const match = DAYS.find(x => dm[x.id] === new Date().getDay());
          setDay(d.day && DAYS.some(x => x.id === d.day) ? d.day : (match ? match.id : "sun"));
        } else {
          const match = DAYS.find(x => DEFAULT_SETTINGS.dayMap[x.id] === new Date().getDay());
          if (match) setDay(match.id);
        }
      } catch (e) {
        const match = DAYS.find(x => DEFAULT_SETTINGS.dayMap[x.id] === new Date().getDay());
        if (match) setDay(match.id);
      }
      loaded.current = true;
      setStatus("ready");
    })();
  }, []);

  /* debounced save */
  useEffect(() => {
    if (!loaded.current) return;
    setStatus("saving");
    clearTimeout(saveTimer.current);
    const bundle = { program: PROGRAM_ID, week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, primerResp, addCheck, archived };
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set("pp-tracker-v3", JSON.stringify(bundle)); setStatus("saved"); }
      catch (e) { setStatus("error"); }
    }, 700);
  }, [week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, primerResp, addCheck, archived]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  /* audio */
  const ensureAudio = () => {
    // Tell iOS this is a transient alert: duck any playing music for the tone instead of
    // being silenced by it. Guarded — navigator.audioSession is a newer Safari API.
    try { if (navigator.audioSession) navigator.audioSession.type = "transient"; } catch (e) {}
    if (!audioRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioRef.current = new AC(); }
    if (audioRef.current && audioRef.current.state === "suspended") audioRef.current.resume();
  };
  const restKey = (exId) => `${day}-${exId}`;
  const startRestById = (exId, secs) => {
    const s = secs != null ? secs : REST[restKey(exId)];
    if (s == null) return;
    ensureAudio();
    const base = EX_INDEX[restKey(exId)];
    const label = (altChoice[`${week}-${day}-${exId}`] && base?.alt) || base?.name || "Rest";
    // First timer wins: if one is already counting down, ignore new starts (functional
    // updater keeps this race-safe when two sets complete in quick succession).
    setTimer(prev => (prev && prev.endsAt > Date.now()) ? prev : { label, endsAt: Date.now() + s * 1000 });
  };
  const timerDone = () => {
    playTone(audioRef.current, settings.tone);
    if (settings.vibrate && navigator.vibrate) navigator.vibrate([220, 100, 220, 100, 220]);
    setTimer(null);
  };

  /* wake lock */
  const toggleWake = async () => {
    if (wake) { try { await wakeRef.current?.release(); } catch(e){} wakeRef.current = null; setWake(false); return; }
    if (!("wakeLock" in navigator)) { flash("Wake Lock works on the hosted version"); return; }
    try {
      wakeRef.current = await navigator.wakeLock.request("screen");
      wakeRef.current.addEventListener("release", () => setWake(false));
      setWake(true);
    } catch (e) { flash("Couldn't keep screen awake here"); }
  };

  /* logging — auto-rest fires when a set transitions to complete (wt+reps) or when RIR is first entered */
  const k3 = (exId) => `${week}-${day}-${exId}`;
  const setEntry = (exId, i, field, val) => {
    // Start the global session clock on the first value logged this session.
    if (val !== "" && !sessionTime[`${week}-${day}`]) {
      setSessionTime(p => (p[`${week}-${day}`] ? p : { ...p, [`${week}-${day}`]: { start: Date.now(), end: null } }));
    }
    const row = logs?.[week]?.[day]?.[exId]?.[i] || {};
    const wasComplete = !!(row.w && row.r);
    const after = { ...row, [field]: val };
    const nowComplete = !!(after.w && after.r);
    const rirEntered = field === "rir" && val !== "" && !row.rir;
    if (settings.autoRest && REST[restKey(exId)] != null && ((!wasComplete && nowComplete) || rirEntered)) startRestById(exId);
    setLogs((prev) => {
      const next = { ...prev };
      const wk = { ...(next[week] || {}) };
      const dy = { ...(wk[day] || {}) };
      const rows = [...(dy[exId] || [])];
      rows[i] = after;
      dy[exId] = rows; wk[day] = dy; next[week] = wk;
      return next;
    });
  };
  const addSet = (exId) => setExtraSets(p => ({ ...p, [k3(exId)]: (p[k3(exId)]||0)+1 }));
  const removeSet = (exId) => setExtraSets(p => { const k = k3(exId); if (!p[k]) return p; return { ...p, [k]: p[k]-1 }; });
  const setBar = (exId, v) => setBarSpeed(p => (p[k3(exId)] === v ? p : { ...p, [k3(exId)]: v }));
  const changeWeek = (w) => setWeek(Math.max(1, Math.min(12, w)));
  const fmtPrev = (e) => (e && (e.w || e.r) ? `${e.w||"–"}×${e.r||"–"}` : null);

  const requiresWeight = (ex, rx) => rx.loadNum != null || /lb|kg/i.test(rx.loadLabel || "");
  const isAutoDone = (ex, rx) => {
    if (!rx || !(rx.sets > 0)) return false;
    const rows = logs?.[week]?.[day]?.[ex.id] || [];
    for (let i = 0; i < rx.sets; i++) {
      const e = rows[i];
      if (!e || !e.r || (requiresWeight(ex, rx) && !e.w)) return false;
    }
    return true;
  };
  const isDoneEff = (ex, rx) => { const k = k3(ex.id); return done[k] !== undefined ? done[k] : isAutoDone(ex, rx); };
  const toggleDone = (ex, rx) => { const cur = isDoneEff(ex, rx); setDone(p => ({ ...p, [k3(ex.id)]: !cur })); };

  // A set is flagged when it lands below the phase's RIR floor (§5.12): 2 in accumulation,
  // 1 in intensification, 4 in a deload week. Two flags in a week is a Level 1 signal.
  const weekBelowFloor = (w) => {
    const floor = RIR_FLOOR(w);
    let n = 0;
    Object.values(logs[w] || {}).forEach(dy => Object.values(dy).forEach(rows => {
      if (Array.isArray(rows)) rows.forEach(e => { const r = parseFloat(e?.rir); if (!isNaN(r) && r < floor) n++; });
    }));
    return n;
  };
  const subTwoCount = weekBelowFloor(week);
  // The adductor gate outranks everything else in the block (§5.10).
  const weekAdductorFlag = (w) => DAYS.some(d => {
    const c = addCheck[`${w}-${d.id}`];
    return c && (c.post === "abnormal" || c.next === "abnormal");
  });
  const addFlag = weekAdductorFlag(week);

  /* backup / review */
  const copyText = async (txt, okMsg) => {
    try { await navigator.clipboard.writeText(txt); flash(okMsg); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); flash(okMsg); } catch (e2) { flash("Copy blocked here — try the hosted version"); }
      document.body.removeChild(ta);
    }
  };
  const exportBackup = () => copyText(JSON.stringify({ app:"concurrent-block", program:PROGRAM_ID, version:14, exported:new Date().toISOString(), archived, week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, primerResp, addCheck }), "Backup JSON copied — keep it somewhere safe");
  const restoreBackup = () => {
    try {
      const d = JSON.parse(restorePaste);
      if (!d.logs) throw new Error("bad");
      setLogs(d.logs||{}); setExtraSets(d.extraSets||{}); setNotes(d.notes||{});
      setExNotes(d.exNotes||{});
      const ac = {};
      Object.entries(d.altChoice || {}).forEach(([k, v]) => { if (v) ac[k] = true; });
      setAltChoice(ac);
      setDone(d.done||{}); setSessDone(d.sessDone||{});
      setTested({ ohp:"", dip:"", pullup:"", broad:"", broadBase:"", ...(d.tested||{}) });
      setOrder(d.order||{}); setBarSpeed(d.barSpeed||{}); setSessionTime(d.sessionTime||{});
      setElastic(d.elastic||{}); setElasticQ(d.elasticQ||{}); setSprintLog(d.sprintLog||{});
      setPrimerResp(d.primerResp||{}); setAddCheck(d.addCheck||{}); setArchived(d.archived||null);
      if (d.settings) { const st = { ...DEFAULT_SETTINGS, ...d.settings }; if (!TONES[st.tone]) st.tone = "radar"; setSettings(st); }
      setRestorePaste(""); flash("Backup restored");
    } catch (e) { flash("That doesn't look like a valid backup"); }
  };
  const elasticSummary = (w, dId) => {
    const px = PLYO[w]?.[dId] || {};
    return Object.keys(TIER_NAME).filter(t => px[t] != null).map(t => {
      const act = elastic[`${w}-${dId}-${t}`];
      return `${t.toUpperCase()} ${act === undefined || act === "" ? "not logged" : act}/${px[t]}`;
    }).join(", ");
  };
  const buildReview = (w) => {
    const L = [], vol = weekVolume(w);
    L.push(`WEEK ${w} TRAINING LOG — Astra Concurrent Block ${BLOCK_VERSION} (${PHASE(w)}${BADGE[w] ? " · " + BADGE[w] : ""})`);
    L.push(`Rules of record: conflict hierarchy = health > OHP/dip/pull-up > prescribed rides > elastic quality > deadlift maintenance > squat/bench > secondary volume. Target RIR this week ${TARGET_RIR(w)}. Elastic work may never cost an OHP, dip, or pull-up session. Adductor gate governs every running and tier progression.`);
    L.push("");
    DAYS.forEach(d => {
      L.push(`${WEEKDAYS[dayMap[d.id]]} — ${d.lift} day · ${d.title}${sessDone[`${w}-${d.id}`] ? " · session finished" : ""}`);
      if (isTestSession(w, d.id)) { L.push("  TEST SESSION — see results below."); L.push(""); return; }
      d.exercises.forEach(ex => {
        if (ex.kind === "elastic") { const sum = elasticSummary(w, d.id); if (sum) L.push(`  Elastic contacts (actual/target): ${sum}${elasticQ[`${w}-${d.id}`] ? ` · quality ${elasticQ[`${w}-${d.id}`]}` : ""}`); return; }
        if (ex.kind === "sprint") { const sp = SPRINT[w], lg = sprintLog[w] || {}; L.push(`  Acceleration — Rx ${sp.label} ${sp.surface} @ ${sp.intensity} (${sp.m} m): completed ${lg.reps || "not logged"} reps${lg.quality ? ` · ${lg.quality}` : ""}${lg.note ? ` · "${lg.note}"` : ""}`); return; }
        if (ex.kind === "primer") { const pr = primerResp[`${w}-${d.id}`]; L.push(`  Primer: ${pr || "response not logged"}`); return; }
        if (ex.kind === "check") { const c = addCheck[`${w}-${d.id}`] || {}; L.push(`  Adductor check — post-session: ${c.post || "not run"} · next morning: ${c.next || "not run"}${c.detail ? ` · "${c.detail}"` : ""}`); return; }
        const rx = getRx(ex, w);
        if (!rx) { L.push(`  ${ex.name}: off this week`); return; }
        const subbed = altChoice[`${w}-${d.id}-${ex.id}`];
        const shownName = subbed ? `${ex.name} (subbed: ${ex.alt})` : ex.name;
        const rows = logs?.[w]?.[d.id]?.[ex.id] || [];
        const rxStr = `Rx ${rx.sets}×${rx.repsLabel}${rx.loadLabel ? " @ " + rx.loadLabel : ""}`;
        const logged = rows.filter(e => e && (e.w || e.r));
        if (!logged.length) L.push(`  ${shownName} [${CUT_LABEL[ex.cut] || "-"}] — ${rxStr}: NOT LOGGED`);
        else {
          const sets = rows.map(e => (e && (e.w || e.r)) ? `${e.w||"?"}×${e.r||"?"}${e.rir!=null && e.rir!=="" ? "@RIR"+e.rir : ""}` : null).filter(Boolean).join(", ");
          L.push(`  ${shownName} [${CUT_LABEL[ex.cut] || "-"}] — ${rxStr}: ${sets}`);
        }
        if (ex.wave && ex.tag === "main lift") L.push(`    Bar speed: ${barSpeed[`${w}-${d.id}-${ex.id}`] || "on-target"}`);
        const en = exNotes[`${w}-${d.id}-${ex.id}`];
        if (en) L.push(`    Exercise note: "${en}"`);
      });
      const nt = notes[`${w}-${d.id}`];
      if (nt) L.push(`  Session notes: "${nt}"`);
      L.push("");
    });
    const s2 = weekBelowFloor(w);
    L.push(`VOLUME AUDIT (prescribed): pressing ${vol.press} (floor 16–20) · vertical pull ${vol.vpull} (8–12) · horizontal pull ${vol.hpull} (6) · lower-body exposures ${vol.lower} (exactly 2) · shoulder-health sessions ${vol.shoulder} (3 of 4) · direct ab sessions ${vol.abs} (3) · press:pull ${vol.ratio} (≤1.30)${REDUCED.has(w) ? " — floors WAIVED this week: scheduled deload" : ""}`);
    L.push(`AUTO-FLAGS: ${s2} set${s2===1?"":"s"} below the week's RIR floor of ${RIR_FLOOR(w)}${s2>=2 ? " — Level 1 signal, hold the next scheduled increment" : ""}. Adductor: ${weekAdductorFlag(w) ? "ABNORMAL reported — running and tiers 2/3 gated" : "normal"}.`);
    L.push("");
    L.push("Coach: review this week against docs/12-week-concurrent-block.md §17 (fatigue levels, trigger table) and §5.6 (progression cadence). Tell me: (1) fatigue level per domain — global, push, pull, lower, elastic/running — with reasons, (2) which scheduled increments run and which hold, with exact before and after, (3) whether the adductor gate permits the next running and tier step, (4) whether the time budget still holds for any session you change, (5) pace against the four block criteria.");
    return L.join("\n");
  };

  // Structured export for the Claude Code autoregulation loop (docs/autoregulation-criteria.md).
  const buildReviewJSON = (w) => {
    const num = (x) => (x === "" || x == null ? null : parseFloat(x));
    const days = DAYS.map(d => ({
      day: d.id, weekday: WEEKDAYS[dayMap[d.id]], lift: d.lift, title: d.title,
      finished: !!sessDone[`${w}-${d.id}`],
      isTestSession: isTestSession(w, d.id),
      minuteBudget: { ...d.budget, total: d.budget.warm + d.budget.pri + d.budget.acc + d.budget.fin },
      elastic: (() => {
        const px = PLYO[w]?.[d.id] || {};
        const keys = Object.keys(TIER_NAME).filter(t => px[t] != null);
        if (!keys.length) return null;
        return { quality: elasticQ[`${w}-${d.id}`] || null,
          tiers: keys.map(t => ({ tier:t, target:px[t], actual:num(elastic[`${w}-${d.id}-${t}`]) })) };
      })(),
      sprint: d.id === "fri" ? { ...SPRINT[w], completedReps: num((sprintLog[w]||{}).reps),
        quality: (sprintLog[w]||{}).quality || null, note: (sprintLog[w]||{}).note || null,
        ceilingOk: SPRINT[w].m <= SPRINT_CEILING } : null,
      primer: d.exercises.some(e => e.kind === "primer") ? (primerResp[`${w}-${d.id}`] || null) : null,
      adductorCheck: addCheck[`${w}-${d.id}`] || null,
      exercises: d.exercises.filter(ex => !ex.kind || ex.kind === "main" || ex.kind === "copen").map(ex => {
        const rx = getRx(ex, w), key = `${w}-${d.id}-${ex.id}`;
        const actual = (logs?.[w]?.[d.id]?.[ex.id] || [])
          .filter(e => e && (e.w || e.r)).map(e => ({ w: num(e.w), r: num(e.r), rir: num(e.rir) }));
        const o = { id: ex.id, name: ex.name, category: ex.tag, cut: CUT_LABEL[ex.cut] || null,
          isMain: ex.tag === "main lift",
          rx: rx ? { sets: rx.sets, reps: rx.repsLabel, load: rx.loadNum, external: !!ex.plus,
                     systemLoad: rx.system || null, rir: TARGET_RIR(w) } : null,
          actual };
        if (altChoice[key]) o.subbed = ex.alt;
        if (ex.tag === "main lift") o.barSpeed = barSpeed[key] || "on-target";
        const note = exNotes[key]; if (note) o.note = note;
        return o;
      }),
    }));
    const history = {};
    DAYS.forEach(d => d.exercises.filter(ex => ex.wave && ex.tag === "main lift").forEach(ex => {
      const hist = [];
      for (let pw = w - 1; pw >= Math.max(1, w - 3); pw--) {
        const rows = (logs?.[pw]?.[d.id]?.[ex.id] || []).filter(e => e && (e.w || e.r));
        if (!rows.length) continue;
        const prx = getRx(ex, pw);
        const rirs = rows.map(e => num(e.rir)).filter(x => x != null);
        hist.push({ week: pw, load: prx ? prx.loadNum : null,
          rirMin: rirs.length ? Math.min(...rirs) : null,
          barSpeed: barSpeed[`${pw}-${d.id}-${ex.id}`] || "on-target",
          allSets: prx ? rows.length >= prx.sets : false });
      }
      if (hist.length) history[`${d.id}-${ex.id}`] = hist;
    }));
    const vol = weekVolume(w);
    return JSON.stringify({
      app: "concurrent-block", kind: "week-report", version: 14, blockVersion: BLOCK_VERSION,
      week: w, phase: PHASE(w), badge: BADGE[w] || null, targetRir: TARGET_RIR(w), rirFloor: RIR_FLOOR(w),
      flags: { deload: REDUCED.has(w), testWeek: w === TEST_WEEK, tier3Active: (PLYO[w]?.fri?.t3 || 0) > 0 },
      volumeAudit: { ...vol, floors: FLOORS, waived: REDUCED.has(w) },
      days, history,
      tested: w === TEST_WEEK ? tested : undefined,
      autoFlags: { belowRirFloor: weekBelowFloor(w), adductorAbnormal: weekAdductorFlag(w) },
    }, null, 2);
  };

  /* derived */
  const isTest = isTestSession(week, day);
  const dayData = DAYS.find(d => d.id === day);
  const sessKey = `${week}-${day}`;
  // Apply the athlete's custom order for this session (default = program order); any
  // exercise not in the saved order (e.g. new to this week) is appended in program order.
  const orderedEx = (() => {
    if (!dayData) return [];
    const saved = order[sessKey];
    if (!saved) return dayData.exercises;
    const byId = {}; dayData.exercises.forEach(e => { byId[e.id] = e; });
    const seen = new Set(), res = [];
    saved.forEach(id => { if (byId[id]) { res.push(byId[id]); seen.add(id); } });
    dayData.exercises.forEach(e => { if (!seen.has(e.id)) res.push(e); });
    return res;
  })();
  // Elastic / sprint / primer / check cards have no WAVE row; they are visible when the
  // week actually prescribes something for them.
  const hasBlock = (ex) => {
    if (ex.kind === "elastic") return Object.keys(PLYO[week]?.[day] || {}).length > 0;
    if (ex.kind === "sprint") return !!SPRINT[week];
    if (ex.kind === "primer") return day !== "fri";
    if (ex.kind === "check") return Object.keys(PLYO[week]?.[day] || {}).length > 0 || day === "fri";
    return !!getRx(ex, week);
  };
  const visibleEx = isTest ? [] : orderedEx.filter(hasBlock);
  const doneCount = visibleEx.filter(ex => isDoneEff(ex, getRx(ex, week) || { sets:1 })).length;
  const moveEx = (exId, dir) => {
    const vis = visibleEx.map(e => e.id);
    const idx = vis.indexOf(exId), j = idx + dir;
    if (idx < 0 || j < 0 || j >= vis.length) return;
    const nv = [...vis]; [nv[idx], nv[j]] = [nv[j], nv[idx]];
    const hidden = orderedEx.map(e => e.id).filter(id => !vis.includes(id));
    setOrder(p => ({ ...p, [sessKey]: [...nv, ...hidden] }));
  };
  const resetOrder = () => setOrder(p => { const n = { ...p }; delete n[sessKey]; return n; });
  // Place exId at targetIdx within the visible list and persist (used by drag-and-drop).
  const reorderTo = (exId, targetIdx) => {
    const vis = visibleEx.map(e => e.id);
    const from = vis.indexOf(exId);
    if (from < 0 || targetIdx < 0 || targetIdx >= vis.length || from === targetIdx) return;
    const nv = [...vis]; nv.splice(from, 1); nv.splice(targetIdx, 0, exId);
    const hidden = orderedEx.map(e => e.id).filter(id => !vis.includes(id));
    setOrder(p => ({ ...p, [sessKey]: [...nv, ...hidden] }));
  };
  // ── Touch/pointer drag-to-reorder ─────────────────────────────────────────
  // The dragged card follows the finger via a direct-DOM transform (no per-move
  // re-render); neighbours reflow naturally because we only commit `order` state
  // when the card crosses into a new slot. Cards keep stable keys, so React moves
  // the existing DOM node (no remount → the manual transform survives the reorder).
  const cardCenters = (exceptId) =>
    [...document.querySelectorAll(".session .card[data-exid]")]
      .filter(el => el.dataset.exid !== exceptId)
      .map(el => { const r = el.getBoundingClientRect(); return { id: el.dataset.exid, mid: r.top + r.height / 2 }; });
  const startDrag = (e, exId) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget.closest(".card[data-exid]");
    if (!el) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const r = el.getBoundingClientRect();
    dragRef.current = {
      exId, pointerId: e.pointerId, el, height: r.height,
      grabOffset: e.clientY - r.top,   // where inside the card the finger grabbed
      translate: 0,
      curIdx: visibleEx.findIndex(x => x.id === exId),
    };
    setDragId(exId);
    document.body.style.userSelect = "none";
  };
  const onDragMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    // Keep the card pinned under the finger, re-deriving its natural top each move
    // (natural top = current rect top − current transform), so it stays correct even
    // after the list reorders beneath it.
    const rect = d.el.getBoundingClientRect();
    const naturalTop = rect.top - d.translate;
    const t = (e.clientY - d.grabOffset) - naturalTop;
    d.el.style.transform = `translateY(${t}px)`;
    d.translate = t;
    // Insertion index = how many other cards have their midpoint above the dragged card's centre.
    const center = (e.clientY - d.grabOffset) + d.height / 2;
    const target = cardCenters(d.exId).filter(o => o.mid < center).length;
    if (target !== d.curIdx) { d.curIdx = target; reorderTo(d.exId, target); }
  };
  const endDrag = (e) => {
    const d = dragRef.current;
    if (!d || (e && e.pointerId != null && e.pointerId !== d.pointerId)) return;
    const el = d.el;
    el.style.transition = "transform .16s ease";
    el.style.transform = "";                 // snap into the (now correct) slot
    setTimeout(() => { if (el) { el.style.transition = ""; el.style.transform = ""; } }, 180);
    document.body.style.userSelect = "";
    dragRef.current = null;
    setDragId(null);
  };
  const setsLoggedCount = () => {
    let n = 0;
    visibleEx.forEach(ex => (logs?.[week]?.[day]?.[ex.id] || []).forEach(e => { if (e && (e.w || e.r)) n++; }));
    return n;
  };
  const dayMainE1rm = () => {
    if (!dayData) return null;
    let best = null;
    dayData.exercises.filter(ex => ex.wave && ex.wave !== "dlV").forEach(ex => {
      (logs?.[week]?.[day]?.[ex.id] || []).forEach(e => {
        const w = parseFloat(e?.w), r = parseFloat(e?.r);
        if (!isNaN(w) && !isNaN(r) && r > 0) { const est = e1rm(w, r); if (!best || est > best.est) best = { name: ex.name, est }; }
      });
    });
    return best;
  };

  /* ── render functions (plain calls, stable element identity — inputs never lose focus) ── */
  const renderSetRow = (ex, rx, i) => {
    const cur = logs?.[week]?.[day]?.[ex.id]?.[i] || {};
    const prev = week > 1 ? fmtPrev(logs?.[week-1]?.[day]?.[ex.id]?.[i]) : null;
    const rirVal = cur.rir ?? "";
    const floor = RIR_FLOOR(week);
    const rirWarn = rirVal !== "" && parseFloat(rirVal) < floor;
    const tgt = rx.rows?.[i] || { w: rx.loadNum, r: rx.repsNum };
    const repsNum = parseFloat(cur.r);
    const target = typeof tgt.r === "number" ? tgt.r : NaN;
    const repClass = !isNaN(repsNum) && !isNaN(target) ? (repsNum < target ? "under" : repsNum > target ? "over" : "") : "";
    const isExtra = i >= rx.sets;
    return (
      <div className={`set-row ${tgt.top ? "topset" : ""} ${tgt.calib ? "calibrow" : ""}`} key={i} style={isExtra ? { opacity:0.75 } : {}}>
        <span className="set-n">{tgt.calib ? "C" : tgt.top ? "T" : i+1}</span>
        <span className={`prev ${prev ? "" : "empty"}`}>{prev || "—"}</span>
        <input inputMode="decimal" placeholder={tgt.calib ? "?" : (tgt.w ?? "")} value={cur.w || ""} aria-label={`${ex.name} set ${i+1} weight`}
          onChange={e => setEntry(ex.id, i, "w", e.target.value)} />
        <input inputMode="numeric" placeholder={tgt.r ?? ""} value={cur.r || ""} className={repClass} aria-label={`${ex.name} set ${i+1} reps`}
          onChange={e => setEntry(ex.id, i, "r", e.target.value)} />
        <input inputMode="decimal" placeholder={String(floor)} value={rirVal} className={rirWarn ? "warn" : ""} aria-label={`${ex.name} set ${i+1} RIR`}
          onChange={e => setEntry(ex.id, i, "rir", e.target.value)} />
        <button className="rxfill" aria-label="Fill prescribed" disabled={tgt.calib} onClick={() => {
          if (tgt.w != null) setEntry(ex.id, i, "w", String(tgt.w));
          if (tgt.r != null && tgt.r !== "") setEntry(ex.id, i, "r", String(tgt.r));
          if (settings.autoRest) startRestById(ex.id);
        }}>Rx</button>
      </div>
    );
  };

  const cutChip = (ex) => ex.cut ? <em className={`tag cut-${ex.cut}`}>{CUT_LABEL[ex.cut]}</em> : null;

  const cardHead = (ex, activeName, exDone, rx) => (
    <div className="ex-head">
      <div className="ex-title">
        <h2 className="exname">{activeName}</h2>
        <div className="tagrow">
          {altChoice[k3(ex.id)] && <em className="tag alt-tag">sub</em>}
          {ex.tag && <em className="tag">{ex.tag}</em>}
          {cutChip(ex)}
        </div>
      </div>
      <div className="ex-actions">
        <button className="draghandle" aria-label={`Reorder ${activeName} — drag, or press then use the up and down arrow keys`}
          onPointerDown={e => startDrag(e, ex.id)} onPointerMove={onDragMove} onPointerUp={endDrag} onPointerCancel={endDrag}
          onKeyDown={e => { if (e.key === "ArrowUp") { e.preventDefault(); moveEx(ex.id, -1); } else if (e.key === "ArrowDown") { e.preventDefault(); moveEx(ex.id, 1); } }}>
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><g fill="currentColor"><circle cx="6" cy="3.5" r="1.35"/><circle cx="10" cy="3.5" r="1.35"/><circle cx="6" cy="8" r="1.35"/><circle cx="10" cy="8" r="1.35"/><circle cx="6" cy="12.5" r="1.35"/><circle cx="10" cy="12.5" r="1.35"/></g></svg>
        </button>
        <a className="ytbtn" href={ytUrl(activeName)} target="_blank" rel="noopener noreferrer" aria-label={`Watch a video example of ${activeName} on YouTube`}>
          <svg viewBox="0 0 28 20" width="26" height="19" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#FF0000"/><path d="M11 5.5v9l8-4.5z" fill="#fff"/></svg>
        </a>
        <button className={`donebtn ${exDone ? "on" : ""}`} aria-pressed={exDone} onClick={() => toggleDone(ex, rx || { sets:1 })}>✓</button>
      </div>
    </div>
  );

  /* Elastic block — outside the 75-minute cap, counted per limb on unilateral work.
     The whole point of this card is that plyometric dose is a LEDGER, not a feeling:
     target contacts per tier come from PLYO, actual contacts get logged. */
  const renderElastic = (ex) => {
    const px = PLYO[week]?.[day] || {};
    const tiers = Object.keys(TIER_NAME).filter(t => px[t] != null);
    if (!tiers.length) return null;
    const exDone = isDoneEff(ex, { sets:1 });
    const q = elasticQ[sessKey] || "";
    const total = tiers.reduce((a, t) => a + px[t], 0);
    return (
      <section className={`card elasticcard ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, ex.name, exDone, null)}
        <div className="meta-row"><div className="rx"><span>{total} contacts</span><span className="rx-load"> · outside the 75-min cap</span></div></div>
        {day === "fri" && (
          <ol className="seqlist">{FRI_SEQUENCE.map((sq, i) => <li key={i}>{sq}</li>)}</ol>
        )}
        {tiers.map(t => {
          const key = `${sessKey}-${t}`;
          const act = elastic[key] ?? "";
          const over = act !== "" && parseFloat(act) > px[t] * 1.1;
          return (
            <div className="tierrow" key={t}>
              <div className="tiertop">
                <span className="tiername">{TIER_NAME[t]}</span>
                <span className="tiertarget">target {px[t]}</span>
              </div>
              <p className="tierex">{t === "t3" ? (TIER3_RX[week] || TIER_EX.t3) : TIER_EX[t]}</p>
              <div className="tierlog">
                <label htmlFor={`el-${t}`}>Contacts done</label>
                <input id={`el-${t}`} inputMode="numeric" placeholder={px[t]} value={act} className={over ? "warn" : ""}
                  aria-label={`${TIER_NAME[t]} contacts completed`}
                  onChange={e => setElastic(p => ({ ...p, [key]: e.target.value }))} />
                <button className="rxfill" aria-label={`Fill prescribed ${t} contacts`}
                  onClick={() => setElastic(p => ({ ...p, [key]: String(px[t]) }))}>Rx</button>
              </div>
            </div>
          );
        })}
        <div className="qrow">
          <span className="bs-label">Contact quality</span>
          <div className="barspeed" role="group" aria-label="Elastic contact quality">
            {[["clean","Clean"],["degraded","Degraded"],["stopped","Stopped early"]].map(([v,lbl]) => (
              <button key={v} className={`bs-btn ${q === v ? "on" : ""}`} aria-pressed={q === v}
                aria-label={`Elastic quality ${v}`}
                onClick={() => setElasticQ(p => ({ ...p, [sessKey]: v }))}>{lbl}</button>
            ))}
          </div>
        </div>
        {week === 1 && day === "fri" && (
          <div className="tested-row baseline">
            <label htmlFor="broadbase">Broad-jump baseline (in) — best of 3</label>
            <input id="broadbase" inputMode="decimal" value={tested.broadBase || ""} placeholder="—"
              onChange={e => setTested(p => ({ ...p, broadBase: e.target.value }))} />
          </div>
        )}
        <p className="cue"><b>Instructions:</b> {ex.cue}</p>
        <input className="exnote" placeholder="Note — contact quality, next-day response" value={exNotes[k3(ex.id)] || ""}
          onChange={e => setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value }))} />
      </section>
    );
  };

  /* Acceleration block. The session ceiling (250 m) is enforced in the data, not by hand. */
  const renderSprint = (ex) => {
    const sp = SPRINT[week];
    if (!sp) return null;
    const exDone = isDoneEff(ex, { sets:1 });
    const lg = sprintLog[week] || {};
    const setSp = (f, v) => setSprintLog(p => ({ ...p, [week]: { ...(p[week] || {}), [f]: v } }));
    return (
      <section className={`card sprintcard ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, ex.name, exDone, null)}
        <div className="meta-row">
          <div className="rx"><span>{sp.label}</span><span className="rx-load"> · {sp.surface}</span><span className="rx-pct"> {sp.intensity}</span></div>
        </div>
        <div className="sprintmeta">
          <span><b>{sp.m} m</b> of quality volume</span>
          <span className={sp.m <= SPRINT_CEILING ? "ok" : "warn-txt"}>ceiling {SPRINT_CEILING} m</span>
          <span>rest {fmtTime(sp.rest)}–{fmtTime(sp.rest + 60)}</span>
        </div>
        <div className="tierlog">
          <label htmlFor="sprint-reps">Reps completed</label>
          <input id="sprint-reps" inputMode="numeric" placeholder={sp.reps} value={lg.reps ?? ""} aria-label="Sprint reps completed"
            onChange={e => setSp("reps", e.target.value)} />
          <button className="rxfill" aria-label="Fill prescribed sprint reps" onClick={() => setSp("reps", String(sp.reps))}>Rx</button>
        </div>
        <div className="qrow">
          <span className="bs-label">Quality</span>
          <div className="barspeed" role="group" aria-label="Sprint quality">
            {[["crisp","Crisp"],["holding","Holding"],["laboured","Laboured"]].map(([v,lbl]) => (
              <button key={v} className={`bs-btn ${lg.quality === v ? "on" : ""}`} aria-pressed={lg.quality === v}
                aria-label={`Sprint quality ${v}`} onClick={() => setSp("quality", v)}>{lbl}</button>
            ))}
          </div>
        </div>
        <div className="set-btns">
          <button className="ghost timer-btn" onClick={() => startRestById(ex.id, sp.rest)}>⏱ Rest {fmtTime(sp.rest)}</button>
        </div>
        <p className="cue"><b>Instructions:</b> {ex.cue}</p>
        <input className="exnote" placeholder="Note — how the reps felt, any stride change" value={lg.note || ""}
          onChange={e => setSp("note", e.target.value)} />
      </section>
    );
  };

  /* Primer. Response is a real programming signal (§5.12), so it is logged, not guessed. */
  const renderPrimer = (ex) => {
    const exDone = isDoneEff(ex, { sets:1 });
    const r = primerResp[sessKey] || "";
    return (
      <section className={`card primercard ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, ex.name, exDone, null)}
        <div className="meta-row"><div className="rx"><span>{ex.rounds} round{ex.rounds > 1 ? "s" : ""} on a 60-second clock</span><span className="rx-load"> · 2 × 10 kg · RPE ≤ 4 · ≤ 4 min</span></div></div>
        <ul className="warm-list">
          <li>2 double kettlebell cleans</li>
          {ex.press ? <li>1 double strict press</li> : <li className="dropped">Strict press — DROPPED on OHP-priority days</li>}
          <li>2 double front squats</li>
        </ul>
        <div className="qrow">
          <span className="bs-label">Primer response</span>
          <div className="barspeed" role="group" aria-label="Primer response">
            {[["readying","Readying"],["neutral","Neutral"],["fatiguing","Fatiguing"]].map(([v,lbl]) => (
              <button key={v} className={`bs-btn ${r === v ? "on" : ""}`} aria-pressed={r === v}
                aria-label={`Primer response ${v}`} onClick={() => setPrimerResp(p => ({ ...p, [sessKey]: v }))}>{lbl}</button>
            ))}
          </div>
        </div>
        {r === "fatiguing" && <div className="banner soft">Fatiguing: drop to one round next session, then drop the press, then omit the primer. It never counts as productive volume.</div>}
        <p className="cue"><b>Instructions:</b> {ex.cue} Judge the response against the first ramp set at the same load.</p>
      </section>
    );
  };

  /* Adductor reactive gate (§5.10) — the highest-consequence control in the app.
     One tap when normal; seven specifics when not. */
  const renderCheck = (ex) => {
    const c = addCheck[sessKey] || {};
    const setC = (f, v) => setAddCheck(p => ({ ...p, [sessKey]: { ...(p[sessKey] || {}), [f]: v } }));
    const abnormal = c.post === "abnormal" || c.next === "abnormal";
    return (
      <section className={`card checkcard ${abnormal ? "alert" : ""}`} key={ex.id} data-exid={ex.id}>
        <div className="ex-head">
          <div className="ex-title"><h2 className="exname">{ex.name}</h2>
            <div className="tagrow"><em className="tag">{ex.tag}</em>{cutChip(ex)}</div></div>
        </div>
        {[["post","After this session"],["next","Next morning"]].map(([f, lbl]) => (
          <div className="checkrow" key={f}>
            <span className="checklbl">{lbl}</span>
            <div className="barspeed" role="group" aria-label={`${lbl} adductor check`}>
              <button className={`bs-btn ${c[f] === "normal" ? "on ok" : ""}`} aria-pressed={c[f] === "normal"}
                aria-label={`${lbl} adductor normal`} onClick={() => setC(f, "normal")}>Normal</button>
              <button className={`bs-btn ${c[f] === "abnormal" ? "on bad" : ""}`} aria-pressed={c[f] === "abnormal"}
                aria-label={`${lbl} adductor abnormal`} onClick={() => setC(f, "abnormal")}>Abnormal</button>
            </div>
          </div>
        ))}
        {abnormal && (
          <div className="abnormal">
            <p><b>Capture all seven:</b> location · severity /10 · onset (which rep, which movement) · duration · effect on stride and gait · effect on squatting · response to gentle resisted adduction.</p>
            <textarea placeholder="Location, severity, onset, duration, stride effect, squat effect, resisted adduction…"
              value={c.detail || ""} onChange={e => setC("detail", e.target.value)} />
            <p className="escalate">Mild familiar soreness resolving in 24–48 h without a movement change: hold and repeat, do not progress. Symptoms increasing, persisting past 48 h, reducing output, or affecting stride: regress one step in the running ladder and remove tier 3. Acute sharp pain, bruising, weakness, progressive symptoms, or movement-altering discomfort: suspend all impact work and obtain clinical evaluation.</p>
          </div>
        )}
        <p className="cue"><b>Instructions:</b> {ex.cue}</p>
      </section>
    );
  };

  const renderCard = (ex) => {
    if (ex.kind === "elastic") return renderElastic(ex);
    if (ex.kind === "sprint") return renderSprint(ex);
    if (ex.kind === "primer") return renderPrimer(ex);
    if (ex.kind === "check") return renderCheck(ex);
    const rx = getRx(ex, week);
    if (!rx) return (
      <section className="card skipped" key={ex.id}>
        <div className="ex-head"><h2>{ex.name}</h2><span className="rx-off">off this week</span></div>
        <p className="cue"><b>Instructions:</b> Off this week by design — the deload removes it.</p>
      </section>
    );
    const extraCount = extraSets[k3(ex.id)] || 0;
    const total = rx.sets + extraCount;
    const exDone = isDoneEff(ex, rx);
    const subbed = !!altChoice[k3(ex.id)];
    const activeName = subbed ? ex.alt : ex.name;
    const prevNote = week > 1 ? exNotes[`${week-1}-${day}-${ex.id}`] : null;
    return (
      <section className={`card ${ex.tag === "main lift" ? "main" : ""} ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, activeName, exDone, rx)}
        <div className="ex-tools">
          {ex.alt && (
            <button className={`inlbtn ${subbed ? "on" : ""}`} title={subbed ? `Back to ${ex.name}` : `Swap to ${ex.alt}`}
              onClick={() => setAltChoice(p => { const n = { ...p }; if (n[k3(ex.id)]) delete n[k3(ex.id)]; else n[k3(ex.id)] = true; return n; })}>
              {subbed ? "Original" : "Alt Exercise"}
            </button>
          )}
        </div>
        <div className="meta-row">
          <div className="rx">
            <span>{rx.selfDescribing ? rx.repsLabel : `${rx.sets}×${rx.repsLabel}`}</span>
            {rx.loadLabel && <span className="rx-load">{rx.loadNum != null ? " @ " : " · "}{rx.loadLabel}</span>}
            {rx.pct && <span className="rx-pct"> {rx.pct}%</span>}
          </div>
          {subbed && <span className="alt-note">alt for {ex.name}</span>}
        </div>
        {rx.system && <div className="systemload">Total system load <b>{fmtLb(rx.system)} lb</b> — bodyweight {BW} + {fmtLb(rx.loadNum)} external</div>}
        {rx.calib && <div className="banner soft">Week 1 calibration: ramp in 5–7.5 lb steps above 105 and stop at the first rep that is strict but no longer crisp. Log it in row C. Take the three prescribed sets at 105 regardless of what the single shows — any rescale needs approval and starts next week.</div>}
        {rx.gate && <div className="banner soft">{rx.gate}</div>}
        {ex.tag === "main lift" && (
          <div className="barspeed-row">
            <span className="bs-label">Bar speed</span>
            <div className="barspeed" role="group" aria-label={`${activeName} bar speed`}>
              {[["fast","Fast"],["on-target","On-target"],["grindy","Grindy"]].map(([v,lbl]) => {
                const sel = (barSpeed[k3(ex.id)] || "on-target") === v;
                return (
                  <button key={v} className={`bs-btn ${sel ? "on" : ""}`} aria-pressed={sel}
                    aria-label={`${activeName} bar speed ${v}`} onClick={() => setBar(ex.id, v)}>{lbl}</button>
                );
              })}
            </div>
          </div>
        )}
        {rx.warmups && !subbed && (
          <div className="warmups">
            <div className="warmups-title">Warm-up · off the clock</div>
            <div className="warmup-row">
              {rx.warmups.map((s, i) => (
                <span key={i}>{s.w}×{s.r}{i < rx.warmups.length-1 && <span className="arrow"> → </span>}</span>
              ))}
            </div>
            {rx.plates && <div className="plates">Work sets: bar + {rx.plates}</div>}
          </div>
        )}
        {prevNote && <div className="lastnote"><b>Last week's note:</b> {prevNote}</div>}
        <div className="grid-head">
          <span>SET</span><span>LAST WK</span><span>WT</span>
          <span>{ex.unit === "reps" ? "REPS" : ex.unit.toUpperCase()}</span><span>RIR</span><span />
        </div>
        {Array.from({ length: total }).map((_, i) => renderSetRow(ex, rx, i))}
        <div className="set-btns">
          {REST[restKey(ex.id)] != null
            ? <button className="ghost timer-btn" onClick={() => startRestById(ex.id)}>⏱ Rest {fmtTime(REST[restKey(ex.id)])}</button>
            : <span className="shared-rest">rests inside the lift above</span>}
          <button className="solid" onClick={() => addSet(ex.id)}>＋ Add Set</button>
          {extraCount > 0 && <button className="ghost rm-set" onClick={() => removeSet(ex.id)}>−</button>}
        </div>
        <p className="cue"><b>Instructions:</b> {ex.cue}{subbed && " Alt in use — match the pattern: same sets, reps, and RIR as the primary."}</p>
        <input className="exnote" placeholder="Note for next week — e.g. 'go up in weight, felt too easy'" value={exNotes[k3(ex.id)] || ""}
          onChange={e => setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value }))} />
      </section>
    );
  };

  /* Week-12 test session. Order is fixed: power before strength, priority before secondary.
     A grindy single is recorded as a MISS, not as a lower number (§5.13). */
  const renderTestDay = () => {
    const pre = [
      "No domain in a red state",
      "At least two easy days immediately prior — Monday was technique-only, Tuesday's ride was easy",
      "Normal adductor check Monday evening and this morning",
      "Bodyweight recorded at the morning weigh-in",
    ];
    const totalMin = 14 + TESTS.reduce((a, t) => a + t.minutes, 0);
    return (
      <div>
        <div className="cap-note">Test session · warm-up 14 + {TESTS.reduce((a,t)=>a+t.minutes,0)} = {totalMin} min · no supplemental work</div>
        <div className="focus"><b>Preconditions — all four required</b>
          <ol className="seqlist">{pre.map((x,i) => <li key={i}>{x}</li>)}</ol>
        </div>
        {addFlag && <div className="banner">Adductor check returned abnormal this week. The broad jump is gated on a normal adductor status — resolve it before testing.</div>}
        {TESTS.map(t => {
          const extra = extraSets[`${TEST_WEEK}-${day}-${t.id}`] || 0;
          const rows = t.attempts.length + extra;
          return (
            <section className="card main" key={t.id}>
              <div className="ex-head">
                <div className="ex-title"><h2 className="exname">{t.lift}</h2>
                  <div className="tagrow"><em className="tag">test</em><em className="tag">{t.minutes} min</em></div></div>
                <a className="ytbtn" href={ytUrl(t.lift)} target="_blank" rel="noopener noreferrer" aria-label={`Watch a video example of ${t.lift}`}>
                  <svg viewBox="0 0 28 20" width="26" height="19" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#FF0000"/><path d="M11 5.5v9l8-4.5z" fill="#fff"/></svg>
                </a>
              </div>
              <div className="meta-row"><div className="rx"><span>Target</span><span className="rx-load"> {t.target}</span></div></div>
              <p className="test-note">{t.note}</p>
              <div className="grid-head"><span>#</span><span>PLAN</span><span>{t.unit === "in" ? "IN" : "WT"}</span><span>REPS</span><span>RIR</span><span /></div>
              {Array.from({ length: rows }).map((_, i) => {
                const plan = t.attempts[i];
                const cur = logs?.[TEST_WEEK]?.[day]?.[t.id]?.[i] || {};
                const warn = cur.rir != null && cur.rir !== "" && parseFloat(cur.rir) < 0;
                return (
                  <div className="set-row" key={i}>
                    <span className="set-n">{i+1}</span>
                    <span className={`prev ${plan ? "" : "empty"}`}>{plan ? `${plan[0]}${t.unit === "in" ? "" : "×" + plan[1]}` : "—"}</span>
                    <input inputMode="decimal" placeholder={plan ? String(plan[0]) : ""} value={cur.w || ""}
                      aria-label={`${t.lift} attempt ${i+1} ${t.unit === "in" ? "distance" : "weight"}`}
                      onChange={e => setEntry(t.id, i, "w", e.target.value)} />
                    <input inputMode="numeric" placeholder={plan ? String(plan[1]) : 1} value={cur.r || ""}
                      aria-label={`${t.lift} attempt ${i+1} reps`}
                      onChange={e => setEntry(t.id, i, "r", e.target.value)} />
                    <input inputMode="decimal" placeholder="2" value={cur.rir || ""} className={warn ? "warn" : ""}
                      aria-label={`${t.lift} attempt ${i+1} RIR`}
                      onChange={e => setEntry(t.id, i, "rir", e.target.value)} />
                    <span />
                  </div>
                );
              })}
              <button className="solid full" onClick={() => addSet(t.id)}>＋ Attempt</button>
              <div className="tested-row">
                <label htmlFor={`res-${t.id}`}>Result {t.unit === "in" ? "(in)" : "(lb)"}</label>
                <input id={`res-${t.id}`} inputMode="decimal" placeholder="—" value={tested[t.rmKey] || ""}
                  aria-label={`${t.lift} result`}
                  onChange={e => setTested(p => ({ ...p, [t.rmKey]: e.target.value }))} />
              </div>
              {t.rmKey === "broad" && tested.broadBase && (
                <div className="systemload">Week-1 baseline <b>{tested.broadBase} in</b> — target is {parseFloat(tested.broadBase) + 4} in
                  {tested.broad ? ` · change ${(parseFloat(tested.broad) - parseFloat(tested.broadBase)).toFixed(1)} in` : ""}</div>
              )}
            </section>
          );
        })}
        <div className="notes-label">Test session notes</div>
        <textarea value={notes[sessKey] || ""} placeholder="Bar speed on each single, any rep stopped as grindy, footwear and surface for the jump…"
          onChange={e => setNotes(p => ({ ...p, [sessKey]: e.target.value }))} />
        <button className={`finishbtn ${sessDone[sessKey] ? "done-on" : ""}`} onClick={() => setSessDone(p => ({ ...p, [sessKey]: !p[sessKey] }))}>
          {sessDone[sessKey] ? "✓ TEST SESSION FINISHED" : "FINISH TEST SESSION"}
        </button>
        <footer className="foot">No squat or deadlift maxima at any point in this block. Supplemental work this week is technique-only at 4 RIR or easier.</footer>
      </div>
    );
  };

  const renderSettings = () => (
    <section className="card settings">
      <div className="ex-head"><h2>Settings</h2><button className="donebtn" onClick={() => setSettingsOpen(false)}>✕</button></div>
      <div className="set-label">Plan name</div>
      <input className="planname" value={settings.planName ?? ""} placeholder="Astra · Concurrent Block"
        onChange={e => setSettings(s => ({ ...s, planName: e.target.value }))} />
      <div className="set-label">Skin</div>
      <div className="swatches">
        {Object.entries(THEMES).map(([id, th]) => (
          <button key={id} className={`swatch ${settings.theme === id ? "on" : ""}`} aria-pressed={settings.theme === id}
            onClick={() => setSettings(s => ({ ...s, theme:id }))}>
            <span className="sw-dot" style={{ background: th.v.bg, borderColor: th.v.accent }}><span className="sw-accent" style={{ background: th.v.accent }} /></span>
            <span className="sw-name">{th.name}</span>
          </button>
        ))}
      </div>
      <div className="set-label">Timer alert — tap to preview</div>
      <div className="seg">
        {Object.entries(TONES).map(([id, name]) => (
          <button key={id} className={`seg-btn ${settings.tone === id ? "on" : ""}`}
            onClick={() => { setSettings(s => ({ ...s, tone:id })); ensureAudio(); setTimeout(() => playTone(audioRef.current, id), 60); }}>
            {name}
          </button>
        ))}
      </div>
      <div className="set-label">Training days — tap a weekday for each session</div>
      {DAYS.map(d => (
        <div className="dayrow" key={d.id}>
          <span className="dayrow-name">{d.lift}</span>
          <div className="daypick">
            {WEEKDAYS.map((wd, i) => (
              <button key={i} className={`daybtn ${dayMap[d.id] === i ? "on" : ""}`}
                onClick={() => setSettings(s => ({ ...s, dayMap: { ...dayMap, [d.id]: i } }))}>{wd[0]}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="toggle-row">
        <span>Vibrate on timer end</span>
        <button className={`pill ${settings.vibrate ? "on" : ""}`} aria-pressed={settings.vibrate}
          onClick={() => setSettings(s => ({ ...s, vibrate: !s.vibrate }))}>{settings.vibrate ? "On" : "Off"}</button>
      </div>
      <div className="toggle-row">
        <span>Auto-start rest when a set is logged</span>
        <button className={`pill ${settings.autoRest ? "on" : ""}`} aria-pressed={settings.autoRest}
          onClick={() => setSettings(s => ({ ...s, autoRest: !s.autoRest }))}>{settings.autoRest ? "On" : "Off"}</button>
      </div>
      <div className="set-label">Weekly review — for the Claude Code coaching loop</div>
      <button className="solid full" onClick={() => copyText(buildReviewJSON(week), "AI report (JSON) copied — paste into Claude Code")}>Copy AI report (JSON)</button>
      <button className="solid full" onClick={() => copyText(buildReview(week), "Text report copied")} style={{ marginTop: 8 }}>Copy text report</button>
      <div className="set-label">Restore from backup</div>
      <textarea placeholder="Paste a backup JSON here…" value={restorePaste} onChange={e => setRestorePaste(e.target.value)} />
      <button className="solid full" onClick={restoreBackup} disabled={!restorePaste.trim()}>Restore</button>
    </section>
  );

  /* ── layout ── */
  const vol = weekVolume(week);
  const budget = dayData ? dayData.budget : null;
  const budgetTotal = budget ? budget.warm + budget.pri + budget.acc + budget.fin : 0;
  return (
    <div className="app" style={themeStyle}>
      <style>{css}</style>
      <header className="hdr">
        <div className="hdr-row">
          <div className="brand">{(settings.planName || "Astra · Concurrent Block").toUpperCase()}</div>
          <div className={`status s-${status}`}>{toast || (status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved" : "")}</div>
        </div>
        <div className="toolbar">
          <button className={`tool ${settingsOpen ? "on" : ""}`} onClick={() => setSettingsOpen(o => !o)}><span className="ic">⚙</span>Settings</button>
          <button className={`tool ${wake ? "on" : ""}`} onClick={toggleWake} aria-pressed={wake}><span className="ic">☀</span>{wake ? "Awake" : "Screen"}</button>
          <button className="tool" onClick={exportBackup}><span className="ic">⬇</span>Backup</button>
          <button className="tool" onClick={() => copyText(buildReviewJSON(week), "AI report (JSON) copied — paste into Claude Code")}><span className="ic">✦</span>AI Analysis</button>
        </div>
        <div className="wave" role="tablist" aria-label="Select week">
          {INTENSITY.map((pct, i) => {
            const w = i + 1;
            const deload = REDUCED.has(w);
            return (
              <button key={w} role="tab" aria-selected={week === w} className={`wave-col ${week === w ? "on" : ""}`}
                aria-label={`Week ${w}, ${pct}% relative stress${BADGE[w] ? ", " + BADGE[w] : ""}`} onClick={() => changeWeek(w)}>
                <span className={`bar ${deload ? "deload" : ""} ${w === TEST_WEEK ? "test" : ""}`} style={{ height: `${((pct-55)/42)*34 + 8}px` }} />
                <span className="wk-num">{w}</span>
              </button>
            );
          })}
        </div>
        <div className="week-row">
          <button className="step" onClick={() => changeWeek(week-1)} disabled={week === 1} aria-label="Previous week">‹</button>
          <div className="week-title">
            <div className="wk">WEEK {week}</div>
            <div className="blk">{PHASE(week)}{BADGE[week] && <span className="badge">{BADGE[week]}</span>}</div>
          </div>
          <button className="step" onClick={() => changeWeek(week+1)} disabled={week === 12} aria-label="Next week">›</button>
        </div>
        <nav className="tabs">
          {DAYS.map(d => (
            <button key={d.id} className={`tab ${day === d.id ? "on" : ""} ${isTestSession(week, d.id) ? "testtab" : ""}`} onClick={() => setDay(d.id)}>
              {sessDone[`${week}-${d.id}`] && <span className="tab-done">✓</span>}
              <span className="tab-day">{WEEKDAYS[dayMap[d.id]]}</span>
              <span className="tab-lift">{isTestSession(week, d.id) ? "TEST" : d.lift}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="session">
        {settingsOpen && renderSettings()}
        {isTest ? renderTestDay() : (
          <div>
            <div className="cap-note">
              75-min cap · {budget.warm} warm-up / {budget.pri} priority / {budget.acc} accessory / {budget.fin} finisher = <b>{budgetTotal} min</b>
              {" · "}target RIR {TARGET_RIR(week)} · elastic and running sit outside the cap
            </div>
            {sessionTime[sessKey] && (
              <div className="sessiontime">Workout time <b><SessionClock start={sessionTime[sessKey].start} end={sessionTime[sessKey].end} /></b></div>
            )}
            <div className="focus"><b>Focus</b>{sessionFocus(week, day)}</div>
            <div className="ridenote"><b>Cycling</b>{RIDE_NOTE[day]}</div>
            {addFlag && (
              <div className="banner alertbanner"><b>Adductor gate is open:</b> an abnormal check was logged this week. Running progressions and tiers 2 and 3 are held until two consecutive normal checks. Movement-altering pain means suspend impact work and get it looked at.</div>
            )}
            {subTwoCount >= 2 && (
              <div className="banner"><b>{subTwoCount} sets below the RIR floor of {RIR_FLOOR(week)}.</b> Level 1 signal (§5.14): hold the next scheduled increment, cut the OHP technical exposure first, and run AI Analysis before changing anything else.</div>
            )}
            <div className="progress"><b>{doneCount}</b> / {visibleEx.length} items done</div>
            <details className="volaudit">
              <summary>Week {week} volume floors{REDUCED.has(week) ? " — waived (deload)" : ""}</summary>
              <div className="voltable">
                {[["Compound pressing", vol.press, "16–20", vol.press >= 16 && vol.press <= 20],
                  ["Vertical pulling", vol.vpull, "8–12", vol.vpull >= 8 && vol.vpull <= 12],
                  ["Horizontal pulling", vol.hpull, "6", vol.hpull >= 6],
                  ["Lower-body exposures", vol.lower, "exactly 2", vol.lower === 2],
                  ["Shoulder-health sessions", vol.shoulder, "3 of 4", vol.shoulder >= 3],
                  ["Direct ab sessions", vol.abs, "3", vol.abs >= 3],
                  ["Press : pull", vol.ratio, "≤ 1.30", vol.ratio != null && vol.ratio <= 1.30],
                ].map(([label, v, floor, ok]) => (
                  <div className="volrow" key={label}>
                    <span>{label}</span><b>{v}</b><span className="volfloor">{floor}</span>
                    {/* A deload waives the volume floors it deliberately undershoots — it does not
                        waive the structural ones (exposures, shoulder health, abs), which still hold. */}
                    <span className={ok ? "volok" : REDUCED.has(week) ? "volwaived" : "volbad"}>{ok ? "met" : REDUCED.has(week) ? "waived" : "under"}</span>
                  </div>
                ))}
              </div>
            </details>
            {order[sessKey] && <button className="resetorder" onClick={resetOrder}>↺ Reset to recommended order</button>}
            <section className="card warmcard">
              <button className="warm-toggle" aria-expanded={warmOpen} onClick={() => setWarmOpen(o => !o)}>
                <span>Warm-up · {budget.warm} min · inside the cap</span>
                <span className="chev">{warmOpen ? "−" : "+"}</span>
              </button>
              {warmOpen && <ul className="warm-list">{WARMUP_MENU[day].map((m, i) => <li key={i} className={i === 0 ? "warmreason" : ""}>{m}</li>)}</ul>}
            </section>
            {visibleEx.map(ex => renderCard(ex))}
            <div className="notes-label">Session notes — bar speed, tissue response, anything the coach should see</div>
            <textarea value={notes[sessKey] || ""} placeholder="e.g. Last OHP double slowed through the sticking region. Dips clean. Adductors quiet after the hill reps."
              onChange={e => setNotes(p => ({ ...p, [sessKey]: e.target.value }))} />
            <button className={`finishbtn ${sessDone[sessKey] ? "done-on" : ""}`} onClick={() => {
              const nowDone = !sessDone[sessKey];
              setSessDone(p => ({ ...p, [sessKey]: nowDone }));
              setSessionTime(p => { const cur = p[sessKey]; if (!cur) return p; return { ...p, [sessKey]: { ...cur, end: nowDone ? Date.now() : null } }; });
            }}>
              {sessDone[sessKey] ? "✓ SESSION FINISHED" : "FINISH SESSION"}
            </button>
            {sessDone[sessKey] && (
              <div className="summary">
                <b>Session summary — </b>{doneCount}/{visibleEx.length} items done · {setsLoggedCount()} sets logged
                {subTwoCount > 0 ? ` · ${subTwoCount} set${subTwoCount === 1 ? "" : "s"} below the RIR floor this week` : ` · every set at or above the RIR floor of ${RIR_FLOOR(week)}`}
                {(() => { const b = dayMainE1rm(); return b ? ` · best ${b.name} e1RM ≈ ${b.est} lb` : ""; })()}
                . {addFlag ? "Adductor gate is open — no running or tier progression until it clears."
                   : subTwoCount >= 2 ? "Hold the next scheduled increment." : "Clear to run the next session as written."}
              </div>
            )}
            <footer className="foot">Conflict hierarchy: health → OHP / dip / pull-up → prescribed rides → elastic quality → deadlift maintenance → squat and bench → secondary volume. Elastic work may never cost a priority pressing session.</footer>
          </div>
        )}
      </main>

      {timer && (
        <TimerBar label={timer.label} endsAt={timer.endsAt} onDone={timerDone}
          onExtend={() => setTimer(t => t ? { ...t, endsAt: t.endsAt + 15000 } : t)}
          onStop={() => setTimer(null)} />
      )}
    </div>
  );
}

/* ═══════════ STYLES ═══════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
.app{min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;max-width:520px;margin:0 auto;transition:background .25s}
.app *{box-sizing:border-box;margin:0;padding:0}
.app button{font-family:inherit;cursor:pointer;background:none;-webkit-appearance:none;appearance:none}
.app .inlbtn,.app .ghost,.app .solid,.app .finishbtn{border-style:solid}
.app .tool,.app .donebtn,.app .timer-act,.app .tab,.app .seg-btn,.app .pill,.app .daybtn,.app .swatch,.app .bs-btn{border-style:solid}
.app .rxfill{border-style:dashed}
.app .step,.app .warm-toggle,.app .wave-col{border:none}
.app input,.app textarea{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;width:100%;min-height:44px;text-align:center;background:var(--inputBg);border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:8px;transition:border-color .15s,color .15s}
.app textarea{font-family:'Inter';font-size:13px;font-weight:400;text-align:left;min-height:64px;resize:vertical;line-height:1.5}
.app input:focus,.app textarea:focus{outline:none;border-color:var(--accent)}
.app input::placeholder,.app textarea::placeholder{color:var(--faint)}
.app input.warn{border-color:var(--warn);color:var(--warn)}
.app input.under{border-color:var(--warn);color:var(--warn);background:color-mix(in srgb,var(--warn) 8%,var(--inputBg))}
.app input.over{border-color:var(--ok);color:var(--ok);background:color-mix(in srgb,var(--ok) 8%,var(--inputBg))}
.app button:focus-visible,.app input:focus-visible,.app a:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.hdr{padding:calc(18px + env(safe-area-inset-top,0px)) calc(16px + env(safe-area-inset-right,0px)) 0 calc(16px + env(safe-area-inset-left,0px));background:var(--bg);border-bottom:1px solid var(--line)}
.hdr-row{display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand{font-family:'Barlow Condensed';font-weight:700;font-size:18px;letter-spacing:.14em}
.brand span{color:var(--accent)}
.status{font-size:11px;color:var(--muted);min-height:14px;text-align:right}
.s-saved{color:var(--ok)}.s-error{color:var(--warn)}
.toolbar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.tool{min-height:54px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);background:var(--panel);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 60%,var(--muted));font-weight:600}
.tool .ic{font-size:16px;color:color-mix(in srgb,var(--accent) 75%,var(--muted));line-height:1}
.tool.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--panel))}
.tool:disabled{opacity:.35}
.wave{display:flex;gap:4px;align-items:flex-end;margin:12px 0 4px;height:58px}
.wave-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;padding:2px 0;min-width:0}
.bar{width:100%;max-width:24px;border-radius:3px 3px 0 0;background:var(--barBg);transition:background .15s}
.bar.deload{background:var(--barDim)}
.bar.test{background:var(--barDim);border:0.5px solid var(--ok)}
.wave-col .bar.deload.test{border-color:var(--ok)}
.wave-col.on .bar{background:var(--accent)}
.wave-col.on .bar.deload{background:var(--slate)}
.wave-col.on .bar.test{background:var(--ok)}
.wk-num{font-family:'Barlow Condensed';font-size:11px;color:var(--faint)}
.wave-col.on .wk-num{color:var(--accent);font-weight:700}
.week-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0 8px}
.step{font-size:26px;color:var(--muted);width:44px;height:44px;line-height:1}
.step:disabled{opacity:.25;cursor:default}
.week-title{text-align:center}
.wk{font-family:'Barlow Condensed';font-weight:700;font-size:24px;letter-spacing:.08em}
.blk{font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
.badge{margin-left:8px;padding:2px 7px;border:1px solid var(--accentDim);border-radius:99px;color:var(--accent);font-weight:600}
.tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding-bottom:12px}
.tabs.two{grid-template-columns:repeat(2,1fr)}
.tab{position:relative;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:9px;padding:8px 4px;text-align:center;background:var(--panel);color:color-mix(in srgb,var(--ink) 60%,var(--muted))}
.tab.on{border-color:var(--accent);color:var(--accent)}
.tab-day{display:block;font-family:'Barlow Condensed';font-weight:700;font-size:15px;letter-spacing:.1em}
.tab-lift{display:block;font-size:10px;color:var(--muted);margin-top:1px}
.tab.on .tab-lift{color:var(--accent)}
.tab-done{position:absolute;top:3px;right:6px;color:var(--ok);font-size:11px}
.session{padding:14px 16px 120px}
.cap-note{font-size:10.5px;color:var(--muted);letter-spacing:.03em;text-align:center;margin-bottom:10px}
.focus{border-left:3px solid var(--accent);background:var(--panel);border-radius:0 10px 10px 0;padding:10px 12px;font-size:12.5px;line-height:1.55;color:var(--ink);margin-bottom:12px}
.focus b{display:block;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:3px}
.progress{font-family:'Barlow Condensed';font-weight:600;font-size:13px;letter-spacing:.08em;color:var(--muted);text-align:center;margin-bottom:12px;text-transform:uppercase}
.progress b{color:var(--accent)}
.banner{background:var(--panel);border:1px solid var(--warn);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5;color:var(--warn);margin-bottom:12px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 14px 12px;margin-bottom:12px}
.card.main{border-color:var(--mainLine);background:var(--mainBg)}
.card.skipped{opacity:.55}
.card.exdone{border-color:var(--ok)}
.card.exdone .ex-head h2{color:var(--muted)}
.ex-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;min-width:0}
.ex-title{flex:1;min-width:0}
.ex-head h2{font-size:15px;font-weight:600;line-height:1.2}
.exname{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.tagrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.ex-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.draghandle{display:flex;align-items:center;justify-content:center;width:30px;min-height:42px;padding:0;color:var(--faint);background:none;border:none;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;flex-shrink:0}
.draghandle:active{cursor:grabbing;color:var(--accent)}
.ex-tools{display:flex;align-items:center;gap:8px;margin-top:10px}
.ytbtn{display:flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:99px;background:transparent;text-decoration:none}
.ytbtn svg{display:block;border-radius:5px}
.tag{flex:none;font-style:normal;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:2px 8px;margin-left:0;white-space:nowrap}
.alt-tag{color:var(--accent);border-color:var(--accentDim)}
.inlbtn{min-height:34px;padding:0 13px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:8px;color:color-mix(in srgb,var(--accent) 75%,var(--muted));background:transparent;font-family:'Barlow Condensed';font-weight:700;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap}
.inlbtn.on{border-color:var(--accentDim);background:color-mix(in srgb,var(--accent) 8%,transparent);color:var(--accent)}
.alt-note{font-size:10px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
.planname{font-family:'Barlow Condensed'!important;font-size:17px!important;text-align:left!important;padding:8px 12px!important}
.donebtn{width:34px;height:34px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:99px;color:var(--faint);font-size:15px}
.donebtn.on{border-color:var(--ok);color:var(--ok)}
.meta-row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px}
/* The block prescribes top sets and back-offs together ("1×5 + 3×5 @ +32.5 lb"), and the
   primer line is longer still, so this must WRAP at 375px. Individual tokens stay unbroken. */
.rx{font-family:'Barlow Condensed';font-weight:600;font-size:19px;font-variant-numeric:tabular-nums;white-space:normal;line-height:1.25;min-width:0;max-width:100%}
.rx>span{white-space:nowrap}
.primercard .rx,.elasticcard .rx,.sprintcard .rx{font-size:16px}
.rx-load{color:var(--accent)}
.rx-pct{color:var(--muted);font-size:13px}
.rx-off{color:var(--muted);font-size:13px}
.warmups{background:var(--inputBg);border-radius:8px;padding:10px;margin:10px 0 0;font-size:12px;color:var(--muted)}
.warmups-title{font-weight:600;color:var(--slate);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;font-size:10px}
.warmup-row{display:flex;gap:2px;align-items:center;flex-wrap:wrap;font-family:'Barlow Condensed';font-weight:600;font-size:16px;font-variant-numeric:tabular-nums;color:var(--ink)}
.warmup-row .arrow{color:var(--faint)}
.plates{margin-top:6px;font-size:11px;color:var(--slate);font-variant-numeric:tabular-nums}
.lastnote{border-left:3px solid var(--accent);background:var(--inputBg);border-radius:0 8px 8px 0;padding:8px 10px;margin:10px 0 0;font-size:12px;line-height:1.5;color:var(--ink)}
.lastnote b{color:var(--accent);font-size:10px;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:2px}
.grid-head,.set-row{display:grid;grid-template-columns:20px 50px 1fr 1fr 44px 40px;gap:6px;align-items:center}
.grid-head{margin:12px 0 6px;font-size:9.5px;font-weight:700;letter-spacing:.09em;color:var(--muted)}
.set-row{margin-bottom:8px}
.set-n{font-family:'Barlow Condensed';font-weight:600;font-size:15px;color:var(--muted);text-align:center}
.prev{font-family:'Barlow Condensed';font-weight:600;font-size:15px;font-variant-numeric:tabular-nums;color:var(--slate);text-align:center;background:var(--prevBg);border-radius:8px;min-height:44px;display:flex;align-items:center;justify-content:center;padding:0 2px}
.prev.empty{color:var(--faint)}
.rxfill{min-height:44px;border:0.5px dashed color-mix(in srgb,var(--accent) 6%,transparent);border-radius:8px;color:var(--accent);font-family:'Barlow Condensed';font-weight:700;font-size:14px;letter-spacing:.05em}
.set-btns{display:flex;gap:8px;margin-top:8px}
.ghost{flex:1;min-height:46px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:9px;color:var(--accent);background:transparent;font-family:'Barlow Condensed';font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase}
.solid{flex:1;min-height:46px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:9px;background:transparent;color:var(--accent);font-family:'Barlow Condensed';font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase}
.solid:disabled{opacity:.4}
.solid.full{width:100%;margin-top:8px;flex:none}
.rm-set{flex:0 0 52px;color:var(--muted);border-color:var(--line);background:transparent;font-size:18px}
.timer-btn{flex:1.2}
.shared-rest{flex:1.2;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;border:1px solid var(--line);border-radius:8px;min-height:46px;text-align:center}
.warmcard{padding:0;overflow:hidden}
.warm-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;padding:13px 14px;font-size:11.5px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;font-weight:600}
.chev{color:var(--accent);font-size:18px;line-height:1}
.warm-list{list-style:none;padding:0 14px 12px}
.warm-list li{font-size:12.5px;color:var(--ink);padding:7px 0;border-top:1px solid var(--line)}
.cue{font-size:11.5px;color:var(--muted);margin:10px 2px 0;line-height:1.5}
.cue b{color:var(--slate);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;margin-right:4px}
.exnote{margin-top:8px;font-family:'Inter'!important;font-size:12.5px!important;font-weight:400!important;text-align:left!important;min-height:40px!important;padding:8px 10px!important}
.notes-label{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin:16px 0 6px}
.finishbtn{display:block;width:100%;min-height:54px;margin-top:14px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:11px;background:transparent;color:var(--accent);font-family:'Barlow Condensed';font-weight:700;font-size:16px;letter-spacing:.1em}
.finishbtn.done-on{background:transparent;border-color:var(--ok);color:var(--ok)}
.summary{background:var(--panel);border:1px solid var(--ok);border-radius:10px;padding:12px;font-size:12.5px;line-height:1.6;color:var(--ink);margin-top:10px}
.summary b{color:var(--ok)}
.foot{text-align:center;font-size:10.5px;color:var(--faint);margin-top:20px;line-height:1.6}
.timerbar{position:fixed;left:12px;right:12px;bottom:12px;max-width:496px;margin:0 auto;background:var(--panel);border:1px solid var(--accent);border-radius:12px;display:flex;align-items:center;gap:10px;padding:10px 14px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.timer-info{flex:1;display:flex;flex-direction:column;min-width:0}
.timer-label{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.timer-clock{font-family:'Barlow Condensed';font-weight:700;font-size:28px;font-variant-numeric:tabular-nums;color:var(--accent);line-height:1.05}
.timer-act{min-height:44px;min-width:56px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:8px;font-family:'Barlow Condensed';font-weight:700;font-size:15px;color:var(--ink)}
.timer-act.stop{min-width:44px;color:var(--muted)}
.test-note{font-size:12px;color:var(--muted);line-height:1.55;margin-bottom:12px}
.tested-row{display:flex;gap:10px;align-items:center;margin-top:12px}
.tested-row label{flex:1;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.tested-row input{flex:1}
.settings .set-label{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin:14px 0 8px}
.swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.swatch{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 2px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:10px}
.swatch.on{border-color:var(--accent)}
.sw-dot{width:26px;height:26px;border-radius:99px;border:2px solid;display:flex;align-items:center;justify-content:center}
.sw-accent{width:10px;height:10px;border-radius:99px}
.sw-name{font-size:9.5px;color:var(--muted)}
.swatch.on .sw-name{color:var(--accent)}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.seg-btn{min-height:42px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:9px;color:var(--muted);font-family:'Barlow Condensed';font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase}
.seg-btn.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.dayrow{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line)}
.dayrow-name{flex:0 0 72px;font-size:12px;font-weight:600}
.daypick{display:flex;gap:4px;flex:1}
.daybtn{flex:1;min-height:34px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:7px;font-family:'Barlow Condensed';font-weight:700;font-size:12px;color:var(--muted)}
.daybtn.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.toggle-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--line);margin-top:10px;font-size:13px}
.pill{min-width:64px;min-height:36px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:99px;color:var(--muted);font-family:'Barlow Condensed';font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase}
.pill.on{border-color:var(--ok);color:var(--ok)}
.card.dragging{position:relative;z-index:50;box-shadow:0 10px 28px rgba(0,0,0,.45);cursor:grabbing}
.card.dragging .draghandle{color:var(--accent)}
.barspeed-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.bs-label{flex:0 0 auto;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.barspeed{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;flex:1}
.bs-btn{min-height:34px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:8px;background:transparent;color:var(--muted);font-family:'Barlow Condensed';font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.bs-btn.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.sessiontime{text-align:center;font-family:'Barlow Condensed';font-weight:600;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.sessiontime b{color:var(--accent);font-size:15px;font-weight:700}
.sessionclock{font-variant-numeric:tabular-nums}
.resetorder{display:block;margin:0 auto 12px;color:var(--muted);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;background:none;border:none;text-decoration:underline}
/* ── Astra block: cut-priority chips, elastic / sprint / primer / adductor cards ── */
.tag.cut-never{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 40%,transparent)}
.tag.cut-second{color:var(--slate);border-color:color-mix(in srgb,var(--slate) 40%,transparent)}
.tag.cut-first{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 40%,transparent)}
.systemload{font-size:11.5px;color:var(--muted);padding:8px 0 0;letter-spacing:.02em}
.systemload b{color:var(--ink);font-family:'Barlow Condensed';font-size:14px;font-variant-numeric:tabular-nums}
.banner.soft{border-color:color-mix(in srgb,var(--accent) 45%,transparent);color:var(--muted);margin:10px 0 0}
.banner.alertbanner{border-color:var(--warn);border-width:1.5px;color:var(--warn)}
.ridenote{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.55;color:var(--muted);margin-bottom:12px}
.ridenote b{display:block;font-family:'Barlow Condensed';font-weight:700;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--slate);margin-bottom:3px}
.seqlist{margin:10px 0 0;padding-left:18px}
.seqlist li{font-size:12px;color:var(--ink);line-height:1.5;padding:2px 0}
.warm-list li.warmreason{color:var(--muted);font-style:italic;font-size:11.5px;border-top:none}
.warm-list li.dropped{color:var(--faint);text-decoration:line-through}
/* set rows: the top set and the week-1 calibration single read differently from back-offs */
.set-row.topset .set-n{color:var(--accent);font-weight:700}
.set-row.topset{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.set-row.calibrow{background:color-mix(in srgb,var(--slate) 10%,transparent)}
.set-row.calibrow .set-n{color:var(--slate);font-weight:700}
.rxfill:disabled{opacity:.3}
/* elastic block */
.tierrow{border-top:1px solid var(--line);padding:10px 0 2px}
.tiertop{display:flex;justify-content:space-between;align-items:baseline}
.tiername{font-family:'Barlow Condensed';font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink)}
.tiertarget{font-family:'Barlow Condensed';font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);font-variant-numeric:tabular-nums}
.tierex{font-size:11.5px;color:var(--muted);line-height:1.5;margin:4px 0 8px}
.tierlog{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.tierlog label{flex:1;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.tierlog input{flex:0 0 72px;text-align:center}
.tierlog .rxfill{flex:0 0 42px}
.qrow{display:flex;align-items:center;gap:8px;margin-top:10px}
.tested-row.baseline{border-top:1px solid var(--line);padding-top:12px}
/* sprint block */
.sprintmeta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 10px;font-size:11.5px;color:var(--muted)}
.sprintmeta b{color:var(--ink);font-family:'Barlow Condensed';font-size:14px}
.sprintmeta .ok{color:var(--ok)}
.sprintmeta .warn-txt{color:var(--warn)}
/* adductor gate */
.checkcard.alert{border-color:var(--warn)}
.checkrow{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--line)}
.checklbl{flex:0 0 118px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.checkrow .barspeed{grid-template-columns:repeat(2,1fr)}
.bs-btn.on.ok{border-color:var(--ok);color:var(--ok);background:color-mix(in srgb,var(--ok) 10%,transparent)}
.bs-btn.on.bad{border-color:var(--warn);color:var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent)}
.abnormal{border-top:1px solid var(--warn);margin-top:10px;padding-top:10px}
.abnormal p{font-size:12px;line-height:1.55;color:var(--ink);margin:0 0 8px}
.abnormal .escalate{color:var(--warn);font-size:11.5px;line-height:1.55;margin-top:8px}
/* volume floor audit */
.volaudit{margin-bottom:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.volaudit summary{padding:10px 12px;font-family:'Barlow Condensed';font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);cursor:pointer}
.voltable{padding:0 12px 10px}
.volrow{display:grid;grid-template-columns:1fr 40px 62px 54px;gap:6px;align-items:center;padding:6px 0;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)}
.volrow b{color:var(--ink);font-family:'Barlow Condensed';font-size:14px;text-align:right;font-variant-numeric:tabular-nums}
.volfloor{text-align:right;font-size:10.5px;color:var(--faint)}
.volok{color:var(--ok);text-align:right;font-size:10px;letter-spacing:.07em;text-transform:uppercase}
.volbad{color:var(--warn);text-align:right;font-size:10px;letter-spacing:.07em;text-transform:uppercase}
.volwaived{color:var(--slate);text-align:right;font-size:10px;letter-spacing:.07em;text-transform:uppercase}
.tab.testtab .tab-lift{color:var(--accent)}
@media (prefers-reduced-motion: reduce){.app *{transition:none!important}}
`;

