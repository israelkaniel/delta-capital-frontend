'use client'
// Centralized TanStack Query setup. One QueryClient per browser tab.
//
// Defaults are tuned for an internal-tool feel:
//  - staleTime 30s → navigations within half a minute serve from cache instantly
//  - gcTime 5min  → user can wander away and come back without refetch
//  - retry 1      → don't hammer Supabase on a transient blip
//  - refetchOnWindowFocus false → no surprise refetches when alt-tabbing
//  - refetchOnMount 'always' overridable per-query via { staleTime } on the query

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  // Lazy init so the client is per-instance (avoids stale state across tabs in dev)
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: 0 },
    },
  }))

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
