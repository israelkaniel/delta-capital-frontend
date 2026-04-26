'use client'
import { fmt } from '@/lib/fmt'
import { Pill } from '@/components/ui/pill'
import { Icons } from '@/lib/icons'
import Link from 'next/link'
import type { DbEmailLog } from '@/lib/api'

const EVENT_LABELS: Record<string, string> = {
  payment_recorded:    'Payment recorded',
  commission_earned:   'Commission earned',
  commission_reserved: 'Commission reserved',
  commission_released: 'Reserve released',
  monthly_summary:     'Monthly summary',
}

type Tone = 'default' | 'pos' | 'neg' | 'warn' | 'info' | 'accent'
const STATUS_TONE: Record<string, Tone> = {
  queued: 'default', sent: 'info',
  delivered: 'pos', opened: 'pos', clicked: 'accent',
  delayed: 'warn', bounced: 'neg', complained: 'neg', failed: 'neg',
}

export function EmailLogPanel({
  logs, loading, error, emptyMessage = 'No emails for this record yet.', showAgent = false,
}: {
  logs: DbEmailLog[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  showAgent?: boolean
}) {
  if (loading) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
  }
  if (error) {
    return <div style={{ padding: 24, color: 'var(--neg)', fontSize: 13 }}>{error}</div>
  }
  if (logs.length === 0) {
    return <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>{emptyMessage}</div>
  }
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 150 }}>When</th>
            <th style={{ width: 110 }}>Status</th>
            <th style={{ width: 170 }}>Event</th>
            <th>Recipient</th>
            <th>Subject</th>
            {showAgent && <th style={{ width: 160 }}>Agent</th>}
          </tr>
        </thead>
        <tbody>
          {logs.map(l => {
            const tone = STATUS_TONE[l.status] ?? 'default'
            const eventLabel = EVENT_LABELS[l.event] ?? l.event
            return (
              <tr key={l.id}>
                <td>
                  <div style={{ fontSize: 13 }}>{fmt.dateTime(l.created_at)}</div>
                  {l.status_at !== l.created_at && (
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>updated {fmt.relTime(l.status_at)}</div>
                  )}
                </td>
                <td>
                  <Pill tone={tone} dot>{l.status}</Pill>
                  {l.error && <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 4, maxWidth: 220 }} title={l.error}>{l.error}</div>}
                </td>
                <td><span className="strong">{eventLabel}</span></td>
                <td><span className="mono" style={{ fontSize: 12.5 }}>{l.to_email}</span></td>
                <td><span style={{ fontSize: 13 }}>{l.subject}</span></td>
                {showAgent && (
                  <td>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                      {l.agents?.profiles?.name ?? l.agents?.code ?? '—'}
                    </span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{
        padding: '11px 18px', borderTop: '1px solid var(--line)',
        fontSize: 11.5, color: 'var(--ink-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{logs.length} email{logs.length !== 1 ? 's' : ''} on this record</span>
        <Link href="/email-logs" style={{ color: 'var(--accent-ink)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          See all email logs <Icons.Chevron />
        </Link>
      </div>
    </div>
  )
}

export function emailToTimelineItem(log: DbEmailLog) {
  const eventLabel = EVENT_LABELS[log.event] ?? log.event
  const status = log.status
  const accent: 'pos' | 'neg' | 'warn' | 'accent' | 'default' =
    status === 'delivered' || status === 'opened' || status === 'clicked' ? 'pos' :
    status === 'bounced' || status === 'complained' || status === 'failed' ? 'neg' :
    status === 'delayed' ? 'warn' :
    status === 'sent' ? 'accent' : 'default'
  return {
    id: 'e-' + log.id,
    ts: log.created_at,
    accent,
    title: `${eventLabel} email — ${status}`,
    body: `To ${log.to_email} · ${log.subject}${log.error ? ' · ' + log.error : ''}`,
    icon: 'mail' as const,
  }
}
