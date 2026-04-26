'use client'
import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import {
  api, dealStatusLabel, commStatusLabel,
  type DbDeal, type DbCommission, type DbDealNote, type DbAuditLog,
} from '@/lib/api'
import { useDeal, useDealNotes, useDealTimeline, invalidate, qk } from '@/lib/queries'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast/toast'
import { useUserRole } from '@/lib/use-user-role'
import { DealStatusModal } from '@/components/deals/status-modal'
import { EditDealModal } from '@/components/deals/edit-deal-modal'
import { ManageAgentsModal } from '@/components/deals/manage-agents-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ActionsMenu, type ActionItem } from '@/components/ui/actions-menu'
import { AuditFooter } from '@/components/ui/audit-footer'
import { TimelineRow } from '@/components/ui/timeline-row'

const TABS = ['Overview', 'Commissions', 'Notes', 'Timeline', 'Contacts'] as const
type Tab = typeof TABS[number]

type DealFull = DbDeal & {
  accounts?: DbDeal['accounts'] & { contacts?: { id: string; name: string; email?: string; phone?: string }[] }
  commissions?: DbCommission[]
}

const auditIcon = (action: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (action === 'CREATE')        return Icons.Plus
  if (action === 'UPDATE')        return Icons.Edit
  if (action === 'STATUS_CHANGE') return Icons.Sparkles
  if (action === 'DELETE')        return Icons.Trash
  if (action === 'CLOSE')         return Icons.Check
  return Icons.Clock
}

