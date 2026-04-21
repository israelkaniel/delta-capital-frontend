'use client'
import { useMemo } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { agents, commissions, agentById } from '@/lib/data'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill } from '@/components/ui/pill'

// ─── Per-agent payout computation ──────────────────────────────────────────

type AgentPayout = {
  agentId: string
  name: string
  hue: number
  tier: string
  earned: number
  paid: number
  pending: number
  reserve: number
  net: number
  /** Matches keys in StatusPill's statusMap: Paid | Pending | Approved */
  status: 'Paid' | 'Pending' | 'Approved'
}

function computePayouts(): AgentPayout[] {
  return agents.map(agent => {
    let earned  = 0
    let paid    = 0
    let pending = 0

    for (const c of commissions) {
      const split = c.splits.find(s => s.agentId === agent.id)
      if (!split) continue

      const share = c.value * split.pct / 100

      earned += share

      if (c.status === 'Paid') {
        paid += share
      } else if (c.status === 'Pending' || c.status === 'Approved') {
        pending += share
      }
    }

    // Reserve = 10% of earned withheld (simplified model for display)
    const reserve = Math.round(earned * 0.1)
    const net     = Math.round(earned - reserve)

    // 'Approved' = partially paid / in-progress; maps to accent pill
    let status: AgentPayout['status'] = 'Pending'
    if (paid >= Math.round(earned - reserve) && earned > 0) status = 'Paid'
    else if (paid > 0) status = 'Approved'

    return {
      agentId: agent.id,
      name:    agent.name,
      hue:     agent.hue,
      tier:    agent.tier,
      earned:  Math.round(earned),
      paid:    Math.round(paid),
      pending: Math.round(pending),
      reserve,
      net,
      status,
    }
  }).filter(p => p.earned > 0)
}

// ─── KPI strip ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'pos' | 'warn' | 'info'
}) {
  const accentColor =
    accent === 'pos'  ? 'var(--pos)'  :
    accent === 'warn' ? 'var(--warn)' :
    accent === 'info' ? 'var(--info)' :
    'var(--ink)'

  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-val" style={{ fontSize: 22, color: accentColor }}>
        {value}
      </span>
      {sub && <span className="kpi-delta">{sub}</span>}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

const PERIOD = 'March 2026'

export default function PayoutPage() {
  const rows = useMemo(computePayouts, [])

  const totalEarned  = rows.reduce((s, r) => s + r.earned,  0)
  const totalPaid    = rows.reduce((s, r) => s + r.paid,    0)
  const totalPending = rows.reduce((s, r) => s + r.pending, 0)
  const totalReserve = rows.reduce((s, r) => s + r.reserve, 0)

  const agentCount = rows.length

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>

      {/* ─── Page header ───────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <h1>Payout</h1>
          <p>
            {PERIOD}
            <span className="sep-dot" />
            {agentCount} agents
          </p>
        </div>
        <div className="actions">
          <button className="btn">
            <Icons.Download />
            Export CSV
          </button>
          <button className="btn primary">
            <Icons.FileText />
            Generate payout file
          </button>
        </div>
      </div>

      {/* ─── KPI strip ─────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard
          label="Total payout"
          value={fmt.moneyK(totalEarned)}
          sub={`${agentCount} agents · all commissions`}
        />
        <KpiCard
          label="Paid"
          value={fmt.moneyK(totalPaid)}
          accent="pos"
          sub={`${rows.filter(r => r.status === 'Paid').length} agents fully paid`}
        />
        <KpiCard
          label="Pending"
          value={fmt.moneyK(totalPending)}
          accent="warn"
          sub={`${rows.filter(r => r.status !== 'Paid').length} agents awaiting payout`}
        />
        <KpiCard
          label="In reserve"
          value={fmt.moneyK(totalReserve)}
          accent="info"
          sub="10% withheld per payout policy"
        />
      </div>

      {/* ─── Payout table ──────────────────────────────────────────── */}
      <div className="card">
        <div className="card-head">
          <h3>Agent payouts</h3>
          <span className="sub">{PERIOD} · approved commissions only</span>
          <div className="actions" style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <span className="chip">
              <Icons.Agent width={12} height={12} style={{ color: 'var(--ink-3)' }} />
              {agentCount} agents
            </span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Tier</th>
                <th className="num">Earned total</th>
                <th className="num">Paid</th>
                <th className="num">Reserve</th>
                <th className="num">Net payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.agentId} style={{ cursor: 'default' }}>

                  {/* Agent */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={row.name} hue={row.hue} size="md" />
                      <div>
                        <div className="strong" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                          {row.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
                          {agentById(row.agentId)?.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '1px 7px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      background: 'var(--bg-sunk)',
                      color: 'var(--ink-3)',
                      border: '1px solid var(--line)',
                    }}>
                      {row.tier}
                    </span>
                  </td>

                  {/* Earned */}
                  <td className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {fmt.money(row.earned)}
                  </td>

                  {/* Paid */}
                  <td className="num" style={{ color: row.paid > 0 ? 'var(--pos)' : 'var(--ink-4)' }}>
                    {row.paid > 0 ? fmt.money(row.paid) : '—'}
                  </td>

                  {/* Reserve */}
                  <td className="num muted-num">
                    {fmt.money(row.reserve)}
                  </td>

                  {/* Net payout */}
                  <td className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {fmt.money(row.net)}
                  </td>

                  {/* Status */}
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer — totals */}
        <div style={{
          padding: '11px 18px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-sunk)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Payout generated based on approved commissions only.
          </span>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--ink-3)' }}>
              Total earned{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {fmt.money(totalEarned)}
              </strong>
            </span>
            <span style={{ color: 'var(--ink-3)' }}>
              Net payout{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {fmt.money(rows.reduce((s, r) => s + r.net, 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Empty state (never reached with current data, defensive) */}
      {rows.length === 0 && (
        <div className="empty">
          No agent payouts found for this period.
        </div>
      )}
    </div>
  )
}
