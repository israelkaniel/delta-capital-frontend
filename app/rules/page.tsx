'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Icons } from '@/lib/icons'
import { Pill } from '@/components/ui/pill'
import { fmt } from '@/lib/fmt'
import { api, type DbFunder, type DbAgent, type DbGlobalRule, type DbAgentRule } from '@/lib/api'
import { dbAgents, dbFunders, dbRules } from '@/lib/db'
import { RuleEditor } from '@/components/rules/rule-editor'

const TABS = [
  { key: 'global', label: 'Global rules' },
  { key: 'agent',  label: 'Agent overrides' },
] as const

type TabKey = typeof TABS[number]['key']

const isActive = (r: { valid_from: string; valid_to: string | null }) => {
  const now = new Date().toISOString().split('T')[0]
  if (r.valid_from > now) return false
  if (r.valid_to && r.valid_to < now) return false
  return true
}

const formatRate = (r: { type: string; fixed_rate: number | null; commission_tiers?: { rate: number }[]; agent_commission_tiers?: { rate: number }[] }) => {
  if (r.type === 'FIXED_PERCENT') return r.fixed_rate != null ? `${Number(r.fixed_rate)}%` : '—'
  const tiers = r.commission_tiers ?? r.agent_commission_tiers ?? []
  if (tiers.length === 0) return 'Tiered (no tiers)'
  const min = Math.min(...tiers.map(t => Number(t.rate)))
  const max = Math.max(...tiers.map(t => Number(t.rate)))
  return min === max ? `${min}%` : `${min}–${max}%`
}

