'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { agents, deals, commissions } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const agent = agents.find(a => a.id === id)

  if (!agent) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Agent not found.</p>
      <Link href="/agents" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>← Back to agents</Link>
    </div>
  )

  const agentDeals = deals.filter(d => d.agents.includes(agent.id))
  const agentCommissions = commissions.filter(c => c.splits.some(s => s.agentId === agent.id))
  const earned = agentCommissions.reduce((acc, c) => {
    const s = c.splits.find(ss => ss.agentId === agent.id)
    return acc + c.value * ((s?.pct ?? 0) / 100)
  }, 0)
  const volumeSourced = agentDeals.reduce((a, d) => a + d.amount, 0)

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/agents" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Agents</Link>
        <span>/</span>
        <span style={{ color: 'var(--ink-1)' }}>{agent.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <Avatar name={agent.name} hue={agent.hue} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{agent.name}</h1>
              <Pill tone={agent.tier === 'Partner' ? 'accent' : agent.tier === 'Senior' ? 'pos' : 'default'}>{agent.tier}</Pill>
              {!agent.active && <Pill tone="warn">Inactive</Pill>}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14 }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{agent.id}</span>
              <a href={`mailto:${agent.email}`} style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>{agent.email}</a>
            </div>
          </div>
        </div>
        <div className="actions">
          <a href={`mailto:${agent.email}`} className="btn sm"><Icons.Mail /> Email</a>
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Earned YTD',     val: fmt.moneyK(earned),       sub: `${agentCommissions.length} commissions` },
          { label: 'Deals YTD',      val: String(agent.deals),      sub: `${agentDeals.length} in this book` },
          { label: 'Volume sourced', val: fmt.moneyK(volumeSourced), sub: 'total funded' },
          { label: 'MTD earnings',   val: fmt.moneyK(agent.mtd),    sub: 'month to date' },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ cursor: 'default' }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Deals */}
        <div className="card">
          <div className="card-head">
            <h3>Deals <span className="badge" style={{ marginLeft: 4 }}>{agentDeals.length}</span></h3>
          </div>
          {agentDeals.length === 0
            ? <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '32px 20px' }}>No deals assigned.</div>
            : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Client</th>
                      <th className="num">Amount</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentDeals.map(d => (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/deals/${d.id}`)}>
                        <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{d.id}</span></td>
                        <td><span className="strong">{d.client}</span></td>
                        <td className="num">{fmt.money(d.amount)}</td>
                        <td><span className="chip">{d.productType}</span></td>
                        <td><StatusPill status={d.status} /></td>
                        <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Profile</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
                {[
                  { label: 'Agent ID', value: agent.id, mono: true, accent: true },
                  { label: 'Tier',     value: agent.tier },
                  { label: 'Email',    value: agent.email, mono: true },
                  { label: 'Status',   value: agent.active ? 'Active' : 'Inactive' },
                ].map((f, i, arr) => (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '11px 0 11px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>{f.label}</div>
                    <div style={{
                      fontSize: 13, padding: '11px 18px 11px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                      color: f.accent ? 'var(--accent-ink)' : undefined,
                      fontWeight: 500,
                    }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {agent.createdAt && (
              <div className="audit-foot">
                <div className="audit-col">
                  <span className="audit-lbl">Created</span>
                  <span className="audit-val">{fmt.dateTime(agent.createdAt)}</span>
                  {agent.createdBy && <span className="audit-by">by <strong>{agent.createdBy}</strong></span>}
                </div>
                <div className="audit-sep" />
                <div className="audit-col">
                  <span className="audit-lbl">Last modified</span>
                  <span className="audit-val">
                    {fmt.dateTime(agent.updatedAt ?? '')}
                    {agent.updatedAt && fmt.relTime(agent.updatedAt) && (
                      <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}> · {fmt.relTime(agent.updatedAt)}</span>
                    )}
                  </span>
                  {agent.updatedBy && <span className="audit-by">by <strong>{agent.updatedBy}</strong></span>}
                </div>
              </div>
            )}
          </div>

          {/* Commission summary */}
          <div className="card">
            <div className="card-head"><h3>Commissions</h3></div>
            <div className="card-body flush">
              {agentCommissions.slice(0, 5).map((c, i) => {
                const split = c.splits.find(s => s.agentId === agent.id)
                const myAmt = c.value * ((split?.pct ?? 0) / 100)
                return (
                  <div key={c.id} style={{ padding: '10px 18px', borderBottom: i < Math.min(agentCommissions.length, 5) - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{c.id}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{fmt.monthLabel(c.period)}</div>
                    </div>
                    <StatusPill status={c.status} />
                    <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt.money(myAmt)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
