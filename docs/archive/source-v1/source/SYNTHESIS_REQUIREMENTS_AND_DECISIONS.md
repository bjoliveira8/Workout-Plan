# Requirements and decisions — review checkpoint 1

Prepared September 20, 2026. Status: Brian approved all conflict resolutions and directed completion of the full task. C01–C09 are approved; C10 applies the approved 15-minute constraint with the exact reduced dose to be visible in the final review. Approval of these resolutions does not mean the finished training plan has been approved.

## Verdict and weakest assumption

The brief cannot be satisfied literally in full. Several requirements contradict one another, and the newly supplied 15-minute allowance for additional impact work rules out the longer running prescriptions in both source plans.

Brian supplied **3–4 TrainerRoad hours per week** and **15 extra minutes** in response to a question about work before Wednesday and Friday lifting, including travel. Working interpretation: 15 extra minutes on each of those two days. This interpretation is visible rather than an invented additional training window. No third impact window is assumed.

The weakest consequential remaining assumption is that those 15 minutes are usable for preparation, jumping and running after any travel/setup, and that the hardest ride does not leave persistent fatigue before them. Weekly cycling hours alone do not establish intensity or recovery. If travel consumes much of the allowance or actual fatigue is greater, the impact prescription must shrink or be omitted; neither higher jump contacts nor a faster running stage can be guaranteed. The locked 75-minute strength cap remains separate and includes all strength preparation through the final strength exercise.

No completed training, accessory capacity, test result or accepted source-plan assumption is inferred.

## Input identity and completeness

| Input | Internal identity | Attribution evidence and limit | Read status |
|---|---|---|---|
| Original coaching brief | “Astra Coaching Prompt — 12-Week Concurrent Training Block”; version 2.0; 656 lines | States written for GPT-6 Astra, which identifies the intended recipient, not its author. Brian identifies it as his original brief. | Complete, including appendices |
| Claude-attributed plan | “12-Week Concurrent Training Block — v2.0-w1”; built against Astra Coaching Prompt v2.0; Mode A; 1,060 lines | Brian's attribution and Claude workspace provenance agree. No author signature or generation transcript inside the document independently authenticates model authorship. | Complete |
| ChatGPT-attributed plan | “12-week concurrent training block”; v2.0-w1; prepared September 20, 2026; 346 lines | Brian's attribution and Codex project provenance agree. The document does not independently authenticate its generating model. | Complete |
| Combined and standalone gym cards | Combined 48 sessions; 12 standalone week files, four sessions each | Every complete standalone week body occurs exactly in the combined file. The standalone wrappers contain only titles and local links. | Complete content inspected; repeated identical lines were deduplicated without omitting differing content |
| `prescriptions.json` | Version v2.0-w1; BW assumption 170; 48 sessions; 12 weekly audits; 12 running records | It states the original specification is not fully satisfiable and that reconciled numerical checks passed. Those are claims for independent audit. | All fields read or matched to read card content; 399 exercise rows checked |
| `VERIFICATION.md` | 13 reported checks, 48 session budgets, concluding consistency statement | Verification claims are reference data, not proof. | Complete |

The 399 JSON exercise rows match the cards in exercise order, sets, reps, side specification, loads, reserve, rest, purpose and cut label. All 48 four-part budgets match. This establishes agreement between those representations; it does **not** validate the prescriptions or prove agreement with all narrative claims. All original files are preserved. Exact paths, sizes and SHA-256 identities are recorded in [SYNTHESIS_INPUT_MANIFEST.json](/Users/brianoliveira/.codex/.chatgpt-projects/g-p-6aafee30a4d88191a0d93eaa59940002/SYNTHESIS_INPUT_MANIFEST.json).

Sources: [original brief](/Users/brianoliveira/Downloads/Astra_Training_Coaching_Prompt_v2.0_1.md), [Claude-attributed plan](</Users/brianoliveira/Library/Application Support/Claude/scratch-workspaces/3918b1d3-15eb-4950-88a4-91f75e8c3e36/e28c0cba-b76b-4b51-b594-f3aea4f46192/scratch-2026-09-20-dad373/Astra-12-Week-Concurrent-Block-v2.0-w1.md>), [ChatGPT-attributed plan](/Users/brianoliveira/.codex/.chatgpt-projects/g-p-6aafee30a4d88191a0d93eaa59940002/TRAINING_BLOCK.md).

