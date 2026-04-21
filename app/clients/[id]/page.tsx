'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { clients, deals, contacts } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'

// ── Helpers ────────────────────────────────────────────────────────────────
const ratingTone = (r: string) =>
  r.startsWith('A') ? 'pos' : r.startsWith('B') ? 'warn' : 'neg'

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

// ── Actions menu ───────────────────────────────────────────────────────────
function ActionsMenu({ clientId, companyName }: { clientId: string; companyName: string }) {
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

  const exportCSV = () => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return
    const row = [client.id, `"${client.company}"`, client.sector, client.rating, client.exposure, client.openDeals].join(',')
    const blob = new Blob([`ID,Company,Sector,Rating,Exposure,Open Deals\n${row}`], { type: 'text/csv' })
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${clientId}.csv`,
    }).click()
    setOpen(false)
  }

  type MenuItem = null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void }
  const items: MenuItem[] = [
    { label: 'Copy link',  icon: Icons.Link,     action: copyLink },
    { label: 'Print',      icon: Icons.Print,    action: () => { window.print(); setOpen(false) } },
    { label: 'Export CSV', icon: Icons.Download, action: exportCSV },
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

// ── Page ───────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const client = clients.find(c => c.id === id)

  if (!client) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Client not found.</p>
      <Link href="/clients" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        ← Back to clients
      </Link>
    </div>
  )

  const clientDeals    = deals.filter(d => d.clientId === client.id)
  const clientContacts = contacts.filter(c => c.clientId === client.id)
  const hue            = hueFromId(client.id)

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/clients" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Clients</Link>
        <span>/</span>
        <span style={{ color: 'var(--ink-1)' }}>{client.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `oklch(0.65 0.18 ${hue})`,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <Icons.Building style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{client.company}</h1>
              <span className="chip">{client.sector}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{client.id}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <ActionsMenu clientId={client.id} companyName={client.company} />
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total exposure',  val: fmt.money(client.exposure),      sub: 'funded capital' },
          { label: 'Open deals',      val: String(client.openDeals),         sub: `${clientDeals.length} total` },
          { label: 'Credit rating',   val: client.rating,                    sub: ratingTone(client.rating) === 'pos' ? 'Investment grade' : ratingTone(client.rating) === 'warn' ? 'Acceptable risk' : 'Monitor closely' },
          { label: 'Client since',    val: fmt.dateShort(client.since),      sub: 'member since' },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ cursor: 'default' }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 2-col: Deals table + Contacts list */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>

        {/* Deals table */}
        <div className="card">
          <div className="card-head">
            <h3>Deals <span className="badge" style={{ marginLeft: 4 }}>{clientDeals.length}</span></h3>
            <Link href="/deals" className="btn sm ghost" style={{ fontSize: 11 }}>
              View all <Icons.Chevron />
            </Link>
          </div>
          {clientDeals.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              No deals for this client.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th className="num">Amount</th>
                    <th>Funder</th>
                    <th>Status</th>
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
                        <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600, fontSize: 12 }}>
                          {d.id}
                        </span>
                      </td>
                      <td><span className="chip">{d.productType}</span></td>
                      <td className="num strong">{fmt.money(d.amount)}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{d.funder}</td>
                      <td><StatusPill status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contacts list */}
        <div className="card">
          <div className="card-head">
            <h3>Contacts <span className="badge" style={{ marginLeft: 4 }}>{clientContacts.length}</span></h3>
            <Link href="/contacts" className="btn sm ghost" style={{ fontSize: 11 }}>
              View all <Icons.Chevron />
            </Link>
          </div>
          {clientContacts.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              No contacts on file.
            </div>
          ) : (
            <div className="card-body flush">
              {clientContacts.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 18px',
                    borderBottom: i < clientContacts.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <Avatar
                    name={c.name}
                    hue={(c.id.charCodeAt(c.id.length - 1) * 47) % 360}
                    size="md"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{c.role}</div>
                    <a
                      href={`mailto:${c.email}`}
                      style={{ fontSize: 11.5, color: 'var(--accent-ink)', textDecoration: 'none', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {c.email}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile card — full width */}
      <div className="card">
        <div className="card-head"><h3>Profile</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
            {[
              { label: 'Client ID',   value: client.id,                       mono: true,  accent: true },
              { label: 'Sector',      value: client.sector,                    chip: true },
              { label: 'Rating',      value: client.rating,                    pill: true  },
              { label: 'Member since',value: fmt.dateShort(client.since) },
              { label: 'Open deals',  value: String(client.openDeals) },
              { label: 'Exposure',    value: fmt.money(client.exposure),       bold: true  },
            ].map((f, i, arr) => {
              const isLast = i === arr.length - 1
              return (
                <div key={f.label} style={{ display: 'contents' }}>
                  <div style={{
                    fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500,
                    padding: '12px 0 12px 20px',
                    borderBottom: isLast ? 'none' : '1px solid var(--line)',
                  }}>
                    {f.label}
                  </div>
                  <div style={{
                    fontSize: 13, padding: '12px 20px 12px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--line)',
                    fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                    color: f.accent ? 'var(--accent-ink)' : undefined,
                    fontWeight: f.bold ? 600 : 500,
                    display: 'flex', alignItems: 'center',
                  }}>
                    {f.chip ? (
                      <span className="chip">{f.value}</span>
                    ) : f.pill ? (
                      <Pill tone={ratingTone(f.value)}>{f.value}</Pill>
                    ) : (
                      f.value
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Audit footer — Client type doesn't have audit fields in data.ts,
            so we guard with a conditional that will activate once backend is wired */}
        {(client as any).createdAt && (
          <div className="audit-foot">
            <div className="audit-col">
              <span className="audit-lbl">Created</span>
              <span className="audit-val">{fmt.dateTime((client as any).createdAt ?? '')}</span>
              <span className="audit-by">by <strong>{(client as any).createdBy}</strong></span>
            </div>
            <div className="audit-sep" />
            <div className="audit-col">
              <span className="audit-lbl">Last modified</span>
              <span className="audit-val">
                {fmt.dateTime((client as any).updatedAt ?? '')}
                {fmt.relTime((client as any).updatedAt ?? '') ? (
                  <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
                    {' '}· {fmt.relTime((client as any).updatedAt ?? '')}
                  </span>
                ) : null}
              </span>
              <span className="audit-by">by <strong>{(client as any).updatedBy}</strong></span>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
