'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { contacts, deals, dealById } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'

function ActionsMenu({ contact }: { contact: { id: string; name: string; email: string } }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setOpen(false)
  }

  type MenuItem = null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void }
  const items: MenuItem[] = [
    { label: 'Send email',  icon: Icons.Mail,  action: () => { window.location.href = `mailto:${contact.email}`; setOpen(false) } },
    { label: 'Copy link',   icon: Icons.Link,  action: copyLink },
    { label: 'Print',       icon: Icons.Print, action: () => { window.print(); setOpen(false) } },
  ]

  return (
    <div className="record-menu-wrap" ref={ref}>
      <button className="btn sm" onClick={() => setOpen(v => !v)}>
        Actions <Icons.ChevronDown style={{ width: 11, height: 11 }} />
      </button>
      {open && (
        <div className="record-menu">
          {items.map((item, i) =>
            item === null
              ? <div key={i} className="record-menu-divider" />
              : (
                <button key={item.label} onClick={item.action} className="record-menu-item">
                  <item.icon />{item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const contact = contacts.find(c => c.id === id)

  if (!contact) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Contact not found.</p>
      <Link href="/contacts" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Back to contacts
      </Link>
    </div>
  )

  const hue = (contact.id.charCodeAt(contact.id.length - 1) * 47) % 360
  const clientDeals = deals.filter(d => d.clientId === contact.clientId)

  return (
    <div className="page" style={{ padding: '20px 28px 60px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/contacts" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Contacts</Link>
        <span>/</span>
        <span style={{ color: 'var(--ink-1)' }}>{contact.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <Avatar name={contact.name} hue={hue} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{contact.name}</h1>
              <Pill tone="default">{contact.role}</Pill>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{contact.id}</span>
              <span>{contact.company}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <ActionsMenu contact={contact} />
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI strip — 3 cols */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Role</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{contact.role}</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Company</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{contact.company}</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Client ID</div>
          <div className="kpi-val mono" style={{ fontSize: 18, color: 'var(--accent-ink)' }}>{contact.clientId}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Profile card */}
        <div className="card">
          <div className="card-head"><h3>Profile</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
              {[
                { label: 'Contact ID', value: contact.id,       mono: true, accent: true },
                { label: 'Full name',  value: contact.name,     mono: false },
                { label: 'Role',       value: contact.role,     mono: false },
                { label: 'Company',    value: contact.company,  mono: false },
                { label: 'Email',      value: contact.email,    mono: true,  link: `mailto:${contact.email}` },
                { label: 'Phone',      value: contact.phone,    mono: true },
                { label: 'Client ID',  value: contact.clientId, mono: true, accent: true },
              ].map((f, i, arr) => {
                const isLast = i === arr.length - 1
                return (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{
                      fontSize: 11.5,
                      color: 'var(--ink-3)',
                      fontWeight: 500,
                      padding: '11px 0 11px 18px',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                    }}>
                      {f.label}
                    </div>
                    <div style={{
                      fontSize: 13,
                      padding: '11px 18px 11px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                      fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                      color: f.accent ? 'var(--accent-ink)' : undefined,
                      fontWeight: 500,
                      wordBreak: 'break-all',
                    }}>
                      {f.link
                        ? <a href={f.link} style={{ color: 'var(--accent-ink)', textDecoration: 'none' }}>{f.value}</a>
                        : f.value
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {contact.createdAt && (
            <div className="audit-foot">
              <div className="audit-col">
                <span className="audit-lbl">Created</span>
                <span className="audit-val">{fmt.dateTime(contact.createdAt)}</span>
                {contact.createdBy && <span className="audit-by">by <strong>{contact.createdBy}</strong></span>}
              </div>
              <div className="audit-sep" />
              <div className="audit-col">
                <span className="audit-lbl">Last modified</span>
                <span className="audit-val">{fmt.dateTime(contact.updatedAt ?? '')}</span>
                {contact.updatedBy && <span className="audit-by">by <strong>{contact.updatedBy}</strong></span>}
              </div>
            </div>
          )}
        </div>

        {/* Related deals */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Related deals <span className="badge" style={{ marginLeft: 4 }}>{clientDeals.length}</span></h3>
              <div className="sub">{contact.company} · {contact.clientId}</div>
            </div>
            <Link href="/deals" className="btn sm ghost" style={{ fontSize: 11 }}>
              View all <Icons.Chevron />
            </Link>
          </div>
          {clientDeals.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 20px' }}>
              No deals found for this client.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Deal ID</th>
                    <th className="num">Amount</th>
                    <th>Status</th>
                    <th>Funder</th>
                    <th>Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {clientDeals.map(d => (
                    <tr
                      key={d.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/deals/${d.id}`)}
                    >
                      <td>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--accent-ink)', fontWeight: 600 }}>
                          {d.id}
                        </span>
                      </td>
                      <td className="num">{fmt.money(d.amount)}</td>
                      <td><StatusPill status={d.status} /></td>
                      <td>
                        <span className="muted" style={{ fontSize: 12 }}>{d.funder}</span>
                      </td>
                      <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
