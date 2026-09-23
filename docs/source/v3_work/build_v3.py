"""Build the V3 12-week block from explicit, auditable records.

Reads the September 21 V2 data (read-only) for the dip, bench, pull-up and squat
paths, applies every decision in V3_REVISION_PROPOSAL.md, and writes the JSON,
all 48 session cards, the combined weekly cards and the week-13 file into the
9.22.26 folder. Nothing in the 9.20.26 folder is modified.
"""
from pathlib import Path
from datetime import date, timedelta
import json, math, copy

# ---------------------------------------------------------------------------
# Where things live: new files go to 9.22.26; V2 data is only read.
# ---------------------------------------------------------------------------
ROOT = Path('/Users/brianoliveira/Desktop/Workout Plan 9.22.26')
V2_PATH = Path('/Users/brianoliveira/Desktop/Workout Plan 9.20.26/SYNTHESIZED_PRESCRIPTIONS_V2.json')
V2 = json.loads(V2_PATH.read_text())
CARD_DIR = ROOT / 'synthesized_session_cards_v3'
CARD_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Calendar: week 1 starts Sunday, September 27, 2026.
# ---------------------------------------------------------------------------
START = date(2026, 9, 27)
DAYS = ['sunday', 'monday', 'wednesday', 'friday']
OFFSET = {'sunday': 0, 'monday': 1, 'wednesday': 3, 'friday': 5}
EASY = {6, 12}
PHASE = {1: 'Accumulation start', 6: 'Deload', 12: 'Deload and tests'}
PHASE.update({w: 'Accumulation' for w in range(2, 6)})
PHASE.update({w: 'Intensification' for w in range(7, 12)})
BLOCK_A = {1, 2, 3, 7, 8, 9}          # three-week variation blocks (A) vs (B)
EXAMPLE_BW = 170                      # example bodyweight only; log the real morning weight
INCLINE_WEEKS = set(range(1, 12))     # DB incline bench: every week except W12 (test day; Brian, Sep 24)


def session_date(w, day):
    """Actual calendar date of a session."""
    return START + timedelta(days=7 * (w - 1) + OFFSET[day])


def pretty(d):
    """Readable date such as 'Sun Sep 27, 2026'."""
    return f"{d.strftime('%a %b')} {d.day}, {d.year}"


# ---------------------------------------------------------------------------
# Rest periods (Brian recovers quickly; approved September 23).
# ---------------------------------------------------------------------------
PRIORITY_REST = 150   # OHP/dip/pull-up/bench work sets: 2:00 minimum, 3:00 maximum; clock budgets 2:30
LOWER_REST = 180      # squat/deadlift: 2:30–3:00; clock budgets 3:00
POWER_REST = 60       # power sets: 60–90 s
ACC_REST = 75         # accessories: 60–75 s
MAX_PRIORITY_REST = 180

# ---------------------------------------------------------------------------
# Load paths that V3 changes (everything else comes from V2).
# ---------------------------------------------------------------------------
OHP_WED = {1: (117.5, 112.5), 2: (117.5, 112.5), 3: (120, 115), 4: (120, 115), 5: (122.5, 117.5),
           7: (122.5, 117.5), 8: (122.5, 117.5), 9: (125, 120), 10: (125, 120), 11: (127.5, 122.5)}
OHP_MON = {1: (3, 4, 102.5), 2: (3, 4, 102.5), 3: (3, 4, 105), 4: (3, 4, 105), 5: (3, 4, 107.5), 6: (2, 3, 92.5),
           7: (3, 3, 107.5), 8: (3, 3, 107.5), 9: (3, 3, 110), 10: (3, 3, 110), 11: (3, 3, 112.5), 12: (2, 3, 95)}
BICEPS = [('Alternating dumbbell curl', 'Straight-bar cable curl'),
          ('Incline dumbbell curl', 'Rope cable hammer curl'),
          ('Dumbbell hammer curl', 'Cambered-bar curl')]

# ---------------------------------------------------------------------------
# Plyometric and sprint plan (weekly tiers from the approved table).
# low/mod = (sets, reps); high = (exercise, [contacts per set]); run = (reps, metres, terrain, effort, rest s)
# ---------------------------------------------------------------------------
IMPACT = {
    1: dict(wed=dict(low=(4, 10), mod=(2, 6)), fri=dict(low=(2, 10), mod=(4, 2), run=(4, 15, '~5% hill', 'build to ~75%', 120))),
    2: dict(wed=dict(low=(4, 11), mod=(2, 6)), fri=dict(low=(2, 11), mod=(5, 2), run=(4, 15, '~5% hill', 'build to ~75%', 120))),
    3: dict(wed=dict(low=(5, 10), mod=(3, 5)), fri=dict(low=(2, 12), mod=(5, 2), run=(6, 15, '~5% hill', 'build to ~75%', 120))),
    4: dict(wed=dict(low=(5, 10), mod=(3, 6)), fri=dict(low=(3, 10), mod=(5, 2), run=(6, 15, '~5% hill', 'build to ~75%', 120))),
    5: dict(wed=dict(low=(5, 10), mod=(3, 6), high=('depth', [2, 2])),
            fri=dict(low=(3, 10), mod=(6, 2), high=('depth', [4, 4]), run=(6, 20, '~5% hill', 'build to ~75%', 150))),
    6: dict(wed=dict(low=(2, 10)), fri=dict(low=(2, 10), run=(3, 15, '~5% hill', 'submaximal, ~60%', 120))),
    7: dict(wed=dict(low=(4, 11), mod=(2, 7), high=('depth', [2, 2])),
            fri=dict(low=(2, 13), mod=(6, 2), high=('depth', [4, 4]), run=(6, 20, '~5% hill', 'build to ~75%', 150))),
    8: dict(wed=dict(low=(5, 10), mod=(3, 5), high=('broad', [1, 1, 1, 1])),
            fri=dict(low=(3, 10), mod=(7, 2), high=('depth', [3, 3, 3]), run=(4, 20, 'flat', 'build to ~75%', 150))),
    9: dict(wed=dict(low=(5, 10), mod=(3, 6), high=('broad', [1, 1, 1, 1])),
            fri=dict(low=(3, 10), mod=(7, 2), high=('depth', [4, 3, 3]), run=(4, 20, 'flat', 'build to ~75%', 150))),
    10: dict(wed=dict(low=(5, 10), mod=(4, 5), high=('broad', [1, 1, 1, 1])),
             fri=dict(low=(3, 10), mod=(7, 2), high=('depth', [4, 4, 4]), run=(4, 20, 'flat', '85–90%', 180))),
    11: dict(wed=dict(low=(5, 10), mod=(4, 5), high=('broad', [1, 1, 1, 1])),
             fri=dict(low=(3, 10), mod=(8, 2), high=('depth', [4, 4, 3, 3]), run=(4, 20, 'flat', '85–90%', 180))),
    12: dict(wed=dict(low=(2, 10)), fri=dict(low=(1, 10), run=(2, 20, 'flat', '~70%', 150))),
}
TIER_TARGET = {1: (60, 20, 0), 2: (66, 22, 0), 3: (74, 25, 0), 4: (80, 28, 0), 5: (80, 30, 12), 6: (40, 0, 0),
               7: (70, 26, 12), 8: (80, 29, 13), 9: (80, 32, 14), 10: (80, 34, 16), 11: (80, 36, 18), 12: (30, 0, 0)}

# ---------------------------------------------------------------------------
# Rules printed on every card (plain language, so nothing is left to memory).
# ---------------------------------------------------------------------------
LOAD_GATE = ('All main-lift loads are conditional. If the first work set is about 1 RIR harder than prescribed: '
             'OHP/dip/pull-up −2.5 lb, bench/squat −5 lb, deadlift −10 lb for the remaining sets; if ≥2 RIR harder, double that and drop the last back-off. '
             'Progress only after the previous comparable session hit its target RIR with normal technique, bar speed and tissue response. '
             'Never catch up a missed increase; change one variable at a time. Dips and pull-ups: log added load AND total system load '
             '(morning bodyweight + added). Examples use 170 lb; use your real weight.')
REST_RULE = ('Rest: OHP, dip, pull-up and bench work sets 2:00 minimum, up to 3:00 when reps or bar speed would suffer (clock budgets 2:30). '
             'Squat/deadlift 2:30–3:00 (clock budgets 3:00). Power 60–90 s. Accessories 60–75 s. Supersets pair unrelated muscles and never include priority work sets.')
POWER_GATE = ('Power is fast and low-fatigue, never a conditioning circuit. Stop a set at the first visibly slower rep, a noisy catch or landing, or any technique breakdown. '
              'After TWO crisp, symptom-free exposures that did not slow the next main-lift ramp, change ONE thing: the next load step, or (only if load cannot rise) a little more height/distance. '
              'Never progress power in the same week as a new plyo stage or a new leg-accessory load. W6/W12 use half the sets at a familiar load. Power sets never count as strength sets.')
ARM_GATE = ('Arms are for size: 3×8–15 at 1–2 RIR, last set may reach 0–1 RIR; 60–90 s before the same exercise comes round again. '
            'Add reps within 8–15 at the next normal appearance of the SAME exercise. When all 3 sets reach 15 at target reserve, add the smallest load step next time and return toward 8–10. '
            'Hold triceps first if Sunday dips or Wednesday OHP ramps feel slow or elbows are sore. W6/W12: 2 easy sets at ≥4 RIR, no progression.')
CALF_GATE = ('Calves: full range, 1-s pause in the stretched position, no bouncing, 3 RIR (week 1: 3–4 RIR while choosing loads). '
             'When every set reaches the top of the range with normal next-morning calf/Achilles response AND normal Wednesday pogo quality, add the smallest load step. '
             'More than mild calf soreness on Wednesday morning: hold calf load and start Wednesday impact at the lower pogo dose. W6/W12: 2 easy sets at ≥4 RIR.')
LEG_GATE = ('Extra leg work is never cut: under fatigue lighten the load, shorten the range or add hand support instead. Two work sets per side, 3–4 RIR. '
            'Increase the smallest load step only after two comparable exposures at ≥3 RIR with normal adductor/hamstring response and unaffected rides, impact and main lifts. '
            'Do not raise it in a week that impact or power progresses. W6/W12: 2×4/side at ≥5 RIR, lighter.')
