'use client'
import { useState, useRef, useEffect, ReactNode } from 'react'
import { Icons } from '@/lib/icons'

export type FilterValue = string | string[] | number | { min?: string; max?: string } | { from?: string; to?: string } | undefined

export type FilterSpec =
  | { kind: 'multi';    key: string; label: string; options: Array<{ value: string; label: string }> }
  | { kind: 'search';   key: string; label: string; placeholder?: string }
  | { kind: 'numRange'; key: string; label: string; prefix?: string }
  | { kind: 'dateRange';key: string; label: string }

export type FilterState = Record<string, FilterValue>

export function AdvancedFilter({
  specs, value, onChange, onReset,
}: {
  specs: FilterSpec[]
  value: FilterState
  onChange: (next: FilterState) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeCount = specs.reduce((n, s) => {
    const v = value[s.key]
    if (v == null) return n
    if (s.kind === 'multi') return n + ((v as string[]).length > 0 ? 1 : 0)
    if (s.kind === 'search') return n + ((v as string).trim() ? 1 : 0)
    if (s.kind === 'numRange') {
      const r = v as { min?: string; max?: string }
      return n + ((r.min || r.max) ? 1 : 0)
    }
    if (s.kind === 'dateRange') {
      const r = v as { from?: string; to?: string }
      return n + ((r.from || r.to) ? 1 : 0)
    }
    return n
  }, 0)

  const update = (key: string, v: FilterValue) => onChange({ ...value, [key]: v })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`btn ${activeCount > 0 ? 'primary' : ''}`}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <Icons.Filter />
        Filters{activeCount > 0 && <span className="badge" style={{ marginLeft: 4 }}>{activeCount}</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
          width: 380, maxHeight: '70vh', overflowY: 'auto',
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.18)',
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Filter deals</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              {activeCount > 0 && (
                <button className="btn sm ghost" onClick={onReset} type="button">Clear all</button>
              )}
              <button className="btn sm ghost" onClick={() => setOpen(false)} aria-label="Close" type="button">
                <Icons.X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {specs.map(spec => {
              const v = value[spec.key]
              if (spec.kind === 'multi') {
                const selected = (v as string[] | undefined) ?? []
                return (
                  <Section key={spec.key} label={spec.label}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {spec.options.map(opt => {
                        const on = selected.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => update(spec.key, on
                              ? selected.filter(x => x !== opt.value)
                              : [...selected, opt.value]
                            )}
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line)'),
                              background: on ? 'var(--accent-soft)' : 'var(--bg)',
                              color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                              fontSize: 12, cursor: 'pointer',
                              fontWeight: on ? 600 : 400,
                            }}
                          >{opt.label}</button>
                        )
                      })}
                    </div>
                  </Section>
                )
              }
              if (spec.kind === 'search') {
                return (
                  <Section key={spec.key} label={spec.label}>
                    <input
                      className="input"
                      value={(v as string | undefined) ?? ''}
                      onChange={e => update(spec.key, e.target.value)}
                      placeholder={spec.placeholder ?? 'Search…'}
                    />
                  </Section>
                )
              }
              if (spec.kind === 'numRange') {
                const r = (v as { min?: string; max?: string } | undefined) ?? {}
                return (
                  <Section key={spec.key} label={spec.label}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        className="input" type="number" placeholder={`Min${spec.prefix ? ' ' + spec.prefix : ''}`}
                        value={r.min ?? ''}
                        onChange={e => update(spec.key, { ...r, min: e.target.value })}
                      />
                      <input
                        className="input" type="number" placeholder={`Max${spec.prefix ? ' ' + spec.prefix : ''}`}
                        value={r.max ?? ''}
                        onChange={e => update(spec.key, { ...r, max: e.target.value })}
                      />
                    </div>
                  </Section>
                )
              }
              if (spec.kind === 'dateRange') {
                const r = (v as { from?: string; to?: string } | undefined) ?? {}
                return (
                  <Section key={spec.key} label={spec.label}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        className="input" type="date" value={r.from ?? ''}
                        onChange={e => update(spec.key, { ...r, from: e.target.value })}
                      />
                      <input
                        className="input" type="date" value={r.to ?? ''}
                        onChange={e => update(spec.key, { ...r, to: e.target.value })}
                      />
                    </div>
                  </Section>
                )
              }
              return null
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
