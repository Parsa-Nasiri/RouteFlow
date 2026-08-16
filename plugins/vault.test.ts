import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { canonical, createVaultStore, parseVault, serializeState, slugify } from './vault'
import { createDemoData } from '../src/lib/seed'
import type { AppData } from '../src/types'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'routeflow-vault-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const roundTrip = (state: AppData): AppData => parseVault(serializeState(state), state).state

describe('vault round-trip', () => {
  it('losslessly round-trips a full state (demo fixture)', () => {
    const demo = createDemoData()
    const again = roundTrip(demo)
    expect(canonical(again)).toBe(canonical(demo))
    // and serialization is idempotent
    expect(serializeState(again)).toEqual(serializeState(demo))
  })

  it('round-trips an empty state', () => {
    const empty: AppData = {
      version: 2,
      profile: { name: '', primaryGoal: '', workStart: '09:00', workEnd: '18:00', energy: 'morning', onboarded: false },
      settings: { theme: 'system', focusTarget: 120 },
      tasks: [],
      habits: [],
      goals: [],
      blocks: [],
      sessions: [],
    }
    const again = roundTrip(empty)
    expect(canonical(again)).toBe(canonical(empty))
  })
})

describe('agent-style edits (parse)', () => {
  const base: AppData = {
    version: 2,
    profile: { name: 'Parsa', primaryGoal: '', workStart: '09:00', workEnd: '18:00', energy: 'morning', onboarded: true },
    settings: { theme: 'system', focusTarget: 120 },
    tasks: [],
    habits: [],
    goals: [],
    blocks: [],
    sessions: [],
  }

  it('parses a handwritten tasks.md: statuses from sections, ids, notes, defaults', () => {
    const files = {
      'tasks.md': [
        '# Tasks',
        '## Today',
        '- [ ] Call the dentist `id:task_a | priority:low | category:Personal | due:2026-08-17 | time:09:00`',
        '    Ask for a morning slot',
        '- [ ] No meta at all here',
        '## Done',
        '- [x] Shipped the demo `id:task_b | priority:high | category:Work | completed:2026-08-16 09:12`',
        'garbage line that is not a task',
      ].join('\n'),
    }
    const { state } = parseVault(files, base)
    expect(state.tasks).toHaveLength(3)
    const a = state.tasks.find((t) => t.id === 'task_a')!
    expect(a.status).toBe('today')
    expect(a.priority).toBe('low')
    expect(a.dueDate).toBe('2026-08-17')
    expect(a.dueTime).toBe('09:00')
    expect(a.notes).toBe('Ask for a morning slot')
    const bare = state.tasks.find((t) => t.title === 'No meta at all here')!
    expect(bare.id).toMatch(/^task_/)
    expect(bare.priority).toBe('medium')
    expect(bare.category).toBe('Work')
    const b = state.tasks.find((t) => t.id === 'task_b')!
    expect(b.status).toBe('done')
    expect(b.completedAt).toBeTruthy()
  })

  it('completing = flipping a checkbox (completedAt filled and flagged for write-back)', () => {
    const state = roundTrip({
      ...base,
      tasks: [{ id: 'task_x', title: 'Write report', status: 'today', priority: 'medium', category: 'Work', createdAt: '2026-08-16T08:00:00.000Z' }],
    })
    const files = serializeState(state)
    const edited = { 'tasks.md': files['tasks.md'].replace('- [ ] Write report', '- [x] Write report') }
    const parsed = parseVault(edited, base)
    const task = parsed.state.tasks[0]
    expect(task.status).toBe('done')
    expect(task.completedAt).toBeTruthy()
    expect(parsed.filled).toBeGreaterThan(0)
  })

  it('moving a line to another section changes its status', () => {
    const files = {
      'tasks.md': [
        '# Tasks',
        '## Backlog',
        '- [ ] Someday task `id:task_s | priority:low | category:Personal`',
      ].join('\n'),
    }
    const moved = {
      'tasks.md': files['tasks.md'].replace('## Backlog', '## Today'),
    }
    expect(parseVault(moved, base).state.tasks[0].status).toBe('today')
    const wip = {
      'tasks.md': files['tasks.md'].replace('## Backlog', '## In Progress'),
    }
    expect(parseVault(wip, base).state.tasks[0].status).toBe('in-progress')
  })

  it('parses habits with check-in dates and assigns ids to new sections', () => {
    const files = {
      'habits.md': [
        '# Habits',
        '## Read 20 pages `id:habit_r | icon:📚 | color:#0E8CC0 | days:0,1,2,3,4,5,6 | created:2026-08-16 10:00`',
        '- [x] 2026-08-15',
        '- [ ] 2026-08-16',
        '## Brand new habit',
      ].join('\n'),
    }
    const parsed = parseVault(files, base)
    expect(parsed.state.habits).toHaveLength(2)
    const r = parsed.state.habits[0]
    expect(r.completions).toEqual(['2026-08-15']) // only [x] counts
    expect(parsed.state.habits[1].id).toMatch(/^habit_/)
    expect(parsed.state.habits[1].icon).toBe('🎯')
    expect(parsed.filled).toBeGreaterThan(0)
  })

  it('parses goal files, milestones and descriptions', () => {
    const files = {
      'goals/run-a-half---abcd.md': [
        '# Run a half marathon `id:goal_r1 | category:Health | target:2026-12-01 | status:active`',
        'Finish in under 2:10.',
        '',
        '## Milestones',
        '- [x] Comfortable 5k `id:ms_1 | completed:2026-07-15 08:12`',
        '- [ ] Long run 15k `id:ms_2`',
      ].join('\n'),
    }
    const { state } = parseVault(files, base)
    expect(state.goals).toHaveLength(1)
    const g = state.goals[0]
    expect(g.title).toBe('Run a half marathon')
    expect(g.description).toBe('Finish in under 2:10.')
    expect(g.milestones[0].done).toBe(true)
    expect(g.milestones[0].completedAt).toBeTruthy()
    expect(g.milestones[1].done).toBe(false)
  })

  it('parses planner blocks and focus log lines', () => {
    const files = {
      'planner.md': [
        '# Planner',
        '## 2026-08-18',
        '- **Deep work — writing** `id:block_d1 | time:09:00-11:30 | category:deep-work`',
        '## 2026-08-19',
        '- **Team sync** `id:block_d2 | time:11:30-12:00 | category:meeting`',
      ].join('\n'),
      'focus-log.md': '- 2026-08-18 09:05 — 25m `id:session_f1 | task:task_x`\n',
    }
    const { state } = parseVault(files, base)
    expect(state.blocks).toHaveLength(2)
    expect(state.blocks[0]).toMatchObject({ title: 'Deep work — writing', date: '2026-08-18', start: '09:00', end: '11:30', category: 'deep-work' })
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0]).toMatchObject({ date: '2026-08-18', minutes: 25, taskId: 'task_x' })
  })

  it('parses profile edits (e.g. an agent marking onboarding done)', () => {
    const files = {
      'profile.md': [
        '# Profile',
        'name: Parsa',
        'primary goal: Ship the side project',
        'work start: 10:00',
        'work end: 19:00',
        'energy: evening',
        'onboarded: true',
        '',
        '# Settings',
        'theme: dark',
        'focus target (min/day): 90',
      ].join('\n'),
    }
    const { state } = parseVault(files, { ...base, profile: { ...base.profile, onboarded: false } })
    expect(state.profile.onboarded).toBe(true)
    expect(state.profile.energy).toBe('evening')
    expect(state.profile.workStart).toBe('10:00')
    expect(state.settings.theme).toBe('dark')
    expect(state.settings.focusTarget).toBe(90)
  })

  it('falls back to defaults for invalid enum values', () => {
    const files = {
      'tasks.md': '- [ ] Weird `id:task_w | priority:urgent | category:Chores | status:tomorrow`',
    }
    const t = parseVault(files, base).state.tasks[0]
    expect(t.priority).toBe('medium')
    expect(t.category).toBe('Work')
    expect(['today', 'in-progress', 'backlog']).toContain(t.status)
  })
})

