# Current-routine audit against prompt v3.0 — Phase 1

**Status:** Phase 1 audit. Nothing has been revised. No session files were written. Prepared September 23, 2026.

## What was audited

The **current routine** is the September 21 V2 draft in `Desktop/Workout Plan 9.20.26/`. It is the newest complete 48-session plan, and v3.0 reverses several of its choices (for example, "no direct triceps" and a cut-first leg accessory). V2 was never labelled approved. The earlier V1 synthesis and the two original plans are history, not the routine being audited.

### Inputs read

| Input | What it contributed | Status |
|---|---|---|
| `SYNTHESIZED_PRESCRIPTIONS_V2.json` (48 sessions, 397 exercise rows, 24 impact sessions, weekly audit, week-13 contingency) | Every exercise, dose, flag and timed block audited below | Read in full by script |
| `V2_REVISION_PROPOSAL.md`, `SYNTHESIS_CHANGELOG_V2.md`, `START_HERE_V2.md` | Brian's September 21 approvals: 75 min became a guideline, Friday impact 30 min, no triceps, week-13 contingency, power and pull-up changes | Read |
| `SYNTHESIS_VERIFICATION_V2.md` | V2 self-check: 5,072 written checks passed under the September 21 rules | Read (headline results) |
| `SYNTHESIZED_TRAINING_BLOCK_V2.md` | Section outline, volume audit, evidence ledger rows | Outline and key sections read |
| `Workout Plan/SYNTHESIS_REQUIREMENTS_AND_DECISIONS.md` | Approved conflict resolutions C01–C10 (September 20) | Read in full |
| `Workout Plan/SYNTHESIZED_PRESCRIPTIONS.json` (V1) | The 15-minute-Friday impact design that v3.0 returns to | Impact section read |
| `Workout Plan/SYNTHESIS_EVIDENCE_LEDGER.md` | 22 decisions, 24 unique source links, 2 marked unverified | Checked for real sources |
| Build/verify scripts in `v2_work/` | Reusable for Phase 2 | Outline read |

**Prompt gap:** the pasted v3.0 prompt was cut off inside §17 (after the "Scope" row of the verification table), and §3 is missing. No full copy exists on disk. Anything in those missing parts is unknown.

**Mapping check:** V2 uses Monday = conventional deadlift and Friday = low-bar squat. This matches v3.0. No scheduling discrepancy.

## Findings — observed problems only

| # | Problem against v3.0 | Sessions affected |
|---|---|---|
| 1 | No direct triceps on Monday/Friday (V2 removed it by design) | 24 of 48 |
| 2 | No calf raises on Monday/Friday | 24 of 48 |
| 3 | The extra leg exercise (reverse lunge / single-leg RDL) is labelled "cut first"; v3.0 makes it required | 24 of 48 |
| 4 | Sunday has no qualifying unilateral strength exercise. The one-arm clean is a power drill and cable external rotation is shoulder-health work; neither qualifies | 12 of 48 (every Sunday) |
| 5 | Week-12 Friday strength session projects to 94 minutes; v3.0 makes 75 a hard maximum | 1 of 48 |
| 6 | Friday impact exceeds a 15-minute cap before any travel (16.0 min in weeks 5, 7–11); weeks 1/12 leave 0.6 min for travel | 8 of 12 Fridays |
| 7 | Wednesday impact in weeks 5, 7–11 leaves 1.1 min for travel (fits only if jumps happen at the gym) | 6 of 12 Wednesdays (conditional) |

**Already compliant in V2:** a major lift every day; explicit power every day; one direct arm exercise on Sunday/Wednesday (biceps, never mixed); direct core on all four days (Pallof is correctly treated as anti-rotation core, not dynamic rotation); two distinct dynamic rotations weekly (Wednesday scoop throw, Friday landmine rotation); two carries weekly; three genuine shoulder-health days; wall slides only in warm-ups; meaningful lower-body work only on Monday/Friday; Copenhagen twice weekly; no excluded exercise anywhere in prescriptions or fallbacks; normal weeks at 18 press / 9 vertical / 6 horizontal sets (ratio 1.20).

**Nothing was removed to create time in V2 that v3.0 would object to**, except the triceps (finding 1).

## All 48 sessions

"Qualifying unilateral" excludes power drills and shoulder-health work. "# accessories" counts distinct goal-supporting accessories (rows, shoulder health, arms, extra leg work, Copenhagen); major lifts, power, core and carries are excluded. Minutes are V2's projections, not measured times.

