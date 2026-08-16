import { useEffect, useMemo, useState } from 'react'
import { Check, Flame, Pencil, Plus, Trash2, Trophy } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, Chip, EmptyState, PageHeader, ProgressBar } from '@/components/ui/Misc'
import { Field, Input } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { HABIT_COLORS, HABIT_ICONS, hexA } from '@/lib/constants'
import { addDays, startOfDay, startOfWeek, toKey, todayKey } from '@/lib/dates'
import {
  bestStreak,
  completionStats,
  currentStreak,
  frequencyLabel,
  habitWeek,
  isScheduled,
} from '@/lib/habits'
import type { Habit } from '@/types'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function HabitsPage() {
  const { state } = useStore()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [detail, setDetail] = useState<Habit | null>(null)
  const detailHabit = detail ? (state.habits.find((h) => h.id === detail.id) ?? null) : null

  const scheduledToday = state.habits.filter((h) => isScheduled(h, new Date()))
  const doneToday = scheduledToday.filter((h) => h.completions.includes(todayKey())).length

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Habits"
        subtitle={
          state.habits.length
            ? `${doneToday}/${scheduledToday.length} done today · ${state.habits.length} habit${state.habits.length > 1 ? 's' : ''} tracked`
            : undefined
        }
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New habit
          </Button>
        }
      />

      {state.habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Small, repeatable wins compound. Start with one thing you can do most days."
          action={
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <Plus size={14} /> Create a habit
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.habits.map((h) => (
            <HabitCard key={h.id} habit={h} onOpen={() => setDetail(h)} />
          ))}
        </div>
      )}

      <HabitFormModal open={creating} onClose={() => setCreating(false)} />
      <HabitFormModal open={!!editing} onClose={() => setEditing(null)} habit={editing} />
      {detailHabit && (
        <HabitDetailModal
          habit={detailHabit}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setDetail(null)
            setEditing(detailHabit)
          }}
        />
      )}
    </div>
  )
}

