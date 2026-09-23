import { useState, useEffect, useRef } from "react";
import { SESSIONS, IMPACT, AUDIT, META, WEEK13, SOURCE } from "./program.js";

/* ═══════════ PROGRAM DATA — Astra Synthesized Concurrent Block v4.0-syn2 ═══════════
   Source of truth: docs/12-week-concurrent-block-v4.md, generated into src/program.js
   from docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json (48 sessions, 397 prescribed rows,
   24 impact sessions, plus the week-13 deferred-test contingency).

   src/program.js is the SINGLE edit point for every prescription. Nothing in this file
   hard-codes a load, a rep count or a contact target; everything below reads the
   generated table. test.mjs guards the block's floors, ceilings and gates so a weekly
   autoregulation edit cannot breach them.

   Week composition VARIES: week 12 Wednesday carries no overhead press, the three target
   tests replace Friday's ordinary exposures, and weeks 7–11 split Monday's pull-up work
   into a longer target-rep set plus three triples. That is why sessions are a per-week
   table rather than a static day list with a load wave over it.

   WHAT CHANGED IN V2 (see docs/source/SYNTHESIS_CHANGELOG_V2.md):
   - Strength time is a GUIDELINE, not a hard cap. Week-12 Friday is deliberately 94
     minutes of testing. The impact clocks ARE hard caps and now differ by day:
     Wednesday 15 minutes, Friday 30, both including travel.
   - Daily power work replaces the old generic kettlebell primer — four explicit power
     days with their own loads, rehearsals and stop rules.
   - Direct biceps on Sunday and Wednesday only, three recurring variation pairs at
     2×8–12. No direct triceps anywhere.
   - Added leg accessories: Monday reverse lunge, Friday supported single-leg RDL.
   - Week 13 is an OPTIONAL Friday slot for tests deferred before their target attempt.
     It is not a thirteenth training week and carries no deadlift.                     */

const BLOCK_VERSION = META.blockVersion;
/* Stamped into every saved bundle. A bundle carrying a DIFFERENT id was written by an
   earlier program and its training data must not bleed into this block — `squat`, `dl`,
   `pullup` and `copen` are live ids in more than one program, so an old log would
   otherwise surface as this block's prescription and as its "LAST WK" reference. */
const PROGRAM_ID = META.programId;
const BW = META.bw;                       // bodyweight anchor for system-load readouts

/* The four day shells. Everything else about a session comes from SESSIONS[week][day]. */
const DAYS = [
  { id:"sun", lift:"DIP", title:"Dip priority, bench and rows",
    ride:"AM: the prescribed long ride. Strength starts at least 6 h after the ride FINISHES. Six hours is scheduling separation, not proof of recovery — if the gap cannot be made, reduce or omit this session and log the missed volume." },
  { id:"mon", lift:"PULL / DL", title:"Pull-up, deadlift and moderate OHP",
    ride:"No ride today. Deadlift sits on a fixed weekday — this is the only conventional pull of the week." },
  { id:"wed", lift:"OHP", title:"Impact, then overhead press priority",
    ride:"Tuesday's prescribed ride. A previous-day ride does not automatically disqualify impact; residual fatigue or altered mechanics does." },
  { id:"fri", lift:"SQUAT", title:"Impact and running, then squat",
    ride:"Thursday's recovery ride must actually be easy — the week-12 and week-13 assessment gates require it. Any optional Friday ride goes after all impact and lifting." },
];
const DAY_BY_ID = Object.fromEntries(DAYS.map(d => [d.id, d]));

/* Substitutions permitted without review (§17). Primary lifts have none by design.
   Each item also carries its own `fallback` from the plan, which the card shows; this
   map is only for the ones offered as a one-tap swap. */
const ALT = {
  row: "Chest-supported independent-arm lever / T-bar, or bilateral chest-supported row",
  facepull: "Band external rotation, or prone Y and T",
  extrot: "Band external rotation, or prone Y and T",
  proney: "Band external rotation, or prone Y and T",
  pallof: "Cable or landmine anti-rotation variant at the same reserve",
  landmine: "Cable high-to-low chop at the same reserve",
  scoop: "Cable lift, same sets and intent",
  abwheel: "Short-range ab wheel or bent-knee hanging raise",
  hollow: "Tucked-lever hollow hold",
  bodysaw: "Short-range ab wheel if no safe slider surface",
  hlr: "Bent-knee hanging raise if straight legs swing",
};

const REDUCED = new Set(META.deloadWeeks);
const TEST_WEEK = META.testWeek, TEST_DAY = META.testDay;
const isTestSession = (w, d) => w === TEST_WEEK && d === TEST_DAY;

const BADGE = { 1:"Jump baseline", 5:"High tier enters", 7:"Longer pull-up set", 9:"Flat running", 12:"Tests on Friday" };
const PHASE = (w) => (w === 1 ? "Calibration" : w === 6 ? "Deload" : w === 12 ? "Deload + Test"
                    : w <= 5 ? "Accumulation" : "Intensification");

/* Week-strip bar height = that week's compound work sets (press + vertical + horizontal).
   Derived, never asserted: 33 in normal weeks, 19 in week 6, 15 in week 12. */
const WEEK_LOAD = (w) => { const a = AUDIT[w]; return a ? a.press + a.vertical + a.horizontal : 0; };

/* Reserve floor. C08 sets the success standard at >= 2 RIR, aiming for 2; the deload and
   test weeks hold everything at 4 or easier. A set below the floor is flagged. */
const RIR_FLOOR = (w) => (REDUCED.has(w) ? 4 : 2);
const TARGET_RIR = (w) => (REDUCED.has(w) ? "4+" : "2–3");

/* Each prescription carries its OWN reserve ("2–3", "3+", "≥2; aim 2"), which is what the
   set row shows and judges against — the week floor is only the fallback. An RPE target
   ("RPE ≤4; fast intent") is an effort instruction, not a reserve, so it gets no numeric
   floor and never warns: the power work is deliberately far from failure. */
