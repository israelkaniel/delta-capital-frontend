'use client'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, dealStatusLabel, type DbDeal } from '@/lib/api'
import { useDealsList, invalidate, prefetch } from '@/lib/queries'
import { useQueryClient } from '@tanstack/react-query'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { StatusPill } from '@/components/ui/pill'
import { AvatarStack } from '@/components/ui/avatar'
import { useShell } from '@/components/shell/shell-provider'
import { useToast } from '@/components/ui/toast/toast'
import { useUserRole } from '@/lib/use-user-role'
import { AdvancedFilter, type FilterState } from '@/components/ui/advanced-filter'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DELETE_RECORDS_ENABLED } from '@/lib/feature-flags'

const TAB_BY_STATUS: Record<string, string> = {
  FUNDS_TRANSFERRED: 'Active',
  APPROVED:          'Approved',
  PENDING:           'Pending',
  CANCELLED:         'Declined',
}
const TABS = ['All', 'Active', 'Approved', 'Pending', 'Declined']

const dealTab    = (d: DbDeal) => TAB_BY_STATUS[d.status] ?? 'Pending'
const dealAmount = (d: DbDeal) => Number(d.transferred_amount ?? d.payback_amount ?? 0)
const dealClient = (d: DbDeal) => d.accounts?.name ?? '—'
const dealFunder = (d: DbDeal) => d.funders?.name ?? '—'
const dealAgentName = (da: any) =>
  da.agents?.profiles?.name ?? da.agents?.code ?? '—'

const dealAgentNames = (d: DbDeal) =>
  (d.deal_agents ?? []).map(dealAgentName)

