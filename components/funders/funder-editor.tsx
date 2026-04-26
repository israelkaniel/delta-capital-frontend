'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { api, type DbFunder } from '@/lib/api'
import { invalidate } from '@/lib/lookups'

export function FunderEditor({
  open, onClose, onDone, editing,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  editing?: DbFunder
}) {
  const [name, setName]   = useState('')
  const [base, setBase]   = useState<'TRANSFERRED_AMOUNT' | 'PAYBACK_AMOUNT'>('TRANSFERRED_AMOUNT')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setBase((editing?.commission_base as any) ?? 'TRANSFERRED_AMOUNT')
    setNotes(editing?.notes ?? '')
    setActive(editing?.is_active ?? true)
    setError(null)
  }, [open, editing])

  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      if (!name.trim()) throw new Error('Name is required')
      const body: any = { name, commission_base: base, notes: notes || undefined, is_active: active }
      const res = editing
        ? await api.funders.update(editing.id, body)
        : await api.funders.create(body)
      if (res.error) throw res.error
      invalidate('funders')
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <span>{editing ? 'Edit funder' : 'New funder'}</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 440 }}>
        <Field label="Name">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Bridge Capital" />
        </Field>

        <Field label="Commission base">
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { v: 'TRANSFERRED_AMOUNT', label: 'Transferred amount' },
              { v: 'PAYBACK_AMOUNT',     label: 'Payback amount' },
            ] as const).map(opt => (
              <button
                key={opt.v}
                className={`btn sm ${base === opt.v ? 'primary' : ''}`}
                onClick={() => setBase(opt.v)}
                type="button"
              >{opt.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
            Commissions for this funder are calculated against the chosen base.
          </div>
        </Field>

        <Field label="Notes (optional)">
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active (available for new deals)
        </label>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save' : 'Create funder'}
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
