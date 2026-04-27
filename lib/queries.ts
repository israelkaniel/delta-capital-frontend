// Centralized query keys + hooks. Every list/detail page imports its hooks
// from here, ensuring consistent cache keys for invalidation and prefetch.
//
// Every list hook accepts a `params` object (filters + page + page_size)
// and returns a Paginated<T> = { rows, total, page, page_size }.

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  dbDeals, dbCommissions, dbAgents, dbAccounts, dbFunders, dbPayments,
  dbRules, dbNotes, dbRpc, dbEmailLogs, dbAuditLogs, dbSearch,
  type DealsListParams, type CommissionsListParams, type AgentsListParams,
  type AccountsListParams, type FundersListParams, type PaymentsListParams,
  type EmailLogsListParams, type RulesListParams,
} from './db'
import { api } from './api'
import { type Paginated, type PageParams } from './pagination'

// ─── Query keys ────────────────────────────────────────────────────────────
export const qk = {
  deals: {
    all:      ['deals'] as const,
    list:     (params?: object) => [...qk.deals.all, 'list', params ?? {}] as const,
    detail:   (id: string) => [...qk.deals.all, 'detail', id] as const,
    notes:    (id: string, params?: object) => [...qk.deals.all, 'notes', id, params ?? {}] as const,
    timeline: (id: string) => [...qk.deals.all, 'timeline', id] as const,
  },
  commissions: {
    all:    ['commissions'] as const,
    list:   (params?: object) => [...qk.commissions.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...qk.commissions.all, 'detail', id] as const,
  },
  agents: {
    all:    ['agents'] as const,
    list:   (params?: object) => [...qk.agents.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...qk.agents.all, 'detail', id] as const,
    ledger: (id: string) => [...qk.agents.all, 'ledger', id] as const,
    ledgerBatch: (ids: string[]) => [...qk.agents.all, 'ledger-batch', [...ids].sort()] as const,
  },
  accounts: {
    all:    ['accounts'] as const,
    list:   (params?: object) => [...qk.accounts.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...qk.accounts.all, 'detail', id] as const,
  },
  funders: {
    all:    ['funders'] as const,
    list:   (params?: object) => [...qk.funders.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...qk.funders.all, 'detail', id] as const,
  },
  payments: {
    all:        ['payments'] as const,
    list:       (params?: object) => [...qk.payments.all, 'list', params ?? {}] as const,
    available:  (agentId: string) => [...qk.payments.all, 'available', agentId] as const,
  },
  emailLogs: {
    all:        ['email-logs'] as const,
    list:       (params?: object) => [...qk.emailLogs.all, 'list', params ?? {}] as const,
    byRelated:  (ids: string[]) => [...qk.emailLogs.all, 'by-related', [...ids].sort()] as const,
  },
  audit: {
    commissionScope: (commId: string, reserveIds: string[]) =>
      ['audit', 'commission-scope', commId, [...reserveIds].sort()] as const,
  },
  rules: {
    all:        ['rules'] as const,
    globalList: (params?: object) => [...qk.rules.all, 'global-list', params ?? {}] as const,
    agentList:  (params?: object) => [...qk.rules.all, 'agent-list', params ?? {}] as const,
  },
  reports: {
    agents:       () => ['reports', 'agents'] as const,
    monthlyBatch: (months: string[]) => ['reports', 'monthly-batch', [...months].sort()] as const,
  },
  user: {
    me: () => ['user', 'me'] as const,
  },
  page: {
    dashboard:       (period?: object) => ['page', 'dashboard', period ?? {}] as const,
    payout:          (params?: object) => ['page', 'payout', params ?? {}] as const,
    agents:          (params?: object) => ['page', 'agents', params ?? {}] as const,
    agentDashboard:  (id: string, params?: object) => ['page', 'agent-dashboard', id, params ?? {}] as const,
    usersAdmin:      (params?: object) => ['page', 'users-admin', params ?? {}] as const,
    auditAdmin:      (filters: object) => ['page', 'audit-admin', filters] as const,
  },
  search: {
    global: (q: string) => ['search', 'global', q] as const,
  },
  admin: {
    notifications:   () => ['admin', 'notifications'] as const,
    inviteTemplate:  () => ['admin', 'invite-template'] as const,
  },
} as const

// ─── Helper: unwrap { data, error } shape into a thrown Error or value ─────
async function unwrap<T>(p: Promise<{ data: T | null; error: Error | null }>): Promise<T> {
  const r = await p
  if (r.error) throw r.error
  if (r.data == null) throw new Error('No data returned')
  return r.data
}

// ─── Read hooks (PostgREST direct, RLS-protected) ──────────────────────────
export const useDealsList    = (params: DealsListParams = {}) =>
  useQuery({ queryKey: qk.deals.list(params), queryFn: () => unwrap(dbDeals.list(params)) })
