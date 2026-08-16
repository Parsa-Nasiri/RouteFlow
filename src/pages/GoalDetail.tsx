import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, Chip, EmptyState, ProgressBar } from '@/components/ui/Misc'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { TaskRow } from '@/components/tasks/TaskItem'
import { TaskModal } from '@/components/tasks/TaskModal'
import { GoalFormModal } from '@/pages/Goals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { categoryColor, hexA } from '@/lib/constants'
import { goalProgress } from '@/lib/analytics'
import { daysBetweenKeys, fmtDateMedium, fmtDateWithYear, todayKey } from '@/lib/dates'
import type { Task } from '@/types'

export function GoalDetailPage() {
  const { state, dispatch } = useStore()
  const { goalId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const goal = state.goals.find((g) => g.id === goalId)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const [milestoneError, setMilestoneError] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const linkedTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.goalId === goalId)
        .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'done' ? 1 : -1)),
    [state.tasks, goalId]
  )

  if (!goal) {
    return (
      <EmptyState
        title="Goal not found"
        description="It may have been deleted. Head back to the goal list."
        action={
          <Link to="/goals">
            <Button variant="secondary" size="sm">
              <ArrowLeft size={14} /> All goals
            </Button>
          </Link>
        }
      />
    )
  }

  const pct = goalProgress(goal)
  const doneMs = goal.milestones.filter((m) => m.done).length
  const daysLeft = goal.targetDate ? daysBetweenKeys(goal.targetDate, todayKey()) : null
  const color = categoryColor(goal.category)

  const addMilestone = () => {
    const trimmed = newMilestone.trim()
    if (!trimmed) {
      setMilestoneError('Give the milestone a name')
      return
    }
    dispatch({ type: 'goal/milestone/add', goalId: goal.id, title: trimmed })
    setNewMilestone('')
    setMilestoneError('')
  }

  return (
    <div className="animate-fade-up">
      <Link
        to="/goals"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink2 transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} /> All goals
      </Link>

      {/* Hero */}
      <Card padded={false} className="overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: color }} aria-hidden />
        <div className="relative p-5 sm:p-7">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full opacity-[0.07]"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-xl">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip color={color}>{goal.category}</Chip>
                {goal.status === 'active' && <Chip tone="accent">Active</Chip>}
                {goal.status === 'paused' && <Chip tone="warning">Paused</Chip>}
                {goal.status === 'completed' && <Chip tone="success">Completed</Chip>}
              </div>
              <h1 className="mt-3 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
                {goal.title}
              </h1>
              {goal.description && (
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink2">{goal.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-ink3">
                {goal.targetDate && (
                  <span>
                    Target · <span className="font-medium text-ink2">{fmtDateWithYear(goal.targetDate)}</span>
                  </span>
                )}
                {daysLeft !== null && goal.status !== 'completed' && (
                  <span className={daysLeft < 0 ? 'font-medium text-danger' : 'font-medium text-ink2'}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
                  </span>
                )}
                <span>
                  Created {fmtDateMedium(goal.createdAt.slice(0, 10))}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <ProgressRing value={pct} size={128} thickness={11} color={color} label={`${goal.title} progress`}>
                <div className="text-center">
                  <div className="tnum font-display text-[30px] font-semibold leading-none text-ink">{pct}%</div>
                  <div className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-ink3">
                    {doneMs}/{goal.milestones.length} done
                  </div>
                </div>
              </ProgressRing>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                {goal.status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      dispatch({ type: 'goal/update', id: goal.id, patch: { status: 'paused' } })
                      toast.push('Goal paused', 'info')
                    }}
                  >
                    <Pause size={13} /> Pause
                  </Button>
                )}
                {goal.status === 'paused' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      dispatch({ type: 'goal/update', id: goal.id, patch: { status: 'active' } })
                      toast.push('Goal resumed')
                    }}
                  >
                    <Play size={13} /> Resume
                  </Button>
                )}
                {goal.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      dispatch({ type: 'goal/update', id: goal.id, patch: { status: 'active' } })
                      toast.push('Goal reopened', 'info')
                    }}
                  >
                    Reopen
                  </Button>
                )}
                <IconButton label="Delete goal" tone="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ProgressBar value={pct} color={color} thickness={10} />
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        {/* Milestone route */}
        <Card className="lg:col-span-3">
          <h2 className="text-[15px] font-semibold text-ink">The route</h2>
          <p className="mt-0.5 text-[13px] text-ink3">Tap a waypoint to mark it complete.</p>

          {goal.milestones.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                compact
                title="No milestones yet"
                description="Break the goal into 3–6 waypoints you can celebrate."
              />
            </div>
          ) : (
            <ol className="relative mt-5 space-y-1">
              <span
                className="absolute bottom-4 left-[15px] top-4 w-0.5"
                style={{ backgroundColor: hexA(color, 0.25) }}
                aria-hidden
              />
              {goal.milestones.map((m, idx) => (
                <li key={m.id} className="group relative flex items-center gap-4 rounded-xl px-2 py-2.5 hover:bg-surface2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={m.done}
                    aria-label={m.done ? `Mark ${m.title} as not done` : `Mark ${m.title} as done`}
                    onClick={() => dispatch({ type: 'goal/milestone/toggle', goalId: goal.id, milestoneId: m.id })}
                    className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90 ${
                      m.done ? 'text-white' : 'border-line2 bg-surface hover:border-primary/70'
                    }`}
                    style={m.done ? { backgroundColor: color, borderColor: color } : undefined}
                  >
                    {m.done ? (
                      <Check size={14} strokeWidth={3.5} className="animate-check-pop" />
                    ) : (
                      <span className="tnum text-[11px] font-semibold text-ink3">{idx + 1}</span>
                    )}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[14px] font-medium ${
                        m.done ? 'text-ink3 line-through' : 'text-ink'
                      }`}
                    >
                      {m.title}
                    </span>
                    {m.done && m.completedAt && (
                      <span className="text-[11.5px] text-ink3">Done {fmtDateMedium(m.completedAt.slice(0, 10))}</span>
                    )}
                  </span>
                  <IconButton
                    label={`Remove milestone ${m.title}`}
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => dispatch({ type: 'goal/milestone/delete', goalId: goal.id, milestoneId: m.id })}
                  >
                    <X size={13} />
                  </IconButton>
                </li>
              ))}
            </ol>
          )}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addMilestone()
            }}
          >
            <div className="flex-1">
              <input
                value={newMilestone}
                onChange={(e) => {
                  setNewMilestone(e.target.value)
                  if (milestoneError) setMilestoneError('')
                }}
                placeholder="Add a milestone…"
                aria-label="New milestone title"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              {milestoneError && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{milestoneError}</p>}
            </div>
            <Button type="submit" variant="secondary" className="shrink-0">
              <Plus size={15} /> Add
            </Button>
          </form>
        </Card>

        {/* Linked tasks */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Linked tasks</h2>
              <p className="mt-0.5 text-[13px] text-ink3">
                {linkedTasks.length ? `${linkedTasks.filter((t) => t.status === 'done').length} of ${linkedTasks.length} done` : 'Connect daily work to this goal'}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setAddingTask(true)}>
              <Plus size={14} /> Add
            </Button>
          </div>
          {linkedTasks.length === 0 ? (
            <EmptyState
              compact
              title="No tasks linked"
              description="Create a task with this goal attached, and it shows up here."
              action={
                <Button size="sm" variant="secondary" onClick={() => setAddingTask(true)}>
                  <Plus size={14} /> New linked task
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {linkedTasks.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={setEditingTask} showDate showStatus />
              ))}
            </div>
          )}
        </Card>
      </div>

      <GoalFormModal open={editing} onClose={() => setEditing(false)} goal={goal} />
      <TaskModal
        open={addingTask || !!editingTask}
        onClose={() => {
          setAddingTask(false)
          setEditingTask(null)
        }}
        task={editingTask}
        defaultGoalId={goal.id}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          dispatch({ type: 'goal/delete', id: goal.id })
          toast.push('Goal deleted', 'info')
          navigate('/goals')
        }}
        title="Delete this goal?"
        message={`“${goal.title}”, its milestones and task links will be removed. The tasks themselves stay in your task list.`}
        confirmLabel="Delete goal"
      />
    </div>
  )
}
