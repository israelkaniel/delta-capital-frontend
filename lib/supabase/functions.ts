import { createClient } from './client'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface InvokeOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | undefined>
}

export async function invokeFunction<T = unknown>(
  name: string,
  options: InvokeOptions = {},
): Promise<{ data: T | null; error: Error | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return { data: null, error: new Error('Not authenticated') }
  }

  const url = new URL(`${SUPABASE_URL}/functions/v1/${name}`)
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v)
    })
  }

  const res = await fetch(url.toString(), {
    method:  options.method ?? 'GET',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey':        SUPABASE_ANON,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: new Error(json?.error ?? `HTTP ${res.status}`) }
  return { data: json as T, error: null }
}
