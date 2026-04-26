'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { api, type DbAgent } from '@/lib/api'
import { invalidate } from '@/lib/lookups'

export function AgentEditor({
  open, onClose, onDone, editing,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  editing?: DbAgent
}) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode]   = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(editing?.profiles?.name ?? '')
    setEmail(editing?.profiles?.email ?? '')
    setCode(editing?.code ?? '')
    setPassword('')
    setError(null)
  }, [open, editing])

  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      if (editing) {
        const res = await api.agents.update(editing.id, { code: code || null } as Partial<DbAgent>)
        if (res.error) throw res.error
      } else {
        if (!email.trim()) throw new Error('Email is required')
        if (!name.trim()) throw new Error('Name is required')
        if (!password || password.length < 8) throw new Error('Password (min 8 chars) is required')
        const res = await api.agents.create({ email, name, code: code || undefined, password })
        if (res.error) throw res.error
      }
      invalidate('agents')
      onDone()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <span>{editing ? 'Edit agent' : 'New agent'}</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 420 }}>
        <Field label="Full name">
          <input className="input" value={name} onChange={e => setName(e.target.value)} disabled={!!editing} />
        </Field>

        <Field label="Email">
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!editing} />
        </Field>

        <Field label="Code (optional)">
          <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. EU-23" />
        </Field>

        {!editing && (
          <Field label="Initial password">
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </Field>
        )}

        {editing && (
          <div style={{ background: 'var(--bg-sunk)', padding: '10px 12px', borderRadius: 6, fontSize: 12, color: 'var(--ink-3)' }}>
            Name and email belong to the user&apos;s profile and can&apos;t be changed here. Use the password reset flow to change credentials.
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save' : 'Create agent'}
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