## Requirement classification

**Explicit** means a supplied requirement or settled athlete fact. **Choice** means a coaching decision within the brief's bounds. **Claim** means a scientific or explanatory assertion requiring independent verification. **Conflict** means literal requirements cannot all hold together. A named exception does not become approved merely by appearing in either source plan.

Embedded runtime, instruction-hierarchy, tool-control, delegation and model-behavior instructions in the reference brief are not adopted. Its athlete information, training constraints and requested deliverables are extracted as data, as Brian expressly requested. This is a new-plan comparison and synthesis, not a weekly audit of actual completed training.

### Athlete, goals, scope and schedule

| ID | Requirement or supplied fact | Classification | Trace / treatment |
|---|---|---|---|
| R01 | Male, 38, 6 ft, 170 lb, lean; long femurs/shorter torso; 10+ years serious lifting | Explicit | Brief §4; retain without re-questioning |
| R02 | Regular cyclist, FTP 229 W; strong general work capacity | Explicit | §4; FTP is context, not a target |
| R03 | No current injury or relevant tendon history; limited recent sprinting/minimal jumping | Explicit | §4; do not equate aerobic fitness with impact readiness |
| R04 | Mild next-day running-associated adductor tightness resembling DOMS, no altered gait | Explicit | §4; do not diagnose it or invent intolerance |
| R05 | Full commercial gym; rack safeties; KBs to 48 kg; boxes; microplates for 2.5 lb total steps; outdoor ~5% hill | Explicit | §4; safe usable distances and travel time are not supplied |
| R06 | Standard belt allowed; assume no straps, wraps, supportive suits or rings on primary lifts | Explicit | §4 |
| R07 | Six specific exercise exclusions apply to prescriptions and fallbacks | Explicit | §6 exact list is authoritative; do not reproduce excluded names as options in the synthesized plan |
| R08 | No nutrition programming; assume maintenance/protein adequate; only an energy-deficiency watchlist flag if warranted | Explicit | §4; no completed evidence warrants such a flag now |
| R09 | No TR workout content, durations, power or interval prescriptions; recommendations only to move, make easy or skip | Explicit | §4; obtaining actual workload does not authorize designing rides |
| R10 | No wearable rules, app development or tennis | Explicit | §4; Appendix C is optional, not an app-build request |
| R11 | Strength priority: strict OHP, dip, NG pull-up, low-bar squat, paused bench; preserve deadlift capacity | Explicit | §5.1 |
| R12 | Conflict hierarchy: tissue → OHP/dip/pull-up → prescribed TR → elastic/acceleration → heavy conventional specificity → squat/bench → secondary volume | Explicit | §5.1; governs tradeoffs, rather than averaging source plans |
| R13 | Relative strength outranks hypertrophy; do not require weight gain | Explicit | §5.1 |
| R14 | Success: OHP 115×2 baseline → 125×2; dip +40×6 → +50×6; pull-up +35×5 → +45×5 | Explicit + conflict | §5.5; all three written “≤2 RIR”; reserve interpretation needs C08 below |
| R15 | Success: best-of-three standing broad jump, same footwear/surface, +4 in from week-1 baseline to week 12 | Explicit + choice/conflict | §5.5 permits standard override; baseline timing conflicts with tier gate; gain is a target, never a forecast |
| R16 | Bench toward 205×2, squat held/toward 245×2, DL clean 450×2, BW 170±2 are tracked/non-binding | Explicit | §5.5; do not add structural success criteria |
| R17 | 12 weeks, four strength days: Sunday PM, Monday PM, Wednesday PM, Friday AM | Explicit | §4 |
| R18 | Sunday long ride AM, Tuesday TR AM, Thursday recovery ride AM; optional Friday fourth | Explicit | §4; no extra rides or intensity assumptions |
| R19 | Sunday strength starts ≥6 h after actual ride completion; Saturday rest | Explicit | §4; a late ride does not silently waive separation |
| R20 | Strength ≤75 min from its warm-up through final strength work | Explicit | §4/§5.2; count ramps, transitions, execution, full rests and unilateral work |
| R21 | Elastic/running outside strength clock, counted in total stress | Explicit | §4; Brian now limits additional work to 15 min per Wed/Fri under the stated interpretation |
| R22 | TR 3–4 h/week; additional work allowance 15 min | Explicit new user information | Brian's reply during this review; supersedes source assumptions of 4–6 h and longer impact windows |

