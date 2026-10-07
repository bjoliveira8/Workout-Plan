/* ═══════════ WEEKLY REVIEW RULES — what a Saturday proposal may change, and the rails ═══════════
   Spec: docs/superpowers/specs/2026-10-04-weekly-ai-review-design.md §5–§7.
   Pure and dependency-free (it reads only the generated program data), so ONE copy of the rules
   runs everywhere: in the app (Approve re-checks here), in test.mjs, and in the cloud routine's
   checker (tools/check-proposal.mjs). No React in here — nothing can trip the focus-loss rule.

   test.mjs's program invariants check the plan EXACTLY (pressing = 20, calves = 6, 464 rows).
   These rules check a CHANGED week against the LIMITS, so a legitimate cut is not rejected. */

import { META } from "./program.js";

export const PROPOSAL_SCHEMA = 1;
export const DAY_IDS = ["sun", "mon", "wed", "fri"];
export const REDUCED_WEEKS = new Set(META.deloadWeeks);           // weeks 6 and 12
export const TIME_LIMIT_SECONDS = META.strengthLimitMinutes * 60; // 4500 — the hard 75 minutes

/* Reserve floor: 2 in a normal week, 4 in weeks 6 and 12 (C08). Moved here from App.jsx so the
   phone and the routine judge reserve the same way. */
export const RIR_FLOOR = (w) => (REDUCED_WEEKS.has(w) ? 4 : 2);

/* A prescription's own reserve ("2–3", "3+", "≥2; aim 2") as a number. An RPE instruction is an
   effort target, not a reserve, so it gets none. Moved here from App.jsx unchanged. */
