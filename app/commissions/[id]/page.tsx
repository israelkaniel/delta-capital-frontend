'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { commissions, agentById, dealById } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'

function ActionsMenu({ commission }: { commission: { id: string; status: string } }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setOpen(false)
  }

  type MenuItem = null | {
    label: string
    icon: React.FC<React.SVGProps<SVGSVGElement>>
    action: () => void
  }
  const items: MenuItem[] = [
    ...(commission.status === 'Pending'
      ? [{ label: 'Approve', icon: Icons.Check, action: () => { alert('Approved — backend coming soon'); setOpen(false) } } as MenuItem]
      : []
    ),
    { label: 'Print',     icon: Icons.Print, action: () => { window.print(); setOpen(false) } },
    { label: 'Copy link', icon: Icons.Link,  action: copyLink },
  ]

  return (
    <div className="record-menu-wrap" ref={ref}>
      <button className="btn sm" onClick={() => setOpen(v => !v)}>
        Actions <Icons.ChevronDown style={{ width: 11, height: 11 }} />
      </button>
      {open && (
        <div className="record-menu">
          {items.map((item, i) =>
            item === null
              ? <div key={i} className="record-menu-divider" />
              : (
                <button key={item.label} onClick={item.action} className="record-menu-item">
                  <item.icon />{item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

export default function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const commission = commissions.find(c => c.id === id)

  if (!commission) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Commission not found.</p>
      <Link href="/commissions" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Back to commissions
      </Link>
    </div>
  )

  const deal = dealById(commission.dealId)
  const isPending = commission.status === 'Pending'

  return (
    <div className="page" style={{ padding: '20px 28px 100px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/commissions" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Commissions</Link>
        <span>/</span>
        <span style={{ color: 'var(--ink-1)' }}>{commission.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          {/* Icon circle */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icons.Coin style={{ width: 22, height: 22, color: 'var(--accent-ink)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{commission.id}</h1>
              <Pill tone="default">{fmt.monthLabel(commission.period)}</Pill>
              <StatusPill status={commission.status} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{commission.dealId}</span>
              {deal && <span>{deal.client}</span>}
              <span className="chip">{commission.source}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <ActionsMenu commission={commission} />
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI strip — 4 cols */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Gross value</div>
          <div className="kpi-val">{fmt.money(commission.value)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>on {fmt.money(commission.amount)}</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Rate</div>
          <div className="kpi-val">{fmt.pct(commission.pct)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>commission rate</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Source</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{commission.source}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>fee type</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Paid on</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>
            {commission.paidOn ? fmt.dateShort(commission.paidOn) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            {commission.paidOn ? 'payment date' : 'not yet paid'}
          </div>
        </div>
      </div>

      {/* 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: Split breakdown */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Split breakdown</h3>
              <div className="sub">{commission.splits.length} agent{commission.splits.length !== 1 ? 's' : ''} · {fmt.money(commission.value)} total</div>
            </div>
          </div>
          <div className="card-body flush">
            {commission.splits.map((split, i) => {
              const agent = agentById(split.agentId)
              const agentAmount = commission.value * (split.pct / 100)
              const isLast = i === commission.splits.length - 1

              return (
                <div
                  key={split.agentId}
                  style={{
                    padding: '16px 18px',
                    borderBottom: isLast ? 'none' : '1px solid var(--line)',
                  }}
                >
                  {/* Agent row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Avatar name={agent?.name} hue={agent?.hue} size="md" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{agent?.name ?? split.agentId}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {agent?.tier ?? '—'} · <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{split.agentId}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt.money(agentAmount)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{split.pct}% share</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ position: 'relative', height: 6, borderRadius: 4, background: 'var(--bg-sunk)', overflow: 'hidden' }}>
                    <div
                      className="progress"
                      style={{
                        position: 'absolute',
                        inset: '0 auto 0 0',
                        width: `${split.pct}%`,
                        borderRadius: 4,
                        background: `oklch(0.62 0.18 ${(agent?.hue ?? 220)})`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Deal reference card */}
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
              <div className="card-body" style={{ color: 'var(--ink-4)', fontSize: 13 }}>
                Deal {commission.dealId} not found.
              </div>
            ) : (
              <>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
                    {[
                      { label: 'Deal ID',  value: deal.id,              mono: true, accent: true },
                      { label: 'Client',   value: deal.client,          mono: false },
                      { label: 'Amount',   value: fmt.money(deal.amount), mono: false },
                      { label: 'Rate',     value: fmt.pct(deal.rate),   mono: false },
                      { label: 'Funder',   value: deal.funder,          mono: false },
                      { label: 'Status',   value: null,                 mono: false, pill: deal.status },
                    ].map((f, i, arr) => {
                      const isLast = i === arr.length - 1
                      return (
                        <div key={f.label} style={{ display: 'contents' }}>
                          <div style={{
                            fontSize: 11.5,
                            color: 'var(--ink-3)',
                            fontWeight: 500,
                            padding: '11px 0 11px 18px',
                            borderBottom: isLast ? 'none' : '1px solid var(--line)',
                          }}>
                            {f.label}
                          </div>
                          <div style={{
                            fontSize: 13,
                            padding: '11px 18px 11px 0',
                            borderBottom: isLast ? 'none' : '1px solid var(--line)',
                            fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                            color: f.accent ? 'var(--accent-ink)' : undefined,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                          }}>
                            {f.pill
                              ? <StatusPill status={f.pill} />
                              : f.value
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
                  <Link
                    href={`/deals/${deal.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--accent-ink)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Open full deal record <Icons.Chevron style={{ width: 12, height: 12 }} />
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Notes card — only if notes exist */}
          {commission.notes && (
            <div className="card">
              <div className="card-head"><h3>Notes</h3></div>
              <div className="card-body">
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  lineHeight: 1.6,
                  padding: '4px 0',
                }}>
                  {commission.notes}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Sticky footer — only when Pending */}
      {isPending && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 28px',
          background: 'var(--bg-elev)',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          zIndex: 50,
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)', marginRight: 4 }}>
            This commission is awaiting approval.
          </span>
          <button
            className="btn sm"
            style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }}
            onClick={() => alert('Reject — backend coming soon')}
          >
            Reject
          </button>
          <button
            className="btn sm primary"
            onClick={() => alert('Approve — backend coming soon')}
          >
            <Icons.Check style={{ width: 13, height: 13 }} /> Approve
          </button>
        </div>
      )}

    </div>
  )
}
