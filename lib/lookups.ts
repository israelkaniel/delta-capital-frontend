// Module-level cache for lookup tables (agents / funders / accounts) used by
// many modals. Each modal previously called `api.X.list()` on every open,
// which pounded the Edge Functions and blocked first-paint of the form.
// Cache TTL = 60s. Mutations should call `invalidate()` to force a refetch.
//
// Reads use the direct DB layer (RLS-protected PostgREST), bypassing the
// Edge Function cold-start tax.

import { dbAgents, dbFunders, dbAccounts } from './db'
import type { DbAgent, DbFunder, DbAccount } from './api'

const TTL_MS = 60_000

type Entry<T> = { promise: Promise<T>; expires: number }

const cache: {
  agents?: Entry<DbAgent[]>
  funders?: Entry<DbFunder[]>
  accounts?: Entry<DbAccount[]>
} = {}

function fresh<T>(loader: () => Promise<T>): Entry<T> {
  return { promise: loader(), expires: Date.now() + TTL_MS }
}

export async function getAgents(): Promise<DbAgent[]> {
  const e = cache.agents
  if (!e || e.expires <= Date.now()) {
    cache.agents = fresh(async () => (await dbAgents.list()).data ?? [])
  }
  return cache.agents!.promise
}

export async function getActiveAgents(): Promise<DbAgent[]> {
  return (await getAgents()).filter(a => a.is_active)
}

export async function getFunders(): Promise<DbFunder[]> {
  const e = cache.funders
  if (!e || e.expires <= Date.now()) {
    cache.funders = fresh(async () => (await dbFunders.list()).data ?? [])
  }
  return cache.funders!.promise
}

export async function getActiveFunders(): Promise<DbFunder[]> {
  return (await getFunders()).filter(f => f.is_active)
}

export async function getAccounts(): Promise<DbAccount[]> {
  const e = cache.accounts
  if (!e || e.expires <= Date.now()) {
    cache.accounts = fresh(async () => (await dbAccounts.list()).data ?? [])
  }
  return cache.accounts!.promise
}

export function invalidate(...keys: Array<'agents' | 'funders' | 'accounts'>) {
  for (const k of keys) delete cache[k]
}

export function invalidateAll() {
  delete cache.agents; delete cache.funders; delete cache.accounts
}