### Volume, accounting and execution

| ID | Requirement or supplied fact | Classification | Trace / treatment |
|---|---|---|---|
| R23 | Compound press 16–20 sets/week; vertical pull 8–12; horizontal pull ≥6 | Explicit | §5.3; hard floors met or explicitly waived with reason; keep stated bands visible |
| R24 | Compound press / (vertical + horizontal pull) ≤1.3 | Explicit | §5.3; shoulder/curl work cannot inflate denominator; recalculate after cuts |
| R25 | Exactly two lower strength days: one squat-centered, one deadlift-centered | Explicit + conflict | §5.3 and Appendix A; all meaningful loaded lower work counts, including Copenhagen |
| R26 | Shoulder-health work on ≥3 strength days; direct abs on ≥3 days | Explicit | §5.3; do not infer abs compliance from any carry automatically |
| R27 | Flexible: ≥2 unilateral strength exposures with ≥1 lower, ≥2 rotation/anti-rotation, ≥2 carries | Explicit flexible floor | §5.3; avoid mislabeling bilateral squeeze or pure anti-lateral flexion as unilateral/anti-rotation |
| R28 | Flexible: 5–10 min direct arms/delts per strength day | Explicit flexible floor | §5.3; one small set is not automatically five minutes |
| R29 | Work set ≥80% of that exercise's top load that day, at prescribed RIR; exclude ramps/primers | Explicit accounting rule | Appendix A; diagnostic/test work and excluded preparatory stress reported distinctly |
| R30 | Dips/pull-ups tracked as external **and** bodyweight+external load | Explicit | §5.7 and Appendix A; clarify system load for work-set thresholds |
| R31 | Three/four rides + all jump contacts + all run meters form part of lower stress | Explicit | §5.3; separate ledgers, no unsupported universal stress conversion |
| R32 | Card fields: objective, exact drills/doses/reasons, primer or omission, ramps, order, sets/reps/load/RIR/rest, purpose, minutes, cut label | Explicit | §5.2/§5.12/Mode A; all 48 sessions usable independently |
| R33 | Default 14+40+16+5 minute allocation; actual sum ≤75 | Choice within hard cap | §5.2 calls allocation default; recalculate, do not merely assign plausible labels |
| R34 | Reconcile time: accessory antagonist supersets → clusters → lowest-priority sets → shorten priority rests last | Explicit | §5.2; paired work still consumes time and may affect performance |
| R35 | Cut order: optional unilateral lower → secondary incline/landmine → direct arm/delt set → carry set → row set → bench | Explicit | §5.2; protect priority lifts except affected lift/joint; account for mandatory Copenhagen separately |
| R36 | Every item labeled never-cut/cut-second/cut-first; shoulder work last cut; cap/symptoms still govern | Explicit | §5.2/§5.11; differentiate time cuts from symptom stopping |

### Anchors, progression and lift standards

