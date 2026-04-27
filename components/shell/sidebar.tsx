'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useShell } from './shell-provider'

type NavItem = { k: string; label: string; Icon: React.ComponentType<any>; countKey?: keyof Counts; adminOnly?: boolean }
type NavGroup = { label: string; items: NavItem[] }

type Counts = {
  deals: number
  commissions: number
  agents: number
  clients: number
  contacts: number
  funders: number
  payments: number
  monthly: number
}

const groups: NavGroup[] = [
  { label: 'Overview', items: [
    { k: '/dashboard', label: 'Dashboard', Icon: Icons.Dashboard },
    { k: '/reports',   label: 'Reports',   Icon: Icons.Chart },
  ]},
  { label: 'Pipeline', items: [
    { k: '/deals',       label: 'Deals',            Icon: Icons.Deal,     countKey: 'deals' },
    { k: '/commissions', label: 'Commissions',       Icon: Icons.Coin,     countKey: 'commissions' },
    { k: '/payout',      label: 'Payout',            Icon: Icons.Bank,     countKey: 'payments' },
    { k: '/ledger',      label: 'Ledger',            Icon: Icons.Ledger,   countKey: 'agents' },
    { k: '/monthly',     label: 'Monthly Summaries', Icon: Icons.Calendar, countKey: 'monthly' },
  ]},
  { label: 'Directory', items: [
    { k: '/clients',  label: 'Clients',  Icon: Icons.Folder, countKey: 'clients' },
    { k: '/agents',   label: 'Agents',   Icon: Icons.Agent,  countKey: 'agents' },
    { k: '/funders',  label: 'Funders',  Icon: Icons.Bank,   countKey: 'funders' },
  ]},
  { label: 'System', items: [
    { k: '/rules',       label: 'Commission Rules', Icon: Icons.Sparkles },
    { k: '/email-logs',  label: 'Email Logs',       Icon: Icons.Folder },
    { k: '/settings',    label: 'Settings',         Icon: Icons.Settings },
  ]},
  { label: 'Administration', items: [
    { k: '/admin/users',    label: 'Users',     Icon: Icons.People,   adminOnly: true },
    { k: '/admin/audit',    label: 'Audit Log', Icon: Icons.FileText, adminOnly: true },
    { k: '/admin/settings', label: 'Admin',     Icon: Icons.Sparkles, adminOnly: true },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login'
  const { setMobileNavOpen } = useShell()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => { setMobileNavOpen(false) }, [pathname, setMobileNavOpen])

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const [d, c, a, ac, fn, payRes, monRes] = await Promise.all([
      api.deals.list(),
      api.commissions.list(),
      api.agents.list(),
      api.accounts.list(),
      api.funders.list(),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('monthly_closes').select('*', { count: 'exact', head: true }),
    ])
    const accounts = ac.data ?? []
    const contacts = accounts.reduce((sum, x) => sum + ((x as any).contacts?.length ?? 0), 0)
    setCounts({
      deals:       (d.data ?? []).length,
      commissions: (c.data ?? []).length,
      agents:      (a.data ?? []).filter(x => x.is_active).length,
      clients:     accounts.length,
      contacts,
      funders:     (fn.data ?? []).length,
      payments:    payRes.count ?? 0,
      monthly:     monRes.count ?? 0,
    })
  }, [])

  // Only fetch counts once per session — not on every page navigation.
  // (Counts may be slightly stale after mutations; that's acceptable for sidebar badges.)
  useEffect(() => {
    if (isAuthPage) return
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthPage])

  // Load logged-in user info — name + role come from profiles, not user_metadata.
  // user_metadata.role is unreliable (the trigger sets it on signup but it can drift).
  useEffect(() => {
    if (isAuthPage) return
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (cancelled || !authUser) return
      const { data: profile } = await supabase
        .from('profiles').select('name, role').eq('id', authUser.id).maybeSingle()
      if (cancelled) return
      setUser({
        name: profile?.name ?? authUser.email?.split('@')[0] ?? 'User',
        email: authUser.email ?? '',
        role: profile?.role ?? 'User',
      })
    })
    return () => { cancelled = true }
  }, [isAuthPage])

  if (isAuthPage) return null

  const initials = (user?.name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">Δ</div>
        <div className="sb-brand-name">
          Delta Capital
          <small>Commissions OS</small>
        </div>
      </div>

      <div className="sb-search">
        <Icons.Search style={{ color: 'var(--ink-4)', width: 14, height: 14, flexShrink: 0 }} />
        <span>Search…</span>
        <kbd>⌘K</kbd>
      </div>

      <nav className="sb-nav">
        {groups.map((g, gi) => {
          const visible = g.items.filter(it => !(it.adminOnly && user?.role !== 'ADMIN'))
          if (visible.length === 0) return null
          return (
            <div key={gi}>
              <div className="sb-section-label">{g.label}</div>
              {visible.map(it => {
                const active = pathname === it.k || (it.k !== '/dashboard' && pathname.startsWith(it.k))
                const count = it.countKey ? counts?.[it.countKey] : undefined
                return (
                  <Link key={it.k} href={it.k} className={`sb-item ${active ? 'active' : ''}`}>
                    <span className="ico"><it.Icon /></span>
                    <span>{it.label}</span>
                    {count != null && <span className="count">{count}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="sb-user">
        <div className="sb-avatar">{initials}</div>
        <div className="info">
          <div className="name">{user?.name ?? '—'}</div>
          <div className="role">{user?.role ?? ''}</div>
        </div>
        <Icons.ChevronDown style={{ color: 'var(--ink-4)', width: 14, height: 14 }} />
      </div>
    </aside>
  )
}
