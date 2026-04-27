// Centralized query keys + hooks. Every list/detail page imports its hooks
// from here, ensuring consistent cache keys for invalidation and prefetch.

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  dbDeals, dbCommissions, dbAgents, dbAccounts, dbFunders, dbPayments,
  dbRules, dbNotes, dbRpc, dbEmailLogs, dbAuditLogs,
} from './db'
import { api } from './api'

// ─── Query keys (stable, used as both cache keys and invalidation matchers) ─
export const qk = {
  deals: {
    all:      ['deals'] as const,
    list:     () => [...qk.deals.all, 'list'] as const,
    detail:   (id: string) => [...qk.deals.all, 'detail', id] as const,
    notes:    (id: string) => [...qk.deals.all, 'notes', id] as const,
    timeline: (id: string) => [...qk.deals.all, 'timeline', id] as const,
  },
  commissions: {
    all:    ['commissions'] as const,
    list:   (params?: object) => [...qk.commissions.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...qk.commissions.all, 'detail', id] as const,
  },
  agents: {
    all:    ['agents'] as const,
    list:   () => [...qk.agents.all, 'list'] as const,
    detail: (id: string) => [...qk.agents.all, 'detail', id] as const,
    ledger: (id: string) => [...qk.agents.all, 'ledger', id] as const,
    ledgerBatch: (ids: string[]) => [...qk.agents.all, 'ledger-batch', [...ids].sort()] as const,
  },
  accounts: {
    all:    ['accounts'] as const,
    list:   () => [...qk.accounts.all, 'list'] as const,
    detail: (id: string) => [...qk.accounts.all, 'detail', id] as const,
  },
  funders: {
    all:    ['funders'] as const,
    list:   () => [...qk.funders.all, 'list'] as const,
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
    globalList: (funderId?: string) => [...qk.rules.all, 'global-list', funderId ?? null] as const,
    agentList:  (funderId?: string, agentId?: string) =>
      [...qk.rules.all, 'agent-list', { funderId: funderId ?? null, agentId: agentId ?? null }] as const,
  },
  reports: {
    agents:       () => ['reports', 'agents'] as const,
    monthlyBatch: (months: string[]) => ['reports', 'monthly-batch', [...months].sort()] as const,
  },
  user: {
    me: () => ['user', 'me'] as const,
  },
  page: {
    dashboard:       () => ['page', 'dashboard'] as const,
    payout:          () => ['page', 'payout'] as const,
    agents:          () => ['page', 'agents'] as const,
    agentDashboard:  (id: string) => ['page', 'agent-dashboard', id] as const,
    usersAdmin:      () => ['page', 'users-admin'] as const,
    auditAdmin:      (filters: object) => ['page', 'audit-admin', filters] as const,
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
export const useDealsList    = () => useQuery({ queryKey: qk.deals.list(),     queryFn: () => unwrap(dbDeals.list()) })
export const useDeal         = (id: string) => useQuery({ queryKey: qk.deals.detail(id), queryFn: () => unwrap(dbDeals.get(id)), enabled: !!id })
export const useDealNotes    = (id: string, enabled = true) =>
  useQuery({ queryKey: qk.deals.notes(id), queryFn: () => unwrap(dbNotes.list(id)), enabled: !!id && enabled })

export const useCommissionsList = (params?: { status?: string; agent_id?: string; period?: string }) =>
  useQuery({ queryKey: qk.commissions.list(params), queryFn: () => unwrap(dbCommissions.list(params)) })
export const useCommission = (id: string) =>
  useQuery({ queryKey: qk.commissions.detail(id), queryFn: () => unwrap(dbCommissions.get(id)), enabled: !!id })

export const useAgentsList = () => useQuery({ queryKey: qk.agents.list(), queryFn: () => unwrap(dbAgents.list()) })
export const useAgent      = (id: string) =>
  useQuery({ queryKey: qk.agents.detail(id), queryFn: () => unwrap(dbAgents.get(id)), enabled: !!id })

export const useAccountsList = () => useQuery({ queryKey: qk.accounts.list(), queryFn: () => unwrap(dbAccounts.list()) })
export const useAccount      = (id: string) =>
  useQuery({ queryKey: qk.accounts.detail(id), queryFn: () => unwrap(dbAccounts.get(id)), enabled: !!id })

export const useFundersList = () => useQuery({ queryKey: qk.funders.list(), queryFn: () => unwrap(dbFunders.list()) })
export const useFunder      = (id: string) =>
  useQuery({ queryKey: qk.funders.detail(id), queryFn: () => unwrap(dbFunders.get(id)), enabled: !!id })

export const usePaymentsList = (params?: { agent_id?: string; status?: string; from?: string; to?: string }) =>
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

export const useEmailLogsList = (params?: { event?: string; status?: string; agent_id?: string }) =>
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

export const useGlobalRules = (funderId?: string) =>
  useQuery({ queryKey: qk.rules.globalList(funderId), queryFn: () => unwrap(dbRules.globalList({ funder_id: funderId })) })
export const useAgentRules  = (params?: { funder_id?: string; agent_id?: string }) =>
  useQuery({ queryKey: qk.rules.agentList(params?.funder_id, params?.agent_id), queryFn: () => unwrap(dbRules.agentList(params)) })

// ─── Page-level RPC hooks (one round-trip for the entire page) ────────────
export const useDashboardSummary = () => useQuery({
  queryKey: qk.page.dashboard(), queryFn: () => unwrap(dbRpc.dashboardSummary()),
})
export const usePayoutSummary = () => useQuery({
  queryKey: qk.page.payout(), queryFn: () => unwrap(dbRpc.payoutSummary()),
})
export const useAgentsSummary = () => useQuery({
  queryKey: qk.page.agents(), queryFn: () => unwrap(dbRpc.agentsSummary()),
})
export const useAgentDashboard = (id: string) => useQuery({
  queryKey: qk.page.agentDashboard(id),
  queryFn: () => unwrap(dbRpc.agentDashboard(id)),
  enabled: !!id,
})

export const useUsersAdminSummary = (enabled = true) => useQuery({
  queryKey: qk.page.usersAdmin(),
  queryFn: () => unwrap(dbRpc.usersAdminSummary()),
  enabled,
})

import type { AuditFilters } from './db'
export const useAuditAdminSummary = (filters: AuditFilters, enabled = true) => useQuery({
  queryKey: qk.page.auditAdmin(filters),
  queryFn: () => unwrap(dbRpc.auditAdminSummary(filters)),
  enabled,
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

// ─── Prefetch helpers (used on hover / IntersectionObserver) ───────────────
export const prefetch = {
  deal:       (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.deals.detail(id),       queryFn: () => unwrap(dbDeals.get(id)) }),
  commission: (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.commissions.detail(id), queryFn: () => unwrap(dbCommissions.get(id)) }),
  account:    (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.accounts.detail(id),    queryFn: () => unwrap(dbAccounts.get(id)) }),
  agent:      (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.agents.detail(id),      queryFn: () => unwrap(dbAgents.get(id)) }),
  funder:     (qc: QueryClient, id: string) => qc.prefetchQuery({ queryKey: qk.funders.detail(id),     queryFn: () => unwrap(dbFunders.get(id)) }),
}

// ─── Invalidation helpers (call after mutations) ───────────────────────────
export const invalidate = {
  deals:       (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.deals.all }),
  deal:        (qc: QueryClient, id: string) => qc.invalidateQueries({ queryKey: qk.deals.detail(id) }),
  commissions: (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.commissions.all }),
  agents:      (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.agents.all }),
  accounts:    (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.accounts.all }),
  funders:     (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.funders.all }),
  payments:    (qc: QueryClient) => {
    qc.invalidateQueries({ queryKey: qk.payments.all })
    qc.invalidateQueries({ queryKey: qk.page.payout() })
  },
  emailLogs:   (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.emailLogs.all }),
  rules:       (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.rules.all }),
  usersAdmin:  (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.page.usersAdmin() }),
  auditAdmin:  (qc: QueryClient) => qc.invalidateQueries({ queryKey: ['page', 'audit-admin'] }),
  adminNotifications: (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.admin.notifications() }),
  inviteTemplate:     (qc: QueryClient) => qc.invalidateQueries({ queryKey: qk.admin.inviteTemplate() }),
}
