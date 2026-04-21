'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { agents, commissions, deals } from '@/lib/data'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'

const tierOrder = { Partner: 0, Senior: 1, Mid: 2, Junior: 3 }

export default function AgentsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const tiers = Array.from(new Set(agents.map(a => a.tier))).sort((a, b) => (tierOrder as any)[a] - (tierOrder as any)[b])

  const agentStats = useMemo(() => agents.map(a => {
    const total = commissions.reduce((acc, c) => {
      const split = c.splits.find(s => s.agentId === a.id)
      return acc + (split ? c.value * (split.pct / 100) : 0)
    }, 0)
    const dealCount = deals.filter(d => d.agents.includes(a.id)).length
    return { ...a, total, dealCount }
  }).sort((a, b) => (tierOrder as any)[a.tier] - (tierOrder as any)[b.tier]), [])

  const filtered = useMemo(() => agentStats.filter(a => {
    if (tier && a.tier !== tier) return false
    const q = search.toLowerCase()
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
  }), [search, tier, agentStats])

  const tierTone = (t: string) => t === 'Partner' ? 'accent' : t === 'Senior' ? 'pos' : t === 'Mid' ? 'info' : 'default'

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Agents</h1>
          <p>{agents.filter(a => a.active).length} active · {agents.length} total</p>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Icons.Grid /></button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Icons.Table /></button>
          </div>
          <button className="btn primary"><Icons.Plus /> Add agent</button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search agents…"
        chips={[
          { label: 'Tier', value: tier, onClick: () => setTier(v => { const i = tiers.indexOf(v); return tiers[(i + 1) % (tiers.length + 1)] || '' }) },
        ]}
      />

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>
          {filtered.map(a => (
            <div key={a.id} className="card" style={{ padding: 20, cursor: 'pointer' }} onClick={() => router.push(`/agents/${a.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar name={a.name} hue={a.hue} size="lg" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.email}</div>
                </div>
                <Pill tone={tierTone(a.tier)}>{a.tier}</Pill>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'MTD earned', val: fmt.moneyK(a.mtd) },
                  { label: 'Total earned', val: fmt.moneyK(a.total) },
                  { label: 'Deals', val: String(a.dealCount) },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-sunk)', borderRadius: 6, padding: '8px 10px' }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {!a.active && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--neg)' }}>Inactive</div>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state">
                <div className="empty-state-icon"><Icons.Search /></div>
                <p className="empty-state-title">No results found</p>
                <p className="empty-state-sub">Try adjusting your search or filters</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th><th>Tier</th><th>Email</th>
                  <th className="num">MTD</th><th className="num">Total earned</th>
                  <th className="num">Deals</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => router.push(`/agents/${a.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={a.name} hue={a.hue} size="md" />
                        <span className="strong">{a.name}</span>
                      </div>
                    </td>
                    <td><Pill tone={tierTone(a.tier)}>{a.tier}</Pill></td>
                    <td className="muted" style={{ fontSize: 12 }}>{a.email}</td>
                    <td className="num">{fmt.moneyK(a.mtd)}</td>
                    <td className="num strong">{fmt.moneyK(a.total)}</td>
                    <td className="num">{a.dealCount}</td>
                    <td><Pill tone={a.active ? 'pos' : 'neg'}>{a.active ? 'Active' : 'Inactive'}</Pill></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7}>
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
        </div>
      )}
    </div>
  )
}
