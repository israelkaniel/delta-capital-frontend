'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { commStatusLabel, commStatusTone, type DbCommission } from '@/lib/api'
import { useCommissionsList, prefetch } from '@/lib/queries'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { StatusPill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { useShell } from '@/components/shell/shell-provider'
import { exportCSV, csvFmt, todayStamp } from '@/lib/export-csv'
import { BulkBar, BulkHeaderCheckbox } from '@/components/ui/bulk-bar'

const TABS = ['All', 'ACTIVE', 'RESERVED', 'PAID', 'REVERSED']
const TAB_LABELS: Record<string, string> = { All: 'All', ACTIVE: 'Active', RESERVED: 'Reserved', PAID: 'Paid', REVERSED: 'Reversed' }

function commDeal(c: DbCommission) { return c.deal_agents?.deals }
function commClient(c: DbCommission) { return commDeal(c)?.accounts?.name ?? '—' }
function commAgent(c: DbCommission) { return c.deal_agents?.agents }

export default function CommissionsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { openCommission } = useShell()

  const agentNameOf = (c: any) => {
    const a = c.deal_agents?.agents
    return a?.profiles?.name ?? a?.code ?? '—'
  }

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All')
  const [agentFilter, setAgentFilter] = useState('')
  const { page, setPage, pageSize } = usePageState()

  const commsQ = useCommissionsList({
    page, page_size: pageSize,
    status: tab === 'All' ? undefined : tab,
  })
  const commissions = commsQ.data?.rows ?? []
  const total       = commsQ.data?.total ?? 0
  const loading     = commsQ.isLoading

  useEffect(() => { setPage(1) }, [tab, setPage])

  const filtered = useMemo(() => commissions.filter(c => {
    if (agentFilter && agentNameOf(c) !== agentFilter) return false
    const q = search.toLowerCase()
    return !q || c.id.toLowerCase().includes(q) || commClient(c).toLowerCase().includes(q) ||
      (commDeal(c)?.id ?? '').toLowerCase().includes(q)
  }), [search, agentFilter, commissions])

  const totalValue = filtered.reduce((a, c) => a + Number(c.total_amount), 0)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }
  const toggleAll = () => {
    selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(c => c.id)))
  }
  const exportColumns: any = [
    { header: 'Commission ID', value: (c: any) => c.id },
    { header: 'Client',        value: (c: any) => commClient(c) },
    { header: 'Agent',         value: (c: any) => agentNameOf(c) },
    { header: 'Base Amount',   value: (c: any) => csvFmt.money(c.base_amount) },
    { header: 'Rate %',        value: (c: any) => csvFmt.pct(c.rate) },
    { header: 'Commission',    value: (c: any) => csvFmt.money(c.total_amount) },
    { header: 'Reserved',      value: (c: any) => csvFmt.money(c.reserved_amount) },
    { header: 'Released',      value: (c: any) => csvFmt.money(c.released_amount) },
    { header: 'Status',        value: (c: any) => commStatusLabel(c.status) },
    { header: 'Calculated',    value: (c: any) => csvFmt.date(c.calculated_at) },
    { header: 'Deal ID',       value: (c: any) => commDeal(c)?.id ?? '' },
  ]

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Commissions</h1>
          <p>{loading ? 'Loading…' : `${total.toLocaleString()} records${tab !== 'All' ? ` (${tab})` : ''}`}</p>
        </div>
        <div className="actions">
          <button
            className="btn"
            disabled={!filtered.length}
            onClick={() => exportCSV(`commissions-${todayStamp()}`, exportColumns, filtered)}
          >
            <Icons.Download /> Export
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(s => (
          <button key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
            {TAB_LABELS[s]}
            {tab === s && total > 0 && <span className="badge">{total}</span>}
          </button>
        ))}
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search by client, deal, or commission ID…"
        chips={[
          { label: 'Agent', value: agentFilter, onClick: () => setAgentFilter('') },
        ]}
      />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button
          className="btn sm"
          onClick={() => exportCSV(`commissions-selected-${todayStamp()}`, exportColumns, commissions.filter((c: any) => selected.has(c.id)))}
        >
          <Icons.Download /> Export selected
        </button>
      </BulkBar>

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading commissions…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <BulkHeaderCheckbox selectedCount={selected.size} totalCount={filtered.length} onToggleAll={toggleAll} />
                  </th>
                  <th>Commission ID</th><th>Client</th><th>Agent</th>
                  <th className="num">Base Amount</th><th className="num">Rate</th>
                  <th className="num">Commission</th><th className="num">Reserved</th>
                  <th>Status</th><th>Calculated</th><th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const agentName = agentNameOf(c)
                  return (
                    <tr key={c.id} className={selected.has(c.id) ? 'selected' : ''}
                        onClick={() => router.push(`/commissions/${c.id}`)} style={{ cursor: 'pointer' }}>
                      <td onClick={e => { e.stopPropagation(); toggle(c.id) }}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                      </td>
                      <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{c.id.slice(0, 8)}</span></td>
                      <td><span className="strong">{commClient(c)}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={agentName} size="sm" hue={180} />
                          <span style={{ fontSize: 13 }}>{agentName}</span>
                        </div>
                      </td>
                      <td className="num">{fmt.money(Number(c.base_amount))}</td>
                      <td className="num">{fmt.pct(Number(c.rate))}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt.money(Number(c.total_amount))}</td>
                      <td className="num">{Number(c.reserved_amount) > 0 ? fmt.money(Number(c.reserved_amount)) : '—'}</td>
                      <td><StatusPill status={commStatusLabel(c.status)} /></td>
                      <td className="muted-num">{fmt.dateShort(c.calculated_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.status === 'ACTIVE' && (
                            <button className="btn sm warn" onClick={() => router.push(`/commissions/${c.id}`)}>Reserve</button>
                          )}
                          {c.status === 'RESERVED' && (
                            <button className="btn sm pos" onClick={() => router.push(`/commissions/${c.id}`)}>Release</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icons.Search /></div>
                      <p className="empty-state-title">No commissions found</p>
                      <p className="empty-state-sub">Try adjusting your filters</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)' }}>
          <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
