'use client'
import { useState } from 'react'
import { useShell } from './shell-provider'
import { Drawer, Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { Avatar, AvatarStack } from '@/components/ui/avatar'
import { StatusPill, Pill } from '@/components/ui/pill'
import { AreaChart } from '@/components/ui/charts'
import { fmt } from '@/lib/fmt'
import { agentById, dealById, funderById, deals, commissions, contacts, monthly, notifications, tasks } from '@/lib/data'
import type { Deal, Commission, Agent, Client, Funder } from '@/lib/data'

// ─── Deal Detail ───────────────────────────────────────────────────────────────
function DealDetail({ deal }: { deal: Deal }) {
  const [tab, setTab] = useState('overview')
  const { closeDrawer } = useShell()
  const relatedCommissions = commissions.filter(c => c.dealId === deal.id)
  const funder = funderById(deal.funderId)
  const stages = ['Application','Term Sheet','Credit Review','Underwriting','Docs Signed','Funded']
  const curStage = stages.indexOf(deal.stage)

  return (
    <>
      <div className="drawer-head">
        <button className="tb-icon-btn" onClick={closeDrawer}><Icons.X /></button>
        <div className="title" style={{ flex: 1 }}>
          <h2>{deal.client}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span className="id">{deal.id}</span>
            <StatusPill status={deal.status} />
            <span className="chip">{deal.productType}</span>
          </div>
        </div>
        <button className="btn sm"><Icons.MoreH /></button>
      </div>

      <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)' }}>
        <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
          {['overview','commissions','documents','activity'].map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'commissions' && relatedCommissions.length > 0 && (
                <span className="chip" style={{ marginLeft: 6, height: 18, padding: '0 6px', fontSize: 10.5 }}>{relatedCommissions.length}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-body">
        {tab === 'overview' && (
          <div className="vstack" style={{ gap: 20 }}>
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

            <div className="card">
              <div className="card-head"><h3>Agents on deal</h3></div>
              <div className="card-body flush">
                {deal.agents.map((aid, i) => {
                  const a = agentById(aid)
                  const c = relatedCommissions[0]
                  const split = c?.splits.find(s => s.agentId === aid)
                  if (!a) return null
                  return (
                    <div key={aid} style={{ padding: '12px 18px', borderBottom: i < deal.agents.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={a.name} hue={a.hue} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.tier} · {a.email}</div>
                      </div>
                      {split && <Pill tone="accent">{split.pct}% split</Pill>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        {tab === 'commissions' && (
          <div className="card">
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
          <div className="card">
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
          <div className="card">
            <div className="card-body flush">
              {[
                { t: 'Deal funded', w: 'Mar 18, 2026', by: 'Meridian ops' },
                { t: 'Docs signed by borrower', w: 'Mar 16, 2026', by: 'Samira Ghosh' },
                { t: 'Underwriting cleared', w: 'Mar 12, 2026', by: 'Credit committee' },
                { t: 'Term sheet accepted', w: 'Feb 24, 2026', by: 'Noam Harel' },
                { t: 'Application submitted', w: 'Feb 10, 2026', by: 'Ari Segal' },
              ].map((a, i) => (
                <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.t}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.by}</div>
                  </div>
                  <span className="text-xs muted-2 mono">{a.w}</span>
                </div>
              ))}
            </div>
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

  return (
    <>
      <div className="drawer-head">
        <button className="tb-icon-btn" onClick={closeDrawer}><Icons.X /></button>
        <div className="title">
          <h2>Commission {commission.id}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span className="id">{deal?.client} · {fmt.monthLabel(commission.period)}</span>
            <StatusPill status={commission.status} />
          </div>
        </div>
        <button className="btn sm"><Icons.Print /></button>
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

  return (
    <>
      <div className="drawer-head">
        <button className="tb-icon-btn" onClick={closeDrawer}><Icons.X /></button>
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
      </div>
    </>
  )
}

// ─── Client Detail ─────────────────────────────────────────────────────────────
function ClientDetail({ client }: { client: Client }) {
  const { closeDrawer } = useShell()
  const cDeals = deals.filter(d => d.clientId === client.id)
  const cContacts = contacts.filter(c => c.clientId === client.id)

  return (
    <>
      <div className="drawer-head">
        <button className="tb-icon-btn" onClick={closeDrawer}><Icons.X /></button>
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-sunk)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
            <Icons.Building />
          </div>
          <div>
            <h2>{client.company}</h2>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{client.id} · {client.sector}</div>
          </div>
        </div>
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

  return (
    <>
      <div className="drawer-head">
        <button className="tb-icon-btn" onClick={closeDrawer}><Icons.X /></button>
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `oklch(0.95 0.04 ${funder.hue})`, color: `oklch(0.45 0.18 ${funder.hue})`, display: 'grid', placeItems: 'center' }}>
            <Icons.Bank />
          </div>
          <div>
            <h2>{funder.name}</h2>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{funder.type} · {funder.id}</div>
          </div>
        </div>
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
        <button className="tb-icon-btn" onClick={() => setNotifOpen(false)}><Icons.X /></button>
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
function NewDealWizard() {
  const { newDealOpen, setNewDealOpen } = useShell()
  const [step, setStep] = useState(0)
  const steps = ['Client & product', 'Funding', 'Agents & split', 'Review']

  return (
    <Modal open={newDealOpen} onClose={() => { setNewDealOpen(false); setStep(0) }}>
      <div className="modal-head">
        <div style={{ flex: 1 }}>
          <h2>New Deal</h2>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
            Step {step + 1} of {steps.length} — {steps[step]}
          </div>
        </div>
        <button className="tb-icon-btn" onClick={() => { setNewDealOpen(false); setStep(0) }}><Icons.X /></button>
      </div>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--line)', marginBottom: 4 }} />
            <div style={{ fontSize: 10.5, color: i === step ? 'var(--ink)' : 'var(--ink-4)', fontWeight: i === step ? 500 : 400 }}>{s}</div>
          </div>
        ))}
      </div>
      <div className="modal-body">
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Client','Select client…'],['Product type','Select…'],['Loan amount','$0'],['Interest rate','%'],['Term (months)','24'],['Industry','Select…']].map(([l, ph]) => (
              <div key={l} className="field">
                <label>{l}</label>
                <input className="input" placeholder={ph} />
              </div>
            ))}
          </div>
        )}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Funder','Select funder…'],['Funding date',''],['Notes','']].map(([l, ph]) => (
              <div key={l} className="field" style={l === 'Notes' ? { gridColumn: '1/-1' } : {}}>
                <label>{l}</label>
                <input className="input" placeholder={ph} />
              </div>
            ))}
          </div>
        )}
        {step === 2 && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            <div style={{ marginBottom: 12, fontWeight: 500, color: 'var(--ink)' }}>Assign agents and set commission split</div>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              {['Agent 1 — 60%','Agent 2 — 40%'].map((a, i) => (
                <div key={i} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={a.split('—')[0].trim()} size="md" />
                  <span style={{ flex: 1 }}>{a}</span>
                  <button className="btn sm ghost"><Icons.X /></button>
                </div>
              ))}
              <button className="btn sm"><Icons.Plus /> Add agent</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <div style={{ padding: 16, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>Ready to submit</div>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>Review the details above before creating the deal record.</div>
            </div>
            <div>All required fields are complete. Click <strong>Create deal</strong> to submit.</div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        {step > 0 && <button className="btn" onClick={() => setStep(s => s - 1)}>Back</button>}
        <div style={{ flex: 1 }} />
        {step < steps.length - 1
          ? <button className="btn primary" onClick={() => setStep(s => s + 1)}>Continue</button>
          : <button className="btn primary" onClick={() => { setNewDealOpen(false); setStep(0) }}>Create deal</button>
        }
      </div>
    </Modal>
  )
}

// ─── Main export: all overlays ─────────────────────────────────────────────────
export function ShellOverlays() {
  const { drawer, closeDrawer } = useShell()

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
    </>
  )
}
