'use client'
import { usePathname } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { notifications } from '@/lib/data'
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
  const { toggleTheme, tweaks, setNotifOpen, notifOpen, setNewDealOpen } = useShell()
  const breadcrumbs = crumbs[pathname] ?? ['Workspace']
  const unread = notifications.filter(n => n.unread).length

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

      <div className="tb-divider" />

      <button className="tb-icon-btn" onClick={() => setNotifOpen(!notifOpen)} title="Notifications">
        <Icons.Bell />
        {unread > 0 && <span className="dot" />}
      </button>

      <button className="tb-icon-btn" onClick={toggleTheme} title="Toggle theme">
        {tweaks.theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
      </button>
    </header>
  )
}
