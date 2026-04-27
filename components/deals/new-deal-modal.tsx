'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast/toast'
import {
  api,
  type DbAccount, type DbFunder, type DbAgent, type DbGlobalRule,
} from '@/lib/api'
import { getAccounts, getActiveAgents, getActiveFunders, invalidate } from '@/lib/lookups'

// ─── Types ────────────────────────────────────────────────────────────────────

type Split = { agent: DbAgent; pct: string }

type DealDraft = {
  account: DbAccount | null
  newAccountName: string
  funder: DbFunder | null
  transferred: string
  payback: string
  fundingDate: string
  notes: string
  splits: Split[]
}

const EMPTY_DRAFT: DealDraft = {
  account: null, newAccountName: '',
  funder: null, transferred: '', payback: '', fundingDate: '', notes: '',
  splits: [],
}

const STEPS = ['Client', 'Funder & Terms', 'Agents & Split', 'Review'] as const

const isActiveRule = (r: { valid_from: string; valid_to: string | null }) => {
  const today = new Date().toISOString().split('T')[0]
  if (r.valid_from > today) return false
  if (r.valid_to && r.valid_to < today) return false
  return true
}

// Pick a single rate from a rule (handles both FIXED and TIERED, returns mid/max for preview)
function previewRate(rule: DbGlobalRule | null, base: number): number | null {
  if (!rule) return null
  if (rule.type === 'FIXED_PERCENT') return rule.fixed_rate != null ? Number(rule.fixed_rate) : null
  const tiers = rule.commission_tiers ?? []
  if (tiers.length === 0) return null
  const sorted = [...tiers].sort((a, b) => Number(a.min_amount) - Number(b.min_amount))
  for (const t of sorted) {
    const inRange = base >= Number(t.min_amount) && (t.max_amount === null || base <= Number(t.max_amount))
    if (inRange) return Number(t.rate)
  }
  return Number(sorted[sorted.length - 1].rate)
}

// ─── Reusable searchable combo ────────────────────────────────────────────────

