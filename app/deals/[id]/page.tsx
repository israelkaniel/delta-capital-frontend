'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { deals, commissions, agentById, funderById, clientById } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar, AvatarStack } from '@/components/ui/avatar'
import type { Deal } from '@/lib/data'

const TABS = ['Overview', 'Commissions', 'Activity']

const Field = ({ label, value, editable, onSave }: {
  label: string; value: string; editable?: boolean; onSave?: (v: string) => void
}) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editable && editing) return (
    <div style={{ display: 'contents' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, padding: '14px 0 14px 20px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 10px 0' }}>
        <input
          autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1.5px solid var(--accent)', background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter') { onSave?.(draft); setEditing(false) } if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        />
        <button className="btn sm" onClick={() => { onSave?.(draft); setEditing(false) }}>Save</button>
        <button className="btn sm ghost" onClick={() => { setDraft(value); setEditing(false) }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'contents' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, padding: '14px 0 14px 20px' }}>{label}</div>
      <div
        style={{ fontSize: 13, fontWeight: 500, padding: '14px 20px 14px 0', display: 'flex', alignItems: 'center', gap: 8, cursor: editable ? 'pointer' : 'default' }}
        onClick={() => editable && setEditing(true)}
        title={editable ? 'Click to edit' : undefined}
      >
        <span>{value || '—'}</span>
        {editable && <Icons.Edit style={{ width: 12, height: 12, color: 'var(--ink-4)', opacity: 0 }} className="edit-hint" />}
      </div>
    </div>
  )
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('Overview')
  const [deal, setDeal] = useState<Deal | undefined>(deals.find(d => d.id === id))

  if (!deal) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Deal not found.</p>
      <Link href="/deals" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>← Back to deals</Link>
    </div>
  )

  const dealComms = commissions.filter(c => c.dealId === deal.id)
  const funder = funderById(deal.funderId)
  const client = clientById(deal.clientId)
  const totalComm = dealComms.reduce((a, c) => a + c.value, 0)

  const update = (field: keyof Deal) => (val: string) => setDeal(prev => prev ? { ...prev, [field]: val } : prev)

  const STAGE_OPTIONS = ['Application', 'Term Sheet', 'Underwriting', 'Docs Signed', 'Funded']
  const STATUS_OPTIONS = ['Active', 'Closing', 'Pending', 'Declined', 'Paid off']

  return (
    <div className="page" style={{ padding: '20px 28px 80px', maxWidth: 1100 }}>
      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/deals" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Deals</Link>
          <span>/</span>
          <span>{deal.id}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ margin: 0 }}>{deal.client}</h1>
              <StatusPill status={deal.status} />
              <span className="chip">{deal.productType}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 16 }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{deal.id}</span>
              <span>Closed {fmt.dateShort(deal.closed)}</span>
              <span>Maturity {fmt.dateShort(deal.maturity)}</span>
              <span>{deal.funder}</span>
            </div>
          </div>
          <div className="actions">
            <button className="btn sm ghost" onClick={() => router.push('/deals')}><Icons.X /> Close</button>
            <div className="seg">
              {STATUS_OPTIONS.map(s => (
                <button key={s} className={deal.status === s ? 'active' : ''} onClick={() => update('status')(s)} style={{ fontSize: 11 }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Deal amount', val: fmt.money(deal.amount), sub: deal.productType },
          { label: 'Interest rate', val: fmt.pct(deal.rate), sub: `${deal.term} month term` },
          { label: 'Commissions', val: fmt.money(totalComm), sub: `${dealComms.length} record${dealComms.length !== 1 ? 's' : ''}` },
          { label: 'Stage', val: deal.stage, sub: deal.industry },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 3 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Deal fields */}
          <div className="card">
            <div className="card-head"><h3>Deal details</h3><button className="btn sm ghost">Edit all</button></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderTop: '1px solid var(--line)' }}>
                {[
                  { label: 'Deal ID', value: deal.id, editable: false },
                  { label: 'Client', value: deal.client, editable: true },
                  { label: 'Industry', value: deal.industry, editable: true },
                  { label: 'Product type', value: deal.productType, editable: true },
                  { label: 'Amount', value: fmt.money(deal.amount), editable: true },
                  { label: 'Rate', value: fmt.pct(deal.rate), editable: true },
                  { label: 'Term', value: `${deal.term} months`, editable: true },
                  { label: 'Stage', value: deal.stage, editable: true },
                  { label: 'Closed', value: fmt.dateShort(deal.closed), editable: true },
                  { label: 'Maturity', value: fmt.dateShort(deal.maturity), editable: false },
                ].map((f, i, arr) => (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, padding: '13px 0 13px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>{f.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, padding: '13px 20px 13px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Funder */}
            <div className="card">
              <div className="card-head"><h3>Funder</h3></div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `oklch(0.65 0.18 ${funder?.hue ?? 150})`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{deal.funder}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{funder?.type} · {funder?.ticket}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--bg-sunk)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>Available capacity</div>
                    <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt.moneyK(funder?.avail ?? 0)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-sunk)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>Ticket range</div>
                    <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>{funder?.ticket}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agents */}
            <div className="card">
              <div className="card-head"><h3>Agents</h3><button className="btn sm ghost"><Icons.Plus /> Add</button></div>
              <div className="card-body flush">
                {deal.agents.map((aid, i) => {
                  const a = agentById(aid)
                  if (!a) return null
                  return (
                    <div key={aid} style={{ padding: '12px 18px', borderBottom: i < deal.agents.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={a.name} hue={a.hue} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.tier} · {a.email}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <div className="card-head"><h3>Notes</h3><button className="btn sm ghost">Edit</button></div>
              <div className="card-body">
                <textarea
                  placeholder="Add notes about this deal…"
                  style={{ width: '100%', minHeight: 80, background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Commissions' && (
        <div className="card">
          <div className="card-head">
            <div><h3>Commissions</h3><div className="sub">{dealComms.length} records · {fmt.money(totalComm)} total</div></div>
            <button className="btn sm primary"><Icons.Plus /> Add commission</button>
          </div>
          {dealComms.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              No commissions recorded for this deal yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Source</th><th className="num">Rate</th>
                    <th className="num">Value</th><th>Splits</th><th>Period</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dealComms.map(c => (
                    <tr key={c.id}>
                      <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)' }}>{c.id}</span></td>
                      <td><span className="chip">{c.source}</span></td>
                      <td className="num">{c.pct}%</td>
                      <td className="num strong">{fmt.money(c.value)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {c.splits.map(s => {
                            const a = agentById(s.agentId)
                            return a ? (
                              <div key={s.agentId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                <Avatar name={a.name} hue={a.hue} size="sm" />
                                <span>{a.name.split(' ')[0]} {s.pct}%</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      </td>
                      <td className="muted">{c.period}</td>
                      <td><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Activity' && (
        <div className="card">
          <div className="card-head"><h3>Activity log</h3></div>
          <div className="card-body flush">
            {[
              { text: `Deal ${deal.id} created`, when: fmt.dateShort(deal.closed), icon: 'plus' },
              { text: `Status set to ${deal.status}`, when: fmt.dateShort(deal.closed), icon: 'check' },
              { text: `Assigned to ${deal.agents.map(id => agentById(id)?.name.split(' ')[0]).join(', ')}`, when: fmt.dateShort(deal.closed), icon: 'agent' },
            ].map((e, i, arr) => (
              <div key={i} style={{ padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icons.Check style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{e.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{e.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
