'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { api, type DbFunder, type DbAgent, type DbGlobalRule, type DbAgentRule } from '@/lib/api'

type Tier = { min_amount: number; max_amount: number | null; rate: number }

type GlobalState = {
  scope: 'global'
  funder_id: string
  type: 'FIXED_PERCENT' | 'TIERED'
  fixed_rate: string
  tiers: Tier[]
  valid_from: string
  valid_to: string
  notes: string
}

type AgentState = {
  scope: 'agent'
  agent_id: string
  funder_id: string
  mode: 'REPLACE' | 'ADD_ON'
  type: 'FIXED_PERCENT' | 'TIERED'
  fixed_rate: string
  tiers: Tier[]
  valid_from: string
  valid_to: string
  notes: string
}

type State = GlobalState | AgentState

const today = () => new Date().toISOString().split('T')[0]

const emptyGlobal = (): GlobalState => ({
  scope: 'global',
  funder_id: '',
  type: 'FIXED_PERCENT',
  fixed_rate: '',
  tiers: [{ min_amount: 0, max_amount: null, rate: 0 }],
  valid_from: today(),
  valid_to: '',
  notes: '',
})

const emptyAgent = (): AgentState => ({
  scope: 'agent',
  agent_id: '',
  funder_id: '',
  mode: 'ADD_ON',
  type: 'FIXED_PERCENT',
  fixed_rate: '',
  tiers: [{ min_amount: 0, max_amount: null, rate: 0 }],
  valid_from: today(),
  valid_to: '',
  notes: '',
})

