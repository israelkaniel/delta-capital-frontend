'use client'
import { fmt } from '@/lib/fmt'

export type TimelineRowAccent = 'pos' | 'neg' | 'accent' | 'warn' | 'default'

export function TimelineRow({
  last, accent, Icon, title, ts, author, body,
}: {
  last: boolean
  accent: TimelineRowAccent
  Icon: React.FC<React.SVGProps<SVGSVGElement>>
  title: string
  ts: string
  author?: string
  body?: string
}) {
  const bg = {
    pos:     'var(--pos)',
    neg:     'var(--neg)',
    accent:  'var(--accent)',
    warn:    'var(--warn)',
    default: 'var(--bg-sunk)',
  }[accent]
  const fg = accent === 'default' ? 'var(--ink-3)' : '#fff'

  return (
    <div style={{ padding: '14px 18px', borderBottom: last ? 'none' : '1px solid var(--line)', display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: bg, color: fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 12, height: 12 }} />
        </div>
        {!last && <div style={{ width: 1, flex: 1, background: 'var(--line)', minHeight: 16 }} />}
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{fmt.dateTime(ts)}</span>
          {author && <><span>·</span><span>{author}</span></>}
        </div>
        {body && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{body}</p>
        )}
      </div>
    </div>
  )
}
