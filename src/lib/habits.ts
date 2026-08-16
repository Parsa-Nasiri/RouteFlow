import { addDays, daysBetweenKeys, startOfDay, toKey, todayKey } from '@/lib/dates'
import type { Habit } from '@/types'

export function isScheduled(habit: Habit, d: Date): boolean {
  return habit.days.includes(d.getDay())
}

export function isDone(habit: Habit, dateKey: string): boolean {
  return habit.completions.includes(dateKey)
}

export function frequencyLabel(habit: Habit): string {
  const d = [...habit.days].sort().join(',')
  if (habit.days.length === 7) return 'Every day'
  if (d === '1,2,3,4,5') return 'Weekdays'
  if (d === '0,6') return 'Weekends'
  return `${habit.days.length}× per week`
}

/** Consecutive scheduled days completed, ending today (if done) or yesterday. Today not being done yet doesn't break the streak. */
export function currentStreak(habit: Habit): number {
  const today = startOfDay(new Date())
  if (!habit.completions.includes(toKey(today))) {
    // not done yet today — streak still counts through yesterday
    return streakEndingAt(habit, addDays(today, -1))
  }
  return streakEndingAt(habit, today)
}

function streakEndingAt(habit: Habit, end: Date): number {
  const createdKey = toKey(new Date(habit.createdAt))
  let streak = 0
  let cursor = startOfDay(end)
  let guard = 0
  while (toKey(cursor) >= createdKey && guard < 4000) {
    guard++
    if (isScheduled(habit, cursor)) {
      if (habit.completions.includes(toKey(cursor))) streak++
      else break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(habit: Habit): number {
  const created = startOfDay(new Date(habit.createdAt))
  const today = startOfDay(new Date())
  let best = 0
  let run = 0
  let cursor = created
  let guard = 0
  while (cursor <= today && guard < 4000) {
    guard++
    if (isScheduled(habit, cursor)) {
      if (habit.completions.includes(toKey(cursor))) {
        run++
        best = Math.max(best, run)
      } else {
        run = 0
      }
    }
    cursor = addDays(cursor, 1)
  }
  return best
}

export interface HabitStats {
  scheduled: number
  done: number
  pct: number
}

/** All-time completion over scheduled days since the habit was created. */
export function completionStats(habit: Habit): HabitStats {
  const createdKey = toKey(new Date(habit.createdAt))
  const total = daysBetweenKeys(todayKey(), createdKey) + 1
  let scheduled = 0
  let done = 0
  for (let off = 0; off < Math.min(total, 4000); off++) {
    const d = addDays(startOfDay(new Date()), -off)
    if (isScheduled(habit, d)) {
      scheduled++
      if (isDone(habit, toKey(d))) done++
    }
  }
  return { scheduled, done, pct: scheduled ? Math.round((done / scheduled) * 100) : 0 }
}

export type CellState = 'done' | 'missed' | 'scheduled' | 'off' | 'future'

export interface WeekCell {
  date: Date
  key: string
  state: CellState
}

/** Cells for a Monday-based week containing today. */
export function habitWeek(habit: Habit, weekStartDate: Date): WeekCell[] {
  const today = startOfDay(new Date())
  const cells: WeekCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(startOfDay(weekStartDate), i)
    const key = toKey(d)
    const scheduled = isScheduled(habit, d)
    let state: CellState
    if (d < today) state = isDone(habit, key) ? 'done' : scheduled ? 'missed' : 'off'
    else if (d.getTime() === today.getTime()) state = isDone(habit, key) ? 'done' : scheduled ? 'scheduled' : 'off'
    else state = scheduled ? 'future' : 'off'
    cells.push({ date: d, key, state })
  }
  return cells
}
