'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, dealStatusLabel, dealStatusTone, type DbDeal } from '@/lib/api'
import { StatusPill } from '@/components/ui/pill'
import { AvatarStack } from '@/components/ui/avatar'
import { useShell } from '@/components/shell/shell-provider'

// Map DB deal status to UI tab label
const dbStatusToTab: Record<string, string> = {
  FUNDS_TRANSFERRED: 'Active',
  APPROVED:          'Approved',
  PENDING:           'Pending',
  CANCELLED:         'Declined',
}

const TABS = ['All', 'Active', 'Approved', 'Pending', 'Declined']

function dealTab(d: DbDeal) { return dbStatusToTab[d.status] ?? 'Pending' }
function dealAmount(d: DbDeal) { return Number(d.transferred_amount ?? d.payback_amount ?? 0) }
function dealClient(d: DbDeal) { return d.accounts?.name ?? '—' }
function dealFunder(d: DbDeal) { return d.funders?.name ?? '—' }
function dealAgentNames(d: DbDeal) {
  return (d.deal_agents ?? []).map(da => da.agents?.profiles?.name ?? da.agents?.code ?? '—')
}

function exportCSV(rows: DbDeal[]) {
  const headers = ['Deal ID', 'Client', 'Funder', 'Amount', 'Status', 'Funded Date', 'Created']
  const lines = [
    headers.join(','),
    ...rows.map(d => [
      d.id, `"${dealClient(d)}"`, `"${dealFunder(d)}"`,
      dealAmount(d), dealStatusLabel(d.status),
      d.funds_transferred_at?.split('T')[0] ?? '',
      d.created_at?.split('T')[0] ?? '',
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `deals-${new Date().toISOString().slice(0, 10)}.csv`,
  })
  a.click()
}

function RowMenu({ deal }: { deal: DbDeal }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button className="btn sm ghost" onClick={() => setOpen(v => !v)} style={{ padding: '4px 8px', opacity: 0.7 }}>
        <Icons.MoreHorizontal style={{ width: 14, height: 14 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 100, marginTop: 4,
          background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 160, overflow: 'hidden',
        }}>
          {[
            { label: 'Open', icon: Icons.Chevron, action: () => { router.push(`/deals/${deal.id}`); setOpen(false) } },
            { label: 'Export CSV', icon: Icons.Download, action: () => { exportCSV([deal]); setOpen(false) } },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, textAlign: 'left',
              color: 'var(--ink-1)', fontFamily: 'var(--font-sans)',
            }}>
              <item.icon style={{ width: 13, height: 13, flexShrink: 0 }} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const { setNewDealOpen } = useShell()

  const [deals, setDeals] = useState<DbDeal[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState('All')
  const [funder, setFunder]   = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.deals.list().then(res => {
      setDeals(res.data ?? [])
      setLoading(false)
    })
  }, [])

  const funders = useMemo(() => Array.from(new Set(deals.map(d => dealFunder(d)))).sort(), [deals])

  const filtered = useMemo(() => deals.filter(d => {
    if (tab !== 'All' && dealTab(d) !== tab) return false
    if (funder && dealFunder(d) !== funder) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.id.toLowerCase().includes(q) ||
        dealClient(d).toLowerCase().includes(q) ||
        dealFunder(d).toLowerCase().includes(q) ||
        dealStatusLabel(d.status).toLowerCase().includes(q) ||
        dealAgentNames(d).some(n => n.toLowerCase().includes(q))
      )
    }
    return true
  }), [search, tab, funder, deals])

  const toggle = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }
  const toggleAll = () =>
    selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(d => d.id)))

  const stats = {
    active:  deals.filter(d => d.status === 'FUNDS_TRANSFERRED').length,
    pending: deals.filter(d => d.status === 'PENDING').length,
    volume:  deals.filter(d => d.status === 'FUNDS_TRANSFERRED').reduce((a, d) => a + dealAmount(d), 0),
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Deals</h1>
          <p>{loading ? 'Loading…' : `${stats.active} active · ${stats.pending} pending · ${fmt.moneyK(stats.volume)} active volume`}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => exportCSV(filtered)}>
            <Icons.Download /> Export {filtered.length < deals.length ? `(${filtered.length})` : ''}
          </button>
          <button className="btn primary" onClick={() => setNewDealOpen(true)}>
            <Icons.Plus /> New deal
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(s => {
          const count = s === 'All' ? deals.length : deals.filter(d => dealTab(d) === s).length
          return (
            <button key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
              {s}{count > 0 && <span className="badge">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Search + filter bar */}
      <div className="filter-bar">
        <div className="srch">
          <Icons.Search style={{ color: 'var(--ink-4)', flexShrink: 0, width: 13, height: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals, clients, funders, agents…" />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0, display: 'flex' }}><Icons.X style={{ width: 13, height: 13 }} /></button>}
        </div>
        <select value={funder} onChange={e => setFunder(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none' }}>
          <option value="">All funders</option>
          {funders.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {funder && <button className="btn sm ghost" onClick={() => setFunder('')}>Clear</button>}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ margin: '8px 0', padding: '10px 16px', background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{selected.size} selected</span>
          <button className="btn sm" onClick={() => exportCSV(deals.filter(d => selected.has(d.id)))}><Icons.Download /> Export CSV</button>
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost" onClick={() => setSelected(new Set())} style={{ color: 'var(--ink-4)' }}><Icons.X /> Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ marginTop: 8 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading deals…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Deal ID</th><th>Client</th><th>Funder</th>
                  <th className="num">Amount</th><th>Agents</th><th>Status</th>
                  <th>Funded</th><th>Created</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className={selected.has(d.id) ? 'selected' : ''} onClick={() => router.push(`/deals/${d.id}`)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => { e.stopPropagation(); toggle(d.id) }}>
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                    </td>
                    <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{d.id.slice(0, 8)}</span></td>
                    <td><span className="strong">{dealClient(d)}</span></td>
                    <td className="muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dealFunder(d)}</td>
                    <td className="num">{fmt.money(dealAmount(d))}</td>
                    <td>
                      <AvatarStack items={(d.deal_agents ?? []).map(da => ({ name: da.agents?.profiles?.name ?? da.agents?.code ?? '?', hue: 180 }))} />
                    </td>
                    <td><StatusPill status={dealStatusLabel(d.status)} /></td>
                    <td className="muted-num">{d.funds_transferred_at ? fmt.dateShort(d.funds_transferred_at) : '—'}</td>
                    <td className="muted-num">{fmt.dateShort(d.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}><RowMenu deal={d} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icons.Search /></div>
                      <p className="empty-state-title">No deals found</p>
                      <p className="empty-state-sub">Try adjusting your search or filters</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-4)' }}>
          <span>{filtered.length < deals.length ? `${filtered.length} of ${deals.length} deals` : `${deals.length} deals`}</span>
          <span>Volume: <span className="num" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmt.money(filtered.reduce((a, d) => a + dealAmount(d), 0))}</span></span>
        </div>
      </div>
    </div>
  )
}
