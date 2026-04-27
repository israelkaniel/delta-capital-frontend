'use client'
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { Pill } from '@/components/ui/pill'
import { fmt } from '@/lib/fmt'
import { api, type DbGlobalRule, type DbAgentRule } from '@/lib/api'
import { useFundersList, useAgentsList, useGlobalRules, useAgentRules, invalidate } from '@/lib/queries'
import { RuleEditor } from '@/components/rules/rule-editor'

const TABS = [
  { key: 'byfunder', label: 'By funder' },
  { key: 'global',   label: 'Global rules' },
  { key: 'agent',    label: 'Agent overrides' },
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
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>('byfunder')
  const [showInactive, setShowInactive] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DbGlobalRule | DbAgentRule | undefined>(undefined)

  // Rules pages aren't expected to exceed 100 entries — fetch first page only.
  const fundersQ     = useFundersList({ page_size: 500 })
  const agentsQ      = useAgentsList({ page_size: 500 })
  const globalRulesQ = useGlobalRules({ page_size: 500 })
  const agentRulesQ  = useAgentRules({ page_size: 500 })

  const funders     = fundersQ.data?.rows ?? []
  const agents      = agentsQ.data?.rows ?? []
  const globalRules = globalRulesQ.data?.rows ?? []
  const agentRules  = agentRulesQ.data?.rows ?? []
  const loading     = fundersQ.isLoading || agentsQ.isLoading || globalRulesQ.isLoading || agentRulesQ.isLoading
  const refresh = () => {
    invalidate.rules(qc)
    invalidate.funders(qc)
    invalidate.agents(qc)
  }

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

  // Combined "by funder" view: for each funder, show its global rules
  // and any agent overrides scoped to that funder, with mode clearly labeled.
  const byFunder = useMemo(() => {
    return funders.map(f => {
      const fGlobals  = visibleGlobal.filter(r => r.funder_id === f.id)
      const fOverrides = visibleAgent.filter(r => r.funder_id === f.id)
      // Group overrides by agent
      const overridesByAgent = new Map<string, { agentName: string; rules: DbAgentRule[] }>()
      for (const r of fOverrides) {
        const a = (r as any).agents ?? agents.find(x => x.id === r.agent_id)
        const name = a?.profiles?.name ?? a?.code ?? r.agent_id.slice(0, 8)
        if (!overridesByAgent.has(r.agent_id)) overridesByAgent.set(r.agent_id, { agentName: name, rules: [] })
        overridesByAgent.get(r.agent_id)!.rules.push(r)
      }
      return {
        funder: f,
        globals: fGlobals,
        overrides: Array.from(overridesByAgent.values()),
      }
    }).filter(g => g.globals.length > 0 || g.overrides.length > 0)
  }, [funders, visibleGlobal, visibleAgent, agents])

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
          <button className="btn" onClick={() => { setEditing(undefined); setTab('global'); setEditorOpen(true) }}>
            <Icons.Plus /> Global rule
          </button>
          <button className="btn primary" onClick={() => { setEditing(undefined); setTab('agent'); setEditorOpen(true) }}>
            <Icons.Plus /> Agent override
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="badge">
              {t.key === 'global'   ? globalRules.length :
               t.key === 'agent'    ? agentRules.length :
               byFunder.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'byfunder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {byFunder.length === 0 && !loading && (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
              No rules configured yet.
            </div></div>
          )}
          {byFunder.map(({ funder, globals, overrides }) => (
            <div className="card" key={funder.id}>
              <div className="card-head">
                <div>
                  <h3>{funder.name}</h3>
                  <div className="sub">
                    {globals.length} global · {overrides.reduce((s, o) => s + o.rules.length, 0)} agent override{overrides.length !== 1 ? 's' : ''}
                    <span style={{ marginLeft: 12 }}>·</span>
                    <span className="chip" style={{ marginLeft: 8 }}>{funder.commission_base === 'PAYBACK_AMOUNT' ? 'Payback base' : 'Transferred base'}</span>
                  </div>
                </div>
              </div>
              <div className="card-body flush">
                {globals.length === 0 ? (
                  <div style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink-4)', borderBottom: overrides.length ? '1px solid var(--line)' : 'none' }}>
                    No global rule defined — agent overrides apply only on top of zero base.
                  </div>
                ) : globals.map(r => (
                  <div key={r.id} style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--bg-sunk)',
                    opacity: isActive(r) ? 1 : 0.5,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <Pill tone="accent">Global default</Pill>
                        <Pill tone="info">{r.type === 'FIXED_PERCENT' ? 'Fixed' : 'Tiered'}</Pill>
                        {!isActive(r) && <Pill tone="default">Inactive</Pill>}
                        {r.notes && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.notes}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        Valid {fmt.dateShort(r.valid_from)} → {r.valid_to ? fmt.dateShort(r.valid_to) : '∞'}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                      {formatRate(r)}
                    </div>
                    <button className="btn sm ghost" onClick={() => onEdit(r)}>Edit</button>
                  </div>
                ))}
                {overrides.map((g, gi) => (
                  <div key={g.agentName + gi}>
                    {g.rules.map((r, i) => {
                      const showAgentLabel = i === 0
                      return (
                        <div key={r.id} style={{
                          padding: '14px 18px',
                          borderBottom: i < g.rules.length - 1 || gi < overrides.length - 1 ? '1px solid var(--line)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 12,
                          opacity: isActive(r) ? 1 : 0.5,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              {showAgentLabel && <span style={{ fontWeight: 500, fontSize: 13 }}>{g.agentName}</span>}
                              <Pill tone="warn">Override</Pill>
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
                          <button className="btn sm ghost" onClick={() => onEdit(r)}>Edit</button>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
                          <Pill tone="warn">Override</Pill>
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
        scope={tab === 'agent' ? 'agent' : 'global'}
        funders={funders}
        agents={agents}
        editing={editing}
      />
    </div>
  )
}
