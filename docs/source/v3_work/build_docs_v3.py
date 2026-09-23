"""Write the V3 training block (all 21 categories) and the change log from the V3 JSON.

Run after build_v3.py. If v3_work/verification_results.json exists, section 21 of the
block includes its summary; the change log compares V3 clocks with V2.
"""
from pathlib import Path
from datetime import date, timedelta
import json, re

ROOT = Path('/Users/brianoliveira/Desktop/Workout Plan 9.22.26')
OLD = Path('/Users/brianoliveira/Desktop/Workout Plan 9.20.26')
D = json.loads((ROOT / 'SYNTHESIZED_PRESCRIPTIONS_V3.json').read_text())
V2 = json.loads((OLD / 'SYNTHESIZED_PRESCRIPTIONS_V2.json').read_text())
V2_BLOCK = (OLD / 'SYNTHESIZED_TRAINING_BLOCK_V2.md').read_text()
VER_PATH = ROOT / 'v3_work' / 'verification_results.json'
VER = json.loads(VER_PATH.read_text()) if VER_PATH.exists() else None
S = {(s['week'], s['day']): s for s in D['sessions']}
I = {(r['week'], r['day']): r for r in D['impact_sessions']}
W = {a['week']: a for a in D['weekly_audit']}
R = D['rules']


def fmt(v):
    return f'{v:g}' if isinstance(v, (int, float)) else str(v)


def table(head, rows):
    return '\n'.join(['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---'] * len(head)) + '|'] + ['| ' + ' | '.join(map(str, r)) + ' |' for r in rows])


def dose(i):
    """Short dose string for a main-lift row."""
    load = i['load']
    if isinstance(load, (int, float)):
        load = ('+' if i['system_load'] else '') + fmt(load)
    return f"{i['sets']}×{i['reps']} @ {load}"


def main_doses(w, day):
    return '; '.join(dose(i) for i in S[(w, day)]['items'] if i['family'] in ('press', 'vertical', 'lower'))


def pick(w, day, pred):
    s = S[(w, day)]
    return ', '.join(i['exercise'] for i in s['items'] if pred(i))


sections = []


def section(n, title, text):
    sections.append(f'## {n}. {title}\n\n{text.strip()}\n')


# 1 --------------------------------------------------------------------------
normal = [S[(w, d)]['minutes'] for w in range(1, 13) if w not in (6, 12) for d in ('sunday', 'monday', 'wednesday', 'friday')]
nw = W[2]  # a normal week, for the headline totals
section(1, 'Executive findings', f"""
**Status: ready for review, not approved.** Brian approved the design decisions on September 23, 2026; the finished plan still needs his review. No training has been performed, so every load, time and outcome here is planned, not demonstrated.

- **What changed from V2:** triceps on Monday/Friday and biceps on Sunday/Wednesday, all for size (3×8–15, 1–2 RIR); calves ≥3 sets Monday and Friday with varied exercises; every one-arm/one-leg exercise ≥2 sets; free-weight rows (dumbbell exclusion lifted); new daily power choices; shorter rests; a restored, progressive plyometric and sprint plan; a higher OHP goal (130×2); squat and deadlift for maintenance; the broad-jump test removed; week-12 tests split across Wednesday and Friday.
- **Added September 24:** dumbbell incline bench press on Friday (2×8–10 @ 2–3 RIR, supersetted with the single-leg RDL; none in the week-12 test session), with one extra Sunday row set to hold the press:pull ratio. Normal weeks are now {nw['press']} press / {nw['vertical']} vertical / {nw['horizontal']} horizontal work sets (ratio {nw['ratio']:.2f}).
- **Two-set rule:** no exercise is ever done for a single set (tests excepted); cuts skip a whole optional exercise instead.
- **What did not change:** dip, bench, pull-up and squat load paths from V2; deadlift every Monday (10 heavy + 2 light weeks); Copenhagen twice weekly; three shoulder-health days; the tissue gates.
- **Time:** normal strength sessions plan at {min(normal):g}–{max(normal):g} minutes including a 5-minute delay reserve (hard limit 75). Wednesday impact ≤{max(r['total_seconds'] for r in D['impact_sessions'] if r['day'] == 'wednesday') / 60:.1f} min (hard limit 15); Friday impact ≤{max(r['total_seconds'] for r in D['impact_sessions'] if r['day'] == 'friday') / 60:.1f} min (target 30).
- **Weakest assumption:** that the extra arm, calf, leg and plyo work — started at near-full dose from week 1 alongside 3–4 hours of cycling — is recoverable without slowing the priority lifts. The plan handles this by holding, not pushing, when fatigue appears (section 17), and by making power, the third arm set and the third calf set the first things cut.
- **Second-weakest assumption:** that the sessions really run as clocked. Monday and Friday leave little room if equipment is crowded; the delay reserve and the cut order in section 20 are the safety valve.
""")

