'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Deal, Commission, Agent, Client, Funder } from '@/lib/data'

type DrawerKind = 'deal' | 'commission' | 'agent' | 'client' | 'funder' | null
type DrawerEntity = Deal | Commission | Agent | Client | Funder | null

type Tweaks = { accentHue: number; theme: 'light' | 'dark'; density: 'compact' | 'default' | 'comfortable'; sidebar: 'full' | 'icons' }

type ShellCtx = {
  tweaks: Tweaks
  updateTweaks: (p: Partial<Tweaks>) => void
  toggleTheme: () => void
  drawer: { kind: DrawerKind; entity: DrawerEntity }
  openDeal: (d: Deal) => void
  openCommission: (c: Commission) => void
  openAgent: (a: Agent) => void
  openClient: (c: Client) => void
  openFunder: (f: Funder) => void
  closeDrawer: () => void
  newDealOpen: boolean
  setNewDealOpen: (v: boolean) => void
  notifOpen: boolean
  setNotifOpen: (v: boolean) => void
  tweaksOpen: boolean
  setTweaksOpen: (v: boolean) => void
}

const Ctx = createContext<ShellCtx>(null!)
export const useShell = () => useContext(Ctx)

const DEFAULTS: Tweaks = { accentHue: 150, theme: 'light', density: 'compact', sidebar: 'full' }

export function ShellProvider({ children }: { children: ReactNode }) {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULTS)
  const [drawer, setDrawer] = useState<{ kind: DrawerKind; entity: DrawerEntity }>({ kind: null, entity: null })
  const [newDealOpen, setNewDealOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [tweaksOpen, setTweaksOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme)
    document.documentElement.setAttribute('data-density', tweaks.density)
    document.documentElement.style.setProperty('--accent-h', String(tweaks.accentHue))
  }, [tweaks])

  const updateTweaks = (p: Partial<Tweaks>) => setTweaks(prev => ({ ...prev, ...p }))
  const toggleTheme = () => updateTweaks({ theme: tweaks.theme === 'dark' ? 'light' : 'dark' })

  return (
    <Ctx.Provider value={{
      tweaks, updateTweaks, toggleTheme,
      drawer,
      openDeal:       (e) => setDrawer({ kind: 'deal',       entity: e }),
      openCommission: (e) => setDrawer({ kind: 'commission', entity: e }),
      openAgent:      (e) => setDrawer({ kind: 'agent',      entity: e }),
      openClient:     (e) => setDrawer({ kind: 'client',     entity: e }),
      openFunder:     (e) => setDrawer({ kind: 'funder',     entity: e }),
      closeDrawer:    () => setDrawer({ kind: null, entity: null }),
      newDealOpen, setNewDealOpen,
      notifOpen, setNotifOpen,
      tweaksOpen, setTweaksOpen,
    }}>
      {children}
    </Ctx.Provider>
  )
}
