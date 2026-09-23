# Coverage audit — updated V2 design

**Post-construction closure:** All three construction gaps identified below are closed: exercise-level clocks and all 48 rows are built and independently checked; the [week-13 card](WEEK_13_DEFERRED_TESTS_V2.md) contains exact ramps, rests and all seven strength-test combinations. The 97.7 score below is the historical planning-coverage score, not the program grade. Final [verification](SYNTHESIS_VERIFICATION_V2.md) reports completed artifact checks; actual performance remains unverified.

Applied the `prd-plan-auditor` skill after Brian authorized the review amendments. Source of truth: original attached revision request plus subsequent user changes. **This is a requirements-coverage score, not an exercise-program grade or completed-verification claim.**

Weakest assumption: new exercise proficiency and useful training response are not established. The latest time permissions reduce logistical risk but do not prove recoverability.

## Requirements checklist

| # | Requirement | Status | Evidence or remaining gap |
|---|---|---|---|
| 1 | Read all seven named inputs; treat current workouts as proposed | Covered | Current-routine audit: Read coverage and method; seven source hashes |
| 2 | Preserve athlete facts and original exclusions/scope | Covered | Preserved athlete, goals and calendar; final exclusion scan |
| 3 | Retain the seven-level goal/conflict hierarchy | Covered | Preserved athlete, goals and calendar |
| 4 | Retain OHP 125×2, dip +50×6, pull-up +45×5 at ≥2 RIR | Covered | Preserved athlete, goals and calendar; amended pull-up section |
| 5 | Retain valid best-of-three broad jump target +4 inches | Covered | Preserved goals; amended testing records actual measurement week |
| 6 | Keep bench/squat/DL/BW outcomes tracked but nonbinding | Covered | Preserved athlete, goals and calendar |
| 7 | Preserve lifting weekdays, Sunday six-hour separation and Saturday rest | Covered | Preserved athlete, goals and calendar |
| 8 | Treat 75 minutes as a guideline and permit more Friday strength time | Covered | [ADJUSTED] Time and workload supersedes earlier hard-cap wording |
| 9 | Wednesday impact ≤15 minutes; Friday ≤30 including preparation/travel | Covered | [ADJUSTED] Time and workload, confirmed user clarification |
| 10 | Retain TrainerRoad scope and approximately 3–4 hours as context | Covered | Preserved athlete, goals and calendar |
| 11 | Replace lower-priority work instead of stacking all additions | Covered | Shoulder work, carries and removed exercises; audit substitution table |
| 12 | No direct triceps; at most one arm exercise per session | Covered | Arms: progression works despite weekly variation |
| 13 | Biceps Sunday/Wednesday only, nonconsecutive and distinct implements | Covered | Twelve-week arm/core table; amended arm rules |
| 14 | Arm pair changes weekly; variation repeats at least three weeks later | Covered | Twelve-week arm/core table, independently checked at initial checkpoint |
| 15 | Rep-range arm progression remains functional around W6/W12 | Covered | [ADJUSTED] Arms: 2×8–12; progression against last normal occurrence |
| 16 | Reduce arm sets and effort in W6/W12; count arms separately | Covered | [ADJUSTED] Arms: 1×8 at ≥5 RIR; separate family totals |
| 17 | Explicit qualifying unilateral movement every strength day | Covered | Normal-week structure; one-arm clean/lunge/independent-arm row/single-leg hinge |
| 18 | Keep meaningful lower-body strength Monday/Friday only | Covered | Added leg accessories; separate easy Sunday power stress |
| 19 | Copenhagen remains mandatory and separate from new leg accessories | Covered | Added leg accessories and lower-body stress |
| 20 | Additional deadlift-day knee-dominant accessory | Covered | Monday reverse lunge; low-volume prescription and regression gates |
| 21 | Additional squat-day DB/KB single-leg hinge | Covered | Friday supported single-leg RDL; exclusions retained |
| 22 | Leg accessory sets/reps/reserve/rest/load progression are explicit | Covered | Added leg accessories: 1×6/side at 4 RIR; W6/W12 1×4 at ≥5 |
| 23 | Account for lower accessories, rides, jumps, running and Copenhagen together | Covered | Added leg accessories stress ledger and load-progression restrictions |
| 24 | One explicit daily power exercise with known position in session | Covered | Normal-week structure plus amended Friday jump-as-power rule |
| 25 | Power loading distinguishes skill familiarization from development | Covered | [ADJUSTED] Power: establish control, then suitable progressive load/dose |
| 26 | Power sets/reps, rests, purpose and starting-load approach | Covered | Power prescription table plus new 90–120 s rest rule |
| 27 | Power hold/progression/regression/stop criteria and simpler fallbacks | Covered | Power table and amended development rules; no claim of equivalent ballistic stimulus |
| 28 | Reduce power in W6/W12 and avoid new test-week movements | Covered | Power prescription reduced-week doses and familiar fallback rule |
| 29 | Do not inflate strength work-set totals with easy power | Covered | Power stress classification and final independent accounting |
| 30 | Two distinct dynamic rotational patterns each week | Covered | Wednesday scoop throw/lift; Friday landmine/chop |
| 31 | Medicine-ball explosive rotation when suitable equipment/space exists | Covered | Conditional throw prescription and non-throwing fallback |
| 32 | Pallof explicitly anti-rotation; suitcase carry not dynamic rotation | Covered | Twelve-week arm and core rotation |
| 33 | Twelve-week preferred-core table with measurable repeated exposure | Covered | Twelve explicit rows and three-week core blocks |
| 34 | Direct abdominal work ≥3 days including reduced weeks | Covered | Sunday/Monday/Wednesday trunk prescriptions |
| 35 | Wall slides only warm-up; genuine shoulder work ≥3 days | Covered | Sunday ER, Wednesday face pull, Friday prone Y |
| 36 | Audit all current direct arms/consecutive-day conflicts | Covered | Separate current-routine audit, all 48 session rows |
| 37 | Audit daily power/unilateral gaps without overstating absence of stimulus | Covered | Current-routine audit: power codes and nuanced unilateral classification |
| 38 | Audit warm-up misclassification and missing leg additions | Covered | Current-routine audit: all 12 Friday slides and all 24 leg-addition gaps |
| 39 | Audit rotation/core variety and removals/time consequences | Covered | Current-routine audit: weekly table and substitution table |
| 40 | Normal pressing 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3 | Covered | Normal 18/9/6 and ratio 1.20; unilateral pair counted once |
| 41 | Retain primary lifts, frequency, full rests and progression goals | Covered | Preserved architecture; late-block pull-up changes replace existing first sets |
| 42 | Repair pull-up progression toward target-specific readiness | Covered | [ADJUSTED] W7–11 first-set table, reserve and hold rules |
| 43 | Retain W6/W12 reduced weeks and approved testing/floor exceptions | Covered | Existing C01–C10 retained except explicit new time/test overrides |
| 44 | Retain existing tissue/jump/run gates; more time is not clearance | Covered | [ADJUSTED] Time/workload and power; added leg stress gates |
| 45 | Every revised clock includes execution, ramps, full rests, both sides and transitions | Partial | Construction requirement explicit, but new power rests and 12-rep curls invalidate old minute estimates; final row clocks not yet built |
| 46 | Keep a realistic delay reserve and report projected versus measured time | Covered | Amended time verification and original reserve accounting |
| 47 | Handle swings/DL, post-ride Sunday power, lunges/cycling, Friday hinge/squat overlap | Covered | Added leg stress gates; power regression if ramps or impact deteriorate |
| 48 | Protect priority lifts; cuts cannot silently claim all requirements passed | Covered | Cut hierarchy and explicit missed requirement/waiver rules |
| 49 | Retain baseline evidence; focused research for consequential additions | Covered | Focused evidence update and linked baseline ledger |
| 50 | Distinguish research, preference and coaching judgment; no guaranteed outcomes | Covered | Focused evidence update and A-grade criteria |
| 51 | Handle unknown proficiency and equipment with practical fallbacks | Covered | Assumption paragraph and power/core alternatives |
| 52 | Create five named V2 files and twelve standalone cards without overwriting originals | Covered | Completion and approval boundary; output in active workspace |
| 53 | Include all 21 original deliverable categories | Covered | Completion and approval boundary enumerates all categories |
| 54 | Complete revised 48 sessions with all exercise fields and numeric week prescriptions | Partial | Explicit construction step exists; exact completed rows have not been built under amended power/arm/time rules |
| 55 | Combined and standalone cards agree exactly | Covered | Completion and approval boundary; independent content comparison required |
| 56 | Changelog includes removal/addition/reason/volume/fatigue/time/floor effects | Covered | Original request governs change log; audit substitution table supplies starting mapping |
| 57 | Independently check all 20 requested revision requirements from exercise rows | Covered | Completion and approval boundary; updated time criterion supersedes old hard-cap check |
| 58 | Rerun original 13 checks and 15 scenarios affected by changes | Covered | Proposed work sequence step 5; new time and deferred-test cases must be incorporated |
| 59 | Use pass / approved exception / fail / unverified statuses honestly | Covered | Completion and approval boundary; actual physiology and execution unverified |
| 60 | Explicit scheduled slot for deferred testing, potentially week 13 | Covered | [ADJUSTED] reserve Friday W13, preceding Wed/Thu easy, only deferred measurements |
| 61 | Exact executable week-13 contingency ramps/rests/clock | Partial | Slot, order, readiness and no-retry rules defined; detailed contingency card remains to be written |
| 62 | Do not mislabel W13 outcomes as achieved W12 targets | Covered | [ADJUSTED] Testing and week-13 contingency |
| 63 | Do not add week-13 contingency to the required 48-session count | Covered | [ADJUSTED] Testing: separate assessment, no extra DL exposure |
| 64 | Run prd-plan-auditor after approval and before 48-session construction | Covered | This skill-based coverage audit; original session files unedited |
| 65 | Use Boyle/Pavel/Dan John/Norton as principles without incompatible program stacking | Covered | Review response: purposeful accessories, coherent loading/rest, simplicity, measurable progression |
| 66 | Define what improves program quality beyond formal checklist compliance | Covered | [ADJUSTED] seven A-grade criteria with real execution feedback |