# 2 --------------------------------------------------------------------------
section(2, 'Assumption register and approved decisions', table(
    ['#', 'Assumption', 'Material?', 'If wrong'],
    [['A1', 'Equipment exists: bells to 48 kg, medicine balls and wall, landmine, cable columns, incline bench, calf machine or step, trap bar, 30 cm box, measured sprint strip and ~5% hill', '**Yes**', 'Use the fallback printed on each card'],
     ['A2', 'The one-arm KB snatch can be learned safely by week 7', 'Moderate', 'Keep progressing two-hand swings'],
     ['A3', 'Shorter rests (2:00–3:00 priority) keep priority lifts at target reserve', 'Moderate', 'Rest up to 3:00; the delay reserve covers it'],
     ['A4', 'Near-full dose from week 1 is recoverable with cycling', '**Yes**', 'Fatigue level 1–2 rules; new-exercise loads start conservatively'],
     ['A5', 'Anchors: OHP 125×1 @ RPE 8.5 (Sep 20); dip, pull-up, squat, bench, deadlift from mid-September; no retests', 'Moderate', 'In-session RIR corrects loads (section 17)'],
     ['A6', 'Bodyweight about 170 lb for the system-load examples', 'Low', 'Log real morning bodyweight'],
     ['A7', 'Sessions run as clocked (normal gym access)', '**Yes**', 'Delay reserve, then the cut order']]) +
    '\n\n**Approved design decisions (Brian, September 23, 2026):** see [V3_REVISION_PROPOSAL.md](V3_REVISION_PROPOSAL.md) §3. '
    '**Earlier approvals still in force:** C01 (12 Monday deadlifts), C02 (10 heavy + 2 light), C04 (named entry/restoration doses), C05 (two tolerated exposures per sprint stage), C06 (lower-body work only Monday/Friday), C07/C08 (target-rep tests), C09 (deload volume). '
    'C03 (broad-jump test exceptions) and C10 (15-minute Friday impact ladder) no longer apply. '
    '**App coaching amendments (Sep 22):** A2 (week-11 dip back-offs 3×6 @ +47.5) is applied; A1\'s calf work and 2-set single-leg RDL are covered by V3; A1\'s Monday lying leg curl is **not** included (Brian, Sep 24: avoid machines such as the hamstring curl) — a watch item for the faster sprint weeks 8–11, when hamstring load rises; A3 is applied in full: no broad-jump measurement, and week-12 Friday carries no power work and no KB complex (Brian, Sep 24; exception E11).\n\n**Approved exceptions:**\n\n' +
    table(['ID', 'Rule', 'Exception'], [[e['id'], e['rule'], e['exception']] for e in D['approved_exceptions']]))

# 3 --------------------------------------------------------------------------
v2_principles = V2_BLOCK.split('## 3. Evidence and practitioner principles')[1].split('## 4.')[0].strip()
section(3, 'Evidence and practitioner review', """
Research supports the principles here — heavy specific practice, rests over two minutes for maximal strength in trained lifters, training closer to failure for muscle size, fast-intent power work, gradual impact exposure — but not the exact doses. Exact sets, loads and contact numbers are coaching judgment within Brian's constraints and preferences, and are labelled that way in the ledger.

Practitioner influences carried over from V2:

""" + v2_principles.split('\n\n', 1)[1] + """

Added for V3: **Joel Smith / Just Fly** (quality-first plyometrics and sprinting, progressed gradually) and **Pavel Tsatsouline / StrongFirst** (kettlebell swings and snatches as crisp power practice) shape the power and plyo sections. **Layne Norton**'s rep-range progression shapes the arm work.
""")

# 4 --------------------------------------------------------------------------
v2_ledger = V2_BLOCK.split('## 4. Evidence ledger')[1].split('## 5.')[0]
baseline = v2_ledger.split('| Decision | Verified finding')[1].split('\n\nMaterial corrections')[0]
additions = v2_ledger.split('### Consequential V2 additions')[1].split('\n\nResearch is sufficient')[0].strip()
v3_rows = [
    ['Priority rests 2:00–3:00, squat/deadlift 2:30–3:00, accessories 60–90 s', 'Systematic review; Bayesian meta-analysis', 'Trained and untrained adults', 'Direct: strength and size outcomes', 'Moderate', 'Research + **Brian preference** (fast recovery)', '[Grgic et al., 2018](https://pubmed.ncbi.nlm.nih.gov/28933024/): trained lifters need >2 min to maximise strength; [Singer et al., 2024](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full): small size benefit from >60 s'],
    ['Arms 3×8–15 at 1–2 RIR, last set to 0–1', 'Meta-regressions', 'Mostly young trained/untrained adults', 'Indirect for 38-year-old concurrent athlete', 'Moderate for direction; low for exact dose', 'Research + **Brian preference** (arms for size)', '[Robinson et al., 2024](https://link.springer.com/article/10.1007/s40279-024-02069-2): size rises closer to failure, strength barely changes; [Pelland et al., 2025](https://link.springer.com/article/10.1007/s40279-025-02344-w): more weekly sets help with diminishing returns'],
    ['Direct triceps alongside heavy pressing', 'Meta-analysis; crossover trial', 'Mixed; trained men', 'Little added effect beyond compound pressing', 'Low', '**Brian preference**; kept elbow-friendly', '[Single- vs multi-joint meta-analysis](https://www.researchgate.net/publication/359785878_Hypertrophic_Effects_of_Single-_Versus_Multi-Joint_Exercise_of_the_Limb_Muscles_A_Systematic_Review_and_Meta-analysis); [trained-men crossover](https://pmc.ncbi.nlm.nih.gov/articles/PMC7745915/)'],
    ['Calves ≥3 sets Mon/Fri, straight- and bent-knee variations', 'Network meta-analysis; cross-sectional association', 'Healthy adults; team-sport athletes', 'Jumps already load the Achilles; calves add plantar-flexor strength', 'Low–moderate', 'Judgment + **Brian preference** (≥3 sets, variety)', '[Achilles training NMA, 2026](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1782503/full); [plantar-flexor strength and acceleration](https://pubmed.ncbi.nlm.nih.gov/39837318/)'],
    ['Sunday plyo push-up / medicine-ball chest pass', 'Systematic review with meta-analysis', 'Youth and young adults', 'Indirect for a 38-year-old experienced lifter', 'Low–moderate', 'Judgment', '[Upper-body plyometric training meta-analysis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10575843/)'],
    ['Monday swings → one-arm snatch', 'Randomised trial', 'Young men, different dose', 'Plausible hip-power transfer', 'Low–moderate', 'Judgment (Pavel influence)', '[Lake & Lauder, 2012](https://pubmed.ncbi.nlm.nih.gov/22580981/)'],
    ['Friday double-KB clean', 'UNVERIFIED — no specific trial retrieved', '—', 'Extension power without landings', 'Low', 'Judgment', 'UNVERIFIED'],
    ['Restored plyo progression (tiers, ≤15%/week, high tier from week 5)', 'Umbrella and scoping reviews; practitioner', 'Mostly athletic populations', 'Dose optimisation is an acknowledged research gap', 'Low for exact dose', 'Judgment + **Brian preference** (progressive capacity, no test)', '[Kons et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9832201/); [scoping review of dose gaps](https://pmc.ncbi.nlm.nih.gov/articles/PMC10457889/); [Joel Smith / Just Fly](https://www.just-fly-sports.com/training-faq/)'],
    ['OHP goal 130×2 at RPE ≤9', 'Calculation, not research', 'This athlete', 'Estimated max ≈130–133 from 125×1 @ RPE 8.5; target needs ≈141 (+6%)', 'Low–moderate', '**Brian preference**', 'Arithmetic; RIR noise per [Halperin et al., 2022](https://pubmed.ncbi.nlm.nih.gov/34542869/)'],
    ['Friday dumbbell incline bench press (secondary press)', 'Principle only: varied multi-joint exercises within a strength program', 'Healthy adults', 'General support for exercise variety; no trial of this exact placement or dose', 'Low', '**Brian preference** + judgment (placement, superset, ratio offset)', 'General context: [ACSM 2026 overview](https://pubmed.ncbi.nlm.nih.gov/41843416/); exact dose UNVERIFIED'],
    ['Supersets of unrelated accessory muscles', 'UNVERIFIED in this review', '—', 'Time-saving; no outcome benefit claimed', 'Low', 'Judgment + **Brian preference**', 'UNVERIFIED'],
    ['Free weights before machines', 'Not an evidence claim', '—', '—', '—', '**Brian preference**', '—'],
]
section(4, 'Evidence ledger', """
**V3 additions** (format: decision | evidence level | population | applicability | confidence | type | source). "Type" keeps research, coaching judgment and Brian's preferences apart. Findings were checked at abstract or summary level; exact doses are coaching judgment.

""" + table(['Decision', 'Evidence level', 'Population', 'Applicability', 'Confidence', 'Type', 'Source'], v3_rows) + """

**Superseded baseline rows:** "Three-minute upper-compound and four-minute squat/DL rests" (now 2:00–3:00 and 2:30–3:00 by Brian's decision; the Grgic review still supports ≥2 min for trained strength); "Two small impact blocks; six high training contacts weekly at most" and "Preserve two-minute recovery and reduce running reps" (replaced by the restored progression in sections 12–13, which keeps 2–3 min rests at ≤20 m). All other baseline rows stand.

**Baseline ledger (reviewed September 20; carried from V2):**

| Decision | Verified finding""" + baseline + """

**V2 additions (carried):**

""" + additions)

