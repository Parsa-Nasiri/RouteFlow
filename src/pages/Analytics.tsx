import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CheckCircle2, Clock, Flame, Target, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Card, Chip, EmptyState, PageHeader, ProgressBar, SectionHeader, StatCard } from '@/components/ui/Misc'
import { Segmented } from '@/components/ui/Form'
import { BarChart } from '@/components/charts/BarChart'
import { AreaChart } from '@/components/charts/AreaChart'
import { dailyStats, goalProgress, habitConsistency, productivityPeaks } from '@/lib/analytics'
import { categoryColor, hexA } from '@/lib/constants'
import { fmtDuration, fromKey } from '@/lib/dates'
import { isDone, isScheduled } from '@/lib/habits'

export function AnalyticsPage() {
  const { state } = useStore()
  const [range, setRange] = useState<'7' | '30'>('7')
  const days = Number(range)

  const stats = useMemo(() => dailyStats(state, days), [state, days])
  const peaks = useMemo(() => productivityPeaks(state, days), [state, days])
  const consistency = useMemo(() => habitConsistency(state, days), [state, days])

  const tasksDone = stats.reduce((a, s) => a + s.tasksDone, 0)
  const focusMin = stats.reduce((a, s) => a + s.focusMin, 0)
  const bestDay = stats.reduce((a, s) => (s.tasksDone > a.tasksDone ? s : a), stats[0])
  const activeGoals = state.goals.filter((g) => g.status === 'active')
  const hasAnyData = tasksDone > 0 || focusMin > 0 || state.habits.length > 0

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Analytics"
        subtitle="Trends computed live from your tasks, habits, focus and goals"
        actions={
          <Segmented
            ariaLabel="Date range"
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
            ]}
          />
        }
      />

      {!hasAnyData ? (
        <EmptyState
          title="Nothing to analyze yet"
          description="Complete a task, tick a habit or finish a focus session — your trends will draw themselves."
          action={
            <Link to="/" className="text-primary-strong underline-offset-4 hover:underline">
              Go to Today
            </Link>
          }
        />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="Tasks done"
              value={tasksDone}
              sub={`${(tasksDone / days).toFixed(1)} per day`}
              icon={<CheckCircle2 size={19} />}
            />
            <StatCard
              label="Habit consistency"
              value={consistency === null ? '—' : `${consistency}%`}
              sub="scheduled days hit"
              icon={<Flame size={19} />}
            />
            <StatCard
              label="Focus time"
              value={fmtDuration(focusMin)}
              sub={`${fmtDuration(Math.round(focusMin / days))} per day`}
              icon={<Clock size={19} />}
            />
            <StatCard
              label="Best day"
              value={bestDay && bestDay.tasksDone > 0 ? bestDay.date.toLocaleDateString(undefined, { weekday: 'short' }) : '—'}
              sub={bestDay && bestDay.tasksDone > 0 ? `${bestDay.tasksDone} tasks completed` : 'no completions yet'}
              icon={<TrendingUp size={19} />}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {/* Tasks chart */}
            <Card className="lg:col-span-2">
              <SectionHeader title="Task completion" subtitle={`Tasks completed per day · last ${days} days`} />
              <BarChart
                data={stats.map((s) => ({
                  label: s.label,
                  value: s.tasksDone,
                  hint: `${s.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${s.tasksDone} done`,
                }))}
                ariaLabel="Tasks completed per day"
              />
            </Card>

            {/* Peaks */}
            <Card>
              <SectionHeader title="Your peaks" subtitle="When you get things done" />
              <div className="space-y-3">
                <div className="rounded-xl bg-surface2 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink3">
                    <CalendarCheck size={13} /> Most productive day
                  </div>
                  {peaks.weekday ? (
                    <>
                      <div className="mt-1.5 font-display text-[22px] font-semibold text-ink">{peaks.weekday.label}</div>
                      <div className="text-[12.5px] text-ink3">{peaks.weekday.count} completions & sessions</div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[13px] text-ink3">Complete a few tasks to find out.</p>
                  )}
                </div>
                <div className="rounded-xl bg-surface2 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink3">
                    <Clock size={13} /> Most productive time
                  </div>
                  {peaks.hourBand ? (
                    <>
                      <div className="mt-1.5 font-display text-[22px] font-semibold text-ink">{peaks.hourBand.label}</div>
                      <div className="text-[12.5px] text-ink3">{peaks.hourBand.count} completions & sessions</div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[13px] text-ink3">Not enough signal yet.</p>
                  )}
                </div>
                {peaks.weekday && peaks.hourBand && (
                  <p className="text-[12.5px] leading-relaxed text-ink3">
                    Consider guarding {peaks.hourBand.label} on {peaks.weekday.label}s for your most important
                    work — that’s when you naturally ship.
                  </p>
                )}
              </div>
            </Card>

            {/* Focus chart */}
            <Card className="lg:col-span-2">
              <SectionHeader
                title="Focus minutes"
                subtitle={`Logged focus per day · dashed line is your ${days}-day average`}
              />
              <AreaChart
                data={stats.map((s) => ({ label: s.label, value: s.focusMin }))}
                formatValue={(v) => `${v}m`}
                ariaLabel="Focus minutes per day"
              />
            </Card>

            {/* Goal progress */}
            <Card>
              <SectionHeader title="Goal progress" subtitle={`${activeGoals.length} active goal${activeGoals.length === 1 ? '' : 's'}`} />
              {activeGoals.length === 0 ? (
                <EmptyState compact title="No active goals" description="Goals you set will track here." />
              ) : (
                <ul className="space-y-3.5">
                  {activeGoals.slice(0, 5).map((g) => {
                    const pct = goalProgress(g)
                    return (
                      <li key={g.id}>
                        <Link to={`/goals/${g.id}`} className="group block">
                          <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-medium text-ink group-hover:text-primary-strong">
                              {g.title}
                            </span>
                            <span className="tnum shrink-0 text-[12px] font-semibold text-ink2">{pct}%</span>
                          </div>
                          <ProgressBar value={pct} thickness={6} color={categoryColor(g.category)} />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Habit heatmap */}
          <Card className="mt-5">
            <SectionHeader
              title="Habit consistency"
              subtitle={`Every scheduled day, per habit · last ${days} days`}
              action={<Chip tone="neutral">{state.habits.length} habits</Chip>}
            />
            {state.habits.length === 0 ? (
              <EmptyState compact title="No habits tracked" description="Create habits and their history will chart here." />
            ) : (
              <div className="thin-scrollbar overflow-x-auto">
                <div className="min-w-[640px]">
                  {state.habits.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 border-b border-line/60 py-2.5 last:border-0">
                      <div className="flex w-36 min-w-0 shrink-0 items-center gap-2">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px]"
                          style={{ backgroundColor: hexA(h.color, 0.15) }}
                        >
                          {h.icon}
                        </span>
                        <span className="truncate text-[12.5px] font-medium text-ink">{h.name}</span>
                      </div>
                      <div className="flex flex-1 gap-[3px]">
                        {stats.map((s) => {
                          const d = fromKey(s.key)
                          if (!isScheduled(h, d)) {
                            return <span key={s.key} className="h-4 flex-1 rounded-[3px] opacity-0" title="Not scheduled" />
                          }
                          const done = isDone(h, s.key)
                          return (
                            <span
                              key={s.key}
                              className="h-4 flex-1 rounded-[3px] transition-transform hover:scale-125"
                              style={{
                                backgroundColor: done ? h.color : 'rgb(var(--c-surface2))',
                                border: done ? 'none' : '1px dashed rgb(var(--c-border2))',
                              }}
                              title={`${h.name} · ${s.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${done ? 'done' : 'missed'}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center gap-4 pl-[156px] text-[11px] text-ink3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Done
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-line2 bg-surface2" /> Missed
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <Target size={11} /> Hover cells for details
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
