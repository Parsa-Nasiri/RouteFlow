import { DATA_VERSION, STORAGE_KEY } from './constants'
import type { AppData } from '../types'

/**
 * Entities created by the original demo dataset (pre-v2). RouteFlow now starts
 * empty, so migration strips these while keeping everything the user created.
 * User-created ids come from uid() (`task_<ts>_<rand>`); demo ids used dashes.
 */
const DEMO_ID_PATTERNS: { key: keyof AppData; pattern: RegExp }[] = [
  { key: 'tasks', pattern: /^task-(p|t|u|b)\d+$/ },
  { key: 'habits', pattern: /^habit-\d+$/ },
  { key: 'goals', pattern: /^goal-(website|marathon|books|spanish)$/ },
  { key: 'blocks', pattern: /^block-w\d+-\d+$/ },
  { key: 'sessions', pattern: /^session-(p|t)\d+$/ },
]

/** Upgrade older persisted data to the current schema (v1 demo era -> v2 empty-first). */
export function migrateData(data: AppData): AppData {
  const next: AppData = { ...data, version: DATA_VERSION }
  for (const { key, pattern } of DEMO_ID_PATTERNS) {
    const kept = (next[key] as { id: string }[]).filter((x) => !pattern.test(x.id))
    ;(next as unknown as Record<string, unknown>)[key] = kept
  }
  // clean links pointing at removed demo goals
  const goalIds = new Set(next.goals.map((g) => g.id))
  next.tasks = next.tasks.map((t) => (t.goalId && !goalIds.has(t.goalId) ? { ...t, goalId: undefined } : t))
  next.sessions = next.sessions.map((s) => (s.goalId && !goalIds.has(s.goalId) ? { ...s, goalId: undefined } : s))
  return next
}

export function loadAppData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppData
    if (typeof parsed !== 'object' || parsed === null) return null
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.goals)) {
      return null
    }
    if (!Array.isArray(parsed.blocks) || !Array.isArray(parsed.sessions)) return null
    if (typeof parsed.profile !== 'object' || typeof parsed.settings !== 'object') return null
    if (parsed.version === 1) return migrateData(parsed)
    if (parsed.version !== DATA_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable — the app keeps working in-memory
  }
}

/** Structural validation for imported files. Returns normalized data or null. */
export function validateImport(parsed: unknown): AppData | null {
  try {
    if (typeof parsed !== 'object' || parsed === null) return null
    const p = parsed as Partial<AppData>
    if (!p.profile || typeof p.profile !== 'object') return null
    if (!p.settings || typeof p.settings !== 'object') return null
    if (
      !Array.isArray(p.tasks) ||
      !Array.isArray(p.habits) ||
      !Array.isArray(p.goals) ||
      !Array.isArray(p.blocks) ||
      !Array.isArray(p.sessions)
    ) {
      return null
    }
    const tasks = p.tasks
    const habits = p.habits
    const goals = p.goals
    const blocks = p.blocks
    const sessions = p.sessions
    const shaped =
      tasks.every((t) => typeof t.id === 'string' && typeof t.title === 'string') &&
      habits.every((h) => typeof h.id === 'string' && typeof h.name === 'string') &&
      goals.every((g) => typeof g.id === 'string' && typeof g.title === 'string') &&
      blocks.every((b) => typeof b.id === 'string' && typeof b.date === 'string') &&
      sessions.every((s) => typeof s.id === 'string' && typeof s.minutes === 'number')
    if (!shaped) return null
    return {
      version: DATA_VERSION,
      profile: p.profile,
      settings: p.settings,
      tasks,
      habits,
      goals,
      blocks,
      sessions,
    }
  } catch {
    return null
  }
}
