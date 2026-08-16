/**
 * Pure store core: the Action vocabulary and reducer, free of React so that the
 * browser app, the local agent API plugin and tests all share the exact same logic.
 * Uses relative imports only — this module graph is also bundled into vite.config.ts.
 */
import type { AppData, Habit, HabitTemplate, Profile, Settings, Task, TaskStatus } from '../types'
import { uid } from '../lib/id'
import { toKey } from '../lib/dates'

export type Action =
  | { type: 'profile/set'; patch: Partial<Profile> }
  | { type: 'onboard/finish'; patch: Partial<Profile>; templates: HabitTemplate[] | null; replaceSeedHabits: boolean }
  | { type: 'task/add'; task: Omit<Task, 'id' | 'createdAt'> }
  | { type: 'task/update'; id: string; patch: Partial<Omit<Task, 'id' | 'createdAt'>> }
  | { type: 'task/status'; id: string; status: TaskStatus }
  | { type: 'task/toggleDone'; id: string }
  | { type: 'task/delete'; id: string }
  | { type: 'habit/add'; habit: Omit<Habit, 'id' | 'createdAt' | 'completions'> }
  | { type: 'habit/update'; id: string; patch: Partial<Omit<Habit, 'id' | 'createdAt' | 'completions'>> }
  | { type: 'habit/delete'; id: string }
  | { type: 'habit/toggle'; id: string; date: string }
  | { type: 'goal/add'; goal: Omit<AppData['goals'][number], 'id' | 'createdAt'> }
  | { type: 'goal/update'; id: string; patch: Partial<Omit<AppData['goals'][number], 'id' | 'createdAt'>> }
  | { type: 'goal/delete'; id: string }
  | { type: 'goal/milestone/toggle'; goalId: string; milestoneId: string }
  | { type: 'goal/milestone/add'; goalId: string; title: string }
  | { type: 'goal/milestone/delete'; goalId: string; milestoneId: string }
  | { type: 'block/add'; block: Omit<AppData['blocks'][number], 'id'> }
  | { type: 'block/update'; id: string; patch: Partial<Omit<AppData['blocks'][number], 'id'>> }
  | { type: 'block/delete'; id: string }
  | { type: 'session/add'; session: Omit<AppData['sessions'][number], 'id'> }
  | { type: 'settings/set'; patch: Partial<Settings> }
  | { type: 'data/import'; data: AppData }
  | { type: 'data/replace'; data: AppData }
  | { type: 'data/reset' }

export const ACTION_TYPES: string[] = [
  'profile/set',
  'onboard/finish',
  'task/add',
  'task/update',
  'task/status',
  'task/toggleDone',
  'task/delete',
  'habit/add',
  'habit/update',
  'habit/delete',
  'habit/toggle',
  'goal/add',
  'goal/update',
  'goal/delete',
  'goal/milestone/toggle',
  'goal/milestone/add',
  'goal/milestone/delete',
  'block/add',
  'block/update',
  'block/delete',
  'session/add',
  'settings/set',
  'data/import',
  'data/replace',
  'data/reset',
]

/** Habits picked during onboarding are created clean — history starts with the user's first check. */
function habitFromTemplate(t: HabitTemplate): Habit {
  return {
    id: uid('habit'),
    name: t.name,
    icon: t.icon,
    color: t.color,
    days: t.days,
    createdAt: new Date().toISOString(),
    completions: [],
  }
}

function withGoalMilestoneAutoStatus(goal: AppData['goals'][number]): AppData['goals'][number] {
  const allDone = goal.milestones.length > 0 && goal.milestones.every((m) => m.done)
  if (allDone && goal.status !== 'completed') {
    return { ...goal, status: 'completed', completedAt: new Date().toISOString() }
  }
  if (!allDone && goal.status === 'completed') {
    return { ...goal, status: 'active', completedAt: undefined }
  }
  return goal
}

