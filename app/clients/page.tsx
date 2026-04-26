'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbAccount } from '@/lib/api'
import { dbAccounts } from '@/lib/db'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { ClientEditor } from '@/components/clients/client-editor'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function ClientsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<(DbAccount & { contacts?: any[]; deals?: any[] })[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [editorOpen, setEditorOpen] = useState(false)

  const refresh = () => {
    setLoading(true)
    dbAccounts.list().then(res => {
      setAccounts(res.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() =>
    accounts.filter(a => {
      const q = search.toLowerCase()
      return !q || a.name.toLowerCase().includes(q)
    }),
    [search, accounts],
  )

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>{loading ? 'Loading…' : `${accounts.length} accounts`}</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setEditorOpen(true)}><Icons.Plus /> Add client</button>
        </div>
      </div>

      <FilterBar search={search} setSearch={setSearch} placeholder="Search clients…" chips={[]} />

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading clients…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th><th className="num">Contacts</th><th className="num">Deals</th>
                  <th>Notes</th><th>Since</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => router.push(`/clients/${a.id}`)} style={{ cursor: 'pointer' }}>
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
                {filtered.length === 0 && (
                  <tr><td colSpan={5}>
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
      </div>

      <ClientEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} />
    </div>
  )
}
