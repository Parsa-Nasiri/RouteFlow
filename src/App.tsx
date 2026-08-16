import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from '@/store/StoreContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/components/layout/AppShell'
import { OnboardingPage } from '@/pages/Onboarding'
import { TodayPage } from '@/pages/Today'
import { TasksPage } from '@/pages/Tasks'
import { PlannerPage } from '@/pages/Planner'
import { FocusPage } from '@/pages/Focus'
import { HabitsPage } from '@/pages/Habits'
import { GoalsPage } from '@/pages/Goals'
import { GoalDetailPage } from '@/pages/GoalDetail'
import { AnalyticsPage } from '@/pages/Analytics'
import { SettingsPage } from '@/pages/Settings'

function ThemeSync() {
  const { state } = useStore()
  const theme = state.settings.theme

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#101014' : '#faf9f7')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return null
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <ThemeSync />
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<AppShell />}>
              <Route index element={<TodayPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="focus" element={<FocusPage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="goals/:goalId" element={<GoalDetailPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </BrowserRouter>
      </StoreProvider>
    </ToastProvider>
  )
}
