'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbAgent, type DbAgentPerformance } from '@/lib/api'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { AgentEditor } from '@/components/agents/agent-editor'

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<DbAgent[]>([])
  const [perf, setPerf]     = useState<DbAgentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView]     = useState<'grid' | 'table'>('grid')
  const [editorOpen, setEditorOpen] = useState(false)

  const refresh = () => {
    setLoading(true)
    Promise.all([api.agents.list(), api.reports.agents()]).then(([agentsRes, perfRes]) => {
      setAgents(agentsRes.data ?? [])
      setPerf(perfRes.data?.agents ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { refresh() }, [])

  const agentStats = useMemo(() =>
    agents.map(a => {
      const p = perf.find(x => x.agent_id === a.id)
      return {
        ...a,
        name:         a.profiles?.name ?? a.code ?? '—',
        email:        a.profiles?.email ?? '—',
        total:        p?.total_commissions ?? 0,
        dealCount:    p?.total_deals ?? 0,
        activeDeals:  p?.active_deals ?? 0,
        totalVolume:  p?.total_volume ?? 0,
      }
    }),
    [agents, perf],
  )

  const filtered = useMemo(() =>
    agentStats.filter(a => {
      const q = search.toLowerCase()
      return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.code ?? '').toLowerCase().includes(q)
    }),
    [search, agentStats],
  )

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Agents</h1>
          <p>{loading ? 'Loading…' : `${agents.filter(a => a.is_active).length} active · ${agents.length} total`}</p>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Icons.Grid /></button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Icons.Table /></button>
          </div>
          <button className="btn primary" onClick={() => setEditorOpen(true)}><Icons.Plus /> Add agent</button>
        </div>
      </div>

      <FilterBar search={search} setSearch={setSearch} placeholder="Search agents…" chips={[]} />

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading agents…</div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>
          {filtered.map(a => (
            <div key={a.id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => router.push(`/agents/${a.id}`)}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Avatar name={a.name} size="lg" hue={180} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{a.email}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <Pill tone={a.is_active ? 'pos' : 'neg'}>{a.is_active ? 'Active' : 'Inactive'}</Pill>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Commissions', val: fmt.moneyK(a.total) },
                  { label: 'Deals', val: String(a.dealCount) },
                  { label: 'Active Deals', val: String(a.activeDeals) },
                  { label: 'Volume', val: fmt.moneyK(a.totalVolume) },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-sunk)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {a.code && <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ink-4)' }}>Code: <span className="mono">{a.code}</span></div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th><th>Email</th><th>Code</th>
                  <th className="num">Commissions</th><th className="num">Deals</th>
                  <th className="num">Volume</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => router.push(`/agents/${a.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={a.name} size="sm" hue={180} />
                        <span className="strong">{a.name}</span>
                      </div>
                    </td>
                    <td className="muted">{a.email}</td>
                    <td><span className="mono text-xs">{a.code ?? '—'}</span></td>
                    <td className="num">{fmt.moneyK(a.total)}</td>
                    <td className="num">{a.dealCount}</td>
                    <td className="num">{fmt.moneyK(a.totalVolume)}</td>
                    <td><Pill tone={a.is_active ? 'pos' : 'neg'}>{a.is_active ? 'Active' : 'Inactive'}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AgentEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} />
    </div>
  )
}