| Session | Min | Major lifts | Power | Qualifying unilateral | Arms | Calves | Core | Carry | Dyn. rotation | Shoulder health | # accessories | Extra leg | v3.0 gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 Sun | 68.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Ab wheel | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W1 Mon | 72.5 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W1 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Hanging leg raise | suitcase | MB scoop throw | face pull | 3 | — | none |
| W1 Fri | 68.5 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W2 Sun | 67.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Ab wheel | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W2 Mon | 72.5 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W2 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Hanging leg raise | suitcase | MB scoop throw | face pull | 3 | — | none |
| W2 Fri | 73.5 | dip/pull-up/squat | 2-KB clean | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W3 Sun | 67.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Ab wheel | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W3 Mon | 72.5 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W3 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Hanging leg raise | suitcase | MB scoop throw | face pull | 3 | — | none |
| W3 Fri | 73.5 | dip/pull-up/squat | 2-KB clean | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W4 Sun | 68.0 | bench/dip | 1-arm KB clean | **none** | biceps | — | Hollow-body hold | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W4 Mon | 72.5 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W4 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Body saw | suitcase | MB scoop throw | face pull | 3 | — | none |
| W4 Fri | 73.5 | dip/pull-up/squat | 2-KB clean | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W5 Sun | 67.0 | bench/dip | 1-arm KB clean | **none** | biceps | — | Hollow-body hold | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W5 Mon | 72.5 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W5 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Body saw | suitcase | MB scoop throw | face pull | 3 | — | none |
| W5 Fri | 68.5 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W6 Sun | 44.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Hollow-body hold | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W6 Mon | 50.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×4/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W6 Wed | 46.0 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Body saw | suitcase | MB scoop throw | face pull | 3 | — | none |
| W6 Fri | 52.5 | dip/pull-up/squat | 2-KB clean | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×4/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W7 Sun | 68.0 | bench/dip | 1-arm KB clean | **none** | biceps | — | Ab wheel | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W7 Mon | 73.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W7 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Hanging leg raise | suitcase | MB scoop throw | face pull | 3 | — | none |
| W7 Fri | 68.0 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W8 Sun | 67.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Ab wheel | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W8 Mon | 73.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W8 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Hanging leg raise | suitcase | MB scoop throw | face pull | 3 | — | none |
| W8 Fri | 68.5 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W9 Sun | 67.0 | bench/dip | 1-arm KB clean | **none** | biceps | — | Ab wheel | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W9 Mon | 73.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W9 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Hanging leg raise | suitcase | MB scoop throw | face pull | 3 | — | none |
| W9 Fri | 68.0 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W10 Sun | 68.0 | bench/dip | 1-arm KB clean | **none** | biceps | — | Hollow-body hold | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W10 Mon | 73.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W10 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Body saw | suitcase | MB scoop throw | face pull | 3 | — | none |
| W10 Fri | 68.5 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W11 Sun | 66.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Hollow-body hold | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W11 Mon | 73.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W11 Wed | 71.5 | OHP/pull-up | MB scoop throw | 1-arm machine row | biceps | — | Body saw | suitcase | MB scoop throw | face pull | 3 | — | none |
| W11 Fri | 68.0 | dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×6/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W12 Sun | 41.5 | bench/dip | 1-arm KB clean | **none** | biceps | — | Hollow-body hold | farmer | — | cable ER | 3 | — | no qualifying unilateral strength exercise |
| W12 Mon | 50.0 | OHP/deadlift/pull-up | KB swing | reverse lunge, Copenhagen | — | — | Pallof | — | — | — | 2 | reverse lunge 1×4/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required) |
| W12 Wed | 32.0 | pull-up | MB scoop throw | 1-arm machine row | biceps | — | Body saw | suitcase | MB scoop throw | face pull | 3 | — | none |
| W12 Fri | 94.0 | OHP/dip/pull-up/squat | Broad jump (impact clock) | SL RDL, Copenhagen | — | — | landmine rotation | — | landmine rotation | prone Y | 3 | SL RDL 1×4/side | needs triceps; no calf raise; extra leg exercise labelled cut-first (now required); 94.0 min > 75 hard cap |

## Wednesday/Friday impact sessions under a 15-minute cap

"Work + prep" is V2's own itemised arithmetic (preparation, contacts, rests, running and transitions), excluding travel. Travel time to the jump/running area has never been supplied.

