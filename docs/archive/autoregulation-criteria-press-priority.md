# Autoregulation Criteria — Press-Priority Hybrid (the "brain")

This is the decision lens the AI coach applies every week. It sits **inside** the
program's existing rails (`docs/12-week-press-priority-program.md` §9) and adds one new
capability the athlete approved: **warranted mid-cycle main-lift increases.**

Grounded in: Tuchscherer/RTS RPE→%1RM tables, Helms RIR-RPE research, Prilepin's chart,
velocity-based training, APRE, and the Graves & Baechle 2-for-2 rule. Sources at bottom.

---

## The RIR → %1RM spine (the conversion the rules use)

| RIR | RPE | ~ % of 1RM lost per RIR of headroom |
|---|---|---|
| 2 (floor) | 8 | — |
| 3 | 7 | ~2.5–3% |
| 4 | 6 | ~5% |
| 5 | 5 | ~7% |

**Key constant:** ~1 RIR ≈ ~2.5–3% of 1RM. This converts "it came in at RIR 4 instead
of RIR 2" into pounds.

Anchor 1RMs: Bench 215 · OHP 128 · Squat 282 · Deadlift 515.

---

## Hard rails (checked FIRST, override everything)

- **Squat ≤ 225 lb** (absolute, all 12 weeks).
- **Doubles cap:** bench ≤ 91% (~195) · OHP ≤ 90% (~115).
- **RIR ≥ 2 floor** on every working set. No grinding, no failure.
- **Deload weeks 4 & 8** are obeyed literally — no autoregulation up or down.
- **Protected weeks 3/7/10/11** — no upward changes.
- Within 1 lb of a cap → weight is frozen; route progress to reps, then sets.

---

## The default is NO CHANGE

Autoregulation moves on **signal, not noise.** If a rule does not clear its *full*
threshold, hold. Specific do-nothing triggers:

1. **Single-session overshoot → no change.** One easy week never moves a main lift.
2. **Mixed signal → no change.** High RIR but slow/grindy bar, or first set easy and last
   set at the floor → hold. Fast bar speed is a *required* co-signal for any main-lift bump.
3. **Sport-fatigue flag → no upward change** on the affected pattern (tennis/cycling → legs).
4. **+1 RIR only → no change.** One RIR is inside the error band of RIR estimation. The
   trigger is **+2 or more.**
5. When rules conflict, the more conservative action wins; "hold" beats "increase."

---

## Main lifts — the mid-cycle WEIGHT increase (the earned part)

A main-lift weight increase requires **ALL FOUR**:

| Condition | Threshold |
|---|---|
| Overshoot | actual RIR ≥ prescribed **+2** (prescribed RIR-2 came in at **RIR 4+**) |
| Consistency | held on **every** working set, not just the first |
| Bar speed | tag = **fast** (no grindy reps anywhere in the session) |
| Repetition | met on **2 consecutive exposures** of that lift (2-for-2 rule) |

**Magnitude (claw back only a slice, land near RIR 3 — never the RIR-2 floor):**
- **Bench / OHP:** +2.5 lb default (+5 only if RIR 5+ and fast on *both* exposures).
- **Squat / Deadlift:** +5 lb default (+10 only if RIR 5+ and fast on *both* exposures).

**Nudge vs. re-baseline:**
- **Nudge (default):** apply the increment to the next exposure of that lift in the block.
- **Re-baseline (rare):** if the same lift overshoots on 2+ consecutive exposures with a
  uniformly fast trend, the tested 1RM is stale — raise the e1RM by one increment and
  re-derive the block's remaining wave loads. **Never** off a single session.
- **Squat exception:** at the 225 cap, do not add weight — use reps, then sets.

## Main lifts — REPS lever (only when weight is capped)

- At/within one increment of a cap **and** the increase trigger fires → **add 1 rep per set**
  before any weight, staying inside **Prilepin's optimal volume** for the zone
  (76–85%: 2–4 reps/set, 10–20 total · 86%+: 1–2 reps/set, 4–10 total).