CORE_GATE = ('Keep each core exercise for its three-week block. Improve range or hold quality first; after two good exposures take the smallest load/range step, without adding sets. '
             'No swinging on hanging raises (bent knees are the regression). Hollow holds end with ~10 s of good position left. Pallof is anti-rotation, not dynamic rotation. W6/W12: 2 easy sets.')
TISSUE_GATE = ('After every impact session and the next morning, log normal/abnormal for adductors, calves and Achilles. If abnormal: location, severity, onset, duration, stride/gait effect, squat effect and response to gentle resisted adduction. '
               'Familiar mild soreness that clears in 24–48 h with no movement change: HOLD (repeat the stage). Worsening, persistent or output-limiting symptoms: regress. '
               'Sharp pain, bruising, weakness, progressive symptoms or ANY movement-altering discomfort: stop the affected impact work and get a clinical evaluation. No aggressive static stretching before sprints.')
FATIGUE = ('Fatigue levels: 0 = progress or hold normally. 1 = hold loads, rest toward 3:00, drop cut-first sets. 2 = cut the affected domain’s work sets by 25–35%, keep familiar technique work. '
           '3 = 5–7 days at about half volume, 10–15% lighter, ≥4 RIR, no fast sprints or high-tier plyo, recommend easy or skipped rides. One bad session is not a deload. '
           'A tissue-safety stop happens immediately. Allowed without asking: small load changes, holds, one back-off set, small rep changes, longer rest, removing cut-first work. '
           'Needs Brian’s approval: replacing a primary lift or changing its frequency, >15% volume change, new deload/test changes, faster or higher-impact progression, priority or OHP-target changes. Weeks 1–4: present coaching changes for approval.')
SEQ = {
    'sunday': 'Sunday checks: power follows the long ride — if the push-ups/chest passes lose pop, use the hands-elevated regression and stop at 2 sets. Dips are the fresh priority; nothing tiring comes before them.',
    'monday': 'Monday checks: swings/snatches come before deadlifts — if the deadlift ramps feel slow, stop power at 2 sets next time. Lunges come after a Sunday long ride and deadlifts — after a hard ride weekend, hold the lunge load.',
    'wednesday': 'Wednesday checks: scoop throws precede heavy OHP — keep throws at RPE ≤4 and stop at any shoulder fatigue. Monday calves are 48 h before today’s pogos — see the calf rule.',
    'friday': 'Friday checks: power comes after impact — if cleans are slow, do 2 sets only. DB incline bench is supersetted with the single-leg RDL — hold incline’s 2nd set first if squat or dip felt heavy. The single-leg RDL itself still follows squats — lighten it if hamstrings or lower back are tired.',
}
CUTS = {
    'sunday': 'Cut order: (1) power sets 3–4, (2) 3rd biceps set, then (3) the 3rd bench set (press stays ≥16). Never cut: dip work, row sets, both core sets, cable ER, the carry. No exercise is ever done for just 1 set.',
    'monday': 'Cut order: (1) power sets 3–4, (2) 3rd triceps set, (3) 3rd calf set. Never cut: pull-up, deadlift and OHP work sets, both lunge sets, Copenhagen, both Pallof sets. No exercise is ever done for just 1 set.',
    'wednesday': 'Cut order: (1) power pairs 3–4, (2) 3rd biceps set. Never cut: OHP and pull-up work sets, row sets, face pulls, both core sets, the carry. No exercise is ever done for just 1 set.',
    'friday': 'Cut order: (1) power sets 3–4, (2) 3rd triceps set, (3) 3rd calf set, then (4) skip DB incline bench entirely — both sets, never just one (press drops to 18; the single-leg RDL then runs alone with 75 s between pairs). Never cut: squat, dip, both pull-up sets (vertical floor 8), both single-leg RDL sets, Copenhagen, prone Y, both landmine rotation sets. No exercise is ever done for just 1 set.',
}
CUTS_DELOAD = ('Deload week: planned well under 75 minutes, so no cuts are expected. Every exercise is already at its 2-set minimum — never drop one to 1 set. '
               'If time or fatigue forces a cut, skip a whole optional exercise instead (Friday: DB incline bench), and log it.')
CUTS_TEST = {
    'wednesday': 'Test day (planned about 43 minutes): no cuts are expected. Never shorten the OHP ramps or the 3:00 before the target set. If symptoms appear, stop the affected work; never do an accessory for just 1 set — skip it whole and log it.',
    'friday': 'Test day: never shorten the ramps, the 10:00 between tests or the 3:00 before each target set. If the clock gets tight after the tests, skip the easy squat first (it is maintenance-only this week). Never do an exercise for just 1 set — skip it whole and log it.',
}
SEQ_TEST = {
    'wednesday': 'Test-day checks: throws are very light (2×2/side) and stop at any shoulder fatigue — the OHP test is next. No dips or pull-ups today, so Wednesday counts as an easy day for Friday’s tests.',
    'friday': 'Test-day checks: impact is low-tier only, and there is no power work or kettlebell complex today — nothing goes in front of the tests. Dip test first, 10:00 of rest, then the pull-up test. The squat and accessories come only after both tests.',
}


def seq_text(w, day):
    """Sequencing checks that match what is actually on that day's card."""
    return SEQ_TEST[day] if w == 12 and day in SEQ_TEST else SEQ[day]


def cut_text(w, day):
    """Cut order that matches that day's actual set counts."""
    if w == 12 and day in CUTS_TEST:
        return CUTS_TEST[day]
    return CUTS_DELOAD if w in EASY else CUTS[day]
PULLUP_NOTE = ('Longer pull-up set: weeks 8 and 10 use the load you actually handled for the preceding 4-rep set. Week 11 allows 4–5 reps, stopping at 2–3 RIR. '
               'Repeat 4 reps or reduce load if needed; the triples may use the last successful lower load. No catch-up, no extra sets.')
OHP_ANCHOR = ('OHP anchor: your strict 125×1 at RPE 8.5 on Sunday, Sep 20, 2026 replaces the old week-1 calibration single (estimated max ≈130–133). '
              'Today’s 117.5 top double should feel about RPE 7.5–8. If it is RPE ≥9, drop the back-offs to 110 and repeat 117.5 next week; if ≤7, still take the printed path (no jump ahead).')
TEST_RULES = ('Test rules: two easy days before each test session, no red tissue domain, normal gait. Readiness singles are strict, crisp and about RPE ≤7; they allow the attempt, they do not prove it. '
              'ONE target set per lift. Stop before a grinding or invalid rep; no retries. OHP success = 130×2 strict at RPE ≤9. Dip success = +50×6, elbows below 90°, controlled lockout, ≥2 RIR. '
              'Pull-up success = +45×5 from a dead hang on the usual neutral handles, chin clearly over, ≥2 RIR. Record RPE/RIR right after the set; video recommended. '
              'An unattempted test may move to the week-13 makeup (Sat Dec 26). A failed or grinding attempt is recorded as not achieved.')

# ---------------------------------------------------------------------------
# Row and block helpers (same arithmetic style as V2, extended for supersets).
# ---------------------------------------------------------------------------

def fmt(v):
    """Numbers without trailing .0."""
    return f'{v:g}' if isinstance(v, (int, float)) else str(v)


def mm(seconds):
    """Seconds as m:ss."""
    return f'{int(seconds) // 60}:{int(seconds) % 60:02d}'


def reps_max(reps):
    """Upper bound of a rep range; None for timed or distance work."""
    text = str(reps)
    if text.endswith(' s') or text.endswith(' m'):
        return None
    return int(text.split('–')[-1])


def ex(name, sets, reps, load, family, rir, rest, *, side=False, tempo=3, purpose='', cut='never_cut',
       protected=None, unit='selection_rule', tags=(), **flags):
    """One exercise row carrying its own dose, classification and cut rule."""
    row = dict(exercise=name, sets=sets, reps=str(reps), reps_max=reps_max(reps), load=load, load_unit=unit,
               family=family, tags=list(tags), rir=rir, rest_seconds=rest, per_side=side,
               side_convention=('reps are per side; one left+right pair = one set' if side else 'both sides together'),
               seconds_per_rep=tempo, purpose=purpose, cut_priority=cut,
               protected_sets=sets if protected is None else min(protected, sets), clock='strength',
               unilateral=False, lower_strength=False, direct_abdominal=False, shoulder_health=False, direct_arm=None,
               calf=False, dynamic_rotation=False, rotation_pattern=None, power=False, carry=False, work_set=True,
               system_load=False, superset_with=[], fallback='', progression='')
    row.update(flags)
    return row


def add(s, row):
    """Append a row with honest execution time (both sides, top of rep range)."""
    if 'execution_seconds' not in row:
        per_set = (row['reps_max'] or 0) * row['seconds_per_rep'] * (2 if row['per_side'] else 1)
        if row['family'] in ('press', 'vertical', 'lower'):
            per_set = max(15, (row['reps_max'] or 0) * 4)
        row['execution_seconds'] = row['sets'] * per_set
    row['id'] = f"{s['id']}_{len(s['items']) + 1:02d}"
    s['items'].append(row)
    return len(s['items']) - 1


def timed(s, name, ids=None, ramps=None, detail='', setup=0, transition=0, rehearsal=0, rehearsal_rest=0,
          finish=0, side_change=0, moves=0, execution=None, rest=None, drills=None, reserve=0, kind='work'):
    """One clock block: execution, rests, side changes, moves and setup, rounded UP to 30 s."""
    ids = ids or []
    items = [s['items'][j] for j in ids]
    if ramps is not None:
        ex_s = sum(x['execution_seconds'] for x in ramps)
        rest_s = sum(x['rest_after_seconds'] for x in ramps)
    else:
        ex_s = sum(i['execution_seconds'] for i in items) if execution is None else execution
        if rest is None:
            rest_s = sum(max(0, i['sets'] - 1) * i['rest_seconds'] for i in items) + max(0, len(items) - 1) * (items[0]['rest_seconds'] if items else 0)
        else:
            rest_s = rest
    parts = dict(execution=ex_s, rest=rest_s, side_changes=side_change, station_moves=moves,
                 setup_and_load_changes=setup, transition=transition, rehearsal=rehearsal,
                 rehearsal_rest=rehearsal_rest, recovery_before_next=finish, delay_reserve=reserve)
    raw = sum(parts.values())
    planned = math.ceil(raw / 30) * 30
    block = dict(name=name, kind=kind, item_indices=ids, ramps=ramps or [], drills=drills or [], detail=detail,
                 components_seconds=parts, rounding_buffer_seconds=planned - raw, total_seconds=planned)
    s['timeline'].append(block)
    return block


