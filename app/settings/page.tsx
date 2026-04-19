'use client'
import { useState } from 'react'
import { Icons } from '@/lib/icons'
import { useShell } from '@/components/shell/shell-provider'

const ACCENT_HUES = [
  { label: 'Emerald', hue: 150 }, { label: 'Indigo', hue: 268 },
  { label: 'Rose', hue: 0 }, { label: 'Amber', hue: 45 },
  { label: 'Sky', hue: 210 }, { label: 'Violet', hue: 290 },
]

export default function SettingsPage() {
  const { tweaks, updateTweaks: setTweaks } = useShell()

  return (
    <div className="page" style={{ padding: '20px 28px 80px', maxWidth: 720 }}>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <h1>Settings</h1>
          <p>Appearance, preferences, and account</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3>Appearance</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--ink-2)' }}>Theme</div>
            <div className="seg">
              {(['light', 'dark'] as const).map(t => (
                <button key={t} className={tweaks.theme === t ? 'active' : ''} onClick={() => setTweaks({ ...tweaks, theme: t })}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--ink-2)' }}>Density</div>
            <div className="seg">
              {(['compact', 'default', 'comfortable'] as const).map(d => (
                <button key={d} className={tweaks.density === d ? 'active' : ''} onClick={() => setTweaks({ ...tweaks, density: d })}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--ink-2)' }}>Accent color</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_HUES.map(a => (
                <button
                  key={a.hue}
                  onClick={() => setTweaks({ ...tweaks, accentHue: a.hue })}
                  title={a.label}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `oklch(0.55 0.22 ${a.hue})`,
                    border: tweaks.accentHue === a.hue ? '2px solid var(--ink-1)' : '2px solid transparent',
                    cursor: 'pointer', outline: 'none', padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--ink-2)' }}>Sidebar</div>
            <div className="seg">
              {(['full', 'icons'] as const).map(s => (
                <button key={s} className={tweaks.sidebar === s ? 'active' : ''} onClick={() => setTweaks({ ...tweaks, sidebar: s })}>
                  {s === 'full' ? 'Full labels' : 'Icons only'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3>Account</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Full name', val: 'Noam Harel' },
            { label: 'Email', val: 'noam@delta.cap' },
            { label: 'Role', val: 'Senior Agent / Admin' },
            { label: 'Organization', val: 'Delta Capital' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{f.val}</div>
              </div>
              <button className="btn sm ghost">Edit</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Notifications</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Commission approved', desc: 'Notify when a commission is approved' },
            { label: 'Deal status change', desc: 'Notify when a deal moves stages' },
            { label: 'Payout ready', desc: 'Notify when a payout file is generated' },
            { label: 'Weekly digest', desc: 'Summary email every Monday morning' },
          ].map((n, i, arr) => (
            <div key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{n.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{n.desc}</div>
              </div>
              <label style={{ cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ display: 'none' }} />
                <div style={{ width: 32, height: 18, borderRadius: 9, background: 'var(--accent)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 3, left: 16, width: 12, height: 12, borderRadius: '50%', background: '#fff' }} />
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
