import { Calendar, Clock, Flag, GripVertical } from 'lucide-react'
import { Checkbox, Chip } from '@/components/ui/Misc'
import { categoryColor, priorityMeta } from '@/lib/constants'
import { isDoneToday } from '@/lib/score'
import { isOverdue, relativeDueLabel } from '@/lib/dates'
import { useStore } from '@/store/StoreContext'
import type { Task, TaskStatus } from '@/types'

const statusChipTone: Record<TaskStatus, { tone: 'neutral' | 'accent' | 'warning' | 'success'; label: string }> = {
  backlog: { tone: 'neutral', label: 'Backlog' },
  today: { tone: 'accent', label: 'Today' },
  'in-progress': { tone: 'warning', label: 'In progress' },
  done: { tone: 'success', label: 'Done' },
}

export function StatusChip({ status }: { status: TaskStatus }) {
  const meta = statusChipTone[status]
  return <Chip tone={meta.tone}>{meta.label}</Chip>
}

export function TaskRow({
  task,
  onOpen,
  showStatus = false,
  showDate = false,
}: {
  task: Task
  onOpen: (t: Task) => void
  showStatus?: boolean
  showDate?: boolean
}) {
  const { dispatch } = useStore()
  const done = task.status === 'done'
  const pm = priorityMeta(task.priority)
  const goal = task.goalId

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border bg-surface px-3.5 py-3 transition-colors ${
        done ? 'border-line/70 opacity-70' : 'border-line hover:border-line2'
      }`}
    >
      <Checkbox
        checked={done}
        label={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
        onChange={() => dispatch({ type: 'task/toggleDone', id: task.id })}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left"
        title="Open task details"
      >
        <span className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: pm.color }}
            title={`${pm.label} priority`}
          />
          <span
            className={`truncate text-[14px] font-medium ${done ? 'text-ink3 line-through' : 'text-ink'}`}
          >
            {task.title}
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {task.dueTime && !showDate && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink3">
              <Clock size={11} /> {task.dueTime}
            </span>
          )}
          {task.dueDate && showDate && (
            <span
              className={`inline-flex items-center gap-1 text-[11.5px] font-medium ${
                !done && isOverdue(task.dueDate) ? 'text-danger' : 'text-ink3'
              }`}
            >
              <Calendar size={11} /> {relativeDueLabel(task.dueDate)}
              {task.dueTime ? ` · ${task.dueTime}` : ''}
            </span>
          )}
          <Chip color={categoryColor(task.category)}>{task.category}</Chip>
          {showStatus && <StatusChip status={task.status} />}
          {goal && (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-ink3" title="Linked to a goal">
              <Flag size={11} />
            </span>
          )}
        </span>
      </button>
      {isDoneToday(task) && <Chip tone="success">Today</Chip>}
    </div>
  )
}

export function TaskBoardCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { dispatch } = useStore()
  const done = task.status === 'done'
  const pm = priorityMeta(task.priority)
  const goal = task.goalId

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/routeflow-task', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`group cursor-grab rounded-xl border bg-surface p-3 shadow-sm transition-all duration-150 active:cursor-grabbing active:scale-[0.99] ${
        done ? 'border-line/70 opacity-65' : 'border-line hover:border-line2 hover:shadow-card'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="mt-0.5 shrink-0 text-ink3/50" aria-hidden />
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left"
          title="Open task details"
        >
          <span
            className={`block text-[13.5px] font-medium leading-snug ${done ? 'text-ink3 line-through' : 'text-ink'}`}
          >
            {task.title}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: pm.color }}
              title={`${pm.label} priority`}
            />
            <Chip color={categoryColor(task.category)}>{task.category}</Chip>
            {task.dueTime && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink3">
                <Clock size={10.5} /> {task.dueTime}
              </span>
            )}
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  !done && isOverdue(task.dueDate) ? 'text-danger' : 'text-ink3'
                }`}
              >
                <Calendar size={10.5} /> {relativeDueLabel(task.dueDate)}
              </span>
            )}
            {goal && <Flag size={11} className="text-ink3" aria-label="Linked to a goal" />}
          </span>
        </button>
        <Checkbox
          size="sm"
          checked={done}
          label={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
          onChange={() => dispatch({ type: 'task/toggleDone', id: task.id })}
        />
      </div>
    </div>
  )
}
