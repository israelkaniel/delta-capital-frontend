'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/drawer'
import { Icons } from '@/lib/icons'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast/toast'
import { api, type DbDeal, type DbAgent } from '@/lib/api'
import { getActiveAgents } from '@/lib/lookups'

type Split = { agent: DbAgent; pct: string }

export function ManageAgentsModal({
  open, onClose, deal, onDone,
}: {
  open: boolean
  onClose: () => void
  deal: DbDeal
  onDone: () => void
}) {
  const toast = useToast()
  const [allAgents, setAllAgents] = useState<DbAgent[]>([])
  const [splits, setSplits] = useState<Split[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQ, setPickerQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    getActiveAgents().then(list => {
      setAllAgents(list)

      // Hydrate current splits from deal.deal_agents
      const existing: Split[] = []
      for (const da of deal.deal_agents ?? []) {
        const a = list.find(x => x.id === da.agent_id) ?? (da.agents as DbAgent | undefined)
        if (a) existing.push({ agent: a, pct: String(da.share) })
      }
      setSplits(existing)
    })
  }, [open, deal])

  const total = splits.reduce((s, x) => s + (parseFloat(x.pct) || 0), 0)
  const sumOk = splits.length === 0 || Math.abs(total - 100) < 0.01

  const available = allAgents.filter(a =>
    !splits.find(s => s.agent.id === a.id) &&
    (a.profiles?.name ?? a.code ?? '').toLowerCase().includes(pickerQ.toLowerCase())
  )

  const add = (a: DbAgent) => {
    const remaining = Math.max(0, 100 - total)
    setSplits(prev => [...prev, { agent: a, pct: String(remaining) }])
    setPickerQ(''); setPickerOpen(false)
  }
  const remove = (id: string) => setSplits(prev => prev.filter(s => s.agent.id !== id))
  const update = (id: string, pct: string) =>
    setSplits(prev => prev.map(s => s.agent.id === id ? { ...s, pct } : s))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      if (!sumOk) throw new Error('Shares must sum to 100')
      const res = await api.deals.setAgents(
        deal.id,
        splits.map(s => ({ agent_id: s.agent.id, share: parseFloat(s.pct) || 0 })),
      )
      if (res.error) throw res.error
      toast.success('Agents updated', `${res.data?.count ?? splits.length} on this deal`)
      onDone()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const distributeEqually = () => {
    if (splits.length === 0) return
    const each = Math.round((100 / splits.length) * 100) / 100
    const last = Math.round((100 - each * (splits.length - 1)) * 100) / 100
    setSplits(prev => prev.map((s, i) => ({ ...s, pct: String(i === prev.length - 1 ? last : each) })))
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="modal-head">
        <span>Manage agents on this deal</span>
        <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
      </div>

      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 540 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            Add or remove agents and adjust their share percentages.
          </div>
          <div style={{
            fontSize: 12.5, fontWeight: 600,
            color: splits.length === 0 ? 'var(--ink-4)' : sumOk ? 'var(--pos)' : total > 100 ? 'var(--neg)' : 'var(--warn)',
          }}>
            {total.toFixed(0)}% / 100%
          </div>
        </div>

        {splits.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, background: 'var(--bg-sunk)', borderRadius: 8 }}>
            No agents assigned to this deal yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {splits.map(s => {
              const name = s.agent.profiles?.name ?? s.agent.code ?? s.agent.id.slice(0, 8)
              const hue = (s.agent.id.charCodeAt(0) * 37) % 360
              return (
                <div key={s.agent.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', border: '1px solid var(--line)',
                  borderRadius: 9, background: 'var(--bg-elev)',
                }}>
                  <Avatar name={name} hue={hue} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                    {s.agent.code && <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{s.agent.code}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input
                      className="input"
                      type="number" step="0.01"
                      style={{ width: 80, textAlign: 'right', padding: '4px 8px' }}
                      value={s.pct}
                      onChange={e => update(s.agent.id, e.target.value)}
                    />
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>%</span>
                  </div>
                  <button
                    className="btn sm ghost" style={{ padding: '3px 6px' }}
                    onClick={() => remove(s.agent.id)} type="button" aria-label="Remove"
                  >
                    <Icons.X />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {splits.length > 0 && (
          <button className="btn sm ghost" onClick={distributeEqually} type="button" style={{ alignSelf: 'flex-start' }}>
            Distribute equally
          </button>
        )}

        {available.length > 0 && (
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search and add agent…"
              value={pickerQ}
              onChange={e => { setPickerQ(e.target.value); setPickerOpen(true) }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 200)}
            />
            {pickerOpen && (
              <div className="search-drop">
                {available.slice(0, 10).map(a => {
                  const name = a.profiles?.name ?? a.code ?? a.id.slice(0, 8)
                  const hue = (a.id.charCodeAt(0) * 37) % 360
                  return (
                    <div key={a.id} className="search-drop-item" onMouseDown={() => add(a)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={name} hue={hue} size="sm" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                          {a.code && <div style={{ fontSize: 11, color: 'var(--ink-4)' }} className="mono">{a.code}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!sumOk && splits.length > 0 && (
          <div style={{
            fontSize: 12, padding: '8px 12px', borderRadius: 8,
            color: total > 100 ? 'var(--neg)' : 'var(--warn)',
            background: total > 100
              ? 'color-mix(in oklch, var(--neg) 10%, transparent)'
              : 'color-mix(in oklch, var(--warn) 10%, transparent)',
          }}>
            {total > 100
              ? `Over by ${(total - 100).toFixed(0)}% — reduce shares`
              : `${(100 - total).toFixed(0)}% unallocated`}
          </div>
        )}

        <div style={{ background: 'var(--bg-sunk)', padding: '10px 12px', borderRadius: 6, fontSize: 11.5, color: 'var(--ink-3)' }}>
          Note: agents that already have a commission on this deal cannot be removed.
        </div>

        {error && (
          <div style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg-line)', color: 'var(--neg)', padding: '8px 12px', borderRadius: 6, fontSize: 12.5 }}>{error}</div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={handleSave} disabled={saving || !sumOk}>
          {saving ? 'Saving…' : 'Save agents'}
        </button>
      </div>
    </Modal>
  )
}
