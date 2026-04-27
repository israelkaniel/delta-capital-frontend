// Direct PostgREST reads — bypass Edge Functions for hot list/get paths.
//
// Every list endpoint accepts `{ page, page_size }` (default 100) and returns
// a `Paginated<T> = { rows, total, page, page_size }` envelope. Filters
// (status, agent_id, q, etc.) are applied server-side; no client-side slicing.
//
// Mutations stay on the Edge Functions because they need validation,
// audit logging, the commission engine, and Auth admin APIs.

import { createClient } from './supabase/client'
import type {
  DbDeal, DbCommission, DbAgent, DbAccount, DbContact, DbFunder, DbPayment,
  DbCommissionReserve, DbDealAgent, DbGlobalRule, DbAgentRule, DbEmailLog,
  DbAuditLog, UsersAdminSummary, AuditAdminSummary,
} from './api'
import { type Paginated, type PageParams, DEFAULT_PAGE_SIZE, rangeFor } from './pagination'

const supabase = createClient()

// ─── helpers ────────────────────────────────────────────────────────────────
type Result<T> = { data: T | null; error: Error | null }
type PaginatedResult<T> = { data: Paginated<T> | null; error: Error | null }

function wrap<T>(p: any): Promise<Result<T>> {
  return Promise.resolve(p).then(({ data, error }: any) => ({
    data: (data ?? null) as T | null,
    error: error ? new Error(error.message ?? String(error)) : null,
  }))
}

