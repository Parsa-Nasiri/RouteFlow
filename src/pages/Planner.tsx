import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, Checkbox, EmptyState, PageHeader } from '@/components/ui/Misc'
import { Field, Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { TaskModal } from '@/components/tasks/TaskModal'
import { BLOCK_CATEGORIES, blockCategoryMeta, hexA, priorityMeta } from '@/lib/constants'
import {
  addDays,
  fmtDuration,
  fmtTime12,
  minutesToTime,
  startOfWeek,
  timeOptions,
  timeToMinutes,
  toKey,
} from '@/lib/dates'
import { useNow } from '@/lib/useNow'
import type { BlockCategory, TimeBlock } from '@/types'

const PX_PER_HOUR = 56
const SNAP = 15

export function PlannerPage() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const now = useNow(60_000)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<TimeBlock | null>(null)
  const [creating, setCreating] = useState<{ date: string; start: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dragPreview, setDragPreview] = useState<{ id: string; dx: number; dy: number } | null>(null)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(new Date()), weekOffset * 7 + i)),
    [weekOffset]
  )
  const dayKeys = days.map(toKey)
  const todayK = toKey(now)
  const weekBlocks = useMemo(
    () => state.blocks.filter((b) => dayKeys.includes(b.date)),
    [state.blocks, dayKeys]
  )
  const weekTasks = useMemo(
    () => state.tasks.filter((t) => t.dueDate && dayKeys.includes(t.dueDate)),
    [state.tasks, dayKeys]
  )

  const { startMin, endMin } = useMemo(() => {
    let s = timeToMinutes(state.profile.workStart)
    let e = timeToMinutes(state.profile.workEnd)
    if (e - s < 8 * 60) {
      s = Math.min(s, 9 * 60)
      e = Math.max(e, s + 8 * 60)
    }
    for (const b of weekBlocks) {
      s = Math.min(s, timeToMinutes(b.start))
      e = Math.max(e, timeToMinutes(b.end))
    }
    s = Math.max(0, Math.floor(s / 60) * 60)
    e = Math.min(24 * 60, Math.ceil(e / 60) * 60)
    return { startMin: s, endMin: Math.max(e, s + 8 * 60) }
  }, [state.profile, weekBlocks])

  const hours: number[] = []
  for (let m = startMin; m <= endMin; m += 60) hours.push(m)
  const height = ((endMin - startMin) / 60) * PX_PER_HOUR
  const pxPerMin = PX_PER_HOUR / 60

  // ---- refs kept fresh for global pointer handlers ----
  const colsRef = useRef<(HTMLDivElement | null)[]>([])
  const daysRef = useRef(dayKeys)
  daysRef.current = dayKeys
  const blocksRef = useRef(weekBlocks)
  blocksRef.current = weekBlocks
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch
  const toastRef = useRef(toast)
  toastRef.current = toast
  const suppressClickRef = useRef(false)
  const dragRef = useRef<{
    id: string
    mode: 'move' | 'resize'
    startX: number
    startY: number
    origStart: number
    origEnd: number
    dur: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true
      setDragPreview({ id: d.id, dx, dy })
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      dragRef.current = null
      setDragPreview(null)
      if (!d) return
      if (!d.moved) return
      suppressClickRef.current = true
      window.setTimeout(() => (suppressClickRef.current = false), 150)
      const block = blocksRef.current.find((b) => b.id === d.id)
      if (!block) return
      const deltaMin = Math.round((e.clientY - d.startY) / pxPerMin / SNAP) * SNAP
      if (d.mode === 'move') {
        let ns = Math.max(0, Math.min(24 * 60 - d.dur, d.origStart + deltaMin))
        let date = block.date
        const idx = colsRef.current.findIndex((col) => {
          if (!col) return false
          const r = col.getBoundingClientRect()
          return e.clientX >= r.left && e.clientX <= r.right
        })
        if (idx >= 0) date = daysRef.current[idx]
        if (ns !== d.origStart || date !== block.date) {
          dispatchRef.current({
            type: 'block/update',
            id: d.id,
            patch: { date, start: minutesToTime(ns), end: minutesToTime(ns + d.dur) },
          })
        }
      } else {
        let ne = Math.max(d.origStart + SNAP, Math.min(24 * 60, d.origEnd + deltaMin))
        if (ne !== d.origEnd) {
          dispatchRef.current({ type: 'block/update', id: d.id, patch: { end: minutesToTime(ne) } })
        }
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [pxPerMin])

  const beginDrag = (e: ReactPointerEvent, block: TimeBlock, mode: 'move' | 'resize') => {
    if (e.button !== 0) return
    dragRef.current = {
      id: block.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origStart: timeToMinutes(block.start),
      origEnd: timeToMinutes(block.end),
      dur: timeToMinutes(block.end) - timeToMinutes(block.start),
      moved: false,
    }
  }

  const onColumnClick = (e: ReactMouseEvent<HTMLDivElement>, dateKey: string) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    let m = startMin + (e.clientY - rect.top) / pxPerMin
    m = Math.floor(m / 30) * 30
    m = Math.max(startMin, Math.min(endMin - 60, m))
    setCreating({ date: dateKey, start: minutesToTime(m) })
  }

  const rangeLabel = `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Planner"
        subtitle={`${fmtDuration(weekBlocks.reduce((a, b) => a + timeToMinutes(b.end) - timeToMinutes(b.start), 0))} scheduled this week`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5">
              <IconButton label="Previous week" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft size={15} />
              </IconButton>
              <span className="min-w-[118px] px-1 text-center text-[12.5px] font-medium tabular-nums text-ink2">
                {rangeLabel}
              </span>
              <IconButton label="Next week" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight size={15} />
              </IconButton>
            </div>
            {weekOffset !== 0 && (
              <Button size="sm" variant="secondary" onClick={() => setWeekOffset(0)}>
                Today
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setCreating({ date: todayK, start: minutesToTime(Math.max(startMin, Math.min(timeToMinutes('09:00'), endMin - 60))) })}>
              <Plus size={15} /> Block time
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-4">
        {/* Week grid */}
        <Card className="xl:col-span-3" padded={false}>
          <div className="thin-scrollbar overflow-x-auto">
            <div className="min-w-[760px]">
              {/* day headers */}
              <div className="flex border-b border-line">
                <div className="w-12 shrink-0" />
                {days.map((d, i) => {
                  const isToday = toKey(d) === todayK
                  return (
                    <div key={i} className="flex-1 px-1 py-2.5 text-center">
                      <div className={`text-[11px] font-medium uppercase tracking-wide ${isToday ? 'text-primary-strong' : 'text-ink3'}`}>
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                      <div
                        className={`tnum mx-auto mt-0.5 grid h-6 w-6 place-items-center rounded-full text-[12.5px] font-semibold ${
                          isToday ? 'bg-primary text-white' : 'text-ink'
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* grid body */}
              <div className="flex">
                {/* hour gutter */}
                <div className="relative w-12 shrink-0" style={{ height }}>
                  {hours.map((m) => (
                    <span
                      key={m}
                      className="absolute right-2 -translate-y-1/2 text-[10.5px] font-medium tabular-nums text-ink3"
                      style={{ top: (m - startMin) * pxPerMin }}
                    >
                      {fmtTime12(minutesToTime(m)).replace(' ', '')}
                    </span>
                  ))}
                </div>
                {days.map((d, i) => {
                  const key = toKey(d)
                  const isToday = key === todayK
                  const nowMin = now.getHours() * 60 + now.getMinutes()
                  return (
                    <div
                      key={key}
                      ref={(el) => {
                        colsRef.current[i] = el
                      }}
                      onClick={(e) => onColumnClick(e, key)}
                      className="group relative flex-1 cursor-copy border-l border-line/70"
                      style={{ height }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Add block on ${d.toDateString()}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setCreating({ date: key, start: minutesToTime(Math.max(startMin, 9 * 60)) })
                        }
                      }}
                    >
                      {hours.map((m) => (
                        <span key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/60" style={{ top: (m - startMin) * pxPerMin }} />
                      ))}
                      <span className="pointer-events-none absolute inset-0 hidden group-hover:block bg-primary/[0.03]" />
                      {isToday && nowMin >= startMin && nowMin <= endMin && (
                        <span
                          className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-danger/70"
                          style={{ top: (nowMin - startMin) * pxPerMin }}
                        >
                          <span className="absolute -top-[4px] -left-1 h-2 w-2 rounded-full bg-danger" />
                        </span>
                      )}
                      {weekBlocks
                        .filter((b) => b.date === key)
                        .map((b) => (
                          <BlockView
                            key={b.id}
                            block={b}
                            startMin={startMin}
                            pxPerMin={pxPerMin}
                            preview={dragPreview?.id === b.id ? dragPreview : null}
                            onPointerDown={beginDrag}
                            onClick={() => {
                              if (suppressClickRef.current) return
                              setEditing(b)
                            }}
                          />
                        ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3">
            <span className="text-[11.5px] font-medium text-ink3">Legend</span>
            {BLOCK_CATEGORIES.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                {c.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink2">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-primary" /> Task
            </span>
          </div>
        </Card>

        {/* Tasks rail */}
        <Card>
          <h2 className="text-[15px] font-semibold text-ink">This week’s tasks</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink3">
            Blocks (filled) are how you plan to spend time. Tasks (outlined) are what needs to happen.
          </p>
          {weekTasks.length === 0 ? (
            <div className="mt-4">
              <EmptyState compact title="No tasks due this week" description="Due-dated tasks appear here as outline pills." />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {days.map((d, i) => {
                const items = weekTasks.filter((t) => t.dueDate === dayKeys[i])
                if (items.length === 0) return null
                const isToday = dayKeys[i] === todayK
                return (
                  <div key={i}>
                    <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-primary-strong' : 'text-ink3'}`}>
                      {d.toLocaleDateString(undefined, { weekday: 'long' })} · {d.getDate()}
                    </div>
                    <ul className="space-y-1.5">
                      {items.map((t) => (
                        <TaskPill key={t.id} taskId={t.id} />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <p className="mt-4 text-center text-[12px] text-ink3">
        Click any empty slot to add a block · drag blocks to move them across days · drag the bottom edge to resize.
      </p>

      <BlockModal
        open={creating !== null}
        onClose={() => setCreating(null)}
        initial={creating ?? undefined}
        dayKeys={dayKeys}
        days={days}
      />
      <BlockModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        block={editing}
        dayKeys={dayKeys}
        days={days}
        onRequestDelete={() => setConfirmDelete(true)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) {
            dispatch({ type: 'block/delete', id: editing.id })
            toast.push('Block removed', 'info')
          }
          setEditing(null)
        }}
        title="Delete this block?"
        message="The time will be freed up on your schedule."
        confirmLabel="Delete block"
      />
    </div>
  )
}

function BlockView({
  block,
  startMin,
  pxPerMin,
  preview,
  onPointerDown,
  onClick,
}: {
  block: TimeBlock
  startMin: number
  pxPerMin: number
  preview: { dx: number; dy: number } | null
  onPointerDown: (e: ReactPointerEvent, block: TimeBlock, mode: 'move' | 'resize') => void
  onClick: () => void
}) {
  const meta = blockCategoryMeta(block.category)
  const s = timeToMinutes(block.start)
  const e = timeToMinutes(block.end)
  const top = (s - startMin) * pxPerMin
  const h = Math.max(20, (e - s) * pxPerMin - 2)
  const dragging = !!preview

  return (
    <div
      onPointerDown={(ev) => onPointerDown(ev, block, 'move')}
      onClick={onClick}
      className={`group absolute inset-x-1 z-10 cursor-grab touch-none select-none overflow-hidden rounded-lg border-l-[3px] px-2 py-1 transition-shadow ${dragging ? 'z-30 shadow-pop' : 'hover:z-20 hover:shadow-card'} active:cursor-grabbing`}
      style={{
        top,
        height: h,
        backgroundColor: hexA(meta.color, 0.13),
        borderColor: hexA(meta.color, 0.75),
        transform: preview ? `translate(${preview.dx}px, ${preview.dy}px)` : undefined,
        opacity: dragging ? 0.9 : 1,
      }}
      title={`${block.title} · ${fmtTime12(block.start)}–${fmtTime12(block.end)} · ${meta.label}`}
    >
      <div className="pointer-events-none text-[11px] font-semibold leading-tight text-ink">
        <span className="block truncate">{block.title}</span>
      </div>
      {h >= 34 && (
        <div className="pointer-events-none mt-0.5 text-[10px] font-medium tabular-nums text-ink2">
          {fmtTime12(block.start)} – {fmtTime12(block.end)}
        </div>
      )}
      <div
        onPointerDown={(ev) => {
          ev.stopPropagation()
          onPointerDown(ev, block, 'resize')
        }}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        title="Drag to resize"
      />
    </div>
  )
}

function TaskPill({ taskId }: { taskId: string }) {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) return null
  const done = task.status === 'done'
  return (
    <>
      <li>
        <div
          className={`flex w-full items-center gap-2 rounded-full border bg-surface px-2.5 py-1.5 transition-colors ${
            done ? 'border-line/60 opacity-60' : 'border-primary/35 hover:border-primary/70'
          }`}
        >
          <Checkbox
            size="sm"
            checked={done}
            label={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
            onChange={() => dispatch({ type: 'task/toggleDone', id: task.id })}
          />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title="Edit task"
          >
            {task.dueTime && <span className="shrink-0 text-[11px] font-semibold tabular-nums text-primary-strong">{task.dueTime}</span>}
            <span className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${done ? 'text-ink3 line-through' : 'text-ink'}`}>
              {task.title}
            </span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: priorityMeta(task.priority).color }} />
          </button>
        </div>
      </li>
      {editing && <TaskModal open onClose={() => setEditing(false)} task={task} />}
    </>
  )
}

function BlockModal({
  open,
  onClose,
  block = null,
  initial,
  dayKeys,
  days,
  onRequestDelete,
}: {
  open: boolean
  onClose: () => void
  block?: TimeBlock | null
  initial?: { date: string; start: string }
  dayKeys: string[]
  days: Date[]
  onRequestDelete?: () => void
}) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<BlockCategory>('deep-work')
  const [date, setDate] = useState(dayKeys[0] ?? '')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [titleError, setTitleError] = useState('')
  const [timeError, setTimeError] = useState('')

  useEffect(() => {
    if (!open) return
    if (block) {
      setTitle(block.title)
      setCategory(block.category)
      setDate(block.date)
      setStart(block.start)
      setEnd(block.end)
    } else if (initial) {
      setTitle('')
      setCategory('deep-work')
      setDate(initial.date)
      setStart(initial.start)
      setEnd(minutesToTime(timeToMinutes(initial.start) + 60))
    }
    setTitleError('')
    setTimeError('')
  }, [open, block, initial])

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Name this block')
      return
    }
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      setTimeError('End must be after start')
      return
    }
    const payload = { title: trimmed, category, date, start, end }
    if (block) {
      dispatch({ type: 'block/update', id: block.id, patch: payload })
      toast.push('Block updated')
    } else {
      dispatch({ type: 'block/add', block: payload })
      toast.push('Block scheduled')
    }
    onClose()
  }

  const dateOptions = timeOptions(0, 24 * 60, 15)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={block ? 'Edit block' : 'New time block'}
      footer={
        <>
          {block && onRequestDelete && (
            <Button variant="danger-ghost" className="mr-auto" onClick={onRequestDelete}>
              <Trash2 size={15} /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {block ? 'Save' : 'Add block'}
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
            placeholder="e.g. Deep work — writing"
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError('')
            }}
          />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as BlockCategory)}>
            {BLOCK_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Day">
          <Select value={date} onChange={(e) => setDate(e.target.value)}>
            {dayKeys.map((k, i) => (
              <option key={k} value={k}>
                {days[i].toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <Select value={start} onChange={(e) => setStart(e.target.value)}>
              {dateOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="End" error={timeError}>
            <Select value={end} invalid={!!timeError} onChange={(e) => setEnd(e.target.value)}>
              {dateOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}
