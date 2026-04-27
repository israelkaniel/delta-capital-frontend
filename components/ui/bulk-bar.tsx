'use client'
import { Icons } from '@/lib/icons'

export function BulkBar({ count, onClear, children }: {
  count: number
  onClear: () => void
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div style={{
      margin: '10px 0',
      padding: '10px 16px',
      background: 'var(--bg-sunk)',
      border: '1px solid var(--line)',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{count} selected</span>
      {children}
      <div style={{ flex: 1 }} />
      <button className="btn sm ghost" onClick={onClear} style={{ color: 'var(--ink-4)' }}>
        <Icons.X /> Clear
      </button>
    </div>
  )
}

// Header checkbox with auto indeterminate state
export function BulkHeaderCheckbox({ selectedCount, totalCount, onToggleAll }: {
  selectedCount: number
  totalCount: number
  onToggleAll: () => void
}) {
  return (
    <input
      type="checkbox"
      checked={totalCount > 0 && selectedCount === totalCount}
      ref={el => { if (el) el.indeterminate = selectedCount > 0 && selectedCount < totalCount }}
      onChange={onToggleAll}
    />
  )
}