def ramp(s, name, loads, reps, rests, external=False):
    """Warm-up sets before a main lift; each rest follows its ramp, plate/belt changes are extra."""
    entries = [dict(load=ld, reps=r, execution_seconds=max(10, 4 * r), rest_after_seconds=t, unit='external_lb' if external else 'barbell_lb')
               for ld, r, t in zip(loads, reps, rests)]
    timed(s, name, ramps=entries, setup=30 + 15 * (len(entries) - 1), transition=15, kind='ramp',
          detail='Each rest follows that ramp, including the last rest before the first work set. Ramps never count as work sets.')


def superset(s, name, ids, detail, min_rest=60, rehearsal=0, rehearsal_rest=0):
    """Alternate two unrelated exercises. Each exercise rests while its partner works; extra
    round rest is added only if that would leave less than min_rest seconds."""
    items = [s['items'][j] for j in ids]
    rounds = max(i['sets'] for i in items)
    appearances = sum(i['sets'] for i in items)
    per_set = {id(i): i['execution_seconds'] / i['sets'] + (10 if i['per_side'] else 0) for i in items}
    partner = {id(i): sum(per_set[id(x)] for x in items if x is not i) + 2 * 15 for i in items}
    round_rest = max(0, math.ceil(max(min_rest - partner[id(i)] for i in items)))
    for i in items:
        i['superset_with'] = [x['exercise'] for x in items if x is not i]
        i['rest_seconds'] = int(round(partner[id(i)] + round_rest))
        i['rest_note'] = 'superset: partner set + moves' + (f' + {round_rest} s' if round_rest else '')
    timed(s, name, ids, execution=sum(i['execution_seconds'] for i in items), rest=(rounds - 1) * round_rest,
          side_change=sum(i['sets'] * 10 for i in items if i['per_side']), moves=(appearances - 1) * 15,
          setup=45, transition=15, rehearsal=rehearsal, rehearsal_rest=rehearsal_rest, kind='superset',
          detail=detail + (f' Add {round_rest} s after each round.' if round_rest else ' No extra rest needed: each exercise rests while its partner works (≥60 s).'))


# ---------------------------------------------------------------------------
# V2 rows reused for dip, bench, pull-up and squat (read-only source).
# ---------------------------------------------------------------------------
V2_MAIN = {}
for v2s in V2['sessions']:
    V2_MAIN[(v2s['week'], v2s['day'])] = [copy.deepcopy(i) for i in v2s['items']
                                          if i['family'] in ('press', 'vertical', 'lower')
                                          and not i['exercise'].startswith(('Strict OHP', 'Conventional'))]


def main_row(name, sets, reps, load, family, rir, purpose, external=False, cut='never_cut', protected=None, tags=()):
    """A main-lift work row with V3 rests."""
    rest = LOWER_REST if family == 'lower' else PRIORITY_REST
    return ex(name, sets, reps, load, family, rir, rest, tempo=4, purpose=purpose, cut=cut, protected=protected,
              unit='external_lb' if external else 'barbell_lb', tags=('main_lift', 'work_set') + tuple(tags),
              system_load=external, lower_strength=family == 'lower')


def from_v2(w, day, prefix, cut='never_cut', protected=None):
    """Copy V2 rows whose name starts with prefix, applying V3 rests."""
    rows = []
    for old in V2_MAIN[(w, day)]:
        if old['exercise'].startswith(prefix):
            rows.append(main_row(old['exercise'], old['sets'], old['reps'], old['load'], old['family'], old['rir'],
                                 old['purpose'], external=old['system_load'], cut=cut, protected=protected))
    # Brian's rule: never do an exercise for fewer than 2 sets. A lone single-set row (deload
    # weeks only) becomes 2 easy sets. Top-set + back-off pairs already total 2+ sets.
    if len(rows) == 1 and rows[0]['sets'] == 1:
        rows[0]['sets'] = 2
        rows[0]['protected_sets'] = 2
        rows[0]['purpose'] += ' (2-set minimum)'
    return rows


def main_block(s, rows, name, detail='Full rest between every work set (2:00–3:00 upper, 2:30–3:00 lower). No accessory work during priority rests.'):
    ids = [add(s, r) for r in rows]
    timed(s, name, ids, setup=15 if len(ids) > 1 else 0, transition=20, detail=detail)


# ---------------------------------------------------------------------------
# Session sections.
# ---------------------------------------------------------------------------

def warmup(s):
    """Session-specific preparation. Wed/Fri skip drills already done on the impact clock."""
    day = s['day']
    complex_drill = ('KB complex primer', '2 untimed rounds: 2 double-KB cleans + 1 press + 2 front squats, light 8–12 kg bells, ~30 s between rounds', 90)
    if day == 'sunday':
        drills = [('Brisk walk', '60 s', 60), ('Thoracic rotations', '6/side', 30), ('Scapular depressions', '5 × 3 s', 20),
                  ('Wall slides', '8', 30), ('Incline push-up rehearsal', '5 smooth reps', 20), ('Unloaded hip hinge', '5', 20)]
        setup = 30
    elif day == 'monday':
        drills = [('Brisk walk', '30 s', 30), ('Thoracic rotations', '6/side', 30), ('Gentle adductor rock-back', '5/side', 30),
                  ('Scapular pull-up', '5', 20), complex_drill]
        setup = 45
    elif day == 'wednesday':
        drills = [('Thoracic rotations', '6/side', 30), ('Wall slides', '8', 30), ('Brace-and-reach', '5 × 3 s', 20),
                  ('Unloaded compact torso turn', '4/side', 25)]
        setup = 30
    else:
        drills = [('Thoracic rotations', '6/side', 30), ('Gentle hip rock-back', '5/side', 30), ('Bodyweight squat', '5', 20),
                  ('Wall slides', '8', 30), ('Brace rehearsal', '3 × 5 s', 20)]
        # Week-12 Friday: no KB complex either (it includes a press right before the dip test).
        if s['week'] != 12:
            drills.append(complex_drill)
        setup = 45
    note = ('General prep (walk, ankle rocks, calf raises, marching, quarter-squats) was done on the impact clock and is not repeated. '
            'If impact was skipped, add a 60 s walk and 8 ankle rocks/side from the delay reserve. ') if day in ('wednesday', 'friday') else ''
    timed(s, 'Warm-up', execution=sum(d[2] for d in drills), rest=0, setup=setup, transition=15, kind='warmup',
          drills=[dict(exercise=a, dose=b, seconds=c) for a, b, c in drills],
          detail=note + 'Preparation only: no work-set or accessory credit. Wall slides live here and nowhere else.')


def power(s):
    """One explicit power exercise every lifting day (approved picks) — except week-12 Friday,
    which carries none: nothing goes in front of the dip and pull-up tests (amendment A3,
    re-confirmed by Brian Sep 24; approved exception E11)."""
    w, day = s['week'], s['day']
    if w == 12 and day == 'friday':
        return
    easy = w in EASY
    sets = 2 if easy else 4
    common = dict(power=True, work_set=False, cut='cut_first', protected=2, tags=('power',))
    if day == 'sunday':
        if w in BLOCK_A:
            row = ex('Plyometric push-up (hands leave the floor)', sets, 3, 'Bodyweight. Hands leave the floor by a few inches; land softly and rebound straight into the next rep.',
                     'power', 'fast intent, RPE ≤4', POWER_REST, tempo=3, purpose='Upper-body pushing speed for dips and bench; no leg demand after the long ride', unit='bodyweight', **common)
            row['fallback'] = 'Hands-elevated plyometric push-up on a bench, same sets and reps.'
            row['progression'] = 'After two crisp exposures: more flight height, then a clap, then a light vest (+5–10 lb) — one change at a time.'
        else:
            row = ex('Medicine-ball chest pass to a wall', sets, 3, 'Start with a 3–4 kg ball; throw hard from the chest, catch the rebound softly.',
                     'power', 'fast intent, RPE ≤4', POWER_REST, tempo=3, purpose='Upper-body pushing speed for dips and bench; no leg demand after the long ride', **common)
            row['fallback'] = 'Plyometric push-up, same sets and reps.'
            row['progression'] = 'After two crisp exposures: +1–2 kg ball.'
        if easy:
            row['load'] = 'Same familiar version, easy. ' + row['load']
            row['rir'] = 'RPE about 3'
        ix = add(s, row)
        timed(s, 'Daily power', [ix], setup=20, transition=20, rehearsal=15, rehearsal_rest=30, finish=45, kind='power',
              detail='One easy rehearsal set of 2, 30 s, then work sets with 60 s between; 45 s before the dip ramps.')
    elif day == 'monday':
        snatch = w in (7, 8, 9, 10, 11)
        if snatch:
            row = ex('One-arm kettlebell snatch (if gate met)', sets, 3, 'Start 12–16 kg. GATE: swings were crisp at the current bell for two exposures AND your snatch has no arm pull and a quiet lockout. If not, do two-hand swings 4×5 at your current bell instead.',
                     'power', 'fast intent, RPE ≤4', POWER_REST, side=True, tempo=3, purpose='Hip-extension speed finished overhead; complements the deadlift without extra heavy hinge volume', **common)
            row['fallback'] = 'Two-hand KB swing 4×5 at the current bell (fits the same block).'
            row['progression'] = 'After two crisp exposures: next bell size (4 kg step).'
            side_change = sets * 10
        else:
            row = ex('Two-hand kettlebell swing', sets, 5, 'A bell that allows a crisp, repeatable float at RPE ≤4 (likely 20–24 kg). Week 1: the first set selects the bell.',
                     'power', 'fast hip snap, RPE ≤4' if not easy else 'RPE about 3', POWER_REST, tempo=2,
                     purpose='Hip-extension speed that complements the deadlift without extra heavy hinge volume', **common)
            row['fallback'] = 'Light two-hand KB deadlift with a fast stand, same sets × 3; technique fallback, not a ballistic equivalent.'
            row['progression'] = 'After two crisp exposures: next bell size (4 kg step). Weeks 7–11 may move to the one-arm snatch if its gate is met.'
            side_change = 0
            if easy:
                row['load'] = 'Same familiar bell or lighter; no progression.'
        ix = add(s, row)
        timed(s, 'Daily power', [ix], side_change=side_change, setup=30, transition=20, finish=45, kind='power',
              detail='The KB complex in the warm-up is the rehearsal. 60 s between sets; 45 s before the pull-up ramps.')
    elif day == 'wednesday':
        reps = 2 if w == 12 else 3
        row = ex('Rotational medicine-ball scoop throw (to a wall)', sets, reps, 'Start with a 3 kg ball in a clear throwing area; compact pivot, no jump.' if not easy else 'Very light familiar ball; technique only, no progression.',
                 'power', 'fast intent, RPE ≤4' if not easy else 'RPE about 3', POWER_REST, side=True, tempo=8,
                 purpose='Rotational power; also dynamic rotation pattern #1 (low-to-high). One physical dose, two roles.',
                 dynamic_rotation=True, rotation_pattern='low_to_high', **common)
        row['tags'] = ['power', 'dynamic_rotation']
        row['fallback'] = 'Landmine rotational punch, same sets × reps per side, light; still counts as dynamic rotation. Use it if there is no ball or wall space.'
        row['progression'] = 'After two crisp exposures: +1–2 kg ball.'
        ix = add(s, row)
        timed(s, 'Daily power + dynamic rotation #1', [ix], side_change=sets * 15, setup=45, transition=20, rehearsal=16,
              rehearsal_rest=30, finish=45, kind='power',
              detail='Rehearsal 1 easy throw per side. Rep time includes reset and ball retrieval. 60 s after each pair; 45 s before the OHP ramps. Stop at any shoulder fatigue — heavy OHP is next.')
    else:
        reps = 2 if w == 12 else 3
        row = ex('Double-kettlebell clean (from the hang)', sets, reps, 'A pair that racks crisply and quietly (likely 2×16 kg). Week 1: the first set selects the pair.' if not easy else 'Same familiar pair or lighter; no progression.',
                 'power', 'fast intent, quiet rack, RPE ≤4' if not easy else 'RPE about 3', POWER_REST, tempo=3,
                 purpose='Full-body extension power after the plyo session; no landings', **common)
        row['fallback'] = 'Trap-bar jump, about 95–135 lb, same sets × reps (its landings count as moderate plyo contacts). If no trap bar: two-hand swing 4×5.'
        row['progression'] = 'After two crisp exposures: next bell size for both bells.'
        ix = add(s, row)
        timed(s, 'Daily power', [ix], setup=30, transition=20, finish=45, kind='power',
              detail='The KB complex in the warm-up is the rehearsal. 60 s between sets; 45 s before the next ramps.')


