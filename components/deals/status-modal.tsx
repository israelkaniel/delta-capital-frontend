'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbDeal } from '@/lib/api'

const STATUSES = [
  { v: 'PENDING',           label: 'Pending',          tone: 'var(--warn)' },
  { v: 'APPROVED',          label: 'Approved',         tone: 'var(--accent)' },
  { v: 'FUNDS_TRANSFERRED', label: 'Funds transferred', tone: 'var(--pos)' },
  { v: 'CANCELLED',         label: 'Cancelled',         tone: 'var(--neg)' },
] as const

const today = () => new Date().toISOString().split('T')[0]

export function DealStatusModal({
  open, onClose, deal, onDone,
}: {
  open: boolean
  onClose: () => void
  deal: DbDeal
  onDone: () => void
}) {
  const [status, setStatus] = useState(deal.status)
  const [transferred, setTransferred] = useState(deal.transferred_amount != null ? String(deal.transferred_amount) : '')
  const [payback, setPayback] = useState(deal.payback_amount != null ? String(deal.payback_amount) : '')
  const [date, setDate] = useState(deal.funds_transferred_at?.split('T')[0] ?? today())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStatus(deal.status)
    setTransferred(deal.transferred_amount != null ? String(deal.transferred_amount) : '')
    setPayback(deal.payback_amount != null ? String(deal.payback_amount) : '')
    setDate(deal.funds_transferred_at?.split('T')[0] ?? today())
    setError(null); setWarning(null)
  }, [open, deal])

  const willCalc = status === 'FUNDS_TRANSFERRED' && deal.status !== 'FUNDS_TRANSFERRED'

  const handleSubmit = async () => {
    setSaving(true); setError(null); setWarning(null)
    try {
      const body: Parameters<typeof api.deals.updateStatus>[1] = { status }
      if (transferred !== '') body.transferred_amount = Number(transferred)
      if (payback !== '')     body.payback_amount     = Number(payback)
      if (status === 'FUNDS_TRANSFERRED') body.funds_transferred_at = date
      const res = await api.deals.updateStatus(deal.id, body)
      if (res.error) throw res.error
      const data = res.data as any
      if (data?.commission_warning) {
        setWarning('Status saved but commission calc failed: ' + data.commission_warning)
        return
      }
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <span>Update deal status</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 460 }}>
        <div className="field">
          <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>
            Status
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STATUSES.map(s => (
              <label key={s.v} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 6,
                cursor: 'pointer',
                background: status === s.v ? 'var(--bg-hover)' : 'transparent',
              }}>
                <input
                  type="radio" name="status" value={s.v}
                  checked={status === s.v}
                  onChange={() => setStatus(s.v as DbDeal['status'])}
                />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.tone }} />
                <span style={{ fontSize: 13 }}>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Transferred amount">
            <input className="input" type="number" step="0.01" value={transferred} onChange={e => setTransferred(e.target.value)} />
          </Field>
          <Field label="Payback amount">
            <input className="input" type="number" step="0.01" value={payback} onChange={e => setPayback(e.target.value)} />
          </Field>
        </div>

        {status === 'FUNDS_TRANSFERRED' && (
          <Field label="Funded on">
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        )}

        {willCalc && (
          <div style={{
            background: 'var(--accent-soft)', color: 'var(--accent-ink)',
            padding: '10px 12px', borderRadius: 6, fontSize: 12.5, lineHeight: 1.5,
          }}>
            <strong>Commissions will be calculated</strong> for all assigned agents using the rule valid on {fmt.date(date)}.
          </div>
        )}

        {warning && (
          <div style={{ background: 'var(--warn-soft, #fef3c7)', border: '1px solid var(--warn)', color: 'var(--warn)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{warning}</div>
        )}
        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Update status'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