# 5 --------------------------------------------------------------------------
w2 = W[2]
section(5, 'Training architecture and weekly stress', f"""
Each lifting day has one fresh priority lift done first after a brief power exercise; meaningful lower-body strength happens only on Monday and Friday; plyometrics and sprints always come before lifting.

{table(['Day', 'Priority sequence', 'Added work and where fatigue matters'], [
    ['Sunday PM', 'Power → **dip** → paused bench → one-arm chest-supported DB row', 'Biceps + cable ER superset, ab wheel/hollow hold, farmer carry 2×20 m. Starts ≥6 h after the long ride ends; power is upper-body only.'],
    ['Monday PM', 'KB complex → swing/snatch → **pull-up** → deadlift → moderate OHP', 'Reverse lunge 2×6/side, Copenhagen + calves superset, pushdown + Pallof superset. Grip and hinge fatigue from swings is checked against the deadlift ramps.'],
    ['Wednesday PM', 'Impact (≤15 min) → scoop throw → **heavy OHP** → pull-up → one-arm DB row', 'Biceps + face pull superset, hanging leg raise/body saw, suitcase carry 2×20 m/side. Throws stay easy so OHP stays fresh.'],
    ['Friday AM', 'Impact and sprints (~30 min) → KB complex → double-KB clean → **squat** → dip → pull-up', '**DB incline bench 2×8–10 supersetted with single-leg RDL 2×6/side** (push + single-leg hinge share rest), Copenhagen + calves superset, overhead triceps + prone Y superset, landmine rotation. Optional ride only afterwards. Incline press skipped in week 12 (test day); Sunday\'s row gains one set every week it runs, to hold the press:pull ratio.']])}

**Normal-week load (week 2 example):** {w2['press']} press / {w2['vertical']} vertical / {w2['horizontal']} horizontal work sets (ratio {w2['ratio']:.2f}); {w2['biceps_sets']} biceps and {w2['triceps_sets']} triceps sets; {w2['calf_sets']} calf sets; {w2['leg_accessory_sets']} extra-leg pairs; {w2['copenhagen_sets']} Copenhagen pairs; {w2['power_sets']} power sets (not counted as strength); {w2['contacts']['low']}/{w2['contacts']['moderate']}/{w2['contacts']['high']} low/moderate/high contacts; {w2['acceleration_m']} m of accelerations. Lower-body stress comes from squat, deadlift, lunges, single-leg RDLs, Copenhagen, calves, jumps, sprints, swings/cleans and 3–4 h of cycling; there is no single number that combines them, so each is logged separately.
""")

