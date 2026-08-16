/**
 * RouteFlow agent API — a Vite plugin that keeps the app's state in a Markdown
 * vault (see plugins/vault.ts) and exposes the real reducer over local HTTP.
 *
 * The vault directory (default: ./vault) is the single source of truth. Humans
 * and AI agents read/edit the .md files directly; the server re-scans them on
 * every request so external edits reach the open browser within ~2 s (the app
 * polls /api/health). The HTTP endpoints remain the browser's transport and an
 * optional convenience for agents:
 *
 *   GET  /api/health           -> {ok, revision, updatedAt, hasFile}
 *   GET  /api/state[?section=] -> full AppData (or one section)
 *   POST /api/actions          -> {"actions":[Action,…]} applied through the real reducer
 *   PUT  /api/state            -> validated whole-state replace
 *   GET  /api/docs             -> the API reference markdown
 *
 * Writes are restricted to loopback connections.
 */
import type { Connect, Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { applyActions } from '../src/store/core'
import { createSeedData } from '../src/lib/seed'
import { validateImport } from '../src/lib/storage'
import { createVaultStore, type VaultStore } from './vault'
import type { AppData } from '../src/types'

export interface ApiEnvelope {
  revision: number
  updatedAt: string
  state: AppData
}

export interface ApiContext {
  store: ApiEnvelope
  hasFile: boolean
  persist(): Promise<void>
}

export interface ApiRequest {
  method: string
  path: string
  query: URLSearchParams
  body?: unknown
  remoteAddress?: string
}

export interface ApiResponse {
  status: number
  body: unknown
  contentType?: string
}

const SECTIONS = ['tasks', 'habits', 'goals', 'blocks', 'sessions', 'profile', 'settings'] as const
const MAX_ACTIONS = 200
const MAX_BODY_BYTES = 5 * 1024 * 1024

export function isLoopback(addr?: string): boolean {
  if (!addr) return false
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1' || addr === 'localhost'
}

const ok = (body: unknown, contentType = 'application/json'): ApiResponse => ({ status: 200, body, contentType })
const err = (status: number, error: string): ApiResponse => ({ status, body: { error }, contentType: 'application/json' })

const ENDPOINT_HINT =
  'Endpoints: GET /api/health, GET /api/state?section=<tasks|habits|goals|blocks|sessions|profile|settings>, POST /api/actions, PUT /api/state, GET /api/docs. Note: the Markdown vault in ./vault is the primary interface.'

/** Framework-free request handler — shared by the connect middleware and unit tests. */
export async function handleApiRequest(ctx: ApiContext, req: ApiRequest): Promise<ApiResponse> {
  const { method, path: p } = req

  if (p === '/api/health' && (method === 'GET' || method === 'HEAD')) {
    return ok({
      ok: true,
      revision: ctx.store.revision,
      updatedAt: ctx.store.updatedAt,
      hasFile: ctx.hasFile,
    })
  }

  if (p === '/api/state') {
    if (method === 'GET') {
      const section = req.query.get('section')
      if (section) {
        if (!(SECTIONS as readonly string[]).includes(section)) {
          return err(400, `Unknown section "${section}". Valid sections: ${SECTIONS.join(', ')}`)
        }
        const key = section as (typeof SECTIONS)[number]
        return ok({
          revision: ctx.store.revision,
          updatedAt: ctx.store.updatedAt,
          section,
          data: ctx.store.state[key],
        })
      }
      return ok({ revision: ctx.store.revision, updatedAt: ctx.store.updatedAt, state: ctx.store.state })
    }
    if (method === 'PUT') {
      const body = req.body as { state?: unknown } | null
      const candidate =
        body && typeof body === 'object' && 'state' in body && body.state ? body.state : body
      const validated = validateImport(candidate)
      if (!validated) {
        return err(
          400,
          'Invalid state payload — expected an AppData-shaped object (profile, settings, tasks, habits, goals, blocks, sessions) or {state: AppData}'
        )
      }
      ctx.store = { revision: ctx.store.revision + 1, updatedAt: new Date().toISOString(), state: validated }
      await ctx.persist()
      return ok({ ok: true, revision: ctx.store.revision, updatedAt: ctx.store.updatedAt })
    }
    return err(405, `Method ${method} not allowed on /api/state. ${ENDPOINT_HINT}`)
  }

  if (p === '/api/actions' && method === 'POST') {
    const body = req.body as { actions?: unknown } | null
    const actions = body?.actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return err(400, 'Body must be {"actions": [Action, …]} with 1–200 actions')
    }
    if (actions.length > MAX_ACTIONS) {
      return err(400, `Too many actions (${actions.length}) — max ${MAX_ACTIONS} per request`)
    }
    let base = ctx.store.state
    const filtered: unknown[] = []
    for (const a of actions) {
      if ((a as { type?: unknown } | null)?.type === 'data/reset') {
        base = createSeedData()
      } else {
        filtered.push(a)
      }
    }
    const result = applyActions(base, filtered)
    if (!result.ok) {
      return err(400, `${result.error} (action index ${result.index})`)
    }
    ctx.store = { revision: ctx.store.revision + 1, updatedAt: new Date().toISOString(), state: result.state }
    await ctx.persist()
    return ok({ ok: true, revision: ctx.store.revision, updatedAt: ctx.store.updatedAt, state: ctx.store.state })
  }

  if (p === '/api/docs' && method === 'GET') {
    return ok(await resolveDocs(), 'text/markdown; charset=utf-8')
  }

  return err(404, `Unknown endpoint ${method} ${p}. ${ENDPOINT_HINT}`)
}

