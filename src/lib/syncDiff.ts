import type { AppData } from '@/types'

const COLLECTIONS: { key: keyof AppData; label: string }[] = [
  { key: 'tasks', label: 'task' },
  { key: 'habits', label: 'habit' },
  { key: 'goals', label: 'goal' },
  { key: 'blocks', label: 'block' },
  { key: 'sessions', label: 'session' },
]

/** Human-readable summary of what changed between two states (used for agent-sync toasts). */
export function diffSummary(prev: AppData, next: AppData): string | null {
  const parts: string[] = []
  for (const { key, label } of COLLECTIONS) {
    const before = prev[key] as { id: string }[]
    const after = next[key] as { id: string }[]
    const beforeById = new Map(before.map((x) => [x.id, x]))
    const afterIds = new Set(after.map((x) => x.id))
    const added = after.filter((x) => !beforeById.has(x.id)).length
    const removed = before.filter((x) => !afterIds.has(x.id)).length
    const changed = after.filter((x) => {
      const y = beforeById.get(x.id)
      return y !== undefined && JSON.stringify(y) !== JSON.stringify(x)
    }).length
    if (added) parts.push(`${added} ${label}${added > 1 ? 's' : ''} added`)
    if (changed) parts.push(`${changed} ${label}${changed > 1 ? 's' : ''} updated`)
    if (removed) parts.push(`${removed} ${label}${removed > 1 ? 's' : ''} removed`)
  }
  if (parts.length === 0) return null
  const shown = parts.slice(0, 3).join(' · ')
  return parts.length > 3 ? `${shown} +${parts.length - 3} more` : shown
}
