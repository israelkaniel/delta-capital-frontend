'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { dealStatusLabel } from '@/lib/api'
import {
  useDealsList, useCommissionsList, useAgentsList,
  useReportsAgents, useReportsMonthlyBatch, prefetch,
} from '@/lib/queries'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill } from '@/components/ui/pill'
import { AreaChart, Donut, Sparkline } from '@/components/ui/charts'
import { AvatarStack } from '@/components/ui/avatar'
import { useShell } from '@/components/shell/shell-provider'

const now = new Date()
const monthsAsc = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
  return {
    key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
  }
})
const monthKeys = monthsAsc.map(m => m.key)

export default function DashboardPage() {
  const [period, setPeriod] = useState('6M')
  const [kpiIdx, setKpiIdx] = useState(0)
  const qc = useQueryClient()
  const { setNewDealOpen } = useShell()

  const dealsQ    = useDealsList()
  const commsQ    = useCommissionsList()
  const agentsQ   = useAgentsList()
  const perfQ     = useReportsAgents()
  const monthlyQ  = useReportsMonthlyBatch(monthKeys)

  const deals       = dealsQ.data   ?? []
  const commissions = commsQ.data   ?? []
  const agentPerf   = perfQ.data?.agents ?? []

  const agentNameMap = useMemo(
    () => new Map((agentsQ.data ?? []).map(a => [a.id, a.profiles?.name ?? a.code ?? '—'])),
    [agentsQ.data],
  )

  const monthlyData = useMemo(() => {
    const batch = (monthlyQ.data ?? {}) as Record<string, { summaries?: { total_earned: number }[] }>
    return monthsAsc.map(m => ({
      x:      m.label,
      y:      batch[m.key]?.summaries?.reduce((a, s) => a + Number(s.total_earned), 0) ?? 0,
      volume: deals
        .filter(d => d.funds_transferred_at?.startsWith(m.key))
        .reduce((a, d) => a + Number(d.transferred_amount ?? 0), 0),
    }))
  }, [monthlyQ.data, deals])

  const loading = dealsQ.isLoading || commsQ.isLoading || perfQ.isLoading || monthlyQ.isLoading

  const fundedDeals  = deals.filter(d => d.status === 'FUNDS_TRANSFERRED')
  const ytdComm      = commissions.reduce((a, c) => a + Number(c.total_amount), 0)
  const ytdVolume    = fundedDeals.reduce((a, d) => a + Number(d.transferred_amount ?? 0), 0)
  const openComm     = commissions.filter(c => c.status !== 'PAID').reduce((a, c) => a + Number(c.total_amount), 0)
  const pendingCount = commissions.filter(c => c.status === 'RESERVED').length

  const kpis = [
    { label: 'Total commissions YTD',  val: fmt.moneyK(ytdComm),           delta: `${commissions.length} records`, pos: true,  spark: monthlyData.map(m => m.y) },
    { label: 'Funded volume YTD',      val: fmt.moneyK(ytdVolume),          delta: `${fundedDeals.length} deals`,   pos: true,  spark: monthlyData.map(m => m.volume) },
    { label: 'Open commissions',        val: fmt.moneyK(openComm),           delta: `${pendingCount} reserved`,      pos: false, spark: [] },
    { label: 'Avg deal size',           val: fmt.moneyK(fundedDeals.length ? ytdVolume / fundedDeals.length : 0), delta: `${fundedDeals.length} deals`, pos: true, spark: [] },
  ]

  // By funder (from funded deals)
  const funderMap: Record<string, { name: string; value: number }> = {}
  fundedDeals.forEach(d => {
    const name = d.funders?.name ?? 'Unknown'
    if (!funderMap[name]) funderMap[name] = { name, value: 0 }
    funderMap[name].value += Number(d.transferred_amount ?? 0)
  })
  const byFunder = Object.values(funderMap)
    .sort((a, b) => b.value - a.value)
    .map((f, i) => ({
      label: f.name, value: f.value,
      color: [`var(--accent)`, 'oklch(0.62 0.17 150)', 'oklch(0.65 0.17 20)', 'oklch(0.6 0.17 220)', 'oklch(0.7 0.15 60)'][i % 5],
    }))

  const topAgents = agentPerf.slice().sort((a, b) => b.total_commissions - a.total_commissions).slice(0, 5)
  const recentDeals = deals.slice(0, 8)

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>{loading ? 'Loading…' : `${fundedDeals.length} funded deals · ${fmt.moneyK(ytdComm)} in commissions`}</p>
        </div>
        <div className="actions">
          <div className="seg">
            {['1M','3M','6M','YTD','1Y'].map(p => (
              <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary" onClick={() => setNewDealOpen(true)}><Icons.Plus /> New deal</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi ${kpiIdx === i ? 'active' : ''}`} onClick={() => setKpiIdx(i)}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{loading ? '—' : k.val}</div>
            <div className="kpi-delta">
              <span className={`chg ${k.pos ? 'pos' : 'neg'}`}>
                {k.pos ? <Icons.ArrowUp /> : <Icons.ArrowDown />}{k.delta}
              </span>
            </div>
            {k.spark.length > 0 && (
              <div className="kpi-spark">
                <Sparkline data={k.spark} color={kpiIdx === i ? 'var(--accent)' : 'var(--ink-4)'} width={60} height={24} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main chart + donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div><h3>Commission earnings</h3><div className="sub">Monthly — last 6 months</div></div>
          </div>
          <div className="card-body">
            <AreaChart
              data={monthlyData.map(m => ({ x: m.x, y: kpiIdx === 1 ? m.volume : m.y }))}
              height={260}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>By funder</h3>
            <div className="actions"><Link href="/funders" className="btn sm ghost">View all <Icons.Chevron /></Link></div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {byFunder.length > 0 ? (
              <>
                <Donut segments={byFunder} size={160} center={
                  <div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.03em' }}>{fmt.moneyK(byFunder.reduce((a, s) => a + s.value, 0))}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>funded volume</div>
                  </div>
                } />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  {byFunder.slice(0, 5).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
                      <span className="num muted">{fmt.moneyK(f.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, padding: 32 }}>
                {loading ? 'Loading…' : 'No funded deals yet'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <h3>Top agents</h3>
            <div className="actions"><Link href="/agents" className="btn sm ghost">All agents <Icons.Chevron /></Link></div>
          </div>
          <div className="card-body flush">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : topAgents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>No agent data yet</div>
            ) : topAgents.map((a, i) => (
              <div key={a.agent_id} style={{ padding: '12px 18px', borderBottom: i < topAgents.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 16 }}>{i + 1}</div>
                <Avatar name={a.agent_name ?? '?'} hue={180} size="md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.agent_name ?? a.agent_code ?? '—'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.total_deals} deals</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 13, fontWeight: 500 }}>{fmt.moneyK(a.total_commissions)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>earned</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-head">
            <div><h3>Recent deals</h3><div className="sub">Latest activity</div></div>
            <div className="actions"><Link href="/deals" className="btn sm">View all <Icons.Chevron /></Link></div>
          </div>
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Deal ID</th><th>Client</th><th>Funder</th>
                    <th className="num">Amount</th><th>Agents</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-4)', fontSize: 12 }}>Loading…</td></tr>
                  ) : recentDeals.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-4)', fontSize: 12 }}>No deals yet</td></tr>
                  ) : recentDeals.map(d => (
                    <tr key={d.id}>
                      <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>{d.id.slice(0, 8)}</span></td>
                      <td><span className="strong">{d.accounts?.name ?? '—'}</span></td>
                      <td className="muted">{d.funders?.name ?? '—'}</td>
                      <td className="num">{fmt.money(Number(d.transferred_amount ?? 0))}</td>
                      <td>
                        <AvatarStack items={(d.deal_agents ?? []).map(da => ({ name: agentNameMap.get(da.agent_id) ?? '?', hue: 180 }))} />
                      </td>
                      <td><StatusPill status={dealStatusLabel(d.status)} /></td>
                      <td className="muted-num">{d.funds_transferred_at ? fmt.dateShort(d.funds_transferred_at) : fmt.dateShort(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
