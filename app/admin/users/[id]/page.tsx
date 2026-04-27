'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api } from '@/lib/api'
import { useUsersAdminSummary, invalidate } from '@/lib/queries'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { PermissionMatrix } from '@/components/users/permission-matrix'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  FINANCE_MANAGER: 'Finance Manager',
  AGENT: 'Agent',
}
const ROLES = ['ADMIN', 'FINANCE_MANAGER', 'AGENT'] as const
const hueOf = (id: string) => (id.charCodeAt(0) * 37) % 360

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const id = params?.id as string

  const summaryQ = useUsersAdminSummary()
  const user = useMemo(() => summaryQ.data?.users.find(u => u.id === id), [summaryQ.data, id])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({ name: '', email: '' })
  const [busy, setBusy]       = useState<string | null>(null)
  const [toast, setToast]     = useState<{ ok: boolean; text: string } | null>(null)

  const startEdit = () => {
    if (!user) return
    setDraft({ name: user.name ?? '', email: user.email })
    setEditing(true)
  }

  const saveProfile = async () => {
    if (!user) return
    setBusy('save')
    const r = await api.users.update(user.id, { name: draft.name.trim() })
    setBusy(null)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    setEditing(false)
    setToast({ ok: true, text: 'Profile updated' })
    invalidate.usersAdmin(qc)
  }

  const setRole = async (role: string) => {
    if (!user) return
    setBusy('role')
    const r = await api.users.update(user.id, { role })
    setBusy(null)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    setToast({ ok: true, text: 'Role updated' })
    invalidate.usersAdmin(qc)
  }

  const setActive = async (is_active: boolean) => {
    if (!user) return
    setBusy('active')
    const r = await api.users.update(user.id, { is_active })
    setBusy(null)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    setToast({ ok: true, text: is_active ? 'Account enabled' : 'Account disabled' })
    invalidate.usersAdmin(qc)
  }

  const action = async (kind: 'resend' | 'reset' | 'force-logout' | 'delete') => {
    if (!user) return
    if (kind === 'delete' && !confirm('Disable this account? They will no longer be able to sign in.')) return
    if (kind === 'force-logout' && !confirm('Sign this user out of every device they are currently using?')) return
    setBusy(kind)
    const fn = {
      'resend':       () => api.users.resendInvite(user.id),
      'reset':        () => api.users.resetPassword(user.id),
      'force-logout': () => api.users.forceLogout(user.id),
      'delete':       () => api.users.softDelete(user.id),
    }[kind]
    const r = await fn()
    setBusy(null)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    const msg = {
      'resend':       'Invite re-sent',
      'reset':        'Password-reset email sent',
      'force-logout': 'User logged out from all devices',
      'delete':       'Account disabled',
    }[kind]
    setToast({ ok: true, text: msg })
    invalidate.usersAdmin(qc)
  }

  if (summaryQ.isLoading) {
    return <div className="page" style={{ padding: 40, color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
  }
  if (!user) {
    return (
      <div className="page" style={{ padding: 40 }}>
        <p style={{ color: 'var(--ink-4)' }}>User not found.</p>
        <Link href="/admin/users" className="btn sm">← Back to users</Link>
      </div>
    )
  }

  const isPending = !user.first_login_at

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div style={{ marginBottom: 14 }}>
        <Link href="/admin/users" style={{ fontSize: 12, color: 'var(--ink-4)' }}>← Users</Link>
      </div>

      <div className="page-head" style={{ marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar name={user.name ?? user.email} hue={hueOf(user.id)} size="lg" />
          <div>
            <h1 style={{ marginBottom: 2 }}>{user.name ?? user.email}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
              <span>{user.email}</span>
              {user.is_active
                ? <Pill tone={isPending ? 'warn' : 'pos'} dot>{isPending ? 'Pending invite' : 'Active'}</Pill>
                : <Pill tone="neg" dot>Inactive</Pill>}
              <span className="chip">{ROLE_LABEL[user.role] ?? user.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Profile</h3>
            {!editing
              ? <button className="btn sm ghost" onClick={startEdit}><Icons.Edit /> Edit</button>
              : <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn sm" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn sm primary" disabled={busy === 'save'} onClick={saveProfile}>
                    {busy === 'save' ? 'Saving…' : 'Save'}
                  </button>
                </div>}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row label="Display name">
              {editing
                ? <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={{ width: 240 }} />
                : <span className="strong">{user.name ?? <span style={{ color: 'var(--ink-4)' }}>Not set</span>}</span>}
            </Row>
            <Row label="Email">
              <span className="strong">{user.email}</span>
            </Row>
            <Row label="Role">
              <select
                value={user.role}
                disabled={busy === 'role'}
                onChange={e => setRole(e.target.value)}
                style={{
                  padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)',
                  background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none',
                }}
              >
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Row>
            <Row label="Status" last>
              <button className="btn sm" disabled={busy === 'active'} onClick={() => setActive(!user.is_active)}>
                {user.is_active ? 'Disable account' : 'Re-enable account'}
              </button>
            </Row>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Login & sessions</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row label="Last login">
              <span className="strong">
                {user.last_login_at ? fmt.dateTime(user.last_login_at) : <span style={{ color: 'var(--ink-4)' }}>Never signed in</span>}
              </span>
            </Row>
            <Row label="Last login IP">
              <span className="mono" style={{ fontSize: 12 }}>{user.last_login_ip ?? '—'}</span>
            </Row>
            <Row label="Last device">
              <span style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 320, textAlign: 'right' }}>
                {user.last_login_user_agent ?? '—'}
              </span>
            </Row>
            <Row label="First login">
              <span className="strong">
                {user.first_login_at ? fmt.dateTime(user.first_login_at) : 'Pending invite'}
              </span>
            </Row>
            <Row label="Member since">
              <span className="strong">{fmt.dateTime(user.created_at)}</span>
            </Row>
            <Row label="Sessions revoked at" last>
              <span className="mono" style={{ fontSize: 12 }}>
                {user.revoked_at ? fmt.dateTime(user.revoked_at) : '—'}
              </span>
            </Row>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10, fontSize: 14 }}>Permissions for {ROLE_LABEL[user.role]}</h3>
        <PermissionMatrix highlight={user.role as any} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Account actions</h3></div>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {isPending
            ? <button className="btn" disabled={!!busy} onClick={() => action('resend')}>
                <Icons.Mail /> {busy === 'resend' ? 'Sending…' : 'Resend invite email'}
              </button>
            : <button className="btn" disabled={!!busy} onClick={() => action('reset')}>
                <Icons.Mail /> {busy === 'reset' ? 'Sending…' : 'Send password reset'}
              </button>}
          {!isPending && user.is_active && (
            <button className="btn" disabled={!!busy} onClick={() => action('force-logout')}>
              <Icons.Clock /> {busy === 'force-logout' ? 'Revoking…' : 'Force logout from all devices'}
            </button>
          )}
        </div>
        <div style={{
          margin: '10px 14px 14px', padding: 12, background: 'var(--neg-soft)',
          border: '1px solid var(--neg-line)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--neg)', marginBottom: 6 }}>Danger zone</div>
          {user.is_active && (
            <button className="btn" disabled={!!busy} onClick={() => action('delete')}>
              <Icons.Trash /> {busy === 'delete' ? 'Disabling…' : 'Disable this account'}
            </button>
          )}
          {!user.is_active && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Account is currently disabled. Use "Re-enable account" above to restore access.
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: toast.ok ? 'var(--pos)' : 'var(--neg)', color: 'white',
            padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)', zIndex: 100,
          }}
        >{toast.text}</div>
      )}
    </div>
  )
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--line)',
      gap: 16,
    }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>{children}</div>
    </div>
  )
}