function SearchCombo<T extends { id: string }>({
  items, getLabel, getSub, placeholder, selected, onSelect,
}: {
  items: T[]
  getLabel: (i: T) => string
  getSub?: (i: T) => string
  placeholder: string
  selected: T | null
  onSelect: (i: T | null) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = items.filter(i => getLabel(i).toLowerCase().includes(q.toLowerCase()))

  if (selected) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', border: '1.5px solid var(--accent)',
      borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{getLabel(selected)}</div>
        {getSub && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{getSub(selected)}</div>}
      </div>
      <button className="btn sm ghost" style={{ padding: '2px 6px' }} onClick={() => onSelect(null)} type="button">
        <Icons.X />
      </button>
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

// ─── Live preview panel (right column) ────────────────────────────────────────

function DealLivePanel({
  draft, baseAmount, rate, commTotal,
}: {
  draft: DealDraft
  baseAmount: number
  rate: number | null
  commTotal: number
}) {
  const accountLabel = draft.account?.name ?? (draft.newAccountName.trim() || null)
  const rows: [string, string | null | undefined][] = [
    ['Client',       accountLabel],
    ['Funder',       draft.funder?.name ?? null],
    ['Base',         draft.funder ? (draft.funder.commission_base === 'PAYBACK_AMOUNT' ? 'Payback' : 'Transferred') : null],
    ['Transferred',  draft.transferred ? fmt.money(Number(draft.transferred)) : null],
    ['Payback',      draft.payback ? fmt.money(Number(draft.payback)) : null],
    ['Funded date',  draft.fundingDate || null],
  ]
  const filled = rows.filter(([, v]) => v).length

  return (
    <div style={{
      padding: '24px 20px', background: 'var(--bg-sunk)',
      borderLeft: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 4 }}>Deal in Progress</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(filled / rows.length) * 100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{filled}/{rows.length}</span>
        </div>
      </div>

      <div>
        {rows.map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{label}</div>
            <div style={{
              fontSize: 12.5, fontWeight: val ? 500 : 400,
              color: val ? 'var(--ink-1)' : 'var(--line)',
              textAlign: 'right', maxWidth: 160,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{val ?? '—'}</div>
          </div>
        ))}
      </div>

      {commTotal > 0 && (
        <div style={{
          padding: 16,
          border: '1px solid color-mix(in oklch, var(--pos) 35%, transparent)',
          borderRadius: 10,
          background: 'color-mix(in oklch, var(--pos) 8%, transparent)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>Est. commission pool</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 700, color: 'var(--pos)', lineHeight: 1 }}>{fmt.moneyK(commTotal)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
            {rate != null ? `${rate}%` : '—'} × {fmt.money(baseAmount)}
          </div>
        </div>
      )}

      {draft.splits.length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>
            Agents ({draft.splits.length})
          </div>
          {draft.splits.map(s => {
            const name = s.agent.profiles?.name ?? s.agent.code ?? s.agent.id.slice(0, 8)
            const hue = (s.agent.id.charCodeAt(0) * 37) % 360
            return (
              <div key={s.agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                <Avatar name={name} hue={hue} size="sm" />
                <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s.pct}%</div>
                {commTotal > 0 && (
                  <div className="num" style={{ fontSize: 12, color: 'var(--pos)', fontWeight: 600 }}>
                    {fmt.moneyK(commTotal * (parseFloat(s.pct) || 0) / 100)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {draft.notes && (
        <div style={{
          fontSize: 12, color: 'var(--ink-2)',
          padding: '10px 12px', border: '1px solid var(--line)',
          borderRadius: 8, background: 'var(--bg-elev)',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--ink-4)', display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Notes</span>
          {draft.notes}
        </div>
      )}
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function NewDealModal({
  open, onClose, initialAccount,
}: {
  open: boolean
  onClose: () => void
  initialAccount?: DbAccount | null
}) {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<DealDraft>(EMPTY_DRAFT)
  const [accounts, setAccounts] = useState<DbAccount[]>([])
  const [funders, setFunders]   = useState<DbFunder[]>([])
  const [agents, setAgents]     = useState<DbAgent[]>([])
  const [funderRule, setFunderRule] = useState<DbGlobalRule | null>(null)
  const [agentQ, setAgentQ] = useState('')
  const [agentOpen, setAgentOpen] = useState(false)
  const [newClientMode, setNewClientMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset & load when opened
  useEffect(() => {
    if (!open) return
    setStep(initialAccount ? 1 : 0)
    setDraft({ ...EMPTY_DRAFT, account: initialAccount ?? null })
    setAgentQ('')
    setNewClientMode(false); setError(null); setFunderRule(null)
    Promise.all([getAccounts(), getActiveFunders(), getActiveAgents()])
      .then(([a, f, ag]) => {
        setAccounts(a)
        setFunders(f)
        setAgents(ag)
      })
  }, [open, initialAccount])

  // When funder changes, fetch its active commission rule for the live preview
  useEffect(() => {
    if (!draft.funder) { setFunderRule(null); return }
    api.rules.globalList({ funder_id: draft.funder.id }).then(r => {
      const active = (r.data ?? []).find(isActiveRule) ?? null
      setFunderRule(active)
    })
  }, [draft.funder])

  // Derived values
  const transferredNum = parseFloat(draft.transferred.replace(/,/g, '')) || 0
  const paybackNum     = parseFloat(draft.payback.replace(/,/g, '')) || 0
  const baseAmount = draft.funder?.commission_base === 'PAYBACK_AMOUNT' ? paybackNum : transferredNum
  const rate = useMemo(() => previewRate(funderRule, baseAmount), [funderRule, baseAmount])
  const commTotal = rate != null && baseAmount > 0 ? Math.round(baseAmount * (rate / 100) * 100) / 100 : 0

  const splitTotal = draft.splits.reduce((acc, s) => acc + (parseFloat(s.pct) || 0), 0)
  const splitOk = draft.splits.length === 0 || Math.abs(splitTotal - 100) < 0.01

  const availAgents = agents.filter(a =>
    !draft.splits.find(s => s.agent.id === a.id) &&
    (a.profiles?.name ?? a.code ?? '').toLowerCase().includes(agentQ.toLowerCase())
  )

  const addAgent = (a: DbAgent) => {
    const rem = Math.max(0, 100 - splitTotal)
    setDraft(d => ({ ...d, splits: [...d.splits, { agent: a, pct: String(rem) }] }))
    setAgentQ(''); setAgentOpen(false)
  }

  // Step validation
  const canContinue = (): boolean => {
    if (step === 0) return !!draft.account || !!draft.newAccountName.trim()
    if (step === 1) return !!draft.funder
    if (step === 2) return splitOk
    return true
  }

  const handleCreate = async () => {
    if (!canContinue()) return
    setSaving(true); setError(null)
    try {
      let finalAccountId = draft.account?.id ?? null
      if (!finalAccountId) {
        const created = await api.accounts.create({ name: draft.newAccountName.trim() })
        if (created.error) throw created.error
        finalAccountId = created.data!.id
        invalidate('accounts')
      }

      const body: Parameters<typeof api.deals.create>[0] = {
        account_id: finalAccountId!,
        funder_id: draft.funder!.id,
        transferred_amount: transferredNum > 0 ? transferredNum : undefined,
        payback_amount:     paybackNum     > 0 ? paybackNum     : undefined,
        notes: draft.notes || undefined,
        agents: draft.splits.length > 0
          ? draft.splits.map(s => ({ agent_id: s.agent.id, share: parseFloat(s.pct) }))
          : undefined,
      }

      const res = await api.deals.create(body)
      if (res.error) throw res.error
      const newId = (res.data as { id?: string } | null)?.id
      if (!newId) {
        console.error('Deal created but server returned no id:', res.data)
        throw new Error('Deal created but no id returned — refresh the deals list')
      }
      toast.success('העסקה נוצרה בהצלחה', `Opening deal ${newId.slice(0, 8)}…`)
      onClose()
      router.push(`/deals/${newId}`)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create deal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} xl>
      <div className="modal-head">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>New Deal</h2>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </div>
        </div>
        <button className="close-btn" onClick={onClose}><Icons.X /> Close</button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--line)', marginBottom: 4 }} />
            <div style={{ fontSize: 10.5, color: i === step ? 'var(--ink-1)' : i < step ? 'var(--ink-3)' : 'var(--ink-4)', fontWeight: i === step ? 600 : 400 }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="modal-body new-deal-grid" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
        <div style={{ padding: 28, overflowY: 'auto' }}>

          {/* ── Step 1: Client ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                  Client <span style={{ color: 'var(--neg)' }}>*</span>
                </label>
                {!newClientMode && (
                  <>
                    <SearchCombo
                      items={accounts}
                      getLabel={a => a.name}
                      getSub={a => `${a.id.slice(0, 8)} · since ${fmt.dateShort(a.created_at)}`}
                      placeholder="Search existing clients…"
                      selected={draft.account}
                      onSelect={a => setDraft(d => ({ ...d, account: a, newAccountName: '' }))}
                    />
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
                      Can&apos;t find the client?{' '}
                      <span
                        style={{ color: 'var(--accent-ink)', cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => { setNewClientMode(true); setDraft(d => ({ ...d, account: null })) }}
                      >+ Create new client</span>
                    </div>
                  </>
                )}
                {newClientMode && (
                  <div style={{
                    border: '1.5px solid var(--accent)', borderRadius: 10, padding: 16,
                    background: 'var(--accent-soft)',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>New client</div>
                      <button className="btn sm ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => { setNewClientMode(false); setDraft(d => ({ ...d, newAccountName: '' })) }} type="button">Cancel</button>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                        Company name <span style={{ color: 'var(--neg)' }}>*</span>
                      </label>
                      <input
                        className="input"
                        placeholder="ACME Corp…"
                        value={draft.newAccountName}
                        onChange={e => setDraft(d => ({ ...d, newAccountName: e.target.value }))}
                        autoFocus
                      />
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
                        The client will be created when you submit the deal.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Funder & Terms ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                  Funder <span style={{ color: 'var(--neg)' }}>*</span>
                </label>
                <SearchCombo
                  items={funders}
                  getLabel={f => f.name}
                  getSub={f => `${f.commission_base === 'PAYBACK_AMOUNT' ? 'Payback base' : 'Transferred base'}`}
                  placeholder="Search funders…"
                  selected={draft.funder}
                  onSelect={f => setDraft(d => ({ ...d, funder: f }))}
                />
              </div>

              {draft.funder && (
                <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-sunk)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Active commission rule</div>
                  {funderRule ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {funderRule.type === 'FIXED_PERCENT' ? 'Fixed rate' : 'Tiered rate'}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                          Valid {fmt.dateShort(funderRule.valid_from)} → {funderRule.valid_to ? fmt.dateShort(funderRule.valid_to) : '∞'}
                          {funderRule.type === 'TIERED' && ` · ${(funderRule.commission_tiers ?? []).length} tiers`}
                        </div>
                      </div>
                      {rate != null && (
                        <div className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-ink)' }}>{rate}%</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--warn)' }}>
                      ⚠ This funder has no active commission rule. Add one in <strong>Rules</strong> before marking the deal as funded.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="field">
                  <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                    Transferred amount
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 13, pointerEvents: 'none' }}>$</span>
                    <input className="input" style={{ paddingLeft: 22 }} placeholder="0" value={draft.transferred} onChange={e => setDraft(d => ({ ...d, transferred: e.target.value }))} />
                  </div>
                </div>
                <div className="field">
                  <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                    Payback amount
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 13, pointerEvents: 'none' }}>$</span>
                    <input className="input" style={{ paddingLeft: 22 }} placeholder="0" value={draft.payback} onChange={e => setDraft(d => ({ ...d, payback: e.target.value }))} />
                  </div>
                </div>
                <div className="field">
                  <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                    Funding date (optional)
                  </label>
                  <input type="date" className="input" value={draft.fundingDate} onChange={e => setDraft(d => ({ ...d, fundingDate: e.target.value }))} />
                </div>
              </div>

              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                  Notes
                </label>
                <textarea
                  className="input" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Internal notes about this deal…"
                  value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Agents & Split ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Assign agents and set commission split</div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: draft.splits.length === 0 ? 'var(--ink-4)'
                    : splitOk ? 'var(--pos)' : splitTotal > 100 ? 'var(--neg)' : 'var(--warn)',
                }}>
                  {splitTotal.toFixed(0)}% / 100%
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: -4 }}>
                Optional — you can create a deal without agents and assign them later.
              </div>

              {draft.splits.map(s => {
                const name = s.agent.profiles?.name ?? s.agent.code ?? s.agent.id.slice(0, 8)
                const hue = (s.agent.id.charCodeAt(0) * 37) % 360
                return (
                  <div key={s.agent.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', border: '1px solid var(--line)',
                    borderRadius: 9, background: 'var(--bg-elev)',
                  }}>
                    <Avatar name={name} hue={hue} size="md" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                      {s.agent.code && <div style={{ fontSize: 11, color: 'var(--ink-4)' }} className="mono">{s.agent.code}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        className="input"
                        style={{ width: 60, textAlign: 'right', padding: '4px 8px' }}
                        value={s.pct}
                        onChange={e => setDraft(d => ({
                          ...d, splits: d.splits.map(x => x.agent.id === s.agent.id ? { ...x, pct: e.target.value } : x),
                        }))}
                      />
                      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>%</span>
                    </div>
                    {commTotal > 0 && (
                      <div className="num" style={{ fontSize: 11.5, color: 'var(--ink-3)', minWidth: 56 }}>
                        ≈ {fmt.moneyK(commTotal * (parseFloat(s.pct) || 0) / 100)}
                      </div>
                    )}
                    <button
                      className="btn sm ghost" style={{ padding: '3px 6px' }}
                      onClick={() => setDraft(d => ({ ...d, splits: d.splits.filter(x => x.agent.id !== s.agent.id) }))}
                      type="button"
                    >
                      <Icons.X />
                    </button>
                  </div>
                )
              })}

              {availAgents.length > 0 || agents.length > 0 ? (
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
                      {availAgents.map(a => {
                        const name = a.profiles?.name ?? a.code ?? a.id.slice(0, 8)
                        const hue = (a.id.charCodeAt(0) * 37) % 360
                        return (
                          <div key={a.id} className="search-drop-item" onMouseDown={() => addAgent(a)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar name={name} hue={hue} size="sm" />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                                {a.code && <div style={{ fontSize: 11, color: 'var(--ink-4)' }} className="mono">{a.code}</div>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', padding: '14px 16px', background: 'var(--bg-sunk)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span>No agents in the system yet. Create one first to assign splits, or skip this step and assign agents later.</span>
                  <a href="/agents" target="_blank" rel="noreferrer" className="btn sm primary" style={{ flexShrink: 0 }}>
                    <Icons.Plus /> Add agent
                  </a>
                </div>
              )}

              {draft.splits.length > 0 && !splitOk && (
                <div style={{
                  fontSize: 12, padding: '8px 12px', borderRadius: 8,
                  color: splitTotal > 100 ? 'var(--neg)' : 'var(--warn)',
                  background: splitTotal > 100
                    ? 'color-mix(in oklch, var(--neg) 10%, transparent)'
                    : 'color-mix(in oklch, var(--warn) 10%, transparent)',
                  border: `1px solid ${splitTotal > 100 ? 'color-mix(in oklch, var(--neg) 30%, transparent)' : 'color-mix(in oklch, var(--warn) 30%, transparent)'}`,
                }}>
                  {splitTotal > 100
                    ? `Over by ${(splitTotal - 100).toFixed(0)}% — reduce split percentages`
                    : `${(100 - splitTotal).toFixed(0)}% unallocated — splits must total 100%`}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: 14, background: 'var(--accent-soft)',
                border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)',
                borderRadius: 9,
              }}>
                <div style={{ fontSize: 12, color: 'var(--accent-ink)', fontWeight: 600, marginBottom: 2 }}>Ready to submit</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Review the details. After submitting, you can mark the deal as funded to trigger commission calculation.
                </div>
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
                {([
                  ['Client',      draft.account?.name ?? (draft.newAccountName.trim() ? `${draft.newAccountName} (new)` : '—')],
                  ['Funder',      draft.funder?.name ?? '—'],
                  ['Base',        draft.funder ? (draft.funder.commission_base === 'PAYBACK_AMOUNT' ? 'Payback amount' : 'Transferred amount') : '—'],
                  ['Transferred', transferredNum > 0 ? fmt.money(transferredNum) : '—'],
                  ['Payback',     paybackNum > 0 ? fmt.money(paybackNum) : '—'],
                  ['Funding date',draft.fundingDate || '—'],
                  ['Agents',      draft.splits.length > 0 ? `${draft.splits.length} (split: ${splitTotal}%)` : 'None'],
                ] as [string, string][]).map(([l, v], i, arr) => (
                  <div key={l} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, padding: '9px 0 9px 14px', background: 'var(--bg-sunk)' }}>{l}</div>
                    <div style={{ fontSize: 13, padding: '9px 14px', fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>

              {commTotal > 0 && draft.splits.length > 0 && (
                <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg-elev)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>Commission preview</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Total pool</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                        {rate}% × {fmt.money(baseAmount)}
                      </div>
                    </div>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--pos)' }}>{fmt.moneyK(commTotal)}</div>
                  </div>
                  {draft.splits.map(s => {
                    const name = s.agent.profiles?.name ?? s.agent.code ?? s.agent.id.slice(0, 8)
                    const hue = (s.agent.id.charCodeAt(0) * 37) % 360
                    return (
                      <div key={s.agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                        <Avatar name={name} hue={hue} size="sm" />
                        <span style={{ flex: 1, fontSize: 12.5 }}>{name}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{s.pct}%</span>
                        <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>
                          {fmt.moneyK(commTotal * (parseFloat(s.pct) || 0) / 100)}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10, fontStyle: 'italic' }}>
                    These are estimates. The backend recalculates rates from scratch when the deal becomes FUNDS_TRANSFERRED.
                  </div>
                </div>
              )}

              {draft.notes && (
                <div style={{
                  fontSize: 12.5, color: 'var(--ink-2)',
                  padding: '10px 14px', border: '1px solid var(--line)',
                  borderRadius: 8, background: 'var(--bg-sunk)',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink-3)' }}>Notes · </span>{draft.notes}
                </div>
              )}

              {error && (
                <div style={{
                  background: 'var(--neg-soft)', border: '1px solid var(--neg-line)',
                  color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5,
                }}>{error}</div>
              )}
            </div>
          )}
        </div>

        <DealLivePanel draft={draft} baseAmount={baseAmount} rate={rate} commTotal={commTotal} />
      </div>

      <div className="modal-foot">
        {step > 0 && <button className="btn" onClick={() => setStep(s => s - 1)} disabled={saving} type="button">← Back</button>}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1
          ? (
            <button
              className="btn primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canContinue() || saving}
              type="button"
            >Continue →</button>
          ) : (
            <button
              className="btn primary"
              onClick={handleCreate}
              disabled={saving || !canContinue()}
              type="button"
            >{saving ? 'Creating…' : 'Create deal'}</button>
          )
        }
      </div>
    </Modal>
  )
}
