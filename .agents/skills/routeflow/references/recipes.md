# RouteFlow Agent Recipes (vault-first)

Compound workflows. The Markdown vault in `vault/` is the primary interface —
these recipes read files directly and edit them. The HTTP API (`curl` + `jq`)
remains an option for atomic programmatic batches; see `api.md`.

## 0. Orient yourself (every session)

```bash
cd D:/RouteFlow/vault
cat profile.md                       # who the user is, working hours, energy
cat tasks.md                         # everything on their plate
cat habits.md                        # habits + completion history
ls goals/ && cat goals/*.md          # goals and milestones
sed -n "/## $(date +%F)/,/^## /p" planner.md   # today's schedule
tail -20 focus-log.md                # recent focus
```

## 1. Daily kickoff ("what should I focus on today?")

1. Read `tasks.md` + today in `planner.md` + `profile.md` (respect `energy:` —
   deep work in the peak window).
2. Propose a plan in one or two sentences; on approval:
   - Move 1–3 chosen backlog lines under `## Today` (edit `vault/tasks.md`).
   - Optionally add a deep-work block under today's `## date` in `planner.md`.
3. Report what you placed where.

## 2. Plan the week

1. Read the whole `planner.md` and open tasks.
2. Draft the week with the user (blocks in their work hours; meetings midday;
   deep work mornings if `energy: morning`).
3. Rewrite `planner.md` day sections in one edit — keep existing blocks and their
   `id:`/`time:`/`category:` metadata intact. Give due dates to relevant tasks by
   adding `due:YYYY-MM-DD` (and `time:`) to their metadata so they appear on the
   planner rail.

## 3. Daily close-out

- Flip completed tasks to `- [x]` (add `completed:` timestamps or let the app fill them).
- Add `- [x] <today>` under each habit that happened.
- Append focus sessions that occurred: `- <YYYY-MM-DD> <HH:MM> — 25m \`id:session_new | task:<id>\``.
- Summarize: tasks done today, streaks, focus minutes (count today's lines in `focus-log.md`).

## 4. Weekly review

- Tasks: count `- [x]` lines whose `completed:` falls in the last 7 days.
- Habits: per habit, `completed` check-ins this week ÷ scheduled days (from `days:`).
- Goals: per file, checked milestones ÷ total; flag stalled ones (no check in weeks).
- Propose 2–3 adjustments (rescale `days:`, pause a goal, delete zombies) — apply on approval.

## 5. Habit audit

Read `habits.md`; for each habit compute consistency from its `- [x]` lines.
Suggest: fewer `days:` for over-ambitious habits, clearer names, deletion of
zombies. Apply edits on approval — one habit section per change.

## 6. Tidy the task list

Scan `tasks.md` for stale items (old `due:` dates, untouched backlog). List them
for the user, then delete the approved lines in one edit.

## Behavioral notes

- Confirm destructive edits (deletions, clearing sections) before saving.
- One entity per edit when interleaving with the user's UI activity; re-read a
  file before editing it again after the app has written.
- The app toasts "Agent sync — …" in the open tab when your edits land.
- Prefer moving/annotating over deleting; never edit `.meta.json`.