# 6 --------------------------------------------------------------------------
section(6, 'Seven-day schedule', table(['Day', 'AM', 'PM'], [
    ['Sunday', 'TrainerRoad long ride', 'Strength (≥6 h after the ride actually ends)'],
    ['Monday', '—', 'Strength'],
    ['Tuesday', 'TrainerRoad ride', '—'],
    ['Wednesday', '—', 'Impact (≤15 min), then strength'],
    ['Thursday', 'TrainerRoad recovery ride', '—'],
    ['Friday', 'Impact and sprints (~30 min), then strength', 'Optional ride — only after lifting; first thing dropped if recovery slips'],
    ['Saturday', 'Rest', 'Rest (exception: Sat Dec 26 deferred-test makeup)']]) + """

TrainerRoad owns ride content. This plan may only recommend moving a ride, making it easy, or skipping it. Six hours after the Sunday ride is scheduling separation, not proof of recovery.

**Calendar:** week 1 starts Sunday, September 27, 2026. Week 6 (deload) is Nov 1–7. Thanksgiving is Thursday, Nov 26 (week 9 recovery-ride day); Friday, Nov 27 lifting stays as scheduled — if gym hours are short, use the cut order. Week 12 (tests) is Dec 13–19. The week-13 makeup is Saturday, Dec 26.
""")

# 7 --------------------------------------------------------------------------
rows7 = []
for day in ('sunday', 'monday', 'wednesday', 'friday'):
    s = S[(2, day)]
    rows7.append([day.title(), ' → '.join(b['name'] for b in s['timeline'] if b['kind'] != 'reserve'), f"{s['minutes']:g}", f"{s['total_seconds_if_max_rests'] / 60:g}"])
links = ' · '.join(f'[Week {w}](synthesized_session_cards_v3/week_{w:02d}.md)' for w in range(1, 13))
minutes_rows = [[w] + [f"{S[(w, d)]['minutes']:g}" for d in ('sunday', 'monday', 'wednesday', 'friday')] + [f"{I[(w, 'wednesday')]['total_seconds'] / 60:.1f}", f"{I[(w, 'friday')]['total_seconds'] / 60:.1f}"] for w in range(1, 13)]
section(7, 'Session structures and clocks', 'Block order and planned minutes for a normal week (week 2). Every block on every card lists its own arithmetic.\n\n' +
        table(['Day', 'Blocks in order', 'Planned min', 'If every priority rest runs to 3:00'], rows7) +
        '\n\n**All 48 sessions — planned strength minutes (5-minute reserve included) and impact minutes:**\n\n' +
        table(['Week', 'Sun', 'Mon', 'Wed', 'Fri', 'Wed impact', 'Fri impact'], minutes_rows) +
        f'\n\nAll 48 cards: [combined file](SYNTHESIZED_WEEKLY_CARDS_V3.md) · {links}.')

# 8 --------------------------------------------------------------------------
rows8 = []
for w in range(1, 13):
    rows8.append([w, main_doses(w, 'sunday'), main_doses(w, 'monday'), main_doses(w, 'wednesday'), main_doses(w, 'friday')])
acc_rows = []
for w in range(1, 13):
    acc_rows.append([w, pick(w, 'sunday', lambda i: i['power']), pick(w, 'monday', lambda i: i['power']), pick(w, 'sunday', lambda i: i['direct_arm'] == 'biceps') + ' / ' + pick(w, 'wednesday', lambda i: i['direct_arm'] == 'biceps'),
                     pick(w, 'monday', lambda i: i['calf']) + ' / ' + pick(w, 'friday', lambda i: i['calf']), pick(w, 'sunday', lambda i: i['family'] == 'abs') + ' / ' + pick(w, 'wednesday', lambda i: i['family'] == 'abs')])
section(8, 'All 12 weeks of prescriptions', 'Main lifts (sets×reps @ load; dips/pull-ups show ADDED lb). All loads are conditional (section 17).\n\n' +
        table(['Week', 'Sunday', 'Monday', 'Wednesday', 'Friday'], rows8) +
        '\n\n**Accessory selections by week** (Wednesday power is always the scoop throw; Friday power is always the double-KB clean; triceps are always rope pushdown Monday and overhead cable extension Friday):\n\n' +
        table(['Week', 'Sunday power', 'Monday power', 'Biceps Sun / Wed', 'Calves Mon / Fri', 'Core Sun / Wed'], acc_rows) +
        '\n\nNormal-week accessory doses: arms 3×8–15 at 1–2 RIR; calves 3 sets at 3 RIR; lunge and single-leg RDL 2×6/side at 3–4 RIR; rows 3×8/side at 2–3 RIR (Sunday 4×8/side in weeks 1–11); Friday DB incline bench 2×8–10 at 2–3 RIR (weeks 1–11); Copenhagen 3×6/side; shoulder health 2×12 at 4–5 RIR; Pallof 2×8/side; landmine rotation 2×6/side; carries 2×20 m. Weeks 6 and 12: 2 easy sets of everything (no exercise below 2 sets), leg work 2×4/side; week 12 has no incline press.')

# 9 --------------------------------------------------------------------------
section(9, 'OHP calibration and progression', R['ohp_anchor'] + """

The top double moves at most +2.5 lb every two weeks and only after a successful comparable exposure; the back-offs follow at about 96% of the top double. Monday is a moderate practice exposure (3+ RIR). A week-11 top double of 127.5 at RPE ≤8.5 suggests readiness for 130×2 at RPE ≤9 on Wednesday, December 16 — it is not a guarantee. The pin press remains the only permitted overload variation and needs repeated evidence of a sticking point before use. Strict standard: locked knees, no dip, hip drive or rebound, settled start, full lockout.

""" + table(['Week', 'Wednesday (top double / back-offs)', 'Monday (moderate)'], [[w, main_doses(w, 'wednesday').split('; ')[0] + ('' if w in (6, 12) else '; ' + main_doses(w, 'wednesday').split('; ')[1]), [dose(i) for i in S[(w, 'monday')]['items'] if i['exercise'].startswith('Strict OHP')][0]] for w in range(1, 13)]))