export const rirTarget = (rirText) => {
  if (!rirText || /RPE/i.test(rirText)) return null;
  const m = String(rirText).match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

/* The ONLY lifts whose load a weekly change may touch, with their plate step — verified against
   all twelve weeks of program.js (test.mjs asserts every numeric-load id is listed; that is what
   would have caught dlback getting a 2.5 lb step). Dips and pull-ups step their ADDED load. */
export const STEP_MAP = {
  ohp: 2.5, ohptop: 2.5, ohpback: 2.5, dipheavy: 2.5, dipback: 2.5, dip: 2.5, pullup: 2.5, pulluplong: 2.5,
  bench: 5, squat: 5,
  dl: 10, dlback: 10,
};
/* Priority lifts: the only rests a change may lengthen — and never past 3:00 (brain §6). */
export const PRIORITY_REST_IDS = new Set(["ohp", "ohptop", "ohpback", "dipheavy", "dipback", "dip", "pullup", "pulluplong", "bench"]);
export const MAX_REST = 180;
export const CHANGE_FIELDS = ["load", "sets", "remove", "reps", "rir", "rest"];

const num = (x) => (x === "" || x == null ? NaN : parseFloat(x));
const near = (a, b) => Math.abs(a - b) < 1e-9;
const onGrid = (x, step) => near(x / step, Math.round(x / step));

/* ── what was actually lifted ── */

// The heaviest completed work-set load in a list of logged rows (a row needs weight AND reps).
export const performedLoad = (rows) => {
  let best = null;
  for (const e of Array.isArray(rows) ? rows : []) {
    const w = num(e && e.w), r = num(e && e.r);
    if (!isNaN(w) && !isNaN(r) && r > 0 && (best === null || w > best)) best = w;
  }
  return best;
};

/* The last performed load before `forWeek`: the most recent NON-reduced week that has one.
   Weeks 6 and 12 are skipped, so a deload never sets the floor. byWeek = { [week]: load|null }. */
export const lastPerformedLoad = (byWeek, forWeek) => {
  for (let w = forWeek - 1; w >= 1; w--) {
    if (REDUCED_WEEKS.has(w)) continue;
    const v = byWeek ? byWeek[w] : null;
    if (v != null && !isNaN(v)) return v;
  }
  return null;
};

// The same, read from the phone's own logs (logs[week][day][id] = rows) — used by Approve.
export const lastPerformedFromLogs = (logs, day, id, forWeek) => {
  const byWeek = {};
  for (let w = 1; w < forWeek; w++) byWeek[w] = performedLoad(logs && logs[w] && logs[w][day] && logs[w][day][id]);
  return lastPerformedLoad(byWeek, forWeek);
};

// The same, read from a week report (version 18): the reviewed week's own rows plus its history.
export const lastPerformedFromReport = (report, day, id, forWeek) => {
  const byWeek = {};
  const d = ((report && report.days) || []).find((x) => x.day === day);
  const row = d && (d.exercises || []).find((e) => e.id === id);
  if (row && report.week < forWeek) byWeek[report.week] = row.performedLoad ?? null;
  for (const h of (report && report.history && report.history[`${day}-${id}`]) || [])
    if (h.week < forWeek && byWeek[h.week] == null) byWeek[h.week] = h.performedLoad ?? null;
  return lastPerformedLoad(byWeek, forWeek);
};

/* ── the change rules (spec §6.1) ── */

// The plan's current value of one changeable field (`remove` starts false).
export const plannedValue = (item, field) =>
  field === "load" ? item.load : field === "sets" ? item.sets : field === "remove" ? false
  : field === "reps" ? item.repsNum : field === "rir" ? item.rir : field === "rest" ? item.rest : undefined;

/* What each field of one item may become next week; a missing key = that field cannot change.
   Shared by the checker and tools/week-context.mjs, so the routine is SHOWN exactly the values
   the checker will accept. */
export const allowedFor = (item, forWeek, lastPerformed) => {
  const out = {};
  const step = STEP_MAP[item.id];
  if (step && typeof item.load === "number") {
    // Floor = two steps under the lower of the plan and what was actually lifted last time.
    const anchor = lastPerformed != null ? Math.min(item.load, lastPerformed) : item.load;
    const min = Math.max(0, anchor - 2 * step);
    const values = [];
    for (let v = item.load - step; v >= min - 1e-9; v -= step) values.push(Math.round(v * 10) / 10);
    // Holding at an off-step last load (e.g. 222.5 on a 5 lb lift) is allowed too.
    if (lastPerformed != null && lastPerformed < item.load && lastPerformed >= min && onGrid(lastPerformed, 2.5)
        && !values.some((v) => near(v, lastPerformed))) values.push(lastPerformed);
    if (values.length) out.load = { step, min, max: item.load, values: values.sort((a, b) => b - a), lastPerformed };
  }
  const minSets = Math.max(2, item.protectedSets || 0);              // two-set rule + the cut-order minimum
  if (item.sets > minSets) out.sets = { min: minSets, max: item.sets - 1 };
  if (item.protectedSets === 0) out.remove = true;                   // today: the Friday DB incline bench
  if (typeof item.repsNum === "number" && item.repsNum === item.repsMax && item.repsNum > 1)
    out.reps = { min: Math.max(1, item.repsNum - 2), max: item.repsNum - 1 };
  const t = rirTarget(item.rir);
  if (t != null) out.rir = { minTarget: Math.max(t, RIR_FLOOR(forWeek)) };
  if (PRIORITY_REST_IDS.has(item.id) && typeof item.rest === "number" && item.rest < MAX_REST) out.rest = { min: item.rest + 1, max: MAX_REST };
  return out;
};

const bad = (reason) => ({ ok: false, reason });

/* One change against §6.1 → { ok } or { ok: false, reason }. `lastPerformedFor(day, id)` supplies
   the last load actually lifted (from the phone's logs, or from the report in the routine). */
export const validateChange = (ch, { sessions, forWeek, lastPerformedFor } = {}) => {
  if (!ch || typeof ch !== "object") return bad("a change must be an object");
  const tag = `${ch.day} ${ch.id} ${ch.field}`;
  if (!(Number.isInteger(forWeek) && forWeek >= 1 && forWeek <= META.weeks)) return bad(`${tag}: week ${forWeek} cannot change`);
  if (!DAY_IDS.includes(ch.day)) return bad(`${tag}: unknown day`);
  const items = (sessions && sessions[forWeek] && sessions[forWeek][ch.day] && sessions[forWeek][ch.day].items) || [];
  const item = items.find((i) => i.id === ch.id);
  if (!item) return bad(`${tag}: no such exercise on that day in week ${forWeek}`);
  if (item.clock !== "strength") return bad(`${tag}: only set-grid exercises can change`);
  if (item.test) return bad(`${tag}: a target test never changes`);
  if (!CHANGE_FIELDS.includes(ch.field)) return bad(`${tag}: this field cannot change`);
  for (const k of ["why", "rule", "reverseIf"]) if (typeof ch[k] !== "string" || !ch[k].trim()) return bad(`${tag}: "${k}" is required`);
  const planned = plannedValue(item, ch.field);
  if (ch.from !== planned) return bad(`${tag}: from ${JSON.stringify(ch.from)}, but the plan says ${JSON.stringify(planned)}`);
  if (ch.to === planned) return bad(`${tag}: changes nothing`);
  const lp = lastPerformedFor ? lastPerformedFor(ch.day, ch.id) : null;
  const a = allowedFor(item, forWeek, lp);
  const to = ch.to;
  switch (ch.field) {
    case "load":
      if (!a.load) return bad(`${tag}: this load cannot change`);
      if (typeof to !== "number" || !isFinite(to)) return bad(`${tag}: must be a number`);
      if (to > a.load.max + 1e-9) return bad(`${tag}: ${to} is above the plan's ${a.load.max}`);
      if (to < a.load.min - 1e-9) return bad(`${tag}: ${to} is below the floor of ${a.load.min}`);
      if (!a.load.values.some((v) => near(v, to))) return bad(`${tag}: ${to} is off the ${a.load.step} lb step (allowed: ${a.load.values.join(", ")})`);
      return { ok: true };
    case "sets":
      if (!a.sets) return bad(`${tag}: sets cannot be cut here (protected minimum, or the two-set rule)`);
      if (!Number.isInteger(to) || to < a.sets.min || to > a.sets.max) return bad(`${tag}: must be ${a.sets.min}–${a.sets.max}`);
      return { ok: true };
    case "remove":
      if (!a.remove) return bad(`${tag}: only an optional exercise (protectedSets 0) can be skipped`);
      if (to !== true) return bad(`${tag}: "to" must be true`);
      return { ok: true };
    case "reps":
      if (!a.reps) return bad(`${tag}: only a fixed rep target can change`);
      if (!Number.isInteger(to) || to < a.reps.min || to > a.reps.max) return bad(`${tag}: must be ${a.reps.min}–${a.reps.max}`);
      return { ok: true };
    case "rir": {
      if (!a.rir) return bad(`${tag}: an RPE effort target cannot change`);
      const t = typeof to === "string" && !/RPE/i.test(to) ? rirTarget(to) : null;
      if (t == null) return bad(`${tag}: must be a reserve like "3+" or "3–4"`);
      if (t < a.rir.minTarget) return bad(`${tag}: reserve ${t} is harder than allowed (at least ${a.rir.minTarget})`);
      return { ok: true };
    }
    case "rest":
      if (!a.rest) return bad(`${tag}: only a priority lift's rest can change, and only up to 3:00`);
      if (!Number.isInteger(to) || to < a.rest.min || to > a.rest.max) return bad(`${tag}: must be ${a.rest.min}–${a.rest.max} seconds`);
      return { ok: true };
    default:
      return bad(`${tag}: this field cannot change`);
  }
};

/* Apply changes to ONE week of a session table → { sessions, applied, skipped }. Never mutates its
   input (untouched weeks and days keep their identity). A change whose `from` no longer matches
   the plan is skipped (program.js was edited after the review), as is any change on a day in
   `skipDays` (that day has already started). Each changed item carries
   `adjusted: [{ field, planned, to, why, rule, reverseIf }]` for the card chip and the report;
   a skipped-by-review exercise moves to the session's `removed` list. Validation is the caller's job. */
export const applyChanges = (sessions, week, changes, { skipDays } = {}) => {
  const applied = [], skipped = [];
  const wk = { ...(sessions[week] || {}) };
  for (const ch of changes || []) {
    if (skipDays && skipDays.has(ch.day)) { skipped.push({ change: ch, reason: "day already started" }); continue; }
    const ses = wk[ch.day];
    const idx = ses ? ses.items.findIndex((i) => i.id === ch.id) : -1;
    if (idx < 0) { skipped.push({ change: ch, reason: "no longer in the plan" }); continue; }
    const item = ses.items[idx];
    if (plannedValue(item, ch.field) !== ch.from) { skipped.push({ change: ch, reason: "the plan changed since the review" }); continue; }
    const note = { field: ch.field, planned: ch.from, to: ch.to, why: ch.why, rule: ch.rule, reverseIf: ch.reverseIf };
    const next = { ...item, adjusted: [...(item.adjusted || []), note] };
    if (ch.field === "load") next.load = ch.to;
    else if (ch.field === "sets") next.sets = ch.to;
    else if (ch.field === "reps") { next.reps = String(ch.to); next.repsNum = ch.to; next.repsMax = ch.to; }
    else if (ch.field === "rir") next.rir = ch.to;
    else if (ch.field === "rest") next.rest = ch.to;
    const items = [...ses.items];
    if (ch.field === "remove") {
      items.splice(idx, 1);
      wk[ch.day] = { ...ses, items, removed: [...(ses.removed || []), next] };
    } else {
      items[idx] = next;
      wk[ch.day] = { ...ses, items };
    }
    applied.push(ch);
  }
  return { sessions: applied.length || skipped.length ? { ...sessions, [week]: wk } : sessions, applied, skipped };
};

/* One week's audit from the plan's OWN flags — the same arithmetic as tools/gen-program.mjs, so the
   unchanged plan reproduces AUDIT exactly (test.mjs asserts it). */
export const auditWeek = (weekSessions) => {
  const all = DAY_IDS.flatMap((d) => ((weekSessions && weekSessions[d] && weekSessions[d].items) || []).map((i) => ({ ...i, day: d })));
  const sets = (pred) => all.filter(pred).reduce((a, i) => a + i.sets, 0);
  const days = (pred) => new Set(all.filter(pred).map((i) => i.day)).size;
  const press = sets((i) => i.workSet && i.family === "press");
  const vertical = sets((i) => i.workSet && i.family === "vertical");
  const horizontal = sets((i) => i.workSet && i.family === "horizontal");
  return {
    press, vertical, horizontal,
    biceps: sets((i) => i.armKind === "biceps"), triceps: sets((i) => i.armKind === "triceps"), calves: sets((i) => i.calf),
    lower: days((i) => i.lowerStrength), shoulder: days((i) => i.shoulderHealth), abs: days((i) => i.directAbs),
    unilateral: days((i) => i.unilateral), powerDays: days((i) => i.power), carry: days((i) => i.family === "carry"),
    adductor: days((i) => i.family === "adductor"),
    ratio: vertical + horizontal ? Math.round((press / (vertical + horizontal)) * 1000) / 1000 : null,
  };
};

/* The rails (spec §6.2): a changed week against the LIMITS. `effective` is the changed table, `base`
   the plan. Floors hold (Brian, 2026-10-04): volume floors in normal weeks, structural floors in
   every week, the two-set rule, the 75-minute tripwire, and nothing harder, heavier or shorter than
   planned. Reserve is judged against the PLAN (arms are prescribed 1–2 RIR by design), and a CHANGED
   reserve must also meet the week floor. */
export const checkRails = (week, effective, base) => {
  const f = META.floors, out = [];
  const a = auditWeek(effective[week]);
  if (!REDUCED_WEEKS.has(week)) {
    if (a.press < f.press || a.press > f.pressMax) out.push(`pressing ${a.press} sets, outside ${f.press}–${f.pressMax}`);
    if (a.vertical < f.vertical) out.push(`vertical pulling ${a.vertical} sets, below ${f.vertical}`);
    if (a.horizontal < f.horizontal) out.push(`horizontal pulling ${a.horizontal} sets, below ${f.horizontal}`);
    if (a.ratio == null || a.ratio > f.ratioMax) out.push(`press:pull ${a.ratio}, above ${f.ratioMax}`);
    if (a.biceps < f.biceps) out.push(`biceps ${a.biceps} sets, below ${f.biceps}`);
    if (a.triceps < f.triceps) out.push(`triceps ${a.triceps} sets, below ${f.triceps}`);
    if (a.calves < f.calves) out.push(`calves ${a.calves} sets, below ${f.calves}`);
  }
  if (a.lower !== f.lower) out.push(`lower-body days ${a.lower}, must be ${f.lower}`);
  if (a.shoulder < f.shoulder) out.push(`shoulder days ${a.shoulder}, below ${f.shoulder}`);
  if (a.abs < f.abs) out.push(`direct-abs days ${a.abs}, below ${f.abs}`);
  if (a.adductor !== f.adductor) out.push(`adductor days ${a.adductor}, must be ${f.adductor}`);
  if (a.carry < f.carry) out.push(`carry days ${a.carry}, below ${f.carry}`);
  if (a.unilateral < f.unilateral) out.push(`unilateral days ${a.unilateral}, below ${f.unilateral}`);
  const powerMin = week === META.testWeek ? f.power - 1 : f.power;   // 3 in week 12 (exception E11)
  if (a.powerDays < powerMin) out.push(`power days ${a.powerDays}, below ${powerMin}`);
  for (const d of DAY_IDS) {
    const ses = effective[week] && effective[week][d];
    if (!ses) continue;
    if (ses.secondsIfMaxRests > TIME_LIMIT_SECONDS) out.push(`${d}: ${Math.round(ses.secondsIfMaxRests / 60)} min with every priority rest at 3:00 — over the ${META.strengthLimitMinutes}-minute limit`);
    const baseItems = (base[week] && base[week][d] && base[week][d].items) || [];
    for (const it of ses.items) {
      const b = baseItems.find((x) => x.id === it.id);
      if (!b) { out.push(`${d} ${it.id}: not in the plan`); continue; }
      if (it.sets < 2 && b.sets >= 2) out.push(`${d} ${it.id}: a single set (two-set rule)`);
      if (it.sets > b.sets) out.push(`${d} ${it.id}: more sets than planned`);
      if (typeof b.load === "number" && typeof it.load === "number" && it.load > b.load + 1e-9) out.push(`${d} ${it.id}: heavier than planned`);
      if (typeof b.repsNum === "number" && typeof it.repsNum === "number" && it.repsNum > b.repsNum) out.push(`${d} ${it.id}: more reps than planned`);
      if (it.rest !== b.rest && !(PRIORITY_REST_IDS.has(it.id) && it.rest > b.rest && it.rest <= MAX_REST)) out.push(`${d} ${it.id}: rest ${b.rest} → ${it.rest} is not allowed`);
      if (it.rir !== b.rir) {
        const bt = rirTarget(b.rir), et = rirTarget(it.rir);
        if (et == null || (bt != null && et < bt) || et < RIR_FLOOR(week)) out.push(`${d} ${it.id}: reserve "${it.rir}" is harder than allowed`);
      }
    }
  }
  return { ok: !out.length, failures: out };
};

/* ── the whole proposal file (spec §5) ── */

const STATUSES = ["proposed", "hold", "no-data", "summary-only"];
const LEVELS = ["stop", "manual", "info"];

/* Schema → every change → apply → rails. Returns { ok, failures[] } in plain words. Used by the
   routine's checker AND by the phone before Approve (the phone never trusts the file's `check`). */
export const validateProposal = (p, { sessions, lastPerformedFor, expectedForWeek } = {}) => {
  if (!p || typeof p !== "object" || Array.isArray(p)) return { ok: false, failures: ["not a JSON object"] };
  const f = [];
  if (p.schema !== PROPOSAL_SCHEMA) f.push(`schema must be ${PROPOSAL_SCHEMA}`);
  if (p.program !== META.programId) f.push(`program must be "${META.programId}"`);
  if (!Number.isInteger(p.forWeek) || p.forWeek < 1 || p.forWeek > META.weeks + 1) f.push("forWeek must be 1–13");
  if (expectedForWeek != null && p.forWeek !== expectedForWeek) f.push(`forWeek is ${p.forWeek}, expected ${expectedForWeek}`);
  if (p.reviewedWeek !== p.forWeek - 1) f.push("reviewedWeek must be forWeek − 1");
  if (!STATUSES.includes(p.status)) f.push(`status must be one of ${STATUSES.join(", ")}`);
  if (typeof p.summary !== "string" || p.summary.split(/\s+/).filter(Boolean).length > 80) f.push("summary must be plain text of at most 80 words");
  if (p.status !== "no-data") {
    if (![0, 1, 2, 3].includes(p.fatigueLevel)) f.push("fatigueLevel must be 0–3");
    if (typeof p.fatigueEvidence !== "string" || !p.fatigueEvidence.trim()) f.push("fatigueEvidence is required");
  }
  const list = (k) => (Array.isArray(p[k]) ? p[k] : (f.push(`${k} must be a list`), []));
  const findings = list("findings"), alerts = list("alerts"), changes = list("changes"), holds = list("holds"), notes = list("notes");
  if (findings.length > 5) f.push("at most 5 findings");
  findings.forEach((x, i) => { if (!x || !["observation", "hypothesis"].includes(x.kind) || typeof x.text !== "string") f.push(`finding ${i + 1}: needs kind observation|hypothesis and text`); });
  alerts.forEach((x, i) => { if (!x || !LEVELS.includes(x.level) || typeof x.text !== "string" || !Array.isArray(x.days) || !x.days.length || !x.days.every((d) => DAY_IDS.includes(d))) f.push(`alert ${i + 1}: needs level stop|manual|info, text and days`); });
  if (notes.length > 8) f.push("at most 8 notes");
  notes.forEach((x, i) => { if (!x || !DAY_IDS.includes(x.day) || typeof x.id !== "string" || typeof x.text !== "string" || x.text.length > 140) f.push(`note ${i + 1}: needs day, id and text of at most 140 characters`); });
  holds.forEach((x, i) => { if (!x || !DAY_IDS.includes(x.day) || typeof x.id !== "string" || typeof x.why !== "string") f.push(`hold ${i + 1}: needs day, id and why`); });
  if (p.status !== "proposed" && changes.length) f.push(`a "${p.status}" proposal carries no changes`);
  if (p.forWeek === META.weeks + 1 && (p.status !== "summary-only" || changes.length)) f.push("week 13: summary-only, no changes");
  const seen = new Set();
  changes.forEach((ch, i) => {
    const key = `${ch && ch.day} ${ch && ch.id} ${ch && ch.field}`;
    if (seen.has(key)) f.push(`change ${i + 1}: a second change to ${key}`);
    seen.add(key);
    const v = validateChange(ch, { sessions, forWeek: p.forWeek, lastPerformedFor });
    if (!v.ok) f.push(`change ${i + 1}: ${v.reason}`);
  });
  if (!f.length && changes.length) {
    const r = applyChanges(sessions, p.forWeek, changes);
    r.skipped.forEach((s) => f.push(`change ${s.change.day} ${s.change.id}: ${s.reason}`));
    f.push(...checkRails(p.forWeek, r.sessions, sessions).failures);
  }
  return { ok: !f.length, failures: f };
};

/* A fetched file is a proposal for THIS program and THIS week (spec §7.1). */
export const isProposalFor = (p, week) =>
  !!p && typeof p === "object" && p.schema === PROPOSAL_SCHEMA && p.program === META.programId && p.forWeek === week;

/* Merge fetched proposals into `reviews` (spec §7.2). A decided week is never replaced; an unchanged
   proposal is a no-op (the SAME object comes back, so React does not re-render or re-sync). */
export const mergeProposals = (reviews, proposals, nowIso) => {
  let next = reviews;
  for (const p of proposals) {
    const cur = reviews[p.forWeek];
    if (cur && cur.status && cur.status !== "pending") continue;
    if (cur && cur.proposal && cur.proposal.createdAt === p.createdAt) continue;
    if (next === reviews) next = { ...reviews };
    next[p.forWeek] = { proposal: p, status: "pending", fetchedAt: nowIso };
  }
  return next;
};

/* The effective session table (spec §7.5): the plan with every APPROVED week's applied changes.
   With nothing approved it IS the plan (same object). */
export const buildEffective = (sessions, reviews) => {
  let table = sessions;
  for (const [w, r] of Object.entries(reviews || {}))
    if (r && r.status === "approved" && Array.isArray(r.applied) && r.applied.length)
      table = applyChanges(table, Number(w), r.applied).sessions;
  return table;
};