def main_lifts(s):
    """Priority and main lifts with explicit ramps."""
    w, day = s['week'], s['day']
    easy = w in EASY
    if day == 'sunday':
        ramp(s, 'Dip ramps', ['BW', 10] if easy else ['BW', 15, 30], [3, 2] if easy else [5, 3, 1], [45, 90] if easy else [45, 75, 120], external=True)
        dip_rows = from_v2(w, 'sunday', 'Weighted dip')
        if w == 11:
            # Coaching amendment A2 (approved by Brian, Sep 22): the six-rep ladder climbs in
            # even 2.5 lb steps into the +50x6 test, so week 11's back-offs are sixes, not fives.
            for r in dip_rows:
                if r['exercise'] == 'Weighted dip back-offs':
                    assert r['load'] == 47.5
                    r['reps'], r['reps_max'] = '6', 6
                    r['purpose'] = 'Last six-rep exposure before the +50×6 test, so the test is a 2.5 lb step like every other (amendment A2)'
        main_block(s, dip_rows, 'Dip work (fresh priority)')
        ramp(s, 'Bench ramps', [45, 95, 135] if easy else [45, 95, 135, 165], [5, 3, 1] if easy else [8, 5, 3, 1], [30, 60, 90] if easy else [30, 60, 90, 120])
        main_block(s, from_v2(w, 'sunday', 'Paused bench', cut='cut_second', protected=2), 'Paused bench work')
    elif day == 'monday':
        ramp(s, 'Pull-up ramps', ['BW'] if easy else ['BW', 15], [2] if easy else [3, 1], [60] if easy else [60, 90], external=True)
        main_block(s, from_v2(w, 'monday', 'Neutral-grip'), 'Pull-up work (fresh priority)')
        if easy:
            ramp(s, 'Deadlift ramps', [135, 225, 315], [5, 3, 1], [45, 60, 120])
            rows = [main_row('Conventional deadlift (light technique, C02)', 2, 2, 390, 'lower', '≥4 RIR', 'Weekly conventional practice at deload intensity (10 heavy + 2 light weeks)')]
        else:
            # The KB complex and swings already warm the hinge, so the ramps start at 225.
            ramp(s, 'Deadlift ramps', [225, 315, 385], [3, 1, 1], [60, 90, 120])
            rows = [main_row('Conventional deadlift top double', 1, 2, 450, 'lower', 'RPE 7–8 (2–3 RIR)', 'Maintain heavy conventional capacity at the fixed Monday slot'),
                    main_row('Conventional deadlift back-off double', 1, 2, 405, 'lower', '3–4 RIR', 'Second maintenance double at about 90% of the top set')]
        main_block(s, rows, 'Deadlift work')
        sets, reps, load = OHP_MON[w]
        ramp(s, 'Moderate OHP ramps', [45, 75] if easy else [75, 95], [5, 3] if easy else [3, 1], [45, 90] if easy else [60, 90])
        main_block(s, [main_row('Strict OHP (moderate)', sets, reps, load, 'press', '≥4 RIR' if easy else '3+ RIR', 'Second weekly OHP exposure: submaximal practice volume')], 'Moderate OHP work')
    elif day == 'wednesday':
        if w == 12:
            ramp(s, 'OHP test ramps', [45, 75, 95, 110, 120], [5, 3, 1, 1, 1], [45, 60, 90, 120, 180])
            main_block(s, [main_row('Strict OHP target test', 1, 2, 130, 'press', 'RPE ≤9 (≥1 RIR)', 'Goal test: 130×2 strict', tags=('test',))], 'OHP test',
                       detail='ONE target set. Stop before a grinding or invalid rep; no retry.')
        elif w == 6:
            ramp(s, 'OHP ramps', [45, 65, 85], [5, 3, 1], [45, 60, 120])
            main_block(s, [main_row('Strict OHP', 2, 2, 105, 'press', '≥4 RIR', 'Deload OHP practice')], 'OHP work (fresh priority)')
        else:
            top, back = OHP_WED[w]
            ramp(s, 'OHP ramps', [45, 75, 95, 110], [8, 5, 2, 1], [45, 60, 90, 150])
            main_block(s, [main_row('Strict OHP top double', 1, 2, top, 'press', '2–3 RIR (about RPE 7–8)', 'Heavy strict practice toward 130×2'),
                           main_row('Strict OHP back-off doubles', 4, 2, back, 'press', '2–3 RIR', 'Quality volume at about 96% of the top double')], 'OHP work (fresh priority)')
        if w != 12:
            ramp(s, 'Pull-up ramps', ['BW'] if easy else ['BW', 10], [2] if easy else [3, 1], [60] if easy else [60, 90], external=True)
            main_block(s, from_v2(w, 'wednesday', 'Neutral-grip'), 'Pull-up work')
    else:
        if w == 12:
            ramp(s, 'Dip test ramps', ['BW', 20, 35, 45], [3, 2, 1, 1], [60, 90, 120, 180], external=True)
            main_block(s, [main_row('Weighted dip target test', 1, 6, 50, 'press', '≥2 RIR, aim for 2', 'Goal test: +50×6', external=True, tags=('test',))], 'Dip test',
                       detail='ONE target set. Stop before a grinding or invalid rep; no retry.')
            timed(s, 'Passive recovery between tests', execution=0, rest=600, kind='recovery', detail='Ten minutes of rest before the pull-up ramps. If dips left real fatigue, the pull-up test may move to Sat Dec 26.')
            ramp(s, 'Pull-up test ramps', ['BW', 15, 30, 40], [3, 2, 1, 1], [60, 90, 120, 180], external=True)
            main_block(s, [main_row('Neutral-grip pull-up target test', 1, 5, 45, 'vertical', '≥2 RIR, aim for 2', 'Goal test: +45×5', external=True, tags=('test',))], 'Pull-up test',
                       detail='ONE target set. Stop before a grinding or invalid rep; no retry.')
            ramp(s, 'Squat ramps (after tests)', [95, 155], [3, 1], [60, 90])
            main_block(s, [main_row('Low-bar squat (easy, after tests)', 2, 2, 205, 'lower', '≥4 RIR', 'Keeps the squat pattern in test week without fatiguing the tests')], 'Squat work')
            return
        ramp(s, 'Squat ramps', [45, 135, 165] if easy else [45, 135, 185, 205], [5, 3, 1] if easy else [5, 3, 1, 1], [30, 60, 90] if easy else [30, 60, 90, 120])
        main_block(s, from_v2(w, 'friday', 'Low-bar'), 'Squat work (maintenance)')
        ramp(s, 'Dip ramps', ['BW'] if easy else ['BW', 15], [3] if easy else [3, 1], [60] if easy else [45, 75], external=True)
        main_block(s, from_v2(w, 'friday', 'Weighted dip'), 'Dip work')
        ramp(s, 'Pull-up ramps', ['BW'] if easy else ['BW', 10], [2] if easy else [3, 1], [60] if easy else [60, 90], external=True)
        main_block(s, from_v2(w, 'friday', 'Neutral-grip'), 'Pull-up work')


