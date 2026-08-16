import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Coffee, Flag, ListTodo, Pause, Play, RotateCcw, Timer, Zap } from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button } from '@/components/ui/Button'
import { Card, Chip, EmptyState, SectionHeader } from '@/components/ui/Misc'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { Field, Select } from '@/components/ui/Form'
import { dailyStats } from '@/lib/analytics'
import { fmtDuration, fmtTime12, todayKey } from '@/lib/dates'
import { useToast } from '@/components/ui/Toast'

type Phase = 'idle' | 'running' | 'paused' | 'complete'
type Mode = 'focus' | 'break'

const PRESETS = [25, 45, 60]
const BREAK_MINUTES = 5

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function chime() {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const ctx = new AudioCtor()
    const now = ctx.currentTime
    const notes = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 0.18 },
      { f: 783.99, t: 0.36 },
    ]
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = n.f
      gain.gain.setValueAtTime(0.0001, now + n.t)
      gain.gain.exponentialRampToValueAtTime(0.18, now + n.t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + n.t)
      osc.stop(now + n.t + 0.55)
    }
    window.setTimeout(() => ctx.close().catch(() => undefined), 1200)
  } catch {
    // audio is a nicety — never block the session
  }
}

export function FocusPage() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const location = useLocation()
  const initialTaskId = (location.state as { taskId?: string } | null)?.taskId ?? ''

  const [preset, setPreset] = useState(25)
  const [mode, setMode] = useState<Mode>('focus')
  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(25 * 60)
  const [linkTaskId, setLinkTaskId] = useState(initialTaskId)
  const [linkGoalId, setLinkGoalId] = useState('')
  const [completedInfo, setCompletedInfo] = useState<{ minutes: number } | null>(null)
  const endsAtRef = useRef<number | null>(null)

  const total = (mode === 'focus' ? preset : BREAK_MINUTES) * 60
  const running = phase === 'running'
  const zen = running || phase === 'paused'

  const completeSession = useCallback(() => {
    endsAtRef.current = null
    if (mode === 'focus') {
      dispatch({
        type: 'session/add',
        session: {
          date: todayKey(),
          minutes: preset,
          taskId: linkTaskId || undefined,
          goalId: linkGoalId || undefined,
          completedAt: new Date().toISOString(),
        },
      })
      setCompletedInfo({ minutes: preset })
      setPhase('complete')
      toast.push(`${preset} focus minutes logged 🎉`)
    } else {
      setMode('focus')
      setRemaining(preset * 60)
      setPhase('idle')
      toast.push('Break over — ready for another round?', 'info')
    }
    chime()
  }, [mode, preset, linkTaskId, linkGoalId, dispatch, toast])

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const ends = endsAtRef.current
      if (ends == null) return
      const rem = Math.max(0, Math.round((ends - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 0) completeSession()
    }, 250)
    return () => window.clearInterval(id)
  }, [phase, completeSession])

  useEffect(() => {
    document.title = zen
      ? `${mmss(remaining)} · ${mode === 'focus' ? 'Focus' : 'Break'} — RouteFlow`
      : 'RouteFlow — Your day, routed'
    return () => {
      document.title = 'RouteFlow — Your day, routed'
    }
  }, [zen, remaining, mode])

  useEffect(() => {
    return () => {
      endsAtRef.current = null
    }
  }, [])

  const start = () => {
    endsAtRef.current = Date.now() + remaining * 1000
    setPhase('running')
  }
  const pause = () => {
    endsAtRef.current = null
    setPhase('paused')
  }
  const reset = () => {
    endsAtRef.current = null
    setPhase('idle')
    setMode('focus')
    setRemaining(preset * 60)
    setCompletedInfo(null)
  }
  const finishEarly = () => {
    const elapsed = total - remaining
    const minutes = Math.floor(elapsed / 60)
    endsAtRef.current = null
    if (minutes >= 1 && mode === 'focus') {
      dispatch({
        type: 'session/add',
        session: {
          date: todayKey(),
          minutes,
          taskId: linkTaskId || undefined,
          goalId: linkGoalId || undefined,
          completedAt: new Date().toISOString(),
        },
      })
      toast.push(`${minutes} focus minutes logged`)
    } else {
      toast.push('Session discarded — under a minute', 'info')
    }
    setPhase('idle')
    setRemaining(preset * 60)
  }
  const startBreak = () => {
    setCompletedInfo(null)
    setMode('break')
    setRemaining(BREAK_MINUTES * 60)
    endsAtRef.current = Date.now() + BREAK_MINUTES * 60 * 1000
    setPhase('running')
  }
  const startAnother = () => {
    setCompletedInfo(null)
    setMode('focus')
    setRemaining(preset * 60)
    endsAtRef.current = Date.now() + preset * 60 * 1000
    setPhase('running')
  }

  const choosePreset = (m: number) => {
    if (phase !== 'idle') return
    setPreset(m)
    setRemaining(m * 60)
  }

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  const tk = todayKey()
  const todaySessions = useMemo(
    () => state.sessions.filter((s) => s.date === tk).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [state.sessions, tk]
  )
  const todayMinutes = todaySessions.reduce((a, s) => a + s.minutes, 0)
  const week = dailyStats(state, 7)

  const linkableTasks = useMemo(
    () => state.tasks.filter((t) => t.status !== 'done').slice(0, 30),
    [state.tasks]
  )
  const activeGoals = state.goals.filter((g) => g.status === 'active')
  const linkedTask = state.tasks.find((t) => t.id === linkTaskId)
  const linkedGoal = state.goals.find((g) => g.id === linkGoalId)

  const taskLabel = (id: string) => {
    const t = state.tasks.find((x) => x.id === id)
    return t?.title ?? 'Deleted task'
  }
  const goalLabel = (id: string) => {
    const g = state.goals.find((x) => x.id === id)
    return g?.title ?? 'Deleted goal'
  }

  return (
    <div className="animate-fade-up">
      <div className={`grid gap-5 transition-all duration-300 ${zen ? '' : 'lg:grid-cols-3'}`}>
        {/* Timer */}
        <Card className={`flex flex-col items-center justify-center py-10 ${zen ? '' : 'lg:col-span-2'}`}>
          <div className="mb-6 flex items-center gap-2">
            <Chip tone={mode === 'focus' ? 'accent' : 'neutral'}>
              {mode === 'focus' ? <Zap size={11} className="mr-1" /> : <Coffee size={11} className="mr-1" />}
              {mode === 'focus' ? 'Focus session' : 'Break'}
            </Chip>
            {(linkedTask || linkedGoal) && !zen && (
              <Chip tone="neutral" className="max-w-[220px]">
                {linkedTask ? <ListTodo size={11} className="mr-1 shrink-0" /> : <Flag size={11} className="mr-1 shrink-0" />}
                <span className="truncate">{linkedTask ? linkedTask.title : linkedGoal?.title}</span>
              </Chip>
            )}
          </div>

          <ProgressRing
            value={progress}
            size={zen ? 280 : 240}
            thickness={zen ? 12 : 10}
            label="Session progress"
            color={mode === 'focus' ? 'rgb(var(--c-accent))' : 'rgb(var(--c-success))'}
          >
            <div className="text-center">
              <div
                className={`tnum font-display font-semibold tabular-nums text-ink ${
                  zen ? 'text-[64px]' : 'text-[56px]'
                }`}
                style={{ letterSpacing: '-0.02em' }}
              >
                {mmss(remaining)}
              </div>
              {phase === 'complete' && completedInfo && (
                <div className="mt-1 text-[13px] font-medium text-success">Session complete</div>
              )}
            </div>
          </ProgressRing>

          {phase === 'complete' && completedInfo ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="max-w-xs text-center text-sm text-ink2">
                Nice work — <span className="font-semibold text-ink">{completedInfo.minutes} minutes</span> of focus
                logged{linkedTask ? ` on “${linkedTask.title}”` : ''}. It already counts toward your score and
                analytics.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={startBreak}>
                  <Coffee size={15} /> 5-min break
                </Button>
                <Button variant="primary" onClick={startAnother}>
                  <Play size={15} /> Another {preset} min
                </Button>
                <Button variant="ghost" onClick={reset}>
                  Done for now
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-7 flex items-center gap-1.5" role="group" aria-label="Session length">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={phase !== 'idle' || mode === 'break'}
                    onClick={() => choosePreset(m)}
                    aria-pressed={preset === m}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all disabled:opacity-40 ${
                      preset === m && mode === 'focus'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface2 text-ink2 hover:text-ink'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                {!running ? (
                  <Button variant="primary" size="lg" onClick={start} className="min-w-[148px]">
                    <Play size={17} /> {phase === 'paused' ? 'Resume' : phase === 'idle' && mode === 'break' ? 'Start break' : 'Start focus'}
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" onClick={pause} className="min-w-[148px]">
                    <Pause size={17} /> Pause
                  </Button>
                )}
                <Button variant="ghost" size="lg" onClick={reset} disabled={phase === 'idle' && remaining === total}>
                  <RotateCcw size={16} /> Reset
                </Button>
                {zen && total - remaining >= 60 && (
                  <Button variant="ghost" size="lg" onClick={finishEarly}>
                    Finish & log {Math.floor((total - remaining) / 60)}m
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>

        {!zen && (
          <div className="space-y-5">
            <Card>
              <SectionHeader title="Link this session" subtitle="Attribute your focus to work that matters" className="mb-4" />
              <div className="space-y-3.5">
                <Field label="Task">
                  <Select value={linkTaskId} onChange={(e) => setLinkTaskId(e.target.value)}>
                    <option value="">No task</option>
                    {linkableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Goal">
                  <Select value={linkGoalId} onChange={(e) => setLinkGoalId(e.target.value)}>
                    <option value="">No goal</option>
                    {activeGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="text-[12px] leading-relaxed text-ink3">
                  Linked sessions show up on the task, the goal and in analytics. Daily target:{' '}
                  <span className="font-medium text-ink2">{fmtDuration(state.settings.focusTarget)}</span>.
                </p>
              </div>
            </Card>

            <Card>
              <SectionHeader
                title="Today's sessions"
                subtitle={`${fmtDuration(todayMinutes)} across ${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'}`}
                className="mb-4"
              />
              <div className="mb-4 flex items-end gap-1.5" aria-hidden>
                {week.map((d) => {
                  const max = Math.max(1, ...week.map((x) => x.focusMin))
                  return (
                    <div key={d.key} className="flex-1 text-center" title={`${d.label}: ${d.focusMin}m`}>
                      <div className="flex h-16 items-end">
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${Math.max(4, (d.focusMin / max) * 100)}%`,
                            backgroundColor: d.key === tk ? 'rgb(var(--c-accent))' : 'rgb(var(--c-border2))',
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-ink3">{d.label.slice(0, 1)}</div>
                    </div>
                  )
                })}
              </div>
              {todaySessions.length === 0 ? (
                <EmptyState
                  compact
                  title="No sessions yet today"
                  description="Press start — even 25 minutes moves the needle."
                />
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto thin-scrollbar pr-1">
                  {todaySessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2.5 rounded-lg bg-surface2 px-3 py-2 text-[12.5px]">
                      <Timer size={13} className="shrink-0 text-primary-strong" />
                      <span className="tnum font-semibold text-ink">{s.minutes}m</span>
                      <span className="text-ink3">{fmtTime12(s.completedAt.slice(11, 16))}</span>
                      <span className="ml-auto min-w-0 truncate text-ink3">
                        {s.taskId ? taskLabel(s.taskId) : s.goalId ? `🎯 ${goalLabel(s.goalId)}` : 'Unlinked'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
