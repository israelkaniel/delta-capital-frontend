'use client'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useToast } from '@/components/ui/toast/toast'
import { api, type PaymentType, type PaymentStatus } from '@/lib/api'
import { useAgentsList, useAgentSummaryAvailable, useMonthlySummaryAvailable } from '@/lib/queries'

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'check',         label: 'Check' },
  { value: 'cash',          label: 'Cash' },
  { value: 'other',         label: 'Other' },
]

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending',   label: 'Pending' },
  { value: 'paid',      label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

export interface PaymentFormModalProps {
  open: boolean
  onClose: () => void
  onDone?: () => void
  /** Lock agent to a specific id and skip the picker (used by /payout per-row Pay). */
  lockAgentId?: string
  /** Flow B — link payment to a monthly summary; amount prefilled with summary's available. */
  monthlySummaryId?: string
  monthlySummaryAvailable?: number
  monthlySummaryLabel?: string
}

export function PaymentFormModal(props: PaymentFormModalProps) {
  const { open, onClose, onDone } = props
  const toast = useToast()

  const today = new Date().toISOString().split('T')[0]

  const [agentId, setAgentId] = useState(props.lockAgentId ?? '')
  const [amount, setAmount]   = useState(props.monthlySummaryAvailable != null ? String(props.monthlySummaryAvailable) : '')
  const [paymentType, setPaymentType] = useState<PaymentType>('bank_transfer')
  const [status, setStatus]           = useState<PaymentStatus>('pending')
  const [reference, setReference]     = useState('')
  const [paymentDate, setPaymentDate] = useState(today)
  const [notes, setNotes]             = useState('')
  const [pullMode, setPullMode]       = useState<'full' | 'custom'>(props.monthlySummaryId ? 'full' : 'custom')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const agentsQ  = useAgentsList()
  const agents   = agentsQ.data ?? []
  const summaryQ        = useAgentSummaryAvailable(agentId, !props.monthlySummaryId)
  const monthlyAvailQ   = useMonthlySummaryAvailable(props.monthlySummaryId ?? '', !!props.monthlySummaryId && props.monthlySummaryAvailable == null)

  const totalAvailable = props.monthlySummaryId
    ? Number(props.monthlySummaryAvailable ?? monthlyAvailQ.data ?? 0)
    : Number(summaryQ.data?.total_available ?? 0)

  // Reset internal state each open so a stale form doesn't pollute the next use
  useEffect(() => {
    if (!open) return
    setAgentId(props.lockAgentId ?? '')
    setAmount(props.monthlySummaryAvailable != null ? String(props.monthlySummaryAvailable) : '')
    setPaymentType('bank_transfer')
    setStatus('pending')
    setReference('')
    setPaymentDate(today)
    setNotes('')
    setPullMode(props.monthlySummaryId ? 'full' : 'custom')
    setError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // When pullMode = 'full' and we have an available number, snap amount to it.
  useEffect(() => {
    if (pullMode !== 'full' || totalAvailable <= 0) return
    setAmount(String(totalAvailable))
  }, [pullMode, totalAvailable])

  // For Flow B (monthly summary) — once async RPC resolves, prefill amount.
  useEffect(() => {
    if (props.monthlySummaryId && monthlyAvailQ.data != null && !amount) {
      setAmount(String(monthlyAvailQ.data))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyAvailQ.data])

  const agentName = useMemo(() => {
    const a = agents.find(x => x.id === agentId)
    return a?.profiles?.name ?? a?.code ?? ''
  }, [agentId, agents])

  const showRefDate = status === 'paid'
  const canShowBanner = totalAvailable > 0 && agentId

  const submit = async () => {
    setError(null)
    const n = Number(amount)
    if (!agentId)         return setError('Select an agent')
    if (!n || n <= 0)     return setError('Enter a positive amount')
    if (status === 'paid' && !reference.trim()) return setError('Reference number is required when status is Paid')
    if (status === 'paid' && !paymentDate)      return setError('Payment date is required when status is Paid')

    setSaving(true)
    const res = await api.payments.create({
      agent_id:           agentId,
      amount:             n,
      payment_type:       paymentType,
      status,
      reference_number:   reference.trim() || undefined,
      payment_date:       status === 'paid' ? paymentDate : undefined,
      notes:              notes.trim() || undefined,
      monthly_summary_id: props.monthlySummaryId,
    })
    setSaving(false)
    if (res.error) { setError(res.error.message); return }
    toast.success('Payment created', `${fmt.money(n)}${agentName ? ' · ' + agentName : ''}`)
    onDone?.()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <span>New payment</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 480 }}>
        {/* Agent picker (Flow A) or locked badge */}
        <div className="field">
          <label style={lblStyle}>Agent</label>
          {props.lockAgentId || props.monthlySummaryId ? (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: 'var(--bg-sunk)',
              border: '1px solid var(--line)', fontSize: 13, fontWeight: 600,
            }}>
              {agentName || agentId}
              {props.monthlySummaryLabel && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>
                  · {props.monthlySummaryLabel}
                </span>
              )}
            </div>
          ) : (
            <select className="input" value={agentId} onChange={e => setAgentId(e.target.value)}>
              <option value="">Select an agent…</option>
              {agents.filter(a => a.is_active).map(a => (
                <option key={a.id} value={a.id}>
                  {a.profiles?.name ?? a.code ?? a.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Available banner */}
        {canShowBanner && (
          <div style={{
            background: 'var(--accent-soft)', border: '1px solid var(--accent-line, var(--line))',
            color: 'var(--accent-ink)', padding: '12px 14px', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ fontSize: 13 }}>
              {props.monthlySummaryId ? 'This summary has' : `${agentName || 'Agent'} has`}
              {' '}
              <strong>{fmt.money(totalAvailable)}</strong>
              {' '}
              available
              {props.monthlySummaryId ? ' to draw' : ' across all summaries'}
            </div>
          </div>
        )}

        {/* Pull mode toggle */}
        {canShowBanner && !props.monthlySummaryId && (
          <div className="field">
            <div style={{ display: 'flex', gap: 8 }}>
              <PullToggle
                active={pullMode === 'full'}
                onClick={() => { setPullMode('full'); setAmount(String(totalAvailable)) }}
                label={`Withdraw full available (${fmt.money(totalAvailable)})`}
              />
              <PullToggle
                active={pullMode === 'custom'}
                onClick={() => setPullMode('custom')}
                label="Custom amount"
              />
            </div>
          </div>
        )}

        {/* Amount + Payment type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label style={lblStyle}>Amount</label>
            <input
              className="input" type="number" min={0} step="0.01" placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setPullMode('custom') }}
              readOnly={pullMode === 'full' && !props.monthlySummaryId}
            />
          </div>
          <div className="field">
            <label style={lblStyle}>Payment type</label>
            <select className="input" value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>
              {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Status */}
        <div className="field">
          <label style={lblStyle}>Status</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value as PaymentStatus)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Conditional: reference + payment date when status = paid */}
        {showRefDate && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label style={lblStyle}>Reference number <span style={{ color: 'var(--neg)' }}>*</span></label>
              <input className="input" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. bank wire #12345" />
            </div>
            <div className="field">
              <label style={lblStyle}>Payment date <span style={{ color: 'var(--neg)' }}>*</span></label>
              <input className="input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label style={lblStyle}>Notes</label>
          <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {error && (
          <div style={{
            background: 'var(--neg-soft)', border: '1px solid var(--neg-line)',
            color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5,
          }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save payment'}
        </button>
      </div>
    </Modal>
  )
}

function PullToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 12px', borderRadius: 8,
        border: `1px solid ${active ? 'var(--accent-ink)' : 'var(--line)'}`,
        background: active ? 'var(--accent-soft)' : 'var(--bg)',
        color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
        fontSize: 12.5, cursor: 'pointer', fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )
}

const lblStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6,
}
