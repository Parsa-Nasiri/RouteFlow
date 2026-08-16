/**
 * The RouteFlow vault — Markdown files as the single source of truth.
 *
 * vault/
 *   README.md       human/agent guide (generated once, informational only)
 *   profile.md      profile + settings as `key: value` lines
 *   tasks.md        checkbox lists grouped under ## Today / In Progress / Backlog / Done
 *   habits.md       one `## Name` section per habit with dated check-in lines
 *   goals/<slug>.md one file per goal with milestones as checkboxes
 *   planner.md      `## YYYY-MM-DD` days with time blocks
 *   focus-log.md    one line per completed focus session
 *   .meta.json      machine file: {revision, updatedAt} — do not hand-edit
 *
 * Parsing is tolerant: unknown lines/keys are ignored, ids are preserved when
 * present and generated when absent, checkbox state and section placement drive
 * status. Serialization is stable, so state -> files -> state round-trips.
 */
import type {
  AppData,
  BlockCategory,
  Category,
  FocusSession,
  Goal,
  GoalStatus,
  Habit,
  Priority,
  Task,
  TaskStatus,
  TimeBlock,
} from '../src/types'
import { uid } from '../src/lib/id'
import { createSeedData } from '../src/lib/seed'
import { migrateData } from '../src/lib/storage'

export type VaultFiles = Record<string, string>

const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const CATEGORIES: Category[] = ['Work', 'Personal', 'Health', 'Learning', 'Errands']
const BLOCK_CATEGORIES: BlockCategory[] = ['deep-work', 'meeting', 'exercise', 'personal', 'study']
const GOAL_STATUSES: GoalStatus[] = ['active', 'paused', 'completed']
const TASK_STATUS_ORDER: TaskStatus[] = ['today', 'in-progress', 'backlog', 'done']
const SECTION_TO_STATUS: Record<string, TaskStatus> = {
  today: 'today',
  'in progress': 'in-progress',
  'in-progress': 'in-progress',
  backlog: 'backlog',
  done: 'done',
}
const STATUS_TO_SECTION: Record<TaskStatus, string> = {
  today: 'Today',
  'in-progress': 'In Progress',
  backlog: 'Backlog',
  done: 'Done',
}

// ---------- shared helpers ----------

/** Extract the trailing backtick meta block from a line: `title \`k:v | k:v\`` */
function splitMeta(line: string): { text: string; meta: Record<string, string> } {
  const last = line.lastIndexOf('`')
  if (last === -1) return { text: line.trim(), meta: {} }
  const open = line.lastIndexOf('`', last - 1)
  if (open === -1) return { text: line.trim(), meta: {} }
  const text = line.slice(0, open).trim()
  const meta: Record<string, string> = {}
  for (const part of line.slice(open + 1, last).split('|')) {
    const idx = part.indexOf(':')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim().toLowerCase()
    const value = part.slice(idx + 1).trim()
    if (key) meta[key] = value
  }
  return { text, meta }
}

function metaString(meta: [string, string | undefined][]): string {
  return meta
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(' | ')
}

function enumOr<T extends string>(value: string | undefined, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function isoLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  return d.getSeconds() === 0 ? base : `${base}:${p(d.getSeconds())}`
}