| ID | Requirement or supplied fact | Classification | Trace / treatment |
|---|---|---|---|
| R37 | Fresh supplied anchors: OHP 5×2@115 (1–2 RIR), dip +40×6 (~1), pull-up +35×5 (~1) | Explicit | §5.4; provisional e1RMs 128–130, +85, +72; not demonstrated maxima |
| R38 | Bench 5×2@195 (2+); squat 5×2@235 (2–3); DL 2×2@450 (2–3) | Explicit | §5.4; provisional 220/265/~500 |
| R39 | Secondary data: bench ~4×5@175; squat 5×3@225 and 5×4@215; DL 3×3@420; pull-up 4×5@+35 last set grindy from fatigue | Explicit | §5.4; fatigue attribution supplied; do not invent tendon/grip failure |
| R40 | Low-rep anchors primary, target RIR cross-check; RIR controls in-session adjustment | Explicit | §5.4; exact estimator and claim of universal bias independently audited |
| R41 | Week 1 normal training plus strict OHP single RPE 7.5–8.5; work selected from its information | Explicit | §5.4; bound attempts/time and immediate downward corrections |
| R42 | Material upward OHP calibration leads to proportional prescription/target rescale proposed for approval | Explicit | §5.4; single/e1RM conversion is uncertain; no automatic assumption of proven new max |
| R43 | OHP +2.5 every 2 wk; dip/pull-up +2.5–5 every 2–3 wk; bench +5 every 2–3 wk if priorities intact; squat +5 every 3 wk or hold; no required DL increase | Explicit | §5.6; print actual conditional loads, including holds and deloads |
| R44 | Progress after comparable successful exposures, expected/easier reserve, technique/speed/tissue okay; one variable at a time; never catch up | Explicit | §5.6/Mode B; a test target does not prove successful progression |
| R45 | OHP 2–3 weekly exposures; third ≤3 sets/12 min at ≥4 RIR, first fatigue cut | Explicit/choice within band | §5.7; count actual days, not narrative claims |
| R46 | Strict OHP: locked knees, no hip/knee assistance/rebound, settled start/repeatable finish; full ROM central | Explicit | §5.7 |
| R47 | Mid-range pin press only after repeated sticking evidence; at most one variation; no triceps-overload rationale for that sticking region | Explicit + claim | §5.7; exact diagnosis from anatomy alone is not verified |
| R48 | Dip before significant pressing fatigue, below-90° elbow ROM, controlled lockout; heavy outcome clean single/double with reserve | Explicit | §5.7; test-specific six-rep target is separate from heavy-practice format |
| R49 | Pull-up 2–3 weekly exposures when recovered; standardize handles/grip/bottom/top; treat isolated late-set decline as fatigue | Explicit | §5.7; longer rests/rep/cluster/load/redistribution before frequency reduction |
| R50 | Bench pause/setup consistent, subordinate to OHP/dips; low-bar squat consistent at/below parallel, low volume | Explicit | §5.7; secondary knee-dominant work optional, no extra strength day |
| R51 | DL fixed weekday every 7 days, clean singles/doubles RPE 7–8, no max test, specific conventional practice | Explicit + conflict | §5.7; 13 total and heavy deload prescriptions require C01/C02 |
| R52 | Most compounds 2–3 RIR, selected heavy ≥1, avoid failures/grinders; low-cost isolation may reach 0–1 | Explicit/choice | §5.12; “may” does not require near-failure accessories |

### Impact, tissue, fatigue and changes

