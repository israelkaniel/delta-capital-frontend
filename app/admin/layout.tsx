'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role, is_active').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (profile?.role === 'ADMIN' && profile.is_active) {
        setState('allowed')
      } else {
        setState('denied')
        router.replace('/dashboard')
      }
    })
    return () => { cancelled = true }
  }, [router])

  if (state === 'checking') {
    return <div style={{ padding: 40, color: 'var(--ink-4)', fontSize: 13 }}>Checking access…</div>
  }
  if (state !== 'allowed') return null

  return <>{children}</>
}
