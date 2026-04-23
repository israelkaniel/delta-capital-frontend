'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { api, type DbContact } from '@/lib/api'

export function ContactEditor({
  open, onClose, onDone, accountId, editing,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  accountId: string
  editing?: DbContact
}) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setEmail(editing?.email ?? '')
    setPhone(editing?.phone ?? '')
    setError(null)
  }, [open, editing])

  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      if (!name.trim()) throw new Error('Name is required')
      const body = { name, email: email || undefined, phone: phone || undefined }
      const res = editing
        ? await api.accounts.contacts.update(accountId, editing.id, body)
        : await api.accounts.contacts.create(accountId, body)
      if (res.error) throw res.error
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
        <span>{editing ? 'Edit contact' : 'New contact'}</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 400 }}>
        <Field label="Name">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        </Field>
        <Field label="Phone">
          <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555-0100" />
        </Field>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save' : 'Add contact'}
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
