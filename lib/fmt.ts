export const fmt = {
  money: (n: number) => n ? '$' + n.toLocaleString('en-US') : '—',
  moneyK: (n: number) => {
    if (!n) return '$0'
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K'
    return '$' + n
  },
  pct: (n: number) => n ? n.toFixed(2).replace(/\.?0+$/, '') + '%' : '—',
  date: (s: string) => {
    if (!s || s === '—') return '—'
    try {
      return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return s }
  },
  dateShort: (s: string) => {
    if (!s || s === '—') return '—'
    try {
      return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    } catch { return s }
  },
  monthLabel: (s: string) => {
    if (!s) return ''
    const [y, m] = s.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return months[parseInt(m) - 1] + " '" + y.slice(2)
  },
  initials: (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  },
  dateTime: (s: string) => {
    if (!s || s === '—') return '—'
    try {
      const d = new Date(s)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch { return s }
  },
  relTime: (s: string) => {
    if (!s || s === '—') return ''
    try {
      const diff = Date.now() - new Date(s).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 2) return 'just now'
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h ago`
      const days = Math.floor(hrs / 24)
      if (days < 30) return `${days}d ago`
      return ''
    } catch { return '' }
  },
}