/** Order-insensitive comparison: sorts collections by id, fixes key order, ignores sub-second timestamp drift. */
export function canonical(state: AppData): string {
  const norm = (v?: string) => {
    if (!v) return null
    const t = new Date(v).getTime()
    return Number.isNaN(t) ? v : Math.floor(t / 1000)
  }
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
  const normalized = {
    version: state.version,
    profile: state.profile,
    settings: state.settings,
    tasks: [...state.tasks]
      .sort(byId)
      .map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes ?? null,
        status: t.status,
        priority: t.priority,
        category: t.category,
        dueDate: t.dueDate ?? null,
        dueTime: t.dueTime ?? null,
        goalId: t.goalId ?? null,
        createdAt: norm(t.createdAt),
        completedAt: norm(t.completedAt),
      })),
    habits: [...state.habits]
      .sort(byId)
      .map((h) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        days: [...h.days].sort((a, b) => a - b),
        createdAt: norm(h.createdAt),
        completions: [...h.completions].sort(),
      })),
    goals: [...state.goals]
      .sort(byId)
      .map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        targetDate: g.targetDate ?? null,
        status: g.status,
        createdAt: norm(g.createdAt),
        completedAt: norm(g.completedAt),
        milestones: [...g.milestones]
          .sort(byId)
          .map((m) => ({ id: m.id, title: m.title, done: m.done, completedAt: norm(m.completedAt) })),
      })),
    blocks: [...state.blocks]
      .sort(byId)
      .map((b) => ({ id: b.id, title: b.title, date: b.date, start: b.start, end: b.end, category: b.category })),
    sessions: [...state.sessions]
      .sort(byId)
      .map((s) => ({
        id: s.id,
        date: s.date,
        minutes: s.minutes,
        taskId: s.taskId ?? null,
        goalId: s.goalId ?? null,
        completedAt: norm(s.completedAt),
      })),
  }
  return JSON.stringify(normalized)
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'goal'
  )
}

// ---------- serialize ----------

export function serializeState(state: AppData): VaultFiles {
  const files: VaultFiles = {}
  files['profile.md'] = serializeProfile(state)
  files['tasks.md'] = serializeTasks(state.tasks)
  files['habits.md'] = serializeHabits(state.habits)
  files['planner.md'] = serializeBlocks(state.blocks)
  files['focus-log.md'] = serializeSessions(state.sessions)
  for (const goal of state.goals) {
    files[`goals/${goalFile(goal)}`] = serializeGoal(goal)
  }
  return files
}

function goalFile(goal: Goal): string {
  return `${slugify(goal.title)}-${goal.id.slice(-4)}.md`
}

function serializeProfile(state: AppData): string {
  return [
    '# Profile',
    '',
    `name: ${state.profile.name}`,
    `primary goal: ${state.profile.primaryGoal}`,
    `work start: ${state.profile.workStart}`,
    `work end: ${state.profile.workEnd}`,
    `energy: ${state.profile.energy}`,
    `onboarded: ${state.profile.onboarded ? 'true' : 'false'}`,
    '',
    '# Settings',
    '',
    `theme: ${state.settings.theme}`,
    `focus target (min/day): ${state.settings.focusTarget}`,
    '',
  ].join('\n')
}