# 10 -------------------------------------------------------------------------
section(10, 'Dip, pull-up and bench strategies', """
**Dip (priority):** Sunday is the fresh heavy exposure (one heavy double, then three back-off sets of 5–6); Friday is moderate (3×5–6 at 3+ RIR). Depth below 90° at the elbow, controlled lockout. Log added AND system load. Goal: +50×6 at ≥2 RIR on Friday, Dec 18.

**Neutral-grip pull-up (priority):** three exposures a week — Monday fresh (4×3; weeks 7–11 one longer first set of 4–5 then three triples), Wednesday 3×4, Friday 2×3. Same handles, dead hang, chin clearly over. Isolated late-set fading is treated as fatigue (rest longer, then trim reps or load) before any frequency change. Goal: +45×5 at ≥2 RIR on Friday, Dec 18.

**Dumbbell incline bench press (secondary, added September 24):** Friday after squat, dip and pull-up, supersetted with the single-leg RDL — 2×8–10 at 2–3 RIR (2×8 easy in week 6; none in week 12). The first set picks the dumbbells; add the smallest step after two comparable exposures at ≥3 RIR. It is the first press work skipped under time or fatigue, and it is skipped whole — never done for one set. It counts toward the press floor, so Sunday's row gains a set in the same weeks to keep the ratio at 1.25.

**Paused bench (sixth priority):** Sunday after dips, consistent one-second pause, V2 path 180 → 200 lb (3×3 then 3×2). It never compromises OHP or dips; its third set is the first main-lift set cut.
""")

# 11 -------------------------------------------------------------------------
section(11, 'Squat and deadlift (maintenance)', """
**Low-bar squat (fourth priority):** Friday 3×2, V2 path 225 → 235 lb, but increases are taken only when the previous exposure was at ≥3 RIR — otherwise hold. Consistent at-or-below-parallel depth. Week 12: easy 2×2 @ 205 after the tests.

**Conventional deadlift (seventh priority):** every Monday at a fixed seven-day spacing — twelve exposures (C01). Normal weeks: top double 450 at RPE 7–8, then one back-off double at 405 (about 90%). Weeks 6 and 12: one light double at 390 (C02). If the top double is harder than RPE 8, next week's top double drops 10 lb. No maximum test. Swings, snatches and cleans supplement it; they do not replace it.
""")

# 12 -------------------------------------------------------------------------
rows12 = []
for w in range(1, 13):
    a, t = W[w], D['tier_targets'][str(w)]
    wi, fi = I[(w, 'wednesday')], I[(w, 'friday')]
    rows12.append([w, f"{a['contacts']['low']} / {a['contacts']['moderate']} / {a['contacts']['high']}", f"{t['low']} / {t['moderate']} / {t['high']}",
                   f"{wi['low']}/{wi['moderate']}/{wi['high']}", f"{fi['low']}/{fi['moderate']}/{fi['high']}",
                   '; '.join(e['name'] + ' ' + e['dose'].split(';')[0] for e in wi['events'] if e.get('tier')),
                   '; '.join(e['name'] + ' ' + e['dose'].split(';')[0] for e in fi['events'] if e.get('tier'))])
section(12, 'Plyometric contacts by week and tier', """
Goal: progressively more elastic capacity — no test metric. Tiers: **low** (pogos, line hops), **moderate** (low-hurdle hops, ~75% broad jumps), **high** (low depth jumps from 30 cm, maximal broad jumps). Rules: at most +15% a week within an established tier, one stress variable at a time, two tolerated exposures with normal next mornings before advancing, bilateral before unilateral, vertical before horizontal (depth jumps enter first in week 5; maximal broad jumps join on Wednesday in week 8, when the Wednesday exercise changes direction but not count). High tier enters in week 5 only if every gate is clean (named entry dose, C04). Week 7 restores to no more than the last tolerated dose. Each ground contact counts once; a bilateral landing counts once.

""" + table(['Week', 'Planned L/M/H', 'Approved ceiling L/M/H', 'Wednesday', 'Friday', 'Wednesday drills', 'Friday drills'], rows12))

# 13 -------------------------------------------------------------------------
rows13 = [[w, I[(w, 'friday')]['run_reps'], I[(w, 'friday')]['run_distance'], I[(w, 'friday')]['terrain'], I[(w, 'friday')]['effort'],
           I[(w, 'friday')]['run_rest_seconds'], I[(w, 'friday')]['acceleration_m'], I[(w, 'friday')]['runout_m']] for w in range(1, 13)]
section(13, 'Sprint accelerations', """
Acceleration work only, outdoors, never on a treadmill, always before lifting. One sprint session a week (Friday); a second from week 7 is allowed only if Wednesday still fits in 15 minutes and is not added by default. Ceiling 250 m of quality running per session; no continuous running over 2 miles (none prescribed). Rest 2–3 min for ≤20 m. One variable changes per stage and each stage gets two tolerated exposures (C05): reps (week 3), distance (week 5), terrain (week 8), effort (week 10). The gentle adductor squeeze (3×20 s) always comes first.

""" + table(['Week', 'Reps', 'Metres', 'Terrain', 'Effort', 'Rest (s)', 'Acceleration m', 'Easy runout m'], rows13))

# 14 -------------------------------------------------------------------------
section(14, 'Adductor protocol and tissue monitoring', f"""
- **Copenhagen:** Monday and Friday, knee-supported short lever, 3×6/side (sides alternate; supersetted with calves). The long lever is allowed only after three clean weeks and a review — permission, not a calendar step. It never substitutes for the lunge or single-leg RDL.
- **Pre-sprint squeeze:** 3×20 s at 20–30% effort before every Friday sprint session.
- **Checks:** {R['tissue']}
- **Calves and Achilles:** {R['calves']}
""")

# 15 -------------------------------------------------------------------------
section(15, 'Shoulder-health placement', """
Genuine shoulder accessories on three days, always after the priority lifts and never inside their rests: **Sunday** cable external rotation 2×12/side, **Wednesday** face pull 2×12, **Friday** prone Y 2×12 — all at 4–5 RIR, supersetted with the day's arm work. Wall slides appear only in warm-ups and earn no accessory credit. Shoulder work is never cut for time.
""")

