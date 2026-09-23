# Verification — V3 review draft

**78 pass · 9 pass with an approved exception · 0 fail · 5 unknown** (92 checks). `all_checks_passed` is **false** because real-world items below remain unknown until training is logged. These checks verify the written program, not completed training or achieved outcomes. Every number was recomputed from the exercise rows, not taken from the builder's summaries.

| # | Area | Check | Result | Evidence |
|---|---|---|---|---|
| 1 | Sessions, dates, completeness | Exactly 48 distinct sessions | **pass** | 48 sessions |
| 1 | Sessions, dates, completeness | Every session dated from Sun Sep 27, 2026 with the correct weekday | **pass** | mismatches: none |
| 1 | Sessions, dates, completeness | Week-13 makeup is Saturday Dec 26, 2026 | **pass** | Saturday, not Christmas Day |
| 1 | Sessions, dates, completeness | Every exercise row has dose, load or selection rule, reserve, rest, purpose, unit, side convention and cut label | **pass** | 464 rows; missing: none |
| 1 | Sessions, dates, completeness | Every non-main exercise has a fallback | **pass** | missing: none |
| 1 | Sessions, dates, completeness | Power, arm, calf, leg, adductor, core and carry rows state a progression rule | **pass** | missing: none |
| 2 | Time | Every strength session ≤75:00 including a 5:00 delay reserve | **pass** | longest 73 min; over: none; missing reserve: none |
| 2 | Time | Block arithmetic: components sum, 30-s round-up and session totals all reconcile | **pass** | errors: none |
| 2 | Time | Execution time independently recomputed from sets × top of rep range × tempo × sides | **pass** | mismatches: none |
| 2 | Time | Even if every priority rest runs to 3:00, no session exceeds 75:00 | **pass** | worst case 75 min |
| 2 | Time | Wednesday impact ≤15:00 (hard) | **pass** | longest 14.58 min; over: none |
| 2 | Time | Friday impact within ~30:00 target (soft limit; travel not budgeted) | **approved_exception** | longest 29.82 min [E8] |
| 2 | Time | Impact clocks sum from their events | **pass** | errors: none |
| 3 | Floors and ratio | Week 1 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 1 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 2 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 2 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 3 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 3 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 4 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 4 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 5 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 5 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 6 reduced-volume floors | **approved_exception** | 12/6/5, ratio 1.09 [E1] |
| 3 | Floors and ratio | Week 6 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 7 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 7 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 8 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 8 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 9 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 9 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 10 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 10 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 11 floors (press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3) | **pass** | 20/9/7, ratio 1.25 |
| 3 | Floors and ratio | Week 11 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Week 12 reduced-volume floors | **approved_exception** | 8/3/4, ratio 1.14 [E1] |
| 3 | Floors and ratio | Week 12 stored audit matches recount | **pass** | recounted from rows |
| 3 | Floors and ratio | Work-set definition: every counted set ≥80% of that exercise's top load that day | **pass** | violations: none |
| 4 | Daily requirements | A major (priority) lift every lifting day | **pass** | missing: none |
| 4 | Daily requirements | Exactly one explicit power exercise every day (purpose, standard, progression, fallback), except none on week-12 Friday | **approved_exception** | problems: none [E11] |
| 4 | Daily requirements | A qualifying unilateral strength exercise (≥2 sets) every day | **pass** | missing: none |
| 4 | Daily requirements | Exactly one arm exercise: biceps Sun/Wed, triceps Mon/Fri | **pass** | problems: none |
| 4 | Daily requirements | Direct core every day (carries not counted) | **pass** | missing: none |
| 4 | Daily requirements | At least 2 distinct qualifying accessories every day | **pass** | short: none |
| 4 | Daily requirements | Power picks match the approved choices | **pass** | sunday: ['Medicine-ball chest pass to a wall', 'Plyometric push-up (hands leave the floor)']; monday: ['One-arm kettlebell snatch (if gate met)', 'Two-hand kettlebell swing']; wednesday: ['Rotational medicine-ball scoop throw (to a wall)']; friday: ['Double-kettlebell clean (from the hang)'] |
| 5 | Calves | Calves Monday and Friday: ≥3 sets normal weeks, 2 sets in W6/W12 | **pass** | problems: none |
| 5 | Calves | Calf exercises vary (two variations per day, straight-knee Monday, bent-knee Friday) | **pass** | Monday ['One-leg dumbbell calf raise on a step', 'Standing barbell or Smith calf raise on a plate']; Friday ['Bent-knee calf raise with 3-s stretch pause', 'Seated calf raise'] |
| 6 | Extra leg work | Extra leg exercise Monday (lunge) and Friday (single-leg RDL): ≥2 sets, never cut, free weights | **pass** | problems: none |
| 7 | Carries, rotation, shoulder, wall slides | Every week: ≥2 carry days, ≥3 shoulder-health days, 2 distinct dynamic rotations on ≥2 days, Pallof not counted as rotation | **pass** | failing weeks: none |
| 7 | Carries, rotation, shoulder, wall slides | Wall slides only in warm-ups | **pass** | no wall-slide exercise rows or non-warm-up blocks |
| 8 | Rests and supersets | Rests within the approved ranges (priority 2:00–3:00, squat/DL 2:30–3:00, power 60–90 s, accessories/superset ≥60 s; Pallof 45 s) | **approved_exception** | out of range: none [E7] |
| 8 | Rests and supersets | No superset contains priority/main-lift work | **pass** | problems: none |
| 9 | Exclusions | No excluded exercise in any prescription, fallback or card (Turkish get-up, Bulgarian split squat, bilateral barbell RDL, cable flye) | **pass** | hits: none |
| 9 | Exclusions | Dumbbell and cable rows used only as permitted after the exclusion was lifted | **approved_exception** | one-arm DB rows Sunday/Wednesday; cable row as fallback [E9] |
| 10 | Plyometrics and sprints | Contacts match the approved tier table; ≤15% weekly growth per tier except named entry/restoration | **approved_exception** | problems: none [E3] |
| 10 | Plyometrics and sprints | Sprints: Friday only, ≤250 m, ≤20 m reps with 2:00–3:00 rest, outdoors (hill then flat) | **pass** | problems: none |
| 10 | Plyometrics and sprints | Sprint stages change one variable at a time (reductions allowed) | **pass** | multi-variable steps: none |
| 10 | Plyometrics and sprints | Each sprint stage has two exposures before advancing (C05; week 6 deload excluded) | **pass** | early advances: none |
| 11 | OHP path and tests | Wednesday OHP path matches the approved table (W1 117.5 → W11 127.5; no calibration single) | **pass** | mismatches: none |
| 11 | OHP path and tests | Week-12 tests: OHP 130×2 Wednesday; dip +50×6 then pull-up +45×5 Friday; nothing else tested | **pass** | [(12, 'friday', 'Neutral-grip pull-up target test', 45, '5'), (12, 'friday', 'Weighted dip target test', 50, '6'), (12, 'wednesday', 'Strict OHP target test', 130, '2')] |
| 11 | OHP path and tests | No dip or pull-up work on week-12 Wednesday (easy day for Friday tests) | **approved_exception** | Wednesday holds only the OHP test and easy accessories [E5] |
| 11 | OHP path and tests | Friday tests: dip before pull-up with 10:00 passive rest between | **pass** | Warm-up → Dip test ramps → Dip test → Passive recovery between tests → Pull-up test ramps → Pull-up test → Squat ramps (after tests) → Squat work → Extra leg exercise → Copenhagen + calves (superset) → Triceps + prone Y (superset) → Core: landmine rotation → Delay reserve |
| 11 | OHP path and tests | Week-12 Monday is an easy day (all rows ≥4 RIR or easy power) | **pass** | Two-hand kettlebell swing: RPE about 3 |
| 12 | Deadlift | Deadlift every Monday (12 exposures, 7-day spacing): 10 heavy (450 + 405 back-off), 2 light (390) in W6/W12 | **approved_exception** | heavy weeks [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]; light [6, 12] [E2] |
| 13 | Evidence | Every V3 evidence row is linked or marked UNVERIFIED (preference-only rows labelled as such) | **pass** | 12 rows; problems: none |
| 14 | File agreement | Every JSON row appears on its card in order with identical sets × reps; every card total matches | **pass** | mismatches: none |
| 14 | File agreement | Each standalone week file body is identical to its section in the combined cards | **pass** | differences: none |
| 14 | File agreement | All deliverable files exist (verification file written by this script) | **pass** | 17 files checked |
| 14 | File agreement | Training block has all 21 numbered sections | **pass** | sections 1–21 |
| 14 | File agreement | JSON parses | **pass** | valid JSON |
| 14 | File agreement | Nothing labelled approved | **pass** | ready_for_review |
| 14 | File agreement | Source folder still present and read-only in this build (no writes outside 9.22.26) | **pass** | builders write only to Desktop/Workout Plan 9.22.26 |
| 16 | Fresh slot and sequencing | The fresh first main-lift slot holds the day's priority lift; warm-up then power precede it (week-12 Friday: warm-up only, E11) | **pass** | problems: none |
| 16 | Fresh slot and sequencing | Impact only on Wednesday and Friday, always before that day's lifting | **pass** | impact precedes lifting on every Wed/Fri card |
| 17 | Lower-body days | Meaningful lower-body strength on exactly Monday and Friday | **pass** | upper-day lower work: none; missing: none |
| 18 | System load and 2-set minimum | Dips and pull-ups carry added load with system-load flag | **pass** | problems: none |
| 18 | System load and 2-set minimum | Every one-side exercise has ≥2 sets in every week, and cutting never takes it below 2 | **pass** | problems: none |
| 18 | System load and 2-set minimum | No exercise is done for fewer than 2 total sets (one-set target tests excepted) | **pass** | violations: none |
| 18 | System load and 2-set minimum | Cut rules never leave an exercise at 1 set (keep ≥2, or skip the whole optional exercise) | **pass** | violations: none |
| 19 | Scope | Scope: no ride content, nutrition, wearable rules, app work or tennis in the cards | **pass** | hits: none |
| 20 | Card rules | Every card prints its sequencing checks, cut order and fatigue/change rules | **pass** | missing: none |
| 21 | DB incline bench addition | DB incline bench: Friday only, 2 sets in weeks 1–11, supersetted with the single-leg RDL, absent in week 12 | **pass** | problems: none |
| 21 | DB incline bench addition | Sunday row carries the ratio offset: 4 sets normal weeks, 3 in week 6, 2 in week 12 | **pass** | problems: none |
| 21 | DB incline bench addition | Week-12 test-day cards mention no incline press and use test-day cut/sequencing text | **pass** | test-day variants in use |
| 21 | DB incline bench addition | Training block headline numbers match the data (no stale 18/9/6 or 1.20) | **pass** | Normal weeks are now 20 press / 9 vertical / 7 horizontal work sets (ratio 1.25) |
| 21 | DB incline bench addition | Amendment A2: week-11 Sunday dip back-offs are 3×6 @ +47.5 (even 2.5 lb steps into the test) | **pass** | 3×6 @ +47.5 |
| 21 | DB incline bench addition | Evidence ledger has a row for the DB incline decision | **pass** | row present in section 4 |
| — | Not verifiable on paper | Actual session and impact durations | **unknown** | Projected from arithmetic; real times need logging |
| — | Not verifiable on paper | Equipment and space availability | **unknown** | Medicine balls/wall, landmine, trap bar, 30 cm box, calf stations, sprint strip unverified |
| — | Not verifiable on paper | Recovery and tissue tolerance at near-full starting dose | **unknown** | Needs weeks 1–2 logs |
| — | Not verifiable on paper | Goal outcomes (OHP 130×2, dip +50×6, pull-up +45×5, maintenance, plyo capacity) | **unknown** | Planned, not achieved |
| — | Not verifiable on paper | Kettlebell snatch proficiency by week 7 | **unknown** | Gate decides at the time |

