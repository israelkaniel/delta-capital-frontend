'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/lib/icons'
import { useGlobalSearch } from '@/lib/queries'

type Hit = {
  kind: 'deal' | 'account' | 'contact' | 'agent' | 'funder' | 'commission'
  id:   string
  title: string
  subtitle?: string | null
}

const KIND_ORDER: Hit['kind'][] = ['deal', 'account', 'contact', 'agent', 'funder', 'commission']
const KIND_LABEL: Record<Hit['kind'], string> = {
  deal: 'Deals', account: 'Clients', contact: 'Contacts',
  agent: 'Agents', funder: 'Funders', commission: 'Commissions',
}
const KIND_HREF: Record<Hit['kind'], (id: string) => string> = {
  deal:       id => `/deals/${id}`,
  account:    id => `/clients/${id}`,
  contact:    id => `/contacts/${id}`,
  agent:      id => `/agents/${id}`,
  funder:     id => `/funders/${id}`,
  commission: id => `/commissions/${id}`,
}

function ItemIcon({ kind }: { kind: Hit['kind'] }) {
  switch (kind) {
    case 'deal':       return <Icons.Deal />
    case 'agent':      return <Icons.Agent />
    case 'account':    return <Icons.Building />
    case 'contact':    return <Icons.People />
    case 'funder':     return <Icons.Bank />
    case 'commission': return <Icons.Bank />
  }
}

/** Tiny debounce — avoids hitting the DB on every keystroke. */
function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const debounced = useDebounced(query, 250)
  const searchQ   = useGlobalSearch(debounced, open)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  const hits: Hit[] = (searchQ.data?.hits as Hit[] | undefined) ?? []

  const grouped = useMemo<Array<{ kind: Hit['kind']; items: Hit[] }>>(() => {
    return KIND_ORDER
      .map(kind => ({ kind, items: hits.filter(h => h.kind === kind) }))
      .filter(g => g.items.length > 0)
  }, [hits])

  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped])

  useEffect(() => {
    setSelected(prev => Math.min(prev, Math.max(flatItems.length - 1, 0)))
  }, [flatItems])

  useEffect(() => {
    const el = resultsRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const navigate = useCallback((kind: Hit['kind'], id: string) => {
    onClose()
    router.push(KIND_HREF[kind](id))
  }, [onClose, router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setSelected(prev => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setSelected(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[selected]
      if (item) navigate(item.kind, item.id)
    } else if (e.key === 'Escape') {
      e.preventDefault(); onClose()
    }
  }, [flatItems, selected, navigate, onClose])

  const groupOffsets = useMemo(() => {
    const offsets: number[] = []
    let total = 0
    for (const g of grouped) { offsets.push(total); total += g.items.length }
    return offsets
  }, [grouped])

  const trimmed = debounced.trim()
  const showHint    = trimmed.length === 0
  const showLoading = !showHint && (searchQ.isFetching || debounced !== query)
  const showEmpty   = !showHint && !showLoading && flatItems.length === 0

  return (
    <div
      className={`cmd-overlay${open ? ' open' : ''}`}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmd-input-wrap">
          <Icons.Search />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search deals, clients, contacts, agents, funders, commissions…"
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

        <div className="cmd-results" ref={resultsRef} role="listbox">
          {showHint && <div className="cmd-empty">Type at least 2 characters to search…</div>}
          {showLoading && <div className="cmd-empty">Searching…</div>}
          {showEmpty && <div className="cmd-empty">No results for &ldquo;{trimmed}&rdquo;</div>}
          {!showHint && !showLoading && !showEmpty && grouped.map((group, gi) => (
            <div key={group.kind}>
              <div className="cmd-section-label">{KIND_LABEL[group.kind]}</div>
              {group.items.map((item, ii) => {
                const flatIdx = groupOffsets[gi] + ii
                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    data-idx={flatIdx}
                    className={`cmd-item${flatIdx === selected ? ' selected' : ''}`}
                    role="option"
                    aria-selected={flatIdx === selected}
                    onMouseEnter={() => setSelected(flatIdx)}
                    onClick={() => navigate(item.kind, item.id)}
                  >
                    <ItemIcon kind={item.kind} />
                    <span className="cmd-item-main">{item.title}</span>
                    {item.subtitle && <span className="cmd-item-sub">{item.subtitle}</span>}
                    <span className="cmd-item-tag">{item.id.slice(0, 8)}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="cmd-footer">
          <span><kbd className="cmd-key">↑</kbd><kbd className="cmd-key">↓</kbd> navigate</span>
          <span><kbd className="cmd-key">↵</kbd> open</span>
          <span><kbd className="cmd-key">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
