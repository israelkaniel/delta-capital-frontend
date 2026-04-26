'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { useShell } from './shell-provider'

const crumbs: Record<string, string[]> = {
  '/dashboard':   ['Workspace', 'Dashboard'],
  '/deals':       ['Workspace', 'Deals'],
  '/commissions': ['Workspace', 'Commissions'],
  '/clients':     ['Workspace', 'Clients'],
  '/contacts':    ['Workspace', 'Contacts'],
  '/agents':      ['Workspace', 'Agents'],
  '/funders':     ['Workspace', 'Funders'],
  '/monthly':     ['Workspace', 'Monthly Summaries'],
  '/rules':       ['Workspace', 'Commission Rules'],
  '/reports':     ['Workspace', 'Reports'],
  '/settings':    ['Workspace', 'Settings'],
}

export function Topbar() {
  const pathname = usePathname()
  const { toggleTheme, tweaks, setNewDealOpen, cmdOpen, setCmdOpen } = useShell()
  const breadcrumbs = crumbs[pathname] ?? ['Workspace']
  const isAuthPage = pathname === '/login'

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(!cmdOpen)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmdOpen, setCmdOpen])

  if (isAuthPage) return null

  return (
    <header className="topbar">
      <div className="tb-crumbs">
        {breadcrumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <Icons.Chevron className="sep" style={{ width: 12, height: 12, color: 'var(--ink-5)' }} />}
            <span className={i === breadcrumbs.length - 1 ? 'cur' : ''}>{c}</span>
          </span>
        ))}
      </div>

      <div className="tb-spacer" />

      {pathname !== '/dashboard' && pathname !== '/deals' && (
        <button className="btn sm" onClick={() => setNewDealOpen(true)}>
          <Icons.Plus /> New deal
        </button>
      )}

      <button
        className="btn sm ghost"
        onClick={() => setCmdOpen(true)}
        title="Open command palette"
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12 }}
      >
        <Icons.Search style={{ width: 13, height: 13 }} />
        <span style={{ fontFamily: 'var(--font-sans)' }}>Search</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, opacity: 0.7, marginLeft: 2 }}>⌘K</span>
      </button>

      <div className="tb-divider" />

      <button className="tb-icon-btn" onClick={toggleTheme} title="Toggle theme">
        {tweaks.theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
      </button>
    </header>
  )
}
