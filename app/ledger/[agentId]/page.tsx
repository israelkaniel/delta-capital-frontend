'use client'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ledgerEntries, ledgerBalances, ledgerAvailableImpact, agentById, dealById } from '@/lib/data'
import type { LedgerEntry, LedgerEntryType } from '@/lib/data'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'

type EntryMeta = { label: string; tone: 'pos' | 'neg' | 'warn' | 'info' | 'accent' | 'default'; credit: boolean | null }
const entryMeta: Record<LedgerEntryType, EntryMeta> = {
  earned:             { label: 'Commission Earned',    tone: 'pos',    credit: true  },
  reserve:            { label: 'Transfer to Reserve',  tone: 'warn',   credit: false },
  partial_reserve:    { label: 'Partial Reserve',      tone: 'warn',   credit: false },
  released:           { label: 'Released from Reserve',tone: 'pos',    credit: true  },
  reversed:           { label: 'Reversed',             tone: 'neg',    credit: null  },
  payment:            { label: 'Payment Recorded',     tone: 'info',   credit: false },
  payment_correction: { label: 'Payment Correction',   tone: 'accent', credit: null  },
  adjustment:         { label: 'Manual Adjustment',    tone: 'default',credit: null  },
}

const tierTone = (t: string) =>
  t === 'Partner' ? 'accent' : t === 'Senior' ? 'pos' : t === 'Mid' ? 'info' : 'default'

export default function AgentLedgerPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const agent = agentById(agentId)

  const { totalEarned, inReserve, totalReversed, totalPaid, available } = useMemo(
    () => ledgerBalances(agentId), [agentId]
  )

  const entriesWithBalance = useMemo(() => {
    const sorted = ledgerEntries
      .filter(e => e.agentId === agentId)
      .sort((a, b) => a.date.localeCompare(b.date))
    let running = 0
    return sorted.map(e => {
      running += ledgerAvailableImpact(e)
      return { ...e, runningBalance: running }
    })
  }, [agentId])

  if (!agent) return (
    <div className="page" style={{ padding: '40px 28px' }}>
      <p className="muted">Agent not found.</p>
    </div>
  )

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      {/* Back */}
      <Link href="/ledger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', marginBottom: 20, textDecoration: 'none' }}>
        <Icons.Chevron style={{ width: 12, height: 12, transform: 'rotate(180deg)' }} />
        All agents
      </Link>

      {/* Agent header */}
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={agent.name} hue={agent.hue} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{agent.name}</h1>
              <Pill tone={tierTone(agent.tier)}>{agent.tier}</Pill>
              {!agent.active && <Pill tone="neg">Inactive</Pill>}
            </div>
            <p style={{ margin: 0 }}>{agent.email}</p>
          </div>
        </div>
      </div>

      {/* Balance KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Earned',   val: totalEarned,    sub: `${entriesWithBalance.filter(e => e.type === 'earned').length} commission entries`,  color: '' },
          { label: 'In Reserve',     val: inReserve,      sub: inReserve > 0 ? 'Currently withheld' : 'No active reserve',  color: inReserve > 0 ? 'var(--warn)' : '' },
          { label: 'Reversed',       val: totalReversed,  sub: 'Permanently deducted',   color: totalReversed > 0 ? 'var(--neg)' : '' },
          { label: 'Paid Out',       val: totalPaid,      sub: `${entriesWithBalance.filter(e => e.type === 'payment').length} payment entries`, color: 'var(--ink-3)' },
          { label: 'Available',      val: available,      sub: 'Ready for payout',        color: available > 0 ? 'var(--pos)' : available < 0 ? 'var(--neg)' : 'var(--ink-3)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: k.color || 'var(--ink-1)' }}>
              {fmt.money(k.val)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Ledger table */}
      <div className="card">
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Ledger Entries</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            {entriesWithBalance.length} entries · immutable history
          </div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Deal / Ref</th>
                <th className="num">Amount</th>
                <th className="num">Balance</th>
                <th>Notes</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithBalance.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '32px 0' }}>No ledger entries yet.</td></tr>
              )}
              {entriesWithBalance.map(e => {
                const meta = entryMeta[e.type]
                const impact = ledgerAvailableImpact(e)
                const deal = e.dealId ? dealById(e.dealId) : null
                const isCredit = impact > 0
                const isDebit  = impact < 0
                const isNeutral = impact === 0
                return (
                  <tr key={e.id}>
                    <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmt.dateShort(e.date)}
                    </td>
                    <td>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {deal && (
                          <span className="strong" style={{ marginRight: 4 }}>{e.dealId}</span>
                        )}
                        {e.commissionId && (
                          <span className="muted">{e.commissionId}</span>
                        )}
                        {e.ref && (
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{e.ref}</span>
                        )}
                        {!deal && !e.ref && <span className="muted">—</span>}
                      </div>
                      {deal && (
                        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{deal.client}</div>
                      )}
                    </td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      {isNeutral ? (
                        <span style={{ color: 'var(--neg)', fontStyle: 'italic' }}>
                          −{fmt.money(e.amount)}
                        </span>
                      ) : (
                        <span style={{ color: isCredit ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
                          {isCredit ? '+' : '−'}{fmt.money(Math.abs(e.amount))}
                        </span>
                      )}
                    </td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontWeight: 600,
                        color: e.runningBalance > 0 ? 'var(--ink-1)' : e.runningBalance < 0 ? 'var(--neg)' : 'var(--ink-3)',
                      }}>
                        {fmt.money(e.runningBalance)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      {e.notes
                        ? <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{e.notes}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{e.createdBy}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
