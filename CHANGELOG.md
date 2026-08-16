# Changelog

All notable changes to RouteFlow are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-08-16

First public release.

### Added

**Product**
- 5-step, skippable, repeatable onboarding (name, primary goal, working hours,
  energy pattern, habit picks) that personalizes the dashboard, planner window
  and starting habits.
- **Today dashboard**: weighted score ring (tasks 30% · habits 30% · focus 25% ·
  schedule 15%), today's tasks with due times, one-tap habit check-offs with live
  streaks, goal progress, schedule timeline with "now" marker, quick-start focus.
- **Tasks**: list + kanban board with drag-and-drop, filters (priority, category,
  status, due date), search, detail modal, goal linking, completion timestamps.
- **Habits**: icon/color/per-weekday configuration, current & best streaks,
  weekly completion grid, completion %, 28-day heatmap detail view.
- **Goals**: milestones with auto-computed progress, auto-complete at 100%,
  active/paused/completed filters, milestone route timeline, linked tasks.
- **Planner**: Monday-based week grid honoring working hours; create blocks by
  clicking empty slots, drag across days/times, resize via bottom edge with
  15-minute snapping; filled blocks vs outline task pills.
- **Focus mode**: timestamp-accurate Pomodoro timer (25/45/60 presets, breaks),
  task/goal linking, session logging, finish-early-and-log, zen mode with
  tab-title countdown and completion chime.
- **Analytics**: 7/30-day task-completion bars, focus-minute trend with average,
  habit consistency heatmaps, goal progress, most productive weekday & time band —
  all derived live from state.
- **Settings**: light/dark/system theme, profile & working-hour preferences,
  focus target, JSON export, validated JSON import, full reset, onboarding restart.
- Empty-first design: no demo data; thoughtful empty states everywhere.

**AI-native layer**
- **Markdown vault** (`vault/`) as the single source of truth: tasks.md,
  habits.md, goals/*.md, planner.md, focus-log.md, profile.md (+ generated README).
- Tolerant vault parser/serializer: unknown lines ignored, missing ids generated
  and written back, section headings drive status, checkbox flips drive
  completion, enum/date validation with safe fallbacks.
- Live two-way sync: server re-scans the vault on every request; external file
  edits land in the open browser tab within ~2 s with a change-summary toast;
  UI edits are written back to the same files.
- Local agent API (secondary interface): `GET /api/health|/api/state`,
  `POST /api/actions` (same reducer as the UI, all-or-nothing batches),
  `PUT /api/state`, `GET /api/docs`; loopback-only writes.
- Agent skill (`.agents/skills/routeflow/`): operating manual, exhaustive API
  reference, compound recipes, and a **triage framework** teaching agents where
  user input belongs (task vs habit vs goal vs block vs session).
- `KNOWLEDGE_BASE.md` project knowledge base, served at `GET /api/docs`.

**Engineering**
- 87 tests: domain logic, full-app jsdom flow walks, vault round-trips,
  disk-rescan adoption, UI/API reducer parity.
- CI workflow (GitHub Actions, Node 20 & 22: type-check, build, tests).
- Deterministic demo dataset (`createDemoData`) used only as a test fixture.

### Changed

- App state moved from browser-only localStorage to localStorage-mirrored,
  vault-backed storage (schema v2); legacy v1 data auto-migrates (demo entities
  stripped, user data preserved).

### Fixed

- Onboarding replay on reload: `onboard/finish` now persists through the sync
  layer, and a pristine server no longer clobbers a browser with local progress.
