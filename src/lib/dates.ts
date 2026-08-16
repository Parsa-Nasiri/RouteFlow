/** Local-time date helpers. Date keys are always local YYYY-MM-DD strings. */

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

/** Monday-based week start */
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d)
  const day = (c.getDay() + 6) % 7
  return addDays(c, -day)
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6)
}

export function isSameDay(a: Date, b: Date): boolean {
  return toKey(a) === toKey(b)
}

export function todayKey(): string {
  return toKey(new Date())
}

/** Whole-day difference a - b, using date keys to avoid DST issues. */
export function daysBetweenKeys(aKey: string, bKey: string): number {
  const a = fromKey(aKey)
  const b = fromKey(bKey)
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000)
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToTime(m: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(m)))
  const h = Math.floor(clamped / 60)
  const mm = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** '09:30' -> '9:30 AM' */
export function fmtTime12(t: string): string {
  const mins = timeToMinutes(t)
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function fmtDuration(mins: number): string {
  if (mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function fmtDateLong(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function fmtDateMedium(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtDateWithYear(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Relative label for a due-date key: Overdue 3d / Today / Tomorrow / Fri, Aug 22 */
export function relativeDueLabel(key: string): string {
  const diff = daysBetweenKeys(key, todayKey())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < -1) return `Overdue ${Math.abs(diff)}d`
  const d = fromKey(key)
  if (diff > 1 && diff <= 6) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return fmtDateMedium(key)
}

export function isOverdue(key: string): boolean {
  return daysBetweenKeys(key, todayKey()) < 0
}

/** Options for a <select> of times at 15-minute granularity. */
export function timeOptions(from = 0, to = 24 * 60, step = 15): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  for (let m = from; m < to; m += step) {
    const v = minutesToTime(m)
    out.push({ value: v, label: fmtTime12(v) })
  }
  return out
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Winding down'
}