function HabitCard({ habit, onOpen }: { habit: Habit; onOpen: () => void }) {
  const { dispatch } = useStore()
  const tk = todayKey()
  const done = habit.completions.includes(tk)
  const streak = currentStreak(habit)
  const stats = completionStats(habit)
  const week = habitWeek(habit, startOfWeek(new Date()))

  return (
    <Card className="flex flex-col" hover>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[19px] transition-transform hover:scale-105"
          style={{ backgroundColor: hexA(habit.color, 0.14) }}
          aria-label={`Open ${habit.name} details`}
        >
          {habit.icon}
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-[14.5px] font-semibold text-ink">{habit.name}</h3>
          <p className="text-[12px] text-ink3">{frequencyLabel(habit)}</p>
        </button>
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Undo ${habit.name} for today` : `Mark ${habit.name} done for today`}
          onClick={() => dispatch({ type: 'habit/toggle', id: habit.id, date: tk })}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90 ${
            done ? 'border-transparent text-white' : 'border-line2 text-ink3 hover:border-primary/60 hover:text-primary-strong'
          }`}
          style={done ? { backgroundColor: habit.color } : undefined}
        >
          <Check size={18} strokeWidth={3} className={done ? 'animate-check-pop' : ''} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5" role="img" aria-label="This week's completions">
        {week.map((cell, i) => (
          <div key={cell.key} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-ink3">{DAY_LABELS[i]}</span>
            {cell.state === 'off' ? (
              <span className="h-7 w-full rounded-lg bg-surface2/60" title="Not scheduled" />
            ) : cell.state === 'done' ? (
              <span
                className="grid h-7 w-full place-items-center rounded-lg"
                style={{ backgroundColor: hexA(habit.color, 0.85) }}
                title="Completed"
              >
                <Check size={12} strokeWidth={3.5} className="text-white" />
              </span>
            ) : cell.state === 'missed' ? (
              <span className="h-7 w-full rounded-lg border border-dashed border-line2 bg-surface" title="Missed" />
            ) : cell.state === 'scheduled' ? (
              <span
                className="h-7 w-full rounded-lg border-2"
                style={{ borderColor: hexA(habit.color, 0.5) }}
                title="Scheduled today"
              />
            ) : (
              <span className="h-7 w-full rounded-lg border border-line" title="Scheduled" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-[12px] text-ink2">
        <span className="inline-flex items-center gap-1.5">
          <Flame size={13} className={streak > 0 ? 'text-warning' : 'text-ink3'} />
          <span className="tnum font-semibold text-ink">{streak}</span> streak
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Trophy size={13} className="text-ink3" />
          <span className="tnum font-semibold text-ink">{bestStreak(habit)}</span> best
        </span>
        <span className="ml-auto tnum font-semibold text-ink">{stats.pct}%</span>
      </div>
    </Card>
  )
}

function HabitDetailModal({
  habit,
  onClose,
  onEdit,
}: {
  habit: Habit
  onClose: () => void
  onEdit: () => void
}) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const tk = todayKey()
  const streak = currentStreak(habit)
  const best = bestStreak(habit)
  const stats = completionStats(habit)
  const scheduledToday = isScheduled(habit, new Date())
  const doneToday = habit.completions.includes(tk)

  const heat = useMemo(() => {
    const today = startOfDay(new Date())
    const cells: { key: string; state: 'done' | 'missed' | 'off' }[] = []
    for (let off = 27; off >= 0; off--) {
      const d = addDays(today, -off)
      const key = toKey(d)
      if (!isScheduled(habit, d)) cells.push({ key, state: 'off' })
      else if (habit.completions.includes(key)) cells.push({ key, state: 'done' })
      else cells.push({ key, state: 'missed' })
    }
    return cells
  }, [habit])

  return (
    <>
      <Modal open onClose={onClose} title="Habit details">
        <div className="flex items-start gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[26px]"
            style={{ backgroundColor: hexA(habit.color, 0.14) }}
          >
            {habit.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold text-ink">{habit.name}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip color={habit.color}>{frequencyLabel(habit)}</Chip>
              <Chip tone="neutral">
                {habit.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(' ')}
              </Chip>
            </div>
          </div>
          <div className="flex gap-1">
            <IconButton label="Edit habit" onClick={onEdit}>
              <Pencil size={15} />
            </IconButton>
            <IconButton label="Delete habit" tone="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface2 p-3 text-center">
            <div className="tnum font-display text-[22px] font-semibold text-ink">{streak}</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink3">Current</div>
          </div>
          <div className="rounded-xl bg-surface2 p-3 text-center">
            <div className="tnum font-display text-[22px] font-semibold text-ink">{best}</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink3">Best</div>
          </div>
          <div className="rounded-xl bg-surface2 p-3 text-center">
            <div className="tnum font-display text-[22px] font-semibold text-ink">{stats.pct}%</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink3">Rate</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink2">Completion</span>
            <span className="tnum text-[12px] text-ink3">
              {stats.done} of {stats.scheduled} scheduled days
            </span>
          </div>
          <ProgressBar value={stats.pct} color={habit.color} />
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-[13px] font-medium text-ink2">Last 4 weeks</h4>
          <div className="grid grid-cols-7 gap-1" role="img" aria-label="28-day completion history">
            {heat.map((c) => (
              <span
                key={c.key}
                className="aspect-square w-full rounded-[5px]"
                style={{
                  backgroundColor:
                    c.state === 'done' ? hexA(habit.color, 0.85) : c.state === 'missed' ? 'rgb(var(--c-surface2))' : 'transparent',
                  border: c.state === 'missed' ? '1px dashed rgb(var(--c-border2))' : 'none',
                }}
                title={`${c.key}: ${c.state === 'done' ? 'completed' : c.state === 'missed' ? 'missed' : 'not scheduled'}`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-ink3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: hexA(habit.color, 0.85) }} /> Done
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-line2 bg-surface2" /> Missed
            </span>
            <span>·</span>
            <span className="ml-auto">Most recent on the right</span>
          </div>
        </div>

        {scheduledToday && (
          <Button
            variant={doneToday ? 'secondary' : 'primary'}
            className="mt-5 w-full"
            onClick={() => dispatch({ type: 'habit/toggle', id: habit.id, date: tk })}
          >
            {doneToday ? (
              <>
                <Check size={16} /> Done today — tap to undo
              </>
            ) : (
              'Mark done for today'
            )}
          </Button>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          dispatch({ type: 'habit/delete', id: habit.id })
          toast.push('Habit deleted', 'info')
          onClose()
        }}
        title="Delete this habit?"
        message={`“${habit.name}” and its history will be removed permanently.`}
        confirmLabel="Delete habit"
      />
    </>
  )
}

function HabitFormModal({
  open,
  onClose,
  habit = null,
}: {
  open: boolean
  onClose: () => void
  habit?: Habit | null
}) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(HABIT_ICONS[0])
  const [color, setColor] = useState(HABIT_COLORS[0])
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [nameError, setNameError] = useState('')
  const [daysError, setDaysError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(habit?.name ?? '')
    setIcon(habit?.icon ?? HABIT_ICONS[0])
    setColor(habit?.color ?? HABIT_COLORS[0])
    setDays(habit ? [...habit.days] : [1, 2, 3, 4, 5])
    setNameError('')
    setDaysError('')
  }, [open, habit])

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
    setDaysError('')
  }

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Give your habit a name')
      return
    }
    if (days.length === 0) {
      setDaysError('Pick at least one day')
      return
    }
    if (habit) {
      dispatch({ type: 'habit/update', id: habit.id, patch: { name: trimmed, icon, color, days } })
      toast.push('Habit updated')
    } else {
      dispatch({ type: 'habit/add', habit: { name: trimmed, icon, color, days } })
      toast.push('Habit created — welcome aboard')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      description={habit ? undefined : 'Keep it small enough that saying yes is easy.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {habit ? 'Save changes' : 'Create habit'}
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
        <Field label="Name" error={nameError}>
          <Input
            autoFocus
            value={name}
            invalid={!!nameError}
            placeholder="e.g. Stretch for 5 minutes"
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError('')
            }}
          />
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-1.5">
            {HABIT_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                aria-pressed={icon === ic}
                aria-label={`Icon ${ic}`}
                className={`grid h-10 w-10 place-items-center rounded-xl border text-[17px] transition-all ${
                  icon === ic ? 'border-primary bg-primary-soft scale-105' : 'border-line bg-surface hover:border-line2'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                aria-label={`Color ${c}`}
                className={`h-8 w-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-105'}`}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </Field>

        <Field label="Scheduled days" error={daysError}>
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                aria-pressed={days.includes(d)}
                aria-label={DAY_NAMES[d]}
                className={`h-9 w-11 rounded-xl border text-[13px] font-semibold transition-all ${
                  days.includes(d)
                    ? 'border-primary bg-primary-soft text-primary-strong'
                    : 'border-line bg-surface text-ink3 hover:border-line2'
                }`}
              >
                {DAY_NAMES[d].slice(0, 2)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {(
              [
                { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
                { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                { label: '3× / week', days: [1, 3, 5] },
              ] as const
            ).map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setDays([...p.days])}
                className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink2 transition-colors hover:border-line2 hover:text-ink"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  )
}
