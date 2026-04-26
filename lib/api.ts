// Typed wrappers around all Supabase Edge Functions.
// All mutations go through invokeFunction(); reads use the same pattern.

import { invokeFunction } from './supabase/functions'

// ─── DB types (from Edge Function responses) ────────────────────────────────

export interface DbProfile { id: string; name: string; email: string; role: string; is_active: boolean }
export interface DbAgent   { id: string; code: string | null; is_active: boolean; profiles: DbProfile }

export interface DbFunder {
  id: string; name: string; commission_base: string; is_active: boolean; notes?: string
  global_commission_rules?: DbGlobalRule[]
}

export interface DbGlobalRule {
  id: string; funder_id: string; type: string; fixed_rate: number | null
  valid_from: string; valid_to: string | null; notes?: string
  commission_tiers?: { id: string; min_amount: number; max_amount: number | null; rate: number }[]
}

export interface DbAgentRule {
  id: string; agent_id: string; funder_id: string; mode: string; type: string
  fixed_rate: number | null; valid_from: string; valid_to: string | null; notes?: string
  agent_commission_tiers?: { id: string; min_amount: number; max_amount: number | null; rate: number }[]
}

export interface DbAccount  {
  id: string; name: string; notes?: string; created_at: string
  contacts?: DbContact[]
  deals?: DbDeal[]
}
export interface DbContact  { id: string; account_id: string; name: string; email?: string; phone?: string; external_id?: string }

export interface DbDealAgent {
  id: string; deal_id: string; agent_id: string; share: number
  agents?: DbAgent
}

export interface DbDeal {
  id: string; account_id: string; funder_id: string
  status: 'PENDING' | 'APPROVED' | 'FUNDS_TRANSFERRED' | 'CANCELLED'
  transferred_amount: number | null; payback_amount: number | null
  funds_transferred_at: string | null; external_id: string | null; notes?: string
  created_at: string; updated_at: string
  created_by?: string | null; updated_by?: string | null
  creator?: { id: string; name: string } | null
  updater?: { id: string; name: string } | null
  accounts?: DbAccount
  funders?: DbFunder
  deal_agents?: (DbDealAgent & { agents?: DbAgent })[]
  commissions?: DbCommission[]
}

export interface DbCommissionReserve {
  id: string; commission_id: string; amount: number; status: string
  reason?: string; created_at: string; resolved_at?: string; notes?: string
}

export interface DbCommission {
  id: string; deal_agent_id: string; calculated_at: string
  base_amount: number; rate: number; total_amount: number
  released_amount: number; reserved_amount: number; reversed_amount: number
  status: 'ACTIVE' | 'RESERVED' | 'REVERSED' | 'PAID' | 'PENDING'
  notes?: string
  commission_reserves?: DbCommissionReserve[]
  deal_agents?: DbDealAgent & {
    agents?: DbAgent
    deals?: DbDeal & { accounts?: DbAccount; funders?: DbFunder }
  }
}

export interface DbLedgerEntry {
  id: string; agent_id: string; type: string; amount: number
  description?: string; created_at: string
  commission_id?: string; reserve_id?: string; payment_id?: string
}

export interface DbAgentBalances {
  total_commissions: number; reserved_amount: number
  reversed_amount: number; paid_amount: number; available_balance: number
}

export interface DbLedgerResponse {
  entries: DbLedgerEntry[]
  balances: DbAgentBalances
}

export type PaymentType   = 'bank_transfer' | 'check' | 'cash' | 'other'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled'

export interface DbPayment {
  id: string
  agent_id: string
  amount: number
  payment_type: PaymentType
  status: PaymentStatus
  reference_number?: string | null
  payment_date?: string | null
  notes?: string | null
  monthly_summary_id?: string | null
  created_at: string
  updated_at: string
  agents?: { id: string; code: string | null; profiles?: { name: string | null } | null }
}

export interface AgentSummaryAvailable {
  total_available: number
  summaries: { id: string; close_month: number; close_year: number; available: number }[]
}

export type EmailLogStatus =
  | 'queued' | 'sent' | 'delivered' | 'delayed'
  | 'bounced' | 'complained' | 'opened' | 'clicked' | 'failed'

export type EmailLogEvent =
  | 'payment_recorded' | 'commission_earned' | 'commission_reserved'
  | 'commission_released' | 'monthly_summary'

export interface DbEmailLog {
  id: string
  resend_id: string | null
  event: EmailLogEvent | string
  to_email: string
  subject: string
  agent_id: string | null
  related_id: string | null
  status: EmailLogStatus | string
  status_at: string
  error: string | null
  created_at: string
  agents?: { code: string | null; profiles: { name: string | null } | null } | null
}

export interface DbMonthlySummary {
  id?: string
  agent_id: string; agent_name?: string; agent_code?: string
  total_earned: number; total_reserved: number; total_released: number
  total_reversed: number; total_paid: number; balance: number
  opening_balance?: number; closing_balance?: number
  close_month?: number; close_year?: number
}

export interface DbMonthlyReport {
  month: number; year: number; closed: boolean
  summaries: DbMonthlySummary[]
}