| ID | Requirement or supplied fact | Classification | Trace / treatment |
|---|---|---|---|
| R53 | Low tier initially 60–80 weekly; moderate 20–30; high zero until week 5 then 20–40 | Explicit + conflicts | §5.8; exact taxonomy/dose are imposed rules, not validated safety thresholds |
| R54 | ≤15% weekly increase per tier, one stress variable at a time, two tolerated exposures with normal next morning | Explicit + conflicts | §5.8; introduction/restoration need special handling; test contacts still physical stress |
| R55 | Bilateral before unilateral, low before high amplitude/intensity, vertical before horizontal | Explicit | §5.8; adding complexity while volume rises is two changes |
| R56 | 2–3 jump sessions on strength days before lifting, Friday highest quality; none after hard ride/fatigued lifting | Explicit | §5.8; calendar placement is not proof of recovery |
| R57 | Weeks 6 and 12 low tier only, ~half volume | Explicit + conflict | §5.8/§5.13; week-12 maximal tests conflict |
| R58 | Running for acceleration, hill ~5% first, outdoors rather than treadmill; continuous running <2 mi | Explicit + claim | §5.9; no continuous running is needed; reduced injury-risk claim requires research |
| R59 | Original ladder: W1–3 hill 4→6×15; W4–5 6×20–25; W6 3×15; W7 4×20 flat +4×20 hill; W8 5×25; W9 5×30; W10 6×30; W11 5×30+2×40; W12 2×30 | Explicit + conflicts | §5.9; conflicts with two-exposure gate and new time allowance |
| R60 | Run rest 2–3 min ≤20 m, 3–4 min at 25–40 m; quality ceiling 250 m/session | Explicit | §5.9; count all acceleration meters and separately easy deceleration distance |
| R61 | Run frequency one weekly through W6, at most two thereafter | Explicit | §5.9; no automatic extra session or assumed available time |
| R62 | Copenhagen twice weekly, knee-supported short lever initially 3×6–8/side; long lever only after ≥3 wk clean tolerance | Explicit | §5.10; permission after tolerance is not an obligation to advance lever |
| R63 | Pre-run squeeze 3×20 s; both adductor items hard floors | Explicit | §5.10; squeeze counts physically but is not anatomically unilateral |
| R64 | Post-impact and next-morning normal/abnormal check; abnormal location/severity/onset/duration/gait/stride/squat/gentle adduction response | Explicit | §5.10 |
| R65 | Progress only after two tolerated exposures; mild familiar 24–48 h soreness without movement change means hold | Explicit | §5.10; two jump sessions do not certify two running exposures |
| R66 | Worsening/persistent/output-limiting/stride symptoms regress/remove faster work; acute sharp pain/bruising/weakness/progressive/movement-altering symptoms suspend affected work and trigger evaluation | Explicit | §5.10; no additional warning sign required for movement alteration |
| R67 | Avoid aggressive static adductor stretching immediately before fast running | Explicit | §5.10 |
| R68 | Shoulder work ≥3 days: two sets ER/rear delts 12–15 or upward rotation 10–12; low load; protected | Explicit | §5.11; pairing during rests is permitted, not compulsory; 0–1 RIR permitted, not required |
| R69 | Primer: ≤4 min, 3 rounds on 60 s clock of 2 cleans/1 strict press/2 front squats with two 8–12 kg bells, RPE≤4/≥6 RIR; single-bell fallback | Explicit with response options | §5.12; reduced/press-free on OHP days; omit when fatiguing; exclude from productive work-set/lower-day totals but retain physical stress |
| R70 | Primer response readying/neutral/fatiguing judged against comparable ramp | Explicit | §5.12; do not invent logged response |
| R71 | W1 calibration, W2–5 accumulation, W6 deload, W7–11 intensification, W12 deload/tests | Explicit | §5.13 |
| R72 | Deload ~half sets, 10–15% lighter as needed, ≥4 RIR; no hard running, low jumps; technique-only supplements W12 | Explicit + conflict | §5.13; meaningful reductions computed for full workload, not external dip plates alone |
| R73 | W12 order broad jump→OHP→dip→pull-up; no red domain, normal adductor, ≥2 easy days before testing; no grinders, no novel supplements or squat/DL max | Explicit + conflict | §5.13; literal “test singles” cannot demonstrate target rep sets; later-test fatigue must be evaluated |
| R74 | Fatigue L0 hold/progress; L1 small adjustment; L2 affected sets −25–35%; L3 5–7 d half-volume ≥4 RIR/easier loading/no fast impact | Explicit | §5.14; one bad session is not global deload |
| R75 | Unscheduled deload cancels scheduled one only if within 10 days; easy/skip ride recommendations allowed for higher-priority need | Explicit | §5.14; disclose changed calendar |
| R76 | Substitutions only for identified problem, within listed permitted families and exclusions | Explicit | §5.15; no novelty-driven changes |
| R77 | All future changes W1–4 for approval; later structural changes, >15% volume, new deload/test, faster/higher impact, hierarchy and OHP rescale require approval | Explicit requested coaching policy | §10; current documents do not prove any of these were approved |
| R78 | Small holds/load/set/rest/optional-accessory choices within bounds otherwise allowed; immediate symptom stopping takes precedence | Explicit | §10 interpreted with tissue priority; no approval wait to stop provoking work |
| R79 | Weekly reviews require actual data; preserve history, distinguish observation/hypothesis, max five main findings, 2–4 comparable exposures and versioned changes | Explicit future use | Mode B; not falsely performed during this comparison |

## Conflicts and approved minimum resolutions

The resolutions below were **explicitly approved by Brian**: “Yes i approve all conflict resolutions. Continue and complete the prompt to completion.” Mathematical corrections are distinguished from discretionary training exceptions. Final verification will name any approved exception; unresolved conflicts cannot be hidden within an all-pass claim.