async function resolveDocs(): Promise<string> {
  const candidates = ['.agents/skills/routeflow/references/api.md', 'KNOWLEDGE_BASE.md']
  for (const c of candidates) {
    try {
      return await readFile(path.resolve(process.cwd(), c), 'utf8')
    } catch {
      // try next
    }
  }
  return `# RouteFlow agent API\n\n${ENDPOINT_HINT}\n\nThe vault in ./vault is the primary interface — see .agents/skills/routeflow.\n`
}

function readBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export interface RouteflowApiOptions {
  /** Directory holding the Markdown vault, resolved against the project root. */
  vaultDir?: string
  /** Legacy JSON store to migrate from on first boot (default: data/routeflow.json). */
  legacyJson?: string
}

export function routeflowApi(options: RouteflowApiOptions = {}): Plugin {
  const vaultDir = path.resolve(process.cwd(), options.vaultDir ?? 'vault')
  const legacyJson = options.legacyJson
    ? path.resolve(process.cwd(), options.legacyJson)
    : path.resolve(process.cwd(), 'data/routeflow.json')
  let storePromise: Promise<VaultStore> | null = null
  let chain: Promise<unknown> = Promise.resolve()
  let lastRevision = 0

  const getStore = () => {
    if (!storePromise) storePromise = createVaultStore(vaultDir, legacyJson)
    return storePromise
  }

  /** Serialize all requests so disk scans and mutations can't race each other. */
  const serialized = (fn: () => Promise<ApiResponse>): Promise<ApiResponse> => {
    const run = chain.then(fn, fn)
    chain = run.catch(() => undefined)
    return run
  }

  const attach = (middlewares: Connect.Server) => {
    middlewares.use('/api', (req, res) => {
      void (async () => {
        const started = Date.now()
        try {
          const method = (req.method ?? 'GET').toUpperCase()
          const url = new URL(req.url ?? '/', 'http://localhost')
          const pathname = ('/api' + url.pathname).replace(/\/+$/, '') || '/api'

          if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !isLoopback(req.socket.remoteAddress)) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Writes are restricted to localhost connections' }))
            return
          }

          let body: unknown
          if (method === 'POST' || method === 'PUT') {
            try {
              body = await readBody(req)
            } catch (e) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Bad request body: ${String(e)}` }))
              return
            }
          }

          const response = await serialized(async () => {
            const store = await getStore()
            const env = await store.get()
            lastRevision = env.revision
            const ctx: ApiContext = {
              store: { revision: env.revision, updatedAt: env.updatedAt, state: env.state },
              hasFile: env.hasFile,
              async persist() {
                await store.persist(this.store)
                lastRevision = this.store.revision
              },
            }
            return handleApiRequest(ctx, {
              method,
              path: pathname,
              query: url.searchParams,
              body,
              remoteAddress: req.socket.remoteAddress,
            })
          })

          res.statusCode = response.status
          res.setHeader('Content-Type', response.contentType ?? 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('X-Routeflow-Revision', String(lastRevision))
          if (typeof response.body === 'string') {
            res.end(response.body)
          } else {
            res.end(JSON.stringify(response.body))
          }
          if (pathname !== '/api/health') {
            console.log(`[routeflow-api] ${method} ${pathname} -> ${response.status} (${Date.now() - started}ms, rev ${lastRevision})`)
          }
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Internal error: ${String(e)}` }))
        }
      })()
    })
  }

  return {
    name: 'routeflow-agent-api',
    configureServer(server) {
      attach(server.middlewares)
      void getStore().then((s) => s.get()).catch(() => undefined)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
      void getStore().then((s) => s.get()).catch(() => undefined)
    },
  }
}
