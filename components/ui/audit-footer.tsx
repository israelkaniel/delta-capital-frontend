'use client'
import { fmt } from '@/lib/fmt'

export function AuditFooter({
  createdAt, updatedAt, createdBy, updatedBy, compact,
}: {
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: { name?: string } | string | null
  updatedBy?: { name?: string } | string | null
  compact?: boolean
}) {
  if (!createdAt && !updatedAt) return null

  const createdName = typeof createdBy === 'string' ? createdBy : createdBy?.name
  const updatedName = typeof updatedBy === 'string' ? updatedBy : updatedBy?.name
  const showUpdated = updatedAt && (!createdAt || updatedAt !== createdAt)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: compact ? '8px 12px' : '12px 18px',
      borderTop: '1px solid var(--line)',
      background: 'var(--bg-sunk)',
      fontSize: 11.5, color: 'var(--ink-4)',
      flexWrap: 'wrap',
    }}>
      {createdAt && (
        <div>
          <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Created</span>{' '}
          <span style={{ color: 'var(--ink-2)' }}>{fmt.dateTime(createdAt)}</span>
          {createdName && <> by <strong style={{ color: 'var(--ink-2)' }}>{createdName}</strong></>}
        </div>
      )}
      {showUpdated && (
        <>
          <span style={{ color: 'var(--ink-5)' }}>•</span>
          <div>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Updated</span>{' '}
            <span style={{ color: 'var(--ink-2)' }}>{fmt.dateTime(updatedAt!)}</span>
            {fmt.relTime(updatedAt!) && (
              <span style={{ color: 'var(--ink-4)' }}> · {fmt.relTime(updatedAt!)}</span>
            )}
            {updatedName && <> by <strong style={{ color: 'var(--ink-2)' }}>{updatedName}</strong></>}
          </div>
        </>
      )}
    </div>
  )
}
