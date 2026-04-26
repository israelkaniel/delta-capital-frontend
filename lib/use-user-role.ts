'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

export type UserRole = 'ADMIN' | 'FINANCE_MANAGER' | 'AGENT' | null

let cached: UserRole = null
const subscribers = new Set<(r: UserRole) => void>()

async function load(): Promise<UserRole> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile?.role ?? null) as UserRole
  cached = role
  subscribers.forEach(s => s(role))
  return role
}

export function useUserRole(): UserRole {
  const [role, setRole] = useState<UserRole>(cached)

  useEffect(() => {
    if (cached !== null) {
      setRole(cached)
    } else {
      load().then(setRole)
    }
    subscribers.add(setRole)
    return () => { subscribers.delete(setRole) }
  }, [])

  return role
}
