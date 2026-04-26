'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbAgent, type DbAgentBalances, type DbLedgerEntry } from '@/lib/api'
import { dbAgents } from '@/lib/db'

type Tone = 'pos' | 'neg' | 'warn' | 'info' | 'accent' | 'default'

const ENTRY_META: Record<string, { label: string; tone: Tone }> = {
  COMMISSION_EARNED:    { label: 'Commission Earned',    tone: 'pos'    },
  TRANSFER_TO_RESERVE:  { label: 'Transfer to Reserve',  tone: 'warn'   },
  PARTIAL_RESERVE:      { label: 'Partial Reserve',      tone: 'warn'   },
  RELEASE_FROM_RESERVE: { label: 'Released from Reserve',tone: 'pos'    },
  COMMISSION_REVERSAL:  { label: 'Commission Reversal',  tone: 'neg'    },
  PAYMENT_RECORDED:     { label: 'Payment Recorded',     tone: 'info'   },
  PAYMENT_CORRECTION:   { label: 'Payment Correction',   tone: 'accent' },
  MANUAL_ADJUSTMENT:    { label: 'Manual Adjustment',    tone: 'default'},
}

const FILTERS = ['All', 'Commissions', 'Reserves', 'Payments'] as const
type Filter = typeof FILTERS[number]

const matchesFilter = (type: string, f: Filter) => {
  if (f === 'All') return true
  if (f === 'Commissions') return type === 'COMMISSION_EARNED' || type === 'COMMISSION_REVERSAL'
  if (f === 'Reserves') return ['TRANSFER_TO_RESERVE', 'PARTIAL_RESERVE', 'RELEASE_FROM_RESERVE'].includes(type)
  if (f === 'Payments') return type === 'PAYMENT_RECORDED' || type === 'PAYMENT_CORRECTION'
  return true
}

export default function AgentLedgerPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<DbAgent | null>(null)
  const [balances, setBalances] = useState<DbAgentBalances | null>(null)
  const [entries, setEntries] = useState<DbLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('All')

  const refresh = useCallback(async () => {
    setLoading(true)
    const [a, l] = await Promise.all([dbAgents.get(agentId), api.agents.ledger(agentId)])
    if (a.error) { setError(a.error.message); setLoading(false); return }
    if (l.error) { setError(l.error.message); setLoading(false); return }
    setAgent(a.data)
    setBalances(l.data?.balances ?? null)
    setEntries(l.data?.entries ?? [])
    setLoading(false)
  }, [agentId])

  useEffect(() => { refresh() }, [refresh])

  const filtered = useMemo(() => entries.filter(e => matchesFilter(e.type, filter)), [entries, filter])

  // Calculate running balance — sort ascending by date, then map back
  const withBalance = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.created_at.localeCompare(b.created_at))
    let running = 0
    const map = new Map<string, number>()
    for (const e of sorted) {
      running += Number(e.amount)
      map.set(e.id, running)
    }
    return filtered.map(e => ({ ...e, runningBalance: map.get(e.id) ?? 0 }))
  }, [filtered])

  const exportCsv = () => {
    const rows = [
      ['Date', 'Type', 'Amount', 'Description', 'Reference'],
      ...entries.map(e => [
        e.created_at, e.type, e.amount,
        e.description ?? '',
        e.commission_id ?? e.reserve_id ?? e.payment_id ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-${agent?.profiles?.name ?? agentId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>Loading ledger…</div>
  )

  if (error || !agent) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Agent not found.'}</p>
      <Link href="/ledger" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to ledger</Link>
    </div>
  )

  const name = agent.profiles?.name ?? agent.code ?? 'Agent'
  const hue = agent.id.charCodeAt(0) * 37 % 360

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <Link href="/ledger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', marginBottom: 20, textDecoration: 'none' }}>
        <Icons.Chevron style={{ width: 12, height: 12, transform: 'rotate(180deg)' }} />
        All agents
      </Link>

      <div className="page-head" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={name} hue={hue} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{name}</h1>
              {!agent.is_active && <Pill tone="warn">Inactive</Pill>}
            </div>
            <p style={{ margin: 0 }}>
              {agent.code && <span className="mono">{agent.code}</span>}
              {agent.profiles?.email && <span style={{ marginLeft: 12 }}>{agent.profiles.email}</span>}
            </p>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportCsv}><Icons.Download /> Export CSV</button>
          <Link href={`/agents/${agent.id}`} className="btn">Open profile</Link>
        </div>
      </div>

      {/* Balance KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Earned',   val: balances?.total_commissions ?? 0, sub: 'all commissions',    color: '' },
          { label: 'In Reserve',     val: balances?.reserved_amount ?? 0,   sub: 'currently held',     color: Number(balances?.reserved_amount) > 0 ? 'var(--warn)' : '' },
          { label: 'Reversed',       val: balances?.reversed_amount ?? 0,   sub: 'permanently lost',   color: Number(balances?.reversed_amount) > 0 ? 'var(--neg)' : '' },
          { label: 'Paid Out',       val: balances?.paid_amount ?? 0,       sub: 'all payments',       color: 'var(--ink-3)' },
          { label: 'Available',      val: balances?.available_balance ?? 0, sub: 'ready for payout',   color: Number(balances?.available_balance) > 0 ? 'var(--pos)' : 'var(--ink-3)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: k.color || 'var(--ink-1)' }}>
              {fmt.money(Number(k.val))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
            <span className="badge">{f === 'All' ? entries.length : entries.filter(e => matchesFilter(e.type, f)).length}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Ledger Entries</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            {withBalance.length} entries · immutable history
          </div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th className="num">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '32px 0' }}>No entries.</td></tr>
              )}
              {withBalance.map(e => {
                const meta = ENTRY_META[e.type] ?? { label: e.type, tone: 'default' as Tone }
                const amount = Number(e.amount)
                const positive = amount > 0
                return (
                  <tr key={e.id}>
                    <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmt.dateShort(e.created_at)}</td>
                    <td><Pill tone={meta.tone}>{meta.label}</Pill></td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{e.description ?? '—'}</div>
                      {(e.commission_id || e.reserve_id || e.payment_id) && (
                        <div style={{ fontSize: 11, color: 'var(--ink-4)' }} className="mono">
                          {e.commission_id && <span>commission/{e.commission_id.slice(0, 8)}</span>}
                          {e.reserve_id && <span>reserve/{e.reserve_id.slice(0, 8)}</span>}
                          {e.payment_id && <span>payment/{e.payment_id.slice(0, 8)}</span>}
                        </div>
                      )}
                    </td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: positive ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
                        {positive ? '+' : ''}{fmt.money(amount)}
                      </span>
                    </td>
                    <td className="num" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {fmt.money(e.runningBalance)}
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