export const useDeal         = (id: string) =>
  useQuery({ queryKey: qk.deals.detail(id), queryFn: () => unwrap(dbDeals.get(id)), enabled: !!id })
export const useDealNotes    = (id: string, params: PageParams = {}, enabled = true) =>
  useQuery({ queryKey: qk.deals.notes(id, params), queryFn: () => unwrap(dbNotes.list(id, params)), enabled: !!id && enabled })

export const useCommissionsList = (params: CommissionsListParams = {}) =>
  useQuery({ queryKey: qk.commissions.list(params), queryFn: () => unwrap(dbCommissions.list(params)) })
export const useCommission = (id: string) =>
  useQuery({ queryKey: qk.commissions.detail(id), queryFn: () => unwrap(dbCommissions.get(id)), enabled: !!id })

export const useAgentsList = (params: AgentsListParams = {}) =>
  useQuery({ queryKey: qk.agents.list(params), queryFn: () => unwrap(dbAgents.list(params)) })
export const useAgent      = (id: string) =>
  useQuery({ queryKey: qk.agents.detail(id), queryFn: () => unwrap(dbAgents.get(id)), enabled: !!id })

export const useAccountsList = (params: AccountsListParams = {}) =>
  useQuery({ queryKey: qk.accounts.list(params), queryFn: () => unwrap(dbAccounts.list(params)) })
export const useAccount      = (id: string) =>
  useQuery({ queryKey: qk.accounts.detail(id), queryFn: () => unwrap(dbAccounts.get(id)), enabled: !!id })

export const useFundersList = (params: FundersListParams = {}) =>
  useQuery({ queryKey: qk.funders.list(params), queryFn: () => unwrap(dbFunders.list(params)) })
export const useFunder      = (id: string) =>
  useQuery({ queryKey: qk.funders.detail(id), queryFn: () => unwrap(dbFunders.get(id)), enabled: !!id })

export const usePaymentsList = (params: PaymentsListParams = {}) =>
  useQuery({ queryKey: qk.payments.list(params), queryFn: () => unwrap(dbPayments.list(params)) })

export const useAgentSummaryAvailable = (agentId: string, enabled = true) =>
  useQuery({
    queryKey: qk.payments.available(agentId),
    queryFn: () => unwrap(dbPayments.agentSummaryAvailable(agentId)),
    enabled: enabled && !!agentId,
  })

export const useMonthlySummaryAvailable = (summaryId: string, enabled = true) =>
  useQuery({
    queryKey: ['payments', 'summary-available', summaryId] as const,
    queryFn: () => unwrap(dbPayments.monthlySummaryAvailable(summaryId)),
    enabled: enabled && !!summaryId,
  })

export const useEmailLogsList = (params: EmailLogsListParams = {}) =>
  useQuery({ queryKey: qk.emailLogs.list(params), queryFn: () => unwrap(dbEmailLogs.list(params)) })

export const useEmailLogsByRelatedIds = (ids: string[], enabled = true) =>
  useQuery({
    queryKey: qk.emailLogs.byRelated(ids),
    queryFn: () => unwrap(dbEmailLogs.listByRelatedIds(ids)),
    enabled: enabled && ids.length > 0,
  })

export const useCommissionScopeAudits = (commissionId: string, reserveIds: string[], enabled = true) =>
  useQuery({
    queryKey: qk.audit.commissionScope(commissionId, reserveIds),
    queryFn: () => unwrap(dbAuditLogs.listForCommissionScope(commissionId, reserveIds)),
    enabled: enabled && !!commissionId,
  })

export const useGlobalRules = (params: RulesListParams = {}) =>
  useQuery({ queryKey: qk.rules.globalList(params), queryFn: () => unwrap(dbRules.globalList(params)) })
export const useAgentRules  = (params: RulesListParams = {}) =>
  useQuery({ queryKey: qk.rules.agentList(params), queryFn: () => unwrap(dbRules.agentList(params)) })

// ─── Page-level RPC hooks (one round-trip for the entire page) ────────────
import type { DashboardPeriod } from './db'
export const useDashboardSummary = (period: DashboardPeriod = {}) => useQuery({
  queryKey: qk.page.dashboard(period),
  queryFn: () => unwrap(dbRpc.dashboardSummary(period)),
})
export const usePayoutSummary = (params: PageParams & { q?: string } = {}) => useQuery({
  queryKey: qk.page.payout(params),
  queryFn: () => unwrap(dbRpc.payoutSummary(params)),
})
export const useAgentsSummary = (params: PageParams & { q?: string } = {}) => useQuery({
  queryKey: qk.page.agents(params),
  queryFn: () => unwrap(dbRpc.agentsSummary(params)),
})
export const useAgentDashboard = (id: string, params: { dealsPage?: number; dealsPageSize?: number } = {}) => useQuery({
  queryKey: qk.page.agentDashboard(id, params),
  queryFn: () => unwrap(dbRpc.agentDashboard(id, params)),
  enabled: !!id,
})

