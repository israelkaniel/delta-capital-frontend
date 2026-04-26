'use client'
import { useMemo, useState } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { Pill } from '@/components/ui/pill'
import { useEmailLogsList } from '@/lib/queries'
import type { DbEmailLog } from '@/lib/api'

const WEBHOOK_URL = 'https://erfoydohkmtgnezpttqv.functions.supabase.co/webhooks-resend'

const EVENT_LABELS: Record<string, string> = {
  payment_recorded:    'Payment recorded',
  commission_earned:   'Commission earned',
  commission_reserved: 'Commission reserved',
  commission_released: 'Reserve released',
  monthly_summary:     'Monthly summary',
}

type Tone = 'default' | 'pos' | 'neg' | 'warn' | 'info' | 'accent'
const STATUS_TONE: Record<string, Tone> = {
  queued:     'default',
  sent:       'info',
  delivered:  'pos',
  opened:     'pos',
  clicked:    'accent',
  delayed:    'warn',
  bounced:    'neg',
  complained: 'neg',
  failed:     'neg',
}

const TERMINAL_STATUSES = new Set(['delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'])

const STATUS_OPTIONS = ['', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'delayed', 'bounced', 'complained', 'failed']
const EVENT_OPTIONS  = ['', ...Object.keys(EVENT_LABELS)]

