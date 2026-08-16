export type Priority = 'low' | 'medium' | 'high'
export type TaskStatus = 'backlog' | 'today' | 'in-progress' | 'done'
export type Category = 'Work' | 'Personal' | 'Health' | 'Learning' | 'Errands'

export interface Task {
  id: string
  title: string
  notes?: string
  status: TaskStatus
  priority: Priority
  category: Category
  /** local date key YYYY-MM-DD */
  dueDate?: string
  /** 24h time HH:mm */
  dueTime?: string
  goalId?: string
  createdAt: string
  /** ISO timestamp — set when the task is completed */
  completedAt?: string
}

export interface Habit {
  id: string
  name: string
  /** emoji */
  icon: string
  /** hex color */
  color: string
  /** weekdays the habit is scheduled, 0 (Sun) – 6 (Sat) */
  days: number[]
  createdAt: string
  /** local date keys */
  completions: string[]
}

export interface Milestone {
  id: string
  title: string
  done: boolean
  completedAt?: string
}

export type GoalStatus = 'active' | 'paused' | 'completed'

export interface Goal {
  id: string
  title: string
  description: string
  category: Category
  targetDate?: string
  status: GoalStatus
  milestones: Milestone[]
  createdAt: string
  completedAt?: string
}

export type BlockCategory = 'deep-work' | 'meeting' | 'exercise' | 'personal' | 'study'

export interface TimeBlock {
  id: string
  title: string
  /** local date key YYYY-MM-DD */
  date: string
  /** 24h HH:mm */
  start: string
  end: string
  category: BlockCategory
}

export interface FocusSession {
  id: string
  /** local date key YYYY-MM-DD */
  date: string
  minutes: number
  taskId?: string
  goalId?: string
  completedAt: string
}

export type EnergyPattern = 'morning' | 'afternoon' | 'evening' | 'night'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Profile {
  name: string
  primaryGoal: string
  workStart: string
  workEnd: string
  energy: EnergyPattern
  onboarded: boolean
}

export interface Settings {
  theme: ThemeMode
  /** daily focus target in minutes, feeds the Today score */
  focusTarget: number
}

export interface AppData {
  version: number
  profile: Profile
  settings: Settings
  tasks: Task[]
  habits: Habit[]
  goals: Goal[]
  blocks: TimeBlock[]
  sessions: FocusSession[]
}

export interface HabitTemplate {
  name: string
  icon: string
  color: string
  days: number[]
}
