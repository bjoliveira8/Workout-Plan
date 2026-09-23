/* Builds docs/12-week-concurrent-block-v4.md from the vendored source narrative.
 *
 *   node tools/gen-block-doc.mjs
 *
 * The source document is used as written — its tables and its sections are the author's
 * and are not rewritten here. This script only:
 *   1. prepends a §0 recording provenance, status and what this repo verified independently,
 *   2. rewrites links to point at the vendored copies in docs/source/,
 *   3. cross-checks the source's own verification tables against the prescription JSON the
 *      app actually runs on, and REFUSES to write the document if they disagree.
 *
 * Step 3 matters: the document and the tracker must never drift apart. If this script
 * fails, do not hand-edit around it — find out which of the two is wrong.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
/* The app does NOT run the source plan unmodified — tools/gen-program.mjs applies a
   documented set of coaching amendments on top of it. Read the generated program so
   this document reports what is actually prescribed, not what the source said. */
import { SESSIONS as APP_SESSIONS, AUDIT as APP_AUDIT, META as APP_META } from "../src/program.js";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const rawJson = readFileSync(ROOT + "docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json", "utf8");
const src = JSON.parse(rawJson);
const jsonHash = createHash("sha256").update(rawJson).digest("hex");
let doc = readFileSync(ROOT + "docs/source/SYNTHESIZED_TRAINING_BLOCK_V2.md", "utf8");
const verif = readFileSync(ROOT + "docs/source/SYNTHESIS_VERIFICATION_V2.md", "utf8");

const DAYS = ["Sunday", "Monday", "Wednesday", "Friday"];
const problems = [];

/* ── cross-check 1: the verification's minute sums vs the sessions the app runs ──
   Rows look like:  | 1 | 4+6+6+11.5+... = **68.5** | ... one bolded total per day. */
const minRows = [...verif.matchAll(/^\|\s*(\d{1,2})\s*\|((?:[^|]*\*\*[\d.]+\*\*[^|]*\|){4})/gm)];
if (minRows.length !== 12) problems.push(`verification time table: ${minRows.length} rows, expected 12`);
for (const m of minRows) {
  const w = +m[1];
  const totals = [...m[2].matchAll(/\*\*([\d.]+)\*\*/g)].map((x) => parseFloat(x[1]));
  DAYS.forEach((d, i) => {
    const s = src.sessions.find((x) => x.week === w && x.day === d.toLowerCase());
    if (s && Math.abs(totals[i] - s.minutes) > 1e-9) {
      problems.push(`w${w} ${d} minutes: doc ${totals[i]} vs data ${s.minutes}`);
    }
  });
  // ...and every printed sum must actually add up.
  for (const [, expr, total] of m[2].matchAll(/([\d.+]+)\s*=\s*\*\*([\d.]+)\*\*/g)) {
    const got = expr.split("+").reduce((a, b) => a + parseFloat(b), 0);
    if (Math.abs(got - parseFloat(total)) > 1e-9) {
      problems.push(`w${w} printed sum ${expr} = ${total}, actually ${Math.round(got * 100) / 100}`);
    }
  }
}

/* ── cross-check 2: the weekly counts table ──
   Rows look like:  | 1 | 18 | 9 | 6 | 1.200 | 2 | 3 | 4 | 5 | */
const volRows = [...verif.matchAll(/^\|\s*(\d{1,2})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm)];
if (volRows.length !== 12) problems.push(`verification volume table: ${volRows.length} rows, expected 12`);
for (const m of volRows) {
  const w = +m[1];
  const a = src.weekly_audit.find((x) => x.week === w);
  if (!a) { problems.push(`no audit for week ${w}`); continue; }
  if (+m[2] !== a.press) problems.push(`w${w} press: doc ${m[2]} vs data ${a.press}`);
  if (+m[3] !== a.vertical) problems.push(`w${w} vertical: doc ${m[3]} vs data ${a.vertical}`);
  if (+m[4] !== a.horizontal) problems.push(`w${w} horizontal: doc ${m[4]} vs data ${a.horizontal}`);
  if (Math.abs(+m[5] - a.ratio) > 0.0005) problems.push(`w${w} ratio: doc ${m[5]} vs data ${a.ratio}`);
  if (+m[6] !== a.lower_days) problems.push(`w${w} lower days: doc ${m[6]} vs data ${a.lower_days}`);
  if (+m[7] !== a.shoulder_days) problems.push(`w${w} shoulder days: doc ${m[7]} vs data ${a.shoulder_days}`);
  if (+m[8] !== a.abdominal_days) problems.push(`w${w} abs days: doc ${m[8]} vs data ${a.abdominal_days}`);
}

