'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import {
  api, dealStatusLabel, commStatusLabel,
  type DbAgent, type DbAgentBalances, type DbDeal, type DbCommission,
} from '@/lib/api'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [agent, setAgent] = useState<DbAgent | null>(null)
  const [balances, setBalances] = useState<DbAgentBalances | null>(null)
  const [deals, setDeals] = useState<DbDeal[]>([])
  const [commissions, setCommissions] = useState<DbCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingActive, setSavingActive] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [a, l, d, c] = await Promise.all([
      api.agents.get(id),
      api.agents.ledger(id),
      api.deals.list(),
      api.commissions.list({ agent_id: id }),
    ])
    if (a.error) { setError(a.error.message); setLoading(false); return }
    setAgent(a.data)
    setBalances(l.data?.balances ?? null)
    setDeals((d.data ?? []).filter(deal => deal.deal_agents?.some(da => da.agent_id === id)))
    setCommissions(c.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const totalVolume = useMemo(
    () => deals.reduce((s, d) => s + Number(d.transferred_amount ?? 0), 0),
    [deals],
  )

  const toggleActive = async () => {
    if (!agent) return
    if (!confirm(`${agent.is_active ? 'Deactivate' : 'Activate'} this agent?`)) return
    setSavingActive(true)
    const res = await api.agents.update(agent.id, { is_active: !agent.is_active } as Partial<DbAgent>)
    setSavingActive(false)
    if (res.error) { alert(res.error.message); return }
    refresh()
  }

  if (loading) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>Loading agent…</div>
  )

  if (error || !agent) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Agent not found.'}</p>
      <Link href="/agents" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to agents</Link>
    </div>
  )

  const name = agent.profiles?.name ?? agent.code ?? 'Agent'
  const hue = agent.id.charCodeAt(0) * 37 % 360
  const earned = balances ? Number(balances.total_commissions) : 0
  const available = balances ? Number(balances.available_balance) : 0
  const reserved = balances ? Number(balances.reserved_amount) : 0
  const paid = balances ? Number(balances.paid_amount) : 0

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/agents" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Agents</Link>
        <span>/</span>
        <span className="mono" style={{ color: 'var(--ink-1)' }}>{agent.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <Avatar name={name} hue={hue} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{name}</h1>
              {!agent.is_active && <Pill tone="warn">Inactive</Pill>}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14 }}>
              {agent.code && <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{agent.code}</span>}
              {agent.profiles?.email && <a href={`mailto:${agent.profiles.email}`} style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>{agent.profiles.email}</a>}
            </div>
          </div>
        </div>
        <div className="actions">
          <Link href={`/ledger/${agent.id}`} className="btn sm">
            <Icons.Ledger /> Open ledger
          </Link>
          {agent.profiles?.email && <a href={`mailto:${agent.profiles.email}`} className="btn sm"><Icons.Mail /> Email</a>}
          <button className="btn sm" onClick={toggleActive} disabled={savingActive}>
            {agent.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Total earned</div>
          <div className="kpi-val">{fmt.moneyK(earned)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{commissions.length} commission{commissions.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Available</div>
          <div className="kpi-val" style={{ color: available > 0 ? 'var(--pos)' : 'var(--ink-2)' }}>{fmt.moneyK(available)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>ready for payout</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">In reserve</div>
          <div className="kpi-val" style={{ color: reserved > 0 ? 'var(--warn)' : 'var(--ink-2)' }}>{fmt.moneyK(reserved)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>held pending review</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Paid out</div>
          <div className="kpi-val">{fmt.moneyK(paid)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>across all payments</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>Deals <span className="badge" style={{ marginLeft: 4 }}>{deals.length}</span></h3>
            <div className="sub">{fmt.money(totalVolume)} total volume</div>
          </div>
          {deals.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '32px 20px' }}>No deals assigned.</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Client</th>
                    <th>Funder</th>
                    <th className="num">Amount</th>
                    <th className="num">Share</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => {
                    const myShare = d.deal_agents?.find(da => da.agent_id === id)?.share
                    return (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/deals/${d.id}`)}>
                        <td><span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600, fontSize: 12 }}>{d.id.slice(0, 8)}</span></td>
                        <td><span className="strong">{d.accounts?.name ?? '—'}</span></td>
                        <td className="muted" style={{ fontSize: 12 }}>{d.funders?.name ?? '—'}</td>
                        <td className="num">{d.transferred_amount ? fmt.money(Number(d.transferred_amount)) : '—'}</td>
                        <td className="num">{myShare != null ? `${myShare}%` : '—'}</td>
                        <td><StatusPill status={dealStatusLabel(d.status)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Profile</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
                {([
                  { label: 'Agent ID', value: agent.id.slice(0, 8), mono: true, accent: true },
                  { label: 'Code',     value: agent.code ?? '—',    mono: true },
                  { label: 'Email',    value: agent.profiles?.email ?? '—' },
                  { label: 'Status',   value: agent.is_active ? 'Active' : 'Inactive' },
                ] as const).map((f, i, arr) => (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '11px 0 11px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>{f.label}</div>
                    <div style={{
                      fontSize: 13, padding: '11px 18px 11px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      fontFamily: 'mono' in f && f.mono ? 'var(--font-mono)' : undefined,
                      color: 'accent' in f && f.accent ? 'var(--accent-ink)' : undefined,
                      fontWeight: 500,
                    }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Recent commissions</h3></div>
            <div className="card-body flush">
              {commissions.length === 0 ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No commissions yet.</div>
              ) : commissions.slice(0, 5).map((c, i) => (
                <Link
                  key={c.id}
                  href={`/commissions/${c.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 18px',
                    borderBottom: i < Math.min(commissions.length, 5) - 1 ? '1px solid var(--line)' : 'none',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{c.id.slice(0, 8)}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{fmt.dateShort(c.calculated_at)}</div>
                  </div>
                  <StatusPill status={commStatusLabel(c.status)} />
                  <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt.money(Number(c.total_amount))}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
