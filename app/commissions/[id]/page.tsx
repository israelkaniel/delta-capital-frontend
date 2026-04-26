'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, commStatusLabel, type DbCommission, type DbCommissionReserve } from '@/lib/api'
import { dbCommissions } from '@/lib/db'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { ReserveModal } from '@/components/commissions/reserve-modal'

type Mode = 'reserve' | 'release' | 'reverse'

const reserveStatusTone = (s: string): 'warn' | 'pos' | 'neg' | 'default' =>
  s === 'HELD' ? 'warn' : s === 'RELEASED' ? 'pos' : s === 'REVERSED' ? 'neg' : 'default'

export default function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [commission, setCommission] = useState<DbCommission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: Mode; reserve?: DbCommissionReserve } | null>(null)

  const fetchCommission = useCallback(async () => {
    const res = await dbCommissions.get(id)
    if (res.error) { setError(res.error.message); setLoading(false); return }
    setCommission(res.data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchCommission() }, [fetchCommission])

  if (loading) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>
      Loading commission…
    </div>
  )

  if (error || !commission) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Commission not found.'}</p>
      <Link href="/commissions" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Back to commissions
      </Link>
    </div>
  )

  const da    = commission.deal_agents
  const agent = da?.agents
  const deal  = da?.deals
  const account = deal?.accounts
  const funder  = deal?.funders
  const agentName = agent?.profiles?.name ?? agent?.code ?? '—'
  const reserves  = commission.commission_reserves ?? []
  const activeReserve = reserves.find(r => r.status === 'HELD')

  const available = Number(commission.released_amount)
  const canReserve = commission.status !== 'PAID' && commission.status !== 'REVERSED' && available > 0

  return (
    <div className="page wide" style={{ padding: '20px 28px 100px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/commissions" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Commissions</Link>
        <span>/</span>
        <span className="mono" style={{ color: 'var(--ink-1)' }}>{commission.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icons.Coin style={{ width: 22, height: 22, color: 'var(--accent-ink)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>Commission</h1>
              <StatusPill status={commStatusLabel(commission.status)} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{commission.id.slice(0, 8)}</span>
              {account && <span>{account.name}</span>}
              {funder && <span className="chip">{funder.name}</span>}
              <span>Calculated {fmt.date(commission.calculated_at)}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          {canReserve && (
            <button className="btn sm warn" onClick={() => setModal({ mode: 'reserve' })}>
              <Icons.Clock style={{ width: 13, height: 13 }} /> Place in reserve
            </button>
          )}
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Gross commission</div>
          <div className="kpi-val">{fmt.money(Number(commission.total_amount))}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            on base {fmt.money(Number(commission.base_amount))} · {fmt.pct(Number(commission.rate))}
          </div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Available</div>
          <div className="kpi-val" style={{ color: 'var(--pos)' }}>{fmt.money(Number(commission.released_amount))}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>payable to agent</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Reserved</div>
          <div className="kpi-val" style={{ color: Number(commission.reserved_amount) > 0 ? 'var(--warn)' : 'var(--ink-2)' }}>
            {fmt.money(Number(commission.reserved_amount))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            {reserves.filter(r => r.status === 'HELD').length} active hold{reserves.filter(r => r.status === 'HELD').length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Reversed</div>
          <div className="kpi-val" style={{ color: Number(commission.reversed_amount) > 0 ? 'var(--neg)' : 'var(--ink-2)' }}>
            {fmt.money(Number(commission.reversed_amount))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>permanently deducted</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left: Agent + Reserves */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Agent</h3>
                <div className="sub">Share {da?.share ?? 0}% · paid at {fmt.pct(Number(commission.rate))}</div>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={agentName} size="lg" hue={200} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{agentName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {agent?.code && <span className="mono">{agent.code}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt.money(Number(commission.total_amount))}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>total commission</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Reserve history</h3>
                <div className="sub">{reserves.length} entr{reserves.length === 1 ? 'y' : 'ies'}</div>
              </div>
            </div>
            <div className="card-body flush">
              {reserves.length === 0 ? (
                <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                  No reserves placed on this commission.
                </div>
              ) : (
                reserves.map((r, i) => (
                  <div key={r.id} style={{
                    padding: '14px 18px',
                    borderBottom: i < reserves.length - 1 ? '1px solid var(--line)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt.money(Number(r.amount))}</span>
                        <Pill tone={reserveStatusTone(r.status)} dot>{r.status}</Pill>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {r.reason ?? 'No reason given'} · {fmt.date(r.created_at)}
                      </div>
                    </div>
                    {r.status === 'HELD' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn sm success" onClick={() => setModal({ mode: 'release', reserve: r })}>
                          Release
                        </button>
                        <button className="btn sm danger" onClick={() => setModal({ mode: 'reverse', reserve: r })}>
                          Reverse
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Deal reference */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>Deal reference</h3>
              {deal && (
                <Link href={`/deals/${deal.id}`} className="btn sm ghost" style={{ fontSize: 11 }}>
                  Open deal <Icons.Chevron />
                </Link>
              )}
            </div>
            {!deal ? (
              <div className="card-body" style={{ color: 'var(--ink-4)', fontSize: 13 }}>Deal not found.</div>
            ) : (
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                  {([
                    { label: 'Deal ID',     value: deal.id.slice(0, 8), mono: true,  accent: true },
                    { label: 'Client',      value: account?.name ?? '—' },
                    { label: 'Funder',      value: funder?.name ?? '—' },
                    { label: 'Base',        value: funder?.commission_base === 'PAYBACK_AMOUNT' ? 'Payback' : 'Transferred' },
                    { label: 'Transferred', value: deal.transferred_amount ? fmt.money(Number(deal.transferred_amount)) : '—' },
                    { label: 'Payback',     value: deal.payback_amount ? fmt.money(Number(deal.payback_amount)) : '—' },
                    { label: 'Funded on',   value: deal.funds_transferred_at ? fmt.date(deal.funds_transferred_at) : '—' },
                    { label: 'Status',      pill: deal.status },
                  ] as const).map((f, i, arr) => {
                    const isLast = i === arr.length - 1
                    return (
                      <div key={f.label} style={{ display: 'contents' }}>
                        <div style={{
                          fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500,
                          padding: '11px 0 11px 18px',
                          borderBottom: isLast ? 'none' : '1px solid var(--line)',
                        }}>{f.label}</div>
                        <div style={{
                          fontSize: 13, padding: '11px 18px 11px 0',
                          borderBottom: isLast ? 'none' : '1px solid var(--line)',
                          fontFamily: 'mono' in f && f.mono ? 'var(--font-mono)' : undefined,
                          color: 'accent' in f && f.accent ? 'var(--accent-ink)' : undefined,
                          fontWeight: 500, display: 'flex', alignItems: 'center',
                        }}>
                          {'pill' in f ? <StatusPill status={String(f.pill)} /> : ('value' in f ? f.value : '')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {commission.notes && (
            <div className="card">
              <div className="card-head"><h3>Notes</h3></div>
              <div className="card-body">
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{commission.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ReserveModal
          mode={modal.mode}
          open
          onClose={() => setModal(null)}
          commission={commission}
          reserve={modal.reserve ?? activeReserve}
          onDone={fetchCommission}
        />
      )}
    </div>
  )
}
