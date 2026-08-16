import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Plus,
  Repeat,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useStore } from '@/store/StoreContext'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { LogoMark } from '@/components/ui/Brand'
import { Chip } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { ENERGY_PATTERNS, GOAL_SUGGESTIONS, HABIT_SUGGESTIONS } from '@/lib/constants'
import { timeToMinutes } from '@/lib/dates'
import type { EnergyPattern, HabitTemplate } from '@/types'

const STEP_COUNT = 6

export function OnboardingPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const firstRun = useRef(!state.profile.onboarded).current

  const [step, setStep] = useState(0)
  const [name, setName] = useState(firstRun ? '' : state.profile.name)
  const [goal, setGoal] = useState('')
  const [customGoal, setCustomGoal] = useState('')
  const [workStart, setWorkStart] = useState(state.profile.workStart)
  const [workEnd, setWorkEnd] = useState(state.profile.workEnd)
  const [hoursError, setHoursError] = useState('')
  const [energy, setEnergy] = useState<EnergyPattern>(state.profile.energy)
  const [selected, setSelected] = useState<string[]>([])
  const [customHabit, setCustomHabit] = useState('')
  const [customs, setCustoms] = useState<string[]>([])

  const templates: HabitTemplate[] | null = useMemo(() => {
    const picked = HABIT_SUGGESTIONS.filter((s) => selected.includes(s.name)).map(({ name, icon, color, days }) => ({ name, icon, color, days }))
    const added = customs.map((c) => ({ name: c, icon: '🎯', color: '#5B5BD6', days: [0, 1, 2, 3, 4, 5, 6] }))
    const all = [...picked, ...added]
    return all.length > 0 ? all : null
  }, [selected, customs])

  const finish = (skipped = false) => {
    dispatch({
      type: 'onboard/finish',
      patch: {
        name: name.trim() ? name.trim() : skipped ? state.profile.name : state.profile.name,
        primaryGoal: goal ? (goal === '__custom' ? customGoal.trim() : goal) : state.profile.primaryGoal,
        workStart,
        workEnd,
        energy,
      },
      templates: skipped ? null : templates,
      replaceSeedHabits: firstRun,
    })
    toast.push(firstRun ? `Welcome to RouteFlow${name.trim() ? ', ' + name.trim().split(' ')[0] : ''}` : 'Onboarding updated')
    navigate('/')
  }

  const next = () => {
    if (step === 3) {
      if (timeToMinutes(workEnd) <= timeToMinutes(workStart)) {
        setHoursError('Your work day needs to end after it starts')
        return
      }
      setHoursError('')
    }
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1))
  }

  const toggleHabit = (habitName: string) => {
    setSelected((prev) => (prev.includes(habitName) ? prev.filter((h) => h !== habitName) : [...prev, habitName]))
  }

  const addCustomHabit = () => {
    const trimmed = customHabit.trim()
    if (!trimmed) return
    if (customs.includes(trimmed) || selected.includes(trimmed)) {
      setCustomHabit('')
      return
    }
    setCustoms((prev) => [...prev, trimmed])
    setCustomHabit('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-6 sm:px-6">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="font-display text-[17px] font-semibold tracking-tight text-ink">RouteFlow</span>
        </div>
        {firstRun ? (
          <Button variant="ghost" size="sm" onClick={() => finish(true)}>
            Skip intro
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Back to app
          </Button>
        )}
      </header>

      <div className="mx-auto mt-6 flex w-full max-w-xl items-center" aria-hidden>
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <span
              className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                i < step ? 'bg-primary' : i === step ? 'bg-primary ring-4 ring-primary/20' : 'bg-line2'
              }`}
            />
            {i < STEP_COUNT - 1 && <span className={`h-px flex-1 ${i < step ? 'bg-primary' : 'bg-line'}`} />}
          </div>
        ))}
      </div>

      <main className="mx-auto mt-6 w-full max-w-xl flex-1 pb-10">
        <div key={step} className="animate-fade-up">
          {step === 0 && (
            <div className="py-8 text-center">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Your day, routed.
              </h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink2">
                RouteFlow brings your tasks, habits, goals, schedule and focus sessions onto one calm
                map — then shows you what actually moved the needle.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3 text-left">
                {[
                  { icon: <CalendarDays size={18} />, title: 'Plan', blurb: 'Design your week in blocks' },
                  { icon: <Timer size={18} />, title: 'Focus', blurb: 'Pomodoro sessions that count' },
                  { icon: <TrendingUp size={18} />, title: 'Grow', blurb: 'Streaks, scores & trends' },
                ].map((f) => (
                  <div key={f.title} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                    <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                      {f.icon}
                    </div>
                    <div className="text-[13.5px] font-semibold text-ink">{f.title}</div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-ink3">{f.blurb}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <StepShell
              title="First — what should we call you?"
              description="Used for your daily greeting. You can change it anytime in Settings."
            >
              <Field label="Your name">
                <Input
                  autoFocus
                  value={name}
                  placeholder="e.g. Sam"
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="What’s the main thing you want out of this?"
              description="We’ll keep it visible on your dashboard as your north star."
            >
              <div className="flex flex-wrap gap-2">
                {GOAL_SUGGESTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={`rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-all ${
                      goal === g
                        ? 'border-primary bg-primary-soft text-primary-strong'
                        : 'border-line bg-surface text-ink2 hover:border-line2'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <Field label="Or write your own" className="mt-5">
                <Input
                  value={customGoal}
                  placeholder="e.g. Ship my side project by December"
                  onChange={(e) => {
                    setCustomGoal(e.target.value)
                    setGoal('__custom')
                  }}
                />
              </Field>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title="When do you usually work?"
              description="Your planner and daily score will use this window."
            >
              <div className="grid grid-cols-2 gap-4">
                <Field label="Day starts">
                  <Input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value || '09:00')}
                  />
                </Field>
                <Field label="Day ends">
                  <Input
                    type="time"
                    value={workEnd}
                    invalid={!!hoursError}
                    onChange={(e) => setWorkEnd(e.target.value || '18:00')}
                  />
                </Field>
              </div>
              {hoursError && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{hoursError}</p>}

              <div className="mt-6">
                <h3 className="mb-2.5 text-[13px] font-medium text-ink2">And when is your energy highest?</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {ENERGY_PATTERNS.map((e) => (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => setEnergy(e.name)}
                      className={`rounded-2xl border p-3.5 text-left transition-all ${
                        energy === e.name
                          ? 'border-primary bg-primary-soft'
                          : 'border-line bg-surface hover:border-line2'
                      }`}
                    >
                      <div className={`text-[13.5px] font-semibold ${energy === e.name ? 'text-primary-strong' : 'text-ink'}`}>
                        {e.label}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-ink3">
                        {e.blurb} · {e.window}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              title="Which habits do you want to build?"
              description="Pick a few to start — they begin fresh, and every check-in builds your streak."
            >
              <div className="flex flex-wrap gap-2">
                {HABIT_SUGGESTIONS.map((h) => {
                  const on = selected.includes(h.name)
                  return (
                    <button
                      key={h.name}
                      type="button"
                      onClick={() => toggleHabit(h.name)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-2 rounded-full border py-2 pl-2.5 pr-3.5 text-[13.5px] font-medium transition-all ${
                        on
                          ? 'border-primary bg-primary-soft text-primary-strong'
                          : 'border-line bg-surface text-ink2 hover:border-line2'
                      }`}
                    >
                      <span aria-hidden>{h.icon}</span>
                      {h.name}
                      {on && <Check size={14} strokeWidth={3} />}
                    </button>
                  )
                })}
                {customs.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCustoms((prev) => prev.filter((x) => x !== c))}
                    className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary-soft py-2 pl-2.5 pr-3.5 text-[13.5px] font-medium text-primary-strong"
                  >
                    <span aria-hidden>🎯</span>
                    {c}
                    <Check size={14} strokeWidth={3} />
                  </button>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Input
                  value={customHabit}
                  placeholder="Add your own…"
                  onChange={(e) => setCustomHabit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomHabit()
                    }
                  }}
                />
                <Button variant="secondary" onClick={addCustomHabit} className="shrink-0">
                  <Plus size={15} /> Add
                </Button>
              </div>
              <p className="mt-3 text-[12.5px] text-ink3">
                {templates ? `${templates.length} habit${templates.length > 1 ? 's' : ''} selected` : 'No habits yet — you can add them later.'}
              </p>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Your route is ready" description="Here’s what RouteFlow learned about you.">
              <div className="space-y-2.5">
                <SummaryRow icon={<Sparkles size={15} />} label="Name" value={name.trim() || state.profile.name} />
                <SummaryRow
                  icon={<Target size={15} />}
                  label="Primary goal"
                  value={goal ? (goal === '__custom' ? customGoal.trim() : goal) : state.profile.primaryGoal}
                />
                <SummaryRow
                  icon={<CalendarDays size={15} />}
                  label="Working hours"
                  value={`${workStart} – ${workEnd} · ${ENERGY_PATTERNS.find((e) => e.name === energy)?.label}`}
                />
                <SummaryRow
                  icon={<Repeat size={15} />}
                  label="Habits"
                  value={
                    templates ? templates.map((t) => t.name).join(', ') : 'Starting fresh — add them anytime'
                  }
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                <Chip tone="accent">Personalized dashboard</Chip>
                <Chip tone="accent">Live demo data</Chip>
                <Chip tone="accent">Everything editable</Chip>
              </div>
            </StepShell>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={15} /> Back
          </Button>
          {step < STEP_COUNT - 1 ? (
            <Button variant="primary" size="lg" onClick={next}>
              Continue <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={() => finish(false)}>
              Start using RouteFlow <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold leading-tight text-ink">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-ink2">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-strong">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-ink3">{label}</span>
        <span className="block truncate text-[13.5px] font-medium text-ink">{value || '—'}</span>
      </span>
    </div>
  )
}