## Approved exceptions used

| ID | Rule | Exception |
|---|---|---|
| E1 | Normal-week press/pull floors | Weeks 6 and 12 use reduced volume (C09). |
| E2 | Heavy deadlift every week | 12 Monday exposures: 10 heavy (top double + back-off) and 2 light at 390 in weeks 6/12 (C01/C02). |
| E3 | ≤15% weekly increase per plyo tier | Named high-tier entry dose of 12 in week 5 and restoration after the week-6 deload (week 7: low 40→70, moderate 0→26, high 0→12), never above the last tolerated dose (C04). |
| E4 | Test standard | OHP success = 130×2 at RPE ≤9 (≥1 RIR) — Brian, Sep 23; dips/pull-ups ≥2 RIR (C07/C08). |
| E5 | Two easy days before each test session | Week-12 Wednesday (OHP test, no dip/pull-up work) counts as an easy day for Friday’s dip and pull-up tests. |
| E6 | Saturday rest | Saturday, Dec 26 week-13 makeup, deferred tests only. |
| E7 | Full priority rest (v3.0) | Brian, Sep 23: priority rests 2:00–3:00, squat/deadlift 2:30–3:00. |
| E8 | Friday impact 15-minute cap (v3.0) | Brian, Sep 23: Friday ~30 min target, not a hard limit; travel not budgeted. Wednesday stays ≤15 min. |
| E9 | Exercise exclusions (v3.0) | Brian, Sep 23: dumbbell row and cable row allowed. |
| E10 | Pull-up work every Wednesday | Week 12 Wednesday has no pull-ups so Friday’s test is fresh; the OHP test is the day’s major lift. |
| E11 | Explicit power every lifting day | Week-12 Friday has no power work and no KB complex: nothing goes in front of the dip and pull-up tests (amendment A3; Brian, Sep 24). |

