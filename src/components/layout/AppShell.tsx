import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ListTodo,
  Monitor,
  Moon,
  Plus,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Target,
  Timer,
} from 'lucide-react'
import { useStore, useSyncInfo } from '@/store/StoreContext'
import { Logo } from '@/components/ui/Brand'
import { Button, IconButton } from '@/components/ui/Button'
import { TaskModal } from '@/components/tasks/TaskModal'
import { todayTasks } from '@/lib/score'
import { useToast } from '@/components/ui/Toast'
import type { ThemeMode } from '@/types'

const NAV = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/planner', label: 'Planner', icon: CalendarDays },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/habits', label: 'Habits', icon: Repeat },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function SyncBadge() {
  const { mode, revision } = useSyncInfo()
  const live = mode === 'live'
  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2"
      title={
        live
          ? 'AI agents can control this app natively — they read and edit the Markdown files in vault/'
          : 'Standalone mode — run "npm run dev" and keep this tab open to enable the agent API'
      }
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-success' : 'bg-line2'}`} />
      </span>
      <span className="text-[11.5px] font-medium text-ink2">
        {live ? 'Agent API · live' : mode === 'booting' ? 'Connecting…' : 'Local mode'}
      </span>
      {revision !== null && (
        <span className="tnum ml-auto text-[10.5px] text-ink3" title="Data revision">
          r{revision}
        </span>
      )}
    </div>
  )
}

function ThemeToggleButton() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const order: ThemeMode[] = ['light', 'dark', 'system']
  const icons = { light: <Sun size={17} />, dark: <Moon size={17} />, system: <Monitor size={17} /> }
  const current = state.settings.theme
  return (
    <IconButton
      label={`Theme: ${current}. Click to change`}
      onClick={() => {
        const next = order[(order.indexOf(current) + 1) % order.length]
        dispatch({ type: 'settings/set', patch: { theme: next } })
        toast.push(`Theme: ${next}`, 'info')
      }}
    >
      {icons[current]}
    </IconButton>
  )
}

function Sidebar({ onNewTask }: { onNewTask: () => void }) {
  const { state } = useStore()
  const openToday = todayTasks(state).filter((t) => t.status !== 'done').length
  const initials = state.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-6 pb-4 pt-6">
        <Logo />
      </div>
      <div className="px-5">
        <Button variant="primary" className="w-full" onClick={onNewTask}>
          <Plus size={16} /> New task
        </Button>
      </div>
      <nav className="thin-scrollbar mt-5 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary-soft text-primary-strong'
                  : 'text-ink2 hover:bg-surface2 hover:text-ink'
              }`
            }
          >
            <item.icon size={17} className="shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.to === '/' && openToday > 0 && (
              <span className="tnum ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                {openToday}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <SyncBadge />
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface2"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-strong">
            {initials || '·'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-ink">
              {state.profile.name || 'Your profile'}
            </span>
            <span className="block text-[11.5px] text-ink3">Settings & data</span>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}

function MobileTopBar({ onNewTask }: { onNewTask: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
      <Logo compact />
      <div className="flex items-center gap-1">
        <ThemeToggleButton />
        <IconButton label="New task" onClick={onNewTask} tone="default">
          <Plus size={17} />
        </IconButton>
      </div>
    </header>
  )
}

function MobileNav() {
  const { state } = useStore()
  const openToday = todayTasks(state).filter((t) => t.status !== 'done').length
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="no-scrollbar flex items-stretch gap-0.5 overflow-x-auto px-2 py-1.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10.5px] font-medium transition-colors ${
                isActive ? 'text-primary-strong' : 'text-ink3'
              }`
            }
          >
            <item.icon size={19} strokeWidth={2.2} />
            <span className="whitespace-nowrap">{item.label}</span>
            {item.to === '/' && openToday > 0 && (
              <span className="tnum absolute right-2 top-0.5 min-w-[15px] rounded-full bg-primary px-1 text-[9.5px] font-semibold leading-[15px] text-white">
                {openToday}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function AppShell() {
  const { state } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  if (!state.profile.onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar onNewTask={() => setQuickAddOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onNewTask={() => setQuickAddOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-10 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <TaskModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(id) => navigate('/tasks', { state: { openTaskId: id } })}
      />
    </div>
  )
}
