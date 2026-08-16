# Contributing to RouteFlow

Thanks for helping make RouteFlow better! This guide covers setup, conventions and
the shortest path to a merged PR.

## Getting set up

```bash
git clone https://github.com/Parsa-Nasiri/RouteFlow.git
cd RouteFlow
npm install
npm run dev      # app on http://localhost:5173
npm test         # 87 tests — all must pass
```

Requirements: Node 18+ (20/22 recommended). No environment variables, no external
services — everything runs locally.

## Project map

| Path | Role |
| --- | --- |
| `src/lib/` | Pure domain logic (dates, streaks, scoring, analytics, storage) — no React |
| `src/store/core.ts` | The reducer + action vocabulary shared by UI, agent API and tests |
| `src/store/StoreContext.tsx` | React provider: localStorage mirror + vault/API sync |
| `src/components/ui/` | Design system (Button, Modal, Toast, forms…) |
| `src/pages/` | One file per screen |
| `plugins/vault.ts` | Markdown vault: serializer + tolerant parser + disk-rescan store |
| `plugins/routeflow-api.ts` | Vite plugin exposing `/api/*` over the real reducer |
| `.agents/skills/routeflow/` | Agent skill + references (update these when behavior changes) |

Start with [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md) for the full architecture story.

## Ground rules

1. **One reducer for everything.** New capabilities = new actions in
   `src/store/core.ts` + UI that dispatches them. If the vault should support a new
   field, extend `plugins/vault.ts` (serialize + parse) and add a round-trip test.
2. **TypeScript strict stays strict.** `npm run build` type-checks with
   `noUnusedLocals`/`noUnusedParameters` — no `any`, no suppressed errors.
3. **Tests are part of the feature.** Logic changes need unit tests; UI changes
   need at least a render/interaction test in `src/app.test.tsx`; vault format
   changes need round-trip tests in `plugins/vault.test.ts`.
4. **No new runtime dependencies** without discussion — the zero-dependency charts
   and local-first posture are deliberate.
5. **Console stays clean.** No warnings or errors from the running app.
6. **Never commit `vault/` or `data/`** — they contain personal data and are
   gitignored. Also avoid pasting your own vault contents into issues.

## Code style

- Functional React components with hooks; no classes.
- Tailwind utility classes with the design tokens (`bg-surface`, `text-ink`,
  `border-line`, `text-primary`…) — never raw hex values in components.
- Pure functions in `src/lib/`; side effects only in the store provider, plugin
  and page components.
- Accessible by default: labeled controls, `role` on custom widgets, visible
  focus rings, `prefers-reduced-motion` respected (animations are opt-out globally).

## Commits & pull requests

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- One logical change per PR; describe *why*, not just what.
- PR checklist:
  - [ ] `npm test` passes
  - [ ] `npm run build` passes
  - [ ] Docs/skill updated if user-facing or agent-facing behavior changed
  - [ ] No personal data (vault/data) in the diff

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, and the
browser/Node versions. For vault-related bugs, include the *shape* of the file
(titles/ids are fine) — redact anything private.

## Licensing

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
