'use client'
import { ReactNode, useEffect } from 'react'

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        {open && children}
      </div>
    </>
  )
}

export function Modal({ open, onClose, children, wide, xl }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; xl?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className={`modal${xl ? ' modal-xl' : wide ? ' modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