export function RuleEditor({
  open, onClose, onDone, scope, funders, agents, editing,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  scope: 'global' | 'agent'
  funders: DbFunder[]
  agents: DbAgent[]
  editing?: DbGlobalRule | DbAgentRule
}) {
  const [state, setState] = useState<State>(scope === 'global' ? emptyGlobal() : emptyAgent())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      if (scope === 'global') {
        const g = editing as DbGlobalRule
        setState({
          scope: 'global',
          funder_id: g.funder_id,
          type: g.type as 'FIXED_PERCENT' | 'TIERED',
          fixed_rate: g.fixed_rate != null ? String(g.fixed_rate) : '',
          tiers: (g.commission_tiers ?? []).map(t => ({
            min_amount: Number(t.min_amount), max_amount: t.max_amount, rate: Number(t.rate),
          })) || [{ min_amount: 0, max_amount: null, rate: 0 }],
          valid_from: g.valid_from?.split('T')[0] ?? today(),
          valid_to: g.valid_to?.split('T')[0] ?? '',
          notes: g.notes ?? '',
        })
      } else {
        const a = editing as DbAgentRule
        setState({
          scope: 'agent',
          agent_id: a.agent_id,
          funder_id: a.funder_id,
          mode: a.mode as 'REPLACE' | 'ADD_ON',
          type: a.type as 'FIXED_PERCENT' | 'TIERED',
          fixed_rate: a.fixed_rate != null ? String(a.fixed_rate) : '',
          tiers: (a.agent_commission_tiers ?? []).map(t => ({
            min_amount: Number(t.min_amount), max_amount: t.max_amount, rate: Number(t.rate),
          })) || [{ min_amount: 0, max_amount: null, rate: 0 }],
          valid_from: a.valid_from?.split('T')[0] ?? today(),
          valid_to: a.valid_to?.split('T')[0] ?? '',
          notes: a.notes ?? '',
        })
      }
    } else {
      setState(scope === 'global' ? emptyGlobal() : emptyAgent())
    }
    setError(null)
  }, [open, editing, scope])

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const isTiered = state.type === 'TIERED'
      const body: Record<string, unknown> = {
        funder_id: state.funder_id,
        type: state.type,
        fixed_rate: isTiered ? null : Number(state.fixed_rate),
        valid_from: state.valid_from,
        valid_to: state.valid_to || null,
        notes: state.notes || null,
      }
      if (isTiered) body.tiers = state.tiers.map(t => ({
        min_amount: Number(t.min_amount),
        max_amount: t.max_amount === null || String(t.max_amount) === '' ? null : Number(t.max_amount),
        rate: Number(t.rate),
      }))

      if (state.scope === 'agent') {
        body.agent_id = state.agent_id
        body.mode = state.mode
      }

      if (!body.funder_id) throw new Error('Funder is required')
      if (state.scope === 'agent' && !body.agent_id) throw new Error('Agent is required')
      if (!isTiered && (state.fixed_rate === '' || isNaN(Number(state.fixed_rate)))) {
        throw new Error('Fixed rate is required')
      }

      let res
      if (editing) {
        res = state.scope === 'global'
          ? await api.rules.globalUpdate(editing.id, body)
          : await api.rules.agentUpdate(editing.id, body)
      } else {
        res = state.scope === 'global'
          ? await api.rules.globalCreate(body)
          : await api.rules.agentCreate(body)
      }
      if (res.error) throw res.error
      onDone()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const updateTier = (i: number, patch: Partial<Tier>) => {
    setState(s => ({ ...s, tiers: s.tiers.map((t, j) => j === i ? { ...t, ...patch } : t) }))
  }
  const addTier = () => {
    setState(s => {
      const last = s.tiers[s.tiers.length - 1]
      const min = last?.max_amount != null ? Number(last.max_amount) : Number(last?.min_amount ?? 0) + 50000
      return { ...s, tiers: [...s.tiers, { min_amount: min, max_amount: null, rate: 0 }] }
    })
  }
  const removeTier = (i: number) => {
    setState(s => ({ ...s, tiers: s.tiers.filter((_, j) => j !== i) }))
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="modal-head">
        <span>{editing ? 'Edit rule' : 'New rule'} — {scope === 'global' ? 'Global' : 'Agent-specific'}</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 560 }}>
        <div style={{ display: 'grid', gridTemplateColumns: state.scope === 'agent' ? '1fr 1fr' : '1fr', gap: 12 }}>
          {state.scope === 'agent' && (
            <Field label="Agent">
              <select className="select" value={state.agent_id} onChange={e => setState({ ...state, agent_id: e.target.value })}>
                <option value="">Select agent…</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.profiles?.name ?? a.code ?? a.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Funder">
            <select className="select" value={state.funder_id} onChange={e => setState({ ...state, funder_id: e.target.value })}>
              <option value="">Select funder…</option>
              {funders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        </div>

        {state.scope === 'agent' && (
          <Field label="Mode">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ADD_ON', 'REPLACE'] as const).map(m => (
                <button
                  key={m}
                  className={`btn sm ${state.mode === m ? 'primary' : ''}`}
                  onClick={() => setState({ ...state, mode: m })}
                  type="button"
                >
                  {m === 'ADD_ON' ? 'Add on top of global' : 'Replace global'}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Rule type">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['FIXED_PERCENT', 'TIERED'] as const).map(t => (
              <button
                key={t}
                className={`btn sm ${state.type === t ? 'primary' : ''}`}
                onClick={() => setState({ ...state, type: t })}
                type="button"
              >
                {t === 'FIXED_PERCENT' ? 'Fixed percent' : 'Tiered'}
              </button>
            ))}
          </div>
        </Field>

        {state.type === 'FIXED_PERCENT' ? (
          <Field label="Rate (%)">
            <input
              className="input"
              type="number"
              step="0.01"
              value={state.fixed_rate}
              onChange={e => setState({ ...state, fixed_rate: e.target.value })}
              placeholder="e.g. 2.5"
              style={{ maxWidth: 180 }}
            />
          </Field>
        ) : (
          <div className="field">
            <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
              Tiers
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 8, fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>
                <span>From amount</span>
                <span>To amount (blank = ∞)</span>
                <span>Rate (%)</span>
                <span></span>
              </div>
              {state.tiers.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 8 }}>
                  <input
                    className="input" type="number" step="1" value={t.min_amount}
                    onChange={e => updateTier(i, { min_amount: Number(e.target.value) })}
                  />
                  <input
                    className="input" type="number" step="1"
                    value={t.max_amount === null ? '' : t.max_amount}
                    onChange={e => updateTier(i, { max_amount: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="∞"
                  />
                  <input
                    className="input" type="number" step="0.01" value={t.rate}
                    onChange={e => updateTier(i, { rate: Number(e.target.value) })}
                  />
                  <button
                    className="btn sm ghost"
                    onClick={() => removeTier(i)}
                    disabled={state.tiers.length === 1}
                    type="button"
                    aria-label="Remove tier"
                  >
                    <Icons.Trash style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ))}
              <button className="btn sm" onClick={addTier} type="button" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                <Icons.Plus /> Add tier
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Valid from">
            <input className="input" type="date" value={state.valid_from} onChange={e => setState({ ...state, valid_from: e.target.value })} />
          </Field>
          <Field label="Valid to (blank = open-ended)">
            <input className="input" type="date" value={state.valid_to} onChange={e => setState({ ...state, valid_to: e.target.value })} />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea className="input" rows={2} value={state.notes} onChange={e => setState({ ...state, notes: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create rule'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
