'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useDashboardSummary } from '@/lib/queries'
import { Avatar, AvatarStack } from '@/components/ui/avatar'
import { AreaChart, Donut, Sparkline } from '@/components/ui/charts'
import { useShell } from '@/components/shell/shell-provider'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const monthLabel = (key: string) => {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} '${y.slice(2)}`
}

type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y'

/** Convert a period selector into [from, to) ISO date strings. `to` is exclusive. */
function periodToRange(p: Period): { from: string; to: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const to = tomorrow.toISOString().slice(0, 10)
  const from = new Date(now)
  switch (p) {
    case '1M':  from.setUTCMonth(from.getUTCMonth() - 1);  break
    case '3M':  from.setUTCMonth(from.getUTCMonth() - 3);  break
    case '6M':  from.setUTCMonth(from.getUTCMonth() - 6);  break
    case 'YTD': from.setUTCMonth(0); from.setUTCDate(1);   break
    case '1Y':  from.setUTCFullYear(from.getUTCFullYear() - 1); break
  }
  return { from: from.toISOString().slice(0, 10), to }
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('6M')
  const [kpiIdx, setKpiIdx] = useState(0)
  const { setNewDealOpen } = useShell()

  // Period selector now drives the RPC. Hook key includes period -> auto refetch.
  const range = useMemo(() => periodToRange(period), [period])
  const summaryQ = useDashboardSummary(range)
  const summary  = summaryQ.data
  const loading  = summaryQ.isLoading

  const k = summary?.kpis ?? { funded_count: 0, pending_count: 0, funded_volume: 0 }
  const totalCommissions = summary?.monthly?.reduce((a, m) => a + Number(m.earned), 0) ?? 0
  const monthlyData = (summary?.monthly ?? []).map(m => ({
    x:      monthLabel(m.month),
    y:      Number(m.earned),
    volume: Number(m.volume),
  }))

  const kpis = [
    { label: 'Commissions (6mo)',  val: fmt.moneyK(totalCommissions),       delta: '6 months',                     pos: true,  spark: monthlyData.map(m => m.y) },
    { label: 'Funded volume',      val: fmt.moneyK(Number(k.funded_volume)), delta: `${k.funded_count} deals`,      pos: true,  spark: monthlyData.map(m => m.volume) },
    { label: 'Pending deals',      val: String(k.pending_count),             delta: 'in pipeline',                  pos: false, spark: [] },
    { label: 'Avg deal size',      val: fmt.moneyK(k.funded_count ? Number(k.funded_volume) / k.funded_count : 0), delta: `${k.funded_count} deals`, pos: true, spark: [] },
  ]

  const palette = ['var(--accent)', 'oklch(0.62 0.17 150)', 'oklch(0.65 0.17 20)', 'oklch(0.6 0.17 220)', 'oklch(0.7 0.15 60)']
  const byFunder = (summary?.by_funder ?? []).map((f, i) => ({
    label: f.name, value: Number(f.value), color: palette[i % palette.length],
  }))

  const topAgents   = summary?.top_agents ?? []
  const recentDeals = summary?.recent_deals ?? []

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>{loading ? 'Loading…' : `${k.funded_count} funded deals · ${fmt.moneyK(totalCommissions)} commissions (6m)`}</p>
        </div>
        <div className="actions">
          <div className="seg">
            {(['1M','3M','6M','YTD','1Y'] as const).map(p => (
              <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary" onClick={() => setNewDealOpen(true)}><Icons.Plus /> New deal</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kp, i) => (
          <div key={i} className={`kpi ${kpiIdx === i ? 'active' : ''}`} onClick={() => setKpiIdx(i)}>
            <div className="kpi-label">{kp.label}</div>
            <div className="kpi-val">{loading ? '—' : kp.val}</div>
            <div className="kpi-delta">
              <span className={`chg ${kp.pos ? 'pos' : 'neg'}`}>
                {kp.pos ? <Icons.ArrowUp /> : <Icons.ArrowDown />}{kp.delta}
              </span>
            </div>
            {kp.spark.length > 0 && (
              <div className="kpi-spark">
                <Sparkline data={kp.spark} color={kpiIdx === i ? 'var(--accent)' : 'var(--ink-4)'} width={60} height={24} />
              </div>
            )}
          </div>
        ))}
      </div>

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
                  <div className="num" style={{ fontSize: 13, fontWeight: 500 }}>{fmt.moneyK(Number(a.total_commissions))}</div>
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
                    <th className="num">Amount</th><th>Agents</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-4)', fontSize: 12 }}>Loading…</td></tr>
                  ) : recentDeals.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-4)', fontSize: 12 }}>No deals yet</td></tr>
                  ) : recentDeals.map((d: any) => (
                    <tr key={d.id}>
                      <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>{d.id.slice(0, 8)}</span></td>
                      <td><span className="strong">{d.account?.name ?? '—'}</span></td>
                      <td className="muted">{d.funder?.name ?? '—'}</td>
                      <td className="num">{fmt.money(Number(d.transferred_amount ?? 0))}</td>
                      <td>
                        <AvatarStack items={(d.agents ?? []).map((a: any) => ({ name: a.name ?? '?', hue: 180 }))} />
                      </td>
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
