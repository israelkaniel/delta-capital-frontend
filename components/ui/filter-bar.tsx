'use client'
import { Icons } from '@/lib/icons'

type Chip = { label: string; value: string; onClick: () => void }

export function FilterBar({
  search, setSearch, chips = [], placeholder = 'Search…',
}: {
  search: string; setSearch: (v: string) => void;
  chips?: Chip[]; placeholder?: string
}) {
  return (
    <div className="filter-bar">
      <div className="srch">
        <Icons.Search style={{ color: 'var(--ink-4)', flexShrink: 0, width: 13, height: 13 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} />
      </div>
      {chips.map((c, i) => (
        <div key={i} className={`filter-chip ${c.value ? 'on' : ''}`} onClick={c.onClick}>
          {c.label}: {c.value ? <span className="v">{c.value}</span> : <span>All</span>}
          <Icons.ChevronDown style={{ width: 10, height: 10, opacity: 0.6 }} />
        </div>
      ))}
      <div className="grow" />
      <button className="btn sm"><Icons.Filter /> More filters</button>
      <button className="btn sm"><Icons.Download /> Export</button>
    </div>
  )
}
