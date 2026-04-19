'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { deals, commissions, agents, funders, monthly, notifications, tasks, agentById } from '@/lib/data'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, Pill } from '@/components/ui/pill'
import { AreaChart, BarChart, Donut, Sparkline } from '@/components/ui/charts'
import { AvatarStack } from '@/components/ui/avatar'
import { useShell } from '@/components/shell/shell-provider'
import type { Deal, Commission } from '@/lib/data'

export default function DashboardPage() {
  const [period, setPeriod] = useState('6M')
  const [kpiIdx, setKpiIdx] = useState(0)
  const { openDeal, openCommission, setNewDealOpen } = useShell()

  const monthlyData = monthly.map(m => ({ x: fmt.monthLabel(m.month), y: m.commissions, volume: m.volume }))

  const ytdCommissions = monthly.reduce((a, m) => a + m.commissions, 0)
  const ytdVolume      = monthly.reduce((a, m) => a + m.volume, 0)
  const openComm       = commissions.filter(c => c.status !== 'Paid').reduce((a, c) => a + c.value, 0)
  const pendingCount   = commissions.filter(c => c.status === 'Pending').length

  const kpis = [
    { label: 'Total commissions YTD', val: fmt.moneyK(ytdCommissions), delta: '+18.4%', pos: true, spark: monthly.map(m => m.commissions) },
    { label: 'Funded volume YTD',     val: fmt.moneyK(ytdVolume),      delta: '+22.1%', pos: true, spark: monthly.map(m => m.volume) },
    { label: 'Open commissions',      val: fmt.moneyK(openComm),       delta: `${pendingCount} pending`, pos: false, spark: [30,45,38,62,55,68] },
    { label: 'Avg deal size',         val: fmt.moneyK(ytdVolume / deals.length), delta: '+4.2%', pos: true, spark: [60,52,58,64,61,68] },
  ]

  const byFunder = funders.map(f => {
    const sum = deals.filter(d => d.funderId === f.id).reduce((a, d) => a + d.amount, 0)
    return { label: f.name, value: sum, color: `oklch(0.65 0.18 ${f.hue})` }
  }).filter(x => x.value > 0).sort((a, b) => b.value - a.value)

  const byProduct: Record<string, number> = {}
  deals.forEach(d => { byProduct[d.productType] = (byProduct[d.productType] || 0) + d.amount })
  const productData = Object.entries(byProduct).map(([k, v], i) => ({
    label: k, value: v,
    color: ['var(--accent)','oklch(0.62 0.17 150)','oklch(0.65 0.17 20)','oklch(0.6 0.17 220)','oklch(0.7 0.15 60)'][i % 5],
  })).sort((a, b) => b.value - a.value)

  const agentTotals = agents.map(a => {
    const total = commissions.reduce((acc, c) => {
      const split = c.splits.find(s => s.agentId === a.id)
      return acc + (split ? c.value * (split.pct / 100) : 0)
    }, 0)
    const dealCount = commissions.filter(c => c.splits.some(s => s.agentId === a.id)).length
    return { ...a, total, dealCount }
  }).sort((a, b) => b.total - a.total).slice(0, 5)

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Good morning, Noam. Here&apos;s what&apos;s moving today.</p>
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
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-delta">
              <span className={`chg ${k.pos ? 'pos' : 'neg'}`}>
                {k.pos ? <Icons.ArrowUp /> : <Icons.ArrowDown />}{k.delta}
              </span>
              <span>vs last period</span>
            </div>
            <div className="kpi-spark">
              <Sparkline data={k.spark} color={kpiIdx === i ? 'var(--accent)' : 'var(--ink-4)'} width={60} height={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Main chart + donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div><h3>{kpis[kpiIdx].label}</h3><div className="sub">Last 6 months · by month</div></div>
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
            <Donut segments={byFunder} size={160} center={
              <div>
                <div className="num" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.03em' }}>{fmt.moneyK(byFunder.reduce((a, s) => a + s.value, 0))}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>placed volume</div>
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
          </div>
        </div>
      </div>

      {/* Paid vs Pending + By Product */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Paid vs pending</h3><div className="sub">Commissions by month</div></div></div>
          <div className="card-body">
            <BarChart
              data={monthly.map(m => ({ x: fmt.monthLabel(m.month), a: m.paid, b: m.pending }))}
              series={['a','b']} labels={{ a: 'Paid', b: 'Pending' }}
              colors={['var(--accent)','var(--ink-4)']} height={220}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>By product type</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {productData.map((p, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{p.label}</span>
                  <span className="num muted">{fmt.moneyK(p.value)}</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${(p.value / productData[0].value) * 100}%`, background: p.color }} />
                </div>
              </div>
            ))}
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
            {agentTotals.map((a, i) => (
              <div key={a.id} style={{ padding: '12px 18px', borderBottom: i < agentTotals.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 16 }}>{i + 1}</div>
                <Avatar name={a.name} hue={a.hue} size="md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.tier} · {a.dealCount} deals</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 13, fontWeight: 500 }}>{fmt.moneyK(a.total)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>earned</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Tasks</h3></div>
          <div className="card-body flush">
            {tasks.map((t, i) => {
              const owner = agentById(t.owner)
              return (
                <div key={t.id} style={{ padding: '12px 18px', borderBottom: i < tasks.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10 }}>
                  <div className="check" style={{ marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icons.Clock style={{ width: 11, height: 11 }} />
                      <span>Due {t.due}</span>
                      <span>·</span>
                      <span>{owner?.name.split(' ')[0]}</span>
                    </div>
                  </div>
                  <Pill tone={t.priority === 'High' ? 'neg' : t.priority === 'Med' ? 'warn' : 'default'}>{t.priority}</Pill>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Activity</h3></div>
          <div className="card-body flush">
            {notifications.map((n, i) => (
              <div key={n.id} style={{ padding: '12px 18px', borderBottom: i < notifications.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: n.unread ? 'var(--accent)' : 'var(--ink-5)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: n.unread ? 500 : 400 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{n.sub}</div>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{n.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent deals table */}
      <div className="card">
        <div className="card-head">
          <div><h3>Recent deals</h3><div className="sub">Last 8 closed or in-flight</div></div>
          <div className="actions"><Link href="/deals" className="btn sm">View all <Icons.Chevron /></Link></div>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Deal ID</th><th>Client</th><th>Product</th><th>Funder</th>
                  <th className="num">Amount</th><th className="num">Rate</th>
                  <th>Agents</th><th>Status</th><th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, 8).map(d => (
                  <tr key={d.id} onClick={() => openDeal(d)}>
                    <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>{d.id}</span></td>
                    <td><span className="strong">{d.client}</span></td>
                    <td><span className="chip">{d.productType}</span></td>
                    <td className="muted">{d.funder}</td>
                    <td className="num">{fmt.money(d.amount)}</td>
                    <td className="num">{fmt.pct(d.rate)}</td>
                    <td><AvatarStack items={d.agents.map(id => agentById(id)).filter(Boolean) as any[]} /></td>
                    <td><StatusPill status={d.status} /></td>
                    <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
