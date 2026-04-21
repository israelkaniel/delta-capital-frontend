'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { agents, ledgerEntries, ledgerBalances } from '@/lib/data'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'

const tierTone = (t: string) =>
  t === 'Partner' ? 'accent' : t === 'Senior' ? 'pos' : t === 'Mid' ? 'info' : 'default'

export default function LedgerPage() {
  const rows = useMemo(() =>
    agents.map(a => ({ ...a, ...ledgerBalances(a.id) }))
      .sort((a, b) => b.totalEarned - a.totalEarned),
  [])

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      earned:   acc.earned   + r.totalEarned,
      reserve:  acc.reserve  + r.inReserve,
      reversed: acc.reversed + r.totalReversed,
      paid:     acc.paid     + r.totalPaid,
      available:acc.available+ r.available,
    }),
    { earned: 0, reserve: 0, reversed: 0, paid: 0, available: 0 }
  ), [rows])

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Commission Ledger</h1>
          <p>Financial balances across all agents</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Earned',    val: totals.earned,    sub: `${ledgerEntries.filter(e => e.type === 'earned').length} commission entries`, tone: '' },
          { label: 'Total in Reserve', val: totals.reserve,  sub: `${rows.filter(r => r.inReserve > 0).length} agents with active reserve`, tone: 'warn' },
          { label: 'Total Reversed',  val: totals.reversed,  sub: 'Permanently deducted',     tone: 'neg' },
          { label: 'Total Available', val: totals.available, sub: 'Across all active agents',  tone: 'pos' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div className="num" style={{
              fontSize: 22, fontWeight: 700,
              color: k.tone === 'pos' ? 'var(--pos)' : k.tone === 'neg' ? 'var(--neg)' : k.tone === 'warn' ? 'var(--warn)' : 'var(--ink-1)',
            }}>
              {fmt.moneyK(k.val)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Agent table */}
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th className="num">Total Earned</th>
                <th className="num">In Reserve</th>
                <th className="num">Reversed</th>
                <th className="num">Paid Out</th>
                <th className="num">Available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={r.name} hue={r.hue} size="md" />
                      <div>
                        <div className="strong" style={{ fontSize: 13 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{r.email}</div>
                      </div>
                      <span style={{ marginLeft: 4 }}><Pill tone={tierTone(r.tier)}>{r.tier}</Pill></span>
                    </div>
                  </td>
                  <td className="num">{fmt.money(r.totalEarned)}</td>
                  <td className="num">
                    {r.inReserve > 0
                      ? <span style={{ color: 'var(--warn)', fontWeight: 600 }}>{fmt.money(r.inReserve)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="num">
                    {r.totalReversed > 0
                      ? <span style={{ color: 'var(--neg)' }}>{fmt.money(r.totalReversed)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="num muted">{r.totalPaid > 0 ? fmt.money(r.totalPaid) : '—'}</td>
                  <td className="num">
                    <span style={{
                      fontWeight: 700,
                      color: r.available > 0 ? 'var(--pos)' : r.available < 0 ? 'var(--neg)' : 'var(--ink-3)',
                    }}>
                      {fmt.money(r.available)}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/ledger/${r.id}`}
                      className="btn"
                      style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      View <Icons.Chevron style={{ width: 12, height: 12 }} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