## Coverage score: 97.7/100

63 Covered, 3 Partial, 0 Missing across 66 requirement groups. The proposal now explicitly covers the new time allowances, deferred testing, power development, arm progression and pull-up readiness. Remaining partials concern detailed construction and execution-level clocks, which have not yet been regenerated.

## Top gaps and required fixes

1. **Rebuild the clocks after increasing power rests and allowing 12-rep curls.** The old times cannot be carried forward as verified; count every rep, side change, retrieval, ramp, transition and reserve under the new soft strength guideline and 15/30-minute impact limits.
2. **Create all 48 actual V2 session rows.** The amended proposal is concrete enough to guide construction, but a design document is not a completed routine; encode conditional choices without implying that every nominal load was achieved.
3. **Write the week-13 contingency card.** Include lift-specific ramps, full recovery, deferred-only testing, readiness gates, actual-week labels and its exclusion from the 48-session count.

## Patched plan

The patched plan is [V2_REVISION_PROPOSAL.md](V2_REVISION_PROPOSAL.md). Its `[ADJUSTED] Latest user decisions and A-grade design requirements` section supersedes older conflicting text and contains the authorized amendments. Unchanged sections retain the original structure. Friday impact is now explicitly authorized up to 30 minutes including travel/preparation; Wednesday remains 15. No automatic contact, speed or running-volume increase was inferred.

## Construction verification additions

- Replace the outdated hard 75-minute pass/fail test with reported strength projections and a soft-guideline comparison; retain separate hard 15-minute Wednesday and 30-minute Friday impact checks.
- Check arm progression against each variation's last normal exposure; do not treat deload appearances as failed progression or erase the previous record.
- Count late-block Monday pull-ups as four work sets despite the longer first set; recalculate system-load thresholds, rest and execution.
- Count Friday jump power once in the impact ledger, with no redundant KB work on the designated maximal-jump days.
- Test the new scenario: a deferred week-12 pull-up target is attempted fresh on Friday W13 only after readiness conditions; record the actual week and do not invent an achieved week-12 outcome.
- Keep existing biological uncertainty explicit. Passing a row audit does not establish safety, adaptation or an A+ personal fit.