| ID | Requirements in conflict | Proposed minimum resolution | Approval / effect |
|---|---|---|---|
| C01 | §5.7: one fixed-day DL exposure every 7 days, **13** in a **12-week** block | Correct total to **12**, one each week; do not invent a pre-block completed session. | Explicit correction requested. Maintaining 13 would require an extra/out-of-block exposure. |
| C02 | Heavy DL RPE 7–8 every week versus W6/W12 technique work ≥4 RIR | Keep weekly conventional movement but use **10 heavy + 2 lighter technique exposures**; no max test. | Approval for heavy-intensity exception in deloads. Precise loads follow audit/research. |
| C03 | W1 maximal broad-jump baseline and W12 maximal retest versus high tier zero before W5 / low-only W12 | Allow **three measured maximal attempts** in W1 and W12 only when the tissue gate permits; report them as high-tier physical contacts. Count every graded rehearsal in its actual tier too. If deferred, mark baseline/change unmeasured. | Approval for explicit test exceptions. Calling a test “measurement” does not remove its tissue load. |
| C04 | A positive high-tier dose cannot be introduced from zero using multiplication by ≤1.15; return after zero/half deload also breaches raw weekly percentage | Exempt the **first named entry dose** and **conditional restoration no higher than the most recent successfully tolerated dose**; retain raw week-to-week arithmetic in the report. Re-entry after symptoms is not automatic restoration. | Approval for entry/restoration exceptions. This does not establish the dose as scientifically safe. The precise dose is constrained by C10. |
| C05 | Weekly run ladder advances despite one weekly session and two tolerated exposures required before advancing; some steps change several variables | Require **two completed tolerated running exposures at the current stage** before advancing. Repeat stages and change one main variable; remove any promise of reaching the late fast stages. | Approval to change the calendar ladder; retain original tissue gate and time limit. |
| C06 | Exactly two lower strength days versus assigning unilateral lower strength to upper days; Appendix A counts any such session | Keep all Copenhagen and any meaningful lower accessories on the **existing squat and DL days**; omit optional extra lower work when it does not fit. | Interpretation/correction proposed; no additional strength exposure. Primer exception remains only the brief's explicitly easy preparation. |
| C07 | Single testing versus the actual double/six-rep/five-rep goals | Readiness singles may precede **one target rep set** for each lift; no maximum-single test. Preserve stated order, adequate recovery and later-test fatigue/defer rules. | Approval for explicit test-format clarification; a clean single cannot prove the rep outcome. |
| C08 | “≤2 RIR” would reject an easier 3-RIR completion, although progression otherwise accepts target-or-easier RIR | Define success as prescribed load/reps with standard technique and **at least 2 RIR**, aiming around 2; easier qualifies. Record a harder clean completion separately, without forcing extra attempts. | Approval required: this changes the written inequality. Neither source can decide Brian's meaning by assumption. |
| C09 | Weekly work floors versus W6/W12 half-volume; global >15% change threshold versus scheduled deload/restoration | Explicitly waive affected set floors in W6/W12 and disclose reductions/restoration; retain health/abs/exposures where feasible without padding tests. | Brief already allows reasoned floor waivers; include them in baseline review, do not represent as normal-floor compliance. |
| C10 | Brian's 15-minute impact allowance versus required jump/run doses and full recoveries | Keep **15 minutes as the hard additional-work limit**. Build a shorter impact prescription with full rests and counted preparation; any reduced tier-entry dose or omitted ladder stage must be itemized for approval in the completed plan. No unapproved extra day/window. | New user constraint controls. Exact dose is not chosen at this requirements stage; the original full impact prescription cannot be retained. |

### Time conflict that is already provable

The original week-11 ladder has seven efforts of 30–40 m. Its six between-repetition rests at the minimum three minutes total **18 minutes**, before running execution, preparation, squeeze activation, jumps, setup or travel. It cannot fit 15 minutes.

The ChatGPT source's six-effort stages prescribe three-minute rests: five between-repetition rests consume **15 minutes**, before any other work. Its 10 high jump singles on Friday alone require nine 90-second rests = **13.5 minutes**, before warm-up, jump execution or running. Those components cannot be combined inside the new allowance.

These are lower bounds from the written prescriptions, not measured session durations or new prescriptions. A shorter planned dose is required; reducing rest silently is not an acceptable accounting fix.

### Clarifications that do not require changing the calendar

“Hard floor” means the normal-week bands and exposures remain requirements, with stated waivers where permitted. A delayed progression is a legitimate conditional result, not a reason to catch up. Deloads do not establish that a previously prescribed dose was actually tolerated. Bodyweight-based load accounting must not turn a change in scale weight into a claimed strength gain. A bilateral squeeze can satisfy its prophylactic requirement while the two actual Copenhagen sessions satisfy unilateral exposure; the squeeze need not be relabeled unilateral.

