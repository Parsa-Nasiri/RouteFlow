/**
 * Tiny fetch wrapper for the local agent API served by the RouteFlow vite plugin.
 * Every call degrades to `null` when the API is unreachable (production static
 * hosting, offline, or tests) so the app silently falls back to localStorage mode.
 */

export interface ApiHealth {
  ok: boolean
  revision: number
  updatedAt: string
  hasFile: boolean
}

async function request(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<{ status: number; body: unknown } | null> {
  if (typeof fetch === 'undefined') return null
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(path, { ...init, signal: controller.signal })
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = null
    }
    return { status: res.status, body }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

/** Returns null when the API is unreachable; otherwise the parsed JSON body. */
export async function apiGet<T>(path: string, timeoutMs = 800): Promise<T | null> {
  const res = await request(path, { method: 'GET' }, timeoutMs)
  if (res === null) return null
  if (res.status >= 400) return null
  return (res.body ?? null) as T | null
}

/** Returns null when unreachable (caller should downgrade to local mode), else the body (may be an error payload). */
export async function apiSendJson<T>(
  path: string,
  method: 'POST' | 'PUT',
  payload: unknown,
  timeoutMs = 4000
): Promise<T | null> {
  const res = await request(
    path,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    timeoutMs
  )
  if (res === null) return null
  return (res.body ?? {}) as T
}

export function isHealth(v: unknown): v is ApiHealth {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { ok?: unknown }).ok === true &&
    typeof (v as { revision?: unknown }).revision === 'number'
  )
}