function serializeTasks(tasks: Task[]): string {
  const lines = ['# Tasks', '']
  for (const status of TASK_STATUS_ORDER) {
    const items = tasks.filter((t) => t.status === status)
    if (items.length === 0) continue
    lines.push(`## ${STATUS_TO_SECTION[status]}`, '')
    for (const t of items) {
      const meta = metaString([
        ['id', t.id],
        ['priority', t.priority],
        ['category', t.category],
        ['due', t.dueDate],
        ['time', t.dueTime],
        ['goal', t.goalId],
        ['created', isoLocal(t.createdAt)],
        ['completed', t.completedAt ? isoLocal(t.completedAt) : undefined],
      ])
      lines.push(`- [${t.status === 'done' ? 'x' : ' '}] ${t.title} \`${meta}\``)
      if (t.notes) lines.push(`    ${t.notes.replace(/\r?\n/g, ' ')}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function serializeHabits(habits: Habit[]): string {
  const lines = ['# Habits', '']
  for (const h of habits) {
    const meta = metaString([
      ['id', h.id],
      ['icon', h.icon],
      ['color', h.color],
      ['days', [...h.days].sort().join(',')],
      ['created', isoLocal(h.createdAt)],
    ])
    lines.push(`## ${h.name} \`${meta}\``)
    for (const date of [...h.completions].sort().reverse()) {
      lines.push(`- [x] ${date}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function serializeGoal(goal: Goal): string {
  const meta = metaString([
    ['id', goal.id],
    ['category', goal.category],
    ['target', goal.targetDate],
    ['status', goal.status],
    ['created', isoLocal(goal.createdAt)],
  ])
  const lines = [`# ${goal.title} \`${meta}\``, '']
  if (goal.description) lines.push(goal.description, '')
  if (goal.milestones.length > 0) {
    lines.push('## Milestones', '')
    for (const m of goal.milestones) {
      const msMeta = metaString([
        ['id', m.id],
        ['completed', m.completedAt ? isoLocal(m.completedAt) : undefined],
      ])
      lines.push(`- [${m.done ? 'x' : ' '}] ${m.title} \`${msMeta}\``)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function serializeBlocks(blocks: TimeBlock[]): string {
  const lines = ['# Planner', '']
  const byDate = new Map<string, TimeBlock[]>()
  for (const b of blocks) {
    if (!byDate.has(b.date)) byDate.set(b.date, [])
    byDate.get(b.date)!.push(b)
  }
  for (const date of [...byDate.keys()].sort()) {
    lines.push(`## ${date}`, '')
    for (const b of byDate.get(date)!.sort((x, y) => x.start.localeCompare(y.start))) {
      const meta = metaString([
        ['id', b.id],
        ['time', `${b.start}-${b.end}`],
        ['category', b.category],
      ])
      lines.push(`- **${b.title}** \`${meta}\``)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function serializeSessions(sessions: FocusSession[]): string {
  const lines = ['# Focus log', '']
  for (const s of [...sessions].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    const meta = metaString([
      ['id', s.id],
      ['task', s.taskId],
      ['goal', s.goalId],
    ])
    lines.push(`- ${isoLocal(s.completedAt)} — ${s.minutes}m \`${meta}\``)
  }
  return lines.join('\n') + '\n'
}

// ---------- parse ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export interface ParseResult {
  state: AppData
  /** entities that were assigned fresh ids or filled-in timestamps (need write-back) */
  filled: number
}

export function parseVault(files: VaultFiles, fallback: AppData): ParseResult {
  let filled = 0
  const markFill = () => {
    filled++
  }
  const profile = parseProfile(files['profile.md'] ?? '', fallback)
  const tasks = parseTasks(files['tasks.md'] ?? '', () => {
    filled++
    return uid('task')
  }, markFill)
  const habits = parseHabits(files['habits.md'] ?? '', () => {
    filled++
    return uid('habit')
  })
  const goals = parseGoals(files, () => {
    filled++
    return uid('goal')
  }, () => {
    filled++
    return uid('ms')
  }, markFill)
  const blocks = parseBlocks(files['planner.md'] ?? '', () => {
    filled++
    return uid('block')
  })
  const sessions = parseSessions(files['focus-log.md'] ?? '', () => {
    filled++
    return uid('session')
  })
  return {
    state: { version: 2, profile: profile.profile, settings: profile.settings, tasks, habits, goals, blocks, sessions },
    filled,
  }
}

function parseProfile(content: string, fallback: AppData): { profile: AppData['profile']; settings: AppData['settings'] } {
  const profile = { ...fallback.profile }
  const settings = { ...fallback.settings }
  const kv: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1 || line.startsWith('#')) continue
    const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, ' ')
    const value = line.slice(idx + 1).trim()
    if (key) kv[key] = value
  }
  if (kv['name'] !== undefined) profile.name = kv['name']
  if (kv['primary goal'] !== undefined) profile.primaryGoal = kv['primary goal']
  if (kv['work start'] !== undefined) profile.workStart = kv['work start']
  if (kv['work end'] !== undefined) profile.workEnd = kv['work end']
  if (kv['energy'] !== undefined) {
    profile.energy = enumOr(kv['energy'], ['morning', 'afternoon', 'evening', 'night'] as const, profile.energy)
  }
  if (kv['onboarded'] !== undefined) profile.onboarded = kv['onboarded'] === 'true'
  if (kv['theme'] !== undefined) {
    settings.theme = enumOr(kv['theme'], ['light', 'dark', 'system'] as const, settings.theme)
  }
  const target = Number(kv['focus target (min/day)'])
  if (Number.isFinite(target) && target >= 15 && target <= 960) settings.focusTarget = target
  return { profile, settings }
}

function parseTasks(content: string, newId: () => string, markFill: () => void): Task[] {
  const tasks: Task[] = []
  const lines = content.split(/\r?\n/)
  let section: TaskStatus = 'backlog'
  let current: Task | null = null
  for (const line of lines) {
    const heading = line.match(/^##\s+(.*)$/)
    if (heading) {
      const key = heading[1].trim().toLowerCase().replace(/\s+/g, '-')
      section = SECTION_TO_STATUS[key] ?? section
      current = null
      continue
    }
    const item = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/)
    if (item) {
      const { text, meta } = splitMeta(item[2])
      if (!text) continue
      const checked = item[1].toLowerCase() === 'x'
      const done = checked || section === 'done'
      const status = done ? 'done' : enumOr(meta['status'], TASK_STATUS_ORDER, section)
      const due = DATE_RE.test(meta['due'] ?? '') ? meta['due'] : undefined
      let completed: string | undefined
      if (done && meta['completed']) {
        completed = toIso(meta['completed'])
      } else if (done) {
        completed = new Date().toISOString()
        markFill()
      }
      const task: Task = {
        id: meta['id'] || newId(),
        title: text,
        notes: undefined,
        status,
        priority: enumOr(meta['priority'], PRIORITIES, 'medium'),
        category: enumOr(meta['category'], CATEGORIES, 'Work'),
        dueDate: due,
        dueTime: TIME_RE.test(meta['time'] ?? '') ? meta['time'] : undefined,
        goalId: meta['goal'] || undefined,
        createdAt: toIso(meta['created']) ?? new Date().toISOString(),
        completedAt: completed,
      }
      tasks.push(task)
      current = task
      continue
    }
    if (current && /^\s{2,}\S/.test(line)) {
      const note = line.trim()
      current.notes = current.notes ? `${current.notes} ${note}` : note
    }
  }
  return tasks
}

function parseHabits(content: string, newId: () => string): Habit[] {
  const habits: Habit[] = []
  let current: Habit | null = null
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.*)$/)
    if (heading) {
      const { text, meta } = splitMeta(heading[1])
      if (!text) {
        current = null
        continue
      }
      const days = (meta['days'] ?? '')
        .split(',')
        .map((d) => Number(d.trim()))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      current = {
        id: meta['id'] || newId(),
        name: text,
        icon: meta['icon'] || '🎯',
        color: /^#[0-9a-fA-F]{6}$/.test(meta['color'] ?? '') ? meta['color']! : '#5B5BD6',
        days: [...new Set(days)],
        createdAt: toIso(meta['created']) ?? new Date().toISOString(),
        completions: [],
      }
      habits.push(current)
      continue
    }
    const check = line.match(/^[-*]\s+\[([ xX])\]\s*(\d{4}-\d{2}-\d{2})/)
    if (current && check && check[1].toLowerCase() === 'x') {
      current.completions.push(check[2])
    }
  }
  for (const h of habits) h.completions.sort()
  return habits
}

function parseGoals(files: VaultFiles, newGoalId: () => string, newMsId: () => string, markFill: () => void): Goal[] {
  const goals: Goal[] = []
  const names = Object.keys(files).filter((n) => n.startsWith('goals/') && n.endsWith('.md')).sort()
  for (const name of names) {
    const lines = files[name].split(/\r?\n/)
    const h1 = lines[0]?.match(/^#\s+(.*)$/)
    if (!h1) continue
    const { text, meta } = splitMeta(h1[1])
    if (!text) continue
    const goal: Goal = {
      id: meta['id'] || newGoalId(),
      title: text,
      description: '',
      category: enumOr(meta['category'], CATEGORIES, 'Work'),
      targetDate: DATE_RE.test(meta['target'] ?? '') ? meta['target'] : undefined,
      status: enumOr(meta['status'], GOAL_STATUSES, 'active'),
      milestones: [],
      createdAt: toIso(meta['created']) ?? new Date().toISOString(),
      completedAt: undefined,
    }
    if (goal.status === 'completed') {
      goal.completedAt = toIso(meta['completed']) ?? new Date().toISOString()
    }
    let inDescription = true
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (/^##\s+Milestones/i.test(line)) {
        inDescription = false
        continue
      }
      if (!inDescription) {
        const item = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/)
        if (item) {
          const { text: msText, meta: msMeta } = splitMeta(item[2])
          if (!msText) continue
          const done = item[1].toLowerCase() === 'x'
          let msCompleted: string | undefined
          if (done && msMeta['completed']) {
            msCompleted = toIso(msMeta['completed'])
          } else if (done) {
            msCompleted = new Date().toISOString()
            markFill()
          }
          goal.milestones.push({
            id: msMeta['id'] || newMsId(),
            title: msText,
            done,
            completedAt: msCompleted,
          })
        }
        continue
      }
      if (line.trim()) goal.description += (goal.description ? '\n' : '') + line.trim()
    }
    goals.push(goal)
  }
  return goals
}

function parseBlocks(content: string, newId: () => string): TimeBlock[] {
  const blocks: TimeBlock[] = []
  let date: string | null = null
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/)
    if (heading) {
      date = heading[1]
      continue
    }
    if (!date) continue
    const item = line.match(/^[-*]\s+\*\*(.*)\*\*\s*(.*)$/)
    if (item) {
      const title = item[1].trim()
      const { meta } = splitMeta(item[2])
      const time = (meta['time'] ?? '').split('-')
      const start = TIME_RE.test(time[0]?.trim() ?? '') ? time[0].trim() : undefined
      const end = TIME_RE.test(time[1]?.trim() ?? '') ? time[1].trim() : undefined
      if (!title || !start || !end) continue
      blocks.push({
        id: meta['id'] || newId(),
        title,
        date,
        start,
        end,
        category: enumOr(meta['category'], BLOCK_CATEGORIES, 'deep-work'),
      })
    }
  }
  return blocks
}

function parseSessions(content: string, newId: () => string): FocusSession[] {
  const sessions: FocusSession[] = []
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^-\s+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?\s*[-–—]\s*(\d+)\s*m?\s*(.*)$/)
    if (!m) continue
    const { meta } = splitMeta(m[4])
    sessions.push({
      id: meta['id'] || newId(),
      date: m[1],
      minutes: Math.max(1, Math.min(600, Number(m[3]))),
      taskId: meta['task'] || undefined,
      goalId: meta['goal'] || undefined,
      completedAt: toIso(`${m[1]} ${m[2]}`) ?? new Date().toISOString(),
    })
  }
  return sessions
}

