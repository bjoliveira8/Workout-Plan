# Astra Synthesized Concurrent Block — v3.0-syn1

## 0. Status and provenance — read this first

This is the source of truth for the tracker in this repo.

**Where it came from.** A planning session compared two earlier 12-week plans — the Astra
Concurrent Block this repo ran until September 2026, and a second plan — and synthesized
this third one. Everything below section 0 is that session's document, unedited apart from
link paths.

**What is and is not settled.** Brian approved the ten conflict resolutions C01–C10. He has
**not** approved the training plan itself, and its own author does not claim he did: the
session's handoff records that the finished draft "has not been labeled approved". It is
loaded into the tracker because Brian chose to train it, not because it passed a review.

**What the author verified.** All 13 required checks are documented in
[SYNTHESIS_VERIFICATION.md](source/SYNTHESIS_VERIFICATION.md), with the arithmetic printed
in full. Nine pass outright, four pass with an explicitly approved exception, and two carry
an honest **unverified** half — measured time feasibility (check 1) and actual readiness for
impact (check 7), neither of which can be settled on paper. The seven-column comparison
against both source plans is in [SYNTHESIS_COMPARISON_AUDIT.md](source/SYNTHESIS_COMPARISON_AUDIT.md),
the evidence ledger in [SYNTHESIS_EVIDENCE_LEDGER.md](source/SYNTHESIS_EVIDENCE_LEDGER.md).

**What this repo verified independently**, so that the document and the app can never drift:

- All 402 prescribed rows across 48 sessions parse into `src/program.js`, and the weekly
  volume audit re-derives from them exactly — press, vertical, row, ratio and every day count.
- The tracker recomputes that audit at runtime; `test.mjs` asserts it matches for all
  twelve weeks. `tools/gen-block-doc.mjs` additionally re-reads the verification tables
  *in this document* and refuses to publish it if they disagree with the data — including
  re-adding every printed minute sum.
- The block's rails are enforced mechanically, not by reading: week-12 target loads as caps
  at equal or higher reps; twelve fixed-Monday deadlift exposures, ten heavy and two light,
  no max; six high-tier contacts a week, none before week 5; no running in weeks 1 or 12;
  hill through week 8 and flat only from week 9; the 60 m / 120 m per-session ceilings;
  Copenhagen 3×6 per side twice weekly at short lever; the 75-minute cap on all 48 sessions;
  and the six excluded exercises absent from the app and its data. Every one of those guards
  was mutation-tested — the program was deliberately broken twelve ways and each break was
  caught.

That is arithmetic and rule compliance. It is **not** an assessment of whether the training
decisions are correct, and no outcome is predicted by any of it.

**Source data:** `docs/source/SYNTHESIZED_PRESCRIPTIONS.json`, version synthesis_v1_review_draft,
48 sessions, 402 prescribed rows,
sha256 `99a67e94d8c188765758111ba1df01533fe3110ecb1977562cc26a5acddc543e`. Generated into `src/program.js` by `tools/gen-program.mjs`;
this document assembled by `tools/gen-block-doc.mjs` on 21 September 2026.

---


Version: synthesis_v1_review_draft. Prepared September 20, 2026. **Ready for Brian’s review; the finished training plan is not yet approved.** Brian approved all conflict resolutions and completion of this comparison. No dates, workouts, accessory capacities or outcomes are invented.

## 1. Verdict

Use Claude’s Wednesday OHP priority and Sunday dip/bench distribution, ChatGPT’s lower-rep pull-up approach and explicit load/tissue gates, and a smaller impact program that fits the newly supplied time limit. Normal weeks contain **18 compound pressing sets, 9 vertical-pull sets and 6 row sets**, with a **1.20 press-to-pull ratio**. There are two OHP days, two dip days, three pull-up days, and exactly two meaningful lower-body strength days.

The weakest consequential assumption is that the additional **15 minutes on each Wednesday and Friday includes enough usable time after travel**. That is the working interpretation of Brian’s answer, not an additional window he supplied. The fullest Friday block uses about 14½ minutes at the training area. Travel or longer preparation therefore requires the printed cuts. Three to four weekly TrainerRoad hours do not identify ride intensity or establish recoverability. Actual duration, readiness and results remain unverified.

Four success targets: strict OHP **125×2**, weighted dip **+50×6**, neutral-grip pull-up **+45×5**, and standing broad jump **+4 inches** versus the valid week-1 baseline. The three lifting targets require clean prescribed reps with **≥2 RIR, aiming for 2** under approved C08. Easier qualifies. A clean result at less reserve is recorded but does not meet this reserve standard. Jump improvement is desired, not predicted. Bench toward 205×2, squat held/toward 245×2, DL holding clean 450×2, and BW 170±2 remain tracked, non-binding outcomes.

## 2. Assumptions and approved resolutions

