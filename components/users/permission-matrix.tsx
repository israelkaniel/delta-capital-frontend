'use client'

// Read-only visualization of who can read/write each module.
// Mirrors the RLS policies in supabase/migrations/002_new_schema.sql:368–470.
// This is documentation, not enforcement — changing the matrix here does NOT
// change what the database allows. To grant a role new access you must
// update the RLS policy and re-run the migration.

type Access = 'rw' | 'r' | 'own' | '—'

interface ModuleRow {
  label:   string
  ADMIN:           Access
  FINANCE_MANAGER: Access
  AGENT:           Access
}

// TODO (you-shape-this): adjust this matrix to match your true business rules.
// Each row is one module. Each cell is one of:
//   'rw'  — full read + write
//   'r'   — read-only (every record)
//   'own' — read+write but only own records (RLS-scoped)
//   '—'   — no access
//
// Tip: think about edge cases: should AGENTs see *each other's* commissions?
// Should FINANCE_MANAGER be able to delete a deal? Set explicit answers here.
export const MODULE_PERMISSIONS: ModuleRow[] = [
  { label: 'Dashboard',         ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'own' },
  { label: 'Deals',             ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'own' },
  { label: 'Commissions',       ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'own' },
  { label: 'Payouts / Ledger',  ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'own' },
  { label: 'Clients',           ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'r'   },
  { label: 'Agents',            ADMIN: 'rw', FINANCE_MANAGER: 'r',  AGENT: 'own' },
  { label: 'Funders',           ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'r'   },
  { label: 'Commission Rules',  ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'r'   },
  { label: 'Reports',           ADMIN: 'rw', FINANCE_MANAGER: 'rw', AGENT: 'own' },
  { label: 'User Management',   ADMIN: 'rw', FINANCE_MANAGER: '—',  AGENT: '—'   },
  { label: 'Audit Log',         ADMIN: 'rw', FINANCE_MANAGER: 'r',  AGENT: '—'   },
  { label: 'Email Templates',   ADMIN: 'rw', FINANCE_MANAGER: '—',  AGENT: '—'   },
]

const TONE: Record<Access, { bg: string; fg: string; label: string }> = {
  'rw':  { bg: 'var(--pos-soft)', fg: 'var(--pos)', label: 'Full' },
  'r':   { bg: 'var(--info-soft)', fg: 'var(--info)', label: 'Read' },
  'own': { bg: 'var(--warn-soft)', fg: 'var(--warn)', label: 'Own' },
  '—':   { bg: 'var(--ink-soft)', fg: 'var(--ink-4)', label: '—' },
}

export function PermissionMatrix({ highlight }: { highlight?: 'ADMIN' | 'FINANCE_MANAGER' | 'AGENT' }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Module</th>
              <th className={highlight === 'ADMIN' ? 'col-highlight' : ''}>Administrator</th>
              <th className={highlight === 'FINANCE_MANAGER' ? 'col-highlight' : ''}>Finance Manager</th>
              <th className={highlight === 'AGENT' ? 'col-highlight' : ''}>Agent</th>
            </tr>
          </thead>
          <tbody>
            {MODULE_PERMISSIONS.map(m => (
              <tr key={m.label}>
                <td className="strong" style={{ fontSize: 12.5 }}>{m.label}</td>
                <Cell access={m.ADMIN}           highlight={highlight === 'ADMIN'} />
                <Cell access={m.FINANCE_MANAGER} highlight={highlight === 'FINANCE_MANAGER'} />
                <Cell access={m.AGENT}           highlight={highlight === 'AGENT'} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink-4)', borderTop: '1px solid var(--line)' }}>
        <strong>Full</strong> = read + write · <strong>Read</strong> = view only · <strong>Own</strong> = own records only ·
        <em style={{ marginLeft: 8 }}>To change permissions, update the RLS policy in <span className="mono">supabase/migrations/</span> and re-run.</em>
      </div>
    </div>
  )
}

function Cell({ access, highlight }: { access: Access; highlight?: boolean }) {
  const t = TONE[access]
  return (
    <td className={highlight ? 'col-highlight' : ''}>
      <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 12,
        background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 500,
      }}>{t.label}</span>
    </td>
  )
}
