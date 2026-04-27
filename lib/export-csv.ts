// CSV export helper — UTF-8 BOM for Excel auto-detection (incl. Hebrew).
// Opens natively in Excel/Numbers/Sheets without any add-on.

export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
}

const escapeCell = (v: string | number | null | undefined): string => {
  if (v == null) return ''
  const s = typeof v === 'number' ? String(v) : v
  if (/[",\n\r;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function exportCSV<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const header = columns.map(c => escapeCell(c.header)).join(',')
  const body = rows.map(r => columns.map(c => escapeCell(c.value(r))).join(',')).join('\r\n')
  const csv = '﻿' + header + '\r\n' + body  // BOM for Excel UTF-8

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Common formatters for export — keep dates ISO-ish (sortable), money raw (numeric)
export const csvFmt = {
  date: (s?: string | null) => s ? new Date(s).toISOString().slice(0, 10) : '',
  dateTime: (s?: string | null) => s ? new Date(s).toISOString().replace('T', ' ').slice(0, 16) : '',
  money: (n?: number | string | null) => n == null || n === '' ? '' : Number(n).toFixed(2),
  pct: (n?: number | string | null) => n == null || n === '' ? '' : Number(n).toFixed(2),
}

export const todayStamp = () => new Date().toISOString().slice(0, 10)
