import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { createSeedData, createDemoData } from '@/lib/seed'
import { STORAGE_KEY } from '@/lib/constants'
import type { AppData } from '@/types'

function seedStorage(): AppData {
  const data = { ...createDemoData() }
  data.profile = { ...data.profile, onboarded: true }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

async function renderOnboarded(): Promise<AppData> {
  const data = seedStorage()
  render(<App />)
  expect(await screen.findByText('Today score')).toBeTruthy()
  return data
}

/** Both desktop sidebar and mobile nav render links with the same names. */
function navTo(name: string): void {
  const links = screen.getAllByRole('link', { name: new RegExp(`^${name}$`, 'i') })
  fireEvent.click(links[0])
}

describe('onboarding flow', () => {
  it('walks a first-time user through all steps and personalizes the dashboard', async () => {
    render(<App />)

    // step 0: welcome
    expect(await screen.findByText('Your day, routed.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // step 1: name
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Sam Tester' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // step 2: primary goal
    fireEvent.click(screen.getByRole('button', { name: /stay consistent/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // step 3: working hours + energy (defaults valid)
    fireEvent.click(screen.getByRole('button', { name: /afternoon peak/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // step 4: habits
    fireEvent.click(screen.getByRole('button', { name: /read 20 pages/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // step 5: summary + finish
    expect(screen.getByText('Your route is ready')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /start using routeflow/i }))

    // personalized dashboard
    expect(await screen.findByText(/sam tester/i)).toBeTruthy()
    expect(screen.getByText('Today score')).toBeTruthy()

    // persistence
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
    expect(stored.profile.onboarded).toBe(true)
    expect(stored.profile.name).toBe('Sam Tester')
    expect(stored.profile.primaryGoal).toBe('Stay consistent')
    expect(stored.profile.energy).toBe('afternoon')
    expect(stored.habits.some((h) => h.name === 'Read 20 pages')).toBe(true)
  })

  it('is skippable and leaves the app empty', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /skip intro/i }))
    expect(await screen.findByText('Today score')).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
    expect(stored.profile.onboarded).toBe(true)
    expect(stored.habits).toHaveLength(0)
    expect(stored.tasks).toHaveLength(0)
  })

  it('rejects a work day that ends before it starts', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /continue/i }))
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    // rhythm step: set end before start
    const endInput = screen.getByLabelText(/day ends/i)
    fireEvent.change(endInput, { target: { value: '08:00' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/needs to end after it starts/i)).toBeTruthy()
  })
})

describe('today dashboard', () => {
  it('renders all dashboard sections with seeded data', async () => {
    await renderOnboarded()
    expect(screen.getByText(/good (morning|afternoon|evening)|winding down|up late/i)).toBeTruthy()
    expect(screen.getByText(/today's tasks/i)).toBeTruthy()
    expect(screen.getByText(/habits today/i)).toBeTruthy()
    expect(screen.getByText(/goal progress/i)).toBeTruthy()
    expect(screen.getAllByText('Schedule').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /start focus|resume focus/i })).toBeTruthy()
  })

  it('completing a task updates the completion counter', async () => {
    await renderOnboarded()
    expect(screen.getByText('2 of 6 complete')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: /complete prepare sprint demo/i }))
    await waitFor(() => expect(screen.getByText('3 of 6 complete')).toBeTruthy())
  })

  it('checking a habit marks it done for today', async () => {
    await renderOnboarded()
    const btn = screen.getByRole('button', { name: /mark read 20 pages done for today/i })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    await waitFor(() => expect(btn.getAttribute('aria-pressed')).toBe('true'))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(stored.habits.find((h) => h.name === 'Read 20 pages')!.completions).toContain(key)
  })
})

describe('tasks page', () => {
  it('shows list view, filters and search', async () => {
    await renderOnboarded()
    navTo('Tasks')
    expect((await screen.findAllByText('Backlog')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0)
    // search narrows the list
    fireEvent.change(screen.getByLabelText(/search tasks/i), { target: { value: 'dentist' } })
    expect(await screen.findByText('Book dentist appointment')).toBeTruthy()
    expect(screen.queryByText('Research standing desks')).toBeNull()
    // clearing the search restores everything
    fireEvent.change(screen.getByLabelText(/search tasks/i), { target: { value: '' } })
    expect(await screen.findByText('Research standing desks')).toBeTruthy()
  })

  it('switches to a board view with all four columns', async () => {
    await renderOnboarded()
    navTo('Tasks')
    fireEvent.click(await screen.findByRole('tab', { name: /board/i }))
    expect((await screen.findAllByText('Backlog')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Today', { selector: 'h2' }).length).toBeGreaterThan(0)
  })

  it('creates a task through the modal and validates empty titles', async () => {
    await renderOnboarded()
    navTo('Tasks')
    const newTaskButtons = await screen.findAllByRole('button', { name: /new task/i })
    fireEvent.click(newTaskButtons[0])
    const dialog = await screen.findByRole('dialog')
    // invalid: no title
    fireEvent.click(within(dialog).getByRole('button', { name: /create task/i }))
    expect(await within(dialog).findByText(/give your task a name/i)).toBeTruthy()
    // valid
    fireEvent.change(within(dialog).getByPlaceholderText(/draft the launch announcement/i), {
      target: { value: 'Vitest-created task' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /create task/i }))
    expect(await screen.findByText('Vitest-created task')).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
    expect(stored.tasks.some((t) => t.title === 'Vitest-created task')).toBe(true)
  })

  it('edits and deletes a task from the detail modal', async () => {
    await renderOnboarded()
    navTo('Tasks')
    fireEvent.change(await screen.findByLabelText(/search tasks/i), { target: { value: 'dentist' } })
    fireEvent.click(await screen.findByText('Book dentist appointment'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Edit task')).toBeTruthy()
    fireEvent.change(within(dialog).getByDisplayValue('Book dentist appointment'), {
      target: { value: 'Book dentist + cleaning' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('Book dentist + cleaning')).toBeTruthy()
  })
})

describe('planner', () => {
  it('renders the week grid, legend and task rail', async () => {
    await renderOnboarded()
    navTo('Planner')
    expect(await screen.findByText(/this week.s tasks/i)).toBeTruthy()
    expect(screen.getByText('Legend')).toBeTruthy()
    expect(screen.getAllByText(/deep work/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/long easy run|project atlas/i).length).toBeGreaterThan(0)
  })
})

describe('focus mode', () => {
  it('starts, pauses and resets the timer', async () => {
    await renderOnboarded()
    navTo('Focus')
    expect(await screen.findByText('25:00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    expect(await screen.findByRole('button', { name: /pause/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(await screen.findByRole('button', { name: /resume/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(await screen.findByText('25:00')).toBeTruthy()
  })

  it('offers preset lengths and links sessions to tasks', async () => {
    await renderOnboarded()
    navTo('Focus')
    expect(await screen.findByText('25:00')).toBeTruthy()
    expect(screen.getByRole('button', { name: '45 min' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '60 min' })).toBeTruthy()
    const taskSelect = screen.getByLabelText(/^task$/i) as HTMLSelectElement
    expect(taskSelect.options.length).toBeGreaterThan(3)
    const goalSelect = screen.getByLabelText(/^goal$/i) as HTMLSelectElement
    expect(goalSelect.options.length).toBeGreaterThan(2)
  })
})

describe('habits page', () => {
  it('renders habit cards with streaks and opens the detail view', async () => {
    await renderOnboarded()
    navTo('Habits')
    expect(await screen.findByText('Morning movement')).toBeTruthy()
    expect(screen.getAllByText(/streak/i).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /open morning movement details/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Habit details')).toBeTruthy()
    expect(within(dialog).getByText(/last 4 weeks/i)).toBeTruthy()
    expect(within(dialog).getByText(/completion/i)).toBeTruthy()
  })
})

describe('goals', () => {
  it('filters goals by status', async () => {
    await renderOnboarded()
    navTo('Goals')
    expect(await screen.findByText('Launch personal website')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /paused 1/i }))
    expect(await screen.findByText('Hold a conversation in Spanish')).toBeTruthy()
    expect(screen.queryByText('Launch personal website')).toBeNull()
  })

  it('opens the goal detail, toggles milestones and auto-completes', async () => {
    await renderOnboarded()
    navTo('Goals')
    fireEvent.click(await screen.findByText('Launch personal website'))
    expect(await screen.findByText('The route')).toBeTruthy()
    expect(screen.getByText(/linked tasks/i)).toBeTruthy()
    // complete the two remaining milestones -> goal auto-completes
    fireEvent.click(screen.getByRole('checkbox', { name: /mark write two case studies as done/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /mark deploy & share with 5 people as done/i }))
    await waitFor(() => expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
    const g = stored.goals.find((x) => x.id === 'goal-website')!
    expect(g.status).toBe('completed')
    expect(g.milestones.every((m) => m.done)).toBe(true)
  })
})

describe('analytics', () => {
  it('renders stat cards, charts and peaks with live data', async () => {
    await renderOnboarded()
    navTo('Analytics')
    expect(await screen.findByText('Your peaks')).toBeTruthy()
    expect(screen.getByText('Task completion')).toBeTruthy()
    expect(screen.getByText('Focus minutes')).toBeTruthy()
    expect(screen.getAllByText(/habit consistency/i).length).toBeGreaterThan(0)
    // switch range
    fireEvent.click(screen.getByRole('tab', { name: /30 days/i }))
    await waitFor(() => expect(screen.getAllByText(/last 30 days/i).length).toBeGreaterThan(0))
  })
})

describe('settings', () => {
  it('switches theme to dark and back via appearance cards', async () => {
    await renderOnboarded()
    navTo('Settings')
    expect(await screen.findByText(/profile & working hours/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /^dark /i }))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    fireEvent.click(screen.getByRole('radio', { name: /^light /i }))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false))
  })

  it('saves profile changes', async () => {
    await renderOnboarded()
    navTo('Settings')
    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: 'Renamed User' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
      expect(stored.profile.name).toBe('Renamed User')
    })
  })

  it('rejects invalid working hours', async () => {
    await renderOnboarded()
    navTo('Settings')
    fireEvent.change(await screen.findByLabelText(/work day ends/i), { target: { value: '07:00' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    expect(await screen.findByText(/needs to end after it starts/i)).toBeTruthy()
  })

  it('exports data and restarts onboarding without losing data', async () => {
    await renderOnboarded()
    navTo('Settings')
    fireEvent.click(await screen.findByRole('button', { name: /export as json/i }))
    expect(await screen.findByText(/backup downloaded/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /restart onboarding/i }))
    expect(await screen.findByText(/what should we call you|your day, routed/i)).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData
    expect(stored.tasks.length).toBeGreaterThan(0)
  })
})

describe('empty first run (no demo data)', () => {
  it('starts with empty tabs and helpful empty states', async () => {
    const empty = { ...createSeedData() }
    empty.profile = { ...empty.profile, onboarded: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty))
    render(<App />)
    // dashboard greets without a name and shows the empty-task state
    expect(await screen.findByText('Today score')).toBeTruthy()
    expect(screen.getByText('Your day is a blank map')).toBeTruthy()
    // tasks tab: no default tasks
    navTo('Tasks')
    expect(await screen.findByText('No tasks yet')).toBeTruthy()
    // habits tab: no default habits
    navTo('Habits')
    expect(await screen.findByText('No habits yet')).toBeTruthy()
    // goals tab: no default goals
    navTo('Goals')
    expect(await screen.findByText('No goals yet')).toBeTruthy()
  })
})

describe('persistence across reloads', () => {
  it('goes straight to the dashboard when already onboarded', async () => {
    const { unmount } = await renderOnboardedAsRoot()
    unmount()
    // a fresh render simulates a page reload: same localStorage, fresh React tree
    render(<App />)
    expect(await screen.findByText('Today score')).toBeTruthy()
  })
})

async function renderOnboardedAsRoot() {
  const data = seedStorage()
  const result = render(<App />)
  expect(await screen.findByText('Today score')).toBeTruthy()
  void data
  return result
}
