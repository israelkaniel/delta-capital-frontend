'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { type DbMonthlySummary, type DbAgentPerformance } from '@/lib/api'
import { useReportsAgents, useReportsMonthlyBatch, useDealsList } from '@/lib/queries'
import { AreaChart, BarChart, Donut } from '@/components/ui/charts'
import { Avatar } from '@/components/ui/avatar'
import { exportCSV, csvFmt, todayStamp } from '@/lib/export-csv'

type MonthPoint = { month: number; year: number; key: string; label: string; earned: number; paid: number; reserved: number }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const REPORT_TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'agents',    label: 'By agent' },
  { id: 'funders',   label: 'By funder' },
  { id: 'clients',   label: 'By client' },
  { id: 'monthly',   label: 'Monthly trend' },
  { id: 'funnel',    label: 'Status funnel' },
  { id: 'reserves',  label: 'Reserves' },
  { id: 'mix',       label: 'Deal mix' },
] as const
type ReportTab = typeof REPORT_TABS[number]['id']

const RANGE_OPTIONS = [
  { id: '3m',  label: '3 mo', months: 3 },
  { id: '6m',  label: '6 mo', months: 6 },
  { id: '12m', label: '12 mo', months: 12 },
] as const
type RangeId = typeof RANGE_OPTIONS[number]['id']

function monthKey(m: number, y: number) { return `${y}-${String(m).padStart(2, '0')}` }
function monthLabel(m: number, y: number) { return `${MONTHS[m - 1]} '${String(y).slice(2)}` }