/* ── cross-check 3: the audit table must itself be re-derivable from the 397 rows. The
   document's numbers and the app's live computation both trace back to these. ── */
for (const a of src.weekly_audit) {
  const items = src.sessions.filter((s) => s.week === a.week)
    .flatMap((s) => s.items.map((i) => ({ ...i, day: s.day })));
  const setsOf = (f) => items.filter((i) => i.family === f && i.work_set).reduce((n, i) => n + i.sets, 0);
  const daysOf = (k) => new Set(items.filter((i) => i[k]).map((i) => i.day)).size;
  const press = setsOf("press"), vert = setsOf("vertical"), horiz = setsOf("horizontal");
  const biceps = items.filter((i) => i.direct_arm).reduce((n, i) => n + i.sets, 0);
  const checks = {
    press: [press, a.press], vertical: [vert, a.vertical], horizontal: [horiz, a.horizontal],
    biceps: [biceps, a.biceps], lower_days: [daysOf("lower_strength"), a.lower_days],
    shoulder_days: [daysOf("shoulder_health"), a.shoulder_days],
    abdominal_days: [daysOf("direct_abdominal"), a.abdominal_days],
    unilateral_days: [daysOf("unilateral"), a.unilateral_days],
    power_days: [daysOf("power"), a.power_days],
    ratio: [Math.round((press / (vert + horiz)) * 1000) / 1000, Math.round(a.ratio * 1000) / 1000],
  };
  for (const [k, [mine, theirs]] of Object.entries(checks)) {
    if (mine !== theirs) problems.push(`w${a.week} ${k}: re-derived ${mine} vs audit ${theirs}`);
  }
}

/* ── cross-check 4: session and impact arithmetic ── */
for (const s of src.sessions) {
  let tot = 0;
  for (const b of s.timeline) {
    const parts = Object.values(b.components_seconds).reduce((x, y) => x + y, 0) + (b.rounding_buffer_seconds || 0);
    if (parts !== b.total_seconds) problems.push(`${s.id}/${b.name}: components ${parts} vs ${b.total_seconds}`);
    tot += b.total_seconds;
  }
  if (tot !== s.total_seconds) problems.push(`${s.id}: blocks ${tot} vs total ${s.total_seconds}`);
  if (Math.abs(s.total_seconds / 60 - s.minutes) > 0.01) problems.push(`${s.id}: minutes mismatch`);
}
for (const im of src.impact_sessions) {
  const ev = im.events.reduce((a, e) => a + e.seconds, 0);
  if (ev !== im.base_seconds) problems.push(`${im.id}: events ${ev} vs base ${im.base_seconds}`);
  if (im.base_seconds + im.available_travel_and_extra_prep_seconds !== im.cap_seconds) {
    problems.push(`${im.id}: base + travel != cap`);
  }
  if (im.base_seconds > im.cap_seconds) problems.push(`${im.id}: over cap`);
}

if (problems.length) {
  console.error("✗ the source document and the prescription data DISAGREE:");
  for (const p of problems.slice(0, 25)) console.error("   " + p);
  if (problems.length > 25) console.error(`   …and ${problems.length - 25} more`);
  process.exit(1);
}
const rowCount = src.sessions.reduce((a, s) => a + s.items.length, 0);
const appRows = Object.values(APP_SESSIONS).reduce(
  (a, wk) => a + Object.values(wk).reduce((b, d) => b + d.items.length, 0), 0);
/* The amendments must actually be present in what the app runs, or this document would
   describe changes that were reverted. */
{
  const missing = [];
  for (let w = 1; w <= 12; w++) {
    for (const d of ["mon", "fri"]) {
      const isTestDay = w === 12 && d === "fri";
      const has = APP_SESSIONS[w][d].items.some((i) => i.id === "calf");
      if (has === isTestDay) missing.push(`A1 calf w${w}-${d}`);
    }
    if (!APP_SESSIONS[w].mon.items.some((i) => i.id === "legcurl")) missing.push(`A1 hamstring w${w}`);
  }
  const b11 = APP_SESSIONS[11].sun.items.find((i) => i.id === "dipback");
  if (!b11 || b11.repsNum !== 6 || b11.load !== 47.5) missing.push("A2 dip week-11 six at +47.5");
  if (APP_META.targets.broad) missing.push("A3 broad-jump target still present");
  if (missing.length) {
    console.error("✗ amendments described in this document are NOT in the generated program:");
    for (const m of missing) console.error("   " + m);
    process.exit(1);
  }
  console.log(`✓ amendments A1–A3 verified present in the generated program (${appRows} rows)`);
}
console.log(`✓ cross-check: the source's own verification agrees with all ${src.sessions.length} sessions and ${rowCount} rows`);