Retained athlete facts: 38-year-old male, 6 ft, 170 lb, lean, over ten years of serious lifting, long femurs/shorter torso, FTP 229 W, no supplied current injury or relevant tendon history, little recent impact work, and mild next-day running-associated adductor tightness without altered gait. Available: full commercial gym, safeties, kettlebells to 48 kg, 2.5 lb total microloading, approximately 5% outdoor hill. Standard belt is acceptable; primary lifts do not depend on straps or supportive equipment. Safe running/runout space, machine settings, hardest ride and actual transit time are unknown.

| ID | Approved resolution applied in this draft |
|---|---|
| C01 | Twelve Monday deadlift exposures at seven-day intervals. A thirteenth would require a boundary session outside twelve weekly Mondays. |
| C02 | Ten planned heavy DL exposures and two light exposures in W6/W12. Light deload work is not called heavy work. |
| C03 | W1/W12 three-attempt maximal broad-jump measurement exceptions. All rehearsal/test landings count by tier; normal readiness is still required. |
| C04 | First high-tier introduction and conditional post-deload restoration are explicit exceptions to a literal percentage increase from zero or half-volume. Restore only an actually tolerated dose. |
| C05 | Two actually tolerated runs at a stage before advancing; elapsed weeks or jump tolerance are not substitutes. Holds shorten the ladder. |
| C06 | Copenhagen and any meaningful lower strength stay Monday/Friday. No additional unilateral leg or knee-dominant work on upper days. |
| C07 | Readiness singles followed by one target rep set, with recovery/defer rules. Singles alone cannot demonstrate the rep targets. |
| C08 | Success reserve changes from the brief’s written ≤2 to ≥2 RIR, aiming for 2. |
| C09 | W6/W12 pressing/pulling floors waived for deload/testing. Shoulder and abs remain three days; Copenhagen remains twice weekly. Flexible arm/delt duration is reduced. |
| C10 | The 15-minute cap replaces the original longer impact ladder: normal high contacts are **6/week rather than 20–40**, running is **0–3 reps/session**, no run W1/W12, flat work no earlier than W9, and no planned 85–95% running. Exact doses are below for final review. |

The original requirement and its exception remain distinct. A missed session, unready test, symptom-driven reduction or travel cut does not silently become compliance. Document actual dose and any resulting waiver. The source plans’ assumptions are not personal facts.

## 3. Evidence and practitioner review

