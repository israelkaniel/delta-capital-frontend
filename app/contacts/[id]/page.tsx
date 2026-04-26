'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { api, type DbAccount, type DbContact } from '@/lib/api'
import { ContactEditor } from '@/components/contacts/contact-editor'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 47) % 360

type FoundContact = DbContact & { account: DbAccount }

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<FoundContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await api.accounts.list()
    if (res.error) { setLoading(false); return }
    for (const a of res.data ?? []) {
      const found = (a.contacts ?? []).find(c => c.id === id)
      if (found) {
        const detail = await api.accounts.get(a.id)
        setContact({ ...(found as DbContact), account: detail.data ?? a })
        setLoading(false)
        return
      }
    }
    setContact(null)
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const remove = async () => {
    if (!contact || !confirm(`Remove ${contact.name}?`)) return
    const res = await api.accounts.contacts.delete(contact.account.id, contact.id)
    if (res.error) { alert(res.error.message); return }
    router.push('/contacts')
  }

  if (loading) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>Loading contact…</div>
  )

  if (!contact) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Contact not found.</p>
      <Link href="/contacts" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to contacts</Link>
    </div>
  )

  const hue = hueFromId(contact.id)
  const accountDeals = (contact.account as any).deals ?? []

  return (
    <div className="page wide" style={{ padding: '20px 28px 60px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/contacts" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Contacts</Link>
        <span>/</span>
        <span className="mono" style={{ color: 'var(--ink-1)' }}>{contact.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <Avatar name={contact.name} hue={hue} size="lg" />
          <div>
            <h1 style={{ margin: 0, marginBottom: 4 }}>{contact.name}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <Link href={`/clients/${contact.account.id}`} style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 500 }}>
                {contact.account.name}
              </Link>
              {contact.email && <a href={`mailto:${contact.email}`} style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>{contact.email}</a>}
            </div>
          </div>
        </div>
        <div className="actions">
          {contact.email && <a href={`mailto:${contact.email}`} className="btn sm"><Icons.Mail /> Email</a>}
          <button className="btn sm" onClick={() => setEditorOpen(true)}><Icons.Edit /> Edit</button>
          <button className="btn sm danger" onClick={remove}><Icons.Trash /> Remove</button>
          <button className="close-btn" onClick={() => router.back()}><Icons.X /> Close</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Profile</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
              {([
                { label: 'Contact ID', value: contact.id.slice(0, 8), mono: true, accent: true },
                { label: 'Name',       value: contact.name },
                { label: 'Email',      value: contact.email ?? '—', mono: !!contact.email, link: contact.email ? `mailto:${contact.email}` : undefined },
                { label: 'Phone',      value: contact.phone ?? '—', mono: !!contact.phone },
                { label: 'External',   value: contact.external_id ?? '—', mono: !!contact.external_id },
                { label: 'Client',     value: contact.account.name, link: `/clients/${contact.account.id}`, internal: true },
              ] as const).map((f, i, arr) => {
                const isLast = i === arr.length - 1
                const linkVal = 'link' in f ? f.link : undefined
                return (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{
                      fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500,
                      padding: '11px 0 11px 18px',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                    }}>{f.label}</div>
                    <div style={{
                      fontSize: 13, padding: '11px 18px 11px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                      fontFamily: 'mono' in f && f.mono ? 'var(--font-mono)' : undefined,
                      color: 'accent' in f && f.accent ? 'var(--accent-ink)' : undefined,
                      fontWeight: 500, wordBreak: 'break-all',
                    }}>
                      {linkVal
                        ? ('internal' in f && f.internal
                            ? <Link href={linkVal} style={{ color: 'var(--accent-ink)', textDecoration: 'none' }}>{f.value}</Link>
                            : <a href={linkVal} style={{ color: 'var(--accent-ink)', textDecoration: 'none' }}>{f.value}</a>)
                        : f.value}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Related deals <span className="badge" style={{ marginLeft: 4 }}>{accountDeals.length}</span></h3>
              <div className="sub">All deals on {contact.account.name}</div>
            </div>
            <Link href={`/clients/${contact.account.id}`} className="btn sm ghost" style={{ fontSize: 11 }}>
              Open client <Icons.Chevron />
            </Link>
          </div>
          {accountDeals.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 20px' }}>
              No deals on this client yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Deal</th><th className="num">Transferred</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {accountDeals.map((d: any) => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/deals/${d.id}`)}>
                      <td><span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600, fontSize: 12 }}>{d.id.slice(0, 8)}</span></td>
                      <td className="num">{d.transferred_amount ? fmt.money(Number(d.transferred_amount)) : '—'}</td>
                      <td><Pill tone="default">{d.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ContactEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onDone={refresh}
        accountId={contact.account.id}
        editing={contact}
      />
    </div>
  )
}