def secondary_press(s):
    """Friday-only: DB incline bench press. Brian, Sep 24 — Friday had only one press
    exercise (dip, at moderate reserve), so it had the most room for a second press
    movement. Skipped on week 12 (test day; main_lifts() already returned above).
    Adds the row but does NOT time it yet: accessories() supersets it with the
    single-leg RDL (push + single-leg hinge share rest, saving ~3 min of duplicated
    setup/transition versus two standalone blocks)."""
    w = s['week']
    s['_incline_ix'] = None
    if s['day'] != 'friday' or w not in INCLINE_WEEKS:
        return
    easy = w in EASY
    row = ex('Dumbbell incline bench press', 2, 8 if easy else '8–10',
             'First set picks a dumbbell pair for 8 strict reps at 2–3 RIR; after two comparable exposures at ≥3 RIR, go up the smallest available step.' if not easy else 'Same familiar dumbbells, lighter; no progression.',
             'press', '≥4 RIR' if easy else '2–3 RIR', ACC_REST, tempo=3,
             purpose='Second weekly press variation, added for upper-chest volume; secondary to paused bench, never the fresh slot',
             cut='cut_second', protected=0, tags=('accessory',))
    row['progression'] = ('Add the smallest dumbbell step after two comparable exposures at ≥3 RIR with normal shoulder/elbow response. '
                          'Hold if Friday squat or dip ramps felt slow.')
    row['fallback'] = 'Flat dumbbell bench press, same dose, if an incline bench is unavailable.'
    s['_incline_ix'] = add(s, row)


def arm_row(s, name, kind):
    """Direct arm exercise for size (biceps Sun/Wed, triceps Mon/Fri)."""
    easy = s['week'] in EASY
    alternating = name.startswith('Alternating')
    row = ex(name, 2 if easy else 3, '8–12' if easy else '8–15',
             'First set picks a load for ≥8 clean reps at target reserve; afterwards compare with the last normal appearance of this exact exercise.',
             kind, '≥4 RIR' if easy else '1–2 RIR (last set may reach 0–1)', ACC_REST, side=alternating, tempo=3,
             purpose=f'Direct {kind} hypertrophy; not counted toward compound pressing/pulling', cut='cut_first', protected=2,
             tags=('direct_arm', 'accessory'), direct_arm=kind)
    row['progression'] = ARM_GATE
    row['fallback'] = {'Rope pushdown': 'Straight-bar or V-bar pushdown, same dose.',
                       'Overhead cable triceps extension': 'Seated two-hand dumbbell overhead extension, same dose. No skull crushers.'}.get(name, 'Any familiar curl with the same implement type, same dose.')
    return row


def calf_row(s):
    """Monday straight-knee / Friday bent-knee calf work, varied by 3-week block."""
    w, day = s['week'], s['day']
    easy = w in EASY
    sets = 2 if easy else 3
    rir = '≥4 RIR' if easy else '3 RIR (week 1: 3–4)'
    if day == 'monday':
        if w in BLOCK_A:
            row = ex('One-leg dumbbell calf raise on a step', sets, '8–12', 'Hold a dumbbell on the working side, other hand on a rack; heel drops below the step.',
                     'calf', rir, 60, side=True, tempo=3.5, purpose='Straight-knee calf (gastrocnemius) strength and Achilles capacity to support sprinting',
                     cut='cut_first', protected=2, tags=('calf', 'accessory', 'unilateral'), calf=True, unilateral=True)
            row['fallback'] = 'Standing Smith-machine calf raise on a plate, 3×8–15.'
        else:
            row = ex('Standing barbell or Smith calf raise on a plate', sets, '8–15', 'Barbell on the back (or Smith), forefoot on a plate; choose a load for full, paused reps.',
                     'calf', rir, 60, tempo=3.5, purpose='Straight-knee calf (gastrocnemius) strength under heavier load',
                     cut='cut_first', protected=2, tags=('calf', 'accessory'), calf=True)
            row['fallback'] = 'Standing calf-raise machine, same dose.'
    else:
        if w in BLOCK_A:
            row = ex('Seated calf raise', sets, '12–20', 'Machine; first set picks a load for 12+ paused reps.',
                     'calf', rir, 60, tempo=3, purpose='Bent-knee calf (soleus) capacity for repeated sprint and jump contacts',
                     cut='cut_first', protected=2, tags=('calf', 'accessory'), calf=True)
            row['fallback'] = 'Seated dumbbell-on-knees calf raise, forefoot on a plate, same dose.'
        else:
            row = ex('Bent-knee calf raise with 3-s stretch pause', sets, '10–15', 'Seated machine or dumbbells on the knees; hold the bottom stretch 3 s every rep.',
                     'calf', rir, 60, tempo=5, purpose='Bent-knee calf (soleus) strength through the stretched range',
                     cut='cut_first', protected=2, tags=('calf', 'accessory'), calf=True)
            row['fallback'] = 'Seated calf raise, 3×12–20.'
    row['progression'] = CALF_GATE
    return row


def copenhagen_row(s):
    easy = s['week'] in EASY
    row = ex('Knee-supported short-lever Copenhagen', 3, 6, 'Bodyweight with hand/foot assistance as needed; stay short-lever.',
             'adductor', '≥4 RIR (more assistance)' if easy else '3+ RIR', ACC_REST, side=True, tempo=4,
             purpose='Mandatory adductor capacity; separate from the extra leg exercise', tags=('adductor', 'unilateral', 'lower_strength', 'accessory'),
             unilateral=True, lower_strength=True)
    row['progression'] = 'Keep the short lever at 3×6–8/side. The long lever is allowed only after three clean weeks and review — it is permission, not a calendar step.'
    row['fallback'] = 'Side-lying adductor lift with the top leg supported, same sets and reps.'
    return row


def accessories(s):
    """Rows, leg work, supersets, core and carries — every item timed separately."""
    w, day = s['week'], s['day']
    easy = w in EASY
    if day in ('sunday', 'wednesday'):
        sunday = day == 'sunday'
        name = 'One-arm chest-supported dumbbell row (incline bench)' if sunday else 'One-arm dumbbell row (bench-supported)'
        # Sunday gets one extra row set in every week that carries Friday's DB incline bench,
        # so the weekly press:pull ratio stays at 1.25 (≤1.30) instead of climbing to 1.33.
        row_sets = (2 if easy else 3) + (1 if sunday and w in INCLINE_WEEKS else 0)
        row = ex(name, row_sets, 8, 'First set picks a dumbbell for 8 strict reps at 2–3 RIR; after two comparable exposures at ≥3 RIR, go up one dumbbell step.',
                 'horizontal', '≥4 RIR' if easy else '2–3 RIR', ACC_REST, side=True, tempo=3,
                 purpose=('Horizontal pull with the chest supported, sparing the back after the long ride' if sunday else 'Free-weight horizontal pull; one left+right pair = one set'),
                 tags=('horizontal_pull', 'unilateral', 'accessory', 'work_set'), unilateral=True)
        row['fallback'] = 'One-arm chest-supported machine row or one-arm seated cable row, same dose.'
        i = add(s, row)
        timed(s, 'Row', [i], side_change=row['sets'] * 10, setup=45, transition=20, rehearsal=36, rehearsal_rest=45,
              detail='One light ramp of 6/side, 45 s, then work. 75 s after each left+right pair.')
    if day in ('monday', 'friday'):
        monday = day == 'monday'
        name = 'Dumbbell/kettlebell reverse lunge' if monday else 'Dumbbell/kettlebell single-leg RDL'
        leg = ex(name, 2, 4 if easy else 6, 'Bodyweight rehearsal, then the first set picks a load that meets reserve with full balance. Record implement and load.',
                 'leg_accessory', '≥5 RIR' if easy else '3–4 RIR', ACC_REST, side=True, tempo=4,
                 purpose=('Knee-dominant single-leg strength' if monday else 'Single-leg hinge strength after squats; light hand support allowed, free foot stays off the floor'),
                 tags=('leg_accessory', 'unilateral', 'lower_strength', 'accessory'), unilateral=True, lower_strength=True)
        leg['progression'] = LEG_GATE
        leg['fallback'] = ('Split-stance static lunge with hand support, same dose.' if monday else 'Kickstand (staggered-stance) dumbbell RDL, same dose.')
        i = add(s, leg)
        if not monday and s.get('_incline_ix') is not None:
            superset(s, 'Single-leg RDL + DB incline bench (superset)', [i, s['_incline_ix']],
                     detail='Round = single-leg RDL (both sides), then a DB incline set; repeat. A single-leg hinge and a chest press use different muscles, so they share rest instead of each needing its own recovery.',
                     rehearsal=30, rehearsal_rest=15)
        else:
            timed(s, 'Extra leg exercise', [i], side_change=leg['sets'] * 10, setup=30, transition=20, rehearsal=30, rehearsal_rest=15,
                  detail='Bodyweight rehearsal 3/side. 75 s after each left+right pair.')
        c = add(s, copenhagen_row(s))
        k = add(s, calf_row(s))
        superset(s, 'Copenhagen + calves (superset)', [c, k],
                 detail='Round = Copenhagen left, Copenhagen right, then one calf set; repeat. Put the calf station beside the Copenhagen bench.')
        arm_name = 'Rope pushdown' if monday else 'Overhead cable triceps extension'
        a = add(s, arm_row(s, arm_name, 'triceps'))
        if monday:
            p = ex('Pallof press', 2, 8, 'Lightest stable cable or band; pelvis and ribs stay still.', 'anti_rotation', '≥5 RIR' if easy else '3–4 RIR', 45,
                   side=True, tempo=3, purpose='Direct core: anti-rotation (not dynamic rotation)', cut='never_cut',
                   tags=('core', 'anti_rotation'), direct_abdominal=True)
            p['progression'] = CORE_GATE
            p['fallback'] = 'Band Pallof press anchored to a rack, same dose.'
            b = add(s, p)
            superset(s, 'Triceps + Pallof (superset)', [a, b], detail='Use one cable column (or a band for Pallof beside it). Round = pushdown set, Pallof left+right; repeat.')
        else:
            y = ex('Prone Y (incline bench)', 2, 12, 'Very light plates or dumbbells; lower traps do the work, no shrug.', 'shoulder', '4–5 RIR', 60, tempo=3,
                   purpose='Shoulder health (lower trapezius / upward rotation)', tags=('shoulder_health', 'accessory'), shoulder_health=True)
            y['fallback'] = 'Prone T/Y on the floor, same dose.'
            b = add(s, y)
            superset(s, 'Triceps + prone Y (superset)', [a, b], detail='Incline bench beside the cable column. Round = triceps set, prone Y set; repeat.')
    if day in ('sunday', 'wednesday'):
        sunday = day == 'sunday'
        curl = BICEPS[(w - 1) % 3][0 if sunday else 1]
        a = add(s, arm_row(s, curl, 'biceps'))
        if sunday:
            sh = ex('Cable external rotation', 2, 12, 'Lightest cable setting; elbow at the side.', 'shoulder', '4–5 RIR', 60, side=True, tempo=2,
                    purpose='Shoulder health (rotator cuff)', tags=('shoulder_health', 'accessory', 'unilateral'), shoulder_health=True, unilateral=True)
            sh['fallback'] = 'Band external rotation, same dose.'
        else:
            sh = ex('Face pull', 2, 12, 'Light rope setting; pull to the forehead with the elbows high.', 'shoulder', '4–5 RIR', 60, tempo=3,
                    purpose='Shoulder health (rear delts / external rotation)', tags=('shoulder_health', 'accessory'), shoulder_health=True)
            sh['fallback'] = 'Band face pull or reverse fly, same dose.'
        b = add(s, sh)
        superset(s, 'Biceps + shoulder health (superset)', [a, b], detail='Round = curl set, shoulder set; repeat. The third curl set follows the second shoulder set.')
    # Core
    if day == 'friday':
        t = ex('Landmine rotation', 2, 6, 'Light lever you can control; smooth pivot, comfortable range.', 'dynamic_rotation', '≥5 RIR' if easy else '4 RIR', 60,
               side=True, tempo=3, purpose='Direct core + dynamic rotation pattern #2 (high-to-low)', cut='never_cut',
               tags=('core', 'dynamic_rotation'), direct_abdominal=True, dynamic_rotation=True, rotation_pattern='high_to_low')
        t['fallback'] = 'High-to-low cable chop, same dose.'
        t['progression'] = CORE_GATE
        i = add(s, t)
        timed(s, 'Core: landmine rotation', [i], side_change=t['sets'] * 10, setup=45, transition=15, rehearsal=20,
              detail='Two gentle rehearsal reps/side, then work; 60 s after each pair.')
    elif day in ('sunday', 'wednesday'):
        name = ('Ab wheel', 'Hanging leg raise') if w in BLOCK_A else ('Hollow-body hold', 'Body saw')
        name = name[0] if day == 'sunday' else name[1]
        hold = name == 'Hollow-body hold'
        reps = ('15 s' if easy else '20 s') if hold else (6 if easy else 8)
        t = ex(name, 2, reps, 'Bodyweight; shorten the range or lever to meet reserve.', 'abs',
               ('~10 s of good position left' if hold else ('≥5 RIR' if easy else '3 RIR')), 60, tempo=3,
               purpose='Direct abdominal work; stable three-week block', cut='never_cut', tags=('core',), direct_abdominal=True,
               execution_seconds=2 * (15 if easy else 20) if hold else 2 * reps * 3)
        t['fallback'] = {'Hanging leg raise': 'Bent-knee hanging raise.', 'Body saw': 'Short-range ab wheel if no sliding surface.',
                         'Ab wheel': 'Kneeling short-range rollout.', 'Hollow-body hold': 'Tucked hollow hold.'}[name]
        t['progression'] = CORE_GATE
        i = add(s, t)
        timed(s, 'Core', [i], setup=30, transition=15, detail='60 s between sets.')
    # Carries
    if day in ('sunday', 'wednesday'):
        sunday = day == 'sunday'
        c = ex('Farmer carry' if sunday else 'Suitcase carry', 2, '20 m', 'Heaviest bells that allow another 20 m with unchanged posture' + ('; lighter this week.' if easy else '.'),
               'carry', 'easy; no posture loss', 60, side=not sunday, tempo=0, purpose='Grip and trunk stiffness; suitcase = anti-lateral flexion, not rotation',
               tags=('carry',), carry=True, execution_seconds=2 * (25 if sunday else 50))
        c['fallback'] = 'Dumbbells instead of kettlebells, same distance.'
        c['progression'] = 'Keep 2×20 m. Add the smallest load step after two easy exposures with no cost to Monday grip or Wednesday recovery.'
        i = add(s, c)
        timed(s, 'Carry', [i], side_change=20 if not sunday else 0, setup=30, transition=15, detail='60 s between sets' + (' (each set = left then right).' if not sunday else '.'))