Heavy specific practice, useful weekly exposure and adequate rest are defensible. The [2026 ACSM overview](https://pubmed.ncbi.nlm.nih.gov/41843416/) supports those broad principles. Neither it nor general frequency research proves that these exact weighted-dip or pull-up doses are optimal. Two OHP days distribute eight work sets without an extra technical day; three pull-up days distribute nine sets with fewer reps than the supplied fatiguing 4×5 sequence.

Concurrent-training evidence does not make cycling harmless or six hours universally sufficient. Keep Sunday separation and assess actual performance. The two small impact blocks are a time-constrained coaching choice. No retrieved study establishes the exact six-contact dose, 15% progression limit, two-exposure gate, or +4-inch gain. The first three are operational rules; the last is a target. Joel Smith/Just Fly’s individualization and movement-quality guidance informs execution, not a mandatory maximal-sprinting prescription. The evidence ledger records population limits and conflicting findings.

## 4. Evidence ledger

The complete decision-by-decision ledger is in [SYNTHESIS_EVIDENCE_LEDGER.md](source/SYNTHESIS_EVIDENCE_LEDGER.md), with verified finding, source/link, population/applicability, confidence and remaining uncertainty. It covers every research domain requested in the brief, including low-rep RIR, maintenance, undulation, rest, concurrent training, tendon loading, acceleration, Copenhagen and age/power. Unsupported precision has been removed from the prescription.

## 5. Training architecture and combined stress

Conflict hierarchy: tissue tolerance → OHP/dip/pull-up → prescribed TrainerRoad completion → elastic/acceleration quality → heavy conventional specificity → squat/bench → secondary volume. Three priorities are lifts, but only two are presses: pull-up sets never count as pressing. Monday’s lower component is deadlift-centered even though pull-ups receive the first main-lift slot. Wednesday OHP receives a fresh pressing slot away from Sunday’s long ride.

Normal lower demands are Monday 2×2 conventional DL and Friday 3×2 low-bar squat, Copenhagen 3×6/side on each of those days, two impact sessions, and the three prescribed cycling days. Friday’s optional ride is an additional stressor and is omitted by default. The easy primer also adds physical work even when excluded from the strength-family count. No metabolic conversion pretends cycling hours, landings and barbell sets are equivalent.

The normal strength budget totals **273 minutes/week**. Add at most 30 minutes of additional impact/travel and Brian’s 180–240 cycling minutes: **8 h 03 min to 9 h 03 min/week**, before ordinary commute not already included. This is a planning ceiling, not recorded training. No ordinary gym commute or extra impact window is assumed available.

## 6. Locked seven-day schedule

| Day | AM | PM | Time and sequencing |
|---|---|---|---|
| Sunday | Prescribed long ride | Dip → bench → rows and accessories | Strength starts ≥6 h after ride finishes; nominal 65 min. No impact. |
| Monday | — | Pull-up → DL → moderate OHP → adductors/accessories | Nominal 69 min. Fixed DL weekday. |
| Tuesday | Prescribed TrainerRoad | — | Record unusual leg fatigue; no additional impact. |
| Wednesday | — | Impact, then OHP → pull-up → row/accessories | ≤15 min impact including transit, then nominal 70 min strength. |
| Thursday | Prescribed recovery ride | — | Actual fatigue still matters. W12 must remain an easy day. |
| Friday | Impact, then squat → dip → pull-up/accessories | Optional fourth ride only if recovered | ≤15 min impact, then nominal 69 min strength; W12 tests replace normal compounds. Any optional ride occurs later, after all impact/strength; separation alone does not guarantee recovery. |
| Saturday | Rest | Rest | No make-up work. |

A late Sunday ride moves the strength start later to preserve six hours. If that cannot fit, omit/reduce that day and log missed volume; do not compress separation, shorten the prescribed ride to accommodate lifting, or move heavy pressing into another priority’s slot. A missed prescribed ride is not permission for extra jumps or lifting.

## 7. The 48 session cards

Use [SYNTHESIZED_WEEKLY_CARDS.md](source/SYNTHESIZED_WEEKLY_CARDS.md), or the twelve individual files in `docs/source/session_cards/`. Every session includes preparation, primer, actual ramps, exercise order, sets/reps/load, reserve, rest, purpose, cuts and a complete timed sequence. Work-set tables follow the timed block order. All strength preparation and recovery are inside the strength clock; all impact preparation and its transit are inside the extra 15 minutes. No hidden recovery break is added between clocks.

| Week | Sunday | Monday | Wednesday | Friday | Strength sum |
|---|---|---|---|---|---|
| 1 | 65 | 69 | 70 | 69 | 273 |
| 2 | 65 | 69 | 70 | 69 | 273 |
| 3 | 65 | 69 | 70 | 69 | 273 |
| 4 | 65 | 69 | 70 | 69 | 273 |
| 5 | 65 | 69 | 70 | 69 | 273 |
| 6 | 45 | 45 | 44 | 48 | 182 |
| 7 | 65 | 69 | 70 | 69 | 273 |
| 8 | 65 | 69 | 70 | 69 | 273 |
| 9 | 65 | 69 | 70 | 69 | 273 |
| 10 | 65 | 69 | 70 | 69 | 273 |
| 11 | 65 | 69 | 70 | 69 | 273 |
| 12 | 42 | 45 | 29 | 72 | 188 |

The reserve blocks and unused time up to 75 minutes absorb normal station delays or longer rests; they are not permission for more sets. Do not superset shoulder work into priority-lift recovery. Accessories can be paired as written. Priority rests are normally 180 s upper body and 240 s squat/DL. Rest is measured from set end. If more recovery is needed, use reserve or cut lower-priority volume.

## 8. Complete load progression and accessory selection

All primary values below are conditional nominal prescriptions. Pounds; a plus sign means external load. Actual bodyweight plus external load is logged for dips/pull-ups. Full set counts, secondary-day loads and every accessory prescription are repeated on all 48 cards.

| Week | OHP Mon / Wed | Dip Sun / Fri | Pull Mon / Wed / Fri | Bench Sun | Squat Fri | DL Mon |
|---|---|---|---|---|---|---|
| 1 | 3×4@100 / 1×1@120; 4×2@112.5 | 1×2@+45; 3×6@+35 / 3×6@+30 | 4×3@+30 / 3×4@+20 / 2×3@+20 | 3×3@180 | 3×2@225 | 2×2@450 |
| 2 | 3×4@100 / 1×2@115; 4×2@110 | 1×2@+45; 3×6@+35 / 3×6@+30 | 4×3@+30 / 3×4@+20 / 2×3@+20 | 3×3@180 | 3×2@225 | 2×2@450 |
| 3 | 3×4@102.5 / 1×2@117.5; 4×2@112.5 | 1×2@+47.5; 3×6@+37.5 / 3×6@+32.5 | 4×3@+32.5 / 3×4@+22.5 / 2×3@+22.5 | 3×3@185 | 3×2@225 | 2×2@450 |
| 4 | 3×4@102.5 / 1×2@117.5; 4×2@112.5 | 1×2@+47.5; 3×6@+37.5 / 3×6@+32.5 | 4×3@+32.5 / 3×4@+22.5 / 2×3@+22.5 | 3×3@185 | 3×2@230 | 2×2@450 |
| 5 | 3×4@105 / 1×2@120; 4×2@115 | 1×2@+50; 3×6@+40 / 3×6@+35 | 4×3@+35 / 3×4@+25 / 2×3@+25 | 3×3@190 | 3×2@230 | 2×2@450 |
| 6 | 2×3@90 / 2×2@102.5 | 2×5@+15 / 2×5@+10 | 2×3@+5 / 2×3@+0 / 1×3@+0 | 2×3@160 | 2×2@195 | 1×2@390 |
| 7 | 3×3@105 / 1×2@120; 4×2@115 | 1×2@+50; 3×5@+42.5 / 3×5@+37.5 | 4×3@+37.5 / 3×4@+27.5 / 2×3@+27.5 | 3×2@190 | 3×2@230 | 2×2@450 |
| 8 | 3×3@105 / 1×2@120; 4×2@115 | 1×2@+50; 3×6@+42.5 / 3×6@+37.5 | 4×3@+37.5 / 3×4@+27.5 / 2×3@+27.5 | 3×2@190 | 3×2@230 | 2×2@450 |
| 9 | 3×3@107.5 / 1×2@122.5; 4×2@117.5 | 1×2@+52.5; 3×5@+45 / 3×5@+40 | 4×3@+40 / 3×4@+30 / 2×3@+30 | 3×2@195 | 3×2@235 | 2×2@450 |
| 10 | 3×3@107.5 / 1×2@122.5; 4×2@117.5 | 1×2@+52.5; 3×6@+45 / 3×6@+40 | 4×3@+40 / 3×4@+30 / 2×3@+30 | 3×2@195 | 3×2@235 | 2×2@450 |
| 11 | 3×3@110 / 1×2@125; 4×2@120 | 1×2@+55; 3×5@+47.5 / 3×5@+42.5 | 4×3@+42.5 / 3×4@+32.5 / 2×3@+32.5 | 3×2@200 | 3×2@235 | 2×2@450 |
| 12 | 2×3@95 /  / Fri 1×2@125 | 2×3@+25 / 1×6@+50 | 2×3@+10 / 1×3@+0 / 1×5@+45 | 1×2@170 | 1×2@200 | 1×2@390 |

Normal Sunday dips: one heavy double plus three back-offs. Normal Monday pull-ups: four sets. Normal Wednesday OHP: one top set plus four back-offs, with the W1 calibration occupying the top-set position. Wednesday pull-ups are 3×4 at the secondary load; Friday pull-ups are 2×3 there. Monday OHP is 3×4 through W5 and 3×3 W7–11. Friday dips are 3 sets at the listed reps. Sunday bench is 3×3 through W5 and 3×2 W7–11; Friday squat is 3×2. The cards specify all W6/W12 reductions.

Accessory capacities are unknown. The first prescribed set is a light trial at the rep cap; choose a load/ROM giving the stated reserve. One small adjustment is allowed without extra test sets. Record the implement and successful setting. Reuse it while reserve remains appropriate; increase one smallest increment only after two comparable successful exposures, with normal symptoms and no primary-lift cost. Reduce/assist during W6/W12 to maintain ≥4 RIR. Machine stack numbers cannot be transferred between machines.

Rows are chest-supported to avoid another meaningful hip-hinge demand. Arms/delts get a real five-minute paired block in normal weeks, three minutes W6 and W12 Sun/Mon/Wed, and none on W12 test Friday. This is an explicit flexible-floor waiver. Copenhagen stays knee-supported; longer lever is optional only after at least three clean weeks and separate review, not an automatic progression.

## 9. OHP calibration and progression

Recent 115×2 at 1–2 RIR anchors the block. W1 Wednesday ramps to a nominal **120×1 at RPE 7.5–8.5**. The cards give early-stop, lower-load and optional 122.5 contingencies. The optional single replaces a back-off; it does not add a sixth work set. Do not chase a maximum. A single’s subjective reserve does not establish an exact e1RM.

The normal two-rep top-load path is **115 → 117.5 → 120 → 122.5 → 125**, four 2.5 lb advances totaling 10 lb versus the supplied baseline. W6 is light; W7 restores W5’s load; W8 holds. The W1 120 single is diagnostic and is not misrepresented as a completed 120 double. There is no “stall allowance” that guarantees 125 after missed increments. Hold the last successful load and remove future catch-up steps when necessary; the target remains an aspiration.

Strict standard: settled start, locked knees, no knee dip or hip drive, repeatable full finish. Progress only after comparable successful work at target-or-easier reserve, normal/crisp speed and clean tissue response. RIR governs when the table disagrees. Repeated mid-range sticking can justify review of one pin-press variation from the demonstrated region; it is not added now and never replaces the full-ROM primary without approval. A reported 145 calibration requires corroborating load, technique, effort and a subsequent submaximal performance, followed by an approved proportional target/load rescale. No rescale is authorized by this draft.

## 10. Dip, pull-up and bench strategy

Sunday’s dip double provides heavy practice before other pressing. Three controlled back-offs train the eventual six-rep task. Friday’s moderate exposure stays easier. Deep ROM below 90° at the elbow must remain repeatable and comfortable; do not force depth through symptoms. Late-block back-off reps alternate five and six as load changes; lowering reps while raising load controls demand. It is not two simultaneous upward progressions. The W12 rep test is distinct from ordinary training progression.

Pull-ups use the same neutral implement, grip width, controlled full elbow extension at the bottom, and chin clearing the same handle/bar plane without kicking or craning. Monday 4×3 replaces routine fatiguing 4×5. If only the final set fades for two weeks without pain, first keep frequency and rest longer using reserve; then reduce that set from three reps to two, or reduce external load 2.5 lb. A reviewed 2+1 cluster may be used later with every rest counted. Do not label ordinary late-set fatigue tendon intolerance.

System-load examples at BW 170: dip +40→+50 is **210→220 lb**, a 4.76% increase, despite 25% external-load growth. Pull-up +35→+45 is **205→215 lb**, a 4.88% increase. Work-set thresholds use system load, never external load alone. Relative-strength review compares equivalent reps/ROM/reserve and bodyweight; heavier bodyweight does not automatically equal better strength. A sustained ±4 lb departure prompts review of the stability assumption without introducing nutrition programming.

Bench uses a consistent one-second pause and stable setup. Progress only while OHP and dips remain intact. Its final normal prescription is 200×2, deliberately below the non-binding 205 target. It is secondary and is removed before high-priority press work when needed.

## 11. Squat and deadlift

Low-bar squat remains at-or-below-parallel with consistent setup. Three doubles limit overlap between long-femur squatting, DL and cycling. Hold 235 in the later weeks unless actual response supports a future reviewed change; 245 is non-binding. No knee-dominant secondary or extra leg accessory is included.

Conventional DL is Monday every week: **2×2@450** in ten normal weeks; **1×2@390 at ≥4 RIR** in W6/W12. The normal load is anchored to the supplied recent clean doubles, not an assumed universal 90%-of-max relationship. If 450 is too hard after pull-ups or cycling, reduce per the card and log the actual exposure; never insist on a grinder to certify maintenance. No end-block DL or squat maximum. W6/W12 reduce DL sets 50% and load 13.3%; light exposures preserve pattern, not the weekly-heavy requirement.

## 12. Jump progression and complete contact ledger

Low = bilateral low pogos. Moderate = low-hurdle hops or submaximal broad-jump rehearsals. High = maximal standing broad jumps, including measurements. One bilateral landing is one contact; unilateral would be counted per limb. There are no depth jumps or added landing contacts outside this ledger. Walking, controlled marches and ordinary lift preparation remain separately logged activity.

| Week | Wed low/mod/high | Fri low/mod/high | Weekly low/mod/high | All contacts | Friday run | Acceleration + runout = total m | Progression / exception |
|---|---|---|---|---|---|---|---|
| 1 | 40/18/0 | 20/2/3 | 60/20/3 | 83 | None | 0 + 0 = 0 | C03 baseline; no run |
| 2 | 40/18/0 | 20/2/0 | 60/20/0 | 80 | 3×15 m, ~5% hill, 70% perceived | 45 + 45 = 90 | First run stage |
| 3 | 40/18/0 | 20/2/0 | 60/20/0 | 80 | 3×15 m, ~5% hill, 70% perceived | 45 + 45 = 90 | Repeat running stage |
| 4 | 40/18/0 | 20/2/0 | 60/20/0 | 80 | 3×20 m, ~5% hill, 70% perceived | 60 + 60 = 120 | Distance only, if W2/3 tolerated |
| 5 | 40/2/4 | 20/2/2 | 60/4/6 | 70 | 3×20 m, ~5% hill, 70% perceived | 60 + 60 = 120 | C04/C10 high entry; repeat run |
| 6 | 20/0/0 | 10/0/0 | 30/0/0 | 30 | 2×15 m, ~5% hill, 60% perceived | 30 + 30 = 60 | Half low; easy technique |
| 7 | 40/2/4 | 20/2/2 | 60/4/6 | 70 | 3×20 m, ~5% hill, 70% perceived | 60 + 60 = 120 | C04 actual-dose restoration only |
| 8 | 40/2/4 | 20/2/2 | 60/4/6 | 70 | 3×20 m, ~5% hill, 70% perceived | 60 + 60 = 120 | Repeat hill stage |
| 9 | 40/2/4 | 20/2/2 | 60/4/6 | 70 | 3×20 m, flat, 70% perceived | 60 + 60 = 120 | Terrain only, if W7/8 tolerated |
| 10 | 40/2/4 | 20/2/2 | 60/4/6 | 70 | 3×20 m, flat, 70% perceived | 60 + 60 = 120 | Repeat flat |
| 11 | 40/2/4 | 20/2/2 | 60/4/6 | 70 | 3×20 m, flat, 70% perceived | 60 + 60 = 120 | Hold flat; no faster stage |
| 12 | 10/0/0 | 20/2/3 | 30/2/3 | 35 | None | 0 + 0 = 0 | C03/C09 measurement; no run |

W1–4 Wednesday: 4×10 low pogos, 30 s between sets; 3×6 bilateral 5–10 cm low-hurdle hops, 60 s between sets. Friday: 2×10 pogos with 30 s rest, then two submaximal broad rehearsals 60 s apart. W1 replaces running with the three-attempt baseline. Vertical low work precedes horizontal work.

W5 and W7–11 Wednesday: 4×10 pogos, two broad rehearsals, then four maximal singles. Friday: 2×10 pogos, two rehearsals, then two maximal singles before the running block. Rest 90 s after the last rehearsal and between maximal training attempts. Friday’s two attempts receive the freshest lower-body slot. Volume stays at six high training contacts throughout; there is no automatic increase in height, complexity, unilateral demand or speed.

Entry at W5 requires two completed, tolerated lower-tier exposures with normal next mornings, stable landing control and no residual ride/lifting fatigue. A date is not clearance. If unready, repeat the last tolerated lower-tier dose within time, or reduce it. W7 restores at most the actually tolerated W5 dose after readiness checks. If W5 high work never occurred or was not tolerated, W7 cannot “restore” it. After symptoms, begin below the provoking dose and rebuild relevant tolerated exposures; the restoration exception is not symptom clearance.

Raw low-tier W6→W7 change is 30→60, **+100%**, explicitly C04. Moderate and high go from zero to positive: the raw percentage is undefined, not 0%. All other ordinary increases are 0%; W5 is high-tier introduction, W1/W12 are test exceptions. W12 30 low is half normal; its 2 moderate rehearsals and 3 high tests are the C03 exception to low-only deloading. These operational gates do not prove injury safety.

## 13. Running, full rests and the 15-minute clock

Running follows jumps and precedes lifting on Friday only. There is no second running day. Stage path: W2/3 **3×15 m hill at 70% perceived effort**; W4/5 **3×20 m hill at 70%**; W6 **2×15 m hill at 60% technique effort**; W7/8 repeat **3×20 m hill at 70%**; W9–11 **3×20 m flat at 70%** only after the required successful hill exposures. W1/W12 have no run. Every rep has equally long clear easy runout, including uphill; count acceleration and deceleration separately. The maximum is 60 acceleration meters and 120 total running meters per session.

Take **120 s after completing runout before the next acceleration**, with walking return inside that interval. Longer recovery uses time reserve or removes a rep. No treadmill acceleration, sharp stops, extra build-ups or continuous running are added. Perceived effort is a coaching cue, not a measured percentage of maximum speed.

Two runs at the current actual terrain/distance/reps/effort with normal next-day response are required before any advancement. A reduced two-rep session does not establish tolerance for three reps. Deload technique is not a qualifying higher-stage exposure. If a stage is held or skipped, later stages move back or disappear; do not catch up. Terrain is the only planned upward change at flat entry; distance, reps and perceived effort hold. Never advance impact to compensate for a missed ride.

The fullest Friday fits only near a co-located training area: preparation 0:00–3:00; 20 pogos to 3:40; two rehearsals to 4:50; 90 s recovery; first max jump about 6:20–6:30; 90 s recovery; second about 8:00–8:10; gentle squeeze to 9:50; three run/runout efforts with two 120 s recoveries finish about **14:26**. Execution allowances are projections. Any travel/setup or slower recovery cuts the last run first (~2:12 saved), then the final high jump (~1:40), then another run. Never rush warm-up or recovery. If the prepared remaining dose cannot fit, omit it. The original faster ladder is relinquished under C10.

## 14. Adductor prevention and response

Monday and Friday: knee-supported short-lever Copenhagen **3×6/side**, 2 s up/2 s down, 30 s side changes and 45 s after each paired set. Use assistance for 3+ RIR, ≥4 in deload/test weeks. This easy prophylactic dose stays while larger compound volume falls; not every exercise is halved. Do not progress lever merely because three weeks elapsed. Prior to every actual run: comfortable gentle squeeze **3×20 s**, 20 s recovery, approximately 20–30% effort. This is activation, not maximal strength work or medical clearance.

After impact and the next morning record normal/abnormal. If abnormal, note location, severity, onset/duration, effect on stride/gait/squat and response to gentle resisted adduction. Mild familiar soreness resolving in 24–48 h without movement change: hold and repeat, no progression. Increasing/persistent symptoms, reduced output or altered stride: regress/remove faster running and high impact; adjust affected lower work. Acute sharp pain, bruising, weakness, progressive symptoms **or movement-altering discomfort alone**: suspend affected impact and seek clinical evaluation. Do not wait for a second warning sign. Avoid aggressive pre-run static stretching.

## 15. Shoulder protection

Sunday cable external rotation **2×12/side**, Wednesday face pull **2×12**, Friday wall slide **2×10**; use easy controlled loads, roughly 4–5 RIR, after priorities. This meets the supplied exercise/rep options without assuming that near-failure shoulder work is fatigue-free inside pressing rests. These doses survive W6/W12. Pain still overrides any “never-cut” label. Direct lateral raises are separate and do not replace the health dose.

## 16. Cycling placement

Keep the supplied Sunday, Tuesday and Thursday ride calendar. TrainerRoad defines content; this plan prescribes no ride duration, power or intervals. The optional Friday ride stays optional and follows all impact/lifting. If taken every week, treat it as a real fourth ride in the recovery review, not zero-cost background activity. If actual cycling becomes systematically harder, first hold impact progression and reduce secondary lifting; a proposal to move, make easy or skip a ride is permitted when needed, without rewriting its workout.

Do not perform jumps/runs after a hard ride or fatigued lifting. Wednesday’s previous-day ride does not automatically forbid impact, but residual fatigue, altered landing or poor readiness does. Friday’s recovery ride the prior day must actually leave normal readiness. Six hours on Sunday and any separation on Friday are scheduling choices, not clearance tests.

## 17. Autoregulation, deloads, substitutions and change authority

First work set one RIR too hard: OHP/dip/pull-up −2.5 lb; bench/squat −5; DL −10. Two or more too hard: twice that reduction, and remove the final affected back-off if needed. Do not repeatedly grind. Normal/crisp performance at target-or-easier reserve with normal next-day tissue response allows the planned small progression; otherwise hold. A single poor workout does not automatically trigger a deload.

Level 1: isolated poor exposure or ordinary short-lived fatigue—hold progression and remove one affected back-off if needed. Level 2: repeated decline in the same domain or accumulating symptoms—reduce affected-family sets approximately 25–35%, preserve safe frequency and review the cause; do not deload unaffected upper work solely because both lower days declined. Level 3: persistent multi-domain decline, clear recovery deterioration, or substantial symptoms—propose 5–7 easy days at roughly half sets, ≥4 RIR, no fast/high impact; rides may be moved/made easy/skipped as needed. Immediate symptom-based stopping never waits for administrative approval. An unscheduled deload replaces a scheduled one only if within ten days and reviewed; otherwise reassess rather than stack assumptions.

W6 reduces compound press/pull/lower sets from 38 to 22 (**−42.1%**); W12 reduces to 17 (**−55.3%**, tests included). Pressing alone is 18→10→7 in the corresponding weeks. Shoulder/abs and assisted Copenhagen stay; arm/carry/rotation sets fall. Barbell deload loads generally fall approximately 10–15%, with RIR governing. BW exercises use system-load and rep changes, not a pretend 10% reduction in external load alone.

No primary-lift substitution is scheduled. If equipment is unavailable, chest-supported rows may use a chest-supported T-bar, seal or machine version at a newly selected load; shoulder work may use band rotation or prone Y/T; trunk work may use a matched Pallof/chop/ab-wheel option. Primary OHP/dip/pull-up/low-bar/conventional replacement, grip change on the primary pull-up, frequency changes, >15% weekly family/global volume changes, unplanned deload/taper/testing, higher-impact/faster-running progression, hierarchy changes and OHP target rescaling require review. Weeks 1–4 changes are presented for review. The complete draft’s already printed stages/contingencies become authorized only if this plan is accepted; conflict-resolution approval alone is not acceptance of every training prescription.

Record each change, observation, confidence, expected effect and reversal/progression condition. Preserve completed history; create a new version for accepted revisions. Track readiness using performance, symptoms, sleep/recovery report and actual workload, without wearable thresholds or invented scores. A sustained recovery/BW deterioration may warrant an energy-availability review flag, but no nutritional program is supplied.

## 18. Week-12 measurement protocol

Wednesday and Thursday must both be easy, with normal gait/adductor status and no red readiness domain. Friday’s first block repeats the W1 broad-jump protocol: same shoes/surface/start and arm-swing convention, 20 low contacts, two submaximal rehearsals, 2 min recovery, then three maximal attempts with 3 min between. Measure from takeoff line to nearest heel on a stable landing. All attempted landings count even if invalid; no replacement attempts. Use the best valid attempt if all three planned attempts were completed. If baseline or final test is interrupted/unready, mark the comparison unverified; never substitute an invented baseline.

Then start the strength clock, including any transition recovery. OHP ramps → readiness 120×1 → one 125×2 set; five minutes before dip ramps → readiness +45×1 → one +50×6 set; five minutes before pull-up ramps → readiness +40×1 → one +45×5 set. Full within-ramp and pre-target rests are on the card. Readiness must be strict/crisp and roughly RPE ≤7; this is a conservative consideration gate, not a guarantee of the target. Stop a rep set before a grinder or invalid technique. There are no retries.

If earlier testing creates meaningful fatigue, defer the later test and record why. A combined test order cannot prove complete independence between outcomes. Deferred measurements require a reviewed replacement window after recovery; they do not silently move to Saturday or an ungranted extra session. The printed easy fallbacks keep a usable session, but do not turn a deferred test into success. Easy squat, Copenhagen, shoulder and abs follow; bench supplements, extra dip/pull-up sets and direct arms are omitted to protect time and later tests.

## 19. Weekly volume and exposure audit

Work set: prescribed work at ≥80% of that exercise’s day-top load and the prescribed reserve, excluding ramps/primers. Dip/pull-up comparisons use total system load. A calibration or target set is one work set when it meets its prescribed condition; extra readiness ramps remain separately logged preparation. Actual noncompliant sets do not automatically count toward achieved floors.

| Week | Press | Vertical | Rows | Ratio | Lower days | Shoulder / abs | OHP / dip / pull days | Adductor / rotation / carry days | Waiver |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 2 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 3 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 4 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 5 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 6 | 10 | 5 | 4 | 1.111 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | C09 reduced press/pulls and arm duration |
| 7 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 8 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 9 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 10 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 11 | 18 | 9 | 6 | 1.200 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | None in nominal completed week |
| 12 | 7 | 4 | 4 | 0.875 | 2 | 3 / 3 | 2 / 2 / 3 | 2 / 2 / 2 | C09 reduced press/pulls and arm duration |

Normal family derivation: OHP 3 Monday + 5 Wednesday = 8; dips 4 Sunday + 3 Friday = 7; bench 3 Sunday; press total 18. Pull-up 4 Monday + 3 Wednesday + 2 Friday = 9. Rows 3 Sunday + 3 Wednesday = 6. Both lower exposures include Copenhagen; shoulder and abs are Sunday/Wednesday/Friday. Rotation is Monday Pallof plus Wednesday chop; suitcase carry is correctly counted as anti-lateral flexion, not a second rotation exercise. Carries are Sunday/Wednesday. Unilateral work is present on all four days, including the two lower Copenhagen days; the minimum requires only two.

W6/W12 press/vertical/row deficits are explicit C09 waivers. Two lower days, two OHP/dip days, three pull-up/shoulder/abs days and two adductor/rotation/carry days remain. Test-only performance, actual set completion and target reserve remain unverified until observed.

## 20. Cuts and consequences

The original design-time order remains: optional unilateral leg work → secondary incline/landmine → one arm/delt set → one carry set → one row set → secondary bench. The first two are absent. Copenhagen is protected prophylactic work, not the optional leg accessory in that order. Cards show the applicable cuts for each day. Shoulder work is protected to the end, with symptoms overriding all labels.

One normal pull/row set removed: 18/14 = **1.286**, still below 1.3, but a row cut violates the six-row floor and needs a stated waiver. Two pulling sets removed: 18/13 = **1.385**; reduce pressing to at most 16, giving 16/13 = **1.231**. Do not add fatigued pulling to fix a ratio. Because bench is Sunday, anticipated weekly cuts should be planned before it. If an unexpected late-week loss makes a completed week noncompliant, report it honestly and revise the next week; past sets cannot be undone. Never move omitted work to Saturday.

An actual 82-minute session is a failed time constraint. Next session uses the measured overrun to remove lower-priority work before starting; a repeated hard-floor shortfall triggers redesign/review, not a claim that the nominal budget passed. Protect full recovery and stop at 75. No “never-cut” label authorizes extending the clock.

## 21. Verification, comparison and remaining uncertainty

See [SYNTHESIS_VERIFICATION.md](source/SYNTHESIS_VERIFICATION.md) for the independently recalculated 13 checks, all 15 scenarios, exact set/time arithmetic, consistency checks and preserved-source hashes. See [SYNTHESIS_COMPARISON_AUDIT.md](source/SYNTHESIS_COMPARISON_AUDIT.md) for the seven-column comparison, source-plan recalculations and retained/changed/rejected decisions.

Remaining uncertainties are visible: usable transit time; actual ride intensity/recovery; accessory settings; true RIR and e1RM; response to the selected maintenance dose; tissue tolerance; independent validity of later tests; and all four actual outcomes. The reduced impact dose may not produce the desired jump improvement and does not complete the original fast-running ladder. These limits are not solved by calling a calculated schedule measured or a target achieved.
