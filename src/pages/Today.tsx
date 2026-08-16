import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Flame, Plus, Target, Timer, Zap } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button } from '@/components/ui/Button'
import { Card, Chip, EmptyState, ProgressBar, SectionHeader } from '@/components/ui/Misc'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { RouteArt } from '@/components/ui/Brand'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskRow } from '@/components/tasks/TaskItem'
import { computeTodayScore, todayTasks } from '@/lib/score'
import { goalProgress } from '@/lib/analytics'
import { currentStreak } from '@/lib/habits'
import { blockCategoryMeta, categoryColor, energyMeta } from '@/lib/constants'
import { fmtDateLong, fmtDuration, fmtTime12, timeToMinutes, toKey, greeting } from '@/lib/dates'
import { useNow } from '@/lib/useNow'
import type { Task } from '@/types'

function scoreColor(v: number): string {
  if (v >= 70) return 'rgb(var(--c-success))'
  if (v >= 40) return 'rgb(var(--c-warning))'
  return 'rgb(var(--c-danger))'
}

export function TodayPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const now = useNow()
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const tk = toKey(now)
  const { score, parts } = useMemo(() => computeTodayScore(state, now), [state, now])

  const list = useMemo(() => todayTasks(state, now), [state, now])
  const sortedTasks = useMemo(() => sortTodayTasks(list), [list])

  const scheduledHabits = state.habits.filter((h) => h.days.includes(now.getDay()))
  const activeGoals = useMemo(
    () =>
      state.goals
        .filter((g) => g.status === 'active')
        .sort((a, b) => goalProgress(b) - goalProgress(a))
        .slice(0, 3),
    [state.goals]
  )
  const todayBlocks = useMemo(
    () => state.blocks.filter((b) => b.date === tk).sort((a, b) => a.start.localeCompare(b.start)),
    [state.blocks, tk]
  )
  const focusMin = state.sessions.filter((s) => s.date === tk).reduce((a, s) => a + s.minutes, 0)

  const energy = energyMeta(state.profile.energy)
  const firstActive = list.find((t) => t.status === 'in-progress')

  const nowMin = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="animate-fade-up space-y-5">
      {/* Greeting + score */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -bottom-2 right-2 hidden opacity-50 sm:block" aria-hidden>
            <RouteArt className="w-44 text-ink3/40" />
          </div>
          <p className="text-[13px] font-medium text-ink3">{fmtDateLong(now)}</p>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
            {greeting(now)}
            {state.profile.name ? `, ${state.profile.name.split(' ')[0]}` : ''}.
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {state.profile.primaryGoal && (
              <Chip tone="accent">
                <Target size={11} className="mr-0.5" /> {state.profile.primaryGoal}
              </Chip>
            )}
            <Chip tone="neutral" title={`Peak energy around ${energy.window}`}>
              <Zap size={11} className="mr-0.5" /> Peak: {energy.window}
            </Chip>
            <Chip tone="neutral">
              <Timer size={11} className="mr-0.5" /> {fmtDuration(focusMin)} focused today
            </Chip>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() =>
                navigate('/focus', firstActive ? { state: { taskId: firstActive.id } } : undefined)
              }
            >
              <PlayIcon /> {firstActive ? 'Resume focus' : 'Start focus session'}
            </Button>
            <Button variant="secondary" onClick={() => setTaskModalOpen(true)}>
              <Plus size={16} /> Add task
            </Button>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Today score" subtitle="Tasks, habits, focus & schedule" className="mb-3" />
          <div className="flex items-center gap-5">
            <ProgressRing value={score} size={104} thickness={9} color={scoreColor(score)} label="Today score">
              <div className="text-center">
                <div className="tnum font-display text-[26px] font-semibold leading-none text-ink">{score}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-ink3">of 100</div>
              </div>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-2.5">
              {parts.map((p) => (
                <div key={p.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-medium text-ink2">{p.label}</span>
                    <span className="tnum text-[11px] text-ink3">{p.detail}</span>
                  </div>
                  <ProgressBar
                    thickness={5}
                    value={p.value === null ? 0 : p.value * 100}
                    color={p.value === null ? 'rgb(var(--c-border2))' : scoreColor(p.value * 100)}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Tasks */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <SectionHeader
              title="Today's tasks"
              subtitle={
                list.length
                  ? `${list.filter((t) => t.status === 'done').length} of ${list.length} complete`
                  : undefined
              }
              action={
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setTaskModalOpen(true)}>
                    <Plus size={14} /> Add
                  </Button>
                  <Link
                    to="/tasks"
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-primary-strong transition-colors hover:bg-primary-soft"
                  >
                    All tasks <ArrowRight size={13} />
                  </Link>
                </div>
              }
            />
            {sortedTasks.length === 0 ? (
              <EmptyState
                compact
                title="Your day is a blank map"
                description="Add today’s first task, or pull something in from the backlog."
                action={
                  <Button size="sm" variant="primary" onClick={() => setTaskModalOpen(true)}>
                    <Plus size={14} /> Add a task
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {sortedTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={(task) => setEditing(task)} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Card>
            <SectionHeader
              title="Habits today"
              action={
                <Link
                  to="/habits"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-primary-strong transition-colors hover:bg-primary-soft"
                >
                  All <ArrowRight size={13} />
                </Link>
              }
            />
            {scheduledHabits.length === 0 ? (
              <EmptyState
                compact
                title="No habits scheduled today"
                description="Enjoy the rest day — or build a new habit."
                action={
                  <Link to="/habits">
                    <Button size="sm" variant="secondary">
                      Manage habits
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {scheduledHabits.map((h) => {
                  const done = h.completions.includes(tk)
                  const streak = currentStreak(h)
                  return (
                    <li
                      key={h.id}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                        done ? 'bg-success-soft/60' : 'hover:bg-surface2'
                      }`}
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[16px]"
                        style={{ backgroundColor: `${h.color}1f` }}
                        aria-hidden
                      >
                        {h.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[13.5px] font-medium ${done ? 'text-ink2 line-through' : 'text-ink'}`}>
                          {h.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-ink3">
                          <Flame size={11} className={streak > 0 ? 'text-warning' : 'text-ink3'} />
                          {streak} day{streak === 1 ? '' : 's'}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-pressed={done}
                        aria-label={done ? `Undo ${h.name} for today` : `Mark ${h.name} done for today`}
                        onClick={() => dispatch({ type: 'habit/toggle', id: h.id, date: tk })}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all active:scale-90 ${
                          done
                            ? 'border-transparent text-white'
                            : 'border-line2 text-ink3 hover:border-primary/60 hover:text-primary-strong'
                        }`}
                        style={done ? { backgroundColor: h.color } : undefined}
                      >
                        <Check size={16} strokeWidth={3} className={done ? 'animate-check-pop' : ''} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <SectionHeader
              title="Goal progress"
              action={
                <Link
                  to="/goals"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-primary-strong transition-colors hover:bg-primary-soft"
                >
                  All <ArrowRight size={13} />
                </Link>
              }
            />
            {activeGoals.length === 0 ? (
              <EmptyState
                compact
                title="No active goals"
                description="Set a destination and let milestones mark the route."
                action={
                  <Link to="/goals">
                    <Button size="sm" variant="secondary">
                      Create a goal
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-4">
                {activeGoals.map((g) => {
                  const pct = goalProgress(g)
                  const done = g.milestones.filter((m) => m.done).length
                  return (
                    <li key={g.id}>
                      <Link to={`/goals/${g.id}`} className="group block">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13.5px] font-medium text-ink group-hover:text-primary-strong">
                            {g.title}
                          </span>
                          <span className="tnum shrink-0 text-[12px] font-semibold text-ink2">{pct}%</span>
                        </div>
                        <ProgressBar value={pct} thickness={6} color={categoryColor(g.category)} />
                        <div className="mt-1 text-[11.5px] text-ink3">
                          {done} of {g.milestones.length} milestones · {g.category}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <SectionHeader
              title="Schedule"
              action={
                <Link
                  to="/planner"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-primary-strong transition-colors hover:bg-primary-soft"
                >
                  Planner <ArrowRight size={13} />
                </Link>
              }
            />
            {todayBlocks.length === 0 ? (
              <EmptyState
                compact
                title="Nothing scheduled"
                description="Block out deep work or breaks in the planner."
                action={
                  <Link to="/planner">
                    <Button size="sm" variant="secondary">
                      Open planner
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="relative space-y-1">
                <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
                {todayBlocks.map((b) => {
                  const meta = blockCategoryMeta(b.category)
                  const ended = timeToMinutes(b.end) <= nowMin
                  const current = timeToMinutes(b.start) <= nowMin && !ended
                  return (
                    <li key={b.id} className="relative flex items-center gap-3 rounded-lg px-1 py-1.5">
                      <span
                        className="z-10 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] bg-surface"
                        style={{ borderColor: current ? meta.color : ended ? 'rgb(var(--c-border2))' : meta.color, opacity: ended ? 0.55 : 1 }}
                        aria-hidden
                      />
                      <span className={`w-[104px] shrink-0 text-[11.5px] font-medium tabular-nums ${ended ? 'text-ink3' : 'text-ink2'}`}>
                        {fmtTime12(b.start)} – {fmtTime12(b.end)}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-[13px] ${ended ? 'text-ink3' : 'font-medium text-ink'}`}>
                        {b.title}
                      </span>
                      {current && <Chip tone="accent">Now</Chip>}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <TaskModal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} />
      {editing && <TaskModal open onClose={() => setEditing(null)} task={editing} />}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
    </svg>
  )
}

const statusRank: Record<Task['status'], number> = { 'in-progress': 0, today: 1, backlog: 2, done: 3 }
const prioRank = { high: 0, medium: 1, low: 2 } as const

function sortTodayTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const s = statusRank[a.status] - statusRank[b.status]
    if (s !== 0) return s
    const p = prioRank[a.priority] - prioRank[b.priority]
    if (p !== 0) return p
    return (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99')
  })
}
