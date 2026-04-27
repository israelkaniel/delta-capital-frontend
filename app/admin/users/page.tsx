'use client'
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbProfileAdmin } from '@/lib/api'
import { useUsersAdminSummary, invalidate } from '@/lib/queries'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { exportCSV, csvFmt, todayStamp } from '@/lib/export-csv'
import { InviteModal } from '@/components/users/invite-modal'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  FINANCE_MANAGER: 'Finance Manager',
  AGENT: 'Agent',
}

const ROLES = ['ADMIN', 'FINANCE_MANAGER', 'AGENT'] as const
const hueOf = (id: string) => (id.charCodeAt(0) * 37) % 360

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [actionFor, setActionFor] = useState<DbProfileAdmin | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const { page, setPage, pageSize } = usePageState()

  const summaryQ = useUsersAdminSummary({
    page, page_size: pageSize,
    q:      search.trim() || undefined,
    role:   roleFilter === 'all' ? undefined : roleFilter,
    status: statusTab  === 'all' ? undefined : statusTab,
  })

  useEffect(() => { setPage(1) }, [search, statusTab, roleFilter, setPage])

  const filtered = summaryQ.data?.users ?? []
  const total    = summaryQ.data?.total ?? 0
  const kpis     = summaryQ.data?.kpis  ?? { total: 0, active: 0, pending: 0, admins: 0 }
  const counts   = { all: kpis.total, active: kpis.active, inactive: kpis.total - kpis.active, pending: kpis.pending }

  const onUpdate = async (id: string, patch: { role?: string; is_active?: boolean }) => {
    const r = await api.users.update(id, patch)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    invalidate.usersAdmin(qc)
  }

  const runAction = async (kind: 'resend' | 'reset' | 'force-logout' | 'delete', u: DbProfileAdmin) => {
    setBusy(u.id + ':' + kind)
    const fn = {
      'resend':       () => api.users.resendInvite(u.id),
      'reset':        () => api.users.resetPassword(u.id),
      'force-logout': () => api.users.forceLogout(u.id),
      'delete':       () => api.users.softDelete(u.id),
    }[kind]
    const r = await fn()
    setBusy(null)
    setActionFor(null)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    const msg = {
      'resend':       'Invite re-sent',
      'reset':        'Password-reset email sent',
      'force-logout': 'User logged out from all devices',
      'delete':       'User disabled',
    }[kind]
    setToast({ ok: true, text: msg })
    invalidate.usersAdmin(qc)
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1>Users</h1>
          <p>{summaryQ.isLoading ? 'Loading…' : `${kpis.total} total · ${kpis.active} active · ${kpis.pending} pending invite`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn sm"
            disabled={!filtered.length}
            onClick={() => exportCSV(`users-${todayStamp()}`, [
              { header: 'Name',       value: u => u.name ?? '' },
              { header: 'Email',      value: u => u.email },
              { header: 'Role',       value: u => ROLE_LABEL[u.role] ?? u.role },
              { header: 'Status',     value: u => u.is_active ? 'Active' : 'Inactive' },
              { header: 'Created',    value: u => csvFmt.date(u.created_at) },
              { header: 'Last login', value: u => u.last_login_at ? csvFmt.date(u.last_login_at) : '—' },
            ], filtered)}
          >
            <Icons.Download /> Export
          </button>
          <button className="btn sm primary" onClick={() => setInviteOpen(true)}>
            <Icons.Plus /> Invite user
          </button>
        </div>
      </div>

      {summaryQ.error && (
        <div style={{
          background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)',
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12,
        }}>{(summaryQ.error as Error).message}</div>
      )}

      <div className="tabs" style={{ marginBottom: 12 }}>
        {(['all', 'active', 'pending', 'inactive'] as const).map(t => (
          <button key={t} className={'tab' + (statusTab === t ? ' active' : '')} onClick={() => setStatusTab(t)}>
            {t === 'all' ? 'All' : t === 'active' ? 'Active' : t === 'pending' ? 'Pending' : 'Inactive'}
            <span className="badge">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <FilterBar search={search} setSearch={setSearch} placeholder="Search by name or email…" chips={[]} />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)',
            background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 13,
          }}
        >
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {summaryQ.isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading users…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>No users match your filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Joined</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="row-link" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name ?? u.email} hue={hueOf(u.id)} size="sm" />
                        <span className="strong">{u.name ?? <span style={{ color: 'var(--ink-4)' }}>No name</span>}</span>
                      </Link>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={e => onUpdate(u.id, { role: e.target.value })}
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)',
                          background: 'var(--bg)', color: 'var(--ink-1)', fontSize: 12, outline: 'none',
                        }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </td>
                    <td>
                      {u.is_active
                        ? <Pill tone={u.first_login_at ? 'pos' : 'warn'} dot>{u.first_login_at ? 'Active' : 'Pending'}</Pill>
                        : <Pill tone="neg" dot>Inactive</Pill>}
                    </td>
                    <td className="muted-num" style={{ fontSize: 12 }}>
                      {u.last_login_at ? fmt.dateShort(u.last_login_at) : <span style={{ color: 'var(--ink-4)' }}>Never</span>}
                    </td>
                    <td className="muted-num">{fmt.dateShort(u.created_at)}</td>
                    <td>
                      <button className="btn sm ghost" onClick={() => setActionFor(u)} aria-label="Actions">
                        <Icons.MoreHorizontal />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)' }}>
          <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onDone={() => { setInviteOpen(false); invalidate.usersAdmin(qc) }}
        />
      )}

      {actionFor && (
        <ActionsModal
          user={actionFor}
          busy={busy}
          onClose={() => setActionFor(null)}
          onAction={runAction}
        />
      )}

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

function ActionsModal({
  user, busy, onClose, onAction,
}: {
  user: DbProfileAdmin
  busy: string | null
  onClose: () => void
  onAction: (kind: 'resend' | 'reset' | 'force-logout' | 'delete', u: DbProfileAdmin) => void
}) {
  const isPending = !user.first_login_at
  return (
    <div className="modal-overlay open" onClick={() => !busy && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 360 }}>
        <div className="modal-head">
          <span>{user.name ?? user.email}</span>
          <button className="close-btn" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {isPending && (
            <button className="btn" disabled={!!busy} onClick={() => onAction('resend', user)}>
              <Icons.Mail /> {busy === user.id + ':resend' ? 'Sending…' : 'Resend invite'}
            </button>
          )}
          {!isPending && (
            <button className="btn" disabled={!!busy} onClick={() => onAction('reset', user)}>
              <Icons.Mail /> {busy === user.id + ':reset' ? 'Sending…' : 'Send password reset'}
            </button>
          )}
          {!isPending && user.is_active && (
            <button className="btn" disabled={!!busy} onClick={() => onAction('force-logout', user)}>
              <Icons.Clock /> {busy === user.id + ':force-logout' ? 'Revoking…' : 'Force logout from all devices'}
            </button>
          )}
          {user.is_active ? (
            <button className="btn" disabled={!!busy} onClick={() => onAction('delete', user)}>
              <Icons.Trash /> {busy === user.id + ':delete' ? 'Disabling…' : 'Disable account'}
            </button>
          ) : (
            <button className="btn" disabled={!!busy} onClick={() => {/* re-enable handled by inline select */}}>
              Re-enable from the Status column
            </button>
          )}
          <Link href={`/admin/users/${user.id}`} className="btn ghost" onClick={onClose}>
            View profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
