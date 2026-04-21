'use client'
import { useState, useRef, useEffect } from 'react'
import { Icons } from '@/lib/icons'
import { fmt } from '@/lib/fmt'
import { commissions, deals, agents, monthly } from '@/lib/data'
import { AreaChart, BarChart } from '@/components/ui/charts'

const REPORT_TEMPLATES = [
  { id: 'RT-01', name: 'Monthly Commission Statement', desc: 'Per-agent breakdown with splits', icon: 'FileText', lastRun: '2026-04-01' },
  { id: 'RT-02', name: 'Funder Activity Report',       desc: 'Volume and deal count by funder', icon: 'Building', lastRun: '2026-04-01' },
  { id: 'RT-03', name: 'Deal Pipeline Summary',        desc: 'Active and pending deals overview', icon: 'Briefcase', lastRun: '2026-03-31' },
  { id: 'RT-04', name: 'YTD Performance Report',       desc: 'All agents · year-to-date earnings', icon: 'BarChart', lastRun: '2026-04-01' },
  { id: 'RT-05', name: 'Commission Reconciliation',    desc: 'Paid vs pending discrepancy report', icon: 'Check', lastRun: '2026-03-28' },
  { id: 'RT-06', name: 'Client Exposure Report',       desc: 'Total exposure per client entity', icon: 'Users', lastRun: '2026-04-02' },
]

function exportMonthlyCSV() {
  const header = ['Month', 'Volume', 'Commissions', 'Deals']
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month))
  const rows = sorted.map(m => [m.month, m.volume, m.commissions, m.deals ?? ''])
  const csv = [header, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'delta-monthly-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const ytdComm = monthly.reduce((a, m) => a + m.commissions, 0)
  const ytdVol  = monthly.reduce((a, m) => a + m.volume, 0)
  const paidComm = commissions.filter(c => c.status === 'Paid').reduce((a, c) => a + c.value, 0)
  const pendingComm = commissions.filter(c => c.status !== 'Paid').reduce((a, c) => a + c.value, 0)

  // Per-report success banner state: maps report id -> true when visible
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set())
  // Per-report schedule popover state: maps report id -> true when open
  const [scheduleOpenId, setScheduleOpenId] = useState<string | null>(null)
  const scheduleRef = useRef<HTMLDivElement | null>(null)

  // Close schedule popover on outside click
  useEffect(() => {
    if (!scheduleOpenId) return
    const handler = (e: MouseEvent) => {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setScheduleOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [scheduleOpenId])

  const runReport = (id: string) => {
    setSuccessIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setSuccessIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 3000)
  }

  const toggleSchedule = (id: string) => {
    setScheduleOpenId(prev => prev === id ? null : id)
  }

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>Generate, schedule, and export reports</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportMonthlyCSV}>
            <Icons.Download /> Export CSV
          </button>
          <button className="btn primary"><Icons.Plus /> Custom report</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'YTD volume', val: fmt.moneyK(ytdVol) },
          { label: 'YTD commissions', val: fmt.moneyK(ytdComm) },
          { label: 'Paid commissions', val: fmt.moneyK(paidComm) },
          { label: 'Pending / open', val: fmt.moneyK(pendingComm) },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Commission trend</h3><div className="sub">Last 6 months</div></div></div>
          <div className="card-body">
            <AreaChart
              data={[...monthly].sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ x: fmt.monthLabel(m.month), y: m.commissions }))}
              height={200}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Volume trend</h3><div className="sub">Funded volume by month</div></div></div>
          <div className="card-body">
            <AreaChart
              data={[...monthly].sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ x: fmt.monthLabel(m.month), y: m.volume }))}
              height={200}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Report templates</h3></div>
        <div className="card-body flush">
          {REPORT_TEMPLATES.map((r, i) => (
            <div key={r.id} style={{ borderBottom: i < REPORT_TEMPLATES.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icons.FileText style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{r.desc} · Last run: {fmt.dateShort(r.lastRun)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Schedule button with popover */}
                  <div style={{ position: 'relative' }} ref={scheduleOpenId === r.id ? scheduleRef : null}>
                    <button
                      className="btn sm ghost"
                      onClick={() => toggleSchedule(r.id)}
                      aria-expanded={scheduleOpenId === r.id}
                    >
                      <Icons.Clock style={{ width: 13, height: 13 }} /> Schedule
                    </button>
                    {scheduleOpenId === r.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20,
                        background: 'var(--bg-surface)', border: '1px solid var(--line)',
                        borderRadius: 8, padding: '10px 14px', whiteSpace: 'nowrap',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        fontSize: 12.5, color: 'var(--ink-2)',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}>
                        <Icons.Clock style={{ width: 13, height: 13, color: 'var(--ink-4)', flexShrink: 0 }} />
                        Scheduling coming soon
                      </div>
                    )}
                  </div>

                  <button className="btn sm ghost" onClick={exportMonthlyCSV}>
                    <Icons.Download /> Export
                  </button>
                  <button className="btn sm" onClick={() => runReport(r.id)}>Run now</button>
                </div>
              </div>

              {/* Inline success banner — auto-hides after 3s */}
              {successIds.has(r.id) && (
                <div style={{
                  margin: '0 18px 12px',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--accent) 35%, transparent)',
                  color: 'var(--accent)',
                  fontSize: 12.5, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <Icons.Check style={{ width: 13, height: 13, flexShrink: 0 }} />
                  Report generated successfully
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