## Scientific claims to test independently

These are review questions, not accepted findings or coaching conclusions. They will be checked against current retrieved research before synthesis.

| Claim or decision | Origin | What the evidence audit must establish |
|---|---|---|
| Heavy low-rep RIR is systematically inaccurate in one direction | Brief §5.4; Claude §3 | Separate low performed reps from low reps-to-failure; quantify uncertainty without assuming a universal correction |
| Epley over-predicts particular high-skill/high-load lifts | Brief §5.4 | Verify exercise/population/formula-specific evidence; provisional anchor ≠ precise true maximum |
| Cycling creates little/no meaningful interference, or six hours guarantees recovery through AMPK timing | Claude §3/§16; brief separation constraint | Distinguish molecular mechanisms, acute fatigue, maximal-strength outcomes and explosive outcomes; use current synthesis |
| High pressing floors optimize this athlete's strength | Brief §5.3; both dose choices | Test volume/frequency evidence and specificity; do not turn general resistance evidence into weighted-dip/pull-up optima |
| Minimal deadlift dose guarantees maintenance | Both plans | Relevant trained/powerlifting maintenance evidence versus individualized trial |
| Particular contact thresholds/15% changes establish safety or optimal adaptation | Brief §5.8; source plans | Distinguish imposed counting rules, practitioner guidance, association and controlled evidence |
| A hill substantially reduces hamstring/adductor injury exposure | Brief §5.9; Claude §3 | Mechanics and lower velocity do not alone prove injury prevention for this athlete |
| Twelve weeks is a minimum useful tendon-adaptation period | Claude §3/ledger | Verify duration moderators and measured change; avoid unsupported lower-bound certainty |
| Copenhagen dose here reproduces demonstrated injury prevention | Both plans | Population, exercise/dose schedule and endpoint applicability |
| Deload every six weeks is established optimal practice | Both plans | Separate coach consensus/survey frequency from controlled benefit |
| Age-related power decline justifies an exact dose at 38 | Both plans | Applicability of older-adult/masters data and recent impact history |
| Particular rest/cluster/undulating schemes maximize strength within these sessions | Both plans | Verify strength-specific endpoints and execution costs |

All required research domains remain on the research checklist: maximal strength, frequency, low-rep RIR/RPE, heavy practice, undulation, minimum dose, maintenance, cycling interference, same-day order and recovery interval, contact progression, tendon adaptation, acceleration/hills, Copenhagen, age/power and rest intervals. Joel Smith/Just Fly and other relevant practitioner material will be labeled separately. Source-link availability alone is not evidentiary support.

## Supporting-file reconciliation queue for step 2

The following are documentary discrepancies, identified after the complete read; performance/evidence verdicts await recalculation.

| Plan | Locations | Discrepancy requiring resolution |
|---|---|---|
| Claude | Executive/ledger vs actual weekly cards | Says three OHP exposures in accumulation and two in intensification; the actual named OHP work is Monday and Wednesday in normal weeks. Primer pressing is explicitly excluded from productive work. |
| Claude | §8 master table vs week-12 narrative/§18 | Master table places dip and pull-up tests under Sunday/Monday lift columns; week-12 narrative and test protocol place all tests Wednesday. Use the detailed test protocol for physical-stress analysis and flag the contradictory table. |
| Claude | §12/§21 weekly tier ledger vs §18 test warm-up | W12 ledger has 45 low contacts with zero Wednesday; test protocol adds 20 low Wednesday contacts, plus rehearsal/test landings. Recount everything physically performed. |
| Claude | Executive/ledger/stress summary vs numeric contact table | Some prose cites 173 weekly contacts; the numeric week-10 table totals 170 before testing discrepancies. |
| Claude | §9 narrative/progression vs actual calibration | “110×3 equivalent” is not a programmed week-1 top set; work is the calibration plus 3×3@105. Do not invent demonstrated 110×3 or claim one missed increment still guarantees 125×2. |
| ChatGPT | JSON vs all cards vs combined cards | All 399 item rows and 48 budgets match; complete week bodies match. Still audit the formulas, ramps, cut consequences and timing independently. |
| ChatGPT | §12 taxonomy vs brief §5.8 | Source classifies submaximal 12-inch box jumps as moderate; brief lists submaximal box jumps landing tall as low. Contact ledgers need both original-taxonomy and actual-exercise accounting. |
| Both | Written time totals vs actual operations | Block sums alone cannot verify execution, full rests, unilateral time, ramps and transitions. Test-day and Friday timing are priority calculations. |
| Both | Asserted exception handling vs approval record | Neither file establishes Brian approved its exception list. At the initial checkpoint only the work plan was approved; Brian subsequently approved all C01–C10 resolutions and directed completion. |

