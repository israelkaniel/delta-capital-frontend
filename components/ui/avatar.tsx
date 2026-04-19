import { fmt } from '@/lib/fmt'

type Size = 'sm' | 'md' | 'lg' | 'default'

export function Avatar({ name, hue, size = 'default' }: { name?: string; hue?: number; size?: Size }) {
  const h = hue ?? (name ? (name.charCodeAt(0) * 7) % 360 : 200)
  const bg = `linear-gradient(135deg, oklch(0.62 0.17 ${h}) 0%, oklch(0.52 0.2 ${h + 30}) 100%)`
  return (
    <span className={`avatar${size !== 'default' ? ' ' + size : ''}`} style={{ background: bg }}>
      {fmt.initials(name)}
    </span>
  )
}

export function AvatarStack({ items, max = 3 }: { items: Array<{ name?: string; hue?: number }>; max?: number }) {
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <span className="a-stack">
      {shown.map((a, i) => <Avatar key={i} name={a.name} hue={a.hue} size="sm" />)}
      {rest > 0 && (
        <span className="avatar sm" style={{ background: 'var(--ink-3)', color: 'var(--bg)' }}>+{rest}</span>
      )}
    </span>
  )
}
