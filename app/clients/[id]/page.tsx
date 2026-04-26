'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api, dealStatusLabel, type DbAccount, type DbContact, type DbDeal } from '@/lib/api'
import { dbAccounts } from '@/lib/db'
import { StatusPill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { ContactEditor } from '@/components/contacts/contact-editor'
import { ClientEditor } from '@/components/clients/client-editor'
import { NewDealModal } from '@/components/deals/new-deal-modal'
import { AuditFooter } from '@/components/ui/audit-footer'

type AccountFull = DbAccount & { contacts?: DbContact[]; deals?: DbDeal[] }

const hueFromId = (id: string) => (id.charCodeAt(id.length - 1) * 53) % 360

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [account, setAccount] = useState<AccountFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contactModal, setContactModal] = useState<{ editing?: DbContact } | null>(null)
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [newDealOpen, setNewDealOpen] = useState(false)

  const refresh = useCallback(async () => {
    const res = await dbAccounts.get(id)
    if (res.error) { setError(res.error.message); setLoading(false); return }
    setAccount(res.data)
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const removeContact = async (cid: string) => {
    if (!confirm('Remove this contact?')) return
    const res = await api.accounts.contacts.delete(id, cid)
    if (res.error) { alert(res.error.message); return }
    refresh()
  }

  if (loading) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--ink-4)' }}>
      Loading client…
    </div>
  )

  if (error || !account) return (
    <div className="page wide" style={{ padding: '40px 28px', textAlign: 'center' }}>
      <p style={{ color: 'var(--ink-4)' }}>{error ?? 'Client not found.'}</p>
      <Link href="/clients" className="btn sm" style={{ marginTop: 12, display: 'inline-flex' }}>Back to clients</Link>
    </div>
  )

  const dealsList = account.deals ?? []
  const contactsList = account.contacts ?? []
  const totalExposure = dealsList.reduce((s, d) => s + Number(d.transferred_amount ?? 0), 0)
  const activeDeals = dealsList.filter(d => d.status === 'FUNDS_TRANSFERRED' || d.status === 'APPROVED').length
  const hue = hueFromId(account.id)

  return (
    <div className="page wide" style={{ padding: '20px 28px 80px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/clients" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Clients</Link>
        <span>/</span>
        <span className="mono" style={{ color: 'var(--ink-1)' }}>{account.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `oklch(0.65 0.18 ${hue})`,
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icons.Building style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, marginBottom: 4 }}>{account.name}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{account.id.slice(0, 8)}</span>
              <span style={{ marginLeft: 12 }}>Member since {fmt.dateShort(account.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn sm primary" onClick={() => setNewDealOpen(true)}>
            <Icons.Plus style={{ width: 13, height: 13 }} /> New deal
          </button>
          <button className="btn sm" onClick={() => setEditAccountOpen(true)}>
            <Icons.Edit style={{ width: 13, height: 13 }} /> Edit
          </button>
          <button className="close-btn" onClick={() => router.back()}>
            <Icons.X /> Close
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Total exposure</div>
          <div className="kpi-val">{fmt.money(totalExposure)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>across {dealsList.length} deal{dealsList.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Active deals</div>
          <div className="kpi-val">{activeDeals}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>approved or funded</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Contacts</div>
          <div className="kpi-val">{contactsList.length}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>on file</div>
        </div>
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="kpi-label">Member since</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{fmt.dateShort(account.created_at)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>onboarded</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
        {/* Deals */}
        <div className="card">
          <div className="card-head">
            <h3>Deals <span className="badge" style={{ marginLeft: 4 }}>{dealsList.length}</span></h3>
            <Link href="/deals" className="btn sm ghost" style={{ fontSize: 11 }}>View all <Icons.Chevron /></Link>
          </div>
          {dealsList.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              No deals for this client.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Funder</th>
                    <th className="num">Transferred</th>
                    <th className="num">Payback</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dealsList.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/deals/${d.id}`)}>
                      <td><span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600, fontSize: 12 }}>{d.id.slice(0, 8)}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{d.funders?.name ?? '—'}</td>
                      <td className="num strong">{d.transferred_amount ? fmt.money(Number(d.transferred_amount)) : '—'}</td>
                      <td className="num">{d.payback_amount ? fmt.money(Number(d.payback_amount)) : '—'}</td>
                      <td><StatusPill status={dealStatusLabel(d.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contacts */}
        <div className="card">
          <div className="card-head">
            <h3>Contacts <span className="badge" style={{ marginLeft: 4 }}>{contactsList.length}</span></h3>
            <button className="btn sm primary" onClick={() => setContactModal({})}>
              <Icons.Plus /> Add
            </button>
          </div>
          {contactsList.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)' }}>
              No contacts on file.
            </div>
          ) : (
            <div className="card-body flush">
              {contactsList.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  borderBottom: i < contactsList.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <Avatar name={c.name} hue={(c.id.charCodeAt(c.id.length - 1) * 47) % 360} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                    {c.email && (
                      <a href={`mailto:${c.email}`} style={{ fontSize: 11.5, color: 'var(--accent-ink)', textDecoration: 'none', display: 'block', marginTop: 2 }}>
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{c.phone}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn sm ghost" onClick={() => setContactModal({ editing: c })} aria-label="Edit"><Icons.Edit style={{ width: 13, height: 13 }} /></button>
                    <button className="btn sm ghost" onClick={() => removeContact(c.id)} aria-label="Delete"><Icons.Trash style={{ width: 13, height: 13 }} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {account.notes && (
        <div className="card">
          <div className="card-head"><h3>Notes</h3></div>
          <div className="card-body">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{account.notes}</p>
          </div>
        </div>
      )}

      {contactModal && (
        <ContactEditor
          open
          onClose={() => setContactModal(null)}
          onDone={refresh}
          accountId={account.id}
          editing={contactModal.editing}
        />
      )}

      <ClientEditor
        open={editAccountOpen}
        onClose={() => setEditAccountOpen(false)}
        onDone={refresh}
        editing={account}
      />

      <NewDealModal
        open={newDealOpen}
        onClose={() => setNewDealOpen(false)}
        initialAccount={account}
      />
    </div>
  )
}
