'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, type DbFunder } from '@/lib/api'
import { dbFunders } from '@/lib/db'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { FunderEditor } from '@/components/funders/funder-editor'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function FundersPage() {
  const router   = useRouter()
  const [funders, setFunders] = useState<DbFunder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [editorOpen, setEditorOpen] = useState(false)

  const refresh = () => {
    setLoading(true)
    dbFunders.list().then(res => {
      setFunders(res.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() =>
    funders.filter(f => {
      const q = search.toLowerCase()
      return !q || f.name.toLowerCase().includes(q)
    }),
    [search, funders],
  )

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Funders</h1>
          <p>{loading ? 'Loading…' : `${funders.filter(f => f.is_active).length} active funders`}</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setEditorOpen(true)}><Icons.Plus /> Add funder</button>
        </div>
      </div>

      <FilterBar search={search} setSearch={setSearch} placeholder="Search funders…" chips={[]} />

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading funders…</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Funder</th><th>Commission Base</th>
                  <th className="num">Rules</th><th>Status</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} onClick={() => router.push(`/funders/${f.id}`)} style={{ cursor: 'pointer' }}>
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
                {filtered.length === 0 && (
                  <tr><td colSpan={5}>
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
      </div>

      <FunderEditor open={editorOpen} onClose={() => setEditorOpen(false)} onDone={refresh} />
    </div>
  )
}