## Scenario audit

Each scenario has a written response inside the rules. "Pass" means the response is coherent with the plan, not that the outcome is known.

| # | Scenario | Response | Result |
|---|---|---|---|
| 1 | Sunday ride ends 30 minutes late | Start lifting 30 minutes later to keep 6 hours. If the evening is short, cut power sets 3–4 and the 3rd biceps set first; dip work and rows are protected. | pass |
| 2 | Familiar mild adductor soreness, normal gait | Hold the current plyo and sprint stage and repeat it; progress only after it clears within 24–48 h and two normal mornings. | pass |
| 3 | Symptoms worsen or alter stride | Stop the affected impact work and get a clinical evaluation. No second warning sign is needed. | pass |
| 4 | Only the last pull-up set fades for two weeks | Rest up to 3:00 first, then trim the last set's reps or load; keep three weekly exposures; do not call it a tendon problem without symptoms. | pass |
| 5 | Bodyweight +4 lb with a small added-load gain | Compare system load at matched reps, range and RIR; flag the bodyweight drift; do not call it a strength gain from scale weight alone. | pass |
| 6 | Bodyweight −4 lb | Recalculate system load; do not automatically add 4 lb of external load; review recovery if the drift persists. | pass |
| 7 | Both lower days decline while upper work is normal | Hold plyo/sprint and power progression; lighten (not cut) the lunge and single-leg RDL; if it continues, level-2 cut of lower-body sets by 25–35%; review cycling load. | pass |
| 8 | A much higher OHP single is reported (e.g., 140) | Check strict technique and load; do not chase it; any change to the 130×2 target or the load path needs Brian's approval. | pass |
| 9 | A prescribed ride is missed | Log it. No bonus lifting, plyo or sprints. | pass |
| 10 | TrainerRoad block is harder than usual | Hold plyo stage and power loads, drop cut-first sets, and recommend an easier ride if needed — without prescribing ride content. | pass |
| 11 | The optional Friday ride is used every week | Count it as real stress; keep it after lifting; it is the first thing removed if recovery declines. | pass |
| 12 | Movement-altering pain on its own | Suspend the affected work and seek evaluation. | pass |
| 13 | A strength session actually takes 82 minutes | That breaks the 75-minute hard limit. Log where time went; next time apply the cut order (power sets 3–4, 3rd arm set, 3rd calf set…) and use the delay reserve; never shorten priority rests below 2:00. Repeated overruns need a structural change approved by Brian. | pass |
| 14 | Power repeatedly slows the next ramp | Stop power at 2 sets or switch to the printed fallback; log the change; no forced replacement. | pass |
| 15 | Week 5 arrives without high-tier readiness | High contacts stay at zero; repeat the current low/moderate stage; week 7 cannot restore work that was never tolerated. | pass |
| 16 | Wednesday-morning calf soreness is more than mild | Hold calf load and start Wednesday at the lower pogo dose; progress calves only after normal mornings. | pass |
| 17 | Snatch gate not met in week 7 | Keep progressing two-hand swings at 4×5; try the gate again after two crisp swing exposures. | pass |
| 18 | Elbows sore after Friday triceps before Sunday dips | Hold triceps load and drop the 3rd triceps set first; dips are protected. | pass |
| 19 | Week-12 dip test leaves real fatigue | Defer the pull-up test to Saturday, Dec 26 (after an easy Thursday and a rest day); it gets a fresh first slot and is labelled week 13. | pass |
| 20 | OHP test on Dec 16 grinds | Recorded as not achieved; no retry on Dec 26. | pass |
| 21 | Makeup date falls on a holiday | Resolved: Saturday, Dec 26 (Friday Dec 25 is Christmas). | pass |
| 22 | Friday runs short on time in a normal week | Cut power sets 3–4, the 3rd triceps and calf sets, then skip DB incline bench entirely (never one set); the single-leg RDL runs alone. Press drops to 18 and the ratio stays legal. | pass |

## Session times (planned)

| Week | Sun | Mon | Wed | Fri | Wed impact | Fri impact |
|---|---|---|---|---|---|---|
| 1 | 71 | 71 | 69 | 72.5 | 6.7 | 15.9 |
| 2 | 68.5 | 71 | 69 | 72.5 | 6.8 | 16.6 |
| 3 | 68.5 | 71 | 69 | 72.5 | 7.8 | 21.0 |
| 4 | 70.5 | 69 | 69 | 73 | 7.9 | 21.4 |
| 5 | 68 | 69 | 69 | 73 | 11.4 | 28.6 |
| 6 | 47 | 52 | 45.5 | 54 | 4.4 | 11.4 |
| 7 | 70.5 | 72.5 | 69 | 72 | 10.4 | 28.2 |
| 8 | 68.5 | 72.5 | 69 | 72.5 | 13.9 | 25.5 |
| 9 | 68 | 72.5 | 69 | 72 | 14.0 | 25.6 |
| 10 | 70.5 | 70.5 | 69 | 73 | 14.6 | 27.4 |
| 11 | 68 | 70.5 | 69 | 72.5 | 14.6 | 29.8 |
| 12 | 45 | 52 | 42.5 | 69 | 4.4 | 9.2 |
