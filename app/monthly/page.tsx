'use client'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { monthly, commissions, deals } from '@/lib/data'
import { BarChart, AreaChart } from '@/components/ui/charts'

export default function MonthlyPage() {
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month))

  const totalVolume = monthly.reduce((a, m) => a + m.volume, 0)
  const totalComm = monthly.reduce((a, m) => a + m.commissions, 0)
  const totalDeals = monthly.reduce((a, m) => a + m.deals, 0)

  const kpis = [
    { label: 'Total volume (period)', val: fmt.moneyK(totalVolume) },
    { label: 'Total commissions', val: fmt.moneyK(totalComm) },
    { label: 'Total deals', val: String(totalDeals) },
    { label: 'Avg commission rate', val: ((totalComm / totalVolume) * 100).toFixed(2) + '%' },
  ]

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Monthly</h1>
          <p>6-month rolling summary</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Volume by month</h3><div className="sub">Funded volume</div></div></div>
          <div className="card-body">
            <AreaChart
              data={sorted.map(m => ({ x: fmt.monthLabel(m.month), y: m.volume }))}
              height={220}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Paid vs pending</h3><div className="sub">Commissions by month</div></div></div>
          <div className="card-body">
            <BarChart
              data={sorted.map(m => ({ x: fmt.monthLabel(m.month), a: m.paid, b: m.pending }))}
              series={['a', 'b']} labels={{ a: 'Paid', b: 'Pending' }}
              colors={['var(--accent)', 'var(--ink-4)']} height={220}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Month-by-month breakdown</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Volume</th>
                <th className="num">Commissions</th>
                <th className="num">Deals</th>
                <th className="num">Paid</th>
                <th className="num">Pending</th>
                <th className="num">Eff. rate</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => (
                <tr key={m.month}>
                  <td className="strong">{fmt.monthLabel(m.month)}</td>
                  <td className="num">{fmt.money(m.volume)}</td>
                  <td className="num">{fmt.money(m.commissions)}</td>
                  <td className="num">{m.deals}</td>
                  <td className="num" style={{ color: 'var(--pos)' }}>{fmt.money(m.paid)}</td>
                  <td className="num" style={{ color: m.pending > 0 ? 'var(--warn)' : 'var(--ink-4)' }}>{fmt.money(m.pending)}</td>
                  <td className="num muted">{((m.commissions / m.volume) * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td>Total</td>
                <td className="num">{fmt.money(totalVolume)}</td>
                <td className="num">{fmt.money(totalComm)}</td>
                <td className="num">{totalDeals}</td>
                <td className="num" style={{ color: 'var(--pos)' }}>{fmt.money(monthly.reduce((a, m) => a + m.paid, 0))}</td>
                <td className="num" style={{ color: 'var(--warn)' }}>{fmt.money(monthly.reduce((a, m) => a + m.pending, 0))}</td>
                <td className="num muted">{((totalComm / totalVolume) * 100).toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
