'use client'
import { useMemo, useState } from 'react'
import { fmt } from '@/lib/fmt'
import { Pill } from '@/components/ui/pill'
import type { DbPayment, PaymentStatus } from '@/lib/api'

const STATUS_TONE: Record<PaymentStatus, 'pos' | 'warn' | 'default'> = {
  paid: 'pos', pending: 'warn', cancelled: 'default',
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  check: 'Check',
  cash: 'Cash',
  other: 'Other',
}

interface Props {
  payments: DbPayment[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
}

export function PaymentsPanel({ payments, loading, error, emptyMessage = 'No payments yet.' }: Props) {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')

  const filtered = useMemo(() => {
    return payments.filter(p => {
      if (statusFilter && p.status !== statusFilter) return false
      if (from && p.created_at < from) return false
      if (to   && p.created_at > to + 'T23:59:59Z') return false
      return true
    })
  }, [payments, statusFilter, from, to])

  const totals = useMemo(() => {
    let paid = 0, pending = 0
    for (const p of filtered) {
      const a = Number(p.amount)
      if (p.status === 'paid')    paid    += a
      if (p.status === 'pending') pending += a
    }
    return { paid, pending }
  }, [filtered])

  if (loading)        return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
  if (error)          return <div style={{ padding: 24, color: 'var(--neg)', fontSize: 13 }}>{error}</div>

  return (
    <>
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as PaymentStatus | '')} style={{ flex: '0 0 160px' }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
          From <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
          to   <input className="input" type="date" value={to}   onChange={e => setTo(e.target.value)}   style={{ width: 150 }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>{emptyMessage}</div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Created</th>
                <th>Receipt date</th>
                <th className="num">Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{fmt.date(p.created_at)}</td>
                  <td>{p.payment_date ? fmt.date(p.payment_date) : <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt.money(Number(p.amount))}</td>
                  <td><span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{PAYMENT_TYPE_LABEL[p.payment_type] ?? p.payment_type}</span></td>
                  <td><Pill tone={STATUS_TONE[p.status]} dot>{p.status}</Pill></td>
                  <td>{p.reference_number ? <span className="mono" style={{ fontSize: 12 }}>{p.reference_number}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        padding: '11px 18px', borderTop: '1px solid var(--line)',
        background: 'var(--bg-sunk)', display: 'flex', gap: 28, fontSize: 12.5,
      }}>
        <span style={{ color: 'var(--ink-3)' }}>
          Total paid <strong style={{ color: 'var(--pos)' }}>{fmt.money(totals.paid)}</strong>
        </span>
        <span style={{ color: 'var(--ink-3)' }}>
          Total pending <strong style={{ color: 'var(--warn)' }}>{fmt.money(totals.pending)}</strong>
        </span>
        <span style={{ color: 'var(--ink-4)', marginLeft: 'auto' }}>
          {filtered.length} of {payments.length} payments
        </span>
      </div>
    </>
  )
}