# 16 -------------------------------------------------------------------------
section(16, 'Cycling placement and permitted recommendations', """
TrainerRoad supplies all ride content (about 3–4 hours a week: Sunday long ride, Tuesday ride, Thursday recovery ride, optional Friday ride). This plan never sets intervals, watts or durations. It may recommend: making a ride easy (week-12 Tuesday before the OHP test; Thursday Dec 24 before the makeup), moving the optional Friday ride, or skipping it when fatigue level 2–3 applies. Impact and sprints never follow a hard ride on the same day; Sunday lifting starts ≥6 h after the ride ends. A skipped ride earns no bonus lifting or impact.
""")

# 17 -------------------------------------------------------------------------
section(17, 'Autoregulation, fatigue, deloads and substitutions', f"""
- **Loads:** {R['load']}
- **Rest:** {R['rest']}
- **Power:** {R['power']}
- **Arms:** {R['arms']}
- **Extra leg work:** {R['legs']}
- **Core:** {R['core']}
- **Fatigue levels and change authority:** {R['fatigue_and_changes']}
- **Deloads:** weeks 6 and 12 are scheduled. An unscheduled deload replaces a scheduled one only if within 10 days and reconciled explicitly.
- **Substitutions:** only to solve a real problem (equipment, pain, skill), using the fallback printed on the card. Excluded everywhere: Turkish get-up, Bulgarian split squat, bilateral barbell RDL, cable flye. Dumbbell and cable rows are allowed.
- **Sequencing checks:** {' '.join(R['sequencing'].values())}
""")

# 18 -------------------------------------------------------------------------
section(18, 'Week-12 testing', R['tests'] + """

| Day | Date | What happens |
|---|---|---|
| Monday | Dec 14 | Easy day (all work ≥4 RIR; light deadlift 390×2) |
| Tuesday | Dec 15 | Ride — recommend easy |
| **Wednesday** | **Dec 16** | Low-tier impact, very light throws, **OHP test 130×2 (RPE ≤9)**, easy accessories. No dips or pull-ups |
| Thursday | Dec 17 | Recovery ride (easy) |
| **Friday** | **Dec 18** | Low-tier impact, light cleans, **dip test +50×6**, 10 min rest, **pull-up test +45×5** (both ≥2 RIR), then easy squat and accessories |
| Saturday | Dec 26 | Week-13 makeup for tests not attempted — see [WEEK_13_DEFERRED_TESTS_V3.md](WEEK_13_DEFERRED_TESTS_V3.md) |

Named exception E5: Wednesday counts as an easy day for Friday's dip and pull-up tests because it has no dip or pull-up work. The broad jump is no longer tested.
""")

# 19 -------------------------------------------------------------------------
rows19 = []
for w in range(1, 13):
    a = W[w]
    rows19.append([w, a['press'], a['vertical'], a['horizontal'], f"{a['ratio']:.2f}", a['biceps_sets'], a['triceps_sets'], a['calf_sets'], a['leg_accessory_sets'],
                   len(a['power_days']), len(a['unilateral_days']), len(a['core_days']), len(a['shoulder_days']), len(a['carry_days']), len(a['dynamic_rotation_patterns']),
                   '/'.join(d[:3].title() for d in a['lower_strength_days'])])
section(19, 'Weekly volume and component audit', 'Work sets per the work-set definition (≥80% of that exercise\'s top load that day at prescribed RIR; ramps and power excluded). One left+right pair = one set.\n\n' +
        table(['Wk', 'Press', 'Vert', 'Horiz', 'Ratio', 'Biceps', 'Triceps', 'Calves', 'Leg pairs', 'Power days', 'Unilateral days', 'Core days', 'Shoulder days', 'Carry days', 'Rotation patterns', 'Lower days'], rows19) +
        '\n\nNormal-week floors: press 16–20, vertical 8–12, horizontal ≥6, ratio ≤1.3. Weeks 6 and 12 use the C09 reduced-volume exception (E1).')

# 20 -------------------------------------------------------------------------
section(20, 'Cut hierarchy', '\n'.join(f"- **{d.title()}:** {t}" for d, t in R['cuts'].items()) + f"\n- **Deload weeks (6 and 12, non-test days):** {R['cuts_deload']}\n- **Week-12 Wednesday (OHP test):** {R['cuts_test']['wednesday']}\n- **Week-12 Friday (dip and pull-up tests):** {R['cuts_test']['friday']}" + """

A required item that gets skipped is logged as missed, never as a pass. Priority rests are never shortened below 2:00 (upper) or 2:30 (squat/deadlift), and nothing moves to Saturday. Symptoms override every cut label.
""")

# 21 -------------------------------------------------------------------------
if VER:
    summ = VER['summary']
    ver_text = (f"**{summ['pass']} pass, {summ['approved_exception']} approved exception, {summ['fail']} fail, {summ['unknown']} unknown** "
                f"out of {summ['total']} written-program checks. Details: [SYNTHESIS_VERIFICATION_V3.md](SYNTHESIS_VERIFICATION_V3.md). "
                'These checks verify the written program, not performed training or achieved outcomes.')
else:
    ver_text = 'Verification pending — see SYNTHESIS_VERIFICATION_V3.md once produced.'
section(21, 'Verification results and approved exceptions', ver_text + '\n\n' + table(['ID', 'Rule', 'Exception'], [[e['id'], e['rule'], e['exception']] for e in D['approved_exceptions']]))

