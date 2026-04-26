'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, type DbAgent, type DbAgentBalances } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'

type AgentRow = DbAgent & DbAgentBalances

export default function LedgerPage() {
  const [rows, setRows]     = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.agents.list().then(async agentsRes => {
      const agents = agentsRes.data ?? []
      const withBalances = await Promise.all(
        agents.map(async a => {
          const ledgerRes = await api.agents.ledger(a.id)
          const balances  = ledgerRes.data?.balances ?? {
            total_commissions: 0, reserved_amount: 0,
            reversed_amount: 0, paid_amount: 0, available_balance: 0,
          }
          return { ...a, ...balances } as AgentRow
        }),
      )
      setRows(withBalances.sort((a, b) => b.total_commissions - a.total_commissions))
      setLoading(false)
    })
  }, [])

  const totals = rows.reduce(
    (acc, r) => ({
      earned:    acc.earned    + Number(r.total_commissions),
      reserve:   acc.reserve   + Number(r.reserved_amount),
      reversed:  acc.reversed  + Number(r.reversed_amount),
      paid:      acc.paid      + Number(r.paid_amount),
      available: acc.available + Number(r.available_balance),
    }),
    { earned: 0, reserve: 0, reversed: 0, paid: 0, available: 0 },
  )

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Agent Ledger</h1>
          <p>{loading ? 'Loading…' : `${rows.length} agents · ${fmt.moneyK(totals.available)} total available`}</p>
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
                  const name = r.profiles?.name ?? r.code ?? '—'
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
                      <td className="num">{fmt.money(Number(r.total_commissions))}</td>
                      <td className="num" style={{ color: 'var(--warn-ink)' }}>{fmt.money(Number(r.reserved_amount))}</td>
                      <td className="num" style={{ color: 'var(--neg)' }}>{fmt.money(Number(r.reversed_amount))}</td>
                      <td className="num">{fmt.money(Number(r.paid_amount))}</td>
                      <td className="num" style={{ fontWeight: 700, color: Number(r.available_balance) > 0 ? 'var(--pos-ink)' : 'var(--ink)' }}>
                        {fmt.money(Number(r.available_balance))}
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
      </div>
    </div>
  )
}
