import type { Metadata } from 'next'
import './globals.css'
import { ShellProvider } from '@/components/shell/shell-provider'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { ShellOverlays } from '@/components/shell/drawers'
import { TweaksPanel } from '@/components/ui/tweaks-panel'

export const metadata: Metadata = { title: 'Delta Capital — Commissions OS' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ShellProvider>
          <div className="app">
            <Sidebar />
            <Topbar />
            <main className="main">{children}</main>
          </div>
          <ShellOverlays />
          <TweaksPanel />
        </ShellProvider>
      </body>
    </html>
  )
}