header = ('# 12-week concurrent training block — V3 review draft\n\n'
          '**Ready for review, not approved.** Prepared September 23, 2026 from prompt v3.0 and Brian\'s September 23 decisions. '
          'Block dates: Sunday, September 27 – Saturday, December 19, 2026 (makeup Saturday, December 26). '
          'Files: [cards](SYNTHESIZED_WEEKLY_CARDS_V3.md) · [data](SYNTHESIZED_PRESCRIPTIONS_V3.json) · [verification](SYNTHESIS_VERIFICATION_V3.md) · [change log](SYNTHESIS_CHANGELOG_V3.md) · [week-13 makeup](WEEK_13_DEFERRED_TESTS_V3.md) · [design decisions](V3_REVISION_PROPOSAL.md).\n\n'
          '**Goals (conditional, not promised):** strict OHP 130×2 at RPE ≤9 · weighted dip +50×6 at ≥2 RIR · neutral-grip pull-up +45×5 at ≥2 RIR · maintain low-bar squat and conventional deadlift · progressively more plyometric capacity. Tracked: paused bench toward 205×2, bodyweight about 170 ± 2.\n\n'
          '**Priority order:** health/tissue → OHP, dip, pull-up → TrainerRoad rides → squat → jumping/sprinting → bench → deadlift → secondary volume.\n\n'
          '**Athlete:** male, 38; 6\'0", ~170 lb; long femurs, shorter torso; 10+ years lifting; TrainerRoad FTP 229 W; no current injury; limited recent sprinting/jumping; mild post-running adductor tightness without gait change (observation, not diagnosis). Scope: no nutrition, ride content, wearable rules or app work.\n\n')
(ROOT / 'SYNTHESIZED_TRAINING_BLOCK_V3.md').write_text(header + '\n'.join(sections))

# ---------------------------------------------------------------------------
# Change log.
# ---------------------------------------------------------------------------
V2S = {(s['week'], s['day']): s for s in V2['sessions']}
min_rows = []
for w in range(1, 13):
    row = [w]
    for d in ('sunday', 'monday', 'wednesday', 'friday'):
        old, new = V2S[(w, d)]['minutes'], S[(w, d)]['minutes']
        row.append(f'{old:g} → {new:g} ({new - old:+g})')
    min_rows.append(row)
