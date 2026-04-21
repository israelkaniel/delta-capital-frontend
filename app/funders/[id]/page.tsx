'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { funders, deals } from '@/lib/data'
import { StatusPill, Pill } from '@/components/ui/pill'

// ── Actions menu ───────────────────────────────────────────────────────────
function ActionsMenu({ funderId, funderName }: { funderId: string; funderName: string }) {
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
    const funder = funders.find(f => f.id === funderId)
    if (!funder) return
    const row = [funder.id, `"${funder.name}"`, funder.type, funder.ticket, funder.avail].join(',')
    const blob = new Blob([`ID,Name,Type,Ticket,Available\n${row}`], { type: 'text/csv' })
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${funderId}.csv`,
    }).click()
    setOpen(false)
  }

  type MenuItem = null | { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; action: () => void }
  const items: MenuItem[] = [
    { label: 'Copy link',   icon: Icons.Link,     action: copyLink },
    { label: 'Print',       icon: Icons.Print,    action: () => { window.print(); setOpen(false) } },
    { label: 'Export CSV',  icon: Icons.Download, action: exportCSV },
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
export default function FunderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const funder = funders.find(f => f.id === id)

  if (!funder) return (
    <div className="page" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>Funder not found.</p>
      <Link href="/funders" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        ← Back to funders
      </Link>
    </div>
  )

  const funderDeals = deals.filter(d => d.funderId === funder.id)
  const activeDeals = funderDeals.filter(d => d.status === 'Active').length
  const deployed    = funderDeals.reduce((a, d) => a + d.amount, 0)

  // Parse ticket range for min/max display
  const ticketParts = funder.ticket.split('–')
  const minTicket   = ticketParts[0]?.trim() ?? '—'
  const maxTicket   = ticketParts[1]?.trim() ?? (funder.ticket === 'Any' ? 'Any' : '—')

  // Capacity bar — avail vs (avail + deployed)
  const total       = funder.avail + deployed
  const availPct    = total > 0 ? Math.round((funder.avail / total) * 100) : 0
  const deployedPct = 100 - availPct

  const typeColor = (t: string) =>
    t === 'Institutional' ? 'var(--accent)'
    : t === 'Family Office' ? 'oklch(0.62 0.17 150)'
    : t === 'In-house'     ? 'oklch(0.65 0.17 20)'
    : 'oklch(0.65 0.17 268)'

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/funders" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Funders</Link>
        <span>/</span>
        <span style={{ color: 'var(--ink-1)' }}>{funder.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          {/* Funder logo — colored square with first letter */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `oklch(0.65 0.18 ${funder.hue})`,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 20,
            fontFamily: 'var(--font-mono)',
          }}>
            {funder.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0 }}>{funder.name}</h1>
              <Pill tone={
                funder.type === 'Institutional' ? 'accent'
                : funder.type === 'In-house'   ? 'pos'
                : 'default'
              }>{funder.type}</Pill>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{funder.id}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <ActionsMenu funderId={funder.id} funderName={funder.name} />
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Available capital',  val: fmt.moneyK(funder.avail),  sub: `${availPct}% of capacity` },
          { label: 'Min ticket',         val: minTicket,                  sub: 'minimum deal size' },
          { label: 'Max ticket',         val: maxTicket,                  sub: 'maximum deal size' },
          { label: 'Active deals',       val: String(activeDeals),        sub: `${funderDeals.length} total placed` },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ cursor: 'default' }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 2-col: Profile + Capacity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Profile card */}
        <div className="card">
          <div className="card-head"><h3>Profile</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
              {[
                { label: 'Funder ID',     value: funder.id,     mono: true, accent: true },
                { label: 'Type',          value: funder.type,   chip: true },
                { label: 'Ticket range',  value: funder.ticket },
                { label: 'Available',     value: fmt.moneyK(funder.avail), bold: true },
              ].map((f, i, arr) => {
                const isLast = i === arr.length - 1
                return (
                  <div key={f.label} style={{ display: 'contents' }}>
                    <div style={{
                      fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500,
                      padding: '11px 0 11px 18px',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                    }}>
                      {f.label}
                    </div>
                    <div style={{
                      fontSize: 13, padding: '11px 18px 11px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--line)',
                      fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                      color: f.accent ? 'var(--accent-ink)' : undefined,
                      fontWeight: f.bold ? 600 : 500,
                      display: 'flex', alignItems: 'center',
                    }}>
                      {f.chip
                        ? <span className="chip">{f.value}</span>
                        : f.value
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {funder.createdAt && (
            <div className="audit-foot">
              <div className="audit-col">
                <span className="audit-lbl">Created</span>
                <span className="audit-val">{fmt.dateTime(funder.createdAt ?? '')}</span>
                <span className="audit-by">by <strong>{funder.createdBy}</strong></span>
              </div>
              <div className="audit-sep" />
              <div className="audit-col">
                <span className="audit-lbl">Last modified</span>
                <span className="audit-val">
                  {fmt.dateTime(funder.updatedAt ?? '')}
                  {fmt.relTime(funder.updatedAt ?? '') ? (
                    <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
                      {' '}· {fmt.relTime(funder.updatedAt ?? '')}
                    </span>
                  ) : null}
                </span>
                <span className="audit-by">by <strong>{funder.updatedBy}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Capacity card */}
        <div className="card">
          <div className="card-head"><h3>Capacity</h3></div>
          <div className="card-body">
            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500 }}>Utilisation</span>
                <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{deployedPct}% deployed</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'var(--bg-sunk)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${deployedPct}%`,
                  borderRadius: 999,
                  background: `oklch(0.65 0.18 ${funder.hue})`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ink-4)' }}>
                <span>{fmt.moneyK(deployed)} deployed</span>
                <span>{fmt.moneyK(funder.avail)} available</span>
              </div>
            </div>

            {/* Stat rows */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total capacity',  val: fmt.moneyK(total) },
                { label: 'Deployed',        val: fmt.moneyK(deployed) },
                { label: 'Available',       val: fmt.moneyK(funder.avail) },
                { label: 'Deals placed',    val: String(funderDeals.length) },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-sunk)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 3 }}>{s.label}</div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deals placed — full width */}
      <div className="card">
        <div className="card-head">
          <h3>Deals placed <span className="badge" style={{ marginLeft: 4 }}>{funderDeals.length}</span></h3>
          <Link href="/deals" className="btn sm ghost" style={{ fontSize: 11 }}>
            View all deals <Icons.Chevron />
          </Link>
        </div>
        {funderDeals.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
            No deals placed with this funder yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Client</th>
                  <th className="num">Amount</th>
                  <th className="num">Rate</th>
                  <th>Status</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {funderDeals.map(d => (
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
                    <td><span className="strong">{d.client}</span></td>
                    <td className="num">{fmt.money(d.amount)}</td>
                    <td className="num">{fmt.pct(d.rate)}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td className="muted-num">{fmt.dateShort(d.closed)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600 }}>
                  <td colSpan={2}>Total</td>
                  <td className="num">{fmt.money(deployed)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
