# RouteFlow Knowledge Base

The single source of truth for understanding this project — written for humans **and**
AI agents. If you are an agent wanting to *control* the app, start with
`.agents/skills/routeflow/SKILL.md` instead; read this when you need to understand
how the app works inside.

## What RouteFlow is

A local-first personal productivity operating system: tasks, habits, goals, a weekly
planner, a Pomodoro focus mode and live analytics in one coherent app. Runs entirely
on the user's machine: no accounts, no external services, no network calls at runtime.
State lives as **plain Markdown files in `vault/`** (the single source of truth while
the dev server runs), mirrored to browser localStorage. AI agents read and edit the
vault directly — that is the primary integration path.

- Run: `npm install && npm run dev` → http://localhost:5173
- Test: `npm test` (Vitest + jsdom, logic + full-app render tests)
- Build: `npm run build` (tsc type-check + vite production build)

## Architecture map

```
src/
  types.ts                 All entity types (Task, Habit, Goal, TimeBlock, …)
  lib/
    dates.ts               Local-time date helpers; keys are 'YYYY-MM-DD' strings
    id.ts                  uid() generator
    constants.ts           Enums (categories, priorities, block types), colors, suggestions
    seed.ts                Empty first-run state + deterministic demo fixture (tests only)
    storage.ts             localStorage load/save + v1→v2 migration + import validation
    score.ts               "Today score" computation + today's task list derivation
    habits.ts              Streak/best-streak/completion math, week grids
    analytics.ts           Daily series, habit consistency, productivity peaks
    apiClient.ts           Fetch wrapper for the local agent API (degrades to null offline)
    syncDiff.ts            Human-readable diff between two states (agent-sync toasts)
  store/
    core.ts                PURE reducer + Action vocabulary — shared by UI, API plugin, tests
    StoreContext.tsx       React provider: useReducer + localStorage mirror + API sync
  components/
    ui/                    Design system: Button, Modal, Toast, forms, chips, rings, empty states
    charts/                Dependency-free charts: BarChart, AreaChart, ProgressRing
    layout/AppShell.tsx    Sidebar + mobile nav + quick-add + sync badge
    tasks/                 TaskModal (create/edit), TaskRow, TaskBoardCard
  pages/                   Onboarding, Today, Tasks, Planner, Focus, Habits, Goals,
                           GoalDetail, Analytics, Settings
plugins/
  vault.ts                 Markdown vault format: state ⇄ .md files (tolerant parser)
  routeflow-api.ts         Vite plugin: vault-backed store + local HTTP API
vault/                     THE DATA — Markdown files (see vault/README.md)
.agents/skills/routeflow/  Agent skill: SKILL.md + references/{triage,api,recipes}.md
```

## Core concepts

**Single store.** One reducer (`src/store/core.ts`) holds the entire AppData. The UI
dispatches actions; the agent API applies the *same* actions through the *same*
reducer; tests exercise it directly. There is exactly one way anything changes.

**Persistence & sync.**
- Dev/preview (`npm run dev`): the app's state lives as **Markdown files in `vault/`**
  (format documented in `vault/README.md`). The vite plugin owns those files: the
  browser hydrates from them, write-forwards every UI action to `POST /api/actions`,
  and polls `GET /api/health` every 2 s. The server re-scans the vault on every
  request, so direct file edits (by humans or AI agents) bump the revision and reach
  the open tab within ~2 s, with a toast summarizing the change. localStorage
  mirrors state continuously.
- Production static build (no server): plain localStorage mode, identical behavior minus sync.
- `revision` (stored in `vault/.meta.json`) increments on every mutation; clients use
  it for cheap change detection. The legacy `data/routeflow.json` is migrated into
  the vault automatically on first boot (original kept as `.bak`).

**Derived data.** Today score, streaks, analytics are never stored — always computed
from state, so every mutation (UI or agent) keeps them consistent automatically.

### The Today score

Weighted average (0–100) of present components:
tasks done/today's tasks (0.30), habits done/scheduled today (0.30),
min(1, focus minutes / `settings.focusTarget`) (0.25), and schedule blocks whose end
time has passed (0.15). Components with nothing scheduled are excluded, not zeroed.

### Goal auto-completion

Toggling the last pending milestone sets goal `status: "completed"` (stamps
`completedAt`); unchecking any milestone on a completed goal returns it to `active`.
Progress % = done milestones / total milestones.

