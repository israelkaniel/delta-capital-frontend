'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { Pill } from '@/components/ui/pill'
import { api, type DbAccount, type DbFunder, type DbAgent } from '@/lib/api'

type Split = { agent_id: string; share: string; name: string }

export function NewDealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<DbAccount[]>([])
  const [funders,  setFunders]  = useState<DbFunder[]>([])
  const [agents,   setAgents]   = useState<DbAgent[]>([])

  const [accountId, setAccountId] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [funderId, setFunderId] = useState('')
  const [transferred, setTransferred] = useState('')
  const [payback, setPayback]   = useState('')
  const [notes, setNotes]       = useState('')
  const [splits, setSplits]     = useState<Split[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([api.accounts.list(), api.funders.list(), api.agents.list()])
      .then(([a, f, ag]) => {
        setAccounts(a.data ?? [])
        setFunders((f.data ?? []).filter(x => x.is_active))
        setAgents((ag.data ?? []).filter(x => x.is_active))
      })
    setAccountId(''); setNewAccountName('')
    setFunderId(''); setTransferred(''); setPayback(''); setNotes(''); setSplits([])
    setError(null)
  }, [open])

  const totalShare = splits.reduce((s, x) => s + (Number(x.share) || 0), 0)
  const splitsOk = splits.length > 0 && Math.abs(totalShare - 100) < 0.01

  const addSplit = (a: DbAgent) => {
    if (splits.find(s => s.agent_id === a.id)) return
    const remaining = Math.max(0, 100 - totalShare)
    setSplits(prev => [...prev, {
      agent_id: a.id, share: String(remaining), name: a.profiles?.name ?? a.code ?? a.id.slice(0, 8),
    }])
  }
  const removeSplit = (id: string) => setSplits(prev => prev.filter(s => s.agent_id !== id))
  const updateSplit = (id: string, share: string) => setSplits(prev => prev.map(s => s.agent_id === id ? { ...s, share } : s))

  const availableAgents = agents.filter(a => !splits.find(s => s.agent_id === a.id))

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      let finalAccountId = accountId
      if (!finalAccountId && newAccountName.trim()) {
        const created = await api.accounts.create({ name: newAccountName.trim() })
        if (created.error) throw created.error
        finalAccountId = created.data!.id
      }
      if (!finalAccountId) throw new Error('Pick or create a client')
      if (!funderId) throw new Error('Pick a funder')
      if (splits.length > 0 && !splitsOk) throw new Error('Agent shares must total exactly 100')

      const body: Parameters<typeof api.deals.create>[0] = {
        account_id: finalAccountId,
        funder_id: funderId,
        transferred_amount: transferred ? Number(transferred) : undefined,
        payback_amount: payback ? Number(payback) : undefined,
        notes: notes || undefined,
        agents: splits.length > 0 ? splits.map(s => ({ agent_id: s.agent_id, share: Number(s.share) })) : undefined,
      }

      const res = await api.deals.create(body)
      if (res.error) throw res.error
      onClose()
      router.push(`/deals/${res.data!.id}`)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create deal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="modal-head">
        <span>New deal</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Client (existing)">
            <select className="select" value={accountId} onChange={e => { setAccountId(e.target.value); if (e.target.value) setNewAccountName('') }}>
              <option value="">Choose existing client…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="…or new client name">
            <input
              className="input"
              value={newAccountName}
              onChange={e => { setNewAccountName(e.target.value); if (e.target.value) setAccountId('') }}
              placeholder="ACME Corp"
              disabled={!!accountId}
            />
          </Field>
        </div>

        <Field label="Funder">
          <select className="select" value={funderId} onChange={e => setFunderId(e.target.value)}>
            <option value="">Choose funder…</option>
            {funders.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.commission_base === 'PAYBACK_AMOUNT' ? 'payback base' : 'transferred base'})
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Transferred amount">
            <input className="input" type="number" step="0.01" value={transferred} onChange={e => setTransferred(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Payback amount">
            <input className="input" type="number" step="0.01" value={payback} onChange={e => setPayback(e.target.value)} placeholder="0.00" />
          </Field>
        </div>

        <div className="field">
          <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
            Agents & shares (must total 100%)
          </label>
          {splits.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {splits.map(s => (
                <div key={s.agent_id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 32px', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, padding: '6px 10px', background: 'var(--bg-sunk)', borderRadius: 6 }}>{s.name}</div>
                  <input className="input" type="number" step="0.01" value={s.share} onChange={e => updateSplit(s.agent_id, e.target.value)} />
                  <button className="btn sm ghost" onClick={() => removeSplit(s.agent_id)} aria-label="Remove" type="button">
                    <Icons.X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 4 }}>
                <span style={{ color: 'var(--ink-3)' }}>Total share</span>
                <span style={{ fontWeight: 600, color: splitsOk ? 'var(--pos)' : 'var(--warn)' }}>{totalShare}%</span>
              </div>
            </div>
          )}
          {availableAgents.length > 0 && (
            <select
              className="select"
              value=""
              onChange={e => {
                const a = availableAgents.find(x => x.id === e.target.value)
                if (a) addSplit(a)
              }}
            >
              <option value="">Add agent…</option>
              {availableAgents.map(a => (
                <option key={a.id} value={a.id}>{a.profiles?.name ?? a.code ?? a.id.slice(0, 8)}</option>
              ))}
            </select>
          )}
        </div>

        <Field label="Notes (optional)">
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}

        <div style={{ background: 'var(--bg-sunk)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)' }}>
          <Pill tone="info">Tip</Pill>{' '}
          Once funded, switch the deal status to <strong>Funds transferred</strong> to trigger commission calculation.
          {transferred && <span style={{ marginLeft: 8 }}>· Transferring {fmt.money(Number(transferred))}</span>}
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating…' : 'Create deal'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
