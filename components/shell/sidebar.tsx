'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { deals, commissions, clients, contacts, agents, funders } from '@/lib/data'
import { useShell } from './shell-provider'

type NavItem = { k: string; label: string; Icon: React.ComponentType<any>; countFn?: () => number }
type NavGroup = { label: string; items: NavItem[] }
const groups: NavGroup[] = [
  { label: 'Overview', items: [
    { k: '/dashboard', label: 'Dashboard', Icon: Icons.Dashboard },
    { k: '/reports',   label: 'Reports',   Icon: Icons.Chart },
  ]},
  { label: 'Pipeline', items: [
    { k: '/deals',       label: 'Deals',            Icon: Icons.Deal,     countFn: () => deals.length },
    { k: '/commissions', label: 'Commissions',       Icon: Icons.Coin,     countFn: () => commissions.length },
    { k: '/monthly',     label: 'Monthly Summaries', Icon: Icons.Calendar },
  ]},
  { label: 'Directory', items: [
    { k: '/clients',  label: 'Clients',  Icon: Icons.Folder, countFn: () => clients.length },
    { k: '/contacts', label: 'Contacts', Icon: Icons.People, countFn: () => contacts.length },
    { k: '/agents',   label: 'Agents',   Icon: Icons.Agent,  countFn: () => agents.filter(a => a.active).length },
    { k: '/funders',  label: 'Funders',  Icon: Icons.Bank,   countFn: () => funders.length },
  ]},
  { label: 'System', items: [
    { k: '/rules',    label: 'Commission Rules', Icon: Icons.Sparkles },
    { k: '/settings', label: 'Settings',         Icon: Icons.Settings },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()
  const { tweaks } = useShell()

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
        {groups.map((g, gi) => (
          <div key={gi}>
            <div className="sb-section-label">{g.label}</div>
            {g.items.map(it => {
              const active = pathname === it.k || (it.k !== '/dashboard' && pathname.startsWith(it.k))
              const count = it.countFn ? it.countFn() : undefined
              return (
                <Link key={it.k} href={it.k} className={`sb-item ${active ? 'active' : ''}`}>
                  <span className="ico"><it.Icon /></span>
                  <span>{it.label}</span>
                  {count != null && <span className="count">{count}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sb-user">
        <div className="sb-avatar">NH</div>
        <div className="info">
          <div className="name">Noam Harel</div>
          <div className="role">Senior Agent · Admin</div>
        </div>
        <Icons.ChevronDown style={{ color: 'var(--ink-4)', width: 14, height: 14 }} />
      </div>
    </aside>
  )
}