export const useUsersAdminSummary = (
  params: PageParams & { q?: string; role?: string; status?: string } = {},
  enabled = true,
) => useQuery({
  queryKey: qk.page.usersAdmin(params),
  queryFn: () => unwrap(dbRpc.usersAdminSummary(params)),
  enabled,
})

import type { AuditFilters } from './db'
export const useAuditAdminSummary = (filters: AuditFilters, enabled = true) => useQuery({
  queryKey: qk.page.auditAdmin(filters),
  queryFn: () => unwrap(dbRpc.auditAdminSummary(filters)),
  enabled,
})

export const useGlobalSearch = (q: string, enabled = true) => useQuery({
  queryKey: qk.search.global(q),
  queryFn: () => unwrap(dbSearch.global(q)),
  enabled: enabled && q.trim().length >= 2,
  staleTime: 15_000,
})

export const useAdminNotifications = (enabled = true) => useQuery({
  queryKey: qk.admin.notifications(),
  queryFn: async () => {
    const r = await api.adminNotifications.list()
    if (r.error) throw r.error
    return r.data ?? []
  },
  enabled,
  staleTime: 30_000,
})

export const useInviteTemplate = (enabled = true) => useQuery({
  queryKey: qk.admin.inviteTemplate(),
  queryFn: async () => {
    const r = await api.emailTemplates.getInvite()
    if (r.error) throw r.error
    return r.data!
  },
  enabled,
})

// ─── Edge-Function-backed hooks (kept for complex compute) ─────────────────
export const useAgentLedger = (id: string) => useQuery({
  queryKey: qk.agents.ledger(id),
  queryFn: async () => {
    const r = await api.agents.ledger(id)
    if (r.error) throw r.error
    return r.data!
  },
  enabled: !!id,
})

export const useAgentsLedgerBatch = (ids: string[]) => useQuery({
  queryKey: qk.agents.ledgerBatch(ids),
  queryFn: async () => {
    const r = await api.agents.ledgerBatch(ids)
    if (r.error) throw r.error
    return r.data!.balances
  },
  enabled: ids.length > 0,
})

export const useDealTimeline = (id: string, enabled = true) => useQuery({
  queryKey: qk.deals.timeline(id),
  queryFn: async () => {
    const r = await api.deals.timeline(id)
    if (r.error) throw r.error
    return r.data!
  },
  enabled: !!id && enabled,
})

export const useReportsAgents = () => useQuery({
  queryKey: qk.reports.agents(),
  queryFn: async () => {
    const r = await api.reports.agents()
    if (r.error) throw r.error
    return r.data!
  },
})

export const useReportsMonthlyBatch = (months: string[]) => useQuery({
  queryKey: qk.reports.monthlyBatch(months),
  queryFn: async () => {
    const r = await api.reports.monthlyBatch(months)
    if (r.error) throw r.error
    return r.data!
  },
  enabled: months.length > 0,
})

// ─── Prefetch helpers ──────────────────────────────────────────────────────
export const prefetch = {
  deal:       (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.deals.detail(id),       queryFn: () => unwrap(dbDeals.get(id)) }),
  commission: (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.commissions.detail(id), queryFn: () => unwrap(dbCommissions.get(id)) }),
  account:    (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.accounts.detail(id),    queryFn: () => unwrap(dbAccounts.get(id)) }),
  agent:      (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.agents.detail(id),      queryFn: () => unwrap(dbAgents.get(id)) }),
  funder:     (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.funders.detail(id),     queryFn: () => unwrap(dbFunders.get(id)) }),
}

// ─── Invalidation helpers ──────────────────────────────────────────────────
export const invalidate = {
  deals:       (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.deals.all }),
  deal:        (qc: QueryClient, id: string) => qc.invalidateQueries({ queryKey: qk.deals.detail(id) }),
  commissions: (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.commissions.all }),
  agents:      (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.agents.all }),
  accounts:    (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.accounts.all }),
  funders:     (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.funders.all }),
  payments:    (qc: QueryClient) => {
    qc.invalidateQueries({ queryKey: qk.payments.all })
    qc.invalidateQueries({ queryKey: ['page', 'payout'] })
  },
  emailLogs:   (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.emailLogs.all }),
  rules:       (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.rules.all }),
  usersAdmin:  (qc: QueryClient) => qc.invalidateQueries({ queryKey: ['page', 'users-admin'] }),
  auditAdmin:  (qc: QueryClient) => qc.invalidateQueries({ queryKey: ['page', 'audit-admin'] }),
  adminNotifications: (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.admin.notifications() }),
  inviteTemplate:     (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.admin.inviteTemplate() }),
}