audit = (ROOT / 'V3_CURRENT_ROUTINE_AUDIT.md').read_text()
findings = audit.split('## Findings — observed problems only')[1].split('**Already compliant')[0].strip()
changes = [
    ['Week-12 Friday: light double-KB cleans 2×2 and the KB complex before the tests', 'No power work and no KB complex on week-12 Friday', 'Amendment A3, re-confirmed by Brian Sep 24: nothing goes in front of the dip and pull-up tests', '−2 power sets in week 12', '−~4 min week-12 Friday', 'New approved exception E11 (power every lifting day)'],
    ['Amendment A1 Monday lying leg curl (in the app, Sep 22)', 'Not adopted', 'Brian, Sep 24: avoid machines ("RDL vs hamstring curl"); hamstrings get Friday single-leg RDL 2×6/side and Monday deadlifts', 'None vs V3', 'None', 'Watch item for weeks 8–11 sprint speed'],
    ['Week-11 Sunday dip back-offs 3×5 @ +47.5 (inherited from the pre-amendment V2 files)', '3×6 @ +47.5', 'Coaching amendment A2, approved by Brian Sep 22 in the app repo: the six-rep ladder climbs in even 2.5 lb steps into the +50×6 test', '+3 reps in week 11', '+12 s', '—'],
    ['Single-set exercises in deload weeks (deadlift 1×2 @ 390, week-12 bench 1×2, week-6 Friday pull-up 1×3, week-6 incline 1×8) and cut rules that allowed dropping core, Friday pull-ups or incline to 1 set', 'Every non-test exercise is ≥2 sets; cuts keep ≥2 sets or skip a whole optional exercise (Friday DB incline). Core and Friday pull-ups are never cut', 'Verification, Sep 24: Brian\'s rule "never do less than 2 sets"', '+1 easy set on four deload-week exercises', '< 1 min per affected deload session', 'Tightens the approved §8 cut order (which allowed cutting the 2nd core and 2nd Friday pull-up set) to match the 2-set rule'],
    ['Generic cut/sequencing text on deload and test-day cards (named exercises that were not there)', 'Deload-week and week-12 test-day versions of the cut and sequencing rules', 'Verification, Sep 24: cards must describe their own session', 'None', 'None', '—'],
    ['No secondary press on Friday (only dip, at moderate reserve)', 'Dumbbell incline bench press 2×8–10 @ 2–3 RIR, supersetted with the single-leg RDL (skipped in W12, test day; 1×8 in W6)', 'Brian, Sep 24: Friday had the most room for a second press movement', 'Press 18→20 sets/week (top of the 16–20 floor); Sunday row +1 set (3→4) to hold the ratio at 1.25', '+~1.5 min Friday net (superset shares rest with the RDL); Sunday row +~1.5 min', 'Still within the existing 16–20 press floor and ≤1.30 ratio — no new exception needed'],
    ['No direct triceps (V2)', 'Rope pushdown Mon, overhead cable extension Fri, 3×8–15 @ 1–2 RIR', 'v3.0 + Brian (arms for size)', '+6 triceps sets/week (2 each in W6/W12)', 'Supersetted with Pallof / prone Y', 'Arm sets not in compound floors'],
    ['Biceps 2×8–12 @ 3 RIR', 'Biceps 3×8–15 @ 1–2 RIR (same 3-week rotation)', 'Brian: arms for size', '+2 biceps sets/week', 'Supersetted with shoulder health', '—'],
    ['No calf work', 'Calves ≥3 sets Mon (straight-knee) and Fri (bent-knee), rotating every 3 weeks', 'v3.0 + Brian (≥3 sets, variety)', '+6 calf sets/week (4 in W6/W12)', 'Supersetted with Copenhagen', 'Calf/Achilles added to tissue checks'],
    ['Lunge / single-leg hinge 1×6/side, cut-first', 'DB/KB lunge and single-leg RDL 2×6/side, never cut', 'v3.0 + Brian (≥2 sets, free weights)', '+2 leg pairs/week', '+~1 min each day', 'Now required'],
    ['Two-arm chest-supported machine row (Sun); one-arm machine row (Wed)', 'One-arm chest-supported DB row (Sun); one-arm DB row (Wed)', 'Brian: free weights; DB-row exclusion lifted; daily unilateral', 'Horizontal sets unchanged (6)', '+~1 min Sunday', 'Exclusion list shortened (E9)'],
    ['Power: one-arm KB clean, swing 2×5, scoop throw 2×3, double-KB clean or broad jumps', 'Plyo push-up/chest pass, swing→snatch, scoop throw, double-KB clean — all 4 sets', 'Brian: power daily and important; broad jumps are plyo, not power', 'Power sets 2 → 4 per day (never counted as strength)', '+1–3 min per day', '—'],
    ['Generic warm-ups', 'KB complex primer on Mon/Fri warm-ups', 'Brian approved', 'Light preparation only', '+~1.5 min Mon/Fri', '—'],
    ['Rests 3:00 upper / 4:00 lower', '2:00–3:00 upper (clock 2:30) / 2:30–3:00 lower (clock 3:00)', 'Brian: fast recovery', 'None', '−6 to −10 min per session', 'E7'],
    ['Deadlift 2×2 @ 450', 'Top double 450 + back-off double 405 (W6/W12 390)', 'Deadlift now lowest priority; maintenance', 'Slightly less deadlift fatigue', '≈ same', 'C01/C02 kept (E2)'],
    ['OHP goal 125×2; W1 calibration single', 'OHP goal 130×2 @ RPE ≤9; Sep 20 single replaces calibration; path +2.5 lb', 'Brian (tested 125×1 @ 8.5)', 'Same sets', 'None', 'E4'],
    ['Broad-jump goal and W1/W12 tests', 'Removed; broad jumps are ordinary plyo work', 'Brian', 'Test contacts removed', '−5 min W1/W12 Friday impact', 'C03 retired'],
    ['C10 reduced plyo (≤6 high contacts, 3×20 m at 70%)', 'Restored progression: high tier 12→18, sprints to 4×20 m at 85–90%', 'Brian: progressive capacity; Friday ~30 min', 'More contacts and faster running, gated', 'Friday impact up to ~30 min', 'E3, E8'],
    ['Week-12 tests all Friday (94 min)', 'OHP Wednesday; dip + pull-up Friday with 10 min between (73.5 min)', 'Brian (option B); 75-min hard cap', 'Same tests', '−20.5 min Friday', 'E5'],
    ['Week-13 makeup Friday', 'Saturday, Dec 26 (Dec 25 is Christmas)', 'Brian', '—', '—', 'E6'],
    ['Carries 1×20 m', 'Carries 2×20 m', 'Brian: ≥2 sets for one-side work', '+1 carry set Sun/Wed', '+~1 min', '—'],
    ['Spec sprint table: weeks 8–9 flat at ~80%', 'Weeks 5–9 held at ~75%; the only effort step is week 10 (85–90%)', 'Verification found two changes at once (distance + effort in week 5; terrain + effort in week 8)', 'Slightly gentler sprint progression', 'None', 'One variable per stage (C05)'],
    ['75 min a guideline; Friday impact 30 (V2)', '75 min hard; Wednesday impact 15 hard; Friday ~30 target', 'v3.0 + Brian', '—', 'All strength sessions ≤73.5 min', 'E8'],
]
changelog = ['# Change log — V2 → V3 (review draft)\n',
             '**Sources:** prompt v3.0 (September 23, 2026; truncated after §17 "Scope", remainder ruled irrelevant by Brian); V2 review draft (September 21); C01–C10 (approved September 20). '
             '**Output:** V3 review draft in `Desktop/Workout Plan 9.22.26/`. The 9.20.26 folder and all originals are unchanged. No training is claimed completed.\n',
             '## Phase 1 audit of V2 (summary)\n', findings, '\nFull 48-row audit: [V3_CURRENT_ROUTINE_AUDIT.md](V3_CURRENT_ROUTINE_AUDIT.md).\n',
             '## Brian\'s decisions (September 23, 2026)\n',
             '- Friday impact up to ~30 min (not a hard limit); Wednesday 15; strength 75 hard; travel disregarded.\n- Broad jumps are plyometrics, not power; broad-jump goal removed.\n- Week-12 tests split: OHP Wednesday, dip + pull-up Friday.\n- Never fewer than 2 sets for one-side work; prefer free weights.\n- Triceps approved; arms for size; calves ≥3 sets with variety (2 in deloads).\n- Sunday row one-arm; V3 file names in the 9.22.26 folder.\n- OHP goal 130×2 (RPE ≤9); dips/pull-ups ≥2 RIR; squat and deadlift maintenance; progressive plyo capacity without a metric.\n- Priority: tissue → OHP/dip/pull-up → rides → squat → jumping/sprinting → bench → deadlift.\n- Shorter rests and supersets allowed; DB and cable row exclusions lifted.\n- Power picks: plyo push-up/chest pass, swing→snatch, scoop throw, double-KB clean; KB complex warm-up kept on Mon/Fri.\n- Start Sunday, Sep 27, 2026; makeup Saturday, Dec 26; near-full dose from week 1.\n',
             '## Changes\n', table(['Removed / replaced', 'Added / substituted', 'Reason', 'Volume / fatigue effect', 'Time effect', 'Floors / exceptions'], changes),
             '\n## Planned strength minutes, every session (V2 → V3)\n',
             'V2 used 3:00/4:00 rests and fewer accessory sets; V3 uses shorter rests and more accessory work. Both are projections, not measured times.\n',
             table(['Week', 'Sunday', 'Monday', 'Wednesday', 'Friday'], min_rows)]
(ROOT / 'SYNTHESIS_CHANGELOG_V3.md').write_text('\n'.join(changelog) + '\n')
print(json.dumps(dict(block_sections=len(sections), block_words=len((ROOT / 'SYNTHESIZED_TRAINING_BLOCK_V3.md').read_text().split()), verification_included=bool(VER))))