## Main lifts — SETS lever (last resort)

- Only if at the squat cap, consistently overshooting, and reps already at the Prilepin
  ceiling → **+1 working set**, max +1 per lift per block, never in protected/deload weeks.

## Main lifts — downward rules (unchanged, override all upward logic)

- Two consecutive slow reps → **end the set**.
- Grindy double → next set **−5 lb**.
- Set arrives at **<2 RIR** → **−5 lb**, finish. Twice in a week → **next week = deload**.
- Tennis-wrecked-legs flag → **no upward move** on squat/DL.

---

## Accessories (dips, pull-ups, incline DB, KB press) — lower bar

- Every set holds **RIR 3+** across a full session → **+2.5–5 lb next week**
  (2.5 upper/small, 5 lower/large).
- APRE bracket on the top set: ≥3 reps over target → +5–10 (large)/+5 (small);
  1–2 over → +2.5–5; on target → hold; under / any set <RIR 1 → −5 to −10.
- Run in a rep range (double progression): add reps to top of range, then add load and reset.

---

## The coaching panel (run every proposed change past all five)

If **any** voice vetoes → drop to the safer action (increase → hold; re-baseline → nudge).

| Coach | Forcing question | Veto |
|---|---|---|
| **Pavel Tsatsouline** | "Did the bar stay fast and well short of a grind?" | any increase leaving the set at RIR 2 or slower bar speed |
| **Dan John** | "Real trend, or one good day?" | re-baselining off a single session |
| **Yuri Verkhoshansky** | "Is total high-intensity dosing still in the envelope?" | volume past Prilepin's optimal total for the zone |
| **Hatfield / Tuchscherer** | "What did the *bar speed* say vs. the load?" | any increase where the bar was slow/grindy, even if reported RIR was high |
| **2-for-2 rule (Graves & Baechle)** | "Has the overshoot repeated across two exposures?" | any main-lift weight increase not yet cleared by the 2-exposure test |

*(McGill and Boyle intentionally excluded from this panel per athlete decision, 2026-07-05.)*

---

## Worked examples

1. **Bench 5×5 @ RIR2, all sets RIR 4–5, fast — exposure #1.** Trigger conditions met
   *except* repetition → **NO change; flag "watch bench, pending 2nd exposure."** If next
   bench session repeats → **+2.5 lb** (+5 if both were RIR 5+ and fast).
2. **Squat easy at capped 225, 2nd exposure, fast, no leg flag.** Weight blocked by cap →
   **add 1 rep/set** inside Prilepin (e.g. 4×4 → 4×5), still RIR ≥2.
3. **Deadlift easy but leg/back fatigue flag present.** Do-nothing rule #3 fires →
   **NO change**, re-evaluate on a clean exposure.
4. **Accessory 3×10, all RIR 3+, top set ~13 reps two weeks running.** APRE bracket →
   **+2.5–5 lb**, reset to 3×8.

---

## Weakest assumption (surfaced by design)

The framework trusts self-reported RIR. RIR is **least accurate in the "felt easy" zone
(RIR 4–5)** — exactly the zone that triggers increases. That is *why* every main-lift
increase also requires the **fast bar-speed tag + a 2-session repeat**: bar speed is the
objective referee that catches an over-optimistic RIR call. A phone bar-speed tool would
convert the fast/slow tag into a hard number and tighten this considerably.

---

## Sources

- Tuchscherer / RTS RPE→%1RM & e1RM autoregulation (reactivetrainingsystems.com).
- Helms, novel RIR-based RPE scale (PubMed 26049792; NSCA SCJ 2016).
- Prilepin's chart (powerliftingtechnique.com; powerathletehq.com).
- Velocity-based training / velocity-loss thresholds (sportsmith.co; PMC12360324).
- APRE — Bryan Mann (evolutionsportspt.com; PubMed 20543732).
- 2-for-2 rule — Graves & Baechle, *Essentials of Strength & Conditioning*.
- Pavel Tsatsouline (grease-the-groove, submaximal, bar speed); Dan John (little & often).