function setTaskDone(task: Task, done: boolean): Task {
  if (done) {
    return { ...task, status: 'done', completedAt: task.completedAt ?? new Date().toISOString() }
  }
  const status: TaskStatus =
    task.dueDate && toKey(new Date(task.dueDate)) === toKey(new Date()) ? 'today' : 'backlog'
  return { ...task, status, completedAt: undefined }
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'profile/set':
      return { ...state, profile: { ...state.profile, ...action.patch } }

    case 'onboard/finish': {
      let habits = state.habits
      if (action.templates && action.templates.length > 0) {
        habits = action.replaceSeedHabits
          ? action.templates.map((t) => habitFromTemplate(t))
          : [...state.habits, ...action.templates.map((t) => habitFromTemplate(t))]
      }
      return {
        ...state,
        habits,
        profile: { ...state.profile, ...action.patch, onboarded: true },
      }
    }

    case 'task/add':
      return {
        ...state,
        tasks: [{ ...action.task, id: uid('task'), createdAt: new Date().toISOString() }, ...state.tasks],
      }

    case 'task/update':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t
          const patched = { ...t, ...action.patch }
          if (action.patch.status && action.patch.status !== 'done') patched.completedAt = undefined
          return patched
        }),
      }

    case 'task/status':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t
          if (action.status === 'done') return setTaskDone(t, true)
          return { ...t, status: action.status, completedAt: undefined }
        }),
      }

    case 'task/toggleDone':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? setTaskDone(t, t.status !== 'done') : t)),
      }

    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }

    case 'habit/add':
      return {
        ...state,
        habits: [
          ...state.habits,
          { ...action.habit, id: uid('habit'), createdAt: new Date().toISOString(), completions: [] },
        ],
      }

    case 'habit/update':
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === action.id ? { ...h, ...action.patch } : h)),
      }

    case 'habit/delete':
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id) }

    case 'habit/toggle':
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h
          const has = h.completions.includes(action.date)
          return {
            ...h,
            completions: has
              ? h.completions.filter((c) => c !== action.date)
              : [...h.completions, action.date].sort(),
          }
        }),
      }

    case 'goal/add':
      return {
        ...state,
        goals: [{ ...action.goal, id: uid('goal'), createdAt: new Date().toISOString() }, ...state.goals],
      }

    case 'goal/update':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      }

    case 'goal/delete':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) }

    case 'goal/milestone/toggle':
      return {
        ...state,
        goals: state.goals.map((g) => {
          if (g.id !== action.goalId) return g
          return withGoalMilestoneAutoStatus({
            ...g,
            milestones: g.milestones.map((m) =>
              m.id === action.milestoneId
                ? { ...m, done: !m.done, completedAt: !m.done ? new Date().toISOString() : undefined }
                : m,
            ),
          })
        }),
      }

    case 'goal/milestone/add':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, milestones: [...g.milestones, { id: uid('ms'), title: action.title, done: false }] }
            : g,
        ),
      }

    case 'goal/milestone/delete':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? withGoalMilestoneAutoStatus({ ...g, milestones: g.milestones.filter((m) => m.id !== action.milestoneId) })
            : g,
        ),
      }

    case 'block/add':
      return { ...state, blocks: [...state.blocks, { ...action.block, id: uid('block') }] }

    case 'block/update':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      }

    case 'block/delete':
      return { ...state, blocks: state.blocks.filter((b) => b.id !== action.id) }

    case 'session/add':
      return {
        ...state,
        sessions: [
          ...state.sessions,
          {
            ...action.session,
            completedAt: action.session.completedAt ?? new Date().toISOString(),
            id: uid('session'),
          },
        ],
      }

    case 'settings/set':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'data/import':
      return action.data

    case 'data/replace':
      return action.data

    case 'data/reset':
      // reset is handled by the provider (needs the seed generator); core keeps state unchanged
      return state

    default: {
      // compile-time exhaustiveness; runtime-safe fallback for unknown payloads
      const exhaustive: never = action
      void exhaustive
      return state
    }
  }
}

/** Sequentially apply a batch of actions (used by the agent API). All-or-nothing. */
export function applyActions(state: AppData, actions: unknown[]): { ok: true; state: AppData } | { ok: false; error: string; index: number } {
  let current = state
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]
    if (typeof a !== 'object' || a === null || !('type' in a) || typeof (a as { type: unknown }).type !== 'string') {
      return { ok: false, error: 'Action must be an object with a string "type"', index: i }
    }
    const type = (a as { type: string }).type
    if (!ACTION_TYPES.includes(type)) {
      return { ok: false, error: `Unknown action type "${type}". Valid types: ${ACTION_TYPES.join(', ')}`, index: i }
    }
    if (type === 'data/replace' || type === 'data/import') {
      // reserved for the app UI; the API exposes safer equivalents (PUT /api/state)
      return {
        ok: false,
        error: `Action "${type}" is not exposed via the API. Use PUT /api/state for whole-state replacement.`,
        index: i,
      }
    }
    try {
      current = reducer(current, a as Action)
    } catch (err) {
      return { ok: false, error: `Reducer rejected action ${i} (${type}): ${String(err)}`, index: i }
    }
  }
  return { ok: true, state: current }
}
