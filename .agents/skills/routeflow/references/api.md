# RouteFlow Agent API — Complete Reference

> **Primary interface is the Markdown vault** (`vault/*.md`) — read/write files
> directly; no API needed. This HTTP API is the secondary, programmatic interface
> (and the browser's transport). It applies the **same reducer** as the app, and
> persists to the same vault files.

Base URL: `http://localhost:<vite-port>/api` (default port **5173**; check the port Vite
printed at startup or probe `/api/health`). All request/response bodies are JSON unless
noted. `GET /api/docs` serves this file.

## Data model (AppData)

```jsonc
{
  "version": 1,
  "profile": {
    "name": "Alex Rivera",
    "primaryGoal": "Stay consistent and ship meaningful work",
    "workStart": "09:00",          // HH:mm, planner window start
    "workEnd": "18:00",            // HH:mm
    "energy": "morning",           // morning | afternoon | evening | night
    "onboarded": true
  },
  "settings": {
    "theme": "system",             // light | dark | system
    "focusTarget": 120             // minutes/day counted as 100% for the Today score
  },
  "tasks": [{
    "id": "task_t3",               // opaque string — always read from state, never invent
    "title": "Prepare sprint demo",
    "notes": "optional text",
    "status": "today",             // backlog | today | in-progress | done
    "priority": "high",            // low | medium | high
    "category": "Work",            // Work | Personal | Health | Learning | Errands
    "dueDate": "2026-08-16",       // optional, YYYY-MM-DD local
    "dueTime": "14:00",            // optional, HH:mm 24h
    "goalId": "goal-website",      // optional link to a goal
    "createdAt": "2026-08-16T06:30:00.000Z",
    "completedAt": "2026-08-16T07:12:00.000Z"  // present iff done
  }],
  "habits": [{
    "id": "habit-2",
    "name": "Read 20 pages",
    "icon": "📚",                   // emoji string
    "color": "#0E8CC0",            // hex string
    "days": [0,1,2,3,4,5,6],       // weekdays scheduled; 0=Sunday … 6=Saturday
    "createdAt": "2026-07-02T…",
    "completions": ["2026-08-14","2026-08-15"]  // YYYY-MM-DD keys, sorted
  }],
  "goals": [{
    "id": "goal-website",
    "title": "Launch personal website",
    "description": "…",
    "category": "Work",
    "targetDate": "2026-09-30",    // optional
    "status": "active",            // active | paused | completed
    "createdAt": "…",
    "completedAt": null,
    "milestones": [
      { "id": "ms-w1", "title": "Collect inspiration", "done": true, "completedAt": "…" },
      { "id": "ms-w4", "title": "Write two case studies", "done": false }
    ]
  }],
  "blocks": [{                      // planner time blocks
    "id": "block_w2-3",
    "title": "Deep work — client launch",
    "date": "2026-08-16",          // YYYY-MM-DD
    "start": "15:00",              // HH:mm
    "end": "16:30",
    "category": "deep-work"        // deep-work | meeting | exercise | personal | study
  }],
  "sessions": [{                    // completed focus sessions
    "id": "session_t1",
    "date": "2026-08-16",
    "minutes": 25,
    "taskId": "task_t3",           // optional
    "goalId": null,
    "completedAt": "2026-08-16T07:05:00.000Z"
  }]
}
```

Derived behavior to know:
- **Today score** = weighted mix of tasks done (0.30), habits done (0.30), focus minutes
  vs `focusTarget` (0.25), and schedule blocks passed (0.15) — recompute happens in the
  UI automatically; you never set it.
- Completing the last pending milestone auto-sets goal `status: "completed"` (and
  reverts to `active` if a milestone is unchecked afterwards).
- `task/toggleDone` on a done task reopens it (back to `today` if it was due today,
  else `backlog`).
- Habit streaks tolerate "today not yet done" (streak counts through yesterday).

## Endpoints

### `GET /api/health`
→ `200 {"ok":true,"revision":42,"updatedAt":"2026-08-16T…","hasFile":true}`
Cheap polling endpoint. `revision` increments on every mutation — if it changed, re-pull state.

### `GET /api/state`
→ `200 {"revision":42,"updatedAt":"…","state":{…full AppData…}}`

### `GET /api/state?section=<name>`
`section` ∈ `tasks | habits | goals | blocks | sessions | profile | settings`
→ `200 {"revision":42,"section":"tasks","data":[…]}`
Invalid section → `400 {"error":"Unknown section …"}`.

### `POST /api/actions`
Body: `{"actions":[<Action>,…]}` — 1–200 actions, applied **sequentially through the
app's real reducer**, all-or-nothing.
→ `200 {"ok":true,"revision":43,"updatedAt":"…","state":{…new state…}}`
Errors → `400 {"error":"<reason> (action index N)"}` — nothing was applied.

### `PUT /api/state`
Body: a full AppData object, or `{"state": <AppData>}`.
Validated structurally; on success replaces everything.
→ `200 {"ok":true,"revision":44,"updatedAt":"…"}`

### `GET /api/docs`
→ `200` this markdown (`Content-Type: text/markdown`).

### Transport rules
- Mutating methods (POST/PUT) are accepted **only from localhost**; other addresses get `403`.
- Batches are serialized; concurrent requests are safe.
- Every mutation persists immediately to `data/routeflow.json` and bumps `revision`.
- The open browser tab picks up external changes within ~2 s (poll) and shows a toast.

## Action schemas

Legend: `*` = required. Types not marked optional are required by the reducer's shape.

### Tasks
| Action | Payload | Notes |
| --- | --- | --- |
| `task/add` | `{"task": {title*, status, priority, category, dueDate?, dueTime?, notes?, goalId?}}` | defaults: pick sensible values (status `today`, priority `medium`, category `Work`) |
| `task/update` | `{"id"*, "patch": {title?, notes?, status?, priority?, category?, dueDate?, dueTime?, goalId?}}` | partial patch; setting `status` to non-done clears `completedAt` |
| `task/status` | `{"id"*, "status"*}` | `done` stamps `completedAt` |
| `task/toggleDone` | `{"id"*}` | complete ⇄ reopen |
| `task/delete` | `{"id"*}` | |

### Habits
| Action | Payload | Notes |
| --- | --- | --- |
| `habit/add` | `{"habit": {name*, icon*, color*, days*}}` | `days`: weekday numbers 0=Sun…6=Sat, at least one |
| `habit/update` | `{"id"*, "patch": {name?, icon?, color?, days?}}` | editing `days` doesn't touch history |
| `habit/toggle` | `{"id"*, "date"*}` | `date` `YYYY-MM-DD`; toggles completion for that day (past days allowed) |
| `habit/delete` | `{"id"*}` | removes history too |

### Goals
| Action | Payload | Notes |
| --- | --- | --- |
| `goal/add` | `{"goal": {title*, description*, category*, status*, targetDate?, milestones*: [{title*, done?}]}}` | description may be `""` |
| `goal/update` | `{"id"*, "patch": {title?, description?, category?, targetDate?, status?}}` | |
| `goal/milestone/add` | `{"goalId"*, "title"*}` | |
| `goal/milestone/toggle` | `{"goalId"*, "milestoneId"*}` | last one done → goal auto-completes |
| `goal/milestone/delete` | `{"goalId"*, "milestoneId"*}` | |
| `goal/delete` | `{"id"*}` | linked tasks survive, their `goalId` just dangles |

### Planner blocks
| Action | Payload | Notes |
| --- | --- | --- |
| `block/add` | `{"block": {title*, date*, start*, end*, category*}}` | `end` must be > `start` (00:00–24:00 range) |
| `block/update` | `{"id"*, "patch": {title?, date?, start?, end?, category?}}` | moving = patch `date` ± `start`/`end` |
| `block/delete` | `{"id"*}` | |

### Misc
| Action | Payload | Notes |
| --- | --- | --- |
| `session/add` | `{"session": {date*, minutes*, taskId?, goalId?, completedAt?}}` | `completedAt` defaults to now |
| `settings/set` | `{"patch": {theme?, focusTarget?}}` | |
| `profile/set` | `{"patch": {name?, primaryGoal?, workStart?, workEnd?, energy?}}` | |
| `data/reset` | `{}` | wipe the app to a fresh, empty start — **destructive**, ask the user first |

**Not exposed via API** (reserved for the UI): `onboard/finish`, `data/import`, `data/replace`.
Use `PUT /api/state` instead.

## Common errors

| Status | Meaning |
| --- | --- |
| `400 Unknown action type "…"` | Typo in `type`; the error lists every valid type |
| `400 … (action index 2)` | The 3rd action failed validation; batch was not applied |
| `400 Body must be {"actions": …}` | You posted something else |
| `403` | Non-localhost write attempt |
| `404 Unknown endpoint` | Wrong path/method — the error lists endpoints |
| connection refused | App not running — start with `npm run dev` |
