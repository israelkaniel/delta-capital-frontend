'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { api, type DbAccount } from '@/lib/api'
import { invalidate } from '@/lib/lookups'

export function ClientEditor({
  open, onClose, onDone, editing,
}: {
  open: boolean
  onClose: () => void
  onDone: (created?: DbAccount) => void
  editing?: DbAccount
}) {
  const [name, setName]   = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setNotes(editing?.notes ?? '')
    setError(null)
  }, [open, editing])

  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      if (!name.trim()) throw new Error('Name is required')
      const body = { name, notes: notes || undefined }
      const res = editing
        ? await api.accounts.update(editing.id, body)
        : await api.accounts.create(body)
      if (res.error) throw res.error
      invalidate('accounts')
      onDone(res.data ?? undefined); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <span>{editing ? 'Edit client' : 'New client'}</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 420 }}>
        <Field label="Company name">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="ACME Corp" />
        </Field>
        <Field label="Notes (optional)">
          <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
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
