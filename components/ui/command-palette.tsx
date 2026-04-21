'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { deals, agents, clients, contacts, funders } from '@/lib/data'

type SearchItem = {
  id: string
  type: 'deal' | 'agent' | 'client' | 'contact' | 'funder'
  primary: string
  secondary: string
  tag: string
  href: string
}

// Build the full search index once at module load time
const INDEX: SearchItem[] = [
  ...deals.map(d => ({
    id: d.id,
    type: 'deal' as const,
    primary: d.client,
    secondary: `${d.funder} · ${fmt.money(d.amount)}`,
    tag: d.id,
    href: `/deals/${d.id}`,
  })),
  ...agents.map(a => ({
    id: a.id,
    type: 'agent' as const,
    primary: a.name,
    secondary: `${a.tier} · ${a.email}`,
    tag: a.id,
    href: `/agents/${a.id}`,
  })),
  ...clients.map(c => ({
    id: c.id,
    type: 'client' as const,
    primary: c.company,
    secondary: `${c.sector} · ${c.rating}`,
    tag: c.id,
    href: `/clients/${c.id}`,
  })),
  ...contacts.map(c => ({
    id: c.id,
    type: 'contact' as const,
    primary: c.name,
    secondary: `${c.role} · ${c.company}`,
    tag: c.id,
    href: `/contacts/${c.id}`,
  })),
  ...funders.map(f => ({
    id: f.id,
    type: 'funder' as const,
    primary: f.name,
    secondary: `${f.type} · ${f.ticket}`,
    tag: f.id,
    href: `/funders/${f.id}`,
  })),
]

const TYPE_ORDER: SearchItem['type'][] = ['deal', 'agent', 'client', 'contact', 'funder']
const TYPE_LABEL: Record<SearchItem['type'], string> = {
  deal: 'Deals',
  agent: 'Agents',
  client: 'Clients',
  contact: 'Contacts',
  funder: 'Funders',
}

function ItemIcon({ type }: { type: SearchItem['type'] }) {
  switch (type) {
    case 'deal':    return <Icons.Deal />
    case 'agent':   return <Icons.Agent />
    case 'client':  return <Icons.Building />
    case 'contact': return <Icons.People />
    case 'funder':  return <Icons.Bank />
  }
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Focus input when opened; reset query when closed
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      // Small tick to let the overlay animate in before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Filtered / grouped results
  const grouped = useMemo<Array<{ type: SearchItem['type']; items: SearchItem[] }>>(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      // Show first 5 per section when idle
      return TYPE_ORDER
        .map(type => ({ type, items: INDEX.filter(i => i.type === type).slice(0, 5) }))
        .filter(g => g.items.length > 0)
    }

    const matched = INDEX.filter(item =>
      item.primary.toLowerCase().includes(q) ||
      item.secondary.toLowerCase().includes(q) ||
      item.tag.toLowerCase().includes(q)
    )

    return TYPE_ORDER
      .map(type => ({ type, items: matched.filter(i => i.type === type) }))
      .filter(g => g.items.length > 0)
  }, [query])

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped])

  // Keep selected in bounds when results change
  useEffect(() => {
    setSelected(prev => Math.min(prev, Math.max(flatItems.length - 1, 0)))
  }, [flatItems])

  // Scroll selected item into view
  useEffect(() => {
    const el = resultsRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const navigate = useCallback((href: string) => {
    onClose()
    router.push(href)
  }, [onClose, router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(prev => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[selected]
      if (item) navigate(item.href)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [flatItems, selected, navigate, onClose])

  // Compute flat index offset per group for correct data-idx assignment
  const groupOffsets = useMemo(() => {
    const offsets: number[] = []
    let total = 0
    for (const g of grouped) {
      offsets.push(total)
      total += g.items.length
    }
    return offsets
  }, [grouped])

  return (
    <div
      className={`cmd-overlay${open ? ' open' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        {/* Search input */}
        <div className="cmd-input-wrap">
          <Icons.Search />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search deals, agents, clients, contacts, funders…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search"
          />
          {query && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0, display: 'flex' }}
              onClick={() => { setQuery(''); setSelected(0); inputRef.current?.focus() }}
              tabIndex={-1}
              aria-label="Clear search"
            >
              <Icons.X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="cmd-results" ref={resultsRef} role="listbox">
          {flatItems.length === 0 ? (
            <div className="cmd-empty">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            grouped.map((group, gi) => (
              <div key={group.type}>
                <div className="cmd-section-label">{TYPE_LABEL[group.type]}</div>
                {group.items.map((item, ii) => {
                  const flatIdx = groupOffsets[gi] + ii
                  return (
                    <div
                      key={item.id}
                      data-idx={flatIdx}
                      className={`cmd-item${flatIdx === selected ? ' selected' : ''}`}
                      role="option"
                      aria-selected={flatIdx === selected}
                      onMouseEnter={() => setSelected(flatIdx)}
                      onClick={() => navigate(item.href)}
                    >
                      <ItemIcon type={item.type} />
                      <span className="cmd-item-main">{item.primary}</span>
                      <span className="cmd-item-sub">{item.secondary}</span>
                      <span className="cmd-item-tag">{item.tag}</span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cmd-footer">
          <span><kbd className="cmd-key">↑</kbd><kbd className="cmd-key">↓</kbd> navigate</span>
          <span><kbd className="cmd-key">↵</kbd> open</span>
          <span><kbd className="cmd-key">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
