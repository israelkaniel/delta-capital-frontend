'use client'
import { useState, useRef, useEffect, ReactNode } from 'react'
import { Icons } from '@/lib/icons'

export type ActionItem =
  | { kind: 'item'; label: string; icon?: React.FC<React.SVGProps<SVGSVGElement>>; onClick: () => void; tone?: 'default' | 'danger'; disabled?: boolean }
  | { kind: 'sep' }

export function ActionsMenu({
  items, label = 'Actions', triggerClassName = 'btn sm',
}: {
  items: ActionItem[]
  label?: ReactNode
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={triggerClassName} onClick={() => setOpen(o => !o)} type="button" aria-label={typeof label === 'string' ? label : 'Actions'}>
        <Icons.MoreHorizontal style={{ width: 14, height: 14 }} />
        {typeof label === 'string' && <span style={{ marginLeft: 4 }}>{label}</span>}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 100, marginTop: 6,
          background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 8,
          boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)', minWidth: 200, overflow: 'hidden',
          padding: '4px 0',
        }}>
          {items.map((it, i) => {
            if (it.kind === 'sep') {
              return <div key={i} style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
            }
            const Icon = it.icon
            return (
              <button
                key={i}
                disabled={it.disabled}
                onClick={() => { it.onClick(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '8px 14px',
                  background: 'none', border: 'none',
                  cursor: it.disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12.5, textAlign: 'left',
                  color: it.tone === 'danger' ? 'var(--neg)' : 'var(--ink-1)',
                  opacity: it.disabled ? 0.4 : 1,
                }}
                onMouseEnter={e => { if (!it.disabled) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {Icon && <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />}
                {it.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