describe('vault store (disk round-trip)', () => {
  it('creates the vault on first boot and adopts external edits with a revision bump', async () => {
    const store = await createVaultStore(dir)
    const first = await store.get()
    expect(first.revision).toBe(1)
    expect(first.state.tasks).toEqual([])
    expect((await readdir(dir)).length).toBeGreaterThan(3) // md files written

    // agent adds a task by editing the file directly (empty vault has no sections yet)
    const tasksPath = path.join(dir, 'tasks.md')
    const content = await readFile(tasksPath, 'utf8')
    await writeFile(tasksPath, `${content}\n## Today\n- [ ] From the agent\n`, 'utf8')

    const second = await store.get()
    expect(second.revision).toBe(2)
    expect(second.state.tasks).toHaveLength(1)
    expect(second.state.tasks[0].title).toBe('From the agent')
    expect(second.state.tasks[0].id).toMatch(/^task_/)
    // write-back stamped the generated id into the file
    const rewritten = await readFile(tasksPath, 'utf8')
    expect(rewritten).toContain('`id:task_')
  })

  it('persists programmatic mutations back into the files', async () => {
    const store = await createVaultStore(dir)
    const env = await store.get()
    const task = {
      id: 'task_p1',
      title: 'Persisted task',
      status: 'today' as const,
      priority: 'medium' as const,
      category: 'Work' as const,
      createdAt: new Date().toISOString(),
    }
    env.state = { ...env.state, tasks: [task] }
    env.revision += 1
    await store.persist(env)

    const tasksMd = await readFile(path.join(dir, 'tasks.md'), 'utf8')
    expect(tasksMd).toContain('- [ ] Persisted task')

    // complete it via file edit, then read through the store
    await writeFile(path.join(dir, 'tasks.md'), tasksMd.replace('- [ ] Persisted task', '- [x] Persisted task'), 'utf8')
    const next = await store.get()
    expect(next.state.tasks[0].status).toBe('done')
    expect(next.revision).toBe(3)
  })

  it('migrates the legacy JSON store into the vault', async () => {
    const legacy = path.join(dir, 'legacy.json')
    const demo = createDemoData()
    await writeFile(legacy, JSON.stringify({ revision: 4, updatedAt: 'x', state: demo }), 'utf8')
    const store = await createVaultStore(path.join(dir, 'vault'), legacy)
    const env = await store.get()
    expect(env.revision).toBe(4)
    expect(canonical(env.state)).toBe(canonical(demo))
    expect((await readdir(path.join(dir, 'vault'))).filter((f) => f.endsWith('.md')).length).toBeGreaterThan(4)
    // legacy file renamed out of the way
    await expect(readFile(legacy, 'utf8')).rejects.toThrow()
  })
})

describe('slugify', () => {
  it('makes filesystem-safe slugs', () => {
    expect(slugify('Launch personal website!')).toBe('launch-personal-website')
    expect(slugify('  Ünïcode--test  ')).toBe('n-code-test')
    expect(slugify('???')).toBe('goal')
  })
})
