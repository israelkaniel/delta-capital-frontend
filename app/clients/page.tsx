'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { clients, deals } from '@/lib/data'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { useShell } from '@/components/shell/shell-provider'

const ratingTone = (r: string) => r.startsWith('A') ? 'pos' : r.startsWith('B') ? 'warn' : 'neg'
const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function ClientsPage() {
  const router = useRouter()
  const { openDeal } = useShell()
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')

  const sectors = Array.from(new Set(clients.map(c => c.sector))).sort()

  const filtered = useMemo(() => clients.filter(c => {
    if (sector && c.sector !== sector) return false
    const q = search.toLowerCase()
    return !q || c.company.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  }), [search, sector])

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>{clients.length} clients · {deals.length} total deals</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary"><Icons.Plus /> Add client</button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search clients…"
        chips={[
          { label: 'Sector', value: sector, onClick: () => setSector(v => { const i = sectors.indexOf(v); return sectors[(i + 1) % (sectors.length + 1)] || '' }) },
        ]}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Company</th><th>Sector</th><th>Member since</th>
                <th className="num">Exposure</th><th className="num">Open deals</th><th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const clientDeals = deals.filter(d => d.clientId === c.id)
                const latestDeal = clientDeals.sort((a, b) => b.closed.localeCompare(a.closed))[0]
                return (
                  <tr key={c.id} onClick={() => router.push(`/clients/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.company} hue={hueFromId(c.id)} size="md" />
                        <div>
                          <div className="strong">{c.company}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip">{c.sector}</span></td>
                    <td className="muted-num">{fmt.dateShort(c.since)}</td>
                    <td className="num strong">{fmt.money(c.exposure)}</td>
                    <td className="num">{c.openDeals}</td>
                    <td><Pill tone={ratingTone(c.rating)}>{c.rating}</Pill></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icons.Search /></div>
                    <p className="empty-state-title">No results found</p>
                    <p className="empty-state-sub">Try adjusting your search or filters</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