export default function EmailLogsPage() {
  const [event, setEvent]   = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const queryParams = {
    ...(event  ? { event }  : {}),
    ...(status ? { status } : {}),
  }
  const logsQ = useEmailLogsList(queryParams)
  const logs  = logsQ.data ?? []

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(l =>
      l.to_email.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      (l.agents?.profiles?.name ?? '').toLowerCase().includes(q),
    )
  }, [logs, search])

  const kpis = useMemo(() => {
    const acc = { total: logs.length, sent: 0, delivered: 0, bounced: 0, failed: 0, webhookHits: 0 }
    for (const l of logs) {
      if (l.status === 'sent')                                  acc.sent++
      if (l.status === 'delivered' || l.status === 'opened' || l.status === 'clicked') acc.delivered++
      if (l.status === 'bounced' || l.status === 'complained')  acc.bounced++
      if (l.status === 'failed')                                acc.failed++
      if (TERMINAL_STATUSES.has(l.status))                      acc.webhookHits++
    }
    return acc
  }, [logs])

  // Heuristic: if any log shows a status that can only come from the webhook,
  // treat the webhook as connected.
  const webhookConnected = kpis.webhookHits > 0

  const exportCsv = () => {
    const header = ['Created', 'Status', 'Event', 'To', 'Subject', 'Agent', 'Resend ID', 'Error']
    const body = filtered.map(l => [
      l.created_at, l.status, l.event, l.to_email, l.subject,
      l.agents?.profiles?.name ?? '', l.resend_id ?? '', l.error ?? '',
    ])
    const csv = [header, ...body].map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `email-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyWebhookUrl = () => {
    navigator.clipboard?.writeText(WEBHOOK_URL).catch(() => {})
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Email Logs</h1>
          <p>{logsQ.isLoading ? 'Loading…' : `${filtered.length} of ${logs.length} entries`}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportCsv} disabled={filtered.length === 0}>
            <Icons.Download /> Export CSV
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi"><span className="kpi-label">Total</span><span className="kpi-val">{kpis.total}</span></div>
        <div className="kpi"><span className="kpi-label">Delivered / opened</span><span className="kpi-val" style={{ color: 'var(--pos)' }}>{kpis.delivered}</span></div>
        <div className="kpi"><span className="kpi-label">Sent (no webhook yet)</span><span className="kpi-val" style={{ color: 'var(--info-ink, var(--accent-ink))' }}>{kpis.sent}</span></div>
        <div className="kpi"><span className="kpi-label">Bounced / failed</span><span className="kpi-val" style={{ color: 'var(--neg)' }}>{kpis.bounced + kpis.failed}</span></div>
      </div>

      {/* What needs to happen */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h3>Resend webhook setup</h3>
            <div className="sub">
              {webhookConnected
                ? 'Detected delivery events from Resend — the webhook is reaching Supabase.'
                : 'No delivery events received yet. Until the webhook is registered, statuses freeze at "sent".'}
            </div>
          </div>
          <Pill tone={webhookConnected ? 'pos' : 'warn'} dot>
            {webhookConnected ? 'Connected' : 'Pending setup'}
          </Pill>
        </div>

        <div style={{ padding: '14px 18px 18px', display: 'grid', gap: 12 }}>
          <ChecklistRow
            done
            label="Edge Function deployed"
            detail="webhooks-resend (verify_jwt = false, Svix HMAC verification)"
          />
          <ChecklistRow
            done
            label="RESEND_API_KEY set in Supabase"
            detail="Used by the notify pipeline to call api.resend.com/emails"
          />
          <ChecklistRow
            done={webhookConnected}
            label="Webhook registered in Resend"
            detail={
              <span>
                Add at <a href="https://resend.com/webhooks" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-ink)' }}>resend.com/webhooks</a> with the URL below and copy the signing secret to Supabase as <code>RESEND_WEBHOOK_SECRET</code>.
              </span>
            }
          />
          <ChecklistRow
            done={webhookConnected}
            label="Subscribed events"
            detail="email.sent · email.delivered · email.delivery_delayed · email.bounced · email.complained · email.opened · email.clicked · email.failed"
          />

          <div style={{
            background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 8,
            padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <code style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--ink-1)' }}>{WEBHOOK_URL}</code>
            <button className="btn sm" onClick={copyWebhookUrl}><Icons.Copy /> Copy</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search by email, subject, agent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 240px', minWidth: 200 }}
          />
          <select className="input" value={event} onChange={e => setEvent(e.target.value)} style={{ flex: '0 0 200px' }}>
            {EVENT_OPTIONS.map(v => (
              <option key={v} value={v}>{v ? EVENT_LABELS[v] ?? v : 'All events'}</option>
            ))}
          </select>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
            {STATUS_OPTIONS.map(v => (
              <option key={v} value={v}>{v || 'All statuses'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {logsQ.isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
        ) : logsQ.error ? (
          <div style={{ padding: 28, color: 'var(--neg)', fontSize: 13 }}>{(logsQ.error as Error).message}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
            No email logs match the current filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 150 }}>When</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 170 }}>Event</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th style={{ width: 160 }}>Agent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => <Row key={l.id} log={l} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ log }: { log: DbEmailLog }) {
  const tone = STATUS_TONE[log.status] ?? 'default'
  const eventLabel = EVENT_LABELS[log.event] ?? log.event
  const agentName = log.agents?.profiles?.name ?? log.agents?.code ?? '—'
  return (
    <tr>
      <td>
        <div style={{ fontSize: 13 }}>{fmt.dateTime(log.created_at)}</div>
        {log.status_at !== log.created_at && (
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>updated {fmt.relTime(log.status_at)}</div>
        )}
      </td>
      <td>
        <Pill tone={tone} dot>{log.status}</Pill>
        {log.error && <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 4, maxWidth: 220 }} title={log.error}>{log.error}</div>}
      </td>
      <td>
        <span className="strong">{eventLabel}</span>
      </td>
      <td>
        <span className="mono" style={{ fontSize: 12.5 }}>{log.to_email}</span>
      </td>
      <td>
        <span style={{ fontSize: 13 }}>{log.subject}</span>
      </td>
      <td>
        <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{agentName}</span>
      </td>
    </tr>
  )
}

function ChecklistRow({ done, label, detail }: { done: boolean; label: string; detail: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: 18, height: 18, borderRadius: 9,
        background: done ? 'var(--pos-soft, #dcfce7)' : 'var(--bg-sunk)',
        border: `1px solid ${done ? 'var(--pos)' : 'var(--line)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        {done && <Icons.Check style={{ width: 11, height: 11, color: 'var(--pos)' }} />}
      </span>
      <div style={{ flex: 1, fontSize: 13 }}>
        <div style={{ fontWeight: 500 }}>{label}</div>
        <div style={{ color: 'var(--ink-3)', marginTop: 2, fontSize: 12.5, lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  )
}