def objective(w, day):
    """One-line purpose of the session."""
    if w == 12:
        return {'sunday': 'Deload before testing: easy dips and bench (≥4 RIR), rows, biceps, core, carry.',
                'monday': 'Easy day before the OHP test: light pull-ups, light deadlift (C02), OHP technique, easy accessories — everything at ≥4 RIR.',
                'wednesday': 'OHP TEST DAY: 130×2 strict at RPE ≤9, then easy rows, biceps, core and carry. No dips or pull-ups.',
                'friday': 'DIP AND PULL-UP TEST DAY: +50×6 and +45×5 at ≥2 RIR, then easy squat and accessories.'}[day]
    base = {'sunday': 'Fresh dip priority, paused bench, one-arm chest-supported rows; biceps for size. Starts ≥6 h after the long ride ends.',
            'monday': 'Fresh pull-up priority, conventional deadlift maintenance, moderate OHP; lunges, Copenhagen, calves and triceps.',
            'wednesday': 'Impact first (≤15 min). Fresh heavy OHP priority, pull-ups, one-arm rows; biceps for size.',
            'friday': 'Impact and sprints first. Low-bar squat maintenance, dips, DB incline bench, pull-ups; single-leg RDL, Copenhagen, calves and triceps.'}[day]
    return ('DELOAD: about half the sets, 10–15% lighter, ≥4 RIR. ' + base) if w == 6 else base


def build_session(w, day):
    s = dict(id=f'week_{w:02d}_{day}', week=w, day=day, date=session_date(w, day).isoformat(), phase=PHASE[w],
             objective=objective(w, day), items=[], timeline=[], actual_performance='not yet performed')
    s['sequencing_rule'] = seq_text(w, day)
    s['cut_rule'] = cut_text(w, day)
    warmup(s)
    power(s)
    main_lifts(s)
    secondary_press(s)
    accessories(s)
    s.pop('_incline_ix', None)
    timed(s, 'Delay reserve', execution=0, rest=0, reserve=300, kind='reserve',
          detail='Unallocated time for crowded equipment, longer priority rests (up to 3:00) or logging. Never filled with extra sets.')
    s['total_seconds'] = sum(b['total_seconds'] for b in s['timeline'])
    s['minutes'] = s['total_seconds'] / 60
    # Worst case: every priority (upper) work rest runs to the 3:00 maximum.
    extra = 0
    for b in s['timeline']:
        if b['kind'] == 'work':
            for j in b['item_indices']:
                it = s['items'][j]
                if it['family'] in ('press', 'vertical') and it['rest_seconds'] == PRIORITY_REST:
                    extra += max(0, it['sets'] - 1) * (MAX_PRIORITY_REST - PRIORITY_REST)
            if len(b['item_indices']) > 1 and s['items'][b['item_indices'][0]]['family'] in ('press', 'vertical'):
                extra += (len(b['item_indices']) - 1) * (MAX_PRIORITY_REST - PRIORITY_REST)
    s['max_rest_extra_seconds'] = extra
    s['total_seconds_if_max_rests'] = s['total_seconds'] + extra
    return s


# ---------------------------------------------------------------------------
# Impact sessions (Wednesday ≤15 min hard; Friday ~30 min target).
# ---------------------------------------------------------------------------

def impact_record(w, day):
    plan = IMPACT[w]['wed' if day == 'wednesday' else 'fri']
    r = dict(id=f'week_{w:02d}_{day}_impact', week=w, day=day, date=session_date(w, day).isoformat(), phase=PHASE[w],
             cap_seconds=900 if day == 'wednesday' else 1800, cap_type='hard' if day == 'wednesday' else 'target',
             events=[], low=0, moderate=0, high=0)

    def ev(name, dose, seconds, **extra):
        r['events'].append(dict(name=name, dose=dose, seconds=seconds, **extra))

    ev('Preparation (general warm-up, counted here once)', '60 s walk; ankle rocks 8/side; calf raises 8; march 10 steps/side; 5 quarter-squats; readiness check', 180)
    sets, reps = plan['low']
    low_name = 'Pogo jumps (bilateral)' if day == 'wednesday' else 'Forward-back line hops (bilateral)'
    ev(low_name, f'{sets}×{reps}; 20 s between sets', sets * reps + (sets - 1) * 20 + 15, tier='low', contacts=sets * reps)
    r['low'] = sets * reps
    if 'mod' in plan:
        sets, reps = plan['mod']
        if day == 'wednesday':
            ev('Low-hurdle hops (15–20 cm, bilateral)', f'{sets}×{reps}; 30 s between sets; 30 s setup', int(sets * reps * 1.5) + (sets - 1) * 30 + 30, tier='moderate', contacts=sets * reps)
        else:
            ev('Submaximal broad jumps (~75%) in doubles', f'{sets} sets × 2 jumps (jump, reset, jump); 30 s between sets', sets * 2 * 4 + (sets - 1) * 30 + 15, tier='moderate', contacts=sets * reps)
        r['moderate'] = sets * reps
    if 'high' in plan:
        kind, per_set = plan['high']
        n = sum(per_set)
        if kind == 'depth':
            ev('Low depth jumps (30 cm box, rebound to max height, stick)', f"sets of {'/'.join(map(str, per_set))}; 60 s before the first set, 90 s between sets",
               60 + n * 8 + (len(per_set) - 1) * 90 + 30, tier='high', contacts=n)
        else:
            ev('Maximal standing broad jumps (singles)', f'{n} singles; 60 s before the first, 90 s between; measure only if you want to — not a test',
               60 + n * 10 + (n - 1) * 90, tier='high', contacts=n)
        r['high'] = n
    if 'run' in plan:
        reps, dist, terrain, effort, rest = plan['run']
        ev('Gentle pre-sprint adductor squeeze', '3×20 s, 20 s between; ~20–30% effort', 100)
        ev('Sprint setup', 'Measured route, clear runout and a gradual stop; no extra accelerations', 30)
        ev('Accelerations with equal-distance easy runout', f'{reps}×{dist} m on {terrain}, {effort}; {rest} s after each runout before the next rep',
           reps * 12 + (reps - 1) * rest, run_reps=reps, run_distance=dist, rest_seconds=rest)
        r.update(run_reps=reps, run_distance=dist, terrain=terrain, effort=effort, run_rest_seconds=rest,
                 acceleration_m=reps * dist, runout_m=reps * dist)
    else:
        r.update(run_reps=0, run_distance=0, terrain='none', effort='', run_rest_seconds=0, acceleration_m=0, runout_m=0)
    ev('Transitions', 'Moving between drills, markers and measuring', 30 if day == 'wednesday' else 45)
    r['total_seconds'] = sum(e['seconds'] for e in r['events'])
    r['rules'] = ('Plyo and sprints come before lifting, never after a hard ride or tiring lifting. Progress only after two tolerated exposures with normal next mornings. '
                  'If today is cut short, log the actual contacts and metres; a cut session never qualifies the next stage. No make-up impact after lifting or on Saturday. '
                  'Contact counting: each ground contact = 1; a bilateral landing = 1; per-leg work counts per leg (none prescribed).')
    return r


