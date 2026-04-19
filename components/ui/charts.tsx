'use client'
import { useRef, useState } from 'react'
import { fmt } from '@/lib/fmt'

type Pt = Record<string, number | string>

export function AreaChart({
  data, height = 220, color = 'var(--accent)',
  xKey = 'x', yKey = 'y', fmtFn = fmt.moneyK,
}: {
  data: Pt[]; height?: number; color?: string;
  xKey?: string; yKey?: string; fmtFn?: (n: number) => string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const W = 600, H = height
  const pad = { l: 44, r: 12, t: 12, b: 26 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b

  const vals = data.map(d => d[yKey] as number)
  const yMax = Math.max(...vals) * 1.12
  const x = (i: number) => pad.l + (i / (data.length - 1)) * iw
  const y = (v: number) => pad.t + ih - (v / yMax) * ih

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[yKey] as number)}`).join(' ')
  const areaPath = `${linePath} L ${x(data.length - 1)} ${pad.t + ih} L ${x(0)} ${pad.t + ih} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => yMax * t)

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.round(((px - pad.l) / iw) * (data.length - 1))
    if (idx >= 0 && idx < data.length) setHover(idx)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((g, i) => (
          <g key={i}>
            <line className="chart-grid-bg" x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} />
            <text className="chart-axis" x={pad.l - 8} y={y(g) + 3} textAnchor="end">{fmtFn(g)}</text>
          </g>
        ))}
        <path d={areaPath} fill="url(#ag)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <text key={i} className="chart-axis" x={x(i)} y={H - 8} textAnchor="middle">{d[xKey] as string}</text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover][yKey] as number)} r="5" fill={color} stroke="var(--bg-elev)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div style={{
          position: 'absolute', left: `${(x(hover) / W) * 100}%`, top: 0,
          transform: 'translateX(-50%) translateY(-8px)',
          background: 'var(--ink)', color: 'var(--bg)',
          padding: '6px 10px', borderRadius: 6, fontSize: 11.5,
          pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ opacity: 0.6, fontSize: 10 }}>{data[hover][xKey] as string}</div>
          <div className="mono" style={{ fontWeight: 500 }}>{fmtFn(data[hover][yKey] as number)}</div>
        </div>
      )}
    </div>
  )
}

export function BarChart({
  data, height = 200, colors = ['var(--accent)', 'var(--ink-4)'],
  series = ['a', 'b'], labels = { a: 'A', b: 'B' }, xKey = 'x',
  fmtFn = fmt.moneyK,
}: {
  data: Pt[]; height?: number; colors?: string[];
  series?: string[]; labels?: Record<string, string>; xKey?: string;
  fmtFn?: (n: number) => string
}) {
  const W = 600, H = height
  const pad = { l: 44, r: 12, t: 12, b: 26 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const yMax = Math.max(...data.flatMap(d => series.map(s => d[s] as number))) * 1.15
  const groupW = iw / data.length
  const barW = Math.min(24, (groupW - 10) / series.length)
  const y = (v: number) => pad.t + ih - (v / yMax) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => yMax * t)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
        {ticks.map((g, i) => (
          <g key={i}>
            <line className="chart-grid-bg" x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} />
            <text className="chart-axis" x={pad.l - 8} y={y(g) + 3} textAnchor="end">{fmtFn(g)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + groupW * i + groupW / 2
          return (
            <g key={i}>
              {series.map((s, si) => {
                const val = d[s] as number
                const h = ih - (y(val) - pad.t)
                const bx = cx - (series.length * barW) / 2 + si * barW + 1
                return <rect key={s} x={bx} y={y(val)} width={barW - 2} height={h} fill={colors[si]} rx="2" />
              })}
              <text className="chart-axis" x={cx} y={H - 8} textAnchor="middle">{d[xKey] as string}</text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 4, fontSize: 11.5, color: 'var(--ink-3)' }}>
        {series.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: colors[i], borderRadius: 2 }} />
            {labels[s]}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Donut({
  segments, size = 150, innerRatio = 0.62, center,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number; innerRatio?: number; center?: React.ReactNode
}) {
  const r = size / 2
  const innerR = r * innerRatio
  const total = segments.reduce((a, s) => a + s.value, 0)
  let acc = 0
  const arcs = segments.map(s => {
    const start = (acc / total) * Math.PI * 2
    acc += s.value
    const end = (acc / total) * Math.PI * 2
    const sx = r + Math.sin(start) * r, sy = r - Math.cos(start) * r
    const ex = r + Math.sin(end) * r,   ey = r - Math.cos(end) * r
    const sxi = r + Math.sin(start) * innerR, syi = r - Math.cos(start) * innerR
    const exi = r + Math.sin(end) * innerR,   eyi = r - Math.cos(end) * innerR
    const large = end - start > Math.PI ? 1 : 0
    const d = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} L ${exi} ${eyi} A ${innerR} ${innerR} 0 ${large} 0 ${sxi} ${syi} Z`
    return { d, color: s.color }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
      {center && (
        <foreignObject x={innerR * 0.2} y={r - 22} width={size - innerR * 0.4} height={44}>
          <div style={{ textAlign: 'center', color: 'var(--ink)' }}>{center}</div>
        </foreignObject>
      )}
    </svg>
  )
}

export function Sparkline({
  data, width = 80, height = 28, color = 'var(--accent)',
}: { data: number[]; width?: number; height?: number; color?: string }) {
  const yMax = Math.max(...data) * 1.05
  const yMin = Math.min(...data) * 0.95
  const x = (i: number) => (i / (data.length - 1)) * width
  const y = (v: number) => height - ((v - yMin) / (yMax - yMin)) * height
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')
  const area = `${path} L ${x(data.length - 1)} ${height} L ${x(0)} ${height} Z`
  const gid = 'sp' + Math.random().toString(36).slice(2, 7)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
