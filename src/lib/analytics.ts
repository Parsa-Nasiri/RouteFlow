import { addDays, startOfDay, toKey } from '@/lib/dates'
import type { AppData, Goal } from '@/types'

export interface DayStat {
  key: string
  date: Date
  label: string
  tasksDone: number
  focusMin: number
  habitsDone: number
  habitsScheduled: number
}

/** Last `days` days ending today. */
export function dailyStats(state: AppData, days: number): DayStat[] {
  const today = startOfDay(new Date())
  const out: DayStat[] = []
  const doneByDay = new Map<string, number>()
  for (const t of state.tasks) {
    if (t.status === 'done' && t.completedAt) {
      const k = toKey(new Date(t.completedAt))
      doneByDay.set(k, (doneByDay.get(k) ?? 0) + 1)
    }
  }
  const focusByDay = new Map<string, number>()
  for (const s of state.sessions) {
    focusByDay.set(s.date, (focusByDay.get(s.date) ?? 0) + s.minutes)
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const key = toKey(d)
    const scheduled = state.habits.filter((h) => h.days.includes(d.getDay()))
    const done = scheduled.filter((h) => h.completions.includes(key)).length
    out.push({
      key,
      date: d,
      label: d.toLocaleDateString(undefined, days > 7 ? { month: 'numeric', day: 'numeric' } : { weekday: 'short' }),
      tasksDone: doneByDay.get(key) ?? 0,
      focusMin: focusByDay.get(key) ?? 0,
      habitsDone: done,
      habitsScheduled: scheduled.length,
    })
  }
  return out
}

export function habitConsistency(state: AppData, days: number): number | null {
  const stats = dailyStats(state, days)
  const withHabits = stats.filter((s) => s.habitsScheduled > 0)
  if (!withHabits.length) return null
  const sum = withHabits.reduce((a, s) => a + s.habitsDone / s.habitsScheduled, 0)
  return Math.round((sum / withHabits.length) * 100)
}

export function goalProgress(goal: Goal): number {
  if (goal.milestones.length === 0) return 0
  const done = goal.milestones.filter((m) => m.done).length
  return Math.round((done / goal.milestones.length) * 100)
}

const HOUR_BANDS: { from: number; to: number; label: string }[] = [
  { from: 5, to: 8, label: '5–8 AM' },
  { from: 8, to: 11, label: '8–11 AM' },
  { from: 11, to: 14, label: '11 AM–2 PM' },
  { from: 14, to: 17, label: '2–5 PM' },
  { from: 17, to: 21, label: '5–9 PM' },
  { from: 21, to: 29, label: '9 PM–1 AM' },
]

export interface ProductivityPeaks {
  weekday: { label: string; count: number } | null
  hourBand: { label: string; count: number } | null
}

/** Most productive weekday and time band, from task completions + focus sessions. */
export function productivityPeaks(state: AppData, days: number): ProductivityPeaks {
  const cutoff = addDays(startOfDay(new Date()), -(days - 1))
  const weekdayCounts = new Array(7).fill(0)
  const bandCounts = new Array(HOUR_BANDS.length).fill(0)
  const consider = (iso: string) => {
    const d = new Date(iso)
    if (startOfDay(d) < cutoff) return
    weekdayCounts[d.getDay()]++
    const hour = d.getHours()
    const idx = HOUR_BANDS.findIndex((b) => hour >= b.from && hour < b.to)
    if (idx >= 0) bandCounts[idx]++
  }
  for (const t of state.tasks) if (t.status === 'done' && t.completedAt) consider(t.completedAt)
  for (const s of state.sessions) consider(s.completedAt)

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let weekday: { label: string; count: number } | null = null
  weekdayCounts.forEach((count, i) => {
    if (count > 0 && (!weekday || count > weekday.count)) weekday = { label: weekdayNames[i], count }
  })
  let hourBand: { label: string; count: number } | null = null
  bandCounts.forEach((count, i) => {
    if (count > 0 && (!hourBand || count > hourBand.count)) hourBand = { label: HOUR_BANDS[i].label, count }
  })
  return { weekday, hourBand }
}