export interface DbAgentPerformance {
  agent_id: string; agent_name?: string; agent_code?: string
  total_deals: number; active_deals: number
  total_volume: number; total_commissions: number
}

export interface DbDealNote {
  id: string; deal_id: string; body: string
  created_by: string; created_at: string
  profiles?: { name?: string } | null
}

export interface DbAuditLog {
  id: string
  entity: string; entity_id: string; action: string
  prev_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  user_id: string; created_at: string
  notes?: string
  profiles?: { name?: string } | null
}

// ─── API functions ────────────────────────────────────────────────────────────

export const api = {
  // ── Agents ──
  agents: {
    list: () => invokeFunction<DbAgent[]>('agents'),
    get:  (id: string) => invokeFunction<DbAgent>(`agents/${id}`),
    ledger: (id: string) => invokeFunction<DbLedgerResponse>(`agents/${id}/ledger`),
    /** Batched balances for many agents in one round-trip. Replaces N+1 fetches in payout. */
    ledgerBatch: (agentIds: string[]) =>
      invokeFunction<{ balances: Record<string, DbAgentBalances> }>('agents/ledger-batch', {
        method: 'POST', body: { agent_ids: agentIds },
      }),
    create: (body: { email: string; name: string; code?: string; password: string }) =>
      invokeFunction<DbAgent>('agents', { method: 'POST', body }),
    update: (id: string, body: Partial<DbAgent>) =>
      invokeFunction<DbAgent>(`agents/${id}`, { method: 'PATCH', body }),
  },

  // ── Deals ──
  deals: {
    list: () => invokeFunction<DbDeal[]>('loans'),
    get:  (id: string) => invokeFunction<DbDeal>(`loans/${id}`),
    create: (body: {
      account_id: string; funder_id: string
      transferred_amount?: number; payback_amount?: number
      notes?: string
      agents?: { agent_id: string; share: number }[]
    }) => invokeFunction<DbDeal>('loans', { method: 'POST', body }),
    updateStatus: (id: string, body: {
      status: string
      transferred_amount?: number; payback_amount?: number; funds_transferred_at?: string
    }) => invokeFunction<DbDeal>(`loans/${id}/status`, { method: 'PATCH', body }),
    update: (id: string, body: Partial<DbDeal>) =>
      invokeFunction<DbDeal>(`loans/${id}`, { method: 'PATCH', body }),
    delete: (id: string) =>
      invokeFunction<{ success: boolean }>(`loans/${id}`, { method: 'DELETE' }),
    bulkDelete: (ids: string[]) =>
      invokeFunction<{ deleted: number }>('loans/bulk-delete', { method: 'POST', body: { ids } }),
    setAgents: (id: string, agents: { agent_id: string; share: number }[]) =>
      invokeFunction<{ success: boolean; count: number }>(`loans/${id}/agents`, { method: 'PUT', body: { agents } }),
    notes: {
      list: (dealId: string) =>
        invokeFunction<DbDealNote[]>(`loans/${dealId}/notes`),
      create: (dealId: string, body: string) =>
        invokeFunction<DbDealNote>(`loans/${dealId}/notes`, { method: 'POST', body: { body } }),
      delete: (dealId: string, noteId: string) =>
        invokeFunction<{ success: boolean }>(`loans/${dealId}/notes/${noteId}`, { method: 'DELETE' }),
    },
    timeline: (id: string) =>
      invokeFunction<{ audits: DbAuditLog[]; notes: DbDealNote[] }>(`loans/${id}/timeline`),
  },

  // ── Commissions ──
  commissions: {
    list: (params?: { status?: string; agent_id?: string; period?: string }) =>
      invokeFunction<DbCommission[]>('commissions', { params }),
    get: (id: string) => invokeFunction<DbCommission>(`commissions/${id}`),
  },

  // ── Commission actions ──
  reserve: (body: { commission_id: string; amount: number; reason?: string }) =>
    invokeFunction<DbCommissionReserve>('commission-reserve', { method: 'POST', body }),
  release: (body: { reserve_id: string; notes?: string }) =>
    invokeFunction<{ success: boolean; released_amount: number }>('commission-release', { method: 'POST', body }),
  reverse: (body: { reserve_id: string; notes?: string }) =>
    invokeFunction<{ success: boolean; reversed_amount: number }>('commission-reverse', { method: 'POST', body }),

  // ── Payments ──
  payments: {
    list: (params?: { agent_id?: string; status?: PaymentStatus; from?: string; to?: string }) =>
      invokeFunction<DbPayment[]>('payments', { params }),
    create: (body: {
      agent_id: string
      amount: number
      payment_type: PaymentType
      status: PaymentStatus
      reference_number?: string
      payment_date?: string
      notes?: string
      monthly_summary_id?: string
    }) => invokeFunction<DbPayment>('payments', { method: 'POST', body }),
    update: (id: string, body: Partial<{
      amount: number
      payment_type: PaymentType
      status: PaymentStatus
      reference_number: string | null
      payment_date: string | null
      notes: string | null
      monthly_summary_id: string | null
    }>) => invokeFunction<DbPayment>(`payments/${id}`, { method: 'PATCH', body }),
  },

  // ── Funders ──
  funders: {
    list: () => invokeFunction<DbFunder[]>('funders'),
    get:  (id: string) => invokeFunction<DbFunder>(`funders/${id}`),
    create: (body: { name: string; commission_base?: string; notes?: string }) =>
      invokeFunction<DbFunder>('funders', { method: 'POST', body }),
    update: (id: string, body: Partial<DbFunder>) =>
      invokeFunction<DbFunder>(`funders/${id}`, { method: 'PATCH', body }),
  },

  // ── Rules ──
  rules: {
    globalList:  (params?: { funder_id?: string }) => invokeFunction<DbGlobalRule[]>('rules/global', { params }),
    globalCreate: (body: object) => invokeFunction<DbGlobalRule>('rules/global', { method: 'POST', body }),
    globalUpdate: (id: string, body: object) => invokeFunction<DbGlobalRule>(`rules/global/${id}`, { method: 'PATCH', body }),
    globalDeactivate: (id: string) => invokeFunction<DbGlobalRule>(`rules/global/${id}`, { method: 'DELETE' }),
    agentList:  (params?: { agent_id?: string; funder_id?: string }) => invokeFunction<DbAgentRule[]>('rules/agent', { params }),
    agentCreate: (body: object) => invokeFunction<DbAgentRule>('rules/agent', { method: 'POST', body }),
    agentUpdate: (id: string, body: object) => invokeFunction<DbAgentRule>(`rules/agent/${id}`, { method: 'PATCH', body }),
    agentDeactivate: (id: string) => invokeFunction<DbAgentRule>(`rules/agent/${id}`, { method: 'DELETE' }),
  },

  // ── Accounts (Clients) ──
  accounts: {
    list: (params?: { q?: string }) => invokeFunction<DbAccount[]>('accounts', { params }),
    get:  (id: string) => invokeFunction<DbAccount & { contacts?: DbContact[]; deals?: DbDeal[] }>(`accounts/${id}`),
    create: (body: { name: string; notes?: string }) =>
      invokeFunction<DbAccount>('accounts', { method: 'POST', body }),
    update: (id: string, body: Partial<DbAccount>) =>
      invokeFunction<DbAccount>(`accounts/${id}`, { method: 'PATCH', body }),
    contacts: {
      list:   (accountId: string) => invokeFunction<DbContact[]>(`accounts/${accountId}/contacts`),
      create: (accountId: string, body: { name: string; email?: string; phone?: string; notes?: string }) =>
        invokeFunction<DbContact>(`accounts/${accountId}/contacts`, { method: 'POST', body }),
      update: (accountId: string, contactId: string, body: Partial<DbContact>) =>
        invokeFunction<DbContact>(`accounts/${accountId}/contacts/${contactId}`, { method: 'PATCH', body }),
      delete: (accountId: string, contactId: string) =>
        invokeFunction<{ success: boolean }>(`accounts/${accountId}/contacts/${contactId}`, { method: 'DELETE' }),
    },
  },

  // ── Reports ──
  reports: {
    agents: () => invokeFunction<{ agents: DbAgentPerformance[] }>('reports', { params: { type: 'agents' } }),
    monthly: (month: number, year: number) =>
      invokeFunction<DbMonthlyReport>('reports', { params: { type: 'monthly', month: String(month), year: String(year) } }),
    /** Batched monthly reports keyed by 'YYYY-MM'. Replaces 6 sequential calls. */
    monthlyBatch: (months: string[]) =>
      invokeFunction<Record<string, DbMonthlyReport>>('reports/monthly-batch', {
        method: 'POST', body: { months },
      }),
  },

  // ── Monthly Close ──
  monthlyClose: {
    list: () => invokeFunction<object[]>('monthly-close'),
    execute: (month: number, year: number) =>
      invokeFunction<object>('monthly-close', { method: 'POST', body: { month, year } }),
  },
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export function dealStatusLabel(s: string) {
  return { PENDING: 'Pending', APPROVED: 'Approved', FUNDS_TRANSFERRED: 'Active', CANCELLED: 'Declined' }[s] ?? s
}

export function dealStatusTone(s: string) {
  return { PENDING: 'warn', APPROVED: 'info', FUNDS_TRANSFERRED: 'pos', CANCELLED: 'neg' }[s] ?? 'default'
}

export function commStatusTone(s: string) {
  return { ACTIVE: 'pos', RESERVED: 'warn', REVERSED: 'neg', PAID: 'info', PENDING: 'default' }[s] ?? 'default'
}

export function commStatusLabel(s: string) {
  return { ACTIVE: 'Active', RESERVED: 'Reserved', REVERSED: 'Reversed', PAID: 'Paid', PENDING: 'Pending' }[s] ?? s
}

export function agentName(a?: DbAgent | null) {
  return a?.profiles?.name ?? a?.code ?? '—'
}

export function hueFromId(id: string) {
  return (id.charCodeAt(id.length - 1) * 53) % 360
}
