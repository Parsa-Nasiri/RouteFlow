import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  title: string
  tone: ToastTone
}

interface ToastApi {
  push: (title: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneStyles: Record<ToastTone, { icon: React.ReactNode; cls: string }> = {
  success: { icon: <CheckCircle2 size={17} className="text-success" />, cls: '' },
  error: { icon: <AlertTriangle size={17} className="text-danger" />, cls: '' },
  info: { icon: <Info size={17} className="text-primary" />, cls: '' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const push = useCallback((title: string, tone: ToastTone = 'success') => {
    counter.current += 1
    const id = counter.current
    setItems((prev) => [...prev.slice(-2), { id, title, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3600)
  }, [])

  const api = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-24 z-[70] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end"
        >
          {items.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-pop"
            >
              {toneStyles[t.tone].icon}
              <span>{t.title}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
