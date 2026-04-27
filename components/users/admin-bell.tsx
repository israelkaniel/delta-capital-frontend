'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { api } from '@/lib/api'
import { useAdminNotifications, invalidate } from '@/lib/queries'

export function AdminBell() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const notifsQ = useAdminNotifications()
  const notifs = notifsQ.data ?? []

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const dismiss = async (id: string) => {
    await api.adminNotifications.dismiss(id)
    invalidate.adminNotifications(qc)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="tb-icon-btn"
        onClick={() => setOpen(!open)}
        title="Admin notifications"
        style={{ position: 'relative' }}
      >
        <Icons.Bell />
        {notifs.length > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: 'var(--neg)', color: 'white',
            borderRadius: 10, fontSize: 9, fontWeight: 600,
            minWidth: 14, height: 14, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>{notifs.length > 9 ? '9+' : notifs.length}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          width: 360, maxHeight: 460, overflowY: 'auto',
          background: 'var(--bg)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          zIndex: 60,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <strong style={{ fontSize: 13 }}>Admin notifications</strong>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{notifs.length} new</span>
          </div>

          {notifsQ.isLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
              You're all caught up.
            </div>
          ) : (
            notifs.map(n => (
              <div key={n.id} style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--line)',
                display: 'flex', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  {n.entity === 'profiles' && n.entity_id ? (
                    <Link href={`/admin/users/${n.entity_id}`} onClick={() => setOpen(false)}
                          style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)', textDecoration: 'none' }}>
                      {n.title}
                    </Link>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                  )}
                  {n.body && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{fmt.relTime(n.created_at)}</div>
                </div>
                <button
                  className="btn xs ghost"
                  onClick={() => dismiss(n.id)}
                  style={{ flexShrink: 0, alignSelf: 'flex-start' }}
                  aria-label="Dismiss"
                >
                  <Icons.X />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
