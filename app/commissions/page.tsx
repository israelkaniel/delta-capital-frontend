'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { commissions, agentById, deals } from '@/lib/data'
import { StatusPill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { useShell } from '@/components/shell/shell-provider'

const TABS = ['All', 'Pending', 'Approved', 'Paid']

export default function CommissionsPage() {
  const router = useRouter()
  const { openCommission } = useShell()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All')
  const [agent, setAgent] = useState('')

  const allAgentNames = Array.from(new Set(commissions.flatMap(c => c.splits.map(s => agentById(s.agentId)?.name).filter(Boolean) as string[]))).sort()

  const filtered = useMemo(() => commissions.filter(c => {
    if (tab !== 'All' && c.status !== tab) return false
    if (agent) {
      const has = c.splits.some(s => agentById(s.agentId)?.name === agent)
      if (!has) return false
    }
    const q = search.toLowerCase()
    return !q || c.dealId.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  }), [search, tab, agent])

  const totalValue = filtered.reduce((a, c) => a + c.value, 0)

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Commissions</h1>
          <p>{commissions.length} records · {fmt.moneyK(commissions.reduce((a, c) => a + c.value, 0))} total value</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary"><Icons.Plus /> Add commission</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(s => (
          <button key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
            {s}
            <span className="badge">{s === 'All' ? commissions.length : commissions.filter(c => c.status === s).length}</span>
          </button>
        ))}
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search by deal ID or commission ID…"
        chips={[
          { label: 'Agent', value: agent, onClick: () => setAgent(a => { const i = allAgentNames.indexOf(a); return allAgentNames[(i + 1) % (allAgentNames.length + 1)] || '' }) },
        ]}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Comm ID</th><th>Deal</th><th>Client</th>
                <th className="num">Deal value</th><th className="num">Comm value</th><th className="num">Rate</th>
                <th>Splits</th><th>Period</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const deal = deals.find(d => d.id === c.dealId)
                return (
                  <tr key={c.id} onClick={() => router.push(`/commissions/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>{c.id}</span></td>
                    <td><span className="mono text-xs">{c.dealId}</span></td>
                    <td><span className="strong">{deal?.client ?? '—'}</span></td>
                    <td className="num">{deal ? fmt.money(deal.amount) : '—'}</td>
                    <td className="num strong">{fmt.money(c.value)}</td>
                    <td className="num muted">{c.pct}%</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.splits.map(s => {
                          const a = agentById(s.agentId)
                          return a ? (
                            <div key={s.agentId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <Avatar name={a.name} hue={a.hue} size="sm" />
                              <span>{a.name.split(' ')[0]}</span>
                              <span className="muted">{s.pct}%</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </td>
                    <td className="muted">{c.period}</td>
                    <td><StatusPill status={c.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      {c.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn sm" style={{ color: 'var(--pos)' }}>Approve</button>
                          <button className="btn sm ghost" style={{ color: 'var(--neg)' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icons.Search /></div>
                    <p className="empty-state-title">No results found</p>
                    <p className="empty-state-sub">Try adjusting your search or filters</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: 'var(--ink-3)' }}>
            <span>{filtered.length} records</span>
            <span>Total: <span className="num strong" style={{ color: 'var(--ink-1)' }}>{fmt.money(totalValue)}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}
