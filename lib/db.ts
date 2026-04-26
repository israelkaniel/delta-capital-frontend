// Direct PostgREST reads — bypass Edge Functions for hot list/get paths.
//
// Why: every Edge Function call pays ~500-1000ms (Deno cold start +
// requireAuth round-trip). PostgREST is one warm process; the same query
// is ~400ms even cold. RLS policies on the schema (migration 002) already
// enforce role-based access (admin sees all, agent sees own).
//
// Mutations stay on the Edge Functions because they need validation,
// audit logging, the commission engine, and Auth admin APIs.

import { createClient } from './supabase/client'
import type {
  DbDeal, DbCommission, DbAgent, DbAccount, DbContact, DbFunder, DbPayment,
  DbCommissionReserve, DbDealAgent, DbGlobalRule, DbAgentRule,
} from './api'

const supabase = createClient()

// ─── helpers ────────────────────────────────────────────────────────────────
type Result<T> = { data: T | null; error: Error | null }

// The Supabase client's generated types are very specific (and don't match
// our hand-rolled DbX shapes exactly because of nested embeds). We trust the
// shape at runtime and cast at the boundary.
function wrap<T>(p: any): Promise<Result<T>> {
  return Promise.resolve(p).then(({ data, error }: any) => ({
    data: (data ?? null) as T | null,
    error: error ? new Error(error.message ?? String(error)) : null,
  }))
}

// ─── Deals ──────────────────────────────────────────────────────────────────
// List view denormalizes agent code+name so the page renders from a single
// round-trip — no parallel useAgentsList needed.
const dealListSelect = `
  id, status, transferred_amount, payback_amount,
  funds_transferred_at, external_id, created_at, updated_at,
  account_id, funder_id,
  accounts(id, name),
  funders(id, name),
  deal_agents(id, agent_id, share, agents(id, code, profiles:user_id(name)))
`

const dealDetailSelect = `
  *,
  accounts(*, contacts(*)),
  funders(*),
  deal_agents(*, agents(*, profiles:user_id(name)), commissions(*)),
  creator:created_by(id, name),
  updater:updated_by(id, name)
`

export const dbDeals = {
  list: () => wrap<DbDeal[]>(
    supabase.from('deals').select(dealListSelect).order('created_at', { ascending: false }),
  ),
  get: (id: string) =>
    wrap<DbDeal>(
      supabase.from('deals').select(dealDetailSelect).eq('id', id).single(),
    ).then(res => {
      // Match the Edge Function's response shape: flatten commissions from deal_agents
      if (res.data) {
        const d = res.data as any
        d.commissions = (d.deal_agents ?? []).flatMap(
          (da: any) => (da.commissions ?? []).map((c: any) => ({ ...c, deal_agents: da })),
        )
      }
      return res
    }),
}

// ─── Commissions ───────────────────────────────────────────────────────────
// List view denormalizes agent name + client name so the page renders from a
// single round-trip — no parallel useAgentsList needed.
const commissionListSelect = `
  id, deal_agent_id, calculated_at, base_amount, rate,
  total_amount, released_amount, reserved_amount, reversed_amount, status,
  deal_agents(
    id, share, agent_id,
    agents(id, code, profiles:user_id(name)),
    deals(id, status, accounts(name))
  )
`

const commissionDetailSelect = `
  *,
  commission_reserves(*, profiles!created_by(name)),
  deal_agents(
    id, share, agent_id,
    agents(id, code, profiles:user_id(name)),
    deals(
      id, transferred_amount, payback_amount, status, funds_transferred_at, notes,
      accounts(id, name),
      funders(id, name, commission_base)
    )
  )
`

export const dbCommissions = {
  list: (params?: { status?: string; agent_id?: string; period?: string }) => {
    let q = supabase.from('commissions').select(commissionListSelect)
      .order('calculated_at', { ascending: false })
    if (params?.status) q = q.eq('status', params.status)
    if (params?.agent_id) q = q.eq('deal_agents.agent_id', params.agent_id)
    if (params?.period) {
      const [y, m] = params.period.split('-')
      const start = `${y}-${m}-01`
      const end = new Date(Number(y), Number(m), 0).toISOString().split('T')[0]
      q = q.gte('calculated_at', start).lte('calculated_at', end + 'T23:59:59Z')
    }
    return wrap<DbCommission[]>(q)
  },
  get: (id: string) =>
    wrap<DbCommission>(supabase.from('commissions').select(commissionDetailSelect).eq('id', id).single()),
}

