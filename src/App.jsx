import { useState, useEffect, useRef } from "react";

/* ═══════════ PROGRAM DATA — v1.3 ═══════════ */
const RM = { bench: 215, ohp: 128, squat: 282, dl: 515 };
const WAVE = {
  bench: { 1:[4,5,160], 2:[4,3,175], 3:[4,2,185], 4:[3,5,150], 5:[4,5,165], 6:[4,3,180], 7:[3,2,190], 8:[3,5,150], 9:[4,5,170], 10:[4,3,185], 11:[2,2,195], 12:[3,2,170] },
  ohp:   { 1:[4,5,95],  2:[4,3,105], 3:[4,2,110], 4:[3,5,90],  5:[4,5,97.5],6:[4,3,107.5],7:[3,2,112.5],8:[3,5,90], 9:[4,5,100], 10:[4,3,110], 11:[2,2,115], 12:[3,2,100] },
  squat: { 1:[3,5,215], 2:[3,4,220], 3:[3,3,225], 4:[2,5,195], 5:[4,5,215], 6:[4,4,220], 7:[4,3,225], 8:[2,5,195], 9:[5,4,215], 10:[5,3,220], 11:[5,2,225], 12:[2,3,195] },
  dlH:   { 1:[2,2,425], 2:[2,2,425], 3:[2,2,425], 4:null, 5:[2,2,430], 6:[2,2,430], 7:[2,2,430], 8:null, 9:[2,2,435], 10:[2,2,435], 11:[2,2,435], 12:null },
  dlV:   { 1:[3,3,390], 2:[3,3,390], 3:[3,3,390], 4:[2,3,360], 5:[3,3,395], 6:[3,3,395], 7:[3,3,395], 8:[2,3,360], 9:[3,3,400], 10:[3,3,400], 11:[3,3,400], 12:[2,3,360] },
};
const REDUCED = new Set([3,4,7,8,10,11,12]);
const BADGE = { 3:"Protected", 4:"Deload", 7:"Protected", 8:"Deload", 10:"Protected", 11:"Protected · Peak", 12:"Taper", 13:"Test" };
const BLOCK = (w) => (w === 13 ? "Test Week" : w <= 4 ? "Block 1 · Groove" : w <= 8 ? "Block 2 · Load" : "Block 3 · Peak");
const INTENSITY = [74,81,86,70,77,84,88,70,79,86,91,79];

/* Each alt is the single pattern-preserving substitute, vetted against the program's
   philosophy stack: same movement pattern (Dan John), submaximal & RIR-governable (Pavel),
   unilateral/core category preserved (Boyle/McGill), plyo dose & quality preserved (Verkhoshansky). */
