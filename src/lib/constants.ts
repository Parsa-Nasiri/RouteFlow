import type { BlockCategory, Category, EnergyPattern, Priority, TaskStatus } from '../types'

export const APP_NAME = 'RouteFlow'
export const APP_TAGLINE = 'Your day, routed.'
/** Schema version — bump + migrate() when the shape changes. */
export const DATA_VERSION = 2
export const STORAGE_KEY = 'routeflow.data.v1'

export const CATEGORIES: { name: Category; color: string }[] = [
  { name: 'Work', color: '#5B5BD6' },
  { name: 'Personal', color: '#D97706' },
  { name: 'Health', color: '#0E9F6E' },
  { name: 'Learning', color: '#0E8CC0' },
  { name: 'Errands', color: '#E11D74' },
]

export function categoryColor(name: string): string {
  return CATEGORIES.find((c) => c.name === name)?.color ?? '#7A7A8C'
}

export const PRIORITIES: { name: Priority; label: string; color: string }[] = [
  { name: 'high', label: 'High', color: '#E04545' },
  { name: 'medium', label: 'Medium', color: '#D98E04' },
  { name: 'low', label: 'Low', color: '#8B8B9E' },
]

export function priorityMeta(p: Priority) {
  return PRIORITIES.find((x) => x.name === p) ?? PRIORITIES[1]
}

export const TASK_STATUSES: { name: TaskStatus; label: string; hint: string }[] = [
  { name: 'backlog', label: 'Backlog', hint: 'Parked for later' },
  { name: 'today', label: 'Today', hint: 'On today’s plate' },
  { name: 'in-progress', label: 'In Progress', hint: 'Actively being worked on' },
  { name: 'done', label: 'Done', hint: 'Completed' },
]

export const BLOCK_CATEGORIES: {
  name: BlockCategory
  label: string
  color: string
}[] = [
  { name: 'deep-work', label: 'Deep work', color: '#5B5BD6' },
  { name: 'meeting', label: 'Meeting', color: '#0E8CC0' },
  { name: 'exercise', label: 'Exercise', color: '#0E9F6E' },
  { name: 'personal', label: 'Personal', color: '#D97706' },
  { name: 'study', label: 'Study', color: '#E11D74' },
]

export function blockCategoryMeta(c: BlockCategory) {
  return BLOCK_CATEGORIES.find((x) => x.name === c) ?? BLOCK_CATEGORIES[0]
}

export const HABIT_ICONS = [
  '🏃', '💧', '📚', '🧘', '💪', '✍️', '🌱', '😴', '🥗', '🎯', '🧠', '☀️', '🚶', '🎸', '🧹', '📸',
]

export const HABIT_COLORS = [
  '#5B5BD6', '#0E8CC0', '#0E9F6E', '#D97706', '#E11D74', '#7A5AF8', '#0EA5B7', '#C2560F',
]

export const ENERGY_PATTERNS: { name: EnergyPattern; label: string; blurb: string; window: string }[] = [
  { name: 'morning', label: 'Morning person', blurb: 'Sharp soon after waking', window: '9–11 AM' },
  { name: 'afternoon', label: 'Afternoon peak', blurb: 'Hits stride after lunch', window: '1–4 PM' },
  { name: 'evening', label: 'Evening focus', blurb: 'Best in the later hours', window: '6–9 PM' },
  { name: 'night', label: 'Night owl', blurb: 'Comes alive late', window: '9 PM–12 AM' },
]

export function energyMeta(e: EnergyPattern) {
  return ENERGY_PATTERNS.find((x) => x.name === e) ?? ENERGY_PATTERNS[0]
}

/** "rgba(91,91,214,0.14)" from a hex + alpha */
export function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export const GOAL_SUGGESTIONS = [
  'Stay consistent',
  'Build better habits',
  'Get more done',
  'Reduce stress',
  'Learn new skills',
  'Reclaim my evenings',
]

export const HABIT_SUGGESTIONS = [
  { name: 'Morning movement', icon: '🏃', color: '#0E9F6E', days: [1, 2, 3, 4, 5, 6] },
  { name: 'Read 20 pages', icon: '📚', color: '#0E8CC0', days: [0, 1, 2, 3, 4, 5, 6] },
  { name: 'Meditate 10 min', icon: '🧘', color: '#7A5AF8', days: [1, 2, 3, 4, 5] },
  { name: 'Drink 2L water', icon: '💧', color: '#0EA5B7', days: [0, 1, 2, 3, 4, 5, 6] },
  { name: 'Journal', icon: '✍️', color: '#D97706', days: [0, 1, 2, 3, 4, 5, 6] },
  { name: 'No phone first hour', icon: '☀️', color: '#E11D74', days: [1, 2, 3, 4, 5] },
  { name: 'Stretch break', icon: '🌱', color: '#0E9F6E', days: [1, 2, 3, 4, 5] },
  { name: 'Walk 8k steps', icon: '🚶', color: '#5B5BD6', days: [0, 1, 2, 3, 4, 5, 6] },
]
