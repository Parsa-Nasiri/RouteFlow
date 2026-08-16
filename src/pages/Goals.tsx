import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Plus } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button } from '@/components/ui/Button'
import { Card, Chip, EmptyState, PageHeader } from '@/components/ui/Misc'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { CATEGORIES, categoryColor } from '@/lib/constants'
import { goalProgress } from '@/lib/analytics'
import { daysBetweenKeys, fmtDateMedium, todayKey } from '@/lib/dates'
import type { Category, Goal, GoalStatus, Milestone } from '@/types'
import { uid } from '@/lib/id'

type GoalFilter = 'all' | GoalStatus

export function GoalsPage() {
  const { state } = useStore()
  const [filter, setFilter] = useState<GoalFilter>('all')
  const [creating, setCreating] = useState(false)

  const counts = useMemo(
    () => ({
      all: state.goals.length,
      active: state.goals.filter((g) => g.status === 'active').length,
      paused: state.goals.filter((g) => g.status === 'paused').length,
      completed: state.goals.filter((g) => g.status === 'completed').length,
    }),
    [state.goals]
  )

  const visible = state.goals.filter((g) => filter === 'all' || g.status === filter)

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Goals"
        subtitle="Long-game destinations, measured in milestones"
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New goal
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {(['all', 'active', 'paused', 'completed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary text-white shadow-sm' : 'bg-surface2 text-ink2 hover:text-ink'
            }`}
          >
            {f} <span className="tnum ml-1 opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'all'
              ? 'No goals yet'
              : `No ${filter === 'active' ? 'active' : filter} goals right now`
          }
          description="Goals give your daily tasks a destination. Add one with a target date and a few milestones."
          action={
            filter === 'all' ? (
              <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} /> Create a goal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      <GoalFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const pct = goalProgress(goal)
  const done = goal.milestones.filter((m) => m.done).length
  const daysLeft = goal.targetDate ? daysBetweenKeys(goal.targetDate, todayKey()) : null
  const color = categoryColor(goal.category)

  return (
    <Link to={`/goals/${goal.id}`} className="group block focus-visible:rounded-2xl">
      <Card hover className="relative h-full overflow-hidden">
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="flex items-start gap-4 pt-1">
          <ProgressRing value={pct} size={54} thickness={5} color={color} label={`${goal.title} progress`}>
            <span className="tnum text-[12.5px] font-semibold text-ink">{pct}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:text-primary-strong">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink3">{goal.description}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Chip color={color}>{goal.category}</Chip>
          {goal.status === 'paused' && <Chip tone="warning">Paused</Chip>}
          {goal.status === 'completed' && <Chip tone="success">Completed</Chip>}
          <span className="ml-auto text-[11.5px] text-ink3">
            {done}/{goal.milestones.length} milestones
          </span>
        </div>
        {goal.targetDate && (
          <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5 text-[12px]">
            <Calendar size={12} className="text-ink3" />
            <span className="text-ink2">{fmtDateMedium(goal.targetDate)}</span>
            {goal.status !== 'completed' && daysLeft !== null && (
              <span className={`ml-auto font-medium ${daysLeft < 0 ? 'text-danger' : 'text-ink3'}`}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
              </span>
            )}
          </div>
        )}
      </Card>
    </Link>
  )
}

export function GoalFormModal({
  open,
  onClose,
  goal = null,
}: {
  open: boolean
  onClose: () => void
  goal?: Goal | null
}) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Work')
  const [targetDate, setTargetDate] = useState('')
  const [status, setStatus] = useState<GoalStatus>('active')
  const [milestones, setMilestones] = useState<string[]>(['', '', ''])
  const [titleError, setTitleError] = useState('')
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? '')
    setDescription(goal?.description ?? '')
    setCategory(goal?.category ?? 'Work')
    setTargetDate(goal?.targetDate ?? '')
    setStatus(goal?.status ?? 'active')
    setMilestones(goal ? goal.milestones.map((m) => m.title) : ['', '', ''])
    setTitleError('')
    setDateError('')
  }, [open, goal])

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Give your goal a name')
      return
    }
    if (targetDate && targetDate < todayKey()) {
      setDateError('Target date should be in the future')
      return
    }
    const msTitles = milestones.map((m) => m.trim()).filter(Boolean)
    const ms: Milestone[] = msTitles.map((t, i) => ({
      id: goal?.milestones[i]?.id ?? uid('ms'),
      title: t,
      done: goal?.milestones[i]?.done ?? false,
      completedAt: goal?.milestones[i]?.completedAt,
    }))
    const payload = {
      title: trimmed,
      description: description.trim(),
      category,
      targetDate: targetDate || undefined,
      status,
      milestones: ms,
    }
    if (goal) {
      dispatch({ type: 'goal/update', id: goal.id, patch: payload })
      toast.push('Goal updated')
    } else {
      dispatch({ type: 'goal/add', goal: payload })
      toast.push('Goal created — route it with milestones')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      description={goal ? 'Milestone checkboxes live on the goal page.' : 'Aim for something meaningful — 3 to 6 milestones usually works well.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {goal ? 'Save changes' : 'Create goal'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Title" error={titleError}>
          <Input
            autoFocus
            value={title}
            invalid={!!titleError}
            placeholder="e.g. Run a half marathon"
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError('')
            }}
          />
        </Field>
        <Field label="Why it matters" hint="Optional — future you will appreciate the context">
          <Textarea
            value={description}
            placeholder="What does success look like?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target date" error={dateError}>
            <Input
              type="date"
              value={targetDate}
              invalid={!!dateError}
              onChange={(e) => {
                setTargetDate(e.target.value)
                if (dateError) setDateError('')
              }}
            />
          </Field>
        </div>
        {goal && (
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
        )}
        <Field label="Milestones" hint="The waypoints along the route">
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-[12px] font-semibold text-primary-strong">
                  {i + 1}
                </span>
                <Input
                  value={m}
                  placeholder={`Milestone ${i + 1}`}
                  onChange={(e) => {
                    const next = [...milestones]
                    next[i] = e.target.value
                    setMilestones(next)
                  }}
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMilestones((prev) => [...prev, ''])}
            >
              <Plus size={14} /> Add milestone
            </Button>
          </div>
        </Field>
      </form>
    </Modal>
  )
}
