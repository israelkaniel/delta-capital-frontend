'use client'
import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { commStatusLabel, type DbCommission, type DbCommissionReserve, type DbAuditLog } from '@/lib/api'
import {
  useCommission, useEmailLogsByRelatedIds, useCommissionScopeAudits,
  invalidate, qk,
} from '@/lib/queries'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { TimelineRow, type TimelineRowAccent } from '@/components/ui/timeline-row'
import { ReserveModal } from '@/components/commissions/reserve-modal'
import { EmailLogPanel, emailToTimelineItem } from '@/components/email/email-log-panel'

type Mode = 'reserve' | 'release' | 'reverse'

const TABS = ['Overview', 'Timeline', 'Emails'] as const
type Tab = typeof TABS[number]

const auditIcon = (action: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (action === 'CREATE')   return Icons.Plus
  if (action === 'UPDATE')   return Icons.Edit
  if (action === 'RELEASE')  return Icons.Check
  if (action === 'REVERSE')  return Icons.X
  if (action === 'DELETE')   return Icons.Trash
  return Icons.Clock
}

const auditLabel = (a: DbAuditLog): string => {
  if (a.entity === 'commissions' && a.action === 'CREATE') {
    const total = (a.new_value as any)?.total_amount
    return total != null ? `Commission earned (${fmt.money(Number(total))})` : 'Commission created'
  }
  if (a.entity === 'commission_reserves' && a.action === 'CREATE') {
    const amt = (a.new_value as any)?.amount
    return amt != null ? `Placed ${fmt.money(Number(amt))} in reserve` : 'Reserve placed'
  }
  if (a.entity === 'commission_reserves' && a.action === 'RELEASE') return 'Reserve released'
  if (a.entity === 'commission_reserves' && a.action === 'REVERSE') {
    const amt = (a.new_value as any)?.amount
    return amt != null ? `Reserve reversed (${fmt.money(Number(amt))} permanently deducted)` : 'Reserve reversed'
  }
  return `${a.entity} · ${a.action}`
}

const auditAccent = (a: DbAuditLog): TimelineRowAccent => {
  if (a.action === 'RELEASE') return 'pos'
  if (a.action === 'REVERSE') return 'neg'
  if (a.action === 'CREATE')  return 'accent'
  return 'default'
}

const reserveStatusTone = (s: string): 'warn' | 'pos' | 'neg' | 'default' =>
  s === 'HELD' ? 'warn' : s === 'RELEASED' ? 'pos' : s === 'REVERSED' ? 'neg' : 'default'

export default function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const commQ = useCommission(id)
  const commission = commQ.data ?? null
  const loading = commQ.isLoading
  const error = commQ.error?.message ?? null
  const fetchCommission = () => qc.invalidateQueries({ queryKey: qk.commissions.detail(id) })

  const [modal, setModal] = useState<{ mode: Mode; reserve?: DbCommissionReserve } | null>(null)
  const [tab, setTab] = useState<Tab>('Overview')

  const reserveIds = useMemo(
    () => (commission?.commission_reserves ?? []).map(r => r.id),
    [commission],
  )
  const relatedIds = useMemo(
    () => commission ? [commission.id, ...reserveIds] : [],
    [commission, reserveIds],
  )

  const emailsQ = useEmailLogsByRelatedIds(relatedIds, tab !== 'Overview' && relatedIds.length > 0)
  const auditsQ = useCommissionScopeAudits(commission?.id ?? '', reserveIds, tab === 'Timeline')

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

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => {
          const badge = t === 'Emails' ? emailsQ.data?.length : undefined
          return (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}{badge != null && badge > 0 && <span className="badge" style={{ marginLeft: 6 }}>{badge}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'Emails' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Emails</h3>
              <div className="sub">Notifications sent for this commission and its reserves</div>
            </div>
          </div>
          <div className="card-body flush">
            <EmailLogPanel
              logs={emailsQ.data ?? []}
              loading={emailsQ.isLoading}
              error={emailsQ.error ? (emailsQ.error as Error).message : null}
              emptyMessage="No emails sent for this commission yet."
            />
          </div>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="card-head">
            <h3>Activity</h3>
            <div className="sub">Audit events and email notifications for this commission</div>
          </div>
          <div className="card-body flush">
            {(auditsQ.isLoading || emailsQ.isLoading) ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
            ) : (() => {
              const audits = auditsQ.data ?? []
              const emails = emailsQ.data ?? []
              type Item = {
                id: string; ts: string; kind: 'audit' | 'email'
                audit?: DbAuditLog; emailItem?: ReturnType<typeof emailToTimelineItem>
              }
              const items: Item[] = [
                ...audits.map(a => ({ id: 'a-' + a.id, ts: a.created_at, kind: 'audit' as const, audit: a })),
                ...emails.map(e => {
                  const it = emailToTimelineItem(e)
                  return { id: it.id, ts: it.ts, kind: 'email' as const, emailItem: it }
                }),
              ].sort((a, b) => b.ts.localeCompare(a.ts))

              if (items.length === 0) return (
                <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                  No activity yet.
                </div>
              )

              return items.map((it, i) => {
                const last = i === items.length - 1
                if (it.kind === 'audit' && it.audit) {
                  const a = it.audit
                  return (
                    <TimelineRow
                      key={it.id} last={last}
                      accent={auditAccent(a)}
                      Icon={auditIcon(a.action)}
                      title={auditLabel(a)}
                      ts={a.created_at}
                      author={a.profiles?.name}
                    />
                  )
                }
                if (it.kind === 'email' && it.emailItem) {
                  const e = it.emailItem
                  return (
                    <TimelineRow
                      key={it.id} last={last}
                      accent={e.accent}
                      Icon={Icons.Mail}
                      title={e.title}
                      ts={e.ts}
                      body={e.body}
                    />
                  )
                }
                return null
              })
            })()}
          </div>
        </div>
      )}

      {tab === 'Overview' && (
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
      )}

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
