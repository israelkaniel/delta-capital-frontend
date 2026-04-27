// Paginated list shape returned from every list endpoint.
// Pages must hold (page, pageSize) state and pass them through their hook.
// No client-side slicing: rows.length is exactly what the server returned.

export const DEFAULT_PAGE_SIZE = 100

export interface Paginated<T> {
  rows:      T[]
  total:     number
  page:      number
  page_size: number
}

export interface PageParams {
  page?:      number
  page_size?: number
}

/** Convert (page, page_size) into PostgREST `.range(from, to)` bounds. */
export function rangeFor(page = 1, pageSize = DEFAULT_PAGE_SIZE): { from: number; to: number } {
  const p = Math.max(1, Math.floor(page))
  const s = Math.max(1, Math.floor(pageSize))
  const from = (p - 1) * s
  const to   = from + s - 1
  return { from, to }
}

/** Total page count given a row total and page size. */
export function pageCount(total: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
}

import { useState, useCallback } from 'react'

/**
 * usePageState — local pagination state for list pages.
 *
 * Use `resetKey` to encode all current filters (e.g. `[status, q]`). When any
 * value in resetKey changes between renders, the page is reset to 1 — this
 * prevents the user being stranded on an out-of-range page after filtering.
 */
export function usePageState(initial = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage]         = useState(initial)
  const [size, setSize]         = useState(pageSize)
  const reset                   = useCallback(() => setPage(1), [])
  return { page, setPage, pageSize: size, setPageSize: setSize, reset }
}
