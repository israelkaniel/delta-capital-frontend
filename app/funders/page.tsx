'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useFundersList, invalidate } from '@/lib/queries'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { FunderEditor } from '@/components/funders/funder-editor'
import { exportCSV, todayStamp } from '@/lib/export-csv'
import { BulkBar, BulkHeaderCheckbox } from '@/components/ui/bulk-bar'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function FundersPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const { page, setPage, pageSize } = usePageState()

  const fundersQ = useFundersList({ page, page_size: pageSize, q: search.trim() || undefined })
  const funders  = fundersQ.data?.rows ?? []
  const total    = fundersQ.data?.total ?? 0
  const loading  = fundersQ.isLoading
  const refresh  = () => invalidate.funders(qc)

  useEffect(() => { setPage(1) }, [search, setPage])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }
  const toggleAll = () => {
    selected.size === funders.length ? setSelected(new Set()) : setSelected(new Set(funders.map(f => f.id)))
  }
  const exportColumns: any = [
    { header: 'Funder',          value: (f: any) => f.name },
    { header: 'Commission Base', value: (f: any) => f.commission_base === 'TRANSFERRED_AMOUNT' ? 'Transferred Amount' : 'Payback Amount' },
    { header: 'Rules',           value: (f: any) => (f.global_commission_rules ?? []).length },
    { header: 'Status',          value: (f: any) => f.is_active ? 'Active' : 'Inactive' },
    { header: 'Notes',           value: (f: any) => f.notes ?? '' },
  ]

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Funders</h1>
          <p>{loading ? 'Loading…' : `${total.toLocaleString()} funders`}</p>
        </div>
        <div className="actions">
          <button
            className="btn"
            disabled={!funders.length}
            onClick={() => exportCSV(`funders-${todayStamp()}`, exportColumns, funders)}
          >
            <Icons.Download /> Export
          </button>
          <button className="btn primary" onClick={() => setEditorOpen(true)}><Icons.Plus /> Add funder</button>
        </div>
      </div>

      <FilterBar search={search} setSearch={setSearch} placeholder="Search funders…" chips={[]} />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button
          className="btn sm"
          onClick={() => exportCSV(`funders-selected-${todayStamp()}`, exportColumns, funders.filter((f: any) => selected.has(f.id)))}
        >
          <Icons.Download /> Export selected
        </button>
      </BulkBar>

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading funders…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <BulkHeaderCheckbox selectedCount={selected.size} totalCount={funders.length} onToggleAll={toggleAll} />
                  </th>
                  <th>Funder</th><th>Commission Base</th>
                  <th className="num">Rules</th><th>Status</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {funders.map(f => (
                  <tr key={f.id} className={selected.has(f.id) ? 'selected' : ''}
                      onClick={() => router.push(`/funders/${f.id}`)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => { e.stopPropagation(); toggle(f.id) }}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={f.name} size="sm" hue={hueFromId(f.id)} />
                        <span className="strong">{f.name}</span>
                      </div>
                    </td>
                    <td><span className="chip">{f.commission_base === 'TRANSFERRED_AMOUNT' ? 'Transferred Amount' : 'Payback Amount'}</span></td>
                    <td className="num">{(f.global_commission_rules ?? []).length}</td>
                    <td><Pill tone={f.is_active ? 'pos' : 'neg'}>{f.is_active ? 'Active' : 'Inactive'}</Pill></td>
                    <td className="muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes ?? '—'}</td>
                  </tr>
                ))}
                {funders.length === 0 && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icons.Search /></div>
                      <p className="empty-state-title">No funders found</p>
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

      <FunderEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} />
    </div>
  )
}
