'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { FilterBar } from '@/components/ui/filter-bar'
import { api, type DbAccount, type DbContact } from '@/lib/api'
import { dbAccounts } from '@/lib/db'
import { ContactEditor } from '@/components/contacts/contact-editor'

type FlatContact = DbContact & { accountName: string }

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 47) % 360

export default function ContactsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<(DbAccount & { contacts?: DbContact[] })[]>([])
  const [contacts, setContacts] = useState<FlatContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [editor, setEditor] = useState<{ accountId: string; editing?: DbContact } | null>(null)
  const [pickAccount, setPickAccount] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await dbAccounts.list()
    if (res.error) { setLoading(false); return }
    const list = res.data ?? []
    setAccounts(list)
    const flat: FlatContact[] = []
    for (const a of list) {
      for (const c of (a.contacts ?? [])) {
        flat.push({ ...c, accountName: a.name })
      }
    }
    setContacts(flat)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const filtered = useMemo(() => contacts.filter(c => {
    if (accountFilter && c.account_id !== accountFilter) return false
    const q = search.toLowerCase()
    return !q
      || c.name.toLowerCase().includes(q)
      || c.accountName.toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q)
  }), [contacts, search, accountFilter])

  const removeContact = async (c: FlatContact) => {
    if (!confirm(`Remove ${c.name}?`)) return
    const res = await api.accounts.contacts.delete(c.account_id, c.id)
    if (res.error) { alert(res.error.message); return }
    refresh()
  }

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Contacts</h1>
          <p>{loading ? 'Loading…' : `${contacts.length} contacts across ${accounts.length} clients`}</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setPickAccount(true)}>
            <Icons.Plus /> Add contact
          </button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        placeholder="Search contacts, clients, emails…"
        chips={[
          { label: accountFilter ? accounts.find(a => a.id === accountFilter)?.name ?? 'Client' : 'Client', value: accountFilter, onClick: () => setAccountFilter('') },
        ]}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th><th>Client</th><th>Email</th><th>Phone</th><th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</td></tr>
              )}
              {!loading && filtered.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/clients/${c.account_id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={c.name} hue={hueFromId(c.id)} size="md" />
                      <span className="strong">{c.name}</span>
                    </div>
                  </td>
                  <td className="muted">{c.accountName}</td>
                  <td>
                    {c.email
                      ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontSize: 12 }} onClick={e => e.stopPropagation()}>{c.email}</a>
                      : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td className="muted">{c.phone || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn sm ghost" onClick={() => setEditor({ accountId: c.account_id, editing: c })} aria-label="Edit"><Icons.Edit style={{ width: 13, height: 13 }} /></button>
                      <button className="btn sm ghost" onClick={() => removeContact(c)} aria-label="Delete"><Icons.Trash style={{ width: 13, height: 13 }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icons.Search /></div>
                    <p className="empty-state-title">No contacts found</p>
                    <p className="empty-state-sub">{contacts.length === 0 ? 'Add your first contact to a client.' : 'Try adjusting your search or filters.'}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editor && (
        <ContactEditor
          open
          onClose={() => setEditor(null)}
          onDone={refresh}
          accountId={editor.accountId}
          editing={editor.editing}
        />
      )}

      {pickAccount && (
        <PickAccountModal
          accounts={accounts}
          onClose={() => setPickAccount(false)}
          onPick={(accountId) => { setPickAccount(false); setEditor({ accountId }) }}
        />
      )}
    </div>
  )
}

function PickAccountModal({ accounts, onClose, onPick }: {
  accounts: DbAccount[]
  onClose: () => void
  onPick: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const filtered = accounts.filter(a => a.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span>Choose client</span>
          <button className="close-btn" onClick={onClose} aria-label="Close"><Icons.X /></button>
        </div>
        <div className="modal-body" style={{ minWidth: 400, maxHeight: 400 }}>
          <input className="input" placeholder="Search clients…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(a => (
              <button
                key={a.id}
                onClick={() => onPick(a.id)}
                className="btn"
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <Pill tone="default">{a.name}</Pill>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No clients found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
