'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { useToast } from '@/components/ui/toast/toast'
import { api, type DbDeal, type DbAccount, type DbFunder } from '@/lib/api'
import { getAccounts, getActiveFunders } from '@/lib/lookups'

export function EditDealModal({
  open, onClose, deal, onDone,
}: {
  open: boolean
  onClose: () => void
  deal: DbDeal
  onDone: () => void
}) {
  const toast = useToast()
  const [accounts, setAccounts] = useState<DbAccount[]>([])
  const [funders, setFunders]   = useState<DbFunder[]>([])
  const [accountId, setAccountId] = useState(deal.account_id)
  const [funderId, setFunderId]   = useState(deal.funder_id)
  const [transferred, setTransferred] = useState(deal.transferred_amount != null ? String(deal.transferred_amount) : '')
  const [payback, setPayback]   = useState(deal.payback_amount != null ? String(deal.payback_amount) : '')
  const [externalId, setExternalId] = useState(deal.external_id ?? '')
  const [notes, setNotes]   = useState(deal.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAccountId(deal.account_id)
    setFunderId(deal.funder_id)
    setTransferred(deal.transferred_amount != null ? String(deal.transferred_amount) : '')
    setPayback(deal.payback_amount != null ? String(deal.payback_amount) : '')
    setExternalId(deal.external_id ?? '')
    setNotes(deal.notes ?? '')
    setError(null)
    Promise.all([getAccounts(), getActiveFunders()])
      .then(([a, f]) => { setAccounts(a); setFunders(f) })
  }, [open, deal])

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const body = {
        account_id: accountId,
        funder_id: funderId,
        transferred_amount: transferred === '' ? null : Number(transferred),
        payback_amount: payback === '' ? null : Number(payback),
        external_id: externalId || null,
        notes: notes || null,
      } as unknown as Partial<DbDeal>
      const res = await api.deals.update(deal.id, body)
      if (res.error) throw res.error
      toast.success('Deal updated')
      onDone()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="modal-head">
        <span>Edit deal</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 540 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Client">
            <select className="select" value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Funder">
            <select className="select" value={funderId} onChange={e => setFunderId(e.target.value)}>
              {funders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Transferred amount">
            <input className="input" type="number" step="0.01" value={transferred} onChange={e => setTransferred(e.target.value)} />
          </Field>
          <Field label="Payback amount">
            <input className="input" type="number" step="0.01" value={payback} onChange={e => setPayback(e.target.value)} />
          </Field>
        </div>

        <Field label="External ID (e.g. Salesforce)">
          <input className="input" value={externalId} onChange={e => setExternalId(e.target.value)} placeholder="optional" />
        </Field>

        <Field label="Notes">
          <textarea className="input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>

        <div style={{ background: 'var(--bg-sunk)', padding: '10px 12px', borderRadius: 6, fontSize: 11.5, color: 'var(--ink-3)' }}>
          To change the deal status (e.g. mark as funded), use <strong>Update status</strong> on the deal page — that triggers commission calculation.
        </div>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
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