/* ── rewrite links to the vendored copies ── */
doc = doc.replace(/\]\(\/Users\/[^)]*\/([A-Z0-9_]+\.md)\)/g, "](source/$1)")
         .replace(/\]\((SYNTHESIS[A-Z0-9_]*\.md)\)/g, "](source/$1)")
         .replace(/\]\((SYNTHESIZED[A-Z0-9_]*\.md)\)/g, "](source/$1)")
         .replace(/\]\((WEEK_13[A-Z0-9_]*\.md)\)/g, "](source/$1)")
         .replace(/\]\((V2_[A-Z0-9_]*\.md)\)/g, "](source/$1)")
         .replace(/\]\((SYNTHESIZED[A-Z0-9_]*\.json)\)/g, "](source/$1)")
         .replace(/\]\(synthesized_session_cards_v2\/(week_\d+\.md)\)/g, "](source/session_cards/$1)")
         .replace(/`synthesized_session_cards_v2\/`/g, "`docs/source/session_cards/`");
if (/\]\(\/Users\//.test(doc)) { console.error("✗ an absolute path survived"); process.exit(1); }

/* ── prepend §0 ── */
const header = `# Astra Synthesized Concurrent Block — v4.0-syn2

## 0. Status and provenance — read this first

This is the source of truth for the tracker in this repo.

**Where it came from.** A planning session revised the previous synthesized block after a
review of the actual routine. Everything below section 0 is that session's document,
unedited apart from link paths.

**What is and is not settled.** The author's own grade is **"A, provisionally"**, and the
copy is explicitly **not labeled approved**. Its remaining uncertainty, in its words, is
whether the combined cycling, lifting and new power work fits the athlete's actual recovery
and technique — something execution evidence settles, not more exercises. It is loaded into
the tracker because Brian chose to train it, not because it passed a review.

**What changed from v3.** The full table is in
[SYNTHESIS_CHANGELOG_V2.md](source/SYNTHESIS_CHANGELOG_V2.md). The changes that alter how
the app behaves:

- **Strength time is a guideline, not a hard cap.** That was an explicit instruction. Normal
  sessions project to 66.5–73.5 minutes; **week-12 Friday is deliberately 94 minutes** of
  testing. The impact clocks remain hard caps and now differ by day: **Wednesday 15 minutes,
  Friday 30**, both including travel.
- **Daily power** replaces the old generic kettlebell circuit — one-arm cleans, swings,
  scoop throws and the existing Friday jumps, each with its own dose, rehearsal, load
  progression and stop rules.
- **Direct biceps** on Sunday and Wednesday only, three recurring variation pairs at 2×8–12,
  compared against the last *normal* appearance of the same variation. **No direct triceps.**
- **Added leg accessories**: Monday reverse lunge, Friday supported single-leg RDL, one work
  pair each, still on only two lower days.
- **Weeks 7–11 Monday pull-ups** become one longer target-rep set plus three triples, to
  practise five-rep readiness without four sets of five.
- **Ten minutes** between week-12 tests, up from five, and a complete, executable
  **week-13 contingency** for tests deferred *before* their target attempt.

**What the author verified.** Twenty revision checks and the original thirteen, rerun, are in
[SYNTHESIS_VERIFICATION_V2.md](source/SYNTHESIS_VERIFICATION_V2.md) with the arithmetic
printed in full. Several pass with an explicitly approved exception. Actual measured time,
ride intensity, recovery and every target outcome remain **unverified** — the document says
so plainly and so does this one.

## 0.1 Coaching amendments applied on top of this document

Everything below section 0 is the source plan **as written**. The tracker runs it with three
documented changes, made after an adversarial review and at Brian's instruction. They live in
one place, \`tools/gen-program.mjs\`, and \`test.mjs\` guards each of them.

**A1 · Plantarflexor and hamstring work on both lower days.** The source prescribes 40–60 pogo
contacts a week plus hill and flat accelerations while giving the calf **no direct work at all**
and the hamstring **twelve reps a week** — against thirty-six for the adductor, which is the
tissue that already has a symptom history. The hamstring is the primary sprint-injury site and
the plantarflexors take the dominant load in pogos and acceleration. Added: a standing calf
raise (2×12, 1×12 in reduced weeks) on Monday and Friday, and a lying leg curl (2×8) on Monday,
which trains the knee flexion the Monday deadlift does not. Friday's existing single-leg RDL
goes from one set to two. **Cost: fourteen ordinary sessions move to 78–78.5 minutes**, which
§20 of this document explicitly treats as above the suggestion rather than a failure. Nothing
was added to week-12 Friday — that session is three maximal tests.

**A2 · The dip six-rep ladder climbs evenly into the test.** The source ran 35 → 37.5 → 40 →
42.5 → 45 and then tested at +50, so the final step was +5 where every previous step was +2.5,
and the last actual six-rep exposure sat two weeks before the test. Week 11 becomes 3×6 @ +47.5
instead of 3×5, making the test the same size step as all the others.

**A3 · The broad-jump measurement is withdrawn.** The source listed "+4 inches" as one of four
success targets while prescribing eighteen maximal jump attempts across the block — six of them
the tests themselves — and holding high-tier contacts flat at six a week from week 5 with no
progression. That is a maintenance dose against a development target, so the measurement could
only ever have reported familiarisation. The **training** jumps in weeks 5 and 7–11 remain; they
are the Friday power slot and are gated normally. Week 1 takes the double-kettlebell clean that
weeks 2–4 already use. Week-12 Friday now carries no power work at all, which is deliberate.

Three success targets remain: OHP ${APP_META.targets.ohp}, dip ${APP_META.targets.dip},
pull-up ${APP_META.targets.pullup}.

**What this repo verified independently**, so the document and the app cannot drift apart:

- All ${rowCount} prescribed rows across ${src.sessions.length} sessions and ${src.impact_sessions.length} impact sessions parse into
  \`src/program.js\`, and every field round-trips against the source JSON exactly. After the
  amendments above the app runs **${appRows} rows**; the difference is the added calf and
  hamstring work, and it is asserted row by row.
- The weekly audit re-derives from those rows — press, vertical, horizontal, ratio, biceps
  sets and every exposure-day count — and matches the source's audit for all twelve weeks.
  The tracker recomputes the same audit at runtime and \`test.mjs\` asserts they agree.
- \`tools/gen-block-doc.mjs\` re-reads the verification tables *in this document*, re-adds
  every printed minute sum, and refuses to publish if any disagrees with the data.
- The rails are enforced mechanically: week-12 target loads as caps at equal or higher reps;
  twelve fixed-Monday deadlift exposures, ten heavy and two light, no max and none in week
  13; six high-tier contacts a week with the weeks 1 and 12 measurement exception; no running
  in weeks 1 or 12; hill through week 8 and flat only from week 9; the 60 m / 120 m
  per-session ceilings; the 15- and 30-minute impact clocks with their travel allowances;
  Copenhagen 3×6 per side twice weekly; four power and four unilateral days every week; four
  direct-abdominal days; no direct triceps; and the six excluded exercises absent throughout.
  Every one of those guards was mutation-tested — the program was deliberately broken in
  more than twenty ways and each break was caught.

That is arithmetic and rule compliance. It is **not** an assessment of whether the training
decisions are correct, and no outcome is predicted by any of it.

**Source data:** \`docs/source/SYNTHESIZED_PRESCRIPTIONS_V2.json\`, version ${src.version},
${src.sessions.length} sessions, ${rowCount} prescribed rows, ${src.impact_sessions.length} impact sessions,
sha256 \`${jsonHash}\`. Generated into \`src/program.js\` by \`tools/gen-program.mjs\`;
this document assembled by \`tools/gen-block-doc.mjs\`.

---

`;
doc = header + doc.replace(/^# .*\n/, "");

writeFileSync(ROOT + "docs/12-week-concurrent-block-v4.md", doc);
console.log(`✓ docs/12-week-concurrent-block-v4.md written (${Math.round(doc.length / 1024)} KB)`);

/* ── every relative link must resolve ── */
const broken = [...doc.matchAll(/\]\((?!https?:)([^)#]+)\)/g)]
  .map((m) => m[1]).filter((rel) => !existsSync(ROOT + "docs/" + rel));
if (broken.length) { console.error("✗ broken relative links: " + [...new Set(broken)].join(", ")); process.exit(1); }
console.log("✓ all relative links resolve");
