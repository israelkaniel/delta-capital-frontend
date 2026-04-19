'use client'
import { useShell } from '@/components/shell/shell-provider'

const hues = [
  { h: 268, name: 'Violet' }, { h: 20,  name: 'Copper' },
  { h: 150, name: 'Forest' }, { h: 220, name: 'Indigo' },
  { h: 330, name: 'Rose'   }, { h: 60,  name: 'Amber'  },
]

export function TweaksPanel() {
  const { tweaksOpen, setTweaksOpen, tweaks, updateTweaks } = useShell()

  return (
    <div className={`tweaks-panel ${tweaksOpen ? 'open' : ''}`}>
      <div className="tw-head">
        <h4>Tweaks</h4>
        <button className="close" onClick={() => setTweaksOpen(false)}>×</button>
      </div>
      <div className="tw-body">
        <div className="tw-row">
          <div className="l">Accent</div>
          <div className="tw-hues">
            {hues.map(h => (
              <div key={h.h}
                className={`tw-hue ${tweaks.accentHue === h.h ? 'on' : ''}`}
                title={h.name}
                style={{ background: `oklch(0.6 0.2 ${h.h})` }}
                onClick={() => updateTweaks({ accentHue: h.h })}
              />
            ))}
          </div>
        </div>
        <div className="tw-row">
          <div className="l">Theme</div>
          <div className="seg">
            <button className={tweaks.theme === 'light' ? 'active' : ''} onClick={() => updateTweaks({ theme: 'light' })}>Light</button>
            <button className={tweaks.theme === 'dark'  ? 'active' : ''} onClick={() => updateTweaks({ theme: 'dark' })}>Dark</button>
          </div>
        </div>
        <div className="tw-row">
          <div className="l">Density</div>
          <div className="seg">
            <button className={tweaks.density === 'compact'     ? 'active' : ''} onClick={() => updateTweaks({ density: 'compact' })}>Compact</button>
            <button className={tweaks.density === 'default'     ? 'active' : ''} onClick={() => updateTweaks({ density: 'default' })}>Default</button>
            <button className={tweaks.density === 'comfortable' ? 'active' : ''} onClick={() => updateTweaks({ density: 'comfortable' })}>Cozy</button>
          </div>
        </div>
        <div className="tw-row">
          <div className="l">Sidebar</div>
          <div className="seg">
            <button className={tweaks.sidebar === 'full'  ? 'active' : ''} onClick={() => updateTweaks({ sidebar: 'full' })}>Full</button>
            <button className={tweaks.sidebar === 'icons' ? 'active' : ''} onClick={() => updateTweaks({ sidebar: 'icons' })}>Icons</button>
          </div>
        </div>
      </div>
    </div>
  )
}