const DAYS = [
  { id:"mon", lift:"Bench", exercises:[
    { id:"plyopush", name:"Plyo Push-Up", tag:"primer", sets:3, reps:"3", load:"BW", unit:"reps", cue:"Full reset per rep. Land quiet and stiff.", alt:"Med-Ball Chest Pass" },
    { id:"bench", name:"Bench Press", tag:"main lift", wave:"bench", rm:"bench", unit:"reps", cue:"CAT — every rep a max-intent launch. Two slow reps end the set.", alt:"DB Bench Press" },
    { id:"wpu", name:"Weighted Pull-Up", tag:"superset", sets:4, reps:"5", load:"+25 lb", loadNum:25, unit:"reps", cue:"One set into each bench rest. Dead-hang start.", alt:"Heavy Lat Pulldown" },
    { id:"kbpress", name:"1-Arm KB Press", tag:"press", sets:3, reps:"5/side", load:"20–24 kg", unit:"per side", cue:"Standing. Glutes locked, crush the handle.", alt:"1-Arm DB Press" },
    { id:"dips", name:"Weighted Dips", tag:"press", sets:3, reps:"6", load:"+30 lb", loadNum:30, unit:"reps", cue:"Smooth depth, zero bounce.", alt:"Close-Grip Bench Press" },
    { id:"dbrow", name:"1-Arm DB Row", tag:"row", sets:3, reps:"8/side", load:"", unit:"per side", cue:"Brace; no torso rotation.", alt:"1-Arm Chest-Supported Row" },
    { id:"suitcase", name:"Suitcase Carry", tag:"carry", sets:3, reps:"40/side", load:"", unit:"yd", cue:"Tall, level hips. Runs as circuit with rollouts.", alt:"Offset Front-Rack Carry" },
    { id:"abwheel", name:"Ab-Wheel Rollout", tag:"core", sets:3, reps:"8", load:"BW", unit:"reps", cue:"Ribs down, no lumbar sag.", alt:"Body-Saw" },
  ]},
  { id:"tue", lift:"Deadlift", exercises:[
    { id:"boxjump", name:"Box Jump", tag:"primer", sets:3, reps:"3", load:"BW", unit:"reps", cue:"Stick every landing. Step down, never rebound.", alt:"Vertical Jump (Stick Landing)" },
    { id:"dlh", name:"Deadlift — Heavy", tag:"main lift", wave:"dlH", rm:"dl", unit:"reps", cue:"Dead-stop, full reset. Should look easy on video.", alt:"Trap-Bar Deadlift" },
    { id:"dlv", name:"Deadlift — Volume", tag:"main lift", wave:"dlV", rm:"dl", unit:"reps", cue:"Dead-stop triples. Kill any rep that slows.", alt:"Trap-Bar Deadlift" },
    { id:"snatch", name:"Hardstyle KB Snatch", tag:"ballistic", sets:4, reps:"5/side", load:"20–24 kg", unit:"per side", cue:"Tame the arc, punch through at lockout.", alt:"1-Arm KB Swing" },
    { id:"rfess", name:"Rear-Foot-Elevated Split Squat", tag:"unilateral", sets:3, reps:"8/side", load:"", unit:"per side", cue:"Vertical shin bias — quads, not hips.", alt:"Goblet Split Squat" },
    { id:"mbtoss", name:"Med-Ball Rotational Toss", tag:"rotation", sets:2, reps:"6/side", load:"light", unit:"per side", cue:"Hips lead, arms follow.", alt:"Cable Rotation (Light)" },
    { id:"farmer", name:"Farmer Carry", tag:"carry", sets:3, reps:"40", load:"", unit:"yd", cue:"Tall posture, quick steps, crush grip.", alt:"Heavy DB Carry" },
    { id:"pallof", name:"Pallof Press", tag:"core", sets:3, reps:"10/side", load:"", unit:"per side", cue:"Ribs stacked, slow press-outs.", alt:"Band Anti-Rotation Press" },
  ]},
  { id:"thu", lift:"OHP", exercises:[
    { id:"plyopush2", name:"Plyo Push-Up", tag:"primer", sets:3, reps:"3", load:"BW", unit:"reps", cue:"Same dose as Monday — never more.", alt:"Med-Ball Chest Pass" },
    { id:"ohp", name:"Strict OHP", tag:"main lift", wave:"ohp", rm:"ohp", unit:"reps", cue:"Wedge under it, punch the ceiling. CAT.", alt:"Standing DB Press" },
    { id:"chins", name:"Weighted Chin-Up", tag:"superset", sets:4, reps:"5", load:"+25 lb", loadNum:25, unit:"reps", cue:"One set into each OHP rest. Sternum to bar.", alt:"Underhand Lat Pulldown" },
    { id:"incline", name:"Incline DB Press", tag:"press", sets:3, reps:"8", load:"~60 lb DBs", loadNum:60, unit:"reps", cue:"Full stretch, hard lockout.", alt:"Landmine Press" },
    { id:"dips2", name:"Weighted Dips", tag:"press", sets:3, reps:"6", load:"+30 lb", loadNum:30, unit:"reps", cue:"Yields only to a real shoulder signal.", alt:"Close-Grip Bench Press" },
    { id:"gorilla", name:"Gorilla Row", tag:"row", sets:3, reps:"8/side", load:"", unit:"per side", cue:"Set the hinge, row with zero twist.", alt:"1-Arm Chest-Supported Row" },
    { id:"suitcase2", name:"Suitcase Carry", tag:"carry", sets:3, reps:"40/side", load:"", unit:"yd", cue:"Anti-lateral slot #2.", alt:"Offset Front-Rack Carry" },
    { id:"hollow", name:"Hollow-Body Hold", tag:"core", sets:3, reps:"20–30", load:"BW", unit:"sec", cue:"Low back glued down.", alt:"Dead Bug" },
  ]},
  { id:"fri", lift:"Squat", exercises:[
    { id:"broad", name:"Broad Jump", tag:"primer", sets:3, reps:"3", load:"BW", unit:"reps", cue:"Land balanced, hold one full second.", alt:"Box Jump" },
    { id:"squat", name:"Back Squat", tag:"main lift", wave:"squat", rm:"squat", unit:"reps", cue:"Never above 225. Drive out of the hole with intent.", alt:"Front Squat (about −20%)" },
    { id:"swings", name:"Hardstyle KB Swings", tag:"ballistic", sets:4, reps:"10", load:"28–32 kg", unit:"reps", cue:"The week's pure swing dose. Frozen all cycle.", alt:"DB Swing" },
    { id:"slrdl", name:"Single-Leg RDL", tag:"unilateral", sets:3, reps:"8/side", load:"", unit:"per side", cue:"Square hips, long spine.", alt:"B-Stance RDL" },
    { id:"kbchop", name:"Half-Kneeling KB Chop", tag:"rotation", sets:2, reps:"8/side", load:"12–16 kg", unit:"per side", cue:"Budgeted against the serve. Smooth.", alt:"Cable Chop" },
    { id:"farmer2", name:"Farmer Carry", tag:"carry", sets:3, reps:"40", load:"", unit:"yd", cue:"Finish tall.", alt:"Heavy DB Carry" },
    { id:"bodysaw", name:"Body-Saw", tag:"core", sets:3, reps:"8", load:"BW", unit:"reps", cue:"Small range, iron trunk.", alt:"Dead Bug" },
  ]},
];
const EX_INDEX = {};
DAYS.forEach(d => d.exercises.forEach(ex => { EX_INDEX[ex.id] = ex; }));

