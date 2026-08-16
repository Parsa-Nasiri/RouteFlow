import { describe, expect, it } from 'vitest'
import { handleApiRequest, isLoopback, type ApiContext } from './routeflow-api'
import { createDemoData } from '../src/lib/seed'
import { reducer } from '../src/store/core'
import type { AppData } from '../src/types'

function makeCtx(state?: AppData): ApiContext & { persistCount: number } {
  const ctx: ApiContext & { persistCount: number } = {
    store: { revision: 5, updatedAt: '2026-08-16T00:00:00.000Z', state: state ?? createDemoData() },
    hasFile: true,
    async persist() {
      ctx.persistCount += 1
    },
    persistCount: 0,
  }
  return ctx
}

const qs = (s?: string) => new URLSearchParams(s ?? '')

describe('GET /api/health', () => {
  it('reports liveness and revision', async () => {
    const ctx = makeCtx()
    const res = await handleApiRequest(ctx, { method: 'GET', path: '/api/health', query: qs() })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      revision: 5,
      updatedAt: '2026-08-16T00:00:00.000Z',
      hasFile: true,
    })
  })
})

describe('GET /api/state', () => {
  it('returns the full state with revision', async () => {
    const ctx = makeCtx()
    const res = await handleApiRequest(ctx, { method: 'GET', path: '/api/state', query: qs() })
    expect(res.status).toBe(200)
    const body = res.body as { revision: number; state: AppData }
    expect(body.revision).toBe(5)
    expect(body.state.tasks.length).toBeGreaterThan(20)
    expect(body.state.profile).toBeTruthy()
  })

  it('filters by section', async () => {
    const ctx = makeCtx()
    const res = await handleApiRequest(ctx, {
      method: 'GET',
      path: '/api/state',
      query: qs('section=habits'),
    })
    expect(res.status).toBe(200)
    const body = res.body as { section: string; data: AppData['habits'] }
    expect(body.section).toBe('habits')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('rejects unknown sections', async () => {
    const res = await handleApiRequest(makeCtx(), {
      method: 'GET',
      path: '/api/state',
      query: qs('section=nope'),
    })
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toMatch(/Unknown section/)
  })
})

describe('POST /api/actions', () => {
  it('applies actions through the real reducer and bumps the revision', async () => {
    const ctx = makeCtx()
    const before = ctx.store.state.tasks.length
    const res = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { actions: [{ type: 'task/add', task: { title: 'From the agent', status: 'today' } }] },
    })
    expect(res.status).toBe(200)
    const body = res.body as { ok: boolean; revision: number; state: AppData }
    expect(body.ok).toBe(true)
    expect(body.revision).toBe(6)
    expect(body.state.tasks.length).toBe(before + 1)
    expect(body.state.tasks[0].title).toBe('From the agent')
    expect(ctx.persistCount).toBe(1)
  })

  it('applies a batch sequentially and atomically', async () => {
    const ctx = makeCtx()
    const target = ctx.store.state.tasks.find((t) => t.status !== 'done')!
    const res = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: {
        actions: [
          { type: 'task/status', id: target.id, status: 'done' },
          { type: 'habit/toggle', id: ctx.store.state.habits[0].id, date: '2026-08-16' },
        ],
      },
    })
    expect(res.status).toBe(200)
    const body = res.body as { state: AppData }
    expect(body.state.tasks.find((t) => t.id === target.id)!.completedAt).toBeTruthy()
    expect(body.state.habits[0].completions).toContain('2026-08-16')
  })

  it('rejects the whole batch when one action is invalid', async () => {
    const ctx = makeCtx()
    const res = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: {
        actions: [
          { type: 'task/add', task: { title: 'will be rolled back', status: 'today' } },
          { type: 'task/explode' },
        ],
      },
    })
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toMatch(/Unknown action type "task\/explode".*index 1/s)
    expect(ctx.store.revision).toBe(5)
    expect(ctx.store.state.tasks.some((t) => t.title === 'will be rolled back')).toBe(false)
    expect(ctx.persistCount).toBe(0)
  })

  it('rejects malformed bodies and reserved actions', async () => {
    const ctx = makeCtx()
    const noActions = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { hello: true },
    })
    expect(noActions.status).toBe(400)

    const reserved = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { actions: [{ type: 'data/replace', data: {} }] },
    })
    expect(reserved.status).toBe(400)
    expect((reserved.body as { error: string }).error).toMatch(/not exposed via the API/)
  })

  it('caps batch size', async () => {
    const actions = Array.from({ length: 201 }, () => ({ type: 'settings/set', patch: {} }))
    const res = await handleApiRequest(makeCtx(), {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { actions },
    })
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toMatch(/max 200/)
  })

  it('data/reset wipes the app to an empty fresh start', async () => {
    const ctx = makeCtx()
    expect(ctx.store.state.tasks.length).toBeGreaterThan(0)
    const res = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { actions: [{ type: 'data/reset' }] },
    })
    expect(res.status).toBe(200)
    const body = res.body as { state: AppData }
    expect(body.state.tasks).toEqual([])
    expect(body.state.goals).toEqual([])
    expect(body.state.habits).toEqual([])
    expect(body.state.blocks).toEqual([])
    expect(body.state.profile.onboarded).toBe(false)
  })

  it('session/add defaults completedAt to now', async () => {
    const ctx = makeCtx()
    const res = await handleApiRequest(ctx, {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { actions: [{ type: 'session/add', session: { date: '2026-08-16', minutes: 25 } }] },
    })
    const body = res.body as { state: AppData }
    const added = body.state.sessions[body.state.sessions.length - 1]
    expect(added.completedAt).toBeTruthy()
  })

  it('matches the UI reducer exactly (parity check)', async () => {
    const state = createDemoData()
    const action = { type: 'task/toggleDone' as const, id: state.tasks.find((t) => t.status !== 'done')!.id }
    const viaReducer = reducer(state, action)
    const res = await handleApiRequest(makeCtx(state), {
      method: 'POST',
      path: '/api/actions',
      query: qs(),
      body: { actions: [action] },
    })
    const viaApi = (res.body as { state: AppData }).state
    expect(viaApi.tasks.map((t) => [t.id, t.status, t.completedAt ?? null])).toEqual(
      viaReducer.tasks.map((t) => [t.id, t.status, t.completedAt ?? null])
    )
  })
})

