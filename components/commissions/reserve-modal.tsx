'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useToast } from '@/components/ui/toast/toast'
import { api, type DbCommission, type DbCommissionReserve } from '@/lib/api'

type Mode = 'reserve' | 'release' | 'reverse'

const COPY: Record<Mode, { title: string; verb: string; btn: string; tone: 'warn' | 'pos' | 'neg' }> = {
  reserve: { title: 'Place in reserve',    verb: 'reserve',          btn: 'Place in reserve',    tone: 'warn' },
  release: { title: 'Release from reserve', verb: 'release',          btn: 'Release to agent',    tone: 'pos'  },
  reverse: { title: 'Reverse commission',   verb: 'permanently reverse', btn: 'Reverse permanently', tone: 'neg'  },
}

export function ReserveModal({
  mode, open, onClose, commission, reserve, onDone,
}: {
  mode: Mode
  open: boolean
  onClose: () => void
  commission: DbCommission
  reserve?: DbCommissionReserve
  onDone: () => void
}) {
  const toast = useToast()
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState('')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const copy = COPY[mode]
  const available = Number(commission.released_amount)

  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      if (mode === 'reserve') {
        const n = Number(amount)
        if (!n || n <= 0) throw new Error('Enter a valid amount')
        if (n > available) throw new Error(`Amount exceeds available (${fmt.money(available)})`)
        const res = await api.reserve({ commission_id: commission.id, amount: n, reason: reason || undefined })
        if (res.error) throw res.error
      } else if (mode === 'release') {
        if (!reserve) throw new Error('No reserve selected')
        const res = await api.release({ reserve_id: reserve.id, notes: notes || undefined })
        if (res.error) throw res.error
      } else {
        if (!reserve) throw new Error('No reserve selected')
        const res = await api.reverse({ reserve_id: reserve.id, notes: notes || undefined })
        if (res.error) throw res.error
      }
      const labels = { reserve: 'Reserve placed', release: 'Reserve released', reverse: 'Commission reversed' }
      toast.success(labels[mode])
      onDone()
      handleClose()
    } catch (e: any) {
      setError(e?.message ?? 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setAmount(''); setReason(''); setNotes(''); setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="modal-head">
        <span>{copy.title}</span>
        <button className="close-btn" onClick={handleClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 420 }}>
        <div style={{
          background: 'var(--bg-sunk)', padding: '12px 14px', borderRadius: 8,
          fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 16,
        }}>
          <div>Commission <span className="mono" style={{ color: 'var(--ink-2)' }}>{commission.id.slice(0, 8)}</span></div>
          <div>Gross <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{fmt.money(Number(commission.total_amount))}</span></div>
          {mode === 'reserve' && <div>Available <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{fmt.money(available)}</span></div>}
          {reserve && <div>Reserve <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{fmt.money(Number(reserve.amount))}</span></div>}
        </div>

        {mode === 'reserve' && (
          <>
            <div className="field">
              <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                Amount to reserve
              </label>
              <input
                className="input"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Up to ${available}`}
                max={available}
                min={0}
                step="0.01"
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="button" className="btn sm ghost" onClick={() => setAmount(String(available))}>Full</button>
                <button type="button" className="btn sm ghost" onClick={() => setAmount(String(Math.round(available / 2 * 100) / 100))}>Half</button>
              </div>
            </div>
            <div className="field">
              <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                Reason (optional)
              </label>
              <textarea
                className="input"
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. borrower default risk, pending early pay period…"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </>
        )}

        {(mode === 'release' || mode === 'reverse') && (
          <div className="field">
            <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
              Notes {mode === 'reverse' && <span style={{ color: 'var(--neg)' }}>(this action cannot be undone)</span>}
            </label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={mode === 'reverse' ? 'Why is this commission being permanently reversed?' : 'Why is this being released?'}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--neg-soft)', border: '1px solid var(--neg-line)',
            color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5,
          }}>
            {error}
          </div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={handleClose} disabled={saving}>Cancel</button>
        <button
          className={`btn ${mode === 'reverse' ? 'danger' : mode === 'release' ? 'success' : 'primary'}`}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : copy.btn}
        </button>
      </div>
    </Modal>
  )
}
