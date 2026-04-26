'use client'
// Resolves the signed-in profile's role. Cached for the entire session
// (staleTime: Infinity) — the role doesn't change without a re-login,
// and a re-login remounts the SPA anyway.

import { useQuery } from '@tanstack/react-query'
import { createClient } from './supabase/client'

export type UserRole = 'ADMIN' | 'FINANCE_MANAGER' | 'AGENT' | null

async function loadRole(): Promise<UserRole> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  return ((profile?.role ?? null) as UserRole)
}

export function useUserRole(): UserRole {
  const { data } = useQuery({
    queryKey: ['user', 'role'],
    queryFn: loadRole,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 0,
  })
  return data ?? null
}
