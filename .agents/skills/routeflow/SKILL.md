---
name: routeflow-control
description: Control the RouteFlow productivity app (tasks, planner time blocks, habits, goals, focus sessions) by reading and editing its Markdown vault at D:/RouteFlow/vault — no API calls needed. Use whenever the user asks to manage their planner, tasks, habits, goals, or "tell RouteFlow to…" — any create/edit/delete/complete/checkmark operation on their productivity data.
---

# RouteFlow Control — the Markdown vault

RouteFlow stores **everything as plain Markdown files** in `vault/` (relative to the
project root, default `D:/RouteFlow/vault`). Those files ARE the app: the running app
reads them and rewrites them, and any edit you make appears in the user's open
browser tab within ~2 seconds. You rarely need the HTTP API at all.

```
vault/
  README.md        guide to the format (informational)
  profile.md       name, primary goal, working hours, energy, theme, focus target
  tasks.md         all tasks, grouped under ## Today / ## In Progress / ## Backlog / ## Done
  habits.md        one ## Name section per habit + dated check-in lines
  goals/<slug>.md  one file per goal: description + ## Milestones checkboxes
  planner.md       ## YYYY-MM-DD days with time blocks
  focus-log.md     one line per completed focus session
  .meta.json       machine file (revision) — never edit
```

## Prerequisites

The app should be running (`npm run dev` in `D:/RouteFlow`, usually already open).
It's not required for you to edit files — but without it nobody syncs your edits
into the UI until the next launch. Read `vault/README.md` once for the exact syntax.

## How to work

1. **Read the vault** to know everything: tasks, habits, goals, the week's blocks,
   focus history, and the user's profile (working hours, energy pattern).
2. **Apply `references/triage.md`** to decide where new input belongs before writing.
3. **Edit the files** with normal file tools. Complete ↔ flip `[ ]`/`[x]`. Move a task
   between sections ↔ change its status. Add a line ↔ create. Delete a line ↔ delete.
4. **Preserve the backtick metadata blocks** (`id:… | priority:… | category:…`) and
   the ids inside them — the id is the entity's identity. New items may omit `id:`
   (one is generated and written back on the next sync).
5. **Re-read after the app writes.** When the user edits in the UI, the server
   rewrites these files — re-read a file before your next edit to it. Last write
   wins; keep your edits to one file per save when possible.

## Golden rules

- Exact enums: priority `low|medium|high` · category `Work|Personal|Health|Learning|Errands` ·
  block category `deep-work|meeting|exercise|personal|study` · goal status `active|paused|completed`.
- Dates `YYYY-MM-DD`, times `HH:MM` (24h), all local.
- Never edit `.meta.json`; never rename `goals/` files by hand (names derive from
  the goal title + id; create goals by adding a new file, delete by removing it).
- Don't fabricate history (no past `- [x]` check-ins that didn't happen, no fake
  focus sessions) and don't invent specifics the user didn't state.
- Destructive sweeps (bulk deletes, clearing the vault) need explicit user approval.

## Common edits

### Tasks (vault/tasks.md)

```markdown
## Today
- [ ] Call the dentist `id:task_x1 | priority:low | category:Personal | due:2026-08-17 | time:09:00`
    Ask for a morning slot                          <- indented line = notes
## In Progress
- [ ] Prepare client demo `id:task_x2 | priority:high | category:Work | goal:goal_site`
## Done
- [x] Ship the checklist `id:task_x3 | priority:medium | category:Work | completed:2026-08-16 09:12`
```

Complete: flip `[ ]`→`[x]` (add `completed:YYYY-MM-DD HH:MM` or let the app fill it).
Reopen: flip back to `[ ]` under `## Today`/`## Backlog`. New task: add a line (id
optional). Delete: remove the line.

### Planner (vault/planner.md)

```markdown
## 2026-08-18
- **Deep work — thesis** `id:block_a1 | time:09:00-11:30 | category:deep-work`
- **Team sync** `id:block_a2 | time:11:30-12:00 | category:meeting`
```

Move a block: change its `## date` section or `time:` range. Planner *tasks* are
regular tasks with a `due:` date (they show as outline pills on the week grid).

### Habits (vault/habits.md)

```markdown
## Evening stretch `id:habit_s1 | icon:🌱 | color:#0E9F6E | days:1,2,3,4,5 | created:2026-08-16 10:00`
- [x] 2026-08-16
```

Check off today: add/flip `- [x] <today>` under the habit. Undo: remove the line.
`days:` are weekday numbers 0=Sunday…6=Saturday. Create = new `## Name` section;
delete = remove the section.

### Goals (vault/goals/*.md)

```markdown
# Run a half marathon `id:goal_r1 | category:Health | target:2026-12-01 | status:active`
Finish the city race in under 2:10, injury-free.

## Milestones
- [x] Comfortable 5k `id:ms_r1 | completed:2026-07-15 08:12`
- [ ] Long run 15k `id:ms_r2`
```

Checking the last open milestone auto-completes the goal (the app sets
`status:completed` on its next write — you may also set it yourself).

### Focus log / profile

Append `- 2026-08-18 09:05 — 25m \`id:session_z1 | task:task_x2\`` to log focus.
Profile fields (`name`, `primary goal`, `work start/end`, `energy`) are `key: value`
lines in `vault/profile.md`.

## Optional: HTTP API

For programmatic tweaks without rewriting files (or when you want atomic
validation), the local API still exists — `GET /api/state`, `POST /api/actions`
(same reducer, all-or-nothing), `PUT /api/state`, `GET /api/docs` on the dev server
port (default 5173, localhost only). Full contract in `references/api.md`. The
vault is the primary interface; prefer it.

## Deeper material

- `references/triage.md` — **read before creating anything**: decision framework
  for placing user input into tasks/habits/goals/blocks/sessions.
- `references/api.md` — exhaustive HTTP action schemas (secondary interface).
- `references/recipes.md` — compound workflows adapted to the vault.

To make this skill available everywhere, the user can copy it:
`cp -r .agents/skills/routeflow ~/.agents/skills/`
