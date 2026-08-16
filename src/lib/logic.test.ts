import { describe, expect, it } from 'vitest'
import { createSeedData, createDemoData } from '@/lib/seed'
import { currentStreak, bestStreak, completionStats, frequencyLabel } from '@/lib/habits'
import { computeTodayScore, todayTasks } from '@/lib/score'
import { dailyStats, goalProgress, habitConsistency, productivityPeaks } from '@/lib/analytics'
import { migrateData, validateImport } from '@/lib/storage'
import { DATA_VERSION } from '@/lib/constants'
import { addDays, startOfDay, toKey } from '@/lib/dates'
import { reducer } from '@/store/StoreContext'
import type { AppData, Habit, Task } from '@/types'

function iso(day: Date, hour = 10): string {
  const d = new Date(day)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

describe('seed & first-run data', () => {
  it('starts completely empty — no demo tasks, goals or habits', () => {
    const s = createSeedData()
    expect(s.tasks).toEqual([])
    expect(s.habits).toEqual([])
    expect(s.goals).toEqual([])
    expect(s.blocks).toEqual([])
    expect(s.sessions).toEqual([])
    expect(s.profile.onboarded).toBe(false)
    expect(s.profile.name).toBe('')
    expect(s.version).toBe(DATA_VERSION)
  })

  it('onboarding picks create habits with zero history', () => {
    const s = reducer(createSeedData(), {
      type: 'onboard/finish',
      patch: { name: 'Sam' },
      templates: [{ name: 'Read', icon: '📚', color: '#0E8CC0', days: [1, 2] }],
      replaceSeedHabits: true,
    })
    expect(s.habits).toHaveLength(1)
    expect(s.habits[0].completions).toEqual([])
  })
})

describe('demo fixture (test-only)', () => {
  it('is deterministic across calls', () => {
    expect(JSON.stringify(createDemoData())).toBe(JSON.stringify(createDemoData()))
  })

  it('contains realistic amounts of every entity', () => {
    const s = createDemoData()
    expect(s.tasks.length).toBeGreaterThan(25)
    expect(s.habits.length).toBe(4)
    expect(s.goals.length).toBe(4)
    expect(s.blocks.length).toBeGreaterThan(15)
    expect(s.sessions.length).toBeGreaterThan(20)
    expect(s.profile.onboarded).toBe(false)
  })

  it('has live streaks (yesterday completed for scheduled habits)', () => {
    const s = createDemoData()
    const yesterday = toKey(addDays(new Date(), -1))
    for (const h of s.habits) {
      const d = addDays(new Date(), -1)
      if (h.days.includes(d.getDay())) {
        expect(h.completions).toContain(yesterday)
        expect(currentStreak(h)).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('has an in-progress task due today', () => {
    const s = createDemoData()
    const t = s.tasks.find((x) => x.title === 'Prepare sprint demo')
    expect(t?.status).toBe('in-progress')
    expect(t?.dueDate).toBe(toKey(new Date()))
  })
})

describe('v1 -> v2 migration (strip demo, keep user data)', () => {
  it('removes demo entities and keeps user-created ones', () => {
    const demo = createDemoData()
    const userTask: Task = {
      id: 'task_k1_ab',
      title: 'My real task',
      status: 'today',
      priority: 'high',
      category: 'Work',
      createdAt: iso(startOfDay(new Date())),
      goalId: 'goal-p1_xy',
    }
    const userGoal: AppData['goals'][number] = {
      id: 'goal-p1_xy',
      title: 'My real goal',
      description: '',
      category: 'Work',
      status: 'active',
      milestones: [{ id: 'ms_zz', title: 'Step', done: false }],
      createdAt: iso(startOfDay(new Date())),
    }
    const v1: AppData = {
      ...demo,
      version: 1,
      tasks: [...demo.tasks, userTask],
      goals: [...demo.goals, userGoal],
      habits: [...demo.habits, { id: 'habit_k2_cd', name: 'My habit', icon: '🎯', color: '#000000', days: [1], createdAt: iso(startOfDay(new Date())), completions: ['2026-08-10'] }],
    }
    const migrated = migrateData(v1)
    expect(migrated.version).toBe(DATA_VERSION)
    expect(migrated.tasks.map((t) => t.id)).toEqual(['task_k1_ab'])
    expect(migrated.goals.map((g) => g.id)).toEqual(['goal-p1_xy'])
    expect(migrated.habits.map((h) => h.id)).toEqual(['habit_k2_cd'])
    expect(migrated.blocks).toEqual([])
    expect(migrated.sessions).toEqual([])
    expect(migrated.tasks[0].goalId).toBe('goal-p1_xy')
  })

  it('cleans dangling goal links when demo goals are stripped', () => {
    const demo = createDemoData()
    const v1: AppData = {
      ...demo,
      version: 1,
      tasks: [
        {
          id: 'task_k9_ff',
          title: 'Linked to demo goal',
          status: 'backlog',
          priority: 'low',
          category: 'Work',
          createdAt: iso(startOfDay(new Date())),
          goalId: 'goal-website',
        },
      ],
      goals: demo.goals,
      habits: [],
      blocks: [],
      sessions: [],
    }
    const migrated = migrateData(v1)
    expect(migrated.tasks).toHaveLength(1)
    expect(migrated.tasks[0].goalId).toBeUndefined()
  })

  it('preserves profile and onboarded state', () => {
    const v1 = { ...createDemoData(), version: 1 }
    v1.profile = { ...v1.profile, onboarded: true, name: 'Existing User' }
    const migrated = migrateData(v1)
    expect(migrated.profile.onboarded).toBe(true)
    expect(migrated.profile.name).toBe('Existing User')
  })
})

describe('habit streaks', () => {
  const base: Habit = {
    id: 'h',
    name: 'Test',
    icon: '🎯',
    color: '#000000',
    days: [0, 1, 2, 3, 4, 5, 6],
    createdAt: iso(addDays(new Date(), -10)),
    completions: [],
  }

  it('does not break the streak when today is not yet done', () => {
    const today = startOfDay(new Date())
    const completions = [1, 2, 3, 4].map((off) => toKey(addDays(today, -off)))
    const h = { ...base, completions }
    expect(currentStreak(h)).toBe(4)
  })

  it('counts today when done', () => {
    const today = startOfDay(new Date())
    const completions = [0, 1, 2].map((off) => toKey(addDays(today, -off)))
    expect(currentStreak({ ...base, completions })).toBe(3)
  })

  it('stops at a gap', () => {
    const today = startOfDay(new Date())
    const completions = [0, 1, 3, 4].map((off) => toKey(addDays(today, -off)))
    expect(currentStreak({ ...base, completions })).toBe(2)
  })

  it('tracks best streak separately', () => {
    const today = startOfDay(new Date())
    const completions = [0, 1, 5, 6, 7].map((off) => toKey(addDays(today, -off)))
    const h = { ...base, completions }
    expect(currentStreak(h)).toBe(2)
    expect(bestStreak(h)).toBe(3)
  })

  it('computes completion percentage over scheduled days', () => {
    const today = startOfDay(new Date())
    const completions = [0, 1, 2].map((off) => toKey(addDays(today, -off)))
    const h = { ...base, createdAt: iso(addDays(today, -3)), completions }
    const stats = completionStats(h)
    expect(stats.scheduled).toBe(4)
    expect(stats.done).toBe(3)
    expect(stats.pct).toBe(75)
  })

  it('labels frequencies', () => {
    expect(frequencyLabel({ ...base, days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day')
    expect(frequencyLabel({ ...base, days: [1, 2, 3, 4, 5] })).toBe('Weekdays')
    expect(frequencyLabel({ ...base, days: [1, 3, 5] })).toBe('3× per week')
  })
})

describe('today score', () => {
  it('returns null parts when nothing is scheduled (focus is simply 0)', () => {
    const s = createSeedData()
    const empty: AppData = { ...s, tasks: [], habits: [], blocks: [], sessions: [] }
    const { score, parts } = computeTodayScore(empty)
    expect(score).toBe(0)
    const byKey = Object.fromEntries(parts.map((p) => [p.key, p.value]))
    expect(byKey.tasks).toBeNull()
    expect(byKey.habits).toBeNull()
    expect(byKey.schedule).toBeNull()
    expect(byKey.focus).toBe(0)
  })

  it('weights components and clamps focus to 100%', () => {
    const today = startOfDay(new Date())
    const tk = toKey(today)
    const tasks: Task[] = [
      { id: 'a', title: 'a', status: 'done', priority: 'low', category: 'Work', createdAt: iso(today), completedAt: iso(today) },
      { id: 'b', title: 'b', status: 'today', priority: 'low', category: 'Work', createdAt: iso(today) },
      { id: 'c', title: 'c', status: 'today', priority: 'low', category: 'Work', createdAt: iso(today) },
    ]
    const habit: Habit = {
      id: 'h',
      name: 'h',
      icon: '🎯',
      color: '#000',
      days: [today.getDay()],
      createdAt: iso(addDays(today, -5)),
      completions: [tk],
    }
    const state: AppData = {
      version: 1,
      profile: { name: '', primaryGoal: '', workStart: '09:00', workEnd: '18:00', energy: 'morning', onboarded: true },
      settings: { theme: 'light', focusTarget: 120 },
      tasks,
      habits: [habit],
      goals: [],
      blocks: [],
      sessions: [{ id: 's', date: tk, minutes: 500, completedAt: iso(today) }],
    }
    const { score, parts } = computeTodayScore(state, today)
    const byKey = Object.fromEntries(parts.map((p) => [p.key, p]))
    expect(byKey.tasks.value).toBeCloseTo(1 / 3)
    expect(byKey.habits.value).toBe(1)
    expect(byKey.focus.value).toBe(1) // clamped
    expect(byKey.schedule.value).toBeNull()
    // (0.3*1/3 + 0.3*1 + 0.25*1) / 0.85
    expect(score).toBe(Math.round(((0.3 * (1 / 3) + 0.3 + 0.25) / 0.85) * 100))
  })

  it('today tasks include done-today, statuses and due-today', () => {
    const today = startOfDay(new Date())
    const tk = toKey(today)
    const tasks: Task[] = [
      { id: 'a', title: 'a', status: 'backlog', priority: 'low', category: 'Work', createdAt: iso(today), dueDate: tk },
      { id: 'b', title: 'b', status: 'today', priority: 'low', category: 'Work', createdAt: iso(today) },
      { id: 'c', title: 'c', status: 'backlog', priority: 'low', category: 'Work', createdAt: iso(today), dueDate: toKey(addDays(today, 5)) },
      { id: 'd', title: 'd', status: 'done', priority: 'low', category: 'Work', createdAt: iso(today), completedAt: iso(today) },
    ]
    const ids = todayTasks({ ...createSeedData(), tasks }, today).map((t) => t.id).sort()
    expect(ids).toEqual(['a', 'b', 'd'])
  })
})

describe('analytics', () => {
  it('builds daily series ending today', () => {
    const s = createDemoData()
    const stats = dailyStats(s, 7)
    expect(stats).toHaveLength(7)
    expect(stats[6].key).toBe(toKey(new Date()))
    expect(stats[6].tasksDone).toBeGreaterThanOrEqual(2) // seeded today completions
  })

  it('computes habit consistency within range', () => {
    const s = createDemoData()
    const c = habitConsistency(s, 7)
    expect(c).not.toBeNull()
    expect(c!).toBeGreaterThan(0)
    expect(c!).toBeLessThanOrEqual(100)
  })

  it('finds most productive weekday and hour band', () => {
    const today = startOfDay(new Date())
    // two completions on Tuesday 10:00, one on Friday 15:00
    const tuesday = addDays(today, -((today.getDay() + 6) % 7) - 6) // last week's Tuesday
    const friday = addDays(today, -((today.getDay() + 6) % 7) - 3)
    const tasks: Task[] = [
      { id: '1', title: 'x', status: 'done', priority: 'low', category: 'Work', createdAt: iso(tuesday), completedAt: iso(tuesday, 10) },
      { id: '2', title: 'y', status: 'done', priority: 'low', category: 'Work', createdAt: iso(tuesday), completedAt: iso(tuesday, 10) },
      { id: '3', title: 'z', status: 'done', priority: 'low', category: 'Work', createdAt: iso(friday), completedAt: iso(friday, 15) },
    ]
    const peaks = productivityPeaks({ ...createSeedData(), tasks, sessions: [] }, 30)
    expect(peaks.weekday?.label).toBe('Tuesday')
    expect(peaks.hourBand?.label).toBe('8–11 AM')
  })

  it('computes goal progress from milestones', () => {
    const s = createDemoData()
    const g = s.goals.find((x) => x.id === 'goal-website')!
    expect(goalProgress(g)).toBe(60)
  })
})

describe('import validation', () => {
  it('accepts a valid payload', () => {
    const s = createSeedData()
    expect(validateImport(s)).not.toBeNull()
  })

  it('rejects malformed payloads', () => {
    expect(validateImport(null)).toBeNull()
    expect(validateImport('nope')).toBeNull()
    expect(validateImport({ profile: {}, settings: {} })).toBeNull()
    expect(validateImport({ ...createSeedData(), tasks: 'nope' as unknown })).toBeNull()
    expect(
      validateImport({ ...createSeedData(), tasks: [{ id: 1, title: 'bad types' }] as unknown })
    ).toBeNull()
  })
})

describe('reducer', () => {
  it('marks tasks done with a completedAt timestamp and clears it when reopened', () => {
    const s = createDemoData()
    const t = s.tasks.find((x) => x.status === 'today')!
    let next = reducer(s, { type: 'task/status', id: t.id, status: 'done' })
    expect(next.tasks.find((x) => x.id === t.id)!.completedAt).toBeTruthy()
    next = reducer(next, { type: 'task/status', id: t.id, status: 'today' })
    expect(next.tasks.find((x) => x.id === t.id)!.completedAt).toBeUndefined()
  })

  it('toggles habit completions idempotently', () => {
    const s = createDemoData()
    const tk = toKey(new Date())
    const h = s.habits[0]
    let next = reducer(s, { type: 'habit/toggle', id: h.id, date: tk })
    expect(next.habits[0].completions).toContain(tk)
    next = reducer(next, { type: 'habit/toggle', id: h.id, date: tk })
    expect(next.habits[0].completions).not.toContain(tk)
  })

  it('auto-completes a goal when its last milestone is checked', () => {
    const s = createDemoData()
    const g = s.goals.find((x) => x.id === 'goal-website')!
    let next = s
    for (const m of g.milestones.filter((m) => !m.done)) {
      next = reducer(next, { type: 'goal/milestone/toggle', goalId: g.id, milestoneId: m.id })
    }
    const updated = next.goals.find((x) => x.id === g.id)!
    expect(updated.status).toBe('completed')
    expect(updated.completedAt).toBeTruthy()
    // and reverts when a milestone is unchecked
    const ms = updated.milestones[0]
    next = reducer(next, { type: 'goal/milestone/toggle', goalId: g.id, milestoneId: ms.id })
    expect(next.goals.find((x) => x.id === g.id)!.status).toBe('active')
  })

  it('replaces seed habits only on first-run onboarding', () => {
    const s = createSeedData()
    const template = { name: 'Custom', icon: '🎯', color: '#5B5BD6', days: [1, 2, 3] }
    const first = reducer(s, {
      type: 'onboard/finish',
      patch: { name: 'Sam' },
      templates: [template],
      replaceSeedHabits: true,
    })
    expect(first.habits).toHaveLength(1)
    expect(first.habits[0].name).toBe('Custom')
    expect(first.profile.onboarded).toBe(true)
    expect(first.profile.name).toBe('Sam')

    const second = reducer(first, {
      type: 'onboard/finish',
      patch: {},
      templates: [template],
      replaceSeedHabits: false,
    })
    expect(second.habits).toHaveLength(2)
  })

  it('data/replace swaps the whole state (external sync adoption)', () => {
    const s = createSeedData()
    const next = reducer(s, { type: 'data/replace', data: { ...s, tasks: [] } })
    expect(next.tasks).toHaveLength(0)
    expect(next.habits).toBe(s.habits)
  })
})
