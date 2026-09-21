# Archive — superseded programs

Nothing in this folder is live. All of it is kept, none of it is deleted, and none of the
numbers are interchangeable between programs: different sessions, different priority lifts,
different anchor maxima, different deload and test structure.

This repo has now carried three programs.

## 1. Press-Priority Hybrid v1.3 — through July 2026

A 13-week cycle on Mon/Tue/Thu/Fri built around bench, deadlift, OHP and squat, for an
athlete who played tennis Wednesday and Saturday.

| File | What it is |
|---|---|
| `12-week-press-priority-program-v1.3.md` | The full program, including its coach-review record |
| `autoregulation-criteria-press-priority.md` | Its weekly-review decision lens |
| `autoregulation-feature-design-press-priority.md` | Design notes for the AI review loop |
| `2026-07-05-ai-autoregulation-loop.md` | Implementation plan for that loop |
| `2026-07-05-app-fixes-batch.md` | Implementation plan for a batch of app fixes |

## 2. Astra Concurrent Block v2.0-w1 — September 2026, one day

Sunday / Monday / Wednesday / Friday, OHP as first priority, with plyometric, sprint and
adductor domains the Press-Priority block did not have. Deployed on 20 September 2026 and
superseded the following day by the synthesized block, before it was trained.

| File | What it is |
|---|---|
| `12-week-concurrent-block-v2.0-w1.md` | The full program |
| `autoregulation-criteria-concurrent-v2.md` | Its weekly-review decision lens |

It is worth keeping for one specific reason: the synthesized block that replaced it was
built by comparing this plan against a second one, and the comparison in
`../source/SYNTHESIS_COMPARISON_AUDIT.md` refers to it throughout — including the places
where it was judged wrong. Reading that audit without this document is hard.

## 3. Astra Synthesized Concurrent Block v3.0-syn1 — current

Live. See [`../12-week-concurrent-block-v3.md`](../12-week-concurrent-block-v3.md).

---

## Old training data

Superseded program data is **not** deleted from the app either. When the tracker opens a
save written by a different program it moves the whole of it into an `archived` list —
preserved, carried along in every Backup, and never overwritten by a later migration. A
phone that ran all three blocks ends up with two archived entries beneath the live one.