export default function RulesPage() {
  const [tab, setTab] = useState<TabKey>('global')
  const [funders, setFunders] = useState<DbFunder[]>([])
  const [agents, setAgents] = useState<DbAgent[]>([])
  const [globalRules, setGlobalRules] = useState<DbGlobalRule[]>([])
  const [agentRules, setAgentRules] = useState<DbAgentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DbGlobalRule | DbAgentRule | undefined>(undefined)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [f, a, g, ar] = await Promise.all([
      dbFunders.list(),
      dbAgents.list(),
      dbRules.globalList(),
      dbRules.agentList(),
    ])
    setFunders(f.data ?? [])
    setAgents(a.data ?? [])
    setGlobalRules(g.data ?? [])
    setAgentRules(ar.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const visibleGlobal = useMemo(
    () => showInactive ? globalRules : globalRules.filter(isActive),
    [globalRules, showInactive],
  )
  const visibleAgent = useMemo(
    () => showInactive ? agentRules : agentRules.filter(isActive),
    [agentRules, showInactive],
  )

  const groupedGlobal = useMemo(() => {
    const map = new Map<string, { funder: { id: string; name: string }; rules: DbGlobalRule[] }>()
    for (const r of visibleGlobal) {
      const f = (r as any).funders ?? funders.find(x => x.id === r.funder_id)
      const fid = f?.id ?? r.funder_id
      const key = fid
      if (!map.has(key)) map.set(key, { funder: { id: fid, name: f?.name ?? '—' }, rules: [] })
      map.get(key)!.rules.push(r)
    }
    return Array.from(map.values())
  }, [visibleGlobal, funders])

  const groupedAgent = useMemo(() => {
    const map = new Map<string, { agent: { id: string; name: string }; rules: DbAgentRule[] }>()
    for (const r of visibleAgent) {
      const a = (r as any).agents ?? agents.find(x => x.id === r.agent_id)
      const aid = r.agent_id
      const name = a?.profiles?.name ?? a?.code ?? aid.slice(0, 8)
      if (!map.has(aid)) map.set(aid, { agent: { id: aid, name }, rules: [] })
      map.get(aid)!.rules.push(r)
    }
    return Array.from(map.values())
  }, [visibleAgent, agents])

  const onEdit = (r: DbGlobalRule | DbAgentRule) => { setEditing(r); setEditorOpen(true) }
  const onAdd  = () => { setEditing(undefined); setEditorOpen(true) }

  const onDeactivate = async (id: string) => {
    if (!confirm('Deactivate this rule? It will keep its history but stop applying to new deals.')) return
    const res = tab === 'global' ? await api.rules.globalDeactivate(id) : await api.rules.agentDeactivate(id)
    if (res.error) alert(res.error.message)
    refresh()
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Commission rules</h1>
          <p>{loading ? 'Loading…' : `${globalRules.length} global · ${agentRules.length} agent overrides`}</p>
        </div>
        <div className="actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <button className="btn primary" onClick={onAdd}>
            <Icons.Plus /> {tab === 'global' ? 'New global rule' : 'New agent override'}
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="badge">{t.key === 'global' ? globalRules.length : agentRules.length}</span>
          </button>
        ))}
      </div>

      {tab === 'global' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groupedGlobal.length === 0 && !loading && (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
              No global rules yet. Click &quot;New global rule&quot; to get started.
            </div></div>
          )}
          {groupedGlobal.map(({ funder, rules }) => (
            <div className="card" key={funder.id}>
              <div className="card-head">
                <div>
                  <h3>{funder.name}</h3>
                  <div className="sub">{rules.length} rule{rules.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="card-body flush">
                {rules.map((r, i) => (
                  <div key={r.id} style={{
                    padding: '14px 18px',
                    borderBottom: i < rules.length - 1 ? '1px solid var(--line)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: isActive(r) ? 1 : 0.5,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <Pill tone="info">{r.type === 'FIXED_PERCENT' ? 'Fixed' : 'Tiered'}</Pill>
                        {!isActive(r) && <Pill tone="default">Inactive</Pill>}
                        {r.notes && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.notes}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        Valid {fmt.dateShort(r.valid_from)} → {r.valid_to ? fmt.dateShort(r.valid_to) : '∞'}
                        {r.commission_tiers && r.commission_tiers.length > 0 && (
                          <span style={{ marginLeft: 12 }}>{r.commission_tiers.length} tier{r.commission_tiers.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                      {formatRate(r)}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn sm ghost" onClick={() => onEdit(r)}>Edit</button>
                      {isActive(r) && (
                        <button className="btn sm danger" onClick={() => onDeactivate(r.id)}>Deactivate</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groupedAgent.length === 0 && !loading && (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
              No agent-specific rules. Add overrides to grant agents bonuses or replacement rates.
            </div></div>
          )}
          {groupedAgent.map(({ agent, rules }) => (
            <div className="card" key={agent.id}>
              <div className="card-head">
                <div>
                  <h3>{agent.name}</h3>
                  <div className="sub">{rules.length} override{rules.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="card-body flush">
                {rules.map((r, i) => {
                  const f = (r as any).funders ?? funders.find(x => x.id === r.funder_id)
                  return (
                    <div key={r.id} style={{
                      padding: '14px 18px',
                      borderBottom: i < rules.length - 1 ? '1px solid var(--line)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                      opacity: isActive(r) ? 1 : 0.5,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{f?.name ?? 'Funder'}</span>
                          <Pill tone={r.mode === 'REPLACE' ? 'warn' : 'accent'}>{r.mode === 'ADD_ON' ? '+ Add on' : 'Replaces global'}</Pill>
                          <Pill tone="info">{r.type === 'FIXED_PERCENT' ? 'Fixed' : 'Tiered'}</Pill>
                          {!isActive(r) && <Pill tone="default">Inactive</Pill>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                          Valid {fmt.dateShort(r.valid_from)} → {r.valid_to ? fmt.dateShort(r.valid_to) : '∞'}
                          {r.notes && <span style={{ marginLeft: 12 }}>{r.notes}</span>}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                        {formatRate(r)}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn sm ghost" onClick={() => onEdit(r)}>Edit</button>
                        {isActive(r) && (
                          <button className="btn sm danger" onClick={() => onDeactivate(r.id)}>Deactivate</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <RuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onDone={refresh}
        scope={tab}
        funders={funders}
        agents={agents}
        editing={editing}
      />
    </div>
  )
}
