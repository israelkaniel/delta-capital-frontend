'use client'
import { useShell } from './shell-provider'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mobileNavOpen, setMobileNavOpen } = useShell()
  return (
    <div className="app" data-mobile-nav={mobileNavOpen ? 'open' : 'closed'}>
      {children}
      <button
        className="mobile-nav-overlay"
        aria-label="Close navigation"
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={() => setMobileNavOpen(false)}
      />
    </div>
  )
}
