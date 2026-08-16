# RouteFlow Triage — How to Think Before You Create

You will often receive loose, human input: "I gotta prep the client thing, also I
keep forgetting to drink water, and I really want to learn Spanish this year, plus
meetings Tuesday". Your job is to **decide where each piece belongs** before touching
the API. Wrong placement makes the app lie to the user — a task that should have been
a goal clutters today; a habit modeled as tasks disappears after a week.

Read this fully once. Re-check the decision table when unsure.

## The five containers and their nature

| Container | What it IS | What it is NOT | Lifespan | Typical count |
| --- | --- | --- | --- | --- |
| **Task** | A concrete, finishable piece of work ("call the dentist") | A routine, an outcome, or a time reservation | days | many (10–60 active) |
| **Habit** | A recurring behavior tracked per day ("read 20 pages") | Something with an end date or a single occurrence | months | few (2–8) |
| **Goal** | A meaningful outcome with waypoints ("run a half marathon") | A to-do item or a routine | months–year | very few (1–5 active) |
| **Block** | Reserved time on the calendar ("Tue 9–11 deep work") | The work itself — it doesn't complete, it passes | hours | ~0–6 per day |
| **Session** | Logged focus time on real work | Something you schedule in advance | past only | — |

## Decision tree (apply per item, in order)

1. **Does it recur?** "every day / each week / I keep trying to…" → **Habit**.
   One-off or bounded? → next.
2. **Is it an outcome the user cares about, achievable through multiple steps
   over weeks/months?** → **Goal** (add milestones; optionally link tasks to it).
   A single concrete action? → **Task**.
3. **Is it a commitment to spend time, rather than work to finish?**
   ("block out Tuesday morning for X", "no meetings after 3pm") → **Block**.
4. **Is it already-done focus time the user mentions?** ("I did 45 min on the
   report earlier") → **Session** (log it, link the task if it exists).
5. Ambiguous between two? Apply the **frequency heuristic** below, or ask the
   user one short question. When genuinely torn, prefer the *lighter* container
   (task over goal; goal over habit+goal duplication).

## Heuristics that make good decisions

- **Tasks are the workhorse; goals are the north star.** RouteFlow users create
  tasks 10–50× more often than goals. Default to Task; create a Goal only when the
  user expresses outcome + duration ("by December", "this year", "eventually")
  or names multiple steps. Never create a goal for something finishable in one sitting.
- **Habits need a verb and a rhythm.** If you can't state the rhythm
  ("daily", "3×/week", "weekdays"), don't create the habit yet — ask.
- **Split compound input.** "Get in shape" → goal; under it: habit "Morning movement",
  task "Book gym induction", block "Mon/Wed 18:00 exercise". One sentence can map to
  3 containers. Create them together in one batch, cross-linked (tasks carry `goalId`).
- **Soften vague tasks.** "Client thing" → ask once for a concrete title, or title it
  "Clarify client request" and note the ambiguity. Never invent specifics the user
  didn't state (dates, amounts, names).
- **Dates:** only set `dueDate` when the user gave one or urgency is explicit
  ("today", "by Friday"). "Sometime" → backlog, no date.
- **Priorities:** default `medium`. Reserve `high` for due-soon + consequences
  ("pay rent", "client deadline"). Everything urgent is nothing urgent.
- **Scheduling blocks:** respect `profile.energy` (peak window gets deep-work,
  not meetings) and `profile.workStart/workEnd`. Don't schedule blocks the user
  didn't ask for — suggest them in your reply instead, then create on approval.
- **Don't duplicate.** Before creating, search state
  (`jq '[.tasks[]|select(.title|test("…";"i"))]'`) for near-identical items —
  reuse or update instead of stacking copies.
- **Completing on behalf of the user:** OK when they clearly state it ("I finished
  X", "did the run"). Never bulk-complete things they didn't mention.
- **Deletion is destructive and quiet** — the UI barely shows it. Always enumerate
  what you're about to delete and get a yes first.

## Placement examples

Input → decisions:

1. *"Tomorrow: finish the report, call mom, and I should really start stretching daily."*
   → 2 tasks (report: due tomorrow, priority by context; call mom: low), 1 habit
   (stretch, ask rhythm if unknown — default weekdays is a fair guess to propose).
2. *"I want to launch my portfolio site this quarter."*
   → Goal (target ~end of quarter) + propose milestones (wireframe, build, write,
   deploy). Don't create tasks yet unless asked; offer 2–3 linked starter tasks.
3. *"Ugh, inbox is a mess again, it's always a mess."*
   → Habit candidate ("inbox to zero", weekdays) — the *always* signals recurrence;
   plus maybe one task "Do an inbox deep-clean" to break the backlog first.
4. *"Deep work on the thesis Tuesday and Thursday mornings, 9 to 12."*
   → 2 blocks (deep-work) — and if a "write thesis" goal exists, suggest linking
   future tasks to it. No tasks created: time was requested, not work items.
5. *"I read for an hour last night."*
   → If a reading habit exists: `habit/toggle` yesterday's date. Optionally log a
   60-min session **only if** linked to real focus intent — reading-in-bed is habit
   territory, not focus time. Don't double-count.
6. *"Clean up my stuff, half of it is junk I'll never do."*
   → Read state, list stale candidates (old due dates, backlog untouched for weeks),
   propose deletions, await confirmation.

## The conversation pattern

1. **Read the vault first** (`vault/tasks.md`, `habits.md`, `goals/`, `planner.md`) —
   it is the complete, current truth. (Or `GET /api/state` if you prefer JSON.)
2. **Restate your routing** in one or two lines: "I'll add 2 tasks for today, a
   weekday stretching habit, and no goal — sound right?" For anything beyond
   2–3 obvious items, get confirmation before writing.
3. **Apply the edits** — file edits in the vault or one batched `POST /api/actions`.
4. **Report results** with titles and what the user will see change. The app
   toasts a sync summary in the open tab.

Anti-patterns to avoid: goal-spam (a goal per task), habit-spam (a habit per whim —
suggest at most 1–2 new habits per conversation), moving items between days without
being asked, marking things done to "clean up", creating blocks for every task
(blocks are for protected time, not task visualization).

## Empty-first mindset

RouteFlow starts **empty on purpose** — no demo tasks, goals or habits. Every entity
in the vault was deliberately placed by the user or their agent. That raises the
stakes of good triage: what you create is what they see. Create less, place well.