### Habit streaks

A streak counts consecutive *scheduled* days completed, ending today (if done) or
yesterday — not having done today's habit yet doesn't break it. Best streak is the
historical maximum. Completion % covers all scheduled days since `createdAt`.

## Data model quick reference

Entities: `Task` (status backlog|today|in-progress|done; priority low|medium|high;
category Work|Personal|Health|Learning|Errands; optional dueDate YYYY-MM-DD + dueTime
HH:mm + goalId), `Habit` (emoji icon, hex color, `days` = weekday numbers 0=Sun…6=Sat,
`completions` = date keys), `Goal` (milestones with done flags, status
active|paused|completed), `TimeBlock` (planner; category
deep-work|meeting|exercise|personal|study), `FocusSession` (minutes + optional
task/goal link). Full schemas with examples: `.agents/skills/routeflow/references/api.md`.

## Seed / first-run data

RouteFlow starts **empty by design**: no demo tasks, goals, habits, blocks or
sessions — every entity in state was deliberately created by the user or their
agent. `createSeedData()` returns this empty, un-onboarded state. (A deterministic
rich demo dataset still exists as `createDemoData()` in `src/lib/seed.ts`, used only
as a test fixture.) Onboarding habit picks are created with zero history — streaks
start with the user's first check-in. Schema history: v1 seeded demo entities;
v2 (current) is empty-first — loading v1 data runs `migrateData()` which strips
known demo entities (their fixed id patterns) while keeping everything user-created
and cleaning dangling goal links.

## Where things belong (product philosophy)

Tasks are the workhorse (created far more than anything else); goals are rare north
stars with milestones; habits are recurring verbs with a rhythm; blocks reserve time
rather than define work; sessions record past focus. The full decision framework —
decision tree, heuristics, worked examples for messy natural-language input — lives
in `.agents/skills/routeflow/references/triage.md` and is the canonical guide for
agents deciding how to place new information.

## The agent interface (how AI controls the app)

**Primary: the Markdown vault.** Agents read `vault/*.md` to know everything and
edit them to change anything — flip checkboxes, move task lines between sections,
add/delete lines, new goal files. The parser is tolerant (unknown lines ignored,
missing ids generated on the next write-back, section headings drive status).

**Secondary: the local HTTP API** (also the browser's transport), served by the
vite plugin at `/api` on the dev/preview server:

- `GET /api/health` → `{ok, revision, updatedAt, hasFile}`
- `GET /api/state[?section=tasks|habits|goals|blocks|sessions|profile|settings]`
- `POST /api/actions` → `{"actions":[<Action>…]}` — 1–200 actions, sequential,
  all-or-nothing, through the real reducer
- `PUT /api/state` → validated whole-state replace
- `GET /api/docs` → the API reference markdown

Writes are loopback-only. Both interfaces mutate the same vault files. Reserved
UI-only actions (`data/import`, `data/replace`) are rejected at the API — use
`PUT /api/state`.

## Testing strategy

`src/lib/logic.test.ts` covers pure logic (seed determinism, streaks, score weights,
analytics, import validation, reducer semantics). `src/app.test.tsx` renders the real
`App` in jsdom and walks flows (onboarding, tasks CRUD/search/board, habits, goals
auto-complete, planner, focus timer, analytics, settings, persistence).
`plugins/api.test.ts` unit-tests the API handler (endpoints, validation, revision,
persistence, loopback guard) without TCP.

## FAQ (for agents)

- **Is my write visible in the UI?** Within ~2 s (poll); the tab must be open.
- **User and agent edit simultaneously?** Both go through the same reducer; actions
  apply in arrival order. Re-read state before critical sequences.
- **Where is the durable data?** `vault/*.md` — plain Markdown, editable by humans
  and agents; the browser mirrors to localStorage always. Settings → Export makes a
  portable JSON backup.
- **Can I add new categories/enums?** No — the UI filters are enum-driven. Use the
  existing five categories and five block types.
- **How do I reset everything?** Settings → Reset app data, or POST
  `{"actions":[{"type":"data/reset"}]}` — wipes to an empty fresh start
  (destructive — ask first).
- **Port changed?** Vite prints the port on startup; probe `/api/health` on 5173 first,
  then 5174.
