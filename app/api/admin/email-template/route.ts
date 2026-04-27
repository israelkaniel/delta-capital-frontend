// Next.js Route Handler for the invite-email template editor.
//
// Why this lives in Next instead of a Supabase Edge Function:
// the equivalent edge function (supabase/functions/email-templates) gets
// rejected by Supabase's gateway with "JWT could not be decoded" before
// the function body even runs — appears to be a platform quirk specific
// to this function name/path. Until that's resolved on the Supabase side,
// we proxy through Next: server-side session check + Management API call.
//
// PAT lives in EMAIL_TEMPLATE_TOKEN env var on the server.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MGMT_API = 'https://api.supabase.com/v1'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('profiles').select('role, is_active').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'ADMIN' || !profile.is_active) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, userId: user.id }
}

function getProjectRefAndToken() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = url.match(/^https?:\/\/([^.]+)\.supabase\.co/)?.[1]
  const token = process.env.EMAIL_TEMPLATE_TOKEN ?? process.env.PAT_TOKEN
  return { projectRef, token }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { projectRef, token } = getProjectRefAndToken()
  if (!projectRef || !token) {
    return NextResponse.json({
      error: 'Email-template editing requires the EMAIL_TEMPLATE_TOKEN env var.',
      hint:  'Set it in Vercel project settings (or .env.local for local dev).',
    }, { status: 503 })
  }

  const r = await fetch(`${MGMT_API}/projects/${projectRef}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
    cache:   'no-store',
  })
  const cfg = await r.json()
  if (!r.ok) return NextResponse.json({ error: cfg?.message ?? 'Failed to load config' }, { status: r.status })

  return NextResponse.json({
    subject:      cfg.mailer_subjects_invite ?? '',
    content_html: cfg.mailer_templates_invite_content ?? '',
  })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { projectRef, token } = getProjectRefAndToken()
  if (!projectRef || !token) {
    return NextResponse.json({ error: 'EMAIL_TEMPLATE_TOKEN not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const { subject, content_html } = body as { subject?: string; content_html?: string }
  if (typeof subject !== 'string' || typeof content_html !== 'string') {
    return NextResponse.json({ error: 'subject and content_html are required strings' }, { status: 400 })
  }
  if (!content_html.includes('{{ .ConfirmationURL }}') && !content_html.includes('{{.ConfirmationURL}}')) {
    return NextResponse.json({ error: 'Template must include {{ .ConfirmationURL }}' }, { status: 400 })
  }

  const r = await fetch(`${MGMT_API}/projects/${projectRef}/config/auth`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      mailer_subjects_invite:           subject,
      mailer_templates_invite_content:  content_html,
    }),
  })
  const data = await r.json()
  if (!r.ok) return NextResponse.json({ error: data?.message ?? 'Failed to update template' }, { status: r.status })

  // Audit log via the same supabase client (already authenticated as the admin)
  await auth.supabase.from('audit_logs').insert({
    entity:    'email_template',
    entity_id: '00000000-0000-0000-0000-000000000000',
    action:    'UPDATE_INVITE_TEMPLATE',
    new_value: { subject, content_html },
    user_id:   auth.userId,
  })

  return NextResponse.json({ ok: true })
}
