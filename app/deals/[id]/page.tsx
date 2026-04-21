'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { deals, commissions, agentById, funderById, contacts } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { useShell } from '@/components/shell/shell-provider'
import type { Deal } from '@/lib/data'

const TABS = ['Overview', 'Commissions', 'Contacts', 'Timeline']
const STATUS_OPTIONS = ['Active', 'Closing', 'Pending', 'Declined', 'Paid off']
const STAGE_OPTIONS  = ['Application', 'Term Sheet', 'Underwriting', 'Docs Signed', 'Funded']

type TimelineEvent = { id: string; text: string; when: string; type: 'system' | 'note'; author?: string }

function RecordActionsMenu({ deal, router }: { deal: Deal; router: ReturnType<typeof useRouter> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const exportCSV = () => {
    const row = [deal.id, `"${deal.client}"`, deal.amount, deal.rate, deal.status, deal.funder].join(',')
    const blob = new Blob([`ID,Client,Amount,Rate,Status,Funder\n${row}`], { type: 'text/csv' })
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${deal.id}.csv` }).click()
    setOpen(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setOpen(false)
  }

  const shareEmail = () => {
    const subject = encodeURIComponent(`Deal ${deal.id}: ${deal.client}`)
    const body = encodeURIComponent(`Deal: ${deal.id}\nClient: ${deal.client}\nAmount: ${fmt.money(deal.amount)}\nStatus: ${deal.status}\nFunder: ${deal.funder}\n\nView: ${window.location.href}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
    setOpen(false)
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Deal ${deal.id} – ${deal.client}\n${fmt.money(deal.amount)} · ${deal.status}\n${window.location.href}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setOpen(false)
  }

  type MenuItem = null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }
  const items: MenuItem[] = [
    { label: 'Duplicate deal',     icon: Icons.Copy,     action: () => { alert('Duplicate — coming with backend'); setOpen(false) } },
    null,
    { label: 'Share via Email',    icon: Icons.Mail,     action: shareEmail },
    { label: 'Share via WhatsApp', icon: Icons.Phone,    action: shareWhatsApp },
    { label: 'Copy link',          icon: Icons.Link,     action: copyLink },
    null,
    { label: 'Print record',       icon: Icons.Print,    action: () => { window.print(); setOpen(false) } },
    { label: 'Export CSV',         icon: Icons.Download, action: exportCSV },
    { label: 'Export PDF',         icon: Icons.FileText, action: () => { alert('PDF export coming soon'); setOpen(false) } },
    null,
    { label: 'Delete deal',        icon: Icons.Trash,    action: () => { if (confirm('Delete this deal?')) router.push('/deals') }, danger: true },
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
                <button key={item.label} onClick={item.action} className={`record-menu-item${item.danger ? ' danger' : ''}`}>
                  <item.icon />{item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { openAgent } = useShell()
  const [tab, setTab] = useState('Overview')
  const [deal, setDeal] = useState<Deal | undefined>(deals.find(d => d.id === id))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Deal>>({})
  const [note, setNote] = useState('')
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])

  useEffect(() => {
    if (!deal) return
    const saved = localStorage.getItem(`deal-timeline-${deal.id}`)
    const base: TimelineEvent[] = [
      { id: 'ev1', text: `Deal created and assigned to ${deal.agents.map(a => agentById(a)?.name.split(' ')[0]).join(', ')}`, when: deal.closed !== '—' ? deal.closed : deal.createdAt, type: 'system' },
      { id: 'ev2', text: `Funder set to ${deal.funder}`, when: deal.closed !== '—' ? deal.closed : deal.createdAt, type: 'system' },
      { id: 'ev3', text: `Status: ${deal.status} · Stage: ${deal.stage}`, when: deal.updatedAt, type: 'system' },
    ]
    setTimeline(saved ? [...JSON.parse(saved), ...base] : base)
  }, [deal?.id])

  const saveNote = () => {
    if (!note.trim() || !deal) return
    const ev: TimelineEvent = { id: Date.now().toString(), text: note.trim(), when: new Date().toISOString().slice(0, 10), type: 'note', author: deal.updatedBy }
    const userNotes = timeline.filter(e => e.type === 'note')
    const updated = [ev, ...userNotes]
    localStorage.setItem(`deal-timeline-${deal.id}`, JSON.stringify(updated))
    setTimeline(prev => [ev, ...prev])
    setNote('')
  }

  const update = (field: keyof Deal, val: string) => setDeal(prev => prev ? { ...prev, [field]: val } : prev)

  const startEdit = () => {
    setDraft({ client: deal?.client, industry: deal?.industry, productType: deal?.productType, stage: deal?.stage })
    setEditing(true)
  }
  const saveEdit = () => {
    if (deal) {
      setDeal({ ...deal, ...draft as Deal, updatedAt: new Date().toISOString(), updatedBy: 'Noam Harel' })
      setEditing(false)
    }
  }
  const cancelEdit = () => setEditing(false)

  if (!deal) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Deal not found.</p>
      <Link href="/deals" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>← Back to deals</Link>
    </div>
  )

  const dealComms    = commissions.filter(c => c.dealId === deal.id)
  const dealContacts = contacts.filter(c => c.clientId === deal.clientId)
  const funder       = funderById(deal.funderId)
  const totalComm    = dealComms.reduce((a, c) => a + c.value, 0)

  const tabBadge = (t: string) => {
    if (t === 'Commissions') return dealComms.length
    if (t === 'Contacts') return dealContacts.length
    if (t === 'Timeline') return timeline.filter(e => e.type === 'note').length || undefined
    return undefined
  }

  const relTime = fmt.relTime(deal.updatedAt)

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/deals" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Deals</Link>
        <span>/</span><span style={{ color: 'var(--ink-1)' }}>{deal.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{deal.client}</h1>
            <StatusPill status={deal.status} />
            <span className="chip">{deal.productType}</span>
            <span className="chip">{deal.stage}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{deal.id}</span>
            {deal.closed !== '—' && <span>Closed {fmt.dateShort(deal.closed)}</span>}
            {deal.maturity !== '—' && <span>Matures {fmt.dateShort(deal.maturity)}</span>}
            <span>{deal.funder}</span>
          </div>
        </div>
        <div className="actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Status:</span>
            <select value={deal.status} onChange={e => update('status', e.target.value)}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <RecordActionsMenu deal={deal} router={router} />
          <button className="close-btn" onClick={() => router.push('/deals')}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Deal amount', val: fmt.money(deal.amount), sub: `${deal.term} month term` },
          { label: 'Interest rate', val: fmt.pct(deal.rate), sub: deal.productType },
          { label: 'Commissions', val: fmt.money(totalComm), sub: `${dealComms.length} records`, onClick: () => setTab('Commissions') },
          { label: 'Contacts', val: String(dealContacts.length), sub: deal.client, onClick: () => setTab('Contacts') },
        ].map((k, i) => (
          <div key={i} className="kpi" onClick={k.onClick} style={{ cursor: k.onClick ? 'pointer' : 'default' }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
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

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>

          {/* Deal fields — card-editing class highlights entire card when editing */}
          <div className={`card${editing ? ' card-editing' : ''}`}>
            <div className="card-head">
              <h3>
                Deal details
                {editing && <span className="edit-badge"><Icons.Edit style={{ width: 10, height: 10 }} /> Editing</span>}
              </h3>
              <div className="actions">
                {editing
                  ? <>
                      <button className="btn sm" onClick={cancelEdit}>Cancel</button>
                      <button className="btn sm primary" onClick={saveEdit}>Save changes</button>
                    </>
                  : <button className="btn sm ghost" onClick={startEdit}><Icons.Edit /> Edit</button>
                }
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                {[
                  { label: 'Deal ID',    value: deal.id,          field: null },
                  { label: 'Client',     value: deal.client,      field: 'client' as keyof Deal },
                  { label: 'Industry',   value: deal.industry,    field: 'industry' as keyof Deal },
                  { label: 'Product',    value: deal.productType, field: 'productType' as keyof Deal },
                  { label: 'Amount',     value: fmt.money(deal.amount), field: null },
                  { label: 'Rate',       value: fmt.pct(deal.rate),     field: null },
                  { label: 'Term',       value: `${deal.term} months`,  field: null },
                  { label: 'Stage',      value: deal.stage,             field: 'stage' as keyof Deal },
                  { label: 'Closed',     value: fmt.dateShort(deal.closed),  field: null },
                  { label: 'Maturity',   value: fmt.dateShort(deal.maturity), field: null },
                ].map((f, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    <div key={f.label} style={{ display: 'contents' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 12px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>{f.label}</div>
                      <div style={{ fontSize: 13, padding: '10px 20px 10px 0', borderBottom: isLast ? 'none' : '1px solid var(--line)', display: 'flex', alignItems: 'center' }}>
                        {editing && f.field ? (
                          f.field === 'stage' ? (
                            <select
                              value={(draft[f.field] ?? deal[f.field]) as string}
                              onChange={e => setDraft(d => ({ ...d, [f.field!]: e.target.value }))}
                              className="input" style={{ height: 30, fontSize: 12, width: '100%' }}>
                              {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <input
                              value={(draft[f.field] ?? deal[f.field]) as string}
                              onChange={e => setDraft(d => ({ ...d, [f.field!]: e.target.value }))}
                              className="input" style={{ height: 30, fontSize: 12, width: '100%' }} />
                          )
                        ) : (
                          <span style={{
                            fontWeight: f.label === 'Deal ID' ? 600 : 500,
                            color: f.label === 'Deal ID' ? 'var(--accent-ink)' : undefined,
                            fontFamily: f.label === 'Deal ID' ? 'var(--font-mono)' : undefined,
                          }}>
                            {f.value}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Audit footer */}
            <div className="audit-foot">
              <div className="audit-col">
                <span className="audit-lbl">Created</span>
                <span className="audit-val">{fmt.dateTime(deal.createdAt)}</span>
                <span className="audit-by">by <strong>{deal.createdBy}</strong></span>
              </div>
              <div className="audit-sep" />
              <div className="audit-col">
                <span className="audit-lbl">Last modified</span>
                <span className="audit-val">
                  {fmt.dateTime(deal.updatedAt)}
                  {relTime && <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}> · {relTime}</span>}
                </span>
                <span className="audit-by">by <strong>{deal.updatedBy}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Funder */}
            <div className="card">
              <div className="card-head"><h3>Funder</h3><Link href="/funders" className="btn sm ghost" style={{ fontSize: 11 }}>View all <Icons.Chevron /></Link></div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `oklch(0.65 0.18 ${funder?.hue ?? 150})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{deal.funder.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{deal.funder}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{funder?.type} · {funder?.ticket}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{ label: 'Available', val: fmt.moneyK(funder?.avail ?? 0) }, { label: 'Ticket', val: funder?.ticket ?? '—' }].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-sunk)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>{s.label}</div>
                      <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agents — clickable rows open the agent drawer */}
            <div className="card">
              <div className="card-head">
                <h3>Agents <span className="badge" style={{ marginLeft: 4 }}>{deal.agents.length}</span></h3>
                <Link href="/agents" className="btn sm ghost" style={{ fontSize: 11 }}>View all <Icons.Chevron /></Link>
              </div>
              <div className="card-body flush">
                {deal.agents.map((aid, i) => {
                  const a = agentById(aid)
                  if (!a) return null
                  return (
                    <button
                      key={aid}
                      onClick={() => openAgent(a)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '11px 18px',
                        borderBottom: i < deal.agents.length - 1 ? '1px solid var(--line)' : 'none',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Avatar name={a.name} hue={a.hue} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.tier}</div>
                      </div>
                      <Pill tone={a.tier === 'Partner' ? 'accent' : a.tier === 'Senior' ? 'pos' : 'default'}>{a.tier}</Pill>
                      <Icons.Chevron style={{ width: 12, height: 12, color: 'var(--ink-4)' }} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMISSIONS ── */}
      {tab === 'Commissions' && (
        <div className="card">
          <div className="card-head">
            <div><h3>Commissions</h3><div className="sub">{dealComms.length} records · {fmt.money(totalComm)} total</div></div>
          </div>
          {dealComms.length === 0
            ? <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>No commissions recorded yet.</div>
            : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>ID</th><th>Source</th><th className="num">Rate</th><th className="num">Value</th><th>Splits</th><th>Period</th><th>Status</th><th>Paid on</th></tr>
                  </thead>
                  <tbody>
                    {dealComms.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }}>
                        <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{c.id}</span></td>
                        <td><span className="chip">{c.source}</span></td>
                        <td className="num">{c.pct}%</td>
                        <td className="num strong">{fmt.money(c.value)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {c.splits.map(s => {
                              const a = agentById(s.agentId)
                              return a ? (
                                <button key={s.agentId} onClick={() => openAgent(a)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  <Avatar name={a.name} hue={a.hue} size="sm" />
                                  <span style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>{a.name.split(' ')[0]} {s.pct}%</span>
                                </button>
                              ) : null
                            })}
                          </div>
                        </td>
                        <td className="muted">{c.period}</td>
                        <td><StatusPill status={c.status} /></td>
                        <td className="muted-num">{c.paidOn ? fmt.dateShort(c.paidOn) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 600 }}>
                      <td colSpan={3}>Total</td>
                      <td className="num">{fmt.money(totalComm)}</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── CONTACTS ── */}
      {tab === 'Contacts' && (
        <div className="card">
          <div className="card-head">
            <div><h3>Contacts</h3><div className="sub">{dealContacts.length} associated with {deal.client}</div></div>
            <Link href="/contacts" className="btn sm ghost">View all <Icons.Chevron /></Link>
          </div>
          {dealContacts.length === 0
            ? <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>No contacts linked to this client.</div>
            : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th></tr>
                  </thead>
                  <tbody>
                    {dealContacts.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={c.name} hue={(c.id.charCodeAt(c.id.length - 1) * 47) % 360} size="md" />
                            <span className="strong">{c.name}</span>
                          </div>
                        </td>
                        <td><span className="chip">{c.role}</span></td>
                        <td><a href={`mailto:${c.email}`} style={{ color: 'var(--accent-ink)', fontSize: 12, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{c.email}</a></td>
                        <td className="muted">{c.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === 'Timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
          {/* Note composer */}
          <div className="card">
            <div className="card-head"><h3>Add note</h3></div>
            <div className="note-composer" style={{ borderRadius: 0, border: 'none' }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note, call log, or update…"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
              />
              <div className="note-composer-foot">
                <span className="note-composer-hint">Press ⌘↵ to submit quickly</span>
                <button className="btn sm primary" onClick={saveNote} disabled={!note.trim()}>
                  Add note
                </button>
              </div>
            </div>
          </div>

          {/* Timeline events */}
          <div className="card">
            <div className="card-head"><h3>Timeline</h3><span className="sub" style={{ marginLeft: 'auto' }}>{timeline.length} events</span></div>
            <div className="card-body flush">
              {timeline.map((ev, i) => (
                <div key={ev.id} style={{ padding: '14px 18px', borderBottom: i < timeline.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: ev.type === 'note' ? 'var(--accent)' : 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ev.type === 'note'
                        ? <Icons.Edit style={{ width: 12, height: 12, color: '#fff' }} />
                        : <Icons.Check style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />}
                    </div>
                    {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--line)', minHeight: 16 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: ev.type === 'note' ? 500 : 400 }}>{ev.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, display: 'flex', gap: 8 }}>
                      <span>{fmt.dateShort(ev.when)}</span>
                      {ev.author && <><span>·</span><span>{ev.author}</span></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
