import { DATA_VERSION } from './constants'
import { addDays, startOfDay, toKey } from './dates'
import type {
  AppData,
  Category,
  FocusSession,
  Goal,
  Habit,
  Priority,
  Task,
  TimeBlock,
} from '../types'

/** Deterministic PRNG so the demo data is stable between resets. */
function mulberry32(seed: number) {
  let a = seed
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TASK_POOL: { title: string; category: Category; priority: Priority }[] = [
  { title: 'Clear inbox to zero', category: 'Work', priority: 'low' },
  { title: 'Review pull-request feedback', category: 'Work', priority: 'medium' },
  { title: 'Update project roadmap', category: 'Work', priority: 'medium' },
  { title: 'Draft client status update', category: 'Work', priority: 'high' },
  { title: 'Fix onboarding page bug', category: 'Work', priority: 'high' },
  { title: 'Polish the slide deck', category: 'Work', priority: 'medium' },
  { title: 'Write test cases for billing', category: 'Work', priority: 'low' },
  { title: 'Follow up on 1:1 notes', category: 'Work', priority: 'low' },
  { title: 'Triage support tickets', category: 'Work', priority: 'medium' },
  { title: 'Meal prep for the week', category: 'Personal', priority: 'medium' },
  { title: 'Call parents', category: 'Personal', priority: 'low' },
  { title: 'Organize the desk', category: 'Personal', priority: 'low' },
  { title: 'Return library books', category: 'Errands', priority: 'low' },
  { title: 'Pick up grocery order', category: 'Errands', priority: 'medium' },
  { title: '5k easy run', category: 'Health', priority: 'medium' },
  { title: 'Mobility session', category: 'Health', priority: 'low' },
  { title: 'Cook a healthy dinner', category: 'Health', priority: 'low' },
  { title: 'Evening walk', category: 'Health', priority: 'low' },
  { title: 'Read 20 pages', category: 'Learning', priority: 'medium' },
  { title: 'Spanish lesson', category: 'Learning', priority: 'medium' },
  { title: 'Watch systems-design talk', category: 'Learning', priority: 'low' },
  { title: 'Flashcards review', category: 'Learning', priority: 'low' },
]

function isoAt(day: Date, hour: number, minute: number): string {
  const d = new Date(day)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/**
 * Deterministic demo dataset — used by tests and available as a fixture.
 * NOT used at app runtime: RouteFlow starts empty (see createSeedData).
 */
export function createDemoData(): AppData {
  const rand = mulberry32(847291)
  const now = new Date()
  const today = startOfDay(now)
  const todayK = toKey(today)

  const tasks: Task[] = []
  const habits: Habit[] = []
  const goals: Goal[] = []
  const blocks: TimeBlock[] = []
  const sessions: FocusSession[] = []

  // ---------- Goals ----------
  goals.push(
    {
      id: 'goal-website',
      title: 'Launch personal website',
      description:
        'Design and ship a portfolio site that tells the story of my work, hosts my writing, and gives recruiters a single link worth sharing.',
      category: 'Work',
      targetDate: toKey(addDays(today, 45)),
      status: 'active',
      createdAt: isoAt(addDays(today, -30), 10, 0),
      milestones: [
        { id: 'ms-w1', title: 'Collect inspiration & references', done: true, completedAt: isoAt(addDays(today, -24), 16, 20) },
        { id: 'ms-w2', title: 'Wireframe the four core pages', done: true, completedAt: isoAt(addDays(today, -15), 11, 40) },
        { id: 'ms-w3', title: 'Build the homepage', done: true, completedAt: isoAt(addDays(today, -4), 17, 5) },
        { id: 'ms-w4', title: 'Write two case studies', done: false },
        { id: 'ms-w5', title: 'Deploy & share with 5 people', done: false },
      ],
    },
    {
      id: 'goal-marathon',
      title: 'Run a half marathon',
      description:
        'Build an aerobic base through the autumn and finish the city half marathon in under 2:10 — injury-free and smiling at the finish line.',
      category: 'Health',
      targetDate: toKey(addDays(today, 120)),
      status: 'active',
      createdAt: isoAt(addDays(today, -40), 9, 0),
      milestones: [
        { id: 'ms-m1', title: 'Comfortable 5k', done: true, completedAt: isoAt(addDays(today, -32), 8, 15) },
        { id: 'ms-m2', title: 'Comfortable 10k', done: true, completedAt: isoAt(addDays(today, -10), 9, 50) },
        { id: 'ms-m3', title: 'Long run: 15k', done: false },
        { id: 'ms-m4', title: 'Race day 🏁', done: false },
      ],
    },
    {
      id: 'goal-books',
      title: 'Read 12 books this year',
      description: 'One book a month, mixing fiction and non-fiction. Track titles and one takeaway each.',
      category: 'Learning',
      targetDate: toKey(new Date(today.getFullYear(), 11, 31)),
      status: 'active',
      createdAt: isoAt(addDays(today, -200), 20, 0),
      milestones: [
        { id: 'ms-b1', title: 'Book 1 — The Pragmatic Programmer', done: true, completedAt: isoAt(addDays(today, -180), 21, 30) },
        { id: 'ms-b2', title: 'Book 2 — Piranesi', done: true, completedAt: isoAt(addDays(today, -160), 22, 10) },
        { id: 'ms-b3', title: 'Book 3 — Deep Work', done: true, completedAt: isoAt(addDays(today, -130), 20, 45) },
        { id: 'ms-b4', title: 'Book 4 — Project Hail Mary', done: true, completedAt: isoAt(addDays(today, -95), 23, 0) },
        { id: 'ms-b5', title: 'Book 5 — Thinking in Systems', done: true, completedAt: isoAt(addDays(today, -60), 21, 15) },
        { id: 'ms-b6', title: 'Book 6 — The Creative Act', done: true, completedAt: isoAt(addDays(today, -18), 20, 30) },
        { id: 'ms-b7', title: 'Book 7', done: false },
        { id: 'ms-b8', title: 'Book 8', done: false },
        { id: 'ms-b9', title: 'Book 9', done: false },
        { id: 'ms-b10', title: 'Book 10', done: false },
        { id: 'ms-b11', title: 'Book 11', done: false },
        { id: 'ms-b12', title: 'Book 12', done: false },
      ],
    },
    {
      id: 'goal-spanish',
      title: 'Hold a conversation in Spanish',
      description: 'Reach a comfortable A2 level: 15 minutes of practice most days, weekly speaking sessions.',
      category: 'Learning',
      status: 'paused',
      createdAt: isoAt(addDays(today, -120), 19, 0),
      milestones: [
        { id: 'ms-s1', title: 'Complete 10 lessons', done: true, completedAt: isoAt(addDays(today, -90), 19, 30) },
        { id: 'ms-s2', title: 'Order food in Spanish on holiday', done: true, completedAt: isoAt(addDays(today, -70), 13, 0) },
        { id: 'ms-s3', title: '20-minute call with a language partner', done: false },
        { id: 'ms-s4', title: 'Watch a film without subtitles', done: false },
      ],
    },
  )

  // ---------- Habits (with ~5 weeks of history) ----------
  const habitDefs: { name: string; icon: string; color: string; days: number[]; p: number }[] = [
    { name: 'Morning movement', icon: '🏃', color: '#0E9F6E', days: [1, 2, 3, 4, 5, 6], p: 0.78 },
    { name: 'Read 20 pages', icon: '📚', color: '#0E8CC0', days: [0, 1, 2, 3, 4, 5, 6], p: 0.66 },
    { name: 'Drink 2L water', icon: '💧', color: '#0EA5B7', days: [0, 1, 2, 3, 4, 5, 6], p: 0.85 },
    { name: 'Meditate 10 min', icon: '🧘', color: '#7A5AF8', days: [1, 2, 3, 4, 5], p: 0.5 },
  ]
  habitDefs.forEach((def, idx) => {
    const completions: string[] = []
    for (let off = -34; off <= 0; off++) {
      const d = addDays(today, off)
      if (!def.days.includes(d.getDay())) continue
      const forced = off === -1 || off === -2 // seed a live streak
      if (forced || rand() < def.p) completions.push(toKey(d))
    }
    if (idx === 2) {
      // one habit already done today so the dashboard feels alive
      if (!completions.includes(todayK)) completions.push(todayK)
    } else if (completions.includes(todayK)) {
      completions.splice(completions.indexOf(todayK), 1)
    }
    habits.push({
      id: `habit-${idx + 1}`,
      name: def.name,
      icon: def.icon,
      color: def.color,
      days: def.days,
      createdAt: isoAt(addDays(today, -45), 8, 0),
      completions,
    })
  })

  // ---------- Completed tasks over the last 30 days ----------
  let poolIdx = 0
  for (let off = -30; off <= -1; off++) {
    const d = addDays(today, off)
    const weekday = d.getDay() !== 0 && d.getDay() !== 6
    const load = weekday
      ? rand() < 0.15
        ? 0
        : 1 + Math.floor(rand() * 2.6)
      : rand() < 0.5
        ? 0
        : 1
    for (let i = 0; i < load; i++) {
      const item = TASK_POOL[poolIdx++ % TASK_POOL.length]
      const hour = weekday ? 9 + Math.floor(rand() * 8) : 10 + Math.floor(rand() * 6)
      tasks.push({
        id: `task-p${tasks.length + 1}`,
        title: item.title,
        status: 'done',
        priority: item.priority,
        category: item.category,
        createdAt: isoAt(d, 8, 0),
        completedAt: isoAt(d, hour, Math.floor(rand() * 4) * 15),
      })
    }
  }

  // ---------- Today's tasks ----------
  const todayTasksSeed: {
    title: string
    status: Task['status']
    priority: Priority
    category: Category
    dueTime?: string
    goalId?: string
    done?: [number, number]
    notes?: string
  }[] = [
    {
      title: 'Review launch checklist',
      status: 'done',
      priority: 'high',
      category: 'Work',
      goalId: 'goal-website',
      done: [9, 12],
      notes: 'Walk through every item on the site-launch checklist and note blockers.',
    },
    { title: 'Reply to design feedback', status: 'done', priority: 'medium', category: 'Work', done: [10, 5] },
    {
      title: 'Prepare sprint demo',
      status: 'in-progress',
      priority: 'high',
      category: 'Work',
      dueTime: '14:00',
      notes: 'Five minutes: what shipped, what’s next, what’s blocked.',
    },
    { title: '30-min mobility session', status: 'today', priority: 'medium', category: 'Health', dueTime: '17:30', goalId: 'goal-marathon' },
    { title: 'Read 20 pages of Dune', status: 'today', priority: 'low', category: 'Learning', dueTime: '21:00', goalId: 'goal-books' },
    { title: 'Book dentist appointment', status: 'today', priority: 'low', category: 'Errands', dueTime: '18:30' },
  ]
  todayTasksSeed.forEach((t, i) => {
    tasks.push({
      id: `task-t${i + 1}`,
      title: t.title,
      notes: t.notes,
      status: t.status,
      priority: t.priority,
      category: t.category,
      dueDate: todayK,
      dueTime: t.dueTime,
      goalId: t.goalId,
      createdAt: isoAt(today, 8, 30),
      completedAt: t.done ? isoAt(today, t.done[0], t.done[1]) : undefined,
    })
  })

  // ---------- Upcoming & backlog ----------
  const upcoming: { title: string; off: number; priority: Priority; category: Category; dueTime?: string; goalId?: string }[] = [
    { title: 'Long run — 12k', off: 2, priority: 'high', category: 'Health', dueTime: '09:00', goalId: 'goal-marathon' },
    { title: 'Draft homepage copy', off: 1, priority: 'medium', category: 'Work', goalId: 'goal-website' },
    { title: 'Grocery run for the week', off: 3, priority: 'low', category: 'Errands', dueTime: '11:00' },
  ]
  upcoming.forEach((u, i) => {
    tasks.push({
      id: `task-u${i + 1}`,
      title: u.title,
      status: 'backlog',
      priority: u.priority,
      category: u.category,
      dueDate: toKey(addDays(today, u.off)),
      dueTime: u.dueTime,
      goalId: u.goalId,
      createdAt: isoAt(today, 8, 0),
    })
  })
  const backlog: { title: string; priority: Priority; category: Category; goalId?: string }[] = [
    { title: 'Outline case-study structure', priority: 'medium', category: 'Work', goalId: 'goal-website' },
    { title: 'Practice Spanish dialogue', priority: 'low', category: 'Learning', goalId: 'goal-spanish' },
    { title: 'Research standing desks', priority: 'low', category: 'Personal' },
    { title: 'Plan weekend hike', priority: 'low', category: 'Health' },
    { title: 'Refactor portfolio contact form', priority: 'medium', category: 'Work', goalId: 'goal-website' },
    { title: 'Back up photo library', priority: 'low', category: 'Personal' },
  ]
  backlog.forEach((b, i) => {
    tasks.push({
      id: `task-b${i + 1}`,
      title: b.title,
      status: 'backlog',
      priority: b.priority,
      category: b.category,
      goalId: b.goalId,
      createdAt: isoAt(addDays(today, -6), 15, 0),
    })
  })

  // ---------- Time blocks for the current week ----------
  const weekStart = addDays(today, -((today.getDay() + 6) % 7))
  for (let off = 0; off < 7; off++) {
    const d = addDays(weekStart, off)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const isToday = toKey(d) === todayK
    const mk = (title: string, cat: TimeBlock['category'], start: string, end: string) => {
      blocks.push({ id: `block-w${off}-${blocks.length}`, title, date: toKey(d), start, end, category: cat })
    }
    if (isWeekend) {
      mk('Long easy run', 'exercise', '09:00', '10:30')
      if (rand() < 0.6) mk('Brunch & errands', 'personal', '12:00', '14:00')
      if (rand() < 0.7) mk('Reading & guitar', 'study', '16:30', '17:30')
    } else {
      mk('Deep work — Project Atlas', 'deep-work', '09:00', '11:00')
      mk('Team sync', 'meeting', '11:30', '12:00')
      mk('Lunch + walk', 'personal', '12:30', '13:30')
      mk('Deep work — client launch', 'deep-work', '15:00', '16:30')
      if (isToday || rand() < 0.75) mk('Gym — strength', 'exercise', '18:00', '19:00')
      if (isToday || rand() < 0.7) mk('Spanish practice', 'study', '20:30', '21:30')
    }
  }

  // ---------- Focus sessions ----------
  for (let off = -30; off <= -1; off++) {
    const d = addDays(today, off)
    const weekday = d.getDay() !== 0 && d.getDay() !== 6
    const count = weekday
      ? rand() < 0.12
        ? 0
        : 1 + Math.floor(rand() * 3)
      : rand() < 0.55
        ? 0
        : 1 + Math.floor(rand() * 2)
    for (let i = 0; i < count; i++) {
      const minutes = [25, 45, 25, 50][Math.floor(rand() * 4)]
      const hour = rand() < 0.6 ? 9 + Math.floor(rand() * 2) : 15 + Math.floor(rand() * 2)
      const minute = Math.floor(rand() * 4) * 15
      sessions.push({
        id: `session-p${sessions.length + 1}`,
        date: toKey(d),
        minutes,
        completedAt: isoAt(d, hour, minute),
      })
    }
  }
  // one completed session today, linked to the in-progress task
  sessions.push({
    id: 'session-t1',
    date: todayK,
    minutes: 25,
    taskId: 'task-t3',
    completedAt: isoAt(today, 9, 5),
  })

  return {
    version: DATA_VERSION,
    profile: {
      name: 'Alex Rivera',
      primaryGoal: 'Stay consistent and ship meaningful work',
      workStart: '09:00',
      workEnd: '18:00',
      energy: 'morning',
      onboarded: false,
    },
    settings: { theme: 'system', focusTarget: 120 },
    tasks,
    habits,
    goals,
    blocks,
    sessions,
  }
}

/**
 * The real first-run state: an empty, un-onboarded app. No demo entities —
 * every task, habit, goal and block the user sees is one they (or their agent)
 * created. Empty states in the UI guide the way in.
 */
export function createSeedData(): AppData {
  return {
    version: DATA_VERSION,
    profile: {
      name: '',
      primaryGoal: '',
      workStart: '09:00',
      workEnd: '18:00',
      energy: 'morning',
      onboarded: false,
    },
    settings: { theme: 'system', focusTarget: 120 },
    tasks: [],
    habits: [],
    goals: [],
    blocks: [],
    sessions: [],
  }
}