| Week | Day | Work + prep (min) | Old cap | Minutes left for travel under a 15-min cap | Low/Mod/High contacts | Running | v3.0 status |
|---|---|---|---|---|---|---|---|
| 1 | Wed | 9.0 | 15 | 6.0 | 40/18/0 | — | fits if travel ≤6.0 min |
| 1 | Fri | 14.4 | 30 | 0.6 | 20/2/3 | — | fits only if travel <0.6 min |
| 2 | Wed | 9.0 | 15 | 6.0 | 40/18/0 | — | fits if travel ≤6.0 min |
| 2 | Fri | 12.7 | 30 | 2.3 | 20/2/0 | 3×15 m ~5% hill | fits if travel ≤2.3 min |
| 3 | Wed | 9.0 | 15 | 6.0 | 40/18/0 | — | fits if travel ≤6.0 min |
| 3 | Fri | 12.7 | 30 | 2.3 | 20/2/0 | 3×15 m ~5% hill | fits if travel ≤2.3 min |
| 4 | Wed | 9.0 | 15 | 6.0 | 40/18/0 | — | fits if travel ≤6.0 min |
| 4 | Fri | 12.7 | 30 | 2.3 | 20/2/0 | 3×20 m ~5% hill | fits if travel ≤2.3 min |
| 5 | Wed | 13.9 | 15 | 1.1 | 40/2/4 | — | fits only if travel <1.1 min |
| 5 | Fri | 16.0 | 30 | 0.0 | 20/2/2 | 3×20 m ~5% hill | **fail** (over before any travel) |
| 6 | Wed | 4.6 | 15 | 10.4 | 20/0/0 | — | fits if travel ≤10.4 min |
| 6 | Fri | 8.5 | 30 | 6.5 | 10/0/0 | 2×15 m ~5% hill | fits if travel ≤6.5 min |
| 7 | Wed | 13.9 | 15 | 1.1 | 40/2/4 | — | fits only if travel <1.1 min |
| 7 | Fri | 16.0 | 30 | 0.0 | 20/2/2 | 3×20 m ~5% hill | **fail** (over before any travel) |
| 8 | Wed | 13.9 | 15 | 1.1 | 40/2/4 | — | fits only if travel <1.1 min |
| 8 | Fri | 16.0 | 30 | 0.0 | 20/2/2 | 3×20 m ~5% hill | **fail** (over before any travel) |
| 9 | Wed | 13.9 | 15 | 1.1 | 40/2/4 | — | fits only if travel <1.1 min |
| 9 | Fri | 16.0 | 30 | 0.0 | 20/2/2 | 3×20 m flat | **fail** (over before any travel) |
| 10 | Wed | 13.9 | 15 | 1.1 | 40/2/4 | — | fits only if travel <1.1 min |
| 10 | Fri | 16.0 | 30 | 0.0 | 20/2/2 | 3×20 m flat | **fail** (over before any travel) |
| 11 | Wed | 13.9 | 15 | 1.1 | 40/2/4 | — | fits only if travel <1.1 min |
| 11 | Fri | 16.0 | 30 | 0.0 | 20/2/2 | 3×20 m flat | **fail** (over before any travel) |
| 12 | Wed | 3.9 | 15 | 11.1 | 10/0/0 | — | fits if travel ≤11.1 min |
| 12 | Fri | 14.4 | 30 | 0.6 | 20/2/3 | — | fits only if travel <0.6 min |

## Twelve-week summary

Triceps and calves are zero in every week. "Qualifying unilateral days" is 3 of 4 every week because Sunday has none.

| Week | Press | Vertical | Horizontal | Ratio | Biceps sets | Triceps sets | Calf sets | Carry days | Core days | Rotation patterns | Qualifying unilateral days | Power days | Shoulder days | Longest strength session |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 72.5 |
| 2 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.5 |
| 3 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.5 |
| 4 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.5 |
| 5 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 72.5 |
| 6 | 10 | 5 | 4 | 1.11 | 2 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 52.5 |
| 7 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.0 |
| 8 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.0 |
| 9 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.0 |
| 10 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.0 |
| 11 | 18 | 9 | 6 | 1.20 | 4 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 73.0 |
| 12 | 7 | 4 | 4 | 0.88 | 2 | 0 | 0 | 2 | 4 | 2 | 3 of 4 | 4 | 3 | 94.0 |
