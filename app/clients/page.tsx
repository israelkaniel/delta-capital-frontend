'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { useAccountsList, invalidate } from '@/lib/queries'
import { usePageState } from '@/lib/pagination'
import { Pagination } from '@/components/ui/pagination'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { ClientEditor } from '@/components/clients/client-editor'
import { exportCSV, csvFmt, todayStamp } from '@/lib/export-csv'
import { BulkBar, BulkHeaderCheckbox } from '@/components/ui/bulk-bar'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function ClientsPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const { page, setPage, pageSize } = usePageState()

  const accountsQ = useAccountsList({ page, page_size: pageSize, q: search.trim() || undefined })
  const accounts  = accountsQ.data?.rows ?? []
  const total     = accountsQ.data?.total ?? 0
  const loading   = accountsQ.isLoading
  const refresh   = () => invalidate.accounts(qc)

  useEffect(() => { setPage(1) }, [search, setPage])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }
  const toggleAll = () => {
    selected.size === accounts.length ? setSelected(new Set()) : setSelected(new Set(accounts.map(a => a.id)))
  }
  const exportColumns: any = [
    { header: 'Client',   value: (a: any) => a.name },
    { header: 'Contacts', value: (a: any) => (a.contacts ?? []).length },
    { header: 'Deals',    value: (a: any) => (a.deals ?? []).length },
    { header: 'Notes',    value: (a: any) => a.notes ?? '' },
    { header: 'Since',    value: (a: any) => csvFmt.date(a.created_at) },
  ]

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>{loading ? 'Loading…' : `${total.toLocaleString()} accounts`}</p>
        </div>
        <div className="actions">
          <button
            className="btn"
            disabled={!accounts.length}
            onClick={() => exportCSV(`clients-${todayStamp()}`, exportColumns, accounts)}
          >
            <Icons.Download /> Export
          </button>
          <button className="btn primary" onClick={() => setEditorOpen(true)}><Icons.Plus /> Add client</button>
        </div>
      </div>

      <FilterBar search={search} setSearch={setSearch} placeholder="Search clients…" chips={[]} />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button
          className="btn sm"
          onClick={() => exportCSV(`clients-selected-${todayStamp()}`, exportColumns, accounts.filter((a: any) => selected.has(a.id)))}
        >
          <Icons.Download /> Export selected
        </button>
      </BulkBar>

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading clients…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <BulkHeaderCheckbox selectedCount={selected.size} totalCount={accounts.length} onToggleAll={toggleAll} />
                  </th>
                  <th>Client</th><th className="num">Contacts</th><th className="num">Deals</th>
                  <th>Notes</th><th>Since</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className={selected.has(a.id) ? 'selected' : ''}
                      onClick={() => router.push(`/clients/${a.id}`)}
                      style={{ cursor: 'pointer' }}>
                    <td onClick={e => { e.stopPropagation(); toggle(a.id) }}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={a.name} size="sm" hue={hueFromId(a.id)} />
                        <span className="strong">{a.name}</span>
                      </div>
                    </td>
                    <td className="num">{(a.contacts ?? []).length}</td>
                    <td className="num">{(a.deals ?? []).length}</td>
                    <td className="muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes ?? '—'}</td>
                    <td className="muted-num">{fmt.dateShort(a.created_at)}</td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icons.Search /></div>
                      <p className="empty-state-title">No clients found</p>
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

      <ClientEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} />
    </div>
  )
}
