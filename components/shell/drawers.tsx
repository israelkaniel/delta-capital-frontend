'use client'
import { useState, useEffect, useRef } from 'react'
import { useShell } from './shell-provider'
import { Drawer, Modal } from '@/components/ui/drawer'
import { CommandPalette } from '@/components/ui/command-palette'
import { Icons } from '@/lib/icons'
import { Avatar, AvatarStack } from '@/components/ui/avatar'
import { StatusPill, Pill } from '@/components/ui/pill'
import { AreaChart } from '@/components/ui/charts'
import { fmt } from '@/lib/fmt'
import { agentById, dealById, funderById, deals, commissions, contacts, monthly, notifications, tasks, agents, clients, funders } from '@/lib/data'
import type { Deal, Commission, Agent, Client, Funder } from '@/lib/data'

// ─── Shared: Record Actions Dropdown ──────────────────────────────────────────
function DrawerMoreMenu({ items }: { items: Array<null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="record-menu-wrap" ref={ref}>
      <button className="btn sm ghost" onClick={() => setOpen(v => !v)} title="More actions">
        <Icons.MoreH />
      </button>
      {open && (
        <div className="record-menu">
          {items.map((item, i) =>
            item === null
              ? <div key={i} className="record-menu-divider" />
              : (
                <button key={item.label} onClick={() => { item.action(); setOpen(false) }} className={`record-menu-item${item.danger ? ' danger' : ''}`}>
                  <item.icon />{item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared: Audit Footer ──────────────────────────────────────────────────────
function AuditFoot({ createdAt, updatedAt, createdBy, updatedBy }: { createdAt?: string; updatedAt?: string; createdBy?: string; updatedBy?: string }) {
  if (!createdAt && !updatedAt) return null
  return (
    <div className="audit-foot">
      {createdAt && (
        <div className="audit-col">
          <span className="audit-lbl">Created</span>
          <span className="audit-val">{fmt.dateTime(createdAt)}</span>
          {createdBy && <span className="audit-by">by <strong>{createdBy}</strong></span>}
        </div>
      )}
      {createdAt && updatedAt && <div className="audit-sep" />}
      {updatedAt && (
        <div className="audit-col">
          <span className="audit-lbl">Last modified</span>
          <span className="audit-val">
            {fmt.dateTime(updatedAt)}
            {fmt.relTime(updatedAt) && <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}> · {fmt.relTime(updatedAt)}</span>}
          </span>
          {updatedBy && <span className="audit-by">by <strong>{updatedBy}</strong></span>}
        </div>
      )}
    </div>
  )
}

// ─── Deal Detail ───────────────────────────────────────────────────────────────
function DealDetail({ deal }: { deal: Deal }) {
  const [tab, setTab] = useState('overview')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<Array<{ id: string; text: string; when: string; author: string }>>([])
  const { closeDrawer, openAgent } = useShell()
  const relatedCommissions = commissions.filter(c => c.dealId === deal.id)
  const funder = funderById(deal.funderId)
  const stages = ['Application','Term Sheet','Credit Review','Underwriting','Docs Signed','Funded']
  const curStage = stages.indexOf(deal.stage)

  useEffect(() => {
    const saved = localStorage.getItem(`drawer-notes-${deal.id}`)
    if (saved) setNotes(JSON.parse(saved))
  }, [deal.id])

  const saveNote = () => {
    if (!note.trim()) return
    const n = { id: Date.now().toString(), text: note.trim(), when: new Date().toISOString().slice(0, 10), author: deal.updatedBy }
    const updated = [n, ...notes]
    localStorage.setItem(`drawer-notes-${deal.id}`, JSON.stringify(updated))
    setNotes(updated)
    setNote('')
  }

  const moreItems: Array<null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }> = [
    { label: 'Open full record', icon: Icons.Deal, action: () => { window.location.href = `/deals/${deal.id}` } },
    { label: 'Duplicate deal',   icon: Icons.Copy,     action: () => alert('Duplicate — coming with backend') },
    null,
    { label: 'Share via Email',  icon: Icons.Mail,     action: () => window.open(`mailto:?subject=Deal ${deal.id}&body=${encodeURIComponent(window.location.origin + '/deals/' + deal.id)}`) },
    { label: 'Copy link',        icon: Icons.Link,     action: () => navigator.clipboard.writeText(`${window.location.origin}/deals/${deal.id}`) },
    { label: 'Print',            icon: Icons.Print,    action: () => window.print() },
    { label: 'Export CSV',       icon: Icons.Download, action: () => {
      const row = [deal.id, `"${deal.client}"`, deal.amount, deal.rate, deal.status, deal.funder].join(',')
      const blob = new Blob([`ID,Client,Amount,Rate,Status,Funder\n${row}`], { type: 'text/csv' })
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${deal.id}.csv` }).click()
    }},
    null,
    { label: 'Delete deal',      icon: Icons.Trash,    action: () => { if (confirm('Delete this deal?')) closeDrawer() }, danger: true },
  ]

  return (
    <>
      <div className="drawer-head">
        <button className="close-btn" onClick={closeDrawer}><Icons.X /> Close</button>
        <div className="title" style={{ flex: 1 }}>
          <h2>{deal.client}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span className="id">{deal.id}</span>
            <StatusPill status={deal.status} />
            <span className="chip">{deal.productType}</span>
          </div>
        </div>
        <DrawerMoreMenu items={moreItems} />
      </div>

      <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)' }}>
        <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
          {['overview','commissions','documents','activity'].map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'commissions' && relatedCommissions.length > 0 && (
                <span className="chip" style={{ marginLeft: 6, height: 18, padding: '0 6px', fontSize: 10.5 }}>{relatedCommissions.length}</span>
              )}
              {t === 'activity' && notes.length > 0 && (
                <span className="chip" style={{ marginLeft: 6, height: 18, padding: '0 6px', fontSize: 10.5 }}>{notes.length}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-body" style={{ padding: 0 }}>
        {tab === 'overview' && (
          <div className="vstack" style={{ gap: 20, padding: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Stage</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {stages.map((s, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: 4, borderRadius: 2, background: i <= curStage ? 'var(--accent)' : 'var(--line)' }} />
                    <div style={{ fontSize: 11, fontWeight: i === curStage ? 600 : 400, color: i <= curStage ? 'var(--ink)' : 'var(--ink-4)', marginTop: 4 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Key terms</h3></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
                {[
                  { l: 'Principal', v: fmt.money(deal.amount) },
                  { l: 'Interest rate', v: fmt.pct(deal.rate) },
                  { l: 'Term', v: `${deal.term} months` },
                  { l: 'Closed on', v: fmt.date(deal.closed) },
                  { l: 'Maturity', v: fmt.date(deal.maturity) },
                  { l: 'Product', v: deal.productType },
                ].map(f => (
                  <div key={f.l}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{f.l}</div>
                    <div className="num" style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agents — clickable rows navigate to agent drawer */}
            <div className="card">
              <div className="card-head"><h3>Agents on deal</h3></div>
              <div className="card-body flush">
                {deal.agents.map((aid, i) => {
                  const a = agentById(aid)
                  const c = relatedCommissions[0]
                  const split = c?.splits.find(s => s.agentId === aid)
                  if (!a) return null
                  return (
                    <button
                      key={aid}
                      onClick={() => openAgent(a)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 18px',
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
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.tier} · {a.email}</div>
                      </div>
                      {split && <Pill tone="accent">{split.pct}% split</Pill>}
                      <Icons.Chevron style={{ width: 12, height: 12, color: 'var(--ink-4)' }} />
                    </button>
                  )
                })}
              </div>
            </div>

            <AuditFoot
              createdAt={deal.createdAt}
              updatedAt={deal.updatedAt}
              createdBy={deal.createdBy}
              updatedBy={deal.updatedBy}
            />
          </div>
        )}

        {tab === 'commissions' && (
          <div className="card" style={{ margin: 20 }}>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Commission</th><th>Period</th><th className="num">Gross</th><th>Source</th><th>Status</th></tr></thead>
                <tbody>
                  {relatedCommissions.map(c => (
                    <tr key={c.id}>
                      <td className="mono text-xs" style={{ color: 'var(--accent-ink)' }}>{c.id}</td>
                      <td className="muted">{fmt.monthLabel(c.period)}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{fmt.money(c.value)}</td>
                      <td><span className="chip">{c.source}</span></td>
                      <td><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="card" style={{ margin: 20 }}>
            <div className="card-body flush">
              {['Term Sheet v3.pdf','Credit Memo.pdf','Signed Loan Agreement.pdf','Personal Guarantee.pdf','UCC Filing.pdf'].map((d, i) => (
                <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icons.Doc style={{ color: 'var(--ink-3)' }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{d}</span>
                  <span className="text-xs muted-2 mono">1.2 MB</span>
                  <button className="btn sm"><Icons.Download /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Note composer */}
            <div className="note-composer">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note or activity log…"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
              />
              <div className="note-composer-foot">
                <span className="note-composer-hint">⌘↵ to submit</span>
                <button className="btn sm primary" onClick={saveNote} disabled={!note.trim()}>Add note</button>
              </div>
            </div>

            {/* User notes */}
            {notes.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {notes.map((n, i) => (
                  <div key={n.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{n.text}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{n.author} · {fmt.dateShort(n.when)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* System activity */}
            <div style={{ padding: '10px 20px 6px', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>System events</div>
            {[
              { t: 'Deal funded', w: 'Mar 18, 2026', by: 'Meridian ops' },
              { t: 'Docs signed by borrower', w: 'Mar 16, 2026', by: 'Samira Ghosh' },
              { t: 'Underwriting cleared', w: 'Mar 12, 2026', by: 'Credit committee' },
              { t: 'Term sheet accepted', w: 'Feb 24, 2026', by: 'Noam Harel' },
              { t: 'Application submitted', w: 'Feb 10, 2026', by: 'Ari Segal' },
            ].map((a, i) => (
              <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-5)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{a.t}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.by}</div>
                </div>
                <span className="text-xs muted-2 mono">{a.w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Commission Detail ─────────────────────────────────────────────────────────
function CommissionDetail({ commission }: { commission: Commission }) {
  const { closeDrawer } = useShell()
  const deal = dealById(commission.dealId)

  const approve = () => { alert(`Approved ${commission.id} · ${fmt.money(commission.value)}`); closeDrawer() }
  const reject  = () => { alert(`Rejected ${commission.id}`); closeDrawer() }

  const moreItems: Array<null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }> = [
    { label: 'Copy link',  icon: Icons.Link,     action: () => navigator.clipboard.writeText(window.location.href) },
    { label: 'Print',      icon: Icons.Print,    action: () => window.print() },
    { label: 'Export CSV', icon: Icons.Download, action: () => {} },
  ]

  return (
    <>
      <div className="drawer-head">
        <button className="close-btn" onClick={closeDrawer}><Icons.X /> Close</button>
        <div className="title">
          <h2>Commission {commission.id}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span className="id">{deal?.client} · {fmt.monthLabel(commission.period)}</span>
            <StatusPill status={commission.status} />
          </div>
        </div>
        <DrawerMoreMenu items={moreItems} />
      </div>
      <div className="drawer-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Gross commission</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--accent)' }}>{fmt.money(commission.value)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                <span className="num">{fmt.pct(commission.pct)}</span> of <span className="num">{fmt.money(commission.amount)}</span> funded
              </div>
            </div>
            <span className="chip" style={{ height: 28, padding: '0 12px' }}>{commission.source}-paid</span>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head"><h3>Split</h3></div>
          <div className="card-body flush">
            {commission.splits.map((s, i) => {
              const a = agentById(s.agentId)
              const amt = commission.value * (s.pct / 100)
              return (
                <div key={i} style={{ padding: '14px 18px', borderBottom: i < commission.splits.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Avatar name={a?.name} hue={a?.hue} size="md" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a?.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a?.tier}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontWeight: 500 }}>{fmt.money(amt)}</div>
                      <div className="text-xs muted-2 num">{s.pct}% share</div>
                    </div>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${s.pct}%`, background: `oklch(0.6 0.2 ${a?.hue ?? 200})` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {commission.notes && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><h3>Notes</h3></div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{commission.notes}</div>
          </div>
        )}

        {commission.status === 'Pending' && (
          <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: '14px 20px', display: 'flex', gap: 8 }}>
            <button className="btn danger" style={{ flex: 1 }} onClick={reject}><Icons.X /> Reject</button>
            <button className="btn primary" style={{ flex: 2 }} onClick={approve}><Icons.Check /> Approve {fmt.money(commission.value)}</button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Agent Detail ──────────────────────────────────────────────────────────────
function AgentDetail({ agent }: { agent: Agent }) {
  const { closeDrawer } = useShell()
  const agentDeals = deals.filter(d => d.agents.includes(agent.id))
  const agentCommissions = commissions.filter(c => c.splits.some(s => s.agentId === agent.id))
  const earned = agentCommissions.reduce((acc, c) => {
    const s = c.splits.find(ss => ss.agentId === agent.id)
    return acc + c.value * ((s?.pct ?? 0) / 100)
  }, 0)

  const moreItems: Array<null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }> = [
    { label: 'View full record', icon: Icons.Agent, action: () => { window.location.href = `/agents/${agent.id}` } },
    null,
    { label: 'Send email',  icon: Icons.Mail,  action: () => window.open(`mailto:${agent.email}`) },
    { label: 'Copy link',   icon: Icons.Link,  action: () => navigator.clipboard.writeText(`${window.location.origin}/agents/${agent.id}`) },
    { label: 'Print',       icon: Icons.Print, action: () => window.print() },
  ]

  return (
    <>
      <div className="drawer-head">
        <button className="close-btn" onClick={closeDrawer}><Icons.X /> Close</button>
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <Avatar name={agent.name} hue={agent.hue} size="lg" />
          <div>
            <h2>{agent.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontSize: 11.5, color: 'var(--ink-3)' }}>
              <span className="chip">{agent.tier}</span>
              <span>{agent.email}</span>
            </div>
          </div>
        </div>
        <DrawerMoreMenu items={moreItems} />
      </div>
      <div className="drawer-body">
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {[
            { l: 'Earned YTD', v: fmt.moneyK(earned) },
            { l: 'Deals YTD',  v: String(agent.deals) },
            { l: 'Volume sourced', v: fmt.moneyK(agentDeals.reduce((a, d) => a + d.amount, 0)) },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.l}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head"><h3>Deals</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Deal</th><th>Client</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {agentDeals.map(d => (
                  <tr key={d.id}>
                    <td className="mono text-xs" style={{ color: 'var(--accent-ink)' }}>{d.id}</td>
                    <td><span style={{ fontWeight: 500 }}>{d.client}</span></td>
                    <td className="num">{fmt.money(d.amount)}</td>
                    <td><StatusPill status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 4px' }}>
          <a href={`/agents/${agent.id}`} className="btn sm ghost" style={{ fontSize: 11.5 }}>
            View full record <Icons.Chevron style={{ width: 12, height: 12 }} />
          </a>
        </div>
        {agent.createdAt && (
          <AuditFoot
            createdAt={agent.createdAt}
            updatedAt={agent.updatedAt}
            createdBy={agent.createdBy}
            updatedBy={agent.updatedBy}
          />
        )}
      </div>
    </>
  )
}

// ─── Client Detail ─────────────────────────────────────────────────────────────
function ClientDetail({ client }: { client: Client }) {
  const { closeDrawer } = useShell()
  const cDeals = deals.filter(d => d.clientId === client.id)
  const cContacts = contacts.filter(c => c.clientId === client.id)

  const moreItems: Array<null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }> = [
    { label: 'Copy link', icon: Icons.Link,  action: () => navigator.clipboard.writeText(window.location.href) },
    { label: 'Print',     icon: Icons.Print, action: () => window.print() },
  ]

  return (
    <>
      <div className="drawer-head">
        <button className="close-btn" onClick={closeDrawer}><Icons.X /> Close</button>
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-sunk)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
            <Icons.Building />
          </div>
          <div>
            <h2>{client.company}</h2>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{client.id} · {client.sector}</div>
          </div>
        </div>
        <DrawerMoreMenu items={moreItems} />
      </div>
      <div className="drawer-body">
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {[
            { l: 'Total exposure', v: fmt.moneyK(client.exposure) },
            { l: 'Active deals', v: String(client.openDeals) },
            { l: 'Credit rating', v: client.rating },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.l}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head"><h3>Deals</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Deal</th><th>Product</th><th className="num">Amount</th><th>Funder</th><th>Status</th></tr></thead>
              <tbody>
                {cDeals.map(d => (
                  <tr key={d.id}>
                    <td className="mono text-xs" style={{ color: 'var(--accent-ink)' }}>{d.id}</td>
                    <td><span className="chip">{d.productType}</span></td>
                    <td className="num">{fmt.money(d.amount)}</td>
                    <td className="muted">{d.funder}</td>
                    <td><StatusPill status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {cContacts.length > 0 && (
          <div className="card">
            <div className="card-head"><h3>Contacts</h3></div>
            <div className="card-body flush">
              {cContacts.map((c, i) => (
                <div key={c.id} style={{ padding: '12px 18px', borderBottom: i < cContacts.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={c.name} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Funder Detail ─────────────────────────────────────────────────────────────
function FunderDetail({ funder }: { funder: Funder }) {
  const { closeDrawer } = useShell()
  const fDeals = deals.filter(d => d.funderId === funder.id)

  const moreItems: Array<null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void; danger?: boolean }> = [
    { label: 'Copy link', icon: Icons.Link,  action: () => navigator.clipboard.writeText(window.location.href) },
    { label: 'Print',     icon: Icons.Print, action: () => window.print() },
  ]

  return (
    <>
      <div className="drawer-head">
        <button className="close-btn" onClick={closeDrawer}><Icons.X /> Close</button>
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `oklch(0.95 0.04 ${funder.hue})`, color: `oklch(0.45 0.18 ${funder.hue})`, display: 'grid', placeItems: 'center' }}>
            <Icons.Bank />
          </div>
          <div>
            <h2>{funder.name}</h2>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{funder.type} · {funder.id}</div>
          </div>
        </div>
        <DrawerMoreMenu items={moreItems} />
      </div>
      <div className="drawer-body">
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {[
            { l: 'Available capital', v: fmt.moneyK(funder.avail), color: `oklch(0.5 0.18 ${funder.hue})` },
            { l: 'Ticket range', v: funder.ticket, color: undefined },
            { l: 'Placed volume', v: fmt.moneyK(fDeals.reduce((a, d) => a + d.amount, 0)), color: undefined },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.l}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>Deals placed</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Deal</th><th>Client</th><th className="num">Amount</th><th className="num">Rate</th><th>Closed</th></tr></thead>
              <tbody>
                {fDeals.map(d => (
                  <tr key={d.id}>
                    <td className="mono text-xs" style={{ color: 'var(--accent-ink)' }}>{d.id}</td>
                    <td><span style={{ fontWeight: 500 }}>{d.client}</span></td>
                    <td className="num">{fmt.money(d.amount)}</td>
                    <td className="num">{fmt.pct(d.rate)}</td>
                    <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {funder.createdAt && (
          <AuditFoot
            createdAt={funder.createdAt}
            updatedAt={funder.updatedAt}
            createdBy={funder.createdBy}
            updatedBy={funder.updatedBy}
          />
        )}
      </div>
    </>
  )
}

// ─── Notifications Panel ───────────────────────────────────────────────────────
function NotificationsPanel() {
  const { notifOpen, setNotifOpen } = useShell()
  return (
    <Drawer open={notifOpen} onClose={() => setNotifOpen(false)}>
      <div className="drawer-head">
        <button className="close-btn" onClick={() => setNotifOpen(false)}><Icons.X /> Close</button>
        <div className="title"><h2>Notifications</h2></div>
      </div>
      <div className="drawer-body" style={{ padding: 0 }}>
        {notifications.map((n, i) => (
          <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.unread ? 'var(--accent)' : 'var(--ink-5)', marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: n.unread ? 500 : 400 }}>{n.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{n.sub}</div>
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{n.when}</span>
          </div>
        ))}
      </div>
    </Drawer>
  )
}

// ─── New Deal Wizard ───────────────────────────────────────────────────────────
const PRODUCT_TYPES = ['Term Loan', 'Revolving', 'Working Cap', 'Equipment', 'Bridge', 'Other']
const INDUSTRIES    = ['Aerospace', 'Construction', 'Food & Bev', 'Healthcare', 'Logistics', 'Manufacturing', 'Media', 'Retail', 'Technology', 'Other']

const ORG_RULES = [
  { id: 'R-01', name: 'Standard Funder Fee',      condition: 'All deals',             rateLabel: '2.00%', rate: 2.00 },
  { id: 'R-02', name: 'Meridian Tiered Bonus',    condition: 'Meridian · deal > $2M', rateLabel: '+0.25%', rate: 0.25 },
  { id: 'R-05', name: 'Borrower Origination Fee', condition: 'In-house funded deals',  rateLabel: '3.00%', rate: 3.00 },
  { id: 'R-06', name: 'Bridge Deal Uplift',       condition: 'Product: Bridge',        rateLabel: '+0.50%', rate: 0.50 },
]

const FUNDER_RULES: Record<string, { name: string; rate: number; rateLabel: string; note: string }> = {
  'FN-01': { name: 'Meridian Premium Rate', rate: 2.25, rateLabel: '2.25%', note: 'Includes tiered bonus for deals >$2M' },
  'FN-02': { name: 'Harbor Lane Standard',  rate: 2.00, rateLabel: '2.00%', note: 'Standard rate, no bonuses' },
  'FN-05': { name: 'North Ridge Large Cap', rate: 1.75, rateLabel: '1.75%', note: 'Discounted rate for institutional deals >$5M' },
}

function SearchCombo<T extends { id: string }>({
  items, getLabel, getSub, placeholder, selected, onSelect,
}: {
  items: T[]; getLabel: (i: T) => string; getSub?: (i: T) => string
  placeholder: string; selected: T | null; onSelect: (i: T | null) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = items.filter(i => getLabel(i).toLowerCase().includes(q.toLowerCase()))

  if (selected) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1.5px solid var(--accent)', borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{getLabel(selected)}</div>
        {getSub && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{getSub(selected)}</div>}
      </div>
      <button className="btn sm ghost" style={{ padding: '2px 6px' }} onClick={() => onSelect(null)}><Icons.X /></button>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder={placeholder}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && filtered.length > 0 && (
        <div className="search-drop">
          {filtered.map(item => (
            <div key={item.id} className="search-drop-item" onMouseDown={() => { onSelect(item); setQ(''); setOpen(false) }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{getLabel(item)}</div>
              {getSub && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{getSub(item)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type DealDraft = {
  client: Client | null; productType: string; amount: string; rate: string
  term: string; industry: string; funder: Funder | null; fundingDate: string
  notes: string; commissionRuleId: string; splits: { agent: Agent; pct: string }[]
}

const EMPTY_DRAFT: DealDraft = {
  client: null, productType: '', amount: '', rate: '', term: '', industry: '',
  funder: null, fundingDate: '', notes: '', commissionRuleId: 'R-01', splits: [],
}

function NewDealWizard() {
  const { newDealOpen, setNewDealOpen } = useShell()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<DealDraft>(EMPTY_DRAFT)
  const [agentQ, setAgentQ] = useState('')
  const [agentOpen, setAgentOpen] = useState(false)

  const steps = ['Client & Product', 'Funder & Terms', 'Agents & Split', 'Review']

  const close = () => { setNewDealOpen(false); setStep(0); setDraft(EMPTY_DRAFT); setAgentQ('') }

  const funderRule = draft.funder ? FUNDER_RULES[draft.funder.id] ?? null : null
  const orgRule    = ORG_RULES.find(r => r.id === draft.commissionRuleId) ?? ORG_RULES[0]
  const commPct    = funderRule ? funderRule.rate : orgRule.rate
  const loanAmt    = parseFloat(draft.amount.replace(/,/g, '')) || 0
  const commAmt    = loanAmt * commPct / 100
  const splitTotal = draft.splits.reduce((acc, s) => acc + (parseFloat(s.pct) || 0), 0)
  const splitOk    = draft.splits.length > 0 && Math.abs(splitTotal - 100) < 0.01

  const availAgents = agents.filter(a => a.active && !draft.splits.find(s => s.agent.id === a.id) && a.name.toLowerCase().includes(agentQ.toLowerCase()))

  const addAgent = (a: Agent) => {
    const rem = Math.max(0, 100 - splitTotal)
    setDraft(d => ({ ...d, splits: [...d.splits, { agent: a, pct: String(rem) }] }))
    setAgentQ(''); setAgentOpen(false)
  }

  return (
    <Modal open={newDealOpen} onClose={close} wide>
      <div className="modal-head">
        <div style={{ flex: 1 }}>
          <h2>New Deal</h2>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>Step {step + 1} of {steps.length} — {steps[step]}</div>
        </div>
        <button className="close-btn" onClick={close}><Icons.X /> Close</button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--line)', marginBottom: 4 }} />
            <div style={{ fontSize: 10.5, color: i === step ? 'var(--ink-1)' : i < step ? 'var(--ink-3)' : 'var(--ink-4)', fontWeight: i === step ? 600 : 400 }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="modal-body">

        {/* ── Step 1: Client & Product ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Client <span style={{ color: 'var(--neg)' }}>*</span></label>
              <SearchCombo
                items={clients}
                getLabel={c => c.company}
                getSub={c => `${c.id} · ${c.sector} · Rating: ${c.rating}`}
                placeholder="Search existing clients…"
                selected={draft.client}
                onSelect={c => setDraft(d => ({ ...d, client: c, industry: c ? c.sector : d.industry }))}
              />
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                Can&apos;t find the client?{' '}
                <span style={{ color: 'var(--accent-ink)', cursor: 'pointer', fontWeight: 500 }}>Create new client</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Product type <span style={{ color: 'var(--neg)' }}>*</span></label>
                <select className="input" value={draft.productType} onChange={e => setDraft(d => ({ ...d, productType: e.target.value }))}>
                  <option value="">Select…</option>
                  {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Industry</label>
                <select className="input" value={draft.industry} onChange={e => setDraft(d => ({ ...d, industry: e.target.value }))}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Loan amount <span style={{ color: 'var(--neg)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 13, pointerEvents: 'none' }}>$</span>
                  <input className="input" style={{ paddingLeft: 22 }} placeholder="0" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Interest rate</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" style={{ paddingRight: 28 }} placeholder="0.00" value={draft.rate} onChange={e => setDraft(d => ({ ...d, rate: e.target.value }))} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 13, pointerEvents: 'none' }}>%</span>
                </div>
              </div>
              <div className="field">
                <label>Term (months)</label>
                <input className="input" placeholder="24" value={draft.term} onChange={e => setDraft(d => ({ ...d, term: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Funder & Terms ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Funder <span style={{ color: 'var(--neg)' }}>*</span></label>
              <SearchCombo
                items={funders}
                getLabel={f => f.name}
                getSub={f => `${f.type} · Ticket: ${f.ticket} · Available: ${fmt.moneyK(f.avail)}`}
                placeholder="Search funders…"
                selected={draft.funder}
                onSelect={f => setDraft(d => ({ ...d, funder: f, commissionRuleId: 'R-01' }))}
              />
            </div>

            {draft.funder && (
              <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-sunk)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Commission rules</div>
                {funderRule ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{funderRule.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{funderRule.note}</div>
                    </div>
                    <div className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-ink)' }}>{funderRule.rateLabel}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>No funder-specific rule — select an org rule to apply:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ORG_RULES.map(r => (
                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${draft.commissionRuleId === r.id ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 8, cursor: 'pointer', background: draft.commissionRuleId === r.id ? 'var(--accent-soft)' : 'var(--bg-elev)' }}>
                          <input type="radio" name="commrule" value={r.id} checked={draft.commissionRuleId === r.id} onChange={() => setDraft(d => ({ ...d, commissionRuleId: r.id }))} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{r.condition}</div>
                          </div>
                          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-ink)' }}>{r.rateLabel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Funding date</label>
                <input type="date" className="input" value={draft.fundingDate} onChange={e => setDraft(d => ({ ...d, fundingDate: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="Internal notes about this deal…" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            </div>
          </div>
        )}

        {/* ── Step 3: Agents & Split ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Assign agents and set commission split</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: splitOk ? 'var(--pos)' : splitTotal > 100 ? 'var(--neg)' : 'var(--ink-4)' }}>
                {splitTotal.toFixed(0)}% / 100%
              </div>
            </div>

            {draft.splits.map(s => (
              <div key={s.agent.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-elev)' }}>
                <Avatar name={s.agent.name} hue={s.agent.hue} size="md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.agent.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{s.agent.tier} · {s.agent.id}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input className="input" style={{ width: 60, textAlign: 'right', padding: '4px 8px' }} value={s.pct} onChange={e => setDraft(d => ({ ...d, splits: d.splits.map(x => x.agent.id === s.agent.id ? { ...x, pct: e.target.value } : x) }))} />
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>%</span>
                </div>
                {commAmt > 0 && (
                  <div className="num" style={{ fontSize: 11.5, color: 'var(--ink-3)', minWidth: 56 }}>≈ {fmt.moneyK(commAmt * (parseFloat(s.pct) || 0) / 100)}</div>
                )}
                <button className="btn sm ghost" style={{ padding: '3px 6px' }} onClick={() => setDraft(d => ({ ...d, splits: d.splits.filter(x => x.agent.id !== s.agent.id) }))}><Icons.X /></button>
              </div>
            ))}

            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Search and add agent…"
                value={agentQ}
                onChange={e => { setAgentQ(e.target.value); setAgentOpen(true) }}
                onFocus={() => setAgentOpen(true)}
                onBlur={() => setTimeout(() => setAgentOpen(false), 200)}
              />
              {agentOpen && availAgents.length > 0 && (
                <div className="search-drop">
                  {availAgents.map(a => (
                    <div key={a.id} className="search-drop-item" onMouseDown={() => addAgent(a)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={a.name} hue={a.hue} size="sm" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{a.tier} · {a.id}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {draft.splits.length > 0 && !splitOk && (
              <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, color: splitTotal > 100 ? 'var(--neg)' : 'var(--warn)', background: splitTotal > 100 ? 'color-mix(in oklch, var(--neg) 10%, transparent)' : 'color-mix(in oklch, var(--warn) 10%, transparent)', border: `1px solid ${splitTotal > 100 ? 'color-mix(in oklch, var(--neg) 30%, transparent)' : 'color-mix(in oklch, var(--warn) 30%, transparent)'}` }}>
                {splitTotal > 100 ? `Over by ${(splitTotal - 100).toFixed(0)}% — reduce split percentages` : `${(100 - splitTotal).toFixed(0)}% unallocated — splits must total 100%`}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: 'var(--accent-soft)', border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)', borderRadius: 9 }}>
              <div style={{ fontSize: 12, color: 'var(--accent-ink)', fontWeight: 600, marginBottom: 2 }}>Ready to submit</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Review all details before creating this deal record.</div>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
              {([
                ['Client',       draft.client?.company ?? '—'],
                ['Product type', draft.productType || '—'],
                ['Industry',     draft.industry || '—'],
                ['Loan amount',  loanAmt ? `$${loanAmt.toLocaleString()}` : '—'],
                ['Interest rate',draft.rate ? `${draft.rate}%` : '—'],
                ['Term',         draft.term ? `${draft.term} months` : '—'],
                ['Funder',       draft.funder?.name ?? '—'],
                ['Funding date', draft.fundingDate || '—'],
              ] as [string,string][]).map(([l, v], i, arr) => (
                <div key={l} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '9px 0 9px 14px', background: 'var(--bg-sunk)' }}>{l}</div>
                  <div style={{ fontSize: 13, padding: '9px 14px', fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>

            {commAmt > 0 && (
              <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-elev)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>Commission preview</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: draft.splits.length ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{funderRule ? funderRule.name : orgRule.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{funderRule ? funderRule.rateLabel : orgRule.rateLabel} × ${loanAmt.toLocaleString()}</div>
                  </div>
                  <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--pos)' }}>{fmt.moneyK(commAmt)}</div>
                </div>
                {draft.splits.map((s, i) => (
                  <div key={s.agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                    <Avatar name={s.agent.name} hue={s.agent.hue} size="sm" />
                    <span style={{ flex: 1, fontSize: 12.5 }}>{s.agent.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{s.pct}%</span>
                    <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt.moneyK(commAmt * (parseFloat(s.pct) || 0) / 100)}</span>
                  </div>
                ))}
              </div>
            )}

            {draft.notes && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-sunk)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-3)' }}>Notes · </span>{draft.notes}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="modal-foot">
        {step > 0 && <button className="btn" onClick={() => setStep(s => s - 1)}>← Back</button>}
        <div style={{ flex: 1 }} />
        {step < steps.length - 1
          ? <button className="btn primary" onClick={() => setStep(s => s + 1)}>Continue →</button>
          : <button className="btn primary" onClick={close}>Create deal</button>
        }
      </div>
    </Modal>
  )
}

// ─── Main export: all overlays ─────────────────────────────────────────────────
export function ShellOverlays() {
  const { drawer, closeDrawer, cmdOpen, setCmdOpen } = useShell()

  return (
    <>
      <Drawer open={!!drawer.kind} onClose={closeDrawer}>
        {drawer.kind === 'deal'       && <DealDetail deal={drawer.entity as Deal} />}
        {drawer.kind === 'commission' && <CommissionDetail commission={drawer.entity as Commission} />}
        {drawer.kind === 'agent'      && <AgentDetail agent={drawer.entity as Agent} />}
        {drawer.kind === 'client'     && <ClientDetail client={drawer.entity as Client} />}
        {drawer.kind === 'funder'     && <FunderDetail funder={drawer.entity as Funder} />}
      </Drawer>
      <NotificationsPanel />
      <NewDealWizard />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
