import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Columns3, List, Plus, Search, X } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button } from '@/components/ui/Button'
import { Card, Chip, EmptyState, PageHeader } from '@/components/ui/Misc'
import { Input, Segmented, Select } from '@/components/ui/Form'
import { TaskBoardCard, TaskRow } from '@/components/tasks/TaskItem'
import { TaskModal } from '@/components/tasks/TaskModal'
import { CATEGORIES, PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import { endOfWeek, startOfWeek, toKey, todayKey } from '@/lib/dates'
import type { Category, Priority, Task, TaskStatus } from '@/types'

type DueFilter = 'any' | 'overdue' | 'today' | 'week' | 'none'
type ViewMode = 'list' | 'board'

export function TasksPage() {
  const { state, dispatch } = useStore()
  const location = useLocation()
  const openTaskId = (location.state as { openTaskId?: string } | null)?.openTaskId

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<Priority | 'any'>('any')
  const [category, setCategory] = useState<Category | 'any'>('any')
  const [status, setStatus] = useState<TaskStatus | 'any'>('any')
  const [due, setDue] = useState<DueFilter>('any')
  const [editing, setEditing] = useState<Task | null>(
    openTaskId ? (state.tasks.find((t) => t.id === openTaskId) ?? null) : null
  )
  const [creating, setCreating] = useState(false)
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)

  const tk = todayKey()

  const matchesDue = (t: Task): boolean => {
    if (!t.dueDate) return due === 'any' || due === 'none'
    switch (due) {
      case 'overdue':
        return t.dueDate < tk && t.status !== 'done'
      case 'today':
        return t.dueDate === tk
      case 'week':
        return t.dueDate >= toKey(startOfWeek(new Date())) && t.dueDate <= toKey(endOfWeek(new Date()))
      case 'none':
        return false
      default:
        return true
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return state.tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !(t.notes ?? '').toLowerCase().includes(q)) return false
      if (priority !== 'any' && t.priority !== priority) return false
      if (category !== 'any' && t.category !== category) return false
      if (status !== 'any' && t.status !== status) return false
      if (!matchesDue(t)) return false
      return true
    })
  }, [state.tasks, search, priority, category, status, due, tk])

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { backlog: [], today: [], 'in-progress': [], done: [] }
    for (const t of filtered) groups[t.status].push(t)
    return groups
  }, [filtered])

  const listSections: { status: TaskStatus; tasks: Task[] }[] = TASK_STATUSES.map((s) => ({
    status: s.name,
    tasks: sortForList(byStatus[s.name]),
  }))

  const activeFilterCount =
    (priority !== 'any' ? 1 : 0) + (category !== 'any' ? 1 : 0) + (status !== 'any' ? 1 : 0) + (due !== 'any' ? 1 : 0) + (search.trim() ? 1 : 0)

  const clearFilters = () => {
    setPriority('any')
    setCategory('any')
    setStatus('any')
    setDue('any')
    setSearch('')
  }

  const onDropTo = (target: TaskStatus, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/routeflow-task')
    const task = state.tasks.find((t) => t.id === id)
    if (task && task.status !== target) {
      dispatch({ type: 'task/status', id, status: target })
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Tasks"
        subtitle={`${state.tasks.length} total · ${state.tasks.filter((t) => t.status === 'done').length} completed`}
        actions={
          <>
            <Segmented
              ariaLabel="View mode"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: <span className="inline-flex items-center gap-1.5"><List size={13} /> List</span> },
                { value: 'board', label: <span className="inline-flex items-center gap-1.5"><Columns3 size={13} /> Board</span> },
              ]}
            />
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> New task
            </Button>
          </>
        }
      />

      <Card className="mb-5" padded={false}>
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pl-9"
                aria-label="Search tasks"
              />
            </div>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority | 'any')} className="w-auto" aria-label="Filter by priority">
              <option value="any">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} priority
                </option>
              ))}
            </Select>
            <Select value={category} onChange={(e) => setCategory(e.target.value as Category | 'any')} className="w-auto" aria-label="Filter by category">
              <option value="any">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | 'any')} className="w-auto" aria-label="Filter by status">
              <option value="any">Any status</option>
              {TASK_STATUSES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select value={due} onChange={(e) => setDue(e.target.value as DueFilter)} className="w-auto" aria-label="Filter by due date">
              <option value="any">Any due date</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="week">This week</option>
              <option value="none">No due date</option>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={14} /> Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title={state.tasks.length === 0 ? 'No tasks yet' : 'Nothing matches these filters'}
          description={
            state.tasks.length === 0
              ? 'Create your first task — give it a priority, a category and a due time.'
              : 'Try loosening the filters or clearing the search.'
          }
          action={
            state.tasks.length === 0 ? (
              <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} /> New task
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      ) : view === 'list' ? (
        <div className="space-y-6">
          {listSections
            .filter((s) => s.tasks.length > 0)
            .map((s) => (
              <section key={s.status}>
                <div className="mb-2.5 flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink3">
                    {TASK_STATUSES.find((x) => x.name === s.status)?.label}
                  </h2>
                  <Chip tone="neutral">{s.tasks.length}</Chip>
                </div>
                <div className="space-y-2">
                  {s.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setEditing} showDate showStatus />
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
        <div className="thin-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-4">
          {TASK_STATUSES.map((col) => {
            const items = byStatus[col.name]
            const isOver = dragOver === col.name
            return (
              <section
                key={col.name}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOver !== col.name) setDragOver(col.name)
                }}
                onDragLeave={() => setDragOver((cur) => (cur === col.name ? null : cur))}
                onDrop={(e) => onDropTo(col.name, e)}
                aria-label={`${col.label} column`}
                className={`flex w-[280px] shrink-0 flex-col rounded-2xl border p-3 transition-colors sm:w-auto ${
                  isOver ? 'border-primary/60 bg-primary-soft/40' : 'border-line bg-surface2/50'
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-semibold text-ink">{col.label}</h2>
                    <span className="tnum rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink3">
                      {items.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line2 px-3 py-6 text-center text-[12px] text-ink3">
                      {col.hint}
                    </div>
                  ) : (
                    items.map((t) => <TaskBoardCard key={t.id} task={t} onOpen={setEditing} />)
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <p className="mt-6 hidden text-center text-[12px] text-ink3 xl:block">
        Tip: drag cards between columns on the board, or change the status inside any task.
      </p>

      <TaskModal open={creating} onClose={() => setCreating(false)} />
      {editing && <TaskModal open onClose={() => setEditing(null)} task={editing} />}
    </div>
  )
}

function sortForList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 } as const
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority]
    return b.createdAt.localeCompare(a.createdAt)
  })
}
