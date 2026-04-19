'use client'
import { useState, useMemo } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { funders, deals } from '@/lib/data'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { useShell } from '@/components/shell/shell-provider'

export default function FundersPage() {
  const { openFunder } = useShell()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')

  const types = Array.from(new Set(funders.map(f => f.type))).sort()

  const funderStats = useMemo(() => funders.map(f => {
    const funderDeals = deals.filter(d => d.funderId === f.id)
    const deployed = funderDeals.reduce((a, d) => a + d.amount, 0)
    const dealCount = funderDeals.length
    return { ...f, deployed, dealCount }
  }), [])

  const filtered = useMemo(() => funderStats.filter(f => {
    if (type && f.type !== type) return false
    const q = search.toLowerCase()
    return !q || f.name.toLowerCase().includes(q)
  }), [search, type, funderStats])

  const typeColor = (t: string) => t === 'Institutional' ? 'var(--accent)' : t === 'Family Office' ? 'oklch(0.62 0.17 150)' : t === 'In-house' ? 'oklch(0.65 0.17 20)' : 'oklch(0.65 0.17 220)'

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Funders</h1>
          <p>{funders.length} funders · {fmt.moneyK(funders.reduce((a, f) => a + f.avail, 0))} available capacity</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary"><Icons.Plus /> Add funder</button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search funders…"
        chips={[
          { label: 'Type', value: type, onClick: () => setType(v => { const i = types.indexOf(v); return types[(i + 1) % (types.length + 1)] || '' }) },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 16, marginBottom: 20 }}>
        {filtered.map(f => (
          <div key={f.id} className="card" style={{ padding: 20, cursor: 'pointer' }} onClick={() => openFunder(f)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `oklch(0.65 0.18 ${f.hue})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                {f.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{f.ticket} · {f.type}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Deployed', val: fmt.moneyK(f.deployed) },
                { label: 'Available', val: fmt.moneyK(f.avail) },
                { label: 'Deals', val: String(f.dealCount) },
                { label: 'Ticket size', val: f.ticket },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-sunk)', borderRadius: 6, padding: '8px 10px' }}>
                  <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>All funders</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Funder</th><th>Type</th><th>Ticket range</th>
                <th className="num">Deployed</th><th className="num">Available</th><th className="num">Deals</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} onClick={() => openFunder(f)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: `oklch(0.65 0.18 ${f.hue})`, flexShrink: 0 }} />
                      <span className="strong">{f.name}</span>
                    </div>
                  </td>
                  <td><span className="chip">{f.type}</span></td>
                  <td className="muted">{f.ticket}</td>
                  <td className="num">{fmt.moneyK(f.deployed)}</td>
                  <td className="num strong">{fmt.moneyK(f.avail)}</td>
                  <td className="num">{f.dealCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
