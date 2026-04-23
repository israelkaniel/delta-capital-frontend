'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api } from '@/lib/api'

export function RecordPaymentModal({
  open, onClose, agentId, agentName, suggestedAmount, onDone,
}: {
  open: boolean
  onClose: () => void
  agentId: string
  agentName: string
  suggestedAmount: number
  onDone: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [amount, setAmount] = useState(String(suggestedAmount || ''))
  const [date, setDate] = useState(today)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      const n = Number(amount)
      if (!n || n <= 0) throw new Error('Enter a valid amount')
      if (!date) throw new Error('Payment date is required')
      const res = await api.payments.create({
        agent_id: agentId, amount: n, payment_date: date,
        reference: reference || undefined, notes: notes || undefined,
      })
      if (res.error) throw res.error
      onDone()
      handleClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setAmount(''); setReference(''); setNotes(''); setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="modal-head">
        <span>Record payment</span>
        <button className="close-btn" onClick={handleClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 440 }}>
        <div style={{
          background: 'var(--bg-sunk)', padding: '10px 14px', borderRadius: 8,
          fontSize: 12, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Agent <strong style={{ color: 'var(--ink-1)' }}>{agentName}</strong></span>
          <span>Available <strong style={{ color: 'var(--ink-1)' }}>{fmt.money(suggestedAmount)}</strong></span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
              Amount
            </label>
            <input
              className="input"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={0}
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div className="field">
            <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
              Payment date
            </label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
            Reference (optional)
          </label>
          <input
            className="input"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="e.g. bank transfer #12345"
          />
        </div>

        <div className="field">
          <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
            Notes (optional)
          </label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{
            background: 'var(--neg-soft)', border: '1px solid var(--neg-line)',
            color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5,
          }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={handleClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Recording…' : 'Record payment'}
        </button>
      </div>
    </Modal>
  )
}
