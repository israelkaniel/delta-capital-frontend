'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbAgentPerformance, type DbMonthlySummary } from '@/lib/api'
import { AreaChart } from '@/components/ui/charts'
import { Avatar } from '@/components/ui/avatar'

type MonthPoint = { month: number; year: number; key: string; label: string; earned: number; paid: number; reserved: number }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthKey(m: number, y: number) { return `${y}-${String(m).padStart(2, '0')}` }
function monthLabel(m: number, y: number) { return `${MONTHS[m - 1]} '${String(y).slice(2)}` }

function last6Months(now = new Date()): { month: number; year: number }[] {
  const out: { month: number; year: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  return out
}

export default function ReportsPage() {
  const [agents, setAgents] = useState<DbAgentPerformance[]>([])
  const [history, setHistory] = useState<MonthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const months = last6Months()
    const monthKeys = months.map(m => monthKey(m.month, m.year))
    // Two requests instead of seven: agents-perf + a single batched 6-month report.
    Promise.all([
      api.reports.agents(),
      api.reports.monthlyBatch(monthKeys),
    ]).then(([agentsRes, batchRes]) => {
      if (agentsRes.error) { setError(agentsRes.error.message); setLoading(false); return }
      setAgents((agentsRes.data as any)?.agents ?? [])
      const batch = (batchRes.data as Record<string, { summaries?: DbMonthlySummary[] }>) ?? {}
      const points = months.map(m => {
        const k = monthKey(m.month, m.year)
        const r = batch[k]?.summaries ?? []
        const totals = r.reduce((acc, s) => ({
          earned:   acc.earned   + Number(s.total_earned),
          paid:     acc.paid     + Number(s.total_paid),
          reserved: acc.reserved + Number(s.total_reserved) - Number(s.total_released),
        }), { earned: 0, paid: 0, reserved: 0 })
        return { month: m.month, year: m.year, key: k, label: monthLabel(m.month, m.year), ...totals }
      })
      setHistory(points)
      setLoading(false)
    })
  }, [])

  const totals = useMemo(() => history.reduce(
    (a, p) => ({ earned: a.earned + p.earned, paid: a.paid + p.paid, reserved: a.reserved + p.reserved }),
    { earned: 0, paid: 0, reserved: 0 },
  ), [history])

  const ytdVolume = agents.reduce((s, a) => s + Number(a.total_volume), 0)
  const ytdCommissions = agents.reduce((s, a) => s + Number(a.total_commissions), 0)

  const exportAgents = () => {
    const rows = [
      ['Agent', 'Code', 'Total deals', 'Active deals', 'Volume', 'Commissions'],
      ...agents.map(a => [a.agent_name ?? '', a.agent_code ?? '', a.total_deals, a.active_deals, a.total_volume, a.total_commissions]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agents-performance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportMonthly = () => {
    const rows = [
      ['Month', 'Earned', 'Paid', 'In reserve'],
      ...history.map(p => [p.label, p.earned, p.paid, p.reserved]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly-totals-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hueOf = (id: string) => (id.charCodeAt(0) * 37) % 360

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>{loading ? 'Loading…' : 'Performance and trend analytics'}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportMonthly}><Icons.Download /> Monthly CSV</button>
          <button className="btn" onClick={exportAgents}><Icons.Download /> Agents CSV</button>
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
          <div className="kpi-label">Last 6 months earned</div>
          <div className="kpi-val">{fmt.moneyK(totals.earned)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>from monthly summaries</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Paid out (6m)</div>
          <div className="kpi-val">{fmt.moneyK(totals.paid)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>recorded payments</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Commission trend</h3>
              <div className="sub">Last 6 months · earned by period</div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</div>
            ) : (
              <AreaChart
                data={history.map(p => ({ x: p.label, y: p.earned }))}
                height={200}
              />
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Paid vs reserved</h3>
              <div className="sub">Last 6 months · cash outflow</div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</div>
            ) : (
              <AreaChart
                data={history.map(p => ({ x: p.label, y: p.paid }))}
                height={200}
              />
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Agent performance</h3>
            <div className="sub">Year-to-date earnings per agent</div>
          </div>
        </div>
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
                {agents
                  .slice()
                  .sort((a, b) => Number(b.total_commissions) - Number(a.total_commissions))
                  .map(a => (
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
    </div>
  )
}