describe('PUT /api/state', () => {
  it('replaces state from a wrapped payload and bumps revision', async () => {
    const ctx = makeCtx()
    const fresh = createDemoData()
    fresh.profile = { ...fresh.profile, name: 'Agent Restored' }
    const res = await handleApiRequest(ctx, {
      method: 'PUT',
      path: '/api/state',
      query: qs(),
      body: { state: fresh },
    })
    expect(res.status).toBe(200)
    expect((res.body as { revision: number }).revision).toBe(6)
    expect(ctx.store.state.profile.name).toBe('Agent Restored')
    expect(ctx.persistCount).toBe(1)
  })

  it('rejects invalid payloads without touching state', async () => {
    const ctx = makeCtx()
    const res = await handleApiRequest(ctx, {
      method: 'PUT',
      path: '/api/state',
      query: qs(),
      body: { state: { tasks: 'nope' } },
    })
    expect(res.status).toBe(400)
    expect(ctx.store.revision).toBe(5)
    expect(ctx.persistCount).toBe(0)
  })
})

describe('routing & guards', () => {
  it('returns 404 with an endpoint hint for unknown paths', async () => {
    const res = await handleApiRequest(makeCtx(), { method: 'GET', path: '/api/nope', query: qs() })
    expect(res.status).toBe(404)
    expect((res.body as { error: string }).error).toMatch(/Unknown endpoint/)
  })

  it('recognizes loopback addresses', () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('::1')).toBe(true)
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopback('192.168.1.2')).toBe(false)
    expect(isLoopback(undefined)).toBe(false)
  })

  it('serves markdown docs from /api/docs', async () => {
    const res = await handleApiRequest(makeCtx(), { method: 'GET', path: '/api/docs', query: qs() })
    expect(res.status).toBe(200)
    expect(res.contentType).toMatch(/text\/markdown/)
    expect(String(res.body)).toMatch(/RouteFlow/)
  })
})