const REST = {
  plyopush:75, bench:180, wpu:null, kbpress:120, dips:120, dbrow:75, suitcase:60, abwheel:60,
  boxjump:75, dlh:180, dlv:150, snatch:75, rfess:75, mbtoss:60, farmer:60, pallof:45,
  plyopush2:75, ohp:180, chins:null, incline:120, dips2:120, gorilla:75, suitcase2:60, hollow:45,
  broad:75, squat:180, swings:75, slrdl:75, kbchop:60, farmer2:60, bodysaw:45,
};
const WARMUP_MENU = {
  mon: ["Band pull-aparts ×15–20","Shoulder CARs ×5/side","Scap push-ups ×10","Light DB press ×10","Empty-bar bench ×10, then the ladder"],
  tue: ["Cat-camel ×8","Glute bridge ×10","Dowel hip-hinge drill ×10","Bird dog ×5/side","Light KB swings ×10"],
  thu: ["Band dislocates ×10","Band external rotations ×12/side","Wall slides ×8","Scap pull-ups ×8","Empty-bar press ×10, then the ladder"],
  fri: ["Ankle rocks ×10/side","90/90 hip switches ×6/side","Bodyweight squats ×10","Goblet squat hold 30 s","Empty-bar squats ×8, then the ladder"],
};
const TESTS = [
  { id:"benchtest", tab:"WED", lift:"Bench Test", note:"3–4 easy days first. Crisp singles only — advance while fast, hard stop at RPE 9.5.",
    attempts:[[45,5],[135,5],[160,3],[185,1],[200,1],[210,1],[220,1],[225,1]], rmKey:"bench" },
  { id:"ohptest", tab:"FRI", lift:"OHP Test", note:"48 h after bench — fresh CNS for the lift where 2.5 lb is a whole increment. Same RPE 9.5 gate.",
    attempts:[[45,8],[65,5],[85,3],[100,1],[110,1],[120,1],[127.5,1],[130,1]], rmKey:"ohp" },
];
const WEEKDAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function sessionFocus(week, dayId) {
  if (week === 4 || week === 8) return "Deload week — ~70% mains, 2-set accessories, everything RIR 3–4. The deload is the program.";
  if (week === 12) return "Taper — short and crisp. Nothing new, nothing beyond the sheet. Test week is next.";
  const peak = { 3:"Doubles week: every double fast or the −5 lb rule fires.", 7:"Densest week of the cycle — bar speed is the referee.", 10:"Heavy triples, protected week — accessories at the 2-set floor.", 11:"Peak doubles: 2 crisp sets, done. Everything else at the floor." }[week];
  const base = {
    mon: "Bench wave leads. Pull-ups ride the bench rests — the superset is mandatory.",
    tue: "Heavy 2×2 first while fresh. Every pull dead-stop; kill any slow rep.",
    thu: "OHP wave leads. Chins ride the press rests. Dips yield only to a real shoulder signal.",
    fri: "Squat capped at 225. Tomorrow's tennis gets fresh legs — nothing extra today.",
  }[dayId];
  return peak ? `${peak} ${base}` : base;
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
function getRx(ex, week) {
  if (ex.wave) {
    const w = WAVE[ex.wave][week];
    if (!w) return null;
    const [sets, reps, load] = w;
    const needsWarmup = ex.wave !== "dlV" || !WAVE.dlH[week];
    return { sets, repsLabel:String(reps), repsNum:reps, loadLabel:`${load} lb`, loadNum:load,
             pct:Math.round((load/RM[ex.rm])*100), warmups:needsWarmup ? generateWarmups(load, ex.rm) : null, plates:plateMath(load) };
  }
  const isPrimer = ex.tag === "primer";
  const sets = !isPrimer && REDUCED.has(week) ? Math.min(2, ex.sets) : ex.sets;
  const repsNum = parseFloat(ex.reps);
  return { sets, repsLabel:ex.reps, repsNum:isNaN(repsNum)?"":repsNum, loadLabel:ex.load, loadNum:ex.loadNum ?? null, pct:null, warmups:null, plates:null };
}
const ytUrl = (name) => "https://www.youtube.com/results?search_query=" + encodeURIComponent("how to " + name + " form guide") + "&sp=EgIYAQ%253D%253D";
const e1rm = (w, r) => Math.round(w * (1 + r/30));

const DEFAULT_SETTINGS = { theme:"iron", tone:"radar", vibrate:true, autoRest:true, planName:"Press / Priority", dayMap:{ mon:1, tue:2, thu:4, fri:5 } };

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
export default function PressPriorityTracker() {
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState("mon");
  const [logs, setLogs] = useState({});
  const [extraSets, setExtraSets] = useState({});
  const [notes, setNotes] = useState({});
  const [exNotes, setExNotes] = useState({});
  const [altChoice, setAltChoice] = useState({});
  const [done, setDone] = useState({});
  const [sessDone, setSessDone] = useState({});
  const [tested, setTested] = useState({ bench:"", ohp:"" });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restorePaste, setRestorePaste] = useState("");
  const [status, setStatus] = useState("loading");
  const [timer, setTimer] = useState(null); // { label, endsAt }
  const [order, setOrder] = useState({});         // { "week-day": [exId, ...] } — custom session order
  const [barSpeed, setBarSpeed] = useState({});   // { "week-day-exId": "fast"|"on-target"|"grindy" }
  const [sessionTime, setSessionTime] = useState({}); // { "week-day": { start, end } }
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
          setWeek(d.week ?? 1);
          setLogs(d.logs || {}); setExtraSets(d.extraSets || {}); setNotes(d.notes || {});
          setExNotes(d.exNotes || {});
          const ac = {};
          Object.entries(d.altChoice || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== false) ac[k] = true; });
          setAltChoice(ac);
          setDone(d.done || {}); setSessDone(d.sessDone || {}); setTested(d.tested || { bench:"", ohp:"" });
          setOrder(d.order || {}); setBarSpeed(d.barSpeed || {}); setSessionTime(d.sessionTime || {});
          const st = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
          if (!TONES[st.tone]) st.tone = "radar";
          setSettings(st);
          const dm = { ...DEFAULT_SETTINGS.dayMap, ...(st.dayMap || {}) };
          const match = DAYS.find(x => dm[x.id] === new Date().getDay());
          setDay(d.day && (DAYS.some(x => x.id === d.day) || TESTS.some(x => x.id === d.day)) ? d.day : (match ? match.id : "mon"));
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
    const bundle = { week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime };
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set("pp-tracker-v3", JSON.stringify(bundle)); setStatus("saved"); }
      catch (e) { setStatus("error"); }
    }, 700);
  }, [week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  /* audio */
  const ensureAudio = () => {
    // Tell iOS this is a transient alert: duck any playing music for the tone instead of
    // being silenced by it. Guarded — navigator.audioSession is a newer Safari API.
    try { if (navigator.audioSession) navigator.audioSession.type = "transient"; } catch (e) {}
    if (!audioRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioRef.current = new AC(); }
    if (audioRef.current && audioRef.current.state === "suspended") audioRef.current.resume();
  };
  const startRestById = (exId) => {
    const s = REST[exId];
    if (s == null) return;
    ensureAudio();
    const base = EX_INDEX[exId];
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
    if (settings.autoRest && REST[exId] != null && ((!wasComplete && nowComplete) || rirEntered)) startRestById(exId);
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
  const changeWeek = (w) => {
    const c = Math.max(1, Math.min(13, w));
    setWeek(c);
    if (c === 13 && !TESTS.some(t => t.id === day)) setDay("benchtest");
    if (c < 13 && TESTS.some(t => t.id === day)) {
      const match = DAYS.find(x => dayMap[x.id] === new Date().getDay());
      setDay(match ? match.id : "mon");
    }
  };
  const fmtPrev = (e) => (e && (e.w || e.r) ? `${e.w||"–"}×${e.r||"–"}` : null);

  const requiresWeight = (ex, rx) => rx.loadNum != null || /lb|kg/i.test(rx.loadLabel || "");
  const isAutoDone = (ex, rx) => {
    const rows = logs?.[week]?.[day]?.[ex.id] || [];
    for (let i = 0; i < rx.sets; i++) {
      const e = rows[i];
      if (!e || !e.r || (requiresWeight(ex, rx) && !e.w)) return false;
    }
    return true;
  };
  const isDoneEff = (ex, rx) => { const k = k3(ex.id); return done[k] !== undefined ? done[k] : isAutoDone(ex, rx); };
  const toggleDone = (ex, rx) => { const cur = isDoneEff(ex, rx); setDone(p => ({ ...p, [k3(ex.id)]: !cur })); };

  const weekSubTwo = (w) => {
    let n = 0;
    Object.values(logs[w] || {}).forEach(dy => Object.values(dy).forEach(rows => {
      if (Array.isArray(rows)) rows.forEach(e => { const r = parseFloat(e?.rir); if (!isNaN(r) && r < 2) n++; });
    }));
    return n;
  };
  const subTwoCount = week <= 12 ? weekSubTwo(week) : 0;

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
  const exportBackup = () => copyText(JSON.stringify({ app:"press-priority", version:13, exported:new Date().toISOString(), week, day, logs, extraSets, notes, exNotes, altChoice, done, sessDone, tested, settings, order, barSpeed, sessionTime }), "Backup JSON copied — keep it somewhere safe");
  const restoreBackup = () => {
    try {
      const d = JSON.parse(restorePaste);
      if (!d.logs) throw new Error("bad");
      setLogs(d.logs||{}); setExtraSets(d.extraSets||{}); setNotes(d.notes||{});
      setExNotes(d.exNotes||{});
      const ac = {};
      Object.entries(d.altChoice || {}).forEach(([k, v]) => { if (v) ac[k] = true; });
      setAltChoice(ac);
      setDone(d.done||{}); setSessDone(d.sessDone||{}); setTested(d.tested||{bench:"",ohp:""});
      setOrder(d.order||{}); setBarSpeed(d.barSpeed||{}); setSessionTime(d.sessionTime||{});
      if (d.settings) { const st = { ...DEFAULT_SETTINGS, ...d.settings }; if (!TONES[st.tone]) st.tone = "radar"; setSettings(st); }
      setRestorePaste(""); flash("Backup restored");
    } catch (e) { flash("That doesn't look like a valid backup"); }
  };
  const buildReview = (w) => {
    const L = [];
    L.push(`WEEK ${w} TRAINING LOG — Press-Priority Hybrid v1.3 (${BLOCK(w)}${BADGE[w] ? " · " + BADGE[w] : ""})`);
    L.push(`Rules of record: RIR ≥2 everywhere; two sub-2-RIR sets in a week = deload template next week (§9.3); grindy double → −5 lb; squat cap 225; protected weeks 3/7/10/11; dips yield only to a real shoulder signal.`);
    L.push("");
    DAYS.forEach(d => {
      L.push(`${WEEKDAYS[dayMap[d.id]]} — ${d.lift} day${sessDone[`${w}-${d.id}`] ? " · session finished" : ""}`);
      d.exercises.forEach(ex => {
        const rx = getRx(ex, w);
        if (!rx) { L.push(`  ${ex.name}: off this week (deload/taper)`); return; }
        const subbed = altChoice[`${w}-${d.id}-${ex.id}`];
        const shownName = subbed ? `${ex.name} (subbed: ${ex.alt})` : ex.name;
        const rows = logs?.[w]?.[d.id]?.[ex.id] || [];
        const rxStr = `Rx ${rx.sets}×${rx.repsLabel}${rx.loadLabel ? " @ " + rx.loadLabel : ""}`;
        const logged = rows.filter(e => e && (e.w || e.r));
        if (!logged.length) { L.push(`  ${shownName} — ${rxStr}: NOT LOGGED`); }
        else {
          const sets = rows.map(e => (e && (e.w || e.r)) ? `${e.w||"?"}×${e.r||"?"}${e.rir!=null && e.rir!=="" ? "@RIR"+e.rir : ""}` : null).filter(Boolean).join(", ");
          L.push(`  ${shownName} — ${rxStr}: ${sets}`);
        }
        const en = exNotes[`${w}-${d.id}-${ex.id}`];
        if (en) L.push(`    Exercise note: "${en}"`);
      });
      const nt = notes[`${w}-${d.id}`];
      if (nt) L.push(`  Session notes: "${nt}"`);
      L.push("");
    });
    const s2 = weekSubTwo(w);
    L.push(`AUTO-FLAGS: ${s2} sub-2-RIR set${s2===1?"":"s"} this week${s2>=2 ? " — TWO-STRIKE RULE TRIPPED (deload template next week per §9.3)" : ""}.`);
    L.push("");
    L.push("Coach: review this week against the program's autoregulation rules (§9) and goal hierarchy (presses first, fresh legs for tennis). Tell me: (1) any rule trips and the required response, (2) whether next week runs as written or modified, (3) load/RIR trends on bench and OHP worth acting on, (4) shoulder-budget signals from the notes, (5) any exercise-note requests (load bumps, swaps) to approve or veto.");
    return L.join("\n");
  };
  // Structured export for the Claude Code autoregulation loop (docs/autoregulation-criteria.md).
  // Includes trailing history per main lift so the 2-consecutive-exposure rule can be checked.
  const mainTargetRir = (w) => ([4,8,12].includes(w) ? 3 : 2);
  const buildReviewJSON = (w) => {
    const num = (x) => (x === "" || x == null ? null : parseFloat(x));
    const days = DAYS.map(d => ({
      day: d.id, weekday: WEEKDAYS[dayMap[d.id]], lift: d.lift,
      finished: !!sessDone[`${w}-${d.id}`],
      exercises: d.exercises.map(ex => {
        const rx = getRx(ex, w), key = `${w}-${d.id}-${ex.id}`;
        const actual = (logs?.[w]?.[d.id]?.[ex.id] || [])
          .filter(e => e && (e.w || e.r))
          .map(e => ({ w: num(e.w), r: num(e.r), rir: num(e.rir) }));
        const o = {
          id: ex.id, name: ex.name, category: ex.tag, isMain: !!ex.wave,
          rx: rx ? { sets: rx.sets, reps: rx.repsLabel, load: rx.loadNum, rir: ex.wave ? mainTargetRir(w) : null } : null,
          actual,
        };
        if (altChoice[key]) { o.subbed = ex.alt; }
        if (ex.wave) o.barSpeed = barSpeed[key] || "on-target";
        const note = exNotes[key]; if (note) o.note = note;
        return o;
      }),
    }));
    const history = {};
    DAYS.forEach(d => d.exercises.filter(ex => ex.wave).forEach(ex => {
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
      if (hist.length) history[ex.id] = hist;
    }));
    return JSON.stringify({
      app: "press-priority", kind: "week-report", version: 13,
      week: w, block: BLOCK(w), badge: BADGE[w] || null,
      flags: { protected: [3,7,10,11].includes(w), deload: [4,8].includes(w), taper: w === 12 },
      days, history, autoFlags: { subTwoRir: weekSubTwo(w) },
    }, null, 2);
  };

  /* derived */
  const isTest = week === 13;
  const dayData = isTest ? null : DAYS.find(d => d.id === day);
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
  const visibleEx = orderedEx.filter(ex => getRx(ex, week));
  const doneCount = visibleEx.filter(ex => isDoneEff(ex, getRx(ex, week))).length;
  const moveEx = (exId, dir) => {
    const vis = visibleEx.map(e => e.id);
    const idx = vis.indexOf(exId), j = idx + dir;
    if (idx < 0 || j < 0 || j >= vis.length) return;
    const nv = [...vis]; [nv[idx], nv[j]] = [nv[j], nv[idx]];
    const hidden = orderedEx.map(e => e.id).filter(id => !vis.includes(id));
    setOrder(p => ({ ...p, [sessKey]: [...nv, ...hidden] }));
  };
  const resetOrder = () => setOrder(p => { const n = { ...p }; delete n[sessKey]; return n; });
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
    const prev = week > 1 && week <= 12 ? fmtPrev(logs?.[week-1]?.[day]?.[ex.id]?.[i]) : null;
    const rirVal = cur.rir ?? "";
    const rirWarn = rirVal !== "" && parseFloat(rirVal) < 2;
    const repsNum = parseFloat(cur.r);
    const target = typeof rx.repsNum === "number" ? rx.repsNum : NaN;
    const repClass = !isNaN(repsNum) && !isNaN(target) ? (repsNum < target ? "under" : repsNum > target ? "over" : "") : "";
    const isExtra = i >= rx.sets;
    return (
      <div className="set-row" key={i} style={isExtra ? { opacity:0.75 } : {}}>
        <span className="set-n">{i+1}</span>
        <span className={`prev ${prev ? "" : "empty"}`}>{prev || "—"}</span>
        <input inputMode="decimal" placeholder={rx.loadNum ?? ""} value={cur.w || ""} aria-label={`${ex.name} set ${i+1} weight`}
          onChange={e => setEntry(ex.id, i, "w", e.target.value)} />
        <input inputMode="numeric" placeholder={rx.repsNum} value={cur.r || ""} className={repClass} aria-label={`${ex.name} set ${i+1} reps`}
          onChange={e => setEntry(ex.id, i, "r", e.target.value)} />
        <input inputMode="decimal" placeholder="2" value={rirVal} className={rirWarn ? "warn" : ""} aria-label={`${ex.name} set ${i+1} RIR`}
          onChange={e => setEntry(ex.id, i, "rir", e.target.value)} />
        <button className="rxfill" aria-label="Fill prescribed" onClick={() => {
          if (rx.loadNum != null) setEntry(ex.id, i, "w", String(rx.loadNum));
          if (rx.repsNum !== "") setEntry(ex.id, i, "r", String(rx.repsNum));
          if (settings.autoRest) startRestById(ex.id);
        }}>Rx</button>
      </div>
    );
  };

  const renderCard = (ex) => {
    const rx = getRx(ex, week);
    if (!rx) return (
      <section className="card skipped" key={ex.id}>
        <div className="ex-head"><h2>{ex.name}</h2><span className="rx-off">off this week</span></div>
        <p className="cue"><b>Instructions:</b> No heavy pull on deload/taper weeks — by design.</p>
      </section>
    );
    const extraCount = extraSets[k3(ex.id)] || 0;
    const total = rx.sets + extraCount;
    const exDone = isDoneEff(ex, rx);
    const subbed = !!altChoice[k3(ex.id)];
    const activeName = subbed ? ex.alt : ex.name;
    const prevNote = week > 1 && week <= 12 ? exNotes[`${week-1}-${day}-${ex.id}`] : null;
    return (
      <section className={`card ${ex.wave ? "main" : ""} ${exDone ? "exdone" : ""}`} key={ex.id}>
        <div className="ex-head">
          <h2><span className="exname">{activeName}</span>{subbed && <em className="tag alt-tag">sub</em>}{ex.tag && <em className="tag">{ex.tag}</em>}</h2>
          <div className="ex-actions">
            <button className="movebtn" aria-label={`Move ${activeName} up`} onClick={() => moveEx(ex.id, -1)}>▲</button>
            <button className="movebtn" aria-label={`Move ${activeName} down`} onClick={() => moveEx(ex.id, 1)}>▼</button>
            <a className="ytbtn" href={ytUrl(activeName)} target="_blank" rel="noopener noreferrer" aria-label={`Watch a video example of ${activeName} on YouTube`}>
              <svg viewBox="0 0 28 20" width="26" height="19" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#FF0000"/><path d="M11 5.5v9l8-4.5z" fill="#fff"/></svg>
            </a>
            <button className={`donebtn ${exDone ? "on" : ""}`} aria-pressed={exDone} onClick={() => toggleDone(ex, rx)}>✓</button>
          </div>
        </div>
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
            <span>{rx.sets}×{rx.repsLabel}</span>
            {rx.loadLabel && <span className="rx-load"> @ {rx.loadLabel}</span>}
            {rx.pct && <span className="rx-pct"> {rx.pct}%</span>}
          </div>
          {subbed && <span className="alt-note">alt for {ex.name}</span>}
        </div>
        {ex.wave && (
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
            <div className="plates">Work sets: bar + {rx.plates}</div>
          </div>
        )}
        {prevNote && <div className="lastnote"><b>Last week's note:</b> {prevNote}</div>}
        <div className="grid-head">
          <span>SET</span><span>LAST WK</span><span>WT</span>
          <span>{ex.unit === "reps" ? "REPS" : ex.unit.toUpperCase()}</span><span>RIR</span><span />
        </div>
        {Array.from({ length: total }).map((_, i) => renderSetRow(ex, rx, i))}
        <div className="set-btns">
          {REST[ex.id] != null
            ? <button className="ghost timer-btn" onClick={() => startRestById(ex.id)}>⏱ Rest {fmtTime(REST[ex.id])}</button>
            : <span className="shared-rest">rests inside the superset</span>}
          <button className="solid" onClick={() => addSet(ex.id)}>＋ Add Set</button>
          {extraCount > 0 && <button className="ghost rm-set" onClick={() => removeSet(ex.id)}>−</button>}
        </div>
        <p className="cue"><b>Instructions:</b> {ex.cue}{subbed && " Alt in use — match the pattern: same sets, reps, and RIR as the primary."}</p>
        <input className="exnote" placeholder="Note for next week — e.g. 'go up in weight, felt too easy'" value={exNotes[k3(ex.id)] || ""}
          onChange={e => setExNotes(p => ({ ...p, [k3(ex.id)]: e.target.value }))} />
      </section>
    );
  };

  const renderTestDay = () => {
    const t = TESTS.find(x => x.id === day);
    const extra = extraSets[`13-${day}-ladder`] || 0;
    const totalRows = t.attempts.length + extra;
    return (
      <div>
        <p className="test-note">{t.note}</p>
        <section className="card main">
          <div className="ex-head"><h2>{t.lift}</h2><div className="rx"><span className="rx-load">RPE ≤ 9.5</span></div></div>
          <div className="grid-head"><span>#</span><span>PLAN</span><span>WT</span><span>REPS</span><span>RPE</span><span /></div>
          {Array.from({ length: totalRows }).map((_, i) => {
            const plan = t.attempts[i];
            const cur = logs?.[13]?.[day]?.ladder?.[i] || {};
            const rpeWarn = cur.rir != null && cur.rir !== "" && parseFloat(cur.rir) > 9.5;
            return (
              <div className="set-row" key={i}>
                <span className="set-n">{i+1}</span>
                <span className={`prev ${plan ? "" : "empty"}`}>{plan ? `${plan[0]}×${plan[1]}` : "—"}</span>
                <input inputMode="decimal" placeholder={plan ? plan[0] : ""} value={cur.w || ""} onChange={e => setEntry("ladder", i, "w", e.target.value)} />
                <input inputMode="numeric" placeholder={plan ? plan[1] : 1} value={cur.r || ""} onChange={e => setEntry("ladder", i, "r", e.target.value)} />
                <input inputMode="decimal" placeholder="9" value={cur.rir || ""} className={rpeWarn ? "warn" : ""} onChange={e => setEntry("ladder", i, "rir", e.target.value)} />
                <span />
              </div>
            );
          })}
          <button className="solid full" onClick={() => addSet("ladder")}>＋ Attempt</button>
          <div className="tested-row">
            <label>Tested 1RM</label>
            <input inputMode="decimal" placeholder={RM[t.rmKey]} value={tested[t.rmKey] || ""} onChange={e => setTested(p => ({ ...p, [t.rmKey]: e.target.value }))} />
          </div>
          <p className="cue"><b>Instructions:</b> Next-cycle increments: OHP +2.5–5 · Bench +5 · Squat +5–10 · DL +10. Squat/DL singles optional the following Monday, RPE ≤9.</p>
        </section>
      </div>
    );
  };

  const renderSettings = () => (
    <section className="card settings">
      <div className="ex-head"><h2>Settings</h2><button className="donebtn" onClick={() => setSettingsOpen(false)}>✕</button></div>
      <div className="set-label">Plan name</div>
      <input className="planname" value={settings.planName ?? ""} placeholder="Press / Priority"
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
      <button className="solid full" onClick={() => copyText(buildReviewJSON(week), "AI report (JSON) copied — paste into Claude Code")} disabled={isTest}>Copy AI report (JSON)</button>
      <button className="solid full" onClick={() => copyText(buildReview(week), "Text report copied")} disabled={isTest} style={{ marginTop: 8 }}>Copy text report</button>
      <div className="set-label">Restore from backup</div>
      <textarea placeholder="Paste a backup JSON here…" value={restorePaste} onChange={e => setRestorePaste(e.target.value)} />
      <button className="solid full" onClick={restoreBackup} disabled={!restorePaste.trim()}>Restore</button>
    </section>
  );

  /* ── layout ── */
  return (
    <div className="app" style={themeStyle}>
      <style>{css}</style>
      <header className="hdr">
        <div className="hdr-row">
          <div className="brand">{(settings.planName || "Press / Priority").toUpperCase()}</div>
          <div className={`status s-${status}`}>{toast || (status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved" : "")}</div>
        </div>
        <div className="toolbar">
          <button className={`tool ${settingsOpen ? "on" : ""}`} onClick={() => setSettingsOpen(o => !o)}><span className="ic">⚙</span>Settings</button>
          <button className={`tool ${wake ? "on" : ""}`} onClick={toggleWake} aria-pressed={wake}><span className="ic">☀</span>{wake ? "Awake" : "Screen"}</button>
          <button className="tool" onClick={exportBackup}><span className="ic">⬇</span>Backup</button>
          <button className="tool" onClick={() => copyText(buildReviewJSON(week), "AI report (JSON) copied — paste into Claude Code")} disabled={isTest}><span className="ic">✦</span>AI Analysis</button>
        </div>
        <div className="wave" role="tablist" aria-label="Select week">
          {INTENSITY.map((pct, i) => {
            const w = i + 1;
            const deload = w === 4 || w === 8 || w === 12;
            return (
              <button key={w} role="tab" aria-selected={week === w} className={`wave-col ${week === w ? "on" : ""}`}
                aria-label={`Week ${w}, ${pct}% intensity${BADGE[w] ? ", " + BADGE[w] : ""}`} onClick={() => changeWeek(w)}>
                <span className={`bar ${deload ? "deload" : ""}`} style={{ height: `${((pct-62)/30)*34 + 8}px` }} />
                <span className="wk-num">{w}</span>
              </button>
            );
          })}
          <button role="tab" aria-selected={week === 13} className={`wave-col ${week === 13 ? "on" : ""}`} aria-label="Week 13, test week" onClick={() => changeWeek(13)}>
            <span className="bar test" style={{ height: "42px" }} />
            <span className="wk-num">T</span>
          </button>
        </div>
        <div className="week-row">
          <button className="step" onClick={() => changeWeek(week-1)} disabled={week === 1} aria-label="Previous week">‹</button>
          <div className="week-title">
            <div className="wk">{week === 13 ? "TEST WEEK" : `WEEK ${week}`}</div>
            <div className="blk">{BLOCK(week)}{BADGE[week] && <span className="badge">{BADGE[week]}</span>}</div>
          </div>
          <button className="step" onClick={() => changeWeek(week+1)} disabled={week === 13} aria-label="Next week">›</button>
        </div>
        <nav className={`tabs ${isTest ? "two" : ""}`}>
          {(isTest ? TESTS : DAYS).map(d => (
            <button key={d.id} className={`tab ${day === d.id ? "on" : ""}`} onClick={() => setDay(d.id)}>
              {sessDone[`${week}-${d.id}`] && <span className="tab-done">✓</span>}
              <span className="tab-day">{isTest ? d.tab : WEEKDAYS[dayMap[d.id]]}</span>
              <span className="tab-lift">{d.lift}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="session">
        {settingsOpen && renderSettings()}
        {isTest ? renderTestDay() : (
          <div>
            <div className="cap-note">60-min working cap · warm-up off the clock · RIR ≥2 · two slow reps end the set</div>
            {sessionTime[sessKey] && (
              <div className="sessiontime">Workout time <b><SessionClock start={sessionTime[sessKey].start} end={sessionTime[sessKey].end} /></b></div>
            )}
            <div className="focus"><b>Focus</b>{sessionFocus(week, day)}</div>
            {subTwoCount >= 2 && (
              <div className="banner"><b>Two-strike rule tripped:</b> {subTwoCount} sub-2-RIR sets this week. Per §9.3, next week runs the deload template. Run AI Analysis for the full review.</div>
            )}
            <div className="progress"><b>{doneCount}</b> / {visibleEx.length} exercises done</div>
            {order[sessKey] && <button className="resetorder" onClick={resetOrder}>↺ Reset to recommended order</button>}
            <section className="card warmcard">
              <button className="warm-toggle" aria-expanded={warmOpen} onClick={() => setWarmOpen(o => !o)}>
                <span>General warm-up · 5–8 min · off the clock</span>
                <span className="chev">{warmOpen ? "−" : "+"}</span>
              </button>
              {warmOpen && <ul className="warm-list">{WARMUP_MENU[day].map((m, i) => <li key={i}>{m}</li>)}</ul>}
            </section>
            {visibleEx.map(ex => renderCard(ex))}
            <div className="notes-label">Session notes — shoulder signals, bar speed, tennis legs</div>
            <textarea value={notes[sessKey] || ""} placeholder="e.g. Last bench double slowed slightly. Dips clean. Legs heavy from Wednesday tennis."
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
                <b>Session summary — </b>{doneCount}/{visibleEx.length} exercises done · {setsLoggedCount()} sets logged
                {subTwoCount > 0 ? ` · ${subTwoCount} sub-2-RIR set${subTwoCount === 1 ? "" : "s"} this week` : " · all sets at RIR ≥2"}
                {(() => { const b = dayMainE1rm(); return b ? ` · best ${b.name} e1RM ≈ ${b.est} lb` : ""; })()}
                . {subTwoCount >= 2 ? "Deload template next week per the two-strike rule." : "Clear to run next session as written."}
              </div>
            )}
            <footer className="foot">Wave: 5s / 3s / 2s / deload · Doubles cap 91% bench, 90% OHP · Grindy double → −5 lb automatically</footer>
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
.hdr{padding:14px 16px 0;background:var(--bg);border-bottom:1px solid var(--line)}
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
.bar.test{background:var(--barDim);border:1px solid var(--ok)}
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
.ex-head{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
.ex-head h2{font-size:15px;font-weight:600;line-height:1.25;flex:1;min-width:0;display:flex;align-items:center;gap:0;overflow:hidden}
.exname{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.ex-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ex-tools{display:flex;align-items:center;gap:8px;margin-top:10px}
.ytbtn{display:flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:99px;background:transparent;text-decoration:none}
.ytbtn svg{display:block;border-radius:5px}
.tag{flex:none;font-style:normal;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:2px 8px;margin-left:7px;white-space:nowrap}
.alt-tag{color:var(--accent);border-color:var(--accentDim)}
.inlbtn{min-height:34px;padding:0 13px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:8px;color:color-mix(in srgb,var(--accent) 75%,var(--muted));background:transparent;font-family:'Barlow Condensed';font-weight:700;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap}
.inlbtn.on{border-color:var(--accentDim);background:color-mix(in srgb,var(--accent) 8%,transparent);color:var(--accent)}
.alt-note{font-size:10px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
.planname{font-family:'Barlow Condensed'!important;font-size:17px!important;text-align:left!important;padding:8px 12px!important}
.donebtn{width:34px;height:34px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:99px;color:var(--faint);font-size:15px}
.donebtn.on{border-color:var(--ok);color:var(--ok)}
.meta-row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px}
.rx{font-family:'Barlow Condensed';font-weight:600;font-size:19px;font-variant-numeric:tabular-nums;white-space:nowrap}
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
.movebtn{width:24px;height:30px;padding:0;color:var(--faint);font-size:11px;line-height:1;background:none;border:none}
.movebtn:active{color:var(--accent)}
.barspeed-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.bs-label{flex:0 0 auto;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.barspeed{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;flex:1}
.bs-btn{min-height:34px;border:0.5px solid color-mix(in srgb,var(--accent) 6%,transparent);border-radius:8px;background:transparent;color:var(--muted);font-family:'Barlow Condensed';font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.bs-btn.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.sessiontime{text-align:center;font-family:'Barlow Condensed';font-weight:600;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.sessiontime b{color:var(--accent);font-size:15px;font-weight:700}
.sessionclock{font-variant-numeric:tabular-nums}
.resetorder{display:block;margin:0 auto 12px;color:var(--muted);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;background:none;border:none;text-decoration:underline}
@media (prefers-reduced-motion: reduce){.app *{transition:none!important}}
`;