const rirTarget = (rirText) => {
  if (!rirText || /RPE/i.test(rirText)) return null;
  const m = String(rirText).match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

const CUT_LABEL = { never:"never-cut", second:"cut-2nd", first:"cut-1st" };
const WEEKDAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

/* ── Impact ledger (§12) ────────────────────────────────────────────────────────────
   Three tiers, counted as landings. One bilateral landing is one contact. The high tier
   is capped at six TRAINING contacts a week and is absent before week 5; weeks 1 and 12
   is capped at six training contacts a week and is absent before week 5. The broad-jump
   MEASUREMENT was withdrawn after review; the training jumps in weeks 5 and 7–11 remain.

   Each impact day has its own clock, which starts BEFORE travel, and its own hard cap:
   Wednesday 15 minutes, Friday 30. The cap is on the clock, not on the contacts.      */
const TIER_NAME = { low:"Low · bilateral pogos", moderate:"Moderate · hurdle hops / rehearsals", high:"High · maximal broad jumps" };
const TIER_KEYS = ["low", "moderate", "high"];
const impactFor = (w, dId) => (dId === "wed" || dId === "fri") ? (IMPACT[w]?.[dId] || null) : null;
const hasImpact = (w, dId) => { const x = impactFor(w, dId); return !!x && TIER_KEYS.some(t => x[t] > 0); };
/* Running is Friday only, after the jumps and before lifting. There is no second running
   day, and weeks 1 and 12 have none at all — those Fridays are measurement days. */
const runFor = (w, dId) => (dId === "fri" ? (impactFor(w, "fri")?.run || null) : null);
const RUN_CEILING = META.runCeiling;          // 60 acceleration m / 120 total m per session

/* ── Week 13 (§18) ──────────────────────────────────────────────────────────────────
   An OPTIONAL Friday slot carrying only measurements deferred before their week-12
   target attempt. Not a thirteenth training week, not one of the 48 sessions, no
   deadlift, and never a retry of a completed or failed target set. A week-13 result is
   labelled week 13 and never becomes a week-12 achievement.                           */
const W13_WEEK = WEEK13.week;
const w13TestFor = (exId) => WEEK13.tests.find(t => t.id === exId) || null;

/* ── Prescription ───────────────────────────────────────────────────────────────────
   getRx is a thin read of the generated item: the block resolves sets, reps, load,
   reserve and rest per week, so nothing is recomputed here. It still produces rows[] —
   one target per set — because renderSetRow fills placeholders and the Rx button from it. */
const fmtLb = (n) => (n == null ? "" : String(Math.round(n * 10) / 10));

function sessionFor(week, dayId) {
  if (week === W13_WEEK) return null;       // week 13 has its own screen
  return SESSIONS[week]?.[dayId] || null;
}

/* Exercise list for a session, with the synthetic cards the plan implies but does not
   list as prescribed rows: the impact block, the running block and the adductor
   reactive check. The week-1/5/7–12 Friday broad jump IS a prescribed row, but it sits
   on the impact clock, so it renders inside the impact card rather than as a set grid. */
function exercisesFor(week, dayId) {
  const ses = sessionFor(week, dayId);
  if (!ses) return [];
  const out = [];
  if (hasImpact(week, dayId)) out.push({ id:"impact", kind:"impact", name:"Impact Block", tag:"plyometric", cut:"never" });
  if (runFor(week, dayId)) out.push({ id:"run", kind:"run", name:"Running", tag:"acceleration", cut:"never" });
  ses.items.forEach(it => { if (it.clock === "strength") out.push({ ...it, kind:"lift" }); });
  if (hasImpact(week, dayId) || runFor(week, dayId))
    out.push({ id:"addcheck", kind:"check", name:"Adductor Check", tag:"gate", cut:"never" });
  return out;
}

/* The impact-clock items (the Friday broad jump) — shown on the impact card, not as a
   set grid, because they are paid for out of the 15/30-minute impact budget. */
function impactItemsFor(week, dayId) {
  const ses = sessionFor(week, dayId);
  return ses ? ses.items.filter(it => it.clock === "impact") : [];
}

/* Rest lookup is per item per week — the plan varies it (180 s upper, 240 s squat and
   deadlift, 45–90 s accessories) and weeks 6 and 12 change several. */
function itemFor(week, dayId, exId) {
  return sessionFor(week, dayId)?.items.find(x => x.id === exId) || null;
}
function restFor(week, dayId, exId) {
  const it = itemFor(week, dayId, exId);
  return it ? it.rest : null;
}

function getRx(ex, week, dayId) {
  if (ex.kind && ex.kind !== "lift") return null;
  const it = itemFor(week, dayId, ex.id);
  if (!it) return null;
  const isDistance = /m$/.test(it.reps);                     // carries: "20 m"
  const isHold = /s$/.test(it.reps);                         // hollow hold: "30 s"
  const unit = isDistance ? "m" : isHold ? "sec" : it.perSide ? "per side" : "reps";
  const repsLabel = isDistance || isHold ? it.reps
                  : it.perSide ? `${it.reps}/side` : String(it.reps);
  const loadLabel = it.load != null
    ? (it.system ? `+${fmtLb(it.load)} lb` : `${fmtLb(it.load)} lb`)
    : it.loadText;
  return {
    sets: it.sets, repsLabel, repsNum: it.repsNum, repsMax: it.repsMax, unit,
    loadLabel, loadNum: it.load,
    rir: it.rir, rest: it.rest, purpose: it.purpose,
    rows: Array.from({ length: it.sets }, () => ({ w: it.load, r: it.repsNum })),
    system: it.system && it.load != null ? BW + it.load : null,
    warmups: it.ramp, rampNote: it.rampNote,
    block: it.block, power: it.power, workSet: it.workSet,
    fallback: it.fallback, progression: it.progression,
  };
}

/* ── Weekly audit (§19) ─────────────────────────────────────────────────────────────
   Computed live from the generated sessions so an autoregulation edit can never silently
   break a floor.

   A PRODUCTIVE work set is prescribed work at the intended reserve — the plan's own
   definition, carried per row as `workSet`. Ramps, power work, shoulder-health and core
   sets are real training but do NOT inflate the pressing and pulling floors, which is
   why the flag is read rather than inferred from the family. One completed left/right
   row pair is one horizontal set, not two.                                            */
function weekVolume(week) {
  const sets = { press:0, vertical:0, horizontal:0, biceps:0 };
  const days = { lower:new Set(), shoulder:new Set(), abs:new Set(), adductor:new Set(),
                 carry:new Set(), unilateral:new Set(), power:new Set(), rotation:new Set() };
  DAYS.forEach(d => {
    const ses = sessionFor(week, d.id);
    if (!ses) return;
    ses.items.forEach(it => {
      /* Read the plan's OWN flags; do not infer an exposure from the family. Direct
         abdominal work spans three families (abs, anti-rotation, dynamic rotation) — the
         floor is four exposure days, and counting family "abs" would report two. */
      if (it.workSet && sets[it.family] != null) sets[it.family] += it.sets;
      if (it.directArm) sets.biceps += it.sets;
      if (it.lowerStrength) days.lower.add(d.id);
      if (it.shoulderHealth) days.shoulder.add(d.id);
      if (it.directAbs) days.abs.add(d.id);
      if (it.family === "adductor") days.adductor.add(d.id);
      if (it.family === "carry") days.carry.add(d.id);
      if (it.dynamicRotation) days.rotation.add(d.id);
      if (it.power) days.power.add(d.id);
      if (it.unilateral) days.unilateral.add(d.id);
    });
  });
  const pull = sets.vertical + sets.horizontal;
  return {
    press: sets.press, vpull: sets.vertical, hpull: sets.horizontal, pull, biceps: sets.biceps,
    lower: days.lower.size, shoulder: days.shoulder.size, abs: days.abs.size,
    adductor: days.adductor.size, carry: days.carry.size, rotation: days.rotation.size,
    unilateral: days.unilateral.size, powerDays: days.power.size,
    ratio: pull ? Math.round((sets.press / pull) * 1000) / 1000 : null,
  };
}
const FLOORS = META.floors;

const ytUrl = (name) => "https://www.youtube.com/results?search_query=" + encodeURIComponent("how to " + name + " form guide") + "&sp=EgIYAQ%253D%253D";
const e1rm = (w, r) => Math.round(w * (1 + r/30));
const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

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

/* Older saves held a single archived object; this block keeps a list of them. */
const asArchiveList = (a) => (Array.isArray(a) ? a : a ? [a] : []);

const DEFAULT_SETTINGS = { theme:"iron", tone:"radar", vibrate:true, autoRest:true,
  planName: META.planName, dayMap:{ sun:0, mon:1, wed:3, fri:5 } };

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
  const [tested, setTested] = useState({ ohp:"", dip:"", pullup:"" });
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
  const [powerQual, setPowerQual] = useState({}); // { "week-day-exId": "crisp"|"slowing"|"stopped" }
  const [addCheck, setAddCheck] = useState({});   // { "week-day": { post, next, detail } }
  const [archived, setArchived] = useState([]);   // every superseded program's data, kept not deleted
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
            // Bundle from an earlier program. Preserve every bit of it (it also rides
            // along in backups), reset this block's own state, and keep only the personal
            // preferences that still make sense.
            //
            // `archived` is a LIST. This repo has now carried three programs, and each
            // migration must add to the shelf rather than overwrite it — archiving the
            // v2.0 block must not destroy the Press-Priority archive already sitting
            // inside it. Older saves held a single object; that shape is lifted into the
            // list on first read. Re-opening must not re-archive: a bundle whose own
            // training data is empty adds nothing.
            const prior = asArchiveList(d.archived);
            const hadData = Object.keys(d.logs || {}).length > 0 || Object.keys(d.tested || {}).some(k => d.tested[k]);
            setArchived(hadData ? [...prior, {
              program: d.program || "press-priority-v1.3", archivedAt: new Date().toISOString(),
              week: d.week, logs: d.logs || {}, extraSets: d.extraSets || {}, notes: d.notes || {},
              exNotes: d.exNotes || {}, altChoice: d.altChoice || {}, done: d.done || {},
              sessDone: d.sessDone || {}, tested: d.tested || {}, order: d.order || {},
              barSpeed: d.barSpeed || {}, sessionTime: d.sessionTime || {},
              elastic: d.elastic || {}, elasticQ: d.elasticQ || {}, sprintLog: d.sprintLog || {},
              powerQual: d.powerQual || {}, addCheck: d.addCheck || {},
            }] : prior);
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
          setArchived(asArchiveList(d.archived));
          setWeek(d.week ?? 1);
          setLogs(d.logs || {}); setExtraSets(d.extraSets || {}); setNotes(d.notes || {});
          setExNotes(d.exNotes || {});
          const ac = {};
          Object.entries(d.altChoice || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== false) ac[k] = true; });
          setAltChoice(ac);
          setDone(d.done || {}); setSessDone(d.sessDone || {});
          setTested({ ohp:"", dip:"", pullup:"", ...(d.tested || {}) });
          setOrder(d.order || {}); setBarSpeed(d.barSpeed || {}); setSessionTime(d.sessionTime || {});
          setElastic(d.elastic || {}); setElasticQ(d.elasticQ || {}); setSprintLog(d.sprintLog || {});
          setPowerQual(d.powerQual || {}); setAddCheck(d.addCheck || {});
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
    const bundle = { program: PROGRAM_ID, week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, powerQual, addCheck, archived };
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set("pp-tracker-v3", JSON.stringify(bundle)); setStatus("saved"); }
      catch (e) { setStatus("error"); }
    }, 700);
  }, [week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, powerQual, addCheck, archived]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  /* audio */
  const ensureAudio = () => {
    // Tell iOS this is a transient alert: duck any playing music for the tone instead of
    // being silenced by it. Guarded — navigator.audioSession is a newer Safari API.
    try { if (navigator.audioSession) navigator.audioSession.type = "transient"; } catch (e) {}
    if (!audioRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioRef.current = new AC(); }
    if (audioRef.current && audioRef.current.state === "suspended") audioRef.current.resume();
  };
  const startRestById = (exId, secs) => {
    const s = secs != null ? secs : restFor(week, day, exId);
    if (s == null) return;
    ensureAudio();
    const base = itemFor(week, day, exId);
    const label = (altChoice[`${week}-${day}-${exId}`] && ALT[exId]) || base?.name || "Rest";
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
  // Writes one or more fields of a set row. `fields` is {w}, {r}, {rir} or any combination.
  //
  // It MUST take them together. The Rx button fills weight and reps at once, and two
  // separate calls in the same tick each rebuild the row from the `logs` captured in this
  // render's closure — so the second silently discarded the first, and Rx filled the reps
  // while dropping the weight.
  const setEntry = (exId, i, fields, maybeVal) => {
    if (typeof fields === "string") fields = { [fields]: maybeVal };
    const vals = Object.values(fields);
    // Start the global session clock on the first value logged this session.
    if (vals.some(v => v !== "") && !sessionTime[`${week}-${day}`]) {
      setSessionTime(p => (p[`${week}-${day}`] ? p : { ...p, [`${week}-${day}`]: { start: Date.now(), end: null } }));
    }
    const row = logs?.[week]?.[day]?.[exId]?.[i] || {};
    const wasComplete = !!(row.w && row.r);
    const after = { ...row, ...fields };
    const nowComplete = !!(after.w && after.r);
    const rirEntered = "rir" in fields && fields.rir !== "" && !row.rir;
    if (settings.autoRest && restFor(week, day, exId) != null && ((!wasComplete && nowComplete) || rirEntered)) startRestById(exId);
    setLogs((prev) => {
      const next = { ...prev };
      const wk = { ...(next[week] || {}) };
      const dy = { ...(wk[day] || {}) };
      const rows = [...(dy[exId] || [])];
      // Merge against the LIVE row, not the closure's, so concurrent writes compose.
      rows[i] = { ...(rows[i] || {}), ...fields };
      dy[exId] = rows; wk[day] = dy; next[week] = wk;
      return next;
    });
  };
  const addSet = (exId) => setExtraSets(p => ({ ...p, [k3(exId)]: (p[k3(exId)]||0)+1 }));
  const removeSet = (exId) => setExtraSets(p => { const k = k3(exId); if (!p[k]) return p; return { ...p, [k]: p[k]-1 }; });
  const setBar = (exId, v) => setBarSpeed(p => (p[k3(exId)] === v ? p : { ...p, [k3(exId)]: v }));
  const changeWeek = (w) => setWeek(Math.max(1, Math.min(W13_WEEK, w)));
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

  // A set is flagged when it lands below the week's reserve floor: 2 normally (C08 sets the
  // success standard at >= 2 RIR, aiming for 2), 4 in a deload or test week.
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
  const exportBackup = () => copyText(JSON.stringify({ app:"concurrent-block", program:PROGRAM_ID, version:15, exported:new Date().toISOString(), archived, week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime, elastic, elasticQ, sprintLog, powerQual, addCheck }), "Backup JSON copied — keep it somewhere safe");
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
      setTested({ ohp:"", dip:"", pullup:"", ...(d.tested||{}) });
      setOrder(d.order||{}); setBarSpeed(d.barSpeed||{}); setSessionTime(d.sessionTime||{});
      setElastic(d.elastic||{}); setElasticQ(d.elasticQ||{}); setSprintLog(d.sprintLog||{});
      setPowerQual(d.powerQual||{}); setAddCheck(d.addCheck||{}); setArchived(asArchiveList(d.archived));
      if (d.settings) { const st = { ...DEFAULT_SETTINGS, ...d.settings }; if (!TONES[st.tone]) st.tone = "radar"; setSettings(st); }
      setRestorePaste(""); flash("Backup restored");
    } catch (e) { flash("That doesn't look like a valid backup"); }
  };
  const impactSummary = (w, dId) => {
    const px = impactFor(w, dId);
    if (!px) return "";
    return TIER_KEYS.filter(t => px[t] > 0).map(t => {
      const act = elastic[`${w}-${dId}-${t}`];
      return `${t} ${act === undefined || act === "" ? "not logged" : act}/${px[t]}`;
    }).join(", ");
  };
  const buildReview = (w) => {
    const L = [], vol = weekVolume(w);
    L.push(`WEEK ${w} TRAINING LOG — ${META.planName} ${BLOCK_VERSION} (${PHASE(w)}${BADGE[w] ? " · " + BADGE[w] : ""})`);
    L.push(`Rules of record: conflict hierarchy = tissue tolerance > OHP/dip/pull-up > prescribed TrainerRoad > elastic and acceleration quality > heavy conventional specificity > squat/bench > secondary volume. Success reserve is >= 2 RIR, aiming for 2 — easier qualifies. Targets: OHP ${META.targets.ohp}, dip ${META.targets.dip}, pull-up ${META.targets.pullup}.`);
    L.push("");
    DAYS.forEach(d => {
      const ses = sessionFor(w, d.id);
      if (!ses) return;
      L.push(`${WEEKDAYS[dayMap[d.id]]} — ${d.lift} · ${d.title}${isTestSession(w, d.id) ? " · TEST SESSION" : ""}${sessDone[`${w}-${d.id}`] ? " · session finished" : ""}`);
      L.push(`  Objective: ${ses.objective}  [planned ${ses.minutes} min; ${META.strengthGuidelineMinutes}-min guideline, not a hard stop${ses.minutes > META.strengthGuidelineMinutes ? " — over it BY DESIGN" : ""}]`);
      exercisesFor(w, d.id).forEach(ex => {
        if (ex.kind === "impact") {
          const sum = impactSummary(w, d.id);
          const ip = impactFor(w, d.id);
          L.push(`  Impact contacts (actual/target): ${sum || "none prescribed"}${elasticQ[`${w}-${d.id}`] ? ` · quality ${elasticQ[`${w}-${d.id}`]}` : " · quality not logged"}`);
          L.push(`    Clock: ${ip.capMinutes} min hard cap including travel · ${Math.round(ip.baseSeconds/60*10)/10} min of prescribed work · ${Math.round(ip.travelSeconds/60*10)/10} min left for transit${ip.travelSeconds <= 120 ? " — TIGHT, compare actual transit before starting" : ""}${ip.test ? " · MEASUREMENT session" : ""}`);
          return;
        }
        if (ex.kind === "run") {
          const r = runFor(w, d.id), lg = sprintLog[w] || {};
          L.push(`  Running — Rx ${r.reps} × ${r.distance} m on ${r.terrain} at ${r.effort}% perceived effort, ${r.runout} m runout each, 120 s recovery (${r.totalM} m total, ceiling ${RUN_CEILING.totalM} m): completed ${lg.reps || "not logged"}${lg.quality ? ` · ${lg.quality}` : ""}${lg.note ? ` · "${lg.note}"` : ""}`);
          return;
        }
        if (ex.kind === "check") {
          const c = addCheck[`${w}-${d.id}`] || {};
          L.push(`  Adductor check — post-session: ${c.post || "not run"} · next morning: ${c.next || "not run"}${c.detail ? ` · "${c.detail}"` : ""}`);
          return;
        }
        const rx = getRx(ex, w, d.id);
        if (!rx) { L.push(`  ${ex.name}: not prescribed this week`); return; }
        const subbed = altChoice[`${w}-${d.id}-${ex.id}`];
        const shownName = subbed && ALT[ex.id] ? `${ex.name} (subbed: ${ALT[ex.id]})` : ex.name;
        const rows = logs?.[w]?.[d.id]?.[ex.id] || [];
        const rxStr = `Rx ${rx.sets}×${rx.repsLabel}${rx.loadLabel ? " @ " + rx.loadLabel : ""} at ${rx.rir} RIR`;
        const logged = rows.filter(e => e && (e.w || e.r));
        if (!logged.length) L.push(`  ${shownName} [${CUT_LABEL[ex.cut] || "-"}] — ${rxStr}: NOT LOGGED`);
        else {
          const sets = rows.map(e => (e && (e.w || e.r)) ? `${e.w||"?"}×${e.r||"?"}${e.rir!=null && e.rir!=="" ? "@RIR"+e.rir : ""}` : null).filter(Boolean).join(", ");
          L.push(`  ${shownName} [${CUT_LABEL[ex.cut] || "-"}] — ${rxStr}: ${sets}`);
        }
        if (rx.power) L.push(`    Power quality: ${powerQual[`${w}-${d.id}-${ex.id}`] || "not logged"}${powerQual[`${w}-${d.id}-${ex.id}`] === "stopped" ? " — logged as OMITTED, not an exposure" : ""}`);
        else if (rx.loadNum != null) L.push(`    Bar speed: ${barSpeed[`${w}-${d.id}-${ex.id}`] || "on-target"}${rx.system ? ` · system load ${fmtLb(rx.system)} lb at BW ${BW}` : ""}`);
        if (!rx.workSet && rx.loadNum == null && !rx.power) L.push(`    (does not count toward the pressing/pulling floors)`);
        const en = exNotes[`${w}-${d.id}-${ex.id}`];
        if (en) L.push(`    Exercise note: "${en}"`);
      });
      const nt = notes[`${w}-${d.id}`];
      if (nt) L.push(`  Session notes: "${nt}"`);
      L.push("");
    });
    const s2 = weekBelowFloor(w);
    const waived = REDUCED.has(w);
    L.push(`VOLUME AUDIT (prescribed work sets): pressing ${vol.press} (floor ${FLOORS.press})${waived ? " — waived, reduced week" : ""} · vertical pull ${vol.vpull} (${FLOORS.vertical})${waived ? " — waived" : ""} · horizontal pull ${vol.hpull} (${FLOORS.horizontal})${waived ? " — waived" : ""} · direct biceps ${vol.biceps} sets (${FLOORS.biceps})${waived ? " — waived" : ""} · lower-body days ${vol.lower} (exactly 2) · shoulder days ${vol.shoulder} (${FLOORS.shoulder}) · direct-abs days ${vol.abs} (${FLOORS.abs}) · power days ${vol.powerDays} (${FLOORS.power}) · unilateral days ${vol.unilateral} (${FLOORS.unilateral}) · adductor days ${vol.adductor} (2) · carry days ${vol.carry} (${FLOORS.carry}, flexible) · press:pull ${vol.ratio} (max ${FLOORS.ratioMax}). Ramps, power, shoulder and core work are real training but do not count toward the pressing and pulling floors.`);
    if (w === TEST_WEEK) L.push(`TEST RESULTS: OHP ${tested.ohp || "—"} · dip ${tested.dip || "—"} · pull-up ${tested.pullup || "—"}. No broad-jump measurement in this block.`);
    L.push(`AUTO-FLAGS: ${s2} set${s2===1?"":"s"} below the week's reserve floor of ${RIR_FLOOR(w)}${s2>=2 ? " — hold the next scheduled increment" : ""}. Adductor check: ${weekAdductorFlag(w) ? "ABNORMAL — running and high-tier progressions are held" : "normal"}.`);
    L.push("");
    L.push("Coach: review this week against docs/autoregulation-criteria.md. Tell me: (1) the response level (none / 1 / 2 / 3) with the evidence for it; (2) each prescription to change next week, with the reversal condition; (3) anything that must be held rather than advanced. Never advance impact or running to compensate for a missed ride.");
    return L.join("\n");
  };

  // Structured export for the Claude Code autoregulation loop (docs/autoregulation-criteria.md).
  const buildReviewJSON = (w) => {
    const num = (x) => (x === "" || x == null ? null : parseFloat(x));
    const days = DAYS.map(d => {
      const ses = sessionFor(w, d.id);
      if (!ses) return null;
      const px = impactFor(w, d.id);
      const run = runFor(w, d.id);
      return {
        day: d.id, weekday: WEEKDAYS[dayMap[d.id]], lift: d.lift, title: d.title,
        objective: ses.objective,
        finished: !!sessDone[`${w}-${d.id}`],
        isTestSession: isTestSession(w, d.id),
        minuteBudget: { planned: ses.minutes, guideline: META.strengthGuidelineMinutes,
                        isHardCap: false, overGuidelineByDesign: ses.minutes > META.strengthGuidelineMinutes,
                        blocks: ses.blocks.map(b => ({ name: b.name, minutes: b.minutes })) },
        impact: px && TIER_KEYS.some(t => px[t] > 0) ? {
          quality: elasticQ[`${w}-${d.id}`] || null,
          capMinutes: px.capMinutes,
          plannedWorkMinutes: Math.round((px.baseSeconds / 60) * 10) / 10,
          travelAllowanceMinutes: Math.round((px.travelSeconds / 60) * 10) / 10,
          isMeasurement: px.test,
          tiers: TIER_KEYS.filter(t => px[t] > 0).map(t => ({ tier:t, target:px[t], actual:num(elastic[`${w}-${d.id}-${t}`]) })),
        } : null,
        running: run ? {
          ...run, completedReps: num((sprintLog[w]||{}).reps),
          quality: (sprintLog[w]||{}).quality || null, note: (sprintLog[w]||{}).note || null,
          ceilingOk: run.accelM <= RUN_CEILING.accelM && run.totalM <= RUN_CEILING.totalM,
        } : null,
        adductorCheck: addCheck[`${w}-${d.id}`] || null,
        exercises: ses.items.map(it => {
          const key = `${w}-${d.id}-${it.id}`;
          const actual = (logs?.[w]?.[d.id]?.[it.id] || [])
            .filter(e => e && (e.w || e.r)).map(e => ({ w: num(e.w), r: num(e.r), rir: num(e.rir) }));
          const o = { id: it.id, name: it.name, family: it.family, category: it.tag,
            cut: CUT_LABEL[it.cut] || null, isPrimary: it.load != null,
            /* countsTowardFloors is the plan's own `work_set` flag. Power, ramps,
               shoulder-health and core work are real training but do NOT inflate the
               pressing and pulling floors, so a review must not treat them as volume. */
            countsTowardFloors: !!it.workSet, isPower: !!it.power, clock: it.clock,
            rx: { sets: it.sets, reps: it.reps, repsMax: it.repsMax, load: it.load, loadGuidance: it.loadText,
                  external: !!it.system, systemLoad: it.system && it.load != null ? BW + it.load : null,
                  rir: it.rir, restSeconds: it.rest, purpose: it.purpose, perSide: !!it.perSide },
            actual };
          if (altChoice[key] && ALT[it.id]) o.subbed = ALT[it.id];
          if (it.load != null && !it.power) o.barSpeed = barSpeed[key] || "on-target";
          if (it.power) o.powerQuality = powerQual[key] || null;
          const note = exNotes[key]; if (note) o.note = note;
          return o;
        }),
      };
    }).filter(Boolean);
    // Trailing history for the loaded lifts, so a decision is made on a trend not one week.
    const history = {};
    DAYS.forEach(d => (sessionFor(w, d.id)?.items || []).filter(it => it.load != null).forEach(it => {
      const hist = [];
      for (let pw = w - 1; pw >= Math.max(1, w - 3); pw--) {
        const rows = (logs?.[pw]?.[d.id]?.[it.id] || []).filter(e => e && (e.w || e.r));
        if (!rows.length) continue;
        const prev = itemFor(pw, d.id, it.id);
        const rirs = rows.map(e => num(e.rir)).filter(x => x != null);
        hist.push({ week: pw, load: prev ? prev.load : null,
          rirMin: rirs.length ? Math.min(...rirs) : null,
          barSpeed: barSpeed[`${pw}-${d.id}-${it.id}`] || "on-target",
          allSets: prev ? rows.length >= prev.sets : false });
      }
      if (hist.length) history[`${d.id}-${it.id}`] = hist;
    }));
    const vol = weekVolume(w);
    const wed = impactFor(w, "wed"), fri = impactFor(w, "fri");
    const highTotal = (wed?.high || 0) + (fri?.high || 0);
    return JSON.stringify({
      app: "concurrent-block", kind: "week-report", version: 16, blockVersion: BLOCK_VERSION,
      programId: PROGRAM_ID, source: SOURCE,
      week: w, phase: PHASE(w), badge: BADGE[w] || null, targetRir: TARGET_RIR(w), rirFloor: RIR_FLOOR(w),
      flags: { deload: REDUCED.has(w), testWeek: w === TEST_WEEK,
               highTierActive: highTotal > 0, runningActive: !!fri?.run,
               measurementWeek: false },
      impactLedger: {
        low: (wed?.low || 0) + (fri?.low || 0),
        moderate: (wed?.moderate || 0) + (fri?.moderate || 0),
        high: highTotal,
        highCap: META.highContactCap,
        /* Weeks 1 and 12 carry three MEASUREMENT jumps under the approved C03 exception;
           no measurement weeks remain, so the cap applies everywhere. */
        capOk: highTotal <= META.highContactCap,
        capMinutes: META.impactCapMinutes,
      },
      volumeAudit: { ...vol, floors: FLOORS, waived: REDUCED.has(w) },
      days, history,
      tested: (w === TEST_WEEK || w === W13_WEEK) ? tested : undefined,
      autoFlags: { belowRirFloor: weekBelowFloor(w), adductorAbnormal: weekAdductorFlag(w) },
    }, null, 2);
  };

  /* derived */
  const isTest = isTestSession(week, day);
  const dayData = DAY_BY_ID[day];
  const session = sessionFor(week, day);
  const sessKey = `${week}-${day}`;
  // The week's own exercise list — composition varies by week, so this is rebuilt per
  // session rather than filtered out of a fixed day list.
  const weekEx = exercisesFor(week, day);
  // Apply the athlete's custom order for this session (default = program order); any
  // exercise not in the saved order (e.g. new to this week) is appended in program order.
  const orderedEx = (() => {
    const saved = order[sessKey];
    if (!saved) return weekEx;
    const byId = {}; weekEx.forEach(e => { byId[e.id] = e; });
    const seen = new Set(), res = [];
    saved.forEach(id => { if (byId[id]) { res.push(byId[id]); seen.add(id); } });
    weekEx.forEach(e => { if (!seen.has(e.id)) res.push(e); });
    return res;
  })();
  const visibleEx = orderedEx;
  const doneCount = visibleEx.filter(ex => isDoneEff(ex, getRx(ex, week, day) || { sets:1 })).length;
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
    if (!session) return null;
    let best = null;
    // Loaded lifts only, and never the deadlift: this block runs it as a maintenance
    // double and §9 is explicit that a low-rep result does not establish an exact e1RM.
    session.items.filter(ex => ex.load != null && ex.id !== "dl").forEach(ex => {
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
    const own = rirTarget(rx.rir, week);
    const floor = own != null ? own : RIR_FLOOR(week);
    // No warning where the prescription sets an effort target rather than a reserve.
    const rirWarn = own !== null && rirVal !== "" && parseFloat(rirVal) < floor;
    const tgt = rx.rows?.[i] || { w: rx.loadNum, r: rx.repsNum };
    const repsNum = parseFloat(cur.r);
    const target = typeof tgt.r === "number" ? tgt.r : NaN;
    const repClass = !isNaN(repsNum) && !isNaN(target) ? (repsNum < target ? "under" : repsNum > target ? "over" : "") : "";
    const isExtra = i >= rx.sets;
    return (
      <div className="set-row" key={i} style={isExtra ? { opacity:0.75 } : {}}>
        <span className="set-n">{i+1}</span>
        <span className={`prev ${prev ? "" : "empty"}`}>{prev || "—"}</span>
        <input inputMode="decimal" placeholder={tgt.w ?? ""} value={cur.w || ""} aria-label={`${ex.name} set ${i+1} weight`}
          onChange={e => setEntry(ex.id, i, "w", e.target.value)} />
        <input inputMode="numeric" placeholder={tgt.r ?? ""} value={cur.r || ""} className={repClass} aria-label={`${ex.name} set ${i+1} reps`}
          onChange={e => setEntry(ex.id, i, "r", e.target.value)} />
        <input inputMode="decimal" placeholder={String(floor)} value={rirVal} className={rirWarn ? "warn" : ""} aria-label={`${ex.name} set ${i+1} RIR`}
          onChange={e => setEntry(ex.id, i, "rir", e.target.value)} />
        <button className="rxfill" aria-label="Fill prescribed" onClick={() => {
          const f = {};
          if (tgt.w != null) f.w = String(tgt.w);
          if (tgt.r != null && tgt.r !== "") f.r = String(tgt.r);
          if (Object.keys(f).length) setEntry(ex.id, i, f);
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

  /* Impact block (§12) — runs on its own 15-minute clock BEFORE the strength session,
     including travel and setup. The point of this card is that impact dose is a LEDGER,
     not a feeling: target contacts per tier are prescribed, actual contacts get logged.
     A reduced dose is logged as reduced and cannot qualify a larger dose for progression. */
  const renderImpact = (ex) => {
    const px = impactFor(week, day);
    if (!px) return null;
    const tiers = TIER_KEYS.filter(t => px[t] > 0);
    if (!tiers.length) return null;
    const exDone = isDoneEff(ex, { sets:1 });
    const q = elasticQ[sessKey] || "";
    const total = tiers.reduce((a, t) => a + px[t], 0);
    /* The broad-jump measurement was withdrawn after review. No impact session is a
       test any more, so the six-contact cap applies everywhere without exception. */
    const capOk = px.high <= META.highContactCap;
    const capMin = px.capMinutes;
    const planned = Math.round((px.baseSeconds / 60) * 10) / 10;
    const travel = Math.round((px.travelSeconds / 60) * 10) / 10;
    const tight = px.travelSeconds <= 120;
    return (
      <section className={`card elasticcard ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, ex.name, exDone, null)}
        <div className="meta-row"><div className="rx">
          <span>{total} contacts</span>
          <span className="rx-load"> · {planned} min of work</span>
          <span className="rx-pct"> · {capMin}-min clock INCLUDING travel</span>
        </div></div>
        <div className="sprintmeta">
          <span>high tier <b>{px.high}</b></span>
          <span className={capOk ? "ok" : "warn-txt"}>weekly cap {META.highContactCap}</span>
          <span className={tight ? "warn-txt" : ""}>{travel} min left for travel</span>
        </div>
        {tight && (
          <div className="banner soft"><b>This is the tight one.</b> Only {travel} min remains inside the {capMin}-minute
            clock for travel and any extra preparation. Compare your actual transit and setup with the full prescription
            <b> before</b> starting work, and use the cut order below if it will not fit. Log the smaller actual dose —
            a reduced dose never qualifies a larger one for progression.</div>
        )}
        {/* The prescribed sequence, in order, with its own time budget. Reading this
            before travelling is what makes the cut decision possible. */}
        <div className="voltable blockplan">
          {px.events.map((e, i) => (
            <div className="volrow blockrow" key={i}>
              <span className="blockmin">{Math.round(e.seconds)}s</span>
              <span className="blockname">{e.name}</span>
              {e.contacts != null && <span className="tiertarget"> · {e.contacts} {e.tier}</span>}
              <span className="blockdetail">{e.dose}</span>
            </div>
          ))}
        </div>
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
              <div className="tierlog">
                <label htmlFor={`el-${t}`}>Contacts done</label>
                <input id={`el-${t}`} inputMode="numeric" placeholder={px[t]} value={act} className={over ? "warn" : ""}
                  aria-label={`${TIER_NAME[t]} contacts completed`}
                  onChange={e => setElastic(p => ({ ...p, [key]: e.target.value }))} />
                <button className="rxfill" aria-label={`Fill prescribed ${t}-tier contacts`}
                  onClick={() => setElastic(p => ({ ...p, [key]: String(px[t]) }))}>Rx</button>
              </div>
            </div>
          );
        })}
        <div className="qrow">
          <span className="bs-label">Landing quality</span>
          <div className="barspeed" role="group" aria-label="Landing quality">
            {[["clean","Clean"],["degraded","Degraded"],["stopped","Stopped early"]].map(([v,lbl]) => (
              <button key={v} className={`bs-btn ${q === v ? "on" : ""}`} aria-pressed={q === v}
                aria-label={`Landing quality ${v}`}
                onClick={() => setElasticQ(p => ({ ...p, [sessKey]: v }))}>{lbl}</button>
            ))}
          </div>
        </div>
        {/* The day's broad jump is a prescribed row that is PAID FOR out of this clock,
            not the strength clock, so it belongs on this card rather than in the grid. */}
        {impactItemsFor(week, day).map(it => (
          <p className="cue" key={it.id}><b>{it.name}:</b> {it.sets}×{it.reps} — {it.purpose}. {it.rir}</p>
        ))}
        <p className="cue"><b>Cut order:</b> {px.selectionRule}</p>
        <p className="cue"><b>Progression gate:</b> {px.gate}</p>
        <input className="exnote" placeholder="Note — landing quality, actual travel time, next-morning response" value={exNotes[k3(ex.id)] || ""}
          onChange={e => setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value }))} />
      </section>
    );
  };

  /* Running (§13) — Friday only, after the jumps and before lifting. The per-session
     ceiling is 60 acceleration metres and 120 total metres; it lives in the data. */
  const renderRun = (ex) => {
    const r = runFor(week, day);
    if (!r) return null;
    const exDone = isDoneEff(ex, { sets:1 });
    const lg = sprintLog[week] || {};
    const setSp = (f, v) => setSprintLog(p => ({ ...p, [week]: { ...(p[week] || {}), [f]: v } }));
    const ceilingOk = r.accelM <= RUN_CEILING.accelM && r.totalM <= RUN_CEILING.totalM;
    return (
      <section className={`card sprintcard ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, ex.name, exDone, null)}
        <div className="meta-row">
          <div className="rx">
            <span>{r.reps} × {r.distance} m</span>
            <span className="rx-load"> · {r.terrain}</span>
            <span className="rx-pct"> · {r.effort}% perceived effort</span>
          </div>
        </div>
        <div className="sprintmeta">
          <span><b>{r.accelM} m</b> acceleration + {r.runoutM} m runout = {r.totalM} m</span>
          <span className={ceilingOk ? "ok" : "warn-txt"}>ceiling {RUN_CEILING.accelM} / {RUN_CEILING.totalM} m</span>
          <span>120 s between reps</span>
        </div>
        <div className="banner soft">Every rep gets a further <b>{r.runout} m</b> of clear, easy deceleration — uphill too. No abrupt stopping. The walk back happens inside the 120 s.</div>
        <div className="tierlog">
          <label htmlFor="sprint-reps">Reps completed</label>
          <input id="sprint-reps" inputMode="numeric" placeholder={r.reps} value={lg.reps ?? ""} aria-label="Running reps completed"
            onChange={e => setSp("reps", e.target.value)} />
          <button className="rxfill" aria-label="Fill prescribed running reps" onClick={() => setSp("reps", String(r.reps))}>Rx</button>
        </div>
        <div className="qrow">
          <span className="bs-label">Quality</span>
          <div className="barspeed" role="group" aria-label="Running quality">
            {[["crisp","Crisp"],["holding","Holding"],["laboured","Laboured"]].map(([v,lbl]) => (
              <button key={v} className={`bs-btn ${lg.quality === v ? "on" : ""}`} aria-pressed={lg.quality === v}
                aria-label={`Running quality ${v}`} onClick={() => setSp("quality", v)}>{lbl}</button>
            ))}
          </div>
        </div>
        <div className="set-btns">
          <button className="ghost timer-btn" onClick={() => startRestById(ex.id, 120)}>⏱ Recover 2:00</button>
        </div>
        <p className="cue"><b>Before running:</b> gentle adductor squeeze 3 × 20 s with 20 s between, at about 20–30% effort — activation, not strength work and not clearance.
          {" "}<b>Advancing:</b> two completed, tolerated runs at this exact terrain, distance, reps and effort, with a normal next day. A reduced session does not qualify a larger one. If a stage is held or skipped, later stages move back or disappear — never catch up.</p>
        <input className="exnote" placeholder="Note — how the reps felt, any stride change" value={lg.note || ""}
          onChange={e => setSp("note", e.target.value)} />
      </section>
    );
  };

  /* Adductor reactive gate (§14) — the highest-consequence control in the app.
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
            <p className="escalate">Mild familiar soreness resolving in 24–48 h without a movement change: hold and repeat, do not progress. Symptoms increasing or persisting, reduced output, or an altered stride: regress or remove faster running and high impact, and adjust affected lower work. Acute sharp pain, bruising, weakness, progressive symptoms, <b>or movement-altering discomfort on its own</b>: suspend the affected impact and seek clinical evaluation. Do not wait for a second warning sign.</p>
          </div>
        )}
        <p className="cue"><b>Instructions:</b> Run this after the session and again the following morning. Normal means no new sensation beyond familiar post-training soreness. This gate outranks everything else in the block.</p>
      </section>
    );
  };

  const renderCard = (ex) => {
    if (ex.kind === "impact") return renderImpact(ex);
    if (ex.kind === "run") return renderRun(ex);
    if (ex.kind === "check") return renderCheck(ex);
    const rx = getRx(ex, week, day);
    if (!rx) return null;
    const extraCount = extraSets[k3(ex.id)] || 0;
    const total = rx.sets + extraCount;
    const exDone = isDoneEff(ex, rx);
    const alt = ALT[ex.id] || null;
    const subbed = !!altChoice[k3(ex.id)] && !!alt;
    const activeName = subbed ? alt : ex.name;
    const isPrimary = rx.loadNum != null;
    const isTargetTest = isTestSession(week, day) && /target test/i.test(ex.name);
    const prevNote = week > 1 ? exNotes[`${week-1}-${day}-${ex.id}`] : null;
    return (
      <section className={`card ${isPrimary ? "main" : ""} ${exDone ? "exdone" : ""} ${dragId === ex.id ? "dragging" : ""}`} key={ex.id} data-exid={ex.id}>
        {cardHead(ex, activeName, exDone, rx)}
        <div className="ex-tools">
          {alt && (
            <button className={`inlbtn ${subbed ? "on" : ""}`} title={subbed ? `Back to ${ex.name}` : `Swap to ${alt}`}
              onClick={() => setAltChoice(p => { const n = { ...p }; if (n[k3(ex.id)]) delete n[k3(ex.id)]; else n[k3(ex.id)] = true; return n; })}>
              {subbed ? "Original" : "Alt Exercise"}
            </button>
          )}
        </div>
        <div className="meta-row">
          <div className="rx">
            <span>{rx.sets}×{rx.repsLabel}</span>
            {rx.loadLabel && <span className="rx-load">{rx.loadNum != null ? " @ " : " · "}{rx.loadLabel}</span>}
            {rx.rir && <span className="rx-pct"> · {rx.rir} RIR</span>}
          </div>
          {subbed && <span className="alt-note">alt for {ex.name}</span>}
        </div>
        {rx.system && <div className="systemload">Total system load <b>{fmtLb(rx.system)} lb</b> — bodyweight {BW} + {fmtLb(rx.loadNum)} external. Thresholds use system load, never external load alone.</div>}
        {isTargetTest && <div className="banner soft">One target set. No retries. Stop the set before a grinder or before technique breaks — a grindy or invalid rep is a miss, not a lower result. If the earlier tests created meaningful fatigue, defer this one and record why.</div>}
        {ex.id === "ohptop" && week === 1 && <div className="banner soft">Calibration: ramp to a single at RPE 7.5–8.5 — 120 is the nominal figure, not a demand. Do not chase a maximum. Whatever the single shows, the back-off sets run at their prescribed load. A single's subjective reserve does not establish an exact e1RM.</div>}
        {isPrimary && !rx.power && (
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
        {/* Power work is judged on quality, not load — and quality IS the stop rule:
            visible slowing, an unstable rack or landing, an arm-dominant clean, or any
            local fatigue ends the movement. Most power items carry a text load, so the
            bar-speed row above would never have appeared for them. */}
        {rx.power && (
          <div className="barspeed-row">
            <span className="bs-label">Power quality</span>
            <div className="barspeed" role="group" aria-label={`${activeName} power quality`}>
              {[["crisp","Crisp"],["slowing","Slowing"],["stopped","Stopped"]].map(([v,lbl]) => {
                const sel = powerQual[k3(ex.id)] === v;
                return (
                  <button key={v} className={`bs-btn ${sel ? "on" : ""}`} aria-pressed={sel}
                    aria-label={`${activeName} power quality ${v}`}
                    onClick={() => setPowerQual(p => ({ ...p, [k3(ex.id)]: v }))}>{lbl}</button>
                );
              })}
            </div>
          </div>
        )}
        {rx.power && powerQual[k3(ex.id)] === "stopped" && (
          <div className="banner soft">Logged as <b>omitted</b>, not completed. A stopped movement does not
            count as an exposure and cannot qualify a load increase. No checklist overrides symptoms.</div>
        )}
        {rx.warmups && !subbed && (
          <div className="warmups">
            <div className="warmups-title">Ramp · inside the session clock</div>
            <div className="warmup-row">
              {rx.warmups.map((s, i) => (
                <span key={i}>{s.w}×{s.r}{i < rx.warmups.length-1 && <span className="arrow"> → </span>}</span>
              ))}
            </div>
            {rx.rampNote && <div className="plates">{rx.rampNote}</div>}
            {rx.plates && <div className="plates">Work sets: bar + {rx.plates}</div>}
          </div>
        )}
        {prevNote && <div className="lastnote"><b>Last week's note:</b> {prevNote}</div>}
        <div className="grid-head">
          <span>SET</span><span>LAST WK</span><span>WT</span>
          <span>{rx.unit === "reps" ? "REPS" : rx.unit.toUpperCase()}</span><span>RIR</span><span />
        </div>
        {Array.from({ length: total }).map((_, i) => renderSetRow(ex, rx, i))}
        <div className="set-btns">
          {rx.rest != null
            ? <button className="ghost timer-btn" onClick={() => startRestById(ex.id)}>⏱ Rest {fmtTime(rx.rest)}</button>
            : <span className="shared-rest">no timed rest</span>}
          <button className="solid" onClick={() => addSet(ex.id)}>＋ Add Set</button>
          {extraCount > 0 && <button className="ghost rm-set" onClick={() => removeSet(ex.id)}>−</button>}
        </div>
        <p className="cue"><b>Purpose:</b> {rx.purpose}{subbed && " Alt in use — match the pattern: same sets, reps and reserve as the original."}</p>
        {rx.fallback && <p className="cue"><b>If unavailable:</b> {rx.fallback}</p>}
        {rx.progression && <details className="progdet"><summary>Progression rule</summary><p className="cue">{rx.progression}</p></details>}
        <input className="exnote" placeholder="Note for next week — e.g. 'go up in weight, felt too easy'" value={exNotes[k3(ex.id)] || ""}
          onChange={e => setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value }))} />
      </section>
    );
  };

  /* ── Week 13 (§18) — the optional deferred-test contingency ────────────────────────
     NOT a thirteenth training week. It exists only to carry a measurement that was
     deferred BEFORE its week-12 target attempt, because meaningful fatigue from an
     earlier test made the later one invalid. It is never a retry of a completed or a
     failed target set, and never a second chance at a better number.               */
  const renderWeek13 = () => {
    const done = (id) => tested[id] && String(tested[id]).trim() !== "";
    const outstanding = WEEK13.tests.filter(t => !done(t.id));
    return (
      <div>
        <div className="cap-note">
          Optional · deferred measurements only · {WEEK13.interTestSeconds / 60} min between tests
          {" · "}{WEEK13.delayReserveSeconds / 60} min delay reserve
        </div>
        <div className="focus"><b>What this is</b>Only the tests you deferred in week 12 before attempting them,
          in their original order, after an easy Wednesday and Thursday and a normal readiness check.</div>
        <div className="banner alertbanner">
          <b>Not a retry.</b> Skip any target set you already completed, and any you attempted and missed or ground
          out. Using this slot to chase a better number makes the block's result unverifiable. A week-13 result is
          labelled <b>week 13</b>, with the actual elapsed weeks recorded — it never becomes a week-12 achievement.
        </div>
        {WEEK13.deadliftExposures === 0 && (
          <div className="banner soft">No thirteenth deadlift and no new training week. If several deferred tests
            cannot all be obtained validly, leave the outstanding result <b>unverified</b> rather than forcing it.</div>
        )}
        <section className="card warmcard">
          <button className="warm-toggle" aria-expanded={warmOpen} onClick={() => setWarmOpen(o => !o)}>
            <span>Preparation · {WEEK13.warmupSeconds / 60} min</span>
            <span className="chev">{warmOpen ? "−" : "+"}</span>
          </button>
          {warmOpen && (
            <ul className="warm-list">
              <li>Easy walk, thoracic rotations, wall slides, brace-and-reach — the same preparation as week 12.</li>
              <li className="warmreason">If only pull-ups remain, they go first, after their own preparation and ramps.</li>
            </ul>
          )}
        </section>
        {outstanding.length === 0 && (
          <div className="banner soft">Every target test already has a result recorded. Nothing is outstanding, so
            this session should not be run.</div>
        )}
        {WEEK13.tests.map(t => {
          const already = done(t.id);
          const rx = {
            sets: t.sets, repsLabel: String(t.reps), repsNum: t.repsNum, unit: "reps",
            loadLabel: t.load != null ? (t.system ? `+${fmtLb(t.load)} lb` : `${fmtLb(t.load)} lb`) : t.loadText,
            loadNum: t.load, rir: t.rir, rest: t.rest, purpose: t.purpose,
            rows: Array.from({ length: t.sets }, () => ({ w: t.load, r: t.repsNum })),
            system: t.system && t.load != null ? BW + t.load : null,
            warmups: t.ramp, rampNote: t.rampNote, block: t.block, power: false, workSet: t.workSet,
            fallback: null, progression: null,
          };
          const ex = { id: t.id, kind: "lift", name: t.name, tag: t.tag, cut: t.cut };
          return (
            <section className={`card main ${already ? "exdone" : ""}`} key={t.id} data-exid={t.id}>
              <div className="ex-head">
                <div className="ex-title"><h2 className="exname">{t.name}</h2>
                  <div className="tagrow"><em className="tag">{t.tag}</em>{cutChip(ex)}</div></div>
              </div>
              <div className="meta-row"><div className="rx">
                <span>{rx.sets}×{rx.repsLabel}</span>
                {rx.loadLabel && <span className="rx-load"> @ {rx.loadLabel}</span>}
                <span className="rx-pct"> · {rx.rir} RIR</span>
              </div></div>
              {rx.system && <div className="systemload">Total system load <b>{fmtLb(rx.system)} lb</b> — bodyweight {BW} + {fmtLb(rx.loadNum)} external.</div>}
              {already
                ? <div className="banner soft">Already recorded in week 12 — <b>do not repeat it here.</b></div>
                : <div className="banner soft">One target set. No retries. Stop before a grinder or an invalid rep.</div>}
              {rx.warmups && (
                <div className="warmups">
                  <div className="warmups-title">Ramp</div>
                  <div className="warmup-row">
                    {rx.warmups.map((s, i) => (
                      <span key={i}>{s.w}×{s.r}{i < rx.warmups.length-1 && <span className="arrow"> → </span>}</span>
                    ))}
                  </div>
                  {rx.rampNote && <div className="plates">{rx.rampNote}</div>}
                </div>
              )}
              <div className="tested-row">
                <label htmlFor={`w13-${t.id}`}>Week-13 result — reps completed at {rx.loadLabel}</label>
                <input id={`w13-${t.id}`} inputMode="decimal" placeholder="—"
                  value={tested[`w13_${t.id}`] || ""}
                  aria-label={`${t.name} week 13 result`}
                  onChange={e => setTested(p => ({ ...p, [`w13_${t.id}`]: e.target.value }))} />
              </div>
              <p className="cue"><b>Purpose:</b> {t.purpose}</p>
            </section>
          );
        })}
        <div className="notes-label">Week-13 notes — which tests were deferred and why, and the elapsed weeks</div>
        <textarea value={notes[`${W13_WEEK}-fri`] || ""} placeholder="e.g. Pull-up deferred from W12 — elbow fatigue after the dip test. Run 8 days later."
          onChange={e => setNotes(p => ({ ...p, [`${W13_WEEK}-fri`]: e.target.value }))} />
        <button className={`finishbtn ${sessDone[`${W13_WEEK}-fri`] ? "done-on" : ""}`}
          onClick={() => setSessDone(p => ({ ...p, [`${W13_WEEK}-fri`]: !p[`${W13_WEEK}-fri`] }))}>
          {sessDone[`${W13_WEEK}-fri`] ? "✓ WEEK 13 FINISHED" : "FINISH WEEK 13"}
        </button>
        <footer className="foot">Both longer rest and deferral reduce test interference; neither guarantees every
          test is independent and fresh. An unready test is left unverified, never forced.</footer>
      </div>
    );
  };

  const renderSettings = () => (
    <section className="card settings">
      <div className="ex-head"><h2>Settings</h2><button className="donebtn" onClick={() => setSettingsOpen(false)}>✕</button></div>
      <div className="set-label">Plan name</div>
      <input className="planname" value={settings.planName ?? ""} placeholder={META.planName}
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
  const budgetTotal = session ? session.minutes : 0;
  /* V2 renamed this block from "Preparation" to "Warm-up"; match either so the header
     never silently reads "0 min" again. */
  const prepBlock = session ? session.blocks.find(b => /^(Warm-up|Preparation)$/i.test(b.name)) : null;
  return (
    <div className="app" style={themeStyle}>
      <style>{css}</style>
      <header className="hdr">
        <div className="hdr-row">
          <div className="brand">{(settings.planName || META.planName).toUpperCase()}</div>
          <div className={`status s-${status}`}>{toast || (status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved" : "")}</div>
        </div>
        <div className="toolbar">
          <button className={`tool ${settingsOpen ? "on" : ""}`} onClick={() => setSettingsOpen(o => !o)}><span className="ic">⚙</span>Settings</button>
          <button className={`tool ${wake ? "on" : ""}`} onClick={toggleWake} aria-pressed={wake}><span className="ic">☀</span>{wake ? "Awake" : "Screen"}</button>
          <button className="tool" onClick={exportBackup}><span className="ic">⬇</span>Backup</button>
          <button className="tool" onClick={() => copyText(buildReviewJSON(week), "AI report (JSON) copied — paste into Claude Code")}><span className="ic">✦</span>AI Analysis</button>
        </div>
        <div className="wave" role="tablist" aria-label="Select week">
          {Array.from({ length: 13 }, (_, i) => {
            const w = i + 1;
            /* Week 13 is the OPTIONAL deferred-test slot, not a training week. It carries
               no work sets, so it shows as an empty outline rather than a bar. */
            const isW13 = w === W13_WEEK;
            const deload = REDUCED.has(w);
            const sets = WEEK_LOAD(w);
            return (
              <button key={w} role="tab" aria-selected={week === w} className={`wave-col ${week === w ? "on" : ""}`}
                aria-label={isW13 ? "Week 13, optional deferred tests only"
                                  : `Week ${w}, ${sets} compound work sets${BADGE[w] ? ", " + BADGE[w] : ""}`}
                onClick={() => changeWeek(w)}>
                <span className={`bar ${deload ? "deload" : ""} ${w === TEST_WEEK || isW13 ? "test" : ""}`}
                  style={{ height: `${isW13 ? 10 : (sets / 33) * 34 + 8}px` }} />
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
          <button className="step" onClick={() => changeWeek(week+1)} disabled={week === W13_WEEK} aria-label="Next week">›</button>
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
        {week === W13_WEEK ? renderWeek13() : !session ? <div className="cap-note">No session prescribed here.</div> : (
          <div>
            <div className="cap-note">
              Planned <b>{budgetTotal} min</b>
              {budgetTotal > META.strengthGuidelineMinutes
                ? <> · over the {META.strengthGuidelineMinutes}-min guideline <b>by design</b></>
                : <> · {META.strengthGuidelineMinutes}-min guideline, not a hard stop</>}
              {" · "}target reserve {TARGET_RIR(week)}
              {hasImpact(week, day)
                ? ` · impact runs first on a separate ${META.impactCapMinutes[day]}-min clock, travel included`
                : ""}
            </div>
            {sessionTime[sessKey] && (
              <div className="sessiontime">Workout time <b><SessionClock start={sessionTime[sessKey].start} end={sessionTime[sessKey].end} /></b></div>
            )}
            <div className="focus"><b>Objective</b>{session.objective}</div>
            <div className="ridenote"><b>Cycling</b>{dayData.ride}</div>
            {addFlag && (
              <div className="banner alertbanner"><b>Adductor gate is open:</b> an abnormal check was logged this week. Running and high-tier jump progressions are held until it returns to normal. Movement-altering discomfort on its own means suspend the affected impact and get it looked at — do not wait for a second warning sign.</div>
            )}
            {subTwoCount >= 2 && (
              <div className="banner"><b>{subTwoCount} sets below the reserve floor of {RIR_FLOOR(week)}.</b> Hold the next scheduled increment and remove one affected back-off if needed. Do not repeatedly grind. Run AI Analysis before changing anything else.</div>
            )}
            <div className="progress"><b>{doneCount}</b> / {visibleEx.length} items done</div>
            <details className="volaudit">
              <summary>Week {week} volume floors{REDUCED.has(week) ? " — reduced-volume waivers apply" : ""}</summary>
              <div className="voltable">
                {/* Weeks 6 and 12 waive the reduced pressing, pulling and biceps volumes by
                    design (approved resolution C09); the carry target is a flexible secondary
                    one, not a primary floor. The STRUCTURAL floors are never waived: exactly two
                    lower days, three shoulder days, four ab days, four power and unilateral
                    days, and two adductor days all still hold in every week including deloads. */}
                {[["Compound pressing", vol.press, String(FLOORS.press), vol.press >= FLOORS.press, true],
                  ["Vertical pulling", vol.vpull, String(FLOORS.vertical), vol.vpull >= FLOORS.vertical, true],
                  ["Horizontal pulling", vol.hpull, String(FLOORS.horizontal), vol.hpull >= FLOORS.horizontal, true],
                  ["Direct-biceps sets", vol.biceps, String(FLOORS.biceps), vol.biceps >= FLOORS.biceps, true],
                  ["Lower-body days", vol.lower, "exactly 2", vol.lower === FLOORS.lower, false],
                  ["Shoulder-health days", vol.shoulder, String(FLOORS.shoulder), vol.shoulder >= FLOORS.shoulder, false],
                  ["Direct-abs days", vol.abs, String(FLOORS.abs), vol.abs >= FLOORS.abs, false],
                  ["Power days", vol.powerDays, String(FLOORS.power), vol.powerDays >= FLOORS.power, false],
                  ["Unilateral days", vol.unilateral, String(FLOORS.unilateral), vol.unilateral >= FLOORS.unilateral, false],
                  ["Adductor days", vol.adductor, "2", vol.adductor >= 2, false],
                  ["Carry days", vol.carry, String(FLOORS.carry) + " (flexible)", vol.carry >= FLOORS.carry, true],
                  ["Press : pull", vol.ratio, "≤ " + FLOORS.ratioMax, vol.ratio != null && vol.ratio <= FLOORS.ratioMax, false],
                ].map(([label, v, floor, ok, waivable]) => (
                  <div className="volrow" key={label}>
                    <span>{label}</span><b>{v}</b><span className="volfloor">{floor}</span>
                    <span className={ok ? "volok" : (waivable && REDUCED.has(week)) ? "volwaived" : "volbad"}>
                      {ok ? "met" : (waivable && REDUCED.has(week)) ? "waived" : "under"}</span>
                  </div>
                ))}
              </div>
            </details>
            {order[sessKey] && <button className="resetorder" onClick={resetOrder}>↺ Reset to recommended order</button>}
            <section className="card warmcard">
              <button className="warm-toggle" aria-expanded={warmOpen} onClick={() => setWarmOpen(o => !o)}>
                <span>Warm-up and timed plan · {prepBlock ? prepBlock.minutes : 0} min warm-up · {budgetTotal} min total</span>
                <span className="chev">{warmOpen ? "−" : "+"}</span>
              </button>
              {warmOpen && (
                <div>
                  {prepBlock && (
                    <ul className="warm-list">
                      {prepBlock.drills && prepBlock.drills.map((d, i) => <li key={i}>{d}</li>)}
                      <li className="warmreason">{prepBlock.detail}</li>
                    </ul>
                  )}
                  <div className="voltable blockplan">
                    {(() => { let at = 0; return session.blocks.map(b => {
                      const from = at; at += b.minutes;
                      return (
                        <div className="volrow blockrow" key={b.name}>
                          <span className="blockmin">{from}–{at}</span>
                          <span className="blockname">{b.name}</span>
                          <span className="blockdetail">{b.detail}</span>
                        </div>
                      );
                    }); })()}
                  </div>
                </div>
              )}
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
                . {addFlag ? "Adductor gate is open — no running or high-tier progression until it clears."
                   : subTwoCount >= 2 ? "Hold the next scheduled increment." : "Clear to run the next session as written."}
                {sessionTime[sessKey]?.end && (() => {
                  const mins = Math.round((sessionTime[sessKey].end - sessionTime[sessKey].start) / 60000);
                  return mins > 75 ? ` An actual ${mins}-minute session is a failed time constraint — remove lower-priority work BEFORE starting the next one.` : "";
                })()}
              </div>
            )}
            <footer className="foot">Conflict hierarchy: tissue tolerance → OHP / dip / pull-up → prescribed TrainerRoad → elastic and acceleration quality → heavy conventional specificity → squat and bench → secondary volume. Never advance impact or running to make up for a missed ride, and never move omitted work to Saturday.</footer>
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
/* Only the sets×reps token must stay on one line. The load slot now carries whole
   sentences of accessory guidance ("light trial setting/pair → 2–3 RIR; save load…"),
   and nowrap on it forced 426px of content into a 375px column. Prose wraps. */
.rx>span:first-child{white-space:nowrap}
.rx-load,.rx-pct{white-space:normal;overflow-wrap:anywhere}
.primercard .rx,.elasticcard .rx,.sprintcard .rx{font-size:16px}
.rx-load{color:var(--accent)}
.rx-pct{color:var(--muted);font-size:13px}
.rx-load{font-size:16px}
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
/* The session's timed block plan. Single column so the long detail text wraps instead of
   forcing horizontal scroll at 375px — the same trap .rx fell into. */
.blockplan{padding:0 14px 12px}
.blockplan .blockrow{display:block;padding:8px 0;border-top:1px solid var(--line)}
.blockmin{font-family:'Barlow Condensed';font-weight:700;font-size:12px;color:var(--accent);font-variant-numeric:tabular-nums;letter-spacing:.04em;margin-right:8px}
.blockname{font-family:'Barlow Condensed';font-weight:600;font-size:13px;color:var(--ink);text-transform:uppercase;letter-spacing:.05em}
.blockdetail{display:block;font-size:11.5px;color:var(--muted);line-height:1.45;margin-top:4px}
.tab.testtab .tab-lift{color:var(--accent)}
@media (prefers-reduced-motion: reduce){.app *{transition:none!important}}
`;

