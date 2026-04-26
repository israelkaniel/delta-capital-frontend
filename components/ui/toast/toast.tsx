'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Icons } from '@/lib/icons'

type ToastTone = 'success' | 'error' | 'info' | 'warn'

type ToastEntry = {
  id: string
  tone: ToastTone
  title: string
  body?: string
  duration: number
}

type ToastApi = {
  show: (input: { tone: ToastTone; title: string; body?: string; duration?: number }) => void
  success: (title: string, body?: string) => void
  error:   (title: string, body?: string) => void
  info:    (title: string, body?: string) => void
  warn:    (title: string, body?: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show: ToastApi['show'] = useCallback(({ tone, title, body, duration = 4000 }) => {
    const id = `t-${++idRef.current}`
    setToasts(prev => [...prev, { id, tone, title, body, duration }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const api: ToastApi = {
    show,
    success: (title, body) => show({ tone: 'success', title, body }),
    error:   (title, body) => show({ tone: 'error',   title, body, duration: 6000 }),
    info:    (title, body) => show({ tone: 'info',    title, body }),
    warn:    (title, body) => show({ tone: 'warn',    title, body, duration: 6000 }),
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 10,
          maxWidth: 380, pointerEvents: 'none',
        }}
        aria-live="polite"
      >
        {toasts.map(t => <ToastCard key={t.id} entry={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </Ctx.Provider>
  )
}

function ToastCard({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setEnter(true)) }, [])

  const tones: Record<ToastTone, { bg: string; ring: string; ink: string; iconBg: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
    success: { bg: 'var(--bg-elev)', ring: 'color-mix(in oklch, var(--pos) 35%, transparent)', ink: 'var(--pos)',  iconBg: 'var(--pos)',  Icon: Icons.Check },
    error:   { bg: 'var(--bg-elev)', ring: 'color-mix(in oklch, var(--neg) 35%, transparent)', ink: 'var(--neg)',  iconBg: 'var(--neg)',  Icon: Icons.X },
    warn:    { bg: 'var(--bg-elev)', ring: 'color-mix(in oklch, var(--warn) 40%, transparent)', ink: 'var(--warn)', iconBg: 'var(--warn)', Icon: Icons.Bell },
    info:    { bg: 'var(--bg-elev)', ring: 'color-mix(in oklch, var(--accent) 35%, transparent)', ink: 'var(--accent-ink)', iconBg: 'var(--accent)', Icon: Icons.Bell },
  }
  const t = tones[entry.tone]

  return (
    <div
      role="status"
      style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        background: t.bg, color: 'var(--ink-1)',
        border: `1px solid ${t.ring}`,
        borderLeft: `3px solid ${t.ink}`,
        borderRadius: 10,
        boxShadow: '0 8px 28px -8px rgba(0,0,0,0.18), 0 4px 12px -4px rgba(0,0,0,0.08)',
        minWidth: 280,
        transform: enter ? 'translateX(0)' : 'translateX(20px)',
        opacity: enter ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: t.iconBg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        marginTop: 1,
      }}>
        <t.Icon style={{ width: 15, height: 15 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', lineHeight: 1.3 }}>{entry.title}</div>
        {entry.body && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>{entry.body}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--ink-4)', padding: 2, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icons.X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  )
}