## Required output and verification map

All 21 Mode A categories will be included in the final synthesized plan, with complete weekly cards in a separate file. Categories 7 and 8 together must provide 48 executable sessions rather than four examples plus vague later increments.

| Mode A category | Required final artifact content |
|---|---|
| 1 | Executive findings with verdict and weakest consequential assumption |
| 2 | Assumption register and approved/pending conflict resolutions |
| 3 | Evidence and practitioner review |
| 4 | Evidence ledger: decision, verified finding, source/link, population/applicability, confidence, uncertainty |
| 5 | Training architecture and combined weekly stress |
| 6 | Locked seven-day AM/PM schedule and total time expectations |
| 7 | Four session identities plus all 48 fully specified weekly cards |
| 8 | All 12 weeks of actual conditional primary loads and accessory selection |
| 9 | OHP calibration and progression |
| 10 | Dip, pull-up and bench strategies |
| 11 | Low-bar squat and conventional DL strategy |
| 12 | Complete weekly jump contacts by tier, including tests/rehearsals |
| 13 | Running reps, distances, rests, gates and hold/regression rules |
| 14 | Prophylactic and reactive adductor rules |
| 15 | Shoulder-health placement |
| 16 | Cycling placement within permitted scope |
| 17 | Autoregulation, fatigue, deload, substitution and approval rules |
| 18 | Week-12 tests, validity criteria, order and fatigue/defer handling |
| 19 | Every week's movement-family audit, ratio and exposures |
| 20 | Each session's cut hierarchy and consequences |
| 21 | Independent 13-check results and scenario audit |

Final checks: **1** complete time arithmetic; **2** all floors or approved/reasoned exceptions; **3** ratio; **4** exactly two lower days and fixed seven-day DL cadence; **5** fresh pressing slot; **6** exclusions including fallbacks; **7** impact sequencing; **8** conditional progression arithmetic and target distinction; **9** run ceiling; **10** contacts/tier progression with raw and exception arithmetic; **11** citation verification and uncertainty; **12** scope; **13** completeness and agreement across all new files.

Each final result must be **pass**, **pass with an explicit approved exception**, **fail**, or **unverified**. Planned timing can pass an arithmetic/design check while measured duration remains unverified. Achieved performance and recoverability remain unverified until actually observed.

Scenario audit cases to run: late Sunday ride and OHP priority; mild next-day adductor tightness; worsening/stride-altering symptoms; final-set-only pull-up decline for two weeks; BW +4 with small external-load gain; BW −4; lower-only strength decline; 145 lb OHP calibration; skipped prescribed ride; systematically harder TR block; habitual optional Friday ride; movement-altering pain alone; an 82-minute session; repeatedly fatiguing primer; tier 3 not tolerated at week 5. Report failures/unresolved conflicts and fix correctable failures before final delivery.

Final separate files planned: `SYNTHESIS_COMPARISON_AUDIT.md`, `SYNTHESIZED_TRAINING_BLOCK.md`, `SYNTHESIZED_WEEKLY_CARDS.md`, and `SYNTHESIS_VERIFICATION.md`. A source change log will identify retained, changed and rejected elements; a supporting evidence ledger and exact prescription data may be saved separately if useful. No original input will be overwritten.

## Checkpoint decision

The requirements checkpoint is complete. Brian approved C01–C10 and completion. The final comparison, evidence ledger, synthesized plan, all 48 cards and verification report now supersede the earlier research/reconciliation queues; exact training doses are presented for final review, not labeled accepted.


## Approval update

Brian approved all conflict resolutions and requested completion without further intermediate approval stops. Continue all authorized audit, research, synthesis and verification. Actual performance, recoverability and measured session duration remain unknown. The completed plan will be presented for review.
