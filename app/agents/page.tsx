'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useAgentsSummary, invalidate, prefetch, qk } from '@/lib/queries'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { AgentEditor } from '@/components/agents/agent-editor'
import { exportCSV, csvFmt, todayStamp } from '@/lib/export-csv'
import { BulkBar, BulkHeaderCheckbox } from '@/components/ui/bulk-bar'

export default function AgentsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [view, setView]     = useState<'grid' | 'table'>('grid')
  const [editorOpen, setEditorOpen] = useState(false)
  const { page, setPage, pageSize } = usePageState()

  const summaryQ = useAgentsSummary({ page, page_size: pageSize, q: search.trim() || undefined })
  const agents   = summaryQ.data?.agents ?? []
  const total    = (summaryQ.data as any)?.total ?? 0
  const loading  = summaryQ.isLoading
  const refresh  = () => { invalidate.agents(qc); qc.invalidateQueries({ queryKey: ['page', 'agents'] }) }

  useEffect(() => { setPage(1) }, [search, setPage])

  const agentStats = useMemo(() =>
    agents.map(a => ({
      ...a,
      name:         a.profiles?.name ?? a.code ?? '—',
      email:        a.profiles?.email ?? '—',
      total:        Number(a.total_commissions),
      dealCount:    Number(a.total_deals),
      activeDeals:  Number(a.active_deals),
      totalVolume:  Number(a.total_volume),
    })),
    [agents],
  )

  const filtered = useMemo(() =>
    agentStats.filter(a => {
      const q = search.toLowerCase()
      return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.code ?? '').toLowerCase().includes(q)
    }),
    [search, agentStats],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }
  const toggleAll = () => {
    selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(a => a.id)))
  }
  const exportColumns: any = [
    { header: 'Agent',        value: (a: any) => a.name },
    { header: 'Email',        value: (a: any) => a.email },
    { header: 'Code',         value: (a: any) => a.code ?? '' },
    { header: 'Status',       value: (a: any) => a.is_active ? 'Active' : 'Inactive' },
    { header: 'Total Deals',  value: (a: any) => a.dealCount },
    { header: 'Active Deals', value: (a: any) => a.activeDeals },
    { header: 'Volume',       value: (a: any) => csvFmt.money(a.totalVolume) },
    { header: 'Commissions',  value: (a: any) => csvFmt.money(a.total) },
  ]

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Agents</h1>
          <p>{loading ? 'Loading…' : `${total.toLocaleString()} agents`}</p>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Icons.Grid /></button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Icons.Table /></button>
          </div>
          <button
            className="btn"
            disabled={!filtered.length}
            onClick={() => exportCSV(`agents-${todayStamp()}`, exportColumns, filtered)}
          >
            <Icons.Download /> Export
          </button>
          <button className="btn primary" onClick={() => setEditorOpen(true)}><Icons.Plus /> Add agent</button>
        </div>
      </div>

      <FilterBar search={search} setSearch={setSearch} placeholder="Search agents…" chips={[]} />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button
          className="btn sm"
          onClick={() => exportCSV(`agents-selected-${todayStamp()}`, exportColumns, agentStats.filter(a => selected.has(a.id)))}
        >
          <Icons.Download /> Export selected
        </button>
      </BulkBar>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading agents…</div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>
          {filtered.map(a => (
            <div key={a.id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => router.push(`/agents/${a.id}`)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Avatar name={a.name} size="lg" hue={180} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{a.email}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <Pill tone={a.is_active ? 'pos' : 'neg'}>{a.is_active ? 'Active' : 'Inactive'}</Pill>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Commissions', val: fmt.moneyK(a.total) },
                  { label: 'Deals', val: String(a.dealCount) },
                  { label: 'Active Deals', val: String(a.activeDeals) },
                  { label: 'Volume', val: fmt.moneyK(a.totalVolume) },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-sunk)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {a.code && <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ink-4)' }}>Code: <span className="mono">{a.code}</span></div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <BulkHeaderCheckbox selectedCount={selected.size} totalCount={filtered.length} onToggleAll={toggleAll} />
                  </th>
                  <th>Agent</th><th>Email</th><th>Code</th>
                  <th className="num">Commissions</th><th className="num">Deals</th>
                  <th className="num">Volume</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className={selected.has(a.id) ? 'selected' : ''}
                      onClick={() => router.push(`/agents/${a.id}`)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => { e.stopPropagation(); toggle(a.id) }}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={a.name} size="sm" hue={180} />
                        <span className="strong">{a.name}</span>
                      </div>
                    </td>
                    <td className="muted">{a.email}</td>
                    <td><span className="mono text-xs">{a.code ?? '—'}</span></td>
                    <td className="num">{fmt.moneyK(a.total)}</td>
                    <td className="num">{a.dealCount}</td>
                    <td className="num">{fmt.moneyK(a.totalVolume)}</td>
                    <td><Pill tone={a.is_active ? 'pos' : 'neg'}>{a.is_active ? 'Active' : 'Inactive'}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)' }}>
            <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage} />
          </div>
        </div>
      )}
      {view === 'grid' && (
        <div style={{ padding: '12px 0' }}>
          <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      )}

      <AgentEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} />
    </div>
  )
}
