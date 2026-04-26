'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbAgent, type DbAgentBalances, type DbPayment } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { RecordPaymentModal } from '@/components/payout/record-payment-modal'

type Row = {
  agent: DbAgent
  balances: DbAgentBalances
}

export default function PayoutPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [payments, setPayments] = useState<DbPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<Row | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const agentsRes = await api.agents.list()
    if (agentsRes.error) { setError(agentsRes.error.message); setLoading(false); return }
    const agents = agentsRes.data ?? []

    const ledgerResults = await Promise.all(
      agents.map(a => api.agents.ledger(a.id).then(r => ({ agent: a, res: r }))),
    )

    const paymentsRes = await api.payments.list()
    setPayments(paymentsRes.data ?? [])

    setRows(
      ledgerResults
        .filter(r => r.res.data)
        .map(r => ({ agent: r.agent, balances: r.res.data!.balances })),
    )
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => ({
      earned:    acc.earned    + Number(r.balances.total_commissions),
      reserved:  acc.reserved  + Number(r.balances.reserved_amount),
      reversed:  acc.reversed  + Number(r.balances.reversed_amount),
      paid:      acc.paid      + Number(r.balances.paid_amount),
      available: acc.available + Number(r.balances.available_balance),
    }), { earned: 0, reserved: 0, reversed: 0, paid: 0, available: 0 })
  }, [rows])

  const payableAgents = rows.filter(r => Number(r.balances.available_balance) > 0).length

  const exportCsv = () => {
    const header = ['Agent', 'Code', 'Earned', 'Reserved', 'Reversed', 'Paid', 'Available']
    const body = rows.map(r => [
      r.agent.profiles?.name ?? '',
      r.agent.code ?? '',
      r.balances.total_commissions,
      r.balances.reserved_amount,
      r.balances.reversed_amount,
      r.balances.paid_amount,
      r.balances.available_balance,
    ])
    const csv = [header, ...body].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payout-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Payout</h1>
          <p>{loading ? 'Loading…' : `${rows.length} agents · ${payableAgents} with available balance · ${payments.length} payments on record`}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>
            <Icons.Download /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--neg-soft)', border: '1px solid var(--neg-line)',
          color: 'var(--neg)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
        }}>{error}</div>
      )}

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Total earned</span>
          <span className="kpi-val">{fmt.moneyK(totals.earned)}</span>
          <span className="kpi-delta">all commissions to date</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Paid</span>
          <span className="kpi-val" style={{ color: 'var(--pos)' }}>{fmt.moneyK(totals.paid)}</span>
          <span className="kpi-delta">{payments.length} payments recorded</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">In reserve</span>
          <span className="kpi-val" style={{ color: 'var(--warn)' }}>{fmt.moneyK(totals.reserved)}</span>
          <span className="kpi-delta">held pending review</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Available to pay</span>
          <span className="kpi-val" style={{ color: 'var(--accent-ink)' }}>{fmt.moneyK(totals.available)}</span>
          <span className="kpi-delta">{payableAgents} agents</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Agent balances</h3>
            <div className="sub">Click &quot;Pay&quot; to record a payment against available balance</div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th className="num">Earned</th>
                <th className="num">Reserved</th>
                <th className="num">Reversed</th>
                <th className="num">Paid</th>
                <th className="num">Available</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</td></tr>
              )}
              {!loading && rows.map(row => {
                const name = row.agent.profiles?.name ?? row.agent.code ?? '—'
                const available = Number(row.balances.available_balance)
                const hue = row.agent.id.charCodeAt(0) * 37 % 360
                return (
                  <tr key={row.agent.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={name} hue={hue} size="md" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
                            {row.agent.code && <span className="mono">{row.agent.code}</span>}
                            {row.agent.profiles?.email && <span style={{ marginLeft: 8 }}>{row.agent.profiles.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt.money(Number(row.balances.total_commissions))}</td>
                    <td className="num" style={{ color: Number(row.balances.reserved_amount) > 0 ? 'var(--warn)' : 'var(--ink-4)' }}>
                      {Number(row.balances.reserved_amount) > 0 ? fmt.money(Number(row.balances.reserved_amount)) : '—'}
                    </td>
                    <td className="num" style={{ color: Number(row.balances.reversed_amount) > 0 ? 'var(--neg)' : 'var(--ink-4)' }}>
                      {Number(row.balances.reversed_amount) > 0 ? fmt.money(Number(row.balances.reversed_amount)) : '—'}
                    </td>
                    <td className="num" style={{ color: 'var(--pos)' }}>
                      {Number(row.balances.paid_amount) > 0 ? fmt.money(Number(row.balances.paid_amount)) : '—'}
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: available > 0 ? 'var(--accent-ink)' : 'var(--ink-4)' }}>
                      {fmt.money(available)}
                    </td>
                    <td>
                      {available > 0 ? (
                        <button className="btn sm primary" onClick={() => setModal(row)}>Pay</button>
                      ) : (
                        <Pill tone="default">Settled</Pill>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <p className="empty-state-title">No agents yet</p>
                    <p className="empty-state-sub">Add agents to start tracking payouts.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          padding: '11px 18px', borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between',
          background: 'var(--bg-sunk)', fontSize: 12,
        }}>
          <span style={{ color: 'var(--ink-3)' }}>Total payable <strong style={{ color: 'var(--ink-1)' }}>{fmt.money(totals.available)}</strong></span>
          <span style={{ color: 'var(--ink-3)' }}>Paid to date <strong style={{ color: 'var(--pos)' }}>{fmt.money(totals.paid)}</strong></span>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>Recent payments</h3>
            <div className="sub">{payments.length} recorded</div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Agent</th>
                  <th>Reference</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map(p => {
                  const row = rows.find(r => r.agent.id === p.agent_id)
                  return (
                    <tr key={p.id}>
                      <td>{fmt.date(p.payment_date)}</td>
                      <td>{row?.agent.profiles?.name ?? '—'}</td>
                      <td>{p.reference || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt.money(Number(p.amount))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <RecordPaymentModal
          open
          onClose={() => setModal(null)}
          agentId={modal.agent.id}
          agentName={modal.agent.profiles?.name ?? modal.agent.code ?? 'Agent'}
          suggestedAmount={Number(modal.balances.available_balance)}
          onDone={refresh}
        />
      )}
    </div>
  )
}