const auditLabel = (a: DbAuditLog): string => {
  if (a.entity === 'deals' && a.action === 'CREATE')        return 'Deal created'
  if (a.entity === 'deals' && a.action === 'UPDATE')        return 'Deal details updated'
  if (a.entity === 'deals' && a.action === 'STATUS_CHANGE') {
    const from = (a.prev_value as any)?.status ?? '?'
    const to   = (a.new_value  as any)?.status ?? '?'
    return `Status: ${from} → ${to}`
  }
  if (a.entity === 'deals' && a.action === 'DELETE')        return 'Deal deleted'
  if (a.entity === 'deal_notes' && a.action === 'CREATE')   return 'Note added'
  if (a.entity === 'deal_notes' && a.action === 'DELETE')   return 'Note removed'
  if (a.entity === 'commissions' && a.action === 'CREATE') {
    const total = (a.new_value as any)?.total_amount
    return total != null ? `Commission earned (${fmt.money(Number(total))})` : 'Commission created'
  }
  return `${a.entity} · ${a.action}`
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const role = useUserRole()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('Overview')

  const dealQ     = useDeal(id)
  const notesQ    = useDealNotes(id, tab === 'Notes')
  const timelineQ = useDealTimeline(id, tab === 'Timeline')

  const deal     = (dealQ.data as DealFull | null | undefined) ?? null
  const loading  = dealQ.isLoading
  const error    = dealQ.error?.message ?? null
  const notes    = notesQ.data ?? []
  const timeline = timelineQ.data ?? null
  const timelineLoading = timelineQ.isLoading

  const refresh = () => invalidate.deal(qc, id)
  const refreshNotes = () => qc.invalidateQueries({ queryKey: qk.deals.notes(id) })

  const [statusOpen, setStatusOpen] = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const noteMutation = useMutation({
    mutationFn: (body: string) => api.deals.notes.create(id, body).then(r => { if (r.error) throw r.error; return r.data }),
    onSuccess: () => {
      setNoteDraft('')
      toast.success('Note added')
      qc.invalidateQueries({ queryKey: qk.deals.notes(id) })
      qc.invalidateQueries({ queryKey: qk.deals.timeline(id) })
    },
    onError: (e: Error) => toast.error('Note failed', e.message),
  })
  const noteSaving = noteMutation.isPending

  const totalCommissions = useMemo(
    () => (deal?.commissions ?? []).reduce((s, c) => s + Number(c.total_amount), 0),
    [deal],
  )

  const addNote = () => {
    const body = noteDraft.trim()
    if (!body) return
    noteMutation.mutate(body)
  }

  const removeNote = async (noteId: string) => {
    if (!confirm('Remove this note?')) return
    const res = await api.deals.notes.delete(id, noteId)
    if (res.error) { toast.error('Delete failed', res.error.message); return }
    toast.success('Note removed')
    refreshNotes()
  }

  const handleDeleteDeal = async () => {
    const res = await api.deals.delete(id)
    if (res.error) { toast.error('Delete failed', res.error.message); return }
    toast.success('Deal deleted')
    invalidate.deals(qc)
    router.push('/deals')
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

  const account     = deal.accounts
  const funder      = deal.funders
  const dealAgents  = deal.deal_agents ?? []
  const commissions = deal.commissions ?? []
  const contactsList = (account as any)?.contacts ?? []
  const canDelete = role === 'ADMIN'

  const tabBadge = (t: Tab): number | undefined => {
    if (t === 'Commissions') return commissions.length
    if (t === 'Contacts')    return contactsList.length
    if (t === 'Notes')       return notes.length || undefined
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
            <Icons.Sparkles style={{ width: 13, height: 13 }} /> Update status
          </button>
          <ActionsMenu
            label="Actions"
            items={[
              { kind: 'item', label: 'Edit deal',      icon: Icons.Edit,    onClick: () => setEditOpen(true) },
              { kind: 'item', label: 'Manage agents',  icon: Icons.People,  onClick: () => setAgentsOpen(true) },
              { kind: 'item', label: 'Update status',  icon: Icons.Sparkles, onClick: () => setStatusOpen(true) },
              { kind: 'sep' },
              { kind: 'item', label: 'Print',          icon: Icons.Print,   onClick: () => window.print() },
              { kind: 'item', label: 'Copy link',      icon: Icons.Link,    onClick: () => navigator.clipboard.writeText(window.location.href).then(() => toast.info('Link copied')) },
              ...(canDelete ? [
                { kind: 'sep' as const },
                { kind: 'item' as const, label: 'Delete deal…', icon: Icons.Trash, onClick: () => setConfirmDelete(true), tone: 'danger' as const },
              ] : []),
            ] satisfies ActionItem[]}
          />
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
                          <Link href={f.link} style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 500 }}>{f.value}</Link>
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
            <AuditFooter
              createdAt={deal.created_at}
              updatedAt={deal.updated_at}
              createdBy={deal.creator}
              updatedBy={deal.updater}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <h3>Agents <span className="badge" style={{ marginLeft: 4 }}>{dealAgents.length}</span></h3>
                <button className="btn sm ghost" onClick={() => setAgentsOpen(true)}>
                  <Icons.Plus /> Manage
                </button>
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

            {deal.notes && (
              <div className="card">
                <div className="card-head">
                  <h3>Inline notes</h3>
                  <button className="btn sm ghost" onClick={() => setEditOpen(true)}>
                    <Icons.Edit /> Edit
                  </button>
                </div>
                <div className="card-body">
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{deal.notes}</p>
                </div>
              </div>
            )}
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
              {deal.status === 'FUNDS_TRANSFERRED'
                ? 'No commissions recorded. The funder may be missing an active commission rule.'
                : 'Commissions are calculated when the deal is marked as funded.'}
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

      {tab === 'Notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
          <div className="card">
            <div className="card-head"><h3>Add a note</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                className="input"
                rows={3}
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="Add a note, call log, or update… (Ctrl+Enter to save)"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{noteDraft.length} characters</span>
                <button className="btn sm primary" onClick={addNote} disabled={!noteDraft.trim() || noteSaving}>
                  {noteSaving ? 'Adding…' : 'Add note'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Notes <span className="badge" style={{ marginLeft: 4 }}>{notes.length}</span></h3>
            </div>
            <div className="card-body flush">
              {notes.length === 0 ? (
                <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                  No notes yet — add the first one above.
                </div>
              ) : notes.map((n, i) => {
                const author = n.profiles?.name ?? '—'
                const hue = (n.created_by.charCodeAt(0) * 47) % 360
                return (
                  <div key={n.id} style={{
                    display: 'flex', gap: 12,
                    padding: '14px 18px',
                    borderBottom: i < notes.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <Avatar name={author} hue={hue} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{author}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 8 }}>
                            {fmt.dateTime(n.created_at)} · {fmt.relTime(n.created_at)}
                          </span>
                        </div>
                        <button
                          className="btn sm ghost"
                          onClick={() => removeNote(n.id)}
                          style={{ padding: '2px 6px', color: 'var(--ink-4)' }}
                          aria-label="Remove note"
                        >
                          <Icons.Trash style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="card-head">
            <h3>Activity</h3>
            <div className="sub">Full history of changes, status updates, notes, and commissions</div>
          </div>
          <div className="card-body flush">
            {timelineLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
            ) : (() => {
              const audits = timeline?.audits ?? []
              const tlNotes = timeline?.notes ?? []
              type Item = { id: string; ts: string; kind: 'audit' | 'note'; audit?: DbAuditLog; note?: DbDealNote }
              const items: Item[] = [
                ...audits.map(a => ({ id: 'a-' + a.id, ts: a.created_at, kind: 'audit' as const, audit: a })),
                ...tlNotes.map(n => ({ id: 'n-' + n.id, ts: n.created_at, kind: 'note' as const, note: n })),
              ].sort((a, b) => b.ts.localeCompare(a.ts))

              if (items.length === 0) return (
                <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                  No activity recorded yet.
                </div>
              )

              return items.map((it, i) => {
                const last = i === items.length - 1
                if (it.kind === 'note' && it.note) {
                  const author = it.note.profiles?.name ?? '—'
                  return (
                    <TimelineRow
                      key={it.id} last={last} accent="accent" Icon={Icons.Edit}
                      title={`Note by ${author}`}
                      ts={it.ts}
                      body={it.note.body}
                    />
                  )
                }
                if (it.kind === 'audit' && it.audit) {
                  const a = it.audit
                  const Icon = auditIcon(a.action)
                  return (
                    <TimelineRow
                      key={it.id} last={last}
                      accent={a.action === 'DELETE' ? 'neg' : a.action === 'STATUS_CHANGE' ? 'pos' : 'default'}
                      Icon={Icon}
                      title={auditLabel(a)}
                      ts={a.created_at}
                      author={a.profiles?.name}
                    />
                  )
                }
                return null
              })
            })()}
          </div>
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
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
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

      <DealStatusModal open={statusOpen}  onClose={() => setStatusOpen(false)} deal={deal} onDone={refresh} />
      <EditDealModal    open={editOpen}    onClose={() => setEditOpen(false)}   deal={deal} onDone={refresh} />
      <ManageAgentsModal open={agentsOpen} onClose={() => setAgentsOpen(false)} deal={deal} onDone={refresh} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteDeal}
        title="Delete this deal?"
        message={`Permanently delete this deal?\n\nAlso removed:\n• ${dealAgents.length} agent assignment${dealAgents.length === 1 ? '' : 's'}\n• ${commissions.length} commission record${commissions.length === 1 ? '' : 's'}\n• All reserves, ledger entries, deal notes, and contacts attached\n\nThis cannot be undone.`}
        confirmLabel="Yes, delete"
        tone="danger"
      />
    </div>
  )
}

