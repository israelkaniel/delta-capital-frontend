'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { Pill } from '@/components/ui/pill'
import { api, type DbFunder, type DbGlobalRule } from '@/lib/api'
import { FunderEditor } from '@/components/funders/funder-editor'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

const isActiveRule = (r: { valid_from: string; valid_to: string | null }) => {
  const now = new Date().toISOString().split('T')[0]
  if (r.valid_from > now) return false
  if (r.valid_to && r.valid_to < now) return false
  return true
}

export default function FunderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [funder, setFunder] = useState<DbFunder | null>(null)
  const [rules, setRules]   = useState<DbGlobalRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [f, r] = await Promise.all([api.funders.get(id), api.rules.globalList({ funder_id: id })])
    if (f.error) { setError(f.error.message); setLoading(false); return }
    setFunder(f.data)
    setRules(r.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>Loading funder…</div>
  )

  if (error || !funder) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Funder not found.'}</p>
      <Link href="/funders" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to funders</Link>
    </div>
  )

  const activeRules = rules.filter(isActiveRule)
  const hue = hueFromId(funder.id)

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/funders" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Funders</Link>
        <span>/</span>
        <span className="mono" style={{ color: 'var(--ink-1)' }}>{funder.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `oklch(0.65 0.18 ${hue})`,
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icons.Bank style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{funder.name}</h1>
              <Pill tone={funder.is_active ? 'pos' : 'neg'} dot>{funder.is_active ? 'Active' : 'Inactive'}</Pill>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              <span className="chip">{funder.commission_base === 'PAYBACK_AMOUNT' ? 'Payback base' : 'Transferred base'}</span>
              <span style={{ marginLeft: 12 }}>{activeRules.length} active rule{activeRules.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn sm" onClick={() => setEditorOpen(true)}><Icons.Edit /> Edit</button>
          <Link href="/rules" className="btn sm">Manage rules</Link>
          <button className="close-btn" onClick={() => router.back()}><Icons.X /> Close</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Profile</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
              {([
                { label: 'Funder ID', value: funder.id.slice(0, 8), mono: true, accent: true },
                { label: 'Name',      value: funder.name },
                { label: 'Base',      value: funder.commission_base === 'PAYBACK_AMOUNT' ? 'Payback amount' : 'Transferred amount' },
                { label: 'Status',    value: funder.is_active ? 'Active' : 'Inactive' },
              ] as const).map((f, i, arr) => {
                const isLast = i === arr.length - 1
                return (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 12px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>{f.label}</div>
                    <div style={{
                      fontSize: 13, padding: '12px 20px 12px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                      fontFamily: 'mono' in f && f.mono ? 'var(--font-mono)' : undefined,
                      color: 'accent' in f && f.accent ? 'var(--accent-ink)' : undefined,
                      fontWeight: 500,
                    }}>{f.value}</div>
                  </div>
                )
              })}
            </div>
          </div>
          {funder.notes && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {funder.notes}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Commission rules <span className="badge" style={{ marginLeft: 4 }}>{rules.length}</span></h3>
              <div className="sub">{activeRules.length} active · {rules.length - activeRules.length} expired</div>
            </div>
            <Link href="/rules" className="btn sm ghost" style={{ fontSize: 11 }}>Manage <Icons.Chevron /></Link>
          </div>
          {rules.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 20px' }}>
              No rules defined for this funder. Go to the <Link href="/rules" style={{ color: 'var(--accent-ink)' }}>Rules page</Link> to add one.
            </div>
          ) : (
            <div className="card-body flush">
              {rules.map((r, i) => (
                <div key={r.id} style={{
                  padding: '14px 18px',
                  borderBottom: i < rules.length - 1 ? '1px solid var(--line)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: isActiveRule(r) ? 1 : 0.5,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Pill tone="info">{r.type === 'FIXED_PERCENT' ? 'Fixed' : 'Tiered'}</Pill>
                      {!isActiveRule(r) && <Pill tone="default">Inactive</Pill>}
                      {r.notes && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.notes}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      Valid {fmt.dateShort(r.valid_from)} → {r.valid_to ? fmt.dateShort(r.valid_to) : '∞'}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                    {r.type === 'FIXED_PERCENT'
                      ? (r.fixed_rate != null ? `${Number(r.fixed_rate)}%` : '—')
                      : `${(r.commission_tiers ?? []).length} tier${(r.commission_tiers ?? []).length !== 1 ? 's' : ''}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FunderEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} editing={funder} />
    </div>
  )
}
