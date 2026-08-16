import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Monitor, Moon, RotateCcw, Sun, Upload } from 'lucide-react'
import { useStore, useSyncInfo } from '@/store/StoreContext'
import { Button } from '@/components/ui/Button'
import { Card, PageHeader, SectionHeader } from '@/components/ui/Misc'
import { Field, Input, Select } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { APP_NAME, DATA_VERSION, ENERGY_PATTERNS } from '@/lib/constants'
import { timeToMinutes } from '@/lib/dates'
import { validateImport } from '@/lib/storage'
import type { AppData, EnergyPattern, ThemeMode } from '@/types'

export function SettingsPage() {
  const { state, dispatch } = useStore()
  const sync = useSyncInfo()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(state.profile.name)
  const [primaryGoal, setPrimaryGoal] = useState(state.profile.primaryGoal)
  const [workStart, setWorkStart] = useState(state.profile.workStart)
  const [workEnd, setWorkEnd] = useState(state.profile.workEnd)
  const [energy, setEnergy] = useState<EnergyPattern>(state.profile.energy)
  const [hoursError, setHoursError] = useState('')
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setName(state.profile.name)
    setPrimaryGoal(state.profile.primaryGoal)
    setWorkStart(state.profile.workStart)
    setWorkEnd(state.profile.workEnd)
    setEnergy(state.profile.energy)
  }, [state.profile])

  const storageKb = useMemo(() => {
    try {
      return (new Blob([JSON.stringify(state)]).size / 1024).toFixed(1)
    } catch {
      return '?'
    }
  }, [state])

  const saveProfile = () => {
    if (timeToMinutes(workEnd) <= timeToMinutes(workStart)) {
      setHoursError('Your work day needs to end after it starts')
      return
    }
    setHoursError('')
    dispatch({
      type: 'profile/set',
      patch: { name: name.trim(), primaryGoal: primaryGoal.trim(), workStart, workEnd, energy },
    })
    toast.push('Profile saved')
  }

  const exportData = () => {
    const payload = {
      app: APP_NAME,
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      data: state,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    a.href = url
    a.download = `routeflow-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.push('Backup downloaded')
  }

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const wrapper = parsed as { app?: string; data?: unknown }
      const candidate = wrapper?.app === APP_NAME && wrapper.data ? wrapper.data : parsed
      const validated = validateImport(candidate)
      if (!validated) {
        toast.push('That file doesn’t look like a RouteFlow backup', 'error')
        return
      }
      setPendingImport(validated)
    } catch {
      toast.push('Could not read that file', 'error')
    }
  }

  const themeOptions: { value: ThemeMode; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', desc: 'Warm paper tones', icon: <Sun size={17} /> },
    { value: 'dark', label: 'Dark', desc: 'Deep-focus night', icon: <Moon size={17} /> },
    { value: 'system', label: 'System', desc: 'Follow your device', icon: <Monitor size={17} /> },
  ]

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Profile, appearance and your data" />

      <div className="space-y-5">
        <Card>
          <SectionHeader title="Profile & working hours" subtitle="Personalizes your dashboard, planner and score" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Primary goal">
              <Input
                value={primaryGoal}
                placeholder="e.g. Stay consistent"
                onChange={(e) => setPrimaryGoal(e.target.value)}
              />
            </Field>
            <Field label="Work day starts">
              <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value || '09:00')} />
            </Field>
            <Field label="Work day ends" error={hoursError}>
              <Input
                type="time"
                value={workEnd}
                invalid={!!hoursError}
                onChange={(e) => setWorkEnd(e.target.value || '18:00')}
              />
            </Field>
            <Field label="Energy pattern" className="sm:col-span-2">
              <Select value={energy} onChange={(e) => setEnergy(e.target.value as EnergyPattern)}>
                {ENERGY_PATTERNS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label} — peak around {p.window}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={saveProfile}>
              Save profile
            </Button>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Appearance" subtitle="Theme applies instantly and is remembered" />
          <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Theme">
            {themeOptions.map((t) => {
              const active = state.settings.theme === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => dispatch({ type: 'settings/set', patch: { theme: t.value } })}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line2'
                  }`}
                >
                  <span className={`mb-2 inline-flex ${active ? 'text-primary-strong' : 'text-ink2'}`}>{t.icon}</span>
                  <span className={`block text-[13.5px] font-semibold ${active ? 'text-primary-strong' : 'text-ink'}`}>
                    {t.label}
                  </span>
                  <span className="block text-[11.5px] text-ink3">{t.desc}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Focus target" subtitle="Daily focus minutes that count as 100% on your Today score" />
          <div className="max-w-xs">
            <Select
              value={String(state.settings.focusTarget)}
              onChange={(e) =>
                dispatch({ type: 'settings/set', patch: { focusTarget: Number(e.target.value) } })
              }
            >
              {[60, 90, 120, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''} per day` : `${m}m per day`}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Your data"
            subtitle={`Everything lives in this browser · ~${storageKb} KB used`}
          />
          <div
            className="mb-3 flex items-center gap-2.5 rounded-xl bg-surface2 px-3.5 py-2.5"
            title="Native AI control: agents mutate the same reducer the UI uses"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {sync.mode === 'live' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  sync.mode === 'live' ? 'bg-success' : 'bg-line2'
                }`}
              />
            </span>
            <span className="text-[12.5px] font-medium text-ink2">
              {sync.mode === 'live'
                ? `Agent API live · revision ${sync.revision ?? '—'} · syncing vault/*.md`
                : sync.mode === 'booting'
                  ? 'Connecting to agent API…'
                  : 'Local mode — the agent API is available while npm run dev is running'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportData}>
              <Download size={15} /> Export as JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Import backup
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                navigate('/onboarding')
                toast.push('Onboarding restarted — your data is safe', 'info')
              }}
            >
              <RotateCcw size={15} /> Restart onboarding
            </Button>
            <Button variant="danger-ghost" onClick={() => setConfirmReset(true)}>
              Reset app data
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import backup file"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImportFile(f)
              e.target.value = ''
            }}
          />
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">
            Importing replaces everything with the backup’s contents — export first if you want a safety copy.
            Resetting permanently deletes all data and replays onboarding. While the dev server runs, your data
            also lives as editable Markdown in <code className="rounded bg-surface2 px-1 py-0.5 text-[11.5px]">vault/*.md</code> —
            AI agents read and edit those files directly (see <code className="rounded bg-surface2 px-1 py-0.5 text-[11.5px]">.agents/skills/routeflow/SKILL.md</code>).
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                {APP_NAME} <span className="ml-1 text-[12px] font-normal text-ink3">v1.0.0</span>
              </h2>
              <p className="mt-1 text-[12.5px] text-ink3">
                Local-first by design: no accounts, no servers, no tracking. Data schema v{DATA_VERSION}.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) {
            dispatch({ type: 'data/import', data: pendingImport })
            toast.push('Backup imported')
            navigate('/')
          }
        }}
        title="Import this backup?"
        message="This will replace all current tasks, habits, goals, blocks, sessions and settings with the backup’s contents."
        confirmLabel="Replace my data"
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          dispatch({ type: 'data/reset' })
          toast.push('App data cleared', 'info')
          navigate('/onboarding')
        }}
        title="Reset all app data?"
        message="Every task, habit, goal, block and session — yours and otherwise — will be permanently deleted, and onboarding will replay. Export a backup first if you might want it back."
        confirmLabel="Delete everything"
      />
    </div>
  )
}
