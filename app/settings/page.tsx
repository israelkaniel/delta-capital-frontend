'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { useShell } from '@/components/shell/shell-provider'
import { createClient } from '@/lib/supabase/client'

const ACCENT_HUES = [
  { label: 'Emerald', hue: 150 }, { label: 'Indigo', hue: 268 },
  { label: 'Rose', hue: 0 }, { label: 'Amber', hue: 45 },
  { label: 'Sky', hue: 210 }, { label: 'Violet', hue: 290 },
]

const STORAGE_KEY = 'delta-settings'

type MeProfile = { id: string; name: string | null; email: string; role: string | null }

async function loadMe(): Promise<MeProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('name, role').eq('id', user.id).maybeSingle()
  return {
    id: user.id,
    name: profile?.name ?? null,
    email: user.email ?? '',
    role: profile?.role ?? null,
  }
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  FINANCE_MANAGER: 'Finance Manager',
  AGENT: 'Agent',
}

type Tab = 'account' | 'security' | 'appearance'

export default function SettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { tweaks, updateTweaks: setTweaks } = useShell()

  const meQ = useQuery({ queryKey: ['user', 'me-settings'], queryFn: loadMe, staleTime: Infinity })
  const me = meQ.data
  const isAdmin = me?.role === 'ADMIN'

  const [tab, setTab] = useState<Tab>('account')
  const [hydrated, setHydrated] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        const shellKeys = ['theme', 'density', 'accentHue', 'sidebar'] as const
        const shellPatch: Partial<typeof tweaks> = {}
        shellKeys.forEach(k => {
          if (saved[k] !== undefined) (shellPatch as Record<string, unknown>)[k] = saved[k]
        })
        if (Object.keys(shellPatch).length > 0) setTweaks({ ...tweaks, ...shellPatch })
      }
    } catch {}
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: tweaks.theme, density: tweaks.density,
        accentHue: tweaks.accentHue, sidebar: tweaks.sidebar,
      }))
    } catch {}
  }, [hydrated, tweaks.theme, tweaks.density, tweaks.accentHue, tweaks.sidebar])


  const startEditName = () => {
    setNameDraft(me?.name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    if (!me) return
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === me.name) { setEditingName(false); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('id', me.id)
    setSaving(false)
    if (error) { alert(`Couldn't save name: ${error.message}`); return }
    setEditingName(false)
    qc.invalidateQueries({ queryKey: ['user', 'me-settings'] })
  }

  const changePassword = async () => {
    if (pw.length < 8) {
      setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' })
      return
    }
    setPwBusy(true); setPwMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) { setPwMsg({ ok: false, text: error.message }); return }
    setPwMsg({ ok: true, text: 'Password updated.' })
    setPw('')
    setTimeout(() => { setPwOpen(false); setPwMsg(null) }, 1500)
  }

  const signOut = async () => {
    if (!confirm('Sign out of Delta Capital?')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const TABS: { id: Tab; label: string; show: boolean }[] = [
    { id: 'account',    label: 'Account',    show: true },
    { id: 'security',   label: 'Security',   show: true },
    { id: 'appearance', label: 'Appearance', show: true },
  ]

  return (
    <div className="page" style={{ padding: '20px 28px 80px', maxWidth: 720 }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1>Settings</h1>
          <p>Account, security, appearance</p>
        </div>
        {isAdmin && (
          <Link href="/admin/users" className="btn sm">
            <Icons.People /> Manage users
          </Link>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.filter(t => t.show).map(t => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head"><h3>Account</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {meQ.isLoading || !me ? (
              <div style={{ padding: '20px 0', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
            ) : (
              <>
                <SettingRow label="Display name">
                  {editingName ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        className="input"
                        autoFocus
                        value={nameDraft}
                        onChange={e => setNameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                        style={{ width: 220 }}
                      />
                      <button className="btn sm primary" onClick={saveName} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn sm ghost" onClick={() => setEditingName(false)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{me.name ?? <span style={{ color: 'var(--ink-4)' }}>Not set</span>}</span>
                      <button className="btn sm ghost" onClick={startEditName}>
                        <Icons.Edit style={{ width: 12, height: 12 }} /> Edit
                      </button>
                    </>
                  )}
                </SettingRow>
                <SettingRow label="Email">
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{me.email}</span>
                </SettingRow>
                <SettingRow label="Role">
                  <span className="chip">{me.role ? (ROLE_LABEL[me.role] ?? me.role) : '—'}</span>
                </SettingRow>
                <SettingRow label="User ID" last>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{me.id.slice(0, 8)}</span>
                </SettingRow>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head"><h3>Security</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SettingRow label="Password">
              <button className="btn sm" onClick={() => { setPwOpen(true); setPwMsg(null); setPw('') }}>
                Change password
              </button>
            </SettingRow>
            <SettingRow label="Session" last>
              <button className="btn sm" onClick={signOut}>Sign out</button>
            </SettingRow>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
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
      )}

      {pwOpen && (
        <div className="modal-overlay open" onClick={() => !pwBusy && setPwOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span>Change password</span>
              <button className="close-btn" onClick={() => !pwBusy && setPwOpen(false)} aria-label="Close"><Icons.X /></button>
            </div>
            <div className="modal-body" style={{ minWidth: 360 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>New password</label>
              <input
                className="input"
                type="password"
                autoFocus
                placeholder="At least 8 characters"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') changePassword() }}
                style={{ width: '100%' }}
              />
              {pwMsg && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                  background: pwMsg.ok ? 'var(--pos-soft)' : 'var(--neg-soft)',
                  color: pwMsg.ok ? 'var(--pos)' : 'var(--neg)',
                }}>{pwMsg.text}</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn sm" onClick={() => setPwOpen(false)} disabled={pwBusy}>Cancel</button>
                <button className="btn sm primary" onClick={changePassword} disabled={pwBusy}>
                  {pwBusy ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}
