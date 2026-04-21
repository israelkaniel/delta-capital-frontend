'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { contacts } from '@/lib/data'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 47) % 360

export default function ContactsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')

  const roles = Array.from(new Set(contacts.map(c => c.role))).sort()

  const filtered = useMemo(() => contacts.filter(c => {
    if (role && c.role !== role) return false
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  }), [search, role])

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Contacts</h1>
          <p>{contacts.length} contacts</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary"><Icons.Plus /> Add contact</button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search contacts, companies…"
        chips={[
          { label: 'Role', value: role, onClick: () => setRole(v => { const i = roles.indexOf(v); return roles[(i + 1) % (roles.length + 1)] || '' }) },
        ]}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th><th>Company</th><th>Role</th><th>Email</th><th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => router.push(`/contacts/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={c.name} hue={hueFromId(c.id)} size="md" />
                      <span className="strong">{c.name}</span>
                    </div>
                  </td>
                  <td className="muted">{c.company}</td>
                  <td><span className="chip">{c.role}</span></td>
                  <td>
                    <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontSize: 12 }} onClick={e => e.stopPropagation()}>{c.email}</a>
                  </td>
                  <td className="muted">{c.phone}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5}>
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
