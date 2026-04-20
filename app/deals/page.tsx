'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { deals, agentById } from '@/lib/data'
import { StatusPill } from '@/components/ui/pill'
import { AvatarStack } from '@/components/ui/avatar'
import { useShell } from '@/components/shell/shell-provider'
import type { Deal } from '@/lib/data'

const STATUSES = ['All', 'Active', 'Closing', 'Pending', 'Declined', 'Paid off']
const PRODUCTS = Array.from(new Set(deals.map(d => d.productType))).sort()
const FUNDERS  = Array.from(new Set(deals.map(d => d.funder))).sort()
const AGENTS   = Array.from(new Set(deals.flatMap(d => d.agents).map(id => agentById(id)?.name).filter(Boolean) as string[])).sort()

function exportCSV(rows: Deal[]) {
  const headers = ['Deal ID','Client','Industry','Product','Funder','Amount','Rate','Term','Stage','Status','Closed','Maturity']
  const lines = [
    headers.join(','),
    ...rows.map(d => [
      d.id,`"${d.client}"`,d.industry,d.productType,`"${d.funder}"`,
      d.amount,d.rate,d.term,d.stage,d.status,d.closed,d.maturity,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `deals-${new Date().toISOString().slice(0,10)}.csv` })
  a.click()
}

function RowMenu({ deal, onDelete, onDuplicate }: { deal: Deal; onDelete: () => void; onDuplicate: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        className="btn sm ghost"
        onClick={() => setOpen(v => !v)}
        style={{ padding: '4px 8px', opacity: 0.7 }}
      >
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
            { label: 'Edit', icon: Icons.Edit, action: () => { router.push(`/deals/${deal.id}`); setOpen(false) } },
            { label: 'Duplicate', icon: Icons.Copy, action: () => { onDuplicate(); setOpen(false) } },
            null,
            { label: 'Export CSV', icon: Icons.Download, action: () => { exportCSV([deal]); setOpen(false) } },
            { label: 'Export PDF', icon: Icons.FileText, action: () => { alert('PDF export coming soon'); setOpen(false) } },
            null,
            { label: 'Delete', icon: Icons.Trash, action: () => { onDelete(); setOpen(false) }, danger: true },
          ].map((item, i) =>
            item === null
              ? <div key={i} style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
              : (
                <button key={item.label} onClick={item.action} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, textAlign: 'left',
                  color: item.danger ? 'var(--neg)' : 'var(--ink-1)',
                  fontFamily: 'var(--font-sans)',
                }}>
                  <item.icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                  {item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const { setNewDealOpen } = useShell()
  const [localDeals, setLocalDeals] = useState(deals)

  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState('All')
  const [product, setProduct]       = useState('')
  const [funder, setFunder]         = useState('')
  const [agent, setAgent]           = useState('')
  const [amountMin, setAmountMin]   = useState('')
  const [amountMax, setAmountMax]   = useState('')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = useMemo(() => localDeals.filter(d => {
    if (tab !== 'All' && d.status !== tab) return false
    if (product && d.productType !== product) return false
    if (funder && d.funder !== funder) return false
    if (agent && !d.agents.some(id => agentById(id)?.name === agent)) return false
    if (amountMin && d.amount < Number(amountMin)) return false
    if (amountMax && d.amount > Number(amountMax)) return false
    if (search) {
      const q = search.toLowerCase()
      return d.id.toLowerCase().includes(q) || d.client.toLowerCase().includes(q) ||
        d.funder.toLowerCase().includes(q) || d.productType.toLowerCase().includes(q) ||
        d.industry.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) ||
        d.stage.toLowerCase().includes(q) ||
        d.agents.some(id => agentById(id)?.name.toLowerCase().includes(q))
    }
    return true
  }), [search, tab, product, funder, agent, amountMin, amountMax, localDeals])

  const activeFilters = [product, funder, agent, amountMin, amountMax].filter(Boolean).length
  const clearFilters = () => { setProduct(''); setFunder(''); setAgent(''); setAmountMin(''); setAmountMax('') }
  const toggleAll = () => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(d => d.id)))
  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s) }

  const deleteDeal = (id: string) => { setLocalDeals(d => d.filter(x => x.id !== id)); setSelected(s => { const n = new Set(s); n.delete(id); return n }) }
  const duplicateDeal = (deal: Deal) => {
    const copy: Deal = { ...deal, id: `${deal.id}-copy` }
    setLocalDeals(d => [copy, ...d])
  }

  const stats = {
    active:  localDeals.filter(d => d.status === 'Active').length,
    closing: localDeals.filter(d => d.status === 'Closing').length,
    pending: localDeals.filter(d => d.status === 'Pending').length,
    volume:  localDeals.filter(d => d.status === 'Active').reduce((a, d) => a + d.amount, 0),
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>

      <div className="page-head">
        <div>
          <h1>Deals</h1>
          <p>{stats.active} active · {stats.closing} closing · {stats.pending} pending · {fmt.moneyK(stats.volume)} active volume</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => exportCSV(filtered)}>
            <Icons.Download /> Export {filtered.length < localDeals.length ? `(${filtered.length})` : ''}
          </button>
          <button className="btn primary" onClick={() => setNewDealOpen(true)}>
            <Icons.Plus /> New deal
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {STATUSES.map(s => {
          const count = s === 'All' ? localDeals.length : localDeals.filter(d => d.status === s).length
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals, clients, funders, agents, product type…" />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0, display: 'flex' }}><Icons.X style={{ width: 13, height: 13 }} /></button>}
        </div>
        <div className="grow" />
        <button className={`btn sm ${filtersOpen || activeFilters > 0 ? 'primary' : ''}`} onClick={() => setFiltersOpen(v => !v)}>
          <Icons.Filter /> Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px 20px', marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'Product type', value: product, onChange: setProduct, options: PRODUCTS },
            { label: 'Funder', value: funder, onChange: setFunder, options: FUNDERS },
            { label: 'Agent', value: agent, onChange: setAgent, options: AGENTS },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 5 }}>{f.label}</div>
              <select value={f.value} onChange={e => f.onChange(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none' }}>
                <option value="">All</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 5 }}>Min amount</div>
            <input type="number" placeholder="e.g. 500000" value={amountMin} onChange={e => setAmountMin(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 5 }}>Max amount</div>
            <input type="number" placeholder="e.g. 5000000" value={amountMax} onChange={e => setAmountMax(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {activeFilters > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn sm ghost" onClick={clearFilters} style={{ color: 'var(--neg)' }}>Clear all</button>
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ margin: '8px 0', padding: '10px 16px', background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{selected.size} selected</span>
          <button className="btn sm" onClick={() => exportCSV(localDeals.filter(d => selected.has(d.id)))}><Icons.Download /> Export CSV</button>
          <button className="btn sm ghost" onClick={() => { if (confirm(`Delete ${selected.size} deal(s)?`)) { selected.forEach(id => deleteDeal(id)); setSelected(new Set()) } }} style={{ color: 'var(--neg)' }}><Icons.Trash /> Delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost" onClick={() => setSelected(new Set())} style={{ color: 'var(--ink-4)' }}><Icons.X /> Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ marginTop: 8 }}>
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
                <th>Deal ID</th><th>Client</th><th>Product</th><th>Funder</th>
                <th className="num">Amount</th><th className="num">Rate</th><th className="num">Term</th>
                <th>Stage</th><th>Agents</th><th>Status</th><th>Closed</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className={selected.has(d.id) ? 'selected' : ''} onClick={() => router.push(`/deals/${d.id}`)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => { e.stopPropagation(); toggle(d.id) }}>
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  </td>
                  <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{d.id}</span></td>
                  <td><span className="strong">{d.client}</span></td>
                  <td><span className="chip">{d.productType}</span></td>
                  <td className="muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.funder}</td>
                  <td className="num">{fmt.money(d.amount)}</td>
                  <td className="num">{fmt.pct(d.rate)}</td>
                  <td className="num muted">{d.term}mo</td>
                  <td><span className="chip">{d.stage}</span></td>
                  <td><AvatarStack items={d.agents.map(id => agentById(id)).filter(Boolean) as any[]} /></td>
                  <td><StatusPill status={d.status} /></td>
                  <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu deal={d} onDelete={() => deleteDeal(d.id)} onDuplicate={() => duplicateDeal(d)} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>No deals match your filters</div>
                  {(search || activeFilters > 0) && <button className="btn sm" style={{ marginTop: 12 }} onClick={() => { setSearch(''); clearFilters() }}>Clear all</button>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-4)' }}>
          <span>{filtered.length < localDeals.length ? `${filtered.length} of ${localDeals.length} deals` : `${localDeals.length} deals`}</span>
          <span>Volume: <span className="num" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmt.money(filtered.reduce((a, d) => a + d.amount, 0))}</span></span>
        </div>
      </div>
    </div>
  )
}
