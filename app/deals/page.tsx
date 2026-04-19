'use client'
import { useState, useMemo } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { deals, agents, agentById } from '@/lib/data'
import { StatusPill } from '@/components/ui/pill'
import { AvatarStack } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { useShell } from '@/components/shell/shell-provider'

const STATUSES = ['All', 'Active', 'Closing', 'Pending', 'Declined', 'Paid off']

export default function DealsPage() {
  const { openDeal, setNewDealOpen } = useShell()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All')
  const [product, setProduct] = useState('')
  const [funder, setFunder] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const products = Array.from(new Set(deals.map(d => d.productType))).sort()
  const funders = Array.from(new Set(deals.map(d => d.funder))).sort()

  const filtered = useMemo(() => deals.filter(d => {
    if (tab !== 'All' && d.status !== tab) return false
    if (product && d.productType !== product) return false
    if (funder && d.funder !== funder) return false
    const q = search.toLowerCase()
    return !q || d.client.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.funder.toLowerCase().includes(q)
  }), [search, tab, product, funder])

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(d => d.id)))
  }
  const toggle = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Deals</h1>
          <p>{deals.length} total deals · {deals.filter(d => d.status === 'Active').length} active</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary" onClick={() => setNewDealOpen(true)}><Icons.Plus /> New deal</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
            {s}
            <span className="badge">{s === 'All' ? deals.length : deals.filter(d => d.status === s).length}</span>
          </button>
        ))}
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search deals, clients, funders…"
        chips={[
          { label: 'Product', value: product, onClick: () => setProduct(p => { const i = products.indexOf(p); return products[(i + 1) % (products.length + 1)] || '' }) },
          { label: 'Funder', value: funder, onClick: () => setFunder(f => { const i = funders.indexOf(f); return funders[(i + 1) % (funders.length + 1)] || '' }) },
        ]}
      />

      <div className="card" style={{ marginTop: 16 }}>
        {selected.size > 0 && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-sunk)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{selected.size} selected</span>
            <button className="btn sm"><Icons.Download /> Export</button>
            <button className="btn sm ghost" style={{ color: 'var(--neg)' }}>Delete</button>
          </div>
        )}
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th>Deal ID</th><th>Client</th><th>Product</th><th>Funder</th>
                <th className="num">Amount</th><th className="num">Rate</th><th className="num">Term</th>
                <th>Agents</th><th>Status</th><th>Closed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className={selected.has(d.id) ? 'selected' : ''} onClick={() => openDeal(d)}>
                  <td onClick={e => { e.stopPropagation(); toggle(d.id) }}>
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  </td>
                  <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>{d.id}</span></td>
                  <td><span className="strong">{d.client}</span></td>
                  <td><span className="chip">{d.productType}</span></td>
                  <td className="muted">{d.funder}</td>
                  <td className="num">{fmt.money(d.amount)}</td>
                  <td className="num">{fmt.pct(d.rate)}</td>
                  <td className="num muted">{d.term}mo</td>
                  <td><AvatarStack items={d.agents.map(id => agentById(id)).filter(Boolean) as any[]} /></td>
                  <td><StatusPill status={d.status} /></td>
                  <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-4)' }}>No deals match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
