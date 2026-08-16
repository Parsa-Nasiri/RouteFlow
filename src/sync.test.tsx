import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const { apiGetMock, apiSendJsonMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiSendJsonMock: vi.fn(),
}))

vi.mock('@/lib/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
  apiSendJson: (...args: unknown[]) => apiSendJsonMock(...args),
  isHealth: (v: unknown) =>
    typeof v === 'object' && v !== null && (v as { ok?: unknown }).ok === true && typeof (v as { revision?: unknown }).revision === 'number',
}))

import { StoreProvider, useStore, useSyncInfo } from '@/store/StoreContext'
import { ToastProvider } from '@/components/ui/Toast'
import { createDemoData, createSeedData } from '@/lib/seed'
import { STORAGE_KEY } from '@/lib/constants'
import type { AppData } from '@/types'

function Harness() {
  const { state, dispatch } = useStore()
  const sync = useSyncInfo()
  return (
    <div>
      <div data-testid="onboarded">{String(state.profile.onboarded)}</div>
      <div data-testid="tasks">{state.tasks.length}</div>
      <div data-testid="mode">{sync.mode}</div>
      <button
        type="button"
        onClick={() =>
          dispatch({ type: 'task/add', task: { title: 'Sync test task', status: 'today', priority: 'low', category: 'Work' } })
        }
      >
        add-task
      </button>
    </div>
  )
}

function renderWithSync() {
  return render(
    <ToastProvider>
      <StoreProvider>
        <Harness />
      </StoreProvider>
    </ToastProvider>
  )
}

const byTestId = (id: string) => screen.getByTestId(id).textContent

describe('agent API sync layer', () => {
  it('adopts server state when the browser has nothing local', async () => {
    const serverState = { ...createDemoData() }
    serverState.profile = { ...serverState.profile, onboarded: true }
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/health') return { ok: true, revision: 7, updatedAt: 'x', hasFile: true }
      if (path === '/api/state') return { revision: 7, state: serverState }
      return null
    })
    apiSendJsonMock.mockResolvedValue({ ok: true, revision: 7 })

    renderWithSync()
    await waitFor(() => expect(byTestId('mode')).toBe('live'))
    await waitFor(() => expect(byTestId('onboarded')).toBe('true'))
    expect(Number(byTestId('tasks'))).toBe(serverState.tasks.length)
  })

  it('forwards UI actions to the server (write-through)', async () => {
    const serverState = { ...createDemoData() }
    serverState.profile = { ...serverState.profile, onboarded: true }
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/health') return { ok: true, revision: 7, updatedAt: 'x', hasFile: true }
      if (path === '/api/state') return { revision: 7, state: serverState }
      return null
    })
    apiSendJsonMock.mockResolvedValue({ ok: true, revision: 8 })

    renderWithSync()
    await waitFor(() => expect(byTestId('mode')).toBe('live'))
    fireEvent.click(screen.getByRole('button', { name: 'add-task' }))
    await waitFor(() =>
      expect(apiSendJsonMock).toHaveBeenCalledWith(
        '/api/actions',
        'POST',
        expect.objectContaining({
          actions: [expect.objectContaining({ type: 'task/add' })],
        })
      )
    )
  })

  it('protects a local onboarded profile from a pristine server (revision 1) instead of replaying onboarding', async () => {
    // browser has real progress; server file is a never-mutated seed
    const local: AppData = {
      ...createSeedData(),
      profile: { ...createSeedData().profile, name: 'Parsa', onboarded: true },
      tasks: [
        {
          id: 'task_k1_ab',
          title: 'My own task',
          status: 'today',
          priority: 'medium',
          category: 'Work',
          createdAt: new Date().toISOString(),
        },
      ],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/health') return { ok: true, revision: 1, updatedAt: 'x', hasFile: true }
      if (path === '/api/state') return { revision: 1, state: createSeedData() }
      return null
    })
    apiSendJsonMock.mockResolvedValue({ ok: true, revision: 2 })

    renderWithSync()
    await waitFor(() => expect(byTestId('mode')).toBe('live'))
    // the local state must win: PUT /api/state is used to push it to the server
    await waitFor(() =>
      expect(apiSendJsonMock).toHaveBeenCalledWith(
        '/api/state',
        'PUT',
        expect.objectContaining({ profile: expect.objectContaining({ onboarded: true, name: 'Parsa' }) })
      )
    )
    // and nothing pulled the app back into onboarding
    await waitFor(() => expect(byTestId('onboarded')).toBe('true'))
    expect(Number(byTestId('tasks'))).toBe(1)
  })

  it('stays in local mode when the API is unreachable', async () => {
    apiGetMock.mockResolvedValue(null)
    renderWithSync()
    await waitFor(() => expect(byTestId('mode')).toBe('local'))
    expect(byTestId('onboarded')).toBe('false')
  })
})
