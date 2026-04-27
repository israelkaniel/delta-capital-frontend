'use client'
import { pageCount, DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { Icons } from '@/lib/icons'

interface PaginationProps {
  page:     number
  total:    number
  pageSize: number
  onPage:   (page: number) => void
  /** Show row range (e.g. "1–100 of 412") */
  showRange?: boolean
}

export function Pagination({ page, total, pageSize, onPage, showRange = true }: PaginationProps) {
  const last = pageCount(total, pageSize)
  if (last <= 1 && total <= pageSize) return null

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      {showRange && (
        <span className="pagination-range">
          {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
        </span>
      )}
      <div className="pagination-controls">
        <button
          className="btn xs ghost"
          disabled={page <= 1}
          onClick={() => onPage(1)}
          aria-label="First page"
          title="First"
        >‹‹</button>
        <button
          className="btn xs ghost"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <Icons.Chevron style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="pagination-page">
          Page <strong>{page}</strong> of {last}
        </span>
        <button
          className="btn xs ghost"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <Icons.Chevron />
        </button>
        <button
          className="btn xs ghost"
          disabled={page >= last}
          onClick={() => onPage(last)}
          aria-label="Last page"
          title="Last"
        >››</button>
      </div>
    </div>
  )
}

export { DEFAULT_PAGE_SIZE }