# ---------------------------------------------------------------------------
# Rendering.
# ---------------------------------------------------------------------------

def load_text(i):
    if isinstance(i['load'], (int, float)):
        if i['system_load']:
            return f"+{fmt(i['load'])} lb added (≈{fmt(EXAMPLE_BW + i['load'])} lb system at 170 BW)"
        return f"{fmt(i['load'])} lb"
    return i['load']


def render_impact(r):
    cap = f"{r['cap_seconds'] // 60}-minute {'hard limit' if r['cap_type'] == 'hard' else 'target (not a hard limit)'}"
    out = [f"**Impact session — {cap}; travel is not budgeted.** Planned: {mm(r['total_seconds'])}.",
           '| Order | Activity | Dose and rest | Seconds |', '|---|---|---|---|']
    for n, e in enumerate(r['events'], 1):
        out.append(f"| {n} | {e['name']} | {e['dose']} | {e['seconds']} |")
    run = f" **Sprints:** {r['acceleration_m']} m of accelerations + {r['runout_m']} m easy runout." if r['run_reps'] else ''
    out += ['', f"**Contacts:** low {r['low']}, moderate {r['moderate']}, high {r['high']}.{run}", '', r['rules'], '', '**Tissue check:** ' + TISSUE_GATE]
    return out[0] + '\n\n' + '\n'.join(out[1:])


def render_session(s, impacts):
    w, day = s['week'], s['day']
    d = date.fromisoformat(s['date'])
    out = [f"### Week {w} — {day.title()}, {d.strftime('%b')} {d.day}, {d.year} ({s['phase']})", f"**Objective:** {s['objective']}"]
    imp = next((r for r in impacts if r['week'] == w and r['day'] == day), None)
    if imp:
        out.append(render_impact(imp))
    elif day == 'sunday':
        out.append('**No impact today.** Start at least 6 hours after the long ride actually ends.')
    else:
        out.append('**No impact today.**')
    if w == 1 and day == 'wednesday':
        out.append('**' + OHP_ANCHOR.split(':')[0] + ':**' + OHP_ANCHOR.split(':', 1)[1])
    if day == 'monday' and w in (7, 8, 9, 10, 11):
        out.append('**' + PULLUP_NOTE.split(':')[0] + ':**' + PULLUP_NOTE.split(':', 1)[1])
    if w == 12 and day in ('wednesday', 'friday'):
        out.append('**' + TEST_RULES.split(':')[0] + ':**' + TEST_RULES.split(':', 1)[1])
    if w == 12 and day == 'friday':
        out.append('**Named exception:** Wednesday counts as an easy day for dips and pull-ups (no dip or pull-up work that day) even though it holds the OHP test.')
    table = ['| # | Exercise | Sets × reps | Load / how to choose it | Reserve | Rest | Purpose | Cut |', '|---|---|---|---|---|---|---|---|']
    for n, i in enumerate(s['items'], 1):
        rest = f"≈{i['rest_seconds']} s (superset)" if i.get('rest_note') else f"{i['rest_seconds']} s" + (' after each L+R pair' if i['per_side'] else '')
        cut = i['cut_priority'].replace('_', ' ') + ('' if i['cut_priority'] == 'never_cut' else (' (skip the whole exercise — never just 1 set)' if i['protected_sets'] == 0 else f" (keep at least {i['protected_sets']})"))
        rir = i['rir'] if any(c.isalpha() for c in i['rir']) else i['rir'] + ' RIR'
        table.append(f"| {n} | {i['exercise']} | {i['sets']}×{i['reps']}{' /side' if i['per_side'] else ''} | {load_text(i)} | {rir} | {rest} | {i['purpose']} | {cut} |")
    clock = ['', '**Strength clock** (every block counted once; m:ss):', '| Start–end | Block | What happens | Seconds |', '|---|---|---|---|']
    at = 0
    for b in s['timeline']:
        what = ''
        if b['drills']:
            what = '; '.join(f"{x['exercise']} {x['dose']}" for x in b['drills']) + '. '
        if b['ramps']:
            what = '; '.join(f"{('+' if x['unit'] == 'external_lb' and x['load'] != 'BW' else '')}{fmt(x['load'])}×{x['reps']} → {x['rest_after_seconds']} s" for x in b['ramps']) + '. '
        arith = ' + '.join(f"{v} {k.replace('_', ' ')}" for k, v in b['components_seconds'].items() if v)
        if b['rounding_buffer_seconds']:
            arith += f" + {b['rounding_buffer_seconds']} rounding"
        clock.append(f"| {mm(at)}–{mm(at + b['total_seconds'])} | {b['name']} | {what}{b['detail']} | {arith} = {b['total_seconds']} |")
        at += b['total_seconds']
    clock.append(f"\n**Planned strength total: {mm(at)} ({at / 60:g} min) including the 5-minute delay reserve — limit 75:00.** "
                 f"If every OHP/dip/pull-up/bench rest runs to 3:00, add {mm(s['max_rest_extra_seconds'])} → {mm(s['total_seconds_if_max_rests'])}"
                 + (' (still inside 75:00).' if s['total_seconds_if_max_rests'] <= 4500 else ' — take it from the delay reserve and drop cut-first sets.'))
    rules = []
    fb = [f"- **{i['exercise']}:** {i['fallback']}" for i in s['items'] if i.get('fallback')]
    rules.append('**Fallbacks:**\n' + '\n'.join(fb))
    rules += ['**Load rules:** ' + LOAD_GATE, '**' + REST_RULE.split(':')[0] + ':**' + REST_RULE.split(':', 1)[1], '**Power rules:** ' + POWER_GATE]
    power_item = next((i for i in s['items'] if i['power']), None)
    if power_item:
        rules.append(f"**Power progression ({power_item['exercise']}):** {power_item['progression']}")
    else:
        rules.append('**Power today:** none — week-12 Friday is a test day and nothing goes in front of the tests (approved exception E11).')
    rules.append('**Arm rules:** ' + ARM_GATE)
    if day in ('monday', 'friday'):
        rules += ['**Calf rules:** ' + CALF_GATE, '**Leg rules:** ' + LEG_GATE]
    rules += ['**Core rules:** ' + CORE_GATE, '**Sequencing:** ' + s['sequencing_rule'], '**Cuts:** ' + s['cut_rule'], '**Fatigue and changes:** ' + FATIGUE,
              '**Log:** sets/reps/load (and system load for dips/pull-ups), RIR, technique, bar speed (crisp/normal/grindy) on the last priority set; power load and quality; '
              'actual strength and impact time; contacts and sprint metres; next-morning adductor/calf/Achilles check; morning bodyweight; rides completed.']
    return '\n\n'.join(out) + '\n\n' + '\n'.join(table) + '\n' + '\n'.join(clock) + '\n\n' + '\n\n'.join(rules) + '\n'


# ---------------------------------------------------------------------------
# Build everything.
# ---------------------------------------------------------------------------
sessions = [build_session(w, day) for w in range(1, 13) for day in DAYS]
impacts = [impact_record(w, day) for w in range(1, 13) for day in ('wednesday', 'friday')]

weekly = []
for w in range(1, 13):
    ss = [s for s in sessions if s['week'] == w]
    rows = [i for s in ss for i in s['items']]
    count = lambda fam: sum(i['sets'] for i in rows if i['family'] == fam and i['work_set'])
    days_with = lambda pred: [s['day'] for s in ss if any(pred(i) for i in s['items'])]
    imps = [r for r in impacts if r['week'] == w]
    a = dict(week=w, phase=PHASE[w], press=count('press'), vertical=count('vertical'), horizontal=count('horizontal'),
             biceps_sets=sum(i['sets'] for i in rows if i['direct_arm'] == 'biceps'),
             triceps_sets=sum(i['sets'] for i in rows if i['direct_arm'] == 'triceps'),
             calf_sets=sum(i['sets'] for i in rows if i['calf']),
             leg_accessory_sets=sum(i['sets'] for i in rows if i['family'] == 'leg_accessory'),
             copenhagen_sets=sum(i['sets'] for i in rows if i['family'] == 'adductor'),
             power_sets=sum(i['sets'] for i in rows if i['power']),
             carry_days=days_with(lambda i: i['carry']), core_days=days_with(lambda i: i['direct_abdominal']),
             shoulder_days=days_with(lambda i: i['shoulder_health']), power_days=days_with(lambda i: i['power']),
             unilateral_days=days_with(lambda i: i['per_side'] and not i['power'] and not i['shoulder_health'] and i['work_set'] and i['family'] not in ('anti_rotation', 'dynamic_rotation', 'carry')),
             lower_strength_days=days_with(lambda i: i['lower_strength']),
             dynamic_rotation_patterns=sorted({i['rotation_pattern'] for i in rows if i['dynamic_rotation']}),
             contacts=dict(low=sum(r['low'] for r in imps), moderate=sum(r['moderate'] for r in imps), high=sum(r['high'] for r in imps)),
             acceleration_m=sum(r['acceleration_m'] for r in imps), runout_m=sum(r['runout_m'] for r in imps),
             max_strength_minutes=max(s['minutes'] for s in ss),
             impact_minutes={r['day']: round(r['total_seconds'] / 60, 2) for r in imps})
    a['ratio'] = round(a['press'] / (a['vertical'] + a['horizontal']), 3)
    weekly.append(a)

# Week-13 makeup: deferred tests only, Saturday, December 26, 2026.
by_name = {(s['week'], s['day']): s for s in sessions}
w12w, w12f = by_name[(12, 'wednesday')], by_name[(12, 'friday')]


