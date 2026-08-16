import { timeToMinutes, toKey } from '@/lib/dates'
import type { AppData, Task } from '@/types'

export type ScoreKey = 'tasks' | 'habits' | 'focus' | 'schedule'

export interface ScorePart {
  key: ScoreKey
  label: string
  /** 0..1, or null when there is nothing to measure yet */
  value: number | null
  detail: string
  weight: number
}

export function isDoneToday(t: Task, ref = new Date()): boolean {
  if (t.status !== 'done' || !t.completedAt) return false
  return toKey(new Date(t.completedAt)) === toKey(ref)
}

/** The task list that belongs to "today": today/in-progress statuses, anything due today, and anything completed today. */
export function todayTasks(state: AppData, ref = new Date()): Task[] {
  const tk = toKey(ref)
  return state.tasks.filter((t) => {
    if (isDoneToday(t, ref)) return true
    if (t.status === 'done') return t.dueDate === tk && !t.completedAt ? true : false
    return t.status === 'today' || t.status === 'in-progress' || t.dueDate === tk
  })
}

export function focusMinutesOn(state: AppData, dateKey: string): number {
  return state.sessions.filter((s) => s.date === dateKey).reduce((a, s) => a + s.minutes, 0)
}

export interface TodayScore {
  score: number
  parts: ScorePart[]
}

export function computeTodayScore(state: AppData, now = new Date()): TodayScore {
  const tk = toKey(now)
  const list = todayTasks(state, now)
  const doneCount = list.filter((t) => isDoneToday(t, now)).length
  const tasksValue = list.length > 0 ? doneCount / list.length : null

  const scheduled = state.habits.filter((h) => h.days.includes(now.getDay()))
  const habitsDone = scheduled.filter((h) => h.completions.includes(tk)).length
  const habitsValue = scheduled.length > 0 ? habitsDone / scheduled.length : null

  const focusMin = focusMinutesOn(state, tk)
  const focusValue = Math.min(1, focusMin / Math.max(30, state.settings.focusTarget))

  const todayBlocks = state.blocks.filter((b) => b.date === tk)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const ended = todayBlocks.filter((b) => timeToMinutes(b.end) <= nowMin).length
  const scheduleValue = todayBlocks.length > 0 ? ended / todayBlocks.length : null

  const parts: ScorePart[] = [
    {
      key: 'tasks',
      label: 'Tasks',
      value: tasksValue,
      detail: list.length ? `${doneCount} of ${list.length} done` : 'Nothing planned yet',
      weight: 0.3,
    },
    {
      key: 'habits',
      label: 'Habits',
      value: habitsValue,
      detail: scheduled.length ? `${habitsDone} of ${scheduled.length} done` : 'No habits scheduled',
      weight: 0.3,
    },
    {
      key: 'focus',
      label: 'Focus',
      value: focusValue,
      detail: `${focusMin} / ${state.settings.focusTarget} min`,
      weight: 0.25,
    },
    {
      key: 'schedule',
      label: 'Schedule',
      value: scheduleValue,
      detail: todayBlocks.length ? `${ended} of ${todayBlocks.length} blocks passed` : 'No blocks today',
      weight: 0.15,
    },
  ]

  const active = parts.filter((p) => p.value !== null)
  if (active.length === 0) return { score: 0, parts }
  const weightSum = active.reduce((a, p) => a + p.weight, 0)
  const weighted = active.reduce((a, p) => a + (p.value ?? 0) * p.weight, 0)
  return { score: Math.round((weighted / weightSum) * 100), parts }
}
