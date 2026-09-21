# Autoregulation Criteria — Astra Concurrent Block v2.0-w1 (the "brain")

The decision lens the AI coach applies to each weekly report. It sits **inside** the rails of
`docs/12-week-concurrent-block.md` and adds nothing the program does not already permit.

Input is the JSON the app's **AI Analysis** button produces (`buildReviewJSON`, version 14).
Output is the Mode B weekly audit defined in the program's §10.

---

## Order of checks — do not reorder

1. **Adductor gate** (§5.10). If any check this week returned abnormal, resolve it before
   reading anything else. It outranks every other signal in the block.
2. **Hard rails.** Caps, the tier-3 gate, the 15% plyometric rule, the sprint ceiling, the
   deadlift exposure count, the volume floors, the press-to-pull ratio.
3. **Conflict hierarchy** (§5.1) for anything that competes:
   health → OHP/dip/pull-up → prescribed TrainerRoad → elastic quality → deadlift maintenance →
   squat and bench → secondary volume.
4. **Per-domain readiness** — global, push, pull, lower-body, elastic and running.
5. **Progression decisions**, one primary variable at a time.

---

## Hard rails (checked first, override everything)

| Rail | Value |
|---|---|
| Training load caps | OHP 125 · dip +50 · pull-up +45 · squat 245 · DL 455 · bench 205 |
| Deadlift | One exposure every 7 days on Monday. 12 exposures. No max test, ever. |
| Tier 3 plyometrics | Zero before week 5. Never more than 15% above the highest previously tolerated weekly volume in that tier. |
| Sprint volume | 250 m of quality volume per session, hard ceiling. Hill only through week 6. |
| Copenhagen | 6–8 reps per side. Long lever not before three clean weeks. |
| RIR floor | 2 in accumulation, 1 in intensification, 4 in a deload week. |
| Deloads | Weeks 6 and 12 are obeyed literally — no autoregulation up or down. |
| Exclusions | Turkish get-up · Bulgarian split squat · barbell RDL · dumbbell row · cable row · cable flye. Never, including as alternatives. |
| Scope | No nutrition, no ride content, no wearable-derived rules. |

Within 2.5 lb of a cap, the weight is frozen. `test.mjs` enforces every rail above, so a proposed
`WAVE` edit that breaches one will fail the build rather than ship.

---

## The default is NO CHANGE

Autoregulation moves on signal, not noise. If a rule does not clear its full threshold, hold.

**Do-nothing triggers.** A single easy or hard session. A mixed signal — high RIR with grindy bar
speed, or a clean top set with a degraded back-off. Missing data: unknown is unknown, never
negative. An unusual workload week (travel, an extra ride, a short night). The week after a deload,
where loads are restorations rather than progressions.

**Never catch up a missed increment.** A held week is held; the next increment arrives at its next
scheduled point, same size.

---

## Progression — all conditions required

An increment runs only when **every** one of these holds:

- The lift hit all prescribed sets at target-or-easier RIR, **twice** at the current load.
- Bar speed was graded `fast` or `on-target` on both exposures — never `grindy`.
- Technique and range of motion held. For dips that means below 90° at the elbow; for pull-ups a
  full dead hang and collarbone to bar; for squats at or below parallel.
- No relevant symptoms, and the adductor gate is clear.
- The week is not a deload week.

Cadence is fixed by §5.6 and is not accelerated by a good week: OHP 2.5 lb every 2 weeks ·
dip 2.5–5 lb every 2–3 weeks · pull-up 2.5–5 lb every 2–3 weeks · bench 5 lb every 2–3 weeks
**and only while OHP and dips are intact** · squat 5 lb every 3 weeks or hold · deadlift no
progression required.

---

## Regression and the fatigue levels (§5.14)

| Level | Trigger | Response |
|---|---|---|
| 0 — normal | Everything on target | Progress or hold as written |
| 1 — small adjustment | Two sets below the week's RIR floor · one slow session · a minor RIR overshoot | Hold load, remove one low-priority set, extend rest, or delay one progression. **Cut the Monday OHP technical exposure first, every time.** |
| 2 — affected domain | A whole domain declines for a week — e.g. both lower-body sessions down while upper stays normal | Reduce that domain's work sets 25–35% for the week. Leave other domains at full prescription. No new exercises. |
| 3 — true deload | Persistent decline across domains, or a Level 2 that does not resolve | 5–7 days at ~half sets, 10–15% lighter, 4 RIR or easier. Remove faster running and tier 3. Recommend easy or skipped rides without touching their content. |

One poor workout is not a deload. An unscheduled Level 3 does not cancel weeks 6 or 12 unless it
falls within ten days of one.

**Late-set decline without pain is fatigue, not intolerance.** For pull-ups the escalation order is:
longer rest → cluster the last work set (2+2+1, 20 s intra-set) → drop Wednesday's volume sets from
four to three → reduce the back-off load by 5 lb. Frequency is the last thing touched.

---

## Reading the new domains

**Elastic.** Compare logged contacts against target per tier. Under target with `clean` quality is
a completed session — the block is quality-gated, not count-gated. Under target with `degraded` or
`stopped` twice running means hold the tier and do not advance. Over target is a rule breach: the
15% cap applies to the plan, not to enthusiasm.

**Sprint.** Reps completed below prescription with `crisp` quality is correct execution of the stop
rules. `laboured` at any point means the next week repeats rather than advances. Metres are capped
per session and the app shows the ceiling.

**Primer.** `fatiguing` twice running: drop to one round, then drop the press component, then omit
the primer. It never counts as productive volume and is not worth defending.

**Adductor.** Normal twice — post-session and next morning — is what unlocks the next running or
tier step. Mild familiar soreness resolving in 24–48 hours without a movement change means hold and
repeat; it is neither grounds to progress nor grounds to diagnose. Symptoms that increase, persist
past 48 hours, reduce output, or affect stride mean regress one running step and remove tier 3.
Acute sharp pain, bruising, weakness, progressive symptoms, or movement-altering discomfort mean
suspend impact work and recommend clinical evaluation — the only place in this block where that
language belongs.

---

## Change authority (§10)

**Proceed without approval:** a scheduled available increment · a hold · one back-off set added or
removed · small rep changes · longer rest · removing an optional accessory.

**Requires Brian's approval:** replacing a primary lift · changing a primary lift's frequency ·
more than 15% weekly volume change globally or in one family · any deload, taper, or testing week ·
faster running or higher-impact progression · any change to the priority hierarchy · any OHP
rescale after the week-1 calibration single.

**During weeks 1 through 4, present every change for approval.**

Every change states what changed, the supporting observations, confidence, expected outcome, and
the reversal or progression criteria. Completed history is immutable. Each accepted plan is a new
version labelled `v2.0-wN` with a diff against the prior version.

---

## Applying an approved change

`WAVE` in `src/App.jsx` is the single edit point for every load. After editing:

```bash
npm run build && npm test     # invariant guards must pass
node deploy.mjs               # build + test + stage root index.html
```

Then show Brian the diff and wait for an explicit yes before `node deploy.mjs --push`.
