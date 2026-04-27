'use client'
import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useAuditAdminSummary, useUsersAdminSummary } from '@/lib/queries'
import { Pagination } from '@/components/ui/pagination'
import { Pill } from '@/components/ui/pill'
import { exportCSV, csvFmt, todayStamp } from '@/lib/export-csv'

const ENTITY_OPTIONS = [
  'profiles', 'deals', 'commissions', 'commission_reserves', 'payments',
  'agents', 'accounts', 'funders', 'global_commission_rules', 'agent_commission_rules',
  'monthly_summaries', 'email_template',
]

const ACTION_OPTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE',
  'RESEND_INVITE', 'RESET_PASSWORD', 'FORCE_LOGOUT', 'UPDATE_INVITE_TEMPLATE',
]

const ACTION_TONE: Record<string, 'pos' | 'warn' | 'neg' | 'info' | 'default'> = {
  CREATE: 'pos', UPDATE: 'info', DELETE: 'neg', SOFT_DELETE: 'warn',
  RESEND_INVITE: 'info', RESET_PASSWORD: 'warn', FORCE_LOGOUT: 'neg',
  UPDATE_INVITE_TEMPLATE: 'info',
}

export default function AdminAuditPage() {
  const [entity, setEntity]   = useState<string>('all')
  const [action, setAction]   = useState<string>('all')
  const [userId, setUserId]   = useState<string>('all')
  const [days,   setDays]     = useState<number>(30)
  const [offset, setOffset]   = useState<number>(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const filters = useMemo(() => {
    const from = days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : null
    return {
      entity: entity === 'all' ? null : entity,
      action: action === 'all' ? null : action,
      userId: userId === 'all' ? null : userId,
      from, to: null,
      limit: 100, offset,
    }
  }, [entity, action, userId, days, offset])

  const auditQ = useAuditAdminSummary(filters)
  const usersQ = useUsersAdminSummary({ page_size: 500 })

  const rows  = auditQ.data?.rows  ?? []
  const total = auditQ.data?.total ?? 0
  const users = usersQ.data?.users ?? []

  const reset = () => { setEntity('all'); setAction('all'); setUserId('all'); setDays(30); setOffset(0) }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1>Audit log</h1>
          <p>{auditQ.isLoading ? 'Loading…' : `${total} matching events`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn sm"
            disabled={!rows.length}
            onClick={() => exportCSV(`audit-${todayStamp()}`, [
              { header: 'When',    value: r => csvFmt.date(r.created_at) },
              { header: 'User',    value: r => r.user_name ?? r.user_email ?? r.user_id },
              { header: 'Action',  value: r => r.action },
              { header: 'Entity',  value: r => r.entity },
              { header: 'Record',  value: r => r.entity_id },
              { header: 'Notes',   value: r => r.notes ?? '' },
            ], rows)}
          >
            <Icons.Download /> Export
          </button>
          <button className="btn sm" onClick={reset}>Reset filters</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Field label="Entity">
            <select value={entity} onChange={e => { setEntity(e.target.value); setOffset(0) }} className="input" style={{ minWidth: 160 }}>
              <option value="all">All</option>
              {ENTITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Action">
            <select value={action} onChange={e => { setAction(e.target.value); setOffset(0) }} className="input" style={{ minWidth: 160 }}>
              <option value="all">All</option>
              {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="By user">
            <select value={userId} onChange={e => { setUserId(e.target.value); setOffset(0) }} className="input" style={{ minWidth: 200 }}>
              <option value="all">Everyone</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
            </select>
          </Field>
          <Field label="Time range">
            <select value={days} onChange={e => { setDays(Number(e.target.value)); setOffset(0) }} className="input" style={{ minWidth: 120 }}>
              <option value={1}>Last 24h</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={0}>All time</option>
            </select>
          </Field>
        </div>
      </div>

      {auditQ.error && (
        <div style={{
          background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)',
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12,
        }}>{(auditQ.error as Error).message}</div>
      )}

      <div className="card">
        {auditQ.isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>Loading events…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>No events match.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>When</th>
                  <th style={{ width: 200 }}>By user</th>
                  <th style={{ width: 160 }}>Action</th>
                  <th>Entity</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <Fragment key={r.id}>
                    <tr onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                      <td className="muted-num" style={{ fontSize: 12 }}>{fmt.dateTime(r.created_at)}</td>
                      <td>
                        {r.user_id && r.user_id !== '00000000-0000-0000-0000-000000000000' ? (
                          <Link href={`/admin/users/${r.user_id}`} className="row-link" onClick={e => e.stopPropagation()}>
                            {r.user_name ?? r.user_email ?? r.user_id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>System</span>
                        )}
                      </td>
                      <td><Pill tone={ACTION_TONE[r.action] ?? 'default'}>{r.action}</Pill></td>
                      <td>
                        <span className="strong" style={{ fontSize: 12.5 }}>{r.entity}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 6 }}>{r.entity_id.slice(0, 8)}</span>
                      </td>
                      <td>
                        <Icons.ChevronDown style={{ transform: expanded === r.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr>
                        <td colSpan={5} style={{ background: 'var(--bg-2)', padding: 14 }}>
                          <DiffPanel prev={r.prev_value} next={r.new_value} notes={r.notes} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 100 && (
        <div style={{ marginTop: 14 }}>
          <Pagination
            page={Math.floor(offset / 100) + 1}
            total={total}
            pageSize={100}
            onPage={p => setOffset((p - 1) * 100)}
          />
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function DiffPanel({ prev, next, notes }: {
  prev: Record<string, unknown> | null
  next: Record<string, unknown> | null
  notes: string | null
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
      {notes && <div style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{notes}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Block title="Before" body={prev} />
        <Block title="After"  body={next} />
      </div>
    </div>
  )
}
function Block({ title, body }: { title: string; body: Record<string, unknown> | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>{title}</div>
      <pre className="mono" style={{
        background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6,
        padding: 10, fontSize: 11, overflowX: 'auto', maxHeight: 200,
      }}>{body ? JSON.stringify(body, null, 2) : '—'}</pre>
    </div>
  )
}