// ─── Agents ────────────────────────────────────────────────────────────────
export const dbAgents = {
  list: () => wrap<DbAgent[]>(
    supabase.from('agents')
      .select('*, profiles:user_id(id, name, email, role, is_active)')
      .order('created_at', { ascending: false }),
  ),
  get: (id: string) => wrap<DbAgent>(
    supabase.from('agents').select('*, profiles:user_id(id, name, email, role)').eq('id', id).single(),
  ),
}

// ─── Accounts (Clients) ────────────────────────────────────────────────────
type DbAccountWith = DbAccount & { contacts?: DbContact[]; deals?: DbDeal[] }
export const dbAccounts = {
  list: (params?: { q?: string }) => {
    let q = supabase.from('accounts')
      .select('*, contacts(id, name, email, phone), deals(id, status, transferred_amount)')
      .order('name')
    if (params?.q) q = q.ilike('name', `%${params.q}%`)
    return wrap<DbAccountWith[]>(q)
  },
  get: (id: string) => wrap<DbAccountWith>(
    supabase.from('accounts').select(`
      *,
      contacts(*),
      deals(
        id, status, transferred_amount, payback_amount, funds_transferred_at,
        funders(id, name),
        deal_agents(share, agents(code, profiles:user_id(name)))
      )
    `).eq('id', id).single(),
  ),
}

// ─── Funders ───────────────────────────────────────────────────────────────
export const dbFunders = {
  list: () => wrap<DbFunder[]>(
    supabase.from('funders').select('*').order('name'),
  ),
  get: (id: string) => wrap<DbFunder>(
    supabase.from('funders').select('*').eq('id', id).single(),
  ),
}

// ─── Payments ──────────────────────────────────────────────────────────────
export const dbPayments = {
  list: (params?: { agent_id?: string }) => {
    let q = supabase.from('payments')
      .select('*, agents(*, profiles:user_id(name))')
      .order('payment_date', { ascending: false })
    if (params?.agent_id) q = q.eq('agent_id', params.agent_id)
    return wrap<DbPayment[]>(q)
  },
}

// ─── Rules ─────────────────────────────────────────────────────────────────
export const dbRules = {
  globalList: (params?: { funder_id?: string }) => {
    let q = supabase.from('global_commission_rules')
      .select('*, commission_tiers(*), funders(id, name)')
      .order('valid_from', { ascending: false })
    if (params?.funder_id) q = q.eq('funder_id', params.funder_id)
    return wrap<DbGlobalRule[]>(q)
  },
  agentList: (params?: { agent_id?: string; funder_id?: string }) => {
    let q = supabase.from('agent_commission_rules')
      .select('*, agent_commission_tiers(*), agents(code, profiles:user_id(name)), funders(id, name)')
      .order('valid_from', { ascending: false })
    if (params?.agent_id) q = q.eq('agent_id', params.agent_id)
    if (params?.funder_id) q = q.eq('funder_id', params.funder_id)
    return wrap<DbAgentRule[]>(q)
  },
}

// ─── Page-level RPCs (one round-trip per page) ─────────────────────────────
export interface DashboardSummary {
  kpis:         { funded_count: number; pending_count: number; funded_volume: number }
  recent_deals: any[]
  by_funder:    { id: string; name: string; value: number }[]
  top_agents:   { agent_id: string; agent_code: string | null; agent_name: string; total_deals: number; total_commissions: number }[]
  monthly:      { month: string; earned: number; volume: number }[]
}
export interface PayoutSummary {
  agents: {
    id: string; code: string | null; is_active: boolean; name: string; email: string | null
    total_commissions: number; reserved_amount_raw: number; reversed_amount: number; paid_amount: number
  }[]
  payments: { id: string; agent_id: string; amount: number; payment_date: string; reference: string | null; agent_name: string }[]
}

export const dbRpc = {
  dashboardSummary: () => wrap<DashboardSummary>(supabase.rpc('dashboard_summary')),
  payoutSummary:    () => wrap<PayoutSummary>(supabase.rpc('payout_summary')),
}

// ─── Notes (deal_notes) ────────────────────────────────────────────────────
import type { DbDealNote } from './api'
export const dbNotes = {
  list: (dealId: string) => wrap<DbDealNote[]>(
    supabase.from('deal_notes')
      .select('*, profiles:created_by(name)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false }),
  ),
}

// ─── Ledger ────────────────────────────────────────────────────────────────
type LedgerEntry = { agent_id: string; type: string; amount: number; created_at: string }
export const dbLedger = {
  rawEntries: (agentId: string) => wrap<LedgerEntry[]>(
    supabase.from('ledger_entries')
      .select('*, commissions(total_amount, status), payments(reference)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false }),
  ),
}

export type { DbDeal, DbCommission, DbAgent, DbAccount, DbContact, DbFunder, DbPayment, DbCommissionReserve, DbDealAgent, DbGlobalRule, DbAgentRule }
