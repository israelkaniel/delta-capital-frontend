'use client'
import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { Pill, StatusPill } from '@/components/ui/pill'
import { dealStatusLabel } from '@/lib/api'
import { useFunder, useDealsList, invalidate } from '@/lib/queries'
import { FunderEditor } from '@/components/funders/funder-editor'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function FunderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const funderQ = useFunder(id)
  const dealsQ  = useDealsList({ page_size: 500 })
  const funder  = funderQ.data ?? null
  const loading = funderQ.isLoading
  const error   = funderQ.error?.message ?? null
  const refresh = () => { invalidate.funders(qc) }
  const [editorOpen, setEditorOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'active' | 'closed'>('all')

  const funderDeals = useMemo(
    () => (dealsQ.data?.rows ?? []).filter(d => d.funder_id === id),
    [dealsQ.data, id],
  )

  const stats = useMemo(() => {
    const total = funderDeals.length
    const active = funderDeals.filter(d => d.status === 'FUNDS_TRANSFERRED').length
    const approved = funderDeals.filter(d => d.status === 'APPROVED').length
    const closed = funderDeals.filter(d => d.status === 'CANCELLED').length
    const activeLoanSum = funderDeals
      .filter(d => d.status === 'FUNDS_TRANSFERRED')
      .reduce((s, d) => s + Number(d.transferred_amount ?? 0), 0)
    const totalPayback = funderDeals
      .filter(d => d.status === 'FUNDS_TRANSFERRED')
      .reduce((s, d) => s + Number(d.payback_amount ?? 0), 0)
    return { total, active, approved, closed, activeLoanSum, totalPayback }
  }, [funderDeals])

  const visibleDeals = useMemo(() => {
    if (tab === 'active')  return funderDeals.filter(d => d.status === 'FUNDS_TRANSFERRED' || d.status === 'APPROVED')
    if (tab === 'closed')  return funderDeals.filter(d => d.status === 'CANCELLED')
    return funderDeals
  }, [funderDeals, tab])

  if (loading) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>Loading funder…</div>
  )

  if (error || !funder) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Funder not found.'}</p>
      <Link href="/funders" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to funders</Link>
    </div>
  )

  const hue = hueFromId(funder.id)

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
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
              <span style={{ marginLeft: 12 }}>{stats.total} deal{stats.total !== 1 ? 's' : ''} · {stats.active} active</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn sm" onClick={() => setEditorOpen(true)}><Icons.Edit /> Edit</button>
          <Link href="/rules" className="btn sm">Manage rules</Link>
          <button className="close-btn" onClick={() => router.back()}><Icons.X /> Close</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Total deals</div>
          <div className="kpi-val">{stats.total}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>all time</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Active loans</div>
          <div className="kpi-val">{stats.active}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>funds transferred</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Active loan sum</div>
          <div className="kpi-val">{fmt.money(stats.activeLoanSum)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>transferred · outstanding</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Total payback</div>
          <div className="kpi-val">{fmt.money(stats.totalPayback)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>expected on active</div>
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
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="tabs" role="tablist" style={{ borderBottom: 'none', margin: 0 }}>
              <button className={'tab' + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')}>
                All <span className="badge">{stats.total}</span>
              </button>
              <button className={'tab' + (tab === 'active' ? ' active' : '')} onClick={() => setTab('active')}>
                Active <span className="badge">{stats.active + stats.approved}</span>
              </button>
              <button className={'tab' + (tab === 'closed' ? ' active' : '')} onClick={() => setTab('closed')}>
                Closed <span className="badge">{stats.closed}</span>
              </button>
            </div>
            <Link href={`/deals?funder=${funder.id}`} className="btn sm ghost" style={{ fontSize: 11 }}>Open in deals <Icons.Chevron /></Link>
          </div>
          {dealsQ.isLoading ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 20px' }}>
              Loading deals…
            </div>
          ) : visibleDeals.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 20px' }}>
              No deals in this view.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Client</th>
                    <th className="num">Transferred</th>
                    <th className="num">Payback</th>
                    <th>Status</th>
                    <th>Funded</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDeals.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/deals/${d.id}`)}>
                      <td><span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600, fontSize: 12 }}>{d.id.slice(0, 8)}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{d.accounts?.name ?? '—'}</td>
                      <td className="num strong">{d.transferred_amount ? fmt.money(Number(d.transferred_amount)) : '—'}</td>
                      <td className="num">{d.payback_amount ? fmt.money(Number(d.payback_amount)) : '—'}</td>
                      <td><StatusPill status={dealStatusLabel(d.status)} /></td>
                      <td className="muted" style={{ fontSize: 12 }}>{d.funds_transferred_at ? fmt.dateShort(d.funds_transferred_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FunderEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} editing={funder} />
    </div>
  )
}
