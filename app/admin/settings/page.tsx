'use client'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icons } from '@/lib/icons'
import { api } from '@/lib/api'
import { useInviteTemplate, invalidate } from '@/lib/queries'

const DEFAULT_TEMPLATE = `<h2>Welcome to Delta Capital</h2>
<p>You've been invited. Click the button below to set your password and sign in.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>`

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const tplQ = useInviteTemplate()
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [toast,   setToast]   = useState<{ ok: boolean; text: string } | null>(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!tplQ.data) return
    setSubject(tplQ.data.subject || '')
    setContent(tplQ.data.content_html || '')
  }, [tplQ.data])

  const mgmtUnavailable = tplQ.error && (tplQ.error as Error).message.includes('EMAIL_TEMPLATE_TOKEN')

  const save = async () => {
    if (!content.includes('{{ .ConfirmationURL }}') && !content.includes('{{.ConfirmationURL}}')) {
      setToast({ ok: false, text: 'Template must contain {{ .ConfirmationURL }}' })
      return
    }
    setBusy(true)
    const r = await api.emailTemplates.updateInvite({ subject, content_html: content })
    setBusy(false)
    if (r.error) { setToast({ ok: false, text: r.error.message }); return }
    setToast({ ok: true, text: 'Invite template saved' })
    invalidate.inviteTemplate(qc)
  }

  return (
    <div className="page" style={{ padding: '20px 28px 80px', maxWidth: 900 }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1>Admin settings</h1>
          <p>Email templates and authentication policy</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Invite email template</h3>
        </div>
        <div className="card-body">
          {mgmtUnavailable ? (
            <div style={{
              background: 'var(--warn-soft)', border: '1px solid var(--warn-line)', color: 'var(--warn)',
              padding: 14, borderRadius: 8, fontSize: 13,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>In-app template editing not configured</div>
              <p style={{ margin: 0, color: 'var(--ink-2)' }}>
                Set <span className="mono">EMAIL_TEMPLATE_TOKEN</span> in the Next.js environment
                (<span className="mono">.env.local</span> for local dev, or Vercel project settings for production)
                to enable this. Until then, edit the invite template directly in the
                Supabase Dashboard → Authentication → Email Templates.
              </p>
            </div>
          ) : tplQ.isLoading ? (
            <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>Loading current template…</div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Subject</label>
                <input className="input" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--ink-3)' }}>Body (HTML)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn xs ghost" onClick={() => setContent(DEFAULT_TEMPLATE)}>Reset to default</button>
                    <button className="btn xs ghost" onClick={() => setPreview(!preview)}>
                      {preview ? 'Edit' : 'Preview'}
                    </button>
                  </div>
                </div>
                {preview ? (
                  <div
                    style={{
                      border: '1px solid var(--line)', borderRadius: 6, padding: 18,
                      background: '#f5f6f8', minHeight: 280, color: '#1a1c20',
                    }}
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <textarea
                    className="input mono"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={16}
                    style={{ width: '100%', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                  />
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
                  Available placeholders: <span className="mono">{'{{ .ConfirmationURL }}'}</span>,
                  {' '}<span className="mono">{'{{ .Email }}'}</span>,
                  {' '}<span className="mono">{'{{ .Data.name }}'}</span> (the name passed at invite time).
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn sm primary" disabled={busy} onClick={save}>
                  {busy ? 'Saving…' : 'Save template'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3>Invite link expiry</h3></div>
        <div className="card-body" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          <p>
            Magic-link expiry is configured at the Supabase project level (currently 1 hour). To change:
            edit <span className="mono">otp_expiry</span> in <span className="mono">supabase/config.toml</span>
            for local dev, and Supabase Dashboard → Authentication → Email for production.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Site URL (production)</h3></div>
        <div className="card-body" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          <p>
            Invite-email links use the project's <strong>Site URL</strong>. If your invite emails are linking
            to <span className="mono">localhost:3000</span>, fix that here:
            <br /><br />
            <a target="_blank" rel="noreferrer" href="https://supabase.com/dashboard/project/erfoydohkmtgnezpttqv/auth/url-configuration">
              Open Supabase URL Configuration <Icons.Link style={{ verticalAlign: 'middle' }} />
            </a>
          </p>
        </div>
      </div>

      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: toast.ok ? 'var(--pos)' : 'var(--neg)', color: 'white',
            padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)', zIndex: 100,
          }}
        >{toast.text}</div>
      )}
    </div>
  )
}
