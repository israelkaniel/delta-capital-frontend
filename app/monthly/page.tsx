'use client'
import { useEffect, useState, useCallback } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbMonthlySummary } from '@/lib/api'

export default function MonthlyPage() {
  const now   = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [data, setData]   = useState<{ closed: boolean; summaries: DbMonthlySummary[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setCloseError(null)
    api.reports.monthly(month, year).then(res => {
      setData(res.data ? { closed: (res.data as any).closed, summaries: (res.data as any).summaries ?? [] } : null)
      setLoading(false)
    })
  }, [month, year])

  useEffect(() => { refresh() }, [refresh])

  const closeMonth = async () => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    if (!confirm(`Close ${MONTHS[month - 1]} ${year}? This locks the period and persists monthly summaries. It cannot be undone.`)) return
    setClosing(true); setCloseError(null)
    const res = await api.monthlyClose.execute(month, year)
    setClosing(false)
    if (res.error) { setCloseError(res.error.message); return }
    refresh()
  }

  const summaries = data?.summaries ?? []
  const totals = summaries.reduce(
    (acc, s) => ({
      earned:   acc.earned   + Number(s.total_earned),
      reserved: acc.reserved + Number(s.total_reserved),
      released: acc.released + Number(s.total_released),
      reversed: acc.reversed + Number(s.total_reversed),
      paid:     acc.paid     + Number(s.total_paid),
      balance:  acc.balance  + Number(s.balance),
    }),
    { earned: 0, reserved: 0, released: 0, reversed: 0, paid: 0, balance: 0 },
  )

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const kpis = [
    { label: 'Total earned',   val: fmt.moneyK(totals.earned) },
    { label: 'In reserve',     val: fmt.moneyK(totals.reserved - totals.released) },
    { label: 'Paid out',       val: fmt.moneyK(totals.paid) },
    { label: 'Net balance',    val: fmt.moneyK(totals.balance) },
  ]

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Monthly</h1>
          <p>{data?.closed ? 'Closed period' : 'Open period — live data'}</p>
        </div>
        <div className="actions" style={{ gap: 8 }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {!data?.closed && (
            <button className="btn primary" onClick={closeMonth} disabled={closing || summaries.length === 0}>
              <Icons.Check /> {closing ? 'Closing…' : 'Close this period'}
            </button>
          )}
        </div>
      </div>

      {closeError && (
        <div style={{
          background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)',
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
        }}>{closeError}</div>
      )}

      {data?.closed && (
        <div style={{
          background: 'var(--accent-soft)', color: 'var(--accent-ink)',
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icons.Check style={{ width: 14, height: 14 }} />
          This period is closed — balances are locked to the snapshot taken at close time.
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
        ) : summaries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No data for this period</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th className="num">Opening</th><th className="num">Earned</th>
                  <th className="num">Reserved</th><th className="num">Released</th>
                  <th className="num">Reversed</th><th className="num">Paid</th>
                  <th className="num">Closing</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, i) => (
                  <tr key={i}>
                    <td><span className="strong">{s.agent_name ?? s.agent_code ?? '—'}</span></td>
                    <td className="num">{fmt.money(Number(s.opening_balance ?? 0))}</td>
                    <td className="num">{fmt.money(Number(s.total_earned))}</td>
                    <td className="num">{fmt.money(Number(s.total_reserved))}</td>
                    <td className="num">{fmt.money(Number(s.total_released))}</td>
                    <td className="num" style={{ color: 'var(--neg)' }}>{fmt.money(Number(s.total_reversed))}</td>
                    <td className="num" style={{ color: 'var(--neg)' }}>{fmt.money(Number(s.total_paid))}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmt.money(Number(s.closing_balance ?? s.balance))}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                  <td>Total</td>
                  <td className="num">—</td>
                  <td className="num">{fmt.money(totals.earned)}</td>
                  <td className="num">{fmt.money(totals.reserved)}</td>
                  <td className="num">{fmt.money(totals.released)}</td>
                  <td className="num" style={{ color: 'var(--neg)' }}>{fmt.money(totals.reversed)}</td>
                  <td className="num" style={{ color: 'var(--neg)' }}>{fmt.money(totals.paid)}</td>
                  <td className="num">{fmt.money(totals.balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