def test_blocks(sess, label):
    blocks = [copy.deepcopy(b) for b in sess['timeline'] if b['name'] in (label + ' test ramps', label + ' test')]
    item = copy.deepcopy(sess['items'][blocks[-1]['item_indices'][0]])
    for b in blocks:
        b.pop('item_indices', None)
    return dict(name=label, item=item, blocks=blocks, total_seconds=sum(b['total_seconds'] for b in blocks))


deferred = dict(week=13, date='2026-12-26', day='saturday', counts_toward_48=False, deadlift_exposures=0,
                easy_days_before=['2026-12-24 (Thursday recovery ride)', '2026-12-25 (no training)'],
                note='Deferred tests only. This one Saturday overrides the usual Saturday rest.',
                warmup_seconds=300, inter_test_recovery_seconds=600, delay_reserve_seconds=300,
                tests=[test_blocks(w12w, 'OHP'), test_blocks(w12f, 'Dip'), test_blocks(w12f, 'Pull-up')], variants=[])
for mask in range(1, 8):
    chosen = [x for n, x in enumerate(deferred['tests']) if mask & (1 << n)]
    total = 300 + sum(x['total_seconds'] for x in chosen) + 600 * (len(chosen) - 1) + 300
    deferred['variants'].append(dict(tests=[x['name'] for x in chosen], total_seconds=total))

approved_exceptions = [
    dict(id='E1', rule='Normal-week press/pull floors', exception='Weeks 6 and 12 use reduced volume (C09).'),
    dict(id='E2', rule='Heavy deadlift every week', exception='12 Monday exposures: 10 heavy (top double + back-off) and 2 light at 390 in weeks 6/12 (C01/C02).'),
    dict(id='E3', rule='≤15% weekly increase per plyo tier', exception='Named high-tier entry dose of 12 in week 5 and restoration after the week-6 deload (week 7: low 40→70, moderate 0→26, high 0→12), never above the last tolerated dose (C04).'),
    dict(id='E4', rule='Test standard', exception='OHP success = 130×2 at RPE ≤9 (≥1 RIR) — Brian, Sep 23; dips/pull-ups ≥2 RIR (C07/C08).'),
    dict(id='E5', rule='Two easy days before each test session', exception='Week-12 Wednesday (OHP test, no dip/pull-up work) counts as an easy day for Friday’s dip and pull-up tests.'),
    dict(id='E6', rule='Saturday rest', exception='Saturday, Dec 26 week-13 makeup, deferred tests only.'),
    dict(id='E7', rule='Full priority rest (v3.0)', exception='Brian, Sep 23: priority rests 2:00–3:00, squat/deadlift 2:30–3:00.'),
    dict(id='E8', rule='Friday impact 15-minute cap (v3.0)', exception='Brian, Sep 23: Friday ~30 min target, not a hard limit; travel not budgeted. Wednesday stays ≤15 min.'),
    dict(id='E9', rule='Exercise exclusions (v3.0)', exception='Brian, Sep 23: dumbbell row and cable row allowed.'),
    dict(id='E10', rule='Pull-up work every Wednesday', exception='Week 12 Wednesday has no pull-ups so Friday’s test is fresh; the OHP test is the day’s major lift.'),
    dict(id='E11', rule='Explicit power every lifting day', exception='Week-12 Friday has no power work and no KB complex: nothing goes in front of the dip and pull-up tests (amendment A3; Brian, Sep 24).'),
]

data = dict(
    version='v3_review_draft', prompt_version='3.0 (Sep 23, 2026; truncated after §17 "Scope" — remainder ruled irrelevant by Brian)',
    source_versions=dict(v2='synthesis_v2_review_draft (Sep 21, 2026)', v1='synthesis_v1_review_draft (Sep 20, 2026)', conflict_resolutions='C01–C10 (approved Sep 20)'),
    approval_scope='Design decisions approved by Brian on Sep 23, 2026 (V3_REVISION_PROPOSAL.md). The finished plan itself is NOT approved.',
    status='ready_for_review (set after verification)', start_date=START.isoformat(), example_bodyweight_lb=EXAMPLE_BW,
    load_units=dict(barbell_lb='total barbell load in lb', external_lb='added load in lb (dips/pull-ups); system load = morning bodyweight + added',
                    bodyweight='bodyweight only', selection_rule='chosen by the stated rule; log the actual load', kg_per_bell='kettlebells in kg per bell'),
    rules=dict(load=LOAD_GATE, rest=REST_RULE, power=POWER_GATE, arms=ARM_GATE, calves=CALF_GATE, legs=LEG_GATE,
               core=CORE_GATE, tissue=TISSUE_GATE, fatigue_and_changes=FATIGUE, sequencing=SEQ, cuts=CUTS,
               cuts_deload=CUTS_DELOAD, cuts_test=CUTS_TEST, sequencing_test=SEQ_TEST,
               tests=TEST_RULES, ohp_anchor=OHP_ANCHOR, pullup_longer_set=PULLUP_NOTE),
    tier_targets={str(k): dict(low=v[0], moderate=v[1], high=v[2]) for k, v in TIER_TARGET.items()},
    approved_exceptions=approved_exceptions, sessions=sessions, impact_sessions=impacts, weekly_audit=weekly,
    deferred_testing=deferred, completed_history=dict(note='Logged training goes here. Never overwritten by future prescriptions.', sessions=[]),
    verification=dict(status='pending'))
(ROOT / 'SYNTHESIZED_PRESCRIPTIONS_V3.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

INTRO = ('# Weekly session cards — V3 review draft\n\n'
         'Ready for review, not approved. All loads and times are planned, not performed. Barbell loads are total pounds; dip/pull-up loads are ADDED pounds '
         '(system load = your morning bodyweight + added). Ramps and power sets never count as work sets. One left+right pair of a one-arm/one-leg exercise = one set; '
         'time always includes both sides. Strength sessions: 75-minute hard limit, 5-minute delay reserve included. Wednesday impact: 15-minute hard limit. '
         'Friday impact: ~30-minute target. Travel is not budgeted. See the [training block](SYNTHESIZED_TRAINING_BLOCK_V3.md) and [verification](SYNTHESIS_VERIFICATION_V3.md).\n\n')
weeks = []
for w in range(1, 13):
    body = f"## Week {w} — {PHASE[w]} (starts {pretty(START + timedelta(days=7 * (w - 1)))})\n\n" + '\n\n'.join(render_session(s, impacts) for s in sessions if s['week'] == w)
    weeks.append(body)
    (CARD_DIR / f'week_{w:02d}.md').write_text(INTRO.replace('](SYNTH', '](../SYNTH') + body)
(ROOT / 'SYNTHESIZED_WEEKLY_CARDS_V3.md').write_text(INTRO + '\n\n'.join(weeks))

# Week-13 file
lines = ['# Week 13 makeup — deferred tests only (Saturday, December 26, 2026)\n',
         'Review draft. This is not a training week and not part of the 48 sessions. Only a test that was NOT attempted in week 12 is eligible. '
         'A failed or grinding week-12 attempt is not retried. No deadlift, no impact, no accessories.\n',
         '**Easy days before:** Thursday, Dec 24 (recovery ride, make it easy) and Friday, Dec 25 (no training). Normal tissue status and no red domain are required. '
         'This one Saturday overrides the usual Saturday rest. Record results as **week 13**, not week 12.\n',
         '**Order:** OHP → dip → pull-up, remaining tests only. 10 minutes of rest after each attempted test. If only one test remains, it gets the fresh first slot.\n',
         '**Warm-up (5:00):** 60 s walk; 8 wall slides; 6 thoracic rotations/side; 5 scapular depressions; 3 brace-and-reach holds; 60 s setup.\n',
         '| Test | Ramps (each followed by its rest) | Target set | Standard | Block time |', '|---|---|---|---|---|']
std = {'OHP': 'Strict: no knee or hip drive, settled start, full lockout; RPE ≤9',
       'Dip': 'Elbows below 90°, controlled lockout, no bounce; ≥2 RIR',
       'Pull-up': 'Neutral handles, dead hang, chin clearly over; ≥2 RIR'}
for t in deferred['tests']:
    rp = t['blocks'][0]['ramps']
    rtxt = '; '.join(f"{('+' if x['unit'] == 'external_lb' and x['load'] != 'BW' else '')}{fmt(x['load'])}×{x['reps']} → {x['rest_after_seconds']} s" for x in rp)
    it = t['item']
    lines.append(f"| {t['name']} | {rtxt} | {it['sets']}×{it['reps']} at {load_text(it)} | {std[t['name']]} | {mm(t['total_seconds'])} |")
lines += ['', '**Planned totals (5:00 warm-up + tests + 10:00 between tests + 5:00 reserve):**', '| Remaining tests | Total |', '|---|---|']
for v in deferred['variants']:
    lines.append(f"| {' → '.join(v['tests'])} | {mm(v['total_seconds'])} |")
lines += ['', '**Log:** date, why the test was deferred, the two easy days, load/reps/technique/RPE, elapsed time. Unfinished results stay unverified.']
(ROOT / 'WEEK_13_DEFERRED_TESTS_V3.md').write_text('\n'.join(lines) + '\n')

summary = dict(sessions=len(sessions), exercise_rows=sum(len(s['items']) for s in sessions),
               minutes={s['id']: s['minutes'] for s in sessions},
               max_minutes=max(s['minutes'] for s in sessions),
               max_minutes_if_max_rests=max(s['total_seconds_if_max_rests'] for s in sessions) / 60,
               impact_minutes={r['id']: round(r['total_seconds'] / 60, 2) for r in impacts})
(ROOT / 'v3_work' / 'build_summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(dict(sessions=summary['sessions'], rows=summary['exercise_rows'], max_minutes=summary['max_minutes'],
                      max_if_max_rests=round(summary['max_minutes_if_max_rests'], 2),
                      normal_week_2=[s['minutes'] for s in sessions if s['week'] == 2],
                      week_7=[s['minutes'] for s in sessions if s['week'] == 7],
                      week_6=[s['minutes'] for s in sessions if s['week'] == 6],
                      week_12=[s['minutes'] for s in sessions if s['week'] == 12],
                      impact_max={d: max(r['total_seconds'] for r in impacts if r['day'] == d) / 60 for d in ('wednesday', 'friday')}), indent=1))