function lastNMonths(n: number, anchor = new Date()): { month: number; year: number }[] {
  const out: { month: number; year: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    out.push({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  return out
}

function priorNMonths(n: number, anchor = new Date()): { month: number; year: number }[] {
  // Same n months but shifted n months back (for comparative period)
  return lastNMonths(n, new Date(anchor.getFullYear(), anchor.getMonth() - n, 1))
}

const hueOf = (id: string, mult = 37) => (id.charCodeAt(0) * mult) % 360

function pctDelta(curr: number, prev: number): { delta: number; positive: boolean } | null {
  if (prev === 0) return null
  const delta = ((curr - prev) / prev) * 100
  return { delta, positive: delta >= 0 }
}

function DeltaBadge({ curr, prev, invertGood }: { curr: number; prev: number; invertGood?: boolean }) {
  const d = pctDelta(curr, prev)
  if (!d) return null
  const good = invertGood ? !d.positive : d.positive
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      color: good ? 'var(--pos)' : 'var(--neg)',
      display: 'inline-flex', alignItems: 'center', gap: 2,
      marginLeft: 6,
    }}>
      {d.positive ? '▲' : '▼'} {Math.abs(d.delta).toFixed(1)}%
    </span>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('overview')
  const [range, setRange] = useState<RangeId>('6m')

  const months    = useMemo(() => lastNMonths(RANGE_OPTIONS.find(r => r.id === range)!.months), [range])
  const monthKeys = useMemo(() => months.map(m => monthKey(m.month, m.year)), [months])
  const priorMonths = useMemo(() => priorNMonths(RANGE_OPTIONS.find(r => r.id === range)!.months), [range])
  const priorKeys = useMemo(() => priorMonths.map(m => monthKey(m.month, m.year)), [priorMonths])

  const agentsQ = useReportsAgents()
  const batchQ  = useReportsMonthlyBatch(monthKeys)
  const priorBatchQ = useReportsMonthlyBatch(priorKeys)
  // Reports aggregates over all deals; use a larger page size to capture
  // the dataset for the current period selection.
  const dealsQ  = useDealsList({ page_size: 500 })

  const agents: DbAgentPerformance[] = (agentsQ.data as any)?.agents ?? []
  const deals = dealsQ.data?.rows ?? []
  const loading = agentsQ.isLoading || batchQ.isLoading
  const error   = agentsQ.error?.message ?? batchQ.error?.message ?? null

  const history = useMemo<MonthPoint[]>(() => {
    const batch = (batchQ.data as Record<string, { summaries?: DbMonthlySummary[] }>) ?? {}
    return months.map(m => {
      const k = monthKey(m.month, m.year)
      const r = batch[k]?.summaries ?? []
      const totals = r.reduce((acc, s) => ({
        earned:   acc.earned   + Number(s.total_earned),
        paid:     acc.paid     + Number(s.total_paid),
        reserved: acc.reserved + Number(s.total_reserved) - Number(s.total_released),
      }), { earned: 0, paid: 0, reserved: 0 })
      return { month: m.month, year: m.year, key: k, label: monthLabel(m.month, m.year), ...totals }
    })
  }, [batchQ.data, months])

  const totals = useMemo(() => history.reduce(
    (a, p) => ({ earned: a.earned + p.earned, paid: a.paid + p.paid, reserved: a.reserved + p.reserved }),
    { earned: 0, paid: 0, reserved: 0 },
  ), [history])

  const priorTotals = useMemo(() => {
    const batch = (priorBatchQ.data as Record<string, { summaries?: DbMonthlySummary[] }>) ?? {}
    return Object.values(batch).reduce((acc, period: any) => {
      const list: DbMonthlySummary[] = period?.summaries ?? []
      for (const s of list) {
        acc.earned += Number(s.total_earned)
        acc.paid += Number(s.total_paid)
        acc.reserved += Number(s.total_reserved) - Number(s.total_released)
      }
      return acc
    }, { earned: 0, paid: 0, reserved: 0 })
  }, [priorBatchQ.data])

  const ytdVolume = agents.reduce((s, a) => s + Number(a.total_volume), 0)
  const ytdCommissions = agents.reduce((s, a) => s + Number(a.total_commissions), 0)

  // ── Derived report rows ──────────────────────────────────────────────────
  const fundersAgg = useMemo(() => {
    const map = new Map<string, { id: string; name: string; deals: number; activeDeals: number; volume: number; payback: number }>()
    for (const d of deals) {
      const f = d.funders
      if (!f) continue
      const cur = map.get(f.id) ?? { id: f.id, name: f.name, deals: 0, activeDeals: 0, volume: 0, payback: 0 }
      cur.deals += 1
      if (d.status === 'FUNDS_TRANSFERRED' || d.status === 'APPROVED') cur.activeDeals += 1
      cur.volume += Number(d.transferred_amount ?? 0)
      cur.payback += Number(d.payback_amount ?? 0)
      map.set(f.id, cur)
    }
    return [...map.values()].sort((a, b) => b.volume - a.volume)
  }, [deals])

  const clientsAgg = useMemo(() => {
    const map = new Map<string, { id: string; name: string; deals: number; activeDeals: number; exposure: number }>()
    for (const d of deals) {
      const c = d.accounts
      if (!c) continue
      const cur = map.get(c.id) ?? { id: c.id, name: c.name, deals: 0, activeDeals: 0, exposure: 0 }
      cur.deals += 1
      if (d.status === 'FUNDS_TRANSFERRED' || d.status === 'APPROVED') cur.activeDeals += 1
      cur.exposure += Number(d.transferred_amount ?? 0)
      map.set(c.id, cur)
    }
    return [...map.values()].sort((a, b) => b.exposure - a.exposure)
  }, [deals])

  const funnel = useMemo(() => {
    const buckets = { PENDING: 0, APPROVED: 0, FUNDS_TRANSFERRED: 0, CANCELLED: 0 }
    const value   = { PENDING: 0, APPROVED: 0, FUNDS_TRANSFERRED: 0, CANCELLED: 0 }
    for (const d of deals) {
      const s = d.status as keyof typeof buckets
      if (s in buckets) {
        buckets[s] += 1
        value[s] += Number(d.transferred_amount ?? d.payback_amount ?? 0)
      }
    }
    const total = deals.length || 1
    return [
      { status: 'PENDING',           label: 'Pending',  count: buckets.PENDING,           value: value.PENDING,           pct: buckets.PENDING / total * 100,           color: 'var(--warn)' },
      { status: 'APPROVED',          label: 'Approved', count: buckets.APPROVED,          value: value.APPROVED,          pct: buckets.APPROVED / total * 100,          color: 'var(--accent)' },
      { status: 'FUNDS_TRANSFERRED', label: 'Active',   count: buckets.FUNDS_TRANSFERRED, value: value.FUNDS_TRANSFERRED, pct: buckets.FUNDS_TRANSFERRED / total * 100, color: 'var(--pos)' },
      { status: 'CANCELLED',         label: 'Declined', count: buckets.CANCELLED,         value: value.CANCELLED,         pct: buckets.CANCELLED / total * 100,         color: 'var(--neg)' },
    ]
  }, [deals])

  const dealMix = useMemo(() => {
    const sizeBuckets = [
      { label: '< $50K',  min: 0,        max: 50_000 },
      { label: '$50–$100K', min: 50_000, max: 100_000 },
      { label: '$100–$250K', min: 100_000, max: 250_000 },
      { label: '$250–$500K', min: 250_000, max: 500_000 },
      { label: '$500K+',  min: 500_000, max: Infinity },
    ]
    const counts = sizeBuckets.map(b => ({
      label: b.label,
      count: deals.filter(d => {
        const v = Number(d.transferred_amount ?? d.payback_amount ?? 0)
        return v >= b.min && v < b.max
      }).length,
    }))
    return counts
  }, [deals])

  const reserveStats = useMemo(() => {
    // Compute outstanding reserve from agents (already aggregated from ledger)
    const reservedNow = agents.reduce((s, a) => s + Number((a as any).reserved_amount ?? 0), 0)
    const distribution = agents
      .filter(a => Number((a as any).reserved_amount ?? 0) > 0)
      .map(a => ({
        id: a.agent_id,
        name: a.agent_name ?? a.agent_code ?? '—',
        amount: Number((a as any).reserved_amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount)
    return { reservedNow, distribution }
  }, [agents])

  const exportFor = (id: ReportTab) => {
    const stamp = todayStamp()
    if (id === 'agents') {
      exportCSV(`report-agents-${stamp}`, [
        { header: 'Agent',        value: (a: any) => a.agent_name ?? a.agent_code ?? '' },
        { header: 'Code',         value: (a: any) => a.agent_code ?? '' },
        { header: 'Total deals',  value: (a: any) => a.total_deals },
        { header: 'Active deals', value: (a: any) => a.active_deals },
        { header: 'Volume',       value: (a: any) => csvFmt.money(a.total_volume) },
        { header: 'Commissions',  value: (a: any) => csvFmt.money(a.total_commissions) },
      ], agents)
    } else if (id === 'funders') {
      exportCSV(`report-funders-${stamp}`, [
        { header: 'Funder',       value: (r: any) => r.name },
        { header: 'Deals',        value: (r: any) => r.deals },
        { header: 'Active deals', value: (r: any) => r.activeDeals },
        { header: 'Volume',       value: (r: any) => csvFmt.money(r.volume) },
        { header: 'Payback',      value: (r: any) => csvFmt.money(r.payback) },
      ], fundersAgg)
    } else if (id === 'clients') {
      exportCSV(`report-clients-${stamp}`, [
        { header: 'Client',       value: (r: any) => r.name },
        { header: 'Deals',        value: (r: any) => r.deals },
        { header: 'Active deals', value: (r: any) => r.activeDeals },
        { header: 'Exposure',     value: (r: any) => csvFmt.money(r.exposure) },
      ], clientsAgg)
    } else if (id === 'monthly') {
      exportCSV(`report-monthly-${stamp}`, [
        { header: 'Month',      value: (p: any) => p.label },
        { header: 'Earned',     value: (p: any) => csvFmt.money(p.earned) },
        { header: 'Paid',       value: (p: any) => csvFmt.money(p.paid) },
        { header: 'In reserve', value: (p: any) => csvFmt.money(p.reserved) },
      ], history)
    } else if (id === 'funnel') {
      exportCSV(`report-funnel-${stamp}`, [
        { header: 'Status', value: (r: any) => r.label },
        { header: 'Count',  value: (r: any) => r.count },
        { header: 'Value',  value: (r: any) => csvFmt.money(r.value) },
      ], funnel)
    } else if (id === 'reserves') {
      exportCSV(`report-reserves-${stamp}`, [
        { header: 'Agent',  value: (r: any) => r.name },
        { header: 'Amount', value: (r: any) => csvFmt.money(r.amount) },
      ], reserveStats.distribution)
    } else if (id === 'mix') {
      exportCSV(`report-mix-${stamp}`, [
        { header: 'Bucket', value: (r: any) => r.label },
        { header: 'Count',  value: (r: any) => r.count },
      ], dealMix)
    }
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>{loading ? 'Loading…' : 'Performance, trends, and comparative analytics'}</p>
        </div>
        <div className="actions">
          <div className="seg">
            {RANGE_OPTIONS.map(r => (
              <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          {tab !== 'overview' && (
            <button className="btn" onClick={() => exportFor(tab)}>
              <Icons.Download /> Export
            </button>
          )}
          <Link href="/monthly" className="btn primary"><Icons.Calendar /> Monthly close</Link>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)',
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
        }}>{error}</div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label">YTD volume</div>
          <div className="kpi-val">{fmt.moneyK(ytdVolume)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>across all funded deals</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">YTD commissions</div>
          <div className="kpi-val">{fmt.moneyK(ytdCommissions)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{agents.length} agents</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Period earned</div>
          <div className="kpi-val">
            {fmt.moneyK(totals.earned)}
            <DeltaBadge curr={totals.earned} prev={priorTotals.earned} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>vs prior period</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Period paid</div>
          <div className="kpi-val">
            {fmt.moneyK(totals.paid)}
            <DeltaBadge curr={totals.paid} prev={priorTotals.paid} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>vs prior period</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {REPORT_TABS.map(t => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head"><div><h3>Commission trend</h3><div className="sub">Earned per period</div></div></div>
            <div className="card-body">
              {loading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</div> :
                <AreaChart data={history.map(p => ({ x: p.label, y: p.earned }))} height={200} />}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div><h3>Cash out vs reserved</h3><div className="sub">Period rolling</div></div></div>
            <div className="card-body">
              {loading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</div> :
                <BarChart
                  data={history.map(p => ({ x: p.label, paid: p.paid, reserved: p.reserved }))}
                  series={['paid', 'reserved']}
                  labels={{ paid: 'Paid', reserved: 'Reserved' }}
                  colors={['var(--pos)', 'var(--warn)']}
                  height={200}
                />}
            </div>
          </div>
        </div>
      )}

      {tab === 'agents' && (
        <div className="card">
          <div className="card-head"><div><h3>Agent performance</h3><div className="sub">Year-to-date</div></div></div>
          {loading ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</div>
          ) : agents.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>No agents found.</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th className="num">Deals</th>
                    <th className="num">Active</th>
                    <th className="num">Volume</th>
                    <th className="num">Commissions</th>
                    <th className="num">Avg per deal</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.slice().sort((a, b) => Number(b.total_commissions) - Number(a.total_commissions)).map(a => (
                    <tr key={a.agent_id}>
                      <td>
                        <Link href={`/agents/${a.agent_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                          <Avatar name={a.agent_name ?? a.agent_code ?? '?'} hue={hueOf(a.agent_id)} size="sm" />
                          <span className="strong">{a.agent_name ?? a.agent_code ?? '—'}</span>
                        </Link>
                      </td>
                      <td className="num">{a.total_deals}</td>
                      <td className="num">{a.active_deals}</td>
                      <td className="num">{fmt.moneyK(Number(a.total_volume))}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt.moneyK(Number(a.total_commissions))}</td>
                      <td className="num muted-num">
                        {a.total_deals > 0 ? fmt.money(Math.round(Number(a.total_commissions) / Number(a.total_deals))) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'funders' && (
        <div className="card">
          <div className="card-head"><div><h3>Performance by funder</h3><div className="sub">Volume contributed by each funder</div></div></div>
          {fundersAgg.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>No deals in scope.</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Funder</th>
                    <th className="num">Deals</th>
                    <th className="num">Active</th>
                    <th className="num">Volume</th>
                    <th className="num">Payback</th>
                    <th className="num">Avg deal</th>
                  </tr>
                </thead>
                <tbody>
                  {fundersAgg.map(r => (
                    <tr key={r.id}>
                      <td><Link href={`/funders/${r.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <span className="strong">{r.name}</span>
                      </Link></td>
                      <td className="num">{r.deals}</td>
                      <td className="num">{r.activeDeals}</td>
                      <td className="num strong">{fmt.moneyK(r.volume)}</td>
                      <td className="num">{fmt.moneyK(r.payback)}</td>
                      <td className="num muted-num">{r.deals > 0 ? fmt.moneyK(r.volume / r.deals) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'clients' && (
        <div className="card">
          <div className="card-head"><div><h3>Top clients by exposure</h3><div className="sub">Total volume per account</div></div></div>
          {clientsAgg.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>No deals in scope.</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th className="num">Deals</th>
                    <th className="num">Active</th>
                    <th className="num">Total exposure</th>
                  </tr>
                </thead>
                <tbody>
                  {clientsAgg.slice(0, 50).map(r => (
                    <tr key={r.id}>
                      <td><Link href={`/clients/${r.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <span className="strong">{r.name}</span>
                      </Link></td>
                      <td className="num">{r.deals}</td>
                      <td className="num">{r.activeDeals}</td>
                      <td className="num strong">{fmt.moneyK(r.exposure)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientsAgg.length > 50 && (
                <div style={{ padding: 10, fontSize: 11, color: 'var(--ink-4)', textAlign: 'center' }}>
                  Showing top 50 of {clientsAgg.length}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="card">
          <div className="card-head"><div><h3>Monthly history</h3><div className="sub">{history.length} periods · earned, paid, in reserve</div></div></div>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <AreaChart data={history.map(p => ({ x: p.label, y: p.earned }))} height={180} />
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="num">Earned</th>
                  <th className="num">Paid</th>
                  <th className="num">In reserve</th>
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().map(p => (
                  <tr key={p.key}>
                    <td className="strong">{p.label}</td>
                    <td className="num">{fmt.money(p.earned)}</td>
                    <td className="num">{fmt.money(p.paid)}</td>
                    <td className="num">{fmt.money(p.reserved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Distribution</h3></div>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
              <Donut
                segments={funnel.map(r => ({ label: r.label, value: r.count, color: r.color }))}
                size={180}
                center={
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>Total</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{deals.length}</div>
                  </div>
                }
              />
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              {funnel.map(r => (
                <div key={r.status} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                  <span style={{ width: 10, height: 10, background: r.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{r.label}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>By status</h3><div className="sub">Count and value</div></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="num">Count</th>
                    <th className="num">Share</th>
                    <th className="num">Total value</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.map(r => (
                    <tr key={r.status}>
                      <td><span style={{ display: 'inline-block', width: 8, height: 8, background: r.color, borderRadius: 2, marginRight: 8 }} /><span className="strong">{r.label}</span></td>
                      <td className="num">{r.count}</td>
                      <td className="num">{r.pct.toFixed(1)}%</td>
                      <td className="num strong">{fmt.moneyK(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'reserves' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Outstanding reserves</h3>
              <div className="sub">Currently reserved across {reserveStats.distribution.length} agents · {fmt.moneyK(reserveStats.reservedNow)} total</div>
            </div>
          </div>
          {reserveStats.distribution.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 40 }}>
              No active reserves.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th className="num">Reserved</th>
                    <th className="num">Share</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {reserveStats.distribution.map(r => {
                    const share = (r.amount / reserveStats.reservedNow) * 100
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/agents/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                            <Avatar name={r.name} hue={hueOf(r.id)} size="sm" />
                            <span className="strong">{r.name}</span>
                          </Link>
                        </td>
                        <td className="num strong">{fmt.money(r.amount)}</td>
                        <td className="num">{share.toFixed(1)}%</td>
                        <td>
                          <div style={{ height: 8, background: 'var(--bg-sunk)', borderRadius: 4, overflow: 'hidden', maxWidth: 240 }}>
                            <div style={{ width: `${share}%`, height: '100%', background: 'var(--warn)' }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'mix' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head"><div><h3>Deal size distribution</h3><div className="sub">Count of deals by funded amount</div></div></div>
            <div className="card-body">
              <BarChart
                data={dealMix.map(b => ({ x: b.label, count: b.count }))}
                series={['count']}
                labels={{ count: 'Deals' }}
                colors={['var(--accent)']}
                height={220}
                fmtFn={n => String(Math.round(n))}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Bucket totals</h3></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Bucket</th>
                    <th className="num">Count</th>
                    <th className="num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {dealMix.map((b, i) => {
                    const share = deals.length > 0 ? (b.count / deals.length) * 100 : 0
                    return (
                      <tr key={i}>
                        <td className="strong">{b.label}</td>
                        <td className="num">{b.count}</td>
                        <td className="num">{share.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
