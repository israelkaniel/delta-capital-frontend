'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, dealStatusLabel, commStatusLabel, type DbDeal, type DbCommission } from '@/lib/api'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { DealStatusModal } from '@/components/deals/status-modal'

const TABS = ['Overview', 'Commissions', 'Contacts'] as const
type Tab = typeof TABS[number]

type DealFull = DbDeal & {
  accounts?: DbDeal['accounts'] & { contacts?: { id: string; name: string; email?: string; phone?: string }[] }
  commissions?: DbCommission[]
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Overview')

  const [deal, setDeal] = useState<DealFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const res = await api.deals.get(id)
    if (res.error) { setError(res.error.message); setLoading(false); return }
    setDeal(res.data as DealFull)
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const totalCommissions = useMemo(() => {
    return (deal?.commissions ?? []).reduce((s, c) => s + Number(c.total_amount), 0)
  }, [deal])

  const saveNotes = async () => {
    if (notesDraft === null || !deal) return
    setSavingNotes(true)
    const res = await api.deals.update(deal.id, { notes: notesDraft })
    setSavingNotes(false)
    if (res.error) { alert(res.error.message); return }
    setNotesDraft(null)
    refresh()
  }

  if (loading) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>Loading deal…</div>
  )

  if (error || !deal) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Deal not found.'}</p>
      <Link href="/deals" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to deals</Link>
    </div>
  )

  const account = deal.accounts
  const funder  = deal.funders
  const dealAgents = deal.deal_agents ?? []
  const commissions = deal.commissions ?? []
  const contactsList = (account as any)?.contacts ?? []

  const tabBadge = (t: Tab) => {
    if (t === 'Commissions') return commissions.length
    if (t === 'Contacts') return contactsList.length
    return undefined
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/deals" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Deals</Link>
        <span>/</span>
        <span className="mono" style={{ color: 'var(--ink-1)' }}>{deal.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{account?.name ?? 'Deal'}</h1>
            <StatusPill status={dealStatusLabel(deal.status)} />
            {funder && <span className="chip">{funder.name}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{deal.id.slice(0, 8)}</span>
            {deal.funds_transferred_at && <span>Funded {fmt.dateShort(deal.funds_transferred_at)}</span>}
            {deal.external_id && <span>SF: {deal.external_id}</span>}
            <span>Created {fmt.dateShort(deal.created_at)}</span>
          </div>
        </div>
        <div className="actions">
          <button className="btn sm primary" onClick={() => setStatusOpen(true)}>
            <Icons.Edit style={{ width: 13, height: 13 }} /> Update status
          </button>
          <button className="close-btn" onClick={() => router.push('/deals')}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Transferred</div>
          <div className="kpi-val">{deal.transferred_amount ? fmt.money(Number(deal.transferred_amount)) : '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>amount disbursed</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Payback</div>
          <div className="kpi-val">{deal.payback_amount ? fmt.money(Number(deal.payback_amount)) : '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>total repayment</div>
        </div>
        <div className="kpi" style={{ cursor: 'pointer' }} onClick={() => setTab('Commissions')}>
          <div className="kpi-label">Commissions</div>
          <div className="kpi-val">{fmt.money(totalCommissions)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{commissions.length} record{commissions.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Agents</div>
          <div className="kpi-val">{dealAgents.length}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>assigned to this deal</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => {
          const badge = tabBadge(t)
          return (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}{badge != null && <span className="badge">{badge}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Deal details</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                {([
                  { label: 'Deal ID',     value: deal.id.slice(0, 8), mono: true, accent: true },
                  { label: 'Client',      value: account?.name ?? '—', link: account ? `/clients/${account.id}` : undefined },
                  { label: 'Funder',      value: funder?.name ?? '—',  link: funder ? `/funders/${funder.id}` : undefined },
                  { label: 'Base',        value: funder?.commission_base === 'PAYBACK_AMOUNT' ? 'Payback amount' : 'Transferred amount' },
                  { label: 'Transferred', value: deal.transferred_amount ? fmt.money(Number(deal.transferred_amount)) : '—', bold: true },
                  { label: 'Payback',     value: deal.payback_amount ? fmt.money(Number(deal.payback_amount)) : '—' },
                  { label: 'Funded on',   value: deal.funds_transferred_at ? fmt.date(deal.funds_transferred_at) : '—' },
                  { label: 'External ID', value: deal.external_id ?? '—', mono: !!deal.external_id },
                  { label: 'Status',      pill: dealStatusLabel(deal.status) },
                ] as const).map((f, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    <div key={f.label} style={{ display: 'contents' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 12px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>{f.label}</div>
                      <div style={{ fontSize: 13, padding: '12px 20px 12px 0', borderBottom: isLast ? 'none' : '1px solid var(--line)', display: 'flex', alignItems: 'center' }}>
                        {'pill' in f ? (
                          <StatusPill status={String(f.pill)} />
                        ) : 'link' in f && f.link ? (
                          <Link href={f.link} style={{
                            color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 500,
                          }}>{f.value}</Link>
                        ) : (
                          <span style={{
                            fontWeight: 'bold' in f && f.bold ? 600 : 500,
                            color: 'accent' in f && f.accent ? 'var(--accent-ink)' : undefined,
                            fontFamily: 'mono' in f && f.mono ? 'var(--font-mono)' : undefined,
                          }}>{'value' in f ? f.value : ''}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <h3>Agents <span className="badge" style={{ marginLeft: 4 }}>{dealAgents.length}</span></h3>
                <Link href="/agents" className="btn sm ghost" style={{ fontSize: 11 }}>View all <Icons.Chevron /></Link>
              </div>
              <div className="card-body flush">
                {dealAgents.length === 0 ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                    No agents assigned to this deal.
                  </div>
                ) : dealAgents.map((da, i) => {
                  const a = da.agents
                  const name = a?.profiles?.name ?? a?.code ?? da.agent_id.slice(0, 8)
                  const hue = (da.agent_id.charCodeAt(0) * 37) % 360
                  return (
                    <Link key={da.id} href={`/agents/${da.agent_id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 18px', textDecoration: 'none', color: 'inherit',
                      borderBottom: i < dealAgents.length - 1 ? '1px solid var(--line)' : 'none',
                    }}>
                      <Avatar name={name} hue={hue} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                        {a?.code && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }} className="mono">{a.code}</div>}
                      </div>
                      <Pill tone="accent">{da.share}%</Pill>
                      <Icons.Chevron style={{ width: 12, height: 12, color: 'var(--ink-4)' }} />
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Notes</h3>
                {notesDraft !== null ? (
                  <div className="actions">
                    <button className="btn sm" onClick={() => setNotesDraft(null)} disabled={savingNotes}>Cancel</button>
                    <button className="btn sm primary" onClick={saveNotes} disabled={savingNotes}>{savingNotes ? 'Saving…' : 'Save'}</button>
                  </div>
                ) : (
                  <button className="btn sm ghost" onClick={() => setNotesDraft(deal.notes ?? '')}>
                    <Icons.Edit /> Edit
                  </button>
                )}
              </div>
              <div className="card-body">
                {notesDraft !== null ? (
                  <textarea
                    className="input"
                    rows={4}
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                ) : (
                  <p style={{
                    margin: 0, fontSize: 13, color: deal.notes ? 'var(--ink-2)' : 'var(--ink-4)',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}>{deal.notes || 'No notes.'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Commissions' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Commissions</h3>
              <div className="sub">{commissions.length} record{commissions.length !== 1 ? 's' : ''} · {fmt.money(totalCommissions)} total</div>
            </div>
          </div>
          {commissions.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              {deal.status === 'FUNDS_TRANSFERRED' ? 'No commissions recorded.' : 'Commissions are calculated when the deal is marked as funded.'}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Commission ID</th>
                    <th className="num">Base</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                    <th className="num">Reserved</th>
                    <th>Status</th>
                    <th>Calculated</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/commissions/${c.id}`)}>
                      <td><span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600, fontSize: 12 }}>{c.id.slice(0, 8)}</span></td>
                      <td className="num">{fmt.money(Number(c.base_amount))}</td>
                      <td className="num">{fmt.pct(Number(c.rate))}</td>
                      <td className="num strong">{fmt.money(Number(c.total_amount))}</td>
                      <td className="num">{Number(c.reserved_amount) > 0 ? fmt.money(Number(c.reserved_amount)) : '—'}</td>
                      <td><StatusPill status={commStatusLabel(c.status)} /></td>
                      <td className="muted-num">{fmt.dateShort(c.calculated_at)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td colSpan={3}>Total</td>
                    <td className="num">{fmt.money(totalCommissions)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Contacts' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Contacts</h3>
              <div className="sub">{contactsList.length} associated with {account?.name}</div>
            </div>
            {account && (
              <Link href={`/clients/${account.id}`} className="btn sm ghost">Manage <Icons.Chevron /></Link>
            )}
          </div>
          {contactsList.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              No contacts on this account.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {contactsList.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={c.name} hue={(c.id.charCodeAt(c.id.length - 1) * 47) % 360} size="md" />
                          <span className="strong">{c.name}</span>
                        </div>
                      </td>
                      <td>{c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-ink)', fontSize: 12, textDecoration: 'none' }}>{c.email}</a> : <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                      <td className="muted">{c.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <DealStatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        deal={deal}
        onDone={refresh}
      />
    </div>
  )
}