/** PostgREST select with `count: 'exact'` and `.range(from, to)`. */
function paginate<T>(
  builder: any,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedResult<T>> {
  const { from, to } = rangeFor(page, pageSize)
  return Promise.resolve(builder.range(from, to)).then(({ data, count, error }: any) => ({
    data: error ? null : { rows: (data ?? []) as T[], total: count ?? 0, page, page_size: pageSize },
    error: error ? new Error(error.message ?? String(error)) : null,
  }))
}

// ─── Deals ──────────────────────────────────────────────────────────────────
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

export interface DealsListParams extends PageParams {
  status?:    string
  agent_id?:  string
  q?:         string
}

export const dbDeals = {
  list: (params: DealsListParams = {}) => {
    let q = supabase.from('deals')
      .select(dealListSelect, { count: 'exact' })
      .order('created_at', { ascending: false })
    if (params.status)   q = q.eq('status', params.status)
    if (params.agent_id) q = q.eq('deal_agents.agent_id', params.agent_id)
    if (params.q)        q = q.or(`external_id.ilike.%${params.q}%`)
    return paginate<DbDeal>(q, params.page, params.page_size)
  },
  get: (id: string) =>
    wrap<DbDeal>(
      supabase.from('deals').select(dealDetailSelect).eq('id', id).single(),
    ).then(res => {
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

export interface CommissionsListParams extends PageParams {
  status?:   string
  agent_id?: string
  period?:   string
}

export const dbCommissions = {
  list: (params: CommissionsListParams = {}) => {
    let q = supabase.from('commissions')
      .select(commissionListSelect, { count: 'exact' })
      .order('calculated_at', { ascending: false })
    if (params.status) q = q.eq('status', params.status)
    if (params.agent_id) q = q.eq('deal_agents.agent_id', params.agent_id)
    if (params.period) {
      const [y, m] = params.period.split('-')
      const start = `${y}-${m}-01`
      const end = new Date(Number(y), Number(m), 0).toISOString().split('T')[0]
      q = q.gte('calculated_at', start).lte('calculated_at', end + 'T23:59:59Z')
    }
    return paginate<DbCommission>(q, params.page, params.page_size)
  },
  get: (id: string) =>
    wrap<DbCommission>(supabase.from('commissions').select(commissionDetailSelect).eq('id', id).single()),
}

// ─── Agents ────────────────────────────────────────────────────────────────
export interface AgentsListParams extends PageParams { q?: string }

export const dbAgents = {
  list: (params: AgentsListParams = {}) => {
    let q = supabase.from('agents')
      .select('*, profiles:user_id(id, name, email, role, is_active)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (params.q) q = q.or(`code.ilike.%${params.q}%`)
    return paginate<DbAgent>(q, params.page, params.page_size)
  },
  get: (id: string) => wrap<DbAgent>(
    supabase.from('agents').select('*, profiles:user_id(id, name, email, role)').eq('id', id).single(),
  ),
}

// ─── Accounts (Clients) ────────────────────────────────────────────────────
type DbAccountWith = DbAccount & { contacts?: DbContact[]; deals?: DbDeal[] }
export interface AccountsListParams extends PageParams { q?: string }

export const dbAccounts = {
  list: (params: AccountsListParams = {}) => {
    let q = supabase.from('accounts')
      .select('*, contacts(id, name, email, phone), deals(id, status, transferred_amount)', { count: 'exact' })
      .order('name')
    if (params.q) q = q.ilike('name', `%${params.q}%`)
    return paginate<DbAccountWith>(q, params.page, params.page_size)
  },
  get: (id: string) => wrap<DbAccountWith>(
    supabase.from('accounts').select(`
      *,
      contacts(*),
      deals(
        id, status, transferred_amount, payback_amount, funds_transferred_at,
        created_at, updated_at,
        funders(id, name),
        deal_agents(share, agents(code, profiles:user_id(name)))
      )
    `).eq('id', id).single(),
  ),
}

// ─── Funders ───────────────────────────────────────────────────────────────
export interface FundersListParams extends PageParams { q?: string }

export const dbFunders = {
  list: (params: FundersListParams = {}) => {
    let q = supabase.from('funders').select('*', { count: 'exact' }).order('name')
    if (params.q) q = q.ilike('name', `%${params.q}%`)
    return paginate<DbFunder>(q, params.page, params.page_size)
  },
  get: (id: string) => wrap<DbFunder>(
    supabase.from('funders').select('*').eq('id', id).single(),
  ),
}

// ─── Payments ──────────────────────────────────────────────────────────────
export interface PaymentsListParams extends PageParams {
  agent_id?: string
  status?:   string
  from?:     string
  to?:       string
}

export const dbPayments = {
  list: (params: PaymentsListParams = {}) => {
    let q = supabase.from('payments')
      .select('*, agents(id, code, profiles:user_id(name))', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (params.agent_id) q = q.eq('agent_id', params.agent_id)
    if (params.status)   q = q.eq('status', params.status)
    if (params.from)     q = q.gte('created_at', params.from)
    if (params.to)       q = q.lte('created_at', params.to)
    return paginate<DbPayment>(q, params.page, params.page_size)
  },
  agentSummaryAvailable: (agentId: string) =>
    wrap<{ total_available: number; summaries: { id: string; close_month: number; close_year: number; available: number }[] }>(
      supabase.rpc('agent_summary_available', { p_agent_id: agentId }),
    ),
  monthlySummaryAvailable: (summaryId: string) =>
    wrap<number>(
      supabase.rpc('monthly_summary_available', { p_summary_id: summaryId }),
    ),
}

// ─── Email logs (Resend integration) ───────────────────────────────────────
const emailLogListSelect = `
  id, resend_id, event, to_email, subject, agent_id, related_id,
  status, status_at, error, created_at,
  agents(code, profiles:user_id(name))
`

export interface EmailLogsListParams extends PageParams {
  event?:    string
  status?:   string
  agent_id?: string
}

export const dbEmailLogs = {
  list: (params: EmailLogsListParams = {}) => {
    let q = supabase.from('email_logs')
      .select(emailLogListSelect, { count: 'exact' })
      .order('created_at', { ascending: false })
    if (params.event)    q = q.eq('event', params.event)
    if (params.status)   q = q.eq('status', params.status)
    if (params.agent_id) q = q.eq('agent_id', params.agent_id)
    return paginate<DbEmailLog>(q, params.page, params.page_size)
  },
  listByRelatedIds: (relatedIds: string[], params: PageParams = {}) => {
    if (relatedIds.length === 0) {
      return Promise.resolve({
        data: { rows: [] as DbEmailLog[], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE },
        error: null,
      } as PaginatedResult<DbEmailLog>)
    }
    const q = supabase.from('email_logs')
      .select(emailLogListSelect, { count: 'exact' })
      .in('related_id', relatedIds)
      .order('created_at', { ascending: false })
    return paginate<DbEmailLog>(q, params.page, params.page_size)
  },
}

// ─── Audit logs (admin/finance only via RLS) ───────────────────────────────
const auditLogSelect = `
  id, entity, entity_id, action, prev_value, new_value,
  user_id, created_at, notes,
  profiles:user_id(name)
`

export const dbAuditLogs = {
  listByEntityIds: (entity: string, entityIds: string[], params: PageParams = {}) => {
    if (entityIds.length === 0) {
      return Promise.resolve({
        data: { rows: [] as DbAuditLog[], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE },
        error: null,
      } as PaginatedResult<DbAuditLog>)
    }
    const q = supabase.from('audit_logs').select(auditLogSelect, { count: 'exact' })
      .eq('entity', entity)
      .in('entity_id', entityIds)
      .order('created_at', { ascending: false })
    return paginate<DbAuditLog>(q, params.page, params.page_size)
  },
  /** Fetch audits for two related entity types in one round-trip via .or().
   *  Used by commission detail (commissions + commission_reserves). */
  listForCommissionScope: (commissionId: string, reserveIds: string[], params: PageParams = {}) => {
    const filters = [`and(entity.eq.commissions,entity_id.eq.${commissionId})`]
    if (reserveIds.length > 0) {
      filters.push(`and(entity.eq.commission_reserves,entity_id.in.(${reserveIds.join(',')}))`)
    }
    const q = supabase.from('audit_logs').select(auditLogSelect, { count: 'exact' })
      .or(filters.join(','))
      .order('created_at', { ascending: false })
    return paginate<DbAuditLog>(q, params.page, params.page_size)
  },
}

// ─── Rules ─────────────────────────────────────────────────────────────────
export interface RulesListParams extends PageParams {
  funder_id?: string
  agent_id?:  string
}

export const dbRules = {
  globalList: (params: RulesListParams = {}) => {
    let q = supabase.from('global_commission_rules')
      .select('*, commission_tiers(*), funders(id, name)', { count: 'exact' })
      .order('valid_from', { ascending: false })
    if (params.funder_id) q = q.eq('funder_id', params.funder_id)
    return paginate<DbGlobalRule>(q, params.page, params.page_size)
  },
  agentList: (params: RulesListParams = {}) => {
    let q = supabase.from('agent_commission_rules')
      .select('*, agent_commission_tiers(*), agents(code, profiles:user_id(name)), funders(id, name)', { count: 'exact' })
      .order('valid_from', { ascending: false })
    if (params.agent_id)  q = q.eq('agent_id', params.agent_id)
    if (params.funder_id) q = q.eq('funder_id', params.funder_id)
    return paginate<DbAgentRule>(q, params.page, params.page_size)
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
  agents_total: number
  payments: { id: string; agent_id: string; amount: number; payment_date: string; reference: string | null; agent_name: string }[]
}

export interface AgentsSummary {
  agents: {
    id: string; code: string | null; is_active: boolean; user_id: string | null; created_at: string
    profiles: { id: string; name: string; email: string; role: string; is_active: boolean } | null
    name: string
    total_deals: number; active_deals: number; total_volume: number; total_commissions: number
  }[]
  total: number
}

export interface AgentDashboard {
  agent: DbAgent
  balances: {
    total_commissions: number; reserved_amount: number; reversed_amount: number
    paid_amount: number; available_balance: number
  }
  deals: any[]
  deals_total: number
  commissions: any[]
  commissions_total: number
}

export interface DashboardPeriod { from?: string | null; to?: string | null }

export const dbRpc = {
  dashboardSummary: (period: DashboardPeriod = {}) =>
    wrap<DashboardSummary>(supabase.rpc('dashboard_summary', {
      p_from: period.from ?? null,
      p_to:   period.to   ?? null,
    })),
  payoutSummary: (params: PageParams & { q?: string } = {}) =>
    wrap<PayoutSummary>(supabase.rpc('payout_summary', {
      p_page:      params.page      ?? 1,
      p_page_size: params.page_size ?? DEFAULT_PAGE_SIZE,
      p_q:         params.q         ?? null,
    })),
  agentsSummary: (params: PageParams & { q?: string } = {}) =>
    wrap<AgentsSummary>(supabase.rpc('agents_summary', {
      p_page:      params.page      ?? 1,
      p_page_size: params.page_size ?? DEFAULT_PAGE_SIZE,
      p_q:         params.q         ?? null,
    })),
  agentDashboard: (id: string, params: { dealsPage?: number; dealsPageSize?: number } = {}) =>
    wrap<AgentDashboard>(supabase.rpc('agent_dashboard', {
      p_agent_id:        id,
      p_deals_page:      params.dealsPage     ?? 1,
      p_deals_page_size: params.dealsPageSize ?? DEFAULT_PAGE_SIZE,
    })),
  usersAdminSummary: (params: PageParams & { q?: string; role?: string; status?: string } = {}) =>
    wrap<UsersAdminSummary>(supabase.rpc('users_admin_summary', {
      p_page:      params.page      ?? 1,
      p_page_size: params.page_size ?? DEFAULT_PAGE_SIZE,
      p_q:         params.q         ?? null,
      p_role:      params.role      ?? null,
      p_status:    params.status    ?? null,
    })),
  auditAdminSummary: (filters: AuditFilters) => wrap<AuditAdminSummary>(supabase.rpc('audit_admin_summary', {
    p_entity:  filters.entity  ?? null,
    p_user_id: filters.userId  ?? null,
    p_action:  filters.action  ?? null,
    p_from:    filters.from    ?? null,
    p_to:      filters.to      ?? null,
    p_limit:   filters.limit   ?? DEFAULT_PAGE_SIZE,
    p_offset:  filters.offset  ?? 0,
  })),
}

export interface AuditFilters {
  entity?: string | null
  userId?: string | null
  action?: string | null
  from?:   string | null
  to?:     string | null
  limit?:  number
  offset?: number
}

// ─── Notes (deal_notes) ────────────────────────────────────────────────────
import type { DbDealNote } from './api'
export const dbNotes = {
  list: (dealId: string, params: PageParams = {}) => {
    const q = supabase.from('deal_notes')
      .select('*, profiles:created_by(name)', { count: 'exact' })
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
    return paginate<DbDealNote>(q, params.page, params.page_size)
  },
}

// ─── Ledger ────────────────────────────────────────────────────────────────
type LedgerEntry = { agent_id: string; type: string; amount: number; created_at: string }
export const dbLedger = {
  rawEntries: (agentId: string, params: PageParams = {}) => {
    const q = supabase.from('ledger_entries')
      .select('*, commissions(total_amount, status), payments(reference_number)', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
    return paginate<LedgerEntry>(q, params.page, params.page_size)
  },
}

// ─── Global search (cross-entity) ──────────────────────────────────────────
export interface GlobalSearchHit {
  kind: 'deal' | 'account' | 'contact' | 'agent' | 'funder' | 'commission'
  id:   string
  title: string
  subtitle?: string | null
}
export const dbSearch = {
  global: (q: string, limit = 20) =>
    wrap<{ hits: GlobalSearchHit[]; total: number }>(
      supabase.rpc('global_search', { p_q: q, p_limit: limit }),
    ),
}

export type { DbDeal, DbCommission, DbAgent, DbAccount, DbContact, DbFunder, DbPayment, DbCommissionReserve, DbDealAgent, DbGlobalRule, DbAgentRule }