function toIso(local: string | undefined): string | undefined {
  if (!local) return undefined
  const d = new Date(local.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

// ---------- vault store (framework-free, testable) ----------

export interface VaultEnv {
  revision: number
  updatedAt: string
  state: AppData
  hasFile: boolean
}

async function listVaultFiles(dir: string, prefix = ''): Promise<string[]> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await (await import('node:fs/promises')).readdir(joinPaths(dir, prefix), { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...(await listVaultFiles(dir, rel)))
    else if (e.name.endsWith('.md')) out.push(rel)
  }
  return out
}

/** small path helper to avoid importing node:path at module top in browser-ish contexts */
function joinPaths(a: string, b: string): string {
  return b ? `${a}/${b}` : a
}

export interface VaultStore {
  /** current envelope; refreshes from disk first */
  get(): Promise<VaultEnv>
  /** persist a (mutated) envelope back to the vault files */
  persist(env: Omit<VaultEnv, 'hasFile'>): Promise<void>
}

export async function createVaultStore(
  vaultDir: string,
  legacyJson?: string
): Promise<VaultStore> {
  const fs = await import('node:fs/promises')
  const pathMod = await import('node:path')
  const p = pathMod.default ?? (pathMod as unknown as typeof import('node:path'))
  let env: VaultEnv | null = null
  let snapshot: VaultFiles = {}

  const readVault = async (): Promise<VaultFiles> => {
    const files: VaultFiles = {}
    for (const rel of await listVaultFiles(vaultDir)) {
      if (rel === 'README.md') continue // informational only
      files[rel] = await fs.readFile(p.join(vaultDir, rel), 'utf8')
    }
    return files
  }

  const writeVault = async (state: AppData, revision: number, updatedAt: string): Promise<VaultFiles> => {
    const target = serializeState(state)
    const written: VaultFiles = { ...snapshot }
    await fs.mkdir(p.join(vaultDir, 'goals'), { recursive: true })
    for (const [rel, content] of Object.entries(target)) {
      if (written[rel] === content) continue
      await fs.mkdir(p.dirname(p.join(vaultDir, rel)), { recursive: true })
      await fs.writeFile(p.join(vaultDir, rel), content, 'utf8')
      written[rel] = content
    }
    for (const rel of Object.keys(written)) {
      if (rel.startsWith('goals/') && !(rel in target)) {
        try {
          await fs.unlink(p.join(vaultDir, rel))
        } catch {
          // already gone
        }
        delete written[rel]
      }
    }
    try {
      await fs.readFile(p.join(vaultDir, 'README.md'), 'utf8')
    } catch {
      await fs.writeFile(p.join(vaultDir, 'README.md'), vaultReadme(), 'utf8')
    }
    await fs.writeFile(
      p.join(vaultDir, '.meta.json'),
      JSON.stringify({ revision, updatedAt }, null, 2),
      'utf8'
    )
    return written
  }

  const initEnv = async (): Promise<VaultEnv> => {
    if (env) return env
    const files = await readVault()
    let state: AppData | null = null
    let revision = 1

    if (Object.keys(files).length === 0 && legacyJson) {
      try {
        const raw = JSON.parse(await fs.readFile(legacyJson, 'utf8')) as Partial<{ revision: number; state: AppData }>
        if (raw && typeof raw.revision === 'number' && raw.state) {
          state = raw.state.version === 1 ? migrateData(raw.state) : raw.state
          revision = raw.revision
        }
      } catch {
        // no legacy file
      }
      try {
        await fs.rename(legacyJson, `${legacyJson}.bak`)
      } catch {
        // nothing to rename
      }
    }
    if (!state) state = createSeedData()

    if (Object.keys(files).length === 0) {
      const now = new Date().toISOString()
      snapshot = await writeVault(state, revision, now)
      // re-parse what we wrote so in-memory format matches disk exactly
      const parsed = parseVault(snapshot, state)
      env = { revision, updatedAt: now, state: parsed.state, hasFile: true }
      return env
    }

    const parsed = parseVault(files, createSeedData())
    let metaRevision = 1
    try {
      const meta = JSON.parse(await fs.readFile(p.join(vaultDir, '.meta.json'), 'utf8')) as { revision?: number }
      if (typeof meta.revision === 'number' && meta.revision >= 1) metaRevision = meta.revision
    } catch {
      // no meta yet
    }
    snapshot = parsed.filled > 0 ? await writeVault(parsed.state, metaRevision, new Date().toISOString()) : files
    env = { revision: metaRevision, updatedAt: new Date().toISOString(), state: parsed.state, hasFile: true }
    return env
  }

  const refresh = async (): Promise<void> => {
    const e = await initEnv()
    const files = await readVault()
    const changedOnDisk =
      Object.keys(files).length !== Object.keys(snapshot).length ||
      Object.entries(files).some(([rel, content]) => snapshot[rel] !== content)
    if (!changedOnDisk) return
    const parsed = parseVault(files, e.state)
    snapshot = files
    if (canonical(parsed.state) === canonical(e.state)) return
    e.state = parsed.state
    e.revision += 1
    e.updatedAt = new Date().toISOString()
    if (parsed.filled > 0) {
      snapshot = await writeVault(parsed.state, e.revision, e.updatedAt)
    }
  }

  return {
    async get() {
      await refresh()
      return initEnv()
    },
    async persist(next: VaultEnv) {
      await initEnv()
      env = { ...next, hasFile: true }
      snapshot = await writeVault(next.state, next.revision, next.updatedAt)
    },
  }
}

// ---------- vault README (informational, written once) ----------

export function vaultReadme(): string {
  return `# RouteFlow vault

This directory **is** the app's data. Every task, habit, goal, time block and focus
session lives here as plain Markdown. The running app reads these files and writes
them back; you (human or AI) can read and edit them freely.

## How the app syncs

- The dev server re-reads this vault whenever files change (checks on every app
  poll, ~2 s). Edits appear in the open browser tab automatically.
- Changes made in the app UI rewrite these files — re-read before editing after
  the app has written, and keep your edits to one entity per save when possible.
- \`.meta.json\` tracks the revision counter; the parser ignores it — never edit it.

## File formats

\`\`\`markdown
# tasks.md
## Today                       <- section sets the status (Today / In Progress / Backlog / Done)
- [ ] Call the dentist \`id:task_x | priority:low | category:Personal | due:2026-08-17 | time:09:00\`
    Ask for a morning slot    <- indented line = task notes
## Done
- [x] Ship the demo \`id:task_y | priority:high | category:Work | completed:2026-08-16 09:12\`

# habits.md
## Read 20 pages \`id:habit_x | icon:📚 | color:#0E8CC0 | days:0,1,2,3,4,5,6 | created:2026-08-16 10:00\`
- [x] 2026-08-16              <- one line per completed day (only [x] counts)

# goals/<slug>.md              <- one file per goal
# Run a half marathon \`id:goal_x | category:Health | target:2026-12-01 | status:active\`
Free-text description here.
## Milestones
- [x] Comfortable 5k \`id:ms_x | completed:2026-07-15 08:12\`
- [ ] Long run 15k \`id:ms_y\`

# planner.md
## 2026-08-16
- **Deep work — writing** \`id:block_x | time:09:00-11:00 | category:deep-work\`

# focus-log.md
- 2026-08-16 09:05 — 25m \`id:session_x | task:task_y\`

# profile.md                  <- name/primary goal/work hours/energy/onboarded + theme/focus target
\`\`\`

## Editing rules

- **Keep ids.** The id in the backtick block is the entity's identity — reuse it to
  edit, drop it only when creating something new (an id will be generated on save).
- The backtick block at the end of a line holds metadata as \`key: value | key: value\`.
  Unknown keys are ignored; unknown enum values fall back to defaults.
- Complete a task/habit/milestone by flipping \`[ ]\` to \`[x]\` (or moving it under
  \`## Done\`). Reopen by flipping back.
- Change status by moving a task under another section. Delete by removing the line.
- Valid enums: priority low|medium|high · category Work|Personal|Health|Learning|Errands ·
  block category deep-work|meeting|exercise|personal|study · goal status active|paused|completed.
- Dates are \`YYYY-MM-DD\`, times \`HH:MM\` (24h). Times in metadata are local.

See the repo's \`.agents/skills/routeflow/\` for the full agent guide.
`
}
