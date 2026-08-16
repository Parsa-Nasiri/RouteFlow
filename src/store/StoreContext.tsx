import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { createSeedData } from '@/lib/seed'
import { loadAppData, saveAppData } from '@/lib/storage'
import { apiGet, apiSendJson, isHealth, type ApiHealth } from '@/lib/apiClient'
import { diffSummary } from '@/lib/syncDiff'
import { useToast } from '@/components/ui/Toast'
import { reducer, type Action } from './core'
import type { AppData } from '@/types'

export { reducer, applyActions, ACTION_TYPES } from './core'
export type { Action } from './core'

function init(): AppData {
  return loadAppData() ?? createSeedData()
}

export type SyncMode = 'booting' | 'local' | 'live'

export interface ExternalChange {
  summary: string
  at: string
}

interface SyncInfo {
  mode: SyncMode
  revision: number | null
  lastExternal: ExternalChange | null
}

const SyncContext = createContext<SyncInfo>({ mode: 'booting', revision: null, lastExternal: null })

/** Sync status for UI badges: live = agent API connected, local = standalone. */
export function useSyncInfo(): SyncInfo {
  return useContext(SyncContext)
}

interface StoreValue {
  state: AppData
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

const POLL_MS = 2000

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, init)
  const [mode, setMode] = useState<SyncMode>('booting')
  const [revision, setRevision] = useState<number | null>(null)
  const [lastExternal, setLastExternal] = useState<ExternalChange | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state
  const modeRef = useRef<SyncMode>('booting')
  const revisionRef = useRef<number | null>(null)
  const startedRef = useRef(false)
  const pollRef = useRef<number | null>(null)

  const setSyncMode = useCallback((m: SyncMode) => {
    modeRef.current = m
    setMode(m)
  }, [])

  /** Mirror state to localStorage in every mode — offline cache and prod storage. */
  useEffect(() => {
    saveAppData(state)
  }, [state])

  const pushFullState = useCallback(() => {
    window.setTimeout(async () => {
      const res = await apiSendJson<{ ok?: boolean; revision?: number }>('/api/state', 'PUT', stateRef.current)
      if (res && typeof res.revision === 'number') {
        revisionRef.current = res.revision
        setRevision(res.revision)
      }
    }, 60)
  }, [])

  const pullState = useCallback(async (source: 'initial' | 'poll') => {
    const res = await apiGet<{ revision: number; state: AppData }>('/api/state', 2000)
    if (!res || typeof res.revision !== 'number' || !res.state) return
    revisionRef.current = res.revision
    setRevision(res.revision)
    const next = res.state
    if (JSON.stringify(next) !== JSON.stringify(stateRef.current)) {
      // A pristine server (revision 1 = seeded at boot, never mutated) must not
      // clobber a browser that already has real progress — e.g. onboarding that
      // finished before the sync connection was established. Push ours instead.
      if (res.revision === 1) {
        pushFullState()
        return
      }
      const summary = diffSummary(stateRef.current, next)
      rawDispatch({ type: 'data/replace', data: next })
      if (source === 'poll' && summary) {
        setLastExternal({ summary, at: new Date().toISOString() })
      }
    }
  }, [pushFullState])

  const postAction = useCallback(async (action: Action) => {
    if (modeRef.current !== 'live') return
    const res = await apiSendJson<{ ok?: boolean; revision?: number; error?: string }>(
      '/api/actions',
      'POST',
      { actions: [action] }
    )
    if (res === null) {
      // server disappeared — keep working locally, retry sync on next poll
      return
    }
    if (typeof res.revision === 'number') {
      revisionRef.current = res.revision
      setRevision(res.revision)
    }
  }, [])

  /** UI dispatch: applies locally, then forwards to the agent API when live. */
  const dispatch = useCallback(
    (action: Action) => {
      switch (action.type) {
        case 'data/replace':
          rawDispatch(action)
          return
        case 'data/import':
          rawDispatch(action)
          pushFullState()
          return
        case 'data/reset': {
          const fresh = createSeedData()
          rawDispatch({ type: 'data/replace', data: fresh })
          pushFullState()
          return
        }
        default:
          rawDispatch(action)
          void postAction(action)
      }
    },
    [postAction, pushFullState]
  )

  const checkRevision = useCallback(async () => {
    const health = await apiGet<ApiHealth>('/api/health', 1500)
    if (!isHealth(health)) {
      if (modeRef.current === 'live') setSyncMode('local')
      return
    }
    if (modeRef.current !== 'live') setSyncMode('live')
    if (revisionRef.current === null || health.revision !== revisionRef.current) {
      await pullState('poll')
    }
  }, [pullState, setSyncMode])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      const health = await apiGet<ApiHealth>('/api/health', 900)
      if (!isHealth(health)) {
        setSyncMode('local')
        return
      }
      setSyncMode('live')
      revisionRef.current = health.revision
      setRevision(health.revision)
      if (health.hasFile === false) {
        // fresh server: adopt the browser's localStorage mirror if one exists
        const local = loadAppData()
        if (local) {
          const res = await apiSendJson<{ revision?: number }>('/api/state', 'PUT', local)
          if (res && typeof res.revision === 'number') {
            revisionRef.current = res.revision
            setRevision(res.revision)
          }
        }
      } else {
        await pullState('initial')
      }
      pollRef.current = window.setInterval(() => {
        void checkRevision()
      }, POLL_MS)
    })()
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
    }
  }, [checkRevision, pullState, setSyncMode])

  const storeValue = useMemo(() => ({ state, dispatch }), [state, dispatch])
  const syncValue = useMemo(() => ({ mode, revision, lastExternal }), [mode, revision, lastExternal])

  return (
    <StoreContext.Provider value={storeValue}>
      <SyncContext.Provider value={syncValue}>
        <AgentSyncToaster />
        {children}
      </SyncContext.Provider>
    </StoreContext.Provider>
  )
}

/** Toasts when changes arrive from an external agent through the API. */
function AgentSyncToaster() {
  const { mode, lastExternal } = useSyncInfo()
  const toast = useToast()
  const lastSeen = useRef<string | null>(null)

  useEffect(() => {
    if (lastExternal && lastExternal.at !== lastSeen.current) {
      lastSeen.current = lastExternal.at
      toast.push(`Agent sync — ${lastExternal.summary}`, 'info')
    }
  }, [lastExternal, toast])

  useEffect(() => {
    if (mode === 'live' && lastSeen.current === null) {
      lastSeen.current = 'live-announced'
      toast.push('Agent API connected — Hermes can now drive this app', 'info')
    }
  }, [mode, toast])

  return null
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
