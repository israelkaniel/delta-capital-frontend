'use client'
import { useState } from 'react'
import { Modal } from './drawer'
import { Icons } from '@/lib/icons'

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, message, confirmLabel = 'Confirm', tone = 'primary',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  message: string
  confirmLabel?: string
  tone?: 'primary' | 'danger'
}) {
  const [busy, setBusy] = useState(false)

  const handle = async () => {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <span>{title}</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>
      <div className="modal-body" style={{ minWidth: 380 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{message}</p>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button
          className={`btn ${tone === 'danger' ? 'danger' : 'primary'}`}
          onClick={handle}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
