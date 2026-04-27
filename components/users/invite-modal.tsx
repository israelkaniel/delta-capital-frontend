'use client'
import { useState } from 'react'
import { Icons } from '@/lib/icons'
import { api } from '@/lib/api'

const ROLES = ['ADMIN', 'FINANCE_MANAGER', 'AGENT'] as const
type RoleType = typeof ROLES[number]

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  FINANCE_MANAGER: 'Finance Manager',
  AGENT: 'Agent',
}

export function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<RoleType>('AGENT')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    if (!name.trim() || !email.trim().includes('@')) {
      setErr('Name and a valid email are required.')
      return
    }
    setBusy(true)
    const res = await api.users.invite({ name: name.trim(), email: email.trim(), role })
    setBusy(false)
    if (res.error) { setErr(res.error.message); return }
    onDone()
  }

  return (
    <div className="modal-overlay open" onClick={() => !busy && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span>Invite a new user</span>
          <button className="close-btn" onClick={onClose} disabled={busy} aria-label="Close"><Icons.X /></button>
        </div>
        <div className="modal-body" style={{ minWidth: 380 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Full name</label>
              <input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Jane Cohen" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Role</label>
              <div className="seg">
                {ROLES.map(r => (
                  <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)} type="button">
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
                {role === 'AGENT' && 'An agents row will be created automatically.'}
                {role === 'FINANCE_MANAGER' && 'Read/write access to all financial data.'}
                {role === 'ADMIN' && 'Full administrative access including user management.'}
              </div>
            </div>
            {err && (
              <div style={{
                padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: 'var(--neg-soft)', color: 'var(--neg)',
              }}>{err}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button className="btn sm" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn sm primary" onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
