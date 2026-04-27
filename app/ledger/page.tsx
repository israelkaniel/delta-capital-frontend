'use client'
// Reuses the payout_summary RPC: same balance shape as the per-agent ledger
// endpoint, but returns all agents in one round-trip. Cache is shared with the
// /payout page so navigating between them is instant.

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePayoutSummary } from '@/lib/queries'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { Avatar } from '@/components/ui/avatar'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'

type AgentRow = {
  id: string
  code: string | null
  is_active: boolean
  name: string
  email: string | null
  total_commissions: number
  reserved_amount: number
  reversed_amount: number
  paid_amount: number
  available_balance: number
}

export default function LedgerPage() {
  const [search, setSearch] = useState('')
  const { page, setPage, pageSize } = usePageState()
  const summaryQ = usePayoutSummary({ page, page_size: pageSize, q: search.trim() || undefined })
  const loading  = summaryQ.isLoading
  const total    = (summaryQ.data as any)?.agents_total ?? 0
  useEffect(() => { setPage(1) }, [search, setPage])

  const rows = useMemo<AgentRow[]>(() => {
    const agents = summaryQ.data?.agents ?? []
    return agents
      .map(a => {
        const reserved = Math.max(0, Number(a.reserved_amount_raw))
        const total    = Number(a.total_commissions)
        const reversed = Number(a.reversed_amount)
        const paid     = Number(a.paid_amount)
        return {
          id: a.id, code: a.code, is_active: a.is_active, name: a.name, email: a.email,
          total_commissions: total,
          reserved_amount:   reserved,
          reversed_amount:   reversed,
          paid_amount:       paid,
          available_balance: Math.max(0, total - reserved - reversed - paid),
        }
      })
      .sort((a, b) => b.total_commissions - a.total_commissions)
  }, [summaryQ.data])

  const totals = rows.reduce(
    (acc, r) => ({
      earned:    acc.earned    + r.total_commissions,
      reserve:   acc.reserve   + r.reserved_amount,
      reversed:  acc.reversed  + r.reversed_amount,
      paid:      acc.paid      + r.paid_amount,
      available: acc.available + r.available_balance,
    }),
    { earned: 0, reserve: 0, reversed: 0, paid: 0, available: 0 },
  )

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Agent Ledger</h1>
          <p>{loading ? 'Loading…' : `${total.toLocaleString()} agents on this page · ${fmt.moneyK(totals.available)} available`}</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading ledger…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th className="num">Total Earned</th>
                  <th className="num">In Reserve</th>
                  <th className="num">Reversed</th>
                  <th className="num">Paid</th>
                  <th className="num">Available</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const name = r.name ?? r.code ?? '—'
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={name} size="sm" hue={180} />
                          <div>
                            <div className="strong">{name}</div>
                            {r.code && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{r.code}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="num">{fmt.money(r.total_commissions)}</td>
                      <td className="num" style={{ color: 'var(--warn-ink)' }}>{fmt.money(r.reserved_amount)}</td>
                      <td className="num" style={{ color: 'var(--neg)' }}>{fmt.money(r.reversed_amount)}</td>
                      <td className="num">{fmt.money(r.paid_amount)}</td>
                      <td className="num" style={{ fontWeight: 700, color: r.available_balance > 0 ? 'var(--pos-ink)' : 'var(--ink)' }}>
                        {fmt.money(r.available_balance)}
                      </td>
                      <td>
                        <Link href={`/ledger/${r.id}`} className="btn sm ghost">View</Link>
                      </td>
                    </tr>
                  )
                })}
                <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                  <td>Total</td>
                  <td className="num">{fmt.money(totals.earned)}</td>
                  <td className="num">{fmt.money(totals.reserve)}</td>
                  <td className="num">{fmt.money(totals.reversed)}</td>
                  <td className="num">{fmt.money(totals.paid)}</td>
                  <td className="num">{fmt.money(totals.available)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)' }}>
          <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