function exportCSV(rows: DbDeal[]) {
  const headers = ['Deal ID', 'Client', 'Funder', 'Amount', 'Status', 'Funded Date', 'Created']
  const lines = [
    headers.join(','),
    ...rows.map(d => [
      d.id, `"${dealClient(d)}"`, `"${dealFunder(d)}"`,
      dealAmount(d), dealStatusLabel(d.status),
      d.funds_transferred_at?.split('T')[0] ?? '',
      d.created_at?.split('T')[0] ?? '',
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `deals-${new Date().toISOString().slice(0, 10)}.csv`,
  })
  a.click()
}

function RowMenu({ deal, canDelete, onDelete }: {
  deal: DbDeal
  canDelete: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button className="btn sm ghost" onClick={() => setOpen(v => !v)} style={{ padding: '4px 8px', opacity: 0.7 }}>
        <Icons.MoreHorizontal style={{ width: 14, height: 14 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 100, marginTop: 4,
          background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
        }}>
          <MenuItem onClick={() => { router.push(`/deals/${deal.id}`); setOpen(false) }} icon={Icons.Chevron}>Open</MenuItem>
          <MenuItem onClick={() => { exportCSV([deal]); setOpen(false) }} icon={Icons.Download}>Export CSV</MenuItem>
          {canDelete && (
            <>
              <div style={{ height: 1, background: 'var(--line)' }} />
              <MenuItem
                onClick={() => { onDelete(); setOpen(false) }}
                icon={Icons.Trash}
                tone="danger"
              >Delete deal…</MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SortableTh<K extends string>({ label, k, sortKey, sortDir, onSort, numeric }: {
  label: string
  k: K
  sortKey: K
  sortDir: 'asc' | 'desc'
  onSort: (k: K) => void
  numeric?: boolean
}) {
  const active = sortKey === k
  const arrow = active ? (sortDir === 'asc' ? '↑' : '↓') : ''
  return (
    <th
      className={numeric ? 'num' : undefined}
      onClick={() => onSort(k)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: active ? 'var(--ink)' : undefined }}>
        {label}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: active ? 1 : 0.3 }}>{arrow || '↕'}</span>
      </span>
    </th>
  )
}

function MenuItem({ onClick, icon: Icon, children, tone }: {
  onClick: () => void
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  children: React.ReactNode
  tone?: 'danger'
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 12.5, textAlign: 'left',
      color: tone === 'danger' ? 'var(--neg)' : 'var(--ink-1)',
    }}>
      <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
      {children}
    </button>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const toast = useToast()
  const role = useUserRole()
  const qc = useQueryClient()
  const { setNewDealOpen } = useShell()

  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const { page, setPage, pageSize } = usePageState()

  // Map tab -> server-side status filter (server pagination requires
  // status to be applied at the DB layer, not client-side).
  const STATUS_BY_TAB: Record<string, string | undefined> = {
    All: undefined, Active: 'FUNDS_TRANSFERRED', Approved: 'APPROVED', Pending: 'PENDING', Declined: 'CANCELLED',
  }
  const dealsQ = useDealsList({
    page, page_size: pageSize,
    status: STATUS_BY_TAB[tab],
    q: search.trim() || undefined,
  })
  const deals   = dealsQ.data?.rows ?? []
  const total   = dealsQ.data?.total ?? 0
  const loading = dealsQ.isLoading
  const refresh = () => invalidate.deals(qc)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [tab, search, setPage])

  const [filters, setFilters] = useState<FilterState>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<DbDeal | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [view, setView] = useState<'table' | 'tiles'>('table')

  type SortKey = 'id' | 'client' | 'funder' | 'amount' | 'status' | 'funded' | 'created'
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const funders = useMemo(() => {
    const map = new Map<string, string>()
    deals.forEach(d => { if (d.funders) map.set(d.funders.id, d.funders.name) })
    return Array.from(map, ([id, name]) => ({ value: id, label: name }))
  }, [deals])

  const filterSpecs = useMemo(() => ([
    { kind: 'multi' as const, key: 'status', label: 'Status', options: [
      { value: 'PENDING',           label: 'Pending' },
      { value: 'APPROVED',          label: 'Approved' },
      { value: 'FUNDS_TRANSFERRED', label: 'Funded' },
      { value: 'CANCELLED',         label: 'Cancelled' },
    ] },
    { kind: 'multi' as const, key: 'funder', label: 'Funder', options: funders },
    { kind: 'search' as const, key: 'client', label: 'Client name', placeholder: 'Search clients…' },
    { kind: 'numRange' as const, key: 'amount', label: 'Transferred amount ($)', prefix: '$' },
    { kind: 'dateRange' as const, key: 'funded', label: 'Funded date' },
    { kind: 'dateRange' as const, key: 'created', label: 'Created date' },
  ]), [funders])

  const filtered = useMemo(() => deals.filter(d => {
    if (tab !== 'All' && dealTab(d) !== tab) return false

    if (search) {
      const q = search.toLowerCase()
      const matchSearch = d.id.toLowerCase().includes(q)
        || dealClient(d).toLowerCase().includes(q)
        || dealFunder(d).toLowerCase().includes(q)
        || dealStatusLabel(d.status).toLowerCase().includes(q)
        || dealAgentNames(d).some(n => n.toLowerCase().includes(q))
      if (!matchSearch) return false
    }

    const fStatus = filters.status as string[] | undefined
    if (fStatus && fStatus.length > 0 && !fStatus.includes(d.status)) return false

    const fFunder = filters.funder as string[] | undefined
    if (fFunder && fFunder.length > 0 && !fFunder.includes(d.funders?.id ?? '')) return false

    const fClient = (filters.client as string | undefined)?.trim().toLowerCase()
    if (fClient && !dealClient(d).toLowerCase().includes(fClient)) return false

    const fAmount = filters.amount as { min?: string; max?: string } | undefined
    if (fAmount?.min && dealAmount(d) < Number(fAmount.min)) return false
    if (fAmount?.max && dealAmount(d) > Number(fAmount.max)) return false

    const fFunded = filters.funded as { from?: string; to?: string } | undefined
    if (fFunded?.from || fFunded?.to) {
      const fundedAt = d.funds_transferred_at?.split('T')[0]
      if (!fundedAt) return false
      if (fFunded.from && fundedAt < fFunded.from) return false
      if (fFunded.to && fundedAt > fFunded.to) return false
    }

    const fCreated = filters.created as { from?: string; to?: string } | undefined
    if (fCreated?.from || fCreated?.to) {
      const createdAt = d.created_at?.split('T')[0] ?? ''
      if (fCreated.from && createdAt < fCreated.from) return false
      if (fCreated.to && createdAt > fCreated.to) return false
    }

    return true
  }), [deals, tab, search, filters])

  // Apply column sort over the filtered set. Re-runs whenever the filter
  // result OR the sort key/direction changes.
  const sortedFiltered = useMemo(() => {
    const accessor: Record<SortKey, (d: DbDeal) => string | number> = {
      id:      d => d.id,
      client:  d => dealClient(d).toLowerCase(),
      funder:  d => dealFunder(d).toLowerCase(),
      amount:  d => dealAmount(d),
      status:  d => dealStatusLabel(d.status),
      funded:  d => d.funds_transferred_at ?? '',
      created: d => d.created_at ?? '',
    }
    const get = accessor[sortKey]
    const sign = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = get(a); const vb = get(b)
      if (va === vb) return 0
      return va > vb ? sign : -sign
    })
  }, [filtered, sortKey, sortDir])

  const toggle = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }
  const toggleAll = () =>
    selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(d => d.id)))

  // KPI counts on this page show the *current page* — full-fleet metrics
  // live on /dashboard, which has aggregate KPIs.
  const stats = {
    active:  deals.filter(d => d.status === 'FUNDS_TRANSFERRED').length,
    pending: deals.filter(d => d.status === 'PENDING').length,
    volume:  deals.filter(d => d.status === 'FUNDS_TRANSFERRED').reduce((a, d) => a + dealAmount(d), 0),
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    const res = await api.deals.delete(confirmDelete.id)
    if (res.error) {
      toast.error('Delete failed', res.error.message)
      return
    }
    toast.success('Deal deleted', `${dealClient(confirmDelete)} · ${confirmDelete.id.slice(0, 8)}`)
    setConfirmDelete(null)
    refresh()
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const res = await api.deals.bulkDelete(ids)
    if (res.error) {
      toast.error('Bulk delete failed', res.error.message)
      return
    }
    toast.success(`${res.data?.deleted ?? ids.length} deals deleted`)
    setSelected(new Set())
    setConfirmBulkDelete(false)
    refresh()
  }

  const canDelete = DELETE_RECORDS_ENABLED && role === 'ADMIN'

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Deals</h1>
          <p>{loading ? 'Loading…' : `${stats.active} active · ${stats.pending} pending · ${fmt.moneyK(stats.volume)} active volume`}</p>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-label="Table view"><Icons.Table /></button>
            <button className={view === 'tiles' ? 'active' : ''} onClick={() => setView('tiles')} aria-label="Tile view"><Icons.Grid /></button>
          </div>
          <button className="btn" onClick={() => exportCSV(filtered)}>
            <Icons.Download /> Export {filtered.length < deals.length ? `(${filtered.length})` : ''}
          </button>
          <button className="btn primary" onClick={() => setNewDealOpen(true)}>
            <Icons.Plus /> New deal
          </button>
        </div>
      </div>

      {/* Status tabs (active tab gets the full server-side total) */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(s => (
          <button key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
            {s}{tab === s && total > 0 && <span className="badge">{total}</span>}
          </button>
        ))}
      </div>

      {/* Search + advanced filter bar */}
      <div className="filter-bar">
        <div className="srch">
          <Icons.Search style={{ color: 'var(--ink-4)', flexShrink: 0, width: 13, height: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals, clients, funders, agents…" />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0, display: 'flex' }}><Icons.X style={{ width: 13, height: 13 }} /></button>}
        </div>
        <AdvancedFilter
          specs={filterSpecs}
          value={filters}
          onChange={setFilters}
          onReset={() => setFilters({})}
        />
      </div>

      {/* Active filter chips */}
      {Object.keys(filters).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {filterSpecs.map(spec => {
            const v = filters[spec.key]
            if (!v) return null
            let label = ''
            if (spec.kind === 'multi') {
              const arr = v as string[]
              if (!arr.length) return null
              const names = arr.map(x => spec.options.find(o => o.value === x)?.label ?? x).join(', ')
              label = `${spec.label}: ${names}`
            } else if (spec.kind === 'search') {
              if (!(v as string).trim()) return null
              label = `${spec.label}: ${v}`
            } else if (spec.kind === 'numRange') {
              const r = v as { min?: string; max?: string }
              if (!r.min && !r.max) return null
              label = `${spec.label}: ${r.min ?? '…'} – ${r.max ?? '…'}`
            } else if (spec.kind === 'dateRange') {
              const r = v as { from?: string; to?: string }
              if (!r.from && !r.to) return null
              label = `${spec.label}: ${r.from ?? '…'} → ${r.to ?? '…'}`
            }
            if (!label) return null
            return (
              <button
                key={spec.key}
                className="chip"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                onClick={() => {
                  const next = { ...filters }
                  delete next[spec.key]
                  setFilters(next)
                }}
                type="button"
              >
                {label} <Icons.X style={{ width: 11, height: 11 }} />
              </button>
            )
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ margin: '10px 0', padding: '10px 16px', background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{selected.size} selected</span>
          <button className="btn sm" onClick={() => exportCSV(deals.filter(d => selected.has(d.id)))}><Icons.Download /> Export CSV</button>
          {canDelete && (
            <button className="btn sm danger" onClick={() => setConfirmBulkDelete(true)}>
              <Icons.Trash /> Delete {selected.size}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost" onClick={() => setSelected(new Set())} style={{ color: 'var(--ink-4)' }}><Icons.X /> Clear</button>
        </div>
      )}

      {/* Tiles view */}
      {!loading && view === 'tiles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 12 }}>
          {sortedFiltered.map(d => (
            <div
              key={d.id}
              className="card"
              style={{ padding: 16, cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.1s' }}
              onClick={() => router.push(`/deals/${d.id}`)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(0,0,0,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="strong" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dealClient(d)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{d.id.slice(0, 8)}</span>
                    <span>·</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dealFunder(d)}</span>
                  </div>
                </div>
                <StatusPill status={dealStatusLabel(d.status)} />
              </div>

              <div className="num" style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
                {fmt.money(dealAmount(d))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <AvatarStack items={(d.deal_agents ?? []).map(da => ({ name: dealAgentName(da), hue: 180 }))} />
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                  {d.funds_transferred_at ? `Funded ${fmt.dateShort(d.funds_transferred_at)}` : `Created ${fmt.dateShort(d.created_at)}`}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--ink-4)' }}>
              No deals match your filters.
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {(loading || view === 'table') && (
      <div className="card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading deals…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                      onChange={toggleAll}
                    />
                  </th>
                  <SortableTh label="Deal ID" k="id"      sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableTh label="Client"  k="client"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableTh label="Funder"  k="funder"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableTh label="Amount"  k="amount"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} numeric />
                  <th>Agents</th>
                  <SortableTh label="Status"  k="status"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableTh label="Funded"  k="funded"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <SortableTh label="Created" k="created" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map(d => (
                  <tr key={d.id} className={selected.has(d.id) ? 'selected' : ''}
                      onClick={() => router.push(`/deals/${d.id}`)}
                      style={{ cursor: 'pointer' }}>
                    <td onClick={e => { e.stopPropagation(); toggle(d.id) }}>
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                    </td>
                    <td><span className="mono text-xs" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{d.id.slice(0, 8)}</span></td>
                    <td><span className="strong">{dealClient(d)}</span></td>
                    <td className="muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dealFunder(d)}</td>
                    <td className="num">{fmt.money(dealAmount(d))}</td>
                    <td>
                      <AvatarStack items={(d.deal_agents ?? []).map(da => ({ name: dealAgentName(da), hue: 180 }))} />
                    </td>
                    <td><StatusPill status={dealStatusLabel(d.status)} /></td>
                    <td className="muted-num">{d.funds_transferred_at ? fmt.dateShort(d.funds_transferred_at) : '—'}</td>
                    <td className="muted-num">{fmt.dateShort(d.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <RowMenu
                        deal={d}
                        canDelete={canDelete}
                        onDelete={() => setConfirmDelete(d)}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icons.Search /></div>
                      <p className="empty-state-title">No deals found</p>
                      <p className="empty-state-sub">{deals.length === 0 ? 'Create your first deal to get started' : 'Try adjusting your search or filters'}</p>
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
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete deal?"
        message={confirmDelete
          ? `Permanently delete ${dealClient(confirmDelete)} · ${confirmDelete.id.slice(0, 8)}?\n\nAlso removed: agent assignments, commission records, reserves, ledger entries, deal notes. This cannot be undone.`
          : ''}
        confirmLabel="Delete deal"
        tone="danger"
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selected.size} deals?`}
        message={`Permanently delete the ${selected.size} selected deals?\n\nFor each: agent assignments, commission records, reserves, ledger entries and notes will be removed.\n\nThis cannot be undone.`}
        confirmLabel={`Delete ${selected.size} deals`}
        tone="danger"
      />
    </div>
  )
}
